// src/components/reseller/country/CountryPricing.tsx
"use client";

import { Check, Minus, ArrowRight } from "lucide-react";
import { CountryConfig } from "@/config/countries";

interface CountryPricingProps {
  config: CountryConfig;
  translations: any;
}

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

export default function CountryPricing({
  config,
  translations,
}: CountryPricingProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";

  const tiers: Tier[] = [
    {
      icon: "🌐",
      name: t?.pricing?.webStore?.name || "Web Storefront",
      label: t?.pricing?.webStore?.label || "Free",
      desc:
        t?.pricing?.webStore?.desc ||
        "Your own branded web store, live instantly. Sell data bundles and airtime at your own prices with zero setup cost.",
      color: "#6EBD8A",
      colorBg: "rgba(110,189,138,0.1)",
      cta: t?.pricing?.webStore?.cta || "Open My Store",
      ctaHref: config.applyUrl,
      perks: [
        {
          text:
            t?.pricing?.webStore?.perks?.[0] ||
            "Instant branded web storefront",
          included: true,
        },
        {
          text:
            t?.pricing?.webStore?.perks?.[1] || "Set your own prices & markup",
          included: true,
        },
        {
          text: t?.pricing?.webStore?.perks?.[2] || "All networks covered",
          included: true,
        },
        {
          text: t?.pricing?.webStore?.perks?.[3] || "Real-time sales dashboard",
          included: true,
        },
        {
          text: t?.pricing?.webStore?.perks?.[4] || "Customer order management",
          included: true,
        },
      ],
    },
    {
      icon: "📱",
      name: t?.pricing?.mobileApp?.name || "Web + Android App",
      label: t?.pricing?.mobileApp?.label || "Most Popular",
      desc:
        t?.pricing?.mobileApp?.desc ||
        "Everything in the web store, plus your own Android app branded with your name and delivered to your customers.",
      color: "#C98A54",
      colorBg: "rgba(201,138,84,0.1)",
      badge: t?.pricing?.mobileApp?.badge || "Most Popular",
      featured: true,
      cta: t?.pricing?.mobileApp?.cta || "Get My App",
      ctaHref: config.applyUrl,
      perks: [
        {
          text:
            t?.pricing?.mobileApp?.perks?.[0] || "Everything in Web Storefront",
          included: true,
        },
        {
          text:
            t?.pricing?.mobileApp?.perks?.[1] ||
            "Custom Android APK (your branding)",
          included: true,
        },
        {
          text:
            t?.pricing?.mobileApp?.perks?.[2] ||
            `APK delivered in ${config.stats.apkDeliveryDays} business days`,
          included: true,
        },
        {
          text:
            t?.pricing?.mobileApp?.perks?.[3] ||
            "Download link sent to your email",
          included: true,
        },
        {
          text:
            t?.pricing?.mobileApp?.perks?.[4] ||
            "App updates when products change",
          included: true,
        },
        {
          text:
            t?.pricing?.mobileApp?.perks?.[5] || "Priority onboarding support",
          included: true,
        },
      ],
    },
    {
      icon: "💎",
      name: t?.pricing?.enterprise?.name || "Enterprise",
      label: t?.pricing?.enterprise?.label || "Custom",
      desc:
        t?.pricing?.enterprise?.desc ||
        "For high-volume operators and businesses. Custom integrations, white-label branding, and a dedicated account manager.",
      color: "#A78BFA",
      colorBg: "rgba(167,139,250,0.1)",
      cta: t?.pricing?.enterprise?.cta || "Contact Sales",
      ctaHref: "/contact",
      perks: [
        {
          text:
            t?.pricing?.enterprise?.perks?.[0] || "Everything in Web + Android",
          included: true,
        },
        {
          text: t?.pricing?.enterprise?.perks?.[1] || "White-label branding",
          included: true,
        },
        {
          text:
            t?.pricing?.enterprise?.perks?.[2] ||
            "Custom domain for your store",
          included: true,
        },
        {
          text:
            t?.pricing?.enterprise?.perks?.[3] || "Dedicated account manager",
          included: true,
        },
        {
          text:
            t?.pricing?.enterprise?.perks?.[4] ||
            "Bulk pricing & volume discounts",
          included: true,
        },
        {
          text: t?.pricing?.enterprise?.perks?.[5] || "SLA-backed support",
          included: true,
        },
      ],
    },
  ];

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
          {t?.pricing?.badge || "Storefront Plans"}
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
          dangerouslySetInnerHTML={{
            __html:
              t?.pricing?.title ||
              "Pick the plan that<br /><em> gives you financial freedom</em>",
          }}
        />
        <p
          style={{
            color: "var(--muted)",
            maxWidth: 500,
            fontSize: "1rem",
            lineHeight: 1.75,
          }}
        >
          {t?.pricing?.subtitle ||
            "Start your business today, start earning immediately with a free web store or go bigger with your own Android app."}
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
        {tiers.map((tier) => (
          <div
            key={tier.name}
            style={{
              background: tier.featured
                ? "linear-gradient(160deg, rgba(201,138,84,0.07), var(--card))"
                : "var(--card)",
              border: `1px solid ${tier.featured ? "rgba(201,138,84,0.35)" : "var(--border)"}`,
              borderRadius: 18,
              padding: "2.2rem 2rem",
              position: "relative",
              overflow: "hidden",
              transform: tier.featured ? "scale(1.025)" : "scale(1)",
              transition: "transform 0.25s, border-color 0.25s",
            }}
            onMouseEnter={(e) => {
              if (!tier.featured)
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              if (!tier.featured)
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
                background: `linear-gradient(90deg, transparent 0%, ${tier.color} 40%, transparent 100%)`,
              }}
            />
            {tier.badge && (
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
                {tier.badge}
              </div>
            )}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: tier.colorBg,
                border: `1px solid ${tier.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                marginBottom: "1.2rem",
              }}
            >
              {tier.icon}
            </div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "0.3rem",
              }}
            >
              {tier.name}
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
                  color: tier.color,
                  lineHeight: 1,
                }}
              >
                {tier.label}
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
              {tier.desc}
            </p>
            <ul style={{ listStyle: "none", marginBottom: "2rem" }}>
              {tier.perks.map((p, i) => (
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
                      style={{ color: tier.color, flexShrink: 0, marginTop: 2 }}
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
              href={tier.ctaHref}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: tier.featured ? "var(--accent)" : "transparent",
                color: tier.featured ? "#FDF8F3" : "var(--text)",
                border: tier.featured ? "none" : "1px solid var(--border2)",
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
              {tier.cta} <ArrowRight size={15} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
