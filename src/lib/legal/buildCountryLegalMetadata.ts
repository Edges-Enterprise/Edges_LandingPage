// src/lib/legal/buildCountryLegalMetadata.ts
//
// Metadata for the country-level legal pages.
//
// Mirrors buildLegalMetadata in the tenant route: the title and the language
// annotation follow the same review-gated locale as the body, so a page cannot
// render a localized document under an English <title>.
import type { Metadata } from "next";
import { legalUiStrings } from "../../../supabase/functions/_shared/legal/legalUiStrings";
import { resolveLegalLocale } from "../../../supabase/functions/_shared/legal/legalLocales";
import { resolveCountryLegalIdentity } from "./countryLegal";

export function buildCountryLegalMetadata(
  countryCode: string,
  doc: "privacy" | "terms",
): Metadata {
  const identity = resolveCountryLegalIdentity(countryCode);
  const locale = resolveLegalLocale(identity.locale);
  const ui = legalUiStrings(locale);
  const title = doc === "privacy" ? ui.privacyTitle : ui.termsTitle;

  return {
    title: `${title} - ${identity.brand}`,
    description: `${title} for ${identity.brand} in ${identity.country}.`,
    ...(locale !== "en" && { other: { language: locale } }),
  };
}
