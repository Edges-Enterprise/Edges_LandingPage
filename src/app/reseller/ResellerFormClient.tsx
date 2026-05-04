// app/reseller/ResellerFormClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Mail,
  Palette,
  Smartphone,
  Check,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { checkStoreName } from "../actions/reseller/checkStoreName";
import { createReseller } from "../actions/reseller/createReseller";


export function ResellerFormClient() {
  const router = useRouter();

  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "custom">("light");
  const [androidApp, setAndroidApp] = useState(false);

  const [storeNameStatus, setStoreNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [storeNameMessage, setStoreNameMessage] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Check store name on blur ─────────────────────
  const handleStoreNameBlur = async () => {
    const name = storeName.toLowerCase().trim();
    if (name.length < 3) {
      setStoreNameStatus("idle");
      setStoreNameMessage("");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      setStoreNameStatus("taken");
      setStoreNameMessage(
        "Only lowercase letters, numbers, and hyphens allowed",
      );
      return;
    }

    setStoreNameStatus("checking");
    const result = await checkStoreName(name);
    if (result.available) {
      setStoreNameStatus("available");
      setStoreNameMessage("This store name is available");
    } else {
      setStoreNameStatus("taken");
      setStoreNameMessage(result.error || "This store name is already taken");
    }
  };

  // ── Validate ─────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!storeName.trim()) errs.storeName = "Store name is required";
    else if (storeName.trim().length < 3)
      errs.storeName = "At least 3 characters";
    else if (!/^[a-z0-9-]+$/.test(storeName.trim()))
      errs.storeName = "Only letters, numbers, hyphens";

    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Enter a valid email";

    if (storeNameStatus === "taken")
      errs.storeName = "Please choose a different store name";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const fd = new FormData();
    fd.append("storeName", storeName.trim());
    fd.append("email", email.trim());
    fd.append("theme", theme);
    fd.append("androidApp", androidApp.toString());

    try {
      const result = await createReseller(fd);
      if (result.error) {
        setErrors({ form: result.error });
      } else if (result.success) {
        router.push(
          `/reseller/success?store=${storeName.trim().toLowerCase()}`,
        );
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Theme options ────────────────────────────────
  const themes = [
    {
      value: "light" as const,
      label: "Light",
      gradient: "linear-gradient(135deg, #FFFFFF, #F0F0F0)",
      border: "#D1D5DB",
    },
    {
      value: "dark" as const,
      label: "Dark",
      gradient: "linear-gradient(135deg, #1F2937, #111827)",
      border: "#374151",
    },
    {
      value: "custom" as const,
      label: "Custom",
      gradient: "linear-gradient(135deg, #8B5CF6, #6366F1)",
      border: "#7C3AED",
    },
  ];

  const inputStyle = (
    hasError: boolean,
    isSuccess: boolean,
  ): React.CSSProperties => ({
    width: "100%",
    padding: "0.85rem 1rem",
    background: "var(--bg2)",
    border: `1.5px solid ${
      hasError ? "#EF4444" : isSuccess ? "#6EBD8A" : "var(--border)"
    }`,
    borderRadius: 12,
    color: "var(--text)",
    fontSize: "0.95rem",
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
    paddingRight: storeNameStatus !== "idle" ? "2.5rem" : "1rem",
  });

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border2)",
        borderRadius: 20,
        padding: "2.5rem 2rem",
      }}
    >
      {/* ── Store Name ─────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
          }}
        >
          <Store size={16} style={{ color: "var(--accent)" }} />
          Store Name
        </label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value.toLowerCase());
              setStoreNameStatus("idle");
              setStoreNameMessage("");
            }}
            onBlur={handleStoreNameBlur}
            placeholder="my-store"
            style={inputStyle(
              !!errors.storeName,
              storeNameStatus === "available",
            )}
          />
          <div
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {storeNameStatus === "checking" && (
              <Loader2
                size={18}
                style={{
                  color: "var(--accent)",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            {storeNameStatus === "available" && (
              <Check size={18} style={{ color: "#6EBD8A" }} />
            )}
            {storeNameStatus === "taken" && (
              <X size={18} style={{ color: "#EF4444" }} />
            )}
          </div>
        </div>
        {storeNameMessage && !errors.storeName && (
          <p
            style={{
              fontSize: "0.78rem",
              marginTop: 6,
              color: storeNameStatus === "available" ? "#6EBD8A" : "#EF4444",
            }}
          >
            {storeNameMessage}
          </p>
        )}
        {errors.storeName && (
          <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
            {errors.storeName}
          </p>
        )}
        <p style={{ fontSize: "0.78rem", color: "var(--dim)", marginTop: 6 }}>
          {process.env.NEXT_PUBLIC_STORE_URL}/{storeName || "storename"}
        </p>
      </div>

      {/* ── Email ──────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
          }}
        >
          <Mail size={16} style={{ color: "var(--accent)" }} />
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle(!!errors.email, false)}
        />
        {errors.email && (
          <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
            {errors.email}
          </p>
        )}
      </div>

      {/* ── Theme ──────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.7rem",
          }}
        >
          <Palette size={16} style={{ color: "var(--accent)" }} />
          Store Theme
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {themes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              style={{
                padding: "1rem 0.75rem",
                borderRadius: 12,
                border:
                  theme === t.value
                    ? `2px solid var(--accent)`
                    : `1px solid var(--border)`,
                background:
                  theme === t.value ? "rgba(201,138,84,0.08)" : "var(--bg2)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 32,
                  borderRadius: 6,
                  background: t.gradient,
                  border: `1px solid ${t.border}`,
                  marginBottom: 8,
                }}
              />
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color:
                    theme === t.value ? "var(--accent-lt)" : "var(--muted)",
                }}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Android App ────────────────────────── */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.2rem",
            background: "var(--bg2)",
            borderRadius: 12,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Smartphone size={18} style={{ color: "var(--accent)" }} />
            <div>
              <p
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Android App
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--dim)",
                  marginTop: 2,
                }}
              >
                Get a branded APK in 3–5 business days
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAndroidApp(!androidApp)}
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              border: "none",
              background: androidApp ? "var(--accent)" : "var(--dim)",
              position: "relative",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#FDF8F3",
                position: "absolute",
                top: 3,
                left: androidApp ? 23 : 3,
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>
      </div>

      {/* ── Form Error ─────────────────────────── */}
      {errors.form && (
        <div
          style={{
            padding: "0.9rem 1rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 10,
            marginBottom: "1.2rem",
          }}
        >
          <p
            style={{
              fontSize: "0.85rem",
              color: "#FCA5A5",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <X size={16} />
            {errors.form}
          </p>
        </div>
      )}

      {/* ── Submit ─────────────────────────────── */}
      <button
        type="submit"
        disabled={isSubmitting || storeNameStatus === "taken"}
        style={{
          width: "100%",
          padding: "0.9rem",
          background: "var(--accent)",
          color: "#FDF8F3",
          border: "none",
          borderRadius: 12,
          fontSize: "1rem",
          fontWeight: 600,
          fontFamily: "'Instrument Sans', system-ui, sans-serif",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: isSubmitting ? 0.7 : 1,
          transition: "opacity 0.2s, transform 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting)
            (e.currentTarget as HTMLElement).style.transform =
              "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2
              size={18}
              style={{ animation: "spin 1s linear infinite" }}
            />
            Creating Your Store...
          </>
        ) : (
          <>
            Create My Store <ArrowRight size={17} />
          </>
        )}
      </button>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--dim)",
          marginTop: "1rem",
        }}
      >
        By creating a store, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>Terms of Service</a>.
      </p>
    </form>
  );
}
