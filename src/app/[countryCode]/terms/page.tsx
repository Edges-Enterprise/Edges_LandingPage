// src/app/[countryCode]/terms/page.tsx
//
// Public terms of service for a country storefront. Counterpart to the privacy
// page; see that file for why this exists alongside the tenant pages.
import type { Metadata } from "next";
import { renderTermsAndConditions } from "../../../../supabase/functions/_shared/legal/storeLegalText";
import { legalUiStrings } from "../../../../supabase/functions/_shared/legal/legalUiStrings";
import { resolveLegalLocale } from "../../../../supabase/functions/_shared/legal/legalLocales";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import CountryLegalHeader from "@/components/legal/CountryLegalHeader";
import CountryFooter from "@/components/reseller/country/CountryFooter";
import { buildCountryLegalMetadata } from "@/lib/legal/buildCountryLegalMetadata";
import { resolveCountryLegalIdentity } from "@/lib/legal/countryLegal";

interface TermsPageProps {
  params: Promise<{ countryCode: string }>;
}

export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { countryCode } = await params;
  return buildCountryLegalMetadata(countryCode, "terms");
}

export default async function CountryTermsPage({ params }: TermsPageProps) {
  const { countryCode } = await params;

  const identity = resolveCountryLegalIdentity(countryCode);
  const locale = resolveLegalLocale(identity.locale);
  const ui = legalUiStrings(locale);

  const rendered = renderTermsAndConditions({
    store_name: identity.brand,
    email: identity.email,
    country: identity.country,
    locale: identity.locale,
  });

  return (
    <LegalDocumentView
      title={ui.termsTitle}
      text={rendered.text}
      direction={rendered.direction}
      locale={rendered.locale}
      backHref={`/${identity.config.code}`}
      backLabel={ui.backTo.replace("{store}", identity.brand)}
      closing={ui.termsClosingQuestion}
      emailLabel={ui.emailLabel}
      email={identity.email}
      header={<CountryLegalHeader config={identity.config} />}
      footer={<CountryFooter config={identity.config} />}
    />
  );
}
