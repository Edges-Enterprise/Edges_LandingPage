// src/actions/reseller/wallet/getTransactions.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  status: "pending" | "completed" | "failed";
  reference: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export async function getTransactions(
  limit: number = 50,
  offset: number = 0,
): Promise<{
  success: boolean;
  data?: Transaction[];
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

    // Get transactions
    const {
      data: transactions,
      error: txError,
      count,
    } = await supabase
      .from("global_transactions")
      .select("*", { count: "exact" })
      .eq("reseller_id", application.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) {
      console.error("Get transactions error:", txError);
      return { success: false, error: txError.message };
    }

    return {
      success: true,
      data: transactions || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("GetTransactions Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
