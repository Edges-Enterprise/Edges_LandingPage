// supabase/functions/_shared/providers.ts
//
// Task 4, branch 1.d.iii. Real provider integrations for the
// global-purchase-data / global-purchase-airtime edge functions,
// confirmed against each provider's own documentation (not guessed —
// see HANDOVER.md Task 4 for the source).
//
// IMPORTANT: the three providers are not equivalent in timing model.
//   - lizzysub: SYNCHRONOUS. The response to the purchase call is the
//     final result (success or failure), same as legacy's proven
//     purchase-data/purchase-airtime.
//   - accragh (NetFillGh): ASYNCHRONOUS. "pending -> processing ->
//     completed/failed". Per NetFillGh's own docs, the wallet charge on
//     THEIR side only happens at "processing", not at the initial
//     response — an order can still fail after this call returns
//     "success" for having been *accepted*.
//   - zendit: ASYNCHRONOUS. Zendit's own docs describe transactions
//     moving through receipt -> wallet authorization -> offer
//     fulfillment -> completion, polled via transactionId or reported
//     via webhook. The initial response here is a transactionId, not a
//     final result either.
//
// Callers MUST respect `result.final`: only a `final: true` result may
// be treated as a completed purchase for deduction/order-completion
// purposes. A `final: false` result means "accepted for processing,
// not yet confirmed" — the caller should record a PENDING order/
// transaction and NOT move any wallet balance yet. Completing a
// pending AccraGH/Zendit purchase (crediting/debiting on final
// confirmation) requires a webhook handler for that provider.
// AccraGH: handled by the accragh-webhook edge function (branch
// 1.d.iv.zi). Zendit: handled by the zendit-webhook edge function
// (branch 1.d.iv.zo). See HANDOVER.md Task 4.

export type PurchaseCategory = "data" | "airtime";

export interface ProviderPurchaseParams {
  category: PurchaseCategory;
  provider: "lizzysub" | "accragh" | "zendit";
  providerPlanId: string; // global_base_plans.provider_plan_id
  phoneNumber: string; // local format as stored/entered, e.g. 0803...
  countryDialCode: string; // e.g. "234", "233" - from getCountryConfig, no leading '+'
  amount: number; // the base (wholesale) plan amount - only used for lizzysub airtime
  requestId: string; // our own idempotency key, reused as each provider's own key field
}

export interface ProviderPurchaseResult {
  ok: boolean; // false means the provider has definitively rejected/failed this request
  final: boolean; // true = result above is conclusive; false = accepted, pending confirmation
  message: string;
  providerReference?: string; // provider's own tracking id, for status polling / webhook matching later
  raw: unknown; // full provider response, for metadata/audit logging
}

// ─── Lizzysub (Nigeria) ─────────────────────────────────────────────
// Confirmed against the live edge functions purchase-data/
// purchase-airtime AND Lizzysub's own API docs - both agree exactly.
const LIZZY_NETWORK_MAP: Record<string, number> = {
  MTN: 1,
  AIRTEL: 2,
  GLO: 3,
  "9MOBILE": 4,
};

async function purchaseLizzysub(
  params: ProviderPurchaseParams,
  network: string,
): Promise<ProviderPurchaseResult> {
  const token = Deno.env.get("LIZZYSUB_TOKEN");
  if (!token) {
    return {
      ok: false,
      final: true,
      message: "Lizzysub is not configured",
      raw: null,
    };
  }

  const networkId = LIZZY_NETWORK_MAP[network?.toUpperCase()];
  if (!networkId) {
    return {
      ok: false,
      final: true,
      message: `Unsupported network: ${network}`,
      raw: null,
    };
  }

  const endpoint =
    params.category === "airtime"
      ? "https://lizzysub.com/api/topup"
      : "https://lizzysub.com/api/data";

  const body =
    params.category === "airtime"
      ? {
          network: networkId,
          phone: params.phoneNumber,
          plan_type: "VTU",
          bypass: false,
          amount: params.amount,
          "request-id": params.requestId,
        }
      : {
          network: networkId,
          phone: params.phoneNumber,
          data_plan: params.providerPlanId,
          bypass: false,
          "request-id": params.requestId,
        };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return {
    ok: data?.status === "success",
    final: true,
    message: data?.message || "Transaction failed. Please try again.",
    providerReference: params.requestId,
    raw: data,
  };
}

