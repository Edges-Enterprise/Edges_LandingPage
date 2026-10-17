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
  Zap,
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
}

export default function PublishingClient({
  countryCode,
  config,
  translations,
  publishingData,
}: PublishingClientProps) {
  const t = translations;
  const supabase = createClient();
  const [data, setData] = useState<PublishingData>(publishingData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

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

  const triggerBuild = async () => {
    setIsTriggering(true);
    setTriggerMessage(null);

    try {
      const response = await fetch(
        `/api/reseller/${countryCode}/webhooks/build`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: data.application.id,
          }),
        },
      );

      if (response.ok) {
        setTriggerMessage(t?.triggered || "Build triggered successfully");
        await refreshData();
      } else {
        setTriggerMessage(t?.triggerError || "Failed to trigger build");
      }
    } catch (error) {
      setTriggerMessage(t?.triggerError || "Failed to trigger build");
      console.error("Trigger build error:", error);
    } finally {
      setIsTriggering(false);
      setTimeout(() => setTriggerMessage(null), 5000);
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
            {t?.subtitle || "Manage your mobile app and Play Store presence"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={triggerBuild}
            disabled={
              isTriggering ||
              currentBuild?.build_status === "building" ||
              currentBuild?.build_status === "queued"
            }
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--brand-color)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor:
                isTriggering || currentBuild?.build_status === "building"
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isTriggering || currentBuild?.build_status === "building"
                  ? 0.6
                  : 1,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              if (!isTriggering && currentBuild?.build_status !== "building") {
                e.currentTarget.style.opacity = "0.85";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {isTriggering ? (
              <RefreshCw
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Zap size={16} />
            )}
            {isTriggering
              ? t?.building || "Building..."
              : t?.triggerBuild || "Trigger Build"}
          </button>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            style={{
              padding: "0.6rem 1rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--muted)",
              cursor: "pointer",
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
            {isRefreshing ? "⟳" : "⟳"}
          </button>
        </div>
      </div>

      {triggerMessage && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: triggerMessage.includes("successfully")
              ? "rgba(110,189,138,0.1)"
              : "rgba(239,68,68,0.1)",
            border: `1px solid ${triggerMessage.includes("successfully") ? "rgba(110,189,138,0.2)" : "rgba(239,68,68,0.2)"}`,
            borderRadius: 8,
            color: triggerMessage.includes("successfully")
              ? "#6EBD8A"
              : "#EF4444",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {triggerMessage}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

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
        // TODO(wallet): swap in the real balance once it's fetched
        // (e.g. from `data`, alongside `publishingPlan`).
        walletBalance={(data as any).walletBalance ?? 0}
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
      />
    </div>
  );
}

// // src/app/[countryCode]/dashboard/publishing/PublishingClient.tsx
// "use client";

// import { useState, useEffect } from "react";
// import { createClient } from "@/lib/supabase/client";
// import {
//   Smartphone,
//   Package,
//   CheckCircle,
//   Clock,
//   XCircle,
//   Download,
//   RefreshCw,
//   Globe,
//   Zap,
// } from "lucide-react";
// import BuildStatus from "./BuildStatus";
// import PublishingPlans from "./PublishingPlans";
// import AppAssets from "./AppAssets";
// import BuildHistory from "./BuildHistory";
// import { CountryConfig } from "@/config/countries";
// import { PublishingData, Build } from "@/types/reseller/publishing";

// interface PublishingClientProps {
//   countryCode: string;
//   config: CountryConfig;
//   translations: any;
//   publishingData: PublishingData;
// }

// export default function PublishingClient({
//   countryCode,
//   config,
//   translations,
//   publishingData,
// }: PublishingClientProps) {
//   const t = translations;
//   const supabase = createClient();
//   const [data, setData] = useState<PublishingData>(publishingData);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [isTriggering, setIsTriggering] = useState(false);
//   const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

//   useEffect(() => {
//     // Subscribe to build updates
//     const channel = supabase
//       .channel("build-updates")
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "global_app_builds",
//           filter: `application_id=eq.${data.application.id}`,
//         },
//         () => {
//           refreshData();
//         },
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [data.application.id]);

//   const refreshData = async () => {
//     setIsRefreshing(true);
//     try {
//       const { data: builds, error: buildsError } = await supabase
//         .from("global_app_builds")
//         .select("*")
//         .eq("application_id", data.application.id)
//         .order("created_at", { ascending: false });

//       if (!buildsError && builds) {
//         setData((prev) => ({
//           ...prev,
//           builds: builds as Build[],
//           currentBuild: builds.length > 0 ? (builds[0] as Build) : null,
//         }));
//       }
//     } catch (error) {
//       console.error("Refresh error:", error);
//     } finally {
//       setIsRefreshing(false);
//     }
//   };

//   const triggerBuild = async () => {
//     setIsTriggering(true);
//     setTriggerMessage(null);

//     try {
//       const response = await fetch(
//         `/api/reseller/${countryCode}/webhooks/build`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             applicationId: data.application.id,
//           }),
//         },
//       );

//       if (response.ok) {
//         setTriggerMessage(t?.triggered || "Build triggered successfully");
//         await refreshData();
//       } else {
//         setTriggerMessage(t?.triggerError || "Failed to trigger build");
//       }
//     } catch (error) {
//       setTriggerMessage(t?.triggerError || "Failed to trigger build");
//       console.error("Trigger build error:", error);
//     } finally {
//       setIsTriggering(false);
//       setTimeout(() => setTriggerMessage(null), 5000);
//     }
//   };

//   const getStatusColor = (status: string): string => {
//     const colors: Record<string, string> = {
//       queued: "#F59E0B",
//       building: "#3B82F6",
//       completed: "#6EBD8A",
//       failed: "#EF4444",
//     };
//     return colors[status] || "var(--muted)";
//   };

//   const getStatusIcon = (status: string) => {
//     const icons: Record<string, any> = {
//       queued: Clock,
//       building: RefreshCw,
//       completed: CheckCircle,
//       failed: XCircle,
//     };
//     return icons[status] || Clock;
//   };

//   const getStatusLabel = (status: string): string => {
//     const labels: Record<string, string> = {
//       queued: t?.queued || "Queued",
//       building: t?.building || "Building",
//       completed: t?.completed || "Completed",
//       failed: t?.failed || "Failed",
//     };
//     return labels[status] || status;
//   };

//   // Ensure currentBuild is either Build or null, not undefined
//   const currentBuild = data.currentBuild || null;
//   const publishingPlan = data.publishingPlan || null;

//   return (
//     <div>
//       {/* Page Header */}
//       <div
//         style={{
//           marginBottom: "1.5rem",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           flexWrap: "wrap",
//           gap: "1rem",
//         }}
//       >
//         <div>
//           <h1
//             style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "1.5rem",
//               fontWeight: 700,
//               margin: 0,
//             }}
//           >
//             {t?.title || "App Publishing"}
//           </h1>
//           <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
//             {t?.subtitle || "Manage your mobile app and Play Store presence"}
//           </p>
//         </div>
//         <div style={{ display: "flex", gap: "0.75rem" }}>
//           <button
//             onClick={triggerBuild}
//             disabled={
//               isTriggering ||
//               currentBuild?.build_status === "building" ||
//               currentBuild?.build_status === "queued"
//             }
//             style={{
//               padding: "0.6rem 1.5rem",
//               background: "var(--brand-color)",
//               color: "#FDF8F3",
//               border: "none",
//               borderRadius: 8,
//               fontWeight: 600,
//               fontSize: "0.9rem",
//               cursor:
//                 isTriggering || currentBuild?.build_status === "building"
//                   ? "not-allowed"
//                   : "pointer",
//               opacity:
//                 isTriggering || currentBuild?.build_status === "building"
//                   ? 0.6
//                   : 1,
//               transition: "all 0.2s",
//               display: "flex",
//               alignItems: "center",
//               gap: "0.5rem",
//             }}
//             onMouseEnter={(e) => {
//               if (!isTriggering && currentBuild?.build_status !== "building") {
//                 e.currentTarget.style.opacity = "0.85";
//               }
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.opacity = "1";
//             }}
//           >
//             {isTriggering ? (
//               <RefreshCw
//                 size={16}
//                 style={{ animation: "spin 1s linear infinite" }}
//               />
//             ) : (
//               <Zap size={16} />
//             )}
//             {isTriggering
//               ? t?.building || "Building..."
//               : t?.triggerBuild || "Trigger Build"}
//           </button>
//           <button
//             onClick={refreshData}
//             disabled={isRefreshing}
//             style={{
//               padding: "0.6rem 1rem",
//               background: "transparent",
//               border: "1px solid var(--border)",
//               borderRadius: 8,
//               color: "var(--muted)",
//               cursor: "pointer",
//               transition: "all 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.borderColor = "var(--brand-color)";
//               e.currentTarget.style.color = "var(--text)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.borderColor = "var(--border)";
//               e.currentTarget.style.color = "var(--muted)";
//             }}
//           >
//             {isRefreshing ? "⟳" : "⟳"}
//           </button>
//         </div>
//       </div>

//       {triggerMessage && (
//         <div
//           style={{
//             padding: "0.75rem 1rem",
//             background: triggerMessage.includes("successfully")
//               ? "rgba(110,189,138,0.1)"
//               : "rgba(239,68,68,0.1)",
//             border: `1px solid ${triggerMessage.includes("successfully") ? "rgba(110,189,138,0.2)" : "rgba(239,68,68,0.2)"}`,
//             borderRadius: 8,
//             color: triggerMessage.includes("successfully")
//               ? "#6EBD8A"
//               : "#EF4444",
//             fontSize: "0.9rem",
//             marginBottom: "1.5rem",
//           }}
//         >
//           {triggerMessage}
//         </div>
//       )}

//       <style>{`
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
//       `}</style>

//       {/* Build Status */}
//       <BuildStatus
//         build={currentBuild}
//         config={config}
//         translations={t}
//         getStatusColor={getStatusColor}
//         getStatusIcon={getStatusIcon}
//         getStatusLabel={getStatusLabel}
//       />

//       {/* Publishing Plans */}
//       <PublishingPlans
//         application={data.application}
//         currentPlan={publishingPlan}
//         config={config}
//         translations={t}
//         onSuccess={refreshData}
//       />

//       {/* App Assets */}
//       <AppAssets
//         application={data.application}
//         config={config}
//         translations={t}
//         onSuccess={refreshData}
//       />

//       {/* Build History */}
//       <BuildHistory
//         builds={data.builds}
//         config={config}
//         translations={t}
//         getStatusColor={getStatusColor}
//         getStatusLabel={getStatusLabel}
//       />
//     </div>
//   );
// }
