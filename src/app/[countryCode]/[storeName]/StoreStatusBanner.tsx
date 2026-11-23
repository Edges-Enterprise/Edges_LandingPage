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
        className="store-caution-link"
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
      className="store-caution"
      style={{ padding: "0.85rem 1.5rem", textAlign: "center" }}
    >
      <style>{`
        /* The banner keeps its "caution" read (a warm accent) but takes its
           palette from the store's own theme — brand colour, surfaces and text
           — and blurs what scrolls under it, so it blends with the storefront
           instead of sitting on a fixed amber block. The storefront theme
           paints every div with an opaque --bg (store-theme.css), so the
           banner's own descendants are forced transparent first and the warm
           tint is re-applied to the bar itself. */
        body.storefront-theme .store-caution,
        body.storefront-theme .store-caution div,
        body.storefront-theme .store-caution p {
          background-color: transparent !important;
        }
        body.storefront-theme .store-caution {
          /* Plain rgba() rather than color-mix(): iOS below 16.2 has no
             color-mix() and would drop the whole background declaration. */
          background: linear-gradient(
            135deg,
            rgba(var(--yellow-rgb, 245, 158, 11), 0.13),
            rgba(var(--brand-color-rgb, 201, 138, 84), 0.07)
          ) !important;
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          backdrop-filter: blur(16px) saturate(1.4);
          border-bottom: 1px solid rgba(var(--yellow-rgb, 245, 158, 11), 0.32);
        }
        .store-caution-link {
          color: var(--brand-color);
          font-weight: 600;
          text-decoration: underline;
        }
      `}</style>
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
        <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
          {storeStatus.reason}
        </span>
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "4px 0 0" }}>
        {detail}
      </p>
    </div>
  );
}
