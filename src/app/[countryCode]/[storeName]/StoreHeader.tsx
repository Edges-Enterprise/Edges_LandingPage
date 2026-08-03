// src/app/[countryCode]/[storeName]/StoreHeader.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Menu,
  X,
  Moon,
  Sun,
  Bell,
  User,
  LayoutDashboard,
  LogOut,
  LogIn,
  Download,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

interface StoreHeaderProps {
  storeData: any;
  cartCount: number;
  cartTotal: number;
  onCartClick: () => void;
  translations: any;
  config: any;
  apkUrl?: string | null;
}

export default function StoreHeader({
  storeData,
  translations,
  config,
  apkUrl,
}: StoreHeaderProps) {
  const t = translations;
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isStoreOwner, setIsStoreOwner] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const brandColor = storeData.application.brand_color || "#C98A54";
 
  // Check auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      if (session?.user) {
        setIsStoreOwner(
          session.user.user_metadata?.store_name ===
            storeData.application.store_slug,
        );
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (session?.user) {
        setIsStoreOwner(
          session.user.user_metadata?.store_name ===
            storeData.application.store_slug,
        );
      } else {
        setIsStoreOwner(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [storeData.application.store_slug]);

  // Device detection for app banner
  useEffect(() => {
    const checkDevice = () => {
      const userAgent =
        navigator.userAgent || navigator.vendor || (window as any).opera;
      const isAndroidDevice = /android/i.test(userAgent);
      setIsAndroid(isAndroidDevice);
      const isMobileWidth = window.innerWidth <= 1024;
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobileOrTablet(isMobileWidth || isTouchDevice);

      const dismissedData = localStorage.getItem(
        `install-banner-dismissed-${storeData.application.store_slug}`,
      );
      if (dismissedData) {
        try {
          const { dismissedAt } = JSON.parse(dismissedData);
          const dismissedDate = new Date(dismissedAt);
          const now = new Date();
          const diffInDays =
            (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffInDays >= 3) {
            setBannerDismissed(false);
            localStorage.removeItem(
              `install-banner-dismissed-${storeData.application.store_slug}`,
            );
          } else {
            setBannerDismissed(true);
          }
        } catch {
          setBannerDismissed(false);
          localStorage.removeItem(
            `install-banner-dismissed-${storeData.application.store_slug}`,
          );
        }
      } else {
        setBannerDismissed(false);
      }
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, [storeData.application.store_slug]);

  // Show banner when conditions are met
  useEffect(() => {
    const shouldShow = Boolean(
      apkUrl && isAndroid && isMobileOrTablet && !bannerDismissed,
    );
    // Delay showing the banner
    if (shouldShow) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 2800);
      return () => clearTimeout(timer);
    } else {
      setShowInstallBanner(false);
    }
  }, [apkUrl, isAndroid, isMobileOrTablet, bannerDismissed]);

  const dismissBanner = () => {
    setShowInstallBanner(false);
    const data = { dismissedAt: new Date().toISOString() };
    localStorage.setItem(
      `install-banner-dismissed-${storeData.application.store_slug}`,
      JSON.stringify(data),
    );
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(
      `/${storeData.application.country_code}/${storeData.application.store_slug}`,
    );
  };

  const handleLogin = () => {
    router.push(
      `/${storeData.application.country_code}/${storeData.application.store_slug}?login=true`,
    );
  };

  const navBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "0.4rem 0.6rem",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
    textDecoration: "none",
    flexShrink: 0,
  };

  return (
    <>
      {/* ─── Install App Banner ─────────────────────────── */}
      {showInstallBanner && apkUrl && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
            padding: "0.6rem 1rem",
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
            animation: "slideDown 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <style>{`
            @keyframes slideDown {
              0% { transform: translateY(-100%); opacity: 0; }
              60% { transform: translateY(4px); opacity: 1; }
              100% { transform: translateY(0); opacity: 1; }
            }
            @media (max-width: 480px) {
              .banner-content { flex-wrap: wrap !important; gap: 0.5rem !important; }
              .banner-title { font-size: 0.85rem !important; }
              .banner-description { font-size: 0.7rem !important; }
              .banner-button { padding: 0.4rem 0.8rem !important; font-size: 0.75rem !important; }
            }
          `}</style>
          <div
            className="banner-content"
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              color: 'var(--text)',
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flex: "1",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                {storeData.application.logo_url ? (
                  <img
                    src={storeData.application.logo_url}
                    alt={storeData.application.store_name}
                    style={{
                      width: 32,
                      height: 32,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  <Smartphone size={24} style={{ color: 'var(--text)' }} />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  className="banner-title"
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    lineHeight: 1.2,
                    marginBottom: 2,
                  }}
                >
                  📱 {t?.installApp || "Get the App"}
                </p>
                <p
                  className="banner-description"
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.85,
                    lineHeight: 1.3,
                  }}
                >
                  {t?.appDescription ||
                    "Buy data and airtime faster from your phone"}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexShrink: 0,
              }}
            >
              <a
                href={apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="banner-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.5rem 1.2rem",
                  background: "rgba(255,255,255,0.25)",
                  border: "1.5px solid rgba(255,255,255,0.4)",
                  borderRadius: 10,
                  color: 'var(--text)',
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textDecoration: "none",
                  backdropFilter: "blur(4px)",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.35)";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <Download size={15} />
                {t?.downloadApp || "Download"}
              </a>
              <button
                onClick={dismissBanner}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: 'var(--text)',
                  opacity: 0.7,
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                }}
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ───────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: showInstallBanner ? 0 : 0,
          zIndex: 20,
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
          color: 'var(--text)',
          boxShadow: "0 2px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 5%",
            maxWidth: 1100,
            margin: "0 auto",
            gap: "0.5rem",
          }}
        >
          {/* Logo */}
          <Link
            href={`/${storeData.application.country_code}/${storeData.application.store_slug}`}
            style={{ textDecoration: "none", flexShrink: 0 }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: storeData.application.logo_url
                    ? `url(${storeData.application.logo_url}) center/cover`
                    : "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {!storeData.application.logo_url && (
                  <Store size={18} style={{ color: 'var(--text)' }} />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: 'var(--text)',
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "clamp(80px, 20vw, 180px)",
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
              gap: "0.5rem",
            }}
            className="desktop-nav"
          >
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={navBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              }}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Notifications (placeholder) */}
            <button
              aria-label="Notifications"
              style={navBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              }}
            >
              <Bell size={16} />
            </button>

            {/* Account / Auth */}
            {loggedIn ? (
              <>
                {isStoreOwner && (
                  <Link
                    href="/dashboard"
                    style={navBtnStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.12)";
                    }}
                  >
                    <LayoutDashboard size={16} />
                  </Link>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {storeData.application.store_name
                      ?.charAt(0)
                      .toUpperCase() || "U"}
                  </div>
                  <button
                    onClick={handleLogout}
                    style={navBtnStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.12)";
                    }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleLogin}
                style={{
                  ...navBtnStyle,
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                }}
              >
                <LogIn size={16} />
                <span style={{ fontSize: "0.8rem" }}>
                  {t?.signIn || "Sign in"}
                </span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Open menu"
            style={{
              display: "none",
              background: "transparent",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              color: 'var(--text)',
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            className="mobile-toggle"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 45,
          }}
        />
      )}

      {/* Mobile Drawer */}
      <div
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
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--text)",
            }}
          >
            {storeData.application.store_name}
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

        {/* Theme Toggle */}
        <button
          onClick={() => {
            toggleTheme();
            setIsMobileMenuOpen(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 0",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text)",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            fontSize: "0.9rem",
          }}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>

        {/* Notifications */}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 0",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text)",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            fontSize: "0.9rem",
          }}
        >
          <Bell size={16} />
          Notifications
        </button>

        {/* Auth / Account */}
        {loggedIn ? (
          <>
            {isStoreOwner && (
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                }}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
            )}
            <button
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 0",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                fontSize: "0.9rem",
                marginTop: "auto",
                borderTop: "1px solid var(--border)",
                paddingTop: "1rem",
              }}
            >
              <LogOut size={16} />
              {t?.signOut || "Sign Out"}
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              handleLogin();
              setIsMobileMenuOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 0",
              background: "transparent",
              border: "none",
              color: "var(--text)",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              fontSize: "0.9rem",
            }}
          >
            <LogIn size={16} />
            {t?.signIn || "Sign In"}
          </button>
        )}
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
      `}</style>
    </>
  );
}
