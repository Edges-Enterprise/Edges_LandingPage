// src/app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get("reference");
  const status = searchParams.get("status");

  console.log("📥 Payment callback received:", { reference, status });

  // Get the country code from the referer or use a default
  const referer = request.headers.get("referer") || "";
  const countryMatch = referer.match(/\/([a-z]{2})\/dashboard/);
  const countryCode = countryMatch?.[1] || "gh";

  // Redirect user back to wallet page
  const redirectUrl = reference
    ? `/${countryCode}/dashboard/wallet?reference=${reference}&status=${status || "pending"}`
    : `/${countryCode}/dashboard/wallet`;

  console.log("🔄 Redirecting to:", redirectUrl);

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
