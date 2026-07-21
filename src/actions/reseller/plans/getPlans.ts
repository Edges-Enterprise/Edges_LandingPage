// src/actions/reseller/plans/getPlans.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  profit: number;
  category: string;
  provider: string;
  data_amount?: string;
  validity?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GetPlansParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  provider?: string;
  is_active?: boolean;
  sortBy?: "name" | "price" | "profit" | "created_at";
  sortOrder?: "asc" | "desc";
}

export async function getPlans(params: GetPlansParams = {}): Promise<{
  success: boolean;
  data?: Plan[];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Build query
    let query = supabase
      .from("global_plans")
      .select("*", { count: "exact" })
      .eq("reseller_id", application.id);

    // Apply filters
    if (params.search) {
      query = query.or(
        `name.ilike.%${params.search}%,` +
          `description.ilike.%${params.search}%,` +
          `provider.ilike.%${params.search}%`,
      );
    }

    if (params.category) {
      query = query.eq("category", params.category);
    }

    if (params.provider) {
      query = query.eq("provider", params.provider);
    }

    if (params.is_active !== undefined) {
      query = query.eq("is_active", params.is_active);
    }

    // Apply sorting
    const sortBy = params.sortBy || "created_at";
    const sortOrder = params.sortOrder || "desc";
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    query = query.range(start, end);

    const { data: plans, error: plansError, count } = await query;

    if (plansError) {
      console.error("Get plans error:", plansError);
      return { success: false, error: plansError.message };
    }

    return {
      success: true,
      data: plans || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("GetPlans Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
