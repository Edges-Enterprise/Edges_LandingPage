// src/app/[countryCode]/[storeName]/StoreHeader.tsx
"use client";

import { useState } from "react";
import {
  Store,
  ShoppingCart,
  Menu,
  X,
  Phone,
  Mail,
  Moon,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/providers/ThemeProvider";

interface StoreHeaderProps {
  storeData: any;
  cartCount: number;
  cartTotal: number;
  onCartClick: () => void;
  translations: any;
  config: any;
}

export default function StoreHeader({
  storeData,
  cartCount,
  cartTotal,
  onCartClick,
  translations,
  config,
}: StoreHeaderProps) {
  const t = translations;
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currencySymbol = config.currencySymbol || "₦";

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          // background: "rgba(var(--bg), 0.92)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 5%",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* Logo */}
          <Link
            href={`/${storeData.application.country_code}/${storeData.application.store_slug}`}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: storeData.application.logo_url
                    ? `url(${storeData.application.logo_url}) center/cover`
                    : storeData.application.brand_color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {!storeData.application.logo_url && (
                  <Store size={18} style={{ color: "#FDF8F3" }} />
                )}
              </div>
              <div>
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
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
            }}
            className="desktop-nav"
          >
            <a
              href="#products"
              style={{
                color: "var(--muted)",
                textDecoration: "none",
                fontSize: "0.9rem",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              {t?.products || "Products"}
            </a>

            {storeData.settings.contact_phone && (
              <a
                href={`tel:${storeData.settings.contact_phone}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--muted)",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                <Phone size={14} />
                {storeData.settings.contact_phone}
              </a>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                width: 36,
                height: 36,
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-color)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            <button
              onClick={onCartClick}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                cursor: "pointer",
                padding: "0.4rem 0.75rem",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <>
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      background: "var(--brand-color)",
                      color: "#FDF8F3",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cartCount}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--brand-color)",
                    }}
                  >
                    {currencySymbol}
                    {cartTotal.toLocaleString()}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Mobile Menu Toggle — bordered square icon button, matching DashboardHeader */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Open menu"
            style={{
              display: "none",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text)",
              cursor: "pointer",
              flexShrink: 0,
            }}
            className="mobile-toggle"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Backdrop — conditionally rendered, no fade, matches DashboardSidebar */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="mobile-drawer-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 45,
          }}
        />
      )}

      {/* Slide-in Drawer — slides from the left, same as DashboardSidebar */}
      <div
        className="mobile-drawer"
        style={{
          width: 280,
          background: "var(--bg2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: isMobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          overflow: "hidden",
          padding: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--text)",
            }}
          >
            Menu
          </span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <a
          href="#products"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            display: "block",
            padding: "0.75rem 0",
            color: "var(--text)",
            textDecoration: "none",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {t?.products || "Products"}
        </a>

        {storeData.settings.contact_phone && (
          <a
            href={`tel:${storeData.settings.contact_phone}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 0",
              color: "var(--text)",
              textDecoration: "none",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <Phone size={16} />
            {storeData.settings.contact_phone}
          </a>
        )}

        <button
          onClick={() => toggleTheme()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 0",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text)",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>

        <button
          onClick={() => {
            setIsMobileMenuOpen(false);
            onCartClick();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 0",
            background: "transparent",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <ShoppingCart size={18} />
          {t?.cart || "Cart"} ({cartCount})
          {cartCount > 0 && (
            <span
              style={{
                marginLeft: "auto",
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "var(--brand-color)",
              }}
            >
              {currencySymbol}
              {cartTotal.toLocaleString()}
            </span>
          )}
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-drawer,
          .mobile-drawer-backdrop {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .mobile-drawer {
            width: 280px;
          }
        }
      `}</style>
    </>
  );
}

// // src/app/[countryCode]/[storeName]/StoreHeader.tsx
// "use client";

// import { useState } from "react";
// import { Store, ShoppingCart, Menu, X, Phone, Mail, Moon, Sun } from "lucide-react";
// import Link from "next/link";
// import { useTheme } from "@/providers/ThemeProvider";

// interface StoreHeaderProps {
//   storeData: any;
//   cartCount: number;
//   cartTotal: number;
//   onCartClick: () => void;
//   translations: any;
//   config: any;
// }

// export default function StoreHeader({
//   storeData,
//   cartCount,
//   cartTotal,
//   onCartClick,
//   translations,
//   config,
// }: StoreHeaderProps) {
//   const t = translations;
//   const { theme, toggleTheme } = useTheme();
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const currencySymbol = config.currencySymbol || "₦";

//   return (
//     <header
//       style={{
//         position: "sticky",
//         top: 0,
//         zIndex: 50,
//         background: "var(--bg)",
//         borderBottom: "1px solid var(--border)",
//         backdropFilter: "blur(12px)",
//         // background: "rgba(var(--bg), 0.92)",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           padding: "0.75rem 5%",
//           maxWidth: 1200,
//           margin: "0 auto",
//         }}
//       >
//         {/* Logo */}
//         <Link href={`/${storeData.application.country_code}/${storeData.application.store_slug}`}>
//           <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
//             <div
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 8,
//                 background: storeData.application.logo_url
//                   ? `url(${storeData.application.logo_url}) center/cover`
//                   : storeData.application.brand_color,
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 overflow: "hidden",
//                 flexShrink: 0,
//               }}
//             >
//               {!storeData.application.logo_url && (
//                 <Store size={18} style={{ color: "#FDF8F3" }} />
//               )}
//             </div>
//             <div>
//               <span
//                 style={{
//                   fontFamily: "'Playfair Display', serif",
//                   fontSize: "1.1rem",
//                   fontWeight: 700,
//                   color: "var(--text)",
//                 }}
//               >
//                 {storeData.application.store_name}
//               </span>
//             </div>
//           </div>
//         </Link>

//         {/* Desktop Navigation */}
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: "1.5rem",
//           }}
//           className="desktop-nav"
//         >
//           <a
//             href="#products"
//             style={{
//               color: "var(--muted)",
//               textDecoration: "none",
//               fontSize: "0.9rem",
//               transition: "color 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.color = "var(--text)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.color = "var(--muted)";
//             }}
//           >
//             {t?.products || "Products"}
//           </a>

//           {storeData.settings.contact_phone && (
//             <a
//               href={`tel:${storeData.settings.contact_phone}`}
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "0.5rem",
//                 color: "var(--muted)",
//                 textDecoration: "none",
//                 fontSize: "0.85rem",
//                 transition: "color 0.2s",
//               }}
//               onMouseEnter={(e) => {
//                 e.currentTarget.style.color = "var(--text)";
//               }}
//               onMouseLeave={(e) => {
//                 e.currentTarget.style.color = "var(--muted)";
//               }}
//             >
//               <Phone size={14} />
//               {storeData.settings.contact_phone}
//             </a>
//           )}

//           {/* Theme Toggle */}
//           <button
//             onClick={toggleTheme}
//             aria-label="Toggle theme"
//             style={{
//               background: "transparent",
//               border: "1px solid var(--border)",
//               borderRadius: 8,
//               width: 36,
//               height: 36,
//               color: "var(--muted)",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               transition: "all 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.borderColor = "var(--brand-color)";
//               e.currentTarget.style.color = "var(--text)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.borderColor = "var(--border)";
//               e.currentTarget.style.color = "var(--muted)";
//             }}
//           >
//             {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
//           </button>

//           <button
//             onClick={onCartClick}
//             style={{
//               position: "relative",
//               background: "transparent",
//               border: "none",
//               color: "var(--text)",
//               cursor: "pointer",
//               padding: "0.4rem 0.75rem",
//               borderRadius: 8,
//               display: "flex",
//               alignItems: "center",
//               gap: "0.5rem",
//               transition: "all 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.background = "var(--bg2)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.background = "transparent";
//             }}
//           >
//             <ShoppingCart size={20} />
//             {cartCount > 0 && (
//               <>
//                 <span
//                   style={{
//                     position: "absolute",
//                     top: -4,
//                     right: -4,
//                     background: "var(--brand-color)",
//                     color: "#FDF8F3",
//                     fontSize: "0.6rem",
//                     fontWeight: 700,
//                     width: 18,
//                     height: 18,
//                     borderRadius: "50%",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   {cartCount}
//                 </span>
//                 <span
//                   style={{
//                     fontSize: "0.85rem",
//                     fontWeight: 600,
//                     color: "var(--brand-color)",
//                   }}
//                 >
//                   {currencySymbol}{cartTotal.toLocaleString()}
//                 </span>
//               </>
//             )}
//           </button>
//         </div>

//         {/* Mobile Menu Toggle */}
//         <button
//           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//           style={{
//             display: "none",
//             background: "transparent",
//             border: "none",
//             color: "var(--text)",
//             cursor: "pointer",
//           }}
//           className="mobile-toggle"
//         >
//           {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
//         </button>
//       </div>

//       {/* Mobile Menu */}
//       {isMobileMenuOpen && (
//         <div
//           style={{
//             padding: "1rem 5%",
//             borderTop: "1px solid var(--border)",
//             background: "var(--bg)",
//           }}
//         >
//           <a
//             href="#products"
//             onClick={() => setIsMobileMenuOpen(false)}
//             style={{
//               display: "block",
//               padding: "0.5rem 0",
//               color: "var(--text)",
//               textDecoration: "none",
//             }}
//           >
//             {t?.products || "Products"}
//           </a>
//           {storeData.settings.contact_phone && (
//             <a
//               href={`tel:${storeData.settings.contact_phone}`}
//               style={{
//                 display: "block",
//                 padding: "0.5rem 0",
//                 color: "var(--text)",
//                 textDecoration: "none",
//               }}
//             >
//               {storeData.settings.contact_phone}
//             </a>
//           )}
//           <button
//             onClick={() => {
//               toggleTheme();
//             }}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "0.5rem",
//               padding: "0.5rem 0",
//               background: "transparent",
//               border: "none",
//               color: "var(--text)",
//               cursor: "pointer",
//               width: "100%",
//             }}
//           >
//             {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
//             {theme === "light" ? "Dark Mode" : "Light Mode"}
//           </button>
//           <button
//             onClick={() => {
//               setIsMobileMenuOpen(false);
//               onCartClick();
//             }}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "0.5rem",
//               padding: "0.5rem 0",
//               background: "transparent",
//               border: "none",
//               color: "var(--text)",
//               cursor: "pointer",
//               width: "100%",
//             }}
//           >
//             <ShoppingCart size={18} />
//             {t?.cart || "Cart"} ({cartCount})
//           </button>
//         </div>
//       )}

//       <style>{`
//         @media (max-width: 768px) {
//           .desktop-nav {
//             display: none !important;
//           }
//           .mobile-toggle {
//             display: block !important;
//           }
//         }
//       `}</style>
//     </header>
//   );
// }
