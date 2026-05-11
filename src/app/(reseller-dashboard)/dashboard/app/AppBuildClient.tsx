// app/(reseller-dashboard)/dashboard/app/AppBuildClient.tsx

"use client";

import { useState, useEffect } from "react";
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
  Package,
  Palette,
  Code,
  Smartphone,
  Shield,
  Zap,
  FileJson,
  Image,
  Layers,
  Fingerprint,
  Key,
  Cloud,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  Lock,
  Settings,
  Terminal,
  GitBranch,
  Box,
  Truck,
  Sparkles,
  Wand2,
  Puzzle,
  Component,
  Blocks,
  Binary,
  Braces,
  Bug,
  Rocket,
  TestTube,
  Microscope,
  Hammer,
  Wrench,
  Cog,
  Gauge,
  Activity,
  BarChart3,
  TrendingUp,
  Timer,
  Hourglass,
} from "lucide-react";

// Build steps that will cycle during the build process
const BUILD_STEPS = [
  { icon: Sparkles, message: "Infusing the magic into your app..." },
  { icon: Database, message: "Fetching data plans from carrier networks..." },
  { icon: Palette, message: "Mixing brand colors to perfection..." },
  { icon: Image, message: "Polishing app icon to a brilliant shine..." },
  { icon: Code, message: "Weaving together React Native spells..." },
  { icon: Package, message: "Bundling the JavaScript into a package..." },
  { icon: Layers, message: "Layering native modules..." },
  { icon: Shield, message: "Fortifying app security shields..." },
  { icon: Zap, message: "Optimizing for lightning-fast performance..." },
  { icon: Smartphone, message: "Calibrating for all screen sizes..." },
  { icon: Fingerprint, message: "Signing APK with digital fingerprint..." },
  { icon: Key, message: "Generating cryptographic keys..." },
  { icon: Cloud, message: "Consulting the cloud oracles..." },
  { icon: Cpu, message: "Compiling native code with maximum effort..." },
  { icon: HardDrive, message: "Allocating memory for greatness..." },
  { icon: Wifi, message: "Downloading extra goodness packets..." },
  { icon: Globe, message: "Translating app codes to human readable language..." },
  { icon: Lock, message: "Encrypting secrets with double ROT13..." },
  { icon: Settings, message: "Fine-tuning all the knobs and dials..." },
  { icon: Terminal, message: "Running final terminal incantations..." },
  { icon: GitBranch, message: "Branching out to new possibilities..." },
  { icon: Box, message: "Packing everything into a shiny APK..." },
  { icon: Truck, message: "Preparing for digital delivery..." },
  { icon: Wand2, message: "Casting final enchantments..." },
  { icon: Puzzle, message: "Snapping all pieces together..." },
  { icon: Component, message: "Assembling reusable components..." },
  { icon: Blocks, message: "Stacking building blocks..." },
  { icon: Binary, message: "Converting to ones and zeros..." },
  { icon: Braces, message: "Closing all the curly braces..." },
  { icon: Bug, message: "Shooing away the bugs..." },
  { icon: Rocket, message: "Preparing for liftoff..." },
  { icon: TestTube, message: "Running final experiments..." },
  { icon: Microscope, message: "Inspecting every pixel..." },
  { icon: Hammer, message: "Hammering out the last details..." },
  { icon: Wrench, message: "Tightening all the bolts..." },
  { icon: Cog, message: "Meshing all the gears together..." },
  { icon: Gauge, message: "Measuring performance metrics..." },
  { icon: Activity, message: "Monitoring vital signs..." },
  { icon: BarChart3, message: "Charting excellence..." },
  { icon: TrendingUp, message: "Watching the quality go up..." },
  { icon: Timer, message: "Almost there, stay tuned..." },
  { icon: Hourglass, message: "The sands of time are flowing..." },
  // Duplicates for longer shuffle
  { icon: Sparkles, message: "Sprinkling extra magic dust..." },
  { icon: Zap, message: "Adding turbo boosters..." },
  { icon: Shield, message: "Double-checking security protocols..." },
  { icon: Palette, message: "Color-correcting every shade..." },
  { icon: Code, message: "Reviewing every line of code..." },
  { icon: Rocket, message: "Final countdown initiated..." },
  { icon: Package, message: "Wrapping with a bow..." },
  { icon: Wand2, message: "One last magic spell..." },
];

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle through build steps when status is "building"
  useEffect(() => {
    if (status !== "building") {
      setProgress(0);
      setCurrentStepIndex(0);
      return;
    }

    // Shuffle steps on mount
    const shuffled = [...BUILD_STEPS].sort(() => Math.random() - 0.5);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next >= shuffled.length) {
          return 0; // Loop back to start
        }
        return next;
      });
    }, 4000); // Change message every 4 seconds

    // Simulate progress (non-linear, slows down near the end)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Cap at 95% until actually complete
        // Random increment between 0.5 and 3
        const increment = Math.random() * 2.5 + 0.5;
        // Slow down as we get closer to 95%
        const slowdown = 1 - (prev / 100) * 0.7;
        return Math.min(95, prev + increment * slowdown);
      });
    }, 2000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [status]);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const result = await triggerAppBuild(resellerId);
      if (result.success) {
        setStatus("building");
        setProgress(5);
      }
    } catch (err) {
      console.error("Build trigger failed:", err);
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

  // Get current step for display
  const shuffledSteps = [...BUILD_STEPS].sort(() => Math.random() - 0.5);
  const currentStep = shuffledSteps[currentStepIndex % shuffledSteps.length];
  const StepIconComponent = currentStep?.icon || Sparkles;

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
              cursor:
                building || status === "building" || status === "configuring"
                  ? "not-allowed"
                  : "pointer",
              fontFamily: "inherit",
              opacity:
                building || status === "building" || status === "configuring"
                  ? 0.7
                  : 1,
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

        {/* Animated build progress */}
        {(status === "building" || status === "configuring") && (
          <div style={{ marginTop: "1.5rem" }}>
            {/* Step message with icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                background: "rgba(201,138,84,0.06)",
                border: "1px solid rgba(201,138,84,0.15)",
                borderRadius: 10,
                animation: "fadeIn 0.3s ease-in-out",
              }}
            >
              <StepIconComponent
                size={20}
                style={{
                  color: "var(--accent)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--accent-lt)",
                  fontWeight: 500,
                }}
              >
                {currentStep?.message}
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 6,
                background: "var(--bg2)",
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  borderRadius: 3,
                  background:
                    "linear-gradient(90deg, var(--accent), #DEB082, var(--accent))",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s linear infinite",
                  transition: "width 1s ease-in-out",
                }}
              />
            </div>

            {/* Progress percentage */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--dim)",
                }}
              >
                {status === "configuring"
                  ? "Preparing build configuration..."
                  : "Building your APK..."}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                {Math.round(progress)}%
              </span>
            </div>

            {/* Estimated time */}
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--dim)",
                marginTop: "0.75rem",
                textAlign: "center",
              }}
            >
              ⏱️ Estimated time: 20-40 minutes. You can leave this page and come
              back.
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

        {status === "completed" && !apkUrl && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem",
              background: "rgba(110,189,138,0.1)",
              border: "1px solid rgba(110,189,138,0.3)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={18} style={{ color: "#6EBD8A" }} />
            <span style={{ fontSize: "0.85rem", color: "#6EBD8A" }}>
              Build complete! Check your email for the download link.
            </span>
          </div>
        )}

        {status === "failed" && (
          <div style={{ marginTop: "1.25rem" }}>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#F87171",
                marginBottom: "0.75rem",
              }}
            >
              Build failed. Please try again or contact support.
            </p>
            <button
              onClick={handleBuild}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0.5rem 1rem",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                color: "#F87171",
                fontWeight: 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <RefreshCw size={14} /> Retry Build
            </button>
          </div>
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

