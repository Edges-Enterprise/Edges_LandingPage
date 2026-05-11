// app/actions/reseller/triggerAppBuild.ts

"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function triggerAppBuild(resellerId: string) {
  const admin = createAdminClient();

  const { data: reseller } = await admin
    .from("resellers")
    .select(`*, assets:reseller_assets(*)`)
    .eq("id", resellerId)
    .single();

  if (!reseller) return { error: "Reseller not found" };

  const iconUrl =
    reseller.assets?.find((a: any) => a.type === "icon")?.url || "";

  const appName = reseller.store_name
    .split("-")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const brandColor = reseller.theme || "#2563EB";

  const appConfig = {
    id: `reseller-${resellerId}`,
    resellerId,
    storeName: reseller.store_name,
    appName,
    slug: `edges-${reseller.store_name}`,
    theme: {
      primary: brandColor,
      secondary: adjustHex(brandColor, -30),
      background: "#FFFFFF",
      text: "#111827",
      accent: brandColor,
      statusBar: "dark" as const,
    },
    assets: {
      icon: iconUrl,
      splash: iconUrl,
      logo: iconUrl,
      adaptiveIcon: iconUrl,
    },
    config: {
      androidPackageName: `com.edges.${reseller.store_name.replace(/-/g, "")}`,
      version: "1.0.0",
      buildNumber: 1,
      apiBaseUrl:
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://edges-landing-page.vercel.app",
      storeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://edges-landing-page.vercel.app"}/${reseller.store_name}`,
    },
  };

  // Save config — use insert first, then update if exists
  const { data: existingConfig } = await admin
    .from("reseller_app_configs")
    .select("id")
    .eq("reseller_id", resellerId)
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
      .eq("reseller_id", resellerId)
      .select()
      .single();
    savedConfig = updated;
  } else {
    const { data: inserted } = await admin
      .from("reseller_app_configs")
      .insert({
        reseller_id: resellerId,
        config: appConfig,
        build_status: "configuring",
      })
      .select()
      .single();
    savedConfig = inserted;
  }

  if (!savedConfig) {
    return { error: "Failed to save build configuration" };
  }

  // Try GitHub trigger
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
              reseller_id: resellerId,
              config_id: savedConfig.id,
              store_name: reseller.store_name,
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
      }
    } catch (err) {
      console.error("GitHub trigger error:", err);
      await admin
        .from("reseller_app_configs")
        .update({ build_status: "pending" })
        .eq("id", savedConfig.id);
    }
  } else {
    await admin
      .from("reseller_app_configs")
      .update({ build_status: "pending" })
      .eq("id", savedConfig.id);
  }

  return { success: true, configId: savedConfig.id };
}

function adjustHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// // app/actions/reseller/triggerAppBuild.ts

// "use server";

// import { createAdminClient } from "@/lib/supabase/admin";

// export async function triggerAppBuild(resellerId: string) {
//   const admin = createAdminClient();

//   const { data: reseller } = await admin
//     .from("resellers")
//     .select(`*, assets:reseller_assets(*)`)
//     .eq("id", resellerId)
//     .single();

//   if (!reseller) return { error: "Reseller not found" };

//   const iconUrl =
//     reseller.assets?.find((a: any) => a.type === "icon")?.url || "";

//   const appName = reseller.store_name
//     .split("-")
//     .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
//     .join(" ");

//   const brandColor = reseller.theme || "#2563EB";

//   const appConfig = {
//     id: `reseller-${resellerId}`,
//     resellerId,
//     storeName: reseller.store_name,
//     appName,
//     slug: `edges-${reseller.store_name}`,
//     theme: {
//       primary: brandColor,
//       secondary: adjustHex(brandColor, -30),
//       background: "#FFFFFF",
//       text: "#111827",
//       accent: brandColor,
//       statusBar: "dark" as const,
//     },
//     assets: {
//       icon: iconUrl,
//       splash: iconUrl,
//       logo: iconUrl,
//       adaptiveIcon: iconUrl,
//     },
//     config: {
//       androidPackageName: `com.edges.${reseller.store_name.replace(/-/g, "")}`,
//       iosBundleId: `com.edges.${reseller.store_name.replace(/-/g, "")}`,
//       version: "1.0.0",
//       buildNumber: 1,
//       apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "",
//       storeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${reseller.store_name}`,
//     },
//   };

