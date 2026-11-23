// src/lib/payments/withdrawalPayout.ts
//
// Sends an already-deducted withdrawal to the store's payout provider and
// closes the withdrawal row.
//
// The route has already taken the money off the reseller's balance and written
// a `pending` row via request_global_withdrawal. Everything here decides what
// that row becomes, so the failure paths matter more than the happy one:
//
//   provider says no          -> refund, mark failed
//   provider accepts          -> mark completed, or leave pending if unsettled
//   outcome unknown (timeout) -> leave pending, never refund
//
// The last case is the one that costs real money if handled wrong: refunding a
// payout that actually went through pays the reseller twice.

import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { getPaymentGateway } from "./index";
import { PaymentGatewayType } from "./payment.types";

export interface PayoutOutcome {
  status: "completed" | "pending" | "failed";
  providerReference?: string;
  error?: string;
}

interface DispatchParams {
  withdrawalId: string;
  resellerId: string;
  netAmount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  reference: string;
  countryCode: string;
  customerEmail?: string;
}

export async function dispatchWithdrawalPayout(
  params: DispatchParams,
): Promise<PayoutOutcome> {
  const {
    withdrawalId,
    resellerId,
    netAmount,
    bankCode,
    accountNumber,
    accountName,
    reference,
    countryCode,
    customerEmail,
  } = params;

  const admin = createAdminClient();
  const config = getCountryConfig(countryCode);
  const provider = config?.paymentGateway?.provider as
    | PaymentGatewayType
    | undefined;
  const currency = config?.paymentGateway?.currency || config?.currency;

  if (!provider || !currency) {
    // Nothing was sent, so the deduction is safe to reverse.
    await failWithdrawal(withdrawalId, "No payout provider configured");
    return {
      status: "failed",
      error: "No payout provider configured for this country",
    };
  }

  const gateway = getPaymentGateway(provider);

  if (typeof gateway.processPayout !== "function") {
    await failWithdrawal(
      withdrawalId,
      `Payouts are not supported by ${provider}`,
    );
    return {
      status: "failed",
      error: `Payouts are not supported by ${provider}`,
    };
  }

  let result;
  try {
    result = await gateway.processPayout({
      resellerId,
      amount: netAmount,
      currency,
      bankCode,
      accountNumber,
      accountName,
      narration: `Wallet withdrawal ${reference}`,
      reference,
      customerEmail,
    });
  } catch (error) {
    // processPayout swallows its own errors, so reaching here means something
    // unexpected. Treat it as unknown rather than refunding.
    console.error("payout threw unexpectedly:", error);
    return { status: "pending", error: "Payout outcome unknown" };
  }

  if (result.success) {
    if (result.pending) {
      // Provider accepted but has not settled. The row stays pending; the
      // status check closes it later.
      await admin
        .from("global_withdrawals")
        .update({
          failure_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      return { status: "pending", providerReference: result.reference };
    }

    const { data, error } = await admin.rpc("complete_global_withdrawal", {
      p_withdrawal_id: withdrawalId,
    });

    if (error || data?.success === false) {
      // The payout went out but the ledger did not close. Do not refund — the
      // money is gone. Surface it loudly for manual reconciliation.
      console.error(
        "CRITICAL: payout succeeded but complete_global_withdrawal failed",
        { withdrawalId, reference, error: error?.message, data },
      );
      return {
        status: "pending",
        providerReference: result.reference,
        error: "Payout sent but withdrawal not marked completed",
      };
    }

    return { status: "completed", providerReference: result.reference };
  }

  if (result.definitive === false) {
    // Unknown: the request may have reached the provider. Leaving it pending
    // is the only safe choice; a human or a status check resolves it.
    console.error(
      "payout outcome unknown, leaving withdrawal pending",
      withdrawalId,
      result.error,
    );
    return { status: "pending", error: result.error };
  }

  await failWithdrawal(withdrawalId, result.error || "Payout failed");
  return { status: "failed", error: result.error };
}

async function failWithdrawal(withdrawalId: string, reason: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fail_global_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_reason: reason,
  });

  if (error || data?.success === false) {
    // The reseller's money is still deducted and no payout was sent. This needs
    // a human: log with enough detail to find the row.
    console.error(
      "CRITICAL: could not refund failed withdrawal",
      withdrawalId,
      reason,
      error?.message,
      data,
    );
  }
}

/**
 * Polls the provider for a payout that was left pending and closes the row.
 *
 * Returns the resulting status. A `pending` result means the provider has not
 * settled yet and the caller should try again later.
 */
export async function reconcileWithdrawal(
  withdrawalId: string,
  countryCode: string,
): Promise<PayoutOutcome> {
  const admin = createAdminClient();

  const { data: withdrawal, error } = await admin
    .from("global_withdrawals")
    .select("id, status, reference, net_amount, bank_code, account_number")
    .eq("id", withdrawalId)
    .single();

  if (error || !withdrawal) {
    return { status: "pending", error: "Withdrawal not found" };
  }

  if (withdrawal.status !== "pending") {
    return { status: withdrawal.status as "completed" | "failed" };
  }

  const config = getCountryConfig(countryCode);
  const provider = config?.paymentGateway?.provider as
    | PaymentGatewayType
    | undefined;

  if (!provider) {
    return { status: "pending", error: "No payout provider configured" };
  }

  const gateway = getPaymentGateway(provider);

  if (typeof gateway.getPayoutStatus !== "function") {
    // Xixapay has no status endpoint; a pending row there needs a human.
    return {
      status: "pending",
      error: `${provider} does not expose payout status`,
    };
  }

  const status = await gateway.getPayoutStatus(withdrawal.reference);

  if (status.status === "completed") {
    await admin.rpc("complete_global_withdrawal", {
      p_withdrawal_id: withdrawalId,
    });
    return { status: "completed", providerReference: status.providerReference };
  }

  if (status.status === "failed") {
    await failWithdrawal(withdrawalId, "Provider reported payout failed");
    return { status: "failed" };
  }

  return { status: "pending", providerReference: status.providerReference };
}
