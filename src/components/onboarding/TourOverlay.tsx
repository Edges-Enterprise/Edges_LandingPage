// src/components/onboarding/TourOverlay.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Compass, Pause, Play, X } from "lucide-react";
import type { AnchorRect } from "./useTourAnchor";
import type { OnboardingStep } from "@/lib/onboarding/steps";
import type { TourPhase } from "@/lib/onboarding/tour";

interface TourOverlayProps {
  phase: TourPhase;
  /** True while a Next/Back navigation is in flight: the page is left clear. */
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

/**
 * How much the backdrop is dimmed. Deliberately light (driver.js defaults to
 * 0.5) so the page behind stays readable: this is a transparent overlay that
 * points at real elements, never a blackout.
 */
const DIM = "rgba(0, 0, 0, 0.5)";
/** Breathing room between the highlighted element and the cutout (driver.js stagePadding). */
const PAD = 8;
/** Cutout corner radius (driver.js stageRadius). */
const RADIUS = 12;
/** Below this the dashboard collapses the sidebar, so there is nothing to spotlight. */
const DESKTOP_MIN = 768;
const MARGIN = 12;
const GAP = 16;
/** Rough height of a step card, used to decide whether it fits below the anchor. */
const STEP_CARD_H = 190;
/**
 * Grace period after arriving on a step's page before the spotlight appears.
 * The anchor mounts a frame or two after navigation and a smooth scroll keeps
 * moving it; waiting a beat avoids pointing the spotlight at a stale spot.
 */
const SETTLE_MS = 600;

const pad = (r: AnchorRect): AnchorRect => ({
  top: r.top - PAD,
  left: r.left - PAD,
  width: r.width + PAD * 2,
  height: r.height + PAD * 2,
  bottom: r.bottom + PAD,
  right: r.right + PAD,
});

/**
 * The dashboard walkthrough's visual layer. It is purely informational: a
 * lightly-dimmed page with a rounded cutout over whatever is being pointed at,
 * a pulsing ring, a cursor that glides to the target, and a card the reseller
 * drives with Next/Back/Skip. Nothing on the page is click-gated.
 *
 * The overlay never blocks the page: the dim is decorative (pointer-events:
 * none) so the dashboard stays visible and usable behind the tour. While a
 * step's page is loading it draws no dim at all, so the tour never covers the
 * page it is moving to.
 *
 * Auto-advance is pause-aware: it stops while the reseller hovers the card or
 * the highlighted element, while the card holds focus, or after any key/touch,
 * and resumes when they move away. Next jumps immediately; Back resets.
 */
export default function TourOverlay({
  phase,
  waiting = false,
  step,
  rect,
  welcomeRect = null,
  stepIndex,
  stepCount,
  autoAdvanceMs = 11000,
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

  const running = phase === "running" && !waiting;

  // Hold the spotlight until the step's page has settled, so it never points
  // at the previous page's element.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!running) return;
    const id = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(id);
  }, [running, stepIndex]);

  // What the cutout focuses on: the sidebar on the banner (desktop only — it
  // is off-canvas on phones), the current step's anchor while running, nothing
  // (full dim) on the congrats card.
  const spotRect =
    phase === "banner"
      ? vp.w >= DESKTOP_MIN
        ? welcomeRect
        : null
      : running && settled && rect
        ? rect
        : null;

  // ---- Pause-aware auto-advance ------------------------------------------
  const hoverCard = useRef(false);
  const hoverTarget = useRef(false);
  const focused = useRef(false);
  const manual = useRef(false);
  // An explicit Play/Pause choice, kept for the rest of the tour.
  const [userPaused, setUserPaused] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const userPausedRef = useRef(false);
  const recomputePaused = () => {
    const p =
      userPausedRef.current ||
      hoverCard.current ||
      hoverTarget.current ||
      focused.current ||
      manual.current;
    pausedRef.current = p;
    setPaused(p);
  };
  const togglePause = () => {
    userPausedRef.current = !userPausedRef.current;
    setUserPaused(userPausedRef.current);
    recomputePaused();
  };

