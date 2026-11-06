// supabase/functions/_shared/currency/providerRate.ts
//
// Phase 2. The collection-provider leg of the FX refresh: ask the provider
// for the USD -> quote rate the platform's held money is actually worth.
//
// Kept out of the function entrypoint so it can be unit-tested without
// starting the HTTP server.

import { BASE_CURRENCY } from "./registry.ts";

const KORAPAY_BASE = Deno.env.get("KORAPAY_BASE_URL") ||
  "https://api.korapay.com";

interface KorapayRateResponse {
  status?: boolean;
  data?: {
    rate?: number;
    source_currency?: string;
    destination_currency?: string;
  };
  message?: string;
}

/** The outcome of asking the provider for one pair's rate. */
export type ProviderRateOutcome =
  | { kind: "rate"; rate: number }
  /** The provider answered, but has no rate for this pair. A normal outcome. */
  | { kind: "no_rate"; detail: string }
  /** The provider rejected the request (auth/entitlement). The leg is dead. */
  | { kind: "rejected"; status: number; detail: string };

/**
 * Ask Korapay for the USD -> `quote` rate.
 *
 * The three outcomes are deliberately distinct. A rejected request (401/403
 * — a dead or unentitled key) is NOT the same as a provider that simply has
 * no rate for a pair: the first means every pair on this leg will fail and
 * the caller is on the fallback rate, the second is routine. Collapsing both
 * to `null` is what let a dead Korapay leg report success for weeks while
 * writing nothing (see TASK-8-BOARD Blocker 10).
 */
export async function fetchKorapayRate(
  quote: string,
  fetcher: typeof fetch = fetch,
): Promise<ProviderRateOutcome> {
  const secret = Deno.env.get("KORAPAY_SECRET_KEY");
  if (!secret) {
    return {
      kind: "rejected",
      status: 0,
      detail: "KORAPAY_SECRET_KEY is not configured",
    };
  }

  const response = await fetcher(
    `${KORAPAY_BASE}/merchant/api/v1/conversions/rates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_currency: BASE_CURRENCY,
        destination_currency: quote,
        amount: 1,
      }),
    },
  );

  if (response.status === 401 || response.status === 403) {
    const text = await response.text().catch(() => "");
    return {
      kind: "rejected",
      status: response.status,
      detail: text.slice(0, 200) || `HTTP ${response.status}`,
    };
  }

  if (!response.ok) {
    return { kind: "no_rate", detail: `HTTP ${response.status}` };
  }

  const body = (await response.json()) as KorapayRateResponse;
  const rate = body?.data?.rate;
  if (typeof rate !== "number" || !(rate > 0)) {
    return { kind: "no_rate", detail: body?.message || "no rate in response" };
  }
  return { kind: "rate", rate };
}
