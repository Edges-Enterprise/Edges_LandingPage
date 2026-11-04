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
//   1. start from the USD wholesale cost (normalised at sync time)
//   2. apply the PLATFORM markup            -> platform price, USD
//   3. convert to the store currency        -> store price, minor units
//   4. apply the RESELLER markup            -> customer price, minor units
//   5. assert the customer price >= the USD cost converted at the rate
//
// Step 2 before step 3 means the platform's cut is taken in USD, so it does
// not move with the rate. Step 5 is the invariant from HANDOVER.md: if a
// rounding or a stale rate ever pushes the shelf price below the wholesale
// cost, that is a bug, not a pricing choice, and it throws.

import {
  BASE_CURRENCY,
  convertMinor,
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
    | "platform_plan"
    | "reseller";
}

/** A single step in the markup chain, kept for display and audit. */
export interface MarkupStep {
  source: "platform_default" | "platform_country" | "platform_plan" |
    "reseller";
  markup_type: MarkupType;
  markup_value: number;
  /** Amount after this step, in the currency it was applied in. */
  amount: number;
  currency: string;
}

export interface PricingInput {
  /** Wholesale cost in USD, decimal (as stored in global_base_plans). */
  costUsd: number;
  /** The store's currency (one currency per store, permanent). */
  storeCurrency: string;
  /** USD -> storeCurrency multiplier from the rate service. */
  usdToStoreRate: number;
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
  /** Wholesale cost, USD decimal. */
  costUsd: number;
  /** Cost after platform markup, USD decimal. */
  platformPriceUsd: number;
  /** Platform price converted to the store currency, minor units. */
  storePriceMinor: number;
  /** Final customer price in the store currency, minor units. */
  customerPriceMinor: number;
  /** Customer price as a decimal, for a numeric DB column or display. */
  customerPriceDecimal: number;
  /**
   * The wholesale cost converted into the store currency, decimal. This is
   * the `cost_price` the purchase RPC deducts, and the basis of the
   * reseller's profit (`selling_price - cost_price`). It is deliberately the
   * same number as the floor, so profit can never be negative.
   */
  costLocalDecimal: number;
  /** The wholesale cost converted into the store currency, minor units. */
  costLocalMinor: number;
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
    storeCurrency,
    usdToStoreRate,
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

  const storeDivisor = currencyDivisor(storeCurrency);

  // Steps 1-2: platform markup, in USD.
  const steps: MarkupStep[] = [];
  let platformPriceUsd = costUsd;
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

  // Step 5: the floor. The customer price must cover the wholesale cost
  // converted at the rate the platform is actually exposed to. That is the
  // BUFFERED rate, not the raw one: the buffer is the platform's own
  // protection against the rate moving between pricing and settlement, so
  // measuring the floor at the unbuffered rate would hand the buffer to the
  // reseller as margin. If rounding or a negative markup has pushed the
  // price under, lift it to exactly the floor.
  const costFloorMinor = convertMinor(
    toMinor(costUsd, currencyDivisor(BASE_CURRENCY)),
    currencyDivisor(BASE_CURRENCY),
    effectiveRate,
    storeDivisor,
  );
  let floorApplied = false;
  if (customerPriceMinor < costFloorMinor) {
    customerPriceMinor = costFloorMinor;
    floorApplied = true;
  }

  const customerPriceDecimal = customerPriceMinor / storeDivisor;
  const marginMinor = customerPriceMinor - costFloorMinor;

  return {
    costUsd,
    platformPriceUsd,
    storePriceMinor,
    customerPriceMinor,
    customerPriceDecimal,
    costLocalDecimal: costFloorMinor / storeDivisor,
    costLocalMinor: costFloorMinor,
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