  // A new step clears the one-off "manual" pause (touch/key), but keeps
  // hover/focus pauses that are still physically true.
  useEffect(() => {
    manual.current = false;
    recomputePaused();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, phase]);

  // Pause while the pointer is over the highlighted element.
  useEffect(() => {
    if (!spotRect) {
      hoverTarget.current = false;
      recomputePaused();
      return;
    }
    const onMove = (e: PointerEvent) => {
      const inside =
        e.clientX >= spotRect.left &&
        e.clientX <= spotRect.right &&
        e.clientY >= spotRect.top &&
        e.clientY <= spotRect.bottom;
      if (inside !== hoverTarget.current) {
        hoverTarget.current = inside;
        recomputePaused();
      }
    };
    window.addEventListener("pointermove", onMove, true);
    return () => window.removeEventListener("pointermove", onMove, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotRect?.left, spotRect?.top, spotRect?.right, spotRect?.bottom]);

  // Any key press pauses the current step.
  useEffect(() => {
    if (!running) return;
    const onKey = () => {
      manual.current = true;
      recomputePaused();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, stepIndex]);

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!running) {
      setProgress(0);
      return;
    }
    let remaining = autoAdvanceMs;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (pausedRef.current) return;
      remaining -= dt;
      setProgress(Math.min(1, Math.max(0, 1 - remaining / autoAdvanceMs)));
      if (remaining <= 0) {
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
  const progressLabel = (t?.progress || "Step {current} of {total}")
    .replace("{current}", String(stepIndex))
    .replace("{total}", String(stepCount));

  const isFraming = phase === "banner" || phase === "congrats";

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
      {/* The dim only appears once the current page has settled (or on the
          framing cards): showing a full-page dim while the step's page is
          still loading reads as the tour "covering the page". */}
      {!waiting && (phase !== "running" || settled) && (
        <DimLayers rect={spotRect} reduce={Boolean(reduce)} />
      )}

      {spotRect && (
        <>
          <SpotlightRing rect={spotRect} reduce={Boolean(reduce)} />
          <TourCursor rect={spotRect} reduce={Boolean(reduce)} />
        </>
      )}

      {isFraming ? (
        <FramingCard
          welcome={phase === "banner"}
          rect={spotRect}
          vw={vw}
          vh={vh}
          t={t}
          reduce={Boolean(reduce)}
          onStart={onStart}
          onExit={onExit}
          onDone={onDone}
        />
      ) : (
        <StepCard
          rect={spotRect}
          vw={vw}
          vh={vh}
          stepIndex={stepIndex}
          stepCount={stepCount}
          title={title}
          blurb={blurb}
          progressLabel={progressLabel}
          progressRatio={progress}
          paused={paused}
          userPaused={userPaused}
          onTogglePause={togglePause}
          t={t}
          reduce={Boolean(reduce)}
          onNext={onNext}
          onBack={onBack}
          onSkip={onSkip}
          onExit={onExit}
          onHover={(v) => {
            hoverCard.current = v;
            recomputePaused();
          }}
          onFocus={(v) => {
            focused.current = v;
            recomputePaused();
          }}
          onTouch={() => {
            manual.current = true;
            recomputePaused();
          }}
        />
      )}
    </div>
  );
}

/**
 * The dim: four rectangles around the padded focus (a soft cutout with rounded
 * corners), or a full sheet when there is no focus. Decorative only — it never
 * intercepts clicks, so the dashboard stays visible and usable behind it.
 */
function DimLayers({ rect, reduce }: { rect: AnchorRect | null; reduce: boolean }) {
  if (!rect) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        style={dimRegion({ top: 0, left: 0, right: 0, bottom: 0 })}
      />
    );
  }
  const r = pad(rect);
  return (
    <>
      <div style={dimRegion({ top: 0, left: 0, right: 0, height: Math.max(0, r.top) })} />
      <div style={dimRegion({ top: r.bottom, left: 0, right: 0, bottom: 0 })} />
      <div
        style={{
          ...dimRegion({ top: r.top, left: 0, width: Math.max(0, r.left), height: r.height }),
          borderTopRightRadius: RADIUS,
          borderBottomRightRadius: RADIUS,
        }}
      />
      <div
        style={{
          ...dimRegion({ top: r.top, left: r.right, right: 0, height: r.height }),
          borderTopLeftRadius: RADIUS,
          borderBottomLeftRadius: RADIUS,
        }}
      />
    </>
  );
}

