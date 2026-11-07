// src/app/[countryCode]/[storeName]/StoreProducts.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag, Zap, Globe } from "lucide-react";
import { StoreProduct } from "@/types/reseller/storefront";
import { CountryConfig } from "@/config/countries";
import {
  formatStorePrice,
  type StorePriceConfig,
} from "@/lib/currency/formatStorePrice";

interface StoreProductsProps {
  products: StoreProduct[];
  networks: string[];
  selectedNetwork: string;
  onNetworkChange: (network: string) => void;
  onAddToCart: (product: StoreProduct) => void;
  canSell?: boolean;
  translations: any;
  config: CountryConfig;
  /** Opens the destination (world) flow; the globe icon on the tabs row. */
  onOpenDestination?: () => void;
  /**
   * The store has enabled plans for other countries (reachable via the
   * destination view). When true, the globe is shown even if the store's
   * own country has no networks, and the empty state points to it.
   */
  hasGlobalPlans?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  data: "#3B82F6",
  airtime: "#8B5CF6",
  electricity: "#F59E0B",
  cable: "#10B981",
};

const PRODUCTS_PER_PAGE = 15;

export default function StoreProducts({
  products,
  networks,
  selectedNetwork,
  onNetworkChange,
  onAddToCart,
  canSell = true,
  translations,
  config,
  onOpenDestination,
  hasGlobalPlans = false,
}: StoreProductsProps) {
  const t = translations;

  const activeNetwork = selectedNetwork === "all" ? networks[0] : selectedNetwork;

  // ─── Network-first tab list (legacy IA) ──────────────────────────
  // Legacy hardcodes MTN/AIRTEL/GLO/9MOBILE; here we use the networks
  // actually present in the store (country-driven), in display order.
  const networkTabs = networks;

  // Products for the active network, and the "Popular Plans" pick for
  // it (3 cheapest by price — legacy shows featured on the MTN tab).
  const networkProducts = products
    .filter((p) => (p.network || "") === activeNetwork)
    .sort((a, b) => a.price - b.price);
  const featured = networkProducts.slice(0, 3);
  const networkColor =
    CATEGORY_COLORS[networkProducts[0]?.category || ""] || "var(--brand-color)";

  return (
    <section id="products" style={{ padding: "1rem 0 2rem" }}>
      {/* Network Tabs — legacy primary navigation (MTN/AIRTEL/GLO/…).
          These are ONLY the store's own country's networks. Other
          countries' networks live behind the globe icon, which sits to the
          right: the tabs scroll horizontally underneath it, so a store with
          many networks still reaches all of them and the icon never moves.
          When the store's own country has no networks, the row collapses to
          just the globe (if there are global plans to reach). */}
      {(networkTabs.length > 0 || (onOpenDestination && hasGlobalPlans)) && (
        <div
          style={{
            position: "relative",
            marginBottom: "1.5rem",
            minHeight: 38,
          }}
        >
          <div
            className="store-net-scroll"
            style={{
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
              // Leave room under the globe so the last tab is not hidden.
              paddingRight: onOpenDestination ? "3.25rem" : 0,
              scrollbarWidth: "none",
            }}
          >
            {networkTabs.map((net) => {
              const isActive = net === activeNetwork;
              return (
                <button
                  key={net}
                  onClick={() => onNetworkChange(net)}
                  style={{
                    padding: "0.55rem 1.1rem",
                    borderRadius: 10,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.02em",
                    transition: "all 0.15s",
                    flexShrink: 0,
                    background: isActive ? "var(--brand-color)" : "var(--card)",
                    color: isActive ? "#FDF8F3" : "var(--text2)",
                    border: isActive ? "none" : "1.5px solid var(--border)",
                  }}
                >
                  {net}
                </button>
              );
            })}
          </div>
          {onOpenDestination && (
            <button
              className="store-net-globe"
              onClick={onOpenDestination}
              aria-label={t?.globalPlans || "Global plans"}
              title={t?.globalPlans || "Global plans"}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                zIndex: 2,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "1.5px solid var(--border)",
                background: "var(--card)",
                color: "var(--brand-color)",
                cursor: "pointer",
                // A soft fade so tabs passing under the icon read as
                // "behind" rather than clipped.
                boxShadow:
                  "-8px 0 10px -6px color-mix(in srgb, var(--bg) 90%, transparent)",
              }}
            >
              <Globe size={18} />
            </button>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 2rem",
            color: "var(--muted)",
            background: "var(--card)",
            borderRadius: 16,
            border: "1.5px dashed var(--border)",
          }}
        >
          <ShoppingBag
            size={36}
            style={{ margin: "0 auto 0.75rem", opacity: 0.25 }}
          />
          {hasGlobalPlans ? (
            <>
              <p style={{ fontWeight: 600, color: "var(--text2)" }}>
                {t?.noLocalPlans || "No plans for your country here yet."}
              </p>
              <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
                {t?.browseGlobalPlans ||
                  "Browse plans for other destinations."}
              </p>
              <button
                onClick={onOpenDestination}
                style={{
                  marginTop: "1rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.6rem 1.2rem",
                  borderRadius: 10,
                  background: "var(--brand-color)",
                  border: "none",
                  color: "#FDF8F3",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Globe size={15} />
                {t?.globalPlans || "Global plans"}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600, color: "var(--text2)" }}>
                {t?.noActivePlans || "No active plans on this store yet."}
              </p>
              <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
                {t?.comingSoon || "More products coming soon!"}
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Popular Plans — legacy shows this for the active network */}
          {featured.length > 0 && (
            <section style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: "0.9rem",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "color-mix(in srgb, var(--brand-color) 18%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Zap size={14} style={{ color: "var(--brand-color)" }} />
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {t?.popularPlans || "Popular Plans"}
                </h3>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    fontWeight: 500,
                  }}
                >
                  {activeNetwork}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {featured.map((product, i) => (
                  <FeaturedCard
                    key={product.id}
                    product={product}
                    config={config}
                    highlight={i === 0}
                    onBuyClick={onAddToCart}
                    canSell={canSell}
                    // Store theme colour, not the per-category palette:
                    // the Popular card must match the store's brand.
                    brandColor="var(--brand-color)"
                    fromLabel={t?.from || "from"}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active-network section header (legacy "{Net} Plans") */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `color-mix(in srgb, ${networkColor} 18%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingBag size={14} style={{ color: networkColor }} />
            </div>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {`${activeNetwork} ${t?.plans || "Plans"}`}
            </h3>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.72rem",
                color: "var(--muted)",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                padding: "2px 9px",
                borderRadius: 100,
                fontWeight: 500,
              }}
            >
              {networkProducts.length} available
            </span>
          </div>

          {networkProducts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 2rem",
                color: "var(--muted)",
                background: "var(--card)",
                borderRadius: 12,
              }}
            >
              <p>{`No ${activeNetwork} plans right now`}</p>
            </div>
          ) : (
            <ProductGrid
              key={activeNetwork}
              products={networkProducts}
              config={config}
              onBuyClick={onAddToCart}
              canSell={canSell}
              fromLabel={t?.from || "from"}
            />
          )}
        </>
      )}

      <style jsx>{`
        /* The network row scrolls horizontally under the globe icon; the
           scrollbar is hidden so it does not compete with the icon. */
        .store-net-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .store-net-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

// ─── FeaturedCard (legacy "Popular Plans" highlight card) ────────────

function FeaturedCard({
  product,
  config,
  highlight,
  onBuyClick,
  canSell,
  brandColor,
  fromLabel,
}: {
  product: StoreProduct;
  config: StorePriceConfig;
  highlight: boolean;
  onBuyClick: (product: StoreProduct) => void;
  canSell: boolean;
  brandColor: string;
  fromLabel: string;
}) {
  return (
    <div
      style={{
        background: highlight
          ? `linear-gradient(135deg, ${brandColor}, color-mix(in srgb, ${brandColor} 70%, black))`
          : "var(--card)",
        border: highlight ? "none" : "1.5px solid var(--border)",
        borderRadius: 16,
        padding: "1.4rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {highlight && (
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
          {`Best Deal`}
        </span>
      )}
      <p
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          color: highlight ? "#FDF8F3" : "var(--text)",
          marginBottom: 2,
        }}
      >
        {product.name}
      </p>
      <p
        style={{
          fontSize: "0.7rem",
          color: highlight ? "rgba(253,248,243,0.8)" : "var(--muted)",
          marginBottom: 10,
        }}
      >
        {product.network ? product.network : product.category}
      </p>
      <p
        style={{
          fontSize: "1.75rem",
          fontWeight: 800,
          color: highlight ? "#FDF8F3" : brandColor,
          marginBottom: 14,
          lineHeight: 1,
        }}
      >
        {product.price_type === "RANGE" && (
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              marginRight: 4,
              opacity: 0.85,
            }}
          >
            {fromLabel}
          </span>
        )}
        {formatStorePrice(product.price, config)}
      </p>
      <button
        onClick={() => onBuyClick(product)}
        disabled={!canSell}
        style={{
          width: "100%",
          padding: "0.65rem",
          background: highlight ? "rgba(255,255,255,0.25)" : brandColor,
          border: highlight ? "1.5px solid rgba(255,255,255,0.4)" : "none",
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
        <Zap size={14} />
        {canSell ? "Buy Now" : "Unavailable"}
      </button>
    </div>
  );
}

// ─── ProductGrid & ProductCard (legacy PlanGrid/PlanCard, ported) ─────

function ProductGrid({
  products,
  config,
  onBuyClick,
  canSell,
  fromLabel,
}: {
  products: StoreProduct[];
  config: StorePriceConfig;
  onBuyClick: (product: StoreProduct) => void;
  canSell: boolean;
  fromLabel: string;
}) {
  const [page, setPage] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const pageProducts = products.slice(
    page * PRODUCTS_PER_PAGE,
    (page + 1) * PRODUCTS_PER_PAGE,
  );

  const resetHideTimer = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowControls(true);
    hideTimeoutRef.current = setTimeout(() => setShowControls(false), 5000);
  };

  const goToNext = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
      resetHideTimer();
    }
  };

  const goToPrev = () => {
    if (page > 0) {
      setPage(page - 1);
      resetHideTimer();
    }
  };

  const goToPage = (pageIndex: number) => {
    setPage(pageIndex);
    resetHideTimer();
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <div
      onMouseEnter={resetHideTimer}
      onMouseLeave={() => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setShowControls(false);
      }}
      style={{ position: "relative" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.6rem",
        }}
      >
        {pageProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            config={config}
            onBuyClick={onBuyClick}
            canSell={canSell}
            fromLabel={fromLabel}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <>
          <button
            onClick={goToPrev}
            disabled={page === 0}
            style={{
              display: showControls && page !== 0 ? "flex" : "none",
              position: "absolute",
              left: -12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--card)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border)",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--muted)" }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <button
            onClick={goToNext}
            disabled={page === totalPages - 1}
            style={{
              display:
                showControls && page !== totalPages - 1 ? "flex" : "none",
              position: "absolute",
              right: -12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--card)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border)",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--muted)" }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "1rem",
          }}
        >
          <button
            onClick={goToPrev}
            disabled={page === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.5rem",
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: page === 0 ? "var(--dim)" : "var(--muted)",
              cursor: page === 0 ? "not-allowed" : "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Previous
          </button>

          <div
            style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}
          >
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let showDot = false;
              if (totalPages <= 7) showDot = true;
              else if (i === 0 || i === totalPages - 1) showDot = true;
              else if (Math.abs(i - page) <= 2) showDot = true;

              if (!showDot) return null;

              const isActive = page === i;
              return (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  style={{
                    width: isActive ? 12 : 8,
                    height: 8,
                    borderRadius: "100%",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    background: isActive
                      ? "var(--brand-color)"
                      : "var(--border2)",
                    transition: "all 0.2s ease",
                  }}
                />
              );
            })}
          </div>

          <button
            onClick={goToNext}
            disabled={page === totalPages - 1}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.5rem",
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: page === totalPages - 1 ? "var(--dim)" : "var(--muted)",
              cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
            }}
          >
            Next
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  config,
  onBuyClick,
  canSell,
  fromLabel,
}: {
  product: StoreProduct;
  config: StorePriceConfig;
  onBuyClick: (product: StoreProduct) => void;
  fromLabel: string;
  canSell: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1.5px solid var(--border)",
        borderRadius: 14,
        padding: "1rem 0.6rem",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--brand-color)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontWeight: 700,
              color: "var(--text)",
              fontSize: "0.82rem",
            }}
          >
            {product.name}
          </p>
          {product.network && (
            <span
              style={{
                fontSize: "0.62rem",
                color: "var(--muted)",
                background: "var(--bg2)",
                padding: "1px 6px",
                borderRadius: 100,
                border: "1px solid var(--border)",
                fontWeight: 500,
              }}
            >
              {product.network}
            </span>
          )}
        </div>
      </div>
      <p
        style={{
          fontWeight: 800,
          color: "var(--brand-color)",
          fontSize: "1.1rem",
          letterSpacing: "-0.02em",
          marginTop: 6,
          marginBottom: 10,
        }}
      >
        {product.price_type === "RANGE" && (
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 600,
              marginRight: 3,
              opacity: 0.8,
            }}
          >
            {fromLabel}
          </span>
        )}
        {formatStorePrice(product.price, config)}
      </p>
      <button
        onClick={() => onBuyClick(product)}
        disabled={!canSell}
        style={{
          width: "100%",
          padding: "0.55rem",
          background: "var(--brand-color)",
          border: "none",
          borderRadius: 9,
          color: "#FDF8F3",
          fontWeight: 700,
          fontSize: "0.78rem",
          cursor: canSell ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          marginTop: "auto",
          opacity: canSell ? 1 : 0.5,
        }}
      >
        {canSell ? "Buy" : "Unavailable"}
      </button>
    </div>
  );
}
