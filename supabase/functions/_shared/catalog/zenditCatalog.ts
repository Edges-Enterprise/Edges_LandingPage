// supabase/functions/_shared/catalog/zenditCatalog.ts
//
// Phase 2. Pure normaliser: a raw Zendit topup offer (dto.TopupOffer) -> a
// global_base_plans row.
//
// Kept pure and separate from the HTTP client so it can be unit-tested
// against captured payloads without a network or a database. The client in
// _shared/catalog/zenditClient.ts does the fetching; this file only maps.
//
// Verified against the Zendit OpenAPI spec (v1.0.13):
//
//   dto.TopupOffer: brand, brandName, cost (dto.Cost), country, createdAt,
//     dataGB, dataUnlimited, durationDays, enabled, notes, offerId, price,
//     priceType ("FIXED"|"RANGE"), productType, regions[], send (dto.Zend),
//     shortNotes, smsNumber, smsUnlimited, subTypes[] ("Mobile Top Up" |
//     "Mobile Bundle" | "Mobile Data"), updatedAt, voiceMinutes,
//     voiceUnlimited
//
//   dto.Cost / dto.Zend: currency, currencyDivisor, discount, fee, feePct,
//     fixed, fx, max, min
//
// Amounts are integers in minor units; divide by `currencyDivisor`.

import {
  BASE_CURRENCY,
  currencyDecimals,
  resolveDivisor,
  toDecimal,
} from "../currency/registry.ts";

/** Shape of a raw offer as returned by GET /v1/topups/offers. */
export interface ZenditCost {
  currency?: string;
  currencyDivisor?: number;
  discount?: number;
  fee?: number;
  feePct?: number;
  fixed?: number;
  fx?: number;
  max?: number;
  min?: number;
}

export interface ZenditOffer {
  offerId?: string;
  brand?: string;
  brandName?: string;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
  dataGB?: number;
  dataUnlimited?: boolean;
  durationDays?: number;
  enabled?: boolean;
  notes?: string;
  shortNotes?: string;
  price?: number;
  priceType?: string;
  productType?: string;
  regions?: string[];
  subTypes?: string[];
  smsNumber?: number;
  smsUnlimited?: boolean;
  voiceMinutes?: number;
  voiceUnlimited?: boolean;
  cost?: ZenditCost;
  send?: ZenditCost;
}

/** Our own normalised category, matching global_base_plans.category. */
export type CatalogCategory = "data" | "airtime";

export interface NormalizedPlan {
  provider: "zendit";
  provider_plan_id: string;
  country_code: string;
  network: string | null;
  name: string;
  description: string | null;
  category: CatalogCategory;
  data_amount: string | null;
  validity: string | null;
  duration_days: number | null;
  /** Wholesale cost in BASE_CURRENCY (USD), decimal. */
  base_price: number;
  currency: string;
  /** What the recipient receives, decimal, in send currency. */
  send_value: number | null;
  send_currency: string | null;
  price_type: "FIXED" | "RANGE";
  /** RANGE bounds in the SEND currency, decimal. Null for FIXED. */
  range_min: number | null;
  range_max: number | null;
  /** Zendit's own fx for the offer (RANGE), when supplied. */
  zendit_fx: number | null;
  metadata: Record<string, unknown>;
}

/** Rows we deliberately drop rather than store. */
export interface RejectedOffer {
  offerId: string | null;
  reason: string;
}

/**
 * Map Zendit's subTypes to our two-category model. Anything we cannot map is
 * rejected by the caller — we do not want an unmapped product silently
 * landing in the "data" bucket, which is what a naive default would do.
 */
export function categoryFor(offer: ZenditOffer): CatalogCategory | null {
  const subTypes = (offer.subTypes ?? []).map((s) => s.toLowerCase());
  if (subTypes.includes("mobile top up")) return "airtime";
  if (
    subTypes.includes("mobile bundle") ||
    subTypes.includes("mobile data")
  ) {
    return "data";
  }
  // Some offers carry no subTypes; fall back to the productType string.
  const productType = (offer.productType ?? "").toLowerCase();
  if (productType.includes("top up") || productType.includes("airtime")) {
    return "airtime";
  }
  if (productType.includes("bundle") || productType.includes("data")) {
    return "data";
  }
  return null;
}

