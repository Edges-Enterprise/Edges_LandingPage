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
  /** The sidebar's rect, spotlighted behind the banner on desktop. */
  welcomeRect?: AnchorRect | null;
  /** 1-based position of the current step within the applicable steps. */
  stepIndex: number;
  stepCount: number;
  /** How long each step stays up before auto-advancing, in ms. */
  autoAdvanceMs?: number;
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
 * It opens on a bottom BANNER (a small prompt, not a blocking modal) so the
 * dashboard is visible behind it before the tour starts. The banner spotlights
 * the sidebar (desktop only); the congrats card dims the whole page. Neither
 * captures clicks: the dim is decorative and the page behind stays usable.
 * Every card is width- and height-capped to the viewport so it stays usable on
 * phones and in landscape.
 *
 * The auto-advance timer lives here (not in the provider) so the ticking
 * re-renders only this overlay, never the dashboard behind it. Pressing Next
 * jumps the step immediately; Back resets the timer.
 */
export default function TourOverlay({
  phase,
  waiting = false,
  step,
  rect,
  welcomeRect = null,
  stepIndex,
  stepCount,
  autoAdvanceMs = 7000,
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

  // Esc ends the tour; never trap the reseller.
  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onExit]);

  // Auto-advance: only while a step card is actually on screen (not while a
  // navigation is in flight), and reset whenever the step changes.
  const [ratio, setRatio] = useState(0);
  const running = phase === "running" && !waiting;
  useEffect(() => {
    if (!running) {
      setRatio(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      const r = Math.min(1, (Date.now() - startedAt) / autoAdvanceMs);
      setRatio(r);
      if (r >= 1) {
        clearInterval(id);
        onNext();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, stepIndex, autoAdvanceMs, onNext]);

  if (phase === "idle" || phase === "done") return null;

  const { w: vw, h: vh } = vp;

  const title = step ? t?.steps?.[step.key]?.title || step.key : "";
  const blurb = step ? t?.steps?.[step.key]?.blurb || "" : "";
  const progress = (t?.progress || "Step {current} of {total}")
    .replace("{current}", String(stepIndex))
    .replace("{total}", String(stepCount));

  const isFraming = phase === "banner" || phase === "congrats";
  // What the cutout focuses on: the sidebar on the banner (desktop only — it
  // is off-canvas on phones), the current step's anchor while running, nothing
  // (full dim) on the congrats card.
  const activeRect =
    phase === "banner"
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
          welcome={phase === "banner"}
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
          progressRatio={ratio}
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

/**
 * The banner (before the tour) and the congrats card (after it). The banner is
 * a small prompt pinned to the bottom of the viewport, so the dashboard is
 * visible behind it; the congrats card is centred. Both are capped to the
 * viewport and scroll if their content is taller than the screen.
 */
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
  const banner = welcome;
  // The congrats card centres; when a spotlight sits on the left (the sidebar
  // during the banner on desktop) the card centres in the remaining space.
  const centeredLeft =
    rect && vw >= DESKTOP_MIN && rect.right < vw / 2
      ? rect.right + (vw - rect.right) / 2
      : "50%";

  return (
    <motion.div
      initial={reduce ? false : { y: banner ? 24 : 0, scale: banner ? 1 : 0.9, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      style={{
        position: "fixed",
        boxSizing: "border-box",
        pointerEvents: "auto",
        ...glassSurface(banner ? 14 : 16),
        width: `min(${banner ? 460 : 380}px, calc(100% - ${MARGIN * 2}px))`,
        maxHeight: `calc(100% - ${MARGIN * 2}px)`,
        overflowY: "auto",
        border: banner
          ? "1px solid var(--border, rgba(201,138,84,0.25))"
          : "1px solid rgba(16,185,129,0.5)",
        boxShadow: banner
          ? "0 18px 50px rgba(0,0,0,0.5)"
          : "0 12px 40px rgba(0,0,0,0.45)",
        padding: "clamp(1.1rem, 4vw, 1.5rem) clamp(1.1rem, 5vw, 1.75rem)",
        ...(banner
          ? {
              // Banner: pinned low, centred horizontally.
              left: "50%",
              bottom: MARGIN,
              x: "-50%",
            }
          : {
              // Congrats: centred (beside the sidebar if one is spotlighted).
              top: "50%",
              left: centeredLeft,
              x: "-50%",
              y: "-50%",
            }),
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: banner ? "1rem" : "0.7rem",
        textAlign: banner ? "left" : "center",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          color: "var(--brand-color, #C98A54)",
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        {banner ? <Compass size={34} /> : <BadgeCheck size={40} />}
      </span>

      <div style={{ flex: banner ? "1 1 200px" : "1 1 100%", minWidth: 0 }}>
        <strong
          style={{
            display: "block",
            fontFamily: "'Playfair Display', serif",
            fontSize: banner ? "1.05rem" : "clamp(1.05rem, 4vw, 1.15rem)",
            fontWeight: 700,
          }}
        >
          {banner
            ? t?.bannerTitle || "Take a quick tour?"
            : t?.congratsTitle || "You're all set!"}
        </strong>
        <span
          style={{
            display: "block",
            marginTop: 2,
            color: "var(--muted, #999)",
            fontSize: "0.86rem",
            lineHeight: 1.5,
          }}
        >
          {banner
            ? t?.bannerBody ||
              "We'll show you around your whole dashboard — every page and every tool."
            : t?.congratsBody ||
              "You've now seen the whole platform. Replay this tour any time from Settings."}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          marginTop: banner ? 0 : "0.4rem",
          flexWrap: "wrap",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {banner ? (
          <>
            <button type="button" onClick={onExit} style={btnStyle(false)}>
              {t?.skip || "Skip"}
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
  progressRatio,
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
  progressRatio: number;
  t: any;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onExit: () => void;
}) {
  const hasAnchor = Boolean(rect);
  // Shrink to fit a phone; never exceed the viewport minus a margin.
  const cardW = Math.min(320, vw - MARGIN * 2);

  // Place the card beside the anchor when there is room — to the right for a
  // left-column anchor (the sidebar), to the left for a right-column one (the
  // header tools) — so it never covers what it is pointing at. Otherwise fall
  // below, then above, then centred.
  let left: number | string = "50%";
  let top: number | string | undefined;
  let bottom: number | undefined;
  let maxHeight = `calc(100% - ${MARGIN * 2}px)`;
  let centered = false;
  const besideTop = rect
    ? Math.max(MARGIN, Math.min(rect.top + rect.height / 2 - 110, vh - MARGIN - 220))
    : MARGIN;

  if (!rect) {
    centered = true;
  } else if (rect.right + GAP + cardW <= vw - MARGIN) {
    // Beside, on the right.
    left = rect.right + GAP;
    top = besideTop;
  } else if (rect.left - GAP - cardW >= MARGIN) {
    // Beside, on the left.
    left = rect.left - GAP - cardW;
    top = besideTop;
  } else if (vh - rect.bottom >= STEP_CARD_H + GAP) {
    top = rect.bottom + GAP;
    maxHeight = `${vh - (rect.bottom + GAP) - MARGIN}px`;
    left = Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, MARGIN), vw - cardW - MARGIN);
  } else if (rect.top >= STEP_CARD_H + GAP) {
    bottom = vh - rect.top + GAP;
    maxHeight = `${rect.top - GAP - MARGIN}px`;
    left = Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, MARGIN), vw - cardW - MARGIN);
  } else {
    centered = true;
  }

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
          aria-label={t?.exit || "Skip the tour"}
          title={t?.exit || "Skip the tour"}
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

      {/* Auto-advance progress: fills as the timer runs down. */}
      <div
        style={{
          height: 3,
          borderRadius: 999,
          background: "var(--border, rgba(201,138,84,0.18))",
          margin: "0.5rem 0 0.6rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
            background: "var(--brand-color, #C98A54)",
            borderRadius: 999,
            transition: "width 0.2s linear",
          }}
        />
      </div>

      <h4
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1rem",
          fontWeight: 700,
          margin: "0 0 0.25rem",
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
            {t?.skip || "Skip"}
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
