// supabase/functions/global-store-notifications-settings/index.ts
//
// Task 8, branch 8.c.iii. Notification preferences for the caller:
// "status" (is it enabled), "enable" (store push tokens + enabled = true),
// "disable". Runs with the service role; the target row is the caller's own,
// resolved from the JWT (see _shared/storeIdentity.ts). Push tokens are
// stored on global_reseller_applications (reseller) or global_customers
// (customer), added by 20261015_create_global_notifications.sql.
import {
  resolveStoreIdentity,
  adminClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/storeIdentity.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { resellerId, action, expoToken, fcmToken } = await req.json();
    const admin = adminClient();

    const { identity, error, status } = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );
    if (error) return jsonResponse({ error }, status ?? 400);
    if (!identity) return jsonResponse({ error: "User not found" }, 404);

    const table =
      identity.userType === "reseller"
        ? "global_reseller_applications"
        : "global_customers";
    const rowId =
      identity.userType === "reseller" ? identity.resellerId : identity.customerId!;

    if (action === "status") {
      const { data } = await admin
        .from(table)
        .select("notifications_enabled")
        .eq("id", rowId)
        .maybeSingle();
      return jsonResponse({ enabled: !!data?.notifications_enabled });
    }

    if (action === "enable") {
      const { error: updateError } = await admin
        .from(table)
        .update({
          push_token: expoToken ?? null,
          fcm_token: fcmToken ?? null,
          notifications_enabled: true,
        })
        .eq("id", rowId);
      if (updateError) return jsonResponse({ error: "Update failed" }, 400);
      return jsonResponse({ success: true });
    }

    if (action === "disable") {
      const { error: updateError } = await admin
        .from(table)
        .update({ notifications_enabled: false })
        .eq("id", rowId);
      if (updateError) return jsonResponse({ error: "Update failed" }, 400);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("global-store-notifications-settings error:", error);
    return jsonResponse({ error: "Notification settings request failed" }, 400);
  }
});
