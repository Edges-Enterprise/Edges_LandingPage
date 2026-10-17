// supabase/functions/_shared/storeCatalog.ts
//
// Task 8, pointer 8.a.iii.zo.x. Pure helpers for the customer storefront
// catalog (global-store-catalog). Kept separate from the function's
// index.ts so they can be unit-tested without starting the Deno server
// or needing a live database.
//
// computeStorePrice MUST stay identical to the pricing in
// _shared/purchaseOrchestrator.ts (steps 2-4) and to the web storefront's
// computeSellingPrice (src/lib/storefront/getStoreCatalog.ts): the price a
// customer sees in the catalog and the price the purchase flow charges
// must never diverge.

export interface PlanConfigRow {
  plan_id: string;
  markup_type: string | null;
  markup_value: number | null;
  selling_price: number | null;
}

/**
 * Final customer-facing price: the reseller's explicit selling_price when
 * set, otherwise the base price with the markup applied (percentage or
 * fixed), rounded to a whole unit like the orchestrator does.
 */
export function computeStorePrice(
  basePrice: number,
  cfg: PlanConfigRow | undefined,
): number {
  if (cfg?.selling_price !== null && cfg?.selling_price !== undefined) {
    return Number(cfg.selling_price);
  }
  if (cfg?.markup_type === "percentage") {
    return Math.round(basePrice * (1 + Number(cfg?.markup_value ?? 0) / 100));
  }
  return Math.round(basePrice + Number(cfg?.markup_value ?? 0));
}

/**
 * Keep only plans whose country matches the store's, case-insensitively.
 * The two tables' country_code values are written by different code paths
 * and their casing is not guaranteed to agree.
 */
export function scopeToCountry<T extends { country_code: string | null }>(
  plans: T[],
  country: string | null | undefined,
): T[] {
  const target = (country || "").toLowerCase();
  if (!target) return [];
  return plans.filter((p) => (p.country_code || "").toLowerCase() === target);
}

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
