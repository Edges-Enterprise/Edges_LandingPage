// src/app/[countryCode]/[storeName]/StoreProducts.tsx
"use client";

import { ShoppingBag, Check, Wifi, Tag, DollarSign, TrendingUp } from "lucide-react";
import { StoreProduct } from "@/types/reseller/storefront";

interface StoreProductsProps {
  products: StoreProduct[];
  categories: string[];
  networks: string[];
  selectedCategory: string;
  selectedNetwork: string;
  onCategoryChange: (category: string) => void;
  onNetworkChange: (network: string) => void;
  onAddToCart: (product: StoreProduct) => void;
  translations: any;
  config: any;
}

export default function StoreProducts({
  products,
  categories,
  networks,
  selectedCategory,
  selectedNetwork,
  onCategoryChange,
  onNetworkChange,
  onAddToCart,
  translations,
  config,
}: StoreProductsProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      data: Wifi,
      airtime: Tag,
      electricity: DollarSign,
      cable: TrendingUp,
    };
    const Icon = icons[category] || ShoppingBag;
    return Icon;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      data: "#3B82F6",
      airtime: "#8B5CF6",
      electricity: "#F59E0B",
      cable: "#10B981",
    };
    return colors[category] || "var(--brand-color)";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      data: t?.data || "Data",
      airtime: t?.airtime || "Airtime",
      electricity: t?.electricity || "Electricity",
      cable: t?.cable || "Cable TV",
    };
    return labels[category] || category;
  };

  return (
    <section id="products" style={{ padding: "1rem 0 2rem" }}>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={{
            padding: "0.5rem 2rem 0.5rem 1rem",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: "0.85rem",
            outline: "none",
            appearance: "none",
            cursor: "pointer",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.75rem center",
          }}
        >
          <option value="all">{t?.allCategories || "All Categories"}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </select>

        {networks.length > 0 && (
          <select
            value={selectedNetwork}
            onChange={(e) => onNetworkChange(e.target.value)}
            style={{
              padding: "0.5rem 2rem 0.5rem 1rem",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: "0.85rem",
              outline: "none",
              appearance: "none",
              cursor: "pointer",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
            }}
          >
            <option value="all">{t?.allNetworks || "All Networks"}</option>
            {networks.map((net) => (
              <option key={net} value={net}>
                {net}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {products.map((product) => {
            const Icon = getCategoryIcon(product.category);
            const color = getCategoryColor(product.category);

            return (
              <div
                key={product.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "1.25rem",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "rgba(var(--brand-color-rgb), 0.2)";
                  e.currentTarget.style.boxShadow = "var(--shadow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: "var(--dim)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {getCategoryLabel(product.category)}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1rem",
                    fontWeight: 700,
                    margin: "0 0 0.25rem 0",
                    color: "var(--text)",
                    flex: 1,
                  }}
                >
                  {product.name}
                </h3>

                {product.network && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      margin: "0 0 0.75rem 0",
                    }}
                  >
                    {t?.network || "Network"}: {product.network}
                  </p>
                )}

                {product.description && (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      margin: "0 0 0.75rem 0",
                      lineHeight: 1.4,
                    }}
                  >
                    {product.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--dim)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {t?.price || "Price"}
                    </span>
                    <p
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "var(--brand-color)",
                        margin: 0,
                      }}
                    >
                      {currencySymbol}{product.price.toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => onAddToCart(product)}
                    style={{
                      padding: "0.4rem 0.75rem",
                      background: "var(--brand-color)",
                      color: "#FDF8F3",
                      border: "none",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.85";
                      e.currentTarget.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <ShoppingBag size={14} />
                    {t?.addToCart || "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
            {t?.noProducts || "No products available"}
          </p>
          <p style={{ color: "var(--dim)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {t?.comingSoon || "More products coming soon!"}
          </p>
        </div>
      )}
    </section>
  );
}