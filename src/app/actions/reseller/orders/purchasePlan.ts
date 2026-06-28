// app/actions/reseller/orders/purchasePlan.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
import { revalidatePath } from "next/cache";

interface PurchaseInput {
  storeName: string;
  planId: number;
  phoneNumber: string;
  transactionPin: string;
}

interface PurchaseResult {
  success?: boolean;
  error?: string;
  message?: string;
  planName?: string;
  amount?: number;
  orderId?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function callLizzyDataProxy(payload: {
  network: string;
  phone: string;
  data_plan: number;
  "request-id": string;
}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/lizzysub-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      network: payload.network,
      phone: payload.phone,
      data_plan: payload.data_plan,
      bypass: false,
      "request-id": payload["request-id"],
    }),
  });

  return response.json();
}

async function callLizzyAirtimeProxy(payload: {
  network: string;
  phone: string;
  amount: number;
  "request-id": string;
}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/airtime_proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      network: payload.network,
      phone: payload.phone,
      amount: payload.amount,
      plan_type: "VTU",
      bypass: false,
      "request-id": payload["request-id"],
    }),
  });

  return response.json();
}

export async function purchasePlan(
  input: PurchaseInput,
): Promise<PurchaseResult> {
  const supabase = await createServerClient();

  // 1. Get the current user (must be logged in)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to make a purchase",
    };
  }

  // 2. Find the reseller
  const { data: reseller, error: resellerError } = await supabase
    .from("resellers")
    .select("id, store_name")
    .eq("store_name", input.storeName)
    .eq("status", "active")
    .single();

  if (resellerError || !reseller) {
    return { success: false, error: "Store not found or inactive" };
  }

  // 3. Check if user is the store owner
  const isOwner = user.user_metadata?.store_name === input.storeName;

  // 4. FIRST: Get the base plan by numeric plan_id
  const { data: basePlan, error: basePlanError } = await supabase
    .from("reseller_base_plans")
    .select("id, plan_id, amount, plan_name, plan_type, network, validity")
    .eq("plan_id", input.planId)
    .eq("is_active", true)
    .single();

  if (basePlanError || !basePlan) {
    console.error("[Purchase] Base plan not found:", basePlanError);
    return { success: false, error: "Plan not available" };
  }

  // 5. THEN: Get the plan config using the base plan UUID
  const { data: rawPlanConfig, error: planError } = await supabase
    .from("reseller_plan_configs")
    .select(
      `
      id, enabled, markup_type, markup_value
    `,
    )
    .eq("reseller_id", reseller.id)
    .eq("plan_id", basePlan.id) // Use the UUID here
    .eq("enabled", true)
    .single();

  if (planError || !rawPlanConfig) {
    console.error("[Purchase] Plan config not found:", planError);
    return { success: false, error: "Plan not available" };
  }

  const planConfig = rawPlanConfig as any;
  const plan = basePlan;

  if (!plan || typeof plan.amount !== "number") {
    return { success: false, error: "Plan data not found" };
  }

  // 6. Calculate final price
  const finalPrice = calculateResellerPrice(
    plan.amount,
    planConfig.markup_type,
    planConfig.markup_value,
  );
  const profit = finalPrice - plan.amount;

  // 7. Get or create customer wallet
  const { data: customerRecord, error: customerError } = await supabase
    .from("reseller_customers")
    .select("id")
    .eq("reseller_id", reseller.id)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (customerError || !customerRecord) {
    return {
      success: false,
      error: "Customer profile not found. Please try again.",
    };
  }

  // Now look up the wallet using the customer's actual ID from reseller_customers
  let { data: customerWallet } = await supabase
    .from("reseller_customer_wallets")
    .select("id, balance")
    .eq("reseller_id", reseller.id)
    .eq("customer_id", customerRecord.id) // <- Use the correct customer_id
    .maybeSingle();

  if (!customerWallet) {
    // Create wallet if it doesn't exist
    const { data: newWallet, error: createError } = await supabase
      .from("reseller_customer_wallets")
      .insert({
        reseller_id: reseller.id,
        customer_id: customerRecord.id, // <- Use the correct customer_id
        balance: 0,
        total_spent: 0,
      })
      .select("id, balance")
      .single();

    if (createError || !newWallet) {
      return {
        success: false,
        error: "Failed to create wallet. Please try again.",
      };
    }
    customerWallet = newWallet;
  }

  // 8. Check balance
  if (customerWallet.balance < finalPrice) {
    return {
      success: false,
      error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
    };
  }

  // 9. Verify transaction PIN
  let storedPin: string | null = null;

  if (isOwner) {
    const { data: resellerRecord } = await supabase
      .from("resellers")
      .select("transaction_pin")
      .eq("auth_user_id", user.id)
      .single();
    storedPin = resellerRecord?.transaction_pin ?? null;
  } else {
    const { data: customerRecord } = await supabase
      .from("reseller_customers")
      .select("transaction_pin")
      .eq("auth_user_id", user.id)
      .eq("reseller_id", reseller.id)
      .maybeSingle();
    storedPin = customerRecord?.transaction_pin ?? null;
  }

  if (!storedPin) {
    return {
      success: false,
      error: "No transaction PIN found. Please set your PIN and try again.",
    };
  }

  if (input.transactionPin !== storedPin) {
    return { success: false, error: "Invalid transaction PIN" };
  }

  // 10. Generate unique request ID
  const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)
    .toUpperCase()}`;

  // 11. Call Lizzysub API
  const isAirtime = plan.plan_type?.toLowerCase() === "airtime";

  console.log("Calling Lizzysub:", {
    planType: plan.plan_type,
    network: plan.network,
    phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
    requestId,
  });

  let lizzyResult: any;

  if (isAirtime) {
    lizzyResult = await callLizzyAirtimeProxy({
      network: plan.network,
      phone: input.phoneNumber,
      amount: plan.amount,
      "request-id": requestId,
    });
  } else {
    lizzyResult = await callLizzyDataProxy({
      network: plan.network,
      phone: input.phoneNumber,
      data_plan: plan.plan_id, // Use the numeric plan_id here
      "request-id": requestId,
    });
  }

  console.log("Lizzysub response:", {
    status: lizzyResult.status,
    message: lizzyResult.message?.slice(0, 50),
  });

  // 12. Handle Lizzysub failure
  if (lizzyResult.status !== "success") {
    let userErrorMessage =
      lizzyResult.message || "Transaction failed. Please try again.";

    if (
      userErrorMessage.includes("Insufficient Account") &&
      userErrorMessage.includes("Wallet")
    ) {
      userErrorMessage =
        "Service temporarily unavailable. Please try again later.";
    }
    if (
      userErrorMessage.includes("Insufficient Account. Kindly Fund Your Wallet")
    ) {
      userErrorMessage =
        "Service temporarily unavailable. Please try again later.";
    }

    await supabase.from("reseller_orders").insert({
      reseller_id: reseller.id,
      customer_email: user.email,
      plan_id: input.planId,
      amount: finalPrice,
      profit,
      status: "failed",
      metadata: {
        phone_number: input.phoneNumber,
        customer_id: user.id,
        request_id: requestId,
        error_message: lizzyResult.message,
        lizzy_result: lizzyResult,
      },
    });

    return {
      success: false,
      error: userErrorMessage,
    };
  }

  // 13. Deduct from customer wallet
  const newCustomerBalance = customerWallet.balance - finalPrice;
  const { error: deductError } = await supabase
    .from("reseller_customer_wallets")
    .update({
      balance: newCustomerBalance,
    })
    .eq("id", customerWallet.id);

  if (deductError) {
    console.error("Deduct error:", deductError);
    console.error("CRITICAL: delivered but deduction failed!", {
      user: user.id,
      amount: finalPrice,
      requestId,
    });
    return {
      success: false,
      error:
        "Failed to process payment. Please contact support with reference: " +
        requestId,
    };
  }

  // 14. Update customer total_spent
  await supabase.rpc("increment_customer_spent", {
    p_wallet_id: customerWallet.id,
    p_amount: finalPrice,
  });

  // 15. Credit reseller wallet
  const { error: creditError } = await supabase.rpc(
    "update_wallet_after_sale",
    {
      p_reseller_id: reseller.id,
      p_amount: finalPrice,
      p_profit: profit,
    },
  );

  if (creditError) {
    console.error("Credit error:", creditError);
    console.error("CRITICAL: R-credit failed after delivery!", {
      resellerId: reseller.id,
      amount: finalPrice,
      requestId,
    });
  }

  // 16. Create completed order
  const { data: order, error: orderError } = await supabase
    .from("reseller_orders")
    .insert({
      reseller_id: reseller.id,
      customer_email: user.email,
      plan_id: input.planId,
      amount: finalPrice,
      profit,
      status: "completed",
      metadata: {
        phone_number: input.phoneNumber,
        customer_id: user.id,
        request_id: requestId,
        network: lizzyResult.network,
        dataplan: lizzyResult.dataplan,
        api_message: lizzyResult.message,
        oldbal: lizzyResult.oldbal,
        newbal: lizzyResult.newbal,
        system: lizzyResult.system,
        plan_type: lizzyResult.plan_type,
        wallet_vending: lizzyResult.wallet_vending,
      },
    })
    .select()
    .single();

  // 17. Record transaction
  await supabase.from("reseller_transactions").insert({
    reseller_id: reseller.id,
    amount: finalPrice,
    type: "purchase",
    status: "completed",
    reference: order?.id || requestId,
    metadata: {
      order_id: order?.id,
      plan_id: input.planId,
      plan_name: plan.plan_name,
      customer_email: user.email,
      phone_number: input.phoneNumber,
      lizzy_ref: requestId,
    },
  });

  // 18. Track customer
  await supabase.from("reseller_customers").upsert(
    {
      reseller_id: reseller.id,
      email: user.email,
    },
    {
      onConflict: "reseller_id,email",
      ignoreDuplicates: false,
    },
  );

  revalidatePath(`/${input.storeName}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");

  return {
    success: true,
    message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
    planName: lizzyResult.dataplan || plan.plan_name,
    amount: finalPrice,
    orderId: order?.id,
  };
}

