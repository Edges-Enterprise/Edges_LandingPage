// src/actions/reseller/plans/getGlobalPlans.ts
//
// The dashboard's GLOBAL plan list — every active Zendit plan across every
// country Zendit covers, not just the reseller's own country. This is the
// "world" view behind the globe icon on the plans page.
//
// Same contract as getPlans: every price comes from the ONE pipeline
// (supabase/functions/_shared/currency/storePrice.ts), priced into the
// STORE's currency, so the dashboard, the storefront and the purchase
// cannot disagree. The destination country determines which plans exist;
// the store determines what they cost and in which currency.
//
// Writes are unchanged: a plan is enabled/marked-up by its
// `global_base_plans.id`, which is unique across countries, so
// togglePlan / updatePlanConfig / bulkUpdatePlans already accept a plan
// from any country. Only the READ had been scoped to the reseller's
// country.

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

export interface GetGlobalPlansParams {
  /** Destination country (lowercase), optional. */
  country?: string;
  network?: string;
  category?: string;
}

export async function getGlobalPlans(
  params: GetGlobalPlansParams = {},
): Promise<{
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

    const { data: application, error: appError } = await adminClient
      .from("global_reseller_applications")
      .select("id, country_code")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const countryCodeLower = (application.country_code || "").toLowerCase();
    const countryConfig = getCountryConfig(countryCodeLower);
    const localCurrency = countryConfig.currency;
    const defaultMarkup = countryConfig.defaultMarkup || 0;

    // Every active Zendit plan, every country. No country/provider filter:
    // the reseller may resell any destination Zendit covers.
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
      .eq("provider", "zendit")
      .eq("is_active", true);

    if (params.country) {
      query = query.ilike("country_code", params.country);
    }
    if (params.network) {
      query = query.eq("network", params.network);
    }
    if (params.category) {
      query = query.eq("category", params.category);
    }

    query = query
      .order("country_code", { ascending: true })
      .order("network", { ascending: true })
      .order("base_price", { ascending: true });

    const { data: plans, error: plansError } = await query;

    if (plansError) {
      console.error("Get global plans error:", plansError);
      return { success: false, error: plansError.message };
    }

    // The store's currency, its fresh rate and the platform markups, loaded
    // once for the whole page.
    let storeContext, markupRows;
    try {
      const loaded = await loadStoreContextRows(adminClient, {
        countryCode: countryCodeLower,
      });
      storeContext = loaded.context;
      markupRows = loaded.markupRows;
    } catch (error) {
      console.error("Get global plans pricing unavailable:", error);
      return { success: false, error: "Store pricing unavailable" };
    }

    const processedPlans = (plans || []).map((plan: any) => {
      const configs = plan.config || [];
      const existingConfig = configs.find(
        (c: any) => c.reseller_id === application.id,
      );

      const platformMarkups = platformMarkupChain(markupRows, {
        countryCode: countryCodeLower,
        planId: plan.id,
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
      data: processedPlans as PlanWithConfig[],
    };
  } catch (error) {
    console.error("GetGlobalPlans Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
