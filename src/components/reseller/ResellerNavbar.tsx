"use client";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { flags } from "@/constants/flags";


const links = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Tiers", href: "#tiers" },
  { label: "Benefits", href: "#benefits" },
  { label: "FAQ", href: "#faq" },
];

const countryRoutes = {
  Ghana: { path: "/gh", flag: flags.Ghana },
  Nigeria: { path: "/reseller", flag: flags.Nigeria },
  Egypt: { path: "/eg", flag: flags.Egypt },
  DRC: { path: "/cd", flag: flags.DRC },
  Rwanda: { path: "/rw", flag: flags.Rwanda },
  Zambia: { path: "/zm", flag: flags.Zambia },
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleCountrySelect = (country: string) => {
    const route = countryRoutes[country as keyof typeof countryRoutes];
    if (route) {
      router.push(route.path);
      setCountryDropdownOpen(false);
      setOpen(false);
    }
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
          {Object.entries(countryRoutes).map(([country, { path, flag }]) => (
            <button
              key={country}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.2rem 0",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "color 0.2s",
              }}
              
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                {flag}
              </span>
              
            </button>
          ))}
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

          {/* Country Dropdown - Only for Ghana */}
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
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(201,138,84,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(201,138,84,0.3)";
              }}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                {flags.Ghana}
              </span>
              Ghana
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
                {Object.entries(countryRoutes).map(
                  ([country, { path, flag }]) => (
                    <button
                      key={country}
                      onClick={() => handleCountrySelect(country)}
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
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {flag}
                      </span>
                      {country}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <a
            href="/reseller"
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
            Join Now
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

          {/* Mobile Country Selector */}
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
            {Object.entries(countryRoutes).map(([country, { path, flag }]) => (
              <button
                key={country}
                onClick={() => handleCountrySelect(country)}
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
                <span style={{ display: "flex", alignItems: "center" }}>
                  {flag}
                </span>
                {country}
              </button>
            ))}
          </div>

          <a
            href="/reseller"
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
            Join Now
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