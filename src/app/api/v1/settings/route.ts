// app/api/v1/settings/route.ts
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
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from("api_users.users")
      .select(
        "id, email, first_name, last_name, company_name, status, rate_limit, ip_whitelist, low_balance_threshold, low_balance_webhook_url",
      )
      .eq("id", auth.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        status: user.status,
        rate_limit: user.rate_limit,
        ip_whitelist: user.ip_whitelist || [],
        low_balance_threshold: user.low_balance_threshold,
        low_balance_webhook_url: user.low_balance_webhook_url,
      },
    });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
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

    const {
      first_name,
      last_name,
      company_name,
      rate_limit,
      ip_whitelist,
      low_balance_threshold,
      low_balance_webhook_url,
    } = await req.json();

    const supabase = createAdminClient();

    const updateData: any = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (rate_limit !== undefined) updateData.rate_limit = rate_limit;
    if (ip_whitelist !== undefined) updateData.ip_whitelist = ip_whitelist;
    if (low_balance_threshold !== undefined)
      updateData.low_balance_threshold = low_balance_threshold;
    if (low_balance_webhook_url !== undefined)
      updateData.low_balance_webhook_url = low_balance_webhook_url;

    const { data: user, error } = await supabase
      .from("api_users.users")
      .update(updateData)
      .eq("id", auth.user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
