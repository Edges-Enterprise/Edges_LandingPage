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
  network: number;
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
  network: number;
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

  // 1. Get the current user
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

  // 4. Get the base plan by numeric plan_id
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

  // 5. Get the plan config using the base plan UUID
  const { data: rawPlanConfig, error: planError } = await supabase
    .from("reseller_plan_configs")
    .select(`id, enabled, markup_type, markup_value`)
    .eq("reseller_id", reseller.id)
    .eq("plan_id", basePlan.id)
    .eq("enabled", true)
    .single();

  if (planError || !rawPlanConfig) {
    console.error("[Purchase] Plan config not found:", planError);
    return { success: false, error: "Plan not available" };
  }

  const planConfig = rawPlanConfig as any;
  const plan = basePlan;

  // 6. Calculate final price
  const finalPrice = calculateResellerPrice(
    plan.amount,
    planConfig.markup_type,
    planConfig.markup_value,
  );
  const profit = finalPrice - plan.amount;

  // 7. ✅ CHECK RESELLER BALANCE BEFORE PROCEEDING
  // The reseller needs to have enough balance to cover the cost price
  // 7. ✅ CHECK RESELLER BALANCE USING RPC (bypasses RLS)
  const { data: resellerBalance, error: balanceError } = await supabase.rpc(
    "get_reseller_balance",
    {
      p_reseller_id: reseller.id,
    },
  );

  if (balanceError) {
    console.error("[Purchase] Failed to get reseller balance:", balanceError);
    return {
      success: false,
      error: "Store configuration error. Please contact support.",
    };
  }

  const costPrice = plan.amount;

  if (parseFloat(resellerBalance || "0") < costPrice) {
    console.error("[Purchase] Insufficient store balance:", {
      resellerId: reseller.id,
      balance: resellerBalance,
      needed: costPrice,
    });
    return {
      success: false,
      error: `Unable to fulfill this order. Please try again later.`,
      // error: `Store has insufficient balance (₦${parseFloat(resellerBalance || "0").toLocaleString()}) to fulfill this order. Please contact the store owner.`,
    };
  }

  // 8. Get customer record
  const { data: customerRecord, error: customerError } = await supabase
    .from("reseller_customers")
    .select("id")
    .eq("reseller_id", reseller.id)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (customerError || !customerRecord) {
    console.error("[Purchase] Customer not found:", {
      userId: user.id,
      resellerId: reseller.id,
      error: customerError,
    });
    return {
      success: false,
      error: "Customer profile not found. Please register first.",
    };
  }

  // 9. Get customer wallet
  let { data: customerWallet } = await supabase
    .from("reseller_customer_wallets")
    .select("id, balance")
    .eq("reseller_id", reseller.id)
    .eq("customer_id", customerRecord.id)
    .maybeSingle();

  if (!customerWallet) {
    const { data: newWallet, error: createError } = await supabase
      .from("reseller_customer_wallets")
      .insert({
        reseller_id: reseller.id,
        customer_id: customerRecord.id,
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

  // 10. Check customer balance
  if (customerWallet.balance < finalPrice) {
    return {
      success: false,
      error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
    };
  }

  // 11. Verify transaction PIN
  let storedPin: string | null = null;

  if (isOwner) {
    const { data: resellerRecord } = await supabase
      .from("resellers")
      .select("transaction_pin")
      .eq("auth_user_id", user.id)
      .single();
    storedPin = resellerRecord?.transaction_pin ?? null;
  } else {
    const { data: customerPinRecord } = await supabase
      .from("reseller_customers")
      .select("transaction_pin")
      .eq("auth_user_id", user.id)
      .eq("reseller_id", reseller.id)
      .maybeSingle();
    storedPin = customerPinRecord?.transaction_pin ?? null;
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

  // 12. Generate unique request ID
  const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)
    .toUpperCase()}`;

  // 13. Map network name to ID
  const NETWORK_MAP: Record<string, number> = {
    MTN: 1,
    AIRTEL: 2,
    GLO: 3,
    "9MOBILE": 4,
  };

  const networkId = NETWORK_MAP[plan.network];
  if (!networkId) {
    return {
      success: false,
      error: `Unsupported network: ${plan.network}`,
    };
  }

  console.log("[Purchase] Calling Lizzysub:", {
    planType: plan.plan_type,
    network: plan.network,
    networkId: networkId,
    phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
    requestId,
    resellerBalance,
    costPrice,
  });

  // 14. Call Lizzysub API
  const isAirtime = plan.plan_type?.toLowerCase() === "airtime";
  let lizzyResult: any;

  if (isAirtime) {
    lizzyResult = await callLizzyAirtimeProxy({
      network: networkId,
      phone: input.phoneNumber,
      amount: plan.amount,
      "request-id": requestId,
    });
  } else {
    lizzyResult = await callLizzyDataProxy({
      network: networkId,
      phone: input.phoneNumber,
      data_plan: plan.plan_id,
      "request-id": requestId,
    });
  }

  console.log("[Purchase] Lizzysub response:", {
    status: lizzyResult.status,
    message: lizzyResult.message?.slice(0, 50),
  });

  // 15. Handle Lizzysub failure
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

    // Create failed order via RPC
    await supabase.rpc("create_purchase_order", {
      p_reseller_id: reseller.id,
      p_customer_email: user.email,
      p_plan_id: basePlan.id,
      p_amount: finalPrice,
      p_profit: profit,
      p_status: "failed",
    });

    return {
      success: false,
      error: userErrorMessage,
    };
  }

  // ============================================================
  // 16. PROCESS DEDUCTIONS VIA SECURE RPC FUNCTION
  //     Customer is deducted, reseller balance decreases by cost
  // ============================================================
  console.log("[Purchase] Processing deductions via RPC:", {
    customerWalletId: customerWallet.id,
    customerDeduct: finalPrice,
    resellerId: reseller.id,
    costPrice: plan.amount,
    sellingPrice: finalPrice,
    profit: profit,
    resellerBalanceBefore: resellerBalance,
  });

  const { data: deductionResult, error: deductionError } = await supabase.rpc(
    "process_purchase_deductions",
    {
      p_customer_wallet_id: customerWallet.id,
      p_customer_deduct: finalPrice,
      p_reseller_id: reseller.id,
      p_cost_price: plan.amount,
      p_selling_price: finalPrice,
      p_profit: profit,
    },
  );

  // 17. This should never fail now since we checked balance first
  // But keep the error handling just in case
  if (deductionError || !deductionResult?.success) {
    console.error("[Purchase] CRITICAL: Deductions failed after delivery!", {
      resellerId: reseller.id,
      customerId: customerRecord.id,
      amount: finalPrice,
      requestId,
      error: deductionError,
      result: deductionResult,
    });

    // Log the failure
    await supabase.from("reseller_transactions").insert({
      reseller_id: reseller.id,
      amount: finalPrice,
      type: "purchase",
      status: "failed",
      reference: requestId,
      metadata: {
        plan_id: input.planId,
        plan_name: plan.plan_name,
        customer_email: user.email,
        phone_number: input.phoneNumber,
        error: "Deduction failed after delivery (unexpected)",
        requires_manual_reconciliation: true,
      },
    });

    return {
      success: false,
      error: "Transaction failed. Please contact support.",
    };
  }

  console.log("[Purchase] Deductions successful:", deductionResult);

  // 18. Create completed order
  const { data: orderId, error: orderError } = await supabase.rpc(
    "create_purchase_order",
    {
      p_reseller_id: reseller.id,
      p_customer_email: user.email,
      p_plan_id: basePlan.id,
      p_amount: finalPrice,
      p_profit: profit,
      p_status: "completed",
    },
  );

  if (orderError) {
    console.error("[Purchase] Order creation error:", orderError);
  }

  // 19. RECORD CUSTOMER TRANSACTION
  const customerNewBalance = customerWallet.balance - finalPrice;

  const { error: customerTxError } = await supabase
    .from("reseller_customer_transactions")
    .insert({
      reseller_id: reseller.id,
      customer_id: customerRecord.id,
      type: "purchase",
      amount: finalPrice,
      fee: 0,
      net_amount: finalPrice,
      previous_balance: customerWallet.balance,
      new_balance: customerNewBalance,
      order_id: orderId,
      plan_id: basePlan.id,
      reference: `ORDER_${orderId}`,
      status: "completed",
      description: `Purchased ${plan.plan_name} (${plan.network})`,
      metadata: {
        plan_name: plan.plan_name,
        plan_type: plan.plan_type,
        network: plan.network,
        phone_number: input.phoneNumber,
        request_id: requestId,
        profit: profit,
        cost_price: plan.amount,
        reseller_balance_before: resellerBalance,
        lizzy_response: {
          status: lizzyResult.status,
          message: lizzyResult.message,
          network: lizzyResult.network,
          dataplan: lizzyResult.dataplan,
          oldbal: lizzyResult.oldbal,
          newbal: lizzyResult.newbal,
        },
      },
    });

  if (customerTxError) {
    console.error(
      "[Purchase] Failed to record customer transaction:",
      customerTxError,
    );
  }

  // 20. Record reseller transaction
  await supabase.from("reseller_transactions").insert({
    reseller_id: reseller.id,
    amount: finalPrice,
    type: "purchase",
    status: "completed",
    reference: orderId || requestId,
    metadata: {
      order_id: orderId,
      plan_id: input.planId,
      plan_name: plan.plan_name,
      customer_email: user.email,
      phone_number: input.phoneNumber,
      lizzy_ref: requestId,
      reseller_balance_before: resellerBalance,
    },
  });

  // 21. Update customer last purchase
  const { error: updateCustomerError } = await supabase
    .from("reseller_customers")
    .update({
      last_purchase_at: new Date().toISOString(),
    })
    .eq("id", customerRecord.id);

  if (updateCustomerError) {
    console.error(
      "[Purchase] Failed to update customer last_purchase_at:",
      updateCustomerError,
    );
  }

  revalidatePath(`/${input.storeName}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");

  return {
    success: true,
    message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
    planName: lizzyResult.dataplan || plan.plan_name,
    amount: finalPrice,
    orderId: orderId,
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
//   network: number;
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
//   network: number;
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

//   // 1. Get the current user
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

//   // 3. Check if user is the store owner
//   const isOwner = user.user_metadata?.store_name === input.storeName;

//   // 4. Get the base plan by numeric plan_id
//   const { data: basePlan, error: basePlanError } = await supabase
//     .from("reseller_base_plans")
//     .select("id, plan_id, amount, plan_name, plan_type, network, validity")
//     .eq("plan_id", input.planId)
//     .eq("is_active", true)
//     .single();

//   if (basePlanError || !basePlan) {
//     console.error("[Purchase] Base plan not found:", basePlanError);
//     return { success: false, error: "Plan not available" };
//   }

//   // 5. Get the plan config using the base plan UUID
//   const { data: rawPlanConfig, error: planError } = await supabase
//     .from("reseller_plan_configs")
//     .select(`id, enabled, markup_type, markup_value`)
//     .eq("reseller_id", reseller.id)
//     .eq("plan_id", basePlan.id)
//     .eq("enabled", true)
//     .single();

//   if (planError || !rawPlanConfig) {
//     console.error("[Purchase] Plan config not found:", planError);
//     return { success: false, error: "Plan not available" };
//   }

//   const planConfig = rawPlanConfig as any;
//   const plan = basePlan;

//   // 6. Calculate final price
//   const finalPrice = calculateResellerPrice(
//     plan.amount,
//     planConfig.markup_type,
//     planConfig.markup_value,
//   );
//   const profit = finalPrice - plan.amount;

//   // 7. Get customer record (should already exist from registration)
//   const { data: customerRecord, error: customerError } = await supabase
//     .from("reseller_customers")
//     .select("id")
//     .eq("reseller_id", reseller.id)
//     .eq("auth_user_id", user.id)
//     .maybeSingle();

//   if (customerError || !customerRecord) {
//     console.error("[Purchase] Customer not found:", {
//       userId: user.id,
//       resellerId: reseller.id,
//       error: customerError,
//     });
//     return {
//       success: false,
//       error: "Customer profile not found. Please register first.",
//     };
//   }

//   // 8. Get wallet using customerRecord.id
//   let { data: customerWallet } = await supabase
//     .from("reseller_customer_wallets")
//     .select("id, balance")
//     .eq("reseller_id", reseller.id)
//     .eq("customer_id", customerRecord.id)
//     .maybeSingle();

//   if (!customerWallet) {
//     const { data: newWallet, error: createError } = await supabase
//       .from("reseller_customer_wallets")
//       .insert({
//         reseller_id: reseller.id,
//         customer_id: customerRecord.id,
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

//   // 9. Check customer balance
//   if (customerWallet.balance < finalPrice) {
//     return {
//       success: false,
//       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
//     };
//   }

//   // 10. Verify transaction PIN
//   let storedPin: string | null = null;

//   if (isOwner) {
//     const { data: resellerRecord } = await supabase
//       .from("resellers")
//       .select("transaction_pin")
//       .eq("auth_user_id", user.id)
//       .single();
//     storedPin = resellerRecord?.transaction_pin ?? null;
//   } else {
//     const { data: customerPinRecord } = await supabase
//       .from("reseller_customers")
//       .select("transaction_pin")
//       .eq("auth_user_id", user.id)
//       .eq("reseller_id", reseller.id)
//       .maybeSingle();
//     storedPin = customerPinRecord?.transaction_pin ?? null;
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

//   // 11. Generate unique request ID
//   const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
//     .toString(36)
//     .substring(7)
//     .toUpperCase()}`;

//   // 12. Map network name to ID
//   const NETWORK_MAP: Record<string, number> = {
//     MTN: 1,
//     AIRTEL: 2,
//     GLO: 3,
//     "9MOBILE": 4,
//   };

//   const networkId = NETWORK_MAP[plan.network];
//   if (!networkId) {
//     return {
//       success: false,
//       error: `Unsupported network: ${plan.network}`,
//     };
//   }

//   console.log("[Purchase] Calling Lizzysub:", {
//     planType: plan.plan_type,
//     network: plan.network,
//     networkId: networkId,
//     phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
//     requestId,
//   });

//   // 13. Call Lizzysub API
//   const isAirtime = plan.plan_type?.toLowerCase() === "airtime";
//   let lizzyResult: any;

//   if (isAirtime) {
//     lizzyResult = await callLizzyAirtimeProxy({
//       network: networkId,
//       phone: input.phoneNumber,
//       amount: plan.amount,
//       "request-id": requestId,
//     });
//   } else {
//     lizzyResult = await callLizzyDataProxy({
//       network: networkId,
//       phone: input.phoneNumber,
//       data_plan: plan.plan_id,
//       "request-id": requestId,
//     });
//   }

//   console.log("[Purchase] Lizzysub response:", {
//     status: lizzyResult.status,
//     message: lizzyResult.message?.slice(0, 50),
//   });

//   // 14. Handle Lizzysub failure
//   if (lizzyResult.status !== "success") {
//     let userErrorMessage =
//       lizzyResult.message || "Transaction failed. Please try again.";

//     if (
//       userErrorMessage.includes("Insufficient Account") &&
//       userErrorMessage.includes("Wallet")
//     ) {
//       userErrorMessage =
//         "Service temporarily unavailable. Please try again later.";
//     }

//     // Create failed order via RPC (bypasses RLS)
//     await supabase.rpc("create_purchase_order", {
//       p_reseller_id: reseller.id,
//       p_customer_email: user.email,
//       p_plan_id: basePlan.id,
//       p_amount: finalPrice,
//       p_profit: profit,
//       p_status: "failed",
//     });

//     return {
//       success: false,
//       error: userErrorMessage,
//     };
//   }

//   // ============================================================
//   // 15. PROCESS DEDUCTIONS VIA SECURE RPC FUNCTION
//   //     Reseller balance decreases by SELLING PRICE
//   //     Profit is tracked in total_profit
//   // ============================================================
//   console.log("[Purchase] Processing deductions via RPC:", {
//     customerWalletId: customerWallet.id,
//     customerDeduct: finalPrice,
//     resellerId: reseller.id,
//     costPrice: plan.amount,
//     sellingPrice: finalPrice,
//     profit: profit,
//   });

//   const { data: deductionResult, error: deductionError } = await supabase.rpc(
//     "process_purchase_deductions",
//     {
//       p_customer_wallet_id: customerWallet.id,
//       p_customer_deduct: finalPrice,
//       p_reseller_id: reseller.id,
//       p_cost_price: plan.amount,
//       p_selling_price: finalPrice,
//       p_profit: profit,
//     },
//   );

//   if (deductionError || !deductionResult?.success) {
//     console.error("[Purchase] CRITICAL: Deductions failed after delivery!", {
//       resellerId: reseller.id,
//       customerId: customerRecord.id,
//       amount: finalPrice,
//       requestId,
//       error: deductionError,
//       result: deductionResult,
//     });

//     // Lizzysub delivered but we couldn't charge - log for reconciliation
//     await supabase.from("reseller_transactions").insert({
//       reseller_id: reseller.id,
//       amount: finalPrice,
//       type: "purchase",
//       status: "failed",
//       reference: requestId,
//       metadata: {
//         plan_id: input.planId,
//         plan_name: plan.plan_name,
//         customer_email: user.email,
//         phone_number: input.phoneNumber,
//         error: "Deduction failed after delivery",
//         requires_manual_reconciliation: true,
//       },
//     });

//     // Create pending reconciliation order via RPC
//     const { data: orderId } = await supabase.rpc("create_purchase_order", {
//       p_reseller_id: reseller.id,
//       p_customer_email: user.email,
//       p_plan_id: basePlan.id,
//       p_amount: finalPrice,
//       p_profit: profit,
//       p_status: "pending_reconciliation",
//     });

//     return {
//       success: true,
//       message: `${plan.plan_name} purchased successfully! (Please contact support if you don't see your balance updated)`,
//       planName: lizzyResult.dataplan || plan.plan_name,
//       amount: finalPrice,
//       orderId: orderId,
//     };
//   }

//   console.log("[Purchase] Deductions successful:", deductionResult);

//   // 16. Create completed order
//   const { data: orderId, error: orderError } = await supabase.rpc(
//     "create_purchase_order",
//     {
//       p_reseller_id: reseller.id,
//       p_customer_email: user.email,
//       p_plan_id: basePlan.id,
//       p_amount: finalPrice,
//       p_profit: profit,
//       p_status: "completed",
//     },
//   );

//   if (orderError) {
//     console.error("[Purchase] Order creation error:", orderError);
//   }

//   // ✅ 17. RECORD CUSTOMER TRANSACTION FOR PURCHASE
//   const customerNewBalance = customerWallet.balance - finalPrice;

//   const { error: customerTxError } = await supabase
//     .from("reseller_customer_transactions")
//     .insert({
//       reseller_id: reseller.id,
//       customer_id: customerRecord.id,
//       type: "purchase",
//       amount: finalPrice,
//       fee: 0,
//       net_amount: finalPrice,
//       previous_balance: customerWallet.balance,
//       new_balance: customerNewBalance,
//       order_id: orderId,
//       plan_id: basePlan.id,
//       reference: `ORDER_${orderId}`,
//       status: "completed",
//       description: `Purchased ${plan.plan_name} (${plan.network})`,
//       metadata: {
//         plan_name: plan.plan_name,
//         plan_type: plan.plan_type,
//         network: plan.network,
//         phone_number: input.phoneNumber,
//         request_id: requestId,
//         profit: profit,
//         cost_price: plan.amount,
//         lizzy_response: {
//           status: lizzyResult.status,
//           message: lizzyResult.message,
//           network: lizzyResult.network,
//           dataplan: lizzyResult.dataplan,
//           oldbal: lizzyResult.oldbal,
//           newbal: lizzyResult.newbal,
//         },
//       },
//     });

//   if (customerTxError) {
//     console.error(
//       "[Purchase] Failed to record customer transaction:",
//       customerTxError,
//     );
//   }

//   // 18. Record reseller transaction
//   await supabase.from("reseller_transactions").insert({
//     reseller_id: reseller.id,
//     amount: finalPrice,
//     type: "purchase",
//     status: "completed",
//     reference: orderId || requestId,
//     metadata: {
//       order_id: orderId,
//       plan_id: input.planId,
//       plan_name: plan.plan_name,
//       customer_email: user.email,
//       phone_number: input.phoneNumber,
//       lizzy_ref: requestId,
//     },
//   });

//   // 19. Update customer last purchase
//   const { error: updateCustomerError } = await supabase
//     .from("reseller_customers")
//     .update({
//       last_purchase_at: new Date().toISOString(),
//     })
//     .eq("id", customerRecord.id);

//   if (updateCustomerError) {
//     console.error(
//       "[Purchase] Failed to update customer last_purchase_at:",
//       updateCustomerError,
//     );
//   }

//   revalidatePath(`/${input.storeName}`);
//   revalidatePath("/dashboard");
//   revalidatePath("/dashboard/orders");

//   return {
//     success: true,
//     message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
//     planName: lizzyResult.dataplan || plan.plan_name,
//     amount: finalPrice,
//     orderId: orderId,
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

// // const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// // const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // async function callLizzyDataProxy(payload: {
// //   network: number;
// //   phone: string;
// //   data_plan: number;
// //   "request-id": string;
// // }) {
// //   const response = await fetch(`${SUPABASE_URL}/functions/v1/lizzysub-proxy`, {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// //     },
// //     body: JSON.stringify({
// //       network: payload.network,
// //       phone: payload.phone,
// //       data_plan: payload.data_plan,
// //       bypass: false,
// //       "request-id": payload["request-id"],
// //     }),
// //   });

// //   return response.json();
// // }

// // async function callLizzyAirtimeProxy(payload: {
// //   network: number;
// //   phone: string;
// //   amount: number;
// //   "request-id": string;
// // }) {
// //   const response = await fetch(`${SUPABASE_URL}/functions/v1/airtime_proxy`, {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// //     },
// //     body: JSON.stringify({
// //       network: payload.network,
// //       phone: payload.phone,
// //       amount: payload.amount,
// //       plan_type: "VTU",
// //       bypass: false,
// //       "request-id": payload["request-id"],
// //     }),
// //   });

// //   return response.json();
// // }

// // export async function purchasePlan(
// //   input: PurchaseInput,
// // ): Promise<PurchaseResult> {
// //   const supabase = await createServerClient();

// //   // 1. Get the current user
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

// //   // 3. Check if user is the store owner
// //   const isOwner = user.user_metadata?.store_name === input.storeName;

// //   // 4. Get the base plan by numeric plan_id
// //   const { data: basePlan, error: basePlanError } = await supabase
// //     .from("reseller_base_plans")
// //     .select("id, plan_id, amount, plan_name, plan_type, network, validity")
// //     .eq("plan_id", input.planId)
// //     .eq("is_active", true)
// //     .single();

// //   if (basePlanError || !basePlan) {
// //     console.error("[Purchase] Base plan not found:", basePlanError);
// //     return { success: false, error: "Plan not available" };
// //   }

// //   // 5. Get the plan config using the base plan UUID
// //   const { data: rawPlanConfig, error: planError } = await supabase
// //     .from("reseller_plan_configs")
// //     .select(`id, enabled, markup_type, markup_value`)
// //     .eq("reseller_id", reseller.id)
// //     .eq("plan_id", basePlan.id)
// //     .eq("enabled", true)
// //     .single();

// //   if (planError || !rawPlanConfig) {
// //     console.error("[Purchase] Plan config not found:", planError);
// //     return { success: false, error: "Plan not available" };
// //   }

// //   const planConfig = rawPlanConfig as any;
// //   const plan = basePlan;

// //   // 6. Calculate final price
// //   const finalPrice = calculateResellerPrice(
// //     plan.amount,
// //     planConfig.markup_type,
// //     planConfig.markup_value,
// //   );
// //   const profit = finalPrice - plan.amount;

// //   // 7. Get customer record (should already exist from registration)
// //   const { data: customerRecord, error: customerError } = await supabase
// //     .from("reseller_customers")
// //     .select("id")
// //     .eq("reseller_id", reseller.id)
// //     .eq("auth_user_id", user.id)
// //     .maybeSingle();

// //   if (customerError || !customerRecord) {
// //     console.error("[Purchase] Customer not found:", {
// //       userId: user.id,
// //       resellerId: reseller.id,
// //       error: customerError,
// //     });
// //     return {
// //       success: false,
// //       error: "Customer profile not found. Please register first.",
// //     };
// //   }

// //   // 8. Get wallet using customerRecord.id
// //   let { data: customerWallet } = await supabase
// //     .from("reseller_customer_wallets")
// //     .select("id, balance")
// //     .eq("reseller_id", reseller.id)
// //     .eq("customer_id", customerRecord.id)
// //     .maybeSingle();

// //   if (!customerWallet) {
// //     const { data: newWallet, error: createError } = await supabase
// //       .from("reseller_customer_wallets")
// //       .insert({
// //         reseller_id: reseller.id,
// //         customer_id: customerRecord.id,
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

// //   // 9. Check customer balance
// //   if (customerWallet.balance < finalPrice) {
// //     return {
// //       success: false,
// //       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
// //     };
// //   }

// //   // 10. Verify transaction PIN
// //   let storedPin: string | null = null;

// //   if (isOwner) {
// //     const { data: resellerRecord } = await supabase
// //       .from("resellers")
// //       .select("transaction_pin")
// //       .eq("auth_user_id", user.id)
// //       .single();
// //     storedPin = resellerRecord?.transaction_pin ?? null;
// //   } else {
// //     const { data: customerPinRecord } = await supabase
// //       .from("reseller_customers")
// //       .select("transaction_pin")
// //       .eq("auth_user_id", user.id)
// //       .eq("reseller_id", reseller.id)
// //       .maybeSingle();
// //     storedPin = customerPinRecord?.transaction_pin ?? null;
// //   }

// //   if (!storedPin) {
// //     return {
// //       success: false,
// //       error: "No transaction PIN found. Please set your PIN and try again.",
// //     };
// //   }

// //   if (input.transactionPin !== storedPin) {
// //     return { success: false, error: "Invalid transaction PIN" };
// //   }

// //   // 11. Generate unique request ID
// //   const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
// //     .toString(36)
// //     .substring(7)
// //     .toUpperCase()}`;

// //   // 12. Map network name to ID
// //   const NETWORK_MAP: Record<string, number> = {
// //     MTN: 1,
// //     AIRTEL: 2,
// //     GLO: 3,
// //     "9MOBILE": 4,
// //   };

// //   const networkId = NETWORK_MAP[plan.network];
// //   if (!networkId) {
// //     return {
// //       success: false,
// //       error: `Unsupported network: ${plan.network}`,
// //     };
// //   }

// //   console.log("[Purchase] Calling Lizzysub:", {
// //     planType: plan.plan_type,
// //     network: plan.network,
// //     networkId: networkId,
// //     phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
// //     requestId,
// //   });

// //   // 13. Call Lizzysub API
// //   const isAirtime = plan.plan_type?.toLowerCase() === "airtime";
// //   let lizzyResult: any;

// //   if (isAirtime) {
// //     lizzyResult = await callLizzyAirtimeProxy({
// //       network: networkId,
// //       phone: input.phoneNumber,
// //       amount: plan.amount,
// //       "request-id": requestId,
// //     });
// //   } else {
// //     lizzyResult = await callLizzyDataProxy({
// //       network: networkId,
// //       phone: input.phoneNumber,
// //       data_plan: plan.plan_id,
// //       "request-id": requestId,
// //     });
// //   }

// //   console.log("[Purchase] Lizzysub response:", {
// //     status: lizzyResult.status,
// //     message: lizzyResult.message?.slice(0, 50),
// //   });

// //   // 14. Handle Lizzysub failure
// //   if (lizzyResult.status !== "success") {
// //     let userErrorMessage =
// //       lizzyResult.message || "Transaction failed. Please try again.";

// //     if (
// //       userErrorMessage.includes("Insufficient Account") &&
// //       userErrorMessage.includes("Wallet")
// //     ) {
// //       userErrorMessage =
// //         "Service temporarily unavailable. Please try again later.";
// //     }

// //     // Create failed order via RPC (bypasses RLS)
// //     await supabase.rpc("create_purchase_order", {
// //       p_reseller_id: reseller.id,
// //       p_customer_email: user.email,
// //       p_plan_id: basePlan.id,
// //       p_amount: finalPrice,
// //       p_profit: profit,
// //       p_status: "failed",
// //     });

// //     return {
// //       success: false,
// //       error: userErrorMessage,
// //     };
// //   }

// //   // ============================================================
// //   // 15. PROCESS DEDUCTIONS VIA SECURE RPC FUNCTION
// //   //     Reseller balance decreases by SELLING PRICE
// //   //     Profit is tracked in total_profit
// //   // ============================================================
// //   console.log("[Purchase] Processing deductions via RPC:", {
// //     customerWalletId: customerWallet.id,
// //     customerDeduct: finalPrice,
// //     resellerId: reseller.id,
// //     costPrice: plan.amount,
// //     sellingPrice: finalPrice,
// //     profit: profit,
// //   });

// //   const { data: deductionResult, error: deductionError } = await supabase.rpc(
// //     "process_purchase_deductions",
// //     {
// //       p_customer_wallet_id: customerWallet.id,
// //       p_customer_deduct: finalPrice,
// //       p_reseller_id: reseller.id,
// //       p_cost_price: plan.amount,
// //       p_selling_price: finalPrice,
// //       p_profit: profit,
// //     },
// //   );

// //   if (deductionError || !deductionResult?.success) {
// //     console.error("[Purchase] CRITICAL: Deductions failed after delivery!", {
// //       resellerId: reseller.id,
// //       customerId: customerRecord.id,
// //       amount: finalPrice,
// //       requestId,
// //       error: deductionError,
// //       result: deductionResult,
// //     });

// //     // Lizzysub delivered but we couldn't charge - log for reconciliation
// //     await supabase.from("reseller_transactions").insert({
// //       reseller_id: reseller.id,
// //       amount: finalPrice,
// //       type: "purchase",
// //       status: "failed",
// //       reference: requestId,
// //       metadata: {
// //         plan_id: input.planId,
// //         plan_name: plan.plan_name,
// //         customer_email: user.email,
// //         phone_number: input.phoneNumber,
// //         error: "Deduction failed after delivery",
// //         requires_manual_reconciliation: true,
// //       },
// //     });

// //     // Create pending reconciliation order via RPC
// //     const { data: orderId } = await supabase.rpc("create_purchase_order", {
// //       p_reseller_id: reseller.id,
// //       p_customer_email: user.email,
// //       p_plan_id: basePlan.id,
// //       p_amount: finalPrice,
// //       p_profit: profit,
// //       p_status: "pending_reconciliation",
// //     });

// //     return {
// //       success: true,
// //       message: `${plan.plan_name} purchased successfully! (Please contact support if you don't see your balance updated)`,
// //       planName: lizzyResult.dataplan || plan.plan_name,
// //       amount: finalPrice,
// //       orderId: orderId,
// //     };
// //   }

// //   console.log("[Purchase] Deductions successful:", deductionResult);

// //   // 16. Create completed order
// //   const { data: orderId, error: orderError } = await supabase.rpc(
// //     "create_purchase_order",
// //     {
// //       p_reseller_id: reseller.id,
// //       p_customer_email: user.email,
// //       p_plan_id: basePlan.id,
// //       p_amount: finalPrice,
// //       p_profit: profit,
// //       p_status: "completed",
// //     },
// //   );

// //   if (orderError) {
// //     console.error("[Purchase] Order creation error:", orderError);
// //   }

// //   // 17. Record transaction
// //   await supabase.from("reseller_transactions").insert({
// //     reseller_id: reseller.id,
// //     amount: finalPrice,
// //     type: "purchase",
// //     status: "completed",
// //     reference: orderId || requestId,
// //     metadata: {
// //       order_id: orderId,
// //       plan_id: input.planId,
// //       plan_name: plan.plan_name,
// //       customer_email: user.email,
// //       phone_number: input.phoneNumber,
// //       lizzy_ref: requestId,
// //     },
// //   });

// //   // 18. Update customer last purchase
// //   const { error: updateCustomerError } = await supabase
// //     .from("reseller_customers")
// //     .update({
// //       last_purchase_at: new Date().toISOString(),
// //     })
// //     .eq("id", customerRecord.id);

// //   if (updateCustomerError) {
// //     console.error(
// //       "[Purchase] Failed to update customer last_purchase_at:",
// //       updateCustomerError,
// //     );
// //   }

// //   revalidatePath(`/${input.storeName}`);
// //   revalidatePath("/dashboard");
// //   revalidatePath("/dashboard/orders");

// //   return {
// //     success: true,
// //     message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
// //     planName: lizzyResult.dataplan || plan.plan_name,
// //     amount: finalPrice,
// //     orderId: orderId,
// //   };
// // }

// // // // app/actions/reseller/orders/purchasePlan.ts
// // // "use server";

// // // import { createServerClient } from "@/lib/supabase/server";
// // // import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
// // // import { revalidatePath } from "next/cache";

// // // interface PurchaseInput {
// // //   storeName: string;
// // //   planId: number;
// // //   phoneNumber: string;
// // //   transactionPin: string;
// // // }

// // // interface PurchaseResult {
// // //   success?: boolean;
// // //   error?: string;
// // //   message?: string;
// // //   planName?: string;
// // //   amount?: number;
// // //   orderId?: string;
// // // }

// // // const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// // // const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // // async function callLizzyDataProxy(payload: {
// // //   network: number;
// // //   phone: string;
// // //   data_plan: number;
// // //   "request-id": string;
// // // }) {
// // //   const response = await fetch(`${SUPABASE_URL}/functions/v1/lizzysub-proxy`, {
// // //     method: "POST",
// // //     headers: {
// // //       "Content-Type": "application/json",
// // //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// // //     },
// // //     body: JSON.stringify({
// // //       network: payload.network,
// // //       phone: payload.phone,
// // //       data_plan: payload.data_plan,
// // //       bypass: false,
// // //       "request-id": payload["request-id"],
// // //     }),
// // //   });

// // //   return response.json();
// // // }

// // // async function callLizzyAirtimeProxy(payload: {
// // //   network: number;
// // //   phone: string;
// // //   amount: number;
// // //   "request-id": string;
// // // }) {
// // //   const response = await fetch(`${SUPABASE_URL}/functions/v1/airtime_proxy`, {
// // //     method: "POST",
// // //     headers: {
// // //       "Content-Type": "application/json",
// // //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// // //     },
// // //     body: JSON.stringify({
// // //       network: payload.network,
// // //       phone: payload.phone,
// // //       amount: payload.amount,
// // //       plan_type: "VTU",
// // //       bypass: false,
// // //       "request-id": payload["request-id"],
// // //     }),
// // //   });

// // //   return response.json();
// // // }

// // // export async function purchasePlan(
// // //   input: PurchaseInput,
// // // ): Promise<PurchaseResult> {
// // //   const supabase = await createServerClient();

// // //   // 1. Get the current user (must be logged in)
// // //   const {
// // //     data: { user },
// // //     error: authError,
// // //   } = await supabase.auth.getUser();

// // //   if (authError || !user) {
// // //     return {
// // //       success: false,
// // //       error: "You must be signed in to make a purchase",
// // //     };
// // //   }

// // //   // 2. Find the reseller
// // //   const { data: reseller, error: resellerError } = await supabase
// // //     .from("resellers")
// // //     .select("id, store_name")
// // //     .eq("store_name", input.storeName)
// // //     .eq("status", "active")
// // //     .single();

// // //   if (resellerError || !reseller) {
// // //     return { success: false, error: "Store not found or inactive" };
// // //   }

// // //   // 3. Check if user is the store owner
// // //   const isOwner = user.user_metadata?.store_name === input.storeName;

// // //   // 4. FIRST: Get the base plan by numeric plan_id
// // //   const { data: basePlan, error: basePlanError } = await supabase
// // //     .from("reseller_base_plans")
// // //     .select("id, plan_id, amount, plan_name, plan_type, network, validity")
// // //     .eq("plan_id", input.planId)
// // //     .eq("is_active", true)
// // //     .single();

// // //   if (basePlanError || !basePlan) {
// // //     console.error("[Purchase] Base plan not found:", basePlanError);
// // //     return { success: false, error: "Plan not available" };
// // //   }

// // //   // 5. THEN: Get the plan config using the base plan UUID
// // //   const { data: rawPlanConfig, error: planError } = await supabase
// // //     .from("reseller_plan_configs")
// // //     .select(
// // //       `
// // //       id, enabled, markup_type, markup_value
// // //     `,
// // //     )
// // //     .eq("reseller_id", reseller.id)
// // //     .eq("plan_id", basePlan.id)
// // //     .eq("enabled", true)
// // //     .single();

// // //   if (planError || !rawPlanConfig) {
// // //     console.error("[Purchase] Plan config not found:", planError);
// // //     return { success: false, error: "Plan not available" };
// // //   }

// // //   const planConfig = rawPlanConfig as any;
// // //   const plan = basePlan;

// // //   if (!plan || typeof plan.amount !== "number") {
// // //     return { success: false, error: "Plan data not found" };
// // //   }

// // //   // 6. Calculate final price
// // //   const finalPrice = calculateResellerPrice(
// // //     plan.amount,
// // //     planConfig.markup_type,
// // //     planConfig.markup_value,
// // //   );
// // //   const profit = finalPrice - plan.amount;

// // //   // 7. Get customer record (should already exist from registration)
// // //   const { data: customerRecord, error: customerError } = await supabase
// // //     .from("reseller_customers")
// // //     .select("id")
// // //     .eq("reseller_id", reseller.id)
// // //     .eq("auth_user_id", user.id)
// // //     .maybeSingle();

// // //   if (customerError || !customerRecord) {
// // //     console.error("[Purchase] Customer not found:", {
// // //       userId: user.id,
// // //       resellerId: reseller.id,
// // //       error: customerError,
// // //     });
// // //     return {
// // //       success: false,
// // //       error: "Customer profile not found. Please register first.",
// // //     };
// // //   }

// // //   // 8. Get wallet using customerRecord.id
// // //   let { data: customerWallet } = await supabase
// // //     .from("reseller_customer_wallets")
// // //     .select("id, balance")
// // //     .eq("reseller_id", reseller.id)
// // //     .eq("customer_id", customerRecord.id)
// // //     .maybeSingle();

// // //   if (!customerWallet) {
// // //     // Wallet should exist, but create it just in case
// // //     const { data: newWallet, error: createError } = await supabase
// // //       .from("reseller_customer_wallets")
// // //       .insert({
// // //         reseller_id: reseller.id,
// // //         customer_id: customerRecord.id,
// // //         balance: 0,
// // //         total_spent: 0,
// // //       })
// // //       .select("id, balance")
// // //       .single();

// // //     if (createError || !newWallet) {
// // //       return {
// // //         success: false,
// // //         error: "Failed to create wallet. Please try again.",
// // //       };
// // //     }
// // //     customerWallet = newWallet;
// // //   }

// // //   // 9. Check balance
// // //   if (customerWallet.balance < finalPrice) {
// // //     return {
// // //       success: false,
// // //       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
// // //     };
// // //   }

// // //   // 10. Verify transaction PIN
// // //   let storedPin: string | null = null;

// // //   if (isOwner) {
// // //     const { data: resellerRecord } = await supabase
// // //       .from("resellers")
// // //       .select("transaction_pin")
// // //       .eq("auth_user_id", user.id)
// // //       .single();
// // //     storedPin = resellerRecord?.transaction_pin ?? null;
// // //   } else {
// // //     const { data: customerPinRecord } = await supabase
// // //       .from("reseller_customers")
// // //       .select("transaction_pin")
// // //       .eq("auth_user_id", user.id)
// // //       .eq("reseller_id", reseller.id)
// // //       .maybeSingle();
// // //     storedPin = customerPinRecord?.transaction_pin ?? null;
// // //   }

// // //   if (!storedPin) {
// // //     return {
// // //       success: false,
// // //       error: "No transaction PIN found. Please set your PIN and try again.",
// // //     };
// // //   }

// // //   if (input.transactionPin !== storedPin) {
// // //     return { success: false, error: "Invalid transaction PIN" };
// // //   }

// // //   // 11. Generate unique request ID
// // //   const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
// // //     .toString(36)
// // //     .substring(7)
// // //     .toUpperCase()}`;

// // //   // 12. Map network name to ID
// // //   const NETWORK_MAP: Record<string, number> = {
// // //     MTN: 1,
// // //     AIRTEL: 2,
// // //     GLO: 3,
// // //     "9MOBILE": 4,
// // //   };

// // //   const networkId = NETWORK_MAP[plan.network];
// // //   if (!networkId) {
// // //     return {
// // //       success: false,
// // //       error: `Unsupported network: ${plan.network}`,
// // //     };
// // //   }

// // //   console.log("[Purchase] Calling Lizzysub:", {
// // //     planType: plan.plan_type,
// // //     network: plan.network,
// // //     networkId: networkId,
// // //     phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
// // //     requestId,
// // //   });

// // //   // 13. Call Lizzysub API
// // //   const isAirtime = plan.plan_type?.toLowerCase() === "airtime";

// // //   let lizzyResult: any;

// // //   if (isAirtime) {
// // //     lizzyResult = await callLizzyAirtimeProxy({
// // //       network: networkId,
// // //       phone: input.phoneNumber,
// // //       amount: plan.amount,
// // //       "request-id": requestId,
// // //     });
// // //   } else {
// // //     lizzyResult = await callLizzyDataProxy({
// // //       network: networkId,
// // //       phone: input.phoneNumber,
// // //       data_plan: plan.plan_id,
// // //       "request-id": requestId,
// // //     });
// // //   }

// // //   console.log("[Purchase] Lizzysub response:", {
// // //     status: lizzyResult.status,
// // //     message: lizzyResult.message?.slice(0, 50),
// // //   });

// // //   // 14. Handle Lizzysub failure
// // //   if (lizzyResult.status !== "success") {
// // //     let userErrorMessage =
// // //       lizzyResult.message || "Transaction failed. Please try again.";

// // //     if (
// // //       userErrorMessage.includes("Insufficient Account") &&
// // //       userErrorMessage.includes("Wallet")
// // //     ) {
// // //       userErrorMessage =
// // //         "Service temporarily unavailable. Please try again later.";
// // //     }
// // //     if (
// // //       userErrorMessage.includes("Insufficient Account. Kindly Fund Your Wallet")
// // //     ) {
// // //       userErrorMessage =
// // //         "Service temporarily unavailable. Please try again later.";
// // //     }

// // //     await supabase.from("reseller_orders").insert({
// // //       reseller_id: reseller.id,
// // //       customer_email: user.email,
// // //       plan_id: basePlan.id,
// // //       amount: finalPrice,
// // //       profit,
// // //       status: "failed",
// // //       metadata: {
// // //         phone_number: input.phoneNumber,
// // //         customer_id: user.id,
// // //         request_id: requestId,
// // //         error_message: lizzyResult.message,
// // //         lizzy_result: lizzyResult,
// // //       },
// // //     });

// // //     return {
// // //       success: false,
// // //       error: userErrorMessage,
// // //     };
// // //   }

// // //   // ============================================================
// // //   // 15. PROCESS DEDUCTIONS VIA SECURE RPC FUNCTION
// // //   // This bypasses RLS and handles everything in one transaction
// // //   // ============================================================
// // //   console.log("[Purchase] Processing deductions via RPC:", {
// // //     customerWalletId: customerWallet.id,
// // //     customerDeduct: finalPrice,
// // //     resellerId: reseller.id,
// // //     costPrice: plan.amount,
// // //     sellingPrice: finalPrice,
// // //     profit: profit,
// // //   });

// // //   const { data: deductionResult, error: deductionError } = await supabase.rpc(
// // //     "process_purchase_deductions",
// // //     {
// // //       p_customer_wallet_id: customerWallet.id,
// // //       p_customer_deduct: finalPrice,
// // //       p_reseller_id: reseller.id,
// // //       p_cost_price: plan.amount,
// // //       p_selling_price: finalPrice,
// // //       p_profit: profit,
// // //     },
// // //   );

// // //   if (deductionError || !deductionResult?.success) {
// // //     console.error("[Purchase] CRITICAL: Deductions failed after delivery!", {
// // //       resellerId: reseller.id,
// // //       customerId: customerRecord.id,
// // //       amount: finalPrice,
// // //       requestId,
// // //       error: deductionError,
// // //       result: deductionResult,
// // //     });

// // //     // Lizzysub already delivered, but we couldn't charge.
// // //     // Log for manual reconciliation and continue.
// // //     await supabase.from("reseller_transactions").insert({
// // //       reseller_id: reseller.id,
// // //       amount: finalPrice,
// // //       type: "purchase",
// // //       status: "failed",
// // //       reference: requestId,
// // //       metadata: {
// // //         plan_id: input.planId,
// // //         plan_name: plan.plan_name,
// // //         customer_email: user.email,
// // //         phone_number: input.phoneNumber,
// // //         error: "Deduction failed after delivery",
// // //         deduction_result: deductionResult,
// // //         requires_manual_reconciliation: true,
// // //       },
// // //     });

// // //     const { data: order } = await supabase
// // //       .from("reseller_orders")
// // //       .insert({
// // //         reseller_id: reseller.id,
// // //         customer_email: user.email,
// // //         plan_id: basePlan.id,
// // //         amount: finalPrice,
// // //         profit,
// // //         status: "pending_reconciliation",
// // //         metadata: {
// // //           phone_number: input.phoneNumber,
// // //           customer_id: user.id,
// // //           request_id: requestId,
// // //           network: lizzyResult.network,
// // //           dataplan: lizzyResult.dataplan,
// // //           api_message: lizzyResult.message,
// // //           deduction_failed: true,
// // //           deduction_error: deductionResult?.error,
// // //         },
// // //       })
// // //       .select()
// // //       .single();

// // //     return {
// // //       success: true,
// // //       message: `${plan.plan_name} purchased successfully! (Please contact support if you don't see your balance updated)`,
// // //       planName: lizzyResult.dataplan || plan.plan_name,
// // //       amount: finalPrice,
// // //       orderId: order?.id,
// // //     };
// // //   }

// // //   console.log("[Purchase] Deductions successful:", deductionResult);

// // //   // 16. Create completed order
// // //   const { data: order, error: orderError } = await supabase
// // //     .from("reseller_orders")
// // //     .insert({
// // //       reseller_id: reseller.id,
// // //       customer_email: user.email,
// // //       plan_id: basePlan.id,
// // //       amount: finalPrice,
// // //       profit,
// // //       status: "completed",
// // //       metadata: {
// // //         phone_number: input.phoneNumber,
// // //         customer_id: user.id,
// // //         request_id: requestId,
// // //         network: lizzyResult.network,
// // //         dataplan: lizzyResult.dataplan,
// // //         api_message: lizzyResult.message,
// // //         oldbal: lizzyResult.oldbal,
// // //         newbal: lizzyResult.newbal,
// // //         system: lizzyResult.system,
// // //         plan_type: lizzyResult.plan_type,
// // //         wallet_vending: lizzyResult.wallet_vending,
// // //         deduction_result: deductionResult,
// // //       },
// // //     })
// // //     .select()
// // //     .single();

// // //   if (orderError) {
// // //     console.error("[Purchase] Order creation error:", orderError);
// // //   }

// // //   // 17. Record transaction
// // //   await supabase.from("reseller_transactions").insert({
// // //     reseller_id: reseller.id,
// // //     amount: finalPrice,
// // //     type: "purchase",
// // //     status: "completed",
// // //     reference: order?.id || requestId,
// // //     metadata: {
// // //       order_id: order?.id,
// // //       plan_id: input.planId,
// // //       plan_name: plan.plan_name,
// // //       customer_email: user.email,
// // //       phone_number: input.phoneNumber,
// // //       lizzy_ref: requestId,
// // //     },
// // //   });

// // //   // 18. Update customer last purchase
// // //   await supabase
// // //     .from("reseller_customers")
// // //     .update({
// // //       last_purchase_at: new Date().toISOString(),
// // //     })
// // //     .eq("id", customerRecord.id);

// // //   revalidatePath(`/${input.storeName}`);
// // //   revalidatePath("/dashboard");
// // //   revalidatePath("/dashboard/orders");

// // //   return {
// // //     success: true,
// // //     message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
// // //     planName: lizzyResult.dataplan || plan.plan_name,
// // //     amount: finalPrice,
// // //     orderId: order?.id,
// // //   };
// // // }

// // // // // app/actions/reseller/orders/purchasePlan.ts
// // // // "use server";

// // // // import { createServerClient } from "@/lib/supabase/server";
// // // // import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
// // // // import { revalidatePath } from "next/cache";

// // // // interface PurchaseInput {
// // // //   storeName: string;
// // // //   planId: number;
// // // //   phoneNumber: string;
// // // //   transactionPin: string;
// // // // }

// // // // interface PurchaseResult {
// // // //   success?: boolean;
// // // //   error?: string;
// // // //   message?: string;
// // // //   planName?: string;
// // // //   amount?: number;
// // // //   orderId?: string;
// // // // }

// // // // const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// // // // const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // // // async function callLizzyDataProxy(payload: {
// // // //   network: number;
// // // //   phone: string;
// // // //   data_plan: number;
// // // //   "request-id": string;
// // // // }) {
// // // //   const response = await fetch(`${SUPABASE_URL}/functions/v1/lizzysub-proxy`, {
// // // //     method: "POST",
// // // //     headers: {
// // // //       "Content-Type": "application/json",
// // // //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// // // //     },
// // // //     body: JSON.stringify({
// // // //       network: payload.network,
// // // //       phone: payload.phone,
// // // //       data_plan: payload.data_plan,
// // // //       bypass: false,
// // // //       "request-id": payload["request-id"],
// // // //     }),
// // // //   });

// // // //   return response.json();
// // // // }

// // // // async function callLizzyAirtimeProxy(payload: {
// // // //   network: number;
// // // //   phone: string;
// // // //   amount: number;
// // // //   "request-id": string;
// // // // }) {
// // // //   const response = await fetch(`${SUPABASE_URL}/functions/v1/airtime_proxy`, {
// // // //     method: "POST",
// // // //     headers: {
// // // //       "Content-Type": "application/json",
// // // //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// // // //     },
// // // //     body: JSON.stringify({
// // // //       network: payload.network,
// // // //       phone: payload.phone,
// // // //       amount: payload.amount,
// // // //       plan_type: "VTU",
// // // //       bypass: false,
// // // //       "request-id": payload["request-id"],
// // // //     }),
// // // //   });

// // // //   return response.json();
// // // // }

// // // // export async function purchasePlan(
// // // //   input: PurchaseInput,
// // // // ): Promise<PurchaseResult> {
// // // //   const supabase = await createServerClient();

// // // //   // 1. Get the current user (must be logged in)
// // // //   const {
// // // //     data: { user },
// // // //     error: authError,
// // // //   } = await supabase.auth.getUser();

// // // //   if (authError || !user) {
// // // //     return {
// // // //       success: false,
// // // //       error: "You must be signed in to make a purchase",
// // // //     };
// // // //   }

// // // //   // 2. Find the reseller
// // // //   const { data: reseller, error: resellerError } = await supabase
// // // //     .from("resellers")
// // // //     .select("id, store_name")
// // // //     .eq("store_name", input.storeName)
// // // //     .eq("status", "active")
// // // //     .single();

// // // //   if (resellerError || !reseller) {
// // // //     return { success: false, error: "Store not found or inactive" };
// // // //   }

// // // //   // 3. Check if user is the store owner
// // // //   const isOwner = user.user_metadata?.store_name === input.storeName;

// // // //   // 4. FIRST: Get the base plan by numeric plan_id
// // // //   const { data: basePlan, error: basePlanError } = await supabase
// // // //     .from("reseller_base_plans")
// // // //     .select("id, plan_id, amount, plan_name, plan_type, network, validity")
// // // //     .eq("plan_id", input.planId)
// // // //     .eq("is_active", true)
// // // //     .single();

// // // //   if (basePlanError || !basePlan) {
// // // //     console.error("[Purchase] Base plan not found:", basePlanError);
// // // //     return { success: false, error: "Plan not available" };
// // // //   }

// // // //   // 5. THEN: Get the plan config using the base plan UUID
// // // //   const { data: rawPlanConfig, error: planError } = await supabase
// // // //     .from("reseller_plan_configs")
// // // //     .select(
// // // //       `
// // // //       id, enabled, markup_type, markup_value
// // // //     `,
// // // //     )
// // // //     .eq("reseller_id", reseller.id)
// // // //     .eq("plan_id", basePlan.id) // Use the UUID here
// // // //     .eq("enabled", true)
// // // //     .single();

// // // //   if (planError || !rawPlanConfig) {
// // // //     console.error("[Purchase] Plan config not found:", planError);
// // // //     return { success: false, error: "Plan not available" };
// // // //   }

// // // //   const planConfig = rawPlanConfig as any;
// // // //   const plan = basePlan;

// // // //   if (!plan || typeof plan.amount !== "number") {
// // // //     return { success: false, error: "Plan data not found" };
// // // //   }

// // // //   // 6. Calculate final price
// // // //   const finalPrice = calculateResellerPrice(
// // // //     plan.amount,
// // // //     planConfig.markup_type,
// // // //     planConfig.markup_value,
// // // //   );
// // // //   const profit = finalPrice - plan.amount;

// // // //   // 7. Get or create customer wallet
// // // //   const { data: customerRecord, error: customerError } = await supabase
// // // //     .from("reseller_customers")
// // // //     .select("id")
// // // //     .eq("reseller_id", reseller.id)
// // // //     .eq("auth_user_id", user.id)
// // // //     .maybeSingle();

// // // //   if (customerError || !customerRecord) {
// // // //     return {
// // // //       success: false,
// // // //       error: "Customer profile not found. Please try again.",
// // // //     };
// // // //   }

// // // //   // Now look up the wallet using the customer's actual ID from reseller_customers
// // // //   let { data: customerWallet } = await supabase
// // // //     .from("reseller_customer_wallets")
// // // //     .select("id, balance")
// // // //     .eq("reseller_id", reseller.id)
// // // //     .eq("customer_id", customerRecord.id) // <- Use the correct customer_id
// // // //     .maybeSingle();

// // // //   if (!customerWallet) {
// // // //     // Create wallet if it doesn't exist
// // // //     const { data: newWallet, error: createError } = await supabase
// // // //       .from("reseller_customer_wallets")
// // // //       .insert({
// // // //         reseller_id: reseller.id,
// // // //         customer_id: customerRecord.id, // <- Use the correct customer_id
// // // //         balance: 0,
// // // //         total_spent: 0,
// // // //       })
// // // //       .select("id, balance")
// // // //       .single();

// // // //     if (createError || !newWallet) {
// // // //       return {
// // // //         success: false,
// // // //         error: "Failed to create wallet. Please try again.",
// // // //       };
// // // //     }
// // // //     customerWallet = newWallet;
// // // //   }

// // // //   // 8. Check balance
// // // //   if (customerWallet.balance < finalPrice) {
// // // //     return {
// // // //       success: false,
// // // //       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
// // // //     };
// // // //   }

// // // //   // 9. Verify transaction PIN
// // // //   let storedPin: string | null = null;

// // // //   if (isOwner) {
// // // //     const { data: resellerRecord } = await supabase
// // // //       .from("resellers")
// // // //       .select("transaction_pin")
// // // //       .eq("auth_user_id", user.id)
// // // //       .single();
// // // //     storedPin = resellerRecord?.transaction_pin ?? null;
// // // //   } else {
// // // //     const { data: customerRecord } = await supabase
// // // //       .from("reseller_customers")
// // // //       .select("transaction_pin")
// // // //       .eq("auth_user_id", user.id)
// // // //       .eq("reseller_id", reseller.id)
// // // //       .maybeSingle();
// // // //     storedPin = customerRecord?.transaction_pin ?? null;
// // // //   }

// // // //   if (!storedPin) {
// // // //     return {
// // // //       success: false,
// // // //       error: "No transaction PIN found. Please set your PIN and try again.",
// // // //     };
// // // //   }

// // // //   if (input.transactionPin !== storedPin) {
// // // //     return { success: false, error: "Invalid transaction PIN" };
// // // //   }

// // // //   // 10. Generate unique request ID
// // // //   const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
// // // //     .toString(36)
// // // //     .substring(7)
// // // //     .toUpperCase()}`;

// // // //   // 11. Call Lizzysub API
// // // //   const isAirtime = plan.plan_type?.toLowerCase() === "airtime";

// // // //   const NETWORK_MAP: Record<string, number> = {
// // // //     MTN: 1,
// // // //     AIRTEL: 2,
// // // //     GLO: 3,
// // // //     "9MOBILE": 4,
// // // //   };

// // // //   const networkId = NETWORK_MAP[plan.network];
// // // //   if (!networkId) {
// // // //     return {
// // // //       success: false,
// // // //       error: `Unsupported network: ${plan.network}`,
// // // //     };
// // // //   }

// // // //   console.log("Calling Lizzysub:", {
// // // //     planType: plan.plan_type,
// // // //     network: plan.network,
// // // //     networkId: networkId,
// // // //     phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
// // // //     requestId,
// // // //   });

// // // //   let lizzyResult: any;

// // // //   if (isAirtime) {
// // // //     lizzyResult = await callLizzyAirtimeProxy({
// // // //       network: networkId,
// // // //       phone: input.phoneNumber,
// // // //       amount: plan.amount,
// // // //       "request-id": requestId,
// // // //     });
// // // //   } else {
// // // //     lizzyResult = await callLizzyDataProxy({
// // // //       network: networkId,
// // // //       phone: input.phoneNumber,
// // // //       data_plan: plan.plan_id, // Use the numeric plan_id here
// // // //       "request-id": requestId,
// // // //     });
// // // //   }

// // // //   console.log("Lizzysub response:", {
// // // //     status: lizzyResult.status,
// // // //     message: lizzyResult.message?.slice(0, 50),
// // // //   });

// // // //   // 12. Handle Lizzysub failure
// // // //   if (lizzyResult.status !== "success") {
// // // //     let userErrorMessage =
// // // //       lizzyResult.message || "Transaction failed. Please try again.";

// // // //     if (
// // // //       userErrorMessage.includes("Insufficient Account") &&
// // // //       userErrorMessage.includes("Wallet")
// // // //     ) {
// // // //       userErrorMessage =
// // // //         "Service temporarily unavailable. Please try again later.";
// // // //     }
// // // //     if (
// // // //       userErrorMessage.includes("Insufficient Account. Kindly Fund Your Wallet")
// // // //     ) {
// // // //       userErrorMessage =
// // // //         "Service temporarily unavailable. Please try again later.";
// // // //     }

// // // //     await supabase.from("reseller_orders").insert({
// // // //       reseller_id: reseller.id,
// // // //       customer_email: user.email,
// // // //       plan_id: basePlan.id,
// // // //       amount: finalPrice,
// // // //       profit,
// // // //       status: "failed",
// // // //       metadata: {
// // // //         phone_number: input.phoneNumber,
// // // //         customer_id: user.id,
// // // //         request_id: requestId,
// // // //         error_message: lizzyResult.message,
// // // //         lizzy_result: lizzyResult,
// // // //       },
// // // //     });

// // // //     return {
// // // //       success: false,
// // // //       error: userErrorMessage,
// // // //     };
// // // //   }

// // // //   // 13. Deduct from customer wallet
// // // //   const newCustomerBalance = customerWallet.balance - finalPrice;
// // // //   const { error: deductError } = await supabase
// // // //     .from("reseller_customer_wallets")
// // // //     .update({
// // // //       balance: newCustomerBalance,
// // // //     })
// // // //     .eq("id", customerWallet.id);

// // // //   if (deductError) {
// // // //     console.error("Deduct error:", deductError);
// // // //     console.error("CRITICAL: delivered but deduction failed!", {
// // // //       user: user.id,
// // // //       amount: finalPrice,
// // // //       requestId,
// // // //     });
// // // //     return {
// // // //       success: false,
// // // //       error:
// // // //         "Failed to process payment. Please contact support with reference: " +
// // // //         requestId,
// // // //     };
// // // //   }

// // // //   // 14. Update customer total_spent
// // // //   await supabase.rpc("increment_customer_spent", {
// // // //     p_wallet_id: customerWallet.id,
// // // //     p_amount: finalPrice,
// // // //   });

// // // //   // // 15. Credit reseller wallet

// // // //   // // === DEBUG: Check wallet before RPC ===
// // // //   // console.log("=== WALLET DEBUG START ===");
// // // //   // console.log("Reseller ID from reseller object:", reseller.id);
// // // //   // console.log("Reseller ID type:", typeof reseller.id);
// // // //   // console.log("Final price:", finalPrice);
// // // //   // console.log("Profit:", profit);
// // // //   //  console.log("=== WALLET DEBUG END ===");

// // // //   // const { error: creditError } = await supabase.rpc(
// // // //   //   "update_wallet_after_sale",
// // // //   //   {
// // // //   //     p_reseller_id: reseller.id,
// // // //   //     p_amount: finalPrice,
// // // //   //     p_profit: profit,
// // // //   //   },
// // // //   // );

// // // //   // if (creditError) {
// // // //   //   console.error("Credit error:", creditError);
// // // //   //   console.error("CRITICAL: R-credit failed after delivery!", {
// // // //   //     resellerId: reseller.id,
// // // //   //     amount: finalPrice,
// // // //   //     requestId,
// // // //   //   });
// // // //   // }

// // // //   // 15. Credit reseller wallet
// // // //   console.log("=== WALLET DEBUG START ===");
// // // //   console.log("Reseller ID:", reseller.id);
// // // //   console.log("Reseller ID type:", typeof reseller.id);
// // // //   console.log("Final price:", finalPrice);
// // // //   console.log("Profit:", profit);

// // // //   // Check if wallet exists via direct query
// // // //   const { data: walletCheck, error: walletCheckError } = await supabase
// // // //     .from("reseller_wallets")
// // // //     .select("id, balance, total_sales, total_profit")
// // // //     .eq("reseller_id", reseller.id)
// // // //     .maybeSingle();

// // // //   console.log("Wallet check result:", {
// // // //     walletCheck,
// // // //     error: walletCheckError,
// // // //     exists: !!walletCheck,
// // // //   });

// // // //   // Try direct update first
// // // //   console.log("Attempting direct update...");
// // // //   const { error: directUpdateError } = await supabase
// // // //     .from("reseller_wallets")
// // // //     .update({
// // // //       balance: (walletCheck?.balance || 0) + finalPrice,
// // // //       total_sales: (walletCheck?.total_sales || 0) + finalPrice,
// // // //       total_profit: (walletCheck?.total_profit || 0) + profit,
// // // //       updated_at: new Date().toISOString(),
// // // //     })
// // // //     .eq("reseller_id", reseller.id);

// // // //   console.log("Direct update result:", {
// // // //     directUpdateError,
// // // //     success: !directUpdateError,
// // // //   });

// // // //   // Then try the RPC
// // // //   console.log("Attempting RPC update...");
// // // //   const { error: creditError } = await supabase.rpc(
// // // //     "update_wallet_after_sale",
// // // //     {
// // // //       p_reseller_id: reseller.id,
// // // //       p_amount: finalPrice,
// // // //       p_profit: profit,
// // // //     },
// // // //   );

// // // //   console.log("RPC result:", {
// // // //     creditError,
// // // //     success: !creditError,
// // // //   });
// // // //   console.log("=== WALLET DEBUG END ===");

// // // //   if (creditError) {
// // // //     console.error("Credit error:", creditError);
// // // //     console.error("CRITICAL: R-credit failed after delivery!", {
// // // //       resellerId: reseller.id,
// // // //       amount: finalPrice,
// // // //       requestId,
// // // //     });
// // // //   }

// // // //   // 16. Create completed order
// // // //   const { data: order, error: orderError } = await supabase
// // // //     .from("reseller_orders")
// // // //     .insert({
// // // //       reseller_id: reseller.id,
// // // //       customer_email: user.email,
// // // //       plan_id: basePlan.id,
// // // //       amount: finalPrice,
// // // //       profit,
// // // //       status: "completed",
// // // //       metadata: {
// // // //         phone_number: input.phoneNumber,
// // // //         customer_id: user.id,
// // // //         request_id: requestId,
// // // //         network: lizzyResult.network,
// // // //         dataplan: lizzyResult.dataplan,
// // // //         api_message: lizzyResult.message,
// // // //         oldbal: lizzyResult.oldbal,
// // // //         newbal: lizzyResult.newbal,
// // // //         system: lizzyResult.system,
// // // //         plan_type: lizzyResult.plan_type,
// // // //         wallet_vending: lizzyResult.wallet_vending,
// // // //       },
// // // //     })
// // // //     .select()
// // // //     .single();

// // // //   // 17. Record transaction
// // // //   await supabase.from("reseller_transactions").insert({
// // // //     reseller_id: reseller.id,
// // // //     amount: finalPrice,
// // // //     type: "purchase",
// // // //     status: "completed",
// // // //     reference: order?.id || requestId,
// // // //     metadata: {
// // // //       order_id: order?.id,
// // // //       plan_id: basePlan.id,
// // // //       plan_name: plan.plan_name,
// // // //       customer_email: user.email,
// // // //       phone_number: input.phoneNumber,
// // // //       lizzy_ref: requestId,
// // // //     },
// // // //   });

// // // //   // 18. Track customer
// // // //   await supabase.from("reseller_customers").upsert(
// // // //     {
// // // //       reseller_id: reseller.id,
// // // //       email: user.email,
// // // //     },
// // // //     {
// // // //       onConflict: "reseller_id,email",
// // // //       ignoreDuplicates: false,
// // // //     },
// // // //   );

// // // //   revalidatePath(`/${input.storeName}`);
// // // //   revalidatePath("/dashboard");
// // // //   revalidatePath("/dashboard/orders");

// // // //   return {
// // // //     success: true,
// // // //     message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
// // // //     planName: lizzyResult.dataplan || plan.plan_name,
// // // //     amount: finalPrice,
// // // //     orderId: order?.id,
// // // //   };
// // // // }

// // // // // // app/actions/reseller/orders/purchasePlan.ts
// // // // // "use server";

// // // // // import { createServerClient } from "@/lib/supabase/server";
// // // // // import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
// // // // // import { revalidatePath } from "next/cache";

// // // // // interface PurchaseInput {
// // // // //   storeName: string;
// // // // //   planId: number;
// // // // //   phoneNumber: string;
// // // // //   transactionPin: string;
// // // // // }

// // // // // interface PurchaseResult {
// // // // //   success?: boolean;
// // // // //   error?: string;
// // // // //   message?: string;
// // // // //   planName?: string;
// // // // //   amount?: number;
// // // // //   orderId?: string;
// // // // // }

// // // // // const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// // // // // const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // // // // async function callLizzyDataProxy(payload: {
// // // // //   network: string;
// // // // //   phone: string;
// // // // //   data_plan: number;
// // // // //   "request-id": string;
// // // // // }) {
// // // // //   const response = await fetch(`${SUPABASE_URL}/functions/v1/lizzysub-proxy`, {
// // // // //     method: "POST",
// // // // //     headers: {
// // // // //       "Content-Type": "application/json",
// // // // //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// // // // //     },
// // // // //     body: JSON.stringify({
// // // // //       network: payload.network,
// // // // //       phone: payload.phone,
// // // // //       data_plan: payload.data_plan,
// // // // //       bypass: false,
// // // // //       "request-id": payload["request-id"],
// // // // //     }),
// // // // //   });

// // // // //   return response.json();
// // // // // }

// // // // // async function callLizzyAirtimeProxy(payload: {
// // // // //   network: string;
// // // // //   phone: string;
// // // // //   amount: number;
// // // // //   "request-id": string;
// // // // // }) {
// // // // //   const response = await fetch(`${SUPABASE_URL}/functions/v1/airtime_proxy`, {
// // // // //     method: "POST",
// // // // //     headers: {
// // // // //       "Content-Type": "application/json",
// // // // //       Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
// // // // //     },
// // // // //     body: JSON.stringify({
// // // // //       network: payload.network,
// // // // //       phone: payload.phone,
// // // // //       amount: payload.amount,
// // // // //       plan_type: "VTU",
// // // // //       bypass: false,
// // // // //       "request-id": payload["request-id"],
// // // // //     }),
// // // // //   });

// // // // //   return response.json();
// // // // // }

// // // // // export async function purchasePlan(
// // // // //   input: PurchaseInput,
// // // // // ): Promise<PurchaseResult> {
// // // // //   const supabase = await createServerClient();

// // // // //   // 1. Get the current user (must be logged in)
// // // // //   const {
// // // // //     data: { user },
// // // // //     error: authError,
// // // // //   } = await supabase.auth.getUser();

// // // // //   if (authError || !user) {
// // // // //     return {
// // // // //       success: false,
// // // // //       error: "You must be signed in to make a purchase",
// // // // //     };
// // // // //   }

// // // // //   // 2. Find the reseller
// // // // //   const { data: reseller, error: resellerError } = await supabase
// // // // //     .from("resellers")
// // // // //     .select("id, store_name")
// // // // //     .eq("store_name", input.storeName)
// // // // //     .eq("status", "active")
// // // // //     .single();

// // // // //   if (resellerError || !reseller) {
// // // // //     return { success: false, error: "Store not found or inactive" };
// // // // //   }

// // // // //   // 3. Check if user is the store owner (resellers can't buy from their own store)
// // // // //   const isOwner = user.user_metadata?.store_name === input.storeName;
// // // // //   // if (isOwner) {
// // // // //   //   return {
// // // // //   //     success: false,
// // // // //   //     error: "Store owners cannot purchase from their own store",
// // // // //   //   };
// // // // //   // }

// // // // //   // 4. Get the plan config with pricing
// // // // //   const { data: rawPlanConfig, error: planError } = await supabase
// // // // //     .from("reseller_plan_configs")
// // // // //     .select(
// // // // //       `
// // // // //       id, enabled, markup_type, markup_value,
// // // // //       plan:plan_id (id, plan_id, amount, plan_name, plan_type, network)
// // // // //     `,
// // // // //     )
// // // // //     .eq("reseller_id", reseller.id)
// // // // //     .eq("plan_id", input.planId)
// // // // //     .eq("enabled", true)
// // // // //     .single();

// // // // //   if (planError || !rawPlanConfig) {
// // // // //     return { success: false, error: "Plan not available" };
// // // // //   }

// // // // //   const planConfig = rawPlanConfig as any;
// // // // //   const plan = planConfig.plan;

// // // // //   if (!plan || typeof plan.amount !== "number") {
// // // // //     return { success: false, error: "Plan data not found" };
// // // // //   }

// // // // //   // 5. Calculate final price
// // // // //   const finalPrice = calculateResellerPrice(
// // // // //     plan.amount,
// // // // //     planConfig.markup_type,
// // // // //     planConfig.markup_value,
// // // // //   );
// // // // //   const profit = finalPrice - plan.amount;

// // // // //   // 6. Get or create customer wallet
// // // // //   let { data: customerWallet } = await supabase
// // // // //     .from("reseller_customer_wallets")
// // // // //     .select("id, balance")
// // // // //     .eq("reseller_id", reseller.id)
// // // // //     .eq("customer_id", user.id)
// // // // //     .maybeSingle();

// // // // //   if (!customerWallet) {
// // // // //     const { data: newWallet, error: createError } = await supabase
// // // // //       .from("reseller_customer_wallets")
// // // // //       .insert({
// // // // //         reseller_id: reseller.id,
// // // // //         customer_id: user.id,
// // // // //         balance: 0,
// // // // //         total_spent: 0,
// // // // //       })
// // // // //       .select("id, balance")
// // // // //       .single();

// // // // //     if (createError || !newWallet) {
// // // // //       return {
// // // // //         success: false,
// // // // //         error: "Failed to create wallet. Please try again.",
// // // // //       };
// // // // //     }
// // // // //     customerWallet = newWallet;
// // // // //   }

// // // // //   // 7. Check balance
// // // // //   if (customerWallet.balance < finalPrice) {
// // // // //     return {
// // // // //       success: false,
// // // // //       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
// // // // //     };
// // // // //   }

// // // // //   // 8. Verify transaction PIN
// // // // //   let storedPin: string | null = null;

// // // // //   // const isOwner = user.user_metadata?.store_name === input.storeName;

// // // // //   if (isOwner) {
// // // // //     // Reseller buying from their own store is already blocked above,
// // // // //     // but handle defensively anyway
// // // // //     const { data: resellerRecord } = await supabase
// // // // //       .from("resellers")
// // // // //       .select("transaction_pin")
// // // // //       .eq("auth_user_id", user.id)
// // // // //       .single();
// // // // //     storedPin = resellerRecord?.transaction_pin ?? null;
// // // // //   } else {
// // // // //     const { data: customerRecord } = await supabase
// // // // //       .from("reseller_customers")
// // // // //       .select("transaction_pin")
// // // // //       .eq("auth_user_id", user.id)
// // // // //       .eq("reseller_id", reseller.id)
// // // // //       .maybeSingle();
// // // // //     storedPin = customerRecord?.transaction_pin ?? null;
// // // // //   }
// // // // //   if (!storedPin) {
// // // // //     return {
// // // // //       success: false,
// // // // //       error: "No transaction PIN found. Please set your PIN and try again.",
// // // // //     };
// // // // //   }

// // // // //   if (input.transactionPin !== storedPin) {
// // // // //     return { success: false, error: "Invalid transaction PIN" };
// // // // //   }

// // // // //   // 9. Generate unique request ID
// // // // //   const requestId = `RSC_${plan.plan_type?.toUpperCase() || "PLAN"}_${Date.now()}_${Math.random()
// // // // //     .toString(36)
// // // // //     .substring(7)
// // // // //     .toUpperCase()}`;

// // // // //   // 10. Call Lizzysub API FIRST (before deducting wallet - same as original flow)
// // // // //   const isAirtime = plan.plan_type?.toLowerCase() === "airtime";

// // // // //   console.log("Calling Lizzysub:", {
// // // // //     planType: plan.plan_type,
// // // // //     network: plan.network,
// // // // //     phone: input.phoneNumber.slice(0, 4) + "***" + input.phoneNumber.slice(-4),
// // // // //     requestId,
// // // // //   });

// // // // //   let lizzyResult: any;

// // // // //   if (isAirtime) {
// // // // //     lizzyResult = await callLizzyAirtimeProxy({
// // // // //       network: plan.network,
// // // // //       phone: input.phoneNumber,
// // // // //       amount: plan.amount, // Base amount, not marked-up price
// // // // //       "request-id": requestId,
// // // // //     });
// // // // //   } else {
// // // // //     lizzyResult = await callLizzyDataProxy({
// // // // //       network: plan.network,
// // // // //       phone: input.phoneNumber,
// // // // //       data_plan: plan.plan_id,
// // // // //       "request-id": requestId,
// // // // //     });
// // // // //   }

// // // // //   console.log("Lizzysub response:", {
// // // // //     status: lizzyResult.status,
// // // // //     message: lizzyResult.message?.slice(0, 50),
// // // // //   });

// // // // //   // 11. Handle Lizzysub failure (same as original - record failed, don't deduct)
// // // // //   if (lizzyResult.status !== "success") {
// // // // //     let userErrorMessage =
// // // // //       lizzyResult.message || "Transaction failed. Please try again.";

// // // // //     // Check for specific provider balance error and make it generic
// // // // //     if (
// // // // //       userErrorMessage.includes("Insufficient Account") &&
// // // // //       userErrorMessage.includes("Wallet")
// // // // //     ) {
// // // // //       userErrorMessage =
// // // // //         "Service temporarily unavailable. Please try again later.";
// // // // //     }
// // // // //     if (
// // // // //       userErrorMessage.includes("Insufficient Account. Kindly Fund Your Wallet")
// // // // //     ) {
// // // // //       userErrorMessage =
// // // // //         "Service temporarily unavailable. Please try again later.";
// // // // //     }

// // // // //     // Create failed order record
// // // // //     await supabase.from("reseller_orders").insert({
// // // // //       reseller_id: reseller.id,
// // // // //       customer_email: user.email,
// // // // //       plan_id: input.planId,
// // // // //       amount: finalPrice,
// // // // //       profit,
// // // // //       status: "failed",
// // // // //       metadata: {
// // // // //         phone_number: input.phoneNumber,
// // // // //         customer_id: user.id,
// // // // //         request_id: requestId,
// // // // //         error_message: lizzyResult.message,
// // // // //         lizzy_result: lizzyResult,
// // // // //       },
// // // // //     });

// // // // //     return {
// // // // //       success: false,
// // // // //       error: userErrorMessage,
// // // // //     };
// // // // //   }

// // // // //   // 12. Lizzysub succeeded - NOW deduct from customer wallet
// // // // //   const newCustomerBalance = customerWallet.balance - finalPrice;
// // // // //   const { error: deductError } = await supabase
// // // // //     .from("reseller_customer_wallets")
// // // // //     .update({
// // // // //       balance: newCustomerBalance,
// // // // //     })
// // // // //     .eq("id", customerWallet.id);

// // // // //   if (deductError) {
// // // // //     console.error("Deduct error:", deductError);
// // // // //     // Critical: Lizzysub already delivered but we couldn't charge. Log this!
// // // // //     console.error("CRITICAL: delivered but deduction failed!", {
// // // // //       user: user.id,
// // // // //       amount: finalPrice,
// // // // //       requestId,
// // // // //     });
// // // // //     return {
// // // // //       success: false,
// // // // //       error:
// // // // //         "Failed to process payment. Please contact support with reference: " +
// // // // //         requestId,
// // // // //     };
// // // // //   }

// // // // //   // 13. Update customer total_spent
// // // // //   await supabase.rpc("increment_customer_spent", {
// // // // //     p_wallet_id: customerWallet.id,
// // // // //     p_amount: finalPrice,
// // // // //   });

// // // // //   // 14. Credit reseller wallet
// // // // //   const { error: creditError } = await supabase.rpc(
// // // // //     "update_wallet_after_sale",
// // // // //     {
// // // // //       p_reseller_id: reseller.id,
// // // // //       p_amount: finalPrice,
// // // // //       p_profit: profit,
// // // // //     },
// // // // //   );

// // // // //   if (creditError) {
// // // // //     console.error("Credit error:", creditError);
// // // // //     // Don't refund - Lizzysub already delivered. Log for manual fix.
// // // // //     console.error("CRITICAL: R-credit failed after delivery!", {
// // // // //       resellerId: reseller.id,
// // // // //       amount: finalPrice,
// // // // //       requestId,
// // // // //     });
// // // // //   }

// // // // //   // 15. Create completed order
// // // // //   const { data: order, error: orderError } = await supabase
// // // // //     .from("reseller_orders")
// // // // //     .insert({
// // // // //       reseller_id: reseller.id,
// // // // //       customer_email: user.email,
// // // // //       plan_id: input.planId,
// // // // //       amount: finalPrice,
// // // // //       profit,
// // // // //       status: "completed",
// // // // //       metadata: {
// // // // //         phone_number: input.phoneNumber,
// // // // //         customer_id: user.id,
// // // // //         request_id: requestId,
// // // // //         network: lizzyResult.network,
// // // // //         dataplan: lizzyResult.dataplan,
// // // // //         api_message: lizzyResult.message,
// // // // //         oldbal: lizzyResult.oldbal,
// // // // //         newbal: lizzyResult.newbal,
// // // // //         system: lizzyResult.system,
// // // // //         plan_type: lizzyResult.plan_type,
// // // // //         wallet_vending: lizzyResult.wallet_vending,
// // // // //       },
// // // // //     })
// // // // //     .select()
// // // // //     .single();

// // // // //   // 16. Record transaction
// // // // //   await supabase.from("reseller_transactions").insert({
// // // // //     reseller_id: reseller.id,
// // // // //     amount: finalPrice,
// // // // //     type: "purchase",
// // // // //     status: "completed",
// // // // //     reference: order?.id || requestId,
// // // // //     metadata: {
// // // // //       order_id: order?.id,
// // // // //       plan_id: input.planId,
// // // // //       plan_name: plan.plan_name,
// // // // //       customer_email: user.email,
// // // // //       phone_number: input.phoneNumber,
// // // // //       lizzy_ref: requestId,
// // // // //     },
// // // // //   });

// // // // //   // 17. Track customer
// // // // //   await supabase.from("reseller_customers").upsert(
// // // // //     {
// // // // //       reseller_id: reseller.id,
// // // // //       email: user.email,
// // // // //     },
// // // // //     {
// // // // //       onConflict: "reseller_id,email",
// // // // //       ignoreDuplicates: false,
// // // // //     },
// // // // //   );

// // // // //   revalidatePath(`/${input.storeName}`);
// // // // //   revalidatePath("/dashboard");
// // // // //   revalidatePath("/dashboard/orders");

// // // // //   return {
// // // // //     success: true,
// // // // //     message: lizzyResult.message || `${plan.plan_name} purchased successfully!`,
// // // // //     planName: lizzyResult.dataplan || plan.plan_name,
// // // // //     amount: finalPrice,
// // // // //     orderId: order?.id,
// // // // //   };
// // // // // }

// // // // // // // app/actions/reseller/orders/purchasePlan.ts
// // // // // // "use server";

// // // // // // import { createServerClient } from "@/lib/supabase/server";
// // // // // // import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
// // // // // // import { revalidatePath } from "next/cache";

// // // // // // interface PurchaseInput {
// // // // // //   storeName: string;
// // // // // //   planId: number;
// // // // // //   phoneNumber: string;
// // // // // //   transactionPin: string;
// // // // // // }

// // // // // // interface PurchaseResult {
// // // // // //   success?: boolean;
// // // // // //   error?: string;
// // // // // //   message?: string;
// // // // // //   planName?: string;
// // // // // //   amount?: number;
// // // // // //   orderId?: string;
// // // // // // }

// // // // // // export async function purchasePlan(
// // // // // //   input: PurchaseInput,
// // // // // // ): Promise<PurchaseResult> {
// // // // // //   const supabase = await createServerClient();

// // // // // //   // 1. Get the current user (must be logged in)
// // // // // //   const {
// // // // // //     data: { user },
// // // // // //     error: authError,
// // // // // //   } = await supabase.auth.getUser();

// // // // // //   if (authError || !user) {
// // // // // //     return {
// // // // // //       success: false,
// // // // // //       error: "You must be signed in to make a purchase",
// // // // // //     };
// // // // // //   }

// // // // // //   // 2. Find the reseller
// // // // // //   const { data: reseller, error: resellerError } = await supabase
// // // // // //     .from("resellers")
// // // // // //     .select("id, store_name")
// // // // // //     .eq("store_name", input.storeName)
// // // // // //     .eq("status", "active")
// // // // // //     .single();

// // // // // //   if (resellerError || !reseller) {
// // // // // //     return { success: false, error: "Store not found or inactive" };
// // // // // //   }

// // // // // //   // 3. Check if user is the store owner (resellers can't buy from their own store)
// // // // // //   const isOwner = user.user_metadata?.store_name === input.storeName;
// // // // // //   if (isOwner) {
// // // // // //     return {
// // // // // //       success: false,
// // // // // //       error: "Store owners cannot purchase from their own store",
// // // // // //     };
// // // // // //   }

// // // // // //   // 4. Get the plan config with pricing
// // // // // //   const { data: rawPlanConfig, error: planError } = await supabase
// // // // // //     .from("reseller_plan_configs")
// // // // // //     .select(
// // // // // //       `
// // // // // //       id, enabled, markup_type, markup_value,
// // // // // //       plan:plan_id (id, amount, plan_name, plan_type, network)
// // // // // //     `,
// // // // // //     )
// // // // // //     .eq("reseller_id", reseller.id)
// // // // // //     .eq("plan_id", input.planId)
// // // // // //     .eq("enabled", true)
// // // // // //     .single();

// // // // // //   if (planError || !rawPlanConfig) {
// // // // // //     return { success: false, error: "Plan not available" };
// // // // // //   }

// // // // // //   const planConfig = rawPlanConfig as any;
// // // // // //   const plan = planConfig.plan;

// // // // // //   if (!plan || typeof plan.amount !== "number") {
// // // // // //     return { success: false, error: "Plan data not found" };
// // // // // //   }

// // // // // //   // 5. Calculate final price
// // // // // //   const finalPrice = calculateResellerPrice(
// // // // // //     plan.amount,
// // // // // //     planConfig.markup_type,
// // // // // //     planConfig.markup_value,
// // // // // //   );
// // // // // //   const profit = finalPrice - plan.amount;

// // // // // //   // 6. Get or create customer wallet
// // // // // //   let { data: customerWallet } = await supabase
// // // // // //     .from("reseller_customer_wallets")
// // // // // //     .select("id, balance")
// // // // // //     .eq("reseller_id", reseller.id)
// // // // // //     .eq("customer_id", user.id)
// // // // // //     .maybeSingle();

// // // // // //   if (!customerWallet) {
// // // // // //     // Create wallet for customer
// // // // // //     const { data: newWallet, error: createError } = await supabase
// // // // // //       .from("reseller_customer_wallets")
// // // // // //       .insert({
// // // // // //         reseller_id: reseller.id,
// // // // // //         customer_id: user.id,
// // // // // //         balance: 0,
// // // // // //         total_spent: 0,
// // // // // //       })
// // // // // //       .select("id, balance")
// // // // // //       .single();

// // // // // //     if (createError || !newWallet) {
// // // // // //       return {
// // // // // //         success: false,
// // // // // //         error: "Failed to create wallet. Please try again.",
// // // // // //       };
// // // // // //     }
// // // // // //     customerWallet = newWallet;
// // // // // //   }

// // // // // //   // 7. Check balance
// // // // // //   if (customerWallet.balance < finalPrice) {
// // // // // //     return {
// // // // // //       success: false,
// // // // // //       error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
// // // // // //     };
// // // // // //   }

// // // // // //   // 8. Verify transaction PIN
// // // // // //   const { data: profile, error: profileError } = await supabase
// // // // // //     .from("profiles")
// // // // // //     .select("transaction_pin")
// // // // // //     .eq("id", user.id)
// // // // // //     .single();

// // // // // //   if (profileError || !profile?.transaction_pin) {
// // // // // //     return {
// // // // // //       success: false,
// // // // // //       error: "Please set a transaction PIN in your account settings first",
// // // // // //     };
// // // // // //   }

// // // // // //   if (input.transactionPin !== profile.transaction_pin) {
// // // // // //     return { success: false, error: "Invalid transaction PIN" };
// // // // // //   }

// // // // // //   // 9. Deduct from customer wallet
// // // // // //   const { error: deductError } = await supabase
// // // // // //     .from("reseller_customer_wallets")
// // // // // //     .update({
// // // // // //       balance: customerWallet.balance - finalPrice,
// // // // // //     })
// // // // // //     .eq("id", customerWallet.id);

// // // // // //   if (deductError) {
// // // // // //     console.error("Deduct error:", deductError);
// // // // // //     return { success: false, error: "Failed to process payment" };
// // // // // //   }

// // // // // //   // 10. Update customer total_spent
// // // // // //   await supabase.rpc("increment_customer_spent", {
// // // // // //     p_wallet_id: customerWallet.id,
// // // // // //     p_amount: finalPrice,
// // // // // //   });

// // // // // //   // 11. Credit reseller wallet
// // // // // //   const { error: creditError } = await supabase.rpc(
// // // // // //     "update_wallet_after_sale",
// // // // // //     {
// // // // // //       p_reseller_id: reseller.id,
// // // // // //       p_amount: finalPrice,
// // // // // //       p_profit: profit,
// // // // // //     },
// // // // // //   );

// // // // // //   if (creditError) {
// // // // // //     console.error("Credit error:", creditError);
// // // // // //     // Refund customer
// // // // // //     await supabase
// // // // // //       .from("reseller_customer_wallets")
// // // // // //       .update({ balance: customerWallet.balance })
// // // // // //       .eq("id", customerWallet.id);
// // // // // //     return {
// // // // // //       success: false,
// // // // // //       error: "Failed to process payment. Amount refunded.",
// // // // // //     };
// // // // // //   }

// // // // // //   // 12. Create the order
// // // // // //   const { data: order, error: orderError } = await supabase
// // // // // //     .from("reseller_orders")
// // // // // //     .insert({
// // // // // //       reseller_id: reseller.id,
// // // // // //       customer_email: user.email,
// // // // // //       plan_id: input.planId,
// // // // // //       amount: finalPrice,
// // // // // //       profit,
// // // // // //       status: "completed",
// // // // // //       metadata: {
// // // // // //         phone_number: input.phoneNumber,
// // // // // //         customer_id: user.id,
// // // // // //       },
// // // // // //     })
// // // // // //     .select()
// // // // // //     .single();

// // // // // //   if (orderError) {
// // // // // //     console.error("Order error:", orderError);
// // // // // //   }

// // // // // //   // 13. Record transaction
// // // // // //   await supabase.from("reseller_transactions").insert({
// // // // // //     reseller_id: reseller.id,
// // // // // //     amount: finalPrice,
// // // // // //     type: "purchase",
// // // // // //     status: "completed",
// // // // // //     reference: order?.id || `PUR-${Date.now()}`,
// // // // // //     metadata: {
// // // // // //       order_id: order?.id,
// // // // // //       plan_id: input.planId,
// // // // // //       plan_name: plan.plan_name,
// // // // // //       customer_email: user.email,
// // // // // //       phone_number: input.phoneNumber,
// // // // // //     },
// // // // // //   });

// // // // // //   // 14. Track customer
// // // // // //   await supabase.from("reseller_customers").upsert(
// // // // // //     {
// // // // // //       reseller_id: reseller.id,
// // // // // //       email: user.email,
// // // // // //     },
// // // // // //     {
// // // // // //       onConflict: "reseller_id,email",
// // // // // //       ignoreDuplicates: false,
// // // // // //     },
// // // // // //   );

// // // // // //   revalidatePath(`/${input.storeName}`);
// // // // // //   revalidatePath("/dashboard");
// // // // // //   revalidatePath("/dashboard/orders");

// // // // // //   return {
// // // // // //     success: true,
// // // // // //     message: `${plan.plan_name} purchased successfully for ${input.phoneNumber}!`,
// // // // // //     planName: plan.plan_name,
// // // // // //     amount: finalPrice,
// // // // // //     orderId: order?.id,
// // // // // //   };
// // // // // // }
