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
            borderRadius: 5
          }}
        />
         {storeData.application.store_name} © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
