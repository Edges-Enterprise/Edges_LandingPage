// src/actions/reseller/plans/getGlobalPlanCountries.ts
//
// The destination countries that actually have active Zendit plans, with
// counts — the country picker in the dashboard's global (world) plan view.
// Derived from the catalog, so a country Zendit adds appears here on the
// next sync with no code change.

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "../../../../supabase/functions/_shared/catalog/fetchAll.ts";

export interface GlobalPlanCountry {
  country: string;
  count: number;
}

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

    const adminClient = createAdminClient();

    // Pull just the country column for active Zendit plans and count in
    // memory. The catalog is a few thousand rows; a select of one column is
    // cheap, and PostgREST has no GROUP BY. Paged, because a bare `.limit()`
    // cannot exceed PostgREST's 1,000-row cap - the previous `.limit(20000)`
    // silently saw 1,000 rows and under-reported every country's count (76 of
    // 121 countries, with wrong totals).
    const { data, error } = await fetchAllRows<{ country_code: string | null }>(
      () =>
        adminClient
          .from("global_base_plans")
          .select("country_code")
          .eq("provider", "zendit")
          .eq("is_active", true)
          // A UNIQUE order for stable Range pagination.
          .order("id", { ascending: true }),
    );

    if (error) {
      console.error("Get global plan countries error:", error);
      return { success: false, error };
    }

    const counts = new Map<string, number>();
    for (const row of data) {
      const cc = (row.country_code || "").toLowerCase();
      if (!cc) continue;
      counts.set(cc, (counts.get(cc) || 0) + 1);
    }

    const result: GlobalPlanCountry[] = [...counts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => a.country.localeCompare(b.country));

    return { success: true, data: result };
  } catch (error) {
    console.error("GetGlobalPlanCountries Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
