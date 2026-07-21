// src/actions/reseller/customers/getCustomerDetails.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface CustomerDetails {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: "active" | "inactive";
  total_spent: number;
  total_orders: number;
  average_order_value: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCustomerDetails(customerId: string): Promise<{
  success: boolean;
  data?: CustomerDetails;
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
      .select("*")
      .eq("id", customerId)
      .eq("reseller_id", application.id)
      .single();

    if (customerError) {
      console.error("Get customer error:", customerError);
      return { success: false, error: customerError.message };
    }

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Get orders for this customer
    const { data: orders, error: ordersError } = await supabase
      .from("global_orders")
      .select("*")
      .eq("customer_id", customerId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Get orders error:", ordersError);
    }

    const totalOrders = orders?.length || 0;
    const totalSpent = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderAt = orders?.[0]?.created_at || null;

    return {
      success: true,
      data: {
        ...customer,
        total_spent: totalSpent,
        total_orders: totalOrders,
        average_order_value: avgOrderValue,
        last_order_at: lastOrderAt,
      },
    };
  } catch (error) {
    console.error("GetCustomerDetails Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