// // app/actions/reseller/orders/purchasePlan.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
// import { revalidatePath } from "next/cache";

// interface PurchaseInput {
//   storeName: string;
//   planId: number;
//   phoneNumber: string;
//   transactionPin: string;
// }

// interface PurchaseResult {
//   success?: boolean;
//   error?: string;
//   message?: string;
//   planName?: string;
//   amount?: number;
//   orderId?: string;
// }

// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// async function callLizzyDataProxy(payload: {
//   network: string;
//   phone: string;
//   data_plan: number;
//   "request-id": string;
// }) {
//   const response = await fetch(`${SUPABASE_URL}/functions/v1/lizzysub-proxy`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
//     },
//     body: JSON.stringify({
//       network: payload.network,
//       phone: payload.phone,
//       data_plan: payload.data_plan,
//       bypass: false,
//       "request-id": payload["request-id"],
//     }),
//   });

//   return response.json();
// }

// async function callLizzyAirtimeProxy(payload: {
//   network: string;
//   phone: string;
//   amount: number;
//   "request-id": string;
// }) {
//   const response = await fetch(`${SUPABASE_URL}/functions/v1/airtime_proxy`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
//     },
//     body: JSON.stringify({
//       network: payload.network,
//       phone: payload.phone,
//       amount: payload.amount,
//       plan_type: "VTU",
//       bypass: false,
//       "request-id": payload["request-id"],
//     }),
//   });

