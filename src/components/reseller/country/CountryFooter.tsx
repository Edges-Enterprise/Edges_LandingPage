// src/components/reseller/CountryFooter.tsx
"use client";

import Image from "next/image";
import { CountryConfig } from "@/config/countries";

interface CountryFooterProps {
  config: CountryConfig;
}

const footerLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export default function CountryFooter({ config }: CountryFooterProps) {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "2.2rem 5%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src="/edgesnetworkicon.png"
            alt="Edges Network Logo"
            width={40}
            height={40}
          />
        </div>
        <span style={{ fontSize: "0.85rem", color: "var(--dim)" }}>
          © 2025 Edges Network. All rights reserved.
          <span style={{ marginLeft: "0.5rem", color: "var(--dim)" }}>
            {config.flag} {config.name}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {footerLinks.map((l) => (
          <a
            key={l.label}
            href={l.href}
            style={{
              fontSize: "0.83rem",
              color: "var(--dim)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
          >
            {l.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
