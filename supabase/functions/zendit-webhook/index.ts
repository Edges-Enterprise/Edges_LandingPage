// supabase/functions/zendit-webhook/index.ts
//
// Task 4, branch 1.d.iv.zo. Receives Zendit "Topup" transaction-result
// webhooks and finishes the matching PENDING global order created by
// global-purchase-data / global-purchase-airtime. All logic lives in
// _shared/zenditWebhook.ts; money movement is the provider-agnostic
// settle_global_pending_purchase SQL function (migration 20261005).
//
// DEPLOY WITH --no-verify-jwt: Zendit sends no Supabase JWT; the request
// is authenticated by the secret header configured in the Zendit console
// (see zenditWebhook.ts for the full scheme).
//   supabase functions deploy zendit-webhook --no-verify-jwt
//
// Secrets: ZENDIT_WEBHOOK_SECRET (required; the value of the
// X-Webhook-Token header set in the Zendit console), optionally
// ZENDIT_WEBHOOK_SECRET_PREVIOUS (accepted during a rotation), and the
// existing ZENDIT_API_KEY (used to confirm a transaction's real status).
// Optional: ZENDIT_WEBHOOK_ALLOWED_IPS overrides the built-in list of
// Zendit's sender IPs (comma-separated; "*" disables the IP check).
// ZENDIT_WEBHOOK_ENFORCE_IPS=true makes a sender outside that list get 403;
// by default it is only logged (observe-only).
import { createClient } from "npm:@supabase/supabase-js@2";
import { createZenditWebhookHandler } from "../_shared/zenditWebhook.ts";

Deno.serve(createZenditWebhookHandler({
  // Read per request so a changed secret is picked up without code changes.
  getConfig: () => ({
    secret: Deno.env.get("ZENDIT_WEBHOOK_SECRET"),
    previousSecret: Deno.env.get("ZENDIT_WEBHOOK_SECRET_PREVIOUS"),
    apiKey: Deno.env.get("ZENDIT_API_KEY"),
    allowedIps: Deno.env.get("ZENDIT_WEBHOOK_ALLOWED_IPS"),
    enforceIps: Deno.env.get("ZENDIT_WEBHOOK_ENFORCE_IPS"),
  }),
  fetchFn: fetch,
  settle: async (transactionReference, outcome, providerPayload) => {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabaseAdmin.rpc(
      "settle_global_pending_purchase",
      {
        p_transaction_reference: transactionReference,
        p_payment_method: "zendit",
        p_outcome: outcome,
        p_provider_payload: providerPayload,
      },
    );
    return { data, error };
  },
}));
