// // app/actions/admin-notifications.ts


"use server";
import { SendNotificationParams } from "@/constants/helper";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";


/**
 * Check if user is admin
 */
async function checkAdminAccess() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", isAdmin: false };
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return {
      error: "Access denied. Admin privileges required.",
      isAdmin: false,
    };
  }

  return { isAdmin: true, userId: user.id };
}

/**
 * Send push notification to specific users
 */
async function sendPushNotifications(
  pushTokens: string[],
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<{ sent: number; error: string | null }> {
  // For Expo Push Notifications
  const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";

  const messages = pushTokens
    .filter((token) => token.startsWith("ExponentPushToken[")) // Validate Expo tokens
    .map((token) => ({
      to: token,
      sound: "default",
      title,
      body: message,
      data: data || {},
      priority: "high" as const,
    }));

  if (messages.length === 0) {
    return { sent: 0, error: "No valid push tokens" };
  }

  try {
    const response = await fetch(expoPushEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Count successful sends
    const sent = (result.data as any[])?.filter((r: any) => r.status === "ok").length || 0;

    return { sent, error: null };
  } catch (error) {
    console.error("Push notification error:", error);
    return { sent: 0, error: "Failed to send push notifications" };
  }
}

/**
 * Main action: Send notification to users
 */
export async function sendAdminNotificationAction(
  params: SendNotificationParams
) {
  try {
    // 1. Check admin access
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { error: adminCheck.error };
    }

    const supabase = await createServerClient();

    // 2. Determine target users
    let targetUserIds: string[] = [];

    if (params.targetAudience === "all") {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id");

      if (usersError) {
        return { error: "Failed to fetch users" };
      }

      targetUserIds = users.map((u) => u.id);
    } else if (params.targetAudience === "active") {
      // Get users who logged in within last 30 days
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id")
        .gte("updated_at", thirtyDaysAgo);

      if (usersError) {
        return { error: "Failed to fetch active users" };
      }

      targetUserIds = users.map((u) => u.id);
    } else if (params.targetAudience === "specific" && params.specificUserIds) {
      targetUserIds = params.specificUserIds;
    }

    if (targetUserIds.length === 0) {
      return { error: "No target users found" };
    }

    // 3. Create notifications in database
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      notification_type: params.notificationType,
      message: params.message,
      is_read: false,
      metadata: {
        title: params.title,
        sent_by_admin: true,
        ...params.metadata,
      },
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Insert notifications error:", insertError);
      return { error: "Failed to create notifications" };
    }

    // 4. Get push tokens for target users
    const { data: pushTokensData, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("push_token")
      .in("user_id", targetUserIds);

    if (tokensError) {
      console.error("Fetch push tokens error:", tokensError);
    }

    // 5. Send push notifications
    let pushResult: { sent: number; error: string | null } = { sent: 0, error: null };
    if (pushTokensData && pushTokensData.length > 0) {
      const tokens = pushTokensData.map((t) => t.push_token);
      pushResult = await sendPushNotifications(
        tokens,
        params.title,
        params.message,
        {
          type: params.notificationType,
          ...params.metadata,
        }
      );
    }

    // 6. Revalidate notification pages
    revalidatePath("/notification");
    revalidatePath("/home");

    return {
      success: true,
      notificationsCreated: targetUserIds.length,
      pushNotificationsSent: pushResult.sent,
      message: `Sent to ${targetUserIds.length} users (${pushResult.sent} push notifications delivered)`,
    };
  } catch (error) {
    console.error("Send admin notification error:", error);
    return { error: "Something went wrong" };
  }
}

/**
 * Get notification statistics for admin dashboard
 */
export async function getNotificationStatsAction() {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { error: adminCheck.error };
    }

    const supabase = await createServerClient();

    // Total notifications sent
    const { count: totalSent } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true });

    // Total read notifications
    const { count: totalRead } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", true);

    // Total users with push tokens
    const { count: usersWithTokens } = await supabase
      .from("user_push_tokens")
      .select("*", { count: "exact", head: true });

    // Recent notifications (last 7 days)
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { count: recentSent } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    return {
      success: true,
      stats: {
        totalSent: totalSent || 0,
        totalRead: totalRead || 0,
        readRate: totalSent ? ((totalRead || 0) / totalSent) * 100 : 0,
        usersWithPushTokens: usersWithTokens || 0,
        recentNotifications: recentSent || 0,
      },
    };
  } catch (error) {
    console.error("Get notification stats error:", error);
    return { error: "Failed to fetch statistics" };
  }
}


// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// // Notification type options (from your schema constraint)
// export const NOTIFICATION_TYPES = [
//   "airtime",
//   "data",
//   "deposit",
//   "data_purchase",
//   "airtime_purchase",
//   "cable_purchase",
//   "hot_data",
//   "special_data",
//   "weekend_plan",
//   "weekly_plan",
//   "hot_plan",
//   "special_plan",
//   "promotional",
//   "gifting_plan",
//   "corporate_gifting_plan",
//   "sme_plan",
//   "sme_2_plan",
//   "app_update",
//   "test",
// ] as const;

// export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// interface SendNotificationParams {
//   notificationType: NotificationType;
//   title: string;
//   message: string;
//   targetAudience: "all" | "active" | "specific";
//   specificUserIds?: string[];
//   metadata?: Record<string, any>;
// }

// /**
//  * Check if user is admin
//  */
// async function checkAdminAccess() {
//   const supabase = await createServerClient();
//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser();

//   if (authError || !user) {
//     return { error: "Unauthorized", isAdmin: false };
//   }

//   // Check if user is admin
//   const { data: profile, error: profileError } = await supabase
//     .from("profiles")
//     .select("is_admin")
//     .eq("id", user.id)
//     .single();

//   if (profileError || !profile?.is_admin) {
//     return {
//       error: "Access denied. Admin privileges required.",
//       isAdmin: false,
//     };
//   }

//   return { isAdmin: true, userId: user.id };
// }

// /**
//  * Send push notification to specific users
//  */
// async function sendPushNotifications(
//   pushTokens: string[],
//   title: string,
//   message: string,
//   data?: Record<string, any>
// ) {
//   // For Expo Push Notifications
//   const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";

//   const messages = pushTokens
//     .filter((token) => token.startsWith("ExponentPushToken[")) // Validate Expo tokens
//     .map((token) => ({
//       to: token,
//       sound: "default",
//       title,
//       body: message,
//       data: data || {},
//       priority: "high" as const,
//     }));

//   if (messages.length === 0) {
//     return { sent: 0, error: "No valid push tokens" };
//   }

//   try {
//     const response = await fetch(expoPushEndpoint, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(messages),
//     });

//     const result = await response.json();

//     // Count successful sends
//     const sent = result.data?.filter((r: any) => r.status === "ok").length || 0;

//     return { sent, error: null };
//   } catch (error) {
//     console.error("Push notification error:", error);
//     return { sent: 0, error: "Failed to send push notifications" };
//   }
// }

// /**
//  * Main action: Send notification to users
//  */
// export async function sendAdminNotificationAction(
//   params: SendNotificationParams
// ) {
//   try {
//     // 1. Check admin access
//     const adminCheck = await checkAdminAccess();
//     if (!adminCheck.isAdmin) {
//       return { error: adminCheck.error };
//     }

//     const supabase = await createServerClient();

//     // 2. Determine target users
//     let targetUserIds: string[] = [];

//     if (params.targetAudience === "all") {
//       // Get all users
//       const { data: users, error: usersError } = await supabase
//         .from("profiles")
//         .select("id");

//       if (usersError) {
//         return { error: "Failed to fetch users" };
//       }

//       targetUserIds = users.map((u) => u.id);
//     } else if (params.targetAudience === "active") {
//       // Get users who logged in within last 30 days
//       const thirtyDaysAgo = new Date(
//         Date.now() - 30 * 24 * 60 * 60 * 1000
//       ).toISOString();

