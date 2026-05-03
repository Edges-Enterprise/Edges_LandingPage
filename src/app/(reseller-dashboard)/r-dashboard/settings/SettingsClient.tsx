// app/(reseller-dashboard)/r-dashboard/settings/SettingsClient.tsx

"use client";

import { useState } from "react";
import { Card } from "../Card";
import type { Reseller } from "@/types";
import { createServerClient } from "@/lib/supabase/client";
import { Loader2, Check, Store, Mail, Palette } from "lucide-react";

// We need a client-side supabase instance
// Create this file if it doesn't exist

export function SettingsClient({ reseller }: { reseller: Reseller }) {
  const [storeName, setStoreName] = useState(reseller.store_name);
  const [email, setEmail] = useState(reseller.email);
  const [theme, setTheme] = useState(reseller.theme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    // Simulate save - in production, call a server action
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setMessage({ type: "success", text: "Settings saved successfully" });
    setSaving(false);

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.3rem",
          }}
        >
          Settings
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Manage your store settings and preferences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "0.9rem 1.2rem",
            borderRadius: 10,
            background:
              message.type === "success"
                ? "rgba(110,189,138,0.1)"
                : "rgba(239,68,68,0.1)",
            border:
              message.type === "success"
                ? "1px solid rgba(110,189,138,0.25)"
                : "1px solid rgba(239,68,68,0.25)",
            color: message.type === "success" ? "#6EBD8A" : "#F87171",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {message.type === "success" && <Check size={16} />}
          {message.text}
        </div>
      )}

      {/* Store Information */}
      <Card>
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
            color: "var(--text)",
            fontSize: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <Store size={18} style={{ color: "var(--accent)" }} />
          Store Information
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value.toLowerCase())}
              style={inputStyle}
            />
            <p
              style={{ fontSize: "0.75rem", color: "var(--dim)", marginTop: 4 }}
            >
              edges-landing.vercel.app/{storeName}
            </p>
          </div>
          <div>
            <label style={labelStyle}>
              <Mail size={14} style={{ display: "inline", marginRight: 4 }} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </Card>

      {/* Theme */}
      <Card>
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
            color: "var(--text)",
            fontSize: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <Palette size={18} style={{ color: "var(--accent)" }} />
          Store Theme
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              style={{
                padding: "1rem",
                borderRadius: 12,
                border:
                  theme === t.value
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border)",
                background:
                  theme === t.value ? "rgba(201,138,84,0.08)" : "var(--bg2)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 8,
                  background: t.gradient,
                  border: `1px solid ${t.border}`,
                  marginBottom: 10,
                }}
              />
              <span
                style={{
                  fontSize: "0.85rem",
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
      </Card>

      {/* Store Status */}
      <Card>
        <h2
          style={{
            fontWeight: 600,
            color: "var(--text)",
            fontSize: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          Store Status
        </h2>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "0.4rem 0.9rem",
            borderRadius: 100,
            fontSize: "0.82rem",
            fontWeight: 600,
            background:
              reseller.status === "active"
                ? "rgba(110,189,138,0.12)"
                : reseller.status === "pending"
                  ? "rgba(251,191,36,0.12)"
                  : "rgba(239,68,68,0.12)",
            color:
              reseller.status === "active"
                ? "#6EBD8A"
                : reseller.status === "pending"
                  ? "#FBBF24"
                  : "#F87171",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "currentColor",
            }}
          />
          {reseller.status.charAt(0).toUpperCase() + reseller.status.slice(1)}
        </div>
      </Card>

      {/* Save Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "0.75rem 2rem",
            background: "var(--accent)",
            border: "none",
            borderRadius: 10,
            color: "#FDF8F3",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving && (
            <Loader2
              size={16}
              style={{ animation: "spin 1s linear infinite" }}
            />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 1rem",
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text)",
  fontSize: "0.9rem",
  outline: "none",
  fontFamily: "inherit",
};