//   return response.json();
// }

// export async function purchasePlan(
//   input: PurchaseInput,
// ): Promise<PurchaseResult> {
//   const supabase = await createServerClient();

//   // 1. Get the current user (must be logged in)
//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser();

//   if (authError || !user) {
//     return {
//       success: false,
//       error: "You must be signed in to make a purchase",
//     };
//   }

//   // 2. Find the reseller
//   const { data: reseller, error: resellerError } = await supabase
//     .from("resellers")
//     .select("id, store_name")
//     .eq("store_name", input.storeName)
//     .eq("status", "active")
//     .single();

//   if (resellerError || !reseller) {
//     return { success: false, error: "Store not found or inactive" };
//   }

//   // 3. Check if user is the store owner (resellers can't buy from their own store)
//   const isOwner = user.user_metadata?.store_name === input.storeName;
//   // if (isOwner) {
//   //   return {
//   //     success: false,
//   //     error: "Store owners cannot purchase from their own store",
//   //   };
//   // }

//   // 4. Get the plan config with pricing
//   const { data: rawPlanConfig, error: planError } = await supabase
//     .from("reseller_plan_configs")
//     .select(
//       `
//       id, enabled, markup_type, markup_value,
//       plan:plan_id (id, plan_id, amount, plan_name, plan_type, network)
//     `,
//     )
//     .eq("reseller_id", reseller.id)
//     .eq("plan_id", input.planId)
//     .eq("enabled", true)
//     .single();

