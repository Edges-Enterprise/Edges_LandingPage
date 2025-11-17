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

// // app/(protected)/data/[id]/page.tsx

// import { notFound, redirect } from "next/navigation";
// import { DataProviderClient } from "./DataProviderClient";
// import { NETWORK_IMAGES } from "@/constants/helper";
// import { createServerClient } from "@/lib/supabase/server";
// import {
//   getHotDealsAction,
//   getDataPlansAction,
//   getWalletBalanceForDataAction,
// } from "@/app/actions/data";

// const DEFAULT_PROVIDER_IMAGE = "/edgesnetworkicon.png";

// const NETWORK_ID_MAPPING = {
//   mtn: { lizzysub: 1, name: "MTN" },
//   airtel: { lizzysub: 2, name: "AIRTEL" },
//   glo: { lizzysub: 3, name: "GLO" },
//   "9mobile": { lizzysub: 4, name: "9MOBILE" },
// };

// export default async function DataProviderPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { id } = await params;

//   // Check authentication
//   const supabase = await createServerClient();
//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser();

//   if (authError || !user) {
//     redirect("/sign-in");
//   }

//   // Look up provider data
//   const providerData =
//     NETWORK_ID_MAPPING[id as keyof typeof NETWORK_ID_MAPPING];

//   if (!providerData) {
//     notFound();
//   }

//   const provider = {
//     id: providerData.lizzysub,
//     name: providerData.name,
//     image:
//       NETWORK_IMAGES[providerData.name as keyof typeof NETWORK_IMAGES] ||
//       DEFAULT_PROVIDER_IMAGE,
//     code: id,
//     imageKey: providerData.name,
//     availablePlanTypes: ["SME", "SME2", "CORPORATE_GIFTING", "GIFTING"],
//     // ebenkId: providerData.ebenk,
//     lizzysubId: providerData.lizzysub,
//   };

//   // Fetch hot deals and regular plans in parallel
//   const [hotDealsResult, dataPlansResult, walletResult, profileResult] =
//     await Promise.all([
//       getHotDealsAction(providerData.name), // Pass network name instead of ID
//       getDataPlansAction(providerData.name), // Pass network name instead of ID
//       getWalletBalanceForDataAction(),
//       supabase
//         .from("profiles")
//         .select("transaction_pin")
//         .eq("id", user.id)
//         .single(),
//     ]);

//   const hotDeals = hotDealsResult.plans || [];
//   const dataPlans = dataPlansResult.plans || [];
//   const walletBalance = walletResult.balance || 0;
//   const hasPin = !!(
//     profileResult.data?.transaction_pin &&
//     profileResult.data.transaction_pin.trim() !== ""
//   );

//   // Transform data to match component interface
//   const transformHotDeal = (plan: any) => {
//     // Determine category from validity for hot deals
//     let category = "Hot";
//     const validityLower = (plan.validity || "").toLowerCase();

//     // Some hot deals can be daily/weekly, categorize them properly
//     if (validityLower.includes("1 day") || validityLower === "1 day") {
//       category = "Daily Plans";
//     } else if (
//       validityLower.includes("2 days") ||
//       validityLower.includes("7 days") ||
//       validityLower.includes("week")
//     ) {
//       category = "Weekly Plans";
//     } else if (
//       validityLower.includes("30 days") ||
//       validityLower.includes("month")
//     ) {
//       // Keep as "Hot" category for monthly hot deals
//       category = "Hot";
//     }

//     return {
//       id: plan.id,
//       data: plan.data,
//       price: parseFloat(plan.price || "0"),
//       validity: plan.validity,
//       category,
//       description: plan.description || `${plan.data} hot deal`,
//       planType: "HOT",
//       lizzysub_plan_id: plan.id, // Use the hot_deals ID directly
//     };
//   };

//   const transformDataPlan = (plan: any) => {
//     // Determine category from validity
//     let category = "Monthly Plans";
//     const validityLower = (plan.validity || "").toLowerCase();

