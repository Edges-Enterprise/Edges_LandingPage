// app/api/v1/purchase/data/route.ts
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
        { status: 401 }
      );
    }

    const { planId, phoneNumber, network } = await req.json();

    if (!planId || !phoneNumber) {
      return NextResponse.json(
        { error: "planId and phoneNumber are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the base plan
    const { data: plan, error: planError } = await supabase
      .from("reseller_base_plans")
      .select("*")
      .eq("plan_id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan not found or inactive" },
        { status: 404 }
      );
    }

    if (plan.plan_type?.toLowerCase() === "airtime") {
      return NextResponse.json(
        { error: "Use /purchase/airtime for airtime purchases" },
        { status: 400 }
      );
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from("api_users.wallets")
      .select("balance")
      .eq("user_id", auth.user.id)
      .single();

    if (!wallet || wallet.balance < plan.amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: ₦${wallet?.balance || 0}, Required: ₦${plan.amount}`,
        },
        { status: 400 }
      );
    }

    const requestId = `API_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Call purchase-data edge function
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/purchase-data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: auth.user.id,
          userType: "api_user",
          planId: plan.plan_id,
          phoneNumber,
          network,
          requestId,
        }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Purchase failed" },
        { status: 400 }
      );
    }

    // Record transaction
    await supabase.from("api_users.transactions").insert({
      user_id: auth.user.id,
      type: "purchase_data",
      amount: plan.amount,
      previous_balance: wallet.balance,
      new_balance: wallet.balance - plan.amount,
      status: "completed",
      reference: requestId,
      plan_id: plan.plan_id,
      plan_name: plan.plan_name,
      network: plan.network,
      phone_number: phoneNumber,
      metadata: {
        network: plan.network,
        response: result,
      },
    });

    await supabase.rpc("api_users.deduct_api_user_wallet", {
      p_user_id: auth.user.id,
      p_amount: plan.amount,
      p_reference: requestId,
    });

    await triggerWebhooks(auth.user.id, "purchase.completed", {
      type: "data",
      plan: plan,
      amount: plan.amount,
      phoneNumber,
      reference: requestId,
    });

    return NextResponse.json({
      success: true,
      data: {
        reference: requestId,
        plan_name: plan.plan_name,
        network: plan.network,
        amount: plan.amount,
        phone_number: phoneNumber,
        message:
          result.message || `✅ ${plan.plan_name} purchased successfully!`,
        transaction_id: result.order_id,
      },
    });
  } catch (error) {
    console.error("Purchase data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
        payload: payload, // ✅ Fix: Use payload: payload
        response_status: response.status,
        response_body: await response.text(),
        delivered_at: new Date().toISOString(),
      });
    } catch (error: any) {
      await supabase.from("api_users.webhook_logs").insert({
        webhook_id: webhook.id,
        event_type: event,
        payload: data, // ✅ Fix: Use data as payload
        error: error.message,
        delivered_at: new Date().toISOString(),
      });
    }
  }
}