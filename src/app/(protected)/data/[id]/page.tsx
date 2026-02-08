// app/(protected)/data/[id]/page.tsx

import { notFound, redirect } from "next/navigation";
import { DataProviderClient } from "./DataProviderClient";
import { NETWORK_IMAGES } from "@/constants/helper";
import { createServerClient } from "@/lib/supabase/server";
import {
  getHotDealsAction,
  getDataPlansAction,
  getWalletBalanceForDataAction,
} from "@/app/actions/data";

const DEFAULT_PROVIDER_IMAGE = "/edgesnetworkicon.png";

const NETWORK_ID_MAPPING = {
  mtn: { lizzysub: 1, name: "MTN" },
  airtel: { lizzysub: 2, name: "AIRTEL" },
  glo: { lizzysub: 3, name: "GLO" },
  "9mobile": { lizzysub: 4, name: "9MOBILE" },
};

export default async function DataProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Check authentication
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  // Look up provider data
  const providerData =
    NETWORK_ID_MAPPING[id as keyof typeof NETWORK_ID_MAPPING];

  if (!providerData) {
    notFound();
  }

  const provider = {
    id: providerData.lizzysub,
    name: providerData.name,
    image:
      NETWORK_IMAGES[providerData.name as keyof typeof NETWORK_IMAGES] ||
      DEFAULT_PROVIDER_IMAGE,
    code: id,
    imageKey: providerData.name,
    availablePlanTypes: ["SME", "SME2", "CORPORATE_GIFTING", "GIFTING"],
    lizzysubId: providerData.lizzysub,
  };

  // Fetch hot deals and regular plans in parallel
  const [hotDealsResult, dataPlansResult, walletResult, profileResult] =
    await Promise.all([
      getHotDealsAction(providerData.name),
      getDataPlansAction(providerData.name),
      getWalletBalanceForDataAction(),
      supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("id", user.id)
        .single(),
    ]);

  const hotDeals = hotDealsResult.plans || [];
  const dataPlans = dataPlansResult.plans || [];
  const walletBalance = walletResult.balance || 0;
  const hasPin = !!(
    profileResult.data?.transaction_pin &&
    profileResult.data.transaction_pin.trim() !== ""
  );

  // Transform hot deals - ALWAYS in "Hot" category
  const transformHotDeal = (plan: any) => {
    return {
      id: plan.id,
      data: plan.data,
      price: parseFloat(plan.price || "0"),
      validity: plan.validity || "30 Days",
      category: "Hot", // ALWAYS Hot
      description: plan.description || `${plan.data} hot deal`,
      planType: "HOT",
      lizzysub_plan_id: plan.id,
    };
  };

  // Transform regular plans - categorize by validity
  const transformDataPlan = (plan: any) => {
    let category = "Monthly Plans";
    const validityLower = (plan.validity || "").toLowerCase();

    if (
      validityLower.includes("1 day") ||
      validityLower === "1 day" ||
      validityLower.includes("24 hr") ||
      validityLower.includes("daily") ||
      validityLower.includes("2 days") ||
      validityLower.includes("3 days") 
    ) {
      category = "Daily Plans";
    } else if (
      validityLower.includes("7 days") ||
      validityLower.includes("week") ||
      validityLower.includes("14 days")
    ) {
      category = "Weekly Plans";
    }

    return {
      id: plan.plan_id,
      data: plan.plan || plan.plan_network || "Unknown",
      price: parseFloat(plan.sell_price || plan.plan_amount || "0"),
      validity: plan.validity || "30 Days",
      category,
      description: `${plan.plan || plan.plan_network} - ${plan.plan_type}`,
      planType: plan.plan_type || "STANDARD",
      lizzysub_plan_id: plan.plan_id,
    };
  };

  const allPlans = [
    ...hotDeals.map(transformHotDeal),
    ...dataPlans.map(transformDataPlan),
  ];

  return (
    <DataProviderClient
      provider={provider}
      initialPlans={allPlans}
      initialWalletBalance={walletBalance}
      initialHasPin={hasPin}
    />
  );
}

