// src/actions/reseller/dashboard/getEarningsReport.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface EarningsReportItem {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface EarningsReport {
  total_revenue: number;
  total_profit: number;
  total_orders: number;
  average_order_value: number;
  profit_margin: number;
  daily: EarningsReportItem[];
  weekly: EarningsReportItem[];
  monthly: EarningsReportItem[];
}

export async function getEarningsReport(): Promise<{
  success: boolean;
  data?: EarningsReport;
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

    // Get all completed orders
    const { data: orders, error: ordersError } = await supabase
      .from("global_orders")
      .select("*")
      .eq("reseller_id", application.id)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (ordersError) {
      console.error("Orders Error:", ordersError);
      return { success: false, error: ordersError.message };
    }

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Group by day, week, month
    const daily = groupByPeriod(orders, "day");
    const weekly = groupByPeriod(orders, "week");
    const monthly = groupByPeriod(orders, "month");

    return {
      success: true,
      data: {
        total_revenue: totalRevenue,
        total_profit: totalProfit,
        total_orders: totalOrders,
        average_order_value: avgOrderValue,
        profit_margin: profitMargin,
        daily,
        weekly,
        monthly,
      },
    };
  } catch (error) {
    console.error("GetEarningsReport Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function groupByPeriod(
  orders: any[],
  period: "day" | "week" | "month",
): EarningsReportItem[] {
  const groups: Record<
    string,
    { revenue: number; profit: number; orders: number }
  > = {};

  orders.forEach((order) => {
    const date = new Date(order.created_at);
    let key: string;

    switch (period) {
      case "day":
        key = date.toISOString().split("T")[0];
        break;
      case "week": {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
        break;
      }
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
    }

    if (!groups[key]) {
      groups[key] = { revenue: 0, profit: 0, orders: 0 };
    }

    groups[key].revenue += order.total || 0;
    groups[key].profit += order.profit || 0;
    groups[key].orders += 1;
  });

  return Object.entries(groups).map(([date, data]) => ({
    date,
    ...data,
  }));
}
