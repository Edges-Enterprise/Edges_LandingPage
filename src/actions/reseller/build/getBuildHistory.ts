// src/actions/reseller/build/getBuildHistory.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface BuildHistoryItem {
  id: string;
  build_status: string;
  queued_at: string;
  building_at: string | null;
  completed_at: string | null;
  apk_url: string | null;
  aab_url: string | null;
  error_message: string | null;
  config_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  duration: number | null; // in seconds
  statusLabel: string;
  statusColor: string;
}

export async function getBuildHistory(limit: number = 10) {
  try {
    const supabase = await createServerClient();

    // Get the current user's session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get the reseller application for this user
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError) {
      console.error("Failed to get application:", appError);
      return [];
    }

    if (!application) {
      return [];
    }

    // Get build history for this application
    const { data: builds, error: buildError } = await supabase
      .from("global_app_builds")
      .select(
        `
        id,
        build_status,
        queued_at,
        building_at,
        completed_at,
        apk_url,
        aab_url,
        error_message,
        config_id,
        created_at,
        updated_at
      `,
      )
      .eq("application_id", application.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (buildError) {
      console.error("Failed to get build history:", buildError);
      return [];
    }

    if (!builds || builds.length === 0) {
      return [];
    }

    // Process each build to add computed fields
    const history: BuildHistoryItem[] = builds.map((build) => {
      // Calculate duration if completed
      let duration: number | null = null;
      if (build.completed_at && build.queued_at) {
        const start = new Date(build.queued_at).getTime();
        const end = new Date(build.completed_at).getTime();
        duration = Math.round((end - start) / 1000); // in seconds
      }

      // Status label and color
      let statusLabel = "Unknown";
      let statusColor = "gray";

      switch (build.build_status) {
        case "queued":
          statusLabel = "Queued";
          statusColor = "yellow";
          break;
        case "building":
          statusLabel = "Building";
          statusColor = "blue";
          break;
        case "completed":
          statusLabel = "Completed";
          statusColor = "green";
          break;
        case "failed":
          statusLabel = "Failed";
          statusColor = "red";
          break;
        case "pending":
          statusLabel = "Pending";
          statusColor = "orange";
          break;
        default:
          statusLabel = build.build_status;
      }

      return {
        ...build,
        duration,
        statusLabel,
        statusColor,
      };
    });

    return history;
  } catch (error) {
    console.error("Get build history error:", error);
    return [];
  }
}

/**
 * Get a formatted duration string (e.g., "2m 34s" or "1.5h")
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "N/A";

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days}d ${remainingHours}h`;
}

/**
 * Get a human-readable status message
 */
export function getStatusMessage(build: BuildHistoryItem): string {
  switch (build.build_status) {
    case "queued":
      return "Your build is in the queue and will start shortly.";
    case "building":
      return "Your app is being built. This usually takes 3-5 minutes.";
    case "completed":
      return "Your app is ready for download!";
    case "failed":
      return `Build failed: ${build.error_message || "Unknown error"}`;
    case "pending":
      return "Your build is pending and will be processed soon.";
    default:
      return "Build status unknown.";
  }
}

/**
 * Check if the user has any builds
 */
export async function hasBuilds(): Promise<boolean> {
  const history = await getBuildHistory(1);
  return history.length > 0;
}

/**
 * Get the latest build status (simplified)
 */
export async function getLatestBuildStatus(): Promise<string | null> {
  const history = await getBuildHistory(1);
  if (history.length === 0) return null;
  return history[0].build_status;
}
