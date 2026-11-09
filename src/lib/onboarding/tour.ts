// src/lib/onboarding/tour.ts
//
// The sequential onboarding tour's pure state machine. Kept out of the
// provider/overlay so the rules that must not regress are testable without a
// browser:
//
//   * the tour runs the APPLICABLE steps in order, skipping any that are
//     already done (a server-side signal landed) or that the reseller has
//     already moved past this run;
//   * "advance" happens on the CLICK (the hybrid model) — a step is marked
//     `passed` and the tour moves on even while the real signal is still in
//     flight (a wallet payment webhook, a build);
//   * the tour is complete once there is no pending step left.
//
// `passed` is the set of steps the tour has moved beyond this run, by
// celebration or by skip. It is deliberately separate from `done` (the
// real-data signal) so a passed-but-not-yet-confirmed step is not revisited.

import type { OnboardingStep, OnboardingStepKey } from "./steps";

export type TourPhase = "idle" | "running" | "celebrating" | "done";

export interface TourState {
  phase: TourPhase;
  /** The step key in focus; null when idle or done. */
  current: OnboardingStepKey | null;
  /** Steps the tour has moved beyond this run (celebrated or skipped). */
  passed: OnboardingStepKey[];
}

export const IDLE_TOUR: TourState = {
  phase: "idle",
  current: null,
  passed: [],
};

/** The step in focus, or null when idle/done. */
export function stepByKey(
  steps: OnboardingStep[],
  key: OnboardingStepKey | null,
): OnboardingStep | null {
  if (!key) return null;
  return steps.find((s) => s.key === key) ?? null;
}

/**
 * The first step that still needs doing: not done by a real-data signal and
 * not already passed this run. Null when every applicable step is settled.
 */
export function firstPendingKey(
  steps: OnboardingStep[],
  passed: OnboardingStepKey[],
): OnboardingStepKey | null {
  const step = steps.find((s) => !s.done && !passed.includes(s.key));
  return step ? step.key : null;
}

/** Begin the tour at the first pending step, or finish if none remains. */
export function startTour(steps: OnboardingStep[]): TourState {
  const current = firstPendingKey(steps, []);
  if (!current) return { phase: "done", current: null, passed: [] };
  return { phase: "running", current, passed: [] };
}

/** Enter the celebration beat for the current step (the click just landed). */
export function beginCelebration(state: TourState): TourState {
  if (state.phase !== "running") return state;
  return { ...state, phase: "celebrating" };
}

/**
 * Move past the current step — used both to finish a celebration and to skip.
 * The current step is added to `passed` so the tour never revisits it; the
 * tour lands on the next pending step or finishes.
 */
export function advance(steps: OnboardingStep[], state: TourState): TourState {
  if (state.phase === "idle" || state.phase === "done") return state;

  const passed =
    state.current && !state.passed.includes(state.current)
      ? [...state.passed, state.current]
      : state.passed;

  const current = firstPendingKey(steps, passed);
  if (!current) return { phase: "done", current: null, passed };
  return { phase: "running", current, passed };
}

/**
 * Reconcile a RUNNING tour with freshly-computed steps: if the step in focus
 * became done (its signal landed), or the applicable set changed, re-point the
 * tour at the first pending step and finish if none remains. A celebration in
 * progress is left alone — the provider advances it when the beat ends.
 */
export function reconcile(
  steps: OnboardingStep[],
  state: TourState,
): TourState {
  if (state.phase !== "running") return state;

  const current = firstPendingKey(steps, state.passed);
  if (!current) return { phase: "done", current: null, passed: state.passed };
  if (current === state.current) return state;
  return { ...state, current };
}

/** Whether the tour is mid-run (either spotlighting or celebrating). */
export function isTourActive(state: TourState): boolean {
  return state.phase === "running" || state.phase === "celebrating";
}
