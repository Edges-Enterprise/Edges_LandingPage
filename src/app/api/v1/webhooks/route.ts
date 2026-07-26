// app/api/v1/webhooks/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiMiddleware } from "../middleware";

export async function GET(req: Request) {
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

    const supabase = createAdminClient();

    const { data: webhooks, error } = await supabase
      .from("api_users.webhooks")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error("Webhooks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const { url, events, secret } = await req.json();

    if (!url || !events?.length) {
      return NextResponse.json(
        { error: "url and events are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: webhook, error } = await supabase
      .from("api_users.webhooks")
      .insert({
        user_id: auth.user.id,
        url,
        events,
        secret: secret || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    console.error("Create webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}