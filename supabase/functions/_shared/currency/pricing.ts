// supabase/functions/_shared/currency/pricing.ts
//
// Phase 2. The one pricing pipeline.
//
// This must be the ONLY place a customer-facing price is computed. The
// existing codebase has the same arithmetic in three places that have to
// agree by hand (supabase/functions/_shared/storeCatalog.ts,
// _shared/purchaseOrchestrator.ts and src/lib/storefront/getStoreCatalog.ts),
// with a comment warning that they must not diverge. Phase 2 replaces that
// with one function.
//
// The pipeline, in order — the order matters and is the whole point:
//
//   1. start from the wholesale cost, normalised to USD
//   2. apply the PLATFORM markup            -> platform price, USD
//   3. convert to the store currency        -> store price, minor units
//   4. apply the RESELLER markup            -> customer price, minor units
//   5. assert the customer price >= the USD cost converted at the rate
//
// Step 2 before step 3 means the platform's cut is taken in USD, so it does
// not move with the rate. Step 5 is the invariant from HANDOVER.md: if a
// rounding or a stale rate ever pushes the shelf price below the wholesale
// cost, that is a bug, not a pricing choice, and it throws.
//
// Step 1 has to respect the cost's OWN currency. Zendit's catalog is
// normalised to USD at sync time, but the Accragh and Lizzysub catalogues
// store `base_price` in the plan's own currency (GHS, NGN). Treating those
// as USD multiplied them by the USD->store rate a second time — a Rwandan
// store showed NGN 400 as 523,783.78 RWF. A cost that is not USD is
// normalised here, once, at the single entry to the pipeline, so every
// caller (storefront, purchase, dashboard) inherits the fix.

import {
  BASE_CURRENCY,
  currencyDivisor,
  toMinor,
} from "./registry.ts";

export type MarkupType = "percentage" | "fixed";

export interface MarkupRule {
  markup_type: MarkupType;
  markup_value: number;
  source?:
    | "platform_default"
    | "platform_country"
    | "platform_provider"
    | "platform_plan"
    | "reseller";
}

/** A single step in the markup chain, kept for display and audit. */
export interface MarkupStep {
  source:
    | "platform_default"
    | "platform_country"
    | "platform_provider"
    | "platform_plan"
    | "reseller";
  markup_type: MarkupType;
  markup_value: number;
  /** Amount after this step, in the currency it was applied in. */
  amount: number;
  currency: string;
}

export interface PricingInput {
  /**
   * Wholesale cost as stored in `global_base_plans.base_price`, in
   * `costCurrency` (USD for Zendit, the plan's own currency for Accragh and
   * Lizzysub). Normalised to USD inside the pipeline.
   */
  costUsd: number;
  /**
   * The currency `costUsd` is denominated in. Defaults to USD, which is the
   * Zendit catalogue's normalised basis. When it is not USD the cost is
   * divided by that currency's USD rate before any markup — a local-currency
   * cost must NOT be multiplied by the USD->store rate.
   */
  costCurrency?: string;
  /** USD -> storeCurrency multiplier from the rate service. */
  usdToStoreRate: number;
  /**
   * The USD rate of `costCurrency` (1 USD = this many units of it), used only
   * when `costCurrency` is not USD. For a store whose own currency is the
   * cost currency, pass `usdToStoreRate`; for any other store, pass that
   * currency's own fresh rate.
   */
  costCurrencyUsdRate?: number;
  /** The store's currency (one currency per store, permanent). */
  storeCurrency: string;
  /**
   * Platform markup for this plan, most specific first. They are applied in
   * order (default -> country -> plan), each compounding on the previous.
   */
  platformMarkups?: MarkupRule[];
  /** The reseller's own markup, applied in store currency. */
  resellerMarkup?: MarkupRule | null;
  /** A reseller's explicit shelf price, which wins over any markup. */
  resellerSellingPrice?: number | null;
  /**
   * Extra margin on top of the converted cost, as a fraction (0.02 = 2%).
   * This is the buffer from HANDOVER.md: it keeps the shelf price above the
   * USD cost as the rate moves between pricing and settlement.
   */
  bufferFraction?: number;
}

