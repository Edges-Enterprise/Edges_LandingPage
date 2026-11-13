// src/actions/reseller/plans/getGlobalPlans.ts
//
// The dashboard's GLOBAL plan list — every active Zendit plan across every
// country Zendit covers, not just the reseller's own country. This is the
// "world" view behind the globe icon on the plans page.
//
// PAGED ON PURPOSE. The world catalog is ~10,885 plans. Fetching and pricing
// all of them on open is a slow round-trip the user stares at ("Loading
// plans...") before the globe shows anything. Instead this returns ONE page of
// rows plus the true total, so the first page can be server-rendered and later
// pages stream in as the user scrolls. The total comes from a PostgREST
// `count=exact` count, so "over 10k plans" is shown without sending 10k rows.
//
// Same pricing contract as getPlans: every price comes from the ONE pipeline
// (supabase/functions/_shared/currency/storePrice.ts), priced into the STORE's
// currency, so the dashboard, the storefront and the purchase cannot disagree.
// The destination country determines which plans exist; the store determines
// what they cost and in which currency.
//
// Writes are unchanged: a plan is enabled/marked-up by its
// `global_base_plans.id`, which is unique across countries, so
// togglePlan / updatePlanConfig / bulkUpdatePlans already accept a plan from
// any country. Only the READ was scoped to the reseller's country.

"use server";

import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import {
  resolveCatalogPlan,
  toStoreCatalogSettings,
} from "../../../../supabase/functions/_shared/catalog/catalogResolution.ts";
import {
  loadStoreContextRows,
  pricePlan,
  priceRangePlan,
} from "../../../../supabase/functions/_shared/currency/storePrice.ts";
import { platformMarkupChain } from "../../../../supabase/functions/_shared/currency/markup.ts";
import {
  GLOBAL_PLANS_PAGE_SIZE,
  type GetGlobalPlansParams,
  type GetGlobalPlansResult,
} from "./globalPlansTypes";

/** Hard ceiling so a hand-crafted `limit` cannot ask for the whole catalog. */
const MAX_PAGE_SIZE = 100;

/**
 * The store's currency, fresh rate and the platform markup rows.
 *
 * Global, not per-reseller: the same store country always prices the same way,
 * so this is cached and shared across requests and resellers. A page of 32
 * plans otherwise re-reads the currency, the rate and the markup chain on every
 * scroll tick.
 */
const getStoreContextCached = unstable_cache(
  async (countryCode: string) => {
    const adminClient = createAdminClient();
    return await loadStoreContextRows(adminClient, { countryCode });
  },
  ["global-store-context"],
  { revalidate: 600, tags: ["global-plans"] },
);