//   // Save config
//   const { data: savedConfig } = await admin
//     .from("reseller_app_configs")
//     .upsert({
//       reseller_id: resellerId,
//       config: appConfig,
//       build_status: "configuring",
//     })
//     .select()
//     .single();

//   // Try GitHub trigger via direct fetch (no Octokit dependency needed)
//   if (
//     process.env.GITHUB_TOKEN &&
//     process.env.GITHUB_OWNER &&
//     process.env.GITHUB_REPO
//   ) {
//     try {
//       const response = await fetch(
//         `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/build-reseller-apk.yml/dispatches`,
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
//             Accept: "application/vnd.github+json",
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             ref: "main",
//             inputs: {
//               reseller_id: resellerId,
//               config_id: savedConfig.id,
//               environment: "production",
//             },
//           }),
//         },
//       );

//       if (response.ok) {
//         await admin
//           .from("reseller_app_configs")
//           .update({ build_status: "building" })
//           .eq("id", savedConfig.id);
//       } else {
//         console.error(
//           "GitHub trigger failed:",
//           response.status,
//           await response.text(),
//         );
//         await admin
//           .from("reseller_app_configs")
//           .update({ build_status: "pending" })
//           .eq("id", savedConfig.id);
//       }
//     } catch (err) {
//       console.error("GitHub trigger error:", err);
//       await admin
//         .from("reseller_app_configs")
//         .update({ build_status: "pending" })
//         .eq("id", savedConfig.id);
//     }
//   } else {
//     await admin
//       .from("reseller_app_configs")
//       .update({ build_status: "pending" })
//       .eq("id", savedConfig.id);
//   }

//   return { success: true, configId: savedConfig.id };
// }

// function adjustHex(hex: string, amount: number): string {
//   const num = parseInt(hex.replace("#", ""), 16);
//   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
//   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
//   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
//   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// }

// // "use server";

// // import { createAdminClient } from "@/lib/supabase/admin";

// // export async function triggerAppBuild(resellerId: string) {
// //   const admin = createAdminClient();

// //   // Get reseller with assets
// //   const { data: reseller } = await admin
// //     .from("resellers")
// //     .select(`*, assets:reseller_assets(*)`)
// //     .eq("id", resellerId)
// //     .single();

// //   if (!reseller) return { error: "Reseller not found" };

// //   const iconUrl =
// //     reseller.assets?.find((a: any) => a.type === "icon")?.url || "";

// //   const appName = reseller.store_name
// //     .split("-")
// //     .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
// //     .join(" ");

// //   const brandColor = reseller.theme || "#2563EB";

// //   const appConfig = {
// //     id: `reseller-${resellerId}`,
// //     resellerId,
// //     storeName: reseller.store_name,
// //     appName,
// //     slug: `edges-${reseller.store_name}`,
// //     theme: {
// //       primary: brandColor,
// //       secondary: adjustHex(brandColor, -30),
// //       background: "#FFFFFF",
// //       text: "#111827",
// //       accent: brandColor,
// //       statusBar: "dark" as const,
// //     },
// //     assets: {
// //       icon: iconUrl,
// //       splash: iconUrl,
// //       logo: iconUrl,
// //       adaptiveIcon: iconUrl,
// //     },
// //     config: {
// //       androidPackageName: `com.edges.${reseller.store_name.replace(/-/g, "")}`,
// //       iosBundleId: `com.edges.${reseller.store_name.replace(/-/g, "")}`,
// //       version: "1.0.0",
// //       buildNumber: 1,
// //       apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "",
// //       storeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${reseller.store_name}`,
// //     },
// //   };

// //   // Save config
// //   const { data: savedConfig } = await admin
// //     .from("reseller_app_configs")
// //     .upsert({
// //       reseller_id: resellerId,
// //       config: appConfig,
// //       build_status: "configuring",
// //     })
// //     .select()
// //     .single();

// //   // Try GitHub trigger if configured
// //   if (
// //     process.env.GITHUB_TOKEN &&
// //     process.env.GITHUB_OWNER &&
// //     process.env.GITHUB_REPO
// //   ) {
// //     try {
// //       const { Octokit } = await import("@octokit/rest");
// //       const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// //       await octokit.actions.createWorkflowDispatch({
// //         owner: process.env.GITHUB_OWNER,
// //         repo: process.env.GITHUB_REPO,
// //         workflow_id: "build-reseller-apk.yml",
// //         ref: "main",
// //         inputs: {
// //           reseller_id: resellerId,
// //           config_id: savedConfig.id,
// //           environment: "production",
// //         },
// //       });

