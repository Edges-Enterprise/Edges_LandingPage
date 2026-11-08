// supabase/functions/_shared/phone/detectCountry.ts
//
// Resolve a phone number's country from the number itself.
//
// The storefront used to place a number on a country only by assuming the
// store's own country (a "hint"), so a Rwandan store could never see that a
// Nigerian number it was typed was Nigerian — the number's own country was
// ignored whenever it disagreed with the store. This module reads the country
// out of the number, so detection works for any destination the platform
// sells, whether or not the store enabled that country.
//
// The reading, in order of certainty:
//   1. an explicit international form ("+234…" or "00234…") is parsed as-is;
//   2. digits that begin with a country dial code ("2348036076543") are tried
//      against every country that dial code could belong to, mobile numbers
//      first;
//   3. a bare local number ("08036076543") is tried against every country, but
//      the caller's `hint` (the store's country, or the tab the customer is on)
//      and its `preferred` list (the countries the store actually sells) are
//      tried first, so an ambiguous local number lands on the customer's own
//      country rather than the first alphabetically-valid one. A number that
//      stays valid in several countries with no such tie-break is left
//      unresolved, never guessed.
//
// libphonenumber's metadata (the same data Android's dialer uses) is the source
// of truth, so the answer agrees with what a device would report and does not
// drift the way a hand-maintained prefix table does. Zendit's lookup remains
// the authoritative answer when it answers (see detectNetwork.ts); this is the
// local reading used when it does not.

import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "npm:libphonenumber-js@1.13.15/max";
import { PLATFORM_COUNTRIES } from "./servedCountries.ts";

export interface CountryDetection {
  /** Lowercase ISO-3166 alpha-2, or "" when the number cannot be placed. */
  country: string;
  /** E.164 form ("+2348036076543"), or "" when the number cannot be placed. */
  e164: string;
  /** True when the number is a mobile number (the only kind a topup sells). */
  mobile: boolean;
}

const UNKNOWN: CountryDetection = { country: "", e164: "", mobile: false };

const COUNTRIES = getCountries() as string[];
const COUNTRY_SET = new Set(COUNTRIES);
const MOBILE_TYPES = new Set([
  "MOBILE",
  "FIXED_LINE_OR_MOBILE",
  "PERSONAL_NUMBER",
]);

// The countries a bare local number is tried against: the platform's catalog
// countries (so a local number lands on a destination the platform sells), plus
// any country the caller names. A number that carries its own dial code is not
// limited to this set — an explicit international form is unambiguous.
const SERVED = PLATFORM_COUNTRIES
  .map((c) => c.toUpperCase())
  .filter((c) => COUNTRY_SET.has(c));

// Every country's dial code, longest first so a 3-digit code is tried before
// the 2-digit code that prefixes it.
const DIAL_CODES: { dial: string; country: string }[] = [];
for (const country of COUNTRIES) {
  let dial = "";
  try {
    dial = getCountryCallingCode(country as never);
  } catch {
    continue;
  }
  if (dial) DIAL_CODES.push({ dial, country });
}
DIAL_CODES.sort((a, b) => b.dial.length - a.dial.length);

function parse(national: string, country: string) {
  return parsePhoneNumberFromString(national, country as never);
}

function isMobile(p: { getType: () => string | undefined }): boolean {
  return MOBILE_TYPES.has(p.getType() ?? "");
}

function result(country: string, number: string, mobile: boolean): CountryDetection {
  return { country: country.toLowerCase(), e164: number, mobile };
}

/**
 * Try a bare (no trunk `0`) number against each country whose dial code it
 * starts with. Mobile numbers win over any valid number, so a number that is a
 * mobile number in one country is not placed on a country where it merely
 * parses as a landline.
 */
function byDialPrefix(digits: string): CountryDetection | null {
  const candidates = DIAL_CODES.filter((d) => digits.startsWith(d.dial));
  for (const { dial, country } of candidates) {
    const p = parse(digits.slice(dial.length), country);
    if (p && p.isValid() && isMobile(p)) return result(country, p.number, true);
  }
  for (const { dial, country } of candidates) {
    const p = parse(digits.slice(dial.length), country);
    if (p && p.isValid()) return result(country, p.number, isMobile(p));
  }
  return null;
}

