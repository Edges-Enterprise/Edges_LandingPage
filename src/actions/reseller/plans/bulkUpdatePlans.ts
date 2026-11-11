// src/actions/reseller/plans/bulkUpdatePlans.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import {
  loadStoreContextRows,
  pricePlan,
  priceRangePlan,
} from "../../../../supabase/functions/_shared/currency/storePrice.ts";
import { platformMarkupChain } from "../../../../supabase/functions/_shared/currency/markup.ts";

interface BulkUpdatePlansParams {
  network?: string;
  markupType: "percentage" | "fixed";
  markupValue: number;
  /**
   * Global (world) view: apply across every country for this provider
   * instead of only the reseller's own country. `country` narrows it to one
   * destination. Both default to the reseller's own country + provider, so
   * the existing dashboard behaviour is unchanged.
   */
  global?: boolean;
  provider?: string;
  country?: string;
}

const PLAN_PRICING_COLUMNS =
  "id, provider_plan_id, country_code, network, name, category, base_price, currency, send_value, send_currency, price_type, range_min, range_max, range_increment, zendit_fx";

export async function bulkUpdatePlans(params: BulkUpdatePlansParams): Promise<{
  success: boolean;
  count?: number;
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

    const countryCodeUpper = application.country_code.toUpperCase();
    const countryCodeLower = application.country_code.toLowerCase();

    // Get the country config to determine which service provider to use
    const countryConfig = getCountryConfig(countryCodeLower);
    const serviceProvider = countryConfig.serviceProvider;

    // Global (world) view: the reseller may bulk-apply across every country
    // Zendit covers, not only their own. `country` narrows to one
    // destination. The default path is unchanged (own country + provider).
    const provider = params.global ? (params.provider || "zendit") : serviceProvider;

    // Get all plans for the scope, optionally filtered by network
    let query = adminClient
      .from("global_base_plans")
      .select(PLAN_PRICING_COLUMNS)
      .eq("is_active", true)
      .eq("provider", provider);

    if (params.global) {
      if (params.country) {
        // country_code is mixed-case across the syncs, so match loosely.
        query = query.ilike("country_code", params.country);
      }
    } else {
      // See getPlans: country_code is mixed-case across the two syncs, so
      // match case-insensitively or one provider's stores see zero plans.
      query = query.ilike("country_code", countryCodeUpper);
    }

    if (params.network) {
      query = query.eq("network", params.network);
    }

    const { data: plans, error: plansError } = await query;

    if (plansError) {
      return { success: false, error: plansError.message };
    }

    // The store's currency, fresh rate and platform markups, loaded once.
    let storeContext, markupRows;
    try {
      const loaded = await loadStoreContextRows(adminClient, {
        countryCode: countryCodeLower,
      });
      storeContext = loaded.context;
      markupRows = loaded.markupRows;
    } catch (error) {
      console.error("BulkUpdatePlans pricing unavailable:", error);
      return { success: false, error: "Store pricing unavailable" };
    }

    // Price every plan in memory through the ONE pipeline, then write them in
    // a single batched upsert. The previous version did a SELECT + write per
    // plan (about 2 round-trips each), which is what made a bulk apply slow
    // and forced the global view to forbid "all countries + all networks".
    const now = new Date().toISOString();
    const rows = (plans || []).map((plan) => {
      const platformMarkups = platformMarkupChain(markupRows, {
        countryCode: countryCodeLower,
        planId: plan.id,
      });
      const isRange = (plan.price_type ?? "FIXED").toUpperCase() === "RANGE";
      const priced = isRange && plan.range_min != null
        ? priceRangePlan(
          plan,
          { markup_type: params.markupType, markup_value: params.markupValue, selling_price: null },
          storeContext,
          platformMarkups,
          Number(plan.range_min),
        )
        : pricePlan(
          plan,
          { markup_type: params.markupType, markup_value: params.markupValue, selling_price: null },
          storeContext,
          platformMarkups,
        );
      return {
        reseller_id: application.id,
        plan_id: plan.id,
        // A bulk markup apply also enables the plans it touches, so the cards
        // reflect the change at once (the insert path always did this).
        enabled: true,
        markup_type: params.markupType,
        markup_value: params.markupValue,
        selling_price: Math.round(priced.customerPriceDecimal),
        updated_at: now,
      };
    });

    if (rows.length === 0) {
      return { success: true, count: 0 };
    }

    // One upsert per chunk. The unique constraint on (reseller_id, plan_id)
    // turns this into INSERT ... ON CONFLICT DO UPDATE, so an existing config
    // is updated in place and a missing one is created — no per-plan SELECT.
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error: upsertError } = await adminClient
        .from("global_reseller_plan_configs")
        .upsert(rows.slice(i, i + CHUNK), {
          onConflict: "reseller_id,plan_id",
        });

      if (upsertError) {
        console.error("BulkUpdatePlans upsert failed:", upsertError);
        return { success: false, error: "Failed to update plans" };
      }
    }

    return {
      success: true,
      count: rows.length,
    };
  } catch (error) {
    console.error("BulkUpdatePlans Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
