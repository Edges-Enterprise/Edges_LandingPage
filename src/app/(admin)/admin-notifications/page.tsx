// // app/(admin)/notifications/page.tsx

// import { redirect } from "next/navigation";
// import { getUser } from "@/lib/supabase/server";
// import { createServerClient } from "@/lib/supabase/server";
// import AdminNotificationsPage from "./AdminNotificationPage";

// export default async function AdminNotificationsRoute() {
//   // Check if user is admin
//   const user = await getUser();
//   if (!user) {
//     redirect("/sign-in");
//   }

//   const supabase = await createServerClient();
//   const { data: profile } = await supabase
//     .from("profiles")
//     .select("is_admin")
//     .eq("id", user.id)
//     .single();

//   if (!profile?.is_admin) {
//     redirect("/home"); // Non-admins can't access
//   }

//   return <AdminNotificationsPage />;
// }


// app/(admin)/admin-notifications/page.tsx

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createServerClient } from "@/lib/supabase/server";
import AdminNotificationsPage from "./AdminNotificationPage";

export default async function AdminNotificationsRoute() {
  // ============================================
  // 1. AUTH CHECK
  // ============================================
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // ============================================
  // 2. ADMIN CHECK
  // ============================================
  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/notification"); // Non-admins can't access
  }

  // ============================================
  // 3. FETCH STATS (Server-side)
  // ============================================
  let stats = null;
  
  try {
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentSent } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    stats = {
      totalSent: totalSent || 0,
      totalRead: totalRead || 0,
      readRate: totalSent ? ((totalRead || 0) / totalSent) * 100 : 0,
      usersWithPushTokens: usersWithTokens || 0,
      recentNotifications: recentSent || 0,
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
  }

  return <AdminNotificationsPage initialStats={stats} />;
}