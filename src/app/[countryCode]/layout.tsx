// src/app/[countryCode]/layout.tsx
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import "@/app/reseller.css";

export default async function CountryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { countryCode: string };
}) {
  const { countryCode } = await params;
  const config = getCountryConfig(countryCode);

  return (
    <CountryProvider config={config}>
      <html lang={config.language.code} dir={config.language.direction}>
        <body>{children}</body>
      </html>
    </CountryProvider>
  );
}
