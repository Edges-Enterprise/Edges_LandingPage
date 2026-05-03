// app/reseller/success/page.tsx

import Link from "next/link";
import { Check, ArrowRight, ExternalLink } from "lucide-react";
import "./../../reseller.css";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store } = await searchParams;
  const storeName = store || "your-store";
  const displayName = storeName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 5% 80px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 500,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Success icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(110,189,138,0.12)",
            border: "2px solid rgba(110,189,138,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <Check size={36} style={{ color: "#6EBD8A" }} />
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
            fontWeight: 800,
            marginBottom: "0.8rem",
          }}
        >
          Store Created!
        </h1>

        <p
          style={{
            color: "var(--muted)",
            marginBottom: "1.5rem",
            lineHeight: 1.7,
          }}
        >
          Your store{" "}
          <strong style={{ color: "var(--accent-lt)" }}>{displayName}</strong>{" "}
          has been registered and will be live at:
        </p>

        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.8rem 1.2rem",
            marginBottom: "2rem",
            display: "inline-block",
          }}
        >
          <code style={{ color: "var(--accent-lt)", fontSize: "0.95rem" }}>
            {process.env.NEXT_PUBLIC_STORE_URL}/{storeName}
          </code>
        </div>

        {/* Timeline */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border2)",
            borderRadius: 16,
            padding: "1.5rem",
            marginBottom: "2rem",
            textAlign: "left",
          }}
        >
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            What happens next?
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
          >
            {[
              "We review your store (usually within 72 hours)",
              "You receive a confirmation email",
              "Log in to your dashboard and set your prices",
              "Share your store link and start earning",
            ].map((step, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(201,138,84,0.15)",
                    border: "1px solid rgba(201,138,84,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href={`/${storeName}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--accent)",
              color: "#FDF8F3",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              padding: "0.75rem 1.5rem",
              borderRadius: 10,
              transition: "opacity 0.2s",
            }}
          >
            Preview Store <ExternalLink size={15} />
          </Link>
          <Link
            href="/r-dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              color: "var(--text)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.9rem",
              padding: "0.75rem 1.5rem",
              borderRadius: 10,
              border: "1px solid var(--border2)",
              transition: "border-color 0.2s",
            }}
          >
            Go to Dashboard <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}
