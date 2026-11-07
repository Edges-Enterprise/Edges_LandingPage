// Run with: deno test --allow-env supabase/functions/_shared/phone/normalize.test.ts
//
// The four forms a customer might type for one number must all reduce to the
// same MSISDN and the same national digits. Getting this wrong mis-routes a
// topup to a stranger's number, so each shape is pinned here.

import assert from "node:assert/strict";
import {
  digitsOnly,
  hasCountryPrefix,
  stripInternationalPrefix,
  toMsisdn,
  toNationalDigits,
} from "./normalize.ts";

const NG = "234";
const RW = "250";

Deno.test("normalize: digitsOnly drops every non-digit", () => {
  assert.equal(digitsOnly("+234 803-607-6543"), "2348036076543");
  assert.equal(digitsOnly(""), "");
});

Deno.test("normalize: detects and strips an international prefix", () => {
  assert.equal(hasCountryPrefix("+2348036076543"), true);
  assert.equal(hasCountryPrefix("002348036076543"), true);
  assert.equal(hasCountryPrefix("08036076543"), false);
  assert.equal(stripInternationalPrefix("+2348036076543"), "2348036076543");
  assert.equal(stripInternationalPrefix("002348036076543"), "2348036076543");
});

Deno.test("normalize: all Nigerian forms give the same msisdn", () => {
  for (const form of [
    "+2348036076543",
    "2348036076543",
    "08036076543",
    "8036076543",
    "0803 607 6543",
    "+234 803 607 6543",
  ]) {
    assert.equal(toMsisdn(form, NG), "2348036076543", `msisdn of ${form}`);
    assert.equal(toNationalDigits(form, NG), "8036076543", `national of ${form}`);
  }
});

Deno.test("normalize: a Rwandan local number gets the right dial code", () => {
  assert.equal(toMsisdn("0788123456", RW), "250788123456");
  assert.equal(toNationalDigits("0788123456", RW), "788123456");
  assert.equal(toMsisdn("+250788123456", RW), "250788123456");
});

Deno.test("normalize: a leading trunk 0 forces the local interpretation", () => {
  // A local number is read as local even when its national digits begin with
  // the dial code, because the trunk 0 can only be a local form.
  assert.equal(toMsisdn("0234567890", NG), "234234567890");
});

Deno.test("normalize: no dial code leaves the digits as typed", () => {
  assert.equal(toMsisdn("08036076543", ""), "8036076543");
  assert.equal(toMsisdn("2348036076543", ""), "2348036076543");
});
