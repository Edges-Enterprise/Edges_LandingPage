// src/app/[countryCode]/success/page.tsx
import { headers } from "next/headers";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import SuccessClient from "./SuccessClient";
import "@/app/reseller.css";

interface SuccessPageProps {
  params: {
    countryCode: string;
  };
  searchParams: {
    applicationId?: string;
  };
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/success.json`);
    return translations.default;
  } catch {
    const translations = await import("@/messages/en/success.json");
    return translations.default;
  }
}

export default async function SuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { countryCode } = await params;
  const { applicationId } = await searchParams;
  const config = getCountryConfig(countryCode);
  const language = config.language.code;
  const translations = await getTranslations(language);

  return (
    <CountryProvider config={config}>
      <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <SuccessClient
          countryCode={countryCode}
          config={config}
          applicationId={applicationId}
          translations={translations}
        />
      </main>
    </CountryProvider>
  );
}
