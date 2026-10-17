// src/actions/reseller/dashboard/getTopProducts.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface TopProduct {
  plan_id: string;
  plan_name: string;
  total_orders: number;
  total_revenue: number;
  avg_price: number;
}

export async function getTopProducts(limit: number = 10): Promise<{
  success: boolean;
  data?: TopProduct[];
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
      "get_global_reseller_top_products",
      {
        p_user_id: user.id,
        p_limit: limit,
      },
    );

    if (error) {
      console.error("RPC Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("GetTopProducts Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
