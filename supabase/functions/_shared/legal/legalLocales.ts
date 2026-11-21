// supabase/functions/_shared/legal/legalLocales.ts
//
// Locale plumbing for the legal documents. Pure string/type code - no Deno, npm
// or Supabase imports - so the edge functions and the Next.js app can both use
// it (same constraint as storeLegalText.ts).
//
// Two ideas live here:
//
// 1. A locale is resolved from loose input ("fr-CM", "FR", "fr_FR") to one of
//    the supported legal locales, falling back to English.
// 2. A locale is only *served* once it has been reviewed. Drafted translations
//    can exist in legalTranslations.ts without ever reaching a user, because
//    serving an unreviewed machine translation of a privacy policy is worse
//    than serving English. Flip it on per locale via LEGAL_ENABLED_LOCALES.

export type LegalLocale = "en" | "fr" | "ar" | "es";

export type TextDirection = "ltr" | "rtl";

export interface LegalLocaleMeta {
  code: LegalLocale;
  /** English name, for logs and the coverage report. */
  name: string;
  /** Endonym, for anything user-facing that lists locales. */
  nativeName: string;
  direction: TextDirection;
  /** BCP-47 tag for Intl (date formatting). */
  intlTag: string;
}

export const LEGAL_LOCALES: Record<LegalLocale, LegalLocaleMeta> = {
  en: { code: "en", name: "English", nativeName: "English", direction: "ltr", intlTag: "en-US" },
  fr: { code: "fr", name: "French", nativeName: "Français", direction: "ltr", intlTag: "fr-FR" },
  es: { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr", intlTag: "es-ES" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", intlTag: "ar-EG" },
};

const SUPPORTED = Object.keys(LEGAL_LOCALES) as LegalLocale[];

/**
 * Locales whose translations have been reviewed by a native speaker and may be
 * served to users.
 *
 * Only English is reviewed today. The fr/es/ar dictionaries in
 * legalTranslations.ts are complete drafts written to exercise and validate the
 * mechanism; they are deliberately NOT enabled, because a mistranslated
 * "what we delete" or "governing law" clause is a legal exposure, not a typo.
 *
 * To enable a locale: have a native speaker review it, then add it here (or set
 * LEGAL_ENABLED_LOCALES="en,fr" in the environment). Nothing else needs to
 * change - the routes, the edge function and the fallback all follow.
 */
const REVIEWED_LOCALES: LegalLocale[] = ["en"];

function readEnv(name: string): string | undefined {
  const g = globalThis as unknown as {
    Deno?: { env?: { get(key: string): string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };
  try {
    if (g.Deno?.env?.get) return g.Deno.env.get(name) ?? undefined;
  } catch {
    // Permission denied for env access under Deno; fall through to process.
  }
  try {
    if (g.process?.env) return g.process.env[name];
  } catch {
    // No process.env (edge runtime); ignore.
  }
  return undefined;
}

/**
 * Locales that may be served right now. Always contains "en", because English
 * is the source document and the per-section fallback target.
 */
export function enabledLegalLocales(): LegalLocale[] {
  const override = readEnv("LEGAL_ENABLED_LOCALES");
  if (!override) return [...REVIEWED_LOCALES];

  const requested = override
    .split(",")
    .map((part) => resolveSupportedLocale(part))
    .filter((locale): locale is LegalLocale => locale !== null);

  return Array.from(new Set<LegalLocale>(["en", ...requested]));
}

/** Normalises loose input to a supported locale, or null when unknown. */
function resolveSupportedLocale(input: string | null | undefined): LegalLocale | null {
  if (!input) return null;
  const base = input.trim().toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED as string[]).includes(base) ? (base as LegalLocale) : null;
}

/**
 * Resolves the locale a legal document should be rendered in.
 *
 * Unknown or unreviewed locales fall back to English rather than erroring -
 * a legal page must always render, since it is a Play Store submission URL.
 */
export function resolveLegalLocale(input: string | null | undefined): LegalLocale {
  const requested = resolveSupportedLocale(input);
  if (!requested) return "en";
  return enabledLegalLocales().includes(requested) ? requested : "en";
}

/** Text direction for a resolved locale. */
export function legalDirection(locale: LegalLocale): TextDirection {
  return LEGAL_LOCALES[locale].direction;
}

/** Intl tag for a resolved locale, used for date formatting. */
export function legalIntlTag(locale: LegalLocale): string {
  return LEGAL_LOCALES[locale].intlTag;
}

/** True when the input locale is supported but not yet reviewed. */
export function isUnreviewedLocale(input: string | null | undefined): boolean {
  const requested = resolveSupportedLocale(input);
  if (!requested || requested === "en") return false;
  return !enabledLegalLocales().includes(requested);
}
