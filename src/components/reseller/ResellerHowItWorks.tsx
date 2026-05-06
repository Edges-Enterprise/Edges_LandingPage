"use client";
import { UserPlus, Wallet, PencilLine, Store } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: UserPlus,
    title: "Fill Your Details",
    desc: "Complete a quick signup form with your business name and preferences. No upfront cost, no technical experience needed.",
  },
  {
    num: "02",
    icon: Store,
    title: "Get Your Storefront Instantly",
    desc: "Your personal branded store goes live immediately after signup, ready to accept customers and process orders right away.",
  },
  {
    num: "03",
    icon: PencilLine,
    title: "Set Your Own Prices",
    desc: "Add your markup to any data bundle or airtime product. You control your margins; your customers pay your price.",
  },
  {
    num: "04",
    icon: Wallet,
    title: "Earn Directly",
    desc: "Every sale made through your storefront earns you the difference between your markup and the base price, paid straight to you.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
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
          How It Works
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
          Start earning in <em>4 simple steps</em>
        </h2>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: 500,
            fontSize: "1rem",
            lineHeight: 1.75,
          }}
        >
          Fill in your details, pick your prices, and start making profits today.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {steps.map(({ num, icon: Icon, title, desc }, i) => (
          <div
            key={num}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "2rem 1.8rem",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.25s, transform 0.25s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(201,138,84,0.3)";
              el.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(201,138,84,0.12)";
              el.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, rgba(201,138,84,${0.15 + i * 0.1}), transparent)`,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(201,138,84,0.1)",
                  border: "1px solid rgba(201,138,84,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} style={{ color: "var(--accent)" }} />
              </div>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "2.2rem",
                  fontWeight: 700,
                  color: "rgba(201,138,84,0.18)",
                  lineHeight: 1,
                }}
              >
                {num}
              </span>
            </div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "0.6rem",
                color: "var(--text)",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--muted)",
                lineHeight: 1.7,
              }}
            >
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
