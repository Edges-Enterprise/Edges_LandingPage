// src/app/api/webhooks/korapay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { korapay } from "@/lib/payments/korapay";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeeBreakdown } from "@/lib/payments/fees";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = request.headers;

    console.log("📥 Korapay webhook received:", body);

    // Verify webhook signature
    const isValid = await korapay.verifyWebhook(body, headers);
    if (!isValid) {
      console.warn("❌ Invalid Korapay webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook data
    const webhookData = korapay.parseWebhook(body);
    console.log("✅ Korapay webhook parsed:", webhookData);

    // Only process successful charges
    if (webhookData.status !== "completed") {
      console.log("⏭️ Not a successful charge, ignoring");
      return NextResponse.json({ message: "Ignored" }, { status: 200 });
    }

    const supabase = await createServerClient();
    const adminClient = createAdminClient();

    // Get transaction by reference
    const { data: transaction, error: txError } = await supabase
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

    // ✅ Calculate fees using 4% total rate
    const feeBreakdown = getFeeBreakdown(grossAmount);
    const finalNetAmount = feeBreakdown.net_amount;

    console.log("💰 Fee breakdown:", feeBreakdown);

    // Update wallet balance with net amount
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
    const newBalance = currentBalance + finalNetAmount;

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

    // ✅ Update transaction with fee details
    const { error: txUpdateError } = await adminClient
      .from("global_transactions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        provider_reference: webhookData.providerReference,
        metadata: {
          ...transaction.metadata,
          korapay_fee: feeBreakdown.korapay_fee,
          platform_fee: feeBreakdown.platform_fee,
          total_fee: feeBreakdown.total_fee,
          net_amount: feeBreakdown.net_amount,
          gross_amount: feeBreakdown.gross_amount,
          korapay_fee_percent: feeBreakdown.korapay_fee_percent,
          platform_fee_percent: feeBreakdown.platform_fee_percent,
          total_fee_percent: feeBreakdown.total_fee_percent,
          previous_balance: currentBalance,
          new_balance: newBalance,
          provider: "korapay",
          verified_by: "korapay-webhook",
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
      korapay_fee: feeBreakdown.korapay_fee,
      platform_fee: feeBreakdown.platform_fee,
      total_fee: feeBreakdown.total_fee,
      net: finalNetAmount,
      new_balance: newBalance,
    });

    return NextResponse.json(
      {
        status: "ok",
        message: "Deposit processed successfully",
        data: {
          reference: webhookData.reference,
          net_amount: finalNetAmount,
          new_balance: newBalance,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Korapay webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

