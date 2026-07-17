// src/components/reseller/application/StepContainer.tsx
"use client";

import { ReactNode } from "react";

interface StepContainerProps {
  children: ReactNode;
}

export default function StepContainer({ children }: StepContainerProps) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border2)",
        borderRadius: 16,
        padding: "2rem",
        minHeight: 400,
      }}
    >
      {children}
    </div>
  );
}
