// app/actions/data.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetch Hot Deals from Supabase
 */
export async function getHotDealsAction(networkName: string) {
  try {
    const supabase = await createServerClient();

    // Hot deals table uses plan_type field (not category)
    const { data, error } = await supabase
      .from("hot_deals")
      .select("id,data,price,validity,category,description,plan_type")
      .ilike("plan_type", networkName) // MTN, AIRTEL, GLO, 9MOBILE
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("Hot deals fetch error:", error);
      return { error: "Failed to fetch hot deals", plans: [] };
    }

    return { success: true, plans: data || [] };
  } catch (error) {
    console.error("Get hot deals error:", error);
    return { error: "Something went wrong", plans: [] };
  }
}

/**
 * Fetch Data Plans from Lizzysub Table
 */
export async function getDataPlansAction(
  networkName: string,
  category?: string,
) {
  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("lizzy")
      .select(
        "plan_id,network,plan_type,plan_network,validity,plan,plan_amount,sell_price",
      )
      .ilike("network", networkName); // Case-insensitive match

    const { data, error } = await query.order("plan_amount", {
      ascending: true,
    });

    if (error) {
      console.error("Data plans fetch error:", error);
      return { error: "Failed to fetch data plans", plans: [] };
    }

    return { success: true, plans: data || [] };
  } catch (error) {
    console.error("Get data plans error:", error);
    return { error: "Something went wrong", plans: [] };
  }
}



/**
 * Get User Wallet Balance for Data Page
 */
export async function getWalletBalanceForDataAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", balance: 0 };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { error: "Profile not found", balance: 0 };
    }

    const { data: wallet } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();

    return {
      success: true,
      balance: parseFloat(wallet?.balance || "0"),
    };
  } catch (error) {
    console.error("Get wallet balance error:", error);
    return { error: "Failed to fetch balance", balance: 0 };
  }
}

/**
 * Check if user has transaction PIN
 */
export async function checkTransactionPinAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", hasPin: false };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("transaction_pin")
      .eq("id", user.id)
      .single();

    const hasPin = !!(
      profile?.transaction_pin && profile.transaction_pin.trim() !== ""
    );

    return { success: true, hasPin };
  } catch (error) {
    console.error("Check PIN error:", error);
    return { error: "Failed to check PIN", hasPin: false };
  }
}

/**
 * Purchase Data via Lizzysub API
 */
