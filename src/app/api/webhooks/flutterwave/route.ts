// src/app/api/webhooks/flutterwave/route.ts
import { NextRequest, NextResponse } from "next/server";
import { flutterwave } from "@/lib/payments/flutterwave";
import { handleSuccessfulDeposit } from "@/actions/reseller/wallet/handleSuccessfulDeposit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = request.headers;

    console.log("📥 Flutterwave webhook received:", body);

    // Verify webhook signature
    const isValid = await flutterwave.verifyWebhook(body, headers);
    if (!isValid) {
      console.warn("❌ Invalid Flutterwave webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook data
    const webhookData = flutterwave.parseWebhook(body);
    console.log("✅ Flutterwave webhook parsed:", webhookData);

    // Only process successful charges
    if (webhookData.status !== "completed") {
      console.log("⏭️ Not a successful charge, ignoring");
      return NextResponse.json({ message: "Ignored" }, { status: 200 });
    }

    const adminClient = createAdminClient();

    // Get transaction by reference
    const { data: transaction, error: txError } = await adminClient
      .from("global_transactions")
      .select("id, reseller_id, amount, status, metadata")
      .eq("reference", webhookData.reference)
      .single();

    if (txError || !transaction) {
      console.error("❌ Transaction not found:", webhookData.reference);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Skip if already processed
    if (transaction.status === "completed") {
      console.log("⏭️ Transaction already processed:", webhookData.reference);
      return NextResponse.json(
        { message: "Already processed" },
        { status: 200 },
      );
    }

    const grossAmount = transaction.amount;

    // ✅ Platform fee is 2.5% (only platform fee, Flutterwave fee already deducted)
    const platformFee = grossAmount * 0.025;
    const netAmount = grossAmount - platformFee;

    console.log("💰 Fee breakdown:", {
      gross: grossAmount,
      flutterwave_fee: "Deducted by Flutterwave automatically",
      platform_fee: platformFee,
      net: netAmount,
    });

    // Update wallet balance
    const { data: wallet, error: walletError } = await adminClient
      .from("global_wallets")
      .select("id, balance")
      .eq("reseller_id", transaction.reseller_id)
      .single();

    if (walletError) {
      console.error("❌ Wallet not found:", walletError);
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const currentBalance = parseFloat(wallet.balance || "0");
    const newBalance = currentBalance + netAmount;

    const { error: updateError } = await adminClient
      .from("global_wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (updateError) {
      console.error("❌ Failed to update wallet:", updateError);
      return NextResponse.json(
        { error: "Failed to update wallet" },
        { status: 500 },
      );
    }

    // Update transaction with fee details
    const { error: txUpdateError } = await adminClient
      .from("global_transactions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        provider_reference: webhookData.providerReference,
        metadata: {
          ...transaction.metadata,
          flutterwave_fee: "Deducted by Flutterwave",
          platform_fee: platformFee,
          net_amount: netAmount,
          gross_amount: grossAmount,
          previous_balance: currentBalance,
          new_balance: newBalance,
          provider: "flutterwave",
          verified_by: "flutterwave-webhook",
        },
      })
      .eq("id", transaction.id);

    if (txUpdateError) {
      console.error("❌ Failed to update transaction:", txUpdateError);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }

    console.log("✅ Deposit processed successfully:", {
      reference: webhookData.reference,
      gross: grossAmount,
      flutterwave_fee: "Deducted by Flutterwave",
      platform_fee: platformFee,
      net: netAmount,
      new_balance: newBalance,
    });

    return NextResponse.json(
      {
        status: "ok",
        message: "Deposit processed successfully",
        data: {
          reference: webhookData.reference,
          net_amount: netAmount,
          new_balance: newBalance,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Flutterwave webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
