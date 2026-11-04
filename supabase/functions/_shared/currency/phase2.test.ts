// Run with: deno test --no-check --allow-env supabase/functions/_shared/currency/phase2.test.ts
//
// Phase 2. Tests for the currency registry, the Zendit catalog normaliser and
// the pricing pipeline. These are the three pieces everything else depends
// on, and all three are pure, so they are tested directly against real
// payload shapes from the Zendit OpenAPI spec rather than against mocks.

import assert from "node:assert/strict";
import {
  BASE_CURRENCY,
  convertMinor,
  currencyDecimals,
  currencyDivisor,
  formatMinor,
  resolveDivisor,
  toDecimal,
  toMinor,
} from "./registry.ts";
import {
  categoryFor,
  countriesIn,
  dataAmountLabel,
  deriveUsdRateFromOffer,
  normalizeZenditOffer,
  type ZenditOffer,
} from "../catalog/zenditCatalog.ts";
import { computePrice, PricingFloorError } from "./pricing.ts";

Deno.test("registry: ISO decimals and divisors", () => {
  // The divisor is not always 100. These are the ones that would silently
  // produce a 100x price error if it were assumed.
  assert.equal(currencyDecimals("RWF"), 0);
  assert.equal(currencyDecimals("UGX"), 0);
  assert.equal(currencyDecimals("XAF"), 0);
  assert.equal(currencyDecimals("XOF"), 0);
  assert.equal(currencyDecimals("JPY"), 0);
  assert.equal(currencyDecimals("KWD"), 3);
  assert.equal(currencyDecimals("NGN"), 2);
  assert.equal(currencyDivisor("RWF"), 1);
  assert.equal(currencyDivisor("NGN"), 100);
  assert.equal(currencyDivisor("KWD"), 1000);
});

Deno.test("registry: provider divisor wins, ISO is the fallback", () => {
  // A provider that states divisor 1 for a 2-decimal currency must be
  // believed; that is how Zendit reports the CFA francs.
  assert.equal(resolveDivisor(1, "XOF"), 1);
  assert.equal(resolveDivisor(100, "XOF"), 100);
  assert.equal(resolveDivisor(undefined, "NGN"), 100);
  assert.equal(resolveDivisor(0, "NGN"), 100, "0 is not a usable divisor");
  assert.equal(resolveDivisor(-5, "NGN"), 100);
});

Deno.test("registry: minor-unit round trip and conversion", () => {
  assert.equal(toMinor(5, 100), 500);
  assert.equal(toDecimal(500, 100), 5);
  assert.equal(toMinor(1500, 1), 1500);

  // $1.00 -> RWF at 1400: 1 * 1400 = 1400 RWF (divisor 1).
  assert.equal(convertMinor(100, 100, 1400, 1), 1400);
  // 1400 RWF -> NGN at 1.6: 1400 * 1.6 = 2240 NGN = 224000 minor.
  assert.equal(convertMinor(1400, 1, 1.6, 100), 224000);
});

Deno.test("registry: formatMinor respects the currency's own decimals", () => {
  assert.equal(formatMinor(500, "NGN"), "5.00");
  assert.equal(formatMinor(1400, "RWF"), "1400");
  assert.equal(formatMinor(1500, "KWD"), "1.500");
});

Deno.test("catalog: category mapping, no silent default", () => {
  assert.equal(categoryFor({ subTypes: ["Mobile Top Up"] }), "airtime");
  assert.equal(categoryFor({ subTypes: ["Mobile Bundle"] }), "data");
  assert.equal(categoryFor({ subTypes: ["Mobile Data"] }), "data");
  // An unmapped product must NOT fall into "data" by default.
  assert.equal(categoryFor({ subTypes: ["eSIM"] }), null);
  assert.equal(categoryFor({ productType: "Digital Gift Card" }), null);
  // productType fallback when subTypes are absent.
  assert.equal(categoryFor({ productType: "Mobile Top Up" }), "airtime");
});

Deno.test("catalog: FIXED offer normalises with divisor handling", () => {
  const offer: ZenditOffer = {
    offerId: "off_1",
    brand: "MTN",
    brandName: "MTN Rwanda",
    country: "RW",
    priceType: "FIXED",
    subTypes: ["Mobile Data"],
    dataGB: 5,
    durationDays: 30,
    cost: { currency: "USD", currencyDivisor: 100, fixed: 120 }, // $1.20
    send: { currency: "RWF", currencyDivisor: 1, fixed: 1680 }, // 1680 RWF
  };
  const result = normalizeZenditOffer(offer);
  assert.ok("plan" in result, "expected a plan");
  if (!("plan" in result)) return;
  const p = result.plan;
  assert.equal(p.provider_plan_id, "off_1");
  assert.equal(p.country_code, "rw", "country lowercased for scoping");
  assert.equal(p.category, "data");
  assert.equal(p.base_price, 1.2, "cost normalised to USD decimal");
  assert.equal(p.currency, BASE_CURRENCY);
  assert.equal(p.send_value, 1680, "divisor 1 means no scaling");
  assert.equal(p.send_currency, "RWF");
  assert.equal(p.price_type, "FIXED");
  assert.equal(p.data_amount, "5GB");
  assert.equal(p.validity, "30 days");
});

