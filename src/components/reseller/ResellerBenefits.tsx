"use client";
import {
  BarChart3,
  Zap,
  Package,
  Users,
  TrendingUp,
  Shield,
} from "lucide-react";

const benefits = [
  {
    icon: BarChart3,
    title: "Live Earnings Dashboard",
    desc: "Track every referral, sale, and payout in real time from your personalized reseller portal.",
  },
  {
    icon: Zap,
    title: "Fast 48-Hour Payouts",
    desc: "No waiting weeks. Commissions are processed and paid within 48 hours of sale confirmation.",
  },
  {
    icon: Package,
    title: "Ready-Made Marketing Kits",
    desc: "Get banners, flyers, social media graphics, and email templates at zero extra cost.",
  },
  {
    icon: Users,
    title: "Sub-Reseller Network",
    desc: "Build your own team and earn override commissions on every sale your sub-resellers make.",
  },
  {
    icon: TrendingUp,
    title: "Performance Bonuses",
    desc: "Hit monthly targets and unlock bonus commissions, gift cards, and exclusive rewards.",
  },
  {
    icon: Shield,
    title: "Dedicated Support",
    desc: "Pro and Elite resellers get a named account manager plus priority WhatsApp response.",
  },
];

export default function Benefits() {
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
        <div>
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
            Why Edges Network
          </div>
          <h2
            style={{
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
            to <em>succeed as a reseller</em>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}
          >
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
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
                  <h4
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      marginBottom: "0.3rem",
                      color: "var(--text)",
                    }}
                  >
                    {title}
                  </h4>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                      lineHeight: 1.65,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
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
              background:
                "radial-gradient(circle, rgba(201,138,84,0.1), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                Reseller Dashboard
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  marginTop: 2,
                }}
              >
                May 2025 — Pro Tier
              </div>
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--green)",
                background: "rgba(110,189,138,0.12)",
                border: "1px solid rgba(110,189,138,0.25)",
                padding: "3px 10px",
                borderRadius: 100,
              }}
            >
              ● Live
            </div>
          </div>
          {[
            { label: "Total Earnings (May)", value: "₦ 184,500", up: true },
            { label: "Active Referrals", value: "47 clients", up: false },
            { label: "Pending Payout", value: "₦ 22,000", up: true },
            {
              label: "Current Commission Rate",
              value: "20% — Pro",
              accent: true,
            },
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
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: accent
                    ? "var(--accent)"
                    : up
                      ? "var(--green)"
                      : "var(--text)",
                }}
              >
                {value}
              </span>
            </div>
          ))}
          <div style={{ marginTop: "1.3rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginBottom: 6,
              }}
            >
              <span>Monthly target progress</span>
              <span>74%</span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--bg2)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                className="anim-bar"
                style={{
                  height: "100%",
                  width: "74%",
                  borderRadius: 3,
                  background: "linear-gradient(90deg, var(--accent), #DEB082)",
                }}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: 6,
              alignItems: "flex-end",
              height: 48,
            }}
          >
            {[30, 55, 40, 70, 60, 85, 74].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  background:
                    i === 6 ? "var(--accent)" : "rgba(201,138,84,0.2)",
                  borderRadius: "3px 3px 0 0",
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            Weekly earnings trend
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
