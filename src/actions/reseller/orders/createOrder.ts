// src/actions/reseller/orders/createOrder.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface CreateOrderParams {
  customer_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  profit: number;
  payment_method: string;
  transaction_reference?: string;
}

export async function createOrder(params: CreateOrderParams): Promise<{
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

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from("global_customers")
      .select("first_name, last_name")
      .eq("id", params.customer_id)
      .eq("reseller_id", application.id)
      .single();

    if (customerError || !customer) {
      return { success: false, error: "Customer not found" };
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("global_orders")
      .insert({
        reseller_id: application.id,
        customer_id: params.customer_id,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        plan_id: params.plan_id,
        plan_name: params.plan_name,
        amount: params.amount,
        profit: params.profit,
        status: "pending",
        payment_method: params.payment_method,
        transaction_reference:
          params.transaction_reference || `ORD-${Date.now()}`,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Create order error:", orderError);
      return { success: false, error: orderError.message };
    }

    return {
      success: true,
      data: { id: order.id },
    };
  } catch (error) {
    console.error("CreateOrder Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