//   if (planError || !rawPlanConfig) {
//     return { success: false, error: "Plan not available" };
//   }

//   const planConfig = rawPlanConfig as any;
//   const plan = planConfig.plan;

//   if (!plan || typeof plan.amount !== "number") {
//     return { success: false, error: "Plan data not found" };
//   }

//   // 5. Calculate final price
//   const finalPrice = calculateResellerPrice(
//     plan.amount,
//     planConfig.markup_type,
//     planConfig.markup_value,
//   );
//   const profit = finalPrice - plan.amount;

//   // 6. Get or create customer wallet
//   let { data: customerWallet } = await supabase
//     .from("reseller_customer_wallets")
//     .select("id, balance")
//     .eq("reseller_id", reseller.id)
//     .eq("customer_id", user.id)
//     .maybeSingle();

//   if (!customerWallet) {
//     const { data: newWallet, error: createError } = await supabase
//       .from("reseller_customer_wallets")
//       .insert({
//         reseller_id: reseller.id,
//         customer_id: user.id,
//         balance: 0,
//         total_spent: 0,
//       })
//       .select("id, balance")
//       .single();

//     if (createError || !newWallet) {
//       return {
//         success: false,
//         error: "Failed to create wallet. Please try again.",
//       };
//     }
//     customerWallet = newWallet;
//   }

//   // 7. Check balance
//   if (customerWallet.balance < finalPrice) {
//     return {
//       success: false,
//       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
//     };
//   }

//   // 8. Verify transaction PIN
//   let storedPin: string | null = null;

//   // const isOwner = user.user_metadata?.store_name === input.storeName;

//   if (isOwner) {
//     // Reseller buying from their own store is already blocked above,
//     // but handle defensively anyway
//     const { data: resellerRecord } = await supabase
//       .from("resellers")
//       .select("transaction_pin")
//       .eq("auth_user_id", user.id)
//       .single();
//     storedPin = resellerRecord?.transaction_pin ?? null;
//   } else {
//     const { data: customerRecord } = await supabase
//       .from("reseller_customers")
//       .select("transaction_pin")
//       .eq("auth_user_id", user.id)
//       .eq("reseller_id", reseller.id)
//       .maybeSingle();
//     storedPin = customerRecord?.transaction_pin ?? null;
//   }
//   if (!storedPin) {
//     return {
//       success: false,
//       error: "No transaction PIN found. Please set your PIN and try again.",
//     };
//   }

//   if (input.transactionPin !== storedPin) {
//     return { success: false, error: "Invalid transaction PIN" };
//   }

//   // 9. Generate unique request ID
//   const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
//     .toString(36)
//     .substring(7)
//     .toUpperCase()}`;

//   // 10. Call Lizzysub API FIRST (before deducting wallet - same as original flow)
//   const isAirtime = plan.plan_type?.toLowerCase() === "airtime";

//   console.log("Calling Lizzysub:", {
//     planType: plan.plan_type,
//     network: plan.network,
//     phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
//     requestId,
//   });

//   let lizzyResult: any;

//   if (isAirtime) {
//     lizzyResult = await callLizzyAirtimeProxy({
//       network: plan.network,
//       phone: input.phoneNumber,
//       amount: plan.amount, // Base amount, not marked-up price
//       "request-id": requestId,
//     });
//   } else {
//     lizzyResult = await callLizzyDataProxy({
//       network: plan.network,
//       phone: input.phoneNumber,
//       data_plan: plan.plan_id,
//       "request-id": requestId,
//     });
//   }

