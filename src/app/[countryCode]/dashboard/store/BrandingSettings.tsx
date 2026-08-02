// src/app/[countryCode]/dashboard/store/BrandingSettings.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Image, Upload, X, Check } from "lucide-react";
import { CountryConfig } from "@/config/countries";

interface BrandingSettingsProps {
  application: {
    id: string;
    brand_color: string;
    logo_url?: string;
    notification_icon_url?: string;
  };
  config: CountryConfig;
  translations: any;
  onSave: () => void;
  onUpdate: (data: any) => void;
}

export default function BrandingSettings({
  application,
  config,
  translations,
  onSave,
  onUpdate,
}: BrandingSettingsProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [brandColor, setBrandColor] = useState(application.brand_color || "#C98A54");
  const [logoPreview, setLogoPreview] = useState<string | null>(application.logo_url || null);
  const [notificationIconPreview, setNotificationIconPreview] = useState<string | null>(
    application.notification_icon_url || null
  );
  const [error, setError] = useState<string | null>(null);

  const colorSwatches = [
    "#C98A54", "#DC2626", "#16A34A", "#3B82F6", 
    "#8B5CF6", "#F59E0B", "#DB2777", "#0EA5E9",
    "#10B981", "#6366F1", "#EC4899", "#14B8A6",
  ];

  const handleFileUpload = async (file: File, type: "logo" | "notification") => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("applicationId", application.id);

      const response = await fetch(`/api/upload/${application.id}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      // Update application with new asset URL
      const updateField = type === "logo" ? "logo_url" : "notification_icon_url";
      const { error } = await supabase
        .from("global_reseller_applications")
        .update({ [updateField]: data.url, updated_at: new Date().toISOString() })
        .eq("id", application.id);

      if (error) throw error;

      if (type === "logo") {
        setLogoPreview(data.url);
      } else {
        setNotificationIconPreview(data.url);
      }

      onUpdate({ ...application, [updateField]: data.url });
      onSave();
    } catch (error) {
      setError(t?.uploadError || "Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "notification") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t?.invalidFileType || "Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t?.fileTooLarge || "File size must be less than 5MB");
      return;
    }

    handleFileUpload(file, type);
    e.target.value = "";
  };

  const handleRemoveAsset = async (type: "logo" | "notification") => {
    setIsLoading(true);
    setError(null);

    try {
      const updateField = type === "logo" ? "logo_url" : "notification_icon_url";
      const { error } = await supabase
        .from("global_reseller_applications")
        .update({ [updateField]: null, updated_at: new Date().toISOString() })
        .eq("id", application.id);

      if (error) throw error;

      if (type === "logo") {
        setLogoPreview(null);
      } else {
        setNotificationIconPreview(null);
      }

      onUpdate({ ...application, [updateField]: null });
      onSave();
    } catch (error) {
      setError(t?.removeError || "Failed to remove asset");
      console.error("Remove error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = async (color: string) => {
    setBrandColor(color);
    setError(null);

    try {
      const { error } = await supabase
        .from("global_reseller_applications")
        .update({ brand_color: color, updated_at: new Date().toISOString() })
        .eq("id", application.id);

      if (error) throw error;

      // Update localStorage for dashboard theme
      localStorage.setItem("brandColor", color);

      onUpdate({ ...application, brand_color: color });
      onSave();
    } catch (error) {
      setError(t?.colorError || "Failed to update brand color");
      console.error("Color update error:", error);
    }
  };

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
        {t?.branding || "Branding"}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {t?.brandingDescription || "Customize your store's visual identity"}
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

      <div style={{ display: "grid", gap: "1.5rem", maxWidth: 500 }}>
        {/* Brand Color */}
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
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            {colorSwatches.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: color,
                  border: brandColor === color
                    ? "2.5px solid #FFFFFF"
                    : "2px solid transparent",
                  outline: brandColor === color ? `2px solid ${color}` : "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  transform: brandColor === color ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
            <input
              type="color"
              value={brandColor}
              onChange={(e) => handleColorChange(e.target.value)}
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
                width: 20,
                height: 20,
                borderRadius: 4,
                background: brandColor,
                flexShrink: 0,
              }}
            />
            <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--muted)" }}>
              {brandColor.toUpperCase()}
            </span>
            {brandColor === application.brand_color && (
              <span style={{ fontSize: "0.7rem", color: "#6EBD8A", marginLeft: "auto" }}>
                {t?.saved || "Saved"}
              </span>
            )}
          </div>
        </div>

        {/* Logo */}
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
            {t?.logo || "Store Logo"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              background: "var(--bg2)",
              border: "1px dashed var(--border)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: logoPreview ? `url(${logoPreview}) center/cover` : "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {!logoPreview && <Image size={24} style={{ color: "var(--dim)" }} />}
            </div>
            <div style={{ flex: 1 }}>
              {logoPreview ? (
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)", margin: 0 }}>
                    {t?.logoUploaded || "Logo uploaded"}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--brand-color)",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      {t?.changeLogo || "Change Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, "logo")}
                        style={{ display: "none" }}
                      />
                    </label>
                    <button
                      onClick={() => handleRemoveAsset("logo")}
                      style={{
                        fontSize: "0.75rem",
                        color: "#EF4444",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      {t?.removeLogo || "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "var(--dim)", margin: 0 }}>
                    {t?.noLogo || "No logo uploaded"}
                  </p>
                  <label
                    style={{
                      display: "inline-block",
                      marginTop: "0.25rem",
                      padding: "0.25rem 0.75rem",
                      background: "var(--brand-color)",
                      color: "#FDF8F3",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.85";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    <Upload size={12} style={{ marginRight: "0.25rem" }} />
                    {t?.uploadLogo || "Upload Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, "logo")}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--dim)", marginTop: "0.25rem" }}>
            {t?.supportedFormats || "PNG, JPG, SVG (max 5MB)"}
          </p>
        </div>

        {/* Notification Icon */}
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
            {t?.notificationIcon || "Notification Icon"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              background: "var(--bg2)",
              border: "1px dashed var(--border)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: notificationIconPreview ? `url(${notificationIconPreview}) center/cover` : "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {!notificationIconPreview && <Image size={24} style={{ color: "var(--dim)" }} />}
            </div>
            <div style={{ flex: 1 }}>
              {notificationIconPreview ? (
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)", margin: 0 }}>
                    {t?.notificationIconUploaded || "Notification icon uploaded"}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--brand-color)",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      {t?.changeNotificationIcon || "Change"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, "notification")}
                        style={{ display: "none" }}
                      />
                    </label>
                    <button
                      onClick={() => handleRemoveAsset("notification")}
                      style={{
                        fontSize: "0.75rem",
                        color: "#EF4444",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      {t?.removeNotificationIcon || "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "var(--dim)", margin: 0 }}>
                    {t?.noNotificationIcon || "No notification icon uploaded"}
                  </p>
                  <label
                    style={{
                      display: "inline-block",
                      marginTop: "0.25rem",
                      padding: "0.25rem 0.75rem",
                      background: "var(--brand-color)",
                      color: "#FDF8F3",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.85";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    <Upload size={12} style={{ marginRight: "0.25rem" }} />
                    {t?.uploadNotificationIcon || "Upload Icon"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, "notification")}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--dim)", marginTop: "0.25rem" }}>
            {t?.supportedFormats || "PNG, JPG, SVG (max 5MB)"}
          </p>
        </div>
      </div>
    </div>
  );
}