export interface PricingResult {
  /** Wholesale cost normalised to USD decimal. */
  costUsd: number;
  /** The currency the cost was stored in, before normalisation. */
  costCurrency: string;
  /** Cost after platform markup, USD decimal. */
  platformPriceUsd: number;
  /** Platform price converted to the store currency, minor units. */
  storePriceMinor: number;
  /** Final customer price in the store currency, minor units. */
  customerPriceMinor: number;
  /** Customer price as a decimal, for a numeric DB column or display. */
  customerPriceDecimal: number;
  /**
   * The wholesale cost in the store currency, decimal, at the buffered rate.
   * This is what the platform pays the provider — NOT what the reseller is
   * charged. It is the `amount` passed to the provider call.
   */
  costLocalDecimal: number;
  /** The wholesale cost in the store currency, minor units. */
  costLocalMinor: number;
  /**
   * The PLATFORM price in the store currency, decimal — the wholesale cost
   * with the platform markup and the FX buffer applied. This is the
   * reseller's cost basis: the `cost_price` the purchase RPC deducts, and
   * the number the reseller's markup is applied on top of. It is the floor
   * the customer price cannot fall below.
   */
  platformLocalDecimal: number;
  /** The platform price in the store currency, minor units. */
  platformLocalMinor: number;
  storeCurrency: string;
  /** Margin over cost in store-currency minor units (may be negative if floored). */
  marginMinor: number;
  /** Margin as a fraction of the store price. */
  marginFraction: number;
  rate: number;
  /** The rate with the buffer applied, i.e. what the floor is measured at. */
  effectiveRate: number;
  /** Every markup step, in order, for display and audit. */
  steps: MarkupStep[];
  /** True when step 5 raised the price to protect the floor. */
  floorApplied: boolean;
}

export class PricingFloorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingFloorError";
  }
}

/** Apply one markup to a decimal amount, in the amount's own currency. */
export function applyMarkup(amount: number, rule: MarkupRule): number {
  const value = Number(rule.markup_value) || 0;
  if (rule.markup_type === "percentage") {
    return amount * (1 + value / 100);
  }
  return amount + value;
}

/**
 * Compute the customer price.
 *
 * Throws `PricingFloorError` only if the floor cannot be satisfied at all
 * (e.g. a zero or negative rate), which is a configuration fault rather than
 * something to paper over.
 */
