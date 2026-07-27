// app/api/v1/wallet/route.ts
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
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    const { data: wallet, error } = await supabase
      .from("api_users.wallets")
      .select("id, balance, total_spent, total_deposited")
      .eq("user_id", auth.user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet.balance,
        total_spent: wallet.total_spent,
        total_deposited: wallet.total_deposited,
      },
    });
  } catch (error) {
    console.error("Wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}