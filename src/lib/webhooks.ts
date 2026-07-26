// lib/webhooks.ts
import { createAdminClient } from "@/lib/supabase/admin";

export async function triggerWebhooks(userId: string, event: string, data: any) {
  const supabase = createAdminClient();

  const { data: webhooks } = await supabase
    .from("api_users.webhooks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .contains("events", [event]);

  if (!webhooks?.length) return;

  for (const webhook of webhooks) {
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhook.secret && { "X-Webhook-Signature": webhook.secret }),
        },
        body: JSON.stringify(payload),
      });

      await supabase.from("api_users.webhook_logs").insert({
        webhook_id: webhook.id,
        event_type: event,
        payload: payload,
        response_status: response.status,
        response_body: await response.text(),
        delivered_at: new Date().toISOString(),
      });
    } catch (error: any) {
      await supabase.from("api_users.webhook_logs").insert({
        webhook_id: webhook.id,
        event_type: event,
        payload: data,
        error: error.message,
        delivered_at: new Date().toISOString(),
      });
    }
  }
}