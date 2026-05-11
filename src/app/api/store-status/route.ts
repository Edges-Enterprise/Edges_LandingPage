// app/api/store-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkResellerCanSell } from "@/app/actions/reseller/wallet/resellerCustomerWallet";

export async function GET(request: NextRequest) {
  const storeName = request.nextUrl.searchParams.get("store");
  if (!storeName) {
    return NextResponse.json({ error: "store required" }, { status: 400 });
  }

  const status = await checkResellerCanSell(storeName);
  return NextResponse.json(status);
}
