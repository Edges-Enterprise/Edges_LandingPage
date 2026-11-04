// supabase/functions/_shared/catalog/purchaseZenditOffer.ts
//
// Phase 2. Purchase a Zendit offer, FIXED or RANGE.
//
// The existing `purchaseZendit` in _shared/providers.ts builds a body with
// only `offerId`, `recipientPhoneNumber` and `transactionId`, and its own
// comment notes that this is FIXED-only: a RANGE offer needs a `value`
// object it does not build. Phase 2 sells RANGE offers, so this is the
// purchase path that replaces it.
//
// Per the Zendit spec (dto.TopupPurchaseMakeInput):
//   - `value` is REQUIRED for a RANGE offer
//   - `value` MUST be omitted for a FIXED offer
//   - `value.type` is "PRICE" (an amount in the offer's cost currency) or
//     "ZEND" (an amount the recipient receives)
//   - `value.value` is an INTEGER in minor units
//
// Getting the omit-vs-include wrong is a hard rejection from Zendit, so the
// two shapes are built explicitly rather than by leaving a field undefined
// in a spread.

import {
  createTopupPurchase,
  getTopupPurchase,
  type PurchaseValue,
  type TopupPurchaseResponse,
} from "./zenditClient.ts";

export interface ZenditPurchaseRequest {
  offerId: string;
  /** Recipient in e164, e.g. +250788123456. */
  recipientPhoneNumber: string;
  /** Our idempotency key; Zendit echoes it back. */
  transactionId: string;
  priceType: "FIXED" | "RANGE";
  /** REQUIRED for RANGE: the chosen amount and what it is expressed in. */
  value?: PurchaseValue;
}

export class ZenditPurchaseInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZenditPurchaseInputError";
  }
}

/** E.164: a leading +, then 8-15 digits. */
const E164 = /^\+[1-9]\d{7,14}$/;

export function validatePurchaseInput(req: ZenditPurchaseRequest): void {
  if (!req.offerId?.trim()) {
    throw new ZenditPurchaseInputError("offerId is required");
  }
  if (!req.transactionId?.trim()) {
    throw new ZenditPurchaseInputError("transactionId is required");
  }
  if (!E164.test(req.recipientPhoneNumber ?? "")) {
    throw new ZenditPurchaseInputError(
      `recipientPhoneNumber must be e164, got ${req.recipientPhoneNumber}`,
    );
  }
  if (req.priceType === "RANGE") {
    if (!req.value) {
      throw new ZenditPurchaseInputError(
        "a RANGE offer requires a value object",
      );
    }
    if (req.value.type !== "PRICE" && req.value.type !== "ZEND") {
      throw new ZenditPurchaseInputError(
        `value.type must be PRICE or ZEND, got ${req.value.type}`,
      );
    }
    if (!Number.isInteger(req.value.value) || req.value.value <= 0) {
      throw new ZenditPurchaseInputError(
        `value.value must be a positive integer in minor units, got ${req.value.value}`,
      );
    }
  }
  if (req.priceType === "FIXED" && req.value) {
    throw new ZenditPurchaseInputError(
      "a FIXED offer must not carry a value object",
    );
  }
}

/** Build the exact body Zendit expects for the offer's price type. */
export function buildPurchaseBody(
  req: ZenditPurchaseRequest,
): Record<string, unknown> {
  validatePurchaseInput(req);
  const body: Record<string, unknown> = {
    offerId: req.offerId,
    recipientPhoneNumber: req.recipientPhoneNumber,
    transactionId: req.transactionId,
  };
  if (req.priceType === "RANGE") {
    body.value = req.value;
  }
  return body;
}

export interface ZenditPurchaseOutcome {
  accepted: boolean;
  transactionId: string;
  /** Always false from this call: Zendit settles asynchronously. */
  final: false;
  message: string;
  raw: unknown;
}

/**
 * Submit the purchase.
 *
 * The result is ALWAYS non-final. Zendit acknowledges acceptance and settles
 * later by webhook or by polling, so a caller must record a pending order
 * and must not debit a wallet on this response alone.
 */
export async function purchaseZenditOffer(
  req: ZenditPurchaseRequest,
  submit: (
    input: Parameters<typeof createTopupPurchase>[0],
  ) => Promise<TopupPurchaseResponse> = createTopupPurchase,
): Promise<ZenditPurchaseOutcome> {
  const body = buildPurchaseBody(req);
  const response = await submit(body as never);
  return {
    accepted: !!response?.transactionId,
    transactionId: response?.transactionId ?? req.transactionId,
    final: false,
    message: response?.status ?? "accepted",
    raw: response,
  };
}

/** Poll a submitted purchase. Returns Zendit's raw status payload. */
export async function pollZenditPurchase(transactionId: string): Promise<unknown> {
  return await getTopupPurchase(transactionId);
}
