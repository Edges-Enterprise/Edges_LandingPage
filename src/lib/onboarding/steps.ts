// src/lib/onboarding/steps.ts
//
// The dashboard walkthrough's step content. The pure resolution of WHICH
// slides apply for a reseller's country — the virtual-account slide is only
// shown where the gateway offers one (decision 4: skipped, not greyed).
//
// The tour no longer gates on real-data signals, so a step carries only where
// to point the spotlight, not whether it is "done". Kept out of the component
// so the country-aware applicability is testable in isolation.

import type { CountryConfig } from "@/config/countries";

export type OnboardingStepKey =
  | "virtual_account"
  | "fund_wallet"
  | "set_markup"
  | "publish"
  | "visit_storefront";

export interface OnboardingStep {
  key: OnboardingStepKey;
  /** The `data-tour` anchor id of the element the tour spotlights. */
  anchor: OnboardingStepKey;
  /** Dashboard route the tour navigates to before spotlighting the anchor. */
  path: string;
}

/**
 * Whether the country's payment gateway offers a virtual account. Only
 * countries whose gateway lists the `virtual_account` method (today: `ng`)
 * show that slide; every other country omits it entirely (decision 4).
 */
export function isVirtualAccountCountry(config: CountryConfig): boolean {
  return (config.paymentGateway?.methods ?? []).includes("virtual_account");
}

/**
 * The applicable steps for a reseller, in order. The virtual-account step is
 * omitted entirely outside a virtual-account country, so a non-`ng` reseller
 * sees four slides, not five.
 */
export function buildOnboardingSteps(
  config: CountryConfig,
  countryCode: string,
): OnboardingStep[] {
  const steps: OnboardingStep[] = [];

  if (isVirtualAccountCountry(config)) {
    steps.push({
      key: "virtual_account",
      anchor: "virtual_account",
      path: `/${countryCode}/dashboard/wallet`,
    });
  }

  steps.push(
    {
      key: "fund_wallet",
      anchor: "fund_wallet",
      path: `/${countryCode}/dashboard/wallet`,
    },
    {
      key: "set_markup",
      anchor: "set_markup",
      path: `/${countryCode}/dashboard/plans`,
    },
    {
      key: "publish",
      anchor: "publish",
      path: `/${countryCode}/dashboard/publishing`,
    },
    {
      key: "visit_storefront",
      anchor: "visit_storefront",
      // The tour stays in the dashboard: it spotlights the "View Store"
      // control on the store page rather than opening the public storefront.
      path: `/${countryCode}/dashboard/store`,
    },
  );

  return steps;
}
