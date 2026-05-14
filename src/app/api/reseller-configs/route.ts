import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "completed";

    // Verify auth
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("reseller_app_configs")
      .select("id, config")
      .eq("build_status", status);

    if (error) throw error;

    // Return simplified list with id and storeName
    const configs = data.map((item: any) => ({
      id: item.id,
      storeName: item.config?.storeName,
    }));

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching reseller configs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
