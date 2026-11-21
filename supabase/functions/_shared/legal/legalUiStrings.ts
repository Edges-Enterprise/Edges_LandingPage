// supabase/functions/_shared/legal/legalUiStrings.ts
//
// The page furniture around a legal document: the document title, the back
// link, the closing question. These are not part of the policy text itself, but
// they were hardcoded English in the route and the renderer, so a French policy
// would still have been framed by an English heading and an English "Back to".
//
// Kept separate from legalTranslations.ts because the review process differs:
// these are UI labels a translator can confirm in minutes, whereas the policy
// body needs legal review. They can therefore be enabled independently.

import type { LegalLocale } from "./legalLocales";

export interface LegalUiStrings {
  /** Title of the privacy document, used as the page heading. */
  privacyTitle: string;
  /** Title of the terms document. */
  termsTitle: string;
  /** "← Back to {store}" */
  backTo: string;
  /** Closing question above the contact email, privacy. */
  privacyClosingQuestion: string;
  /** Closing question above the contact email, terms. */
  termsClosingQuestion: string;
  /** The word before the mailto link ("Email"). */
  emailLabel: string;
}

const en: LegalUiStrings = {
  privacyTitle: "Privacy Policy",
  termsTitle: "Terms of Service",
  backTo: "← Back to {store}",
  privacyClosingQuestion: "Questions about this privacy policy?",
  termsClosingQuestion: "Questions about these terms of service?",
  emailLabel: "Email",
};

const fr: LegalUiStrings = {
  privacyTitle: "Politique de confidentialité",
  termsTitle: "Conditions générales",
  backTo: "← Retour à {store}",
  privacyClosingQuestion: "Des questions sur cette politique de confidentialité ?",
  termsClosingQuestion: "Des questions sur ces conditions générales ?",
  emailLabel: "E-mail",
};

const es: LegalUiStrings = {
  privacyTitle: "Política de privacidad",
  termsTitle: "Términos del servicio",
  backTo: "← Volver a {store}",
  privacyClosingQuestion: "¿Tiene preguntas sobre esta política de privacidad?",
  termsClosingQuestion: "¿Tiene preguntas sobre estos términos del servicio?",
  emailLabel: "Correo",
};

const ar: LegalUiStrings = {
  privacyTitle: "سياسة الخصوصية",
  termsTitle: "شروط الخدمة",
  backTo: "← العودة إلى {store}",
  privacyClosingQuestion: "هل لديك أسئلة حول سياسة الخصوصية هذه؟",
  termsClosingQuestion: "هل لديك أسئلة حول شروط الخدمة هذه؟",
  emailLabel: "البريد الإلكتروني",
};

const UI_STRINGS: Record<LegalLocale, LegalUiStrings> = { en, fr, es, ar };

/**
 * UI strings for a resolved locale. The locale has already been review-gated by
 * resolveLegalLocale(), so an unreviewed locale arrives here as "en" and the
 * chrome stays consistent with the document body.
 */
export function legalUiStrings(locale: LegalLocale): LegalUiStrings {
  return UI_STRINGS[locale] ?? en;
}

export { en as LEGAL_UI_STRINGS_EN };
