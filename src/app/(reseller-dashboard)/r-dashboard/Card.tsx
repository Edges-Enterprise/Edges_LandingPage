// app/(reseller-dashboard)/r-dashboard/Card.tsx

import React from "react";

interface CardProps {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

export function Card({
  children,
  padding = "md",
  className,
  style,
}: CardProps) {
  const paddings = {
    none: { padding: 0 },
    sm: { padding: "0.75rem 1rem" },
    md: { padding: "1.25rem 1.5rem" },
    lg: { padding: "1.5rem 2rem" },
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        ...paddings[padding],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
