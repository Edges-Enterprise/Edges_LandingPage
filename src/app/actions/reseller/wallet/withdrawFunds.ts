// app/actions/reseller/wallet/withdrawFunds.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface WithdrawInput {
  resellerId: string;
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

interface Bank {
  bankName: string;
  bankCode: string;
}

/**
 * Get supported banks from Xixapay
 */

export async function getBanks(): Promise<Bank[]> {
  const apiKey = process.env.XIXAPAY_API_KEY;
  const secretKey = process.env.XIXAPAY_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.error("Missing Xixapay credentials");
    return [];
  }

  try {
    const response = await fetch("https://api.xixapay.com/api/get/banks", {
      headers: {
        "api-key": apiKey,
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await response.json();

    if (Array.isArray(data)) {
      // Filter out invalid/test bank codes
      const validBanks = data.filter((bank: any) => {
        const code = bank.bank_code;
        // Exclude codes that contain letters (test data), or are obviously fake
        const isNumeric = /^\d+$/.test(code);
        const isTooShort = code.length < 3;
        const isFake =
          code.startsWith("faker") ||
          code.startsWith("dyy") ||
          code.startsWith("test") ||
          code === "NOT find in NIP" ||
          code === "888888" ||
          code === "999999" ||
          code === "000333" ||
          code === "314159" ||
          code === "1999999" ||
          code === "999044";

        return isNumeric && !isTooShort && !isFake;
      });

      return validBanks.map((bank: any) => ({
        bankName: bank.bank_name,
        bankCode: bank.bank_code,
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching banks:", error);
    return [];
  }
}

/**
 * Verify bank account details before payout
 */

export async function verifyBankAccount(
  bankCode: string,
  accountNumber: string,
): Promise<{ success: boolean; accountName?: string; error?: string }> {
  const apiKey = process.env.XIXAPAY_API_KEY;
  const secretKey = process.env.XIXAPAY_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return { success: false, error: "Payment provider configuration missing" };
  }

  try {
    const response = await fetch("https://api.xixapay.com/api/verify/bank", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        bank: bankCode,
        accountNumber,
      }),
    });

    const data = await response.json();

    // The API returns the account details directly without a "status" wrapper
    // Success response: { AccountName: "...", BankName: "...", BankCode: "..." }
    // Error response likely: { message: "..." } or { error: "..." }
    if (data.AccountName) {
      return {
        success: true,
        accountName: data.AccountName,
      };
    }

    return {
      success: false,
      error: data.message || data.error || "Account verification failed",
    };
  } catch (error) {
    console.error("Error verifying bank account:", error);
    return { success: false, error: "Verification failed. Please try again." };
  }
}

const MIN_WITHDRAWAL_AMOUNT = 100;

export async function withdrawFunds(input: WithdrawInput): Promise<{
  success?: boolean;
  error?: string;
  reference?: string;
  netAmount?: number;
}> {
  const supabase = await createServerClient();

  // ✅ Add minimum amount validation
  if (input.amount < MIN_WITHDRAWAL_AMOUNT) {
    return {
      error: `Minimum withdrawal amount is ₦${MIN_WITHDRAWAL_AMOUNT}`,
    };
  }

  if (input.amount <= 0) {
    return { error: "Amount must be greater than zero" };
  }

  if (!input.accountNumber || input.accountNumber.length !== 10) {
    return { error: "Invalid account number" };
  }

  if (!input.bankCode) {
    return { error: "Bank is required" };
  }

  const businessId = process.env.XIXAPAY_BUSINESS_ID;
  const apiKey = process.env.XIXAPAY_API_KEY;
  const secretKey = process.env.XIXAPAY_SECRET_KEY;

  if (!businessId || !apiKey || !secretKey) {
    return {
      error: "Payment provider configuration missing. Please contact support.",
    };
  }

  // Calculate fee (2%)
  const fee = Math.round(input.amount * 0.02);
  const totalDeduction = input.amount;
  const netAmount = input.amount - fee; // 102 - 2 = 100

  // // 1. Check balance
  // ✅ CORRECT: Get balance directly (not withdrawable)
  const { data: wallet, error: walletErrr } = await supabase
    .from("reseller_wallets")
    .select("balance")
    .eq("reseller_id", input.resellerId)
    .single();

  if (walletErrr || !wallet) {
    return {
      error: "Wallet not found. Please contact support.",
    };
  }

  // ✅ Check balance only
  if (wallet.balance < input.amount) {
    // Use input.amount, not totalDeduction
    return {
      error: `Insufficient balance. Your balance is ₦${wallet.balance.toLocaleString()} but you need ₦${input.amount.toLocaleString()}.`,
    };
  }

  // const { data: wallet } = await supabase
  //   .from("reseller_wallets")
  //   .select("balance")
  //   .eq("reseller_id", input.resellerId)
  //   .single();

  // if (!wallet) {
  //   return {
  //     error: "Wallet not found. Please contact support."
  //   };
  // }

  // if (wallet.balance < totalDeduction) {
  //   return {
  //     error: `Insufficient balance. Your balance is ₦${wallet.balance.toLocaleString()} but you need ₦${totalDeduction.toLocaleString()} (amount + ₦${fee.toLocaleString()} fee).`,
  //   };
  // }

  // ============================================================
  // ✅ FIX: Get fresh withdrawable from RPC (source of truth)
  // ============================================================
  // const { data: walletData, error: recalcError } = await supabase.rpc(
  //   "recalculate_reseller_wallet",
  //   {
  //     p_reseller_id: input.resellerId,
  //     p_for_update: true, // ← Locks the row!
  //   },
  // );

  // if (recalcError || !walletData?.success) {
  //   console.error("Error recalculating wallet:", recalcError || walletData);
  //   return {
  //     error: "Failed to verify wallet balance. Please try again.",
  //   };
  // }

  // const withdrawable = walletData.withdrawable || 0;

  // ✅ Check if enough funds using withdrawable (balance + total_sales)
  // if (withdrawable < totalDeduction) {
  //   return {
  //     error: `Insufficient balance. Your withdrawable balance is ₦${withdrawable.toLocaleString()} but you need ₦${totalDeduction.toLocaleString()} (amount + ₦${fee.toLocaleString()} fee).`,
  //   };
  // }

  // 2. Verify bank account before proceeding
  const verification = await verifyBankAccount(
    input.bankCode,
    input.accountNumber,
  );
  if (!verification.success) {
    return { error: verification.error || "Bank account verification failed" };
  }

  // 3. Deduct from wallet first
  const { error: walletError } = await supabase.rpc(
    "update_wallet_after_withdrawal",
    {
      p_reseller_id: input.resellerId,
      p_amount: totalDeduction,
      p_fee: fee,
    },
  );

  if (walletError) {
    console.error("Error deducting wallet:", walletError);

    // Handle specific PostgreSQL error codes
    if (walletError.code === "P0001") {
      // This is a user-defined exception from the PostgreSQL function
      return {
        error:
          walletError.message ||
          "Insufficient funds or wallet not found. Please try again.",
      };
    }

    return {
      error: "Failed to process withdrawal. Please try again.",
    };
  }

  // 4. Record transaction as pending
  const reference = `WTH-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const { data: transaction, error: txError } = await supabase
    .from("reseller_transactions")
    .insert({
      reseller_id: input.resellerId,
      amount: totalDeduction,
      type: "withdrawal",
      status: "pending",
      reference,
      metadata: {
        requested_amount: input.amount, // ← 102
        fee: fee, // ← 2
        net_amount: netAmount, // ← 100 (user receives this)
        total_deducted: totalDeduction, // ← 102
        bank_code: input.bankCode,
        account_number: input.accountNumber,
        account_name: verification.accountName,
      },
    })
    .select("id")
    .single();

  if (txError) {
    console.error("Error recording transaction:", txError);
    // Refund the wallet since transaction wasn't recorded
    const { error: refundError } = await supabase.rpc(
      "update_wallet_after_deposit",
      {
        p_reseller_id: input.resellerId,
        p_amount: totalDeduction,
      },
    );

    if (refundError) {
      console.error(
        "CRITICAL: Failed to refund wallet after transaction error:",
        refundError,
      );
      return {
        error:
          "A critical error occurred. Your funds may have been deducted. Please contact support immediately.",
      };
    }

    return {
      error: "Failed to record transaction. Your balance has been restored.",
    };
  }

  // 5. Initiate Xixapay payout
  try {
    const payoutResponse = await fetch(
      "https://api.xixapay.com/api/v1/transfer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
          businessId,
          amount: netAmount,
          bank: input.bankCode,
          accountNumber: input.accountNumber,
          narration: `Withdrawal from wallet - ${reference}`,
        }),
      },
    );

    const payoutData = await payoutResponse.json();
    console.log("XIXAPAY_PAYOUT_RESPONSE", JSON.stringify(payoutData));

    if (payoutData.status === "success") {
      // 6. Mark transaction as completed
      const { error: updateError } = await supabase
        .from("reseller_transactions")
        .update({
          status: "completed",
          metadata: {
            ...(transaction as any)?.metadata,
            payout_reference: payoutData.reference,
            payout_status: "success",
          },
        })
        .eq("id", (transaction as any)?.id);

      if (updateError) {
        console.error(
          "FAILED TO MARK TRANSACTION COMPLETED AFTER SUCCESSFUL PAYOUT",
          updateError,
          transaction,
        );
        // this is the dangerous case: money moved, ledger didn't update.
        // alert/page yourself here — this is not a case to fail silently.
      }

      // ✅ Recalculate wallet to update cache
      await supabase.rpc("recalculate_reseller_wallet", {
        p_reseller_id: input.resellerId,
        p_for_update: false,
      });

      revalidatePath("/dashboard/wallet");
      revalidatePath("/dashboard");

      return {
        success: true,
        reference: payoutData.reference,
        netAmount,
      };
    } else {
      // Payout failed - refund the wallet
      const { error: refundError } = await supabase.rpc(
        "update_wallet_after_deposit",
        {
          p_reseller_id: input.resellerId,
          p_amount: totalDeduction,
        },
      );

      if (refundError) {
        console.error(
          "CRITICAL: Failed to refund wallet after payout failure:",
          refundError,
        );
      }

      // Mark transaction as failed
      await supabase
        .from("reseller_transactions")
        .update({
          status: "failed",
          metadata: {
            ...(transaction as any)?.metadata,
            payout_error: payoutData.message || "Unknown error",
            refunded: !refundError,
          },
        })
        .eq("id", (transaction as any)?.id);

      console.error("Payout failed:", payoutData);
      return {
        error:
          payoutData.message ||
          "Payout failed. Your balance has been restored.",
      };
    }
  } catch (payoutError) {
    console.error("Payout error:", payoutError);

    // Refund on error
    const { error: refundError } = await supabase.rpc(
      "update_wallet_after_deposit",
      {
        p_reseller_id: input.resellerId,
        p_amount: totalDeduction,
      },
    );

    if (refundError) {
      console.error(
        "CRITICAL: Failed to refund wallet after payout error:",
        refundError,
      );
    }

    // Mark transaction as failed
    await supabase
      .from("reseller_transactions")
      .update({
        status: "failed",
        metadata: {
          ...(transaction as any)?.metadata,
          payout_error: "Network error",
          refunded: !refundError,
        },
      })
      .eq("id", (transaction as any)?.id);

    return {
      error:
        "Payout failed due to a network error. Your balance has been restored.",
    };
  }
}
