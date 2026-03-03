// app/actions/notifications.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { GoogleAuth } from "google-auth-library";
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

export async function saveFCMTokenAction(userId: string, token: string) {
  const supabase = await createServerClient();

  await supabase.from("web_push_tokens").upsert(
    {
      user_id: userId,
      fcm_token: token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function getFCMAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!),
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token!;
}

export async function sendWebPushAction(
  userId: string,
  title: string,
  message: string,
) {
  const supabase = await createServerClient();

  const { data: tokenRow } = await supabase
    .from("web_push_tokens")
    .select("fcm_token")
    .eq("user_id", userId)
    .single();

  if (!tokenRow?.fcm_token) return { error: "No web push token" };

  const accessToken = await getFCMAccessToken();

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: tokenRow.fcm_token,
          notification: { title, body: message },
          webpush: {
            notification: {
              title,
              body: message,
              icon: "/edgesnetworkicon.png",
            },
          },
        },
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) return { error: result };
  return { success: true };
}