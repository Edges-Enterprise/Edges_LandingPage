// src/components/reseller/application/ComplianceStep.tsx
"use client";

import { ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";

interface ComplianceStepProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function ComplianceStep({
  data,
  onChange,
  onNext,
  onPrevious,
}: ComplianceStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ Automatically agree when user clicks continue
    onChange({ agreed: true });
    onNext();
  };

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        Agreement
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        Please review our policies before continuing.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Agreement Statement */}
        <div
          style={{
            padding: "1.5rem",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--text)",
              lineHeight: 1.8,
            }}
          >
            By continuing, you agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                borderBottom: "1px dashed rgba(201,138,84,0.3)",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderBottomColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderBottomColor =
                  "rgba(201,138,84,0.3)";
              }}
            >
              Terms of Service
            </a>
            ,{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                borderBottom: "1px dashed rgba(201,138,84,0.3)",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderBottomColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderBottomColor =
                  "rgba(201,138,84,0.3)";
              }}
            >
              Privacy Policy
            </a>
            , and{" "}
            <a
              href="/acceptable-use"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                borderBottom: "1px dashed rgba(201,138,84,0.3)",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderBottomColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderBottomColor =
                  "rgba(201,138,84,0.3)";
              }}
            >
              Acceptable Use Policy
            </a>
            .
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "2rem",
          }}
        >
          <button
            type="button"
            onClick={onPrevious}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.8rem 2rem",
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,138,84,0.4)";
              e.currentTarget.style.background = "rgba(201,138,84,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ChevronLeft size={18} /> Back
          </button>
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.8rem 2rem",
              background: "var(--accent)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.2s, transform 0.2s",
              flex: 1,
              justifyContent: "center",
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
            Review Application <ChevronRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
