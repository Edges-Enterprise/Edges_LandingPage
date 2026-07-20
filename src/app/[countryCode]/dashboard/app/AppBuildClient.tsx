// src/app/[countryCode]/dashboard/app/AppBuildClient.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle, Clock, Download } from "lucide-react";
import { getBuildStatus } from "@/actions/reseller/build/getBuildStatus";

interface AppBuildClientProps {
  applicationId: string;
}

export default function AppBuildClient({ applicationId }: AppBuildClientProps) {
  const [buildStatus, setBuildStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await getBuildStatus(applicationId);
        if (result.success) {
          setBuildStatus(result.data);
        } else {
          setError(result.error || "Failed to fetch build status");
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchStatus();
    }
  }, [applicationId]);

  const getStatusIcon = () => {
    if (!buildStatus) return <Clock size={24} />;

    switch (buildStatus.build_status) {
      case "completed":
        return <CheckCircle size={24} style={{ color: "#6EBD8A" }} />;
      case "failed":
        return <XCircle size={24} style={{ color: "#EF4444" }} />;
      case "building":
      case "queued":
        return (
          <Loader2
            size={24}
            style={{ animation: "spin 1s linear infinite", color: "#FCD34D" }}
          />
        );
      default:
        return <Clock size={24} style={{ color: "var(--dim)" }} />;
    }
  };

  const getStatusText = () => {
    if (!buildStatus) return "Not started";

    switch (buildStatus.build_status) {
      case "queued":
        return "Queued...";
      case "building":
        return "Building...";
      case "completed":
        return "Ready!";
      case "failed":
        return "Failed";
      default:
        return "Not started";
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Loader2
          size={32}
          style={{
            animation: "spin 1s linear infinite",
            color: "var(--accent)",
          }}
        />
        <p style={{ color: "var(--muted)", marginTop: "1rem" }}>
          Loading build status...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#EF4444" }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border2)",
        borderRadius: 16,
        padding: "2rem",
        maxWidth: 500,
        margin: "0 auto",
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.2rem",
          fontWeight: 700,
          marginBottom: "1rem",
        }}
      >
        Android App Build Status
      </h3>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem",
          background: "var(--bg2)",
          borderRadius: 10,
        }}
      >
        {getStatusIcon()}
        <div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>
            {getStatusText()}
          </div>
          {buildStatus?.build_status === "completed" &&
            buildStatus?.apk_url && (
              <a
                href={buildStatus.apk_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: "0.5rem",
                  color: "var(--accent)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                <Download size={16} />
                Download APK
              </a>
            )}
          {buildStatus?.error_message && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "#EF4444",
                marginTop: "0.5rem",
              }}
            >
              Error: {buildStatus.error_message}
            </div>
          )}
        </div>
      </div>

      {buildStatus?.build_logs && (
        <details style={{ marginTop: "1rem" }}>
          <summary
            style={{
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            View logs
          </summary>
          <pre
            style={{
              background: "var(--bg3)",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: "0.7rem",
              color: "var(--muted)",
              overflow: "auto",
              maxHeight: 150,
              marginTop: "0.5rem",
            }}
          >
            {buildStatus.build_logs}
          </pre>
        </details>
      )}
    </div>
  );
}
