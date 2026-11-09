// src/lib/bonus/first-deposit.ts
//
// The reseller app first-deposit bonus: a one-time, non-withdrawable USD 10
// credit (in the store's own currency, at the live FX rate) the first time a
// reseller funds their wallet from the app. This replaced the previous 5%
// withdrawable bonus.
//
// The whole operation — FX, the one-time guard, the credit and the ledger
// row — is a single SECURITY DEFINER function so a retried webhook cannot
// double-award it.
import { createAdminClient } from "@/lib/supabase/admin";

export interface FirstDepositBonusResult {
  success: boolean;
  bonusAwarded: boolean;
  bonusAmount?: number;
  reason?: string;
  error?: string;
}

export async function checkAndAwardFirstDepositBonus(
  resellerId: string,
): Promise<FirstDepositBonusResult> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.rpc("award_app_first_deposit_bonus", {
      p_reseller_id: resellerId,
    });

    if (error) throw error;

    return {
      success: true,
      bonusAwarded: Boolean(data?.awarded),
      bonusAmount: data?.amount ? Number(data.amount) : undefined,
      reason: data?.reason,
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
