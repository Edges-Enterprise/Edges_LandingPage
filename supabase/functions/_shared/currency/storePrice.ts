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

import {
  computePrice,
  type MarkupRule,
  type PricingResult,
} from "./pricing.ts";
import { BASE_CURRENCY } from "./registry.ts";
import { findFreshRate, type RateStore } from "./rates.ts";
import { platformMarkupChain, type PlatformMarkupRow } from "./markup.ts";
import { priceRangeOffer } from "./range.ts";

/**
 * The read surface this module needs from a Supabase client.
 *
 * Structural rather than `import type { SupabaseClient } from
 * "npm:@supabase/supabase-js@2"` on purpose: the web app shares this module
 * (so the dashboard and storefront price through the same pipeline as the
 * edge functions), and the `npm:` specifier is Deno-only.
 *
 * The query builder is `unknown`-returning rather than precisely typed: the
 * real builder (`PostgrestFilterBuilder`) is heavily generic and its `then`
 * signature does not unify across the Deno and web clients, so a precise
 * structural shape rejects one of them. The queries here are simple and
 * their results are narrowed at each call site.
 */
export interface PriceDbClient {
  // The query builder is intentionally `any`: its generic signature differs
  // between the Deno and web Supabase clients, and a precise shared shape
  // either rejects one of them or triggers "excessively deep" instantiation.
  // Every result is narrowed by rowOf/rowsOf below.
  // deno-lint-ignore no-explicit-any
  from(table: string): any;
}

/** Narrow a `maybeSingle()` result to a row object (or null). */
function rowOf(result: unknown): Record<string, unknown> | null {
  const data = (result as { data?: unknown })?.data;
  return data && typeof data === "object"
    ? data as Record<string, unknown>
    : null;
}

/** Narrow a multi-row result to an array. */
function rowsOf(result: unknown): Record<string, unknown>[] {
  const data = (result as { data?: unknown })?.data;
  return Array.isArray(data) ? data as Record<string, unknown>[] : [];
}

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
  range_increment?: number | null;
  send_value?: number | null;
  send_currency?: string | null;
  zendit_fx?: number | null;
}

export interface PlanConfigRow {
  // Pricing reads only the markup and any pinned shelf price; enablement is
  // the caller's decision, so these are optional here.
  plan_id?: string;
  enabled?: boolean;
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
  /** The step a RANGE amount must land on, in the send currency. */
  rangeIncrement: number | null;
  /** Zendit's own fx for the offer, used to price a RANGE choice. */
  zenditFx: number | null;
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
  client: PriceDbClient,
  opts: { countryCode: string; planId?: string | null },
): Promise<{ context: StoreContext; platformMarkups: MarkupRule[] }> {
  const { context, markupRows } = await loadStoreContextRows(client, opts);
  return {
    context,
    platformMarkups: platformMarkupChain(markupRows, {
      countryCode: (opts.countryCode || "").toLowerCase(),
      planId: opts.planId ?? null,
    }),
  };
}

/**
 * As `loadStoreContext`, but returns the raw platform-markup rows instead of
 * resolving them for one plan. A catalog prices many plans at once and each
 * resolves its own chain (a plan-level rule overrides the country's), so
 * loading the rows once and resolving per plan avoids an N+1 read.
 */
export async function loadStoreContextRows(
  client: PriceDbClient,
  opts: { countryCode: string },
): Promise<{ context: StoreContext; markupRows: PlatformMarkupRow[] }> {
  const country = (opts.countryCode || "").toLowerCase();

  // The store's currency, via its country. A store is priced in its own
  // country's currency and that never changes (one currency per store).
  //
  // A country with no mapping is NOT an error and is NOT a guess: it prices
  // in USD, the same default the wallet side uses. That is what lets a store
  // outside the mapped set sell every Zendit plan. USD needs no rate (its
  // own rate is 1), so such a store is priceable with no FX row at all.
  const mapping = rowOf(
    await client
      .from("global_country_currencies")
      .select("currency_code")
      .eq("country_code", country)
      .maybeSingle(),
  );

  const currencyCode =
    ((mapping?.currency_code as string | undefined) ?? "USD").toUpperCase();
  const currencyIsFallback = !mapping?.currency_code;

  const currencyRow = rowOf(
    await client
      .from("global_currencies")
      .select("buffer_fraction")
      .eq("code", currencyCode)
      .maybeSingle(),
  );
  const bufferFraction = Number(currencyRow?.buffer_fraction ?? 0);
  const currency = currencyCode;

  const rate = await findFreshRate(client as unknown as RateStore, currency);
  if (!rate) {
    throw new PriceUnavailableError(
      `no fresh USD->${currency} rate available`,
    );
  }

  const markupRows = rowsOf(
    await client
      .from("global_platform_markups")
      .select("scope, scope_key, markup_type, markup_value, enabled")
      .eq("enabled", true),
  ) as unknown as PlatformMarkupRow[];

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
    markupRows,
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
    // The cost's own currency. Zendit normalises base_price to USD; Accragh
    // and Lizzysub store it in the plan's own currency (GHS, NGN). Passing it
    // through is what stops a local-currency cost being multiplied by the
    // USD->store rate a second time.
    costCurrency: plan.currency ?? BASE_CURRENCY,
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
    rangeIncrement: plan.range_increment ?? null,
    zenditFx: plan.zendit_fx ?? null,
  };
}

/**
 * Price a RANGE offer for a chosen recipient amount.
 *
 * A RANGE plan's shelf price depends on what the customer enters, so unlike
 * `pricePlan` this takes the amount. The amount is validated against the
 * plan's CURRENT bounds (loaded fresh by the caller, never cached), and the
 * USD cost is derived from Zendit's own fx — the one place Zendit's rate is
 * authoritative, because it governs what the recipient receives.
 *
 * The result carries the same shape as a FIXED price, so the caller's
 * display code does not branch.
 */
export function priceRangePlan(
  plan: StorePlanRow,
  config: PlanConfigRow | null,
  ctx: StoreContext,
  platformMarkups: MarkupRule[],
  sendAmount: number,
): ResolvedStorePrice & { sendAmount: number } {
  const resellerMarkup: MarkupRule | null = config
    ? {
      markup_type: config.markup_type === "fixed" ? "fixed" : "percentage",
      markup_value: Number(config.markup_value ?? 0),
      source: "reseller",
    }
    : null;

  const result = priceRangeOffer({
    sendAmount,
    fx: plan.zendit_fx ?? null,
    storeCurrency: ctx.currency,
    usdToStoreRate: ctx.usdToStoreRate,
    platformMarkups,
    resellerMarkup,
    resellerSellingPrice: config?.selling_price ?? null,
    bufferFraction: ctx.bufferFraction,
    bounds: {
      min: Number(plan.range_min ?? 0),
      max: Number(plan.range_max ?? 0),
      increment: plan.range_increment ?? null,
      currency: plan.send_currency ?? null,
    },
  });

  return {
    ...result,
    planId: plan.id,
    providerPlanId: plan.provider_plan_id,
    sendValue: result.sendAmount,
    sendCurrency: plan.send_currency ?? null,
    priceType: "RANGE",
    rangeMin: plan.range_min ?? null,
    rangeMax: plan.range_max ?? null,
    rangeIncrement: plan.range_increment ?? null,
    zenditFx: plan.zendit_fx ?? null,
  };
}
