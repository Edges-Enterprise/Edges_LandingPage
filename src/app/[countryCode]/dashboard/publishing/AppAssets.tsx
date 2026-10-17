// src/app/[countryCode]/dashboard/publishing/AppAssets.tsx
"use client";

import { useState } from "react";
import { Image, Upload, Check, X, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CountryConfig } from "@/config/countries";

interface AppAssetsProps {
  application: {
    id: string;
    logo_url?: string;
    notification_icon_url?: string;
    store_name: string;
  };
  config: CountryConfig;
  translations: any;
  onSuccess: () => void;
}

export default function AppAssets({
  application,
  config,
  translations,
  onSuccess,
}: AppAssetsProps) {
  const t = translations;
  const supabase = createClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"logo" | "notification" | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (
    file: File,
    type: "logo" | "notification",
  ) => {
    setIsUploading(true);
    setUploadError(null);

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
      const updateField =
        type === "logo" ? "logo_url" : "notification_icon_url";
      const { error } = await supabase
        .from("global_reseller_applications")
        .update({
          [updateField]: data.url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      setUploadError(t?.uploadError || "Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "notification",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError(t?.invalidFileType || "Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t?.fileTooLarge || "File size must be less than 5MB");
      return;
    }

    handleFileUpload(file, type);
    e.target.value = "";
  };

  const assets = [
    {
      type: "logo" as const,
      label: t?.appIcon || "App Icon",
      url: application.logo_url,
      defaultLabel: t?.noLogo || "No logo uploaded",
      description: "PNG, 512x512px recommended",
    },
    {
      type: "notification" as const,
      label: t?.notificationIcon || "Notification Icon",
      url: application.notification_icon_url,
      defaultLabel: t?.noNotificationIcon || "No notification icon",
      description: "PNG, 192x192px recommended",
    },
  ];

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        {t?.appAssets || "App Assets"}
      </h3>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.85rem",
          marginBottom: "1rem",
        }}
      >
        {t?.appAssetsDesc || "Manage your app's visual assets"}
      </p>

      {uploadError && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 6,
            color: "#EF4444",
            fontSize: "0.85rem",
            marginBottom: "0.75rem",
          }}
        >
          {uploadError}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {assets.map((asset) => (
          <div
            key={asset.type}
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: asset.url
                  ? `url(${asset.url}) center/cover`
                  : "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.5rem",
                overflow: "hidden",
              }}
            >
              {!asset.url && (
                <Image size={24} style={{ color: "var(--dim)" }} />
              )}
            </div>

            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {asset.label}
            </p>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                margin: "0.25rem 0 0.5rem 0",
              }}
            >
              {asset.description}
            </p>

            {asset.url ? (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "center",
                }}
              >
                <a
                  href={asset.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "0.25rem 0.75rem",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-color)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <Download size={12} />
                  {t?.download || "Download"}
                </a>
                <label
                  style={{
                    padding: "0.25rem 0.75rem",
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: 4,
                    color: "#F59E0B",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(245,158,11,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(245,158,11,0.08)";
                  }}
                >
                  <Upload size={12} />
                  {t?.change || "Change"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, asset.type)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            ) : (
              <label
                style={{
                  display: "inline-block",
                  padding: "0.25rem 1rem",
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
                <Upload size={14} style={{ marginRight: "0.25rem" }} />
                {t?.uploadNew || "Upload New"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, asset.type)}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
