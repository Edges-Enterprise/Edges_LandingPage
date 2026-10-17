// supabase/functions/_shared/countryCurrency.ts
//
// Task 8, branch 8.a.ii. Country -> currency for wallet rows. Mirrors the
// currency field of the web's src/config/countries/* CountryConfig, kept as
// a small standalone map so a Deno edge function does not have to import the
// React-flavoured web config. Falls back to the store's own currency by
// country; an unknown code falls back to NGN (the codebase's default
// country), not USD.

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
};

export function getCountryCurrency(countryCode: string | null | undefined): string {
  return COUNTRY_CURRENCY[(countryCode || "").toLowerCase()] || "NGN";
}
