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
// RLS-locked tables are reachable.
//
// Recipients are grouped by country so a local-time rule ("evening") lands in
// each market's own evening: the supported zones span UTC+0 to UTC+3, so one
// UTC send time cannot be 19:00-21:00 everywhere. The per-country dedupe ledger
// stops the 5-minute cron from sending the same promotion twice in a day.
//
// Scheduled by pg_cron (see the migration) via public.run_scheduled_edge, which
// presents the vault secret `scheduled_promotions_secret` as x-sync-secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SCHEDULED_NOTIFICATIONS,
  countryUtcOffset,
  localDateString,
  shouldSendNow,
} from "./config.ts";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

interface Recipient {
  id: string;
  resellerId: string;
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("SCHEDULED_PROMOTIONS_SECRET");
    if (secret && req.headers.get("x-sync-secret") !== secret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
    // `at` lets a dry run prove the schedule for any instant. It is ignored for
    // real runs so the live job always uses the server clock.
    const atParam = dryRun ? new URL(req.url).searchParams.get("at") : null;
    const now = atParam ? new Date(atParam) : new Date();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // All applications, so a customer can be attributed to its store's country;
    // only the active + enabled ones are recipients.
    const [{ data: apps }, { data: customers }] = await Promise.all([
      supabase
        .from("global_reseller_applications")
        .select("id, country_code, application_status, notifications_enabled"),
      supabase
        .from("global_customers")
        .select("id, reseller_id, notifications_enabled")
        .eq("notifications_enabled", true),
    ]);

    const countryByApp = new Map<string, string>();
    const resellersByCountry = new Map<string, string[]>();
    for (const app of apps ?? []) {
      const country = (app.country_code ?? "").toLowerCase();
      countryByApp.set(app.id, country);
      if (app.application_status === "active" && app.notifications_enabled) {
        const list = resellersByCountry.get(country) ?? [];
        list.push(app.id);
        resellersByCountry.set(country, list);
      }
    }

    const customersByCountry = new Map<string, Recipient[]>();
    for (const customer of customers ?? []) {
      const country = countryByApp.get(customer.reseller_id) ?? "";
      const list = customersByCountry.get(country) ?? [];
      list.push({ id: customer.id, resellerId: customer.reseller_id });
      customersByCountry.set(country, list);
    }

    // Countries that have at least one recipient.
    const countries = new Set<string>([
      ...resellersByCountry.keys(),
      ...customersByCountry.keys(),
    ]);

    let sentResellers = 0;
    let sentCustomers = 0;
    let skipped = 0;
    const fired: string[] = [];

    for (const notification of SCHEDULED_NOTIFICATIONS) {
      if (!notification.enabled) continue;
      const metadata = { ...notification.metadata, title: notification.title };

      // A local-window rule is evaluated per country; any other rule is
      // offset-independent and sent once, in the shared "ALL" bucket.
      const targets =
        notification.schedule.type === "dailyLocalWindow"
          ? [...countries].map((country) => ({ country, offset: countryUtcOffset(country) }))
          : [{ country: "ALL", offset: 0 }];

      for (const { country, offset } of targets) {
        if (!shouldSendNow(notification, now, offset)) continue;

        const resellerIds = resellersByCountry.get(country) ?? [];
        const customerRows = customersByCountry.get(country) ?? [];

        // dry_run reports what a real run would do without writing anything:
        // no ledger claim, no notification, therefore no push.
        if (dryRun) {
          fired.push(`${notification.id}:${country}`);
          sentResellers += resellerIds.length;
          sentCustomers += customerRows.length;
          continue;
        }

        // Claim the (schedule, local date, country) slot. The unique constraint
        // on global_promotion_sends is the dedupe gate: a second run in the
        // same window gets a conflict and skips.
        const { error: claimError } = await supabase
          .from("global_promotion_sends")
          .insert({
            scheduled_id: notification.id,
            sent_for: localDateString(now, offset),
            country_code: country,
          });
        if (claimError) {
          skipped++;
          continue;
        }

        if (resellerIds.length > 0) {
          const { error } = await supabase.from("global_notifications").insert(
            resellerIds.map((id) => ({
              reseller_id: id,
              notification_type: notification.notification_type,
              message: notification.message,
              metadata,
            })),
          );
          if (!error) sentResellers += resellerIds.length;
          else console.error("Reseller promotion insert failed:", error);
        }

        if (customerRows.length > 0) {
          const { error } = await supabase.from("global_customer_notifications").insert(
            customerRows.map((c) => ({
              reseller_id: c.resellerId,
              customer_id: c.id,
              notification_type: notification.notification_type,
              message: notification.message,
              metadata,
            })),
          );
          if (!error) sentCustomers += customerRows.length;
          else console.error("Customer promotion insert failed:", error);
        }

        fired.push(`${notification.id}:${country}`);
      }
    }

    if (fired.length === 0) {
      return jsonResponse({ message: "No notifications to send at this time" });
    }

    return jsonResponse({
      success: true,
      fired,
      skipped,
      resellers: sentResellers,
      customers: sentCustomers,
    });
  } catch (error) {
    console.error("global-scheduled-promotions error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
