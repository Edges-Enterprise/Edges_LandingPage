// supabase/functions/_shared/phone/servedCountries.ts
//
// The countries the platform's catalog actually covers, lowercase ISO-3166
// alpha-2. Generated from the live `global_base_plans` table (the set of
// destination countries Zendit sells through the platform).
//
// This is a scope, not a carrier table: it exists so a bare local number is
// matched against destinations the platform can actually sell, which removes
// the long tail of coincidental matches in libphonenumber's full country list
// (a Nigerian local `08036076543` also parses as a Japanese mobile; with this
// scope it resolves to Nigeria alone).
//
// Regenerate after a catalog sync adds or drops a country:
//   SELECT DISTINCT country_code FROM global_base_plans WHERE is_active;
// A country missing here still resolves when it is the caller's `hint` (the
// store's own country) or one of its `preferred` (the store's catalog), so a
// store is never blocked by a stale list.

export const PLATFORM_COUNTRIES: readonly string[] = [
  "ae", "af", "ag", "ai", "al", "ao", "ar", "aw", "bb", "bd", "bf", "bj",
  "bm", "bo", "bq", "br", "bs", "bw", "bz", "ca", "cd", "cf", "cg", "ci",
  "cl", "cm", "cn", "co", "cr", "cu", "cw", "cy", "de", "dm", "do", "dz",
  "ec", "eg", "es", "et", "fj", "ga", "gd", "gh", "gm", "gn", "gt", "gw",
  "gy", "hn", "ht", "id", "il", "in", "iq", "it", "jm", "jo", "ke", "kh",
  "km", "kn", "ky", "lb", "lc", "lk", "lr", "ma", "mg", "ml", "mm", "mr",
  "ms", "mw", "mx", "my", "mz", "ne", "ng", "ni", "np", "pa", "pe", "ph",
  "pk", "pl", "pr", "py", "ro", "ru", "rw", "sa", "sd", "sl", "sn", "so",
  "sr", "ss", "sv", "sz", "tc", "td", "tg", "th", "tn", "tr", "tt", "tz",
  "ug", "us", "uy", "uz", "vc", "ve", "vg", "vn", "ws", "ye", "za", "zm",
  "zw",
];
