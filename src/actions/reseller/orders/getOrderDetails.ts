// src/actions/reseller/orders/getOrderDetails.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface OrderDetails {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  plan_id: string;
  plan_name: string;
  plan_description?: string;
  amount: number;
  profit: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  payment_method: string;
  transaction_reference: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function getOrderDetails(orderId: string): Promise<{
  success: boolean;
  data?: OrderDetails;
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

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("global_orders")
      .select("*")
      .eq("id", orderId)
      .eq("reseller_id", application.id)
      .single();

    if (orderError) {
      console.error("Get order error:", orderError);
      return { success: false, error: orderError.message };
    }

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Get customer details
    const { data: customer } = await supabase
      .from("global_customers")
      .select("email, phone")
      .eq("id", order.customer_id)
      .single();

    return {
      success: true,
      data: {
        ...order,
        customer_email: customer?.email || "",
        customer_phone: customer?.phone || "",
      },
    };
  } catch (error) {
    console.error("GetOrderDetails Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
