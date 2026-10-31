// src/app/[countryCode]/dashboard/publishing/BuildHistory.tsx
"use client";

import { useState } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Build } from "@/types/reseller/publishing";
import { CountryConfig } from "@/config/countries";

interface BuildHistoryProps {
  builds: Build[];
  config: CountryConfig;
  translations: any;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

export default function BuildHistory({
  builds,
  config,
  translations,
  getStatusColor,
  getStatusLabel,
}: BuildHistoryProps) {
  const t = translations;
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      queued: Clock,
      building: RefreshCw,
      completed: CheckCircle,
      failed: XCircle,
    };
    return icons[status] || Clock;
  };

  const displayedBuilds = isExpanded ? builds : builds.slice(0, 5);

  if (builds.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1rem",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {t?.buildHistory || "Build History"}
        </h3>
        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          {builds.length} {t?.builds || "builds"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {displayedBuilds.map((build) => {
          const StatusIcon = getStatusIcon(build.build_status);
          const statusColor = getStatusColor(build.build_status);

          return (
            <div
              key={build.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0.75rem",
                background: "var(--bg2)",
                borderRadius: 8,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg2)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <StatusIcon size={16} style={{ color: statusColor }} />
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {t?.build || "Build"} #
                    {build.config_id?.slice(0, 8) || "N/A"}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
                    {formatDate(build.created_at)}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    color: statusColor,
                    background: `${statusColor}15`,
                    padding: "2px 8px",
                    borderRadius: 100,
                  }}
                >
                  {getStatusLabel(build.build_status)}
                </span>
                {build.apk_url && (
                  <a
                    href={build.apk_url}
                    download
                    style={{
                      color: "var(--brand-color)",
                      textDecoration: "none",
                      fontSize: "0.7rem",
                    }}
                  >
                    APK
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {builds.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            marginTop: "0.75rem",
            padding: "0.4rem 1rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--muted)",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--brand-color)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              {t?.showLess || "Show Less"}
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              {t?.showAll || "Show All"} ({builds.length}{" "}
              {t?.builds || "builds"})
            </>
          )}
        </button>
      )}
    </div>
  );
}
