// app/api/v1/webhooks/[webhookId]/logs/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiMiddleware } from "../../../middleware";

export async function GET(
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

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const supabase = createAdminClient();

    // Verify webhook belongs to user
    const { data: webhook } = await supabase
      .from("api_users.webhooks")
      .select("id")
      .eq("id", params.webhookId)
      .eq("user_id", auth.user.id)
      .single();

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const {
      data: logs,
      error,
      count,
    } = await supabase
      .from("api_users.webhook_logs")
      .select("*", { count: "exact" })
      .eq("webhook_id", params.webhookId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("Webhook logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
