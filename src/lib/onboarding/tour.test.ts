// The dashboard walkthrough's state-machine tests.
//
// Run with:  deno test src/lib/onboarding/tour.test.ts
//
// These pin the linear-slideshow rules: it opens on a welcome card, advances
// only on Next/Back, ends on a congrats card, and can be skipped at any point.
// Nothing waits on an action or a real-data signal.

import { assertEquals } from "jsr:@std/assert@1";
import {
  beginTour,
  currentStep,
  finishTour,
  goBack,
  goNext,
  IDLE_TOUR,
  isTourActive,
  startWelcome,
} from "./tour.ts";
import type { OnboardingStep, OnboardingStepKey } from "./steps.ts";

function step(key: OnboardingStepKey): OnboardingStep {
  return { key, anchor: key, path: `/x/${key}` };
}

const FOUR: OnboardingStep[] = [
  step("fund_wallet"),
  step("set_markup"),
  step("publish"),
  step("visit_storefront"),
];

Deno.test("idle tour is not active", () => {
  assertEquals(isTourActive(IDLE_TOUR), false);
});

Deno.test("welcome opens and is active", () => {
  const s = startWelcome(FOUR.length);
  assertEquals(s.phase, "welcome");
  assertEquals(isTourActive(s), true);
  assertEquals(currentStep(FOUR, s), null);
});

Deno.test("welcome with no steps finishes immediately", () => {
  const s = startWelcome(0);
  assertEquals(s.phase, "done");
  assertEquals(isTourActive(s), false);
});

Deno.test("beginTour leaves welcome and spotlights the first step", () => {
  const s = beginTour(startWelcome(FOUR.length));
  assertEquals(s.phase, "running");
  assertEquals(s.index, 0);
  assertEquals(currentStep(FOUR, s)?.key, "fund_wallet");
});

Deno.test("beginTour is a no-op outside welcome", () => {
  assertEquals(beginTour(IDLE_TOUR).phase, "idle");
});

Deno.test("goNext walks the steps then lands on congrats", () => {
  let s = beginTour(startWelcome(FOUR.length));
  s = goNext(FOUR.length, s);
  assertEquals(currentStep(FOUR, s)?.key, "set_markup");
  s = goNext(FOUR.length, s);
  assertEquals(currentStep(FOUR, s)?.key, "publish");
  s = goNext(FOUR.length, s);
  assertEquals(currentStep(FOUR, s)?.key, "visit_storefront");
  s = goNext(FOUR.length, s);
  assertEquals(s.phase, "congrats");
  assertEquals(currentStep(FOUR, s), null);
  assertEquals(isTourActive(s), true);
});

Deno.test("goBack steps back and stops at the first step", () => {
  let s = beginTour(startWelcome(FOUR.length));
  s = goNext(FOUR.length, s);
  s = goBack(s);
  assertEquals(s.index, 0);
  s = goBack(s);
  assertEquals(s.index, 0);
});

Deno.test("finishTour closes the tour", () => {
  const s = finishTour(beginTour(startWelcome(FOUR.length)));
  assertEquals(s.phase, "done");
  assertEquals(isTourActive(s), false);
});

Deno.test("goNext and goBack are no-ops unless running", () => {
  assertEquals(goNext(FOUR.length, IDLE_TOUR).phase, "idle");
  assertEquals(goBack(IDLE_TOUR).phase, "idle");
  const welcome = startWelcome(FOUR.length);
  assertEquals(goNext(FOUR.length, welcome).phase, "welcome");
});
