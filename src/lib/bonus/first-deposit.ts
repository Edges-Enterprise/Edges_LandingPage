// src/lib/bonus/first-deposit.ts
import { createServerClient } from "@/lib/supabase/server";

const BONUS_PERCENTAGE = 5; // 5% bonus on first deposit
const MAX_BONUS_AMOUNT = 5000; // Maximum bonus in currency units

export async function checkAndAwardFirstDepositBonus(
  resellerId: string,
  depositAmount: number,
) {
  const supabase = await createServerClient();

  try {
    // Check if bonus already claimed
    const { data: wallet, error: walletError } = await supabase
      .from("global_wallets")
      .select("first_deposit_bonus_claimed, balance")
      .eq("reseller_id", resellerId)
      .single();

    if (walletError) throw walletError;

    if (wallet.first_deposit_bonus_claimed) {
      return { success: true, bonusAwarded: false, reason: "Already claimed" };
    }

    // Calculate bonus
    let bonusAmount = (depositAmount * BONUS_PERCENTAGE) / 100;
    bonusAmount = Math.min(bonusAmount, MAX_BONUS_AMOUNT);
    bonusAmount = Math.round(bonusAmount);

    if (bonusAmount <= 0) {
      return {
        success: true,
        bonusAwarded: false,
        reason: "Bonus amount too small",
      };
    }

    // Award bonus
    const { error: bonusError } = await supabase.rpc(
      "update_wallet_after_deposit",
      {
        p_reseller_id: resellerId,
        p_amount: bonusAmount,
      },
    );

    if (bonusError) throw bonusError;

    // Mark bonus as claimed
    const { error: claimError } = await supabase
      .from("global_wallets")
      .update({
        first_deposit_bonus_claimed: true,
        first_deposit_bonus_amount: bonusAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("reseller_id", resellerId);

    if (claimError) throw claimError;

    // Record bonus transaction
    const { error: txError } = await supabase
      .from("global_transactions")
      .insert({
        reseller_id: resellerId,
        type: "bonus",
        amount: bonusAmount,
        status: "completed",
        description: `First deposit bonus (${BONUS_PERCENTAGE}% of deposit)`,
        metadata: {
          bonus_type: "first_deposit",
          deposit_amount: depositAmount,
          bonus_percentage: BONUS_PERCENTAGE,
        },
        completed_at: new Date().toISOString(),
      });

    if (txError) throw txError;

    return {
      success: true,
      bonusAwarded: true,
      bonusAmount,
      message: `You earned a ${BONUS_PERCENTAGE}% bonus of ${bonusAmount} on your first deposit!`,
    };
  } catch (error) {
    console.error("Bonus error:", error);
    return {
      success: false,
      bonusAwarded: false,
      error: error instanceof Error ? error.message : "Failed to award bonus",
    };
  }
}
