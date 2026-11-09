// src/lib/onboarding/tour.ts
//
// The dashboard walkthrough's pure state machine. It is a plain, linear
// slideshow — no action gating, no waiting on real-data signals:
//
//   * it opens on a BANNER the reseller opts into (or skips);
//   * each step spotlights a real dashboard element and advances on its own
//     timer, or early when the reseller presses Next (or Back);
//   * it ends on a CONGRATS card, or immediately when the reseller skips.
//
// Kept out of the provider/overlay so the transitions are testable without a
// browser.

import type { OnboardingStep } from "./steps";

export type TourPhase = "idle" | "banner" | "running" | "congrats" | "done";

export interface TourState {
  phase: TourPhase;
  /** Index into the applicable steps; only meaningful while running. */
  index: number;
}

export const IDLE_TOUR: TourState = { phase: "idle", index: 0 };

/** Whether the tour is on screen (banner, spotlighting, or congratulating). */
export function isTourActive(state: TourState): boolean {
  return (
    state.phase === "banner" ||
    state.phase === "running" ||
    state.phase === "congrats"
  );
}

/** Open on the banner; finish immediately if there is nothing to show. */
export function startBanner(stepCount: number): TourState {
  if (stepCount <= 0) return { phase: "done", index: 0 };
  return { phase: "banner", index: 0 };
}

/** Leave the banner and begin the first step. */
export function beginTour(state: TourState): TourState {
  if (state.phase !== "banner") return state;
  return { phase: "running", index: 0 };
}

/** Advance one step, or move to the congrats card after the last step. */
export function goNext(stepCount: number, state: TourState): TourState {
  if (state.phase !== "running") return state;
  const next = state.index + 1;
  if (next >= stepCount) return { phase: "congrats", index: stepCount };
  return { phase: "running", index: next };
}

/** Step back; a no-op at the first step. */
export function goBack(state: TourState): TourState {
  if (state.phase !== "running") return state;
  return { phase: "running", index: Math.max(0, state.index - 1) };
}

/** Close the tour (skip, or Done on the congrats card). */
export function finishTour(state: TourState): TourState {
  return { phase: "done", index: state.index };
}

/** The step in focus, or null unless the tour is spotlighting one. */
export function currentStep(
  steps: OnboardingStep[],
  state: TourState,
): OnboardingStep | null {
  if (state.phase !== "running") return null;
  return steps[state.index] ?? null;
}
