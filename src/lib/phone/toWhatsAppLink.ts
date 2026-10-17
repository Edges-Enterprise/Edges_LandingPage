// src/lib/phone/toWhatsAppLink.ts
//
// Country-driven WhatsApp link builder (Task 4, branch 2.d).
//
// The legacy storefront hardcoded Nigeria's `234` prefix
// (`(store)/old-storeName/StoreContent.tsx`, kept as the behavioral
// reference). This derives the dial code from `CountryConfig.phoneCode`
// so non-Nigerian stores produce a correct `wa.me` link. Inputs may
// carry a country code already (`+234...`), a trunk `0` (`0803...`) or
// already-national digits (`803...`).

import type { CountryConfig } from "@/config/countries";

export type WhatsAppConfig = Pick<CountryConfig, "phoneCode">;

function digitsOnly(input: string): string {
  return (input || "").replace(/\D/g, "");
}

/**
 * Build a `https://wa.me/<E.164-without-plus>` link, or `null` when the
 * number is empty.
 */
export function toWhatsAppLink(
  rawPhone: string,
  config: WhatsAppConfig,
): string | null {
  const dial = digitsOnly(config.phoneCode);
  let phone = digitsOnly(rawPhone);
  if (!phone) return null;

  if (phone.startsWith(dial)) {
    // already carries the country code
  } else if (phone.startsWith("0")) {
    phone = dial + phone.slice(1);
  } else {
    phone = dial + phone;
  }

  return `https://wa.me/${phone}`;
}
