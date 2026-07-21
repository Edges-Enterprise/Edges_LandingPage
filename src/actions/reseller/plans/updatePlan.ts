// src/actions/reseller/plans/updatePlan.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface UpdatePlanParams {
  planId: string;
  name?: string;
  description?: string;
  price?: number;
  cost?: number;
  category?: string;
  provider?: string;
  data_amount?: string;
  validity?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export async function updatePlan(params: UpdatePlanParams): Promise<{
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

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined)
      updates.description = params.description;
    if (params.category !== undefined) updates.category = params.category;
    if (params.provider !== undefined) updates.provider = params.provider;
    if (params.data_amount !== undefined)
      updates.data_amount = params.data_amount;
    if (params.validity !== undefined) updates.validity = params.validity;
    if (params.is_active !== undefined) updates.is_active = params.is_active;
    if (params.metadata !== undefined) updates.metadata = params.metadata;

    // If price or cost changed, recalculate profit
    if (params.price !== undefined || params.cost !== undefined) {
      // Get current plan to get the other value
      const { data: currentPlan } = await supabase
        .from("global_plans")
        .select("price, cost")
        .eq("id", params.planId)
        .eq("reseller_id", application.id)
        .single();

      if (currentPlan) {
        const price =
          params.price !== undefined ? params.price : currentPlan.price;
        const cost = params.cost !== undefined ? params.cost : currentPlan.cost;
        updates.profit = price - cost;
      }

      if (params.price !== undefined) updates.price = params.price;
      if (params.cost !== undefined) updates.cost = params.cost;
    }

    // Update plan
    const { error: updateError } = await supabase
      .from("global_plans")
      .update(updates)
      .eq("id", params.planId)
      .eq("reseller_id", application.id);

    if (updateError) {
      console.error("Update plan error:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("UpdatePlan Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
