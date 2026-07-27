// app/actions/cable.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Validate IUC/Smart Card Number via Lizzysub API
 */
export async function validateIucAction(iuc: string, provider: string) {
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

    // ✅ FIX: Map provider names to Lizzysub NUMERIC IDs
    const cableMap: { [key: string]: number } = {
      DSTV: 2,
      GOTV: 1,
      STARTIMES: 3,
    };

    const cableId = cableMap[provider.toUpperCase()];
    if (!cableId) {
      return { error: "Invalid cable provider" };
    }

    console.log(`Validating IUC: ${iuc} for ${provider} (ID: ${cableId})`);

    // Call Supabase Edge Function for IUC validation
    const response = await fetch(
      `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/cable-validation?iuc=${iuc}&cable=${cableId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("IUC validation response:", data);

    // ✅ FIX: Lizzysub returns "name" field, not "customer"
    if (data.status === "success" && data.name) {
      return {
        success: true,
        customerName: data.name,
        message: "IUC verified successfully",
      };
    } else {
      return {
        success: false,
        error: data.message || "Invalid IUC number",
      };
    }
  } catch (error) {
    console.error("IUC validation error:", error);
    return { error: "Failed to validate IUC. Please try again." };
  }
}

/**
 * Purchase Cable TV Subscription via Lizzysub API
 */
export async function purchaseCableAction(formData: {
  provider: string;
  iuc: string;
  planId: string;
  planName: string;
  price: number;
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
    if (currentBalance < formData.price) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${formData.price.toLocaleString()}`,
      };
    }

    // 5. Generate unique request ID
    const requestId = `EDGESN_CABLE_WEB_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // ✅ FIX: Map provider to Lizzysub NUMERIC ID
    const cableMap: { [key: string]: number } = {
      DSTV: 2,
      GOTV: 1,
      STARTIMES: 3,
    };

    const cableId = cableMap[formData.provider.toUpperCase()];
    if (!cableId) {
      return { error: "Invalid cable provider" };
    }

    // 7. Call Lizzysub API via Supabase Edge Function
    const lizzysubPayload = {
      cable: cableId, // ✅ Now sending numeric ID (1, 2, or 3)
      iuc: formData.iuc,
      cable_plan: formData.planId,
      bypass: formData.bypass,
      requestId: requestId,
    };

    console.log("Calling Lizzysub Cable API:", {
      ...lizzysubPayload,
      iuc: formData.iuc.slice(0, 4) + "***" + formData.iuc.slice(-4),
    });

    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/cable-proxy",
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

    console.log("Lizzysub cable response:", {
      status: lizzysubData.status,
      message: lizzysubData.message?.slice(0, 50),
    });

    // 8. Handle API response
    if (lizzysubData.status !== "success") {
      // Create failed transaction record
      await supabase.from("transactions").insert({
        user_email: profile.email,
        amount: formData.price,
        reference: requestId,
        status: "failed",
        type: "cable_purchase",
        env: "live",
        metadata: {
          provider: formData.provider,
          cable_id: cableId,
          iuc: formData.iuc,
          plan_name: formData.planName,
          plan_id: formData.planId,
          error_message: lizzysubData.message,
          api_provider: "lizzysub",
        },
      });

      return {
        error: lizzysubData.message || "Transaction failed. Please try again.",
      };
    }

    // 9. Deduct from wallet
    const newBalance = currentBalance - formData.price;
    const { error: balanceError } = await supabase
      .from("wallet")
      .update({ balance: newBalance })
      .eq("user_email", profile.email);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return { error: "Failed to update wallet balance" };
    }

    // 10. Create successful transaction record
    const { data: transaction } = await supabase
      .from("transactions")
      .insert({
        user_email: profile.email,
        amount: -formData.price, // Negative for outflow
        reference: requestId,
        status: "completed",
        type: "cable_purchase",
        env: "live",
        metadata: {
          provider: formData.provider,
          cable_id: cableId,
          iuc: formData.iuc,
          plan_name: formData.planName,
          plan_id: formData.planId,
          api_message: lizzysubData.message,
          api_provider: "lizzysub",
        },
      })
      .select()
      .single();

    // 11. Create cable_purchases record (for specific tracking)
    await supabase.from("cable_purchases").insert({
      user_id: user.id,
      provider: formData.provider,
      plan_name: formData.planName,
      amount: formData.price,
    });

    // 12. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "cable_purchase",
      message: `Successfully subscribed to ${formData.planName} for ${
        formData.iuc
      }. Charged: ₦${formData.price.toLocaleString()}`,
      is_read: false,
      metadata: {
        provider: formData.provider,
        cable_id: cableId,
        iuc: formData.iuc,
        plan_name: formData.planName,
        amount: formData.price,
        reference: requestId,
      },
    });

    // 13. Revalidate pages
    revalidatePath("/cable");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: lizzysubData.message,
      data: {
        provider: formData.provider,
        iuc: formData.iuc,
        plan_name: formData.planName,
        amount: formData.price,
        newBalance: newBalance,
        reference: requestId,
        transaction_id: transaction?.id,
      },
    };
  } catch (error) {
    console.error("Purchase cable error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Get Cable Plans from Supabase
 */
export async function getCablePlansAction(provider: string) {
  try {
    const supabase = await createServerClient();

    const { data: plans, error } = await supabase
      .from("cable_plans")
      .select("*")
      .eq("provider", provider.toUpperCase())
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching cable plans:", error);
      return { error: "Failed to fetch plans" };
    }

    return { success: true, plans: plans || [] };
  } catch (error) {
    console.error("Get cable plans error:", error);
    return { error: "Failed to fetch plans" };
  }
}
