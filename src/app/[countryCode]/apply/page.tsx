// src/app/[countryCode]/apply/page.tsx
import { headers } from "next/headers";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import ApplicationClient from "./ApplicationClient";
import "@/app/reseller.css";

interface ApplyPageProps {
  params: {
    countryCode: string;
  };
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/apply.json`);
    return translations.default;
  } catch {
    // Fallback to English
    const translations = await import("@/messages/en/apply.json");
    return translations.default;
  }
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { countryCode } = await params;
  const config = getCountryConfig(countryCode);
  const language = config.language.code;
  const translations = await getTranslations(language);

  return (
    <CountryProvider config={config}>
      <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <ApplicationClient
          countryCode={countryCode}
          config={config}
          translations={translations}
        />
      </main>
    </CountryProvider>
  );
}
