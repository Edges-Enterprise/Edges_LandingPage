// src/app/page.tsx
import { headers } from "next/headers";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import CountryNavbar from "@/components/reseller/country/CountryNavbar";
import CountryHero from "@/components/reseller/country/CountryHero";
import CountryHowItWorks from "@/components/reseller/country/CountryHowItWorks";
import CountryBenefits from "@/components/reseller/country/CountryBenefits";
import CountryPricing from "@/components/reseller/country/CountryPricing";
import CountryFAQ from "@/components/reseller/country/CountryFAQ";
import CountryCTA from "@/components/reseller/country/CountryCTA";
import CountryFooter from "@/components/reseller/country/CountryFooter";
import "./reseller.css";

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/landing.json`);
    return translations.default;
  } catch {
    const translations = await import("@/messages/en/landing.json");
    return translations.default;
  }
}

export default async function HomePage() {
  const headersList = await headers();
  const countryCode = headersList.get("x-country") || "ng";
  const config = getCountryConfig(countryCode);
  const language = config.language.code;
  const translations = await getTranslations(language);

  return (
    <CountryProvider config={config}>
      <main style={{ position: "relative", zIndex: 1 }}>
        <CountryNavbar config={config} translations={translations} />
        <CountryHero config={config} translations={translations} />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <CountryHowItWorks config={config} translations={translations} />
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

// // src/app/page.tsx
// import { headers } from "next/headers";
// import { getCountryConfig } from "@/config/countries";
// import { CountryProvider } from "@/providers/CountryProvider";
// import CountryNavbar from "@/components/reseller/country/CountryNavbar";
// import CountryHero from "@/components/reseller/country/CountryHero";
// import CountryBenefits from "@/components/reseller/country/CountryBenefits";
// import CountryPricing from "@/components/reseller/country/CountryPricing";
// import CountryFAQ from "@/components/reseller/country/CountryFAQ";
// import CountryCTA from "@/components/reseller/country/CountryCTA";
// import CountryFooter from "@/components/reseller/country/CountryFooter";
// import "./reseller.css";

// async function getTranslations(language: string) {
//   try {
//     const translations = await import(`@/messages/${language}/landing.json`);
//     return translations.default;
//   } catch {
//     const translations = await import("@/messages/en/landing.json");
//     return translations.default;
//   }
// }

// export default async function HomePage() {
//   // ✅ Get country from headers (set by proxy.ts)
//   const headersList = await headers();
//   const countryCode = headersList.get("x-country") || "ng";
//   const config = getCountryConfig(countryCode);
//   const language = config.language.code;
//   const translations = await getTranslations(language);

//   return (
//     <CountryProvider config={config}>
//       <main style={{ position: "relative", zIndex: 1 }}>
//         <CountryNavbar config={config} translations={translations} />
//         <CountryHero config={config} translations={translations} />
//         <div style={{ borderTop: "1px solid var(--border)" }} />
//         <CountryBenefits config={config} translations={translations} />
//         <div style={{ borderTop: "1px solid var(--border)" }} />
//         <CountryPricing config={config} translations={translations} />
//         <div style={{ borderTop: "1px solid var(--border)" }} />
//         <CountryFAQ config={config} translations={translations} />
//         <div style={{ borderTop: "1px solid var(--border)" }} />
//         <CountryCTA config={config} translations={translations} />
//         <CountryFooter config={config} />
//       </main>
//     </CountryProvider>
//   );
// }

// // // src/app/page.tsx
// // import Navbar from "@/components/reseller/ResellerNavbar";
// // import Hero from "@/components/reseller/ResellerHero";
// // import HowItWorks from "@/components/reseller/ResellerHowItWorks";
// // import CommissionTiers from "@/components/reseller/ResellerCommissionTiers";
// // import Benefits from "@/components/reseller/ResellerBenefits";
// // import FAQ from "@/components/reseller/ResellerFAQ";
// // import CTA from "@/components/reseller/ResellerCTA";
// // import Footer from "@/components/reseller/ResellerFooter";
// // import "./reseller.css";

// // export default function Home() {
// //   return (
// //     <main style={{ position: "relative", zIndex: 1 }}>
// //       <Navbar />
// //       <Hero />
// //       <div style={{ borderTop: "1px solid var(--border)" }} />
// //       <HowItWorks />
// //       <div style={{ borderTop: "1px solid var(--border)" }} />
// //       <CommissionTiers />
// //       <div style={{ borderTop: "1px solid var(--border)" }} />
// //       <Benefits />
// //       <div style={{ borderTop: "1px solid var(--border)" }} />
// //       <FAQ />
// //       <div style={{ borderTop: "1px solid var(--border)" }} />
// //       <CTA />
// //       <Footer />
// //     </main>
// //   );
// // }
