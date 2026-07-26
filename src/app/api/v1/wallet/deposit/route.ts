// app/api/v1/wallet/deposit/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiMiddleware } from "../../middleware";

export async function POST(req: Request) {
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

    // Get user details
    const { data: user } = await supabase
      .from("api_users.users")
      .select("email, first_name, last_name")
      .eq("id", auth.user.id)
      .single();

    // Get or create virtual account using edge function
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/create-api-user-virtual-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: auth.user.id,
          userEmail: user?.email,
          userName: user?.first_name || user?.email,
        }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create virtual account" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        accounts: result.accounts,
        message: result.message,
      },
    });
  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}