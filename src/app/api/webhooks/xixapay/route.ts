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
        console.error("Xixapay webhook: Transaction not found:", reference);
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
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

    // Check for first deposit bonus (Xixapay specific)
    const { data: walletWithBonus } = await adminClient
      .from("global_wallets")
      .select("first_deposit_bonus_claimed, first_deposit_bonus_amount")
      .eq("reseller_id", transaction.reseller_id)
      .single();

    if (
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
