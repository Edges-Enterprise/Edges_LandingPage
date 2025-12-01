// app/actions/admin-notifications.ts

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
 * Handles batching by chunks of 100 (Expo's limit per request)
 */
async function sendPushNotifications(
  pushTokens: string[],
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<{ sent: number; error: string | null }> {
  // For Expo Push Notifications
  const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";

  // Filter and validate Expo tokens
  const validTokens = pushTokens.filter((token) => {
    const isValid = token && token.startsWith("ExponentPushToken[");
    if (!isValid && token) {
      console.log("Invalid token format:", token.substring(0, 20) + "...");
    }
    return isValid;
  });

  console.log(
    `Total tokens: ${pushTokens.length}, Valid tokens: ${validTokens.length}`
  );

  if (validTokens.length === 0) {
    return { sent: 0, error: "No valid push tokens" };
  }

  // Split tokens into chunks of 100 (Expo's recommended batch size)
  const CHUNK_SIZE = 100;
  const chunks: string[][] = [];
  for (let i = 0; i < validTokens.length; i += CHUNK_SIZE) {
    chunks.push(validTokens.slice(i, i + CHUNK_SIZE));
  }

  console.log(
    `Sending ${validTokens.length} notifications in ${chunks.length} batch(es)`
  );

  let totalSent = 0;
  const errors: string[] = [];

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(
      `Processing batch ${i + 1}/${chunks.length} (${chunk.length} tokens)`
    );

    const messages = chunk.map((token) => ({
      to: token,
      sound: "default",
      title,
      body: message,
      data: data || {},
      priority: "high" as const,
    }));

    try {
      const response = await fetch(expoPushEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Batch ${i + 1} - Expo API error:`,
          response.status,
          errorText
        );
        errors.push(`Batch ${i + 1}: ${response.status}`);
        continue;
      }

      const result = await response.json();

      // Count successful sends
      const batchSent =
        (result.data as any[])?.filter((r: any) => r.status === "ok").length ||
        0;
      totalSent += batchSent;

      console.log(`Batch ${i + 1} - Sent: ${batchSent}/${chunk.length}`);

      // Log any errors in this batch
      const batchErrors = (result.data as any[])?.filter(
        (r: any) => r.status === "error"
      );
      if (batchErrors && batchErrors.length > 0) {
        console.error(`Batch ${i + 1} errors:`, batchErrors.slice(0, 3)); // Log first 3 errors
        errors.push(`Batch ${i + 1}: ${batchErrors.length} failed`);
      }

      // Add a small delay between batches to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Batch ${i + 1} - Exception:`, error);
      errors.push(`Batch ${i + 1}: Exception`);
    }
  }

  console.log(`Total sent: ${totalSent}/${validTokens.length}`);

  return {
    sent: totalSent,
    error: errors.length > 0 ? errors.join(", ") : null,
  };
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

    // Debug logging
    console.log("Target users:", targetUserIds.length);
    console.log("Push tokens found:", pushTokensData?.length || 0);
    if (pushTokensData && pushTokensData.length > 0) {
      console.log(
        "Sample tokens:",
        pushTokensData.slice(0, 3).map((t) => t.push_token)
      );
    }

    // 5. Send push notifications
    let pushResult: { sent: number; error: string | null } = {
      sent: 0,
      error: null,
    };
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

      // Log push result
      console.log("Push notification result:", pushResult);
    } else {
      console.log("No push tokens available for target users");
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

/**
 * Diagnostic: Check push token health
 */
export async function checkPushTokenHealthAction() {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { error: adminCheck.error };
    }

    const supabase = await createServerClient();

    // Get all push tokens
    const { data: tokens, error } = await supabase
      .from("user_push_tokens")
      .select("push_token, created_at, updated_at");

    if (error) {
      return { error: "Failed to fetch tokens" };
    }

    const validTokens =
      tokens?.filter(
        (t) => t.push_token && t.push_token.startsWith("ExponentPushToken[")
      ) || [];

    const invalidTokens =
      tokens?.filter(
        (t) => !t.push_token || !t.push_token.startsWith("ExponentPushToken[")
      ) || [];

    return {
      success: true,
      data: {
        total: tokens?.length || 0,
        valid: validTokens.length,
        invalid: invalidTokens.length,
        sampleValid: validTokens.slice(0, 3).map((t) => ({
          token: t.push_token.substring(0, 30) + "...",
          created: t.created_at,
        })),
        sampleInvalid: invalidTokens.slice(0, 3).map((t) => ({
          token: t.push_token || "null",
          created: t.created_at,
        })),
      },
    };
  } catch (error) {
    console.error("Check push token health error:", error);
    return { error: "Failed to check token health" };
  }
}

