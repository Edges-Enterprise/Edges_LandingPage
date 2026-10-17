// src/app/[countryCode]/page.tsx
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import CountryNavbar from "@/components/reseller/country/CountryNavbar";
import CountryHero from "@/components/reseller/country/CountryHero";
import CountryBenefits from "@/components/reseller/country/CountryBenefits";
import CountryPricing from "@/components/reseller/country/CountryPricing";
import CountryFAQ from "@/components/reseller/country/CountryFAQ";
import CountryCTA from "@/components/reseller/country/CountryCTA";
import CountryFooter from "@/components/reseller/country/CountryFooter";
import "@/app/reseller.css";

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/landing.json`);
    return translations.default;
  } catch {
    const translations = await import("@/messages/en/landing.json");
    return translations.default;
  }
}

export default async function CountryPage({
  params,
}: {
  params: { countryCode: string };
}) {
  const { countryCode } = await params;
  const config = getCountryConfig(countryCode);
  const language = config.language.code;
  const translations = await getTranslations(language);

  return (
    <CountryProvider config={config}>
      <main style={{ position: "relative", zIndex: 1 }}>
        <CountryNavbar config={config} translations={translations} />
        <CountryHero config={config} translations={translations} />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <CountryBenefits config={config} translations={translations} />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <CountryPricing config={config} translations={translations} />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <CountryFAQ config={config} translations={translations} />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <CountryCTA config={config} translations={translations} />
        <CountryFooter config={config} />
      </main>
    </CountryProvider>
  );
}
