// src/components/legal/CountryLegalHeader.tsx
//
// Minimal header for the country legal pages.
//
// Deliberately not CountryNavbar: that component is a client component that
// needs the landing translations and the full nav, and a legal page reached
// from a Play listing should open fast and say plainly whose policy this is.
// It keeps the brand and the way back to the storefront, nothing else.
import type { CountryConfig } from "@/config/countries";
import { PLATFORM_BRAND } from "@/lib/legal/countryLegal";

interface CountryLegalHeaderProps {
  config: CountryConfig;
}

export default function CountryLegalHeader({ config }: CountryLegalHeaderProps) {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        padding: "1rem 5%",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <a
          href={`/${config.code}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.15rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--text)",
            }}
          >
            {PLATFORM_BRAND}
          </span>
          <span style={{ fontSize: "1rem" }} aria-hidden="true">
            {config.flag}
          </span>
        </a>

        <a
          href={`/${config.code}`}
          style={{
            fontSize: "0.83rem",
            color: "var(--muted)",
            textDecoration: "none",
          }}
        >
          {config.name}
        </a>
      </div>
    </header>
  );
}