Deno.test("catalog: RANGE offer has bounds and no single send value", () => {
  // Shape taken from a real Zendit RANGE offer (AFGHAN_AF_OPEN): the cost
  // carries min/max (no `fixed`) and the rate is on `cost.fx`; `send.fx` is 1.
  const offer: ZenditOffer = {
    offerId: "off_range",
    brand: "Airtel",
    country: "UG",
    priceType: "RANGE",
    subTypes: ["Mobile Top Up"],
    cost: {
      currency: "USD",
      currencyDivisor: 100,
      min: 156,
      max: 7800,
      fx: 3800,
    },
    send: {
      currency: "UGX",
      currencyDivisor: 100,
      fx: 1,
      min: 10092,
      max: 504878,
      increment: 100,
    },
  };
  const result = normalizeZenditOffer(offer);
  assert.ok("plan" in result);
  if (!("plan" in result)) return;
  const p = result.plan;
  assert.equal(p.price_type, "RANGE");
  assert.equal(p.send_value, null, "RANGE has no single send value");
  assert.equal(p.range_min, 100.92);
  assert.equal(p.range_max, 5048.78);
  assert.equal(p.range_increment, 1);
  assert.equal(p.zendit_fx, 3800, "rate comes from cost.fx, not send.fx");
  assert.equal(p.base_price, 1.56, "RANGE cost is cost.min in USD");
  assert.equal(p.category, "airtime");
});

Deno.test("catalog: rejects rather than invents", () => {
  assert.ok("rejected" in normalizeZenditOffer({ country: "RW" }));
  assert.ok("rejected" in normalizeZenditOffer({ offerId: "x" }));
  assert.ok(
    "rejected" in normalizeZenditOffer({ offerId: "x", country: "RW" }),
    "no cost",
  );
  // Unmapped product type is rejected, not defaulted.
  const bad = normalizeZenditOffer({
    offerId: "x",
    country: "RW",
    subTypes: ["eSIM"],
    cost: { currency: "USD", currencyDivisor: 100, fixed: 100 },
  });
  assert.ok("rejected" in bad);
});

Deno.test("catalog: country discovery comes from the offers", () => {
  const offers: ZenditOffer[] = [
    { offerId: "a", country: "RW" },
    { offerId: "b", country: "ug" },
    { offerId: "c", country: "RW" },
    { offerId: "d" },
  ];
  assert.deepEqual(countriesIn(offers), ["rw", "ug"]);
});

Deno.test("catalog: USD rate derived from an offer", () => {
  // FIXED: send.fixed / cost.fixed = 1680 / 1.20 = 1400.
  const fixed = deriveUsdRateFromOffer({
    cost: { currency: "USD", currencyDivisor: 100, fixed: 120 },
    send: { currency: "RWF", currencyDivisor: 1, fixed: 1680 },
  });
  assert.ok(fixed);
  assert.equal(Math.round(fixed!.rate), 1400);
  assert.equal(fixed!.basis, "send.fixed/cost.fixed");

  // The rate is on cost.fx. send.fx is always 1 and must be ignored — using
  // it recorded a 1:1 rate for every currency.
  const range = deriveUsdRateFromOffer({
    cost: { currency: "USD", currencyDivisor: 100, min: 156, fx: 3800 },
    send: { currency: "UGX", currencyDivisor: 100, fx: 1, min: 10092 },
  });
  assert.ok(range);
  assert.equal(range!.rate, 3800);
  assert.equal(range!.basis, "cost.fx");

  // A FIXED offer that also carries cost.fx uses cost.fx (it is the same
  // value as the ratio, but it is the authoritative field).
  const fixedWithFx = deriveUsdRateFromOffer({
    cost: { currency: "USD", currencyDivisor: 100, fixed: 120, fx: 1400 },
    send: { currency: "RWF", currencyDivisor: 1, fixed: 1680 },
  });
  assert.equal(fixedWithFx!.rate, 1400);
  assert.equal(fixedWithFx!.basis, "cost.fx");
});

