// supabase/functions/_shared/zenditWebhook.ts
//
// Task 4, branch 1.d.iv.zo. Handler logic for Zendit transaction-result
// webhooks, written with injected dependencies (config, fetch, settle) so
// every path can be tested without a network or database. The Deno entry
// point is zendit-webhook/index.ts.
//
// What Zendit's docs (developers.zendit.io/zendit-university/webhooks and
// /transaction-processing, and the API reference) actually give us:
//   - NO payload signature (no HMAC). Authentication is a header whose
//     name AND value are set by us in the Zendit console, plus an IP
//     allow-list on our side. The docs recommend a long random value
//     (not the API key) rotated about every 90 days.
//   - The webhook must answer HEAD (used by the console's "verify" button
//     when saving) and POST. Their own sample also answers GET.
//   - The POST body is the same shape as GET /v1/topups/purchases/{id}.
//     `transactionId` is the id WE supplied at purchase time
//     (purchaseOrchestrator's requestId, echoed back and stored as
//     global_orders.transaction_reference).
//   - Statuses: PENDING, ACCEPTED, AUTHORIZED, IN_PROGRESS (in flight),
//     DONE and FAILED (final). The transaction-processing prose says
//     "FAIL" while the API enum says "FAILED"; both are accepted here.
//   - Delivery: expects a 2xx within 10 seconds; otherwise retries on an
//     escalating schedule (1s, 10s, 1m, 10m, 30m, 1h, 3h, 6h, 12h).
//
// Because a static header is a weaker guarantee than a signature, this
// handler does NOT trust the webhook body for anything that moves money.
// For a final status it re-fetches the transaction from Zendit's API with
// OUR api key and settles on what Zendit's API says. A forged or replayed
// webhook can therefore at worst trigger a status lookup.

export const ZENDIT_AUTH_HEADER = "x-webhook-token";

// Zendit's webhook sender addresses (supplied by the person; Zendit's
// webhooks doc says to whitelist "the IP addresses from our service" but
// does not list them, so these are unverified by us). An extra layer
// in front of the secret header, in OBSERVE-ONLY mode by default: a sender
// outside this list is logged but not blocked, because a stale list or an
// unexpected header would otherwise 403 real webhooks and leave paid orders
// pending. After a real Zendit webhook has been seen in the logs coming from
// a listed address, set ZENDIT_WEBHOOK_ENFORCE_IPS=true to start blocking.
// Override the list without a redeploy via ZENDIT_WEBHOOK_ALLOWED_IPS
// (comma-separated, or "*" to turn the check off entirely).
export const ZENDIT_WEBHOOK_IPS = [
  "18.209.125.75",
  "3.217.45.95",
  "54.243.153.139",
  "216.53.69.2",
  "216.53.104.2",
];
export const ZENDIT_API_BASE = "https://api.zendit.io";
const API_TIMEOUT_MS = 5000;

export interface ZenditWebhookConfig {
  secret?: string;
  previousSecret?: string; // optional, lets a rotation overlap with no gap
  apiKey?: string;
  allowedIps?: string; // raw ZENDIT_WEBHOOK_ALLOWED_IPS; unset = default list, "*" = off
  enforceIps?: string; // raw ZENDIT_WEBHOOK_ENFORCE_IPS; only "true" blocks, otherwise observe-only
}

export interface ZenditTransaction {
  transactionId?: string;
  status?: string;
  updatedAt?: string;
  error?: unknown;
  cost?: number;
  costCurrency?: string;
  costCurrencyDivisor?: number;
  recipientPhoneNumber?: string;
  confirmation?: unknown;
}

export type SettleFn = (
  transactionReference: string,
  outcome: "completed" | "failed",
  providerPayload: Record<string, unknown>,
) => Promise<{
  data: { code?: string; order_id?: string; error?: string } | null;
  error: { message: string } | null;
}>;

export interface ZenditWebhookDeps {
  getConfig: () => ZenditWebhookConfig;
  fetchFn: typeof fetch;
  settle: SettleFn;
}

export type NormalizedStatus = "completed" | "failed" | "pending" | "unknown";

export function normalizeZenditStatus(status: unknown): NormalizedStatus {
  if (typeof status !== "string") return "unknown";
  switch (status.trim().toUpperCase().replace(/\s+/g, "_")) {
    case "DONE":
      return "completed";
    case "FAILED":
    case "FAIL":
      return "failed";
    case "PENDING":
    case "ACCEPTED":
    case "AUTHORIZED":
    case "IN_PROGRESS":
      return "pending";
    default:
      return "unknown";
  }
}

