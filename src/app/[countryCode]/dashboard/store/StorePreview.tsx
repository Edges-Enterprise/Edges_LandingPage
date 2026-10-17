// src/app/[countryCode]/dashboard/store/StorePreview.tsx
"use client";

import { Store, ShoppingBag, Users, Phone, Mail, MapPin } from "lucide-react";
import { CountryConfig } from "@/config/countries";
import { StoreSettings } from "@/types/reseller/store";

interface StorePreviewProps {
  application: {
    id: string;
    store_name: string;
    store_slug: string;
    brand_color: string;
    logo_url?: string;
    country_code: string;
  };
  settings: StoreSettings;
  config: CountryConfig;
  translations: any;
}

export default function StorePreview({
  application,
  settings,
  config,
  translations,
}: StorePreviewProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";

  // Mock products for preview
  const mockProducts = [
    { id: 1, name: "MTN 1GB", price: 500, network: "MTN", category: "Data" },
    { id: 2, name: "Airtel 2GB", price: 850, network: "Airtel", category: "Data" },
    { id: 3, name: "Glo 500MB", price: 300, network: "Glo", category: "Data" },
    { id: 4, name: "Airtime Top-up", price: 100, network: "All Networks", category: "Airtime" },
  ];

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
        }}
      >
        {t?.preview || "Store Preview"}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {t?.previewDescription || "This is how your store will look to customers"}
      </p>

      {/* Store Preview Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        {/* Store Header */}
        <div
          style={{
            padding: "1.5rem 1.5rem 1rem",
            background: `linear-gradient(135deg, ${application.brand_color}15, ${application.brand_color}05)`,
            borderBottom: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: application.logo_url 
                  ? `url(${application.logo_url}) center/cover` 
                  : application.brand_color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {!application.logo_url && (
                <Store size={24} style={{ color: "#FDF8F3" }} />
              )}
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {application.store_name || "My Store"}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>
                {settings.welcome_message || "Welcome to our store!"}
              </p>
            </div>
          </div>

          {/* Store Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.5rem",
              marginTop: "0.75rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--dim)", margin: 0, textTransform: "uppercase" }}>
                {t?.products || "Products"}
              </p>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                24
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--dim)", margin: 0, textTransform: "uppercase" }}>
                {t?.customers || "Customers"}
              </p>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                128
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--dim)", margin: 0, textTransform: "uppercase" }}>
                {t?.rating || "Rating"}
              </p>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                ★ 4.8
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div style={{ padding: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {mockProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "1rem",
                  textAlign: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(var(--brand-color-rgb), 0.3)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${application.brand_color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.5rem",
                  }}
                >
                  <ShoppingBag size={16} style={{ color: application.brand_color }} />
                </div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: 0,
                  }}
                >
                  {product.name}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--dim)", margin: "0.25rem 0" }}>
                  {product.network}
                </p>
                <p
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--brand-color)",
                    margin: 0,
                  }}
                >
                  {currencySymbol}{product.price.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Store Footer */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            background: "var(--bg2)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", color: "var(--muted)" }}>
            {settings.contact_email && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Mail size={12} />
                {settings.contact_email}
              </span>
            )}
            {settings.contact_phone && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Phone size={12} />
                {settings.contact_phone}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                color: settings.store_status === "active" ? "#6EBD8A" : "#F59E0B",
                background: settings.store_status === "active" 
                  ? "rgba(110,189,138,0.12)" 
                  : "rgba(245,158,11,0.12)",
                padding: "2px 10px",
                borderRadius: 100,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {settings.store_status === "active" 
                ? t?.active || "Active" 
                : settings.store_status === "maintenance" 
                  ? t?.maintenance || "Maintenance" 
                  : t?.inactive || "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* View Store Button */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <a
          href={`/${application.country_code}/${application.store_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.5rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {t?.viewStore || "View Live Store"} →
        </a>
      </div>
    </div>
  );
}