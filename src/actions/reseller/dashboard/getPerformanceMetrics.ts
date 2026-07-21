// src/actions/reseller/dashboard/getPerformanceMetrics.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface PerformanceMetrics {
  avg_order_value: number;
  total_customers: number;
  repeat_rate: number;
  conversion_rate: number;
}

export async function getPerformanceMetrics(): Promise<{
  success: boolean;
  data?: PerformanceMetrics;
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
      "get_global_reseller_performance_metrics",
      { p_user_id: user.id },
    );

    if (error) {
      console.error("RPC Error:", error);
      return { success: false, error: error.message };
    }

    const defaultMetrics: PerformanceMetrics = {
      avg_order_value: 0,
      total_customers: 0,
      repeat_rate: 0,
      conversion_rate: 0,
    };

    return {
      success: true,
      data: data || defaultMetrics,
    };
  } catch (error) {
    console.error("GetPerformanceMetrics Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
