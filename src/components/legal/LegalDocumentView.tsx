// src/components/legal/LegalDocumentView.tsx
//
// The presentation half of a legal page: heading, numbered sections, closing
// contact line. Shared by the tenant pages ([countryCode]/[storeName]/privacy)
// and the country pages ([countryCode]/privacy) so the two cannot drift in
// layout.
//
// Purely presentational - it takes the rendered text and the surrounding
// labels as props and does no data access. The callers differ only in whose
// identity they resolve and where the back link points.
import type { ReactNode } from "react";
import type {
  LegalLocale,
  TextDirection,
} from "../../../supabase/functions/_shared/legal/legalLocales";

export interface LegalDocumentViewProps {
  /** Page heading, already localized ("Privacy Policy"). */
  title: string;
  /** Document body from _shared/legal/storeLegalText.ts. */
  text: string;
  direction: TextDirection;
  locale: LegalLocale;
  /** Where the back link goes. */
  backHref: string;
  /** Back link label, already localized and interpolated. */
  backLabel: string;
  /** Question above the contact address. */
  closing: string;
  /** Label before the mailto link ("Email"). */
  emailLabel: string;
  /** Contact address; rendered as a mailto link when non-empty. */
  email: string;
  /**
   * Rendered above the document, inside the page container. Used by the
   * country pages to keep the storefront navigation available to a visitor who
   * lands on a legal page straight from the Play listing.
   */
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * Splits the generated plain text into paragraphs.
 *
 * The shared module emits blank-line paragraphs with "N. Title" headings and no
 * markup, so it is split here rather than parsed as markdown.
 */
function toBlocks(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function LegalDocumentView({
  title,
  text,
  direction,
  locale,
  backHref,
  backLabel,
  closing,
  emailLabel,
  email,
  header,
  footer,
}: LegalDocumentViewProps) {
  const blocks = toBlocks(text);

  return (
    <>
      {header}
      <main
        dir={direction}
        lang={locale}
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "2.5rem 1.5rem 4rem",
        }}
      >
        <a
          href={backHref}
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
                  // --text2 is only defined by the dashboard and store themes;
                  // country pages import reseller.css alone, so fall back.
                  color: isHeading ? "var(--text)" : "var(--text2, var(--muted))",
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
          {closing}{" "}
          {email ? (
            <>
              {emailLabel}{" "}
              <a
                href={`mailto:${email}`}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                {email}
              </a>
              .
            </>
          ) : null}
        </p>
      </main>
      {footer}
    </>
  );
}
