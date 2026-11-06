// Run with: deno test supabase/functions/_shared/paymentGateway.test.ts
//
// Task 8, pointer 8.f.ii. Covers the two things that would silently
// misroute money: which gateway a country resolves to, and which currency
// is sent to it. The country->provider map is asserted to equal the web's
// src/config/countries/*.ts (the source of truth) — the pair is checked in
// the same way 8.e.iv checked the mobile copy.
import assert from "node:assert/strict";
import {
  getPaymentProvider,
  providerSupportsCurrency,
  resolvePaymentProvider,
  sanitizeCustomerName,
} from "./paymentGateway.ts";
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

Deno.test("currency is the country's own, with USD as the fallback", () => {
  // Phase 2: an unmapped country is a USD wallet funded by Korapay/
  // Flutterwave, not NGN. Pricing (global_country_currencies) and the
  // gateway provider map use the same fallback.
  assert.equal(getCountryCurrency("gh"), "GHS");
  assert.equal(getCountryCurrency("ke"), "KES");
  assert.equal(getCountryCurrency("rw"), "RWF");
  assert.equal(getCountryCurrency("zm"), "ZMW");
  assert.equal(getCountryCurrency("ng"), "NGN");
  assert.equal(getCountryCurrency("us"), "USD");
  assert.equal(getCountryCurrency("xx"), "USD");
  assert.equal(getCountryCurrency(""), "USD");
});

Deno.test("a USD charge routes to a USD-capable provider, never Korapay", () => {
  // Korapay's USD checkout channel is off on the live account (`409 AA021`),
  // so a USD charge must go to Flutterwave. This is the currency-aware
  // resolver the fund path uses, not the country-only `getPaymentProvider`.
  // An unmapped country defaults to Korapay, so the override is load-bearing.
  assert.equal(resolvePaymentProvider("xx", "USD"), "flutterwave");
  assert.equal(resolvePaymentProvider("", "USD"), "flutterwave");
  assert.equal(resolvePaymentProvider("gh", "USD"), "flutterwave");
  assert.equal(resolvePaymentProvider("ke", "USD"), "flutterwave");
  // A country already on Flutterwave stays there.
  assert.equal(resolvePaymentProvider("rw", "USD"), "flutterwave");
  // A local currency keeps the country's configured provider, unchanged.
  assert.equal(resolvePaymentProvider("gh", "GHS"), "korapay");
  assert.equal(resolvePaymentProvider("rw", "RWF"), "flutterwave");
  assert.equal(resolvePaymentProvider("ng", "NGN"), "xixapay");
  // Case-insensitive.
  assert.equal(resolvePaymentProvider("gh", "usd"), "flutterwave");
});

Deno.test("providerSupportsCurrency refuses USD on Korapay", () => {
  assert.equal(providerSupportsCurrency("flutterwave", "USD"), true);
  assert.equal(providerSupportsCurrency("korapay", "USD"), false);
  assert.equal(providerSupportsCurrency("xixapay", "USD"), false);
  // A local currency is not restricted here.
  assert.equal(providerSupportsCurrency("korapay", "GHS"), true);
});

Deno.test("a rejected character in the payer name is replaced, not passed through", () => {
  // The alias-shaped name a customer row actually holds; Korapay 400s on the
  // '+' with "One or more fields are invalid. Please fix them and try again."
  assert.equal(sanitizeCustomerName("bob+kesh-data1"), "bob kesh-data1");
  for (const ch of ["(", ")", "%", "<", ">", "="]) {
    const out = sanitizeCustomerName(`a${ch}b`);
    assert.ok(!out.includes(ch), `${ch} should not survive`);
  }
});

Deno.test("accepted punctuation and normal names are preserved", () => {
  assert.equal(sanitizeCustomerName("Kesh-Data"), "Kesh-Data");
  assert.equal(sanitizeCustomerName("O'Brien"), "O'Brien");
  assert.equal(sanitizeCustomerName("a.b,c"), "a.b,c");
});

Deno.test("an empty or fully-replaced name falls back to a placeholder", () => {
  assert.equal(sanitizeCustomerName(""), "Customer");
  assert.equal(sanitizeCustomerName("   "), "Customer");
  assert.equal(sanitizeCustomerName("+++"), "Customer");
  assert.equal(sanitizeCustomerName(undefined as unknown as string), "Customer");
});

Deno.test("runs of replaced characters collapse to a single space", () => {
  assert.equal(sanitizeCustomerName("a+()+b"), "a b");
});