/**
 * The caller's tie-break countries in priority order: the hint (the store's
 * country, or the tab the customer is on) first, then the store's own catalog.
 * Uppercased, deduped and limited to real countries.
 */
function priorityCountries(hint: string, preferred: string[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const add = (c: string) => {
    const cu = (c || "").trim().toUpperCase();
    if (cu && COUNTRY_SET.has(cu) && !seen.has(cu)) {
      seen.add(cu);
      order.push(cu);
    }
  };
  add(hint);
  for (const c of preferred) add(c);
  return order;
}

/**
 * Every country a bare local number is a valid *mobile* number in. A number
 * that is a mobile in one country must not be placed on a country where it
 * merely parses as a landline, so the two sets are gathered separately.
 */
function mobileMatches(digits: string, pool: string[]): string[] {
  return pool.filter((c) => {
    const p = parse(digits, c);
    return p && p.isValid() && isMobile(p);
  });
}

/** Every country in the pool the number is a valid number of any type in. */
function validMatches(digits: string, pool: string[]): string[] {
  return pool.filter((c) => {
    const p = parse(digits, c);
    return p && p.isValid();
  });
}

/**
 * Choose one country from the matches, or "" when the field is still
 * ambiguous. A lone match is taken as-is. Otherwise the hint (the store's own
 * country, or the active tab) wins if it is among the matches, and failing
 * that the store's catalog breaks a tie when exactly one of its countries
 * matches. A number that stays valid in several countries with no such
 * tie-break is left unresolved rather than guessed — placing a Rwandan
 * customer's number on Afghanistan because it happens to parse there is worse
 * than showing nothing.
 */
function pickCountry(matches: string[], priority: string[]): string {
  if (matches.length === 1) return matches[0];
  const [hint, ...catalog] = priority;
  if (hint && matches.includes(hint)) return hint;
  const narrowed = catalog.filter((c) => matches.includes(c));
  if (narrowed.length === 1) return narrowed[0];
  return "";
}

/**
 * The country a phone number belongs to.
 *
 * `hint` is the destination the caller expects (the store's country, or the
 * tab the customer is on); `preferred` is the set of countries the store
 * actually sells. Both are tie-breaks for a bare local number — a number whose
 * own form is unambiguous (international, or a dial-code-prefixed mobile) is
 * placed on its own country regardless of either.
 */
export function detectCountry(
  input: string,
  hint = "",
  preferred: string[] = [],
): CountryDetection {
  const raw = (input ?? "").trim();
  if (!/\d/.test(raw)) return UNKNOWN;

  // 1. Explicit international form.
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const e164 = raw.startsWith("00")
      ? "+" + raw.replace(/\D/g, "").slice(2)
      : raw;
    const p = parsePhoneNumberFromString(e164);
    if (p && p.country) return result(p.country, p.number, isMobile(p));
    return { country: "", e164: p?.number ?? "", mobile: false };
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return UNKNOWN;

  // 2. A number that carries its dial code but not a "+".
  if (!digits.startsWith("0")) {
    const byDial = byDialPrefix(digits);
    if (byDial) return byDial;
  }

  // 3. A bare local number. Try it as a mobile against the store's own
  // countries first, then against the platform's catalog; fall back to any
  // valid number. An answer that stays ambiguous across several countries is
  // left unresolved rather than guessed.
  const priority = priorityCountries(hint, preferred);
  const pool = [...priority, ...SERVED.filter((c) => !priority.includes(c))];
  const mobile = pickCountry(mobileMatches(digits, pool), priority);
  const chosen = mobile || pickCountry(validMatches(digits, pool), priority);
  if (!chosen) return UNKNOWN;

  const p = parse(digits, chosen);
  return result(chosen, p!.number, mobile === chosen);
}
