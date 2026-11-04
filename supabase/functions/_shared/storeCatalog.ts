// supabase/functions/_shared/storeCatalog.ts
//
// Task 8, pointer 8.a.iii.zo.x. Pure helpers for the customer storefront
// catalog (global-store-catalog). Kept separate from the function's
// index.ts so they can be unit-tested without starting the Deno server
// or needing a live database.
//
// Phase 2 removed computeStorePrice and scopeToCountry from here. Pricing
// now lives in _shared/currency/pricing.ts (via storePrice.ts) and country
// scoping is gone entirely — a store sells every country's plans — so both
// helpers became dead code whose continued presence would invite a future
// caller to reintroduce a second, divergent pricing path.

/** Distinct non-empty, trimmed values, sorted for a stable display order. */
export function uniqueSorted(values: (string | null | undefined)[]): string[] {
  // Trim BEFORE deduping: otherwise " MTN " and "MTN" are two Set members
  // that both become "MTN" after trimming, producing a duplicate.
  return [
    ...new Set(
      values
        .filter((v): v is string => !!v && !!v.trim())
        .map((v) => v.trim()),
    ),
  ].sort();
}
