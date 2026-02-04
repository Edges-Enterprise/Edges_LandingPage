// app/actions/airtime.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Purchase Airtime via Lizzysub API
 */
export async function purchaseAirtimeAction(formData: {
  network: string;
  phone: string;
  amount: number;
  pin: string;
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

    // 4. Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();

    if (walletError || !wallet) {
      return { error: "Wallet not found. Please fund your wallet first." };
    }

    const currentBalance = parseFloat(wallet.balance || "0");
    const discountedAmount = Math.floor(formData.amount * 0.99); // 1% discount
    if (currentBalance < discountedAmount) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${discountedAmount.toLocaleString()}`,
      };
    }

    // 5. Generate unique request ID
    const requestId = `EDGESN_AIRTIME_WEB_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 6. Call Lizzysub API via Supabase Edge Function
    const lizzysubPayload = {
      network: formData.network,
      phone: formData.phone,
      amount: formData.amount, // Full amount to Lizzysub
      plan_type: "VTU",
      bypass: false,
      "request-id": requestId,
    };

    console.log("Calling Lizzysub Edge Function:", {
      ...lizzysubPayload,
      phone: formData.phone.slice(0, 4) + "***" + formData.phone.slice(-4),
    });

    // Call via Supabase Edge Function (token is handled server-side)
    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/airtime_proxy",
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

    // 7. Handle API response
    // if (lizzysubData.status !== "success") {
    //   // Create failed transaction record
    //   await supabase.from("transactions").insert({
    //     user_email: profile.email,
    //     amount: discountedAmount,
    //     reference: requestId,
    //     status: "failed",
    //     type: "airtime_purchase",
    //     env: "live",
    //     metadata: {
    //       network: lizzysubData.network || "Unknown",
    //       phone_number: formData.phone,
    //       airtime_amount: formData.amount,
    //       charged_amount: discountedAmount,
    //       error_message: lizzysubData.message,
    //       provider: "lizzysub",
    //     },
    //   });

    //   return {
    //     error: lizzysubData.message || "Transaction failed. Please try again.",
    //   };
    // }

    // 7. Handle API response
    if (lizzysubData.status !== "success") {
      let userErrorMessage =
        lizzysubData.message || "Transaction failed. Please try again.";

      // Check for specific provider balance error and make it generic
      if (
        userErrorMessage.includes(
          "Insufficient Account Kindly Fund Your Wallet",
        )
      ) {
        userErrorMessage =
          "Service temporarily unavailable. Please try again later.";
      }

      // Create failed transaction record
      await supabase.from("transactions").insert({
        user_email: profile.email,
        amount: discountedAmount,
        reference: requestId,
        status: "failed",
        type: "airtime_purchase",
        env: "live",
        metadata: {
          network: lizzysubData.network || "Unknown",
          phone_number: formData.phone,
          airtime_amount: formData.amount,
          charged_amount: discountedAmount,
          error_message: lizzysubData.message, // Keep full original message in metadata for internal logging
          provider: "lizzysub",
        },
      });

      return {
        error: userErrorMessage,
      };
    }

    // 8. Deduct from wallet (discounted amount)
    const newBalance = currentBalance - discountedAmount;
    const { error: balanceError } = await supabase
      .from("wallet")
      .update({ balance: newBalance })
      .eq("user_email", profile.email);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return { error: "Failed to update wallet balance" };
    }

    // 9. Create successful transaction record
    await supabase.from("transactions").insert({
      user_email: profile.email,
      amount: -discountedAmount, // Negative for outflow
      reference: requestId,
      status: "completed",
      type: "airtime_purchase",
      env: "live",
      metadata: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number || formData.phone,
        airtime_amount: formData.amount,
        charged_amount: discountedAmount,
        api_message: lizzysubData.message,
        provider: "lizzysub",
        oldbal: lizzysubData.oldbal,
        newbal: lizzysubData.newbal,
        wallet_vending: lizzysubData.wallet_vending,
      },
    });

    // 10. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "airtime_purchase",
      message: `Successfully purchased ₦${formData.amount.toLocaleString()} airtime for ${
        formData.phone
      }. Charged: ₦${discountedAmount.toLocaleString()}`,
      is_read: false,
      metadata: {
        network: lizzysubData.network,
        phone: formData.phone,
        amount: formData.amount,
        charged: discountedAmount,
        reference: requestId,
      },
    });

    // 11. Revalidate pages
    revalidatePath("/airtime");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: lizzysubData.message,
      data: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number || formData.phone,
        airtime_amount: formData.amount,
        charged_amount: discountedAmount,
        newBalance: newBalance,
        reference: requestId,
      },
    };
  } catch (error) {
    console.error("Purchase airtime error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Get User Wallet Balance for Airtime Page
 */
export async function getWalletBalanceForAirtimeAction() {
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

