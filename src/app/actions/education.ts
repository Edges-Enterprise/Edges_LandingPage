// app/actions/education.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Purchase Exam Pins via Lizzysub API
 */
export async function purchaseExamPinsAction(formData: {
  exam: number;
  quantity: number;
  pin: string;
  totalAmount: number;
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
    if (currentBalance < formData.totalAmount) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${formData.totalAmount.toLocaleString()}`,
      };
    }

    // 5. Generate unique request ID
    const requestId = `EDGESN_EXAM_WEB_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 6. Call Lizzysub API via Supabase Edge Function
    const lizzysubPayload = {
      exam: formData.exam,
      quantity: formData.quantity,
    };

    console.log("Calling Lizzysub Edge Function:", lizzysubPayload);

    // Call via Supabase Edge Function (token is handled server-side)
    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/exam-proxy",
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

    console.log("Lizzysub response:", {
      status: lizzysubData.status,
      message: lizzysubData.message?.slice(0, 50),
    });

    // 7. Handle API response
    if (lizzysubData.status !== "success") {
      // Create failed transaction record
      await supabase.from("transactions").insert({
        user_email: profile.email,
        amount: formData.totalAmount,
        reference: requestId,
        status: "failed",
        type: "exam_purchase",
        env: "live",
        metadata: {
          exam_id: formData.exam,
          quantity: formData.quantity,
          total_amount: formData.totalAmount,
          error_message: lizzysubData.message,
          provider: "lizzysub",
        },
      });

      return {
        error: lizzysubData.message || "Transaction failed. Please try again.",
      };
    }

    // 8. Deduct from wallet
    const newBalance = currentBalance - formData.totalAmount;
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
      amount: -formData.totalAmount, // Negative for outflow
      reference: requestId,
      status: "completed",
      type: "exam_purchase",
      env: "live",
      metadata: {
        exam_id: formData.exam,
        quantity: formData.quantity,
        total_amount: formData.totalAmount,
        pins: lizzysubData.pins || [], // Assume response has pins array
        api_message: lizzysubData.message,
        provider: "lizzysub",
      },
    });

    // 10. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "exam_purchase", // Or use "data_purchase" if schema restricts
      message: `Successfully purchased ${
        formData.quantity
      } exam pins for ₦${formData.totalAmount.toLocaleString()}. Check your email or history for pins.`,
      is_read: false,
      metadata: {
        exam_id: formData.exam,
        quantity: formData.quantity,
        total_amount: formData.totalAmount,
        pins: lizzysubData.pins || [],
        reference: requestId,
      },
    });

    // 11. Revalidate pages
    revalidatePath("/education");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: lizzysubData.message,
      data: {
        exam_id: formData.exam,
        quantity: formData.quantity,
        total_amount: formData.totalAmount,
        pins: lizzysubData.pins || [],
        newBalance: newBalance,
        reference: requestId,
      },
    };
  } catch (error) {
    console.error("Purchase exam pins error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Get User Wallet Balance for Education Page
 */
export async function getWalletBalanceForEducationAction() {
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
