// supabase/functions/_shared/currency/rates.ts
//
// Phase 2. The rate service.
//
// This is the PRICING leg only. It answers one question: "what is 1 USD
// worth in the store's currency, for the purpose of putting a shelf price on
// a plan whose wholesale cost is in USD?" It is arithmetic, not a money
// movement — see HANDOVER.md, "This system is a ledger, not a treasury".
//
// Source order, most authoritative first:
//
//   1. the collection provider (Korapay/Flutterwave) — the rate the money
//      the platform actually holds is worth, so the shelf price tracks
//      reality. Primary.
//   2. Zendit's own `fx` from the catalog — a RETAIL rate, Zendit's margin
//      and rounding baked in. Fallback and cross-check only; never used to
//      measure the margin.
//
// A stale rate is worse than no rate: it silently mis-prices. So every rate
// carries an expiry, and an expired rate is not returned.

import { BASE_CURRENCY } from "./registry.ts";

export type RateSource = "collection_provider" | "zendit" | "manual";

export interface Rate {
  base: string;
  quote: string;
  rate: number;
  source: RateSource;
  fetchedAt: string;
  expiresAt: string;
}

export interface RateLookupResult {
  rate: number;
  source: RateSource;
  expiresAt: string;
  /** True when no fresh provider rate was found and a fallback was used. */
  fallback: boolean;
}

/** A rate older than this is not used for pricing. */
export const RATE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Minimal shape of the Supabase client this module needs. */
export interface RateStore {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: unknown,
      ): {
        eq(
          column: string,
          value: unknown,
        ): {
          order(
            column: string,
            opts: { ascending: boolean },
          ): {
            limit(n: number): {
              maybeSingle(): Promise<
                { data: Rate | null; error: { message: string } | null }
              >;
            };
          };
        };
      };
    };
    insert(row: Record<string, unknown>): Promise<{
      error: { message: string } | null;
    }>;
  };
}

/**
 * The newest unexpired rate for a pair, preferring the given sources in
 * order. Returns null when nothing fresh is available — the caller decides
 * whether that is a hard failure (it is, for pricing).
 */
export async function findFreshRate(
  store: RateStore,
  quoteCurrency: string,
  sources: RateSource[] = ["collection_provider", "zendit", "manual"],
): Promise<RateLookupResult | null> {
  const quote = quoteCurrency.toUpperCase();
  if (quote === BASE_CURRENCY) {
    return {
      rate: 1,
      source: "manual",
      expiresAt: new Date(Date.now() + RATE_TTL_MS).toISOString(),
      fallback: false,
    };
  }

  for (const source of sources) {
    const { data, error } = await store
      .from("global_fx_rates")
      .select("base, quote, rate, source, fetched_at, expires_at")
      .eq("base_currency", BASE_CURRENCY)
      .eq("quote_currency", quote)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) continue;
    if (new Date(data.expiresAt).getTime() <= Date.now()) continue;
    return {
      rate: data.rate,
      source: data.source,
      expiresAt: data.expiresAt,
      fallback: source !== sources[0],
    };
  }
  return null;
}

/**
 * Record an observed rate. Used by the rate-refresh job for the provider
 * leg, and by the catalog sync for the Zendit leg.
 */
export async function recordRate(
  store: RateStore,
  input: {
    quote: string;
    rate: number;
    source: RateSource;
    ttlMs?: number;
  },
): Promise<void> {
  const now = Date.now();
  const ttl = input.ttlMs ?? RATE_TTL_MS;
  const { error } = await store.from("global_fx_rates").insert({
    base_currency: BASE_CURRENCY,
    quote_currency: input.quote.toUpperCase(),
    rate: input.rate,
    source: input.source,
    fetched_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttl).toISOString(),
  });
  if (error) {
    throw new Error(`failed to record rate ${BASE_CURRENCY}->${input.quote}: ${error.message}`);
  }
}

/**
 * Alert threshold: how far the provider rate and Zendit's retail rate may
 * diverge before it is worth looking at. Measured divergences in the design
 * run from ~9% (XAF) to ~20% (UGX), so the default is set above the noise
 * and below "something is wrong".
 */
export const RATE_DIVERGENCE_ALERT = 0.25;

/** Relative divergence between two rates, as a fraction of the first. */
export function rateDivergence(a: number, b: number): number {
  if (!(a > 0) || !(b > 0)) return Infinity;
  return Math.abs(a - b) / a;
}
