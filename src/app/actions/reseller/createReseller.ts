// app/actions/reseller/createReseller.ts (updated)

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CreateResellerResult } from "@/types";
import { triggerAppBuild } from "./triggerAppBuild";
import { randomBytes } from "crypto";

function generatePassword(storeName: string, email: string): string {
  const prefix = storeName.slice(0, 4);
  const suffix = email.split("@")[0].slice(0, 4);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}${suffix}${random}`;
}

function generateDashboardToken(): string {
  // Generate a secure token with timestamp for validity tracking
  const timestamp = Date.now();
  const random = randomBytes(32).toString("hex");
  return `${timestamp}_${random}`;
}

export async function createReseller(
  formData: FormData,
): Promise<CreateResellerResult> {
  const supabase = await createServerClient();
  const admin = createAdminClient();

  const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("whatsapp") as string)?.trim();
  const theme = (formData.get("brandColor") as string) || "#2563EB";
  const androidApp = formData.get("androidApp") === "true";
  const appIconFile = formData.get("appIcon") as File | null;

  // ── Upload Notification Icon (generated client-side) ───
  const notificationIconFile = formData.get("notificationIcon") as File | null;

  // ── Validation ─────────────────────────────
  if (!storeName || !email) {
    return { error: "Store name and email are required" };
  }

  if (!/^[a-z0-9-]+$/.test(storeName)) {
    return {
      error:
        "Store name can only contain lowercase letters, numbers, and hyphens",
    };
  }

  if (storeName.length < 3) {
    return { error: "Store name must be at least 3 characters" };
  }

  const normalized = storeName.replace(/[^a-z0-9]/g, "").toLowerCase();
  if (/^edge/.test(normalized)) {
    return {
      error: "That store name is not available. Please choose another.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  if (!phone) {
    return { error: "WhatsApp number is required" };
  }

  if (!/^\+?[0-9\s\-()]{7,15}$/.test(phone)) {
    return { error: "Please enter a valid WhatsApp number" };
  }

  // ── Check store name ───────────────────────
  const { data: existing } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeName)
    .maybeSingle();

  if (existing) {
    return {
      error: "This store name is already taken. Please choose another.",
    };
  }

  // ── Generate password ──────────────────────
  const password = generatePassword(storeName, email);
  const dashboardToken = generateDashboardToken();

  // ── Create Auth User ───────────────────────
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        store_name: storeName,
        role: "reseller",
        theme,
        android_app: androidApp,
      },
    });

  if (authError || !authData.user) {
    console.error("Auth user creation failed:", authError);
    return { error: "Failed to create account. Please try again." };
  }

  // ── Insert Reseller (with temp_password and dashboard_token) ───
  const { data: reseller, error: resellerError } = await admin
    .from("resellers")
    .insert({
      auth_user_id: authData.user.id,
      email,
      store_name: storeName,
      theme,
      android_app: androidApp,
      phone,
      status: "active",
      temp_password: password,
      dashboard_token: dashboardToken, // Store the token
    })
    .select("id")
    .single();

  if (resellerError || !reseller) {
    console.error("Reseller insert failed:", resellerError);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "Failed to create reseller account. Please try again." };
  }

  // ── Upload App Icon (optional) ─────────────
  if (appIconFile) {
    try {
      const arrayBuffer = await appIconFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = `reseller-${reseller.id}-icon-${Date.now()}.png`;
      const filePath = `${reseller.id}/${fileName}`;

      const { error: uploadError } = await admin.storage
        .from("reseller-assets")
        .upload(filePath, buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = admin.storage
          .from("reseller-assets")
          .getPublicUrl(filePath);

        await admin.from("reseller_assets").insert({
          reseller_id: reseller.id,
          type: "icon",
          url: urlData.publicUrl,
          file_name: fileName,
          file_size: appIconFile.size,
          mime_type: "image/png",
        });
      } else {
        console.error("Icon upload failed:", uploadError);
      }
    } catch (err) {
      console.error("Icon upload error:", err);
    }
  }

  if (androidApp && notificationIconFile) {
    try {
      const buffer = Buffer.from(await notificationIconFile.arrayBuffer());
      const fileName = `reseller-${reseller.id}-notification-icon-${Date.now()}.png`;
      const filePath = `${reseller.id}/${fileName}`;

      const { error: uploadError } = await admin.storage
        .from("reseller-assets")
        .upload(filePath, buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = admin.storage
          .from("reseller-assets")
          .getPublicUrl(filePath);

        await admin.from("reseller_assets").insert({
          reseller_id: reseller.id,
          type: "notification_icon",
          url: urlData.publicUrl,
          file_name: fileName,
          file_size: notificationIconFile.size,
          mime_type: "image/png",
        });
      } else {
        console.error("Notification icon upload failed:", uploadError);
      }
    } catch (err) {
      console.error("Notification icon upload error:", err);
    }
  }

  // ── Create Reseller Wallet ─────────────────
  await admin.from("reseller_wallets").insert({
    reseller_id: reseller.id,
    balance: 0,
    total_sales: 0,
    total_profit: 0,
  });

  // ── Trigger App Build (background) ─────────
  if (androidApp) {
    triggerAppBuild(reseller.id).catch((err) => {
      console.error("App build trigger failed:", reseller.id, ":", err);
    });
  }

  // ── Sign in ────────────────────────────────
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    console.error("Auto sign-in failed:", signInError);
  }

  revalidatePath("/reseller");

  return {
    success: true,
    resellerId: reseller.id,
    storeUrl: `/${storeName}`,
    message: "Your store is live! Check your email for login credentials.",
  };
}

// // app/actions/reseller/createReseller.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { createAdminClient } from "@/lib/supabase/admin";
// import { revalidatePath } from "next/cache";
// import type { CreateResellerResult } from "@/types";
// import { triggerAppBuild } from "./triggerAppBuild";

// function generatePassword(storeName: string, email: string): string {
//   const prefix = storeName.slice(0, 4);
//   const suffix = email.split("@")[0].slice(0, 4);
//   const random = Math.random().toString(36).slice(2, 6);
//   return `${prefix}${suffix}${random}`;
// }

// export async function createReseller(
//   formData: FormData,
// ): Promise<CreateResellerResult> {
//   const supabase = await createServerClient();
//   const admin = createAdminClient();

//   const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
//   const email = (formData.get("email") as string)?.trim();
//   const phone = (formData.get("whatsapp") as string)?.trim();
//   const theme = (formData.get("brandColor") as string) || "#2563EB";
//   const androidApp = formData.get("androidApp") === "true";
//   const appIconFile = formData.get("appIcon") as File | null;

//   // ── Upload Notification Icon (generated client-side) ───
//   const notificationIconFile = formData.get("notificationIcon") as File | null;

//   // ── Validation ─────────────────────────────
//   if (!storeName || !email) {
//     return { error: "Store name and email are required" };
//   }

//   if (!/^[a-z0-9-]+$/.test(storeName)) {
//     return {
//       error:
//         "Store name can only contain lowercase letters, numbers, and hyphens",
//     };
//   }

//   if (storeName.length < 3) {
//     return { error: "Store name must be at least 3 characters" };
//   }

//   const normalized = storeName.replace(/[^a-z0-9]/g, "").toLowerCase();
//   if (/^edge/.test(normalized)) {
//     return {
//       error: "That store name is not available. Please choose another.",
//     };
//   }

//   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//     return { error: "Please enter a valid email address" };
//   }

//   if (!phone) {
//     return { error: "WhatsApp number is required" };
//   }

//   if (!/^\+?[0-9\s\-()]{7,15}$/.test(phone)) {
//     return { error: "Please enter a valid WhatsApp number" };
//   }

//   // ── Check store name ───────────────────────
//   const { data: existing } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("store_name", storeName)
//     .maybeSingle();

//   if (existing) {
//     return {
//       error: "This store name is already taken. Please choose another.",
//     };
//   }

//   // ── Generate password ──────────────────────
//   const password = generatePassword(storeName, email);

//   // ── Create Auth User ───────────────────────
//   const { data: authData, error: authError } =
//     await admin.auth.admin.createUser({
//       email,
//       password,
//       email_confirm: true,
//       user_metadata: {
//         store_name: storeName,
//         role: "reseller",
//         theme,
//         android_app: androidApp,
//       },
//     });

//   if (authError || !authData.user) {
//     console.error("Auth user creation failed:", authError);
//     return { error: "Failed to create account. Please try again." };
//   }

//   // ── Insert Reseller (with temp_password) ───
//   const { data: reseller, error: resellerError } = await admin
//     .from("resellers")
//     .insert({
//       auth_user_id: authData.user.id,
//       email,
//       store_name: storeName,
//       theme,
//       android_app: androidApp,
//       phone,
//       status: "active",
//       temp_password: password, // saved for email sequence
//     })
//     .select("id")
//     .single();

//   if (resellerError || !reseller) {
//     console.error("Reseller insert failed:", resellerError);
//     await admin.auth.admin.deleteUser(authData.user.id);
//     return { error: "Failed to create reseller account. Please try again." };
//   }

//   // ── Upload App Icon (optional) ─────────────
//   if (appIconFile) {
//     try {
//       const arrayBuffer = await appIconFile.arrayBuffer();
//       const buffer = Buffer.from(arrayBuffer);
//       const fileName = `reseller-${reseller.id}-icon-${Date.now()}.png`;
//       const filePath = `${reseller.id}/${fileName}`;

//       const { error: uploadError } = await admin.storage
//         .from("reseller-assets")
//         .upload(filePath, buffer, {
//           contentType: "image/png",
//           upsert: true,
//         });

//       if (!uploadError) {
//         const { data: urlData } = admin.storage
//           .from("reseller-assets")
//           .getPublicUrl(filePath);

//         await admin.from("reseller_assets").insert({
//           reseller_id: reseller.id,
//           type: "icon",
//           url: urlData.publicUrl,
//           file_name: fileName,
//           file_size: appIconFile.size,
//           mime_type: "image/png",
//         });
//       } else {
//         console.error("Icon upload failed:", uploadError);
//       }
//     } catch (err) {
//       console.error("Icon upload error:", err);
//     }
//   }

//   if (androidApp && notificationIconFile) {
//     try {
//       const buffer = Buffer.from(await notificationIconFile.arrayBuffer());
//       const fileName = `reseller-${reseller.id}-notification-icon-${Date.now()}.png`;
//       const filePath = `${reseller.id}/${fileName}`;

//       const { error: uploadError } = await admin.storage
//         .from("reseller-assets")
//         .upload(filePath, buffer, {
//           contentType: "image/png",
//           upsert: true,
//         });

//       if (!uploadError) {
//         const { data: urlData } = admin.storage
//           .from("reseller-assets")
//           .getPublicUrl(filePath);

//         await admin.from("reseller_assets").insert({
//           reseller_id: reseller.id,
//           type: "notification_icon",
//           url: urlData.publicUrl,
//           file_name: fileName,
//           file_size: notificationIconFile.size,
//           mime_type: "image/png",
//         });
//       } else {
//         console.error("Notification icon upload failed:", uploadError);
//       }
//     } catch (err) {
//       console.error("Notification icon upload error:", err);
//     }
//   }

//   // ── Create Reseller Wallet ─────────────────
//   await admin.from("reseller_wallets").insert({
//     reseller_id: reseller.id,
//     balance: 0,
//     total_sales: 0,
//     total_profit: 0,
//   });

//   // ── Trigger App Build (background) ─────────
//   if (androidApp) {
//     triggerAppBuild(reseller.id).catch((err) => {
//       console.error("App build trigger failed:", reseller.id, ":", err);
//     });
//   }

//   // ── Sign in ────────────────────────────────
//   const { error: signInError } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   });
//   if (signInError) {
//     console.error("Auto sign-in failed:", signInError);
//   }

//   revalidatePath("/reseller");

//   // ── Email is now handled by Supabase Edge Function (send-reseller-emails) ──
//   // The edge function runs every 15 minutes via pg_cron and sends:
//   // Email 1 (immediate): store credentials
//   // Email 2 (2hrs later): how to fund wallet & make first sale
//   // Email 3 (4hrs later): how to grow the business

//   return {
//     success: true,
//     resellerId: reseller.id,
//     storeUrl: `/${storeName}`,
//     message: "Your store is live! Check your email for login credentials.",
//   };
// }
