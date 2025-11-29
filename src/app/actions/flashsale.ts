// app/actions/flashsale.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetch Flash Sale Plans from Supabase
 */
export async function getFlashSalePlansAction(networkName?: string) {
  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("lizzy_flashsale")
      .select("*")
      .eq("isflashsale", true);

    if (networkName) {
      query = query.ilike("network", networkName);
    }

    const { data, error } = await query.order("amount", { ascending: true });

    if (error) {
      console.error("Flash sale plans fetch error:", error);
      return { error: "Failed to fetch flash sale plans", plans: [] };
    }

    return { success: true, plans: data || [] };
  } catch (error) {
    console.error("Get flash sale plans error:", error);
    return { error: "Something went wrong", plans: [] };
  }
}

/**
 * Check if Flash Sale is Currently Active
 */
export async function isFlashSaleActiveAction() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Flash sale runs Friday to Sunday
    const isActive = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

    return { success: true, isActive };
  } catch (error) {
    console.error("Check flash sale status error:", error);
    return { error: "Failed to check flash sale status", isActive: false };
  }
}

/**
 * Purchase Flash Sale Data Plan (No PIN Required)
 */
export async function purchaseFlashSaleAction(formData: {
  planid: number;
  network: string;
  phone: string;
  planName: string;
  amount: number;
  validity: string;
  pin: string;
}) {
  try {
    const supabase = await createServerClient();

    // 1. Check if flash sale is active
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isActive = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

    if (!isActive) {
      return { error: "Flash sale is not currently active" };
    }

    // 2. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // 3. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { error: "Profile not found" };
    }

    // 4. Check if plan is still available
    const { data: flashPlan, error: planError } = await supabase
      .from("lizzy_flashsale")
      .select("*")
      .eq("planid", formData.planid)
      .eq("isflashsale", true)
      .single();

    if (planError || !flashPlan) {
      return { error: "Flash sale plan not found" };
    }

    const stockLeft = flashPlan.stock_available - flashPlan.stock_sold;
    if (stockLeft <= 0) {
      return { error: "This plan is sold out" };
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
    if (currentBalance < formData.amount) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${formData.amount.toLocaleString()}`,
      };
    }

    // 6. Map network to Lizzysub ID
    const networkMapping: { [key: string]: number } = {
      MTN: 1,
      AIRTEL: 2,
      GLO: 3,
      "9MOBILE": 4,
    };

    const networkId = networkMapping[formData.network.toUpperCase()];
    if (!networkId) {
      return { error: "Invalid network" };
    }

    // 7. Generate unique request ID
    const requestId = `EDGESN_FLASH_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 8. Call Lizzysub API
    const lizzysubPayload = {
      network: networkId,
      phone: formData.phone,
      data_plan: formData.planid,
      bypass: false,
      "request-id": requestId,
    };

    console.log("Calling Lizzysub API (Flash Sale):", {
      ...lizzysubPayload,
      phone: formData.phone.slice(0, 4) + "***" + formData.phone.slice(-4),
    });

    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/lizzysub-proxy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(lizzysubPayload),
      }
    );

    const lizzysubData = await lizzysubResponse.json();

    console.log("Lizzysub response (Flash Sale):", {
      status: lizzysubData.status,
      message: lizzysubData.message?.slice(0, 50),
    });

    // 9. Handle API response
    if (lizzysubData.status !== "success") {
      await supabase.from("transactions").insert({
        user_email: profile.email,
        amount: formData.amount,
        reference: requestId,
        status: "failed",
        type: "flash_sale_purchase",
        env: "live",
        metadata: {
          network: formData.network,
          phone_number: formData.phone,
          plan_name: formData.planName,
          validity: formData.validity,
          error_message: lizzysubData.message,
          planid: formData.planid,
          is_flash_sale: true,
        },
      });

      return {
        error: lizzysubData.message || "Transaction failed. Please try again.",
      };
    }

    // 10. Deduct from wallet
    const newBalance = currentBalance - formData.amount;
    const { error: balanceError } = await supabase
      .from("wallet")
      .update({ balance: newBalance })
      .eq("user_email", profile.email);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return { error: "Failed to update wallet balance" };
    }

    // 11. Update stock sold
    // await supabase
    //   .from("lizzy_flashsale")
    //   .update({ stock_sold: flashPlan.stock_sold + 1 })
    //   .eq("planid", formData.planid);

    // 12. Create successful transaction record
    await supabase.from("transactions").insert({
      user_email: profile.email,
      amount: formData.amount,
      reference: requestId,
      status: "completed",
      type: "flash_sale_purchase",
      env: "live",
      metadata: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number,
        plan_name: formData.planName,
        dataplan: lizzysubData.dataplan,
        validity: formData.validity,
        system: lizzysubData.system,
        plan_type: lizzysubData.plan_type,
        oldbal: lizzysubData.oldbal,
        newbal: lizzysubData.newbal,
        api_message: lizzysubData.message,
        planid: formData.planid,
        is_flash_sale: true,
        discount_saved: flashPlan.oldprice
          ? (flashPlan.oldprice - formData.amount).toFixed(2)
          : null,
      },
    });

    // 13. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "flash_sale_purchase",
      message: `🔥 Flash Sale: Successfully purchased ${
        lizzysubData.dataplan || formData.planName
      } for ${formData.phone}`,
      is_read: false,
      metadata: {
        network: lizzysubData.network,
        phone: formData.phone,
        amount: formData.amount,
        plan: lizzysubData.dataplan,
        reference: requestId,
        is_flash_sale: true,
      },
    });

    // 14. Revalidate pages
    revalidatePath("/flashsale");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: `🔥 ${lizzysubData.message}`,
      data: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number,
        dataplan: lizzysubData.dataplan,
        amount: formData.amount,
        newBalance: newBalance,
        reference: requestId,
      },
    };
  } catch (error) {
    console.error("Purchase flash sale error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Get User Wallet Balance
 */
export async function getWalletBalanceForFlashSaleAction() {
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
