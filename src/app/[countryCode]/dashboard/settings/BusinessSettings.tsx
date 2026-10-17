// src/app/[countryCode]/dashboard/settings/BusinessSettings.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Store, Link, Palette, Image } from "lucide-react";
import { CountryConfig } from "@/config/countries";

interface BusinessSettingsProps {
  application: {
    id: string;
    store_name: string;
    store_slug: string;
    brand_color: string;
    logo_url?: string;
    notification_icon_url?: string;
  };
  config: CountryConfig;
  translations: any;
  onSave: () => void;
}

export default function BusinessSettings({
  application,
  config,
  translations,
  onSave,
}: BusinessSettingsProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    store_name: application.store_name || "",
    store_slug: application.store_slug || "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("global_reseller_applications")
        .update({
          store_name: formData.store_name,
          store_slug: formData.store_slug,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      onSave();
    } catch (err) {
      setError(t?.error || "Failed to save business settings");
      console.error("Business settings error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const storeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://telcos.opik.net"}/${application.store_slug}`;

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
        }}
      >
        {t?.business || "Business Settings"}
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        {t?.businessInfo || "Manage your store information"}
      </p>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            color: "#EF4444",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", maxWidth: 500 }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.storeName || "Store Name"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Store
              size={16}
              style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
            />
            <input
              type="text"
              name="store_name"
              value={formData.store_name}
              onChange={handleChange}
              style={{
                flex: 1,
                padding: "0.6rem 0.75rem",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.storeSlug || "Store URL"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Link
              size={16}
              style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
            />
            <input
              type="text"
              name="store_slug"
              value={formData.store_slug}
              onChange={handleChange}
              style={{
                flex: 1,
                padding: "0.6rem 0.75rem",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              marginTop: "0.25rem",
            }}
          >
            {t?.storeUrlInfo || "Your store URL"}:{" "}
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--brand-color)", textDecoration: "none" }}
            >
              {storeUrl}
            </a>
          </p>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.brandColor || "Brand Color"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.75rem",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: application.brand_color || "#C98A54",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.85rem",
                color: "var(--muted)",
              }}
            >
              {application.brand_color || "#C98A54"}
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                marginLeft: "auto",
              }}
            >
              {t?.canChangeInProfile || "Can change in Profile settings"}
            </span>
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.storeLogo || "Store Logo"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.75rem",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <Image size={16} style={{ color: "var(--dim)" }} />
            {application.logo_url ? (
              <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                {t?.logoUploaded || "Logo uploaded"}
              </span>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "var(--dim)" }}>
                {t?.noLogo || "No logo uploaded"}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            padding: "0.75rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "all 0.2s",
            marginTop: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {isLoading
            ? t?.saving || "Saving..."
            : t?.saveChanges || "Save Changes"}
        </button>
      </div>
    </div>
  );
}
