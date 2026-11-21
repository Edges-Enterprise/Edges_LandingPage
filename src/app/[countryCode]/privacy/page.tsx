// src/app/[countryCode]/privacy/page.tsx
//
// Public privacy policy for a country storefront.
//
// One level above the tenant pages: this speaks for the platform operating the
// storefront in that country, not for an individual reseller. The tenant pages
// ([countryCode]/[storeName]/privacy) remain the URLs a reseller submits to
// Play for their own app; this one covers the country landing pages, whose
// footer previously linked to the legacy global /privacy naming another
// jurisdiction.
import type { Metadata } from "next";
import { renderPrivacyPolicy } from "../../../../supabase/functions/_shared/legal/storeLegalText";
import { legalUiStrings } from "../../../../supabase/functions/_shared/legal/legalUiStrings";
import { resolveLegalLocale } from "../../../../supabase/functions/_shared/legal/legalLocales";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import CountryLegalHeader from "@/components/legal/CountryLegalHeader";
import CountryFooter from "@/components/reseller/country/CountryFooter";
import { buildCountryLegalMetadata } from "@/lib/legal/buildCountryLegalMetadata";
import { resolveCountryLegalIdentity } from "@/lib/legal/countryLegal";

interface PrivacyPageProps {
  params: Promise<{ countryCode: string }>;
}

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { countryCode } = await params;
  return buildCountryLegalMetadata(countryCode, "privacy");
}

export default async function CountryPrivacyPage({ params }: PrivacyPageProps) {
  const { countryCode } = await params;

  const identity = resolveCountryLegalIdentity(countryCode);
  const locale = resolveLegalLocale(identity.locale);
  const ui = legalUiStrings(locale);

  const rendered = renderPrivacyPolicy({
    store_name: identity.brand,
    email: identity.email,
    country: identity.country,
    locale: identity.locale,
  });

  return (
    <LegalDocumentView
      title={ui.privacyTitle}
      text={rendered.text}
      direction={rendered.direction}
      locale={rendered.locale}
      backHref={`/${identity.config.code}`}
      backLabel={ui.backTo.replace("{store}", identity.brand)}
      closing={ui.privacyClosingQuestion}
      emailLabel={ui.emailLabel}
      email={identity.email}
      header={<CountryLegalHeader config={identity.config} />}
      footer={<CountryFooter config={identity.config} />}
    />
  );
}
