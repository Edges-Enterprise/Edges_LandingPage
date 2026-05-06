import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { configId, resellerId, status } = body;

    if (!configId || !resellerId || !status) {
      return NextResponse.json(
        { error: "configId, resellerId, and status are required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Update the build status in your database
    const { error } = await admin
      .from("reseller_app_configs")
      .update({
        build_status: status,
        build_completed_at:
          status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", configId)
      .eq("reseller_id", resellerId);

    if (error) {
      console.error("Failed to update build status:", error);
      return NextResponse.json(
        { error: "Failed to update build status" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Build status updated to: ${status}`,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
