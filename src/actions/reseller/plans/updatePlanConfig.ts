// src/actions/reseller/plans/updatePlanConfig.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveStoredSellingPrice } from "@/lib/pricing/resellerPlanPrice";

interface UpdatePlanConfigParams {
  planId: string;
  markupType: "percentage" | "fixed";
  markupValue: number;
}

// Every column the pricing pipeline reads, so the stored selling price is the
// converted customer price rather than `base_price + markup` (Phase 2, step 6).
const PLAN_PRICING_COLUMNS =
  "id, provider_plan_id, country_code, network, name, category, base_price, currency, send_value, send_currency, price_type, range_min, range_max, range_increment, zendit_fx";

export async function updatePlanConfig(
  params: UpdatePlanConfigParams,
): Promise<{
  success: boolean;
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

    const { data: plan, error: planError } = await adminClient
      .from("global_base_plans")
      .select(PLAN_PRICING_COLUMNS)
      .eq("id", params.planId)
      .single();

    if (planError || !plan) {
      return { success: false, error: "Plan not found" };
    }

    // The stored selling price is the pipeline's customer price in the store
    // currency, not `base_price + markup`. `base_price` is a USD cost, so the
    // old arithmetic stored a dollar figure as if it were RWF.
    const sellingPrice = await resolveStoredSellingPrice({
      countryCode: application.country_code,
      plan,
      config: {
        markup_type: params.markupType,
        markup_value: params.markupValue,
        // Ignore any previously pinned price: this call sets a NEW markup.
        selling_price: null,
      },
    });

    // Check if config exists
    const { data: existingConfig } = await adminClient
      .from("global_reseller_plan_configs")
      .select("id")
      .eq("plan_id", params.planId)
      .eq("reseller_id", application.id)
      .single();

    if (existingConfig) {
      // Update existing config
      const { error: updateError } = await adminClient
        .from("global_reseller_plan_configs")
        .update({
          markup_type: params.markupType,
          markup_value: params.markupValue,
          selling_price: sellingPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConfig.id)
        .eq("reseller_id", application.id);

      if (updateError) {
        console.error("Update plan config error:", updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // Create new config
      const { error: insertError } = await adminClient
        .from("global_reseller_plan_configs")
        .insert({
          reseller_id: application.id,
          plan_id: params.planId,
          enabled: true,
          markup_type: params.markupType,
          markup_value: params.markupValue,
          selling_price: sellingPrice,
        });

      if (insertError) {
        console.error("Create plan config error:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("UpdatePlanConfig Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
