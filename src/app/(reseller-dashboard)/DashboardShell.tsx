// app/(reseller-dashboard)/DashboardShell.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Users,
  Settings,
  Smartphone,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Overview",
  },
  {
    href: "/dashboard/plans",
    icon: Package,
    label: "Plans",
  },
  {
    href: "/dashboard/orders",
    icon: ShoppingCart,
    label: "Orders",
  },
  {
    href: "/dashboard/wallet",
    icon: Wallet,
    label: "Wallet",
  },
  {
    href: "/dashboard/customers",
    icon: Users,
    label: "Customers",
  },
  {
    href: "/dashboard/settings",
    icon: Settings,
    label: "Settings",
  },
];

export function DashboardShell({
  children,
  storeName,
  storeSlug,
}: {
  children: React.ReactNode;
  storeName: string;
  storeSlug: string;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: sidebarOpen ? 0 : -280,
          bottom: 0,
          width: 260,
          background: "var(--card)",
          borderRight: "1px solid var(--border)",
          zIndex: 50,
          transition: "left 0.3s ease",
          display: "flex",
          flexDirection: "column",
        }}
        className="sidebar-desktop"
      >
        {/* Logo */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Link
            href="/dashboard"
            style={{ textDecoration: "none" }}
            onClick={() => setSidebarOpen(false)}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--accent-lt)",
              }}
            >
              {storeName}
            </h2>
          </Link>
          <p style={{ fontSize: "0.75rem", color: "var(--dim)", marginTop: 4 }}>
            Reseller Dashboard
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "1rem" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "0.7rem 1rem",
                  marginBottom: "0.25rem",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: isActive ? "var(--accent-lt)" : "var(--muted)",
                  background: isActive ? "rgba(201,138,84,0.1)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "0.9rem",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(201,138,84,0.05)";
                    e.currentTarget.style.color = "var(--text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--muted)";
                  }
                }}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div
          style={{
            padding: "1rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <a
            href={`/${storeSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.6rem 1rem",
              borderRadius: 8,
              textDecoration: "none",
              color: "var(--muted)",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,138,84,0.05)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            <ExternalLink size={16} />
            View Store
          </a>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "0.6rem 1rem",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.color = "#EF4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 0 }} className="main-content">
        {/* Top bar */}
        <header
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text)",
              cursor: "pointer",
              display: "none",
            }}
            className="mobile-menu-btn"
          >
            <Menu size={22} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {storeName}
            </span>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--green)",
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: "1.5rem", maxWidth: 1100 }}>{children}</div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 1024px) {
          .sidebar-desktop {
            position: relative !important;
            left: 0 !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
