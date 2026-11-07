// src/lib/storefront/countryLabel.ts
//
// Display label for a destination country code in the storefront's global
// (world) view. Uses the platform's CLDR region names, so a code Zendit adds
// later is named without a code change. Falls back to the upper-cased code
// when the runtime has no display-name data for it.

const displayNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

export function countryLabel(code: string): string {
  const upper = (code || "").toUpperCase();
  if (!upper) return "";
  try {
    return displayNames?.of(upper) || upper;
  } catch {
    return upper;
  }
}

/** Regional-indicator flag emoji for a two-letter country code. */
export function countryFlag(code: string): string {
  const cc = (code || "").toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return "🌍";
  return String.fromCodePoint(
    ...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 97),
  );
}
