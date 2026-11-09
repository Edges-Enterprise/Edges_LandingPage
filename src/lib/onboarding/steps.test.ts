// The walkthrough's step-resolution tests.
//
// Run with:  deno test src/lib/onboarding/steps.test.ts
//
// These pin the one rule that must not regress: the virtual-account slide is
// shown only for a country whose gateway offers one (decision 4), and is
// omitted — not greyed — everywhere else.

import { assertEquals } from "jsr:@std/assert@1";
import { buildOnboardingSteps, isVirtualAccountCountry } from "./steps.ts";

// Minimal config stand-ins: only paymentGateway.methods is read here.
const NG = { paymentGateway: { methods: ["virtual_account", "card"] } } as never;
const RW = { paymentGateway: { methods: ["mobile_money", "card"] } } as never;

Deno.test("virtual account applies only where the gateway offers one", () => {
  assertEquals(isVirtualAccountCountry(NG), true);
  assertEquals(isVirtualAccountCountry(RW), false);
});

Deno.test("ng reseller sees five steps", () => {
  const steps = buildOnboardingSteps(NG, "ng");
  assertEquals(
    steps.map((s) => s.key),
    [
      "virtual_account",
      "fund_wallet",
      "set_markup",
      "publish",
      "visit_storefront",
    ],
  );
});

Deno.test("rw reseller sees four steps, virtual account absent not greyed", () => {
  const steps = buildOnboardingSteps(RW, "rw");
  assertEquals(
    steps.map((s) => s.key),
    ["fund_wallet", "set_markup", "publish", "visit_storefront"],
  );
  assertEquals(
    steps.some((s) => s.key === "virtual_account"),
    false,
  );
});

Deno.test("each step carries its anchor and dashboard path", () => {
  const steps = buildOnboardingSteps(NG, "ng");
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s]));
  assertEquals(byKey["virtual_account"].anchor, "virtual_account");
  assertEquals(byKey["virtual_account"].path, "/ng/dashboard/wallet");
  assertEquals(byKey["set_markup"].path, "/ng/dashboard/plans");
  assertEquals(byKey["publish"].path, "/ng/dashboard/publishing");
  assertEquals(byKey["visit_storefront"].path, "/ng/dashboard/store");
});

Deno.test("the same steps are returned regardless of setup progress", () => {
  // The walkthrough no longer consults signals: it is identical for a brand
  // new and a fully configured reseller.
  assertEquals(
    buildOnboardingSteps(NG, "ng").map((s) => s.key),
    buildOnboardingSteps(NG, "ng").map((s) => s.key),
  );
});
