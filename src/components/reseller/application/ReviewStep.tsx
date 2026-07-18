// src/components/reseller/application/ReviewStep.tsx
"use client";

import { ChevronLeft, Loader2, ExternalLink } from "lucide-react";

interface ReviewStepProps {
  data: any;
  onSubmit: () => void;
  onPrevious: () => void;
  isSubmitting: boolean;
  error: string | null;
  config: any;
  translations?: any; // ✅ Add translations prop
}

export default function ReviewStep({
  data,
  onSubmit,
  onPrevious,
  isSubmitting,
  error,
  config,
  translations,
}: ReviewStepProps) {
  const t = translations || {};

  const sections = [
    {
      title: t?.review?.accountInfo || "Account Information",
      fields: [
        { label: t?.account?.firstName || "First Name", value: data.firstName },
        { label: t?.account?.lastName || "Last Name", value: data.lastName },
        { label: t?.account?.email || "Email", value: data.email },
        { label: t?.account?.phone || "Phone", value: data.phone },
      ],
    },
    {
      title: t?.review?.storeConfig || "Store Configuration",
      fields: [
        { label: t?.store?.storeName || "Store Name", value: data.storeName },
        {
          label: t?.store?.storeUrl || "Store URL",
          value: `/${config.code}/${data.storeSlug}`,
        },
        {
          label: t?.store?.brandColor || "Brand Color",
          value: data.brandColor,
        },
        {
          label: t?.store?.androidApp || "Android App",
          value: data.androidApp ? "✅ Yes" : "❌ No",
        },
        {
          label: t?.store?.logo || "Logo",
          value: data.logo ? "✅ Uploaded" : "🔄 Will be generated",
        },
      ],
    },
  ];

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
        {t?.review?.title || "Review & Submit"}
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        {t?.review?.subtitle ||
          "Please review your information before submitting."}
      </p>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {sections.map((section) => (
          <div
            key={section.title}
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "1.25rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
                color: "var(--text)",
              }}
            >
              {section.title}
            </h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.25rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {field.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text)",
                      fontWeight: 500,
                    }}
                  >
                    {field.value || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              color: "#EF4444",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Agreement Text */}
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
        >
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--muted)",
              lineHeight: 1.7,
            }}
          >
            {t?.review?.agreement || "By submitting, you agree to the"}{" "}
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
          <ChevronLeft size={18} /> {t?.review?.back || "Back"}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
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
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
            transition: "opacity 0.2s, transform 0.2s",
            flex: 1,
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2
                size={18}
                style={{ animation: "spin 1s linear infinite" }}
              />
              Submitting...
            </>
          ) : (
            t?.review?.submit || "Submit Application"
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
