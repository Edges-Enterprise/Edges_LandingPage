// src/actions/reseller/dashboard/getRecentActivity.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export type ActivityType = "order" | "customer" | "build" | "transaction";

export interface RecentActivityItem {
  type: ActivityType;
  entity_id: string;
  created_at: string;
  data: Record<string, any>;
}

export async function getRecentActivity(limit: number = 10): Promise<{
  success: boolean;
  data?: RecentActivityItem[];
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
      "get_global_reseller_recent_activity",
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
    console.error("GetRecentActivity Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
