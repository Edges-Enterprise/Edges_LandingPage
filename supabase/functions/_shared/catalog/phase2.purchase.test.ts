// Run with: deno test --no-check --allow-env supabase/functions/_shared/catalog/phase2.purchase.test.ts
//
// Phase 2. Tests for the Zendit purchase body.
//
// The thing worth testing here is the FIXED/RANGE difference: Zendit
// REQUIRES `value` for a RANGE offer and REJECTS it for a FIXED one. A body
// built by spreading an undefined field gets this wrong in a way that only
// shows up against the live API.

import assert from "node:assert/strict";
import {
  buildPurchaseBody,
  purchaseZenditOffer,
  validatePurchaseInput,
  ZenditPurchaseInputError,
} from "./purchaseZenditOffer.ts";

const base = {
  offerId: "off_1",
  recipientPhoneNumber: "+250788123456",
  transactionId: "txn_1",
} as const;

Deno.test("purchase: FIXED body omits value entirely", () => {
  const body = buildPurchaseBody({ ...base, priceType: "FIXED" });
  assert.equal("value" in body, false, "value must not be present at all");
  assert.deepEqual(Object.keys(body).sort(), [
    "offerId",
    "recipientPhoneNumber",
    "transactionId",
  ]);
});

Deno.test("purchase: RANGE body includes value", () => {
  const body = buildPurchaseBody({
    ...base,
    priceType: "RANGE",
    value: { type: "ZEND", value: 5000 },
  });
  assert.deepEqual(body.value, { type: "ZEND", value: 5000 });
});

Deno.test("purchase: RANGE without a value is rejected before the call", () => {
  assert.throws(
    () => validatePurchaseInput({ ...base, priceType: "RANGE" }),
    ZenditPurchaseInputError,
  );
});

Deno.test("purchase: FIXED with a value is rejected before the call", () => {
  assert.throws(
    () =>
      validatePurchaseInput({
        ...base,
        priceType: "FIXED",
        value: { type: "PRICE", value: 100 },
      }),
    ZenditPurchaseInputError,
  );
});

Deno.test("purchase: value must be a positive integer in minor units", () => {
  for (const bad of [0, -1, 1.5, NaN]) {
    assert.throws(
      () =>
        validatePurchaseInput({
          ...base,
          priceType: "RANGE",
          value: { type: "ZEND", value: bad },
        }),
      ZenditPurchaseInputError,
      `value ${bad} should be rejected`,
    );
  }
});

Deno.test("purchase: phone number must be e164", () => {
  for (const bad of ["0788123456", "250788123456", "+0788", "+250 788 123 456"]) {
    assert.throws(
      () => validatePurchaseInput({ ...base, recipientPhoneNumber: bad, priceType: "FIXED" }),
      ZenditPurchaseInputError,
      `${bad} should be rejected`,
    );
  }
  // A valid one passes.
  validatePurchaseInput({ ...base, priceType: "FIXED" });
});

Deno.test("purchase: the result is never final, whatever Zendit returns", async () => {
  const outcome = await purchaseZenditOffer(
    { ...base, priceType: "FIXED" },
    async () => ({ status: "accepted", transactionId: "txn_1" }),
  );
  assert.equal(outcome.final, false, "an accepted purchase is not a completed one");
  assert.equal(outcome.accepted, true);
  assert.equal(outcome.transactionId, "txn_1");
});
