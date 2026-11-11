// src/actions/reseller/plans/getPlans.ts
//
// The dashboard's plan list. Phase 2, step 6: every price here comes from the
// ONE pipeline (supabase/functions/_shared/currency/storePrice.ts), the same
// function the storefront and the purchase edge functions use.
//
// Before Phase 2 this action fetched `exchangerate-api.com` and computed
// `cost_local = round(base_price * rate)` and `selling = cost_local * (1 +
// markup/100)` itself. That was the third copy of the pricing arithmetic the
// design set out to remove, it priced the reseller's cost WITHOUT the platform
// markup, and it used an external feed the design explicitly drops (it returns
// the wrong rate for ZWL and IRR, which removing the country constraint newly
// exposes). All of that is now the pipeline's job.
//
// The dashboard is scoped to the reseller's own country/provider, as before;
// widening it to every Zendit country is a separate UI task, not this one.

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanWithConfig } from "@/types/reseller/plans";
import { getCountryConfig } from "@/config/countries";
import { fetchAllRows } from "../../../../supabase/functions/_shared/catalog/fetchAll.ts";
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

export interface GetPlansParams {
  network?: string;
  enabled?: boolean;
}

export async function getPlans(params: GetPlansParams = {}): Promise<{
  success: boolean;
  data?: PlanWithConfig[];
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

    // Get the reseller's application
    const { data: application, error: appError } = await adminClient
      .from("global_reseller_applications")
      .select(
        "id, brand_color, store_name, store_slug, country_code, catalog_mode, default_markup_type, default_markup_value",
      )
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const settings = toStoreCatalogSettings(application);

    const countryCodeUpper = application.country_code.toUpperCase();
    const countryCodeLower = application.country_code.toLowerCase();

    // Get the country config
    const countryConfig = getCountryConfig(countryCodeLower);
    const serviceProvider = countryConfig.serviceProvider;
    const localCurrency = countryConfig.currency;

    // Build the query. The config embed is a LEFT join scoped to THIS
    // reseller (a bare embed returned every reseller's config and filtered in
    // memory), and the read is paged past PostgREST's 1,000-row cap.
    const buildQuery = () => {
      let query = adminClient
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
        )
        .eq("config.reseller_id", application.id)
        // country_code is written lowercased by the Zendit sync and
        // uppercased by the Accragh sync, so an exact match on one case
        // silently returns zero rows for the other provider's stores. Match
        // case-insensitively.
        .ilike("country_code", countryCodeUpper)
        .eq("is_active", true)
        .eq("provider", serviceProvider);

      if (params.network) {
        query = query.eq("network", params.network);
      }

      // Range pagination needs a UNIQUE tiebreaker, or rows with equal
      // base_price can be skipped or repeated across pages.
      return query
        .order("base_price", { ascending: true })
        .order("id", { ascending: true });
    };

    const { data: plans, error: plansError } = await fetchAllRows<any>(buildQuery);

    if (plansError) {
      console.error("Get plans error:", plansError);
      return { success: false, error: plansError };
    }

    // The store's currency, its fresh rate and the platform markup rows,
    // loaded once for the whole page.
    let storeContext, markupRows;
    try {
      const loaded = await loadStoreContextRows(adminClient, {
        countryCode: countryCodeLower,
      });
      storeContext = loaded.context;
      markupRows = loaded.markupRows;
    } catch (error) {
      console.error("Get plans pricing unavailable:", error);
      return { success: false, error: "Store pricing unavailable" };
    }

    // Process plans
    const processedPlans = (plans || []).map((plan: any) => {
      // The embed is a LEFT join scoped to this reseller, so config is a
      // 0-or-1 element array. Resolve it the same way the storefront does, so
      // in `all` mode a plan with no row reads as enabled at the store default.
      const rowConfig = Array.isArray(plan.config)
        ? plan.config[0] ?? null
        : plan.config ?? null;
      const resolved = resolveCatalogPlan(rowConfig, settings);
      const existingConfig = resolved.config;

      const platformMarkups = platformMarkupChain(markupRows, {
        countryCode: countryCodeLower,
        planId: plan.id,
      });

      const isRange = (plan.price_type ?? "FIXED").toUpperCase() === "RANGE";

      // A RANGE offer has no single price; show its minimum ("from X").
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

      // The reseller's cost basis is the PLATFORM price — the raw wholesale
      // cost plus the platform markup and FX buffer — not the raw cost. The
      // reseller marks up on this number, and it is what the purchase RPC
      // deducts; the raw cost stays the platform's own exposure.
      const costLocal = priced.platformLocalDecimal;
      const sellingPriceLocal = priced.customerPriceDecimal;
      const profitLocal = sellingPriceLocal - costLocal;
      const profitPercent = costLocal > 0
        ? (profitLocal / costLocal) * 100
        : 0;

      // A concrete config for the UI. `enabled` follows the resolution: in
      // `all` mode a plan with no row reads as enabled (it IS sold, at the
      // store default); in `selected` mode it reads as off until toggled. The
      // `selling_price` is the pipeline's real number, so a toggle writes a
      // correct value.
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
        // Local-currency values for display, all from the pipeline.
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
        // Legacy fields for compatibility
        profit: profitLocal,
      };
    });

    return {
      success: true,
      data: processedPlans as PlanWithConfig[],
    };
  } catch (error) {
    console.error("GetPlans Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
