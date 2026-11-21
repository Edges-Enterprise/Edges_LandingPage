// supabase/functions/_shared/legal/storeLegalText.ts
//
// Single source of truth for a tenant's privacy policy and terms of service.
//
// Why this lives here: the copy used to exist only in the mobile repo
// (reseller-app/constants/legalTextGenerator.ts), so the app and the web could
// drift. The web needs the same text to serve the public privacy URL that
// Google Play requires for the Data safety form. Porting the mobile text
// verbatim keeps the two identical; the mobile copy is now a thin re-export of
// this module's output (see reseller-app/constants/legalTextGenerator.ts).
//
// Pure string building - no Deno, npm or Supabase imports - so it is importable
// from both the edge functions and the Next.js app (which already imports
// _shared/catalog and _shared/currency the same way).

import {
  legalDirection,
  legalIntlTag,
  resolveLegalLocale,
  type LegalLocale,
  type TextDirection,
} from "./legalLocales.ts";
import {
  ENGLISH_DOCUMENTS,
  TRANSLATED_DOCUMENTS,
  type LegalDocId,
} from "./legalTranslations.ts";

export interface ResellerInfo {
  store_name: string;
  email: string;
  /** Country display name. Defaults to Nigeria when unset. */
  country?: string;
  /**
   * Requested locale ("fr", "fr-CM", "ar-EG"). Resolved and gated by
   * legalLocales.ts: an unreviewed or unknown locale renders English, so
   * callers can pass the country's language code unconditionally.
   */
  locale?: string;
}

const countryName = (reseller: ResellerInfo) => reseller.country || "Nigeria";

function formatDate(intlTag: string): string {
  try {
    return new Date().toLocaleDateString(intlTag, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

interface InterpolationValues {
  store: string;
  email: string;
  country: string;
  date: string;
  year: string;
}

function interpolate(template: string, values: InterpolationValues): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key as keyof InterpolationValues];
    return value === undefined ? match : value;
  });
}

export interface RenderedLegalDocument {
  text: string;
  /** Locale actually rendered, after resolution and review gating. */
  locale: LegalLocale;
  direction: TextDirection;
  /** Section keys that fell back to English, for coverage reporting. */
  fallbackSections: string[];
}

/**
 * Renders a legal document section by section.
 *
 * Each section is looked up in the requested locale and falls back to the
 * English source individually, so a partial translation degrades section by
 * section rather than producing a blank or half-empty document. Placeholders
 * are interpolated after lookup so translations can reorder them.
 */
function renderLegalDocument(
  docId: LegalDocId,
  reseller: ResellerInfo,
): RenderedLegalDocument {
  const locale = resolveLegalLocale(reseller.locale);
  const english = ENGLISH_DOCUMENTS[docId];
  const translated = TRANSLATED_DOCUMENTS[locale]?.[docId];

  const byKey = new Map<string, string>();
  if (translated) {
    for (const section of translated) byKey.set(section.key, section.text);
  }

  const values: InterpolationValues = {
    store: reseller.store_name,
    email: reseller.email,
    country: countryName(reseller),
    date: formatDate(legalIntlTag(locale)),
    year: String(new Date().getFullYear()),
  };

  const fallbackSections: string[] = [];
  const parts = english.map((section) => {
    const translatedText = byKey.get(section.key);
    if (!translatedText) fallbackSections.push(section.key);
    return interpolate(translatedText ?? section.text, values);
  });

  // Header block: store name above the document, as the original layout had.
  const header = `${reseller.store_name}\n${parts[0]}`;
  const body = parts.slice(1).join("\n\n");

  return {
    text: `\n${header}\n\n${body}\n`,
    locale,
    direction: legalDirection(locale),
    fallbackSections: locale === "en" ? [] : fallbackSections,
  };
}

export function generatePrivacyPolicy(reseller: ResellerInfo): string {
  return renderLegalDocument("privacy", reseller).text;
}

export function generateTermsAndConditions(reseller: ResellerInfo): string {
  return renderLegalDocument("terms", reseller).text;
}

/** Same as the generate* helpers, plus locale metadata for the web renderer. */
export function renderPrivacyPolicy(
  reseller: ResellerInfo,
): RenderedLegalDocument {
  return renderLegalDocument("privacy", reseller);
}

export function renderTermsAndConditions(
  reseller: ResellerInfo,
): RenderedLegalDocument {
  return renderLegalDocument("terms", reseller);
}
