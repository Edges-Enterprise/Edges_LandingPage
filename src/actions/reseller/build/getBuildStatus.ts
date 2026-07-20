// src/actions/reseller/build/getBuildStatus.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function getBuildStatus(applicationId: string) {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("global_app_builds")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching build status:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data || null,
    };
  } catch (error) {
    console.error("Unexpected error fetching build status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
