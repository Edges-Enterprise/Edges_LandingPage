// src/lib/storefront/getStoreCatalog.ts
//
// Customer-storefront plan catalog (Task 4, branch 2.b; Phase 2 rework).
//
// Reads ONLY the plans the reseller selected and turned on: a
// `global_reseller_plan_configs` row for this reseller with
// `enabled = true`, joined to its `global_base_plans` row. Strict
// opt-in — a base plan with no config row is not returned (do NOT copy
// the dashboard's "missing config = enabled" default in
// dashboard/plans/PlansClient.tsx, which would leak unselected plans
// into the store). An empty result means the store has no active plans.
//
// Phase 2: pricing is NOT computed here. It calls the one pipeline in
// supabase/functions/_shared/currency/storePrice.ts — the same function the
// edge functions and the dashboard use — so the storefront, the purchase
// flow and the dashboard cannot disagree on a price. This file previously
// carried its own `computeSellingPrice`, which was the third copy of the
// arithmetic the Phase 2 design set out to remove.
//
// A store is NOT scoped to its own country: a reseller sells any country
// Zendit covers, priced in the store's own currency. The country filter is
// the customer's to make.
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
import {
  loadStoreContext,
  pricePlan,
  priceRangePlan,
} from "../../../supabase/functions/_shared/currency/storePrice.ts";

export interface StoreCatalog {
  plans: StoreProduct[];
  /** Network tab values actually present, in display order. */
  networks: string[];
  /** Category tab values actually present, in display order. */
  categories: string[];
  /** Destination countries present, so the storefront can filter. */
  countries: string[];
  /**
   * Networks grouped by destination country (lowercased key). The store's
   * own tabs must show only its own country's networks; every other
   * country's networks belong to the destination (globe) view. A network
   * name is NOT unique across countries (Airtel sells in rw, ug, ke, tz…),
   * so filtering by name alone would mix countries — group by country.
   */
  networksByCountry: Record<string, string[]>;
  /** The store's currency, for formatting every price. */
  currency: string | null;
}

const EMPTY: StoreCatalog = {
  plans: [],
  networks: [],
  categories: [],
  countries: [],
  networksByCountry: {},
  currency: null,
};

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [
    ...new Set(values.filter((v): v is string => !!v && !!v.trim())),
  ]
    .map((v) => v.trim())
    .sort();
}

/**
 * Group each plan's network by its destination country (lowercased key).
 * The storefront's own tabs use only the store's country's group; the
 * destination (globe) view uses the rest.
 */
function groupNetworksByCountry(plans: StoreProduct[]): Record<string, string[]> {
  const byCountry: Record<string, Set<string>> = {};
  for (const p of plans) {
    const cc = (p.country_code || "").toLowerCase();
    const net = (p.network || "").trim();
    if (!cc || !net) continue;
    (byCountry[cc] ||= new Set()).add(net);
  }
  const result: Record<string, string[]> = {};
  for (const [cc, set] of Object.entries(byCountry)) {
    result[cc] = [...set].sort();
  }
  return result;
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
      "id, provider, provider_plan_id, country_code, network, name, description, category, data_amount, validity, base_price, currency, send_value, send_currency, price_type, range_min, range_max, range_increment, zendit_fx, is_active",
    )
    .in("id", planIds)
    .eq("is_active", true)
    .order("country_code", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (category) query = query.eq("category", category);

  const { data: basePlans, error: plansError } = await query;

  if (plansError) {
    console.error("Store catalog plans error:", plansError);
    return EMPTY;
  }
  if (!basePlans || basePlans.length === 0) return EMPTY;

  // The store's currency and rate, loaded once through the shared loader.
  // A missing rate is a hard failure (an empty catalog) rather than a guess.
  let storeContext, platformMarkups;
  try {
    const loaded = await loadStoreContext(supabase, {
      countryCode: (countryCode || "").toLowerCase(),
    });
    storeContext = loaded.context;
    platformMarkups = loaded.platformMarkups;
  } catch (error) {
    console.error("Store catalog pricing unavailable:", error);
    return EMPTY;
  }

  const configById = new Map(configs.map((c) => [c.plan_id, c]));

  const plans: StoreProduct[] = basePlans.map((p) => {
    const cfg = configById.get(p.id);
    const isRange = (p.price_type ?? "FIXED").toUpperCase() === "RANGE";
    // A RANGE offer shows the price of its minimum amount ("from X"); the
    // customer's chosen amount is priced at checkout through the same
    // pipeline. A FIXED offer prices from its stored cost.
    const priced = isRange && p.range_min != null
      ? priceRangePlan(
        p as never,
        (cfg ?? null) as never,
        storeContext,
        platformMarkups,
        Number(p.range_min),
      )
      : pricePlan(
        p as never,
        (cfg ?? null) as never,
        storeContext,
        platformMarkups,
      );

    const sellingPrice = priced.customerPriceDecimal;
    // The reseller's cost basis is the platform price, not the raw cost.
    const costLocal = priced.platformLocalDecimal;

    return {
      id: p.id,
      plan_id: p.provider_plan_id,
      name: p.name,
      description: p.description ?? undefined,
      category: p.category,
      network: (p.network && p.network.trim()) || p.provider || undefined,
      price: sellingPrice,
      base_price: costLocal,
      profit: sellingPrice - costLocal,
      markup_percent: costLocal > 0 ? ((sellingPrice - costLocal) / costLocal) * 100 : 0,
      validity: p.validity ?? undefined,
      data_amount: p.data_amount ?? undefined,
      is_active: true,
      is_featured: false,
      currency: priced.storeCurrency,
      country_code: p.country_code ?? undefined,
      price_type: isRange ? "RANGE" : "FIXED",
      range_min: isRange ? Number(p.range_min) : undefined,
      range_max: isRange ? Number(p.range_max ?? 0) : undefined,
      range_increment: isRange
        ? (p.range_increment != null ? Number(p.range_increment) : undefined)
        : undefined,
      send_value: p.send_value != null ? Number(p.send_value) : undefined,
      send_currency: p.send_currency ?? undefined,
    };
  });

  return {
    plans,
    networks: uniqueSorted(plans.map((p) => p.network)),
    categories: uniqueSorted(plans.map((p) => p.category)),
    countries: uniqueSorted(plans.map((p) => p.country_code)),
    networksByCountry: groupNetworksByCountry(plans),
    currency: storeContext.currency,
  };
}