//   console.log("Lizzysub response:", {
//     status: lizzyResult.status,
//     message: lizzyResult.message?.slice(0, 50),
//   });

//   // 11. Handle Lizzysub failure (same as original - record failed, don't deduct)
//   if (lizzyResult.status !== "success") {
//     let userErrorMessage =
//       lizzyResult.message || "Transaction failed. Please try again.";

//     // Check for specific provider balance error and make it generic
//     if (
//       userErrorMessage.includes("Insufficient Account") &&
//       userErrorMessage.includes("Wallet")
//     ) {
//       userErrorMessage =
//         "Service temporarily unavailable. Please try again later.";
//     }
//     if (
//       userErrorMessage.includes("Insufficient Account. Kindly Fund Your Wallet")
//     ) {
//       userErrorMessage =
//         "Service temporarily unavailable. Please try again later.";
//     }

//     // Create failed order record
//     await supabase.from("reseller_orders").insert({
//       reseller_id: reseller.id,
//       customer_email: user.email,
//       plan_id: input.planId,
//       amount: finalPrice,
//       profit,
//       status: "failed",
//       metadata: {
//         phone_number: input.phoneNumber,
//         customer_id: user.id,
//         request_id: requestId,
//         error_message: lizzyResult.message,
//         lizzy_result: lizzyResult,
//       },
//     });

//     return {
//       success: false,
//       error: userErrorMessage,
//     };
//   }

//   // 12. Lizzysub succeeded - NOW deduct from customer wallet
//   const newCustomerBalance = customerWallet.balance - finalPrice;
//   const { error: deductError } = await supabase
//     .from("reseller_customer_wallets")
//     .update({
//       balance: newCustomerBalance,
//     })
//     .eq("id", customerWallet.id);

//   if (deductError) {
//     console.error("Deduct error:", deductError);
//     // Critical: Lizzysub already delivered but we couldn't charge. Log this!
//     console.error("CRITICAL: delivered but deduction failed!", {
//       user: user.id,
//       amount: finalPrice,
//       requestId,
//     });
//     return {
//       success: false,
//       error:
//         "Failed to process payment. Please contact support with reference: " +
//         requestId,
//     };
//   }

//   // 13. Update customer total_spent
//   await supabase.rpc("increment_customer_spent", {
//     p_wallet_id: customerWallet.id,
//     p_amount: finalPrice,
//   });

//   // 14. Credit reseller wallet
//   const { error: creditError } = await supabase.rpc(
//     "update_wallet_after_sale",
//     {
//       p_reseller_id: reseller.id,
//       p_amount: finalPrice,
//       p_profit: profit,
//     },
//   );

//   if (creditError) {
//     console.error("Credit error:", creditError);
//     // Don't refund - Lizzysub already delivered. Log for manual fix.
//     console.error("CRITICAL: R-credit failed after delivery!", {
//       resellerId: reseller.id,
//       amount: finalPrice,
//       requestId,
//     });
//   }

//   // 15. Create completed order
//   const { data: order, error: orderError } = await supabase
//     .from("reseller_orders")
//     .insert({
//       reseller_id: reseller.id,
//       customer_email: user.email,
//       plan_id: input.planId,
//       amount: finalPrice,
//       profit,
//       status: "completed",
//       metadata: {
//         phone_number: input.phoneNumber,
//         customer_id: user.id,
//         request_id: requestId,
//         network: lizzyResult.network,
//         dataplan: lizzyResult.dataplan,
//         api_message: lizzyResult.message,
//         oldbal: lizzyResult.oldbal,
//         newbal: lizzyResult.newbal,
//         system: lizzyResult.system,
//         plan_type: lizzyResult.plan_type,
//         wallet_vending: lizzyResult.wallet_vending,
//       },
//     })
//     .select()
//     .single();

