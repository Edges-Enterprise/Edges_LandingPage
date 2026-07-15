// src/components/reseller/country/CountryCTA.tsx
"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import { CountryConfig } from "@/config/countries";

interface CountryCTAProps {
  config: CountryConfig;
  translations: any;
}

export default function CountryCTA({ config, translations }: CountryCTAProps) {
  const t = translations;

  // ✅ Helper function to replace placeholders
  const replacePlaceholders = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/{monthlyProfit}/g, config.stats.monthlyProfit)
      .replace(/{apkDeliveryDays}/g, config.stats.apkDeliveryDays);
  };

  const subtitle = replacePlaceholders(
    t?.cta?.subtitle ||
      `Sign up in minutes, set your branded storefront and start earning. Want an Android app too? Select the APK option and we'll deliver it to your inbox in {apkDeliveryDays} business days.`,
  );

  return (
    <section
      id="join"
      style={{ padding: "0 5% 90px", maxWidth: 1200, margin: "0 auto" }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border2)",
          borderRadius: 24,
          padding: "5rem 3rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(201,138,84,0.12), transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            right: -60,
            width: 250,
            height: 250,
            background:
              "radial-gradient(circle, rgba(201,138,84,0.07), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            left: -40,
            width: 200,
            height: 200,
            background:
              "radial-gradient(circle, rgba(201,138,84,0.05), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-block",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "1.2rem",
              background: "rgba(201,138,84,0.08)",
              padding: "4px 14px",
              borderRadius: 100,
              border: "1px solid rgba(201,138,84,0.2)",
            }}
          >
            {t?.cta?.badge || "Ready to Start?"}
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 4.5vw, 3.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: "1.2rem",
            }}
            dangerouslySetInnerHTML={{
              __html: replacePlaceholders(
                t?.cta?.title ||
                  'Join the Edges Network<br /><span class="text-shimmer">Reseller Program Today</span>',
              ),
            }}
          />
          <p
            style={{
              color: "var(--muted)",
              maxWidth: 480,
              margin: "0 auto 2.8rem",
              fontSize: "1rem",
              lineHeight: 1.75,
            }}
          >
            {subtitle}
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <a
              href={config.applyUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--accent)",
                color: "#FDF8F3",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "1rem",
                padding: "0.9rem 2.4rem",
                borderRadius: 12,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = "0 12px 30px rgba(201,138,84,0.35)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              {t?.cta?.button || "Apply as a Reseller"} <ArrowRight size={17} />
            </a>
            <a
              href="https://wa.me/2347057517841"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "1rem",
                padding: "0.9rem 2rem",
                borderRadius: 12,
                border: "1px solid var(--border2)",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(201,138,84,0.45)";
                el.style.background = "rgba(201,138,84,0.06)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(201,138,84,0.25)";
                el.style.background = "transparent";
              }}
            >
              <MessageCircle size={17} />{" "}
              {t?.cta?.buttonWhatsApp || "Chat on WhatsApp"}
            </a>
          </div>
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.82rem",
              color: "var(--dim)",
            }}
          >
            {t?.cta?.footer ||
              "✓ Free to join · ✓ No contracts · ✓ Payouts everyday"}
          </p>
        </div>
      </div>
    </section>
  );
}
