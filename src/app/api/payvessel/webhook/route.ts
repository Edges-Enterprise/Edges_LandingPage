// // app/api/payvessel/webhook/route.ts

// import { createServerClient } from "@/lib/supabase/server";
// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";

// // PayVessel trusted IP addresses (from documentation)
// const PAYVESSEL_IPS = ["3.255.23.38", "162.246.254.36"];

// /**
//  * Verify PayVessel webhook signature
//  * Uses HMAC SHA-512 as per PayVessel documentation
//  */
// function verifyPayvesselSignature(
//   payload: string,
//   signature: string | null
// ): boolean {
//   if (!signature) return false;

//   const secret = process.env.PAYVESSEL_API_SECRET!;
//   const hash = crypto
//     .createHmac("sha512", secret)
//     .update(payload)
//     .digest("hex");

//   return hash === signature;
// }

// /**
//  * Verify request comes from PayVessel IP
//  */
// function verifyPayvesselIP(request: NextRequest): boolean {
//   // Get IP from various headers (depends on your hosting)
//   const forwardedFor = request.headers.get("x-forwarded-for");
//   const realIP = request.headers.get("x-real-ip");
//   const remoteAddr = request.ip;

//   const ipAddress = forwardedFor?.split(",")[0] || realIP || remoteAddr || "";

//   console.log("Webhook IP:", ipAddress);

//   return PAYVESSEL_IPS.includes(ipAddress.trim());
// }

// export async function POST(request: NextRequest) {
//   try {
//     const rawBody = await request.text();
//     const payvesselSignature = request.headers.get("payvessel-http-signature");

//     console.log("PayVessel webhook received");
//     console.log("Signature:", payvesselSignature);

//     // Verify signature
//     if (!verifyPayvesselSignature(rawBody, payvesselSignature)) {
//       console.error("Invalid signature");
//       return NextResponse.json(
//         { message: "Permission denied, invalid hash" },
//         { status: 400 }
//       );
//     }

//     // Verify IP (optional - can be disabled for testing)
//     // if (!verifyPayvesselIP(request)) {
//     //   console.error("Invalid IP address");
//     //   return NextResponse.json(
//     //     { message: "Permission denied, invalid IP address" },
//     //     { status: 400 }
//     //   );
//     // }

//     const payload = JSON.parse(rawBody);
//     console.log("Webhook payload:", payload);

//     // Extract transaction details from PayVessel webhook structure
//     const amount = parseFloat(payload.order?.amount || "0");
//     const settlementAmount = parseFloat(
//       payload.order?.settlement_amount || "0"
//     );
//     const fee = parseFloat(payload.order?.fee || "0");
//     const reference = payload.transaction?.reference;
//     const description = payload.order?.description;

//     // Get account number and customer email from payload
//     const accountNumber = payload.account_number; // PayVessel sends this
//     const customerEmail = payload.customer?.email;

//     if (!reference || !accountNumber) {
//       console.error("Missing reference or account number");
//       return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
//     }

//     const supabase = await createServerClient();

//     // Check if transaction already exists (prevent duplicate processing)
//     const { data: existingTransaction } = await supabase
//       .from("transactions")
//       .select("id")
//       .eq("reference", reference)
//       .single();

//     if (existingTransaction) {
//       console.log("Transaction already exists:", reference);
//       return NextResponse.json(
//         { message: "transaction already exist" },
//         { status: 200 }
//       );
//     }

//     // Find user by virtual account number
//     const { data: virtualAccount } = await supabase
//       .from("virtual_accounts")
//       .select("user_id")
//       .eq("account_number", accountNumber)
//       .single();

//     if (!virtualAccount) {
//       console.error("Virtual account not found:", accountNumber);
//       return NextResponse.json(
//         { message: "Account not found" },
//         { status: 404 }
//       );
//     }

//     // Get user's email
//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("email")
//       .eq("id", virtualAccount.user_id)
//       .single();

//     if (!profile) {
//       console.error("Profile not found");
//       return NextResponse.json(
//         { message: "Profile not found" },
//         { status: 404 }
//       );
//     }

//     // Update wallet balance
//     const { data: wallet } = await supabase
//       .from("wallet")
//       .select("balance")
//       .eq("user_email", profile.email)
//       .single();

//     if (wallet) {
//       const currentBalance = parseFloat(wallet.balance || "0");
//       const newBalance = currentBalance + settlementAmount;

//       await supabase
//         .from("wallet")
//         .update({ balance: newBalance })
//         .eq("user_email", profile.email);

//       console.log(`Updated wallet: ${currentBalance} → ${newBalance}`);
//     } else {
//       // Create wallet if doesn't exist
//       await supabase.from("wallet").insert({
//         user_email: profile.email,
//         balance: settlementAmount,
//       });

//       console.log(`Created wallet with balance ${settlementAmount}`);
//     }

//     // Create transaction record
//     await supabase.from("transactions").insert({
//       user_email: profile.email,
//       amount: settlementAmount,
//       reference: reference,
//       status: "completed",
//       type: "deposit",
//       env: process.env.NODE_ENV === "production" ? "live" : "test",
//       metadata: {
//         method: "Bank Transfer",
//         details: description || "Wallet Funding",
//         amount_paid: amount,
//         settlement_amount: settlementAmount,
//         fee: fee,
//         account_number: accountNumber,
//         provider: "payvessel",
//       },
//     });

//     // Create notification
//     await supabase.from("notifications").insert({
//       user_id: virtualAccount.user_id,
//       notification_type: "deposit",
//       message: `Wallet funded successfully! ₦${settlementAmount.toLocaleString()} added to your account`,
//       is_read: false,
//       metadata: {
//         amount: settlementAmount,
//         reference,
//         fee,
//       },
//     });

//     console.log("Webhook processed successfully");

//     return NextResponse.json({ message: "success" }, { status: 200 });
//   } catch (error) {
//     console.error("Webhook processing error:", error);
//     return NextResponse.json(
//       { message: "Webhook processing failed" },
//       { status: 500 }
//     );
//   }
// }

// // GET endpoint for testing
// export async function GET() {
//   return NextResponse.json({
//     message: "PayVessel webhook endpoint active",
//     timestamp: new Date().toISOString(),
//   });
// }