//     if (
//       validityLower.includes("1 day") ||
//       validityLower === "1 day" ||
//       validityLower.includes("24 hr")
//     ) {
//       category = "Daily Plans";
//     } else if (
//       validityLower.includes("2 days") ||
//       validityLower.includes("3 days") ||
//       validityLower.includes("7 days") ||
//       validityLower.includes("week") ||
//       validityLower.includes("14 days")
//     ) {
//       category = "Weekly Plans";
//     }

//     return {
//       id: plan.plan_id,
//       data: plan.plan || plan.plan_network || "Unknown",
//       price: parseFloat(plan.sell_price || plan.plan_amount || "0"),
//       validity: plan.validity || "30 Days",
//       category,
//       description: `${plan.plan || plan.plan_network} - ${plan.plan_type}`,
//       planType: plan.plan_type || "STANDARD",
//       lizzysub_plan_id: plan.plan_id, // Use plan_id from lizzy table
//     };
//   };

//   const allPlans = [
//     ...hotDeals.map(transformHotDeal),
//     ...dataPlans.map(transformDataPlan),
//   ];

//   return (
//     <DataProviderClient
//       provider={provider}
//       initialPlans={allPlans}
//       initialWalletBalance={walletBalance}
//       initialHasPin={hasPin}
//     />
//   );
// }

// // // app/(protected)/data/[id]/page.tsx

// // import { notFound, redirect } from "next/navigation";
// // import { DataProviderClient } from "./DataProviderClient";
// // import { NETWORK_IMAGES } from "@/constants/helper";
// // import { createServerClient } from "@/lib/supabase/server";
// // import {
// //   getHotDealsAction,
// //   getDataPlansAction,
// //   getWalletBalanceForDataAction,
// // } from "@/app/actions/data";

// // const DEFAULT_PROVIDER_IMAGE = "/default-provider.png";

// // const NETWORK_ID_MAPPING = {
// //   mtn: { ebenk: 1, lizzysub: 1, name: "MTN" },
// //   airtel: { ebenk: 4, lizzysub: 2, name: "AIRTEL" },
// //   glo: { ebenk: 2, lizzysub: 3, name: "GLO" },
// //   "9mobile": { ebenk: 3, lizzysub: 4, name: "9MOBILE" },
// // };

// // export default async function DataProviderPage({
// //   params,
// // }: {
// //   params: Promise<{ id: string }>;
// // }) {
// //   const { id } = await params;

// //   // Check authentication
// //   const supabase = await createServerClient();
// //   const {
// //     data: { user },
// //     error: authError,
// //   } = await supabase.auth.getUser();

// //   if (authError || !user) {
// //     redirect("/sign-in");
// //   }

// //   // Look up provider data
// //   const providerData =
// //     NETWORK_ID_MAPPING[id as keyof typeof NETWORK_ID_MAPPING];

// //   if (!providerData) {
// //     notFound();
// //   }

// //   const provider = {
// //     id: providerData.ebenk,
// //     name: providerData.name,
// //     image:
// //       NETWORK_IMAGES[providerData.name as keyof typeof NETWORK_IMAGES] ||
// //       DEFAULT_PROVIDER_IMAGE,
// //     code: id,
// //     imageKey: providerData.name,
// //     availablePlanTypes: ["SME", "SME2", "CORPORATE_GIFTING", "GIFTING"],
// //     ebenkId: providerData.ebenk,
// //     lizzysubId: providerData.lizzysub,
// //   };

// //   // Fetch hot deals and regular plans in parallel
// //   const [hotDealsResult, dataPlansResult, walletResult, profileResult] =
// //     await Promise.all([
// //       getHotDealsAction(providerData.name), // Pass network name instead of ID
// //       getDataPlansAction(providerData.name), // Pass network name instead of ID
// //       getWalletBalanceForDataAction(),
// //       supabase
// //         .from("profiles")
// //         .select("transaction_pin")
// //         .eq("id", user.id)
// //         .single(),
// //     ]);

// //   const hotDeals = hotDealsResult.plans || [];
// //   const dataPlans = dataPlansResult.plans || [];
// //   const walletBalance = walletResult.balance || 0;
// //   const hasPin = !!(
// //     profileResult.data?.transaction_pin &&
// //     profileResult.data.transaction_pin.trim() !== ""
// //   );

