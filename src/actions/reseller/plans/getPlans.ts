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
      .select("id, brand_color, store_name, store_slug, country_code")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const countryCodeUpper = application.country_code.toUpperCase();
    const countryCodeLower = application.country_code.toLowerCase();

    // Get the country config
    const countryConfig = getCountryConfig(countryCodeLower);
    const serviceProvider = countryConfig.serviceProvider;
    const localCurrency = countryConfig.currency;

    // Get default markup from country config (or use 0)
    const defaultMarkup = countryConfig.defaultMarkup || 0;

    // Build the query
    let query = adminClient
      .from("global_base_plans")
      .select(
        `
        *,
        config:global_reseller_plan_configs!plan_id (
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
      // country_code is written lowercased by the Zendit sync and uppercased
      // by the Accragh sync, so an exact match on one case silently returns
      // zero rows for the other provider's stores. Match case-insensitively.
      .ilike("country_code", countryCodeUpper)
      .eq("is_active", true)
      .eq("provider", serviceProvider);

    if (params.network) {
      query = query.eq("network", params.network);
    }

    query = query.order("base_price", { ascending: true });

    const { data: plans, error: plansError } = await query;

    if (plansError) {
      console.error("Get plans error:", plansError);
      return { success: false, error: plansError.message };
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
      // Find config for this reseller
      const configs = plan.config || [];
      const existingConfig = configs.find(
        (c: any) => c.reseller_id === application.id,
      );

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

      // No config exists yet: hand the UI a virtual, DISABLED config seeded
      // with the country's default markup. The `selling_price` is the
      // pipeline's real number, so a toggle writes a correct value.
      const config = existingConfig
        ? {
          ...existingConfig,
          selling_price: Math.round(sellingPriceLocal),
        }
        : {
          id: null,
          reseller_id: application.id,
          plan_id: plan.id,
          enabled: false,
          markup_type: "percentage" as const,
          markup_value: defaultMarkup,
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
