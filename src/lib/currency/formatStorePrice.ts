// src/lib/currency/formatStorePrice.ts
//
// Customer-storefront price formatter (Task 4, branch 2.a).
//
// Output: currency symbol before the number, no forced decimals
// (e.g. "₦1,500", "KSh 1,500"; a space is added only after a symbol that
// ends in a letter). This matches the legacy `formatNaira` look in
// src/lib/pricing/calculatePrice.ts, but is country-driven.
//
// Deliberately separate from `formatPrice` (src/lib/currency/currency.ts:
// adds a space, no explicit locale, used by the dashboard) and
// `formatCurrency` (src/lib/utils/helpers.ts: forces 2 decimals).
//
// The locale is always explicit so server render and client hydration
// produce the same string. Decision (2026-10-09, from the person): use
// `config.locale` as-is, including Egypt's `ar-EG` (Arabic-Indic digits).

import type { CountryConfig } from "@/config/countries";

export type StorePriceConfig = Pick<CountryConfig, "currencySymbol" | "locale">;

/**
 * Format a storefront price using the country's symbol and locale.
 * `null`, `undefined` and non-finite values format as 0.
 */
export function formatStorePrice(
  amount: number | null | undefined,
  config: StorePriceConfig,
): string {
  const safe =
    typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const number = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
  // Letter symbols ("CFA", "KSh", "R") get a space; symbols ending in a
  // sign ("₦", "₵", "E£") stay attached.
  const gap = /\p{L}$/u.test(config.currencySymbol) ? " " : "";
  return `${config.currencySymbol}${gap}${number}`;
}