Deno.test("pricing: platform markup in USD, then convert, then reseller", () => {
  const result = computePrice({
    costUsd: 1.0,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    platformMarkups: [
      { markup_type: "percentage", markup_value: 10, source: "platform_default" },
    ],
    resellerMarkup: { markup_type: "percentage", markup_value: 20 },
  });
  // 1.00 -> platform 10% = 1.10 USD -> 1540 RWF -> reseller 20% = 1848 RWF
  assert.equal(result.platformPriceUsd, 1.1);
  assert.equal(result.storePriceMinor, 1540);
  assert.equal(result.customerPriceMinor, 1848);
  assert.equal(result.customerPriceDecimal, 1848);
  assert.equal(result.storeCurrency, "RWF");
  assert.equal(result.floorApplied, false);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].source, "platform_default");
  assert.equal(result.steps[1].source, "reseller");
  // The converted cost is what the purchase RPC deducts and what the
  // reseller's profit is measured against. Profit must never be negative.
  assert.equal(result.costLocalDecimal, 1400, "$1.00 at 1400");
  assert.equal(result.costLocalMinor, 1400);
  assert.ok(
    result.customerPriceDecimal >= result.costLocalDecimal,
    "profit cannot be negative",
  );
});

Deno.test("pricing: the reseller keeps the margin, not the whole sale", () => {
  // Regression guard for the cost-currency bug: if cost_price stayed in USD
  // while the price is in RWF, the reseller would be credited the entire
  // sale. costLocalDecimal is the number the RPC must receive.
  const result = computePrice({
    costUsd: 1.0,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    resellerMarkup: { markup_type: "percentage", markup_value: 20 },
  });
  const profit = result.customerPriceDecimal - result.costLocalDecimal;
  assert.equal(profit, 280, "20% of 1400, not the whole 1680");
  assert.ok(profit < result.customerPriceDecimal);
});

Deno.test("pricing: the buffer stays with the platform, not the reseller", () => {
  // Regression guard. costLocalDecimal is what the reseller's profit is
  // measured against, so it must include the buffer. Measuring it at the
  // unbuffered rate would pay the buffer out as reseller margin.
  const buffered = computePrice({
    costUsd: 1.0,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    bufferFraction: 0.02,
    resellerMarkup: { markup_type: "percentage", markup_value: 20 },
  });
  assert.equal(buffered.costLocalDecimal, 1428, "cost carries the buffer");
  assert.equal(buffered.customerPriceDecimal, 1714); // 1428 * 1.2 = 1713.6
  assert.equal(
    buffered.customerPriceDecimal - buffered.costLocalDecimal,
    286,
    "the margin is on the buffered cost",
  );

  // Without a buffer the reseller's margin is larger on the same plan,
  // which is the point: the buffer is a platform cost, not a reseller one.
  const unbuffered = computePrice({
    costUsd: 1.0,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    bufferFraction: 0,
    resellerMarkup: { markup_type: "percentage", markup_value: 20 },
  });
  assert.equal(unbuffered.costLocalDecimal, 1400);
  assert.equal(unbuffered.customerPriceDecimal, 1680);
  assert.equal(unbuffered.customerPriceDecimal - unbuffered.costLocalDecimal, 280);
});

Deno.test("pricing: works in a 2-decimal store currency", () => {
  const result = computePrice({
    costUsd: 1.0,
    storeCurrency: "NGN",
    usdToStoreRate: 1600,
    resellerMarkup: { markup_type: "fixed", markup_value: 100 },
  });
  // 1.00 USD -> 1600 NGN = 160000 minor; +100 NGN = 170000 minor.
  assert.equal(result.storePriceMinor, 160000);
  assert.equal(result.customerPriceMinor, 170000);
  assert.equal(result.customerPriceDecimal, 1700);
});

Deno.test("pricing: floor lifts a price that rounding pushed under cost", () => {
  // A negative reseller markup is what a mis-set rule can produce. The
  // floor must stop the shelf price going below the USD cost.
  const result = computePrice({
    costUsd: 1.0,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    resellerMarkup: { markup_type: "fixed", markup_value: -5000 },
  });
  assert.equal(result.floorApplied, true);
  assert.equal(result.customerPriceMinor, 1400, "lifted to the cost floor");
  assert.equal(result.marginMinor, 0);
});

Deno.test("pricing: buffer raises the rate used for the floor too", () => {
  const result = computePrice({
    costUsd: 1.0,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    bufferFraction: 0.02,
  });
  assert.equal(result.effectiveRate, 1428);
  assert.equal(result.customerPriceMinor, 1428);
});

Deno.test("pricing: an explicit selling price wins over markup", () => {
  const result = computePrice({
    costUsd: 1.0,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    resellerMarkup: { markup_type: "percentage", markup_value: 50 },
    resellerSellingPrice: 2000,
  });
  assert.equal(result.customerPriceMinor, 2000);
});

Deno.test("pricing: an invalid rate is a configuration fault, not a price", () => {
  assert.throws(
    () =>
      computePrice({
        costUsd: 1,
        storeCurrency: "RWF",
        usdToStoreRate: 0,
      }),
    PricingFloorError,
  );
});
