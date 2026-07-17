// src/components/reseller/application/ApplicationSkeleton.tsx
"use client";

import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  delay?: string;
  style?: React.CSSProperties; // ✅ add this
}

function SkeletonLine({
  width = "100%",
  height = "16px",
  borderRadius = "4px",
  delay = "0s",
  style
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "var(--bg2)",
        animation: `pulse 1.5s ease-in-out infinite ${delay}`,
        ...style, // ✅ merge caller's style in
      }}
    />
  );
}

export default function ApplicationSkeleton() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 5% 4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <SkeletonLine width={240} height={36} borderRadius={8} delay="0s" />
        <SkeletonLine
          width={320}
          height={20}
          borderRadius={6}
          delay="0.2s"
          style={{ margin: "0.5rem auto 0" }}
        />
      </div>

      {/* Steps */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0 1rem",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "2.5rem",
              right: "2.5rem",
              height: "2px",
              background: "var(--border)",
            }}
          />
          {[1, 2, 3, 4].map((i, index) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: index === 0 ? "var(--accent)" : "var(--bg2)",
                  animation:
                    index === 0 ? "none" : "pulse 1.5s ease-in-out infinite",
                }}
              />
              <SkeletonLine
                width={60}
                height={12}
                borderRadius={4}
                delay={index === 0 ? "0s" : `${index * 0.15}s`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border2)",
          borderRadius: 16,
          padding: "2rem",
          minHeight: 400,
        }}
      >
        <SkeletonLine width={200} height={28} borderRadius={6} delay="0s" />
        <SkeletonLine
          width={300}
          height={16}
          borderRadius={4}
          delay="0.15s"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem" }}
        />

        <div style={{ display: "grid", gap: "1.25rem" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <SkeletonLine
                width={120}
                height={14}
                borderRadius={4}
                delay={`${i * 0.1}s`}
                style={{ marginBottom: "0.35rem" }}
              />
              <SkeletonLine
                height={48}
                borderRadius={8}
                delay={`${i * 0.1 + 0.05}s`}
              />
            </div>
          ))}
        </div>

        <SkeletonLine
          height={52}
          borderRadius={10}
          delay="0.3s"
          style={{ marginTop: "2rem" }}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
