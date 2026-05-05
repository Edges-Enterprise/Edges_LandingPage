// app/(reseller-dashboard)/dashboard/app/AppBuildClient.tsx

"use client";

import { useState } from "react";
import { Card } from "../Card";
import { Badge } from "../Badge";
import { triggerAppBuild } from "@/app/actions/reseller/triggerAppBuild";
import {
  Download,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

export function AppBuildClient({
  resellerId,
  buildConfig,
}: {
  resellerId: string;
  buildConfig: any;
}) {
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState(buildConfig?.build_status || "pending");
  const [apkUrl, setApkUrl] = useState(buildConfig?.apk_url || "");

  const handleBuild = async () => {
    setBuilding(true);
    const result = await triggerAppBuild(resellerId);
    if (result.success) {
      setStatus("building");
    }
    setBuilding(false);
  };

  const statusConfig: Record<
    string,
    {
      icon: any;
      color: string;
      label: string;
      variant: "success" | "warning" | "error" | "info";
    }
  > = {
    pending: {
      icon: Clock,
      color: "var(--dim)",
      label: "Pending",
      variant: "info",
    },
    configuring: {
      icon: Loader2,
      color: "#FBBF24",
      label: "Configuring",
      variant: "warning",
    },
    building: {
      icon: Loader2,
      color: "#FBBF24",
      label: "Building",
      variant: "warning",
    },
    completed: {
      icon: CheckCircle,
      color: "#6EBD8A",
      label: "Completed",
      variant: "success",
    },
    failed: {
      icon: XCircle,
      color: "#EF4444",
      label: "Failed",
      variant: "error",
    },
  };

  const current = statusConfig[status] || statusConfig.pending;
  const StatusIcon = current.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.3rem",
          }}
        >
          Android App
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Your branded APK build status and download
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusIcon
              size={28}
              style={{
                color: current.color,
                animation:
                  status === "building" || status === "configuring"
                    ? "spin 1s linear infinite"
                    : "none",
              }}
            />
            <div>
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--text)",
                  fontSize: "1rem",
                }}
              >
                Build Status
              </p>
              <Badge variant={current.variant}>{current.label}</Badge>
            </div>
          </div>
          <button
            onClick={handleBuild}
            disabled={
              building || status === "building" || status === "configuring"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0.6rem 1.2rem",
              background: "var(--accent)",
              border: "none",
              borderRadius: 10,
              color: "#FDF8F3",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: building ? 0.7 : 1,
            }}
          >
            {building ? (
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <RefreshCw size={16} />
            )}
            {status === "completed" ? "Rebuild" : "Build Now"}
          </button>
        </div>

        {/* Progress bar for active builds */}
        {(status === "building" || status === "configuring") && (
          <div style={{ marginTop: "1.5rem" }}>
            <div
              style={{
                height: 4,
                background: "var(--bg2)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "60%",
                  borderRadius: 2,
                  background: "linear-gradient(90deg, var(--accent), #DEB082)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
            </div>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--dim)",
                marginTop: "0.5rem",
                textAlign: "center",
              }}
            >
              Building your APK... This usually takes 5–10 minutes.
            </p>
          </div>
        )}

        {/* Download button */}
        {status === "completed" && apkUrl && (
          <a
            href={apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: "1.25rem",
              padding: "0.75rem 1.5rem",
              background: "var(--green)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              fontFamily: "inherit",
            }}
          >
            <Download size={17} /> Download APK
          </a>
        )}

        {status === "failed" && (
          <p
            style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#F87171" }}
          >
            Build failed. Please try again or contact support.
          </p>
        )}
      </Card>

      {/* App Details */}
      {buildConfig?.config && (
        <Card>
          <h3
            style={{
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "1rem",
              fontSize: "1rem",
            }}
          >
            App Details
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                App Name
              </p>
              <p style={{ fontWeight: 500, color: "var(--text)" }}>
                {buildConfig.config.appName}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                Package Name
              </p>
              <p
                style={{
                  fontWeight: 500,
                  color: "var(--text)",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                }}
              >
                {buildConfig.config.config.androidPackageName}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                Version
              </p>
              <p style={{ fontWeight: 500, color: "var(--text)" }}>
                {buildConfig.config.config.version}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                Brand Color
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: buildConfig.config.theme.primary,
                  }}
                />
                <span style={{ fontWeight: 500, color: "var(--text)" }}>
                  {buildConfig.config.theme.primary}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <h3
          style={{
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "1rem",
            fontSize: "1rem",
          }}
        >
          How to Install Your App
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {[
            {
              num: "1",
              title: "Download the APK",
              desc: "Click the download button above to get your APK file",
            },
            {
              num: "2",
              title: "Enable Unknown Sources",
              desc: "Go to Settings → Security → Enable 'Install from Unknown Sources'",
            },
            {
              num: "3",
              title: "Install the App",
              desc: "Open the downloaded APK file and tap 'Install'",
            },
            {
              num: "4",
              title: "Share with Customers",
              desc: "Send the APK to your customers via WhatsApp, email, or direct link",
            },
          ].map((step) => (
            <div key={step.num} style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(201,138,84,0.12)",
                  border: "1px solid rgba(201,138,84,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--accent)",
                  flexShrink: 0,
                }}
              >
                {step.num}
              </div>
              <div>
                <p
                  style={{
                    fontWeight: 600,
                    color: "var(--text)",
                    fontSize: "0.9rem",
                  }}
                >
                  {step.title}
                </p>
                <p style={{ fontSize: "0.82rem", color: "var(--dim)" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


// "use client";

// import { useState } from "react";
// import { Card } from "../Card";
// import { Badge } from "../Badge";
// import { triggerAppBuild } from "@/app/actions/reseller/triggerAppBuild";
// import {
//   Download,
//   Loader2,
//   RefreshCw,
//   CheckCircle,
//   XCircle,
//   Clock,
// } from "lucide-react";

// export function AppBuildClient({
//   resellerId,
//   buildConfig,
// }: {
//   resellerId: string;
//   buildConfig: any;
// }) {
//   const [building, setBuilding] = useState(false);
//   const [status, setStatus] = useState(buildConfig?.build_status || "pending");
//   const [apkUrl, setApkUrl] = useState(buildConfig?.apk_url || "");

//   const handleBuild = async () => {
//     setBuilding(true);
//     const result = await triggerAppBuild(resellerId);
//     if (result.success) {
//       setStatus("building");
//     }
//     setBuilding(false);
//   };

//   const statusConfig = {
//     pending: {
//       icon: Clock,
//       color: "var(--dim)",
//       label: "Pending",
//       variant: "info" as const,
//     },
//     configuring: {
//       icon: Loader2,
//       color: "#FBBF24",
//       label: "Configuring",
//       variant: "warning" as const,
//     },
//     building: {
//       icon: Loader2,
//       color: "#FBBF24",
//       label: "Building",
//       variant: "warning" as const,
//     },
//     completed: {
//       icon: CheckCircle,
//       color: "#6EBD8A",
//       label: "Completed",
//       variant: "success" as const,
//     },
//     failed: {
//       icon: XCircle,
//       color: "#EF4444",
//       label: "Failed",
//       variant: "error" as const,
//     },
//   };

//   const current =
//     statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
//   const StatusIcon = current.icon;

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
//       <div>
//         <h1
//           style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "1.8rem",
//             fontWeight: 700,
//             color: "var(--text)",
//             marginBottom: "0.3rem",
//           }}
//         >
//           Android App
//         </h1>
//         <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
//           Your branded APK build status and download
//         </p>
//       </div>

//       {/* Status Card */}
//       <Card>
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             marginBottom: "1.5rem",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//             <StatusIcon
//               size={24}
//               style={{
//                 color: current.color,
//                 animation:
//                   status === "building" ? "spin 1s linear infinite" : "none",
//               }}
//             />
//             <div>
//               <p
//                 style={{
//                   fontWeight: 600,
//                   color: "var(--text)",
//                   fontSize: "1.1rem",
//                 }}
//               >
//                 Build Status
//               </p>
//               <Badge variant={current.variant}>{current.label}</Badge>
//             </div>
//           </div>
//           <button
//             onClick={handleBuild}
//             disabled={building || status === "building"}
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 8,
//               padding: "0.6rem 1.2rem",
//               background: "var(--accent)",
//               border: "none",
//               borderRadius: 10,
//               color: "#FDF8F3",
//               fontWeight: 600,
//               fontSize: "0.9rem",
//               cursor: "pointer",
//               fontFamily: "inherit",
//               opacity: building ? 0.7 : 1,
//             }}
//           >
//             {building ? (
//               <Loader2
//                 size={16}
//                 style={{ animation: "spin 1s linear infinite" }}
//               />
//             ) : (
//               <RefreshCw size={16} />
//             )}
//             {status === "completed" ? "Rebuild" : "Build Now"}
//           </button>
//         </div>

//         {status === "completed" && apkUrl && (
//           <a
//             href={apkUrl}
//             target="_blank"
//             rel="noopener noreferrer"
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 8,
//               padding: "0.75rem 1.5rem",
//               background: "var(--green)",
//               border: "none",
//               borderRadius: 10,
//               color: "#fff",
//               fontWeight: 600,
//               fontSize: "0.9rem",
//               textDecoration: "none",
//               fontFamily: "inherit",
//             }}
//           >
//             <Download size={17} /> Download APK
//           </a>
//         )}
//       </Card>

//       {/* Instructions */}
//       <Card>
//         <h3
//           style={{
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "1rem",
//           }}
//         >
//           How to Install
//         </h3>
//         <ol
//           style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 2 }}
//         >
//           <li>Download the APK file above</li>
//           <li>
//             On your Android device, go to Settings → Security → Enable "Unknown
//             Sources"
//           </li>
//           <li>Open the downloaded APK file and tap "Install"</li>
//           <li>
//             Share the APK with your customers via Playstore, WhatsApp, email, or direct
//             download
//           </li>
//         </ol>
//       </Card>
//     </div>
//   );
// }
