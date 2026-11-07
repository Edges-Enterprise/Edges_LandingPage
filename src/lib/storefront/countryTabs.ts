// src/lib/storefront/countryTabs.ts
//
// The global (globe) view's country tabs, ranked and capped.
//
// A catalog can span many countries; showing them all turns the tab row into
// an endless scroll. The list is trimmed to the largest catalogs, but the
// country the customer is looking at is always kept — otherwise the tab they
// are on would vanish when its plan count ranks it below the cut.

export interface CountryTab {
  country: string;
  count: number;
}

/** Most country tabs the global view shows at once. */
export const MAX_COUNTRY_TABS = 5;

/**
 * Rank countries by plan count (largest first, then alphabetically) and cap
 * the list. `activeCountry` is always present in the result when it has plans.
 */
export function rankCountryTabs(
  products: { country_code?: string }[],
  max: number = MAX_COUNTRY_TABS,
  activeCountry = "",
): CountryTab[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const cc = (p.country_code || "").toLowerCase();
    if (!cc) continue;
    counts.set(cc, (counts.get(cc) || 0) + 1);
  }
  const ranked = [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));

  const visible =
    ranked.length <= max ? ranked.slice() : ranked.slice(0, max);
  if (ranked.length > max && activeCountry) {
    if (!visible.some((c) => c.country === activeCountry)) {
      const active = ranked.find((c) => c.country === activeCountry);
      if (active) visible[visible.length - 1] = active;
    }
  }
  // Display order is alphabetical regardless of how the list was chosen, so
  // the row does not reshuffle as counts change.
  return visible.sort((a, b) => a.country.localeCompare(b.country));
}