/**
 * Clean up tokens from old Expo project
 * This resolves the PUSH_TOO_MANY_EXPERIENCE_IDS error
 */
export async function cleanupOldProjectTokensAction(projectSlug: string) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { error: adminCheck.error };
    }

    const supabase = await createServerClient();

    console.log(`Cleaning tokens from old project: ${projectSlug}`);

    // The token from @woba9794/edges-network
    const oldToken = "ExponentPushToken[R4Of5aGr2QIH59sfJrTb03]";

    const { error: deleteError } = await supabase
      .from("user_push_tokens")
      .delete()
      .eq("push_token", oldToken);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return { error: "Failed to delete old token" };
    }

    return {
      success: true,
      message: `Successfully removed token from old project ${projectSlug}`,
      tokensRemoved: 1,
    };
  } catch (error) {
    console.error("Cleanup old tokens error:", error);
    return { error: "Failed to cleanup tokens" };
  }
}

// // app/actions/admin-notifications.ts

// "use server";

// import { SendNotificationParams } from "@/constants/helper";
// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

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
// ): Promise<{ sent: number; error: string | null }> {
//   // For Expo Push Notifications
//   const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";

//   // Filter and validate Expo tokens
//   const validTokens = pushTokens.filter((token) => {
//     const isValid = token && token.startsWith("ExponentPushToken[");
//     if (!isValid && token) {
//       console.log("Invalid token format:", token.substring(0, 20) + "...");
//     }
//     return isValid;
//   });

//   console.log(
//     `Total tokens: ${pushTokens.length}, Valid tokens: ${validTokens.length}`
//   );

//   const messages = validTokens.map((token) => ({
//     to: token,
//     sound: "default",
//     title,
//     body: message,
//     data: data || {},
//     priority: "high" as const,
//   }));

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

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("Expo API error:", response.status, errorText);
//       return { sent: 0, error: `Expo API error: ${response.status}` };
//     }

//     const result = await response.json();
//     console.log("Expo API response:", JSON.stringify(result, null, 2));

//     // Count successful sends
//     const sent =
//       (result.data as any[])?.filter((r: any) => r.status === "ok").length || 0;

//     // Log any errors
//     const errors = (result.data as any[])?.filter(
//       (r: any) => r.status === "error"
//     );
//     if (errors && errors.length > 0) {
//       console.error("Push notification errors:", errors);
//     }

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

//     // Debug logging
//     console.log("Target users:", targetUserIds.length);
//     console.log("Push tokens found:", pushTokensData?.length || 0);
//     if (pushTokensData && pushTokensData.length > 0) {
//       console.log(
//         "Sample tokens:",
//         pushTokensData.slice(0, 3).map((t) => t.push_token)
//       );
//     }

//     // 5. Send push notifications
//     let pushResult: { sent: number; error: string | null } = {
//       sent: 0,
//       error: null,
//     };
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

//       // Log push result
//       console.log("Push notification result:", pushResult);
//     } else {
//       console.log("No push tokens available for target users");
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

// /**
//  * Diagnostic: Check push token health
//  */
// export async function checkPushTokenHealthAction() {
//   try {
//     const adminCheck = await checkAdminAccess();
//     if (!adminCheck.isAdmin) {
//       return { error: adminCheck.error };
//     }

//     const supabase = await createServerClient();

//     // Get all push tokens
//     const { data: tokens, error } = await supabase
//       .from("user_push_tokens")
//       .select("push_token, created_at, updated_at");

//     if (error) {
//       return { error: "Failed to fetch tokens" };
//     }

//     const validTokens =
//       tokens?.filter(
//         (t) => t.push_token && t.push_token.startsWith("ExponentPushToken[")
//       ) || [];

