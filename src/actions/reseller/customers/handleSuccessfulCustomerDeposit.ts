// src/actions/reseller/customers/handleSuccessfulCustomerDeposit.ts
//
// Task 4, pointer 1.c.v.zi.x. Customer-scoped counterpart to the
// reseller-side completion logic duplicated inline inside
// src/app/api/webhooks/korapay/route.ts and
// src/app/api/webhooks/flutterwave/route.ts (NOT
// src/actions/reseller/wallet/handleSuccessfulDeposit.ts - that file
// turned out to be dead code, see HANDOVER.md Task 4 findings for
// this pointer).
//
// Scope note: this only covers the korapay/flutterwave
// initiate-then-webhook-completes model, which is what
// fundGlobalCustomerWallet.ts (1.c.iv) produces - a pending
// global_customer_transactions row with a `reference` to match
// against. It does NOT cover xixapay virtual-account transfers, which
// have no pre-existing pending row to match at all (a customer just
// bank-transfers into a fixed account number) and need a completely
// different lookup (by receiving account number against
// global_customer_virtual_accounts, not by transaction reference).
// That's flagged as a separate follow-up, not handled here.
"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface HandleSuccessfulCustomerDepositParams {
  transactionId: string;
  resellerId: string;
  customerId: string;
  netAmount: number;
  grossAmount: number;
  providerReference?: string;
  provider: "korapay" | "flutterwave";
  extraMetadata?: Record<string, unknown>;
}

export async function handleSuccessfulCustomerDeposit({
  transactionId,
  resellerId,
  customerId,
  netAmount,
  grossAmount,
  providerReference,
  provider,
  extraMetadata,
}: HandleSuccessfulCustomerDepositParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();

    const { data: transaction, error: txError } = await adminClient
      .from("global_customer_transactions")
      .select("id, status, metadata")
      .eq("id", transactionId)
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .single();

    if (txError || !transaction) {
      return { success: false, error: "Transaction not found" };
    }

    // Idempotent - webhooks can and do retry.
    if (transaction.status === "completed") {
      return { success: true };
    }

    const { data: wallet, error: walletError } = await adminClient
      .from("global_customer_wallets")
      .select("id, balance")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .single();

    if (walletError || !wallet) {
      return { success: false, error: "Customer wallet not found" };
    }

    const previousBalance = wallet.balance || 0;
    const newBalance = previousBalance + netAmount;

    const { error: walletUpdateError } = await adminClient
      .from("global_customer_wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (walletUpdateError) {
      console.error(
        "Customer wallet update error:",
        walletUpdateError,
      );
      return { success: false, error: "Failed to update wallet" };
    }

    // global_customer_transactions has no completed_at or
    // provider_reference columns (same as global_transactions -
    // see HANDOVER.md Task 4 findings for this pointer: three of the
    // four existing webhook routes update these non-existent columns
    // on global_transactions, a pre-existing bug not repeated here).
    // Storing the equivalent values inside metadata instead.
    const { error: txUpdateError } = await adminClient
      .from("global_customer_transactions")
      .update({
        status: "completed",
        net_amount: netAmount,
        previous_balance: previousBalance,
        new_balance: newBalance,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(transaction.metadata as Record<string, unknown> | null),
          ...extraMetadata,
          gross_amount: grossAmount,
          net_amount: netAmount,
          previous_balance: previousBalance,
          new_balance: newBalance,
          provider_reference: providerReference,
          completed_at: new Date().toISOString(),
          provider,
          verified_by: `${provider}-webhook`,
        },
      })
      .eq("id", transaction.id);

    if (txUpdateError) {
      console.error("Customer transaction update error:", txUpdateError);
      return { success: false, error: "Failed to update transaction" };
    }

    return { success: true };
  } catch (error) {
    console.error("Handle successful customer deposit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
