// src/app/[countryCode]/[storeName]/StoreHero.tsx
"use client";

import { StoreProduct } from "@/types/reseller/storefront";
import { CountryConfig } from "@/config/countries";

interface StoreHeroProps {
  storeData: any;
  translations: any;
  config: CountryConfig;
  onAddToCart?: (product: StoreProduct) => void;
}

export default function StoreHero({
  storeData,
  translations,
}: StoreHeroProps) {
  const t = translations;

  return (
    <section
      style={{
        margin: "-2rem -5% 2rem",
        padding: "1.5rem 5%",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.3rem",
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {storeData.settings.welcome_message ||
            `Welcome to ${storeData.application.store_name}`}
        </h1>
        <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: 0 }}>
          {t?.subtitle || "Get the best deals on data, airtime, and more."}
        </p>
      </div>
    </section>
  );
}
