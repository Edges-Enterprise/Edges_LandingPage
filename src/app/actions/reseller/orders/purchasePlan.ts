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

  // 3. Check if user is the store owner (resellers can't buy from their own store)
  const isOwner = user.user_metadata?.store_name === input.storeName;
  if (isOwner) {
    return {
      success: false,
      error: "Store owners cannot purchase from their own store",
    };
  }

  // 4. Get the plan config with pricing
  const { data: rawPlanConfig, error: planError } = await supabase
    .from("reseller_plan_configs")
    .select(
      `
      id, enabled, markup_type, markup_value,
      plan:plan_id (id, amount, plan_name, plan_type, network)
    `,
    )
    .eq("reseller_id", reseller.id)
    .eq("plan_id", input.planId)
    .eq("enabled", true)
    .single();

  if (planError || !rawPlanConfig) {
    return { success: false, error: "Plan not available" };
  }

  const planConfig = rawPlanConfig as any;
  const plan = planConfig.plan;

  if (!plan || typeof plan.amount !== "number") {
    return { success: false, error: "Plan data not found" };
  }

  // 5. Calculate final price
  const finalPrice = calculateResellerPrice(
    plan.amount,
    planConfig.markup_type,
    planConfig.markup_value,
  );
  const profit = finalPrice - plan.amount;

  // 6. Get or create customer wallet
  let { data: customerWallet } = await supabase
    .from("reseller_customer_wallets")
    .select("id, balance")
    .eq("reseller_id", reseller.id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!customerWallet) {
    // Create wallet for customer
    const { data: newWallet, error: createError } = await supabase
      .from("reseller_customer_wallets")
      .insert({
        reseller_id: reseller.id,
        customer_id: user.id,
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

  // 7. Check balance
  if (customerWallet.balance < finalPrice) {
    return {
      success: false,
      error: `Insufficient balance. You need ₦${finalPrice.toLocaleString()} but have ₦${customerWallet.balance.toLocaleString()}`,
    };
  }

  // 8. Verify transaction PIN
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("transaction_pin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.transaction_pin) {
    return {
      success: false,
      error: "Please set a transaction PIN in your account settings first",
    };
  }

  if (input.transactionPin !== profile.transaction_pin) {
    return { success: false, error: "Invalid transaction PIN" };
  }

  // 9. Deduct from customer wallet
  const { error: deductError } = await supabase
    .from("reseller_customer_wallets")
    .update({
      balance: customerWallet.balance - finalPrice,
    })
    .eq("id", customerWallet.id);

  if (deductError) {
    console.error("Deduct error:", deductError);
    return { success: false, error: "Failed to process payment" };
  }

  // 10. Update customer total_spent
  await supabase.rpc("increment_customer_spent", {
    p_wallet_id: customerWallet.id,
    p_amount: finalPrice,
  });

  // 11. Credit reseller wallet
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
    // Refund customer
    await supabase
      .from("reseller_customer_wallets")
      .update({ balance: customerWallet.balance })
      .eq("id", customerWallet.id);
    return {
      success: false,
      error: "Failed to process payment. Amount refunded.",
    };
  }

  // 12. Create the order
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
      },
    })
    .select()
    .single();

  if (orderError) {
    console.error("Order error:", orderError);
  }

  // 13. Record transaction
  await supabase.from("reseller_transactions").insert({
    reseller_id: reseller.id,
    amount: finalPrice,
    type: "purchase",
    status: "completed",
    reference: order?.id || `PUR-${Date.now()}`,
    metadata: {
      order_id: order?.id,
      plan_id: input.planId,
      plan_name: plan.plan_name,
      customer_email: user.email,
      phone_number: input.phoneNumber,
    },
  });

  // 14. Track customer
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
    message: `${plan.plan_name} purchased successfully for ${input.phoneNumber}!`,
    planName: plan.plan_name,
    amount: finalPrice,
    orderId: order?.id,
  };
}
