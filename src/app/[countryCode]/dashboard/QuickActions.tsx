// src/app/[countryCode]/dashboard/QuickActions.tsx
"use client";

import { Wallet, Users, Store, Smartphone } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
  countryCode: string;
  storeSlug: string;
  translations: any;
}

export default function QuickActions({
  countryCode,
  storeSlug,
  translations,
}: QuickActionsProps) {
  const t = translations;

  const actions = [
    {
      icon: Wallet,
      label: t?.fundWallet || "Fund Wallet",
      href: `/${countryCode}/dashboard/wallet`,
      color: "#10B981",
    },
    {
      icon: Users,
      label: t?.addCustomer || "Add Customer",
      href: `/${countryCode}/dashboard/customers`,
      color: "#3B82F6",
    },
    {
      icon: Store,
      label: t?.shareStore || "Share Store",
      href: `/${countryCode}/${storeSlug}`,
      color: "#8B5CF6",
      external: true,
    },
    {
      icon: Smartphone,
      label: t?.publishApp || "Publish App",
      href: `/${countryCode}/dashboard/publishing`,
      color: "#F59E0B",
    },
  ];

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "0.95rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
        }}
      >
        {t?.quickActions || "Quick Actions"}
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          padding: "1.5rem",
        }}
      >
        {actions.map((action, index) => {
          const Icon = action.icon;

          if (action.external) {
            return (
              <a
                key={index}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1rem",
                  background: "var(--bg2)",
                  borderRadius: 8,
                  color: "var(--text)",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bg3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.background = "var(--bg2)";
                }}
              >
                <Icon size={16} style={{ color: action.color }} />
                {action.label}
              </a>
            );
          }

          return (
            <Link
              key={index}
              href={action.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1rem",
                background: "var(--bg2)",
                borderRadius: 8,
                color: "var(--text)",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 500,
                transition: "all 0.2s",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bg3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.background = "var(--bg2)";
              }}
            >
              <Icon size={16} style={{ color: action.color }} />
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
