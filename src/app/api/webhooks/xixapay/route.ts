// src/app/api/webhooks/xixapay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { xixapay } from "@/lib/payments/xixapay";
import { calculateXixapayNetAmount } from "@/lib/payments/xixapayFees";

const XIXAPAY_SECRET_KEY = process.env.XIXAPAY_SECRET_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = request.headers;

    // Verify webhook signature
    const isValid = await xixapay.verifyWebhook(body, headers);

    if (!isValid) {
      console.warn("Invalid Xixapay webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook data
    const webhookData = xixapay.parseWebhook(body);

    const { reference, status, amount, currency, metadata } = webhookData;

    // Only process successful payments
    if (status !== "completed") {
      console.log(
        `Xixapay webhook: Transaction ${reference} status is ${status}`,
      );
      return NextResponse.json({ received: true });
    }

    const adminClient = createAdminClient();

    // Xixapay uses transaction_id as reference
    // We need to find by metadata or fallback to reference
    let transaction = null;

    // Try to find by reference first
    const { data: txByRef, error: refError } = await adminClient
      .from("global_transactions")
      .select("*, reseller_id")
      .eq("reference", reference)
      .single();

    if (!refError && txByRef) {
      transaction = txByRef;
    } else {
      // Try to find by provider_reference in metadata
      const { data: txByProvider, error: provError } = await adminClient
        .from("global_transactions")
        .select("*, reseller_id")
        .eq("metadata->>provider_reference", webhookData.providerReference)
        .single();

      if (!provError && txByProvider) {
        transaction = txByProvider;
      } else {
        // Not a reseller top-up (via fundWallet.ts's initiate call, the
        // only thing that creates a pending global_transactions row for
        // xixapay - see HANDOVER.md Task 4, pointer 1.c.vi). This is
        // either a transfer into a customer's persistent virtual
        // account (1.c.ii) - which never creates any pending row at
        // all, unlike the reseller top-up path - or a transfer into
        // the reseller's own persistent virtual account outside the
        // app flow. Both cases: attribute by the receiving account
        // number instead of a transaction reference.
        const receiverAccountNumber = metadata?.receiver?.account_number;

        if (!receiverAccountNumber) {
          console.error(
            "Xixapay webhook: Transaction not found and no receiver account number to attribute by:",
            reference,
          );
          return NextResponse.json(
            { error: "Transaction not found" },
            { status: 404 },
          );
        }

        // Idempotency: xixapay retries webhooks, and there's no
        // pending row here to guard against double-processing the way
        // the reseller path's `transaction.status === "completed"`
        // check does - check by reference directly against
        // global_customer_transactions instead.
        const { data: existingCustomerTx } = await adminClient
          .from("global_customer_transactions")
          .select("id")
          .eq("reference", reference)
          .maybeSingle();

        if (existingCustomerTx) {
          console.log(
            "Xixapay webhook: Customer transaction already processed:",
            reference,
          );
          return NextResponse.json({ received: true });
        }

        const { data: customerAccount, error: customerAccountError } =
          await adminClient
            .from("global_customer_virtual_accounts")
            .select("reseller_id, customer_id")
            .eq("account_number", receiverAccountNumber)
            .eq("status", "active")
            .maybeSingle();

        if (customerAccountError || !customerAccount) {
          console.error(
            "Xixapay webhook: No customer virtual account matches receiving account number:",
            receiverAccountNumber,
          );
          return NextResponse.json(
            { error: "Virtual account not found" },
            { status: 404 },
          );
        }

        const customerGrossAmount = amount || 0;
        const customerNetAmount = calculateXixapayNetAmount(
          customerGrossAmount,
        );
        const customerPlatformFee = customerGrossAmount - customerNetAmount;

        const { data: customerWallet, error: customerWalletError } =
          await adminClient
            .from("global_customer_wallets")
            .select("id, balance")
            .eq("reseller_id", customerAccount.reseller_id)
            .eq("customer_id", customerAccount.customer_id)
            .single();

        if (customerWalletError || !customerWallet) {
          console.error(
            "Xixapay webhook: Customer wallet not found for:",
            customerAccount,
          );
          return NextResponse.json(
            { error: "Customer wallet not found" },
            { status: 404 },
          );
        }

        const customerPreviousBalance = customerWallet.balance || 0;
        const customerNewBalance =
          customerPreviousBalance + customerNetAmount;

        const { error: customerWalletUpdateError } = await adminClient
          .from("global_customer_wallets")
          .update({
            balance: customerNewBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customerWallet.id);

        if (customerWalletUpdateError) {
          console.error(
            "Xixapay webhook: Failed to update customer wallet:",
            customerWalletUpdateError,
          );
          return NextResponse.json(
            { error: "Failed to update customer wallet" },
            { status: 500 },
          );
        }

        // Insert a new completed row - there's nothing pending to
        // update, unlike every other branch in this file.
        // No first-deposit bonus here: deliberately reseller-only,
        // and only for app-initiated deposits even then (see the fix
        // to the reseller bonus check further down) - customers never
        // get one, per explicit product decision.
        const { error: customerTxInsertError } = await adminClient
          .from("global_customer_transactions")
          .insert({
            reseller_id: customerAccount.reseller_id,
            customer_id: customerAccount.customer_id,
            type: "deposit",
            amount: customerNetAmount,
            fee: customerPlatformFee,
            net_amount: customerNetAmount,
            previous_balance: customerPreviousBalance,
            new_balance: customerNewBalance,
            reference,
            status: "completed",
            payment_gateway: "xixapay",
            description: "Wallet funding via xixapay",
            metadata: {
              gross_amount: customerGrossAmount,
              platform_fee: customerPlatformFee,
              provider_reference: webhookData.providerReference,
              sender: metadata?.sender,
              receiver: metadata?.receiver,
              completed_at: new Date().toISOString(),
              provider: "xixapay",
              verified_by: "xixapay-webhook",
            },
          });

        if (customerTxInsertError) {
          console.error(
            "Xixapay webhook: Failed to insert customer transaction:",
            customerTxInsertError,
          );
          return NextResponse.json(
            { error: "Failed to record customer transaction" },
            { status: 500 },
          );
        }

        console.log(
          `✅ Xixapay webhook: Customer wallet funded ${customerNetAmount} for customer ${customerAccount.customer_id}`,
        );

        return NextResponse.json({ received: true });
      }
    }

    // Prevent duplicate processing
    if (transaction.status === "completed") {
      console.log(
        `Xixapay webhook: Transaction ${reference} already completed`,
      );
      return NextResponse.json({ received: true });
    }

    // Calculate fees using Xixapay range-based fee
    const grossAmount = amount || transaction.amount;
    const netAmount = calculateXixapayNetAmount(grossAmount);
    const platformFee = grossAmount - netAmount;

    // Update transaction
    const { error: updateError } = await adminClient
      .from("global_transactions")
      .update({
        status: "completed",
        amount: netAmount,
        metadata: {
          ...transaction.metadata,
          gross_amount: grossAmount,
          platform_fee: platformFee,
          provider_reference: webhookData.providerReference,
          sender: metadata?.sender,
          receiver: metadata?.receiver,
          ...webhookData.metadata,
        },
      })
      .eq("id", transaction.id);

    if (updateError) {
      console.error(
        "Xixapay webhook: Failed to update transaction:",
        updateError,
      );
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }

    // Update wallet balance
    const { data: wallet, error: walletError } = await adminClient
      .from("global_wallets")
      .select("id, balance")
      .eq("reseller_id", transaction.reseller_id)
      .single();

    if (walletError) {
      console.error("Xixapay webhook: Wallet not found:", walletError);
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const newBalance = (wallet.balance || 0) + netAmount;

    const { error: balanceError } = await adminClient
      .from("global_wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (balanceError) {
      console.error("Xixapay webhook: Failed to update wallet:", balanceError);
      return NextResponse.json(
        { error: "Failed to update wallet" },
        { status: 500 },
      );
    }

    // Check for first deposit bonus (Xixapay specific). Reseller-only
    // (never applies to the customer branch above, which returns
    // early before reaching here) and, per explicit product decision,
    // only when the reseller initiated the deposit from the app -
    // matches the same source-gating already used for this bonus in
    // src/app/api/webhooks/[countryCode]/payment/route.ts's version of
    // this check (`if (source === "app")`), which this file was
    // missing entirely until now.
    const depositSource = transaction.metadata?.source || "web";

    const { data: walletWithBonus } = await adminClient
      .from("global_wallets")
      .select("first_deposit_bonus_claimed, first_deposit_bonus_amount")
      .eq("reseller_id", transaction.reseller_id)
      .single();

    if (
      depositSource === "app" &&
      walletWithBonus &&
      !walletWithBonus.first_deposit_bonus_claimed &&
      grossAmount >= 5000
    ) {
      // Award first deposit bonus (e.g., 5% bonus)
      const bonusAmount = grossAmount * 0.05;

      await adminClient
        .from("global_wallets")
        .update({
          first_deposit_bonus_claimed: true,
          first_deposit_bonus_amount: bonusAmount,
          balance: (wallet.balance || 0) + netAmount + bonusAmount,
        })
        .eq("reseller_id", transaction.reseller_id);

      // Log bonus transaction
      await adminClient.from("global_transactions").insert({
        reseller_id: transaction.reseller_id,
        wallet_id: wallet.id,
        type: "credit",
        amount: bonusAmount,
        description: "First deposit bonus",
        status: "completed",
        reference: `BONUS-${Date.now()}`,
        payment_gateway: "xixapay",
      });
    }

    console.log(
      `✅ Xixapay webhook: Wallet funded ${netAmount} for ${transaction.reseller_id}`,
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Xixapay webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Note: the old Pages-Router-style `export const config = { api: { bodyParser... } }`
// was removed here — App Router route handlers never read this config at
// all, so it was a silent no-op that only produced a build warning.
// Body-size limits in App Router are controlled at the platform/hosting
// level, not via a per-route export.
