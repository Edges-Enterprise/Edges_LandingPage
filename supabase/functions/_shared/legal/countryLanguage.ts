// supabase/functions/_shared/legal/countryLanguage.ts
//
// Country code -> language code, for the legal copy.
//
// A standalone map for the same reason countryName.ts is one: a Deno edge
// function must not import the React-flavoured src/config/countries
// CountryConfig just to read `language.code`. The values mirror that field;
// keep the two in step when a country is added.
//
// `eg` and `ma` are mapped here and are now also registered in COUNTRIES in
// src/config/countries/index.ts. They were previously mapped here but absent
// from that registry, so an Egyptian store's legal page rendered English and
// named the country "International" - this map was right while the web config
// was not.

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