export async function purchaseDataAction(formData: {
  phone: string;
  data_plan: number;
  pin: string;
  /** Card the user bought from. Hot deals are priced separately. */
  source?: "data" | "hot";
}) {
  try {
    const supabase = await createServerClient();

    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // 2. Get user profile and email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, transaction_pin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { error: "Profile not found" };
    }

    // 3. Verify PIN
    if (!profile.transaction_pin) {
      return { error: "Please create a transaction PIN first" };
    }

    if (formData.pin !== profile.transaction_pin) {
      return { error: "Incorrect transaction PIN" };
    }

    // 4. Resolve the plan. The lizzy row decides whether the plan exists and
    // which network it settles on. The price comes from the card the user is
    // looking at, never from the caller: anything the browser sends can be
    // forged.
    const { data: plan, error: planError } = await supabase
      .from("lizzy")
      .select("plan_id,network,plan_network,plan,validity,plan_amount,sell_price")
      .eq("plan_id", formData.data_plan)
      .single();

    if (planError || !plan) {
      return { error: "This plan is no longer available. Please refresh." };
    }

    // hot_deals.id is the Lizzysub plan id, so one plan can be sold from two
    // cards at two prices. A hot deal charges the price printed on the card.
    let price = Number(plan.sell_price ?? plan.plan_amount);
    let planName = plan.plan;
    let planValidity = plan.validity;

    if (formData.source === "hot") {
      const { data: deal, error: dealError } = await supabase
        .from("hot_deals")
        .select("data,validity,price")
        .eq("id", formData.data_plan)
        .eq("is_active", true)
        .single();

      if (dealError || !deal) {
        return { error: "This deal is no longer available. Please refresh." };
      }

      price = Number(deal.price);
      planName = deal.data ?? planName;
      planValidity = deal.validity ?? planValidity;
    }

    if (!(price > 0)) {
      return { error: "This plan is no longer available. Please refresh." };
    }

    // 5. Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();

    if (walletError || !wallet) {
      return { error: "Wallet not found. Please fund your wallet first." };
    }

    const currentBalance = parseFloat(wallet.balance || "0");
    if (currentBalance < price) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${price.toLocaleString()}`,
      };
    }

    // 6. Generate unique request ID
    const requestId = `EDGESN_DATA_WEB_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 7. Call Lizzysub API via Supabase Edge Function
    const lizzysubPayload = {
      network: Number(plan.plan_network),
      phone: formData.phone,
      data_plan: plan.plan_id,
      bypass: false,
      "request-id": requestId,
    };

    console.log("Calling Lizzysub Edge Function:", {
      ...lizzysubPayload,
      phone: formData.phone.slice(0, 4) + "***" + formData.phone.slice(-4),
    });

    // Call via Supabase Edge Function (token is handled server-side)
    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/lizzysub-proxy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(lizzysubPayload),
      },
    );

    const lizzysubData = await lizzysubResponse.json();

    console.log("Lizzysub response:", {
      status: lizzysubData.status,
      message: lizzysubData.message?.slice(0, 50),
    });

    // 8. Handle API response
     if (lizzysubData.status !== "success") {
       let userErrorMessage =
         lizzysubData.message || "Transaction failed. Please try again.";

       // Check for specific provider balance error and make it generic
       if (
         userErrorMessage.includes("Insufficient Account") &&
         userErrorMessage.includes("Wallet")
       ) {
         userErrorMessage =
           "Service temporarily unavailable. Please try again later.";
       }
       // Create failed transaction record
       await supabase.from("transactions").insert({
         user_email: profile.email,
         amount: price,
         reference: requestId,
         status: "failed",
         type: "data_purchase",
         env: "live",
         metadata: {
           network: lizzysubData.network || "Unknown",
           phone_number: formData.phone,
           plan_name: planName,
           validity: planValidity,
           source: formData.source ?? "data",
           error_message: lizzysubData.message,
           lizzysub_plan_id: formData.data_plan,
         },
       });

       return {
         error: userErrorMessage,
       };
     }

    // 9. Deduct from wallet
    const newBalance = currentBalance - price;
    const { error: balanceError } = await supabase
      .from("wallet")
      .update({ balance: newBalance })
      .eq("user_email", profile.email);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return { error: "Failed to update wallet balance" };
    }

    // 10. Create successful transaction record
    await supabase.from("transactions").insert({
      user_email: profile.email,
      amount: price,
      reference: requestId,
      status: "completed",
      type: "data_purchase",
      env: "live",
      metadata: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number,
        plan_name: planName,
        dataplan: lizzysubData.dataplan,
        validity: planValidity,
        source: formData.source ?? "data",
        system: lizzysubData.system,
        plan_type: lizzysubData.plan_type,
        oldbal: lizzysubData.oldbal,
        newbal: lizzysubData.newbal,
        api_message: lizzysubData.message,
        lizzysub_plan_id: formData.data_plan,
        wallet_vending: lizzysubData.wallet_vending,
      },
    });

    // 11. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "data_purchase",
      message: `Successfully purchased ${
        lizzysubData.dataplan || planName
      } for ${formData.phone}`,
      is_read: false,
      metadata: {
        network: lizzysubData.network,
        phone: formData.phone,
        amount: price,
        plan: lizzysubData.dataplan,
        reference: requestId,
      },
    });

    // 12. Revalidate pages
    revalidatePath("/data");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: lizzysubData.message,
      data: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number,
        dataplan: lizzysubData.dataplan,
        amount: price,
        newBalance: newBalance,
        reference: requestId,
      },
    };
  } catch (error) {
    console.error("Purchase data error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

