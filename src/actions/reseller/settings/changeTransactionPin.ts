// src/actions/reseller/settings/changeTransactionPin.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function changeTransactionPin(
  currentPin: string,
  newPin: string,
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

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("transaction_pin")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Validate current pin
    if (application.transaction_pin !== currentPin) {
      return { success: false, error: "Current PIN is incorrect" };
    }

    // Update pin
    const { error: updateError } = await supabase
      .from("global_reseller_applications")
      .update({
        transaction_pin: newPin,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", user.id);

    if (updateError) {
      console.error("Update PIN error:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("ChangeTransactionPin Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
