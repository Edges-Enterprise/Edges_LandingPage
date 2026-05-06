// app/actions/reseller/wallet/withdrawFunds.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { calculateWithdrawalFee } from "@/lib/pricing/calculatePrice";
import { revalidatePath } from "next/cache";

interface WithdrawInput {
  resellerId: string;
  amount: number;
}

/**
 * Withdraw funds from a reseller's wallet (2% fee applies)
 */
export async function withdrawFunds(
  input: WithdrawInput,
): Promise<{
  success?: boolean;
  error?: string;
  fee?: number;
  netAmount?: number;
}> {
  const supabase = await createServerClient();

  if (input.amount <= 0) {
    return { error: "Amount must be greater than zero" };
  }

  const fee = calculateWithdrawalFee(input.amount);
  const totalDeduction = input.amount + fee;

  // Check balance
  const { data: wallet } = await supabase
    .from("reseller_wallets")
    .select("balance")
    .eq("reseller_id", input.resellerId)
    .single();

  if (!wallet) {
    return { error: "Wallet not found" };
  }

  if (wallet.balance < totalDeduction) {
    return {
      error: `Insufficient funds. You need ₦${totalDeduction.toLocaleString()} (includes ₦${fee.toLocaleString()} fee)`,
    };
  }

  // Deduct from wallet
  const { error: walletError } = await supabase.rpc(
    "update_wallet_after_withdrawal",
    {
      p_reseller_id: input.resellerId,
      p_amount: input.amount,
      p_fee: fee,
    },
  );

  if (walletError) {
    console.error("Error processing withdrawal:", walletError);
    return { error: "Failed to process withdrawal" };
  }

  // Record transaction
  const { error: txError } = await supabase
    .from("reseller_transactions")
    .insert({
      reseller_id: input.resellerId,
      amount: totalDeduction,
      type: "withdrawal",
      status: "completed",
      reference: `WTH-${Date.now()}`,
      metadata: {
        withdrawal_amount: input.amount,
        fee,
        net_amount: input.amount,
      },
    });

  if (txError) {
    console.error("Error recording transaction:", txError);
  }

  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");
  return { success: true, fee, netAmount: input.amount };
}