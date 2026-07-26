// app/api/v1/webhooks/[webhookId]/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiMiddleware } from "../../middleware";

export async function PUT(
  req: Request,
  { params }: { params: { webhookId: string } },
) {
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

    const { url, events, secret, is_active } = await req.json();
    const supabase = createAdminClient();

    // Verify webhook belongs to user
    const { data: existing } = await supabase
      .from("api_users.webhooks")
      .select("id")
      .eq("id", params.webhookId)
      .eq("user_id", auth.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const { data: webhook, error } = await supabase
      .from("api_users.webhooks")
      .update({
        url: url || undefined,
        events: events || undefined,
        secret: secret || undefined,
        is_active: is_active !== undefined ? is_active : undefined,
      })
      .eq("id", params.webhookId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    console.error("Update webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { webhookId: string } },
) {
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

    const supabase = createAdminClient();

    // Verify webhook belongs to user
    const { data: existing } = await supabase
      .from("api_users.webhooks")
      .select("id")
      .eq("id", params.webhookId)
      .eq("user_id", auth.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("api_users.webhooks")
      .delete()
      .eq("id", params.webhookId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    console.error("Delete webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