//   // 16. Record transaction
//   await supabase.from("reseller_transactions").insert({
//     reseller_id: reseller.id,
//     amount: finalPrice,
//     type: "purchase",
//     status: "completed",
//     reference: order?.id || requestId,
//     metadata: {
//       order_id: order?.id,
//       plan_id: input.planId,
//       plan_name: plan.plan_name,
//       customer_email: user.email,
//       phone_number: input.phoneNumber,
//       lizzy_ref: requestId,
//     },
//   });

//   // 17. Track customer
//   await supabase.from("reseller_customers").upsert(
//     {
//       reseller_id: reseller.id,
//       email: user.email,
//     },
//     {
//       onConflict: "reseller_id,email",
//       ignoreDuplicates: false,
//     },
//   );

//   revalidatePath(`/${input.storeName}`);
//   revalidatePath("/dashboard");
//   revalidatePath("/dashboard/orders");

//   return {
//     success: true,
//     message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
//     planName: lizzyResult.dataplan || plan.plan_name,
//     amount: finalPrice,
//     orderId: order?.id,
//   };
// }

// // // app/actions/reseller/orders/purchasePlan.ts
// // "use server";

// // import { createServerClient } from "@/lib/supabase/server";
// // import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
// // import { revalidatePath } from "next/cache";

// // interface PurchaseInput {
// //   storeName: string;
// //   planId: number;
// //   phoneNumber: string;
// //   transactionPin: string;
// // }

// // interface PurchaseResult {
// //   success?: boolean;
// //   error?: string;
// //   message?: string;
// //   planName?: string;
// //   amount?: number;
// //   orderId?: string;
// // }

// // export async function purchasePlan(
// //   input: PurchaseInput,
// // ): Promise<PurchaseResult> {
// //   const supabase = await createServerClient();

// //   // 1. Get the current user (must be logged in)
// //   const {
// //     data: { user },
// //     error: authError,
// //   } = await supabase.auth.getUser();

// //   if (authError || !user) {
// //     return {
// //       success: false,
// //       error: "You must be signed in to make a purchase",
// //     };
// //   }

// //   // 2. Find the reseller
// //   const { data: reseller, error: resellerError } = await supabase
// //     .from("resellers")
// //     .select("id, store_name")
// //     .eq("store_name", input.storeName)
// //     .eq("status", "active")
// //     .single();

// //   if (resellerError || !reseller) {
// //     return { success: false, error: "Store not found or inactive" };
// //   }

// //   // 3. Check if user is the store owner (resellers can't buy from their own store)
// //   const isOwner = user.user_metadata?.store_name === input.storeName;
// //   if (isOwner) {
// //     return {
// //       success: false,
// //       error: "Store owners cannot purchase from their own store",
// //     };
// //   }

// //   // 4. Get the plan config with pricing
// //   const { data: rawPlanConfig, error: planError } = await supabase
// //     .from("reseller_plan_configs")
// //     .select(
// //       `
// //       id, enabled, markup_type, markup_value,
// //       plan:plan_id (id, amount, plan_name, plan_type, network)
// //     `,
// //     )
// //     .eq("reseller_id", reseller.id)
// //     .eq("plan_id", input.planId)
// //     .eq("enabled", true)
// //     .single();

// //   if (planError || !rawPlanConfig) {
// //     return { success: false, error: "Plan not available" };
// //   }

// //   const planConfig = rawPlanConfig as any;
// //   const plan = planConfig.plan;

// //   if (!plan || typeof plan.amount !== "number") {
// //     return { success: false, error: "Plan data not found" };
// //   }

// //   // 5. Calculate final price
// //   const finalPrice = calculateResellerPrice(
// //     plan.amount,
// //     planConfig.markup_type,
// //     planConfig.markup_value,
// //   );
// //   const profit = finalPrice - plan.amount;

// //   // 6. Get or create customer wallet
// //   let { data: customerWallet } = await supabase
// //     .from("reseller_customer_wallets")
// //     .select("id, balance")
// //     .eq("reseller_id", reseller.id)
// //     .eq("customer_id", user.id)
// //     .maybeSingle();

// //   if (!customerWallet) {
// //     // Create wallet for customer
// //     const { data: newWallet, error: createError } = await supabase
// //       .from("reseller_customer_wallets")
// //       .insert({
// //         reseller_id: reseller.id,
// //         customer_id: user.id,
// //         balance: 0,
// //         total_spent: 0,
// //       })
// //       .select("id, balance")
// //       .single();

