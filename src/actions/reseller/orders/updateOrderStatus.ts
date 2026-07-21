// src/actions/reseller/orders/updateOrderStatus.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "completed" | "failed" | "cancelled",
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
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Update order
    const { error: updateError } = await supabase
      .from("global_orders")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("reseller_id", application.id);

    if (updateError) {
      console.error("Update order error:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("UpdateOrderStatus Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