// //   // Transform data to match component interface
// //   const transformHotDeal = (plan: any) => ({
// //     id: plan.id,
// //     data: plan.data,
// //     price: parseFloat(plan.price || "0"),
// //     validity: plan.validity,
// //     category: "Hot",
// //     description: plan.description || `${plan.data} hot deal`,
// //     planType: plan.plan_type || "HOT",
// //     lizzysub_plan_id: plan.id, // Use the hot_deals ID directly
// //   });

// //   const transformDataPlan = (plan: any) => {
// //     // Determine category from validity
// //     let category = "Monthly Plans";
// //     const validityLower = (plan.validity || "").toLowerCase();
// //     if (validityLower.includes("day") && !validityLower.includes("days")) {
// //       category = "Daily Plans";
// //     } else if (validityLower.includes("week")) {
// //       category = "Weekly Plans";
// //     }

// //     return {
// //       id: plan.plan_id,
// //       data: plan.plan || plan.plan_network || "Unknown",
// //       price: parseFloat(plan.sell_price || plan.plan_amount || "0"),
// //       validity: plan.validity || "30 Days",
// //       category,
// //       description: `${plan.plan || plan.plan_network} - ${plan.plan_type}`,
// //       planType: plan.plan_type || "STANDARD",
// //       lizzysub_plan_id: plan.plan_id, // Use plan_id from lizzy table
// //     };
// //   };

// //   const allPlans = [
// //     ...hotDeals.map(transformHotDeal),
// //     ...dataPlans.map(transformDataPlan),
// //   ];

// //   return (
// //     <DataProviderClient
// //       provider={provider}
// //       initialPlans={allPlans}
// //       initialWalletBalance={walletBalance}
// //       initialHasPin={hasPin}
// //     />
// //   );
// // }

// // // // app/(protected)/data/[id]/page.tsx

// // // import { notFound, redirect } from "next/navigation";
// // // import { DataProviderClient } from "./DataProviderClient";
// // // import { NETWORK_IMAGES } from "@/constants/helper";
// // // import { createServerClient } from "@/lib/supabase/server";
// // // import {
// // //   getHotDealsAction,
// // //   getDataPlansAction,
// // //   getWalletBalanceForDataAction,
// // // } from "@/app/actions/data";

// // // const DEFAULT_PROVIDER_IMAGE = "/default-provider.png";

// // // const NETWORK_ID_MAPPING = {
// // //   mtn: { ebenk: 1, lizzysub: 1, name: "MTN" },
// // //   airtel: { ebenk: 4, lizzysub: 2, name: "AIRTEL" },
// // //   glo: { ebenk: 2, lizzysub: 3, name: "GLO" },
// // //   "9mobile": { ebenk: 3, lizzysub: 4, name: "9MOBILE" },
// // // };

// // // export default async function DataProviderPage({
// // //   params,
// // // }: {
// // //   params: Promise<{ id: string }>;
// // // }) {
// // //   const { id } = await params;

// // //   // Check authentication
// // //   const supabase = await createServerClient();
// // //   const {
// // //     data: { user },
// // //     error: authError,
// // //   } = await supabase.auth.getUser();

// // //   if (authError || !user) {
// // //     redirect("/sign-in");
// // //   }

// // //   // Look up provider data
// // //   const providerData =
// // //     NETWORK_ID_MAPPING[id as keyof typeof NETWORK_ID_MAPPING];

// // //   if (!providerData) {
// // //     notFound();
// // //   }

// // //   const provider = {
// // //     id: providerData.ebenk,
// // //     name: providerData.name,
// // //     image:
// // //       NETWORK_IMAGES[providerData.name as keyof typeof NETWORK_IMAGES] ||
// // //       DEFAULT_PROVIDER_IMAGE,
// // //     code: id,
// // //     imageKey: providerData.name,
// // //     availablePlanTypes: ["SME", "SME2", "CORPORATE_GIFTING", "GIFTING"],
// // //     ebenkId: providerData.ebenk,
// // //     lizzysubId: providerData.lizzysub,
// // //   };

