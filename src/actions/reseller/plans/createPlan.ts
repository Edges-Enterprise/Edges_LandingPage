// src/actions/reseller/plans/createPlan.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface CreatePlanParams {
  name: string;
  description?: string;
  price: number;
  cost: number;
  category: string;
  provider: string;
  data_amount?: string;
  validity?: string;
  metadata?: Record<string, any>;
}

export async function createPlan(params: CreatePlanParams): Promise<{
  success: boolean;
  data?: { id: string };
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

    // Calculate profit
    const profit = params.price - params.cost;

    // Create plan
    const { data: plan, error: planError } = await supabase
      .from("global_plans")
      .insert({
        reseller_id: application.id,
        name: params.name,
        description: params.description,
        price: params.price,
        cost: params.cost,
        profit: profit,
        category: params.category,
        provider: params.provider,
        data_amount: params.data_amount,
        validity: params.validity,
        metadata: params.metadata,
        is_active: true,
      })
      .select("id")
      .single();

    if (planError) {
      console.error("Create plan error:", planError);
      return { success: false, error: planError.message };
    }

    return {
      success: true,
      data: { id: plan.id },
    };
  } catch (error) {
    console.error("CreatePlan Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
