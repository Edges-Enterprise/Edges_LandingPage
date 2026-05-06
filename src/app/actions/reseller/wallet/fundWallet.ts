// app/actions/reseller/wallet/fundWallet.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface FundWalletInput {
  resellerId: string;
  amount: number;
  reference?: string;
}

/**
 * Add funds to a reseller's wallet (deposit)
 */
export async function fundWallet(
  input: FundWalletInput,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerClient();

  if (input.amount <= 0) {
    return { error: "Amount must be greater than zero" };
  }

  // Update wallet balance
  const { error: walletError } = await supabase.rpc(
    "update_wallet_after_deposit",
    {
      p_reseller_id: input.resellerId,
      p_amount: input.amount,
    },
  );

  if (walletError) {
    console.error("Error funding wallet:", walletError);
    return { error: "Failed to fund wallet" };
  }

  // Record transaction
  const { error: txError } = await supabase
    .from("reseller_transactions")
    .insert({
      reseller_id: input.resellerId,
      amount: input.amount,
      type: "deposit",
      status: "completed",
      reference: input.reference || `DEP-${Date.now()}`,
      metadata: { method: "manual" },
    });

  if (txError) {
    console.error("Error recording transaction:", txError);
  }

  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");
  return { success: true };
}