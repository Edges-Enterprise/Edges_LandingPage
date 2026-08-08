// src/app/api/reseller/[countryCode]/wallet/fund/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fundWallet } from "@/actions/reseller/wallet/fundWallet";

export async function POST(
  request: NextRequest,
  { params }: { params: { countryCode: string } },
) {
  try {
    const { countryCode } = await params;
    const body = await request.json();
    const { amount, mobileMoney, source } = body;

    const result = await fundWallet({
      amount,
      countryCode,
      source: source || "web",
      mobileMoney,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      reference: result.data?.reference,
      redirectUrl: result.data?.redirectUrl,
      authModel: result.data?.authModel,
    });
  } catch (error) {
    console.error("Fund wallet API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