/** The pulsing brand-coloured ring tracing the cutout. */
function SpotlightRing({ rect, reduce }: { rect: AnchorRect; reduce: boolean }) {
  const r = pad(rect);
  return (
    <motion.div
      aria-hidden
      animate={
        reduce
          ? undefined
          : {
              boxShadow: [
                "0 0 0 0 rgba(var(--brand-color-rgb, 201, 138, 84), 0.5)",
                "0 0 0 12px rgba(var(--brand-color-rgb, 201, 138, 84), 0)",
              ],
            }
      }
      transition={{ duration: 1.6, repeat: Infinity }}
      style={{
        position: "fixed",
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        borderRadius: RADIUS,
        border: "2px solid var(--brand-color, #C98A54)",
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * A pointer that glides to the highlighted element, so the reseller's eye is
 * drawn to exactly what is being described (the pattern used by Appcues,
 * Pendo and WalkMe tours). Its tip lands on the centre of the target.
 */
function TourCursor({ rect, reduce }: { rect: AnchorRect; reduce: boolean }) {
  const r = pad(rect);
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return (
    <motion.div
      aria-hidden
      initial={reduce ? false : { opacity: 0, scale: 0.5, left: cx, top: cy }}
      animate={{ opacity: 1, scale: 1, left: cx, top: cy }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 260, damping: 24, opacity: { duration: 0.2 } }
      }
      style={{
        position: "fixed",
        marginLeft: -3,
        marginTop: -2,
        pointerEvents: "none",
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))",
        zIndex: 2,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3l14 7-6 1.6L9.5 20 5 3z"
          fill="var(--brand-color, #C98A54)"
          stroke="#FDF8F3"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
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
          ? { left: "50%", bottom: MARGIN, x: "-50%" }
          : { top: "50%", left: centeredLeft, x: "-50%", y: "-50%" }),
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: banner ? "1rem" : "0.7rem",
        textAlign: banner ? "left" : "center",
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "var(--brand-color, #C98A54)", lineHeight: 0, flexShrink: 0 }}>
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
          {banner ? t?.bannerTitle || "Take a quick tour?" : t?.congratsTitle || "You're all set!"}
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
  progressLabel,
  progressRatio,
  paused,
  userPaused,
  onTogglePause,
  t,
  reduce,
  onNext,
  onBack,
  onSkip,
  onExit,
  onHover,
  onFocus,
  onTouch,
}: {
  rect: AnchorRect | null;
  vw: number;
  vh: number;
  stepIndex: number;
  stepCount: number;
  title: string;
  blurb: string;
  progressLabel: string;
  progressRatio: number;
  paused: boolean;
  userPaused: boolean;
  onTogglePause: () => void;
  t: any;
  reduce: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onExit: () => void;
  onHover: (v: boolean) => void;
  onFocus: (v: boolean) => void;
  onTouch: () => void;
}) {
  const hasAnchor = Boolean(rect);
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
    left = rect.right + GAP;
    top = besideTop;
  } else if (rect.left - GAP - cardW >= MARGIN) {
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
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocusCapture={() => onFocus(true)}
      onBlurCapture={() => onFocus(false)}
      onTouchStart={onTouch}
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
        transition: "left 0.3s ease, top 0.3s ease, bottom 0.3s ease",
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
          {progressLabel}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={
              userPaused ? t?.resume || "Resume" : t?.pause || "Pause"
            }
            title={userPaused ? t?.resume || "Resume" : t?.pause || "Pause"}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted, #999)",
              cursor: "pointer",
              padding: 2,
              lineHeight: 0,
            }}
          >
            {userPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
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
      </div>

      {/* Auto-advance progress: fills as the timer runs down; holds while paused. */}
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
          {paused && !userPaused
            ? t?.pausedHint || "Paused — move away to continue"
            : hasAnchor
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
    </motion.div>
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
    background: "color-mix(in srgb, var(--card, #1a1512) 82%, transparent)",
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
