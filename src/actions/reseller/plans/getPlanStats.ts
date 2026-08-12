// src/actions/reseller/plans/getPlanStats.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function getPlanStats(): Promise<{
  success: boolean;
  data?: {
    total: number;
    enabled: number;
    disabled: number;
    categories: { name: string; count: number }[];
    networks: { name: string; count: number }[];
    avgProfit: number;
    totalProfit: number;
  };
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
      .select("id, country_code")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Get all plans with configs
    const { data: plans, error: plansError } = await supabase
      .from("global_base_plans")
      .select(
        `
        id,
        category,
        network,
        base_price,
        config:global_reseller_plan_configs!plan_id (
          selling_price,
          enabled
        )
      `,
      )
      .eq("country_code", application.country_code.toUpperCase())
      .eq("is_active", true)
      .eq("config.reseller_id", application.id);

    if (plansError) {
      return { success: false, error: plansError.message };
    }

    const total = plans?.length || 0;
    const enabled =
      plans?.filter((p: any) => p.config?.[0]?.enabled).length || 0;
    const disabled = total - enabled;

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    const networkMap: Record<string, number> = {};
    let totalProfit = 0;

    plans?.forEach((plan: any) => {
      const config = plan.config?.[0];
      const sellingPrice = config?.selling_price || plan.base_price;
      const profit = sellingPrice - plan.base_price;
      totalProfit += profit;

      if (plan.category) {
        categoryMap[plan.category] = (categoryMap[plan.category] || 0) + 1;
      }
      if (plan.network) {
        networkMap[plan.network] = (networkMap[plan.network] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryMap).map(([name, count]) => ({
      name,
      count,
    }));

    const networks = Object.entries(networkMap).map(([name, count]) => ({
      name,
      count,
    }));

    return {
      success: true,
      data: {
        total,
        enabled,
        disabled,
        categories,
        networks,
        avgProfit: total > 0 ? totalProfit / total : 0,
        totalProfit,
      },
    };
  } catch (error) {
    console.error("GetPlanStats Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
