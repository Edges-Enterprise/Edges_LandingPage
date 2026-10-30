// src/app/[countryCode]/dashboard/publishing/BuildStatus.tsx
"use client";

import { Download, ExternalLink, Package, CheckCircle } from "lucide-react";
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
        <div
          className="build-status-main"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
        <div
          className="build-status-info"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "0.5rem",
          }}
        >
          <div
            className="build-status-icon"
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
              className="build-status-label"
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
              <CheckCircle
                className="build-status-check"
                size={14}
                style={{ display: "none", verticalAlign: "-2px" }}
              />
              {getStatusLabel(build.build_status)}
            </span>
          </div>
        </div>

        {build.build_status === "completed" && build.apk_url && (
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
                    gap: "1.5rem",
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
                  <span className="build-download-label-desktop">
                    {t?.downloadAPK || "Download APK"}
                  </span>
                  <span className="build-download-label-mobile">
                    {t?.download || "Download"}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Build details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
          padding: "0.5rem",
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

      <style>{`
        /* Mobile: Build Status stacks on the left (heading, then the green
           check with its label) while the icon and Download button sit on the
           right, on the same line. */
        .build-download-label-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .build-status-main {
            flex: 1 1 auto !important;
            /* The badge keeps the check and its label on one line; a long
               label (fr/ar) that cannot fit beside the button wraps the whole
               button to the next line instead of overflowing the card. */
            flex-wrap: wrap !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
          }
          /* Auto margin keeps the button hard against the right edge on the
             shared line, and still right-aligned if it wraps below. */
          .build-status-main > div:last-child {
            margin-left: auto;
          }
          .build-status-info {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.25rem !important;
            padding: 0 !important;
            min-width: 0;
          }
          .build-status-icon {
            display: none !important;
          }
          .build-status-label {
            margin-top: 0 !important;
            white-space: nowrap;
          }
          .build-status-check {
            display: inline-block !important;
            /* margin, not padding: padding on a 14px border-box SVG squishes
               the glyph itself instead of opening a gap. */
            margin-right: 0.5rem;
          }
          .build-download-label-desktop {
            display: none;
          }
          .build-download-label-mobile {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}
