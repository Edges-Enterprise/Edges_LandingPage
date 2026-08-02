// src/app/[countryCode]/[storeName]/StoreHero.tsx
"use client";

import { Store, Users, ShoppingBag, Star } from "lucide-react";

interface StoreHeroProps {
  storeData: any;
  translations: any;
  config: any;
}

export default function StoreHero({
  storeData,
  translations,
  config,
}: StoreHeroProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";

  // Mock stats (will be replaced with real data later)
  const stats = {
    products: storeData.products?.length || 0,
    customers: 0,
    rating: "4.8",
  };

  return (
    <section
      style={{
        padding: "2rem 0 3rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "1rem",
            color: "var(--text)",
          }}
        >
          {storeData.settings.welcome_message || `Welcome to ${storeData.application.store_name}`}
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "1.05rem",
            lineHeight: 1.7,
            marginBottom: "2rem",
          }}
        >
          {t?.subtitle || "Browse our products and get the best deals on data, airtime, and more."}
        </p>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "1rem",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1.5rem",
          }}
        >
          <div>
            <ShoppingBag size={20} style={{ color: "var(--brand-color)", margin: "0 auto 0.25rem" }} />
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {stats.products}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {t?.products || "Products"}
            </div>
          </div>
          <div>
            <Users size={20} style={{ color: "var(--brand-color)", margin: "0 auto 0.25rem" }} />
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {stats.customers}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {t?.customers || "Customers"}
            </div>
          </div>
          <div>
            <Star size={20} style={{ color: "var(--brand-color)", margin: "0 auto 0.25rem" }} />
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {stats.rating}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {t?.rating || "Rating"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}