export function computePrice(input: PricingInput): PricingResult {
  const {
    costUsd,
    costCurrency: rawCostCurrency = BASE_CURRENCY,
    usdToStoreRate,
    costCurrencyUsdRate,
    storeCurrency,
    platformMarkups = [],
    resellerMarkup = null,
    resellerSellingPrice = null,
    bufferFraction = 0,
  } = input;

  if (!(costUsd >= 0) || !Number.isFinite(costUsd)) {
    throw new PricingFloorError(`invalid costUsd: ${costUsd}`);
  }
  if (!(usdToStoreRate > 0) || !Number.isFinite(usdToStoreRate)) {
    throw new PricingFloorError(`invalid usdToStoreRate: ${usdToStoreRate}`);
  }

  const costCurrency = (rawCostCurrency || BASE_CURRENCY).toUpperCase();
  const storeDivisor = currencyDivisor(storeCurrency);

  // Step 1: normalise the cost to USD. A USD cost (Zendit) is already there.
  // A local-currency cost (Accragh GHS, Lizzysub NGN) is divided by that
  // currency's USD rate, which stops step 3 multiplying it by the store rate
  // a second time. A cost already in the store currency uses the store rate
  // the caller has loaded; any other currency needs its own rate supplied,
  // and its absence is a configuration fault rather than a silent misprice.
  let usdCost = costUsd;
  if (costCurrency !== BASE_CURRENCY) {
    const costRate = costCurrency === storeCurrency.toUpperCase()
      ? usdToStoreRate
      : costCurrencyUsdRate;
    if (!(typeof costRate === "number" && costRate > 0 && Number.isFinite(costRate))) {
      throw new PricingFloorError(
        `no USD rate for cost currency ${costCurrency}`,
      );
    }
    usdCost = costUsd / costRate;
  }

  // Steps 1-2: platform markup, in USD.
  const steps: MarkupStep[] = [];
  let platformPriceUsd = usdCost;
  for (const rule of platformMarkups) {
    platformPriceUsd = applyMarkup(platformPriceUsd, rule);
    steps.push({
      source: rule.source ?? "platform_default",
      markup_type: rule.markup_type,
      markup_value: Number(rule.markup_value) || 0,
      amount: platformPriceUsd,
      currency: BASE_CURRENCY,
    });
  }

  // Step 3: convert to the store currency. The buffer is applied here, to
  // the rate, so the floor in step 5 uses the same number the price did.
  const effectiveRate = usdToStoreRate * (1 + bufferFraction);
  const storePriceMinor = Math.round(platformPriceUsd * effectiveRate * storeDivisor);

  // Step 4: reseller markup, in store currency. An explicit selling price
  // wins outright — that is the reseller's stated shelf price.
  let customerPriceMinor = storePriceMinor;
  if (resellerSellingPrice !== null && resellerSellingPrice !== undefined) {
    customerPriceMinor = toMinor(Number(resellerSellingPrice), storeDivisor);
    steps.push({
      source: "reseller",
      markup_type: "fixed",
      markup_value: 0,
      amount: customerPriceMinor / storeDivisor,
      currency: storeCurrency,
    });
  } else if (resellerMarkup) {
    const decimal = (storePriceMinor / storeDivisor);
    const after = applyMarkup(decimal, resellerMarkup);
    customerPriceMinor = toMinor(after, storeDivisor);
    steps.push({
      source: "reseller",
      markup_type: resellerMarkup.markup_type,
      markup_value: Number(resellerMarkup.markup_value) || 0,
      amount: customerPriceMinor / storeDivisor,
      currency: storeCurrency,
    });
  }

  // Step 5: the floor. The customer price must cover the PLATFORM price —
  // the wholesale cost with the platform markup and the FX buffer applied,
  // converted at the buffered rate. The platform markup is the platform's
  // cut and the buffer is its protection against the rate moving between
  // pricing and settlement, so both belong to the platform: measuring the
  // floor at the raw cost would hand the reseller the platform's margin as
  // its own. If rounding or a negative markup has pushed the price under,
  // lift it to exactly the floor.
  //
  // `costFloorMinor` stays the RAW cost at the buffered rate (what the
  // platform pays the provider); `platformFloorMinor` is the platform price
  // and is what the purchase RPC deducts from the reseller.
  //
  // Both are converted from their normalised USD form in one multiplication
  // rather than a round trip through USD minor units, so a cost already in
  // the store's own currency lands back on its exact value (NGN 380 -> 380,
  // not 384) instead of absorbing a rounding error.
  const costFloorMinor = toMinor(usdCost * effectiveRate, storeDivisor);
  const platformFloorMinor = toMinor(platformPriceUsd * effectiveRate, storeDivisor);
  let floorApplied = false;
  if (customerPriceMinor < platformFloorMinor) {
    customerPriceMinor = platformFloorMinor;
    floorApplied = true;
  }

  const customerPriceDecimal = customerPriceMinor / storeDivisor;
  const marginMinor = customerPriceMinor - platformFloorMinor;

  return {
    costUsd: usdCost,
    costCurrency,
    platformPriceUsd,
    storePriceMinor,
    customerPriceMinor,
    customerPriceDecimal,
    costLocalDecimal: costFloorMinor / storeDivisor,
    costLocalMinor: costFloorMinor,
    platformLocalDecimal: platformFloorMinor / storeDivisor,
    platformLocalMinor: platformFloorMinor,
    storeCurrency,
    marginMinor,
    marginFraction: customerPriceMinor > 0
      ? marginMinor / customerPriceMinor
      : 0,
    rate: usdToStoreRate,
    effectiveRate,
    steps,
    floorApplied,
  };
}
