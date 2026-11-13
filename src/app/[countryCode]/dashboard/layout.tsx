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
import OnboardingProvider, {
  useOnboarding,
} from "@/providers/OnboardingProvider";
import { getCountryConfig } from "@/config/countries";
import { checkStoreOwnership } from "@/actions/reseller/store/checkStoreOwnership";
import StoreLoader, {
  storeLabel,
  PLATFORM_LABEL,
} from "@/components/common/StoreLoader";
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

      // The dashboard belongs to the store owner only. A customer account
      // (e.g. one a reseller added, which carries the owner's store_slug in
      // its metadata) can otherwise reach this shell; the data RPC is scoped
      // to the owner's id so it would render empty, but the correct
      // behaviour is to send them back to the country landing.
      const isOwner = await checkStoreOwnership();
      if (!isOwner) {
        router.replace(`/${countryCode}`);
        return;
      }

      setUser(user);

      // Name the loading indicator as early as possible. The
      // dashboard-context RPC below is the slow call, and the session
      // already carries the store slug, so seed the name from it and let
      // the RPC replace it with the store's display name.
      const metaSlug = user.user_metadata?.store_slug;
      if (metaSlug) {
        const fromSlug = String(metaSlug)
          .split("-")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        setStoreName((prev) => (prev === "Reseller" ? fromSlug : prev));
      }

      const config = getCountryConfig(countryCode);
      setCountryConfig(config);

      try {
        const { data: dashboardData } = await supabase.rpc(
          "get_global_reseller_dashboard_context",
          { p_user_id: user.id },
        );

        if (dashboardData) {
          if (dashboardData.brand_color) {
            setBrandColor(dashboardData.brand_color);
          }

          if (dashboardData.store_name) {
            setStoreName(dashboardData.store_name);
          } else if (dashboardData.store_slug) {
            setStoreName(
              dashboardData.store_slug
                .split("-")
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
            );
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }

      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [countryCode, router, supabase]);

  // Update document title with store name
  useEffect(() => {
    if (!loading && storeName) {
      document.title = `${storeName} Dashboard`;
    }
  }, [loading, storeName]);

  if (loading) {
    // `storeName` is "Reseller" until the dashboard context resolves, which
    // is not a store — fall back to the generic loading label in that window.
    const label =
      storeName && storeName !== "Reseller"
        ? storeLabel(storeName)
        : PLATFORM_LABEL;

    return (
      <div style={{ minHeight: "100vh", background: "#0D0A08" }}>
        <StoreLoader label={label} fullScreen dark />
      </div>
    );
  }

  return (
    <ThemeProvider brandColor={brandColor}>
      <CountryProvider config={countryConfig}>
        <OnboardingProvider countryCode={countryCode} config={countryConfig}>
          <DashboardShell
            countryCode={countryCode}
            storeName={storeName}
            user={user}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            {children}
          </DashboardShell>
        </OnboardingProvider>
      </CountryProvider>
    </ThemeProvider>
  );
}

/**
 * The dashboard chrome. It lives *inside* `OnboardingProvider` so it can read
 * `tourWantsSidebar` and open the mobile sidebar drawer while the tour is
 * pointing at a nav item (the drawer is the only place those items exist on a
 * phone). The drawer opens for the tour but the backdrop is suppressed: the
 * dim already sits behind the tour, and a second scrim would double-darken and
 * swallow the tour's own clicks on the card.
 */
function DashboardShell({
  countryCode,
  storeName,
  user,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  children,
}: {
  countryCode: string;
  storeName: string;
  user: any;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { tourWantsSidebar } = useOnboarding();
  const sidebarOpen = isMobileMenuOpen || tourWantsSidebar;

  return (
    <>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "var(--bg, #0D0A08)",
        }}
      >
        <DashboardSidebar
          countryCode={countryCode}
          storeName={storeName}
          isMobileOpen={sidebarOpen}
          showBackdrop={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div
          className="dashboard-content"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minWidth: 0,
              padding: "0.5rem 1.5rem",
              borderBottom: "1px solid var(--border, rgba(201,138,84,0.12))",
              background: "var(--bg, #0D0A08)",
            }}
          >
            <DashboardHeader
              user={user}
              countryCode={countryCode}
              onMenuClick={() => setIsMobileMenuOpen(true)}
            />
            <div
              className="desktop-only"
              style={{ display: "flex", flexShrink: 0 }}
            >
              <ThemeToggle />
            </div>
          </div>
          <main
            style={{
              flex: 1,
              minWidth: 0,
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
    </>
  );
}

// // src/app/[countryCode]/dashboard/layout.tsx
// "use client";

