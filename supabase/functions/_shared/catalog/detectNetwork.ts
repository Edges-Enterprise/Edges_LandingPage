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

import { lookupPhoneNumber, type PhoneNumberLookup } from "./zenditClient.ts";

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

/** Normalise to digits only, for cache keys and prefix matching. */
export function normaliseMsisdn(msisdn: string): string {
  return msisdn.replace(/^\+/, "").replace(/\D/g, "");
}

/**
 * Longest-prefix match against the dial codes we know. Only used as a
 * fallback; deliberately small and explicit rather than a full table, since
 * its job is to avoid a hard failure, not to be authoritative.
 */
const PREFIX_FALLBACK: { prefix: string; country: string; brand: string | null }[] = [
  { prefix: "250", country: "rw", brand: "MTN" },
  { prefix: "256", country: "ug", brand: "MTN" },
  { prefix: "254", country: "ke", brand: "Safaricom" },
  { prefix: "255", country: "tz", brand: "Vodacom" },
  { prefix: "233", country: "gh", brand: "MTN" },
  { prefix: "234", country: "ng", brand: "MTN" },
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
  const digits = normaliseMsisdn(msisdn);
  if (!digits) return null;
  for (const entry of PREFIX_FALLBACK) {
    if (digits.startsWith(entry.prefix)) {
      return {
        country: entry.country,
        brand: entry.brand ?? "unknown",
        method: "prefix",
        network: entry.brand,
      };
    }
  }
  return null;
}

/**
 * Detect the country and carrier for a number.
 *
 * `lookup` is injectable so this is testable without the network.
 */
export async function detectNetwork(
  msisdn: string,
  lookup: (m: string) => Promise<PhoneNumberLookup> = lookupPhoneNumber,
): Promise<Detection> {
  const key = normaliseMsisdn(msisdn);
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
