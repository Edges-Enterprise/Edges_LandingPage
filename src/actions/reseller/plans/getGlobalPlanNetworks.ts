// src/actions/reseller/plans/getGlobalPlanNetworks.ts
//
// The distinct networks across every active Zendit plan — the network filter's
// options in the dashboard's global (world) plan view. Reads the same cached
// facets scan as the country list, so the two pickers cost one scan.

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getGlobalPlanFacetsCached } from "./globalPlanFacets";

export async function getGlobalPlanNetworks(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { networks } = await getGlobalPlanFacetsCached();
    return { success: true, data: networks };
  } catch (error) {
    console.error("GetGlobalPlanNetworks Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
