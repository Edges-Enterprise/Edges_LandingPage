// app/(protected)/home/page.tsx
// import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
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

interface Purchase {
  plan_name: string;
  provider_name: string;
  validity: string;
  mobile_number: string;
  network_id: string;
  plan_id: string;
  created_at: string;
  user_email: string;
}

export default async function HomePage() {
  // const supabase = await createServerClient();
  // const {
  //   data: { user },
  //   error,
  // } = await supabase.auth.getUser();

  // if (error || !user) {
  //   redirect("/sign-in");
  // }

  // Fetch profile - only select columns that exist
  // const { data: profile } = await supabase
  //   .from("profiles")
  //   .select("username, transaction_pin")
  //   .eq("id", user.id)
  //   .single();

  // // Fetch purchase history
  // const now = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // const { data: purchaseHistory = [] } = await supabase
  //   .from("data_purchases")
  //   .select(
  //     "plan_name, provider_name, validity, mobile_number, network_id, plan_id, created_at, user_email"
  //   )
  //   .eq("user_email", user.email)
  //   .gte("created_at", now)
  //   .order("created_at", { ascending: false });

  // // Fetch new notification count
  // const { count: newNotificationCount = 0 } = await supabase
  //   .from("notifications")
  //   .select("id", { count: "exact", head: true })
  //   .eq("user_id", user.id)
  //   .eq("is_read", false)
  //   .gte("created_at", now);

  // // Server-side popular plans computation
  // const popularPlans = purchaseHistory?.map((p: Purchase) => {
  //   const amountMatch = p.plan_name?.match(/₦(\d+)/);
  //   const provider = p.provider_name || getProviderFromPlan(p.plan_name || "");
  //   const displayPlanName = p.plan_name?.includes(provider)
  //     ? p.plan_name
  //     : `${provider} ${p.plan_name || "Unknown Plan"}`;
  //   return {
  //     plan_name: displayPlanName,
  //     provider,
  //     image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
  //     amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
  //     validity: p.validity || "N/A",
  //     phone_number:
  //       p.mobile_number || user.user_metadata?.phone || user.phone || "",
  //     network_id: p.network_id?.toString() || "0",
  //     plan_id: p.plan_id?.toString() || "0",
  //   };
  // });

  // const hasPlans = popularPlans.length > 0;
  const hasPlans = 5;
  // const phoneNumber = hasPlans
  //   ? popularPlans[0].phone_number
  //   : user.user_metadata?.phone || user.phone || "";

  // // Get username from user_metadata (where it's actually stored)
  // const username =
  //   user.user_metadata?.username ||
  //   profile?.username ||
  //   user.email?.split("@")[0] ||
  //   "User";

  // const userEmail = user.email ?? "";
  // const hasTransactionPin = !!(
  //   profile?.transaction_pin || user.user_metadata?.transaction_pin_created
  // );
  // const notificationsEnabled = true;

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-4 md:pt-6 pb-20">
      {/* Header Notification - Client for interaction */}
      <Suspense fallback={null}>
        <ClientNotificationBadge
          count={2}
          notificationsEnabled={true}
          userEmail={'user@mail.com'}
        />
      </Suspense>

      {/* Greeting Container - Responsive */}
      <div className="flex flex-row items-center gap-2 mb-4 md:mb-6 mt-4 md:mt-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Hi,</h1>
        <h1 className="text-2xl md:text-3xl font-bold text-white capitalize">
          {'username'} 👋
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
          <ClientQuickActions actions={actions} user={'newuser'} />
        </Suspense>
      </section>

      {/* Popular Plans Section */}
      <section>
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
          🔥 Recent Plans
        </h2>
        {hasPlans ? (
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4 md:p-5 animate-pulse h-20"></div>
              </div>
            }
          >
            <ClientRecentPlans
              plans={[]}
              phoneNumber={'0908753234'}
              userEmail={'userEmail@mail.com'}
              hasTransactionPin={true}
              user={'user'}
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

      {/* PIN Modal - Client, conditional render */}
      <ClientPinModal visible={false} user={'user'} />
    </div>
  );
}

// Server-side getProviderFromPlan (exact RN)
function getProviderFromPlan(plan: string): string {
  const planUpper = plan.toUpperCase();
  if (planUpper.includes("MTN")) return "MTN";
  if (planUpper.includes("GLO")) return "GLO";
  if (planUpper.includes("AIRTEL")) return "AIRTEL";
  if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
    return "9MOBILE";
  return "";
}
