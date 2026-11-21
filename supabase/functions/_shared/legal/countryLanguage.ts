// supabase/functions/_shared/legal/countryLanguage.ts
//
// Country code -> language code, for the legal copy.
//
// A standalone map for the same reason countryName.ts is one: a Deno edge
// function must not import the React-flavoured src/config/countries
// CountryConfig just to read `language.code`. The values mirror that field;
// keep the two in step when a country is added (see
// `scripts/check-legal-locales.ts` if present, which fails the build on drift).
//
// Note `eg` is mapped here even though it is missing from the COUNTRIES map in
// src/config/countries/index.ts (a known bug - Egypt falls back to the USD
// config). Mapping it here means the legal text is correct for Egypt as soon as
// that config is registered, and is harmless until then.

const COUNTRY_LANGUAGES: Record<string, string> = {
  ng: "en",
  gh: "en",
  ke: "en",
  za: "en",
  zm: "en",
  ug: "en",
  rw: "en",
  us: "en",
  eg: "ar",
  gq: "es",
  cm: "fr",
  cf: "fr",
  td: "fr",
  cg: "fr",
  ga: "fr",
  ci: "fr",
  sn: "fr",
  bf: "fr",
  bj: "fr",
  tg: "fr",
  ne: "fr",
  ml: "fr",
  gn: "fr",
  cd: "fr",
  ma: "fr",
};

/** Language code for a country; undefined when the country is unknown. */
export function getCountryLanguage(
  countryCode: string | null | undefined,
): string | undefined {
  return COUNTRY_LANGUAGES[(countryCode || "").toLowerCase()];
}
