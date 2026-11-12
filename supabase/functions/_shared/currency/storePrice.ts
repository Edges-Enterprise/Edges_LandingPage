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
import {
  findFreshRate,
  loadFreshUsdRates,
  type RateStore,
} from "./rates.ts";
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
   * Every fresh USD->currency rate, keyed by the (uppercased) currency.
   *
   * A store in `all` mode sells plans from every provider, so one catalog can
   * carry costs in more than one currency at once (Zendit in USD, Lizzysub in
   * NGN, Accragh in GHS). Normalising each cost to USD needs that currency's
   * own rate, and loading them all once is cheaper than a read per cost
   * currency. USD is present as 1.
   */
  usdRates: Record<string, number>;
  /**
   * True when the store is pricing in USD as a fallback rather than because
   * USD is its mapped currency: either the country has no mapping, or it has
   * one whose currency had no fresh rate. The flag exists so the USD default
   * is visible in logs and can be told apart from a genuinely USD store.
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

  // A mapped currency with no usable rate falls back to USD, the same way a
  // country with no mapping does. The alternative — a hard failure — blanks
  // the storefront and rejects the purchase, which is the wrong trade when
  // the fallback is safe: the whole catalogue's wholesale cost is USD
  // (`base_price` is normalised at catalog sync), so pricing in USD costs
  // the reseller nothing and keeps the store sellable. This is the live case
  // for CDF, which is mapped to `cd` but has no rate row (the DRC is not in
  // Zendit's quote list).
  //
  // USD is safe ONLY because a store's customer wallets are denominated in
  // the same currency the store prices in (both derive from the country, and
  // `cd` is USD on both sides). A store whose wallets held CDF while it
  // priced in USD would debit the wrong currency, so if that invariant ever
  // changes this fallback must be revisited.
  const rate = await findFreshRate(client as unknown as RateStore, currencyCode);
  const currency = rate ? currencyCode : BASE_CURRENCY;
  // A USD rate is always rate 1 (`findFreshRate` special-cases the base), so
  // this is the currency's own rate or 1 — never a stale or borrowed one.
  const resolvedRate = rate ??
    (await findFreshRate(client as unknown as RateStore, BASE_CURRENCY));
  if (!resolvedRate) {
    throw new PriceUnavailableError(
      `no fresh USD->${currencyCode} rate and no USD base rate`,
    );
  }

  // Every fresh USD rate, so a catalog in `all` mode can normalise a cost in
  // any provider's currency (Zendit USD, Lizzysub NGN, Accragh GHS) to USD.
  const usdRates = await loadFreshUsdRates(client as unknown as RateStore);
  // The store's own currency rate is what `findFreshRate` already resolved,
  // including the USD fallback when its row was missing or stale.
  usdRates[currency] = resolvedRate.rate;

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
      usdToStoreRate: resolvedRate.rate,
      rateSource: resolvedRate.source,
      rateExpiresAt: resolvedRate.expiresAt,
      rateIsFallback: resolvedRate.fallback,
      bufferFraction,
      usdRates,
      // True when USD was used because the country has no mapping OR because
      // its mapped currency had no fresh rate. Either way the store is
      // pricing in USD, and that must be visible in logs.
      currencyIsFallback: currencyIsFallback || !rate,
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
    // That currency's own USD rate, so a plan whose cost is neither USD nor
    // the store's currency still normalises correctly (a GHS plan in an NGN
    // store, which `all` mode makes reachable). Absent for an unknown
    // currency, which `computePrice` treats as a configuration fault.
    costCurrencyUsdRate: ctx.usdRates[
      (plan.currency ?? BASE_CURRENCY).toUpperCase()
    ],
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
