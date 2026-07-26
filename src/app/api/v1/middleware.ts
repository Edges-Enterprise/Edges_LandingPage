// app/api/v1/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function apiMiddleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const publicPaths = [
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/docs",
  ];
  if (publicPaths.some((p) => path.startsWith(p))) {
    return { authorized: true };
  }

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return {
      authorized: false,
      error: "API key required. Use X-API-Key header.",
      status: 401,
    };
  }

  const supabase = await createServerClient();

  const { data: user, error } = await supabase
    .from("api_users.users")
    .select("id, email, status, rate_limit")
    .eq("api_key", apiKey)
    .eq("status", "active")
    .single();

  if (error || !user) {
    return {
      authorized: false,
      error: "Invalid or inactive API key",
      status: 401,
    };
  }

  // Rate limiting
  const { data: rateData } = await supabase
    .from("api_users.rate_limits")
    .select("request_count")
    .eq("user_id", user.id)
    .gte("window_start", new Date(Date.now() - 60000).toISOString());

  const requestCount =
    rateData?.reduce((sum, r) => sum + r.request_count, 0) || 0;

  if (requestCount >= (user.rate_limit || 45)) {
    return {
      authorized: false,
      error: "Rate limit exceeded. Max 45 requests per minute.",
      status: 429,
    };
  }

  // ✅ Fix: Get IP from headers or use 'unknown'
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  await supabase.from("api_users.rate_limits").insert({
    user_id: user.id,
    endpoint: path,
    method: req.method,
    ip_address: ipAddress,
  });

  await supabase
    .from("api_users.api_keys")
    .update({ last_used: new Date().toISOString() })
    .eq("key", apiKey);

  return { authorized: true, user };
}
