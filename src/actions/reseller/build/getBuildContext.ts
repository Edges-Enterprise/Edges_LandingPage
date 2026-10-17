// src/actions/reseller/build/getBuildContext.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getBuildContext(buildId: string) {
  try {
    const supabase = await createServerClient();
    const admin = createAdminClient();

    // Get the build record
    const { data: build, error: buildError } = await supabase
      .from("global_app_builds")
      .select("application_id, build_status, apk_url, aab_url, error_message")
      .eq("id", buildId)
      .single();

    if (buildError) {
      console.error("Error fetching build:", buildError);
      return { success: false, error: buildError.message };
    }

    // Get the application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("store_name, store_slug, brand_color, logo_url, country_code")
      .eq("id", build.application_id)
      .single();

    if (appError) {
      console.error("Error fetching application:", appError);
      return { success: false, error: appError.message };
    }

    // Get notification icon
    const { data: notifIcon } = await supabase
      .from("reseller_assets")
      .select("url")
      .eq("reseller_id", build.application_id)
      .eq("type", "notification_icon")
      .maybeSingle();

    // Build the context
    const context = {
      buildId: buildId,
      applicationId: build.application_id,
      buildStatus: build.build_status,
      apkUrl: build.apk_url,
      aabUrl: build.aab_url,
      appConfig: {
        appName: application.store_name,
        storeName: application.store_slug,
        slug: application.store_slug,
        theme: {
          primary: application.brand_color || "#C98A54",
          accent: application.brand_color || "#C98A54",
          text: "#111827",
          background: "#FFFFFF",
          statusBar: "dark",
        },
        assets: {
          icon: application.logo_url || "",
          logo: application.logo_url || "",
          splash: application.logo_url || "",
          adaptiveIcon: application.logo_url || "",
          notificationIcon: notifIcon?.url || "",
        },
        config: {
          version: "1.0.0",
          buildNumber: 1,
          androidPackageName: `com.edges.${application.store_slug?.replace(/-/g, "") || "app"}`,
        },
        countryCode: application.country_code,
      },
    };

    return { success: true, data: context };
  } catch (error) {
    console.error("Error getting build context:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
