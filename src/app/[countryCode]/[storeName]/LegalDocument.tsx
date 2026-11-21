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
 * It is plain text with blank-line paragraphs and "N. Title" headings, so it is
 * split here rather than parsed as markdown.
 *
 * Direction is set on the article rather than the page, because the surrounding
 * layout (the storefront header/footer) has its own direction from the country
 * config and must not be flipped by a legal document.
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

  const blocks = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <main
      dir={dir}
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "2.5rem 1.5rem 4rem",
      }}
    >
      <a
        href={`/${store.country_code || country.code}/${storeName}`}
        style={{
          display: "inline-block",
          marginBottom: "1.75rem",
          fontSize: "0.85rem",
          color: "var(--muted)",
          textDecoration: "none",
        }}
      >
        {backLabel}
      </a>

      <h1
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "1.75rem",
        }}
      >
        {title}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {blocks.map((line, index) => {
          const isHeading = /^\d+\.\s/.test(line);
          return (
            <p
              key={index}
              style={{
                margin: isHeading ? "1.5rem 0 0.25rem" : 0,
                fontSize: isHeading ? "1.02rem" : "0.9rem",
                fontWeight: isHeading ? 700 : 400,
                lineHeight: 1.65,
                color: isHeading ? "var(--text)" : "var(--text2)",
              }}
            >
              {line}
            </p>
          );
        })}
      </div>

      <p
        style={{
          marginTop: "2.5rem",
          fontSize: "0.8rem",
          color: "var(--dim)",
        }}
      >
        {closing} {ui.emailLabel}{" "}
        <a
          href={`mailto:${store.email}`}
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          {store.email}
        </a>
        .
      </p>
    </main>
  );
}
