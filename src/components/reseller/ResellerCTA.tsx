"use client";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function CTA() {
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
            Ready to Start?
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
          >
            Join the Edges Network
            <br />
            <span className="text-shimmer">Reseller Program Today</span>
          </h2>
          <p
            style={{
              color: "var(--muted)",
              maxWidth: 480,
              margin: "0 auto 2.8rem",
              fontSize: "1rem",
              lineHeight: 1.75,
            }}
          >
            Sign up in minutes, get your dashboard, and start earning
            commissions bringing Edges Network services to your community.
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
              href="https://edgesnetwork.com/reseller-signup"
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
              Apply as a Reseller <ArrowRight size={17} />
            </a>
            <a
              href="https://wa.me/2348000000000"
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
              <MessageCircle size={17} /> Chat on WhatsApp
            </a>
          </div>
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.82rem",
              color: "var(--dim)",
            }}
          >
            ✓ Free to join &nbsp;·&nbsp; ✓ No contracts &nbsp;·&nbsp; ✓ Payouts
            every 48 hours
          </p>
        </div>
      </div>
    </section>
  );
}
