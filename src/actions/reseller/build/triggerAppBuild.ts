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
      countryCode,
    } = params;

    // ✅ Get application details - includes both logo and notification icon URLs
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("*") // ✅ Gets logo_url and notification_icon_url
      .eq("id", applicationId)
      .single();

    if (appError) {
      console.error("Failed to get application:", appError);
      return { success: false, error: appError.message };
    }

    // ✅ Build app config - using URLs directly from the table
    const appName = storeName
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    // ✅ Use the URLs from the table, with params as fallback
    const finalLogoUrl = logoUrl || application.logo_url || "";
    const finalNotificationIconUrl = application.notification_icon_url || "";

    const appConfig = {
      id: `reseller-global-${applicationId}`,
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
        // ✅ Both URLs come directly from the table
        icon: finalLogoUrl,
        splash: finalLogoUrl,
        logo: finalLogoUrl,
        adaptiveIcon: finalLogoUrl,
        notificationIcon: finalNotificationIconUrl,
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
      countryCode: countryCode
    };

    console.log(`📦 Building app config for: ${applicationId}`);
    console.log(`   Logo URL: ${finalLogoUrl || "Not provided"}`);
    console.log(
      `   Notification Icon: ${finalNotificationIconUrl || "Not provided"}`,
    );

    // ✅ Save config to reseller_app_configs
    const { data: existingConfig } = await admin
      .from("reseller_app_configs")
      .select("id")
      .eq("reseller_id", applicationId)
      .single();

    let savedConfig;

    if (existingConfig) {
      const { data: updated } = await admin
        .from("reseller_app_configs")
        .update({
          config: appConfig,
          build_status: "configuring",
          updated_at: new Date().toISOString(),
        })
        .eq("reseller_id", applicationId)
        .select()
        .single();
      savedConfig = updated;
    } else {
      const { data: inserted } = await admin
        .from("reseller_app_configs")
        .insert({
          reseller_id: applicationId,
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

    // ✅ Update global_app_builds with config reference
    await supabase
      .from("global_app_builds")
      .update({
        config_id: savedConfig.id,
      })
      .eq("id", buildId);

    // ✅ Try GitHub trigger
    if (
      process.env.GITHUB_TOKEN &&
      process.env.GITHUB_OWNER &&
      process.env.GITHUB_REPO
    ) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/build-reseller-apk.yml/dispatches`,
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
                environment: "production",
              },
            }),
          },
        );

        if (response.ok) {
          await admin
            .from("reseller_app_configs")
            .update({ build_status: "building" })
            .eq("id", savedConfig.id);

          console.log(
            `✅ GitHub Actions workflow triggered for build ${buildId}`,
          );
          return { success: true, configId: savedConfig.id };
        } else {
          const errorText = await response.text();
          console.error("GitHub dispatch failed:", response.status, errorText);

          await admin
            .from("reseller_app_configs")
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
        await admin
          .from("reseller_app_configs")
          .update({ build_status: "pending" })
          .eq("id", savedConfig.id);

        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    } else {
      await admin
        .from("reseller_app_configs")
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

// // src/actions/reseller/build/triggerAppBuild.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { createAdminClient } from "@/lib/supabase/admin";

// interface TriggerAppBuildParams {
//   applicationId: string;
//   buildId: string;
//   storeName: string;
//   storeSlug: string;
//   brandColor: string;
//   logoUrl: string | null;
//   countryCode: string;
// }

// export async function triggerAppBuild(params: TriggerAppBuildParams) {
//   try {
//     const supabase = await createServerClient();
//     const admin = createAdminClient();

//     const {
//       applicationId,
//       buildId,
//       storeName,
//       storeSlug,
//       brandColor,
//       logoUrl,
//       countryCode,
//     } = params;

//     // ✅ Get application details
//     const { data: application, error: appError } = await supabase
//       .from("global_reseller_applications")
//       .select("*")
//       .eq("id", applicationId)
//       .single();

//     if (appError) {
//       console.error("Failed to get application:", appError);
//       return { success: false, error: appError.message };
//     }

//     // ✅ Get notification icon from reseller_assets (same as existing)
//     let notificationIconUrl = "";
//     try {
//       const { data: notifIcon } = await supabase
//         .from("reseller_assets")
//         .select("url")
//         .eq("reseller_id", applicationId)
//         .eq("type", "notification_icon")
//         .maybeSingle();

//       if (notifIcon?.url) {
//         notificationIconUrl = notifIcon.url;
//       }
//     } catch (err) {
//       console.warn("Could not fetch notification icon:", err);
//     }

//     // ✅ Build the app config (matches existing structure)
//     const appName = storeName
//       .split("-")
//       .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
//       .join(" ");

//     const appConfig = {
//       id: `reseller-global-${applicationId}`,
//       resellerId: applicationId,
//       storeName: storeSlug,
//       appName: appName,
//       slug: `edges-${storeSlug}`,
//       theme: {
//         primary: brandColor,
//         secondary: adjustHex(brandColor, -30),
//         background: "#FFFFFF",
//         text: "#111827",
//         accent: brandColor,
//         statusBar: "dark" as const,
//       },
//       assets: {
//         icon: logoUrl || "",
//         splash: logoUrl || "",
//         logo: logoUrl || "",
//         adaptiveIcon: logoUrl || "",
//         notificationIcon: notificationIconUrl,
//       },
//       config: {
//         androidPackageName: `com.edges.${storeSlug.replace(/-/g, "")}`,
//         version: "1.0.0",
//         buildNumber: 1,
//         apiBaseUrl:
//           process.env.NEXT_PUBLIC_APP_URL ||
//           "https://edges-landing-page.vercel.app",
//         storeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://edges-landing-page.vercel.app"}/${countryCode}/${storeSlug}`,
//       },
//       countryCode: countryCode,
//       email: application.email,
//       firstName: application.first_name,
//     };

//     console.log(`📦 Building app config for: ${applicationId}`);

//     // ✅ Save config to reseller_app_configs (same as existing triggerAppBuild.ts)
//     const { data: existingConfig } = await admin
//       .from("reseller_app_configs")
//       .select("id")
//       .eq("reseller_id", applicationId)
//       .single();

//     let savedConfig;

//     if (existingConfig) {
//       const { data: updated } = await admin
//         .from("reseller_app_configs")
//         .update({
//           config: appConfig,
//           build_status: "configuring",
//           updated_at: new Date().toISOString(),
//         })
//         .eq("reseller_id", applicationId)
//         .select()
//         .single();
//       savedConfig = updated;
//     } else {
//       const { data: inserted } = await admin
//         .from("reseller_app_configs")
//         .insert({
//           reseller_id: applicationId,
//           config: appConfig,
//           build_status: "configuring",
//         })
//         .select()
//         .single();
//       savedConfig = inserted;
//     }

//     if (!savedConfig) {
//       console.error("Failed to save build configuration");
//       return { success: false, error: "Failed to save build configuration" };
//     }

//     console.log(`✅ Config saved with ID: ${savedConfig.id}`);

//     // ✅ Also update global_app_builds with the config reference
//     await supabase
//       .from("global_app_builds")
//       .update({
//         config_id: savedConfig.id,
//       })
//       .eq("id", buildId);

//     // ✅ Try GitHub trigger (same as existing triggerAppBuild.ts)
//     if (
//       process.env.GITHUB_TOKEN &&
//       process.env.GITHUB_OWNER &&
//       process.env.GITHUB_REPO
//     ) {
//       try {
//         const response = await fetch(
//           `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/build-reseller-apk.yml/dispatches`,
//           {
//             method: "POST",
//             headers: {
//               Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
//               Accept: "application/vnd.github+json",
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               ref: "main",
//               inputs: {
//                 reseller_id: applicationId,
//                 config_id: savedConfig.id,
//                 store_name: storeSlug,
//                 environment: "production",
//               },
//             }),
//           },
//         );

//         if (response.ok) {
//           await admin
//             .from("reseller_app_configs")
//             .update({ build_status: "building" })
//             .eq("id", savedConfig.id);

//           console.log(
//             `✅ GitHub Actions workflow triggered for build ${buildId}`,
//           );
//           return { success: true, configId: savedConfig.id };
//         } else {
//           const errorText = await response.text();
//           console.error("GitHub dispatch failed:", response.status, errorText);

//           await admin
//             .from("reseller_app_configs")
//             .update({
//               build_status: "failed",
//               error_message: `GitHub dispatch failed: ${response.status}`,
//             })
//             .eq("id", savedConfig.id);

//           return {
//             success: false,
//             error: `GitHub dispatch failed: ${response.status}`,
//           };
//         }
//       } catch (err) {
//         console.error("GitHub trigger error:", err);
//         await admin
//           .from("reseller_app_configs")
//           .update({ build_status: "pending" })
//           .eq("id", savedConfig.id);

//         return {
//           success: false,
//           error: err instanceof Error ? err.message : "Unknown error",
//         };
//       }
//     } else {
//       await admin
//         .from("reseller_app_configs")
//         .update({ build_status: "pending" })
//         .eq("id", savedConfig.id);

//       console.warn("⚠️ GitHub token not configured. Build is pending.");
//       return {
//         success: false,
//         error: "GitHub token not configured. Build is pending.",
//         queued: true,
//       };
//     }
//   } catch (error) {
//     console.error("Trigger build error:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// function adjustHex(hex: string, amount: number): string {
//   const num = parseInt(hex.replace("#", ""), 16);
//   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
//   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
//   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
//   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// }
