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
// As of 2026-11-06 the live Korapay account returns 401 on this endpoint
// (the Conversions API is not enabled), so every pair falls to the Zendit
// fallback. That is now reported as a dead leg — `legDead: true` and HTTP
// 500 — instead of the clean no-op that hid it for weeks (Blocker 10).
//
// A currency with no fresh rate from either leg cannot be priced. The
// function reports those explicitly rather than writing a stale or guessed
// rate, because a wrong rate is worse than a missing one.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  recordRate,
  RATE_TTL_MS,
  type RateStore,
} from "../_shared/currency/rates.ts";
import { fetchKorapayRate } from "../_shared/currency/providerRate.ts";

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
      const outcome = await fetchKorapayRate(quote);
      if (outcome.kind === "rejected") {
        // A rejected request is a dead leg, not a per-pair miss: record it
        // as a failure so the run is visibly unhealthy instead of a clean
        // no-op (Blocker 10).
        failed.push(
          `${quote}: provider rejected the request (HTTP ${outcome.status}) — ${outcome.detail}`,
        );
        continue;
      }
      if (outcome.kind === "no_rate") {
        missing.push(`${quote}: ${outcome.detail}`);
        continue;
      }
      await recordRate(supabase as unknown as RateStore, {
        quote,
        rate: outcome.rate,
        source: "collection_provider",
        ttlMs: RATE_TTL_MS,
      });
      updated.push(quote);
    } catch (e) {
      failed.push(`${quote}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // A leg that answered for no pair at all is dead — every price is on the
  // Zendit fallback. Surface that as a non-2xx so the scheduler's history
  // shows a failure rather than a run that quietly wrote nothing.
  const legDead = failed.length > 0 && updated.length === 0;
  const body = {
    ok: failed.length === 0,
    leg: "collection_provider",
    legDead,
    updated,
    missing,
    failed,
  };
  console.error(
    `global-fx-refresh: leg=collection_provider updated=${updated.length} ` +
      `missing=${missing.length} failed=${failed.length} legDead=${legDead}`,
  );

  return new Response(JSON.stringify(body), {
    status: legDead ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
});
