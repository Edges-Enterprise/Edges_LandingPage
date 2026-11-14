// src/actions/reseller/plans/globalPlansTypes.ts
//
// Shared shapes for the global (world) plan view. Kept out of the "use server"
// action files, which may only export async functions.

import type { PlanWithConfig } from "@/types/reseller/plans";

/** Rows per page for the world plan list. */
export const GLOBAL_PLANS_PAGE_SIZE = 10;

export interface GetGlobalPlansParams {
  /** Destination country (lowercase), optional. "all" or omitted = every country. */
  country?: string;
  /** Network name, optional. "all" or omitted = every network. */
  network?: string;
  category?: string;
  /** Free-text search over name / network / provider plan id / country. */
  search?: string;
  offset?: number;
  limit?: number;
}

export interface GetGlobalPlansResult {
  plans: PlanWithConfig[];
  /** Total rows matching the filter, independent of the page returned. */
  total: number;
}

export interface GlobalPlanCountry {
  country: string;
  count: number;
}

export interface GlobalPlanFacets {
  countries: GlobalPlanCountry[];
  networks: string[];
  /** Distinct networks per country, so the network filter can scope to one. */
  countryNetworks: Record<string, string[]>;
}
