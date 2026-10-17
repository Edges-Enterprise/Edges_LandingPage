// src/actions/reseller/plans/deletePlan.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function deletePlan(planId: string): Promise<{
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

    // Delete plan
    const { error: deleteError } = await supabase
      .from("global_plans")
      .delete()
      .eq("id", planId)
      .eq("reseller_id", application.id);

    if (deleteError) {
      console.error("Delete plan error:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("DeletePlan Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
