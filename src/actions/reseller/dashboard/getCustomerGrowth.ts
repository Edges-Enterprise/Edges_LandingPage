// src/actions/reseller/dashboard/getCustomerGrowth.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface CustomerGrowthItem {
  day: string;
  new_customers: number;
  cumulative: number;
}

export async function getCustomerGrowth(days: number = 30): Promise<{
  success: boolean;
  data?: CustomerGrowthItem[];
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
      "get_global_reseller_customer_growth",
      {
        p_user_id: user.id,
        p_days: days,
      },
    );

    if (error) {
      console.error("RPC Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("GetCustomerGrowth Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
