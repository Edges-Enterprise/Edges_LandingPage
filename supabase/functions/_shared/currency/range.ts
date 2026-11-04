// supabase/functions/_shared/currency/range.ts
//
// Phase 2, build-order step 8. RANGE offers.
//
// A RANGE offer is an airtime top-up where the customer chooses the amount
// instead of picking a fixed tile. Zendit's `priceType` is FIXED or RANGE;
// a RANGE offer carries `send.min` / `send.max` / `send.increment` in the
// SEND currency (what the recipient receives), and fulfilment sends
// `value: { type, value }`.
//
// Two rules this file exists to enforce, both from the design:
//
//   1. Validate the chosen amount against the CURRENT bounds at purchase,
//      not cached ones. A catalog snapshot can be hours old; Zendit rejects
//      an out-of-bounds or off-step amount, and a rejected purchase that has
//      already been quoted is a support ticket.
//
//   2. A RANGE offer's conversion is governed by Zendit's own `fx` — it is
//      the one place Zendit's rate is authoritative, because it is the rate
//      at which the recipient's value is actually delivered.
//
// The pipeline in pricing.ts still sets the SHELF price (what the customer
// pays, in the store currency) from the USD cost, exactly as for a FIXED
// offer. What changes for RANGE is that the customer's chosen recipient
// amount is an input: the amount they enter determines both the send value
// and, through the rate, the cost — so the customer price is a function of
// their entry, not a stored number.

import { BASE_CURRENCY } from "./registry.ts";
import { computePrice, type MarkupRule, type PricingResult } from "./pricing.ts";

export interface RangeBounds {
  min: number;
  max: number;
  /** The step amounts must land on. Absent means any value in [min, max]. */
  increment?: number | null;
  /** The currency the bounds are expressed in (the send currency). */
  currency?: string | null;
}

export class RangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RangeError";
  }
}

/**
 * Floating-point-safe "is `value` a whole number of `increment` steps from
 * `min`". `value` and `increment` are decimals (e.g. 0.5), so a raw modulo
 * on floats can be off by an epsilon.
 */
export function isOnStep(
  value: number,
  min: number,
  increment: number | null | undefined,
): boolean {
  if (!increment || increment <= 0) return true;
  const steps = (value - min) / increment;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/**
 * Validate a customer-chosen recipient amount against the offer's bounds.
 *
 * Returns the amount unchanged when valid, and throws `RangeError` with a
 * message a caller can show, otherwise. This is deliberately strict: an
 * amount that is out of bounds or off-step is a hard rejection from Zendit,
 * so it must be caught here rather than after a wallet has been debited.
 */
export function validateRangeAmount(
  amount: number,
  bounds: RangeBounds,
): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError("Enter a valid amount");
  }
  if (amount < bounds.min) {
    throw new RangeError(`Minimum is ${bounds.min}`);
  }
  if (amount > bounds.max) {
    throw new RangeError(`Maximum is ${bounds.max}`);
  }
  if (!isOnStep(amount, bounds.min, bounds.increment)) {
    throw new RangeError(`Amount must be in steps of ${bounds.increment}`);
  }
  return amount;
}

/**
 * Snap an arbitrary amount to the nearest valid value inside the bounds.
 * Used to seed a slider/stepper so the first value the customer sees is
 * always one Zendit will accept.
 */
export function snapToStep(amount: number, bounds: RangeBounds): number {
  const step = bounds.increment && bounds.increment > 0 ? bounds.increment : 1;
  const steps = Math.round((amount - bounds.min) / step);
  const snapped = bounds.min + steps * step;
  return Math.min(bounds.max, Math.max(bounds.min, snapped));
}

/**
 * The USD cost of a RANGE offer for a chosen recipient amount.
 *
 * The customer enters an amount the RECIPIENT receives, in the send
 * currency. Zendit's `fx` is send-currency-per-USD, so the USD cost is
 * `sendAmount / fx`. That USD cost is what the pricing pipeline then marks
 * up and converts for the shelf price, exactly as a FIXED offer's cost.
 *
 * Throws when there is no usable fx: without it the cost cannot be derived,
 * and guessing a rate is how a plan gets sold below cost.
 */
export function rangeCostUsd(
  sendAmount: number,
  fx: number | null | undefined,
): number {
  if (!(typeof fx === "number" && Number.isFinite(fx) && fx > 0)) {
    throw new RangeError("This plan cannot be priced (no exchange rate)");
  }
  if (!(sendAmount > 0)) {
    throw new RangeError("Enter a valid amount");
  }
  return sendAmount / fx;
}

export interface RangePriceInput {
  sendAmount: number;
  fx: number | null | undefined;
  storeCurrency: string;
  usdToStoreRate: number;
  platformMarkups?: MarkupRule[];
  resellerMarkup?: MarkupRule | null;
  resellerSellingPrice?: number | null;
  bufferFraction?: number;
  bounds: RangeBounds;
}

/**
 * Price a RANGE offer for a chosen recipient amount, through the one
 * pipeline. Returns the same `PricingResult` shape a FIXED offer produces,
 * so the caller's display code is identical, plus the send amount echoed
 * back for the order snapshot.
 */
export function priceRangeOffer(
  input: RangePriceInput,
): PricingResult & { sendAmount: number } {
  const sendAmount = validateRangeAmount(input.sendAmount, input.bounds);
  const costUsd = rangeCostUsd(sendAmount, input.fx);

  const result = computePrice({
    costUsd,
    storeCurrency: input.storeCurrency,
    usdToStoreRate: input.usdToStoreRate,
    platformMarkups: input.platformMarkups ?? [],
    resellerMarkup: input.resellerMarkup ?? null,
    resellerSellingPrice: input.resellerSellingPrice ?? null,
    bufferFraction: input.bufferFraction ?? 0,
  });

  return { ...result, sendAmount };
}

/**
 * The `value` object Zendit expects for a RANGE purchase.
 *
 * `ZEND` expresses the amount the recipient receives, which is what the
 * customer chose, and is the type that pairs with the `send` bounds we
 * validated against. The value is an integer in minor units, so the send
 * amount is scaled by the send currency's divisor.
 */
export function rangePurchaseValue(
  sendAmount: number,
  sendDivisor: number,
): { type: "ZEND"; value: number } {
  return { type: "ZEND", value: Math.round(sendAmount * sendDivisor) };
}

export { BASE_CURRENCY };
