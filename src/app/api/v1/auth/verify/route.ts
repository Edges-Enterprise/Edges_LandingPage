// app/api/v1/auth/verify/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiMiddleware } from "../../middleware";

export async function GET(req: Request) {
  try {
    const auth = await apiMiddleware(req as any);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: auth.status },
      );
    }

    // ✅ Guard against undefined user
    if (!auth.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
        },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from("api_users.users")
      .select(
        "id, email, first_name, last_name, company_name, status, rate_limit",
      )
      .eq("id", auth.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        status: user.status,
        rate_limit: user.rate_limit,
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
