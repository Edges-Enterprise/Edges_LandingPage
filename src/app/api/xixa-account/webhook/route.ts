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
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // DEBUG: Log received values (remove after testing)
    console.log("=== WEBHOOK DEBUG START ===");
    console.log(
      "Received rawBody (first 200 chars):",
      rawBody.substring(0, 200) + (rawBody.length > 200 ? "..." : ""),
    );
    console.log("FULL:", JSON.stringify(rawBody, null, 2)); // add this
    console.log("Received signature:", signature);
    console.log(
      "Secret key length (safe):",
      process.env.XIXAPAY_SECRET_KEY?.length || "MISSING",
    );

    // 2. Verify the signature
    const secretKey = process.env.XIXAPAY_SECRET_KEY!;
    const calculatedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawBody)
      .digest("hex");

    // DEBUG: Log calculated values (remove after testing)
    console.log("Calculated signature:", calculatedSignature);
    console.log("Signatures match?", calculatedSignature === signature);
    console.log("=== WEBHOOK DEBUG END ===");

    if (calculatedSignature !== signature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Parse the webhook payload
    const payload = JSON.parse(rawBody);
    console.log("Webhook received:", {
      status: payload.notification_status,
      transaction_id: payload.transaction_id,
      amount: payload.amount_paid,
    });
    console.log("FULL PAYLOAD:", JSON.stringify(payload, null, 2)); // add this
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
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
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
      .eq("reference", `Edges_Network_Web_${transaction_id}`) // Prefixed ref for consistency
      .single();

    if (existingTx) {
      console.log("Transaction already processed:", transaction_id);
      return NextResponse.json({ message: "Already processed" });
    }

    // // 9. Get current wallet balance
    // const { data: wallet, error: walletError } = await supabase
    //   .from("wallet")
    //   .select("balance")
    //   .eq("user_email", profile.email)
    //   .single();

    // if (walletError) {
    //   console.error("Wallet not found");
    //   return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    // }

    // // Tiered pricing calculation - returns the FEE amount (from Paystack webhook)
    // function calculateFees(grossAmount: number): number {
    //   if (grossAmount >= 500 && grossAmount <= 999) return 50;
    //   if (grossAmount >= 1000 && grossAmount <= 1499) return 70;
    //   if (grossAmount >= 1500 && grossAmount <= 4999) return 100;
    //   if (grossAmount >= 5000 && grossAmount <= 8999) return 150;

    //   // For 9000 and above
    //   const base = 9000;
    //   const basePrice = 200;
    //   const rangeSize = 4000;
    //   const increment = 50;
    //   const steps = Math.floor((grossAmount - base) / rangeSize);
    //   return basePrice + steps * increment;
    // }

    // // Calculate net amount by subtracting fees from gross amount
    // function calculateNetAmount(grossAmount: number): number {
    //   return grossAmount - calculateFees(grossAmount);
    // }

    // const grossAmount = parseFloat(amount_paid); // Xixa gross
    // const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid); // After Xixa fees
    // const platformFees = calculateFees(xixaSettlementAmount); // Your tiered fees on settlement
    // const finalNetAmount = calculateNetAmount(xixaSettlementAmount); // Final net after all fees

    // const currentBalance = parseFloat(wallet.balance || "0");
    // const newBalance = currentBalance + finalNetAmount;

    // // 10. Update wallet balance (with final net)
    // const { error: updateError } = await supabase
    //   .from("wallet")
    //   .update({ balance: newBalance.toString() })
    //   .eq("user_email", profile.email);

    // if (updateError) {
    //   console.error("Failed to update wallet:", updateError);
    //   return NextResponse.json(
    //     { error: "Failed to update wallet" },
    //     { status: 500 }
    //   );
    // }

    // // 11. Record transaction (net amount, prefixed ref, fees in metadata)
    // const { error: txError } = await supabase.from("transactions").insert({
    //   user_email: profile.email,
    //   type: "deposit",
    //   amount: finalNetAmount.toString(), // Final net after all fees
    //   status: "completed",
    //   reference: `Edges_Network_Web_${transaction_id}`, // Prefixed for consistency
    //   description: `Wallet funding via ${receiver.bank}`,
    //   env: "live",
    //   metadata: {
    //     payment_method: "bank_transfer",
    //     bank_name: sender.bank,
    //     account_number: sender.account_number,
    //     sender_name: sender.name,
    //     receiver_account: receiver.account_number,
    //     receiver_bank: receiver.bank,
    //     xixa_settlement_fee: settlement_fee,
    //     xixa_raw_amount: amount_paid,
    //     platform_fees: platformFees, // Your tiered fees
    //     gross_after_xixa: xixaSettlementAmount, // After Xixa fees, before platform
    //     customer_name: customer.name,
    //     customer_email: customer.email,
    //     timestamp: timestamp,
    //     original_reference: transaction_id, // Raw Xixa ID
    //     provider: "xixapay",
    //     verified_by: "xixapay-webhook",
    //     channel: "bank_transfer",
    //   },
    // });

    // if (txError) {
    //   console.error("Failed to record transaction:", txError);
    //   // Wallet was already updated, so log but don't fail
    // }

    // // 12. Create notification (use final net)
    // await supabase.from("notifications").insert({
    //   user_id: virtualAccount.user_id,
    //   notification_type: "deposit",
    //   message: `₦${finalNetAmount.toLocaleString("en-NG", {
    //     minimumFractionDigits: 2,
    //   })} has been added to your wallet from ${sender.bank}`,
    //   is_read: false,
    //   metadata: {
    //     transaction_id: `Edges_Network_Web_${transaction_id}`,
    //     amount: finalNetAmount,
    //     sender: sender.name,
    //     bank: sender.bank,
    //   },
    // });

    // console.log("Wallet funded successfully:", {
    //   user: profile.email,
    //   gross: grossAmount,
    //   xixa_settlement: xixaSettlementAmount,
    //   platform_fees: platformFees,
    //   final_net: finalNetAmount,
    //   new_balance: newBalance,
    // });
    // ... (rest of the code unchanged up to step 9)

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

    // Tiered pricing calculation - returns the FEE amount (unchanged)
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

      // For 9000 and above
      const base = 9000;
      const basePrice = 200;
      const rangeSize = 4000;
      const increment = 50;
      const steps = Math.floor((grossAmount - base) / rangeSize);
      return basePrice + steps * increment;
    }

    // NEW: Helper to calculate net (gross - fees), now applied to original gross
    function calculateNetAmount(grossAmount: number): number {
      return grossAmount - calculateFees(grossAmount);
    }

    const grossAmount = parseFloat(amount_paid); // Original gross received by Xixa (e.g., 500)
    const xixaSettlementAmount = parseFloat(settlement_amount || amount_paid); // After Xixa's 1% (e.g., 495)
    const xixaFee = grossAmount - xixaSettlementAmount; // Explicitly compute Xixa's fee (e.g., 5) for metadata

    // CHANGED: Calculate platform fees on GROSS (not settlement)
    const platformFees = calculateFees(grossAmount); // e.g., 50 for 500

    // CHANGED: Final net is based on gross - platform fees (absorbs Xixa fee)
    const finalNetAmount = calculateNetAmount(grossAmount); // e.g., 500 - 50 = 450

    const currentBalance = parseFloat(wallet.balance || "0");
    const newBalance = currentBalance + finalNetAmount;

    // CHANGED: Log to show absorption
    console.log("Fee calculation details:", {
      gross: grossAmount,
      xixa_fee: xixaFee,
      xixa_settlement: xixaSettlementAmount,
      platform_fees: platformFees,
      amount_absorbed_from_xixa: xixaFee, // Full absorption
      amount_kept_by_platform: xixaSettlementAmount - finalNetAmount, // e.g., 495 - 450 = 45
      final_net: finalNetAmount,
      new_balance: newBalance,
    });

    // 10. Update wallet balance (with final net) - unchanged
    const { error: updateError } = await supabase
      .from("wallet")
      .update({ balance: newBalance.toString() })
      .eq("user_email", profile.email);

    if (updateError) {
      console.error("Failed to update wallet:", updateError);
      return NextResponse.json(
        { error: "Failed to update wallet" },
        { status: 500 },
      );
    }

    // 11. Record transaction (net amount, prefixed ref, fees in metadata) - CHANGED metadata
    const { error: txError } = await supabase.from("transactions").insert({
      user_email: profile.email,
      type: "deposit",
      amount: finalNetAmount.toString(), // Final net after all (e.g., 450)
      status: "completed",
      reference: `Edges_Network_Web_${transaction_id}`, // Prefixed for consistency
      description: `Wallet funding via ${receiver.bank}`,
      env: "live",
      metadata: {
        payment_method: "bank_transfer",
        bank_name: sender.bank,
        account_number: sender.account_number,
        sender_name: sender.name,
        receiver_account: receiver.account_number,
        receiver_bank: receiver.bank,
        xixa_settlement_fee: settlement_fee, // Xixa's raw fee (e.g., 5)
        xixa_raw_amount: amount_paid, // Gross (500)
        // CHANGED: Platform fees on gross, plus absorption details
        platform_fees: platformFees, // e.g., 50 (the "charge" to user)
        xixa_fee_absorbed: xixaFee, // e.g., 5 (included in charges)
        gross_after_xixa: xixaSettlementAmount, // 495 (for audit)
        effective_total_fee: platformFees, // Present as 50 total charge to user
        customer_name: customer.name,
        customer_email: customer.email,
        timestamp: timestamp,
        original_reference: transaction_id, // Raw Xixa ID
        provider: "xixapay",
        verified_by: "xixapay-webhook",
        channel: "bank_transfer",
      },
    });

    if (txError) {
      console.error("Failed to record transaction:", txError);
      // Wallet was already updated, so log but don't fail
    }

    // 12. Create notification (use final net) - CHANGED message to reflect 50 charge
    await supabase.from("notifications").insert({
      user_id: virtualAccount.user_id,
      notification_type: "deposit",
      message: `₦${finalNetAmount.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
      })} has been added to your wallet from ${
        sender.bank
      } (after ₦${platformFees.toLocaleString()} fee)`,
      is_read: false,
      metadata: {
        transaction_id: `Edges_Network_Web_${transaction_id}`,
        amount: finalNetAmount,
        fee_charged: platformFees, // Explicitly show 50 as the charge
        sender: sender.name,
        bank: sender.bank,
      },
    });

    console.log("Wallet funded successfully:", {
      user: profile.email,
      gross: grossAmount,
      xixa_settlement: xixaSettlementAmount,
      xixa_fee: xixaFee,
      platform_fees: platformFees,
      final_net: finalNetAmount,
      new_balance: newBalance,
    });

    // ... (rest of the code unchanged)
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

