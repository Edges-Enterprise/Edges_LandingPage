import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const configId = request.nextUrl.searchParams.get("configId");
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!configId) {
    return NextResponse.json({ error: "Config ID required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: config } = await admin
    .from("reseller_app_configs")
    .select("*")
    .eq("id", configId)
    .single();

  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  return NextResponse.json(config.config);
}
