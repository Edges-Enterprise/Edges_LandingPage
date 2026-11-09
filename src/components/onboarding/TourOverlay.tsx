// src/components/onboarding/TourOverlay.tsx
"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, X } from "lucide-react";
import type { AnchorRect } from "./useTourAnchor";
import type { OnboardingStep } from "@/lib/onboarding/steps";
import type { TourPhase } from "@/lib/onboarding/tour";

interface TourOverlayProps {
  phase: TourPhase;
  step: OnboardingStep | null;
  rect: AnchorRect | null;
  /** 1-based position of the current step within the applicable steps. */
  stepIndex: number;
  stepCount: number;
  /** The `tour` slice of the onboarding translations. */
  t: any;
  onAnchorClick: () => void;
  onContinue: () => void;
  onSkipStep: () => void;
  onExit: () => void;
}

const DIM = "rgba(0, 0, 0, 0.62)";

/**
 * The sequential tour's visual layer: a dimmed page with a cutout over the
 * current step's anchor, a pulsing highlight ring, a tooltip, and the
 * celebration beat. The anchor stays clickable (clicks are swallowed
 * everywhere else); the tour advances when the reseller actually clicks it.
 */
export default function TourOverlay({
  phase,
  step,
  rect,
  stepIndex,
  stepCount,
  t,
  onAnchorClick,
  onContinue,
  onSkipStep,
  onExit,
}: TourOverlayProps) {
  const reduce = useReducedMotion();

  // Esc exits the whole tour; never trap the reseller.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  // The anchor click is the completion gesture. Listen in the capture phase
  // so it fires before the button's own handler navigates/opens a modal.
  useEffect(() => {
    if (phase !== "running" || !step) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(`[data-tour="${step.anchor}"]`)) {
        onAnchorClick();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [phase, step, onAnchorClick]);

  if (phase === "idle" || phase === "done" || !step) return null;

  const title = t?.steps?.[step.key]?.title || step.key;
  const blurb = t?.steps?.[step.key]?.blurb || "";
  const progress = (t?.progress || "Step {current} of {total}")
    .replace("{current}", String(stepIndex))
    .replace("{total}", String(stepCount));

  if (phase === "celebrating") {
    return (
      <div
        className="tour-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.5)",
        }}
        aria-live="polite"
      >
        <motion.div
          initial={reduce ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            ...glassSurface(14),
            border: "1px solid rgba(16,185,129,0.5)",
            padding: "1.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.6rem",
            textAlign: "center",
            maxWidth: 320,
          }}
        >
          <motion.span
            animate={
              reduce ? undefined : { scale: [1, 1.15, 1] }
            }
            transition={{ duration: 0.5 }}
            style={{ color: "#10B981", lineHeight: 0 }}
          >
            <BadgeCheck size={40} />
          </motion.span>
          <strong style={{ fontSize: "1rem" }}>
            {t?.celebrate || "Nice — that's done!"}
          </strong>
          <span style={{ color: "var(--muted, #999)", fontSize: "0.85rem" }}>
            {title}
          </span>
        </motion.div>
      </div>
    );
  }

  // phase === "running"
  const hasAnchor = Boolean(rect);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const tipWidth = 320;
  const tipTop = rect ? rect.bottom + 16 : 0;
  const placeBelow = !rect || rect.bottom + 16 + 200 < vh;
  const clampedLeft = rect
    ? Math.min(Math.max(rect.left + rect.width / 2 - tipWidth / 2, 12), vw - tipWidth - 12)
    : 0;

  return (
    <div
      className="tour-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        pointerEvents: "none",
      }}
      aria-live="polite"
    >
      {/* Dim: four rectangles around the anchor, so clicks land only on it.
          With no anchor we dim the whole page and centre the tooltip. */}
      {rect ? (
        <>
          <div
            style={dimRegion({ top: 0, left: 0, right: 0, height: rect.top })}
          />
          <div
            style={dimRegion({
              top: rect.bottom,
              left: 0,
              right: 0,
              bottom: 0,
            })}
          />
          <div
            style={dimRegion({
              top: rect.top,
              left: 0,
              width: rect.left,
              height: rect.height,
            })}
          />
          <div
            style={dimRegion({
              top: rect.top,
              left: rect.right,
              right: 0,
              height: rect.height,
            })}
          />
          {/* Pulsing highlight ring */}
          <motion.div
            aria-hidden
            animate={
              reduce
                ? undefined
                : {
                    boxShadow: [
                      "0 0 0 0 rgba(var(--brand-color-rgb, 201, 138, 84), 0.55)",
                      "0 0 0 10px rgba(var(--brand-color-rgb, 201, 138, 84), 0)",
                    ],
                  }
            }
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{
              position: "fixed",
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              borderRadius: 12,
              border: "2px solid var(--brand-color, #C98A54)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        <div style={dimRegion({ top: 0, left: 0, right: 0, bottom: 0 })} />
      )}

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          width: tipWidth,
          left: rect ? clampedLeft : "50%",
          top: rect ? (placeBelow ? tipTop : undefined) : "50%",
          bottom:
            rect && !placeBelow ? vh - rect.top + 16 : undefined,
          transform: rect
            ? undefined
            : "translate(-50%, -50%)",
          pointerEvents: "auto",
          ...glassSurface(12),
          border: "1px solid var(--border, rgba(201,138,84,0.25))",
          padding: "1rem 1.1rem",
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--brand-color, #C98A54)",
              fontWeight: 700,
            }}
          >
            {progress}
          </span>
          <button
            type="button"
            onClick={onExit}
            aria-label={t?.exit || "Skip tour"}
            title={t?.exit || "Skip tour"}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted, #999)",
              cursor: "pointer",
              padding: 2,
              lineHeight: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <h4
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1rem",
            fontWeight: 700,
            margin: "0.5rem 0 0.25rem",
          }}
        >
          {title}
        </h4>
        {blurb && (
          <p
            style={{
              color: "var(--muted, #999)",
              fontSize: "0.82rem",
              margin: "0 0 0.75rem",
            }}
          >
            {blurb}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.76rem", color: "var(--muted, #999)" }}>
            {hasAnchor
              ? t?.hint || "Click the highlighted button to continue"
              : t?.noTarget || "This step isn't available right now"}
          </span>
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            {!hasAnchor && (
              <button
                type="button"
                onClick={onContinue}
                style={btnStyle(true)}
              >
                {t?.continue || "Continue"}
              </button>
            )}
            <button type="button" onClick={onSkipStep} style={btnStyle(false)}>
              {t?.skipStep || "Skip"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function dimRegion(r: {
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number | string;
  height?: number | string;
}): React.CSSProperties {
  return {
    position: "fixed",
    ...r,
    background: DIM,
    pointerEvents: "auto",
  };
}

/**
 * Frosted-glass surface for the tour cards: a translucent tint that lets the
 * dimmed page read through, plus a backdrop blur. Uses the dashboard theme's
 * `--card` variable so it tracks light/dark, wrapped in a translucent tint
 * (color-mix is supported everywhere the rest of the theme relies on it).
 */
function glassSurface(radius: number): React.CSSProperties {
  return {
    background:
      "color-mix(in srgb, var(--card, #1a1512) 60%, transparent)",
    backdropFilter: "blur(16px) saturate(1.5)",
    WebkitBackdropFilter: "blur(16px) saturate(1.5)",
    borderRadius: radius,
  };
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.9rem",
    borderRadius: 8,
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    background: primary ? "var(--brand-color, #C98A54)" : "transparent",
    color: primary ? "#FDF8F3" : "var(--text, #eee)",
    border: primary ? "none" : "1px solid var(--border, rgba(201,138,84,0.3))",
  };
}
