// src/lib/onboarding/steps.ts
//
// Task 9 — first-time reseller setup guide. The pure step-resolution logic:
// which steps APPLY for a reseller's country, whether each is done (from the
// real-data signals the get_reseller_onboarding() RPC returns), and whether the
// whole guide is complete.
//
// Kept out of the component so the country-aware applicability (decision 4:
// the virtual-account step is skipped, not greyed, outside a country whose
// gateway offers one) and the completion rule are testable in isolation.

import type { CountryConfig } from "@/config/countries";

/** The real-data completion signals the onboarding RPC returns. */
export interface OnboardingSignals {
  has_virtual_account: boolean;
  wallet_funded: boolean;
  markup_set: boolean;
  published: boolean;
  store_live: boolean;
  storefront_visited: boolean;
}

export type OnboardingStepKey =
  | "virtual_account"
  | "fund_wallet"
  | "set_markup"
  | "publish"
  | "visit_storefront";

export interface OnboardingStep {
  key: OnboardingStepKey;
  done: boolean;
  /** Deep link to the existing dashboard page that completes the step. */
  href: string;
  /** Opens in a new tab (the storefront is a public page, not the dashboard). */
  external?: boolean;
}

/**
 * Whether the country's payment gateway offers a virtual account. Only
 * countries whose gateway lists the `virtual_account` method (today: `ng`)
 * show that step; every other country skips it entirely (decision 4).
 */
export function isVirtualAccountCountry(config: CountryConfig): boolean {
  return (config.paymentGateway?.methods ?? []).includes("virtual_account");
}

/**
 * The applicable steps for a reseller, in order, each with its completion
 * state. The virtual-account step is omitted entirely outside a
 * virtual-account country, so a non-`ng` reseller sees four steps, not five.
 *
 * "Publish" is treated as done when a build succeeded OR the storefront is
 * live (the Task 7 pipeline is still being fixed, so the guide must not block
 * on it — whichever signal is available counts).
 */
export function buildOnboardingSteps(
  config: CountryConfig,
  countryCode: string,
  storeSlug: string | null,
  signals: OnboardingSignals,
): OnboardingStep[] {
  const steps: OnboardingStep[] = [];

  if (isVirtualAccountCountry(config)) {
    steps.push({
      key: "virtual_account",
      done: signals.has_virtual_account,
      href: `/${countryCode}/dashboard/wallet`,
    });
  }

  steps.push(
    {
      key: "fund_wallet",
      done: signals.wallet_funded,
      href: `/${countryCode}/dashboard/wallet`,
    },
    {
      key: "set_markup",
      done: signals.markup_set,
      href: `/${countryCode}/dashboard/plans`,
    },
    {
      key: "publish",
      done: signals.published || signals.store_live,
      href: `/${countryCode}/dashboard/publishing`,
    },
    {
      key: "visit_storefront",
      done: signals.storefront_visited,
      // Prefer the live storefront; fall back to the store settings page that
      // owns the URL when the store has no slug yet.
      href: storeSlug
        ? `/${countryCode}/${storeSlug}`
        : `/${countryCode}/dashboard/store`,
      external: Boolean(storeSlug),
    },
  );

  return steps;
}

/** The guide is complete once every applicable step is done. */
export function isOnboardingComplete(steps: OnboardingStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.done);
}
