// supabase/functions/accragh-webhook/index.ts
//
// Task 4, branch 1.d.iv.zi. Receives NetFillGh (AccraGH) order-status
// webhooks and finishes the matching PENDING global order created by
// global-purchase-data (see purchaseOrchestrator.ts step 11).
//
// All money movement happens inside the settle_global_pending_purchase SQL
// function (migration 20261005), which is atomic and idempotent. This file
// only: verifies the signature, maps the provider status, calls that
// function, and chooses the HTTP status so NetFillGh retries only when a
// retry could actually help.
//
// DEPLOY WITH --no-verify-jwt: NetFillGh does not send a Supabase JWT, and
// authenticity is established by the HMAC signature instead.
//   supabase functions deploy accragh-webhook --no-verify-jwt
// Requires secret ACCRAGH_WEBHOOK_SECRET (the signing secret from
// netfillgh.com/api_settings - distinct from ACCRAGH_API_KEY).
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyNetfillghSignature } from "../_shared/accraghWebhook.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("ACCRAGH_WEBHOOK_SECRET");
  if (!secret) {
    // Fail closed: never process an unverifiable webhook.
    console.error("accragh-webhook: ACCRAGH_WEBHOOK_SECRET is not set");
    return json({ error: "Webhook not configured" }, 500);
  }

  // Signature is computed over the raw body - read it as text, parse after.
  const rawBody = await req.text();

  const verification = await verifyNetfillghSignature({
    secret,
    timestamp: req.headers.get("x-netfillgh-timestamp"),
    signature: req.headers.get("x-netfillgh-signature"),
    rawBody,
  });

  if (!verification.ok) {
    console.warn(`accragh-webhook: rejected (${verification.reason})`);
    return json({ error: "Invalid signature" }, 401);
  }

  let payload: {
    event?: string;
    data?: { order_ref?: string; status?: string };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (payload.event !== "order.status_changed") {
    // Not an event we act on; acknowledge so it is not retried.
    return json({ received: true, ignored: payload.event ?? "unknown" }, 200);
  }

  const orderRef = payload.data?.order_ref;
  const status = payload.data?.status;
  if (!orderRef || !status) {
    return json({ error: "Missing order_ref or status" }, 400);
  }

  // pending / processing are intermediate: NetFillGh charges its own
  // wallet at "processing", but we only move OUR wallets on a final
  // result. Acknowledge and wait for completed / failed.
  if (status !== "completed" && status !== "failed") {
    if (status !== "pending" && status !== "processing") {
      console.warn(
        `accragh-webhook: unrecognised status "${status}" for ${orderRef}`,
      );
    }
    return json({ received: true, acted: false, status }, 200);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabaseAdmin.rpc(
    "settle_global_pending_purchase",
    {
      p_transaction_reference: orderRef,
      p_payment_method: "accragh",
      p_outcome: status,
      p_provider_payload: payload.data,
    },
  );

  if (error) {
    // Unexpected DB/RPC error: 500 so NetFillGh retries.
    console.error(`accragh-webhook: rpc error for ${orderRef}:`, error.message);
    return json({ error: "Settlement error" }, 500);
  }

  const code = data?.code as string | undefined;

  switch (code) {
    case "SETTLED":
    case "ALREADY_SETTLED":
      return json({ received: true, code }, 200);

    case "ORDER_NOT_FOUND":
      // Either a race (webhook beat the order insert in
      // global-purchase-*) or an order placed on this NetFillGh account
      // by something else. Non-2xx makes NetFillGh retry, which covers
      // the race; for foreign orders the retries simply run out.
      console.warn(`accragh-webhook: no order yet for ${orderRef}`);
      return json({ error: "Order not found" }, 503);

    case "DEDUCTION_FAILED":
      // Provider says delivered, but we could not debit (e.g. a wallet
      // dropped below the amount since the order was placed). Nothing was
      // changed and the order is still pending. 500 so it is retried in
      // case a balance gets topped up; if retries run out the order stays
      // pending and needs manual reconciliation (see HANDOVER.md).
      console.error(
        `accragh-webhook: DEDUCTION_FAILED order=${data?.order_id} ref=${orderRef}: ${data?.error}`,
      );
      return json({ error: "Deduction failed" }, 500);

    case "INVALID_STATE":
    case "AMBIGUOUS_REFERENCE":
      // A retry cannot fix these; acknowledge and leave it for a human.
      console.error(
        `accragh-webhook: ${code} ref=${orderRef} detail=${JSON.stringify(data)}`,
      );
      return json({ received: true, code }, 200);

    default:
      console.error(
        `accragh-webhook: unexpected result for ${orderRef}: ${JSON.stringify(data)}`,
      );
      return json({ error: "Unexpected settlement result" }, 500);
  }
});
