// src/app/api/reseller/[countryCode]/webhooks/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { getPaymentGateway } from "@/lib/payments";
import { checkAndAwardFirstDepositBonus } from "@/lib/bonus/first-deposit";

export async function POST(
  req: NextRequest,
  { params }: { params: { countryCode: string } },
) {
  const { countryCode } = await params;
  const body = await req.json();

  // Get the webhook provider from query or headers
  const provider = req.nextUrl.searchParams.get("provider") || "xixapay";

  try {
    const config = getCountryConfig(countryCode);
    const gateway = getPaymentGateway(provider);

    // Verify webhook signature
    const isValid = await gateway.verifyWebhook(body, req.headers);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook data
    const webhookData = gateway.parseWebhook(body);

    // Get Supabase client
    const supabase = await createServerClient();

    // Find the transaction
    const { data: transaction, error: txError } = await supabase
      .from("global_transactions")
      .select("*")
      .eq("reference", webhookData.reference)
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("global_transactions")
      .update({
        status: webhookData.status, // 'completed', 'failed', 'pending'
        provider_reference: webhookData.providerReference,
        completed_at:
          webhookData.status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) throw updateError;

    // If payment was successful, update wallet balance
    if (webhookData.status === "completed") {
      // Update wallet balance
      const { error: walletError } = await supabase.rpc(
        "update_wallet_after_deposit",
        {
          p_reseller_id: transaction.reseller_id,
          p_amount: transaction.amount,
        },
      );

      if (walletError) throw walletError;

      // Check for first deposit bonus (only if source is 'app')
      const source = transaction.metadata?.source || "web";
      if (source === "app") {
        await checkAndAwardFirstDepositBonus(
          transaction.reseller_id,
          transaction.amount,
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
