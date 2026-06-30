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