// import { useEffect, useState, use } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import DashboardSidebar from "@/components/reseller/layout/DashboardSidebar";
// import DashboardHeader from "@/components/reseller/layout/DashboardHeader";
// import ThemeToggle from "@/components/reseller/layout/ThemeToggle";
// import { ThemeProvider } from "@/providers/ThemeProvider";
// import { CountryProvider } from "@/providers/CountryProvider";
// import { getCountryConfig } from "@/config/countries";
// import { useFavicon } from "@/hooks/common/useFavicon";
// import "./dashboard-theme.css";

// interface DashboardLayoutProps {
//   children: React.ReactNode;
//   params: Promise<{ countryCode: string }>;
// }

// export default function DashboardLayout({
//   children,
//   params,
// }: DashboardLayoutProps) {
//   const { countryCode } = use(params);

//   const router = useRouter();
//   const supabase = createClient();
//   const [loading, setLoading] = useState(true);
//   const [user, setUser] = useState<any>(null);
//   const [countryConfig, setCountryConfig] = useState<any>(null);
//   const [brandColor, setBrandColor] = useState<string>("#C98A54");
//   const [logoUrl, setLogoUrl] = useState<string | null>(null);
//   const [storeName, setStoreName] = useState<string>("Reseller");
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   // Apply favicon
//   useFavicon(logoUrl);

//   useEffect(() => {
//     const checkAuthAndLoadData = async () => {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push(`/${countryCode}/sign-in`);
//         return;
//       }

//       setUser(user);
//       const config = getCountryConfig(countryCode);
//       setCountryConfig(config);

//       try {
//         const { data: dashboardData } = await supabase.rpc(
//           "get_global_reseller_dashboard_context",
//           { p_user_id: user.id },
//         );

//         if (dashboardData) {
//           if (dashboardData.brand_color) {
//             setBrandColor(dashboardData.brand_color);
//           }

//           if (dashboardData.logo_url) {
//             setLogoUrl(dashboardData.logo_url);
//           }

//           if (dashboardData.store_name) {
//             setStoreName(dashboardData.store_name);
//           } else if (dashboardData.store_slug) {
//             setStoreName(
//               dashboardData.store_slug
//                 .split("-")
//                 .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
//                 .join(" "),
//             );
//           }
//         }
//       } catch (error) {
//         console.error("Error loading data:", error);
//       }

//       setLoading(false);
//     };

//     checkAuthAndLoadData();
//   }, [countryCode, router, supabase]);

//   // Update document title with store name
//   useEffect(() => {
//     if (!loading && storeName) {
//       document.title = `${storeName} Dashboard`;
//     }
//   }, [loading, storeName]);

//   if (loading) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "100vh",
//           background: "#0D0A08",
//         }}
//       >
//         <div
//           style={{
//             width: 40,
//             height: 40,
//             border: "4px solid rgba(201,138,84,0.2)",
//             borderTop: "4px solid var(--brand-color, #C98A54)",
//             borderRadius: "50%",
//             animation: "spin 1s linear infinite",
//           }}
//         />
//         <style>{`
//           @keyframes spin {
//             to { transform: rotate(360deg); }
//           }
//         `}</style>
//       </div>
//     );
//   }

//   return (
//     <ThemeProvider brandColor={brandColor}>
//       <CountryProvider config={countryConfig}>
//         <div
//           style={{
//             display: "flex",
//             minHeight: "100vh",
//             background: "var(--bg, #0D0A08)",
//           }}
//         >
//           <DashboardSidebar
//             countryCode={countryCode}
//             storeName={storeName}
//             isMobileOpen={isMobileMenuOpen}
//             onClose={() => setIsMobileMenuOpen(false)}
//           />
//           <div
//             className="dashboard-content"
//             style={{ flex: 1, display: "flex", flexDirection: "column" }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//                 padding: "0.5rem 1.5rem",
//                 borderBottom: "1px solid var(--border, rgba(201,138,84,0.12))",
//                 background: "var(--bg, #0D0A08)",
//               }}
//             >
//               <DashboardHeader
//                 user={user}
//                 countryCode={countryCode}
//                 onMenuClick={() => setIsMobileMenuOpen(true)}
//               />
//               <div
//                 className="desktop-only"
//                 style={{ display: "flex", flexShrink: 0 }}
//               >
//                 <ThemeToggle />
//               </div>
//             </div>
//             <main
//               style={{
//                 flex: 1,
//                 padding: "1.5rem",
//                 overflow: "auto",
//                 background: "var(--bg, #0D0A08)",
//               }}
//             >
//               {children}
//             </main>
//           </div>
//         </div>
//         <style>{`
//           @media (min-width: 768px) {
//             .dashboard-content {
//               margin-left: 240px;
//             }
//           }
//           @media (max-width: 767px) {
//             .desktop-only {
//               display: none !important;
//             }
//           }
//         `}</style>
//       </CountryProvider>
//     </ThemeProvider>
//   );
// }
