// src/app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get("reference");
  const status = searchParams.get("status");
  const returnTo = searchParams.get("returnTo");

  console.log("📥 Payment callback received:", { reference, status, returnTo });

  // A customer storefront funding a wallet passes its own path so the payer
  // lands back on the store, not the reseller dashboard. Only a same-origin
  // relative path is honoured — anything absolute or protocol-relative would
  // turn this into an open redirect.
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    const url = new URL(returnTo, request.url);
    if (reference) {
      url.searchParams.set("reference", reference);
      url.searchParams.set("status", status || "pending");
    }
    console.log("🔄 Redirecting to returnTo:", url.pathname + url.search);
    return NextResponse.redirect(url);
  }

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
