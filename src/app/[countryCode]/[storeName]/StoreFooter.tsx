// src/app/[countryCode]/[storeName]/StoreFooter.tsx
"use client";

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
  const storeName = storeData.application.store_slug;
  const countryCode = storeData.application.country_code || config?.code;
  const base = `/${countryCode}/${storeName}`;

  const linkStyle: React.CSSProperties = {
    color: "var(--muted)",
    textDecoration: "none",
    fontSize: "0.78rem",
  };

  return (
    <footer
      style={{
        marginTop: "3rem",
        borderTop: "1px solid var(--border)",
        padding: "1.75rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: "0.8rem",
          color: "var(--muted)",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: "var(--brand-color)",
          }}
        />
        {storeData.application.store_name} © {new Date().getFullYear()}
      </div>

      {/* Tenant-scoped legal pages. These are the URLs submitted to Google Play
          for the Data safety form, so they must be the store's own pages - not
          the legacy global /privacy and /terms, which name another company. */}
      <div
        style={{
          marginTop: "0.85rem",
          display: "flex",
          justifyContent: "center",
          gap: "1.25rem",
        }}
      >
        <a href={`${base}/privacy`} style={linkStyle}>
          Privacy Policy
        </a>
        <a href={`${base}/terms`} style={linkStyle}>
          Terms of Service
        </a>
      </div>
    </footer>
  );
}
