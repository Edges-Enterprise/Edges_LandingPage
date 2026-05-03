// app/actions/reseller/analytics/getDashboardStats.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/types";

/**
 * Get aggregated dashboard stats for a reseller
 */
export async function getDashboardStats(
  resellerId: string,
): Promise<DashboardStats> {
  const supabase = await createServerClient();

  // Get wallet
  const { data: wallet } = await supabase
    .from("reseller_wallets")
    .select("balance, total_sales, total_profit")
    .eq("reseller_id", resellerId)
    .single();

  // Get order counts
  const { count: totalOrders, error: ordersError } = await supabase
    .from("reseller_orders")
    .select("*", { count: "exact", head: true })
    .eq("reseller_id", resellerId);

  if (ordersError) {
    console.error("Error counting orders:", ordersError);
  }

  // Get active customers count
  const { count: activeCustomers, error: customersError } = await supabase
    .from("reseller_customers")
    .select("*", { count: "exact", head: true })
    .eq("reseller_id", resellerId);

  if (customersError) {
    console.error("Error counting customers:", customersError);
  }

  // Get recent 5 orders
  const { data: recentOrders } = await supabase
    .from("reseller_orders")
    .select(
      `
      *,
      plan:plan_id (id, name, category, base_price)
    `,
    )
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalSales: wallet?.total_sales || 0,
    totalProfit: wallet?.total_profit || 0,
    totalOrders: totalOrders || 0,
    activeCustomers: activeCustomers || 0,
    walletBalance: wallet?.balance || 0,
    recentOrders: recentOrders || [],
  };
}
