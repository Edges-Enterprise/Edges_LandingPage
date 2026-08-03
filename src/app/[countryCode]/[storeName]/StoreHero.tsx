// src/app/[countryCode]/[storeName]/StoreHero.tsx
"use client";

import { ShoppingCart } from "lucide-react";
import { StoreProduct } from "@/types/reseller/storefront";

interface StoreHeroProps {
  storeData: any;
  translations: any;
  config: any;
  onAddToCart?: (product: StoreProduct) => void;
}

export default function StoreHero({
  storeData,
  translations,
  config,
  onAddToCart,
}: StoreHeroProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";
  const canSell = storeData.settings.store_status !== "inactive";

  const featured: StoreProduct[] = (storeData.products || []).slice(0, 3);

  return (
    <>
      
      <section
        style={{
          margin: "-2rem -5% 2rem",
          padding: "1.5rem 5%",
          background:
            "var(--bg)",
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
            {t?.subtitle ||
              "Get the best deals on data, airtime, and more."}
          </p>
        </div>
      </section>

      {/* Popular products — first card highlighted as a "Best Deal" */}
      {featured.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.9rem",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {t?.popularPlans || "Popular Plans"}
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {featured.map((product, i) => (
              <div
                key={product.id}
                style={{
                  background:
                    i === 0
                      ? "linear-gradient(135deg, var(--brand-color), color-mix(in srgb, var(--brand-color) 70%, black))"
                      : "var(--card)",
                  border: i === 0 ? "none" : "1.5px solid var(--border)",
                  borderRadius: 16,
                  padding: "1.4rem",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow:
                    i === 0
                      ? "0 8px 24px rgba(var(--brand-color-rgb), 0.35)"
                      : "none",
                }}
              >
                {i === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(255,255,255,0.25)",
                      color: "#FDF8F3",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 100,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Best Deal
                  </span>
                )}
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: i === 0 ? "#FDF8F3" : "var(--text)",
                    marginBottom: 2,
                  }}
                >
                  {product.name}
                </p>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: i === 0 ? "rgba(253,248,243,0.8)" : "var(--muted)",
                    marginBottom: 10,
                  }}
                >
                  {product.network ? product.network : product.category}
                </p>
                <p
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: i === 0 ? "#FDF8F3" : "var(--brand-color)",
                    marginBottom: 14,
                    lineHeight: 1,
                  }}
                >
                  {currencySymbol}
                  {product.price.toLocaleString()}
                </p>
                <button
                  onClick={() => onAddToCart?.(product)}
                  disabled={!canSell}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    background:
                      i === 0 ? "rgba(255,255,255,0.25)" : "var(--brand-color)",
                    border:
                      i === 0 ? "1.5px solid rgba(255,255,255,0.4)" : "none",
                    borderRadius: 10,
                    color: "#FDF8F3",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: canSell ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: canSell ? 1 : 0.5,
                  }}
                >
                  <ShoppingCart size={14} />
                  {canSell ? "Buy Now" : "Unavailable"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