//       const { data: users, error: usersError } = await supabase
//         .from("profiles")
//         .select("id")
//         .gte("updated_at", thirtyDaysAgo);

//       if (usersError) {
//         return { error: "Failed to fetch active users" };
//       }

//       targetUserIds = users.map((u) => u.id);
//     } else if (params.targetAudience === "specific" && params.specificUserIds) {
//       targetUserIds = params.specificUserIds;
//     }

//     if (targetUserIds.length === 0) {
//       return { error: "No target users found" };
//     }

//     // 3. Create notifications in database
//     const notifications = targetUserIds.map((userId) => ({
//       user_id: userId,
//       notification_type: params.notificationType,
//       message: params.message,
//       is_read: false,
//       metadata: {
//         title: params.title,
//         sent_by_admin: true,
//         ...params.metadata,
//       },
//     }));

//     const { error: insertError } = await supabase
//       .from("notifications")
//       .insert(notifications);

//     if (insertError) {
//       console.error("Insert notifications error:", insertError);
//       return { error: "Failed to create notifications" };
//     }

//     // 4. Get push tokens for target users
//     const { data: pushTokensData, error: tokensError } = await supabase
//       .from("user_push_tokens")
//       .select("push_token")
//       .in("user_id", targetUserIds);

//     if (tokensError) {
//       console.error("Fetch push tokens error:", tokensError);
//     }

//     // 5. Send push notifications
//     let pushResult = { sent: 0, error: null };
//     if (pushTokensData && pushTokensData.length > 0) {
//       const tokens = pushTokensData.map((t) => t.push_token);
//       pushResult = await sendPushNotifications(
//         tokens,
//         params.title,
//         params.message,
//         {
//           type: params.notificationType,
//           ...params.metadata,
//         }
//       );
//     }

//     // 6. Revalidate notification pages
//     revalidatePath("/notification");
//     revalidatePath("/home");

//     return {
//       success: true,
//       notificationsCreated: targetUserIds.length,
//       pushNotificationsSent: pushResult.sent,
//       message: `Sent to ${targetUserIds.length} users (${pushResult.sent} push notifications delivered)`,
//     };
//   } catch (error) {
//     console.error("Send admin notification error:", error);
//     return { error: "Something went wrong" };
//   }
// }

// /**
//  * Get notification statistics for admin dashboard
//  */
// export async function getNotificationStatsAction() {
//   try {
//     const adminCheck = await checkAdminAccess();
//     if (!adminCheck.isAdmin) {
//       return { error: adminCheck.error };
//     }

//     const supabase = await createServerClient();

//     // Total notifications sent
//     const { count: totalSent } = await supabase
//       .from("notifications")
//       .select("*", { count: "exact", head: true });

//     // Total read notifications
//     const { count: totalRead } = await supabase
//       .from("notifications")
//       .select("*", { count: "exact", head: true })
//       .eq("is_read", true);

//     // Total users with push tokens
//     const { count: usersWithTokens } = await supabase
//       .from("user_push_tokens")
//       .select("*", { count: "exact", head: true });

//     // Recent notifications (last 7 days)
//     const sevenDaysAgo = new Date(
//       Date.now() - 7 * 24 * 60 * 60 * 1000
//     ).toISOString();
//     const { count: recentSent } = await supabase
//       .from("notifications")
//       .select("*", { count: "exact", head: true })
//       .gte("created_at", sevenDaysAgo);

//     return {
//       success: true,
//       stats: {
//         totalSent: totalSent || 0,
//         totalRead: totalRead || 0,
//         readRate: totalSent ? ((totalRead || 0) / totalSent) * 100 : 0,
//         usersWithPushTokens: usersWithTokens || 0,
//         recentNotifications: recentSent || 0,
//       },
//     };
//   } catch (error) {
//     console.error("Get notification stats error:", error);
//     return { error: "Failed to fetch statistics" };
//   }
// }
