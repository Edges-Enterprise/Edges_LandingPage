// src/actions/reseller/dashboard/getRevenueBreakdown.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export interface RevenueBreakdownItem {
  period: string;
  revenue: number;
  profit: number;
  order_count: number;
}

export async function getRevenueBreakdown(period: Period = "monthly"): Promise<{
  success: boolean;
  data?: RevenueBreakdownItem[];
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

    const { data, error } = await supabase.rpc(
      "get_global_reseller_revenue_breakdown",
      {
        p_user_id: user.id,
        p_period: period,
      },
    );

    if (error) {
      console.error("RPC Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("GetRevenueBreakdown Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