// // src/app/api/xixa-account/webhook/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createServerClient } from "@/lib/supabase/server";
// import crypto from "crypto";

// export async function POST(req: NextRequest) {
//   try {
//     // 1. Get the raw body and signature
//     const rawBody = await req.text();
//     const signature = req.headers.get("xixapay");

//     if (!signature) {
//       console.error("Missing xixapay signature header");
//       return NextResponse.json({ error: "Missing signature" }, { status: 400 });
//     }

//     // DEBUG: Log received values (remove after testing)
//     console.log("=== WEBHOOK DEBUG START ===");
//     console.log(
//       "Received rawBody (first 200 chars):",
//       rawBody.substring(0, 200) + (rawBody.length > 200 ? "..." : "")
//     );
//     console.log("Received signature:", signature);
//     console.log(
//       "Secret key length (safe):",
//       process.env.XIXAPAY_SECRET_KEY?.length || "MISSING"
//     );

//     // 2. Verify the signature
//     const secretKey = process.env.XIXAPAY_SECRET_KEY!;
//     const calculatedSignature = crypto
//       .createHmac("sha256", secretKey)
//       .update(rawBody)
//       .digest("hex");

//     // DEBUG: Log calculated values (remove after testing)
//     console.log("Calculated signature:", calculatedSignature);
//     console.log("Signatures match?", calculatedSignature === signature);
//     console.log("=== WEBHOOK DEBUG END ===");