//     const invalidTokens =
//       tokens?.filter(
//         (t) => !t.push_token || !t.push_token.startsWith("ExponentPushToken[")
//       ) || [];

//     return {
//       success: true,
//       data: {
//         total: tokens?.length || 0,
//         valid: validTokens.length,
//         invalid: invalidTokens.length,
//         sampleValid: validTokens.slice(0, 3).map((t) => ({
//           token: t.push_token.substring(0, 30) + "...",
//           created: t.created_at,
//         })),
//         sampleInvalid: invalidTokens.slice(0, 3).map((t) => ({
//           token: t.push_token || "null",
//           created: t.created_at,
//         })),
//       },
//     };
//   } catch (error) {
//     console.error("Check push token health error:", error);
//     return { error: "Failed to check token health" };
//   }
// }

// // // // app/actions/admin-notifications.ts

// // "use server";
// // import { SendNotificationParams } from "@/constants/helper";
// // import { createServerClient } from "@/lib/supabase/server";
// // import { revalidatePath } from "next/cache";

// // /**
// //  * Check if user is admin
// //  */
// // async function checkAdminAccess() {
// //   const supabase = await createServerClient();
// //   const {
// //     data: { user },
// //     error: authError,
// //   } = await supabase.auth.getUser();

// //   if (authError || !user) {
// //     return { error: "Unauthorized", isAdmin: false };
// //   }

// //   // Check if user is admin
// //   const { data: profile, error: profileError } = await supabase
// //     .from("profiles")
// //     .select("is_admin")
// //     .eq("id", user.id)
// //     .single();

// //   if (profileError || !profile?.is_admin) {
// //     return {
// //       error: "Access denied. Admin privileges required.",
// //       isAdmin: false,
// //     };
// //   }

// //   return { isAdmin: true, userId: user.id };
// // }

// // /**
// //  * Send push notification to specific users
// //  */
// // async function sendPushNotifications(
// //   pushTokens: string[],
// //   title: string,
// //   message: string,
// //   data?: Record<string, any>
// // ): Promise<{ sent: number; error: string | null }> {
// //   // For Expo Push Notifications
// //   const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";

// //   const messages = pushTokens
// //     .filter((token) => token.startsWith("ExponentPushToken[")) // Validate Expo tokens
// //     .map((token) => ({
// //       to: token,
// //       sound: "default",
// //       title,
// //       body: message,
// //       data: data || {},
// //       priority: "high" as const,
// //     }));

// //   if (messages.length === 0) {
// //     return { sent: 0, error: "No valid push tokens" };
// //   }

// //   try {
// //     const response = await fetch(expoPushEndpoint, {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //       },
// //       body: JSON.stringify(messages),
// //     });

// //     const result = await response.json();

// //     // Count successful sends
// //     const sent = (result.data as any[])?.filter((r: any) => r.status === "ok").length || 0;

// //     return { sent, error: null };
// //   } catch (error) {
// //     console.error("Push notification error:", error);
// //     return { sent: 0, error: "Failed to send push notifications" };
// //   }
// // }

// // /**
// //  * Main action: Send notification to users
// //  */
// // export async function sendAdminNotificationAction(
// //   params: SendNotificationParams
// // ) {
// //   try {
// //     // 1. Check admin access
// //     const adminCheck = await checkAdminAccess();
// //     if (!adminCheck.isAdmin) {
// //       return { error: adminCheck.error };
// //     }

// //     const supabase = await createServerClient();

// //     // 2. Determine target users
// //     let targetUserIds: string[] = [];

// //     if (params.targetAudience === "all") {
// //       // Get all users
// //       const { data: users, error: usersError } = await supabase
// //         .from("profiles")
// //         .select("id");

// //       if (usersError) {
// //         return { error: "Failed to fetch users" };
// //       }

// //       targetUserIds = users.map((u) => u.id);
// //     } else if (params.targetAudience === "active") {
// //       // Get users who logged in within last 30 days
// //       const thirtyDaysAgo = new Date(
// //         Date.now() - 30 * 24 * 60 * 60 * 1000
// //       ).toISOString();

