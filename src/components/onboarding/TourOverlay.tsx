// src/components/onboarding/TourOverlay.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Compass, X } from "lucide-react";
import type { AnchorRect } from "./useTourAnchor";
import type { OnboardingStep } from "@/lib/onboarding/steps";
import type { TourPhase } from "@/lib/onboarding/tour";

interface TourOverlayProps {
  phase: TourPhase;
  /** True while a Next/Back navigation is in flight: dim only, no card. */
  waiting?: boolean;
  step: OnboardingStep | null;
  rect: AnchorRect | null;
  /** The sidebar's rect, spotlighted behind the welcome card on desktop. */
  welcomeRect?: AnchorRect | null;
  /** 1-based position of the current step within the applicable steps. */
  stepIndex: number;
  stepCount: number;
  /** The `tour` slice of the onboarding translations. */
  t: any;
  onStart: () => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onExit: () => void;
  onDone: () => void;
}

const DIM = "rgba(0, 0, 0, 0.62)";
/** Below this the dashboard collapses the sidebar, so there is nothing to spotlight. */
const DESKTOP_MIN = 768;
const MARGIN = 12;
const GAP = 16;
/** Rough height of a step card, used to decide whether it fits below the anchor. */
const STEP_CARD_H = 190;

/**
 * The dashboard walkthrough's visual layer. It is purely informational: a
 * dimmed page with a cutout over whatever is being pointed at, a pulsing
 * highlight ring, and a card the reseller drives with Next/Back/Skip. Nothing
 * on the page is click-gated — the tour never waits on an action.
 *
 * The welcome card spotlights the sidebar (desktop only); the congrats card
 * dims the whole page. Neither captures clicks: the dim is decorative and the
 * page behind stays usable. Both cards are width- and height-capped to the
 * viewport so they stay usable on phones and in landscape.
 */
export default function TourOverlay({
  phase,
  waiting = false,
  step,
  rect,
  welcomeRect = null,
  stepIndex,
  stepCount,
  t,
  onStart,
  onNext,
  onBack,
  onSkip,
  onExit,
  onDone,
}: TourOverlayProps) {
  const reduce = useReducedMotion();

  // Track the viewport so the cards re-place on rotate/resize, in every phase.
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1200,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Esc closes the tour; never trap the reseller.
  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onExit]);

  if (phase === "idle" || phase === "done") return null;

  const { w: vw, h: vh } = vp;

  const title = step ? t?.steps?.[step.key]?.title || step.key : "";
  const blurb = step ? t?.steps?.[step.key]?.blurb || "" : "";
  const progress = (t?.progress || "Step {current} of {total}")
    .replace("{current}", String(stepIndex))
    .replace("{total}", String(stepCount));

  const isFraming = phase === "welcome" || phase === "congrats";
  // What the cutout focuses on: the sidebar on the welcome card (desktop
  // only — it is off-canvas on phones), the current step's anchor while
  // running, nothing (full dim) on the congrats card.
  const activeRect =
    phase === "welcome"
      ? vw >= DESKTOP_MIN
        ? welcomeRect
        : null
      : phase === "running"
        ? rect
        : null;

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
      <DimLayers rect={activeRect} />

      {activeRect && <HighlightRing rect={activeRect} reduce={Boolean(reduce)} />}

      {isFraming ? (
        <FramingCard
          welcome={phase === "welcome"}
          rect={activeRect}
          vw={vw}
          vh={vh}
          t={t}
          reduce={Boolean(reduce)}
          onStart={onStart}
          onExit={onExit}
          onDone={onDone}
        />
      ) : waiting ? null : (
        <StepCard
          rect={rect}
          vw={vw}
          vh={vh}
          stepIndex={stepIndex}
          stepCount={stepCount}
          title={title}
          blurb={blurb}
          progress={progress}
          t={t}
          onNext={onNext}
          onBack={onBack}
          onSkip={onSkip}
          onExit={onExit}
        />
      )}
    </div>
  );
}

/** The dim: four rectangles around the focus, or a full sheet when there is none. */
function DimLayers({ rect }: { rect: AnchorRect | null }) {
  if (!rect) return <div style={dimRegion({ top: 0, left: 0, right: 0, bottom: 0 })} />;
  return (
    <>
      <div style={dimRegion({ top: 0, left: 0, right: 0, height: rect.top })} />
      <div style={dimRegion({ top: rect.bottom, left: 0, right: 0, bottom: 0 })} />
      <div style={dimRegion({ top: rect.top, left: 0, width: rect.left, height: rect.height })} />
      <div style={dimRegion({ top: rect.top, left: rect.right, right: 0, height: rect.height })} />
    </>
  );
}

/** The pulsing brand-coloured ring around the focus. */
function HighlightRing({ rect, reduce }: { rect: AnchorRect; reduce: boolean }) {
  return (
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
  );
}

