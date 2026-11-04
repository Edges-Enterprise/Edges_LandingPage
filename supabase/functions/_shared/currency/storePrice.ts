// supabase/functions/_shared/currency/storePrice.ts
//
// Phase 2. Bind the pricing pipeline to the database.
//
// This is the single entry point every caller uses to get a customer-facing
// price: the customer storefront, the reseller dashboard and the purchase
// orchestrator all call `resolveStorePrice`. Having one function is the
// whole point — the codebase previously had the same arithmetic in three
// places with a comment warning that they must not diverge.
//
// The store currency comes from the STORE, not from the plan. One currency
// per store, permanently (scope decision, 2026-11-01): an RW store shows
// every plan — Rwandan and Ugandan alike — in RWF.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  computePrice,
  type MarkupRule,
  type PricingResult,
} from "./pricing.ts";
import { findFreshRate, type RateStore } from "./rates.ts";
import { platformMarkupChain, type PlatformMarkupRow } from "./markup.ts";

export class PriceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceUnavailableError";
  }
}

export interface StorePlanRow {
  id: string;
  provider_plan_id: string;
  country_code: string;
  name: string;
  category: string;
  base_price: number;
  currency: string;
  price_type?: string | null;
  range_min?: number | null;
  range_max?: number | null;
  send_value?: number | null;
  send_currency?: string | null;
}

export interface PlanConfigRow {
  plan_id: string;
  enabled: boolean;
  markup_type: string | null;
  markup_value: number | null;
  selling_price: number | null;
}

export interface ResolvedStorePrice extends PricingResult {
  planId: string;
  providerPlanId: string;
  /** What the recipient gets, for display, when the offer is FIXED. */
  sendValue: number | null;
  sendCurrency: string | null;
  priceType: "FIXED" | "RANGE";
  /** Present for RANGE offers: the allowed customer-chosen amounts. */
  rangeMin: number | null;
  rangeMax: number | null;
}

/** The store's currency and the rate used to price it. */
export interface StoreContext {
  countryCode: string;
  currency: string;
  usdToStoreRate: number;
  rateSource: string;
  rateExpiresAt: string;
  rateIsFallback: boolean;
  bufferFraction: number;
  /**
   * True when the store's country has no currency mapping and USD was used.
   * The store still prices and sells; the flag exists so the USD default is
   * visible in logs and can be told apart from a genuinely USD country.
   */
  currencyIsFallback: boolean;
}

/**
 * Load everything the pricing pipeline needs for a store: its currency, a
 * fresh rate, the currency's buffer, and the platform's markup rows.
 *
 * Throws `PriceUnavailableError` when there is no fresh rate. That is a hard
 * failure on purpose: a missing rate means we cannot compute a correct
 * price, and guessing is how a plan gets sold below cost.
 */
export async function loadStoreContext(
  client: SupabaseClient,
  opts: { countryCode: string; planId?: string | null },
): Promise<{ context: StoreContext; platformMarkups: MarkupRule[] }> {
  const country = (opts.countryCode || "").toLowerCase();

  // The store's currency, via its country. A store is priced in its own
  // country's currency and that never changes (one currency per store).
  //
  // A country with no mapping is NOT an error and is NOT a guess: it prices
  // in USD, the same default the wallet side uses. That is what lets a store
  // outside the mapped set sell every Zendit plan. USD needs no rate (its
  // own rate is 1), so such a store is priceable with no FX row at all.
  const { data: mapping } = await client
    .from("global_country_currencies")
    .select("currency_code")
    .eq("country_code", country)
    .maybeSingle();

  const currencyCode =
    ((mapping?.currency_code as string | undefined) ?? "USD").toUpperCase();
  const currencyIsFallback = !mapping?.currency_code;

  const { data: currencyRow } = await client
    .from("global_currencies")
    .select("buffer_fraction")
    .eq("code", currencyCode)
    .maybeSingle();
  const bufferFraction = Number(currencyRow?.buffer_fraction ?? 0);
  const currency = currencyCode;

  const rate = await findFreshRate(client as unknown as RateStore, currency);
  if (!rate) {
    throw new PriceUnavailableError(
      `no fresh USD->${currency} rate available`,
    );
  }

  const { data: markupRows } = await client
    .from("global_platform_markups")
    .select("scope, scope_key, markup_type, markup_value, enabled")
    .eq("enabled", true);

  const platformMarkups = platformMarkupChain(
    (markupRows ?? []) as PlatformMarkupRow[],
    { countryCode: country, planId: opts.planId ?? null },
  );

  return {
    context: {
      countryCode: country,
      currency,
      usdToStoreRate: rate.rate,
      rateSource: rate.source,
      rateExpiresAt: rate.expiresAt,
      rateIsFallback: rate.fallback,
      bufferFraction,
      currencyIsFallback,
    },
    platformMarkups,
  };
}

/**
 * Price one plan for one store.
 *
 * `config` is the reseller's row for this plan. When it is absent or
 * disabled the plan is not sellable and the caller should not show it.
 */
export function pricePlan(
  plan: StorePlanRow,
  config: PlanConfigRow | null,
  ctx: StoreContext,
  platformMarkups: MarkupRule[],
): ResolvedStorePrice {
  const resellerMarkup: MarkupRule | null = config
    ? {
      markup_type: config.markup_type === "fixed" ? "fixed" : "percentage",
      markup_value: Number(config.markup_value ?? 0),
      source: "reseller",
    }
    : null;

  const result = computePrice({
    costUsd: Number(plan.base_price),
    storeCurrency: ctx.currency,
    usdToStoreRate: ctx.usdToStoreRate,
    platformMarkups,
    resellerMarkup,
    resellerSellingPrice: config?.selling_price ?? null,
    bufferFraction: ctx.bufferFraction,
  });

  const priceType = (plan.price_type || "FIXED").toUpperCase() === "RANGE"
    ? "RANGE"
    : "FIXED";

  return {
    ...result,
    planId: plan.id,
    providerPlanId: plan.provider_plan_id,
    sendValue: plan.send_value ?? null,
    sendCurrency: plan.send_currency ?? null,
    priceType,
    rangeMin: plan.range_min ?? null,
    rangeMax: plan.range_max ?? null,
  };
}
