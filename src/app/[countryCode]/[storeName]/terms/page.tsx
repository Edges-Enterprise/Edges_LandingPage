// src/app/[countryCode]/[storeName]/terms/page.tsx
//
// Public terms of service for a tenant store, generated from the same shared
// module as the privacy page and the mobile app.
import type { Metadata } from "next";
import { getCountryConfig } from "@/config/countries";
import { renderTermsAndConditions } from "../../../../../supabase/functions/_shared/legal/storeLegalText";
import LegalDocument, {
  buildLegalMetadata,
  getLegalStore,
} from "../LegalDocument";

interface TermsPageProps {
  params: Promise<{ countryCode: string; storeName: string }>;
}

export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { storeName } = await params;
  return buildLegalMetadata(storeName, "terms");
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { storeName } = await params;

  const store = await getLegalStore(storeName);
  const country = getCountryConfig(store?.country_code || "");

  const rendered = renderTermsAndConditions({
    store_name: store?.store_name || storeName,
    email: store?.email || "",
    country: country.name,
    locale: country.language.code,
  });

  return (
    <LegalDocument
      storeName={storeName}
      doc="terms"
      text={rendered.text}
      direction={rendered.direction}
      locale={rendered.locale}
    />
  );
}
