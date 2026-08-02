// src/app/[countryCode]/[storeName]/layout.tsx
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "@/app/reseller.css";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ countryCode: string; storeName: string }>;
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { countryCode } = await params;
  const config = getCountryConfig(countryCode);

  return (
    <ThemeProvider brandColor={config.brandColor || "#C98A54"}>
      <CountryProvider config={config}>
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          {children}
        </div>
      </CountryProvider>
    </ThemeProvider>
  );
}
