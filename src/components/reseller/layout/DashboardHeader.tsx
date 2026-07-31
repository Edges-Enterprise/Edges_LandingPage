// src/components/reseller/layout/DashboardHeader.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell, User, ChevronDown, Menu } from "lucide-react";

interface DashboardHeaderProps {
  user: any;
  countryCode: string;
  onMenuClick?: () => void;
}

export default function DashboardHeader({
  user,
  countryCode,
  onMenuClick,
}: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName =
    user?.user_metadata?.first_name || user?.email?.split("@")[0] || "Reseller";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        background: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="show-mobile-menu"
            aria-label="Open menu"
            style={{
              display: "none",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--text)",
            }}
          >
            {getGreeting()}, {firstName} 👋
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              margin: 0,
            }}
          >
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "0.5rem",
            borderRadius: "50%",
            position: "relative",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Bell size={20} />
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              background: "#EF4444",
              borderRadius: "50%",
              border: "2px solid var(--bg)",
            }}
          />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.25rem 0.75rem 0.25rem 0.25rem",
            borderRadius: 8,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--brand-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FDF8F3",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            {firstName.charAt(0).toUpperCase()}
          </div>
          <ChevronDown size={16} style={{ color: "var(--dim)" }} />
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .show-mobile-menu {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}

// // src/components/reseller/layout/DashboardHeader.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { Bell, User, ChevronDown } from "lucide-react";

// interface DashboardHeaderProps {
//   user: any;
//   countryCode: string;
// }

// export default function DashboardHeader({
//   user,
//   countryCode,
// }: DashboardHeaderProps) {
//   const [currentTime, setCurrentTime] = useState(new Date());

//   useEffect(() => {
//     const timer = setInterval(() => setCurrentTime(new Date()), 60000);
//     return () => clearInterval(timer);
//   }, []);

//   const getGreeting = () => {
//     const hour = currentTime.getHours();
//     if (hour < 12) return "Good morning";
//     if (hour < 17) return "Good afternoon";
//     return "Good evening";
//   };

//   const firstName =
//     user?.user_metadata?.first_name || user?.email?.split("@")[0] || "Reseller";

//   return (
//     <header
//       style={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "space-between",
//         width: "100%",
//         background: "transparent",
//       }}
//     >
//       <div>
//         <h2
//           style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "1.25rem",
//             fontWeight: 700,
//             margin: 0,
//             color: "var(--text)",
//           }}
//         >
//           {getGreeting()}, {firstName} 👋
//         </h2>
//         <p
//           style={{
//             fontSize: "0.8rem",
//             color: "var(--muted)",
//             margin: 0,
//           }}
//         >
//           {currentTime.toLocaleDateString("en-US", {
//             weekday: "long",
//             year: "numeric",
//             month: "long",
//             day: "numeric",
//           })}
//         </p>
//       </div>

//       <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
//         <button
//           style={{
//             background: "transparent",
//             border: "none",
//             color: "var(--muted)",
//             cursor: "pointer",
//             padding: "0.5rem",
//             borderRadius: "50%",
//             position: "relative",
//             transition: "background 0.2s",
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.background = "var(--bg2)";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.background = "transparent";
//           }}
//         >
//           <Bell size={20} />
//           <span
//             style={{
//               position: "absolute",
//               top: 4,
//               right: 4,
//               width: 8,
//               height: 8,
//               background: "#EF4444",
//               borderRadius: "50%",
//               border: "2px solid var(--bg)",
//             }}
//           />
//         </button>

//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: "0.5rem",
//             padding: "0.25rem 0.75rem 0.25rem 0.25rem",
//             borderRadius: 8,
//             cursor: "pointer",
//             transition: "background 0.2s",
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.background = "var(--bg2)";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.background = "transparent";
//           }}
//         >
//           <div
//             style={{
//               width: 32,
//               height: 32,
//               borderRadius: "50%",
//               background: "var(--brand-color)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               color: "var(--text)",
//               fontWeight: 600,
//               fontSize: "0.85rem",
//             }}
//           >
//             {firstName.charAt(0).toUpperCase()}
//           </div>
//           <ChevronDown size={16} style={{ color: "var(--dim)" }} />
//         </div>
//       </div>
//     </header>
//   );
// }
