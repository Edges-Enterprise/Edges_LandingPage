"use client";
import { Check, Minus, ArrowRight } from "lucide-react";

interface Tier {
  icon: string;
  name: string;
  commission: string;
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
    icon: "🌱",
    name: "Starter",
    commission: "10%",
    desc: "Perfect for individuals just getting started with a small network.",
    color: "#6EBD8A",
    colorBg: "rgba(110,189,138,0.1)",
    cta: "Get Started Free",
    ctaHref: "#join",
    perks: [
      { text: "Unique referral link & portal", included: true },
      { text: "Real-time earnings dashboard", included: true },
      { text: "Email & chat support", included: true },
      { text: "Marketing materials kit", included: true },
      { text: "Bulk plan discounts", included: false },
      { text: "Dedicated account manager", included: false },
    ],
  },
  {
    icon: "🚀",
    name: "Pro Reseller",
    commission: "20%",
    desc: "For active sellers with 10+ clients. Unlock bulk pricing and priority support.",
    color: "#C98A54",
    colorBg: "rgba(201,138,84,0.1)",
    badge: "Most Popular",
    featured: true,
    cta: "Apply Now",
    ctaHref: "#join",
    perks: [
      { text: "Everything in Starter", included: true },
      { text: "Bulk plan discounts", included: true },
      { text: "Priority WhatsApp support", included: true },
      { text: "Co-branded materials", included: true },
      { text: "Sub-reseller network access", included: true },
      { text: "Dedicated account manager", included: false },
    ],
  },
  {
    icon: "💎",
    name: "Elite Partner",
    commission: "30%",
    desc: "For high-volume resellers and agencies. Maximum earnings and white-label options.",
    color: "#A78BFA",
    colorBg: "rgba(167,139,250,0.1)",
    cta: "Contact Sales",
    ctaHref: "#join",
    perks: [
      { text: "Everything in Pro", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom reseller pricing", included: true },
      { text: "White-label portal", included: true },
      { text: "SLA-backed support", included: true },
      { text: "Quarterly bonus pool", included: true },
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
          Commission Tiers
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
          Choose the tier <em>that fits you</em>
        </h2>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: 500,
            fontSize: "1rem",
            lineHeight: 1.75,
          }}
        >
          Start free and scale your way up. Every tier includes full dashboard
          access and our reseller support team.
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
                  fontSize: "3rem",
                  fontWeight: 800,
                  color: t.color,
                  lineHeight: 1,
                }}
              >
                {t.commission}
              </span>
              <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                commission
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
