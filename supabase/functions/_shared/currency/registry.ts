// supabase/functions/_shared/currency/registry.ts
//
// Phase 2. Currency registry: the single source of truth for how a currency
// is represented and handled.
//
// Two facts drive this file, both verified against the Zendit OpenAPI spec
// (dto.Cost / dto.Zend carry `currencyDivisor`):
//
//   1. Zendit's amounts are INTEGERS in minor units, divided by
//      `currencyDivisor` for display. So 500 with divisor 100 is 5.00, and
//      500 with divisor 1 is 500. The divisor is NOT always 100 (JPY, KRW,
//      VND, CLP, ISK and the CFA francs are all divisor 1), so it has to be
//      read from the payload, not assumed.
//   2. We store money as integers in minor units and only convert to a
//      decimal for display or for a numeric DB column. This avoids the
//      float drift that shows up when a price is multiplied by a rate.
//
// `decimals` here is the ISO 4217 exponent and is the FALLBACK divisor. The
// per-offer `currencyDivisor` from Zendit wins when present, because it is
// the provider's own statement about that amount.

/** ISO 4217 minor-unit exponent for the currencies this project can meet. */
const CURRENCY_DECIMALS: Record<string, number> = {
  // 0-decimal currencies (divisor 1)
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  // 3-decimal currencies (divisor 1000)
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  // everything else we meet is 2
  NGN: 2, GHS: 2, KES: 2, ZAR: 2, EGP: 2, MAD: 2, CDF: 2, ZMW: 2,
  TZS: 2, GMD: 2, SLE: 2, AOA: 2, MGA: 2, MWK: 2, BWP: 2, MZN: 2,
  NAD: 2, SCR: 2, SZL: 2, ZWL: 2, USD: 2, EUR: 2, GBP: 2, CAD: 2,
  AUD: 2, CNY: 2, INR: 2, BRL: 2, MXN: 2, SGD: 2, CHF: 2, SEK: 2,
  NOK: 2, DKK: 2, PLN: 2, TRY: 2, RUB: 2, HKD: 2, MYR: 2, PHP: 2,
  IDR: 2, THB: 2, AED: 2, SAR: 2, QAR: 2, ILS: 2, NZD: 2, HUF: 2,
  CZK: 2, RON: 2, BGN: 2, HRK: 2, UAH: 2, PKR: 2, BDT: 2, LKR: 2,
  NPR: 2, MMK: 2, KHR: 2, LAK: 2, MNT: 2, KZT: 2, UZS: 2, AZN: 2,
  GEL: 2, AMD: 2, BYN: 2, RSD: 2, MKD: 2, ALL: 2, MDL: 2, TJS: 2,
  KGS: 2, TMT: 2, AFN: 2, IRR: 2, SYP: 2, YER: 2, LBP: 2,
  ETB: 2, SOS: 2, SDG: 2, SSP: 2, ERN: 2, MVR: 2, BTN: 2, MOP: 2,
  TWD: 2, GTQ: 2, HNL: 2, NIO: 2, CRC: 2, PAB: 2, DOP: 2, HTG: 2,
  JMD: 2, TTD: 2, BBD: 2, BSD: 2, BZD: 2, XCD: 2, CUP: 2, ARS: 2,
  BOB: 2, UYU: 2, VES: 2, COP: 2, PEN: 2, GYD: 2, SRD: 2, FJD: 2,
  PGK: 2, SBD: 2, TOP: 2, WST: 2,
};

/** ISO 4217 code -> minor-unit exponent. Defaults to 2 for anything unknown. */
export function currencyDecimals(code: string): number {
  return CURRENCY_DECIMALS[code?.toUpperCase()] ?? 2;
}

/** Divisor for a currency when the provider did not supply one. */
export function currencyDivisor(code: string): number {
  return 10 ** currencyDecimals(code);
}

/**
 * The divisor to use for a specific provider amount: the provider's own
 * `currencyDivisor` when it supplied a usable one, otherwise the ISO default
 * for that currency.
 */
export function resolveDivisor(
  providerDivisor: number | null | undefined,
  currency: string,
): number {
  if (
    typeof providerDivisor === "number" &&
    Number.isFinite(providerDivisor) &&
    providerDivisor > 0
  ) {
    return providerDivisor;
  }
  return currencyDivisor(currency);
}

/** Provider integer amount -> decimal amount in the same currency. */
export function toDecimal(amountMinor: number, divisor: number): number {
  return amountMinor / divisor;
}

/**
 * Decimal amount -> integer minor units, for storing in an integer column.
 * Rounds half-up, so a converted price never lands fractionally below the
 * decimal the customer was quoted.
 */
export function toMinor(amountDecimal: number, divisor: number): number {
  return Math.round(amountDecimal * divisor);
}

/**
 * Convert an amount held in one currency into another, in integer minor
 * units. `rate` is the multiplier from source to target (e.g. USD->RWF).
 */
export function convertMinor(
  amountMinor: number,
  sourceDivisor: number,
  rate: number,
  targetDivisor: number,
): number {
  const sourceDecimal = amountMinor / sourceDivisor;
  const targetDecimal = sourceDecimal * rate;
  return Math.round(targetDecimal * targetDivisor);
}

/** Format a minor-unit amount for display, with the currency's own decimals. */
export function formatMinor(
  amountMinor: number,
  currency: string,
  divisor?: number,
): string {
  const d = divisor ?? currencyDivisor(currency);
  const decimals = Math.max(0, Math.round(Math.log10(d)));
  const value = amountMinor / d;
  return value.toFixed(decimals);
}

/**
 * The currency the platform's own cost basis is denominated in. Zendit bills
 * in USD, so every catalog cost is normalised to this before any markup is
 * applied.
 */
export const BASE_CURRENCY = "USD";
