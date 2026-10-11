// src/lib/phone/validatePhoneNumber.ts
//
// Country-aware mobile-number validation (Task 4, branch 2.c).
//
// Replaces the country-blind `phone.length === 11` / `=== 10` checks
// (e.g. PurchaseModal.tsx, StoreHeader.tsx) with the per-country digit
// length on `CountryConfig.phoneNumber`. The country code and any
// leading trunk `0` are not counted, so a Nigerian `0803...`
// (11 chars) and its `803...` form (10 chars) both pass with
// `{ minDigits: 10, maxDigits: 10 }`.

import type { CountryConfig } from "@/config/countries";

export type PhoneNumberConfig = CountryConfig["phoneNumber"];

/** Strip spaces, dashes, parentheses and a leading `+`/trunk `0`. */
export function normalizePhoneDigits(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits;
}

export function isValidPhoneNumber(
  input: string,
  config: PhoneNumberConfig,
): boolean {
  const digits = normalizePhoneDigits(input);
  return (
    digits.length >= config.minDigits && digits.length <= config.maxDigits
  );
}
