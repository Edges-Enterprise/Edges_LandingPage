// src/components/reseller/CountryNavbar.tsx
"use client";

import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SUPPORTED_COUNTRIES, getCountryConfig } from "@/config/countries";
import { useCountry } from "@/providers/CountryProvider";

interface CountryNavbarProps {
  config: any;
  translations: any;
}

export default function CountryNavbar({
  config,
  translations,
}: CountryNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const router = useRouter();
  const country = useCountry();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const t = translations;

  const links = [
    { label: t?.howItWorks?.badge || "How It Works", href: "#how-it-works" },
    { label: t?.benefits?.badge || "Benefits", href: "#benefits" },
    { label: t?.pricing?.badge || "Plans", href: "#tiers" },
    { label: t?.faq?.badge || "FAQ", href: "#faq" },
  ];

  const handleCountrySelect = (countryCode: string) => {
    router.push(`/${countryCode}`);
    setCountryDropdownOpen(false);
    setOpen(false);
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? "rgba(18,10,4,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(201,138,84,0.12)"
          : "1px solid transparent",
        transition: "all 0.4s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 5%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 70,
        }}
      >
        <Link href="/" className="flex items-center space-x-2">
          <span
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[#FFFFFF] font-bold text-3xl tracking-wider"
          >
            Telcos
          </span>
          {SUPPORTED_COUNTRIES.slice(0, 6).map((code) => {
            const c = getCountryConfig(code);
            return (
              <span key={code} style={{ fontSize: "1.2rem" }}>
                {c.flag}
              </span>
            );
          })}
        </Link>

        <div
          style={{ display: "flex", alignItems: "center", gap: "2rem" }}
          className="hidden-mobile"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                color: "var(--muted)",
                textDecoration: "none",
                fontSize: "0.88rem",
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--muted)")
              }
            >
              {l.label}
            </a>
          ))}

          {/* Country Dropdown */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setCountryDropdownOpen(true)}
            onMouseLeave={() => setCountryDropdownOpen(false)}
          >
            <button
              style={{
                background: "transparent",
                border: "1px solid rgba(201,138,84,0.3)",
                color: "var(--text)",
                padding: "0.4rem 1rem",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "0.88rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{country.flag}</span>
              {country.name}
              <ChevronDown size={16} />
            </button>

            {countryDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "110%",
                  right: 0,
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  minWidth: 180,
                  padding: "0.4rem 0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {SUPPORTED_COUNTRIES.map((code) => {
                  const c = getCountryConfig(code);
                  return (
                    <button
                      key={code}
                      onClick={() => handleCountrySelect(code)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        width: "100%",
                        padding: "0.6rem 1.2rem",
                        background: "transparent",
                        border: "none",
                        color: "var(--text)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(201,138,84,0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={{ fontSize: "1.1rem" }}>{c.flag}</span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <a
            href={country.applyUrl}
            style={{
              background: "var(--accent)",
              color: "#FDF8F3",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.88rem",
              padding: "0.5rem 1.3rem",
              borderRadius: 8,
              transition: "opacity 0.2s, transform 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.85";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }}
          >
            {t?.hero?.cta || "Apply as Reseller"}
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
            display: "none",
          }}
          className="show-mobile"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          style={{
            background: "var(--bg2)",
            borderTop: "1px solid var(--border)",
            padding: "1.2rem 5%",
          }}
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                color: "var(--muted)",
                textDecoration: "none",
                padding: "0.7rem 0",
                fontSize: "0.95rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {l.label}
            </a>
          ))}

          <div
            style={{
              marginTop: "0.7rem",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "0.7rem",
            }}
          >
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
              }}
            >
              Select Country:
            </p>
            {SUPPORTED_COUNTRIES.map((code) => {
              const c = getCountryConfig(code);
              return (
                <button
                  key={code}
                  onClick={() => handleCountrySelect(code)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    width: "100%",
                    padding: "0.5rem 0",
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text)")
                  }
                >
                  <span style={{ fontSize: "1.1rem" }}>{c.flag}</span>
                  {c.name}
                </button>
              );
            })}
          </div>

          <a
            href={country.applyUrl}
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              marginTop: "1rem",
              background: "var(--accent)",
              color: "#FDF8F3",
              textAlign: "center",
              textDecoration: "none",
              fontWeight: 600,
              padding: "0.75rem",
              borderRadius: 8,
            }}
          >
            {t?.hero?.cta || "Apply as Reseller"}
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
