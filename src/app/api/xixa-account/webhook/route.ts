// src/app/api/xixa-account/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendWebPushAction } from "@/app/actions/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VirtualAccount {
  reseller_id?: string;
  customer_id?: string;
  account_number: string;
  account_name: string;
  customer_email: string;
  customer_name: string;
  bank_name?: string;
}

interface XixaPayPayload {
  transaction_id: string;
  amount_paid: string;
  settlement_amount?: string;
  settlement_fee?: string;
  receiver: {
    account_number: string;
    name: string;
    bank: string;
  };
  customer?: {
    name: string;
    email: string;
  };
  sender: {
    name: string;
    bank: string;
    account_number: string;
  };
  timestamp: string;
  notification_status: string;
  transaction_status: string;
}

interface AppConfig {
  name: string;
  txPrefix: string;
  supabase: SupabaseClient;
  walletTable: string;
  walletUserColumn: string;
}

const SATELLITE_APPS: AppConfig[] = [
  {
    name: "App2 (Bimbo)",
    txPrefix: "BB_",
    supabase: createClient(
      process.env.APP2_SUPABASE_URL!,
      process.env.APP2_SUPABASE_SECRET_KEY!,
    ),
    walletTable: "wallets",
    walletUserColumn: "user_id",
  },
  {
    name: "App3 (Alheri)",
    txPrefix: "AA_",
    supabase: createClient(
      process.env.APP3_SUPABASE_URL!,
      process.env.APP3_SUPABASE_SECRET_KEY!,
    ),
    walletTable: "wallets",
    walletUserColumn: "user_id",
  },
];

// ─── Fee calculation ──────────────────────────────────────────────────────────
function calculateFees(grossAmount: number): number {
  if (grossAmount >= 1 && grossAmount <= 9) return 0.2;
  if (grossAmount >= 10 && grossAmount <= 49) return 3;
  if (grossAmount >= 50 && grossAmount <= 99) return 5;
  if (grossAmount >= 100 && grossAmount <= 299) return 10;
  if (grossAmount >= 300 && grossAmount <= 499) return 20;
  if (grossAmount >= 500 && grossAmount <= 999) return 50;
  if (grossAmount >= 1000 && grossAmount <= 1499) return 70;
  if (grossAmount >= 1500 && grossAmount <= 4999) return 100;
  if (grossAmount >= 5000 && grossAmount <= 8999) return 150;
  const steps = Math.floor((grossAmount - 9000) / 4000);
  return 200 + steps * 50;
}

function calculateNetAmount(gross: number): number {
  return gross - calculateFees(gross);
}

// ==============================================================================
// RESELLER STORE PROCESSOR
// ==============================================================================

async function processForResellerStore(
  supabase: SupabaseClient,
  payload: XixaPayPayload,
): Promise<NextResponse | null> {
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
  const reference = `EDGE_${transaction_id}`;

  // 1. Check reseller_virtual_accounts
  const { data: resellerAccount } = await supabase
    .from("reseller_virtual_accounts")
    .select("*")
    .eq("account_number", receiver.account_number)
    .eq("status", "active")
    .single();

  if (resellerAccount) {
    console.log(
      "[Reseller Store] Found in reseller_virtual_accounts:",
      resellerAccount.account_number,
    );
    return processResellerDeposit(
      supabase,
      payload,
      resellerAccount,
      "reseller",
      reference,
    );
  }

  // 2. Check reseller_customer_virtual_accounts
  const { data: customerAccount } = await supabase
    .from("reseller_customer_virtual_accounts")
    .select("*")
    .eq("account_number", receiver.account_number)
    .eq("status", "active")
    .single();

  if (customerAccount) {
    console.log(
      "[Reseller Store] Found in reseller_customer_virtual_accounts:",
      customerAccount.account_number,
    );
    return processResellerDeposit(
      supabase,
      payload,
      customerAccount,
      "customer",
      reference,
    );
  }

  return null; // Not found in reseller tables
}

