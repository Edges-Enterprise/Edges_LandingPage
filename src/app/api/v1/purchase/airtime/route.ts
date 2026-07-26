// app/api/v1/purchase/airtime/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiMiddleware } from "../../middleware";

export async function POST(req: Request) {
  try {
    const auth = await apiMiddleware(req as any);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // ✅ Guard against undefined user
    if (!auth.user) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      );
    }

    const { network, phoneNumber, amount } = await req.json();

    if (!network || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: "network, phoneNumber, and amount are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Check wallet balance
    const { data: wallet } = await supabase
      .from("api_users.wallets")
      .select("balance")
      .eq("user_id", auth.user.id)
      .single();

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: ₦${wallet?.balance || 0}, Required: ₦${amount}`,
        },
        { status: 400 },
      );
    }

    const requestId = `API_AIR_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/purchase-airtime`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: auth.user.id,
          userType: "api_user",
          network,
          phoneNumber,
          amount,
          requestId,
        }),
      },
    );

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Airtime purchase failed" },
        { status: 400 },
      );
    }

    await supabase.from("api_users.transactions").insert({
      user_id: auth.user.id,
      type: "purchase_airtime",
      amount: amount,
      previous_balance: wallet.balance,
      new_balance: wallet.balance - amount,
      status: "completed",
      reference: requestId,
      network: network,
      phone_number: phoneNumber,
      metadata: {
        response: result,
      },
    });

    await supabase.rpc("api_users.deduct_api_user_wallet", {
      p_user_id: auth.user.id,
      p_amount: amount,
      p_reference: requestId,
    });

    await triggerWebhooks(auth.user.id, "purchase.completed", {
      type: "airtime",
      network,
      amount,
      phoneNumber,
      reference: requestId,
    });

    return NextResponse.json({
      success: true,
      data: {
        reference: requestId,
        network,
        amount,
        phone_number: phoneNumber,
        message:
          result.message || `✅ ₦${amount} airtime purchased successfully!`,
        transaction_id: result.order_id,
      },
    });
  } catch (error) {
    console.error("Purchase airtime error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function triggerWebhooks(userId: string, event: string, data: any) {
  const supabase = createAdminClient();

  const { data: webhooks } = await supabase
    .from("api_users.webhooks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .contains("events", [event]);

  if (!webhooks?.length) return;

  for (const webhook of webhooks) {
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhook.secret && { "X-Webhook-Signature": webhook.secret }),
        },
        body: JSON.stringify(payload),
      });

      await supabase.from("api_users.webhook_logs").insert({
        webhook_id: webhook.id,
        event_type: event,
        payload: payload,
        response_status: response.status,
        response_body: await response.text(),
        delivered_at: new Date().toISOString(),
      });
    } catch (error: any) {
      await supabase.from("api_users.webhook_logs").insert({
        webhook_id: webhook.id,
        event_type: event,
        payload: data,
        error: error.message,
        delivered_at: new Date().toISOString(),
      });
    }
  }
}
