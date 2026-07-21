// src/actions/reseller/wallet/fundWallet.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function fundWallet(
  amount: number,
  paymentMethod: string,
  paymentReference?: string,
): Promise<{
  success: boolean;
  data?: {
    transaction_id: string;
    new_balance: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Start a transaction
    const { data: wallet, error: walletError } = await supabase
      .from("global_wallets")
      .select("id, balance")
      .eq("reseller_id", application.id)
      .single();

    if (walletError) {
      console.error("Get wallet error:", walletError);
      return { success: false, error: "Wallet not found" };
    }

    // Update wallet balance
    const newBalance = (wallet.balance || 0) + amount;

    const { data: updatedWallet, error: updateError } = await supabase
      .from("global_wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update wallet error:", updateError);
      return { success: false, error: "Failed to update wallet" };
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from("global_transactions")
      .insert({
        reseller_id: application.id,
        wallet_id: wallet.id,
        type: "credit",
        amount: amount,
        description: `Fund wallet via ${paymentMethod}`,
        status: "completed",
        reference: paymentReference || `TXN-${Date.now()}`,
        metadata: {
          payment_method: paymentMethod,
          payment_reference: paymentReference,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Create transaction error:", txError);
      // Rollback? We could add a reversal here
    }

    return {
      success: true,
      data: {
        transaction_id: transaction?.id || "",
        new_balance: newBalance,
      },
    };
  } catch (error) {
    console.error("FundWallet Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
