// src/actions/reseller/build/getBuildStatus.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function getBuildStatus() {
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
      return null;
    }

    if (!application) {
      return null;
    }

    // Get the latest build for this application
    const { data: build, error: buildError } = await supabase
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
      .limit(1)
      .single();

    if (buildError && buildError.code !== "PGRST116") {
      console.error("Failed to get build:", buildError);
      return null;
    }

    if (!build) {
      return {
        hasBuild: false,
        message: "No build has been started yet.",
      };
    }

    // Get config details if available
    let config = null;
    if (build.config_id) {
      const { data: configData, error: configError } = await supabase
        .from("global_reseller_app_configs")
        .select("config")
        .eq("id", build.config_id)
        .single();

      if (!configError && configData) {
        config = configData.config;
      }
    }

    return {
      hasBuild: true,
      id: build.id,
      status: build.build_status,
      queuedAt: build.queued_at,
      buildingAt: build.building_at,
      completedAt: build.completed_at,
      apkUrl: build.apk_url,
      aabUrl: build.aab_url,
      errorMessage: build.error_message,
      configId: build.config_id,
      config: config,
      // Helper booleans
      isQueued: build.build_status === "queued",
      isBuilding: build.build_status === "building",
      isCompleted: build.build_status === "completed",
      isFailed: build.build_status === "failed",
      isPending: build.build_status === "pending",
    };
  } catch (error) {
    console.error("Get build status error:", error);
    return {
      hasBuild: false,
      error:
        error instanceof Error ? error.message : "Failed to get build status",
    };
  }
}