// Constant-time string comparison: hash both sides to a fixed length, then
// compare every byte without an early exit.
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function tokenMatches(
  presented: string | null,
  accepted: Array<string | undefined>,
): Promise<boolean> {
  if (!presented) return false;
  let ok = false;
  for (const candidate of accepted) {
    if (!candidate) continue;
    // Evaluate every candidate so timing doesn't reveal which one matched.
    if (await constantTimeEqual(presented, candidate)) ok = true;
  }
  return ok;
}

// null = check disabled; otherwise the list to enforce.
export function resolveAllowedIps(raw: string | undefined): string[] | null {
  const trimmed = raw?.trim();
  if (!trimmed) return ZENDIT_WEBHOOK_IPS;
  if (trimmed === "*") return null;
  const list = trimmed.split(",").map((x) => x.trim()).filter(Boolean);
  return list.length ? list : ZENDIT_WEBHOOK_IPS;
}

// Cloudflare fronts Supabase and sets cf-connecting-ip itself, so clients
// cannot forge it. x-forwarded-for is deliberately NOT used: its first entry
// is client-controlled.
export function clientIp(req: Request): string | null {
  const raw = req.headers.get("cf-connecting-ip")?.trim();
  if (!raw) return null;
  return raw.replace(/^::ffff:/i, "");
}

export type FetchResult =
  | { kind: "ok"; tx: ZenditTransaction }
  | { kind: "not_found" }
  | { kind: "error"; reason: string };

