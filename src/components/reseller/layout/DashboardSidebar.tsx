// src/components/reseller/layout/DashboardSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Users,
  ShoppingBag,
  Package,
  Store,
  Smartphone,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/providers/ThemeProvider";

interface DashboardSidebarProps {
  countryCode: string;
  storeName?: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: ShoppingBag, label: "Orders", href: "/orders" },
  { icon: Package, label: "Plans", href: "/plans" },
  { icon: Store, label: "Store", href: "/store" },
  { icon: Smartphone, label: "Publishing", href: "/publishing" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function DashboardSidebar({
  countryCode,
  storeName = "Reseller",
  isMobileOpen = false,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => {
    const currentPath = pathname.replace(`/${countryCode}/dashboard`, "") || "";
    return currentPath === href || (href === "" && currentPath === "");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Reseller sign-out lands on the reseller sign-in page, matching the
    // storefront header's owner sign-out.
    window.location.href = `/${countryCode}/sign-in`;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => onClose?.()}
          className="mobile-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 45,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: "var(--bg2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: isMobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          overflow: "hidden",
        }}
        className="desktop-sidebar"
      >
        {/* Logo */}
        <div
          style={{
            padding: "1.5rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {storeName}
          </span>
          
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "1rem 0.75rem",
            overflowY: "auto",
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={`/${countryCode}/dashboard${item.href}`}
              onClick={() => onClose?.()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                color: isActive(item.href)
                  ? "var(--brand-color)"
                  : "var(--muted)",
                background: isActive(item.href)
                  ? `rgba(var(--brand-color-rgb), 0.08)`
                  : "transparent",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: isActive(item.href) ? 600 : 400,
                transition: "all 0.2s",
                marginBottom: "0.25rem",
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.background = `rgba(var(--brand-color-rgb), 0.05)`;
                  e.currentTarget.style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--muted)";
                }
              }}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 0.75rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Theme toggle. On phones the header's toggle is hidden
              (.desktop-only), so the sidebar — the only nav surface there —
              has to carry one too. */}
          <button
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.75rem",
              borderRadius: 8,
              color: "var(--muted)",
              background: "transparent",
              border: "none",
              width: "100%",
              cursor: "pointer",
              fontSize: "0.875rem",
              marginBottom: "0.25rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "rgba(var(--brand-color-rgb), 0.05)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.75rem",
              borderRadius: 8,
              color: "var(--dim)",
              background: "transparent",
              border: "none",
              width: "100%",
              cursor: "pointer",
              fontSize: "0.875rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              e.currentTarget.style.color = "#EF4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--dim)";
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar {
            transform: translateX(0) !important;
          }
          .mobile-backdrop {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-sidebar {
            width: 280px;
          }
        }
      `}</style>
    </>
  );
}
