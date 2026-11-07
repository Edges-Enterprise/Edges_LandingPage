// supabase/functions/_shared/catalog/detectNetwork.ts
//
// Phase 2. Detect a phone number's carrier and country.
//
// The design's rule: ask the provider, do not guess from prefix tables. A
// prefix table is a copy of reality that drifts; Zendit's lookup is the
// answer from the party that will actually deliver the topup, so the two
// cannot disagree.
//
// The lookup is a network call on a path the customer is waiting on, so it
// is cached per MSISDN and falls back to a local prefix match only when the
// lookup is unavailable — never silently, and the caller can tell which
// happened.
//
// Zendit's lookup requires the number in MSISDN form (dial code + national
// digits, no '+'), and answers `LOOKUP_NOT_ENABLED` for some accounts, so the
// fallback is the path most customers actually hit. A customer may type the
// number the way they know it — "+2348036076543", "2348036076543",
// "08036076543" — so the input is normalised to an MSISDN before either the
// lookup or the prefix match sees it. The caller passes the destination
// country it expects (the plan's, or the store's) as a hint; without it a bare
// local number cannot be placed on a country and is reported unknown rather
// than guessed.

import { lookupPhoneNumber, type PhoneNumberLookup } from "./zenditClient.ts";
import { getCountryDialCode } from "../countryDialCodes.ts";
import { digitsOnly, hasCountryPrefix, toMsisdn } from "../phone/normalize.ts";

export interface Detection {
  country: string;
  brand: string;
  /** "lookup" = from Zendit; "prefix" = local fallback; "unknown". */
  method: "lookup" | "prefix" | "unknown";
  /** Populated only for a prefix match. */
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
 * Prefix table for the fallback match. Only used when the provider lookup is
 * unavailable; deliberately small and explicit rather than a full table, since
 * its job is to avoid a hard failure, not to be authoritative.
 *
 * Nigeria's entries are per-carrier: its mobile prefixes are allocated by
 * carrier, so a Nigerian number can be placed on the right network without the
 * provider lookup. The other countries are country-only — the country is
 * certain, the brand is the largest carrier, and the UI labels a fallback
 * result as an estimate for exactly this reason.
 */
const PREFIX_FALLBACK: { prefix: string; country: string; brand: string | null }[] = [
  // Nigeria — per-carrier prefixes (national, without the trunk 0).
  { prefix: "234803", country: "ng", brand: "MTN" },
  { prefix: "234806", country: "ng", brand: "MTN" },
  { prefix: "234703", country: "ng", brand: "MTN" },
  { prefix: "234706", country: "ng", brand: "MTN" },
  { prefix: "234813", country: "ng", brand: "MTN" },
  { prefix: "234816", country: "ng", brand: "MTN" },
  { prefix: "234810", country: "ng", brand: "MTN" },
  { prefix: "234814", country: "ng", brand: "MTN" },
  { prefix: "234903", country: "ng", brand: "MTN" },
  { prefix: "234906", country: "ng", brand: "MTN" },
  { prefix: "234913", country: "ng", brand: "MTN" },
  { prefix: "234916", country: "ng", brand: "MTN" },
  { prefix: "234805", country: "ng", brand: "Glo" },
  { prefix: "234807", country: "ng", brand: "Glo" },
  { prefix: "234705", country: "ng", brand: "Glo" },
  { prefix: "234815", country: "ng", brand: "Glo" },
  { prefix: "234811", country: "ng", brand: "Glo" },
  { prefix: "234905", country: "ng", brand: "Glo" },
  { prefix: "234915", country: "ng", brand: "Glo" },
  { prefix: "234802", country: "ng", brand: "Airtel" },
  { prefix: "234808", country: "ng", brand: "Airtel" },
  { prefix: "234812", country: "ng", brand: "Airtel" },
  { prefix: "234701", country: "ng", brand: "Airtel" },
  { prefix: "234708", country: "ng", brand: "Airtel" },
  { prefix: "234902", country: "ng", brand: "Airtel" },
  { prefix: "234901", country: "ng", brand: "Airtel" },
  { prefix: "234907", country: "ng", brand: "Airtel" },
  { prefix: "234912", country: "ng", brand: "Airtel" },
  { prefix: "234911", country: "ng", brand: "Airtel" },
  { prefix: "234809", country: "ng", brand: "9mobile" },
  { prefix: "234818", country: "ng", brand: "9mobile" },
  { prefix: "234817", country: "ng", brand: "9mobile" },
  { prefix: "234909", country: "ng", brand: "9mobile" },
  { prefix: "234908", country: "ng", brand: "9mobile" },
  // Country-only fallbacks.
  { prefix: "234", country: "ng", brand: "MTN" },
  { prefix: "250", country: "rw", brand: "MTN" },
  { prefix: "256", country: "ug", brand: "MTN" },
  { prefix: "254", country: "ke", brand: "Safaricom" },
  { prefix: "255", country: "tz", brand: "Vodacom" },
  { prefix: "233", country: "gh", brand: "MTN" },
  { prefix: "27", country: "za", brand: "Vodacom" },
  { prefix: "20", country: "eg", brand: "Vodafone" },
  { prefix: "212", country: "ma", brand: "Maroc Telecom" },
  { prefix: "243", country: "cd", brand: "Vodacom" },
  { prefix: "260", country: "zm", brand: "MTN" },
  { prefix: "237", country: "cm", brand: "MTN" },
  { prefix: "225", country: "ci", brand: "Orange" },
  { prefix: "221", country: "sn", brand: "Orange" },
];

export function detectFromPrefix(msisdn: string): Detection | null {
  const digits = digitsOnly(msisdn);
  if (!digits) return null;
  // Longest prefix wins: a Nigerian "234803…" must beat the bare "234" entry.
  const match = PREFIX_FALLBACK
    .filter((entry) => digits.startsWith(entry.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (!match) return null;
  return {
    country: match.country,
    brand: match.brand ?? "unknown",
    method: "prefix",
    network: match.brand,
  };
}

/**
 * Resolve the MSISDN to look up and match on.
 *
 * An explicit international prefix ("+…", "00…") or a number that already
 * starts with a known dial code is already an MSISDN. A local number needs the
 * hint's dial code to place it; without a hint it cannot be placed, so the
 * digits are returned unchanged and the caller reports unknown.
 */
function resolveMsisdn(input: string, hintCountry: string): string {
  const digits = digitsOnly(input);
  if (!digits) return "";
  if (hasCountryPrefix(input)) return toMsisdn(input, "");
  const hintDial = hintCountry ? getCountryDialCode(hintCountry) : "";
  if (hintDial) return toMsisdn(input, hintDial);
  return digits;
}

/**
 * Detect the country and carrier for a number.
 *
 * `lookup` is injectable so this is testable without the network.
 * `hintCountry` is the destination the caller expects (the plan's or the
 * store's country); it lets a local number be normalised to an MSISDN.
 */
export async function detectNetwork(
  msisdn: string,
  lookup: (m: string) => Promise<PhoneNumberLookup> = lookupPhoneNumber,
  hintCountry = "",
): Promise<Detection> {
  const key = resolveMsisdn(msisdn, hintCountry);
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
    const fallback = detectFromPrefix(key);
    if (fallback) return fallback;
    return { country: "", brand: "", method: "unknown", network: null };
  }
}

/** Test seam: clear the module cache between cases. */
export function clearDetectionCache(): void {
  cache.clear();
}
