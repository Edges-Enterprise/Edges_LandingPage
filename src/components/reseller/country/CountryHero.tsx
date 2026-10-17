// src/components/reseller/country/CountryHero.tsx
"use client";

import { useInView } from "@/hooks/useInView";
import { ArrowRight, Users, Zap, Smartphone, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { CountryConfig } from "@/config/countries";

interface CountryHeroProps {
  config: CountryConfig;
  translations: any;
}

export default function CountryHero({
  config,
  translations,
}: CountryHeroProps) {
  const [sectionRef, sectionVisible] = useInView(0.1);
  const [statsRef, statsVisible] = useInView(0.3);
  const [resellers, setResellers] = useState(0);
  const target = config.stats.activeResellers || 2400;

  useEffect(() => {
    if (!statsVisible) return;
    let start = 0;
    const duration = 1200;
    const stepTime = 16;
    const increment = target / (duration / stepTime);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        start = target;
        clearInterval(timer);
      }
      setResellers(Math.floor(start));
    }, stepTime);
    return () => clearInterval(timer);
  }, [statsVisible, target]);

  const formatNumber = (num: number) => num.toLocaleString() + "+";

  const t = translations;

  // ✅ Helper function to replace placeholders in translations
  const replacePlaceholders = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/{monthlyProfit}/g, config.stats.monthlyProfit)
      .replace(/{apkDeliveryDays}/g, config.stats.apkDeliveryDays);
  };

  const stats = [
    {
      value: `${config.stats.apkDeliveryDays} days`,
      label: t?.stats?.apkDelivery || "APK Delivery",
      icon: Smartphone,
    },
    {
      value: formatNumber(resellers),
      label: t?.stats?.activeResellers || "Active Resellers",
      icon: Users,
    },
    {
      value: config.stats.storeGoesLive,
      label: t?.stats?.storeGoesLive || "Store Goes Live",
      icon: Zap,
    },
    { value: "Free", label: t?.stats?.toJoin || "To Join", icon: Store },
  ];

  const reveal = (delay = 0): React.CSSProperties => ({
    opacity: sectionVisible ? 1 : 0,
    transform: sectionVisible ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
  });

  // ✅ Get subtitle with placeholders replaced
  const subtitle = replacePlaceholders(
    t?.hero?.subtitle ||
      `Join the Edges Network reseller program. Earn competitively up to {monthlyProfit} in profits per month. Start in minutes.`,
  );

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "140px 5% 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glows */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          background:
            "radial-gradient(ellipse, rgba(201,138,84,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: 350,
          height: 350,
          background:
            "radial-gradient(ellipse, rgba(201,138,84,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        className="anim-spin"
        style={{
          position: "absolute",
          top: "12%",
          right: "8%",
          width: 120,
          height: 120,
          border: "1px solid rgba(201,138,84,0.12)",
          borderRadius: "50%",
          opacity: 0.6,
        }}
      />
      <div
        className="anim-spin"
        style={{
          position: "absolute",
          bottom: "18%",
          left: "6%",
          width: 80,
          height: 80,
          border: "1px dashed rgba(201,138,84,0.1)",
          borderRadius: "50%",
          animationDirection: "reverse",
        }}
      />

      {/* Badge */}
      <div
        style={{
          ...reveal(0),
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(201,138,84,0.1)",
          border: "1px solid rgba(201,138,84,0.28)",
          color: "var(--accent-lt)",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "6px 18px",
          borderRadius: 100,
          marginBottom: "2rem",
        }}
      >
        <span
          className="anim-dot"
          style={{
            width: 6,
            height: 6,
            background: "var(--accent)",
            borderRadius: "50%",
            display: "inline-block",
          }}
        />
        {t?.hero?.badge || "Reseller Partner Program"}
      </div>

      {/* Headline */}
      <h1
        style={{
          ...reveal(0.1),
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
          fontWeight: 800,
          lineHeight: 1.06,
          letterSpacing: "-0.03em",
          marginBottom: "1.5rem",
          maxWidth: 800,
        }}
        dangerouslySetInnerHTML={{
          __html: replacePlaceholders(
            t?.hero?.title ||
              'Turn Your Network Into a <span class="text-shimmer">Revenue Stream.</span>',
          ),
        }}
      />

      {/* Subtext - ✅ Now properly replaced */}
      <p
        style={{
          ...reveal(0.2),
          color: "var(--muted)",
          fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
          lineHeight: 1.8,
          maxWidth: 540,
          marginBottom: "2.5rem",
        }}
      >
        {subtitle}
      </p>

      {/* CTAs */}
      <div
        style={{
          ...reveal(0.3),
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "4rem",
        }}
      >
        <a
          href={config.applyUrl}
          className="anim-glow"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent)",
            color: "#FDF8F3",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            padding: "0.85rem 2.2rem",
            borderRadius: 10,
            transition: "transform 0.2s, opacity 0.2s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.transform =
              "translateY(-2px)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")
          }
        >
          {t?.hero?.cta || "Apply as Reseller"} <ArrowRight size={16} />
        </a>
        <a
          href="#how-it-works"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            color: "var(--text)",
            textDecoration: "none",
            fontWeight: 500,
            fontSize: "0.95rem",
            padding: "0.85rem 2rem",
            borderRadius: 10,
            border: "1px solid var(--border2)",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(201,138,84,0.45)";
            (e.currentTarget as HTMLElement).style.background =
              "rgba(201,138,84,0.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(201,138,84,0.25)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {t?.hero?.ctaSecondary || "See How It Works"}
        </a>
      </div>

      {/* Stats strip */}
      <div
        ref={statsRef}
        style={{
          opacity: statsVisible ? 1 : 0,
          transform: statsVisible ? "translateY(0)" : "translateY(28px)",
          transition: "opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "1px",
          background: "var(--border)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
          maxWidth: 680,
          width: "100%",
        }}
      >
        {stats.map(({ value, label, icon: Icon }) => (
          <div
            key={label}
            style={{
              background: "var(--card)",
              padding: "1.5rem 1rem",
              textAlign: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "var(--card2)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "var(--card)")
            }
          >
            <Icon
              size={18}
              style={{ color: "var(--accent)", margin: "0 auto 0.5rem" }}
            />
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.9rem",
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginTop: 5,
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
