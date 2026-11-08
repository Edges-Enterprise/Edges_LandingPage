// Run with: deno test --no-check --allow-env --allow-read --allow-net \
//   supabase/functions/_shared/phone/detectCountry.test.ts
//
// The storefront's country detection. The point of these cases is the
// requirement that a number is placed on its own country — including a country
// the store never enabled — and that a hint only ever breaks a tie, never
// overrides an unambiguous number.

import assert from "node:assert/strict";
import { detectCountry } from "./detectCountry.ts";

Deno.test("detectCountry: an international form is placed on its own country", () => {
  assert.equal(detectCountry("+2348036076543").country, "ng");
  assert.equal(detectCountry("+250788123456").country, "rw");
  assert.equal(detectCountry("+256701234567").country, "ug");
  assert.equal(detectCountry("+233241234567").country, "gh");
  assert.equal(detectCountry("002348036076543").country, "ng");
});

Deno.test("detectCountry: a number carrying its dial code is placed without a '+'", () => {
  assert.equal(detectCountry("2348036076543").country, "ng");
  assert.equal(detectCountry("250788123456").country, "rw");
});

Deno.test("detectCountry: a bare local number is placed with no hint at all", () => {
  // The requirement: detection must not need the country code typed.
  assert.equal(detectCountry("08036076543").country, "ng");
  assert.equal(detectCountry("0241234567").country, "gh");
  assert.equal(detectCountry("01001234567").country, "eg");
});

Deno.test("detectCountry: an ambiguous local number resolves with the store hint", () => {
  // "0788123456" is a valid mobile number in more than one country; with the
  // store's country (or the tab the customer is on) it resolves correctly.
  assert.equal(detectCountry("0788123456", "rw").country, "rw");
  assert.equal(detectCountry("0788123456", "", ["rw"]).country, "rw");
});

Deno.test("detectCountry: the number's own country beats a mismatched hint", () => {
  // A Rwandan store (hint "rw") handed a Nigerian number must still report ng.
  assert.equal(detectCountry("08036076543", "rw").country, "ng");
  assert.equal(detectCountry("+250788123456", "ng").country, "rw");
});

Deno.test("detectCountry: the store's own countries break a tie", () => {
  // "0712345678" is a valid mobile number in many countries; when the store
  // sells Uganda, that is the reading it gets.
  assert.equal(detectCountry("0712345678", "", ["ug"]).country, "ug");
});

Deno.test("detectCountry: the e164 form is normalised", () => {
  assert.equal(detectCountry("08036076543").e164, "+2348036076543");
  assert.equal(detectCountry("0788123456", "rw").e164, "+250788123456");
  assert.equal(detectCountry("+256701234567").e164, "+256701234567");
});

Deno.test("detectCountry: mobile numbers are flagged", () => {
  assert.equal(detectCountry("+2348036076543").mobile, true);
});

Deno.test("detectCountry: an unplaceable number is unknown, never a guess", () => {
  assert.equal(detectCountry("12345").country, "");
  assert.equal(detectCountry("").country, "");
  assert.equal(detectCountry("abc").country, "");
});

Deno.test("detectCountry: an ambiguous local number is never guessed", () => {
  // "0712345678" is a valid mobile in many served countries (ke, tz, ug, za…).
  // With no hint and no store catalog it must stay unresolved rather than land
  // on the first alphabetically-valid country (previously: Afghanistan).
  assert.equal(detectCountry("0712345678").country, "");
  assert.equal(detectCountry("0788123456").country, "");
});

Deno.test("detectCountry: the store's own country wins an ambiguous local number", () => {
  // A Rwandan store, even with an empty catalog hint, still resolves its own
  // local form because the store country is the caller's hint.
  assert.equal(detectCountry("0788123456", "rw").country, "rw");
  // A store that sells several countries still resolves the number it carries.
  assert.equal(detectCountry("0712345678", "tz").country, "tz");
  assert.equal(detectCountry("0712345678", "ug").country, "ug");
});
