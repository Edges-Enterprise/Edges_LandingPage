// app/api/store-status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const storeName = request.nextUrl.searchParams.get("store");
  if (!storeName) {
    return NextResponse.json({ error: "store required" }, { status: 400 });
  }

  // Use admin client to bypass RLS
  const admin = createAdminClient();

  // First, get the reseller
  const { data: reseller, error: resellerError } = await admin
    .from("resellers")
    .select("id, store_name, phone, status")
    .eq("store_name", storeName)
    .eq("status", "active")
    .single();

  if (resellerError || !reseller) {
    console.error("Error fetching reseller:", resellerError);
    return NextResponse.json({
      canSell: false,
      hasVirtualAccount: false,
      hasBalance: false,
      hasWhatsApp: false,
      balance: 0,
      reason: "Store not found",
    });
  }

  // Check virtual account separately
  const { data: virtualAccount } = await admin
    .from("reseller_virtual_accounts")
    .select("id")
    .eq("reseller_id", reseller.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  // Check wallet separately
  const { data: wallet } = await admin
    .from("reseller_wallets")
    .select("balance")
    .eq("reseller_id", reseller.id)
    .maybeSingle();

  const hasWhatsApp = !!(reseller.phone && reseller.phone.trim().length > 0);
  const hasVirtualAccount = !!virtualAccount;
  const balance = wallet?.balance || 0;
  const hasBalance = balance > 0;
  const canSell = hasWhatsApp && hasVirtualAccount && hasBalance;

  let reason = null;
  if (!canSell) {
    if (!hasWhatsApp) {
      reason =
        "Store owner hasn't set up WhatsApp support. Please check back later.";
    } else if (!hasVirtualAccount) {
      reason = "Store is not fully set up yet. Please check back later.";
    } else if (!hasBalance) {
      reason = "Store is temporarily unavailable. Please check back later.";
    }
  }

  console.log("Store status result:", {
    storeName,
    resellerId: reseller.id,
    hasWhatsApp,
    hasVirtualAccount,
    hasBalance,
    balance,
    canSell,
  });

  return NextResponse.json({
    canSell,
    hasVirtualAccount,
    hasBalance,
    hasWhatsApp,
    balance,
    reason,
  });
}

// // app/api/store-status/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { checkResellerCanSell } from "@/app/actions/reseller/wallet/resellerCustomerWallet";

// export async function GET(request: NextRequest) {
//   const storeName = request.nextUrl.searchParams.get("store");
//   if (!storeName) {
//     return NextResponse.json({ error: "store required" }, { status: 400 });
//   }

//   const status = await checkResellerCanSell(storeName);
//   return NextResponse.json(status);
// }
