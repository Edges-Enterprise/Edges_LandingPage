// supabase/functions/_shared/legal/countryName.ts
//
// Country code -> display name, for the legal copy ("based in Rwanda").
//
// A standalone map for the same reason _shared/countryCurrency.ts is one: a
// Deno edge function should not import the React-flavoured src/config/countries
// CountryConfig just to read a name. The values mirror the `name` field of
// those configs; keep the two in step when a country is added.

const COUNTRY_NAMES: Record<string, string> = {
  ng: "Nigeria",
  gh: "Ghana",
  ke: "Kenya",
  za: "South Africa",
  eg: "Egypt",
  ma: "Morocco",
  cd: "DRC",
  zm: "Zambia",
  ug: "Uganda",
  rw: "Rwanda",
  cm: "Cameroon",
  cf: "Central African Republic",
  td: "Chad",
  cg: "Congo",
  ga: "Gabon",
  gq: "Equatorial Guinea",
  ci: "Ivory Coast",
  sn: "Senegal",
  bf: "Burkina Faso",
  bj: "Benin",
  tg: "Togo",
  ne: "Niger",
  ml: "Mali",
  gn: "Guinea",
  us: "United States",
};

/** Display name for a country code; undefined when the code is unknown. */
export function getCountryName(
  countryCode: string | null | undefined,
): string | undefined {
  return COUNTRY_NAMES[(countryCode || "").toLowerCase()];
}
