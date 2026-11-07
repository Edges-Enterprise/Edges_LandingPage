// supabase/functions/_shared/catalog/detectNetwork.ts
//
// Phase 2. Detect a phone number's carrier and country.
//
// The design's rule is to ask the provider rather than guess from a prefix
// table, so the lookup is tried first and its answer wins when it answers.
// Zendit's lookup answers `LOOKUP_NOT_ENABLED` for this account, so in
// practice the local reading is what customers hit — which is why that reading
// has to be right, not merely a stopgap.
//
// The local reading is libphonenumber's metadata (see
// `_shared/phone/detectCountry.ts`): the country comes from the number itself,
// so a Rwandan store sees that a Nigerian number is Nigerian even though the
// store never enabled Nigeria. The caller's `hint` (the store's country, or
// the tab the customer is on) and its `preferred` list (the countries the store
// sells) only break ties for an ambiguous local number; they never override a
// number whose own form is unambiguous.
//
// The brand is the one part that stays an estimate: with the provider lookup
// unavailable, the brand is read from a small country/carrier map and the
// response is labelled `fallback` so the UI can say so.

import { lookupPhoneNumber, type PhoneNumberLookup } from "./zenditClient.ts";
import { getCountryDialCode } from "../countryDialCodes.ts";
import { digitsOnly, toMsisdn } from "../phone/normalize.ts";
import { detectCountry } from "../phone/detectCountry.ts";

export interface Detection {
  country: string;
  brand: string;
  /** "lookup" = from Zendit; "prefix" = local estimate; "unknown". */
  method: "lookup" | "prefix" | "unknown";
  /** Populated only for a local estimate. */
  network: string | null;
}

/** Process-local cache. The lookup result for a number does not change. */
const cache = new Map<string, PhoneNumberLookup>();

/**
 * Normalise to an MSISDN (dial code + national digits, no '+') for cache keys
 * and prefix matching. With no dial code the digits are returned as typed.
 */
export function normaliseMsisdn(msisdn: string, dialCode = ""): string {
  return dialCode ? toMsisdn(msisdn, dialCode) : digitsOnly(msisdn);
}

/**
 * The largest carrier per country, used only to label a locally-read number
 * when the provider lookup is unavailable. A country absent here reports the
 * brand as "unknown" — an honest gap rather than a guess.
 */
const COUNTRY_DEFAULT_BRAND: Record<string, string> = {
  ng: "MTN",
  rw: "MTN",
  ug: "MTN",
  ke: "Safaricom",
  tz: "Vodacom",
  gh: "MTN",
  za: "Vodacom",
  eg: "Vodafone",
  ma: "Maroc Telecom",
  cd: "Vodacom",
  zm: "MTN",
  cm: "MTN",
  ci: "Orange",
  sn: "Orange",
};

/**
 * Nigeria's mobile prefixes are allocated per carrier, so a Nigerian number can
 * be placed on the right network without the provider lookup. Keyed on the
 * national digits (no dial code, no trunk `0`).
 */
const NG_CARRIER_PREFIXES: [prefix: string, brand: string][] = [
  ["803", "MTN"], ["806", "MTN"], ["703", "MTN"], ["706", "MTN"],
  ["813", "MTN"], ["816", "MTN"], ["810", "MTN"], ["814", "MTN"],
  ["903", "MTN"], ["906", "MTN"], ["913", "MTN"], ["916", "MTN"],
  ["805", "Glo"], ["807", "Glo"], ["705", "Glo"], ["815", "Glo"],
  ["811", "Glo"], ["905", "Glo"], ["915", "Glo"],
  ["802", "Airtel"], ["808", "Airtel"], ["812", "Airtel"], ["701", "Airtel"],
  ["708", "Airtel"], ["902", "Airtel"], ["901", "Airtel"], ["907", "Airtel"],
  ["912", "Airtel"], ["911", "Airtel"],
  ["809", "9mobile"], ["818", "9mobile"], ["817", "9mobile"],
  ["909", "9mobile"], ["908", "9mobile"],
];

/** The carrier to label a country with, using Nigeria's prefixes when known. */
function brandFor(country: string, national: string): string | null {
  if (country === "ng") {
    const hit = NG_CARRIER_PREFIXES.find(([p]) => national.startsWith(p));
    if (hit) return hit[1];
  }
  return COUNTRY_DEFAULT_BRAND[country] ?? null;
}

/**
 * Read a number's country and brand locally, without the provider lookup.
 *
 * Kept as a named export because it is the fallback the caller degrades to and
 * the piece the tests pin. Returns null when the number cannot be placed.
 */
export function detectFromPrefix(
  msisdn: string,
  hintCountry = "",
  preferred: string[] = [],
): Detection | null {
  const read = detectCountry(msisdn, hintCountry, preferred);
  if (!read.country) return null;
  const dial = getCountryDialCode(read.country);
  const national = dial && read.e164.startsWith("+" + dial)
    ? read.e164.slice(dial.length + 1)
    : digitsOnly(msisdn);
  const brand = brandFor(read.country, national);
  return {
    country: read.country,
    brand: brand ?? "unknown",
    method: "prefix",
    network: brand,
  };
}

/**
 * The MSISDN to hand the provider lookup (dial code + national digits).
 *
 * The number's own country is read first, so a local number becomes a proper
 * MSISDN even when the store never enabled that country. The hint's dial code
 * is only a last resort for a number the local read could not place.
 */
function resolveMsisdn(
  input: string,
  hintCountry: string,
  preferred: string[],
): string {
  const read = detectCountry(input, hintCountry, preferred);
  if (read.e164) return read.e164.replace("+", "");
  const digits = digitsOnly(input);
  if (!digits) return "";
  const hintDial = hintCountry ? getCountryDialCode(hintCountry) : "";
  return hintDial ? toMsisdn(input, hintDial) : digits;
}

/**
 * Detect the country and carrier for a number.
 *
 * `lookup` is injectable so this is testable without the network.
 * `hintCountry` is the destination the caller expects (the store's country, or
 * the tab the customer is on); `preferred` is the set of countries the store
 * sells. Both only break ties for an ambiguous local number.
 */
export async function detectNetwork(
  msisdn: string,
  lookup: (m: string) => Promise<PhoneNumberLookup> = lookupPhoneNumber,
  hintCountry = "",
  preferred: string[] = [],
): Promise<Detection> {
  const key = resolveMsisdn(msisdn, hintCountry, preferred);
  if (!key) return { country: "", brand: "", method: "unknown", network: null };

  const cached = cache.get(key);
  if (cached) {
    return {
      country: cached.country.toLowerCase(),
      brand: cached.brand,
      method: "lookup",
      network: cached.brand,
    };
  }

  try {
    const found = await lookup(key);
    cache.set(key, found);
    return {
      country: found.country.toLowerCase(),
      brand: found.brand,
      method: "lookup",
      network: found.brand,
    };
  } catch {
    const fallback = detectFromPrefix(msisdn, hintCountry, preferred);
    if (fallback) return fallback;
    return { country: "", brand: "", method: "unknown", network: null };
  }
}

/** Test seam: clear the module cache between cases. */
export function clearDetectionCache(): void {
  cache.clear();
}