// // app/(reseller-dashboard)/dashboard/app/AppBuildClient.tsx

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
//   ExternalLink,
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

//   const statusConfig: Record<
//     string,
//     {
//       icon: any;
//       color: string;
//       label: string;
//       variant: "success" | "warning" | "error" | "info";
//     }
//   > = {
//     pending: {
//       icon: Clock,
//       color: "var(--dim)",
//       label: "Pending",
//       variant: "info",
//     },
//     configuring: {
//       icon: Loader2,
//       color: "#FBBF24",
//       label: "Configuring",
//       variant: "warning",
//     },
//     building: {
//       icon: Loader2,
//       color: "#FBBF24",
//       label: "Building",
//       variant: "warning",
//     },
//     completed: {
//       icon: CheckCircle,
//       color: "#6EBD8A",
//       label: "Completed",
//       variant: "success",
//     },
//     failed: {
//       icon: XCircle,
//       color: "#EF4444",
//       label: "Failed",
//       variant: "error",
//     },
//   };

//   const current = statusConfig[status] || statusConfig.pending;
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
//             flexWrap: "wrap",
//             gap: "1rem",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//             <StatusIcon
//               size={28}
//               style={{
//                 color: current.color,
//                 animation:
//                   status === "building" || status === "configuring"
//                     ? "spin 1s linear infinite"
//                     : "none",
//               }}
//             />
//             <div>
//               <p
//                 style={{
//                   fontWeight: 600,
//                   color: "var(--text)",
//                   fontSize: "1rem",
//                 }}
//               >
//                 Build Status
//               </p>
//               <Badge variant={current.variant}>{current.label}</Badge>
//             </div>
//           </div>
//           <button
//             onClick={handleBuild}
//             disabled={
//               building || status === "building" || status === "configuring"
//             }
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