/** "10GB" / "1.5GB" / "Unlimited" for display. */
export function dataAmountLabel(offer: ZenditOffer): string | null {
  if (offer.dataUnlimited) return "Unlimited";
  const gb = offer.dataGB;
  if (typeof gb !== "number" || gb <= 0) return null;
  return `${gb}GB`;
}

/**
 * Human label for the plan. Zendit's `notes`/`shortNotes` are the useful
 * strings; the brand is the carrier. Kept deterministic so a re-sync of an
 * unchanged offer produces an identical row.
 */
export function planName(offer: ZenditOffer): string {
  const parts: string[] = [];
  const carrier = offer.brandName || offer.brand || "Topup";
  parts.push(carrier);
  const label = dataAmountLabel(offer);
  if (label) parts.push(label);
  else if (offer.voiceUnlimited) parts.push("Airtime");
  return parts.join(" ");
}

/** Validity string, e.g. "30 days". */
export function validityLabel(offer: ZenditOffer): string | null {
  const d = offer.durationDays;
  if (typeof d !== "number" || d <= 0) return null;
  return d === 1 ? "1 day" : `${d} days`;
}

/**
 * Normalise one raw offer.
 *
 * Returns `{ plan }` on success or `{ rejected }` when the offer is missing
 * something we cannot invent (an id, a country, a usable cost). A rejected
 * offer is reported, not silently skipped, so a sync can surface it.
 */
export function normalizeZenditOffer(
  offer: ZenditOffer,
  opts: { usdRate?: number } = {},
): { plan: NormalizedPlan } | { rejected: RejectedOffer } {
  const offerId = offer.offerId?.trim();
  if (!offerId) {
    return { rejected: { offerId: null, reason: "missing offerId" } };
  }
  const country = offer.country?.trim().toLowerCase();
  if (!country) {
    return { rejected: { offerId, reason: "missing country" } };
  }

  const cost = offer.cost;
  if (!cost) {
    return { rejected: { offerId, reason: "missing cost" } };
  }

  const costCurrency = (cost.currency || BASE_CURRENCY).toUpperCase();
  const costDivisor = resolveDivisor(cost.currencyDivisor, costCurrency);
  const costMinor = cost.fixed;
  if (typeof costMinor !== "number" || !Number.isFinite(costMinor)) {
    return { rejected: { offerId, reason: "missing cost.fixed" } };
  }

  // Cost is stated in `costCurrency`. Zendit bills in USD, so this is
  // normally a no-op; it is applied anyway so the column means one thing.
  const costDecimal = toDecimal(costMinor, costDivisor);
  const usdRate = opts.usdRate ?? 1;
  const basePrice = costCurrency === BASE_CURRENCY
    ? costDecimal
    : costDecimal * usdRate;

  const send = offer.send;
  const sendCurrency = (send?.currency || costCurrency).toUpperCase();
  const sendDivisor = resolveDivisor(send?.currencyDivisor, sendCurrency);

  const priceType = (offer.priceType || "FIXED").toUpperCase() === "RANGE"
    ? "RANGE"
    : "FIXED";

  const category = categoryFor(offer);
  if (!category) {
    return {
      rejected: {
        offerId,
        reason: `unmapped productType/subTypes (${offer.productType ?? "none"})`,
      },
    };
  }

  // For FIXED, `send.fixed` is what the recipient gets. For RANGE, the
  // recipient value is the amount the customer chooses at purchase time, so
  // there is no single send value — only bounds.
  const sendValue = priceType === "FIXED" && typeof send?.fixed === "number"
    ? toDecimal(send.fixed, sendDivisor)
    : null;

  const rangeMin = priceType === "RANGE" && typeof send?.min === "number"
    ? toDecimal(send.min, sendDivisor)
    : null;
  const rangeMax = priceType === "RANGE" && typeof send?.max === "number"
    ? toDecimal(send.max, sendDivisor)
    : null;

  return {
    plan: {
      provider: "zendit",
      provider_plan_id: offerId,
      country_code: country,
      network: offer.brand?.trim() || null,
      name: planName(offer),
      description: offer.notes?.trim() || offer.shortNotes?.trim() || null,
      category,
      data_amount: dataAmountLabel(offer),
      validity: validityLabel(offer),
      duration_days: typeof offer.durationDays === "number"
        ? offer.durationDays
        : null,
      base_price: basePrice,
      currency: BASE_CURRENCY,
      send_value: sendValue,
      send_currency: sendCurrency,
      price_type: priceType,
      range_min: rangeMin,
      range_max: rangeMax,
      zendit_fx: typeof send?.fx === "number" ? send.fx : null,
      metadata: {
        brand: offer.brand ?? null,
        brandName: offer.brandName ?? null,
        productType: offer.productType ?? null,
        subTypes: offer.subTypes ?? [],
        regions: offer.regions ?? [],
        dataUnlimited: !!offer.dataUnlimited,
        voiceUnlimited: !!offer.voiceUnlimited,
        voiceMinutes: offer.voiceMinutes ?? null,
        smsUnlimited: !!offer.smsUnlimited,
        smsNumber: offer.smsNumber ?? null,
        costCurrency,
        costDivisor,
        sendDivisor,
        // Zendit's retail price, when their pricing module is on. Stored for
        // reference only — we do not price from it.
        zenditPrice: typeof offer.price === "number" ? offer.price : null,
        zenditFx: typeof send?.fx === "number" ? send.fx : null,
        createdAt: offer.createdAt ?? null,
        updatedAt: offer.updatedAt ?? null,
      },
    },
  };
}

