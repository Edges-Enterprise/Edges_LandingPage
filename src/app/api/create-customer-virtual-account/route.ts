// app/api/create-customer-virtual-account/route.ts

import { createCustomerVirtualAccount } from "@/app/actions/reseller/wallet/customerVirtualAccount";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resellerId, storeSlug } = body;

    if (!resellerId || !storeSlug) {
      return NextResponse.json(
        { error: "Missing required fields: resellerId, storeSlug" },
        { status: 400 }
      );
    }

    // Call your existing working server action
    const result = await createCustomerVirtualAccount(resellerId, storeSlug);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      accounts: result.accounts,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}