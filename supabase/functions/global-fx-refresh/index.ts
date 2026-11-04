// supabase/functions/global-fx-refresh/index.ts
//
// Phase 2. Refresh the PRICING-leg rates from the collection provider.
//
// This is the primary rate source. The rate is used to turn a USD wholesale
// cost into a store-currency shelf price, so it has to be the rate the money
// the platform holds is actually worth — the provider's, not Zendit's retail
// rate.
//
// Korapay exposes real conversion rates:
//   POST /merchant/api/v1/conversions/rates
//     { source_currency, destination_currency, amount }
// Korapay covers the currencies this project meets (EGP, GHS, KES, NGN, RWF,
// TZS, USD, XAF, XOF, ZAR). Flutterwave's FX trade covers only NGN/GHS/USD,
// so it is NOT usable as the rate source for the XOF/XAF/RWF currencies —
// for those, Zendit's catalog fx remains the fallback recorded by the
// catalog sync.
//
// A currency with no fresh rate from either leg cannot be priced. The
// function reports those explicitly rather than writing a stale or guessed
// rate, because a wrong rate is worse than a missing one.

import { createClient } from "npm:@supabase/supabase-js@2";
import { BASE_CURRENCY } from "../_shared/currency/registry.ts";
import {
  RATE_TTL_MS,
  recordRate,
  type RateStore,
} from "../_shared/currency/rates.ts";

const KORAPAY_BASE = Deno.env.get("KORAPAY_BASE_URL") ||
  "https://api.korapay.com";

/** Currencies Korapay can quote against USD. */
const KORAPAY_CURRENCIES = [
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "EGP",
  "RWF",
  "TZS",
  "XOF",
  "XAF",
];

interface KorapayRateResponse {
  status?: boolean;
  data?: {
    rate?: number;
    source_currency?: string;
    destination_currency?: string;
  };
  message?: string;
}

/**
 * Ask Korapay for the USD -> `quote` rate.
 *
 * Returns null when Korapay has no rate for the pair, which is a normal
 * outcome (not every currency is convertible), not an error.
 */
export async function fetchKorapayRate(
  quote: string,
  fetcher: typeof fetch = fetch,
): Promise<number | null> {
  const secret = Deno.env.get("KORAPAY_SECRET_KEY");
  if (!secret) throw new Error("KORAPAY_SECRET_KEY is not configured");

  const response = await fetcher(
    `${KORAPAY_BASE}/merchant/api/v1/conversions/rates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_currency: BASE_CURRENCY,
        destination_currency: quote,
        amount: 1,
      }),
    },
  );

  if (!response.ok) return null;
  const body = (await response.json()) as KorapayRateResponse;
  const rate = body?.data?.rate;
  if (typeof rate !== "number" || !(rate > 0)) return null;
  return rate;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("FX_REFRESH_SECRET");
  if (secret && req.headers.get("x-sync-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only refresh currencies that are actually in play: the ones a store is
  // priced in. A rate for a currency nobody sells is noise.
  const { data: used } = await supabase
    .from("global_currencies")
    .select("code")
    .eq("fundable", true);

  const wanted = new Set(
    (used ?? []).map((r: { code: string }) => r.code.toUpperCase()),
  );

  const updated: string[] = [];
  const missing: string[] = [];
  const failed: string[] = [];

  for (const quote of KORAPAY_CURRENCIES) {
    if (!wanted.has(quote)) continue;
    try {
      const rate = await fetchKorapayRate(quote);
      if (rate === null) {
        missing.push(quote);
        continue;
      }
      await recordRate(supabase as unknown as RateStore, {
        quote,
        rate,
        source: "collection_provider",
        ttlMs: RATE_TTL_MS,
      });
      updated.push(quote);
    } catch (e) {
      failed.push(`${quote}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: failed.length === 0, updated, missing, failed }),
    { headers: { "Content-Type": "application/json" } },
  );
});
