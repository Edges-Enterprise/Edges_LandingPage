// src/app/api/webhooks/korapay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { korapay } from "@/lib/payments/korapay";
import { handleSuccessfulDeposit } from "@/actions/reseller/wallet/handleSuccessfulDeposit";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = request.headers;

    // Verify webhook signature
    const isValid = await korapay.verifyWebhook(body, headers);
    if (!isValid) {
      console.warn("Invalid Korapay webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook data
    const webhookData = korapay.parseWebhook(body);
    console.log("Korapay webhook received:", webhookData);

    // Handle successful charge
    if (webhookData.status === "completed") {
      const supabase = await createServerClient();

      // Get transaction by reference
      const { data: transaction, error: txError } = await supabase
        .from("global_transactions")
        .select("reseller_id, amount, status")
        .eq("reference", webhookData.reference)
        .single();

      if (txError || !transaction) {
        console.error("Transaction not found:", webhookData.reference);
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }

      // Skip if already processed
      if (transaction.status === "completed") {
        return NextResponse.json(
          { message: "Already processed" },
          { status: 200 },
        );
      }

      // Process the deposit
      const result = await handleSuccessfulDeposit({
        resellerId: transaction.reseller_id,
        amount: transaction.amount,
        reference: webhookData.reference,
        providerReference: webhookData.providerReference,
        currency: webhookData.currency || "GHS",
      });

      if (!result.success) {
        console.error("Failed to process deposit:", result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Korapay webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
