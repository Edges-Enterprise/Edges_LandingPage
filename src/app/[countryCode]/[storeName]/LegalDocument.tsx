// src/app/[countryCode]/[storeName]/LegalDocument.tsx
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { notFound } from "next/navigation";
import {
  legalDirection,
  resolveLegalLocale,
  type LegalLocale,
  type TextDirection,
} from "../../../../supabase/functions/_shared/legal/legalLocales";
import { legalUiStrings } from "../../../../supabase/functions/_shared/legal/legalUiStrings";
import LegalDocumentView from "@/components/legal/LegalDocumentView";

interface LegalStoreRecord {
  store_name: string;
  email: string | null;
  country_code: string | null;
}

/**
 * Resolves the store a legal page belongs to.
 *
 * The admin (service-role) client is required for the same reason the
 * storefront page uses it: these pages are opened by signed-out visitors and
 * by Google Play reviewers, so there is no session whose RLS would expose the
 * row. Only the fields the policy needs are selected - the store's public
 * name, its contact email and its country.
 */
export async function getLegalStore(
  storeSlug: string,
): Promise<LegalStoreRecord | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("global_reseller_applications")
    .select("store_name, email, country_code")
    .eq("store_slug", storeSlug)
    .eq("application_status", "active")
    .single();

  if (error || !data) return null;
  return data;
}

export async function buildLegalMetadata(
  storeName: string,
  doc: "privacy" | "terms",
): Promise<Metadata> {
  const store = await getLegalStore(storeName);

  // Metadata is localized the same way the document is: the country's language
  // is review-gated by resolveLegalLocale(), so an unreviewed locale yields
  // English here too. Without this the <title> stayed English on a French page.
  const country = getCountryConfig(store?.country_code || "");
  const locale = resolveLegalLocale(country.language.code);
  const ui = legalUiStrings(locale);
  const title = doc === "privacy" ? ui.privacyTitle : ui.termsTitle;

  if (!store) return { title: `${title} - Not found` };

  return {
    title: `${title} - ${store.store_name}`,
    description: `${title} — ${store.store_name}.`,
    ...(locale !== "en" && { other: { language: locale } }),
  };
}

interface LegalDocumentProps {
  storeName: string;
  /** Which document this is; drives the heading and closing question. */
  doc: "privacy" | "terms";
  text: string;
  /** Text direction of the rendered document. Defaults to ltr. */
  direction?: TextDirection;
  /** Locale the document was rendered in; drives the surrounding chrome. */
  locale?: LegalLocale;
}

/**
 * Renders a generated legal document.
 *
 * The text comes from _shared/legal/storeLegalText.ts, the same module the
 * mobile app renders, so a change to the policy reaches both surfaces at once.
 *
 * Direction is set on the article rather than the page, because the surrounding
 * layout (the storefront header/footer) has its own direction from the country
 * config and must not be flipped by a legal document.
 *
 * Presentation lives in @/components/legal/LegalDocumentView so the country
 * pages ([countryCode]/privacy|terms) render identically; this wrapper only
 * resolves the tenant and its labels.
 */
export default async function LegalDocument({
  storeName,
  doc,
  text,
  direction,
  locale,
}: LegalDocumentProps) {
  const store = await getLegalStore(storeName);
  if (!store) notFound();

  const country = getCountryConfig(store.country_code || "");
  const resolvedLocale = locale ?? resolveLegalLocale(country.language.code);
  const dir = direction ?? legalDirection(resolvedLocale);
  const ui = legalUiStrings(resolvedLocale);

  const title = doc === "privacy" ? ui.privacyTitle : ui.termsTitle;
  const backLabel = ui.backTo.replace("{store}", store.store_name);
  const closing =
    doc === "privacy" ? ui.privacyClosingQuestion : ui.termsClosingQuestion;

  return (
    <LegalDocumentView
      title={title}
      text={text}
      direction={dir}
      locale={resolvedLocale}
      backHref={`/${store.country_code || country.code}/${storeName}`}
      backLabel={backLabel}
      closing={closing}
      emailLabel={ui.emailLabel}
      email={store.email ?? ""}
    />
  );
}
