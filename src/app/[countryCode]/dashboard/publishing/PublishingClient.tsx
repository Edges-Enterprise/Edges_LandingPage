// src/app/[countryCode]/dashboard/publishing/PublishingClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Smartphone,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  Globe,
} from "lucide-react";
import BuildStatus from "./BuildStatus";
import PublishingPlans from "./PublishingPlans";
import AppAssets from "./AppAssets";
import BuildHistory from "./BuildHistory";
import { CountryConfig } from "@/config/countries";
import { PublishingData, Build } from "@/types/reseller/publishing";

interface PublishingClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  publishingData: PublishingData;
  /** Build id from the URL (?build=…), highlighted from Recent Activity. */
  initialBuildId?: string;
}

export default function PublishingClient({
  countryCode,
  config,
  translations,
  publishingData,
  initialBuildId,
}: PublishingClientProps) {
  const t = translations;
  const supabase = createClient();
  const [data, setData] = useState<PublishingData>(publishingData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Subscribe to build updates
    const channel = supabase
      .channel("build-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "global_app_builds",
          filter: `application_id=eq.${data.application.id}`,
        },
        () => {
          refreshData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data.application.id]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const { data: builds, error: buildsError } = await supabase
        .from("global_app_builds")
        .select("*")
        .eq("application_id", data.application.id)
        .order("created_at", { ascending: false });

      if (!buildsError && builds) {
        setData((prev) => ({
          ...prev,
          builds: builds as Build[],
          currentBuild: builds.length > 0 ? (builds[0] as Build) : null,
        }));
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      queued: "#F59E0B",
      building: "#3B82F6",
      completed: "#6EBD8A",
      failed: "#EF4444",
    };
    return colors[status] || "var(--muted)";
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

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      queued: t?.queued || "Queued",
      building: t?.building || "Building",
      completed: t?.completed || "Completed",
      failed: t?.failed || "Failed",
    };
    return labels[status] || status;
  };

  // Ensure currentBuild is either Build or null, not undefined
  const currentBuild = data.currentBuild || null;
  const publishingPlan = data.publishingPlan || null;

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {t?.title || "App Publishing"}
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
            <span className="publishing-subtitle-desktop">
              {t?.subtitle || "Manage your mobile app and Play Store presence"}
            </span>
            <span className="publishing-subtitle-mobile">
              {t?.subtitleMobile || "Manage your Play Store presence"}
            </span>
          </p>
        </div>
      </div>

      {/* Build Status */}
      <BuildStatus
        build={currentBuild}
        config={config}
        translations={t}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        getStatusLabel={getStatusLabel}
      />

      {/* Publishing Plans */}
      <PublishingPlans
        application={data.application}
        currentPlan={publishingPlan}
        walletBalance={data.walletBalance ?? 0}
        usdToLocalRate={data.usdToLocalRate ?? null}
        config={config}
        translations={t}
        onSuccess={refreshData}
      />

      {/* App Assets */}
      <AppAssets
        application={data.application}
        config={config}
        translations={t}
        onSuccess={refreshData}
      />

      {/* Build History */}
      <BuildHistory
        builds={data.builds}
        config={config}
        translations={t}
        getStatusColor={getStatusColor}
        getStatusLabel={getStatusLabel}
        highlightBuildId={initialBuildId}
      />
      <style>{`
        /* Mobile: the subtitle shortens and the header's refresh control is
           gone. */
        .publishing-subtitle-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .publishing-subtitle-desktop {
            display: none;
          }
          .publishing-subtitle-mobile {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}

