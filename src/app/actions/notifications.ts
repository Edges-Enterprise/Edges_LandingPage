// app/actions/notifications.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Mark a notification as read
 */
export async function markNotificationAsReadAction(notificationId: string) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Update notification
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id); // Ensure user owns this notification

    if (updateError) {
      console.error("Mark as read error:", updateError);
      return { error: "Failed to mark notification as read" };
    }

    revalidatePath("/notification");
    revalidatePath("/home"); // Update notification badge

    return { success: true };
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return { error: "Something went wrong" };
  }
}

/**
 * Delete/Dismiss a notification
 */
export async function dismissNotificationAction(notificationId: string) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Delete notification
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id); // Ensure user owns this notification

    if (deleteError) {
      console.error("Delete notification error:", deleteError);
      return { error: "Failed to delete notification" };
    }

    revalidatePath("/notification");
    revalidatePath("/home"); // Update notification badge

    return { success: true };
  } catch (error) {
    console.error("Delete notification error:", error);
    return { error: "Something went wrong" };
  }
}

/**
 * Clear all notifications for current user
 */
export async function clearAllNotificationsAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Delete all user's notifications
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Clear all notifications error:", deleteError);
      return { error: "Failed to clear notifications" };
    }

    revalidatePath("/notification");
    revalidatePath("/home"); // Update notification badge

    return { success: true };
  } catch (error) {
    console.error("Clear all notifications error:", error);
    return { error: "Something went wrong" };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsReadAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Update all notifications to read
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (updateError) {
      console.error("Mark all as read error:", updateError);
      return { error: "Failed to mark all as read" };
    }

    revalidatePath("/notification");
    revalidatePath("/home"); // Update notification badge

    return { success: true };
  } catch (error) {
    console.error("Mark all as read error:", error);
    return { error: "Something went wrong" };
  }
}
