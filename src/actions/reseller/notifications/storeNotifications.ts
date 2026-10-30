// src/actions/reseller/notifications/storeNotifications.ts
//
// The notification inbox behind the header bell, for a store owner and for a
// store customer. Both tables (global_notifications,
// global_customer_notifications) are RLS-locked with no policies - service
// role only - so every statement runs through the admin client after the
// caller is resolved from their session.
//
// The audience and the ids are NEVER taken from the client: `resellerId` is a
// routing hint naming which store to look in, and the caller must hold a row
// in that store (owner) or a customer row in it (customer). That mirrors
// _shared/storeIdentity.ts on the mobile side.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreNotification } from "@/lib/notifications/types";

interface CallerScope {
  table: "global_notifications" | "global_customer_notifications";
  resellerId: string;
  customerId: string | null;
}

/**
 * Resolve the signed-in caller against the given store, or null when they are
 * neither the owner nor a customer of it.
 *
 * `resellerId` may be omitted on the dashboard, where the caller is the owner
 * and the store is found from their own session; the storefront always passes
 * it, because a customer belongs to exactly one store per session.
 */
async function resolveCallerScope(
  resellerId?: string,
): Promise<{ scope: CallerScope | null; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { scope: null, error: "Not signed in" };

  const admin = createAdminClient();

  const ownerQuery = admin
    .from("global_reseller_applications")
    .select("id")
    .eq("auth_user_id", user.id);

  const { data: owner } = resellerId
    ? await ownerQuery.eq("id", resellerId).maybeSingle()
    : await ownerQuery.maybeSingle();

  if (owner) {
    return {
      scope: {
        table: "global_notifications",
        resellerId: owner.id,
        customerId: null,
      },
    };
  }

  const { data: customer } = await admin
    .from("global_customers")
    .select("id")
    .eq("reseller_id", resellerId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (resellerId && customer) {
    return {
      scope: {
        table: "global_customer_notifications",
        resellerId,
        customerId: customer.id,
      },
    };
  }

  return { scope: null };
}

// Every statement is scoped by the caller's own ids. RLS cannot do this for
// us (no policies), so the filter is the authorization.
function applyScope(query: any, scope: CallerScope) {
  const scoped = query.eq("reseller_id", scope.resellerId);
  return scope.customerId
    ? scoped.eq("customer_id", scope.customerId)
    : scoped;
}

export async function getStoreNotifications(
  resellerId: string | undefined,
  limit = 50,
): Promise<{ notifications: StoreNotification[]; error?: string }> {
  const { scope, error } = await resolveCallerScope(resellerId);
  if (!scope) return { notifications: [], error };

  const admin = createAdminClient();
  const { data, error: queryError } = await applyScope(
    admin
      .from(scope.table)
      .select("id, notification_type, message, is_read, metadata, created_at"),
    scope,
  )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (queryError) {
    console.error("Store notifications read error:", queryError);
    return { notifications: [], error: queryError.message };
  }

  return { notifications: (data as StoreNotification[]) || [] };
}

export async function getStoreUnreadCount(
  resellerId?: string,
): Promise<{ count: number; error?: string }> {
  const { scope, error } = await resolveCallerScope(resellerId);
  if (!scope) return { count: 0, error };

  const admin = createAdminClient();
  const { count, error: queryError } = await applyScope(
    admin
      .from(scope.table)
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
    scope,
  );

  if (queryError) {
    console.error("Store notifications count error:", queryError);
    return { count: 0, error: queryError.message };
  }

  return { count: count || 0 };
}

export async function markStoreNotificationRead(
  resellerId: string | undefined,
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { scope, error } = await resolveCallerScope(resellerId);
  if (!scope) return { success: false, error: error || "Unauthorized" };

  const admin = createAdminClient();
  const { error: updateError } = await applyScope(
    admin.from(scope.table).update({ is_read: true }),
    scope,
  ).eq("id", notificationId);

  if (updateError) {
    console.error("Mark notification read error:", updateError);
    return { success: false, error: updateError.message };
  }
  return { success: true };
}

export async function markAllStoreNotificationsRead(
  resellerId?: string,
): Promise<{ success: boolean; error?: string }> {
  const { scope, error } = await resolveCallerScope(resellerId);
  if (!scope) return { success: false, error: error || "Unauthorized" };

  const admin = createAdminClient();
  const { error: updateError } = await applyScope(
    admin.from(scope.table).update({ is_read: true }),
    scope,
  ).eq("is_read", false);

  if (updateError) {
    console.error("Mark all notifications read error:", updateError);
    return { success: false, error: updateError.message };
  }
  return { success: true };
}

/**
 * Write a notification into an inbox from a trusted server-side caller (a
 * webhook or another action). No session is involved: the audience and ids are
 * supplied by the caller because the caller IS the system.
 */
export async function createStoreNotification(input: {
  audience: "reseller" | "customer";
  resellerId: string;
  customerId?: string | null;
  notificationType: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  if (input.audience === "customer") {
    if (!input.customerId) {
      return { success: false, error: "customerId is required for a customer" };
    }
    const { error } = await admin
      .from("global_customer_notifications")
      .insert({
        reseller_id: input.resellerId,
        customer_id: input.customerId,
        notification_type: input.notificationType,
        message: input.message,
        metadata: input.metadata ?? {},
      });
    if (error) {
      console.error("Customer notification insert error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  const { error } = await admin.from("global_notifications").insert({
    reseller_id: input.resellerId,
    notification_type: input.notificationType,
    message: input.message,
    metadata: input.metadata ?? {},
  });
  if (error) {
    console.error("Reseller notification insert error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
