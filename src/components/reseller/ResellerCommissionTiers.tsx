"use client";
import { Check, Minus, ArrowRight } from "lucide-react";

interface Tier {
  icon: string;
  name: string;
  label: string;
  desc: string;
  color: string;
  colorBg: string;
  badge?: string;
  featured?: boolean;
  perks: { text: string; included: boolean }[];
  cta: string;
  ctaHref: string;
}

const tiers: Tier[] = [
  {
    icon: "🌐",
    name: "Web Storefront",
    label: "Free",
    desc: "Your own branded web store, live instantly. Sell data bundles and airtime at your own prices with zero setup cost.",
    color: "#6EBD8A",
    colorBg: "rgba(110,189,138,0.1)",
    cta: "Open My Store",
    ctaHref: "/reseller",
    perks: [
      { text: "Instant branded web storefront", included: true },
      { text: "Set your own prices & markup", included: true },
      { text: "All networks — MTN, Airtel, Glo, 9mobile", included: true },
      { text: "Real-time sales dashboard", included: true },
      { text: "Customer order management", included: true },
    ],
  },
  {
    icon: "📱",
    name: "Web + Android App",
    label: "Most Popular",
    desc: "Everything in the web store, plus your own Android app branded with your name and delivered to your customers.",
    color: "#C98A54",
    colorBg: "rgba(201,138,84,0.1)",
    badge: "Most Popular",
    featured: true,
    cta: "Get My App",
    ctaHref: "/reseller",
    perks: [
      { text: "Everything in Web Storefront", included: true },
      { text: "Custom Android APK (your branding)", included: true },
      { text: "APK delivered in 3–5 business days", included: true },
      { text: "Download link sent to your email", included: true },
      { text: "App updates when products change", included: true },
      { text: "Priority onboarding support", included: true },
    ],
  },
  {
    icon: "💎",
    name: "Enterprise",
    label: "Custom",
    desc: "For high-volume operators and businesses. Custom integrations, white-label branding, and a dedicated account manager.",
    color: "#A78BFA",
    colorBg: "rgba(167,139,250,0.1)",
    cta: "Contact Sales",
    ctaHref: "/contact",
    perks: [
      { text: "Everything in Web + Android", included: true },
      { text: "White-label branding", included: true },
      { text: "Custom domain for your store", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Bulk pricing & volume discounts", included: true },
      { text: "SLA-backed support", included: true },
    ],
  },
];

export default function CommissionTiers() {
  return (
    <section
      id="tiers"
      style={{ padding: "90px 5%", maxWidth: 1200, margin: "0 auto" }}
    >
      <div style={{ marginBottom: "3.5rem" }}>
        <div
          style={{
            display: "inline-block",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "0.9rem",
            background: "rgba(201,138,84,0.08)",
            padding: "4px 14px",
            borderRadius: 100,
            border: "1px solid rgba(201,138,84,0.2)",
          }}
        >
          Storefront Plans
        </div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.9rem, 3.5vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            marginBottom: "0.9rem",
          }}
        >
          Pick the plan that<br /><em> gives you financial freedom</em>
        </h2>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: 500,
            fontSize: "1rem",
            lineHeight: 1.75,
          }}
        >
          Start your business today, start earning immediately with a free web
          store or go bigger with your own Android app. take control over your
          prices and profits.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {tiers.map((t) => (
          <div
            key={t.name}
            style={{
              background: t.featured
                ? "linear-gradient(160deg, rgba(201,138,84,0.07), var(--card))"
                : "var(--card)",
              border: `1px solid ${t.featured ? "rgba(201,138,84,0.35)" : "var(--border)"}`,
              borderRadius: 18,
              padding: "2.2rem 2rem",
              position: "relative",
              overflow: "hidden",
              transform: t.featured ? "scale(1.025)" : "scale(1)",
              transition: "transform 0.25s, border-color 0.25s",
            }}
            onMouseEnter={(e) => {
              if (!t.featured)
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              if (!t.featured)
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(0)";
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, transparent 0%, ${t.color} 40%, transparent 100%)`,
              }}
            />
            {t.badge && (
              <div
                style={{
                  position: "absolute",
                  top: "1.2rem",
                  right: "1.2rem",
                  background: "rgba(201,138,84,0.15)",
                  border: "1px solid rgba(201,138,84,0.3)",
                  color: "var(--accent-lt)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "3px 10px",
                  borderRadius: 100,
                }}
              >
                {t.badge}
              </div>
            )}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: t.colorBg,
                border: `1px solid ${t.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                marginBottom: "1.2rem",
              }}
            >
              {t.icon}
            </div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "0.3rem",
              }}
            >
              {t.name}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                margin: "1rem 0 0.4rem",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: t.color,
                  lineHeight: 1,
                }}
              >
                {t.label}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--muted)",
                marginBottom: "1.8rem",
                lineHeight: 1.65,
              }}
            >
              {t.desc}
            </p>
            <ul style={{ listStyle: "none", marginBottom: "2rem" }}>
              {t.perks.map((p, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "5px 0",
                    fontSize: "0.88rem",
                    color: p.included ? "var(--muted)" : "var(--dim)",
                    opacity: p.included ? 1 : 0.55,
                  }}
                >
                  {p.included ? (
                    <Check
                      size={15}
                      style={{ color: t.color, flexShrink: 0, marginTop: 2 }}
                    />
                  ) : (
                    <Minus
                      size={15}
                      style={{
                        color: "var(--dim)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    />
                  )}
                  {p.text}
                </li>
              ))}
            </ul>
            <a
              href={t.ctaHref}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: t.featured ? "var(--accent)" : "transparent",
                color: t.featured ? "#FDF8F3" : "var(--text)",
                border: t.featured ? "none" : "1px solid var(--border2)",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
                padding: "0.75rem 1.2rem",
                borderRadius: 10,
                transition: "opacity 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.opacity = "0.85";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.opacity = "1";
                el.style.transform = "translateY(0)";
              }}
            >
              {t.cta} <ArrowRight size={15} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