// //       const { data: users, error: usersError } = await supabase
// //         .from("profiles")
// //         .select("id")
// //         .gte("updated_at", thirtyDaysAgo);

// //       if (usersError) {
// //         return { error: "Failed to fetch active users" };
// //       }

// //       targetUserIds = users.map((u) => u.id);
// //     } else if (params.targetAudience === "specific" && params.specificUserIds) {
// //       targetUserIds = params.specificUserIds;
// //     }

// //     if (targetUserIds.length === 0) {
// //       return { error: "No target users found" };
// //     }

// //     // 3. Create notifications in database
// //     const notifications = targetUserIds.map((userId) => ({
// //       user_id: userId,
// //       notification_type: params.notificationType,
// //       message: params.message,
// //       is_read: false,
// //       metadata: {
// //         title: params.title,
// //         sent_by_admin: true,
// //         ...params.metadata,
// //       },
// //     }));

// //     const { error: insertError } = await supabase
// //       .from("notifications")
// //       .insert(notifications);

// //     if (insertError) {
// //       console.error("Insert notifications error:", insertError);
// //       return { error: "Failed to create notifications" };
// //     }

// //     // 4. Get push tokens for target users
// //     const { data: pushTokensData, error: tokensError } = await supabase
// //       .from("user_push_tokens")
// //       .select("push_token")
// //       .in("user_id", targetUserIds);

// //     if (tokensError) {
// //       console.error("Fetch push tokens error:", tokensError);
// //     }

// //     // 5. Send push notifications
// //     let pushResult: { sent: number; error: string | null } = { sent: 0, error: null };
// //     if (pushTokensData && pushTokensData.length > 0) {
// //       const tokens = pushTokensData.map((t) => t.push_token);
// //       pushResult = await sendPushNotifications(
// //         tokens,
// //         params.title,
// //         params.message,
// //         {
// //           type: params.notificationType,
// //           ...params.metadata,
// //         }
// //       );
// //     }

// //     // 6. Revalidate notification pages
// //     revalidatePath("/notification");
// //     revalidatePath("/home");

// //     return {
// //       success: true,
// //       notificationsCreated: targetUserIds.length,
// //       pushNotificationsSent: pushResult.sent,
// //       message: `Sent to ${targetUserIds.length} users (${pushResult.sent} push notifications delivered)`,
// //     };
// //   } catch (error) {
// //     console.error("Send admin notification error:", error);
// //     return { error: "Something went wrong" };
// //   }
// // }

// // /**
// //  * Get notification statistics for admin dashboard
// //  */
// // export async function getNotificationStatsAction() {
// //   try {
// //     const adminCheck = await checkAdminAccess();
// //     if (!adminCheck.isAdmin) {
// //       return { error: adminCheck.error };
// //     }

// //     const supabase = await createServerClient();

// //     // Total notifications sent
// //     const { count: totalSent } = await supabase
// //       .from("notifications")
// //       .select("*", { count: "exact", head: true });

// //     // Total read notifications
// //     const { count: totalRead } = await supabase
// //       .from("notifications")
// //       .select("*", { count: "exact", head: true })
// //       .eq("is_read", true);

// //     // Total users with push tokens
// //     const { count: usersWithTokens } = await supabase
// //       .from("user_push_tokens")
// //       .select("*", { count: "exact", head: true });

// //     // Recent notifications (last 7 days)
// //     const sevenDaysAgo = new Date(
// //       Date.now() - 7 * 24 * 60 * 60 * 1000
// //     ).toISOString();
// //     const { count: recentSent } = await supabase
// //       .from("notifications")
// //       .select("*", { count: "exact", head: true })
// //       .gte("created_at", sevenDaysAgo);

// //     return {
// //       success: true,
// //       stats: {
// //         totalSent: totalSent || 0,
// //         totalRead: totalRead || 0,
// //         readRate: totalSent ? ((totalRead || 0) / totalSent) * 100 : 0,
// //         usersWithPushTokens: usersWithTokens || 0,
// //         recentNotifications: recentSent || 0,
// //       },
// //     };
// //   } catch (error) {
// //     console.error("Get notification stats error:", error);
// //     return { error: "Failed to fetch statistics" };
// //   }
// // }
