// src/app/[countryCode]/[storeName]/not-found.tsx
import Link from "next/link";
import { Store, ArrowLeft } from "lucide-react";

export default function StoreNotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
        gap: "1.5rem",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(var(--brand-color-rgb), 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Store size={32} style={{ color: "var(--brand-color)" }} />
      </div>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 800,
          color: "var(--text)",
          margin: 0,
        }}
      >
        Store Not Found
      </h1>

      <p
        style={{
          color: "var(--muted)",
          fontSize: "1rem",
          maxWidth: 400,
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        The store you're looking for doesn't exist or is no longer active.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 2rem",
          background: "var(--brand-color)",
          color: "#FDF8F3",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.95rem",
          transition: "opacity 0.2s, transform 0.2s",
          marginTop: "0.5rem",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.85";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <ArrowLeft size={18} />
        Go Back Home
      </Link>
    </div>
  );
}
