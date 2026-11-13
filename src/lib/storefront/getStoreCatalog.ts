// src/lib/storefront/getStoreCatalog.ts
//
// Customer-storefront plan catalog (Task 4, branch 2.b; Phase 2 rework).
//
// Reads the plans the store sells, per its `catalog_mode`
// (global_reseller_applications.catalog_mode):
//   selected  strict opt-in - only plans with an enabled config row for this
//             reseller (the pre-existing behaviour; a plan with no row is not
//             returned). Do NOT copy the dashboard's "missing config =
//             enabled" default - that would leak unselected plans.
//   all       every active plan, priced by the store's default markup, with a
//             per-plan config row acting as an override (enabled = false opts
//             one plan out).
// An empty result means the store sells nothing.
//
// The read is an embedded LEFT join (plans -> this reseller's configs) paged
// through PostgREST's row cap, NOT an `.in("id", [...])` over the enabled ids.
// The id-list form put every enabled id in the URL, which overflows past ~700
// ids and returned HTTP 400 - the storefront's "no active plans" failure once
// a store enabled enough plans. A join has no such limit.
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
import { fetchAllRows } from "../../../supabase/functions/_shared/catalog/fetchAll.ts";
import {
  resolveCatalogPlan,
  toStoreCatalogSettings,
  type CatalogPlanConfig,
} from "../../../supabase/functions/_shared/catalog/catalogResolution.ts";
import {
  loadStoreContextRows,
  pricePlan,
  priceRangePlan,
} from "../../../supabase/functions/_shared/currency/storePrice.ts";
import { platformMarkupChain } from "../../../supabase/functions/_shared/currency/markup.ts";

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

  // The store's catalog mode and default markup. A missing row (should not
  // happen for a live store) resolves to `selected`, the safe default.
  const { data: applicationRow } = await supabase
    .from("global_reseller_applications")
    .select("catalog_mode, default_markup_type, default_markup_value")
    .eq("id", resellerId)
    .maybeSingle();

  const settings = toStoreCatalogSettings(applicationRow);

  // Every active plan, LEFT-joined to THIS reseller's config rows. The LEFT
  // join keeps plans with no config row (config = []), which is what
  // catalog_mode = 'all' needs; the embedded filter scopes the config to this
  // reseller without dropping the parent plan. Paged past PostgREST's cap.
  const { data: rows, error: plansError } = await fetchAllRows<any>(() =>
    supabase
      .from("global_base_plans")
      .select(
        "id, provider, provider_plan_id, country_code, network, name, description, category, data_amount, validity, base_price, currency, send_value, send_currency, price_type, range_min, range_max, range_increment, zendit_fx, is_active, config:global_reseller_plan_configs!left(reseller_id, enabled, markup_type, markup_value, selling_price)",
      )
      .eq("config.reseller_id", resellerId)
      .eq("is_active", true)
      .order("country_code", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      // Range pagination needs a UNIQUE tiebreaker, or rows with equal sort
      // keys can be skipped or repeated across pages.
      .order("id", { ascending: true })
  );

  if (plansError) {
    console.error("Store catalog plans error:", plansError);
    return EMPTY;
  }

  // Apply the catalog mode. `selected` keeps only the enabled configs' plans;
  // `all` keeps every plan, priced by the store default unless it carries its
  // own row. The caller's `category` filter is applied after resolution.
  const configByPlanId = new Map<string, CatalogPlanConfig>();
  for (const row of rows) {
    const cfg = Array.isArray(row.config) ? row.config[0] : row.config;
    if (cfg) configByPlanId.set(row.id, cfg);
  }

  const basePlans: any[] = [];
  for (const row of rows) {
    if (category && row.category !== category) continue;
    const resolved = resolveCatalogPlan(configByPlanId.get(row.id) ?? null, settings);
    if (!resolved.include) continue;
    basePlans.push({ ...row, __config: resolved.config });
  }

  if (basePlans.length === 0) return EMPTY;

  // The store's currency and rate, loaded once through the shared loader.
  // A missing rate is a hard failure (an empty catalog) rather than a guess.
  // The platform markup is resolved PER PLAN below, because home vs
  // cross-border depends on each plan's cost currency.
  let storeContext, markupRows;
  try {
    const loaded = await loadStoreContextRows(supabase, {
      countryCode: (countryCode || "").toLowerCase(),
    });
    storeContext = loaded.context;
    markupRows = loaded.markupRows;
  } catch (error) {
    console.error("Store catalog pricing unavailable:", error);
    return EMPTY;
  }

  const plans: StoreProduct[] = [];
  for (const p of basePlans) {
    // Already resolved for this store: the plan's own row, or the store
    // default in `all` mode.
    const cfg = p.__config as CatalogPlanConfig | null;
    const isRange = (p.price_type ?? "FIXED").toUpperCase() === "RANGE";
    // HOME (cost currency == store currency) skips the platform markup and
    // the buffer; every other plan keeps the FX chain. Resolved per plan.
    const platformMarkups = platformMarkupChain(markupRows, {
      countryCode: (countryCode || "").toLowerCase(),
      planId: p.id,
      provider: p.provider,
      home: (p.currency ?? "USD").toUpperCase() ===
        (storeContext.currency ?? "").toUpperCase(),
    });
    // A RANGE offer shows the price of its minimum amount ("from X"); the
    // customer's chosen amount is priced at checkout through the same
    // pipeline. A FIXED offer prices from its stored cost.
    let priced;
    try {
      priced = isRange && p.range_min != null
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
    } catch (error) {
      // One unpriced plan (a cost currency with no rate, bad RANGE bounds)
      // must not blank the whole store. Skip it and keep the rest; the log
      // names it. In `all` mode a store carries every provider's plans, so a
      // single unpriceable currency is reachable and must not take the
      // storefront down.
      console.error(
        `Store catalog: skipping plan ${p.provider_plan_id}:`,
        error instanceof Error ? error.message : error,
      );
      continue;
    }

    const sellingPrice = priced.customerPriceDecimal;
    // The reseller's cost basis is the platform price, not the raw cost.
    const costLocal = priced.platformLocalDecimal;

    plans.push({
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
    });
  }

  if (plans.length === 0) return EMPTY;

  return {
    plans,
    networks: uniqueSorted(plans.map((p) => p.network)),
    categories: uniqueSorted(plans.map((p) => p.category)),
    countries: uniqueSorted(plans.map((p) => p.country_code)),
    networksByCountry: groupNetworksByCountry(plans),
    currency: storeContext.currency,
  };
}
