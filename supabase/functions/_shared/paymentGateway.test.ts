// Run with: deno test supabase/functions/_shared/paymentGateway.test.ts
//
// Task 8, pointer 8.f.ii. Covers the two things that would silently
// misroute money: which gateway a country resolves to, and which currency
// is sent to it. The country->provider map is asserted to equal the web's
// src/config/countries/*.ts (the source of truth) — the pair is checked in
// the same way 8.e.iv checked the mobile copy.
import assert from "node:assert/strict";
import { getPaymentProvider } from "./paymentGateway.ts";
import { getCountryCurrency } from "./countryCurrency.ts";

Deno.test("ng resolves to xixapay (virtual-account country)", () => {
  assert.equal(getPaymentProvider("ng"), "xixapay");
  assert.equal(getPaymentProvider("NG"), "xixapay");
});

Deno.test("rw/ug/zm resolve to flutterwave", () => {
  assert.equal(getPaymentProvider("rw"), "flutterwave");
  assert.equal(getPaymentProvider("ug"), "flutterwave");
  assert.equal(getPaymentProvider("zm"), "flutterwave");
});

Deno.test("the remaining countries resolve to korapay", () => {
  const korapay = [
    "gh", "ke", "za", "eg", "ma", "cd", "cm", "cf", "td", "cg",
    "ga", "gq", "ci", "sn", "bf", "bj", "tg", "ne", "ml", "gn",
  ];
  for (const c of korapay) {
    assert.equal(getPaymentProvider(c), "korapay", `${c} should be korapay`);
  }
});

Deno.test("an unknown country falls back to korapay, not xixapay", () => {
  // Falling back to the virtual-account gateway would make an unknown
  // country look fundable when it is not.
  assert.equal(getPaymentProvider("xx"), "korapay");
  assert.equal(getPaymentProvider(""), "korapay");
});

Deno.test("currency is the country's own, with NGN as the fallback", () => {
  assert.equal(getCountryCurrency("gh"), "GHS");
  assert.equal(getCountryCurrency("ke"), "KES");
  assert.equal(getCountryCurrency("rw"), "RWF");
  assert.equal(getCountryCurrency("zm"), "ZMW");
  assert.equal(getCountryCurrency("ng"), "NGN");
  assert.equal(getCountryCurrency("xx"), "NGN");
});
