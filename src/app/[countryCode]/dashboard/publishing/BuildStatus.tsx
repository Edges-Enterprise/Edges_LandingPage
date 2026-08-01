// src/app/[countryCode]/dashboard/publishing/BuildStatus.tsx
"use client";

import { Download, ExternalLink, Package } from "lucide-react";
import { Build } from "@/types/reseller/publishing";
import { CountryConfig } from "@/config/countries";

interface BuildStatusProps {
  build: Build | null;
  config: CountryConfig;
  translations: any;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => any;
  getStatusLabel: (status: string) => string;
}

export default function BuildStatus({
  build,
  config,
  translations,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
}: BuildStatusProps) {
  const t = translations;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!build) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.5rem",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(var(--brand-color-rgb), 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 0.75rem",
          }}
        >
          <Package size={24} style={{ color: "var(--brand-color)" }} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem", margin: 0 }}>
          {t?.noBuilds || "No builds yet"}
        </p>
        <p
          style={{
            color: "var(--dim)",
            fontSize: "0.85rem",
            marginTop: "0.25rem",
          }}
        >
          {t?.startBuilding || "Your app will be built automatically"}
        </p>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(build.build_status);
  const statusColor = getStatusColor(build.build_status);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: `${statusColor}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StatusIcon size={24} style={{ color: statusColor }} />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {t?.buildStatus || "Build Status"}
            </h3>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: statusColor,
                background: `${statusColor}15`,
                padding: "2px 10px",
                borderRadius: 100,
                display: "inline-block",
                marginTop: "0.25rem",
              }}
            >
              {getStatusLabel(build.build_status)}
            </span>
          </div>
        </div>

        {build.build_status === "completed" &&
          (build.apk_url || build.aab_url) && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {build.apk_url && (
                <a
                  href={build.apk_url}
                  download
                  style={{
                    padding: "0.5rem 1rem",
                    background: "var(--brand-color)",
                    color: "#FDF8F3",
                    textDecoration: "none",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.85";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <Download size={16} />
                  {t?.downloadAPK || "Download APK"}
                </a>
              )}
              {build.aab_url && (
                <a
                  href={build.aab_url}
                  download
                  style={{
                    padding: "0.5rem 1rem",
                    background: "transparent",
                    color: "var(--text)",
                    border: "1px solid var(--border2)",
                    textDecoration: "none",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-color)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border2)";
                  }}
                >
                  <Download size={16} />
                  {t?.downloadAAB || "Download AAB"}
                </a>
              )}
            </div>
          )}
      </div>

      {/* Build details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        {build.queued_at && (
          <div>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.queuedAt || "Queued"}
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {formatDate(build.queued_at)}
            </p>
          </div>
        )}
        {build.building_at && (
          <div>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.buildingAt || "Building"}
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {formatDate(build.building_at)}
            </p>
          </div>
        )}
        {build.completed_at && (
          <div>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.completedAt || "Completed"}
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {formatDate(build.completed_at)}
            </p>
          </div>
        )}
        {build.error_message && (
          <div>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.error || "Error"}
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#EF4444",
                margin: "0.25rem 0 0 0",
              }}
            >
              {build.error_message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
