// app/reseller/page.tsx
import "./../reseller.css";
import { ResellerFormClient } from "./ResellerFormClient";

export const metadata = {
  title: "Become a Reseller",
  description:
    "Create your own branded data and airtime store. Set your prices and start earning today.",
};

export default function ResellerPage() {
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
      {/* Background glows */}
      <div
        style={{
          position: "fixed",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          background:
            "radial-gradient(ellipse, rgba(201,138,84,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "5%",
          right: "5%",
          width: 300,
          height: 300,
          background:
            "radial-gradient(ellipse, rgba(201,138,84,0.04) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span className="flex flex-col items-center">
          <div
            style={{
              display: "inline-block",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "1rem",
              background: "rgba(201,138,84,0.08)",
              padding: "4px 14px",
              borderRadius: 100,
              border: "1px solid rgba(201,138,84,0.2)",
            }}
          >
            <span className="flex gap-2 items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 3 2"
                width="18"
                height="12"
                style={{ display: "block" }}
              >
                <rect width="3" height="2" fill="#008753" />
                <rect width="1" height="2" fill="#ffffff" x="1" />
              </svg>
              Ghana
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(201,138,84,0.08)",
              border: "1px solid rgba(201,138,84,0.2)",
              color: "var(--accent)",
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
            Reseller Program
          </div>

        </span>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 4vw, 2.8rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            marginBottom: "0.7rem",
          }}
        >
          Create Your Store
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: 440,
            margin: "0 auto",
            fontSize: "0.95rem",
            lineHeight: 1.7,
          }}
        >
          Fill in your details below and your branded storefront goes live
          immediately.
        </p>
      </div>

      {/* Form */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 520,
        }}
      >
        <ResellerFormClient />
      </div>
    </main>
  );
}