//     if (calculatedSignature !== signature) {
//       console.error("Invalid webhook signature");
//       return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
//     }

//     // 3. Parse the webhook payload
//     const payload = JSON.parse(rawBody);
//     console.log("Webhook received:", {
//       status: payload.notification_status,
//       transaction_id: payload.transaction_id,
//       amount: payload.amount_paid,
//     });

//     // 4. Only process successful payments
//     if (
//       payload.notification_status !== "payment_successful" ||
//       payload.transaction_status !== "success"
//     ) {
//       console.log("Ignoring non-successful payment");
//       return NextResponse.json({ message: "Ignored" });
//     }

//     // 5. Extract data
//     const {
//       transaction_id,
//       amount_paid,
//       settlement_amount,
//       settlement_fee,
//       receiver,
//       customer,
//       sender,
//       timestamp,
//     } = payload;

//     // 6. Find the user by account number
//     const supabase = await createServerClient();
//     const { data: virtualAccount, error: accountError } = await supabase
//       .from("virtual_accounts")
//       .select("user_id, account_number, account_name, bank_name")
//       .eq("account_number", receiver.account_number)
//       .single();

//     if (accountError || !virtualAccount) {
//       console.error("Virtual account not found:", receiver.account_number);
//       return NextResponse.json({ error: "Account not found" }, { status: 404 });
//     }

