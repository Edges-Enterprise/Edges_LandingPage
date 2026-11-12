// src/actions/reseller/plans/getGlobalPlanCountries.ts
//
// The destination countries that actually have active Zendit plans, with
// counts — the country picker in the dashboard's global (world) plan view.
// Reads the shared cached facets scan (globalPlanFacets.ts).

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getGlobalPlanFacetsCached } from "./globalPlanFacets";
import type { GlobalPlanCountry } from "./globalPlansTypes";

export async function getGlobalPlanCountries(): Promise<{
  success: boolean;
  data?: GlobalPlanCountry[];
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

    const { countries } = await getGlobalPlanFacetsCached();
    return { success: true, data: countries };
  } catch (error) {
    console.error("GetGlobalPlanCountries Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
