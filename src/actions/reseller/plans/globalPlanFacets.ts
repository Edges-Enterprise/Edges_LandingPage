// src/actions/reseller/plans/globalPlanFacets.ts
//
// The country (with counts) and network facets behind the global plan view's
// pickers. Derived from the catalog, so a country or network Zendit adds shows
// up on the next sync with no code change.
//
// Not a "use server" action: this is a plain cached server module the page and
// the actions import directly. It is GLOBAL (it does not depend on the
// reseller) and it is one full-catalog scan — PostgREST has no GROUP BY, so the
// count is done in memory over two columns. It is cached for the same reason
// the plan list is paged: the scan has no business running on every open.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "../../../../supabase/functions/_shared/catalog/fetchAll.ts";
import type { GlobalPlanFacets } from "./globalPlansTypes";

/**
 * Every active Zendit plan's country (counted) and networks (distinct), from
 * one paged scan of the catalog. Cached because it is identical for every
 * reseller and only moves when a sync runs.
 */
export const getGlobalPlanFacetsCached = unstable_cache(
  async (): Promise<GlobalPlanFacets> => {
    const adminClient = createAdminClient();

    // Pull just the two columns for active Zendit plans and reduce in memory.
    // Paged, because a bare `.limit()` cannot exceed PostgREST's 1,000-row cap -
    // the previous `.limit(20000)` silently saw 1,000 rows and under-reported
    // every country's count (76 of 121 countries, with wrong totals).
    const { data, error } = await fetchAllRows<
      { country_code: string | null; network: string | null }
    >(
      () =>
        adminClient
          .from("global_base_plans")
          .select("country_code, network")
          .eq("provider", "zendit")
          .eq("is_active", true)
          // A UNIQUE order for stable Range pagination.
          .order("id", { ascending: true }),
    );

    if (error) throw new Error(error);

    const counts = new Map<string, number>();
    const networks = new Set<string>();
    const perCountry = new Map<string, Set<string>>();
    for (const row of data) {
      const cc = (row.country_code || "").toLowerCase();
      if (cc) counts.set(cc, (counts.get(cc) || 0) + 1);
      if (row.network) networks.add(row.network);
      if (cc && row.network) {
        let set = perCountry.get(cc);
        if (!set) perCountry.set(cc, (set = new Set()));
        set.add(row.network);
      }
    }

    return {
      countries: [...counts.entries()]
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => a.country.localeCompare(b.country)),
      networks: [...networks].sort(),
      countryNetworks: Object.fromEntries(
        [...perCountry.entries()].map(([cc, set]) => [cc, [...set].sort()]),
      ),
    };
  },
  ["global-plan-facets"],
  { revalidate: 600, tags: ["global-plans"] },
);
