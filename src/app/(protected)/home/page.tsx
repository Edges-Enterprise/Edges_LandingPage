// app/(protected)/home/page.tsx

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerClient, getUser } from "@/lib/supabase/server";
import {
  actions,
  DEFAULT_PROVIDER_IMAGE,
  NETWORK_IMAGES,
} from "@/constants/helper";
import ClientNotificationBadge from "./ClientNotificationBadge";
import ClientFlashSaleBanner from "./ClientFlashSaleBanner";
import ClientQuickActions from "./ClientQuickActions";
import ClientRecentPlans from "./ClientRecentPlans";
import ClientPinModal from "./ClientPinModal";

interface TransactionMetadata {
  plan_name?: string;
  provider_name?: string;
  validity?: string;
  mobile_number?: string;
  network_id?: string;
  plan_id?: string;
  [key: string]: any;
}

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  reference: string;
  status: string;
  metadata: TransactionMetadata | null;
  created_at: string;
  type: string | null;
}

interface Profile {
  username: string;
  email: string;
  notifications_enabled: boolean;
  transaction_pin: string;
}

export default async function HomePage() {
  // ============================================
  // 1. AUTH CHECK
  // ============================================
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // ============================================
  // 2. FETCH USER PROFILE
  // ============================================
  const supabase = await createServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, email, notifications_enabled, transaction_pin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile fetch error:", profileError);
    redirect("/sign-in");
  }

  // ============================================
  // 3. FETCH NOTIFICATIONS COUNT
  // ============================================
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  // ============================================
  // 4. FETCH RECENT PURCHASES (Last 24 hours)
  // ============================================
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: recentPurchases, error: purchasesError } = await supabase
    .from("transactions")
    .select("id, user_email, amount, reference, status, metadata, created_at, type")
    .eq("user_email", profile.email)
    .eq("status", "completed")
    .in("type", ["data", "airtime"]) // Only show data/airtime purchases
    .gte("created_at", twentyFourHoursAgo)
    .order("created_at", { ascending: false })
    .limit(5);

  // ============================================
  // 5. TRANSFORM PURCHASES FOR CLIENT
  // ============================================
  const popularPlans =
    recentPurchases
      ?.filter((tx: Transaction) => tx.metadata) // Only include transactions with metadata
      .map((tx: Transaction) => {
        const meta = tx.metadata!;
        return {
          plan_name: meta.plan_name || "Unknown Plan",
          provider: meta.provider_name || getProviderFromPlan(meta.plan_name || ""),
          image:
            NETWORK_IMAGES[
              (meta.provider_name?.toUpperCase() || "") as keyof typeof NETWORK_IMAGES
            ] || DEFAULT_PROVIDER_IMAGE,
          amount: tx.amount,
          validity: meta.validity || "N/A",
          phone_number: meta.mobile_number || "",
          network_id: meta.network_id || "",
          plan_id: meta.plan_id || tx.id,
        };
      }) || [];

  // ============================================
  // 6. DETERMINE IF PIN MODAL SHOULD SHOW
  // ============================================
  // Check if transaction_pin is empty string or null
  const shouldShowPinModal = !profile.transaction_pin || profile.transaction_pin === "";

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-4 md:pt-6 pb-20">
      {/* Header Notification - Client for interaction */}
      <Suspense fallback={null}>
        <ClientNotificationBadge
          count={unreadCount || 0}
          notificationsEnabled={profile.notifications_enabled}
          userEmail={profile.email}
        />
      </Suspense>

      {/* Greeting Container - Responsive */}
      <div className="flex flex-row items-center gap-2 mb-4 md:mb-6 mt-4 md:mt-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Hi,</h1>
        <h1 className="text-2xl md:text-3xl font-bold text-white capitalize">
          {profile.username} 👋
        </h1>
      </div>
      <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">
        Your dashboard is here 🔥
      </p>

      {/* Flash Sale Banner - Client for animations */}
      <Suspense
        fallback={
          <div className="bg-orange-500 rounded-xl p-3 mb-4 text-center shadow-lg">
            Loading banner...
          </div>
        }
      >
        <ClientFlashSaleBanner />
      </Suspense>

      {/* Quick Actions Section - Client for presses */}
      <section className="mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
          ⚡ Quick Actions
        </h2>
        <Suspense
          fallback={
            <div className="bg-gray-800 rounded-xl p-3 md:p-4">
              Loading actions...
            </div>
          }
        >
          <ClientQuickActions actions={actions} user={user} />
        </Suspense>
      </section>

      {/* Popular Plans Section */}
      <section>
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
          🔥 Recent Plans
        </h2>
        {popularPlans.length > 0 ? (
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4 md:p-5 animate-pulse h-20"></div>
              </div>
            }
          >
            <ClientRecentPlans
              plans={popularPlans}
              phoneNumber={user.phone || ""}
              userEmail={profile.email}
              hasTransactionPin={!shouldShowPinModal}
              user={user}
            />
          </Suspense>
        ) : (
          <div className="bg-gray-800 rounded-xl p-4 md:p-6 text-center">
            <p className="text-gray-400 text-sm md:text-base">
              No recent purchases found in the last 24 hours.
            </p>
          </div>
        )}
      </section>

      {/* PIN Modal - Show only if user doesn't have a transaction PIN */}
      {shouldShowPinModal && <ClientPinModal visible={true} user={user} />}
    </div>
  );
}

// ============================================
// HELPER: Extract provider from plan name
// ============================================
function getProviderFromPlan(plan: string): string {
  const planUpper = plan.toUpperCase();
  if (planUpper.includes("MTN")) return "MTN";
  if (planUpper.includes("GLO")) return "GLO";
  if (planUpper.includes("AIRTEL")) return "AIRTEL";
  if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
    return "9MOBILE";
  return "UNKNOWN";
}