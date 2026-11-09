// Task 9 — tour state-machine tests.
//
// Run with:  deno test src/lib/onboarding/tour.test.ts
//
// These pin the rules the sequential tour depends on: it starts at the first
// PENDING step, skips steps already done by a real-data signal, advances on
// the click (celebration -> next) rather than waiting for the signal, never
// revisits a passed step, and finishes when nothing is pending.

import { assertEquals } from "jsr:@std/assert@1";
import {
  advance,
  beginCelebration,
  firstPendingKey,
  IDLE_TOUR,
  isTourActive,
  reconcile,
  startTour,
  stepByKey,
} from "./tour.ts";
import type { OnboardingStep, OnboardingStepKey } from "./steps.ts";

// Minimal step stand-ins: the machine only reads key + done.
function step(key: OnboardingStepKey, done = false): OnboardingStep {
  return { key, done, href: `/${key}`, anchor: key, path: `/x/${key}` };
}

const FOUR: OnboardingStep[] = [
  step("fund_wallet"),
  step("set_markup"),
  step("publish"),
  step("visit_storefront"),
];

Deno.test("idle tour is not active", () => {
  assertEquals(isTourActive(IDLE_TOUR), false);
  assertEquals(IDLE_TOUR.current, null);
});

Deno.test("starts at the first pending step", () => {
  const s = startTour(FOUR);
  assertEquals(s.phase, "running");
  assertEquals(s.current, "fund_wallet");
  assertEquals(isTourActive(s), true);
});

Deno.test("skips steps already done by a real-data signal", () => {
  const steps = [step("fund_wallet", true), step("set_markup"), step("publish")];
  const s = startTour(steps);
  assertEquals(s.current, "set_markup");
});

Deno.test("all steps done -> starts already complete", () => {
  const steps = [step("fund_wallet", true), step("set_markup", true)];
  const s = startTour(steps);
  assertEquals(s.phase, "done");
  assertEquals(s.current, null);
  assertEquals(isTourActive(s), false);
});

Deno.test("celebration only happens from running", () => {
  const running = startTour(FOUR);
  assertEquals(beginCelebration(running).phase, "celebrating");
  assertEquals(beginCelebration(IDLE_TOUR).phase, "idle");
});

Deno.test("advance moves to the next pending step and records the passed one", () => {
  let s = startTour(FOUR);
  s = beginCelebration(s);
  s = advance(FOUR, s);
  assertEquals(s.phase, "running");
  assertEquals(s.current, "set_markup");
  assertEquals(s.passed, ["fund_wallet"]);
});

Deno.test("advance past the last step finishes the tour", () => {
  let s = startTour([step("fund_wallet")]);
  s = beginCelebration(s);
  s = advance([step("fund_wallet")], s);
  assertEquals(s.phase, "done");
  assertEquals(s.current, null);
});

Deno.test("a passed step is never revisited even while its signal is false", () => {
  // fund_wallet stays done:false (payment still confirming) but was passed.
  let s = startTour(FOUR);
  s = advance(FOUR, beginCelebration(s));
  assertEquals(s.current, "set_markup");
  // Reconcile with unchanged signals must not bounce back to fund_wallet.
  s = reconcile(FOUR, s);
  assertEquals(s.current, "set_markup");
});

Deno.test("skip advances without celebrating", () => {
  let s = startTour(FOUR);
  s = advance(FOUR, s);
  assertEquals(s.current, "set_markup");
  assertEquals(s.phase, "running");
});

Deno.test("reconcile re-points a running tour when the focused step lands", () => {
  let s = startTour(FOUR);
  const confirmed = [step("fund_wallet", true), ...FOUR.slice(1)];
  s = reconcile(confirmed, s);
  assertEquals(s.current, "set_markup");
});

Deno.test("reconcile finishes a running tour when the last step lands", () => {
  let s = startTour([step("fund_wallet")]);
  s = reconcile([step("fund_wallet", true)], s);
  assertEquals(s.phase, "done");
});

Deno.test("reconcile leaves a celebration alone", () => {
  const s = beginCelebration(startTour(FOUR));
  const confirmed = [step("fund_wallet", true), ...FOUR.slice(1)];
  assertEquals(reconcile(confirmed, s).phase, "celebrating");
});

Deno.test("firstPendingKey ignores done and passed", () => {
  assertEquals(firstPendingKey(FOUR, []), "fund_wallet");
  assertEquals(firstPendingKey(FOUR, ["fund_wallet"]), "set_markup");
  assertEquals(
    firstPendingKey([step("fund_wallet", true)], []),
    null,
  );
});

Deno.test("stepByKey resolves a key to its step", () => {
  assertEquals(stepByKey(FOUR, "publish")?.key, "publish");
  assertEquals(stepByKey(FOUR, null), null);
});
