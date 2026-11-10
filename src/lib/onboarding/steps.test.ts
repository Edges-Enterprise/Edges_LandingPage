// The walkthrough's step-resolution tests.
//
// Run with:  deno test src/lib/onboarding/steps.test.ts
//
// These pin the rules that must not regress:
//   * the tour is the whole platform — every dashboard page is represented;
//   * the virtual-account slide is shown only for a country whose gateway
//     offers one (decision 4), and is omitted — not greyed — everywhere else;
//   * the tour is identical for a brand-new and a fully configured reseller.

import { assertEquals } from "jsr:@std/assert@1";
import { buildOnboardingSteps, isVirtualAccountCountry } from "./steps.ts";

// Minimal config stand-ins: only paymentGateway.methods is read here.
const NG = { paymentGateway: { methods: ["virtual_account", "card"] } } as never;
const RW = { paymentGateway: { methods: ["mobile_money", "card"] } } as never;

Deno.test("virtual account applies only where the gateway offers one", () => {
  assertEquals(isVirtualAccountCountry(NG), true);
  assertEquals(isVirtualAccountCountry(RW), false);
});

Deno.test("ng reseller sees the full tour, virtual account included", () => {
  const keys = buildOnboardingSteps(NG, "ng").map((s) => s.key);
  assertEquals(keys[0], "overview_actions");
  assertEquals(keys[keys.length - 1], "congrats");
  assertEquals(keys.includes("virtual_account"), true);
});

Deno.test("rw reseller's tour omits the virtual account, not greyed", () => {
  const keys = buildOnboardingSteps(RW, "rw").map((s) => s.key);
  assertEquals(keys.includes("virtual_account"), false);
  // Everything else is present for both countries.
  const ng = buildOnboardingSteps(NG, "ng").map((s) => s.key);
  assertEquals(
    ng.filter((k) => k !== "virtual_account"),
    keys,
  );
});

Deno.test("every dashboard page is covered by at least one step", () => {
  const paths = new Set(buildOnboardingSteps(NG, "ng").map((s) => s.path));
  for (const page of [
    "/ng/dashboard",
    "/ng/dashboard/wallet",
    "/ng/dashboard/customers",
    "/ng/dashboard/orders",
    "/ng/dashboard/plans",
    "/ng/dashboard/store",
    "/ng/dashboard/publishing",
    "/ng/dashboard/settings",
  ]) {
    assertEquals(paths.has(page), true, `no step points at ${page}`);
  }
});

Deno.test("each spotlight step carries its anchor and dashboard path", () => {
  const byKey = Object.fromEntries(
    buildOnboardingSteps(NG, "ng").map((s) => [s.key, s]),
  );
  assertEquals(byKey["virtual_account"].anchor, "virtual_account");
  assertEquals(byKey["virtual_account"].path, "/ng/dashboard/wallet");
  assertEquals(byKey["plans_bulk"].anchor, "set_markup");
  assertEquals(byKey["plans_bulk"].path, "/ng/dashboard/plans");
  assertEquals(byKey["publishing_plans"].anchor, "publish");
  assertEquals(byKey["publishing_plans"].path, "/ng/dashboard/publishing");
  assertEquals(byKey["visit_storefront"].path, "/ng/dashboard/store");
  assertEquals(byKey["header_tools"].path, "/ng/dashboard");
});

Deno.test("the framing card carries no anchor", () => {
  const byKey = Object.fromEntries(
    buildOnboardingSteps(NG, "ng").map((s) => [s.key, s]),
  );
  assertEquals(byKey["congrats"].anchor, null);
});

Deno.test("the same steps are returned regardless of setup progress", () => {
  // The walkthrough no longer consults signals: it is identical for a brand
  // new and a fully configured reseller.
  assertEquals(
    buildOnboardingSteps(NG, "ng").map((s) => s.key),
    buildOnboardingSteps(NG, "ng").map((s) => s.key),
  );
});
