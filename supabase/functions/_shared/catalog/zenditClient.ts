// supabase/functions/_shared/catalog/zenditClient.ts
//
// Phase 2. Thin HTTP client for the Zendit catalog and purchase API.
//
// Endpoints verified against the Zendit OpenAPI spec (v1.0.13), base
// https://api.zendit.io/v1, auth `Authorization: Bearer <ZENDIT_API_KEY>`:
//
//   GET  /topups/offers?_limit=&_offset=&country=&brand=&regions=&subType=
//        _limit is REQUIRED and capped at 1024 (min 1).
//   GET  /topups/offers/{offerId}
//   GET  /tools/phonenumberlookup/{msisdn}
//   POST /topups/purchases
//        body: { offerId, recipientPhoneNumber, transactionId, value? }
//        `value` is REQUIRED for RANGE offers and MUST be omitted for FIXED.
//   GET  /topups/purchases/{transactionId}
//
// The purchase path here supersedes the older `value`-less call in
// _shared/providers.ts, which could only ever buy FIXED offers.

const BASE_URL = "https://api.zendit.io/v1";

/** Zendit caps a single offers page at 1024. */
export const MAX_PAGE_SIZE = 1024;

export interface ZenditPage<T> {
  limit: number;
  offset: number;
  total: number;
  list: T[];
}

export interface PhoneNumberLookup {
  brand: string;
  country: string;
  mobileCountryCode: string;
  mobileNetworkCode: string;
  msisdn: string;
}

export interface PurchaseValue {
  /** "PRICE" = a price in the offer's cost currency; "ZEND" = a send value. */
  type: "PRICE" | "ZEND";
  value: number;
}

export class ZenditError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ZenditError";
    this.status = status;
    this.body = body;
  }
}

function apiKey(): string {
  const key = Deno.env.get("ZENDIT_API_KEY");
  if (!key) throw new ZenditError("ZENDIT_API_KEY is not configured", 0, null);
  return key;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = (body as { message?: string })?.message ??
      `Zendit request failed (${response.status})`;
    throw new ZenditError(message, response.status, body);
  }
  return body as T;
}

/**
 * One page of topup offers. `_limit` and `_offset` are required by Zendit.
 * `country` is the 2-letter ISO destination filter.
 */
export async function fetchOffersPage(
  opts: {
    limit?: number;
    offset?: number;
    country?: string;
    brand?: string;
    regions?: string;
    subType?: string;
  } = {},
): Promise<ZenditPage<unknown>> {
  const limit = Math.min(opts.limit ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);
  const params = new URLSearchParams({
    _limit: String(limit),
    _offset: String(opts.offset ?? 0),
  });
  if (opts.country) params.set("country", opts.country.toLowerCase());
  if (opts.brand) params.set("brand", opts.brand);
  if (opts.regions) params.set("regions", opts.regions);
  if (opts.subType) params.set("subType", opts.subType);

  return await request<ZenditPage<unknown>>(`/topups/offers?${params}`);
}

/**
 * Walk every page of the catalog, optionally filtered to one country.
 *
 * `total` is taken from the first page and used only as a safety bound: if
 * Zendit reports a total but the pages run past it, we stop rather than
 * looping forever on a pagination bug.
 */
export async function* iterateOffers(
  opts: { country?: string; pageSize?: number } = {},
): AsyncGenerator<unknown[], void, void> {
  const pageSize = Math.min(opts.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await fetchOffersPage({
      limit: pageSize,
      offset,
      country: opts.country,
    });
    const list = Array.isArray(page.list) ? page.list : [];
    if (typeof page.total === "number") total = page.total;
    if (list.length === 0) return;
    yield list;
    offset += list.length;
    // A short page means the end even if `total` disagreed.
    if (list.length < pageSize) return;
  }
}

/**
 * Look up the carrier and country for a phone number. This replaces prefix
 * tables: the answer comes from the provider that will actually deliver the
 * topup, so it cannot drift from reality.
 */
export async function lookupPhoneNumber(
  msisdn: string,
): Promise<PhoneNumberLookup> {
  // Zendit wants the MSISDN in e.164 without the leading '+'.
  const normalised = msisdn.replace(/^\+/, "").replace(/\D/g, "");
  return await request<PhoneNumberLookup>(
    `/tools/phonenumberlookup/${normalised}`,
  );
}

export interface TopupPurchaseInput {
  offerId: string;
  /** Recipient in e.164, e.g. +250788123456. */
  recipientPhoneNumber: string;
  /** Our own idempotency key, echoed back by Zendit. */
  transactionId: string;
  /** REQUIRED for RANGE offers; must be omitted for FIXED. */
  value?: PurchaseValue;
}

export interface TopupPurchaseResponse {
  status: string;
  transactionId: string;
}

/**
 * Submit a topup purchase.
 *
 * The response only acknowledges acceptance — Zendit settles asynchronously
 * and the outcome arrives by webhook or by polling
 * GET /topups/purchases/{transactionId}. Callers must treat this as
 * "accepted", never as "completed".
 */
export async function createTopupPurchase(
  input: TopupPurchaseInput,
): Promise<TopupPurchaseResponse> {
  return await request<TopupPurchaseResponse>("/topups/purchases", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Poll a submitted purchase for its current status. */
export async function getTopupPurchase(
  transactionId: string,
): Promise<unknown> {
  return await request<unknown>(
    `/topups/purchases/${encodeURIComponent(transactionId)}`,
  );
}

/** Current prepaid balance on the Zendit account, for low-balance alerting. */
export async function getBalance(): Promise<unknown> {
  return await request<unknown>("/balance");
}
