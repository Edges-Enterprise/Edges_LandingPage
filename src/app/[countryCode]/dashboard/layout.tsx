
// src/app/[countryCode]/dashboard/layout.tsx
"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardSidebar from "@/components/reseller/layout/DashboardSidebar";
import DashboardHeader from "@/components/reseller/layout/DashboardHeader";
import ThemeToggle from "@/components/reseller/layout/ThemeToggle";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { CountryProvider } from "@/providers/CountryProvider";
import { getCountryConfig } from "@/config/countries";
import "./dashboard-theme.css";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ countryCode: string }>;
}

export default function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { countryCode } = use(params);

  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [countryConfig, setCountryConfig] = useState<any>(null);
  const [brandColor, setBrandColor] = useState<string>("#C98A54");
  const [storeName, setStoreName] = useState<string>("Reseller");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${countryCode}/sign-in`);
        return;
      }

      setUser(user);
      const config = getCountryConfig(countryCode);
      setCountryConfig(config);

      try {
        const { data: dashboardData } = await supabase.rpc(
          "get_global_reseller_dashboard_context",
          { p_user_id: user.id },
        );

        if (dashboardData && dashboardData.brand_color) {
          setBrandColor(dashboardData.brand_color);
        }

        if (dashboardData?.store_name) {
          setStoreName(dashboardData.store_name);
        } else if (dashboardData?.store_slug) {
          setStoreName(
            dashboardData.store_slug
              .split("-")
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
          );
        }

        if (dashboardData?.logo_url) {
          setLogoUrl(dashboardData.logo_url);
        }
      } catch (error) {
        console.error("Error loading brand color:", error);
      }

      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [countryCode, router, supabase]);

  // Swap the tab title/description/favicon to the reseller's own store
  // branding while inside the dashboard, and restore the site defaults on
  // unmount so other pages (marketing site, storefront) aren't affected.
  useEffect(() => {
    if (loading) return;

    const iconLink = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement | null;
    const previousHref = iconLink?.getAttribute("href") ?? null;
    const previousTitle = document.title;

    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content") ?? null;

    document.title = `${storeName} Dashboard`;

    if (descriptionTag) {
      descriptionTag.setAttribute("content", `${storeName} reseller dashboard`);
    }

    if (logoUrl) {
      let tag = iconLink;
      if (!tag) {
        tag = document.createElement("link");
        tag.setAttribute("rel", "icon");
        document.head.appendChild(tag);
      }
      // Cache-bust so browsers that only refetch on href change pick this up
      tag.setAttribute("href", `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=dashboard`);
    }

    return () => {
      document.title = previousTitle;
      if (iconLink && previousHref) {
        iconLink.setAttribute("href", previousHref);
      }
      if (descriptionTag && previousDescription) {
        descriptionTag.setAttribute("content", previousDescription);
      }
    };
  }, [loading, storeName, logoUrl]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0D0A08",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "4px solid var(--border)",
            borderTop: "4px solid var(--brand-color)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ThemeProvider brandColor={brandColor}>
      <CountryProvider config={countryConfig}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            background: "var(--bg)",
          }}
        >
          <DashboardSidebar
            countryCode={countryCode}
            storeName={storeName}
            isMobileOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="dashboard-content"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg, #0D0A08)",
              }}
            >
              <DashboardHeader
                user={user}
                countryCode={countryCode}
                onMenuClick={() => setIsMobileMenuOpen((open) => !open)}
              />
              <div className="desktop-only" style={{ display: "flex", flexShrink: 0 }}>
                <ThemeToggle />
              </div>
            </div>
            <main
              style={{
                flex: 1,
                padding: "1.5rem",
                overflow: "auto",
                background: "var(--bg, #0D0A08)",
              }}
            >
              {children}
            </main>
          </div>
        </div>
        <style>{`
          @media (min-width: 768px) {
            .dashboard-content {
              margin-left: 240px;
            }
          }
          @media (max-width: 767px) {
            .desktop-only {
              display: none !important;
            }
          }
        `}</style>
      </CountryProvider>
    </ThemeProvider>
  );
}

