// src/app/[countryCode]/dashboard/settings/ProfileSettings.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Phone, Store, Edit2 } from "lucide-react";
import { CountryConfig } from "@/config/countries";
import { Profile } from "@/types/reseller/settings";

interface ProfileSettingsProps {
  profile: Profile;
  config: CountryConfig;
  translations: any;
  onSave: () => void;
}

export default function ProfileSettings({
  profile,
  config,
  translations,
  onSave,
}: ProfileSettingsProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    phone: profile.phone || "",
    brand_color: profile.brand_color || "#C98A54",
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
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          brand_color: formData.brand_color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Update brand color in localStorage
      localStorage.setItem("brandColor", formData.brand_color);

      onSave();
    } catch (err) {
      setError(t?.error || "Failed to save changes");
      console.error("Profile update error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const colorSwatches = [
    "#C98A54",
    "#DC2626",
    "#16A34A",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#DB2777",
    "#0EA5E9",
  ];

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
        {t?.profileInfo || "Profile Information"}
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        {t?.personalInfo || "Update your personal information"}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
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
              {t?.firstName || "First Name"}
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
              <User
                size={16}
                style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
              />
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
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
              {t?.lastName || "Last Name"}
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
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
            {t?.email || "Email"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
              opacity: 0.7,
            }}
          >
            <Mail
              size={16}
              style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
            />
            <input
              type="email"
              value={profile.email || ""}
              disabled
              style={{
                flex: 1,
                padding: "0.6rem 0.75rem",
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                fontSize: "0.9rem",
                outline: "none",
                cursor: "not-allowed",
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
            {t?.emailDisabled || "Email cannot be changed"}
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
            {t?.phone || "Phone"}
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
            <Phone
              size={16}
              style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
            />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+234 800 000 0000"
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
            {t?.brandColor || "Brand Color"}
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {colorSwatches.map((color) => (
              <button
                key={color}
                onClick={() => setFormData({ ...formData, brand_color: color })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: color,
                  border:
                    formData.brand_color === color
                      ? "2.5px solid #FFFFFF"
                      : "2px solid transparent",
                  outline:
                    formData.brand_color === color
                      ? `2px solid ${color}`
                      : "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  transform:
                    formData.brand_color === color ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
            <input
              type="color"
              value={formData.brand_color}
              onChange={(e) =>
                setFormData({ ...formData, brand_color: e.target.value })
              }
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "2px solid var(--border)",
                cursor: "pointer",
                padding: 0,
                background: "transparent",
              }}
            />
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