//         {/* Progress bar for active builds */}
//         {(status === "building" || status === "configuring") && (
//           <div style={{ marginTop: "1.5rem" }}>
//             <div
//               style={{
//                 height: 4,
//                 background: "var(--bg2)",
//                 borderRadius: 2,
//                 overflow: "hidden",
//               }}
//             >
//               <div
//                 style={{
//                   height: "100%",
//                   width: "60%",
//                   borderRadius: 2,
//                   background: "linear-gradient(90deg, var(--accent), #DEB082)",
//                   animation: "pulse 2s ease-in-out infinite",
//                 }}
//               />
//             </div>
//             <p
//               style={{
//                 fontSize: "0.78rem",
//                 color: "var(--dim)",
//                 marginTop: "0.5rem",
//                 textAlign: "center",
//               }}
//             >
//               Building your APK... This usually takes 5–10 minutes.
//             </p>
//           </div>
//         )}

//         {/* Download button */}
//         {status === "completed" && apkUrl && (
//           <a
//             href={apkUrl}
//             target="_blank"
//             rel="noopener noreferrer"
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 8,
//               marginTop: "1.25rem",
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

//         {status === "failed" && (
//           <p
//             style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#F87171" }}
//           >
//             Build failed. Please try again or contact support.
//           </p>
//         )}
//       </Card>

//       {/* App Details */}
//       {buildConfig?.config && (
//         <Card>
//           <h3
//             style={{
//               fontWeight: 600,
//               color: "var(--text)",
//               marginBottom: "1rem",
//               fontSize: "1rem",
//             }}
//           >
//             App Details
//           </h3>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
//               gap: "1rem",
//             }}
//           >
//             <div>
//               <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
//                 App Name
//               </p>
//               <p style={{ fontWeight: 500, color: "var(--text)" }}>
//                 {buildConfig.config.appName}
//               </p>
//             </div>
//             <div>
//               <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
//                 Package Name
//               </p>
//               <p
//                 style={{
//                   fontWeight: 500,
//                   color: "var(--text)",
//                   fontFamily: "monospace",
//                   fontSize: "0.8rem",
//                 }}
//               >
//                 {buildConfig.config.config.androidPackageName}
//               </p>
//             </div>
//             <div>
//               <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
//                 Version
//               </p>
//               <p style={{ fontWeight: 500, color: "var(--text)" }}>
//                 {buildConfig.config.config.version}
//               </p>
//             </div>
//             <div>
//               <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
//                 Brand Color
//               </p>
//               <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//                 <div
//                   style={{
//                     width: 14,
//                     height: 14,
//                     borderRadius: 4,
//                     background: buildConfig.config.theme.primary,
//                   }}
//                 />
//                 <span style={{ fontWeight: 500, color: "var(--text)" }}>
//                   {buildConfig.config.theme.primary}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </Card>
//       )}

//       {/* Instructions */}
//       <Card>
//         <h3
//           style={{
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "1rem",
//             fontSize: "1rem",
//           }}
//         >
//           How to Install Your App
//         </h3>
//         <div
//           style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
//         >
//           {[
//             {
//               num: "1",
//               title: "Download the APK",
//               desc: "Click the download button above to get your APK file",
//             },
//             {
//               num: "2",
//               title: "Enable Unknown Sources",
//               desc: "Go to Settings → Security → Enable 'Install from Unknown Sources'",
//             },
//             {
//               num: "3",
//               title: "Install the App",
//               desc: "Open the downloaded APK file and tap 'Install'",
//             },
//             {
//               num: "4",
//               title: "Share with Customers",
//               desc: "Send the APK to your customers via WhatsApp, email, or direct link",
//             },
//           ].map((step) => (
//             <div key={step.num} style={{ display: "flex", gap: 12 }}>
//               <div
//                 style={{
//                   width: 28,
//                   height: 28,
//                   borderRadius: "50%",
//                   background: "rgba(201,138,84,0.12)",
//                   border: "1px solid rgba(201,138,84,0.2)",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   fontSize: "0.8rem",
//                   fontWeight: 700,
//                   color: "var(--accent)",
//                   flexShrink: 0,
//                 }}
//               >
//                 {step.num}
//               </div>
//               <div>
//                 <p
//                   style={{
//                     fontWeight: 600,
//                     color: "var(--text)",
//                     fontSize: "0.9rem",
//                   }}
//                 >
//                   {step.title}
//                 </p>
//                 <p style={{ fontSize: "0.82rem", color: "var(--dim)" }}>
//                   {step.desc}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>
//       </Card>
//     </div>
//   );
// }
