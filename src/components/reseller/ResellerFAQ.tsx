"use client";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Is there any cost to join the reseller program?",
    a: "No. Joining the Edges Network reseller program is completely free at all tiers. There are no registration fees, monthly charges, or any hidden costs.",
  },
  {
    q: "How and when do I get paid?",
    a: "Commissions are processed and paid every 48 hours after a sale is confirmed. You can withdraw directly to your bank account or any supported mobile money wallet right from your reseller dashboard.",
  },
  {
    q: "Can I upgrade my reseller tier?",
    a: "Yes. As your referral numbers grow, you automatically qualify for higher tiers. Your account manager will notify you when you meet the threshold, and the upgrade happens instantly.",
  },
  {
    q: "Do I need any technical knowledge?",
    a: "Not at all. Your job is simply to share your referral link and refer customers. Our team handles all technical setup, onboarding, and customer service on your behalf.",
  },
  {
    q: "Can I build a team of sub-resellers under me?",
    a: "Yes — Pro and Elite tier resellers can recruit their own sub-resellers. You earn an override commission on every sale your sub-resellers generate, on top of your own direct commissions.",
  },
  {
    q: "What products can I resell?",
    a: "You can resell Edges Network internet plans, data bundles, VTU top-ups, and digital services. New products are added to the reseller catalog regularly.",
  },
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
