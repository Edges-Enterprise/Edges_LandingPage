// src/actions/reseller/plans/bulkUpdatePlans.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface BulkUpdatePlansParams {
  network?: string;
  markupType: "percentage" | "fixed";
  markupValue: number;
}

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

    // Get all plans for this reseller's country, optionally filtered by network
    let query = adminClient
      .from("global_base_plans")
      .select(
        `
        id,
        base_price
      `,
      )
      .eq("country_code", countryCodeUpper)
      .eq("is_active", true);

    if (params.network) {
      query = query.eq("network", params.network);
    }

    const { data: plans, error: plansError } = await query;

    if (plansError) {
      return { success: false, error: plansError.message };
    }

    let count = 0;

    // For each plan, update existing config or create new one
    for (const plan of plans || []) {
      const sellingPrice = calculateSellingPrice(
        plan.base_price,
        params.markupType,
        params.markupValue,
      );

      // Check if config exists
      const { data: existingConfig } = await adminClient
        .from("global_reseller_plan_configs")
        .select("id")
        .eq("plan_id", plan.id)
        .eq("reseller_id", application.id)
        .single();

      if (existingConfig) {
        // Update existing
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

        if (!updateError) count++;
      } else {
        // Create new
        const { error: insertError } = await adminClient
          .from("global_reseller_plan_configs")
          .insert({
            reseller_id: application.id,
            plan_id: plan.id,
            enabled: true,
            markup_type: params.markupType,
            markup_value: params.markupValue,
            selling_price: sellingPrice,
          });

        if (!insertError) count++;
      }
    }

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error("BulkUpdatePlans Error:", error);
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
