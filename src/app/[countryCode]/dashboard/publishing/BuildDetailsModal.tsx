// src/app/[countryCode]/dashboard/publishing/BuildDetailsModal.tsx
"use client";

import {
  X,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { Build } from "@/types/reseller/publishing";
import { CountryConfig } from "@/config/countries";

interface BuildDetailsModalProps {
  build: Build;
  config: CountryConfig;
  translations: any;
  onClose: () => void;
}

/**
 * One app build's details, opened from Recent Activity on the overview. The
 * AAB is deliberately not shown: it is for internal use, not for the reseller.
 */
export default function BuildDetailsModal({
  build,
  config,
  translations: t,
  onClose,
}: BuildDetailsModalProps) {
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      completed: "#6EBD8A",
      building: "#3B82F6",
      queued: "#F59E0B",
      failed: "#EF4444",
    };
    return colors[status] || "var(--muted)";
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completed: t?.completed || "Completed",
      building: t?.building || "Building",
      queued: t?.queued || "Queued",
      failed: t?.failed || "Failed",
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      completed: CheckCircle,
      building: RefreshCw,
      queued: Clock,
      failed: XCircle,
    };
    return icons[status] || Clock;
  };

  const formatDate = (date?: string): string => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatusIcon = getStatusIcon(build.build_status);
  const statusColor = getStatusColor(build.build_status);

  const infoRow = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
      <span style={{ color: "var(--muted)", fontSize: "0.85rem", minWidth: 96 }}>
        {label}
      </span>
      <span
        style={{
          color: "var(--text)",
          fontSize: "0.85rem",
          flex: 1,
          textAlign: "end",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "1.5rem",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label={t?.close || "Close"}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "0.25rem",
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "1rem",
            paddingRight: "1.5rem",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `${statusColor}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Smartphone size={20} style={{ color: statusColor }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {t?.buildDetails || "Build Details"}
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--dim)",
                  fontFamily: "monospace",
                  margin: "0.25rem 0 0 0",
                }}
              >
                {t?.build || "Build"} #{build.config_id?.slice(0, 8) || "N/A"}
              </p>
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: statusColor,
              background: `${statusColor}15`,
              padding: "4px 12px",
              borderRadius: 100,
              whiteSpace: "nowrap",
            }}
          >
            <StatusIcon size={14} />
            {getStatusLabel(build.build_status)}
          </span>
        </div>

        {/* Timeline */}
        <div
          style={{
            display: "grid",
            gap: "0.6rem",
            padding: "0.75rem",
            background: "var(--bg2)",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          {infoRow(t?.queuedAt || "Queued", formatDate(build.queued_at))}
          {infoRow(t?.buildingAt || "Building", formatDate(build.building_at))}
          {infoRow(
            t?.completedAt || "Completed",
            formatDate(build.completed_at),
          )}
        </div>

        {build.build_status === "failed" && build.error_message && (
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              marginBottom: "1rem",
              color: "#EF4444",
              fontSize: "0.85rem",
            }}
          >
            {build.error_message}
          </div>
        )}

        {build.apk_url && (
          <a
            href={build.apk_url}
            download
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.6rem",
              background: "var(--brand-color)",
              color: "#FDF8F3",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Download size={16} />
            {t?.downloadAPK || "Download APK"}
          </a>
        )}
      </div>
    </div>
  );
}