// //     if (createError || !newWallet) {
// //       return {
// //         success: false,
// //         error: "Failed to create wallet. Please try again.",
// //       };
// //     }
// //     customerWallet = newWallet;
// //   }

// //   // 7. Check balance
// //   if (customerWallet.balance < finalPrice) {
// //     return {
// //       success: false,
// //       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
// //     };
// //   }

// //   // 8. Verify transaction PIN
// //   const { data: profile, error: profileError } = await supabase
// //     .from("profiles")
// //     .select("transaction_pin")
// //     .eq("id", user.id)
// //     .single();

// //   if (profileError || !profile?.transaction_pin) {
// //     return {
// //       success: false,
// //       error: "Please set a transaction PIN in your account settings first",
// //     };
// //   }

// //   if (input.transactionPin !== profile.transaction_pin) {
// //     return { success: false, error: "Invalid transaction PIN" };
// //   }

// //   // 9. Deduct from customer wallet
// //   const { error: deductError } = await supabase
// //     .from("reseller_customer_wallets")
// //     .update({
// //       balance: customerWallet.balance - finalPrice,
// //     })
// //     .eq("id", customerWallet.id);

// //   if (deductError) {
// //     console.error("Deduct error:", deductError);
// //     return { success: false, error: "Failed to process payment" };
// //   }

// //   // 10. Update customer total_spent
// //   await supabase.rpc("increment_customer_spent", {
// //     p_wallet_id: customerWallet.id,
// //     p_amount: finalPrice,
// //   });

// //   // 11. Credit reseller wallet
// //   const { error: creditError } = await supabase.rpc(
// //     "update_wallet_after_sale",
// //     {
// //       p_reseller_id: reseller.id,
// //       p_amount: finalPrice,
// //       p_profit: profit,
// //     },
// //   );

// //   if (creditError) {
// //     console.error("Credit error:", creditError);
// //     // Refund customer
// //     await supabase
// //       .from("reseller_customer_wallets")
// //       .update({ balance: customerWallet.balance })
// //       .eq("id", customerWallet.id);
// //     return {
// //       success: false,
// //       error: "Failed to process payment. Amount refunded.",
// //     };
// //   }

// //   // 12. Create the order
// //   const { data: order, error: orderError } = await supabase
// //     .from("reseller_orders")
// //     .insert({
// //       reseller_id: reseller.id,
// //       customer_email: user.email,
// //       plan_id: input.planId,
// //       amount: finalPrice,
// //       profit,
// //       status: "completed",
// //       metadata: {
// //         phone_number: input.phoneNumber,
// //         customer_id: user.id,
// //       },
// //     })
// //     .select()
// //     .single();

// //   if (orderError) {
// //     console.error("Order error:", orderError);
// //   }

// //   // 13. Record transaction
// //   await supabase.from("reseller_transactions").insert({
// //     reseller_id: reseller.id,
// //     amount: finalPrice,
// //     type: "purchase",
// //     status: "completed",
// //     reference: order?.id || `PUR-${Date.now()}`,
// //     metadata: {
// //       order_id: order?.id,
// //       plan_id: input.planId,
// //       plan_name: plan.plan_name,
// //       customer_email: user.email,
// //       phone_number: input.phoneNumber,
// //     },
// //   });

// //   // 14. Track customer
// //   await supabase.from("reseller_customers").upsert(
// //     {
// //       reseller_id: reseller.id,
// //       email: user.email,
// //     },
// //     {
// //       onConflict: "reseller_id,email",
// //       ignoreDuplicates: false,
// //     },
// //   );

// //   revalidatePath(`/${input.storeName}`);
// //   revalidatePath("/dashboard");
// //   revalidatePath("/dashboard/orders");

// //   return {
// //     success: true,
// //     message: `${plan.plan_name} purchased successfully for ${input.phoneNumber}!`,
// //     planName: plan.plan_name,
// //     amount: finalPrice,
// //     orderId: order?.id,
// //   };
// // }
