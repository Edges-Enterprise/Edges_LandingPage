// app/api/v1/plans/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiMiddleware } from "../middleware";

export async function GET(req: Request) {
  try {
    const auth = await apiMiddleware(req as any);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const network = url.searchParams.get("network");
    const planType = url.searchParams.get("plan_type");
    const category = url.searchParams.get("category");

    const supabase = createAdminClient(); // ❌ Remove await

    let query = supabase
      .from("reseller_base_plans")
      .select("*")
      .eq("is_active", true);

    if (network) {
      query = query.eq("network", network.toUpperCase());
    }

    if (planType) {
      query = query.eq("plan_type", planType);
    }

    if (category === "data") {
      query = query.neq("plan_type", "airtime");
    } else if (category === "airtime") {
      query = query.eq("plan_type", "airtime");
    }

    const { data: plans, error } = await query.order("amount", {
      ascending: true,
    });

    if (error) {
      console.error("Plans error:", error);
      return NextResponse.json(
        { error: "Failed to fetch plans" },
        { status: 500 },
      );
    }

    const formattedPlans = plans.map((plan) => ({
      id: plan.id,
      plan_id: plan.plan_id,
      network: plan.network,
      plan_type: plan.plan_type,
      plan_name: plan.plan_name,
      price: plan.amount,
      validity: plan.validity,
      amount: plan.amount,
    }));

    return NextResponse.json({
      success: true,
      data: formattedPlans,
      total: formattedPlans.length,
    });
  } catch (error) {
    console.error("Plans error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
