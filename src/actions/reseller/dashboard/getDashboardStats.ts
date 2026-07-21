// src/actions/reseller/dashboard/getDashboardStats.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface DashboardStats {
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  total_profit: number;
  orders_last_30_days: number;
  customers_last_30_days: number;
}

export async function getDashboardStats(): Promise<{
  success: boolean;
  data?: DashboardStats;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return { success: false, error: "Unauthorized" };
    }

    // Call RPC - using the global version
    const { data, error } = await supabase.rpc(
      "get_global_reseller_dashboard_stats",
      { p_user_id: user.id },
    );

    if (error) {
      console.error("RPC Error:", error);
      return { success: false, error: error.message };
    }

    // Check for error in response
    if (data?.error) {
      return { success: false, error: data.error };
    }

    // Ensure all fields have default values
    const stats: DashboardStats = {
      total_customers: data?.total_customers || 0,
      total_orders: data?.total_orders || 0,
      total_revenue: data?.total_revenue || 0,
      total_profit: data?.total_profit || 0,
      orders_last_30_days: data?.orders_last_30_days || 0,
      customers_last_30_days: data?.customers_last_30_days || 0,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("GetDashboardStats Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
