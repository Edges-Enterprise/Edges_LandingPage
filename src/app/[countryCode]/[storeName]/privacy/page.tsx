// src/app/[countryCode]/[storeName]/privacy/page.tsx
//
// Public privacy policy for a tenant store. This is the URL submitted to Google
// Play's Data safety form (e.g. https://telcos.opik.net/rw/simi/privacy), so it
// must render for signed-out visitors and state how to request account deletion.
import type { Metadata } from "next";
import { getCountryConfig } from "@/config/countries";
import { renderPrivacyPolicy } from "../../../../../supabase/functions/_shared/legal/storeLegalText";
import LegalDocument, {
  buildLegalMetadata,
  getLegalStore,
} from "../LegalDocument";

interface PrivacyPageProps {
  params: Promise<{ countryCode: string; storeName: string }>;
}

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { storeName } = await params;
  return buildLegalMetadata(storeName, "privacy");
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { storeName } = await params;

  const store = await getLegalStore(storeName);
  const country = getCountryConfig(store?.country_code || "");

  const rendered = renderPrivacyPolicy({
    store_name: store?.store_name || storeName,
    email: store?.email || "",
    country: country.name,
    locale: country.language.code,
  });

  return (
    <LegalDocument
      storeName={storeName}
      doc="privacy"
      text={rendered.text}
      direction={rendered.direction}
      locale={rendered.locale}
    />
  );
}
