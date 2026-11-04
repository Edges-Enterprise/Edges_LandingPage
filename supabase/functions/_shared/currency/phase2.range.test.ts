// Run with: deno test --no-check --allow-env supabase/functions/_shared/currency/phase2.range.test.ts
//
// Phase 2, step 8. Tests for RANGE offers.
//
// The rules that matter: an amount is validated against the CURRENT bounds
// (so an off-step or out-of-bounds amount never reaches Zendit), the cost of
// a chosen amount is derived from Zendit's own fx, and a RANGE price goes
// through the same pipeline (and so the same floor) as a FIXED one.

import assert from "node:assert/strict";
import {
  isOnStep,
  priceRangeOffer,
  rangeCostUsd,
  rangePurchaseValue,
  RangeError,
  snapToStep,
  validateRangeAmount,
} from "./range.ts";

const bounds = { min: 500, max: 5000, increment: 500, currency: "RWF" };

Deno.test("range: an in-bounds, on-step amount is accepted", () => {
  assert.equal(validateRangeAmount(500, bounds), 500);
  assert.equal(validateRangeAmount(2500, bounds), 2500);
  assert.equal(validateRangeAmount(5000, bounds), 5000);
});

Deno.test("range: out-of-bounds amounts are rejected with a usable message", () => {
  assert.throws(() => validateRangeAmount(400, bounds), /Minimum is 500/);
  assert.throws(() => validateRangeAmount(5500, bounds), /Maximum is 5000/);
});

Deno.test("range: an off-step amount is rejected", () => {
  assert.throws(() => validateRangeAmount(750, bounds), RangeError);
  assert.throws(() => validateRangeAmount(750, bounds), /steps of 500/);
});

Deno.test("range: no increment means any value in bounds is valid", () => {
  assert.equal(validateRangeAmount(777, { min: 1, max: 1000 }), 777);
});

Deno.test("range: step check is float-safe", () => {
  // 0.3 is not exactly representable; a raw modulo would wrongly reject it.
  assert.equal(isOnStep(0.3, 0.1, 0.1), true);
  assert.equal(isOnStep(0.35, 0.1, 0.1), false);
  assert.equal(isOnStep(1.1, 1, 0.1), true);
});

Deno.test("range: snapToStep lands on a valid value inside the bounds", () => {
  assert.equal(snapToStep(760, bounds), 1000);
  assert.equal(snapToStep(200, bounds), 500);
  assert.equal(snapToStep(9000, bounds), 5000);
  assert.equal(snapToStep(2500, bounds), 2500);
});

Deno.test("range: cost is derived from Zendit's fx", () => {
  // 5000 RWF at 1400 RWF/USD is about 3.57 USD.
  assert.equal(rangeCostUsd(5000, 1400), 5000 / 1400);
});

Deno.test("range: a missing or non-positive fx is a hard failure", () => {
  for (const bad of [null, undefined, 0, -1, NaN]) {
    assert.throws(() => rangeCostUsd(5000, bad as number), RangeError);
  }
});

Deno.test("range: a priced amount goes through the pipeline and keeps the floor", () => {
  const priced = priceRangeOffer({
    sendAmount: 5000,
    fx: 1400,
    storeCurrency: "RWF",
    usdToStoreRate: 1400,
    bounds,
  });
  // 5000/1400 USD -> back to RWF at 1400 is ~5000 RWF, so the customer price
  // covers the cost (the floor holds).
  assert.ok(priced.customerPriceMinor >= priced.costLocalMinor);
  assert.equal(priced.sendAmount, 5000);
});

Deno.test("range: an invalid amount never reaches the pipeline", () => {
  assert.throws(
    () =>
      priceRangeOffer({
        sendAmount: 750,
        fx: 1400,
        storeCurrency: "RWF",
        usdToStoreRate: 1400,
        bounds,
      }),
    RangeError,
  );
});

Deno.test("range: the purchase value is a ZEND amount in minor units", () => {
  // RWF has 0 decimals, so 5000 is 5000 minor units.
  assert.deepEqual(rangePurchaseValue(5000, 1), { type: "ZEND", value: 5000 });
  // NGN has 2, so 500.50 is 50050 minor units.
  assert.deepEqual(rangePurchaseValue(500.5, 100), {
    type: "ZEND",
    value: 50050,
  });
});