/** The welcome / congrats card, centred — nudged beside a spotlight if there is one. */
function FramingCard({
  welcome,
  rect,
  vw,
  vh,
  t,
  reduce,
  onStart,
  onExit,
  onDone,
}: {
  welcome: boolean;
  rect: AnchorRect | null;
  vw: number;
  vh: number;
  t: any;
  reduce: boolean;
  onStart: () => void;
  onExit: () => void;
  onDone: () => void;
}) {
  // When a spotlight sits on the left (the sidebar), centre the card in the
  // remaining space so it does not cover what it is pointing at. Otherwise it
  // sits dead centre.
  const left =
    rect && vw >= DESKTOP_MIN && rect.right < vw / 2
      ? rect.right + (vw - rect.right) / 2
      : "50%";

  return (
    <motion.div
      initial={reduce ? false : { scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        position: "fixed",
        top: "50%",
        left,
        // framer-motion owns `transform` (for the scale-in), so centre via its
        // x/y motion values instead of an inline transform, which it would drop.
        x: "-50%",
        y: "-50%",
        pointerEvents: "auto",
        ...glassSurface(16),
        boxSizing: "border-box",
        // Never wider than the viewport minus a margin, nor taller.
        width: `min(380px, calc(100% - ${MARGIN * 2}px))`,
        maxHeight: `calc(100% - ${MARGIN * 2}px)`,
        overflowY: "auto",
        border: welcome
          ? "1px solid var(--border, rgba(201,138,84,0.25))"
          : "1px solid rgba(16,185,129,0.5)",
        padding: "clamp(1.1rem, 4vw, 1.75rem) clamp(1.1rem, 5vw, 2rem)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.7rem",
        textAlign: "center",
      }}
    >
      <span style={{ color: "var(--brand-color, #C98A54)", lineHeight: 0 }}>
        {welcome ? <Compass size={38} /> : <BadgeCheck size={40} />}
      </span>
      <strong
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.05rem, 4vw, 1.15rem)",
          fontWeight: 700,
        }}
      >
        {welcome
          ? t?.welcomeTitle || "Welcome to your dashboard"
          : t?.congratsTitle || "You're all set!"}
      </strong>
      <span style={{ color: "var(--muted, #999)", fontSize: "0.88rem", lineHeight: 1.5 }}>
        {welcome
          ? t?.welcomeBody ||
            "Let's take a quick look around so you know where everything lives."
          : t?.congratsBody ||
            "That's the whole tour. You can replay it any time from Settings."}
      </span>
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          marginTop: "0.4rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {welcome ? (
          <>
            <button type="button" onClick={onExit} style={btnStyle(false)}>
              {t?.later || "Later"}
            </button>
            <button type="button" onClick={onStart} style={btnStyle(true)}>
              {t?.start || "Start tour"}
            </button>
          </>
        ) : (
          <button type="button" onClick={onDone} style={btnStyle(true)}>
            {t?.done || "Done"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/** The per-step card: the walkthrough's Next/Back/Skip control. */
function StepCard({
  rect,
  vw,
  vh,
  stepIndex,
  stepCount,
  title,
  blurb,
  progress,
  t,
  onNext,
  onBack,
  onSkip,
  onExit,
}: {
  rect: AnchorRect | null;
  vw: number;
  vh: number;
  stepIndex: number;
  stepCount: number;
  title: string;
  blurb: string;
  progress: string;
  t: any;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onExit: () => void;
}) {
  const hasAnchor = Boolean(rect);
  // Shrink to fit a phone; never exceed the viewport minus a margin.
  const cardW = Math.min(320, vw - MARGIN * 2);

  // Place the card beside the anchor, clamped to the viewport. Prefer below;
  // fall back to above, then to centred if neither side has room.
  let top: number | string | undefined;
  let bottom: number | undefined;
  let maxHeight = `calc(100% - ${MARGIN * 2}px)`;
  let centered = false;
  if (!rect) {
    centered = true;
  } else if (vh - rect.bottom >= STEP_CARD_H + GAP) {
    top = rect.bottom + GAP;
    maxHeight = `${vh - (rect.bottom + GAP) - MARGIN}px`;
  } else if (rect.top >= STEP_CARD_H + GAP) {
    bottom = vh - rect.top + GAP;
    maxHeight = `${rect.top - GAP - MARGIN}px`;
  } else {
    centered = true;
  }

  const left = rect
    ? Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, MARGIN), vw - cardW - MARGIN)
    : "50%";

  return (
    <div
      style={{
        position: "fixed",
        boxSizing: "border-box",
        width: cardW,
        left,
        top: centered ? "50%" : top,
        bottom: centered ? undefined : bottom,
        transform: centered ? "translate(-50%, -50%)" : undefined,
        maxHeight,
        overflowY: "auto",
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
          aria-label={t?.exit || "Close tour"}
          title={t?.exit || "Close tour"}
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
        <p style={{ color: "var(--muted, #999)", fontSize: "0.82rem", margin: "0 0 0.75rem" }}>
          {blurb}
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "0.76rem", color: "var(--muted, #999)", flex: "1 1 auto", minWidth: 0 }}>
          {hasAnchor
            ? t?.hint || "Here's where you'll find it"
            : t?.noTarget || "This lives on another page"}
        </span>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, marginLeft: "auto" }}>
          {stepIndex > 1 && (
            <button type="button" onClick={onBack} style={btnStyle(false)}>
              {t?.back || "Back"}
            </button>
          )}
          <button type="button" onClick={onSkip} style={btnStyle(false)}>
            {t?.skipStep || "Skip"}
          </button>
          <button type="button" onClick={onNext} style={btnStyle(true)}>
            {stepIndex >= stepCount ? t?.finish || "Finish" : t?.next || "Next"}
          </button>
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
    // The dim is decorative: it never intercepts clicks, so the dashboard
    // stays usable behind the walkthrough.
    pointerEvents: "none",
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
    background: "color-mix(in srgb, var(--card, #1a1512) 60%, transparent)",
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
    whiteSpace: "nowrap",
    background: primary ? "var(--brand-color, #C98A54)" : "transparent",
    color: primary ? "#FDF8F3" : "var(--text, #eee)",
    border: primary ? "none" : "1px solid var(--border, rgba(201,138,84,0.3))",
  };
}
