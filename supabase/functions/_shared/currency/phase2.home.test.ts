// Run with: deno test --no-check --allow-env supabase/functions/_shared/currency/phase2.home.test.ts
//
// The home/cross-border split, end to end through the pricing pipeline.
//
// HOME = the plan's cost currency equals the store's currency (a Lizzysub NGN
// plan in an NG store, an Accragh GHS plan in a GH store). The reseller's
// cost basis is the RAW cost: no platform markup, no FX buffer. The reseller
// then marks up on that raw cost.
//
// The grounded example (person, 2026-11-13): Lizzysub 40MB costs NGN 49.00
// and `first-data` carries a fixed NGN 100 markup. Home must read
// basis 49 -> selling 149 -> profit 100.

import assert from "node:assert/strict";
import { pricePlan, type StoreContext } from "./storePrice.ts";
import { platformMarkupChain } from "./markup.ts";

function ctxFor(currency: string, rate: number, buffer: number): StoreContext {
  return {
    countryCode: "ng",
    currency,
    usdToStoreRate: rate,
    rateSource: "zendit",
    rateExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    rateIsFallback: false,
    bufferFraction: buffer,
    currencyIsFallback: false,
    usdRates: { USD: 1, NGN: rate, GHS: 11.36363636 },
  };
}

const lizzysub40mb = {
  id: "lizzysub-40mb",
  provider: "lizzysub",
  provider_plan_id: "lizzysub_40mb",
  country_code: "ng",
  name: "MTN 40MB",
  category: "data",
  base_price: 49, // NGN
  currency: "NGN",
  price_type: "FIXED",
};

Deno.test("home: raw cost basis, no platform markup, no buffer", () => {
  // A 2% buffer is configured on the store, but home must ignore it, and the
  // chain must resolve to nothing even though the 12% default row exists.
  const ctx = ctxFor("NGN", 1600, 0.02);
  const rows = [
    { scope: "default" as const, scope_key: "*", markup_type: "percentage", markup_value: 12, enabled: true },
  ];
  const chain = platformMarkupChain(rows, {
    countryCode: "ng",
    planId: lizzysub40mb.id,
    provider: "lizzysub",
    home: true,
  });
  assert.equal(chain.length, 0, "the 12% default must not apply at home");

  const priced = pricePlan(
    lizzysub40mb,
    { markup_type: "fixed", markup_value: 100, selling_price: null },
    ctx,
    chain,
  );

  assert.equal(priced.costCurrency, "NGN");
  assert.equal(priced.platformLocalDecimal, 49, "basis is the raw cost");
  assert.equal(priced.customerPriceDecimal, 149, "49 + fixed 100");
  assert.equal(priced.customerPriceDecimal - priced.platformLocalDecimal, 100);
});

Deno.test("cross-border: the same cost keeps the 12% default and the buffer", () => {
  // Same NGN 49 cost, but the store prices in RWF — a mismatch, so the FX
  // path applies: 49/1600 USD -> *1.12 -> RWF at 1400 with a 2% buffer.
  const ctx: StoreContext = {
    countryCode: "rw",
    currency: "RWF",
    usdToStoreRate: 1400,
    rateSource: "zendit",
    rateExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    rateIsFallback: false,
    bufferFraction: 0.02,
    currencyIsFallback: false,
    usdRates: { USD: 1, NGN: 1600 },
  };
  const rows = [
    { scope: "default" as const, scope_key: "*", markup_type: "percentage", markup_value: 12, enabled: true },
  ];
  const chain = platformMarkupChain(rows, {
    countryCode: "rw",
    planId: lizzysub40mb.id,
    provider: "lizzysub",
    home: false,
  });
  assert.equal(chain.length, 1);
  assert.equal(chain[0].markup_value, 12);

  const priced = pricePlan(lizzysub40mb, null, ctx, chain);
  // 49 NGN / 1600 = 0.030625 USD -> *1.12 = 0.0343 USD
  // effective rate = 1400 * 1.02 = 1428 -> 0.0343 * 1428 = 48.98 -> 49 RWF.
  assert.equal(priced.platformPriceUsd.toFixed(4), "0.0343");
  assert.equal(priced.effectiveRate, 1428);
  assert.equal(priced.platformLocalDecimal, 49);
});

Deno.test("home: a plan-level cut still applies at home", () => {
  // The platform can still take a cut at home, via a plan or provider row.
  const ctx = ctxFor("NGN", 1600, 0.02);
  const rows = [
    { scope: "plan" as const, scope_key: lizzysub40mb.id, markup_type: "percentage", markup_value: 5, enabled: true },
  ];
  const chain = platformMarkupChain(rows, {
    countryCode: "ng",
    planId: lizzysub40mb.id,
    provider: "lizzysub",
    home: true,
  });
  assert.equal(chain.length, 1);
  assert.equal(chain[0].markup_value, 5);

  const priced = pricePlan(lizzysub40mb, null, ctx, chain);
  // 49 * 1.05 = 51.45, no buffer. The decimal keeps precision; the minor
  // unit is what the purchase RPC deducts.
  assert.equal(priced.platformLocalDecimal.toFixed(2), "51.45");
  assert.equal(priced.platformLocalMinor, 5145);
});