async function processResellerDeposit(
  supabase: SupabaseClient,
  payload: XixaPayPayload,
  account: VirtualAccount,
  accountType: "reseller" | "customer",
  reference: string,
): Promise<NextResponse> {
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

  // Duplicate check
  const { data: existingTx } = await supabase
    .from("reseller_transactions")
    .select("id")
    .eq("reference", reference)
    .single();

  if (existingTx) {
    console.log("[Reseller Store] Already processed:", transaction_id);
    return NextResponse.json({ message: "Already processed" });
  }

  // Calculate amounts
  const grossAmount = parseFloat(amount_paid);
  const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid);
  const xixaFee = grossAmount - xixaSettlementAmount;
  const platformFees = calculateFees(grossAmount);
  const finalNetAmount = calculateNetAmount(grossAmount);

  console.log("[Reseller Store] Fee breakdown:", {
    accountType,
    gross: grossAmount,
    xixa_fee: xixaFee,
    platform_fees: platformFees,
    final_net: finalNetAmount,
  });

  if (accountType === "reseller") {
    // ================================================================
    // RESELLER DEPOSIT
    // ================================================================

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from("reseller_wallets")
      .select("id, balance")
      .eq("reseller_id", account.reseller_id)
      .single();

    let currentBalance = 0;

    if (walletError || !wallet) {
      // Create wallet if it doesn't exist
      console.log("[Reseller Store] Creating new reseller wallet");
      await supabase.from("reseller_wallets").insert({
        reseller_id: account.reseller_id,
        balance: finalNetAmount,
        total_sales: 0,
        total_profit: 0,
      });
    } else {
      currentBalance = parseFloat(wallet.balance || "0");
      const newBalance = currentBalance + finalNetAmount;

      await supabase
        .from("reseller_wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("reseller_id", account.reseller_id);
    }

    const newBalance = currentBalance + finalNetAmount;

    // Record transaction
    const { error: txError } = await supabase
      .from("reseller_transactions")
      .insert({
        reseller_id: account.reseller_id,
        amount: finalNetAmount,
        type: "deposit",
        status: "completed",
        reference,
        metadata: {
          payment_method: "bank_transfer",
          bank_name: sender.bank,
          account_number: sender.account_number,
          sender_name: sender.name,
          receiver_account: receiver.account_number,
          receiver_bank: receiver.bank,
          gross_amount: grossAmount,
          platform_fees: platformFees,
          xixa_fee: xixaFee,
          final_net: finalNetAmount,
          previous_balance: currentBalance,
          new_balance: newBalance,
          customer_name: customer?.name,
          customer_email: customer?.email,
          timestamp,
          provider: "xixapay",
          verified_by: "reseller-webhook",
        },
      });

    if (txError) {
      console.error("[Reseller Store] Failed to record transaction:", txError);
    }

    // Notification
    const { error: notifError } = await supabase
      .from("reseller_notifications")
      .insert({
        reseller_id: account.reseller_id,
        notification_type: "deposit",
        message: `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
        is_read: false,
        metadata: {
          transaction_id: reference,
          amount: finalNetAmount,
          fee_charged: platformFees,
          sender: sender.name,
          bank: sender.bank,
        },
      });

    if (notifError) {
      console.error(
        "[Reseller Store] Failed to create notification:",
        notifError,
      );
    }

    console.log("[Reseller Store] Reseller wallet funded:", {
      reseller_id: account.reseller_id,
      final_net: finalNetAmount,
      new_balance: newBalance,
    });
  } else {
    // ================================================================
    // CUSTOMER DEPOSIT
    // ================================================================

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from("reseller_customer_wallets")
      .select("id, balance")
      .eq("reseller_id", account.reseller_id)
      .eq("customer_id", account.customer_id)
      .single();

    let currentBalance = 0;

    if (walletError || !wallet) {
      // Create wallet if it doesn't exist
      console.log("[Reseller Store] Creating new customer wallet");
      await supabase.from("reseller_customer_wallets").insert({
        reseller_id: account.reseller_id,
        customer_id: account.customer_id,
        balance: finalNetAmount,
        total_spent: 0,
      });
    } else {
      currentBalance = parseFloat(wallet.balance || "0");
      const newBalance = currentBalance + finalNetAmount;

      await supabase
        .from("reseller_customer_wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);
    }

    const newBalance = currentBalance + finalNetAmount;

    // Record order as deposit
    // ✅ RECORD CUSTOMER TRANSACTION
    const { error: txError } = await supabase
      .from("reseller_customer_transactions")
      .insert({
        reseller_id: account.reseller_id,
        customer_id: account.customer_id,
        type: "deposit",
        amount: grossAmount, // Original amount before fees
        fee: platformFees, // Total fees charged
        net_amount: finalNetAmount, // Amount actually credited
        previous_balance: currentBalance,
        new_balance: newBalance,
        reference: `DEP_${transaction_id}`,
        status: "completed",
        description: `Wallet funding via ${sender.bank}`,
        metadata: {
          payment_method: "bank_transfer",
          bank_name: sender.bank,
          account_number: sender.account_number,
          sender_name: sender.name,
          receiver_account: receiver.account_number,
          receiver_bank: receiver.bank,
          gross_amount: grossAmount,
          platform_fees: platformFees,
          xixa_fee: xixaFee,
          xixa_settlement_amount: xixaSettlementAmount,
          customer_email: account.customer_email,
          customer_name: account.customer_name,
          timestamp,
          provider: "xixapay",
          verified_by: "reseller-webhook",
        },
      });

    if (txError) {
      console.error(
        "[Reseller Store] Failed to record customer transaction:",
        txError,
      );
    }

    // Notification
    const { error: notifError } = await supabase
      .from("reseller_customer_notifications")
      .insert({
        reseller_id: account.reseller_id,
        customer_id: account.customer_id,
        notification_type: "deposit",
        message: `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
        is_read: false,
        metadata: {
          transaction_id: `DEP_${transaction_id}`,
          amount: finalNetAmount,
          fee_charged: platformFees,
          sender: sender.name,
          bank: sender.bank,
        },
      });

    if (notifError) {
      console.error(
        "[Reseller Store] Failed to create notification:",
        notifError,
      );
    }

    console.log("[Reseller Store] Customer wallet funded:", {
      customer_id: account.customer_id,
      reseller_id: account.reseller_id,
      gross: grossAmount,
      fees: platformFees,
      final_net: finalNetAmount,
      new_balance: newBalance,
    });
  }

  return NextResponse.json({
    message: `Processed ${accountType} deposit`,
    transaction_id,
  });
}

