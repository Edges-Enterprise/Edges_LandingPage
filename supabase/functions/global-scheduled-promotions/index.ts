// supabase/functions/global-scheduled-promotions/index.ts
//
// Scheduled promotional notifications for the global_* (multi-country,
// multi-tenant) model. The successor to the legacy
// reseller-scheduled-promotions, which wrote reseller_notifications /
// reseller_customer_notifications against the retired resellers /
// reseller_customers tables and (because its cron ran weekly) could only ever
// fire weekly rules.
//
// It inserts into global_notifications / global_customer_notifications for
// every active store whose owner/customer has notifications enabled; the
// AFTER INSERT triggers added in 20261110_create_global_push_notifications.sql
// then deliver the push. Inserts are made with the service role, so the
// RLS-locked tables are reachable; the per-day dedupe table stops the
// 5-minute cron from sending the same promotion more than once a day.
//
// Scheduled by pg_cron (see the migration) via public.run_scheduled_edge, which
// presents the vault secret `scheduled_promotions_secret` as x-sync-secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SCHEDULED_NOTIFICATIONS, shouldSendNow } from "./config.ts";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("SCHEDULED_PROMOTIONS_SECRET");
    if (secret && req.headers.get("x-sync-secret") !== secret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const day = now.toISOString().slice(0, 10);

    const due = SCHEDULED_NOTIFICATIONS.filter((n) => shouldSendNow(n, now));
    if (due.length === 0) {
      return jsonResponse({ message: "No notifications to send at this time" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: resellers }, { data: customers }] = await Promise.all([
      supabase
        .from("global_reseller_applications")
        .select("id")
        .eq("application_status", "active")
        .eq("notifications_enabled", true),
      supabase
        .from("global_customers")
        .select("id, reseller_id")
        .eq("notifications_enabled", true),
    ]);

    let sentResellers = 0;
    let sentCustomers = 0;
    let skipped = 0;

    for (const notification of due) {
      // Claim the (schedule, day) slot. The unique constraint on
      // global_promotion_sends makes this the dedupe gate: a second run in the
      // same window gets a conflict and skips, so nothing is sent twice.
      const { error: claimError } = await supabase
        .from("global_promotion_sends")
        .insert({ scheduled_id: notification.id, sent_for: day });
      if (claimError) {
        skipped++;
        continue;
      }

      const metadata = { ...notification.metadata, title: notification.title };

      if (resellers && resellers.length > 0) {
        const { error } = await supabase.from("global_notifications").insert(
          resellers.map((r) => ({
            reseller_id: r.id,
            notification_type: notification.notification_type,
            message: notification.message,
            metadata,
          })),
        );
        if (!error) sentResellers += resellers.length;
        else console.error("Reseller promotion insert failed:", error);
      }

      if (customers && customers.length > 0) {
        const { error } = await supabase.from("global_customer_notifications").insert(
          customers.map((c) => ({
            reseller_id: c.reseller_id,
            customer_id: c.id,
            notification_type: notification.notification_type,
            message: notification.message,
            metadata,
          })),
        );
        if (!error) sentCustomers += customers.length;
        else console.error("Customer promotion insert failed:", error);
      }
    }

    return jsonResponse({
      success: true,
      sent: due.length - skipped,
      skipped,
      resellers: sentResellers,
      customers: sentCustomers,
    });
  } catch (error) {
    console.error("global-scheduled-promotions error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
