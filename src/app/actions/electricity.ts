// app/actions/electricity.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Validate Meter Number via Lizzysub API
 */
export async function validateMeterAction(
  meterNumber: string,
  disco: number,
  meterType: string
) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    console.log(
      `Validating Meter: ${meterNumber} for Disco ID: ${disco}, Type: ${meterType}`
    );

    // Call Supabase Edge Function for meter validation
    const response = await fetch(
      `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/electric-validation?meter_number=${meterNumber}&disco=${disco}&meter_type=${meterType}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("Meter validation response:", data);

    // Lizzysub returns "name" field for customer name
    if (data.status === "success" && data.name) {
      return {
        success: true,
        customerName: data.name,
        message: "Meter verified successfully",
      };
    } else {
      return {
        success: false,
        error: data.message || "Invalid meter number",
      };
    }
  } catch (error) {
    console.error("Meter validation error:", error);
    return { error: "Failed to validate meter. Please try again." };
  }
}

/**
 * Purchase Electricity Bill via Lizzysub API
 */
export async function purchaseElectricityAction(formData: {
  provider: string;
  discoId: number;
  meterNumber: string;
  meterType: string;
  amount: number;
  pin: string;
  bypass: boolean;
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

    // 2. Get user profile
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
    if (currentBalance < formData.amount) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${formData.amount.toLocaleString()}`,
      };
    }

    // 5. Generate unique request ID
    const requestId = `EDGESN_ELECTRICBILL_WEB_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 6. Call Lizzysub API via Supabase Edge Function
    const lizzysubPayload = {
      disco: formData.discoId,
      meter_type: formData.meterType,
      meter_number: formData.meterNumber,
      amount: formData.amount,
      bypass: formData.bypass,
      "request-id": requestId,
    };

    console.log("Calling Lizzysub Electricity API:", {
      ...lizzysubPayload,
      meter_number:
        formData.meterNumber.slice(0, 4) +
        "***" +
        formData.meterNumber.slice(-4),
    });

    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/electric-proxy",
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

    console.log("Lizzysub electricity response:", {
      status: lizzysubData.status,
      message: lizzysubData.message?.slice(0, 50),
    });

    // 7. Handle API response
    if (lizzysubData.status !== "success") {
      // Create failed transaction record
      await supabase.from("transactions").insert({
        user_email: profile.email,
        amount: formData.amount,
        reference: requestId,
        status: "failed",
        type: "electricity_purchase",
        env: "live",
        metadata: {
          provider: formData.provider,
          disco_id: formData.discoId,
          meter_number: formData.meterNumber,
          meter_type: formData.meterType,
          amount: formData.amount,
          error_message: lizzysubData.message,
          api_provider: "lizzysub",
        },
      });

      return {
        error: lizzysubData.message || "Transaction failed. Please try again.",
      };
    }

    // 8. Deduct from wallet
    const newBalance = currentBalance - formData.amount;
    const { error: balanceError } = await supabase
      .from("wallet")
      .update({ balance: newBalance })
      .eq("user_email", profile.email);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return { error: "Failed to update wallet balance" };
    }

    // 9. Create successful transaction record
    const { data: transaction } = await supabase
      .from("transactions")
      .insert({
        user_email: profile.email,
        amount: -formData.amount, // Negative for outflow
        reference: requestId,
        status: "completed",
        type: "electricity_purchase",
        env: "live",
        metadata: {
          provider: formData.provider,
          disco_id: formData.discoId,
          disco_name: lizzysubData.disco_name,
          meter_number: formData.meterNumber,
          meter_type: formData.meterType,
          amount: formData.amount,
          charges: lizzysubData.charges,
          token: lizzysubData.token || null,
          api_message: lizzysubData.message,
          api_provider: "lizzysub",
        },
      })
      .select()
      .single();

    // 10. Create electricity_purchases record (for specific tracking)
    await supabase.from("electricity_purchases").insert({
      user_id: user.id,
      provider: formData.provider,
      meter_number: formData.meterNumber,
      meter_type: formData.meterType,
      amount: formData.amount,
      token: lizzysubData.token || null,
    });

    // 11. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "electricity_purchase",
      message: `Successfully purchased ₦${formData.amount.toLocaleString()} electricity for ${
        formData.meterNumber
      }. ${lizzysubData.token ? `Token: ${lizzysubData.token}` : ""}`,
      is_read: false,
      metadata: {
        provider: formData.provider,
        disco_id: formData.discoId,
        meter_number: formData.meterNumber,
        meter_type: formData.meterType,
        amount: formData.amount,
        token: lizzysubData.token || null,
        reference: requestId,
      },
    });

    // 12. Revalidate pages
    revalidatePath("/electricity");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: lizzysubData.message,
      data: {
        provider: formData.provider,
        disco_name: lizzysubData.disco_name,
        meter_number: formData.meterNumber,
        meter_type: formData.meterType,
        amount: formData.amount,
        charges: lizzysubData.charges,
        token: lizzysubData.token || null,
        newBalance: newBalance,
        reference: requestId,
        transaction_id: transaction?.id,
      },
    };
  } catch (error) {
    console.error("Purchase electricity error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