// ─── Generic satellite app processor ─────────────────────────────────────────
async function processForSatelliteApp(
  app: AppConfig,
  payload: XixaPayPayload,
): Promise<NextResponse | null> {
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
  const db = app.supabase;

  const { data: virtualAccount, error: accountError } = await db
    .from("virtual_accounts")
    .select("user_id, account_number, account_name, bank_name")
    .eq("account_number", receiver.account_number)
    .eq("account_name", receiver.name)
    .single();

  if (accountError || !virtualAccount) {
    console.log(`[${app.name}] Account not found: ${receiver.account_number}`);
    return null;
  }

  console.log(`[${app.name}] Account found! Processing...`);

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("email")
    .eq("id", virtualAccount.user_id)
    .single();

  if (profileError || !profile) {
    console.error(
      `[${app.name}] Profile not found for user:`,
      virtualAccount.user_id,
    );
    return NextResponse.json(
      { error: `[${app.name}] User not found` },
      { status: 404 },
    );
  }

  const reference = `${app.txPrefix}${transaction_id}`;
  const { data: existingTx } = await db
    .from("transactions")
    .select("id")
    .eq("reference", reference)
    .single();

  if (existingTx) {
    console.log(`[${app.name}] Already processed:`, transaction_id);
    return NextResponse.json({ message: "Already processed" });
  }

  const walletLookupValue =
    app.walletUserColumn === "user_email"
      ? profile.email
      : virtualAccount.user_id;

  const { data: wallet, error: walletError } = await db
    .from(app.walletTable)
    .select("id, balance")
    .eq(app.walletUserColumn, walletLookupValue)
    .single();

  if (walletError || !wallet) {
    console.error(`[${app.name}] Wallet not found for:`, walletLookupValue);
    return NextResponse.json(
      { error: `[${app.name}] Wallet not found` },
      { status: 404 },
    );
  }

  const grossAmount = parseFloat(amount_paid);
  const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid);
  const xixaFee = grossAmount - xixaSettlementAmount;
  const platformFees = calculateFees(grossAmount);
  const finalNetAmount = calculateNetAmount(grossAmount);
  const currentBalance = parseFloat(wallet.balance || "0");
  const newBalance = currentBalance + finalNetAmount;

  console.log(`[${app.name}] Fee breakdown:`, {
    gross: grossAmount,
    xixa_fee: xixaFee,
    platform_fees: platformFees,
    final_net: finalNetAmount,
    new_balance: newBalance,
  });

  const { error: updateError } = await db
    .from(app.walletTable)
    .update({
      balance: newBalance.toString(),
      updated_at: new Date().toISOString(),
    })
    .eq(app.walletUserColumn, walletLookupValue);

  if (updateError) {
    console.error(`[${app.name}] Failed to update wallet:`, updateError);
    return NextResponse.json(
      { error: `[${app.name}] Failed to update wallet` },
      { status: 500 },
    );
  }

  const { error: txError } = await db.from("transactions").insert({
    user_id: virtualAccount.user_id,
    type: "deposit",
    service: "Wallet Funding",
    network: receiver.bank || "Bank Transfer",
    amount: finalNetAmount.toString(),
    previous_balance: currentBalance.toString(),
    new_balance: newBalance.toString(),
    status: "completed",
    reference,
    description: `Wallet funded via ${receiver.bank}`,
    provider_reference: transaction_id,
    provider_response: {
      payment_method: "bank_transfer",
      bank_name: sender.bank,
      account_number: sender.account_number,
      sender_name: sender.name,
      receiver_account: receiver.account_number,
      receiver_bank: receiver.bank,
      xixa_settlement_fee: settlement_fee,
      xixa_raw_amount: amount_paid,
      platform_fees: platformFees,
      xixa_fee_absorbed: xixaFee,
      gross_after_xixa: xixaSettlementAmount,
      customer_name: customer?.name,
      customer_email: customer?.email,
      timestamp,
      original_reference: transaction_id,
      provider: "xixapay",
      verified_by: `${app.name}-webhook-forward`,
      channel: "bank_transfer",
    },
    completed_at: new Date().toISOString(),
  });

  if (txError) {
    console.error(`[${app.name}] Failed to record transaction:`, txError);
  }

  await db.from("notifications").insert({
    user_id: virtualAccount.user_id,
    notification_type: "deposit",
    message: `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
    is_read: false,
    metadata: {
      transaction_id: reference,
      amount: finalNetAmount,
      fee_charged: platformFees,
      sender: sender.name,
      bank: sender.bank,
    },
  });

  console.log(`[${app.name}] Processed successfully:`, {
    user: profile.email,
    final_net: finalNetAmount,
    new_balance: newBalance,
  });

  return NextResponse.json({
    message: `Processed by ${app.name}`,
    transaction_id,
  });
}

// ==============================================================================
// MAIN WEBHOOK HANDLER
// ==============================================================================

// ==============================================================================
// MAIN WEBHOOK HANDLER
// ==============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Raw body + signature
    const rawBody = await req.text();
    const signature = req.headers.get("xixapay");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // 2. Verify signature
    const calculatedSignature = crypto
      .createHmac("sha256", process.env.XIXAPAY_SECRET_KEY!)
      .update(rawBody)
      .digest("hex");

    if (calculatedSignature !== signature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Parse payload
    const payload: XixaPayPayload = JSON.parse(rawBody);
    console.log("Webhook received:", {
      status: payload.notification_status,
      transaction_id: payload.transaction_id,
      amount: payload.amount_paid,
      receiver_account: payload.receiver?.account_number,
    });

    // 4. Only process successful payments
    if (
      payload.notification_status !== "payment_successful" ||
      payload.transaction_status !== "success"
    ) {
      return NextResponse.json({ message: "Ignored" });
    }

    const supabase = await createServerClient();

    // ── STEP 4.5: Record toward the central Xixapay wallet ledger ────────────
    // Runs once per successful payment, independent of which downstream app
    // (reseller/customer, App1, satellite apps) ends up claiming it below.
    // This is what auto-sweep-xixapay reads, since Xixapay has no balance API.
    // NOTE: recording the NET amount (after platform fees) per instruction —
    // this means accumulated platform fees stay in the Xixapay wallet and are
    // NOT captured by auto-sweep. Handle that fee revenue via a separate,
    // manual withdrawal if needed.
    try {
      const ledgerAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const ledgerGrossAmount = parseFloat(payload.amount_paid);
      const ledgerNetAmount = calculateNetAmount(ledgerGrossAmount);

      const { error: ledgerError } = await ledgerAdmin
        .from("xixapay_wallet_ledger")
        .upsert(
          {
            transaction_id: payload.transaction_id,
            type: "deposit",
            amount: ledgerNetAmount,
            raw_payload: payload,
          },
          { onConflict: "transaction_id", ignoreDuplicates: true },
        );

      if (ledgerError) {
        console.error(
          "Failed to record xixapay_wallet_ledger entry:",
          ledgerError,
        );
      }
    } catch (ledgerErr) {
      console.error(
        "Unexpected error recording xixapay_wallet_ledger entry:",
        ledgerErr,
      );
    }

    // ── STEP 5: Try reseller store tables FIRST ───────────────────────────────
    const resellerResult = await processForResellerStore(supabase, payload);
    if (resellerResult !== null) {
      return resellerResult;
    }

    // ── STEP 6: Try legacy App 1 ──────────────────────────────────────────────
    const {
      transaction_id,
      amount_paid,
      settlement_amount,
      settlement_fee,
      receiver,
      customer,
      sender,
      timestamp,
    } = payload; // ← ADD THIS DESTRUCTURING

    const { data: virtualAccount } = await supabase
      .from("virtual_accounts")
      .select("user_id, account_number, account_name, bank_name")
      .eq("account_number", receiver.account_number)
      .eq("account_name", receiver.name)
      .single();

    if (virtualAccount) {
      console.log("Account found in App 1, processing normally...");

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", virtualAccount.user_id)
        .single();

      if (!profile) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference", `Edges_Network_Web_${transaction_id}`)
        .single();

      if (existingTx) {
        return NextResponse.json({ message: "Already processed" });
      }

      const { data: wallet, error: walletError } = await supabase
        .from("wallet")
        .select("balance")
        .eq("user_email", profile.email)
        .single();

      if (walletError || !wallet) {
        return NextResponse.json(
          { error: "Wallet not found" },
          { status: 404 },
        );
      }

      const grossAmount = parseFloat(amount_paid);
      const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid);
      const xixaFee = grossAmount - xixaSettlementAmount;
      const platformFees = calculateFees(grossAmount);
      const finalNetAmount = calculateNetAmount(grossAmount);
      const currentBalance = parseFloat(wallet.balance || "0");
      const newBalance = currentBalance + finalNetAmount;

      await supabase
        .from("wallet")
        .update({ balance: newBalance.toString() })
        .eq("user_email", profile.email);

      await supabase.from("transactions").insert({
        user_email: profile.email,
        type: "deposit",
        amount: finalNetAmount.toString(),
        status: "completed",
        reference: `Edges_Network_Web_${transaction_id}`,
        description: `Wallet funding via ${receiver.bank}`,
        env: "live",
        metadata: {
          payment_method: "bank_transfer",
          bank_name: sender.bank,
          account_number: sender.account_number,
          sender_name: sender.name,
          receiver_account: receiver.account_number,
          receiver_bank: receiver.bank,
          xixa_settlement_fee: settlement_fee,
          xixa_raw_amount: amount_paid,
          platform_fees: platformFees,
          xixa_fee_absorbed: xixaFee,
          gross_after_xixa: xixaSettlementAmount,
          customer_name: customer?.name,
          customer_email: customer?.email,
          timestamp,
          original_reference: transaction_id,
          provider: "xixapay",
          verified_by: "xixapay-webhook",
          channel: "bank_transfer",
        },
      });

      await supabase.from("notifications").insert({
        user_id: virtualAccount.user_id,
        notification_type: "deposit",
        message: `₦${finalNetAmount.toLocaleString("en-NG", {
          minimumFractionDigits: 2,
        })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
        is_read: false,
        metadata: {
          transaction_id: `Edges_Network_Web_${transaction_id}`,
          amount: finalNetAmount,
          fee_charged: platformFees,
          sender: sender.name,
          bank: sender.bank,
        },
      });

      await sendWebPushAction(
        virtualAccount.user_id,
        "💰 Wallet Funded",
        `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} added to your wallet`,
      );

      console.log("App 1 wallet funded:", {
        user: profile.email,
        final_net: finalNetAmount,
        new_balance: newBalance,
      });

      return NextResponse.json({
        message: "Webhook processed successfully",
        transaction_id,
      });
    }

    // ── STEP 7: Try satellite apps ────────────────────────────────────────────
    console.log(
      "Account not in reseller stores or App 1, trying satellite apps...",
    );

    for (const app of SATELLITE_APPS) {
      const result = await processForSatelliteApp(app, payload);
      if (result !== null) {
        return result;
      }
    }

    // ── STEP 8: Not found anywhere ────────────────────────────────────────────
    console.error("Account not found in any app:", receiver.account_number);
    return NextResponse.json(
      { error: "Account not found in any app" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// // src/app/api/xixa-account/webhook/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createServerClient } from "@/lib/supabase/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import crypto from "crypto";
// import { sendWebPushAction } from "@/app/actions/notifications";

// // ─── Types ────────────────────────────────────────────────────────────────────
// interface VirtualAccount {
//   reseller_id?: string;
//   customer_id?: string;
//   account_number: string;
//   account_name: string;
//   customer_email: string;
//   customer_name: string;
//   bank_name?: string;
// }

// interface XixaPayPayload {
//   transaction_id: string;
//   amount_paid: string;
//   settlement_amount?: string;
//   settlement_fee?: string;
//   receiver: {
//     account_number: string;
//     name: string;
//     bank: string;
//   };
//   customer?: {
//     name: string;
//     email: string;
//   };
//   sender: {
//     name: string;
//     bank: string;
//     account_number: string;
//   };
//   timestamp: string;
//   notification_status: string;
//   transaction_status: string;
// }

// interface AppConfig {
//   name: string;
//   txPrefix: string;
//   supabase: SupabaseClient;
//   walletTable: string;
//   walletUserColumn: string;
// }

// const SATELLITE_APPS: AppConfig[] = [
//   {
//     name: "App2 (Bimbo)",
//     txPrefix: "BB_",
//     supabase: createClient(
//       process.env.APP2_SUPABASE_URL!,
//       process.env.APP2_SUPABASE_SECRET_KEY!,
//     ),
//     walletTable: "wallets",
//     walletUserColumn: "user_id",
//   },
//   {
//     name: "App3 (Alheri)",
//     txPrefix: "AA_",
//     supabase: createClient(
//       process.env.APP3_SUPABASE_URL!,
//       process.env.APP3_SUPABASE_SECRET_KEY!,
//     ),
//     walletTable: "wallets",
//     walletUserColumn: "user_id",
//   },
// ];

// // ─── Fee calculation ──────────────────────────────────────────────────────────
// function calculateFees(grossAmount: number): number {
//   if (grossAmount >= 1 && grossAmount <= 9) return 0.2;
//   if (grossAmount >= 10 && grossAmount <= 49) return 3;
//   if (grossAmount >= 50 && grossAmount <= 99) return 5;
//   if (grossAmount >= 100 && grossAmount <= 299) return 10;
//   if (grossAmount >= 300 && grossAmount <= 499) return 20;
//   if (grossAmount >= 500 && grossAmount <= 999) return 50;
//   if (grossAmount >= 1000 && grossAmount <= 1499) return 70;
//   if (grossAmount >= 1500 && grossAmount <= 4999) return 100;
//   if (grossAmount >= 5000 && grossAmount <= 8999) return 150;
//   const steps = Math.floor((grossAmount - 9000) / 4000);
//   return 200 + steps * 50;
// }

// function calculateNetAmount(gross: number): number {
//   return gross - calculateFees(gross);
// }

// // ==============================================================================
// // RESELLER STORE PROCESSOR
// // ==============================================================================

// async function processForResellerStore(
//   supabase: SupabaseClient,
//   payload: XixaPayPayload,
// ): Promise<NextResponse | null> {
//   const { transaction_id, amount_paid, settlement_amount, settlement_fee, receiver, customer, sender, timestamp } = payload;
//   const reference = `EDGE_${transaction_id}`;

//   // 1. Check reseller_virtual_accounts
//   const { data: resellerAccount } = await supabase
//     .from("reseller_virtual_accounts")
//     .select("*")
//     .eq("account_number", receiver.account_number)
//     .eq("status", "active")
//     .single();

//   if (resellerAccount) {
//     console.log("[Reseller Store] Found in reseller_virtual_accounts:", resellerAccount.account_number);
//     return processResellerDeposit(supabase, payload, resellerAccount, "reseller", reference);
//   }

//   // 2. Check reseller_customer_virtual_accounts
//   const { data: customerAccount } = await supabase
//     .from("reseller_customer_virtual_accounts")
//     .select("*")
//     .eq("account_number", receiver.account_number)
//     .eq("status", "active")
//     .single();

//   if (customerAccount) {
//     console.log("[Reseller Store] Found in reseller_customer_virtual_accounts:", customerAccount.account_number);
//     return processResellerDeposit(supabase, payload, customerAccount, "customer", reference);
//   }

//   return null; // Not found in reseller tables
// }

// async function processResellerDeposit(
//   supabase: SupabaseClient,
//   payload: XixaPayPayload,
//   account: VirtualAccount,
//   accountType: "reseller" | "customer",
//   reference: string,
// ): Promise<NextResponse> {
//   const { transaction_id, amount_paid, settlement_amount, settlement_fee, receiver, customer, sender, timestamp } = payload;

//   // Duplicate check
//   const { data: existingTx } = await supabase
//     .from("reseller_transactions")
//     .select("id")
//     .eq("reference", reference)
//     .single();

//   if (existingTx) {
//     console.log("[Reseller Store] Already processed:", transaction_id);
//     return NextResponse.json({ message: "Already processed" });
//   }

//   // Calculate amounts
//   const grossAmount = parseFloat(amount_paid);
//   const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid);
//   const xixaFee = grossAmount - xixaSettlementAmount;
//   const platformFees = calculateFees(grossAmount);
//   const finalNetAmount = calculateNetAmount(grossAmount);

//   console.log("[Reseller Store] Fee breakdown:", {
//     accountType,
//     gross: grossAmount,
//     xixa_fee: xixaFee,
//     platform_fees: platformFees,
//     final_net: finalNetAmount,
//   });

//   if (accountType === "reseller") {
//     // ================================================================
//     // RESELLER DEPOSIT
//     // ================================================================

//     // Get wallet
//     const { data: wallet, error: walletError } = await supabase
//       .from("reseller_wallets")
//       .select("id, balance")
//       .eq("reseller_id", account.reseller_id)
//       .single();

//     let currentBalance = 0;

//     if (walletError || !wallet) {
//       // Create wallet if it doesn't exist
//       console.log("[Reseller Store] Creating new reseller wallet");
//       await supabase.from("reseller_wallets").insert({
//         reseller_id: account.reseller_id,
//         balance: finalNetAmount,
//         total_sales: 0,
//         total_profit: 0,
//       });
//     } else {
//       currentBalance = parseFloat(wallet.balance || "0");
//       const newBalance = currentBalance + finalNetAmount;

//       await supabase
//         .from("reseller_wallets")
//         .update({ balance: newBalance, updated_at: new Date().toISOString() })
//         .eq("reseller_id", account.reseller_id);
//     }

//     const newBalance = currentBalance + finalNetAmount;

//     // Record transaction
//     const { error: txError } = await supabase
//       .from("reseller_transactions")
//       .insert({
//         reseller_id: account.reseller_id,
//         amount: finalNetAmount,
//         type: "deposit",
//         status: "completed",
//         reference,
//         metadata: {
//           payment_method: "bank_transfer",
//           bank_name: sender.bank,
//           account_number: sender.account_number,
//           sender_name: sender.name,
//           receiver_account: receiver.account_number,
//           receiver_bank: receiver.bank,
//           gross_amount: grossAmount,
//           platform_fees: platformFees,
//           xixa_fee: xixaFee,
//           final_net: finalNetAmount,
//           previous_balance: currentBalance,
//           new_balance: newBalance,
//           customer_name: customer?.name,
//           customer_email: customer?.email,
//           timestamp,
//           provider: "xixapay",
//           verified_by: "reseller-webhook",
//         },
//       });

//     if (txError) {
//       console.error("[Reseller Store] Failed to record transaction:", txError);
//     }

//     // Notification
//     const { error: notifError } = await supabase
//       .from("reseller_notifications")
//       .insert({
//         reseller_id: account.reseller_id,
//         notification_type: "deposit",
//         message: `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
//         is_read: false,
//         metadata: {
//           transaction_id: reference,
//           amount: finalNetAmount,
//           fee_charged: platformFees,
//           sender: sender.name,
//           bank: sender.bank,
//         },
//       });

//     if (notifError) {
//       console.error(
//         "[Reseller Store] Failed to create notification:",
//         notifError,
//       );
//     }

//     console.log("[Reseller Store] Reseller wallet funded:", {
//       reseller_id: account.reseller_id,
//       final_net: finalNetAmount,
//       new_balance: newBalance,
//     });
//   } else {
//     // ================================================================
//     // CUSTOMER DEPOSIT
//     // ================================================================

//     // Get wallet
//     const { data: wallet, error: walletError } = await supabase
//       .from("reseller_customer_wallets")
//       .select("id, balance")
//       .eq("reseller_id", account.reseller_id)
//       .eq("customer_id", account.customer_id)
//       .single();

//     let currentBalance = 0;

//     if (walletError || !wallet) {
//       // Create wallet if it doesn't exist
//       console.log("[Reseller Store] Creating new customer wallet");
//       await supabase.from("reseller_customer_wallets").insert({
//         reseller_id: account.reseller_id,
//         customer_id: account.customer_id,
//         balance: finalNetAmount,
//         total_spent: 0,
//       });
//     } else {
//       currentBalance = parseFloat(wallet.balance || "0");
//       const newBalance = currentBalance + finalNetAmount;

//       await supabase
//         .from("reseller_customer_wallets")
//         .update({ balance: newBalance, updated_at: new Date().toISOString() })
//         .eq("id", wallet.id);
//     }

//     const newBalance = currentBalance + finalNetAmount;

//     // Record order as deposit
//     // ✅ RECORD CUSTOMER TRANSACTION
//     const { error: txError } = await supabase
//       .from("reseller_customer_transactions")
//       .insert({
//         reseller_id: account.reseller_id,
//         customer_id: account.customer_id,
//         type: "deposit",
//         amount: grossAmount, // Original amount before fees
//         fee: platformFees, // Total fees charged
//         net_amount: finalNetAmount, // Amount actually credited
//         previous_balance: currentBalance,
//         new_balance: newBalance,
//         reference: `DEP_${transaction_id}`,
//         status: "completed",
//         description: `Wallet funding via ${sender.bank}`,
//         metadata: {
//           payment_method: "bank_transfer",
//           bank_name: sender.bank,
//           account_number: sender.account_number,
//           sender_name: sender.name,
//           receiver_account: receiver.account_number,
//           receiver_bank: receiver.bank,
//           gross_amount: grossAmount,
//           platform_fees: platformFees,
//           xixa_fee: xixaFee,
//           xixa_settlement_amount: xixaSettlementAmount,
//           customer_email: account.customer_email,
//           customer_name: account.customer_name,
//           timestamp,
//           provider: "xixapay",
//           verified_by: "reseller-webhook",
//         },
//       });

//     if (txError) {
//       console.error(
//         "[Reseller Store] Failed to record customer transaction:",
//         txError,
//       );
//     }

//     // Notification
//     const { error: notifError } = await supabase
//       .from("reseller_customer_notifications")
//       .insert({
//         reseller_id: account.reseller_id,
//         customer_id: account.customer_id,
//         notification_type: "deposit",
//         message: `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
//         is_read: false,
//         metadata: {
//           transaction_id: `DEP_${transaction_id}`,
//           amount: finalNetAmount,
//           fee_charged: platformFees,
//           sender: sender.name,
//           bank: sender.bank,
//         },
//       });

//     if (notifError) {
//       console.error(
//         "[Reseller Store] Failed to create notification:",
//         notifError,
//       );
//     }

//     console.log("[Reseller Store] Customer wallet funded:", {
//       customer_id: account.customer_id,
//       reseller_id: account.reseller_id,
//       gross: grossAmount,
//       fees: platformFees,
//       final_net: finalNetAmount,
//       new_balance: newBalance,
//     });
//   }

//   return NextResponse.json({
//     message: `Processed ${accountType} deposit`,
//     transaction_id,
//   });
// }

// // ─── Generic satellite app processor ─────────────────────────────────────────
// async function processForSatelliteApp(
//   app: AppConfig,
//   payload: XixaPayPayload,
// ): Promise<NextResponse | null> {
//   const {
//     transaction_id,
//     amount_paid,
//     settlement_amount,
//     settlement_fee,
//     receiver,
//     customer,
//     sender,
//     timestamp,
//   } = payload;
//   const db = app.supabase;

//   const { data: virtualAccount, error: accountError } = await db
//     .from("virtual_accounts")
//     .select("user_id, account_number, account_name, bank_name")
//     .eq("account_number", receiver.account_number)
//     .eq("account_name", receiver.name)
//     .single();

//   if (accountError || !virtualAccount) {
//     console.log(`[${app.name}] Account not found: ${receiver.account_number}`);
//     return null;
//   }

//   console.log(`[${app.name}] Account found! Processing...`);

//   const { data: profile, error: profileError } = await db
//     .from("profiles")
//     .select("email")
//     .eq("id", virtualAccount.user_id)
//     .single();

//   if (profileError || !profile) {
//     console.error(`[${app.name}] Profile not found for user:`, virtualAccount.user_id);
//     return NextResponse.json({ error: `[${app.name}] User not found` }, { status: 404 });
//   }

//   const reference = `${app.txPrefix}${transaction_id}`;
//   const { data: existingTx } = await db
//     .from("transactions")
//     .select("id")
//     .eq("reference", reference)
//     .single();

//   if (existingTx) {
//     console.log(`[${app.name}] Already processed:`, transaction_id);
//     return NextResponse.json({ message: "Already processed" });
//   }

//   const walletLookupValue = app.walletUserColumn === "user_email" ? profile.email : virtualAccount.user_id;

//   const { data: wallet, error: walletError } = await db
//     .from(app.walletTable)
//     .select("id, balance")
//     .eq(app.walletUserColumn, walletLookupValue)
//     .single();

//   if (walletError || !wallet) {
//     console.error(`[${app.name}] Wallet not found for:`, walletLookupValue);
//     return NextResponse.json({ error: `[${app.name}] Wallet not found` }, { status: 404 });
//   }

//   const grossAmount = parseFloat(amount_paid);
//   const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid);
//   const xixaFee = grossAmount - xixaSettlementAmount;
//   const platformFees = calculateFees(grossAmount);
//   const finalNetAmount = calculateNetAmount(grossAmount);
//   const currentBalance = parseFloat(wallet.balance || "0");
//   const newBalance = currentBalance + finalNetAmount;

//   console.log(`[${app.name}] Fee breakdown:`, {
//     gross: grossAmount,
//     xixa_fee: xixaFee,
//     platform_fees: platformFees,
//     final_net: finalNetAmount,
//     new_balance: newBalance,
//   });

//   const { error: updateError } = await db
//     .from(app.walletTable)
//     .update({
//       balance: newBalance.toString(),
//       updated_at: new Date().toISOString(),
//     })
//     .eq(app.walletUserColumn, walletLookupValue);

//   if (updateError) {
//     console.error(`[${app.name}] Failed to update wallet:`, updateError);
//     return NextResponse.json({ error: `[${app.name}] Failed to update wallet` }, { status: 500 });
//   }

//   const { error: txError } = await db.from("transactions").insert({
//     user_id: virtualAccount.user_id,
//     type: "deposit",
//     service: "Wallet Funding",
//     network: receiver.bank || "Bank Transfer",
//     amount: finalNetAmount.toString(),
//     previous_balance: currentBalance.toString(),
//     new_balance: newBalance.toString(),
//     status: "completed",
//     reference,
//     description: `Wallet funded via ${receiver.bank}`,
//     provider_reference: transaction_id,
//     provider_response: {
//       payment_method: "bank_transfer",
//       bank_name: sender.bank,
//       account_number: sender.account_number,
//       sender_name: sender.name,
//       receiver_account: receiver.account_number,
//       receiver_bank: receiver.bank,
//       xixa_settlement_fee: settlement_fee,
//       xixa_raw_amount: amount_paid,
//       platform_fees: platformFees,
//       xixa_fee_absorbed: xixaFee,
//       gross_after_xixa: xixaSettlementAmount,
//       customer_name: customer?.name,
//       customer_email: customer?.email,
//       timestamp,
//       original_reference: transaction_id,
//       provider: "xixapay",
//       verified_by: `${app.name}-webhook-forward`,
//       channel: "bank_transfer",
//     },
//     completed_at: new Date().toISOString(),
//   });

//   if (txError) {
//     console.error(`[${app.name}] Failed to record transaction:`, txError);
//   }

//   await db.from("notifications").insert({
//     user_id: virtualAccount.user_id,
//     notification_type: "deposit",
//     message: `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
//     is_read: false,
//     metadata: {
//       transaction_id: reference,
//       amount: finalNetAmount,
//       fee_charged: platformFees,
//       sender: sender.name,
//       bank: sender.bank,
//     },
//   });

//   console.log(`[${app.name}] Processed successfully:`, {
//     user: profile.email,
//     final_net: finalNetAmount,
//     new_balance: newBalance,
//   });

//   return NextResponse.json({
//     message: `Processed by ${app.name}`,
//     transaction_id,
//   });
// }

// // ==============================================================================
// // MAIN WEBHOOK HANDLER
// // ==============================================================================

// // ==============================================================================
// // MAIN WEBHOOK HANDLER
// // ==============================================================================

// export async function POST(req: NextRequest) {
//   try {
//     // 1. Raw body + signature
//     const rawBody = await req.text();
//     const signature = req.headers.get("xixapay");

//     if (!signature) {
//       return NextResponse.json({ error: "Missing signature" }, { status: 400 });
//     }

//     // 2. Verify signature
//     const calculatedSignature = crypto
//       .createHmac("sha256", process.env.XIXAPAY_SECRET_KEY!)
//       .update(rawBody)
//       .digest("hex");

//     if (calculatedSignature !== signature) {
//       console.error("Invalid webhook signature");
//       return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
//     }

//     // 3. Parse payload
//     const payload: XixaPayPayload = JSON.parse(rawBody);
//     console.log("Webhook received:", {
//       status: payload.notification_status,
//       transaction_id: payload.transaction_id,
//       amount: payload.amount_paid,
//       receiver_account: payload.receiver?.account_number,
//     });

//     // 4. Only process successful payments
//     if (
//       payload.notification_status !== "payment_successful" ||
//       payload.transaction_status !== "success"
//     ) {
//       return NextResponse.json({ message: "Ignored" });
//     }

//     const supabase = await createServerClient();

//     // ── STEP 5: Try reseller store tables FIRST ───────────────────────────────
//     const resellerResult = await processForResellerStore(supabase, payload);
//     if (resellerResult !== null) {
//       return resellerResult;
//     }

//     // ── STEP 6: Try legacy App 1 ──────────────────────────────────────────────
//     const {
//       transaction_id,
//       amount_paid,
//       settlement_amount,
//       settlement_fee,
//       receiver,
//       customer,
//       sender,
//       timestamp
//     } = payload; // ← ADD THIS DESTRUCTURING

//     const { data: virtualAccount } = await supabase
//       .from("virtual_accounts")
//       .select("user_id, account_number, account_name, bank_name")
//       .eq("account_number", receiver.account_number)
//       .eq("account_name", receiver.name)
//       .single();

//     if (virtualAccount) {
//       console.log("Account found in App 1, processing normally...");

//       const { data: profile } = await supabase
//         .from("profiles")
//         .select("email")
//         .eq("id", virtualAccount.user_id)
//         .single();

//       if (!profile) {
//         return NextResponse.json({ error: "User not found" }, { status: 404 });
//       }

//       const { data: existingTx } = await supabase
//         .from("transactions")
//         .select("id")
//         .eq("reference", `Edges_Network_Web_${transaction_id}`)
//         .single();

//       if (existingTx) {
//         return NextResponse.json({ message: "Already processed" });
//       }

//       const { data: wallet, error: walletError } = await supabase
//         .from("wallet")
//         .select("balance")
//         .eq("user_email", profile.email)
//         .single();

//       if (walletError || !wallet) {
//         return NextResponse.json(
//           { error: "Wallet not found" },
//           { status: 404 },
//         );
//       }

//       const grossAmount = parseFloat(amount_paid);
//       const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid);
//       const xixaFee = grossAmount - xixaSettlementAmount;
//       const platformFees = calculateFees(grossAmount);
//       const finalNetAmount = calculateNetAmount(grossAmount);
//       const currentBalance = parseFloat(wallet.balance || "0");
//       const newBalance = currentBalance + finalNetAmount;

//       await supabase
//         .from("wallet")
//         .update({ balance: newBalance.toString() })
//         .eq("user_email", profile.email);

//       await supabase.from("transactions").insert({
//         user_email: profile.email,
//         type: "deposit",
//         amount: finalNetAmount.toString(),
//         status: "completed",
//         reference: `Edges_Network_Web_${transaction_id}`,
//         description: `Wallet funding via ${receiver.bank}`,
//         env: "live",
//         metadata: {
//           payment_method: "bank_transfer",
//           bank_name: sender.bank,
//           account_number: sender.account_number,
//           sender_name: sender.name,
//           receiver_account: receiver.account_number,
//           receiver_bank: receiver.bank,
//           xixa_settlement_fee: settlement_fee,
//           xixa_raw_amount: amount_paid,
//           platform_fees: platformFees,
//           xixa_fee_absorbed: xixaFee,
//           gross_after_xixa: xixaSettlementAmount,
//           customer_name: customer?.name,
//           customer_email: customer?.email,
//           timestamp,
//           original_reference: transaction_id,
//           provider: "xixapay",
//           verified_by: "xixapay-webhook",
//           channel: "bank_transfer",
//         },
//       });

//       await supabase.from("notifications").insert({
//         user_id: virtualAccount.user_id,
//         notification_type: "deposit",
//         message: `₦${finalNetAmount.toLocaleString("en-NG", {
//           minimumFractionDigits: 2,
//         })} has been added to your wallet from ${sender.bank} (after ₦${platformFees.toLocaleString()} fee)`,
//         is_read: false,
//         metadata: {
//           transaction_id: `Edges_Network_Web_${transaction_id}`,
//           amount: finalNetAmount,
//           fee_charged: platformFees,
//           sender: sender.name,
//           bank: sender.bank,
//         },
//       });

//       await sendWebPushAction(
//         virtualAccount.user_id,
//         "💰 Wallet Funded",
//         `₦${finalNetAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} added to your wallet`,
//       );

//       console.log("App 1 wallet funded:", {
//         user: profile.email,
//         final_net: finalNetAmount,
//         new_balance: newBalance,
//       });

//       return NextResponse.json({
//         message: "Webhook processed successfully",
//         transaction_id,
//       });
//     }

//     // ── STEP 7: Try satellite apps ────────────────────────────────────────────
//     console.log("Account not in reseller stores or App 1, trying satellite apps...");

//     for (const app of SATELLITE_APPS) {
//       const result = await processForSatelliteApp(app, payload);
//       if (result !== null) {
//         return result;
//       }
//     }

//     // ── STEP 8: Not found anywhere ────────────────────────────────────────────
//     console.error("Account not found in any app:", receiver.account_number);
//     return NextResponse.json(
//       { error: "Account not found in any app" },
//       { status: 404 },
//     );
//   } catch (error) {
//     console.error("Webhook processing error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
