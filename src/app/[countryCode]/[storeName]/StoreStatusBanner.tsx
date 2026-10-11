// src/app/[countryCode]/[storeName]/StoreStatusBanner.tsx
"use client";

import type { StoreReadiness } from "@/lib/storefront/getStoreReadiness";

interface StoreStatusBannerProps {
  storeStatus?: StoreReadiness | null;
  countryCode?: string;
  translations?: any;
}

// Port of the legacy store-not-ready banner (old-storeName/StoreContent.tsx
// ~2706-2762): shown while the store can't sell, explaining why and
// linking the owner to Dashboard Settings.
export default function StoreStatusBanner({
  storeStatus,
  countryCode,
  translations,
}: StoreStatusBannerProps) {
  const t = translations;
  if (!storeStatus || storeStatus.canSell) return null;

  const detail = !storeStatus.hasWhatsApp ? (
    <>
      {t?.storeNeedsWhatsApp ||
        "The store owner needs to add their WhatsApp number in"}{" "}
      <a
        href={`/${countryCode || "ng"}/dashboard/settings`}
        style={{ color: "#A16207", fontWeight: 600, textDecoration: "underline" }}
      >
        {t?.dashboardSettings || "Dashboard Settings"}
      </a>{" "}
      {t?.storeNeedsWhatsAppSuffix || "to start accepting orders."}
    </>
  ) : !storeStatus.hasVirtualAccount ? (
    t?.storeSettingUpPayments ||
    "The store owner is still setting up their payment system."
  ) : (
    t?.storeNeedsFunding ||
    "The store owner needs to fund their wallet to start accepting orders."
  );

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
        borderBottom: "2px solid #F59E0B",
        padding: "0.85rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>⚠️</span>
        <span style={{ fontWeight: 600, color: "#92400E", fontSize: "0.9rem" }}>
          {storeStatus.reason}
        </span>
      </div>
      <p style={{ fontSize: "0.78rem", color: "#A16207", margin: "4px 0 0" }}>
        {detail}
      </p>
    </div>
  );
}
