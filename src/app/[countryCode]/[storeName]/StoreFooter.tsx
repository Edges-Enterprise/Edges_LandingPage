// src/app/[countryCode]/[storeName]/StoreFooter.tsx
"use client";

import { Store, Phone, Mail, MapPin } from "lucide-react";

interface StoreFooterProps {
  storeData: any;
  translations: any;
  config: any;
}

export default function StoreFooter({
  storeData,
  translations,
  config,
}: StoreFooterProps) {
  const t = translations;

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "2rem 5%",
        maxWidth: 1200,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "2rem",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Store size={18} style={{ color: "var(--brand-color)" }} />
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {storeData.application.store_name}
          </span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
          {t?.subtitle || "Your trusted source for data, airtime, and more."}
        </p>
      </div>

      <div>
        <h4
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t?.contact || "Contact"}
        </h4>
        {storeData.settings.contact_phone && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.25rem 0" }}>
            <Phone size={14} style={{ marginRight: "0.5rem" }} />
            {storeData.settings.contact_phone}
          </p>
        )}
        {storeData.settings.contact_email && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.25rem 0" }}>
            <Mail size={14} style={{ marginRight: "0.5rem" }} />
            {storeData.settings.contact_email}
          </p>
        )}
      </div>

      <div>
        <h4
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t?.products || "Products"}
        </h4>
        {storeData.categories?.map((category: string) => (
          <p key={category} style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.25rem 0" }}>
            {category}
          </p>
        ))}
      </div>

      <div>
        <h4
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t?.store || "Store"}
        </h4>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.25rem 0" }}>
          {t?.status || "Status"}:{" "}
          <span
            style={{
              color: storeData.settings.store_status === "active" ? "#6EBD8A" : "#F59E0B",
              fontWeight: 600,
            }}
          >
            {storeData.settings.store_status === "active" 
              ? t?.active || "Active" 
              : t?.inactive || "Inactive"}
          </span>
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.25rem 0" }}>
          © {new Date().getFullYear()} {storeData.application.store_name}
        </p>
      </div>
    </footer>
  );
}