// //       await admin
// //         .from("reseller_app_configs")
// //         .update({ build_status: "building" })
// //         .eq("id", savedConfig.id);
// //     } catch (err) {
// //       console.error("GitHub trigger failed:", err);
// //       await admin
// //         .from("reseller_app_configs")
// //         .update({ build_status: "pending" })
// //         .eq("id", savedConfig.id);
// //     }
// //   } else {
// //     // No GitHub configured — keep as pending for manual build
// //     await admin
// //       .from("reseller_app_configs")
// //       .update({ build_status: "pending" })
// //       .eq("id", savedConfig.id);
// //   }

// //   return { success: true, configId: savedConfig.id };
// // }

// // function adjustHex(hex: string, amount: number): string {
// //   const num = parseInt(hex.replace("#", ""), 16);
// //   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
// //   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
// //   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
// //   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// // }

// // // "use server";

// // // import { createAdminClient } from "@/lib/supabase/admin";
// // // import { Octokit } from "@octokit/rest";

// // // export async function triggerAppBuild(resellerId: string) {
// // //   const admin = createAdminClient();

// // //   // Get reseller with assets
// // //   const { data: reseller } = await admin
// // //     .from("resellers")
// // //     .select(`*, assets:reseller_assets(*)`)
// // //     .eq("id", resellerId)
// // //     .single();

// // //   if (!reseller) return { error: "Reseller not found" };

// // //   const iconUrl =
// // //     reseller.assets?.find((a: any) => a.type === "icon")?.url || "";

// // //   const appName = reseller.store_name
// // //     .split("-")
// // //     .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
// // //     .join(" ");

// // //   const brandColor = reseller.theme || "#2563EB";

// // //   const appConfig = {
// // //     id: `reseller-${resellerId}`,
// // //     resellerId,
// // //     storeName: reseller.store_name,
// // //     appName,
// // //     slug: `edges-${reseller.store_name}`,
// // //     theme: {
// // //       primary: brandColor,
// // //       secondary: adjustHex(brandColor, -30),
// // //       background: "#FFFFFF",
// // //       text: "#111827",
// // //       accent: brandColor,
// // //       statusBar: "dark" as const,
// // //     },
// // //     assets: {
// // //       icon: iconUrl,
// // //       splash: iconUrl,
// // //       logo: iconUrl,
// // //       adaptiveIcon: iconUrl,
// // //     },
// // //     config: {
// // //       androidPackageName: `com.edges.${reseller.store_name.replace(/-/g, "")}`,
// // //       iosBundleId: `com.edges.${reseller.store_name.replace(/-/g, "")}`,
// // //       version: "1.0.0",
// // //       buildNumber: 1,
// // //       apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "",
// // //       storeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${reseller.store_name}`,
// // //     },
// // //   };

// // //   // Save config
// // //   const { data: savedConfig } = await admin
// // //     .from("reseller_app_configs")
// // //     .upsert({
// // //       reseller_id: resellerId,
// // //       config: appConfig,
// // //       build_status: "configuring",
// // //     })
// // //     .select()
// // //     .single();

// // //   // Trigger GitHub Action
// // //   if (process.env.GITHUB_TOKEN) {
// // //     const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// // //     try {
// // //       await octokit.actions.createWorkflowDispatch({
// // //         owner: process.env.GITHUB_OWNER!,
// // //         repo: process.env.GITHUB_REPO!,
// // //         workflow_id: "build-reseller-apk.yml",
// // //         ref: "main",
// // //         inputs: {
// // //           reseller_id: resellerId,
// // //           config_id: savedConfig.id,
// // //           environment: "production",
// // //         },
// // //       });

// // //       await admin
// // //         .from("reseller_app_configs")
// // //         .update({ build_status: "building" })
// // //         .eq("id", savedConfig.id);
// // //     } catch (err) {
// // //       console.error("GitHub trigger failed:", err);
// // //       await admin
// // //         .from("reseller_app_configs")
// // //         .update({ build_status: "failed" })
// // //         .eq("id", savedConfig.id);
// // //     }
// // //   }

// // //   return { success: true, configId: savedConfig.id };
// // // }

// // // function adjustHex(hex: string, amount: number): string {
// // //   const num = parseInt(hex.replace("#", ""), 16);
// // //   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
// // //   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
// // //   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
// // //   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// // // }
