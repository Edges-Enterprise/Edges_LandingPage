// supabase/functions/_shared/countryDialCodes.ts
//
// Mirrors the `phoneCode` field from each file under
// src/config/countries/*.ts in the main Next.js app. Duplicated here
// rather than imported because edge functions run on Deno and can't
// resolve the Next.js app's local path-aliased TS config at deploy
// time. If a country is added/changed in src/config/countries, this
// map needs updating too - there is no automated sync between them.
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  bf: "226",
  bj: "229",
  cd: "243",
  cf: "236",
  cg: "242",
  ci: "225",
  cm: "237",
  eg: "20",
  ga: "241",
  gh: "233",
  gn: "224",
  gq: "240",
  ke: "254",
  ma: "212",
  ml: "223",
  ne: "227",
  ng: "234",
  rw: "250",
  sn: "221",
  td: "235",
  tg: "228",
  ug: "256",
  za: "27",
  zm: "260",
};

export function getCountryDialCode(countryCode: string): string {
  return COUNTRY_DIAL_CODES[countryCode.toLowerCase()] || "";
}
