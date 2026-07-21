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
  notificationIconUrl: string | null;
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
      notificationIconUrl,
      countryCode,
    } = params;

    // Get application details
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError) {
      console.error("Failed to get application:", appError);
      return { success: false, error: appError.message };
    }

    // Build the app config
    const appName = storeName
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const finalLogoUrl = logoUrl || application.logo_url || "";
    const finalNotificationIconUrl =
      notificationIconUrl || application.notification_icon_url || "";

    const packageName = `com.edges.${storeSlug.replace(/-/g, "")}`;

    const appConfig = {
      id: `reseller-global-${applicationId}`,
      resellerId: applicationId,
      storeName: storeSlug,
      appName: appName,
      slug: `edges-${storeSlug}`,
      countryCode: countryCode,
      androidPackageName: packageName,
      theme: {
        primary: brandColor,
        secondary: adjustHex(brandColor, -30),
        background: "#FFFFFF",
        text: "#111827",
        accent: brandColor,
        statusBar: "dark" as const,
      },
      assets: {
        icon: finalLogoUrl,
        splash: finalLogoUrl,
        logo: finalLogoUrl,
        adaptiveIcon: finalLogoUrl,
        notificationIcon: finalNotificationIconUrl,
      },
      config: {
        androidPackageName: packageName,
        packageName: packageName,
        version: "1.0.0",
        buildNumber: 1,
        apiBaseUrl:
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://edges-landing-page.vercel.app",
        storeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://edges-landing-page.vercel.app"}/${countryCode}/${storeSlug}`,
      },
    };

    console.log(`📦 Building app config for: ${applicationId}`);
    console.log(`📦 Package name: ${packageName}`);
    console.log(`🌍 Country: ${countryCode}`);

    // Save config to global_reseller_app_configs
    const { data: existingConfig } = await supabase
      .from("global_reseller_app_configs")
      .select("id")
      .eq("application_id", applicationId)
      .single();

    let savedConfig;

    if (existingConfig) {
      const { data: updated } = await supabase
        .from("global_reseller_app_configs")
        .update({
          config: appConfig,
          build_status: "configuring",
          updated_at: new Date().toISOString(),
        })
        .eq("application_id", applicationId)
        .select()
        .single();
      savedConfig = updated;
    } else {
      const { data: inserted } = await supabase
        .from("global_reseller_app_configs")
        .insert({
          application_id: applicationId,
          config: appConfig,
          build_status: "configuring",
        })
        .select()
        .single();
      savedConfig = inserted;
    }

    if (!savedConfig) {
      console.error("Failed to save build configuration");
      return { success: false, error: "Failed to save build configuration" };
    }

    console.log(`✅ Config saved with ID: ${savedConfig.id}`);

    // Update global_app_builds with the config reference
    await supabase
      .from("global_app_builds")
      .update({
        config_id: savedConfig.id,
      })
      .eq("id", buildId);

    // ✅ Trigger GitHub Actions with NEW workflow
    if (
      process.env.GITHUB_TOKEN &&
      process.env.GITHUB_OWNER &&
      process.env.GITHUB_REPO
    ) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/build-global-reseller-apk.yml/dispatches`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ref: "main",
              inputs: {
                reseller_id: applicationId,
                config_id: savedConfig.id,
                store_name: storeSlug,
                country_code: countryCode,
                environment: "production",
              },
            }),
          },
        );

        if (response.ok) {
          await supabase
            .from("global_reseller_app_configs")
            .update({ build_status: "building" })
            .eq("id", savedConfig.id);

          console.log(
            `✅ GitHub Actions workflow triggered for build ${buildId}`,
          );
          return { success: true, configId: savedConfig.id };
        } else {
          const errorText = await response.text();
          console.error("GitHub dispatch failed:", response.status, errorText);

          await supabase
            .from("global_reseller_app_configs")
            .update({
              build_status: "failed",
              error_message: `GitHub dispatch failed: ${response.status}`,
            })
            .eq("id", savedConfig.id);

          return {
            success: false,
            error: `GitHub dispatch failed: ${response.status}`,
          };
        }
      } catch (err) {
        console.error("GitHub trigger error:", err);
        await supabase
          .from("global_reseller_app_configs")
          .update({ build_status: "pending" })
          .eq("id", savedConfig.id);

        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    } else {
      await supabase
        .from("global_reseller_app_configs")
        .update({ build_status: "pending" })
        .eq("id", savedConfig.id);

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

function adjustHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