export async function getGlobalPlans(
  params: GetGlobalPlansParams = {},
): Promise<{
  success: boolean;
  data?: GetGlobalPlansResult;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const adminClient = createAdminClient();

    const { data: application, error: appError } = await adminClient
      .from("global_reseller_applications")
      .select("id, country_code, catalog_mode, default_markup_type, default_markup_value")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const settings = toStoreCatalogSettings(application);
    const countryCodeLower = (application.country_code || "").toLowerCase();
    const countryConfig = getCountryConfig(countryCodeLower);
    const localCurrency = countryConfig.currency;

    const limit = Math.min(
      Math.max(Math.floor(params.limit ?? GLOBAL_PLANS_PAGE_SIZE), 1),
      MAX_PAGE_SIZE,
    );
    const offset = Math.max(Math.floor(params.offset ?? 0), 0);

    // A search term becomes a PostgREST `or` over the searchable columns. The
    // term is stripped of the characters that are syntax in that filter, so a
    // stray comma or parenthesis cannot break the query.
    const searchTerm = (params.search || "").replace(/[%,()*\\]/g, " ").trim();

    const buildQuery = () => {
      // The config embed is a LEFT join scoped to THIS reseller, so a plan with
      // no row still appears (that is what `all` catalog mode sells). The count
      // is exact so the UI can show the true total behind the page.
      let q = adminClient
        .from("global_base_plans")
        .select(
          `
        *,
        config:global_reseller_plan_configs!left (
          id,
          reseller_id,
          plan_id,
          enabled,
          markup_type,
          markup_value,
          selling_price
        )
      `,
          { count: "exact" },
        )
        .eq("config.reseller_id", application.id)
        .eq("provider", "zendit")
        .eq("is_active", true);

      if (params.country && params.country !== "all") {
        // country_code is mixed-case across the syncs, so match loosely.
        q = q.ilike("country_code", params.country);
      }
      if (params.network && params.network !== "all") {
        q = q.eq("network", params.network);
      }
      if (params.category) {
        q = q.eq("category", params.category);
      }
      if (searchTerm) {
        q = q.or(
          `name.ilike.*${searchTerm}*,network.ilike.*${searchTerm}*,provider_plan_id.ilike.*${searchTerm}*,country_code.ilike.*${searchTerm}*`,
        );
      }

      return q
        .order("country_code", { ascending: true })
        .order("network", { ascending: true })
        .order("base_price", { ascending: true })
        // A UNIQUE tiebreaker, so Range pages never skip or repeat a row.
        .order("id", { ascending: true });
    };

    const { data: plans, count, error: plansError } = await buildQuery().range(
      offset,
      offset + limit - 1,
    );

    if (plansError) {
      console.error("Get global plans error:", plansError);
      return { success: false, error: plansError.message };
    }

    let storeContext, markupRows;
    try {
      const loaded = await getStoreContextCached(countryCodeLower);
      storeContext = loaded.context;
      markupRows = loaded.markupRows;
    } catch (error) {
      console.error("Get global plans pricing unavailable:", error);
      return { success: false, error: "Store pricing unavailable" };
    }

    const processedPlans = (plans || []).map((plan: any) => {
      // The embed is a LEFT join scoped to this reseller, so config is a
      // 0-or-1 element array: this reseller's own row, or none.
      const rowConfig = Array.isArray(plan.config)
        ? plan.config[0] ?? null
        : plan.config ?? null;

      // Resolve the plan the same way the storefront does. In `all` mode a
      // plan with no row is sold at the store default, so the dashboard shows
      // the same enabled/markup state the customer sees.
      const resolved = resolveCatalogPlan(rowConfig, settings);
      const existingConfig = resolved.config;

      const platformMarkups = platformMarkupChain(markupRows, {
        countryCode: countryCodeLower,
        planId: plan.id,
        provider: plan.provider,
        home: (plan.currency ?? "USD").toUpperCase() ===
          (storeContext.currency ?? "").toUpperCase(),
      });

      const isRange = (plan.price_type ?? "FIXED").toUpperCase() === "RANGE";

      const priced = isRange && plan.range_min != null
        ? priceRangePlan(
          plan,
          existingConfig ?? null,
          storeContext,
          platformMarkups,
          Number(plan.range_min),
        )
        : pricePlan(
          plan,
          existingConfig ?? null,
          storeContext,
          platformMarkups,
        );

      const costLocal = priced.platformLocalDecimal;
      const sellingPriceLocal = priced.customerPriceDecimal;
      const profitLocal = sellingPriceLocal - costLocal;
      const profitPercent = costLocal > 0
        ? (profitLocal / costLocal) * 100
        : 0;

      // A concrete config for the UI. `enabled` follows the resolution, so in
      // `all` mode a plan with no row reads as enabled (it IS sold, at the
      // store default) and in `selected` mode it reads as off.
      const config = {
        id: existingConfig?.id ?? null,
        reseller_id: application.id,
        plan_id: plan.id,
        enabled: resolved.include,
        markup_type: (existingConfig?.markup_type ?? "percentage") as
          | "percentage"
          | "fixed",
        markup_value: existingConfig?.markup_value ?? 0,
        selling_price: Math.round(sellingPriceLocal),
      };

      return {
        ...plan,
        config,
        display_currency: priced.storeCurrency || localCurrency,
        display_amount: costLocal,
        display_send_currency: plan.send_currency || localCurrency,
        display_send_amount: plan.send_value ?? plan.base_price,
        cost_local: costLocal,
        selling_price_local: sellingPriceLocal,
        markup_local: existingConfig?.markup_value ?? 0,
        profit_local: profitLocal,
        profit_percent: profitPercent,
        exchange_rate: priced.rate,
        price_type: isRange ? "RANGE" : "FIXED",
        range_min: isRange ? Number(plan.range_min) : undefined,
        range_max: isRange ? Number(plan.range_max ?? 0) : undefined,
        range_increment: isRange && plan.range_increment != null
          ? Number(plan.range_increment)
          : undefined,
        profit: profitLocal,
      };
    });

    return {
      success: true,
      data: {
        plans: processedPlans as GetGlobalPlansResult["plans"],
        total: count ?? processedPlans.length,
      },
    };
  } catch (error) {
    console.error("GetGlobalPlans Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
