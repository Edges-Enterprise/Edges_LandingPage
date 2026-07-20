// src/actions/reseller/build/triggerAppBuild.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface TriggerAppBuildParams {
  applicationId: string;
  buildId: string;
  storeName: string;
  storeSlug: string;
  brandColor: string;
  logoUrl: string | null;
  countryCode: string;
}

export async function triggerAppBuild(params: TriggerAppBuildParams) {
  try {
    const supabase = await createServerClient();
    const admin = createAdminClient();

    const {
      applicationId,
      buildId,
      storeName,
      storeSlug,
      brandColor,
      logoUrl,
      countryCode
    } = params;

    // ✅ Get application details (including both logo and notification icon)
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("*, notification_icon_url")
      .eq("id", applicationId)
      .single();

    if (appError) {
      console.error("Failed to get application:", appError);
      return { success: false, error: appError.message };
    }

    // ✅ Build the app config - ALL assets come from the applications table
    const appName = storeName
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const appConfig = {
      id: `reseller-${applicationId}`,
      resellerId: applicationId,
      storeName: storeSlug,
      appName: appName,
      slug: `edges-${storeSlug}`,
      theme: {
        primary: brandColor,
        secondary: adjustHex(brandColor, -30),
        background: "#FFFFFF",
        text: "#111827",
        accent: brandColor,
        statusBar: "dark" as const,
      },
      assets: {
        // ✅ Both come from the applications table
        icon: logoUrl || application.logo_url || "",
        splash: logoUrl || application.logo_url || "",
        logo: logoUrl || application.logo_url || "",
        adaptiveIcon: logoUrl || application.logo_url || "",
        notificationIcon: application.notification_icon_url || "",
      },
      config: {
        androidPackageName: `com.edges.${storeSlug.replace(/-/g, "")}`,
        version: "1.0.0",
        buildNumber: 1,
        apiBaseUrl:
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://edges-landing-page.vercel.app",
        storeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://edges-landing-page.vercel.app"}/${countryCode}/${storeSlug}`,
      },
      countryCode: countryCode,
      email: application.email,
      firstName: application.first_name,
    };

    console.log(`📦 Building app config for: ${applicationId}`);
    console.log(`   Logo URL: ${appConfig.assets.icon}`);
    console.log(
      `   Notification Icon: ${appConfig.assets.notificationIcon || "Not provided"}`,
    );

    // ✅ Try GitHub trigger (like the existing triggerAppBuild.ts)
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || "Erudite885";
    const githubRepo = process.env.GITHUB_REPO || "tenant-distribution";

    if (githubToken && githubOwner && githubRepo) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/build-reseller-apk.yml/dispatches`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ref: "main",
              inputs: {
                reseller_id: applicationId,
                config_id: buildId,
                store_name: storeSlug,
                environment: "production",
              },
            }),
          },
        );

        if (response.ok) {
          // ✅ Update build status to "building"
          await supabase
            .from("global_app_builds")
            .update({
              build_status: "building",
              building_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", buildId);

          console.log(
            `✅ GitHub Actions workflow triggered for build ${buildId}`,
          );
          return { success: true };
        } else {
          const errorText = await response.text();
          console.error("GitHub dispatch failed:", response.status, errorText);

          // ✅ Update build status to "failed"
          await supabase
            .from("global_app_builds")
            .update({
              build_status: "failed",
              error_message: `GitHub dispatch failed: ${response.status}`,
              build_logs: errorText,
              updated_at: new Date().toISOString(),
            })
            .eq("id", buildId);

          return {
            success: false,
            error: `GitHub dispatch failed: ${response.status}`,
          };
        }
      } catch (err) {
        console.error("GitHub trigger error:", err);

        // ✅ Update build status to "pending"
        await supabase
          .from("global_app_builds")
          .update({
            build_status: "pending",
            error_message: err instanceof Error ? err.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", buildId);

        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    } else {
      // ✅ No GitHub token - mark as pending
      await supabase
        .from("global_app_builds")
        .update({
          build_status: "pending",
          build_logs: "GitHub token not configured. Build is pending.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", buildId);

      console.warn("⚠️ GitHub token not configured. Build is pending.");
      return {
        success: false,
        error: "GitHub token not configured. Build is pending.",
        queued: true,
      };
    }
  } catch (error) {
    console.error("Trigger build error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper: Adjust hex color brightness
 */
function adjustHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