// // //   // Fetch hot deals and regular plans in parallel
// // //   const [hotDealsResult, dataPlansResult, walletResult, profileResult] =
// // //     await Promise.all([
// // //       getHotDealsAction(providerData.lizzysub),
// // //       getDataPlansAction(providerData.lizzysub),
// // //       getWalletBalanceForDataAction(),
// // //       supabase
// // //         .from("profiles")
// // //         .select("transaction_pin")
// // //         .eq("id", user.id)
// // //         .single(),
// // //     ]);

// // //   const hotDeals = hotDealsResult.plans || [];
// // //   const dataPlans = dataPlansResult.plans || [];
// // //   const walletBalance = walletResult.balance || 0;
// // //   const hasPin = !!(
// // //     profileResult.data?.transaction_pin &&
// // //     profileResult.data.transaction_pin.trim() !== ""
// // //   );

// // //   // Transform data to match component interface
// // //   const transformPlan = (plan: any, isHot: boolean = false) => ({
// // //     id: plan.id,
// // //     data: plan.data_amount || plan.data,
// // //     price: parseFloat(plan.price || plan.amount || "0"),
// // //     validity: plan.validity || `${plan.validity_days || 30} Days`,
// // //     category: isHot ? "Hot" : determineCategory(plan.validity_days || 30),
// // //     description:
// // //       plan.description || `${plan.data_amount} ${plan.plan_type || ""} plan`,
// // //     variation_code: plan.variation_code,
// // //     planType: plan.plan_type || "STANDARD",
// // //     lizzysub_plan_id: plan.lizzysub_id || plan.id,
// // //   });

// // //   function determineCategory(validityDays: number): string {
// // //     if (validityDays === 1) return "Daily Plans";
// // //     if (validityDays === 7) return "Weekly Plans";
// // //     return "Monthly Plans";
// // //   }

// // //   const allPlans = [
// // //     ...hotDeals.map((plan: any) => transformPlan(plan, true)),
// // //     ...dataPlans.map((plan: any) => transformPlan(plan, false)),
// // //   ];

// // //   return (
// // //     <DataProviderClient
// // //       provider={provider}
// // //       initialPlans={allPlans}
// // //       initialWalletBalance={walletBalance}
// // //       initialHasPin={hasPin}
// // //     />
// // //   );
// // // }

// // // // // app/(protected)/data/[id]/page.tsx

// // // // import { notFound } from "next/navigation";
// // // // import { DataProviderClient } from "./DataProviderClient";
// // // // import { NETWORK_IMAGES } from "@/constants/helper";

// // // // const DEFAULT_PROVIDER_IMAGE = "/default-provider.png";

// // // // const NETWORK_ID_MAPPING = {
// // // //   mtn: { ebenk: 1, lizzysub: 1, name: "MTN" },
// // // //   airtel: { ebenk: 4, lizzysub: 2, name: "AIRTEL" },
// // // //   glo: { ebenk: 2, lizzysub: 3, name: "GLO" },
// // // //   "9mobile": { ebenk: 3, lizzysub: 4, name: "9MOBILE" },
// // // // };

// // // // export default async function DataProviderPage({
// // // //   params,
// // // // }: {
// // // //   params: Promise<{ id: string }>;
// // // // }) {
// // // //   const { id } = await params;

// // // //   // Look up provider data based on the id
// // // //   const providerData = NETWORK_ID_MAPPING[id as keyof typeof NETWORK_ID_MAPPING];

// // // //   if (!providerData) {
// // // //     notFound();
// // // //   }

// // // //   const provider = {
// // // //     id: providerData.ebenk,
// // // //     name: providerData.name,
// // // //     image: NETWORK_IMAGES[providerData.name as keyof typeof NETWORK_IMAGES] || DEFAULT_PROVIDER_IMAGE,
// // // //     code: id,
// // // //     imageKey: providerData.name,
// // // //     availablePlanTypes: ["SME", "SME2", "CORPORATE_GIFTING", "GIFTING"],
// // // //     ebenkId: providerData.ebenk,
// // // //     lizzysubId: providerData.lizzysub,
// // // //   };

// // // //   return <DataProviderClient provider={provider} />;
// // // // }
