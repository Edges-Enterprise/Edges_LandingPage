// supabase/functions/_shared/phone/normalize.ts
//
// One place that turns a customer-typed phone number into the two forms the
// platform needs: the national digits (the local number a provider is handed)
// and the MSISDN (dial code + national digits, what the network lookup and the
// e.164 recipient require).
//
// The customer may type any form they know the number by — "+2348036076543",
// "2348036076543", "08036076543" or "8036076543" — and all four must resolve
// to the same subscriber. Imported by both the Next app and the edge
// functions, so detection and the purchase can never disagree about who is
// being topped up.
//
// The dial code is passed in rather than looked up here: the Next app reads it
// from `src/config/countries`, the edge functions from
// `_shared/countryDialCodes.ts`, and this module stays the single piece of
// arithmetic they share.

export function digitsOnly(input: string): string {
  return (input || "").replace(/\D/g, "");
}

/** True when the number carries an explicit international prefix. */
export function hasCountryPrefix(input: string): boolean {
  const t = (input || "").trim();
  return t.startsWith("+") || t.startsWith("00");
}

/** Digits with any leading "00" international prefix removed. */
export function stripInternationalPrefix(input: string): string {
  const digits = digitsOnly(input);
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

/**
 * MSISDN (dial code + national digits) from any input form.
 *
 * Three shapes are recognised, in order:
 *   1. an explicit international prefix ("+234…" or "00234…") is trusted as-is;
 *   2. digits that already begin with the country's dial code are taken to be
 *      international ("2348036076543");
 *   3. anything else is a local number — a leading trunk "0" is dropped and the
 *      dial code is prepended ("08036076543" -> "2348036076543").
 *
 * A leading "0" forces shape 3, which disambiguates a local number whose
 * national digits happen to start with the dial code.
 */
export function toMsisdn(input: string, dialCode: string): string {
  const dial = digitsOnly(dialCode);
  if (hasCountryPrefix(input)) return stripInternationalPrefix(input);
  const digits = digitsOnly(input);
  if (!digits.startsWith("0") && dial && digits.startsWith(dial)) return digits;
  const national = digits.replace(/^0+/, "");
  return dial ? dial + national : national;
}

/**
 * National digits for a country: the dial code (when the number carries it)
 * and the leading trunk "0" removed, so "08036076543", "2348036076543" and
 * "+2348036076543" all yield "8036076543".
 */
export function toNationalDigits(input: string, dialCode: string): string {
  const dial = digitsOnly(dialCode);
  const msisdn = toMsisdn(input, dial);
  if (dial && msisdn.startsWith(dial)) return msisdn.slice(dial.length);
  return msisdn;
}
