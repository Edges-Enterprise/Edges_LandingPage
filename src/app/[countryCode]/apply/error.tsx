// src/app/[countryCode]/apply/error.tsx
"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ApplyError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application form error:", error);
  }, [error]);

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
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(239,68,68,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle size={32} style={{ color: "#EF4444" }} />
      </div>

      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--text)",
          margin: 0,
        }}
      >
        Something went wrong
      </h2>

      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.95rem",
          maxWidth: 400,
          margin: 0,
        }}
      >
        {error.message ||
          "We encountered an error while loading the application form. Please try again."}
      </p>

      <button
        onClick={reset}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 2rem",
          background: "var(--accent)",
          color: "#FDF8F3",
          border: "none",
          borderRadius: 8,
          fontSize: "0.95rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "opacity 0.2s, transform 0.2s",
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
        <RefreshCw size={18} />
        Try Again
      </button>
    </div>
  );
}
