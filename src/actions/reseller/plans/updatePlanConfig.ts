// src/actions/reseller/plans/updatePlanConfig.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface UpdatePlanConfigParams {
  planId: string;
  markupType: "percentage" | "fixed";
  markupValue: number;
}

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
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const { data: plan, error: planError } = await adminClient
      .from("global_base_plans")
      .select("base_price")
      .eq("id", params.planId)
      .single();

    if (planError || !plan) {
      return { success: false, error: "Plan not found" };
    }

    const sellingPrice = calculateSellingPrice(
      plan.base_price,
      params.markupType,
      params.markupValue,
    );

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

function calculateSellingPrice(
  basePrice: number,
  markupType: "percentage" | "fixed",
  markupValue: number,
): number {
  if (markupType === "percentage") {
    return Math.round(basePrice * (1 + markupValue / 100));
  }
  return Math.round(basePrice + markupValue);
}
