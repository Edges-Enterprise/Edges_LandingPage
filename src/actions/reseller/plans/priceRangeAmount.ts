// src/actions/reseller/plans/priceRangeAmount.ts
//
// Phase 2, step 8. Price a RANGE offer for the amount the customer typed.
//
// A RANGE offer's shelf price is a function of the chosen amount, so the
// storefront cannot read it off the catalog. This action runs the same shared
// pipeline the purchase uses, so the number shown on the confirm screen is the
// number the customer is charged. It is a display/quote call; the purchase
// re-prices and re-validates against the current bounds.

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadStoreContextRows,
  priceRangePlan,
} from "../../../../supabase/functions/_shared/currency/storePrice.ts";
import { platformMarkupChain } from "../../../../supabase/functions/_shared/currency/markup.ts";

interface PriceRangeAmountParams {
  resellerId: string;
  /**
   * `global_base_plans.provider_plan_id` — the provider-facing id the catalog
   * shows and the purchase edge function expects. NOT the table's `id` (a
   * uuid the storefront never sees).
   */
  providerPlanId: string;
  /**
   * The plan's destination country (`global_base_plans.country_code`). Part of
   * the plan's identity, because `provider_plan_id` is only unique per country.
   */
  countryCode?: string;
  /** The recipient amount the customer entered, in the send currency. */
  sendAmount: number;
}

export async function priceRangeAmount(params: PriceRangeAmountParams): Promise<{
  success: boolean;
  data?: {
    customerPrice: number;
    currency: string;
    sendAmount: number;
    sendCurrency: string;
    min: number;
    max: number;
    increment: number | null;
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const adminClient = createAdminClient();

    const { data: application, error: appError } = await adminClient
      .from("global_reseller_applications")
      .select("id, country_code")
      .eq("id", params.resellerId)
      .single();

    if (appError || !application) {
      return { success: false, error: "Store not found" };
    }

    // The catalog hands the client the provider-facing id, which is what the
    // purchase edge function also resolves by (see purchaseOrchestrator.ts).
    // The table's own `id` is a uuid the storefront never sees.
    //
    // `provider_plan_id` is only unique per country (Zendit numbers plans per
    // provider, so lizzysub's NG "116" and accragh's GH "116" coexist), so the
    // plan's country is part of the key. `.single()` over the id alone matched
    // both rows and failed with PGRST116, surfacing as "Plan not found".
    // `country_code` is mixed-case in this table (Zendit lowercases, Accragh
    // uppercases), so it must be matched case-insensitively.
    const planCountry = (params.countryCode || "").trim();
    let planQuery = adminClient
      .from("global_base_plans")
      .select(
        "id, provider, provider_plan_id, country_code, network, name, category, base_price, currency, send_value, send_currency, price_type, range_min, range_max, range_increment, zendit_fx",
      )
      .eq("provider_plan_id", params.providerPlanId)
      .eq("is_active", true);

    if (planCountry) {
      planQuery = planQuery.ilike("country_code", planCountry);
    }

    const { data: planRows, error: planError } = await planQuery.limit(20);
    let plan = planRows?.length === 1 ? planRows[0] : null;

    // An ambiguous id with no `countryCode` from the caller (an older client)
    // is disambiguated by which of the colliding plans this store actually
    // sells. Still ambiguous after that = refuse rather than guess.
    if (!plan && !planError && planRows && planRows.length > 1) {
      const { data: enabledConfigs } = await adminClient
        .from("global_reseller_plan_configs")
        .select("plan_id")
        .eq("reseller_id", params.resellerId)
        .eq("enabled", true)
        .in(
          "plan_id",
          planRows.map((row) => row.id),
        );

      if (enabledConfigs?.length === 1) {
        plan =
          planRows.find((row) => row.id === enabledConfigs[0].plan_id) ?? null;
      }
    }

    if (planError || !plan) {
      return { success: false, error: "Plan not found" };
    }

    const { data: config } = await adminClient
      .from("global_reseller_plan_configs")
      .select("plan_id, enabled, markup_type, markup_value, selling_price")
      .eq("plan_id", plan.id)
      .eq("reseller_id", application.id)
      .single();

    // The plan must be enabled for this store, matching the storefront.
    if (!config?.enabled) {
      return { success: false, error: "Plan not available" };
    }

    const { context, markupRows } = await loadStoreContextRows(adminClient, {
      countryCode: application.country_code,
    });
    const platformMarkups = platformMarkupChain(markupRows, {
      countryCode: (application.country_code || "").toLowerCase(),
      planId: plan.id,
      provider: plan.provider,
      home: (plan.currency ?? "USD").toUpperCase() ===
        (context.currency ?? "").toUpperCase(),
    });

    const priced = priceRangePlan(
      plan as never,
      // Ignore any stored pin: a RANGE price depends on the amount chosen, so
      // a `selling_price` snapshot is never authoritative. Price from the
      // markup, exactly as the card and the purchase path do.
      { ...(config as Record<string, unknown>), selling_price: null } as never,
      context,
      platformMarkups,
      params.sendAmount,
    );

    return {
      success: true,
      data: {
        customerPrice: priced.customerPriceDecimal,
        currency: priced.storeCurrency,
        sendAmount: priced.sendAmount,
        sendCurrency: priced.sendCurrency ?? plan.send_currency ?? "",
        min: Number(plan.range_min ?? 0),
        max: Number(plan.range_max ?? 0),
        increment: plan.range_increment ?? null,
      },
    };
  } catch (error) {
    // RangeError from validateRangeAmount carries a customer-facing message.
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to price amount",
    };
  }
}
