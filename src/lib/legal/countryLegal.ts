// src/lib/legal/countryLegal.ts
//
// Who a country-level legal page speaks for.
//
// The tenant pages under [storeName]/privacy|terms name the tenant. The country
// pages under [countryCode]/privacy|terms sit one level up and must name the
// operator of that country's storefront instead - otherwise a Rwandan visitor
// reads a policy whose contact address and jurisdiction are Nigerian.
//
// Kept separate from the shared renderer (supabase/functions/_shared/legal) so
// that module stays pure string building with no knowledge of this app's
// branding, and separate from the route files so the metadata and the body
// cannot disagree about who is speaking.

import { getCountryConfig, type CountryConfig } from "@/config/countries";
import { getCountryName } from "../../../supabase/functions/_shared/legal/countryName";

/** The trading name used across the platform's own (non-tenant) surfaces. */
export const PLATFORM_BRAND = "Edges Network";

/**
 * Address published for privacy requests and account deletion.
 *
 * This is the address already used by /contact, /help, the support widget and
 * the legacy global /privacy page, so a user who writes to the address on a
 * country policy reaches a monitored inbox.
 */
export const PLATFORM_SUPPORT_EMAIL = "edgesnetwork@gmail.com";

export interface CountryLegalIdentity {
  /** Trading name to put in the policy ("Edges Network"). */
  brand: string;
  /** Contact address for privacy requests and deletion. */
  email: string;
  /** Country display name, used in "based in {country}". */
  country: string;
  /** Country's language code; review-gated to English downstream. */
  locale: string;
  config: CountryConfig;
}

/**
 * Resolves the identity a country legal page speaks for.
 *
 * `countryCode` is whatever arrived in the URL, so an unknown code must not
 * silently borrow another country's jurisdiction. The config layer already
 * falls back to the USD/international config, and `getCountryName` returns
 * undefined for codes it does not know; in that case the name falls back to
 * the config's own name ("International") rather than to Nigeria.
 */
export function resolveCountryLegalIdentity(
  countryCode: string,
): CountryLegalIdentity {
  const config = getCountryConfig(countryCode);

  return {
    brand: PLATFORM_BRAND,
    email: PLATFORM_SUPPORT_EMAIL,
    country: getCountryName(config.code) ?? config.name,
    locale: config.language.code,
    config,
  };
}
