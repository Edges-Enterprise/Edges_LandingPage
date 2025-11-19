// src/app/api/xixa-account/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Get the raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get("xixapay");

    if (!signature) {
      console.error("Missing xixapay signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // 2. Verify the signature
    const secretKey = process.env.NEXT_PUBLIC_XIXAPAY_SECRET_KEY!;
    const calculatedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawBody)
      .digest("hex");

    if (calculatedSignature !== signature) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 3. Parse the webhook payload
    const payload = JSON.parse(rawBody);
    console.log("Webhook received:", {
      status: payload.notification_status,
      transaction_id: payload.transaction_id,
      amount: payload.amount_paid,
    });

    // 4. Only process successful payments
    if (
      payload.notification_status !== "payment_successful" ||
      payload.transaction_status !== "success"
    ) {
      console.log("Ignoring non-successful payment");
      return NextResponse.json({ message: "Ignored" });
    }

    // 5. Extract data
    const {
      transaction_id,
      amount_paid,
      settlement_amount,
      settlement_fee,
      receiver,
      customer,
      sender,
      timestamp,
    } = payload;

    // 6. Find the user by account number
    const supabase = await createServerClient();
    const { data: virtualAccount, error: accountError } = await supabase
      .from("virtual_accounts")
      .select("user_id, account_number, account_name, bank_name")
      .eq("account_number", receiver.account_number)
      .single();

    if (accountError || !virtualAccount) {
      console.error("Virtual account not found:", receiver.account_number);
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // 7. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", virtualAccount.user_id)
      .single();

    if (profileError || !profile) {
      console.error("User profile not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 8. Check if transaction already processed (prevent duplicates)
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference", transaction_id)
      .single();

    if (existingTx) {
      console.log("Transaction already processed:", transaction_id);
      return NextResponse.json({ message: "Already processed" });
    }

    // 9. Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();

    if (walletError) {
      console.error("Wallet not found");
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const currentBalance = parseFloat(wallet.balance || "0");
    const depositAmount = parseFloat(settlement_amount || amount_paid);
    const newBalance = currentBalance + depositAmount;

    // 10. Update wallet balance
    const { error: updateError } = await supabase
      .from("wallet")
      .update({ balance: newBalance.toString() })
      .eq("user_email", profile.email);

    if (updateError) {
      console.error("Failed to update wallet:", updateError);
      return NextResponse.json(
        { error: "Failed to update wallet" },
        { status: 500 }
      );
    }

    // 11. Record transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_email: profile.email,
      type: "deposit",
      amount: depositAmount.toString(),
      status: "completed",
      reference: transaction_id,
      description: `Wallet funding via ${receiver.bank}`,
      metadata: {
        payment_method: "bank_transfer",
        bank_name: sender.bank,
        account_number: sender.account_number,
        sender_name: sender.name,
        receiver_account: receiver.account_number,
        receiver_bank: receiver.bank,
        settlement_fee: settlement_fee,
        raw_amount: amount_paid,
        customer_name: customer.name,
        customer_email: customer.email,
        timestamp: timestamp,
        provider: "xixapay",
      },
    });

    if (txError) {
      console.error("Failed to record transaction:", txError);
      // Wallet was already updated, so log but don't fail
    }

    // 12. Create notification
    await supabase.from("notifications").insert({
      user_id: virtualAccount.user_id,
      notification_type: "deposit",
      message: `₦${depositAmount.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
      })} has been added to your wallet from ${sender.bank}`,
      is_read: false,
      metadata: {
        transaction_id: transaction_id,
        amount: depositAmount,
        sender: sender.name,
        bank: sender.bank,
      },
    });

    console.log("Wallet funded successfully:", {
      user: profile.email,
      amount: depositAmount,
      new_balance: newBalance,
    });

    return NextResponse.json({
      message: "Webhook processed successfully",
      transaction_id: transaction_id,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}