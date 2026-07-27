"use client";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Zap,
  Package,
  PencilLine,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";

const benefits = [
  {
    icon: PencilLine,
    title: "You Set the Prices",
    desc: "Add any markup you want to data bundles and airtime. Your store, your margins, your profit — full control, always.",
  },
  {
    icon: Zap,
    title: "Store Goes Live Instantly",
    desc: "Fill in your details and your branded storefront is ready immediately — no waiting, no approvals, no delays.",
  },
  {
    icon: Smartphone,
    title: "Optional Android App",
    desc: "Want your own app? Select the APK option at signup and receive your custom-branded Android app by email within 3–5 business days.",
  },
  {
    icon: BarChart3,
    title: "Live Sales Dashboard",
    desc: "Track every order, customer, and earning in real time from your personal reseller portal.",
  },
  {
    icon: Package,
    title: "All Networks Covered",
    desc: "Sell MTN, Airtel, Glo, and 9mobile data bundles and airtime — all from a single storefront.",
  },
  {
    icon: ShieldCheck,
    title: "Backed by Telcos",
    desc: "Your store runs on the same trusted infrastructure powering thousands of Nigerians daily. Reliable delivery, every time.",
  },
];

export default function Benefits() {
  const date = new Date();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();

  // Separate observers for each side so they can animate independently
  const [leftRef, leftVisible] = useInView(0.15);
  const [rightRef, rightVisible] = useInView(0.15);

  // Count-up for sales — starts when dashboard card enters view
  const targetSales = 312000;
  const [sales, setSales] = useState(0);

  useEffect(() => {
    if (!rightVisible) return;
    let start = 0;
    const duration = 1400;
    const increment = targetSales / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= targetSales) { start = targetSales; clearInterval(timer); }
      setSales(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [rightVisible]);

  const formatNaira = (val: number): string =>
    `₦ ${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // Staggered reveal helper
  const reveal = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
  });

  return (
    <section
      id="benefits"
      style={{ padding: "90px 5%", maxWidth: 1200, margin: "0 auto" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
          alignItems: "center",
        }}
      >
        {/* LEFT — benefits grid */}
        <div ref={leftRef}>
          <div style={reveal(leftVisible, 0)}>
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
              Why Telcos
            </div>
          </div>

          <h2
            style={{
              ...reveal(leftVisible, 0.1),
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.9rem, 3.5vw, 3rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              marginBottom: "2.5rem",
            }}
          >
            Everything you need
            <br />
            to <em>make money</em>
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}
          >
            {benefits.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                style={{
                  ...reveal(leftVisible, 0.15 + i * 0.07),
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(201,138,84,0.1)",
                    border: "1px solid rgba(201,138,84,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.3rem", color: "var(--text)" }}>
                    {title}
                  </h4>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — dashboard card */}
        <div
          ref={rightRef}
          style={{
            ...reveal(rightVisible, 0.1),
            background: "var(--card)",
            border: "1px solid var(--border2)",
            borderRadius: 20,
            padding: "2rem",
            position: "relative",
            overflow: "hidden",
          }}
          className="anim-float"
        >
          <div
            style={{
              position: "absolute",
              bottom: -60,
              right: -60,
              width: 220,
              height: 220,
              background: "radial-gradient(circle, rgba(201,138,84,0.1), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                My Store Dashboard
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                {month} {year}
              </div>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--green)", background: "rgba(110,189,138,0.12)", border: "1px solid rgba(110,189,138,0.25)", padding: "3px 10px", borderRadius: 100 }}>
              ● Live
            </div>
          </div>

          {/* Stats rows */}
          {[
            { label: `Total Sales (${month})`, value: formatNaira(sales), up: true },
            { label: "Orders This Week", value: "94 orders", up: false },
            { label: `My Profit (${month})`, value: "₦ 47,800", up: true },
            { label: "My Markup (avg)", value: "18% above base", accent: true },
          ].map(({ label, value, up, accent }) => (
            <div
              key={label}
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0.9rem 1.1rem",
                marginBottom: "0.65rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{label}</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1rem", color: accent ? "var(--accent)" : up ? "var(--green)" : "var(--text)" }}>
                {value}
              </span>
            </div>
          ))}

          {/* Progress bar */}
          <div style={{ marginTop: "1.3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)", marginBottom: 6 }}>
              <span>Monthly sales target</span>
              <span>74%</span>
            </div>
            <div style={{ height: 6, background: "var(--bg2)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: rightVisible ? "74%" : "0%",
                  borderRadius: 3,
                  background: "linear-gradient(90deg, var(--accent), #DEB082)",
                  transition: "width 1.2s ease 0.3s",
                }}
              />
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ marginTop: "1.5rem", display: "flex", gap: 6, alignItems: "flex-end", height: 48 }}>
            {[30, 55, 40, 70, 60, 85, 74].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: rightVisible ? `${h}%` : "0%",
                  background: i === 6 ? "var(--accent)" : "rgba(201,138,84,0.2)",
                  borderRadius: "3px 3px 0 0",
                  transition: `height 0.6s ease ${0.1 + i * 0.07}s`,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--dim)", marginTop: 4, textAlign: "right" }}>
            Weekly sales trend
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          section#benefits > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
