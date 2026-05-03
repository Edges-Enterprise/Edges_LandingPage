"use client";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Is there any cost to open my reseller storefront?",
    a: "No. Creating your web storefront on Edges Network is completely free. There are no registration fees, monthly charges, or hidden costs to get started.",
  },
  {
    q: "How quickly does my store go live?",
    a: "Immediately. Fill in your details, submit the form, and your branded storefront is live and ready to accept customers right away, no waiting period.",
  },
  {
    q: "Can I set my own prices?",
    a: "Yes, that's the point. You add your own markup on top of the base price for any data bundle or airtime product. Whatever your customer pays above the base price is your profit, paid directly to you.",
  },
  {
    q: "What is the Android APK option?",
    a: "If you want your own mobile app, select the Android APK option during signup. We'll build a custom-branded app for your store and send the download link to your email within 3–5 business days.",
  },
  {
    q: "Which networks and products can I sell?",
    a: "Your store covers all major Nigerian networks — MTN, Airtel, Glo, and 9mobile — for data bundles and airtime top-ups. New products are added to the catalog regularly.",
  },
  {
    q: "How do I receive my earnings?",
    a: "Your profit is the difference between your set price and the base cost. Earnings are tracked in your dashboard and paid out directly to your bank account or mobile money wallet.",
  }
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{ padding: "90px 5%", maxWidth: 900, margin: "0 auto" }}
    >
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
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
          FAQ
        </div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.9rem, 3.5vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
          }}
        >
          Common questions
        </h2>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1px",
          background: "var(--border)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {faqs.map((f, i) => (
          <div key={i} style={{ background: "var(--card)" }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1.35rem 1.8rem",
                color: open === i ? "var(--accent-lt)" : "var(--text)",
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: "0.95rem",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                if (open !== i)
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(201,138,84,0.03)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "none";
              }}
            >
              <span style={{ paddingRight: "1rem" }}>{f.q}</span>
              <div
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background:
                    open === i
                      ? "rgba(201,138,84,0.15)"
                      : "rgba(201,138,84,0.07)",
                  border: "1px solid rgba(201,138,84,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                }}
              >
                {open === i ? (
                  <Minus size={14} style={{ color: "var(--accent)" }} />
                ) : (
                  <Plus size={14} style={{ color: "var(--accent)" }} />
                )}
              </div>
            </button>
            <div
              style={{
                maxHeight: open === i ? 200 : 0,
                overflow: "hidden",
                transition: "max-height 0.35s ease",
              }}
            >
              <p
                style={{
                  padding: "0 1.8rem 1.4rem",
                  fontSize: "0.9rem",
                  color: "var(--muted)",
                  lineHeight: 1.75,
                }}
              >
                {f.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
