// supabase/functions/global-store-notifications/index.ts
//
// Task 8, pointer 8.c.iii. The caller's notifications for a given store,
// read/written with the service role. Replaces the legacy direct reads and
// writes in hooks/useNotifications.ts (reseller_notifications /
// reseller_customer_notifications).
//
// Actions: "list" (default), "mark_read" (one id), "mark_all_read",
// "delete" (one id), "create" (support message to the store owner).
// Identity comes from the JWT (see
// _shared/storeIdentity.ts); every statement is additionally scoped by
// reseller_id (and customer_id for a customer), so a caller can never touch
// another customer's notifications.
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
    const { resellerId, action = "list", id, notificationType, message, metadata } =
      await req.json();
    const admin = adminClient();

    const { identity, error, status } = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );
    if (error) return jsonResponse({ error }, status ?? 400);
    if (!identity) return jsonResponse({ notifications: [] });

    const isReseller = identity.userType === "reseller";
    const table = isReseller
      ? "global_notifications"
      : "global_customer_notifications";

    // Base filter: the caller's own scope. Always applied, whatever the action.
    const scope = (q: any) => {
      const withReseller = q.eq("reseller_id", identity.resellerId);
      return isReseller
        ? withReseller
        : withReseller.eq("customer_id", identity.customerId!);
    };

    if (action === "list") {
      const { data } = await scope(
        admin
          .from(table)
          .select(
            "id, notification_type, message, is_read, metadata, created_at",
          ),
      )
        .order("created_at", { ascending: false })
        .limit(100);
      return jsonResponse({ notifications: data ?? [] });
    }

    if (action === "mark_read") {
      if (!id) return jsonResponse({ error: "Missing required field: id" }, 400);
      const { error: updateError } = await scope(
        admin.from(table).update({ is_read: true }),
      ).eq("id", id);
      if (updateError) return jsonResponse({ error: "Update failed" }, 400);
      return jsonResponse({ success: true });
    }

    if (action === "mark_all_read") {
      const { error: updateError } = await scope(
        admin.from(table).update({ is_read: true }),
      ).eq("is_read", false);
      if (updateError) return jsonResponse({ error: "Update failed" }, 400);
      return jsonResponse({ success: true });
    }

    if (action === "delete") {
      if (!id) return jsonResponse({ error: "Missing required field: id" }, 400);
      const { error: deleteError } = await scope(
        admin.from(table).delete(),
      ).eq("id", id);
      if (deleteError) return jsonResponse({ error: "Delete failed" }, 400);
      return jsonResponse({ success: true });
    }

    if (action === "create") {
      if (!message) return jsonResponse({ error: "Missing required field: message" }, 400);

      // A customer's support message is addressed to the store owner, so it
      // is written to global_notifications (the owner's inbox); the sender is
      // recorded in metadata (global_notifications has no customer_id column).
      const row: Record<string, unknown> = {
        reseller_id: identity.resellerId,
        notification_type: notificationType || "support",
        message,
        metadata: {
          ...(metadata ?? {}),
          ...(isReseller ? {} : { customer_id: identity.customerId }),
        },
      };

      const { data, error: insertError } = await admin
        .from("global_notifications")
        .insert(row)
        .select("id")
        .single();
      if (insertError) return jsonResponse({ error: "Create failed" }, 400);
      return jsonResponse({ success: true, id: data.id });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("global-store-notifications error:", error);
    return jsonResponse({ error: "Notifications request failed" }, 400);
  }
});
