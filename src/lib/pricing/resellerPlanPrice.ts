// src/lib/pricing/resellerPlanPrice.ts
//
// Phase 2, step 6. The dashboard's pricing, run through the ONE pipeline.
//
// Before Phase 2 the dashboard computed a plan's price as
// `round(base_price * (1 + markup/100))` and wrote that number into
// `global_reseller_plan_configs.selling_price`. `base_price` is a USD
// wholesale cost, so that number was a dollar amount labelled as a
// store-currency price: a Rwandan store showed "10,750 RWF" for a plan
// costing $10.75. The pipeline (supabase/functions/_shared/currency/
// storePrice.ts) is the single source of truth for that arithmetic, and this
// module is the dashboard's entry to it.
//
// The pipeline is shared directly, not mirrored: `allowImportingTsExtensions`
// lets the Next app import the Deno module, so the dashboard, the storefront
// and the purchase edge functions cannot drift.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadStoreContextRows,
  pricePlan,
  type ResolvedStorePrice,
} from "../../../supabase/functions/_shared/currency/storePrice.ts";
import { platformMarkupChain } from "../../../supabase/functions/_shared/currency/markup.ts";

/**
 * Price one base plan for one reseller's store, through the shared pipeline.
 *
 * `config` is the reseller's row for the plan (markup + any pinned
 * selling price); `null` prices the plan at the platform markup alone, which
 * is what a plan with no config row would cost. Throws
 * `PriceUnavailableError` when there is no fresh rate — the caller should
 * surface that rather than store a guessed price.
 */
export async function priceResellerPlan(params: {
  countryCode: string;
  plan: Record<string, unknown>;
  config: Record<string, unknown> | null;
}): Promise<ResolvedStorePrice> {
  const supabase = createAdminClient();
  const { context, markupRows } = await loadStoreContextRows(supabase, {
    countryCode: (params.countryCode || "").toLowerCase(),
  });
  const plan = params.plan ?? {};
  const platformMarkups = platformMarkupChain(markupRows, {
    countryCode: (params.countryCode || "").toLowerCase(),
    planId: (plan.id as string | undefined) ?? null,
    provider: (plan.provider as string | undefined) ?? null,
    home: ((plan.currency as string | undefined) ?? "USD").toUpperCase() ===
      (context.currency ?? "").toUpperCase(),
  });
  return pricePlan(
    params.plan as never,
    params.config as never,
    context,
    platformMarkups,
  );
}

/**
 * The `selling_price` to store for a plan: the customer price, in the
 * store's currency, with no minor units (the column is an integer).
 *
 * This is the number the reseller is actually charging, so it must be the
 * pipeline's output — not `base_price + markup`, which ignores FX.
 */
export async function resolveStoredSellingPrice(params: {
  countryCode: string;
  plan: Record<string, unknown>;
  config: Record<string, unknown> | null;
}): Promise<number> {
  const priced = await priceResellerPlan(params);
  return Math.round(priced.customerPriceDecimal);
}
