// src/actions/reseller/orders/getOrders.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  profit: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  payment_method: string;
  transaction_reference: string;
  created_at: string;
  updated_at: string;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "pending" | "completed" | "failed" | "cancelled" | "all";
  sortBy?: "created_at" | "amount" | "status" | "customer_name";
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}

export async function getOrders(params: GetOrdersParams = {}): Promise<{
  success: boolean;
  data?: Order[];
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
      .from("global_orders")
      .select("*", { count: "exact" })
      .eq("reseller_id", application.id);

    // Apply filters
    if (params.search) {
      query = query.or(
        `customer_name.ilike.%${params.search}%,` +
          `plan_name.ilike.%${params.search}%,` +
          `transaction_reference.ilike.%${params.search}%`,
      );
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params.dateFrom) {
      query = query.gte("created_at", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.lte("created_at", params.dateTo);
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

    const { data: orders, error: ordersError, count } = await query;

    if (ordersError) {
      console.error("Get orders error:", ordersError);
      return { success: false, error: ordersError.message };
    }

    return {
      success: true,
      data: orders || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("GetOrders Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
