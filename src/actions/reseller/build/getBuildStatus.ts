// src/actions/reseller/build/getBuildStatus.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

// ✅ Export the type so it can be imported
export interface BuildStatus {
  id: string;
  build_status: "queued" | "building" | "completed" | "failed" | "pending";
  queued_at: string;
  building_at: string | null;
  completed_at: string | null;
  apk_url: string | null;
  aab_url: string | null;
  error_message: string | null;
  config_id: string | null;
  // Computed fields
  is_queued: boolean;
  is_building: boolean;
  is_completed: boolean;
  is_failed: boolean;
  is_pending: boolean;
  duration_seconds?: number;
  status_label: string;
  status_color: string;
}

export async function getBuildStatus(): Promise<{
  success: boolean;
  data?: BuildStatus | null;
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
      return { success: true, data: null };
    }

    // Get the latest build
    const { data: build, error: buildError } = await supabase
      .from("global_app_builds")
      .select("*")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (buildError) {
      if (buildError.code === "PGRST116") {
        // No build found
        return { success: true, data: null };
      }
      console.error("Build fetch error:", buildError);
      return { success: false, error: buildError.message };
    }

    if (!build) {
      return { success: true, data: null };
    }

    // Compute additional fields
    const statusLabel = getStatusLabel(build.build_status);
    const statusColor = getStatusColor(build.build_status);

    let durationSeconds: number | undefined;
    if (build.completed_at && build.queued_at) {
      const start = new Date(build.queued_at).getTime();
      const end = new Date(build.completed_at).getTime();
      durationSeconds = Math.round((end - start) / 1000);
    }

    const buildStatus: BuildStatus = {
      id: build.id,
      build_status: build.build_status,
      queued_at: build.queued_at,
      building_at: build.building_at,
      completed_at: build.completed_at,
      apk_url: build.apk_url,
      aab_url: build.aab_url,
      error_message: build.error_message,
      config_id: build.config_id,
      is_queued: build.build_status === "queued",
      is_building: build.build_status === "building",
      is_completed: build.build_status === "completed",
      is_failed: build.build_status === "failed",
      is_pending: build.build_status === "pending",
      duration_seconds: durationSeconds,
      status_label: statusLabel,
      status_color: statusColor,
    };

    return { success: true, data: buildStatus };
  } catch (error) {
    console.error("GetBuildStatus Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: "Queued",
    building: "Building",
    completed: "Completed",
    failed: "Failed",
    pending: "Pending",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    queued: "yellow",
    building: "blue",
    completed: "green",
    failed: "red",
    pending: "orange",
  };
  return colors[status] || "gray";
}