// GET /v1/topups/purchases/{transactionId} with our own API key.
export async function fetchZenditTransaction(
  transactionId: string,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<FetchResult> {
  let response: Response;
  try {
    response = await fetchFn(
      `${ZENDIT_API_BASE}/v1/topups/purchases/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      },
    );
  } catch (e) {
    return { kind: "error", reason: `request failed: ${(e as Error).message}` };
  }

  if (response.status === 404) return { kind: "not_found" };
  if (response.status === 401 || response.status === 403) {
    // 403 is "IP Not Allowed" if an API IP allow-list is enabled in the
    // Zendit console - edge functions have no fixed outbound IP.
    return {
      kind: "error",
      reason: `Zendit API refused our key (HTTP ${response.status}); check the key and the console's IP allow-list`,
    };
  }
  if (!response.ok) {
    return { kind: "error", reason: `Zendit API HTTP ${response.status}` };
  }

  try {
    const tx = await response.json() as ZenditTransaction;
    return { kind: "ok", tx };
  } catch {
    return { kind: "error", reason: "Zendit API returned non-JSON" };
  }
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createZenditWebhookHandler(deps: ZenditWebhookDeps) {
  return async (req: Request): Promise<Response> => {
    // Zendit's console verifies a webhook address with HEAD when saving
    // it (their sample also answers GET). Reveals nothing, needs no auth.
    if (req.method === "HEAD") return new Response(null, { status: 200 });
    if (req.method === "GET") return new Response("OK", { status: 200 });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const config = deps.getConfig();
    if (!config.secret) {
      // Fail closed: never process a webhook we cannot authenticate.
      console.error("zendit-webhook: ZENDIT_WEBHOOK_SECRET is not set");
      return json({ error: "Webhook not configured" }, 500);
    }

    const allowedIps = resolveAllowedIps(config.allowedIps);
    if (allowedIps) {
      const ip = clientIp(req);
      const enforcing = config.enforceIps?.trim().toLowerCase() === "true";
      if (!ip) {
        // Not expected behind Cloudflare. Do not lock out real webhooks over
        // a missing header: the secret header and the API confirmation
        // below still protect settlement.
        console.warn("zendit-webhook: no cf-connecting-ip header; IP allow-list not applied");
      } else if (allowedIps.includes(ip)) {
        console.log(`zendit-webhook: POST from allow-listed source ${ip}`);
      } else if (enforcing) {
        console.warn(`zendit-webhook: rejected (source ${ip} not in allow-list)`);
        return json({ error: "Forbidden" }, 403);
      } else {
        console.warn(
          `zendit-webhook: source ${ip} is NOT in the allow-list (observe-only; set ZENDIT_WEBHOOK_ENFORCE_IPS=true to block)`,
        );
      }
    }

    const authorised = await tokenMatches(
      req.headers.get(ZENDIT_AUTH_HEADER),
      [config.secret, config.previousSecret],
    );
    if (!authorised) {
      console.warn("zendit-webhook: rejected (missing or wrong auth header)");
      return json({ error: "Unauthorized" }, 401);
    }

    let payload: ZenditTransaction;
    try {
      payload = JSON.parse(await req.text());
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const transactionId = payload?.transactionId;
    if (!transactionId || typeof transactionId !== "string") {
      return json({ error: "Missing transactionId" }, 400);
    }

    // In-flight updates (PENDING / ACCEPTED / AUTHORIZED / IN_PROGRESS, also
    // sent on each queue-and-retry attempt): acknowledge, do nothing. We only
    // move wallets on a final result.
    const claimed = normalizeZenditStatus(payload.status);
    if (claimed !== "completed" && claimed !== "failed") {
      if (claimed === "unknown") {
        console.warn(
          `zendit-webhook: unrecognised status "${payload.status}" for ${transactionId}`,
        );
      }
      return json({ received: true, acted: false, status: payload.status }, 200);
    }

    // Final status claimed. Do not take the webhook's word for it.
    if (!config.apiKey) {
      console.error("zendit-webhook: ZENDIT_API_KEY is not set, cannot verify");
      return json({ error: "Cannot verify transaction" }, 500);
    }

    const verified = await fetchZenditTransaction(
      transactionId,
      config.apiKey,
      deps.fetchFn,
    );

    if (verified.kind === "error") {
      // 500 so Zendit retries; nothing is settled on an unverified claim.
      console.error(
        `zendit-webhook: verification failed for ${transactionId}: ${verified.reason}`,
      );
      return json({ error: "Verification failed" }, 500);
    }

    if (verified.kind === "not_found") {
      // Zendit creates the transaction before returning its id, so a 404
      // means it is not ours (e.g. another environment). A retry can't help.
      console.warn(`zendit-webhook: ${transactionId} unknown to our Zendit account`);
      return json({ received: true, acted: false, ignored: "unknown transaction" }, 200);
    }

    const apiStatus = normalizeZenditStatus(verified.tx.status);
    if (apiStatus !== "completed" && apiStatus !== "failed") {
      // Webhook says final, API says still in flight (propagation lag or a
      // bogus claim). Ask Zendit to retry later.
      console.warn(
        `zendit-webhook: ${transactionId} webhook claimed ${payload.status} but API says ${verified.tx.status}`,
      );
      return json({ error: "Transaction not final yet" }, 503);
    }
    if (apiStatus !== claimed) {
      console.warn(
        `zendit-webhook: ${transactionId} webhook claimed ${payload.status}, API says ${verified.tx.status}; trusting API`,
      );
    }

    const tx = verified.tx;
    const { data, error } = await deps.settle(transactionId, apiStatus, {
      transactionId,
      status: tx.status,
      updatedAt: tx.updatedAt,
      error: tx.error ?? null,
      cost: tx.cost,
      costCurrency: tx.costCurrency,
      costCurrencyDivisor: tx.costCurrencyDivisor,
      recipientPhoneNumber: tx.recipientPhoneNumber,
      confirmation: tx.confirmation ?? null,
    });

    if (error) {
      console.error(`zendit-webhook: rpc error for ${transactionId}:`, error.message);
      return json({ error: "Settlement error" }, 500);
    }

    const code = data?.code;
    switch (code) {
      case "SETTLED":
      case "ALREADY_SETTLED":
        return json({ received: true, code }, 200);

      case "ORDER_NOT_FOUND":
        // Race with order creation in global-purchase-* (the order row is
        // written just after Zendit accepts the purchase), or a purchase
        // not made through this system. Zendit's retry ladder starts at 1s,
        // which comfortably covers the race.
        console.warn(`zendit-webhook: no order yet for ${transactionId}`);
        return json({ error: "Order not found" }, 503);

      case "DEDUCTION_FAILED":
        // Delivered, but a wallet could not be debited. Nothing changed and
        // the order stays pending; retry in case a balance is topped up.
        console.error(
          `zendit-webhook: DEDUCTION_FAILED order=${data?.order_id} ref=${transactionId}: ${data?.error}`,
        );
        return json({ error: "Deduction failed" }, 500);

      case "INVALID_STATE":
      case "AMBIGUOUS_REFERENCE":
        // A retry cannot fix these; acknowledge and leave it for a human.
        console.error(
          `zendit-webhook: ${code} ref=${transactionId} detail=${JSON.stringify(data)}`,
        );
        return json({ received: true, code }, 200);

      default:
        console.error(
          `zendit-webhook: unexpected result for ${transactionId}: ${JSON.stringify(data)}`,
        );
        return json({ error: "Unexpected settlement result" }, 500);
    }
  };
}
