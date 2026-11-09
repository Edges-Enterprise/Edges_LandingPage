// Task 9 — step-resolution tests.
//
// Run with:  deno test src/lib/onboarding/steps.test.ts
//
// These pin the two rules that must not regress: the virtual-account step is
// skipped (not greyed) outside a virtual-account country (decision 4), and the
// guide is complete only when every APPLICABLE step is done.

import { assertEquals } from "jsr:@std/assert@1";
import {
  buildOnboardingSteps,
  isOnboardingComplete,
  isVirtualAccountCountry,
  type OnboardingSignals,
} from "./steps.ts";

// Minimal config stand-ins: only paymentGateway.methods is read here.
const NG = { paymentGateway: { methods: ["virtual_account", "card"] } } as never;
const RW = { paymentGateway: { methods: ["mobile_money", "card"] } } as never;

const NOTHING: OnboardingSignals = {
  has_virtual_account: false,
  wallet_funded: false,
  markup_set: false,
  published: false,
  store_live: false,
  storefront_visited: false,
};

const ALL: OnboardingSignals = {
  has_virtual_account: true,
  wallet_funded: true,
  markup_set: true,
  published: true,
  store_live: true,
  storefront_visited: true,
};

Deno.test("virtual account applies only where the gateway offers one", () => {
  assertEquals(isVirtualAccountCountry(NG), true);
  assertEquals(isVirtualAccountCountry(RW), false);
});

Deno.test("ng reseller sees five steps", () => {
  const steps = buildOnboardingSteps(NG, "ng", "my-store", NOTHING);
  assertEquals(steps.map((s) => s.key), [
    "virtual_account",
    "fund_wallet",
    "set_markup",
    "publish",
    "visit_storefront",
  ]);
});

Deno.test("rw reseller sees four steps, virtual account absent not greyed", () => {
  const steps = buildOnboardingSteps(RW, "rw", "my-store", NOTHING);
  assertEquals(steps.map((s) => s.key), [
    "fund_wallet",
    "set_markup",
    "publish",
    "visit_storefront",
  ]);
  assertEquals(steps.some((s) => s.key === "virtual_account"), false);
});

Deno.test("nothing done -> not complete", () => {
  const steps = buildOnboardingSteps(RW, "rw", "my-store", NOTHING);
  assertEquals(isOnboardingComplete(steps), false);
});

Deno.test("every applicable step done -> complete", () => {
  const ng = buildOnboardingSteps(NG, "ng", "my-store", ALL);
  const rw = buildOnboardingSteps(RW, "rw", "my-store", ALL);
  assertEquals(isOnboardingComplete(ng), true);
  assertEquals(isOnboardingComplete(rw), true);
});

Deno.test("publish counts as done when the storefront is live (build not required)", () => {
  const steps = buildOnboardingSteps(RW, "rw", "my-store", {
    ...NOTHING,
    store_live: true,
  });
  const publish = steps.find((s) => s.key === "publish");
  assertEquals(publish?.done, true);
});

Deno.test("visit_storefront deep-links to the live store, external", () => {
  const steps = buildOnboardingSteps(RW, "rw", "my-store", NOTHING);
  const visit = steps.find((s) => s.key === "visit_storefront");
  assertEquals(visit?.href, "/rw/my-store");
  assertEquals(visit?.external, true);
});

Deno.test("visit_storefront falls back to store settings when no slug yet", () => {
  const steps = buildOnboardingSteps(RW, "rw", null, NOTHING);
  const visit = steps.find((s) => s.key === "visit_storefront");
  assertEquals(visit?.href, "/rw/dashboard/store");
  assertEquals(visit?.external, false);
});
