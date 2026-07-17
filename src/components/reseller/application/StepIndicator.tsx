// src/components/reseller/application/StepIndicator.tsx
"use client";

import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: { id: string; label: string }[];
  currentStep: number;
  completed: string[];
}

export default function StepIndicator({
  steps,
  currentStep,
  completed,
}: StepIndicatorProps) {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
          padding: "0 1rem",
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "2.5rem",
            right: "2.5rem",
            height: "2px",
            background: "var(--border)",
            zIndex: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
              background: "var(--accent)",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted =
            completed.includes(step.id) || index < currentStep;

          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                zIndex: 1,
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isCompleted
                    ? "var(--accent)"
                    : isActive
                      ? "var(--accent)"
                      : "var(--border)",
                  color: isCompleted || isActive ? "#FDF8F3" : "var(--muted)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  border: isActive ? "2px solid var(--accent-lt)" : "none",
                }}
              >
                {isCompleted ? <Check size={16} /> : index + 1}
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: isActive ? "var(--text)" : "var(--muted)",
                  fontWeight: isActive ? 600 : 400,
                  textAlign: "center",
                  transition: "color 0.3s ease",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
