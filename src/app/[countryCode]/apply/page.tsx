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

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { countryCode } = await params;
  const config = getCountryConfig(countryCode);

  return (
    <CountryProvider config={config}>
      <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <ApplicationClient countryCode={countryCode} config={config} />
      </main>
    </CountryProvider>
  );
}