// ─── AccraGH (Ghana, via NetFillGh) ─────────────────────────────────
// Confirmed against NetFillGh's own API docs. Data bundles only - no
// raw/flexible-amount airtime product is exposed by this API at all,
// so a "airtime" category request against this provider is only ever
// meaningful if the catalog itself never populates accragh-provider
// plans under that category - not enforced defensively here, that's a
// catalog data-integrity concern, not a purchase-time one.
async function purchaseAccragh(
  params: ProviderPurchaseParams,
): Promise<ProviderPurchaseResult> {
  const apiKey = Deno.env.get("ACCRAGH_API_KEY");
  if (!apiKey) {
    return {
      ok: false,
      final: true,
      message: "AccraGH is not configured",
      raw: null,
    };
  }

  const response = await fetch(
    "https://netfillgh.com/api/index.php?endpoint=buy",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${apiKey}`,
      },
      body: new URLSearchParams({
        service_id: params.providerPlanId,
        recipient: params.phoneNumber,
        request_id: params.requestId,
      }),
    },
  );

  const data = await response.json();

  if (data?.status !== "success") {
    // Per NetFillGh's error codes, a 409 duplicate request_id returns
    // the *original* order, not a new failure - treat that the same
    // as a pending acceptance rather than an error, since the order
    // genuinely exists.
    if (data?.code === 409 && data?.data?.order_ref) {
      return {
        ok: true,
        final: false,
        message: data.message || "Order already exists (duplicate request_id)",
        providerReference: data.data.order_ref,
        raw: data,
      };
    }
    return {
      ok: false,
      final: true,
      message: data?.message || "Order rejected. Please try again.",
      raw: data,
    };
  }

  // "Order placed" here means accepted, NOT charged/delivered yet -
  // NetFillGh's own docs: the wallet charge happens at "processing",
  // and a "pending" order can still fail with no charge at all.
  return {
    ok: true,
    final: false,
    message: data.message || "Order placed. Data will be delivered shortly.",
    providerReference: data.data?.order_ref,
    raw: data,
  };
}

// ─── Zendit (everywhere else) ───────────────────────────────────────
// Confirmed against Zendit's own OpenAPI docs. FIXED-price offers only
// for now - `value` is omitted here, which per Zendit's docs is only
// valid for FIXED offers; a RANGE-type offer (variable amount) would
// need a `value` object this function doesn't build. global_base_plans
// only stores a single base_price per plan, not a min/max range, so
// this assumption matches what the catalog can represent today -
// flagged in case RANGE-type Zendit offers are ever added to the
// catalog without updating this.
async function purchaseZendit(
  params: ProviderPurchaseParams,
): Promise<ProviderPurchaseResult> {
  const apiKey = Deno.env.get("ZENDIT_API_KEY");
  if (!apiKey) {
    return {
      ok: false,
      final: true,
      message: "Zendit is not configured",
      raw: null,
    };
  }

  // Zendit requires e.164 (+<dial code><local number without leading 0>).
  const localDigits = params.phoneNumber.replace(/^0+/, "");
  const recipientE164 = `+${params.countryDialCode}${localDigits}`;

  const response = await fetch("https://api.zendit.io/v1/topups/purchases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      offerId: params.providerPlanId,
      recipientPhoneNumber: recipientE164,
      transactionId: params.requestId,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data?.transactionId) {
    return {
      ok: false,
      final: true,
      message: data?.message || "Purchase could not be submitted.",
      raw: data,
    };
  }

  // Zendit's initial response is just an accepted transactionId (the one
  // we supplied) - DONE/FAILED only arrive later via polling
  // /topups/purchases/{id} or a webhook. Zendit's webhooks carry no
  // payload signature, only a console-configured secret header; the
  // zendit-webhook function therefore authenticates that header AND
  // re-confirms the status with Zendit's API before settling (see
  // _shared/zenditWebhook.ts).
  return {
    ok: true,
    final: false,
    message: "Transaction submitted, awaiting confirmation.",
    providerReference: data.transactionId,
    raw: data,
  };
}

export async function purchaseFromProvider(
  params: ProviderPurchaseParams,
  network: string,
): Promise<ProviderPurchaseResult> {
  switch (params.provider) {
    case "lizzysub":
      return purchaseLizzysub(params, network);
    case "accragh":
      return purchaseAccragh(params);
    case "zendit":
      return purchaseZendit(params);
    default:
      return {
        ok: false,
        final: true,
        message: `Unknown provider: ${params.provider}`,
        raw: null,
      };
  }
}
