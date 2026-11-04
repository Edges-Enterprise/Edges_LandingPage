// supabase/functions/_shared/countryCurrency.ts
//
// Task 8, branch 8.a.ii. Country -> currency for wallet rows. Mirrors the
// currency field of the web's src/config/countries/* CountryConfig, kept as
// a small standalone map so a Deno edge function does not have to import the
// React-flavoured web config.
//
// Phase 2: a country outside this map is NOT an error and is NOT NGN. It
// falls back to USD, which is the documented default — a reseller outside
// the mapped set holds a USD wallet, funded by Korapay/Flutterwave, and
// their store prices in USD. `global_country_currencies` (the migration) is
// the authoritative mapping for pricing; this map is the wallet-side mirror
// and the two are cross-checked by phase2.integration.test.ts so they cannot
// drift. The `us` entry is explicit rather than left to the fallback, so the
// intent is visible.

const COUNTRY_CURRENCY: Record<string, string> = {
  ng: "NGN",
  gh: "GHS",
  ke: "KES",
  za: "ZAR",
  eg: "EGP",
  ma: "MAD",
  cd: "CDF",
  zm: "ZMW",
  ug: "UGX",
  rw: "RWF",
  cm: "XAF",
  cf: "XAF",
  td: "XAF",
  cg: "XAF",
  ga: "XAF",
  gq: "XAF",
  ci: "XOF",
  sn: "XOF",
  bf: "XOF",
  bj: "XOF",
  tg: "XOF",
  ne: "XOF",
  ml: "XOF",
  gn: "XOF",
  us: "USD",
};

/** The currency a wallet in this country is denominated in. Defaults to USD. */
export function getCountryCurrency(countryCode: string | null | undefined): string {
  return COUNTRY_CURRENCY[(countryCode || "").toLowerCase()] || "USD";
}

/**
 * The wallet-side country -> currency map, exposed so it can be
 * cross-checked against the pricing-side `global_country_currencies` table.
 * The two must agree or a store would price in one currency and hold its
 * wallet in another.
 */
export function countryCurrencyMap(): Readonly<Record<string, string>> {
  return COUNTRY_CURRENCY;
}