//     // 7. Get user profile
//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("email")
//       .eq("id", virtualAccount.user_id)
//       .single();

//     if (profileError || !profile) {
//       console.error("User profile not found");
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     // 8. Check if transaction already processed (prevent duplicates)
//     const { data: existingTx } = await supabase
//       .from("transactions")
//       .select("id")
//       .eq("reference", transaction_id)
//       .single();

//     if (existingTx) {
//       console.log("Transaction already processed:", transaction_id);
//       return NextResponse.json({ message: "Already processed" });
//     }

//     // 9. Get current wallet balance
//     const { data: wallet, error: walletError } = await supabase
//       .from("wallet")
//       .select("balance")
//       .eq("user_email", profile.email)
//       .single();

//     if (walletError) {
//       console.error("Wallet not found");
//       return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
//     }

//     const currentBalance = parseFloat(wallet.balance || "0");
//     const depositAmount = parseFloat(settlement_amount || amount_paid);
//     const newBalance = currentBalance + depositAmount;

//     // 10. Update wallet balance
//     const { error: updateError } = await supabase
//       .from("wallet")
//       .update({ balance: newBalance.toString() })
//       .eq("user_email", profile.email);

//     if (updateError) {
//       console.error("Failed to update wallet:", updateError);
//       return NextResponse.json(
//         { error: "Failed to update wallet" },
//         { status: 500 }
//       );
//     }

//     // 11. Record transaction (adapted to schema: numeric amount, env="live", description in metadata)
//     const { error: txError } = await supabase.from("transactions").insert({
//       user_email: profile.email,
//       type: "deposit",
//       amount: depositAmount, // Numeric, not string
//       status: "completed",
//       reference: `Edges_Network_Web_${transaction_id}`,
//       env: "live", // Matches your table standard
//       metadata: {
//         payment_method: "bank_transfer",
//         bank_name: sender.bank,
//         account_number: sender.account_number,
//         sender_name: sender.name,
//         receiver_account: receiver.account_number,
//         receiver_bank: receiver.bank,
//         settlement_fee: settlement_fee,
//         raw_amount: amount_paid,
//         customer_name: customer.name,
//         customer_email: customer.email,
//         timestamp: timestamp,
//         description: `Wallet funding via ${receiver.bank}`, // Moved here
//         provider: "xixapay",
//       },
//     });

//     if (txError) {
//       console.error("Failed to record transaction:", txError);
//       // Wallet was already updated, so log but don't fail
//     }

//     // 12. Create notification
//     await supabase.from("notifications").insert({
//       user_id: virtualAccount.user_id,
//       notification_type: "deposit",
//       message: `₦${depositAmount.toLocaleString("en-NG", {
//         minimumFractionDigits: 2,
//       })} has been added to your wallet from ${sender.bank}`,
//       is_read: false,
//       metadata: {
//         transaction_id: transaction_id,
//         amount: depositAmount,
//         sender: sender.name,
//         bank: sender.bank,
//       },
//     });

//     console.log("Wallet funded successfully:", {
//       user: profile.email,
//       amount: depositAmount,
//       new_balance: newBalance,
//     });

//     return NextResponse.json({
//       message: "Webhook processed successfully",
//       transaction_id: transaction_id,
//     });
//   } catch (error) {
//     console.error("Webhook processing error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
