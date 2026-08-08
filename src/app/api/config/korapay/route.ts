// src/app/api/config/korapay/route.ts
import { NextResponse } from "next/server";
import { USE_DIRECT_API } from "@/lib/payments/korapay";

export async function GET() {
  return NextResponse.json({
    useDirectApi: USE_DIRECT_API,
  });
}
