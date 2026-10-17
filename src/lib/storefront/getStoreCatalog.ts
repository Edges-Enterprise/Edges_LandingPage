// src/lib/storefront/getStoreCatalog.ts
//
// Customer-storefront plan catalog (Task 4, branch 2.b).
//
// Reads ONLY the plans the reseller selected and turned on: a
// `global_reseller_plan_configs` row for this reseller with
// `enabled = true`, joined to its `global_base_plans` row. Strict
// opt-in — a base plan with no config row is not returned (do NOT copy
// the dashboard's "missing config = enabled" default in
// dashboard/plans/PlansClient.tsx, which would leak unselected plans
// into the store). An empty result means the store has no active plans.
//
// Price shown is the reseller's `selling_price` (already includes the
// markup); when it is missing, the markup is recomputed the same way
// purchaseOrchestrator.ts / updatePlanConfig.ts do, so the storefront
// and the purchase flow agree on the amount.
//
// `plan_id` on each returned plan is `global_base_plans.provider_plan_id`
// — the id the purchase edge function (`global-purchase-data` /
// `global-purchase-airtime`) expects as `planId`.
//
// This is an anonymous storefront read, so it uses the admin (service-
// role) client, NOT `createServerClient()`. RLS is enabled on both
// `global_reseller_plan_configs` and `global_base_plans` with only
// admin/reseller-scoped SELECT policies: with a customer session cookie
// present, `createServerClient()` sends the user's JWT and the read is
// filtered to nothing (and the admin policy's `auth.users` subquery
// fails outright with `permission denied for table users`), so the
// storefront rendered empty for signed-in visitors. The service-role
// client bypasses RLS, which is what a public storefront needs.

import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreProduct } from "@/types/reseller/storefront";

export interface StoreCatalog {
  plans: StoreProduct[];
  /** Network tab values actually present, in display order. */
  networks: string[];
  /** Category tab values actually present, in display order. */
  categories: string[];
}

const EMPTY: StoreCatalog = { plans: [], networks: [], categories: [] };

function computeSellingPrice(
  basePrice: number,
  markupType: string | null,
  markupValue: number,
): number {
  if (markupType === "fixed") return Math.round(basePrice + markupValue);
  return Math.round(basePrice * (1 + markupValue / 100));
}

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [
    ...new Set(values.filter((v): v is string => !!v && !!v.trim())),
  ]
    .map((v) => v.trim())
    .sort();
}

export async function getStoreCatalog(
  resellerId: string,
  countryCode: string,
  category?: string,
): Promise<StoreCatalog> {
  const supabase = createAdminClient();

  const { data: configs, error: configError } = await supabase
    .from("global_reseller_plan_configs")
    .select("plan_id, enabled, markup_type, markup_value, selling_price")
    .eq("reseller_id", resellerId)
    .eq("enabled", true);

  if (configError) {
    console.error("Store catalog config error:", configError);
    return EMPTY;
  }
  if (!configs || configs.length === 0) return EMPTY;

  const planIds = configs.map((c) => c.plan_id);

  let query = supabase
    .from("global_base_plans")
    .select(
      "id, provider, provider_plan_id, country_code, network, name, description, category, data_amount, validity, base_price, currency, send_value, send_currency, is_active",
    )
    .in("id", planIds)
    .eq("country_code", countryCode.toUpperCase())
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (category) query = query.eq("category", category);

  const { data: basePlans, error: plansError } = await query;

  if (plansError) {
    console.error("Store catalog plans error:", plansError);
    return EMPTY;
  }
  if (!basePlans || basePlans.length === 0) return EMPTY;

  const configById = new Map(configs.map((c) => [c.plan_id, c]));

  const plans: StoreProduct[] = basePlans.map((p) => {
    const cfg = configById.get(p.id);
    const basePrice = Number(p.base_price);
    const sellingPrice =
      cfg?.selling_price !== null && cfg?.selling_price !== undefined
        ? Number(cfg.selling_price)
        : computeSellingPrice(
            basePrice,
            cfg?.markup_type ?? null,
            Number(cfg?.markup_value ?? 0),
          );
    const network =
      (p.network && p.network.trim()) || p.provider || undefined;

    return {
      id: p.id,
      plan_id: p.provider_plan_id,
      name: p.name,
      description: p.description ?? undefined,
      category: p.category,
      network,
      price: sellingPrice,
      base_price: basePrice,
      profit: sellingPrice - basePrice,
      markup_percent:
        basePrice > 0 ? ((sellingPrice - basePrice) / basePrice) * 100 : 0,
      validity: p.validity ?? undefined,
      data_amount: p.data_amount ?? undefined,
      is_active: true,
      is_featured: false,
    };
  });

  return {
    plans,
    networks: uniqueSorted(plans.map((p) => p.network)),
    categories: uniqueSorted(plans.map((p) => p.category)),
  };
}