/**
 * Distinct destination countries present in a page of offers. This is how
 * country coverage is discovered — from the catalog itself, not from a
 * hardcoded list.
 */
export function countriesIn(offers: ZenditOffer[]): string[] {
  const set = new Set<string>();
  for (const o of offers) {
    const c = o.country?.trim().toLowerCase();
    if (c) set.add(c);
  }
  return [...set].sort();
}

/**
 * Derive a USD -> local rate from a Zendit offer, for pricing.
 *
 * For a FIXED offer, `send.fixed / cost.fixed` gives local-per-USD directly
 * (after divisor normalisation). For a RANGE offer, `send.fx` is the rate
 * Zendit publishes. Both are RETAIL rates — Zendit's margin and rounding are
 * baked in — so this is a fallback and a cross-check, never the primary
 * pricing source. See HANDOVER.md Phase 2, "FX is two legs".
 */
export function deriveUsdRateFromOffer(
  offer: ZenditOffer,
): { rate: number; basis: "send.fixed/cost.fixed" | "send.fx" } | null {
  const send = offer.send;
  const cost = offer.cost;
  if (!send || !cost) return null;

  const costCurrency = (cost.currency || BASE_CURRENCY).toUpperCase();
  const costDivisor = resolveDivisor(cost.currencyDivisor, costCurrency);
  const sendCurrency = (send.currency || costCurrency).toUpperCase();
  const sendDivisor = resolveDivisor(send.currencyDivisor, sendCurrency);

  if (typeof send.fx === "number" && send.fx > 0) {
    return { rate: send.fx, basis: "send.fx" };
  }
  if (
    typeof send.fixed === "number" && send.fixed > 0 &&
    typeof cost.fixed === "number" && cost.fixed > 0 &&
    costCurrency === BASE_CURRENCY
  ) {
    const sendDecimal = toDecimal(send.fixed, sendDivisor);
    const costDecimal = toDecimal(cost.fixed, costDivisor);
    if (costDecimal > 0) {
      return {
        rate: sendDecimal / costDecimal,
        basis: "send.fixed/cost.fixed",
      };
    }
  }
  return null;
}

/** Zendit currency decimals, re-exported so callers need one import. */
export { currencyDecimals };
