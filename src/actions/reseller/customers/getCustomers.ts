// src/actions/reseller/customers/getCustomers.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_spent: number;
  total_orders: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface GetCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive" | "all";
  sortBy?: "name" | "email" | "total_spent" | "total_orders" | "created_at";
  sortOrder?: "asc" | "desc";
}

export async function getCustomers(params: GetCustomersParams = {}): Promise<{
  success: boolean;
  data?: Customer[];
  total?: number;
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

    // Build query
    let query = supabase
      .from("global_customers")
      .select("*", { count: "exact" })
      .eq("reseller_id", application.id);

    // Apply filters
    if (params.search) {
      query = query.or(
        `first_name.ilike.%${params.search}%,` +
          `last_name.ilike.%${params.search}%,` +
          `email.ilike.%${params.search}%,` +
          `phone.ilike.%${params.search}%`,
      );
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    // Apply sorting
    const sortBy = params.sortBy || "created_at";
    const sortOrder = params.sortOrder || "desc";
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    query = query.range(start, end);

    const { data: customers, error: customersError, count } = await query;

    if (customersError) {
      console.error("Get customers error:", customersError);
      return { success: false, error: customersError.message };
    }

    // Calculate total spent and orders for each customer
    const enrichedCustomers = await Promise.all(
      (customers || []).map(async (customer) => {
        // Get total spent from orders
        const { data: orders } = await supabase
          .from("global_orders")
          .select("total")
          .eq("customer_id", customer.id)
          .eq("status", "completed");

        const totalSpent =
          orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const totalOrders = orders?.length || 0;

        return {
          ...customer,
          total_spent: totalSpent,
          total_orders: totalOrders,
        };
      }),
    );

    return {
      success: true,
      data: enrichedCustomers,
      total: count || 0,
    };
  } catch (error) {
    console.error("GetCustomers Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
