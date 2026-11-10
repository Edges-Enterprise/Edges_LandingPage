// src/lib/onboarding/steps.ts
//
// The dashboard walkthrough's step content: the complete, ordered list of
// slides that teach a new reseller the whole platform, page by page. The tour
// is purely informational — a step carries only where to point the spotlight
// and which route to open, never a "done" signal — so it can be driven either
// automatically (a timer) or by hand (Next/Back/Skip).
//
// Two country-aware slides are resolved here so the tour never points at an
// element that does not exist for the reseller:
//   * the virtual-account slide (only where the gateway offers one), and
//   * the app-build slide (only where the country publishes a mobile app).
// Everything else is shown to every reseller, because every reseller has the
// page. Kept out of the component so the applicability is testable in
// isolation.

import type { CountryConfig } from "@/config/countries";

export type OnboardingStepKey =
  | "overview_actions"
  | "overview_stats"
  | "overview_revenue"
  | "overview_activity"
  | "nav_wallet"
  | "nav_customers"
  | "nav_orders"
  | "nav_plans"
  | "nav_store"
  | "nav_publishing"
  | "nav_settings"
  | "wallet_summary"
  | "virtual_account"
  | "fund_wallet"
  | "wallet_history"
  | "customers_add"
  | "customers_table"
  | "orders_table"
  | "orders_filters"
  | "plans_bulk"
  | "set_markup"
  | "plans_list"
  | "store_tabs"
  | "visit_storefront"
  | "publishing_plans"
  | "publish"
  | "publishing_builds"
  | "settings_tabs"
  | "settings_security"
  | "header_tools"
  | "congrats";

export interface OnboardingStep {
  key: OnboardingStepKey;
  /** The `data-tour` anchor id of the element the tour spotlights. */
  anchor: OnboardingStepKey | null;
  /** Dashboard route the tour navigates to before spotlighting the anchor. */
  path: string;
  /** Center the spotlighted element in the viewport before showing the card. */
  center?: boolean;
}

/**
 * Whether the country's payment gateway offers a virtual account. Only
 * countries whose gateway lists the `virtual_account` method (today: `ng`)
 * show that slide; every other country omits it entirely.
 */
export function isVirtualAccountCountry(config: CountryConfig): boolean {
  return (config.paymentGateway?.methods ?? []).includes("virtual_account");
}

/**
 * Whether a step points at a sidebar nav item. On phones the sidebar is an
 * off-canvas drawer, so the tour has to open it to show these; on desktop the
 * sidebar is always visible and this is ignored.
 */
export function isSidebarStep(step: OnboardingStep | null): boolean {
  return Boolean(step?.anchor?.startsWith("nav_"));
}

/**
 * The applicable steps for a reseller, in order. The whole tour spans every
 * dashboard page: the overview, the wallet (with the virtual-account slide
 * added only where the gateway offers one), customers, orders, plans, the
 * store, publishing, settings, and the shared header — then a wrap-up card.
 * The tour is meant to be read end to end, so nothing a reseller can do is
 * left out.
 */
export function buildOnboardingSteps(
  config: CountryConfig,
  countryCode: string,
): OnboardingStep[] {
  const d = (s: string) => `/${countryCode}/dashboard${s}`;
  const steps: OnboardingStep[] = [
    { key: "overview_actions", anchor: "overview_actions", path: d("") },
    { key: "overview_stats", anchor: "overview_stats", path: d("") },
    { key: "overview_revenue", anchor: "overview_revenue", path: d("") },
    { key: "overview_activity", anchor: "overview_activity", path: d(""), center: true },
    { key: "nav_wallet", anchor: "nav_wallet", path: d("") },
    { key: "nav_customers", anchor: "nav_customers", path: d("") },
    { key: "nav_orders", anchor: "nav_orders", path: d("") },
    { key: "nav_plans", anchor: "nav_plans", path: d("") },
    { key: "nav_store", anchor: "nav_store", path: d("") },
    { key: "nav_publishing", anchor: "nav_publishing", path: d("") },
    { key: "nav_settings", anchor: "nav_settings", path: d("") },
    { key: "wallet_summary", anchor: "wallet_summary", path: d("/wallet") },
  ];

  if (isVirtualAccountCountry(config)) {
    steps.push({
      key: "virtual_account",
      anchor: "virtual_account",
      path: d("/wallet"),
      center: true,
    });
  }

  steps.push(
    { key: "fund_wallet", anchor: "fund_wallet", path: d("/wallet") },
    { key: "wallet_history", anchor: "wallet_history", path: d("/wallet"), center: true },
    { key: "customers_add", anchor: "customers_add", path: d("/customers") },
    { key: "customers_table", anchor: "customers_table", path: d("/customers"), center: true },
    { key: "orders_table", anchor: "orders_table", path: d("/orders"), center: true },
    { key: "orders_filters", anchor: "orders_filters", path: d("/orders") },
    { key: "plans_bulk", anchor: "set_markup", path: d("/plans") },
    { key: "plans_list", anchor: "plans_list", path: d("/plans"), center: true },
    { key: "store_tabs", anchor: "store_tabs", path: d("/store") },
    { key: "visit_storefront", anchor: "visit_storefront", path: d("/store") },
    { key: "publishing_plans", anchor: "publish", path: d("/publishing") },
    { key: "publishing_builds", anchor: "publishing_builds", path: d("/publishing"), center: true },
    { key: "settings_tabs", anchor: "settings_tabs", path: d("/settings") },
    { key: "settings_security", anchor: "settings_security", path: d("/settings") },
    { key: "header_tools", anchor: "header_tools", path: d("") },
    { key: "congrats", anchor: null, path: d("") },
  );

  return steps;
}
