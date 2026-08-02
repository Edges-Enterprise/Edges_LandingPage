// src/app/[countryCode]/[storeName]/StoreProducts.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag, Wifi, Tag, DollarSign, TrendingUp } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, string> = {
  data: "#3B82F6",
  airtime: "#8B5CF6",
  electricity: "#F59E0B",
  cable: "#10B981",
};

const CATEGORY_ICONS: Record<string, any> = {
  data: Wifi,
  airtime: Tag,
  electricity: DollarSign,
  cable: TrendingUp,
};

const PRODUCTS_PER_PAGE = 15;

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      data: t?.data || "Data",
      airtime: t?.airtime || "Airtime",
      electricity: t?.electricity || "Electricity",
      cable: t?.cable || "Cable TV",
    };
    return labels[category] || category;
  };

  const activeColor = CATEGORY_COLORS[selectedCategory] || "var(--brand-color)";
  const ActiveIcon = CATEGORY_ICONS[selectedCategory] || ShoppingBag;

  return (
    <section id="products" style={{ padding: "1rem 0 2rem" }}>
      {/* Category Tabs — legacy pill style */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => onCategoryChange("all")}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: 10,
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
            transition: "all 0.15s",
            background:
              selectedCategory === "all" ? "var(--brand-color)" : "var(--card)",
            color: selectedCategory === "all" ? "#FDF8F3" : "var(--text2)",
            border:
              selectedCategory === "all" ? "none" : "1.5px solid var(--border)",
          }}
        >
          {t?.allCategories || "All"}
        </button>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          const color = CATEGORY_COLORS[cat] || "var(--brand-color)";
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.02em",
                transition: "all 0.15s",
                background: isActive ? "var(--brand-color)" : "var(--card)",
                color: isActive ? "#FDF8F3" : "var(--text2)",
                border: isActive ? "none" : "1.5px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  border: "1.5px solid rgba(0,0,0,0.15)",
                  flexShrink: 0,
                }}
              />
              {getCategoryLabel(cat)}
            </button>
          );
        })}
      </div>

      {/* Network Tabs — secondary row, only when applicable */}
      {networks.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => onNetworkChange("all")}
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: 100,
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              background:
                selectedNetwork === "all" ? "var(--bg2)" : "transparent",
              color: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            {t?.allNetworks || "All Networks"}
          </button>
          {networks.map((net) => (
            <button
              key={net}
              onClick={() => onNetworkChange(net)}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: 100,
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                background:
                  selectedNetwork === net ? "var(--bg2)" : "transparent",
                color: selectedNetwork === net ? "var(--text)" : "var(--muted)",
                border: "1px solid var(--border)",
              }}
            >
              {net}
            </button>
          ))}
        </div>
      )}

      {/* Section header with icon + count badge, legacy style */}
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
            background: `color-mix(in srgb, ${activeColor} 18%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActiveIcon size={14} style={{ color: activeColor }} />
        </div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
          {selectedCategory === "all"
            ? t?.products || "Products"
            : getCategoryLabel(selectedCategory)}
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
          {products.length} available
        </span>
      </div>

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
          <p style={{ fontWeight: 600, color: "var(--text2)" }}>
            {t?.noProducts || "No products available"}
          </p>
          <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
            {t?.comingSoon || "More products coming soon!"}
          </p>
        </div>
      ) : (
        <ProductGrid
          key={`${selectedCategory}-${selectedNetwork}`}
          products={products}
          currencySymbol={currencySymbol}
          onBuyClick={onAddToCart}
        />
      )}
    </section>
  );
}

// ─── ProductGrid & ProductCard (legacy PlanGrid/PlanCard, ported) ─────

function ProductGrid({
  products,
  currencySymbol,
  onBuyClick,
}: {
  products: StoreProduct[];
  currencySymbol: string;
  onBuyClick: (product: StoreProduct) => void;
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
            currencySymbol={currencySymbol}
            onBuyClick={onBuyClick}
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
  currencySymbol,
  onBuyClick,
}: {
  product: StoreProduct;
  currencySymbol: string;
  onBuyClick: (product: StoreProduct) => void;
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
        {currencySymbol}
        {product.price.toLocaleString()}
      </p>
      <button
        onClick={() => onBuyClick(product)}
        style={{
          width: "100%",
          padding: "0.55rem",
          background: "var(--brand-color)",
          border: "none",
          borderRadius: 9,
          color: "#FDF8F3",
          fontWeight: 700,
          fontSize: "0.78rem",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          marginTop: "auto",
        }}
      >
        Buy
      </button>
    </div>
  );
}

// // src/app/[countryCode]/[storeName]/StoreProducts.tsx
// "use client";

// import { ShoppingBag, Check, Wifi, Tag, DollarSign, TrendingUp } from "lucide-react";
// import { StoreProduct } from "@/types/reseller/storefront";

// interface StoreProductsProps {
//   products: StoreProduct[];
//   categories: string[];
//   networks: string[];
//   selectedCategory: string;
//   selectedNetwork: string;
//   onCategoryChange: (category: string) => void;
//   onNetworkChange: (network: string) => void;
//   onAddToCart: (product: StoreProduct) => void;
//   translations: any;
//   config: any;
// }

// export default function StoreProducts({
//   products,
//   categories,
//   networks,
//   selectedCategory,
//   selectedNetwork,
//   onCategoryChange,
//   onNetworkChange,
//   onAddToCart,
//   translations,
//   config,
// }: StoreProductsProps) {
//   const t = translations;
//   const currencySymbol = config.currencySymbol || "₦";

//   const getCategoryIcon = (category: string) => {
//     const icons: Record<string, any> = {
//       data: Wifi,
//       airtime: Tag,
//       electricity: DollarSign,
//       cable: TrendingUp,
//     };
//     const Icon = icons[category] || ShoppingBag;
//     return Icon;
//   };

//   const getCategoryColor = (category: string) => {
//     const colors: Record<string, string> = {
//       data: "#3B82F6",
//       airtime: "#8B5CF6",
//       electricity: "#F59E0B",
//       cable: "#10B981",
//     };
//     return colors[category] || "var(--brand-color)";
//   };

//   const getCategoryLabel = (category: string) => {
//     const labels: Record<string, string> = {
//       data: t?.data || "Data",
//       airtime: t?.airtime || "Airtime",
//       electricity: t?.electricity || "Electricity",
//       cable: t?.cable || "Cable TV",
//     };
//     return labels[category] || category;
//   };

//   return (
//     <section id="products" style={{ padding: "1rem 0 2rem" }}>
//       {/* Filters */}
//       <div
//         style={{
//           display: "flex",
//           gap: "1rem",
//           flexWrap: "wrap",
//           marginBottom: "1.5rem",
//         }}
//       >
//         <select
//           value={selectedCategory}
//           onChange={(e) => onCategoryChange(e.target.value)}
//           style={{
//             padding: "0.5rem 2rem 0.5rem 1rem",
//             background: "var(--bg2)",
//             border: "1px solid var(--border)",
//             borderRadius: 8,
//             color: "var(--text)",
//             fontSize: "0.85rem",
//             outline: "none",
//             appearance: "none",
//             cursor: "pointer",
//             backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
//             backgroundRepeat: "no-repeat",
//             backgroundPosition: "right 0.75rem center",
//           }}
//         >
//           <option value="all">{t?.allCategories || "All Categories"}</option>
//           {categories.map((cat) => (
//             <option key={cat} value={cat}>
//               {getCategoryLabel(cat)}
//             </option>
//           ))}
//         </select>

//         {networks.length > 0 && (
//           <select
//             value={selectedNetwork}
//             onChange={(e) => onNetworkChange(e.target.value)}
//             style={{
//               padding: "0.5rem 2rem 0.5rem 1rem",
//               background: "var(--bg2)",
//               border: "1px solid var(--border)",
//               borderRadius: 8,
//               color: "var(--text)",
//               fontSize: "0.85rem",
//               outline: "none",
//               appearance: "none",
//               cursor: "pointer",
//               backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
//               backgroundRepeat: "no-repeat",
//               backgroundPosition: "right 0.75rem center",
//             }}
//           >
//             <option value="all">{t?.allNetworks || "All Networks"}</option>
//             {networks.map((net) => (
//               <option key={net} value={net}>
//                 {net}
//               </option>
//             ))}
//           </select>
//         )}
//       </div>

//       {/* Products Grid */}
//       {products.length > 0 ? (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
//             gap: "1rem",
//           }}
//         >
//           {products.map((product) => {
//             const Icon = getCategoryIcon(product.category);
//             const color = getCategoryColor(product.category);

//             return (
//               <div
//                 key={product.id}
//                 style={{
//                   background: "var(--card)",
//                   border: "1px solid var(--border)",
//                   borderRadius: 12,
//                   padding: "1.25rem",
//                   transition: "all 0.2s",
//                   display: "flex",
//                   flexDirection: "column",
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.transform = "translateY(-4px)";
//                   e.currentTarget.style.borderColor = "rgba(var(--brand-color-rgb), 0.2)";
//                   e.currentTarget.style.boxShadow = "var(--shadow)";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.transform = "translateY(0)";
//                   e.currentTarget.style.borderColor = "var(--border)";
//                   e.currentTarget.style.boxShadow = "none";
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "0.5rem",
//                     marginBottom: "0.5rem",
//                   }}
//                 >
//                   <div
//                     style={{
//                       width: 32,
//                       height: 32,
//                       borderRadius: 8,
//                       background: `${color}15`,
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <Icon size={16} style={{ color }} />
//                   </div>
//                   <span
//                     style={{
//                       fontSize: "0.6rem",
//                       fontWeight: 600,
//                       color: "var(--dim)",
//                       textTransform: "uppercase",
//                       letterSpacing: "0.05em",
//                     }}
//                   >
//                     {getCategoryLabel(product.category)}
//                   </span>
//                 </div>

//                 <h3
//                   style={{
//                     fontFamily: "'Playfair Display', serif",
//                     fontSize: "1rem",
//                     fontWeight: 700,
//                     margin: "0 0 0.25rem 0",
//                     color: "var(--text)",
//                     flex: 1,
//                   }}
//                 >
//                   {product.name}
//                 </h3>

//                 {product.network && (
//                   <p
//                     style={{
//                       fontSize: "0.75rem",
//                       color: "var(--muted)",
//                       margin: "0 0 0.75rem 0",
//                     }}
//                   >
//                     {t?.network || "Network"}: {product.network}
//                   </p>
//                 )}

//                 {product.description && (
//                   <p
//                     style={{
//                       fontSize: "0.8rem",
//                       color: "var(--muted)",
//                       margin: "0 0 0.75rem 0",
//                       lineHeight: 1.4,
//                     }}
//                   >
//                     {product.description}
//                   </p>
//                 )}

//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                     marginTop: "auto",
//                     paddingTop: "0.75rem",
//                     borderTop: "1px solid var(--border)",
//                   }}
//                 >
//                   <div>
//                     <span
//                       style={{
//                         fontSize: "0.65rem",
//                         color: "var(--dim)",
//                         textTransform: "uppercase",
//                         letterSpacing: "0.05em",
//                       }}
//                     >
//                       {t?.price || "Price"}
//                     </span>
//                     <p
//                       style={{
//                         fontFamily: "'Playfair Display', serif",
//                         fontSize: "1.1rem",
//                         fontWeight: 700,
//                         color: "var(--brand-color)",
//                         margin: 0,
//                       }}
//                     >
//                       {currencySymbol}{product.price.toLocaleString()}
//                     </p>
//                   </div>

//                   <button
//                     onClick={() => onAddToCart(product)}
//                     style={{
//                       padding: "0.4rem 0.75rem",
//                       background: "var(--brand-color)",
//                       color: "#FDF8F3",
//                       border: "none",
//                       borderRadius: 6,
//                       fontSize: "0.8rem",
//                       fontWeight: 600,
//                       cursor: "pointer",
//                       transition: "all 0.2s",
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "0.25rem",
//                     }}
//                     onMouseEnter={(e) => {
//                       e.currentTarget.style.opacity = "0.85";
//                       e.currentTarget.style.transform = "scale(1.02)";
//                     }}
//                     onMouseLeave={(e) => {
//                       e.currentTarget.style.opacity = "1";
//                       e.currentTarget.style.transform = "scale(1)";
//                     }}
//                   >
//                     <ShoppingBag size={14} />
//                     {t?.addToCart || "Add"}
//                   </button>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       ) : (
//         <div
//           style={{
//             textAlign: "center",
//             padding: "3rem",
//             background: "var(--card)",
//             border: "1px solid var(--border)",
//             borderRadius: 12,
//           }}
//         >
//           <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
//             {t?.noProducts || "No products available"}
//           </p>
//           <p style={{ color: "var(--dim)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
//             {t?.comingSoon || "More products coming soon!"}
//           </p>
//         </div>
//       )}
//     </section>
//   );
// }
