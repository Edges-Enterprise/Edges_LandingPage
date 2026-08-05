// src/actions/reseller/wallet/handleSuccessfulDeposit.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { checkAndAwardFirstDepositBonus } from "@/lib/bonus/first-deposit";

interface HandleSuccessfulDepositParams {
  resellerId: string;
  amount: number;
  reference: string;
  providerReference: string;
  currency?: string;
}

export async function handleSuccessfulDeposit({
  resellerId,
  amount,
  reference,
  providerReference,
  currency = "USD",
}: HandleSuccessfulDepositParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    // Find the pending transaction
    const { data: transaction, error: txError } = await supabase
      .from("global_transactions")
      .select("id, status, amount")
      .eq("reference", reference)
      .eq("reseller_id", resellerId)
      .single();

    if (txError) {
      console.error("Transaction not found:", txError);
      return { success: false, error: "Transaction not found" };
    }

    if (transaction.status === "completed") {
      return { success: true }; // Already processed
    }

    // Update wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("global_wallets")
      .select("id, balance")
      .eq("reseller_id", resellerId)
      .single();

    if (walletError) {
      return { success: false, error: "Wallet not found" };
    }

    const newBalance = (wallet.balance || 0) + amount;

    const { error: updateError } = await supabase
      .from("global_wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (updateError) {
      return { success: false, error: "Failed to update wallet" };
    }

    // Update transaction to completed
    await supabase
      .from("global_transactions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        provider_reference: providerReference,
      })
      .eq("id", transaction.id);

    // ✅ Check and award first deposit bonus
    const bonusResult = await checkAndAwardFirstDepositBonus(
      resellerId,
      amount,
    );

    if (!bonusResult.success) {
      console.warn("Bonus award failed:", bonusResult.error);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Handle deposit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
