// src/actions/reseller/build/completeBuild.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface CompleteBuildParams {
  buildId: string;
  apkUrl: string;
  aabUrl?: string;
  status?: string;
}

export async function completeBuild(params: CompleteBuildParams) {
  try {
    const supabase = await createServerClient();

    const { buildId, apkUrl, aabUrl, status = "completed" } = params;

    const { error } = await supabase
      .from("global_app_builds")
      .update({
        build_status: status,
        apk_url: apkUrl,
        aab_url: aabUrl || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", buildId)
      .select("application_id")
      .single();

    if (error) {
      console.error("Error completing build:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error completing build:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
