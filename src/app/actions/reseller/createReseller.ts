// app/actions/reseller/createReseller.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CreateResellerResult, ResellerFormData } from "@/types";
import { sendAdminEmail } from "@/lib/email/email";

function generatePassword(storeName: string, email: string): string {
  const prefix = storeName.slice(0, 4);
  const suffix = email.split("@")[0].slice(0, 4);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}${suffix}${random}`;
}

export async function createReseller(
  formData: FormData,
): Promise<CreateResellerResult> {
  const supabase = await createServerClient();

  const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
  const email = (formData.get("email") as string)?.trim();
  const theme = (formData.get("theme") as ResellerFormData["theme"]) || "light";
  const androidApp = formData.get("androidApp") === "true";

  // ── Validate ──────────────────────────────────────
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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  if (!["light", "dark", "custom"].includes(theme)) {
    return { error: "Invalid theme selection" };
  }

  // ── Check store name availability ─────────────────
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

  // ── Generate password ─────────────────────────────
  const password = generatePassword(storeName, email);

  // ── Create auth user with password ────────────────
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
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

  // ── Insert reseller record ────────────────────────
  const { data: reseller, error: resellerError } = await supabase
    .from("resellers")
    .insert({
      auth_user_id: authData.user.id,
      email,
      store_name: storeName,
      theme,
      android_app: androidApp,
      status: "active",
    })
    .select("id")
    .single();

  if (resellerError || !reseller) {
    console.error("Reseller insert failed:", resellerError);
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { error: "Failed to create reseller account. Please try again." };
  }

  // ── Send credentials email ────────────────────────
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000";
  const storeUrl = `${baseUrl}/${storeName}`;

  // Format the store name for display
  const displayName = storeName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Send as plain text - your sendAdminEmail will wrap it beautifully
  const emailMessage = `
Your branded store has been created and is live 🎁.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 STORE URL:
${storeUrl}

📧 EMAIL:
${email}

🔐 PASSWORD:
${password}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Keep these credentials safe. You can change your password anytime from your dashboard settings.

👉 Go to Dashboard: ${baseUrl}/dashboard

Need help? Reply to this email or contact support.
  `;

  try {
    const result = await sendAdminEmail({
      to: email,
      subject: `🎉 Your ${displayName} Store is Ready!`,
      message: emailMessage,
      recipientName: displayName,
      isHtml: false, // Important: Let sendAdminEmail handle the HTML wrapping
    });

    if (!result.success) {
      console.error("Failed to send credentials email:", result.error);
    } else {
      console.log("Credentials email sent successfully:", result.messageId);
    }
  } catch (emailError) {
    console.error("Exception sending credentials email:", emailError);
  }

  revalidatePath("/reseller");

  return {
    success: true,
    resellerId: reseller.id,
    storeUrl: `/${storeName}`,
    message:
      "Check your email for login credentials. Your store is live. ✨",
  };
}

// // app/actions/reseller/createReseller.ts

// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";
// import type { CreateResellerResult, ResellerFormData } from "@/types";
// import { sendAdminEmail } from "@/lib/email/email"; // Import your existing email function

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

//   const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
//   const email = (formData.get("email") as string)?.trim();
//   const theme = (formData.get("theme") as ResellerFormData["theme"]) || "light";
//   const androidApp = formData.get("androidApp") === "true";

//   // ── Validate ──────────────────────────────────────
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

//   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//     return { error: "Please enter a valid email address" };
//   }

//   if (!["light", "dark", "custom"].includes(theme)) {
//     return { error: "Invalid theme selection" };
//   }

//   // ── Check store name availability ─────────────────
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

//   // ── Generate password ─────────────────────────────
//   const password = generatePassword(storeName, email);

//   // ── Create auth user with password ────────────────
//   const { data: authData, error: authError } =
//     await supabase.auth.admin.createUser({
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

//   // ── Insert reseller record ────────────────────────
//   const { data: reseller, error: resellerError } = await supabase
//     .from("resellers")
//     .insert({
//       auth_user_id: authData.user.id,
//       email,
//       store_name: storeName,
//       theme,
//       android_app: androidApp,
//       status: "active",
//     })
//     .select("id")
//     .single();

//   if (resellerError || !reseller) {
//     console.error("Reseller insert failed:", resellerError);
//     await supabase.auth.admin.deleteUser(authData.user.id);
//     return { error: "Failed to create reseller account. Please try again." };
//   }

//   // ── Send credentials email using your existing system ────────
//   const storeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${storeName}`;

//   // Format the store name for display
//   const displayName = storeName
//     .split("-")
//     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//     .join(" ");

//   // Create a beautiful HTML message for the reseller
//   const emailMessage = `
//     <div style="font-family: Arial, sans-serif;">
//       <p>Your branded store has been created and will be live within 72 hours. Here are your login credentials:</p>

//       <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
//         <p style="margin: 0 0 8px;"><strong>Store URL:</strong><br/>${storeUrl}</p>
//         <p style="margin: 0 0 8px;"><strong>Email:</strong><br/>${email}</p>
//         <p style="margin: 0;"><strong>Password:</strong><br/><code style="background: #e0e0e0; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
//       </div>

//       <p>Keep these credentials safe. You can change your password anytime from your dashboard settings.</p>

//       <div style="margin: 24px 0;">
//         <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
//            style="background: #C98A54; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
//           Go to Dashboard →
//         </a>
//       </div>

//       <p style="margin-top: 24px; font-size: 12px; color: #666;">
//         Need help? Reply to this email or contact support.
//       </p>
//     </div>
//   `;

//   try {
//     const result = await sendAdminEmail({
//       to: email,
//       subject: `🎉 Your ${displayName} Store is Ready!`,
//       message: emailMessage,
//       recipientName: displayName,
//       isHtml: true, // Your existing function already formats HTML beautifully
//     });

//     if (!result.success) {
//       console.error("Failed to send credentials email:", result.error);
//       // Don't fail the signup — email can be resent later
//       // You could store this in a "failed_emails" table for retry
//     } else {
//       console.log("Credentials email sent successfully:", result.messageId);
//     }
//   } catch (emailError) {
//     console.error("Exception sending credentials email:", emailError);
//     // Don't fail the signup
//   }

//   revalidatePath("/reseller");

//   return {
//     success: true,
//     resellerId: reseller.id,
//     storeUrl: `/${storeName}`,
//     message:
//       "Check your email for login credentials. Your store will be live within 72 hours.",
//   };
// }

// // "use server";

// // import { createServerClient } from "@/lib/supabase/server";
// // import { revalidatePath } from "next/cache";
// // import type { CreateResellerResult, ResellerFormData } from "@/types";
// // import nodemailer from "nodemailer";

// // function generatePassword(storeName: string, email: string): string {
// //   const prefix = storeName.slice(0, 4);
// //   const suffix = email.split("@")[0].slice(0, 4);
// //   const random = Math.random().toString(36).slice(2, 6);
// //   return `${prefix}${suffix}${random}`;
// // }

// // async function sendCredentialsEmail(
// //   email: string,
// //   storeName: string,
// //   password: string,
// //   storeUrl: string,
// // ) {
// //   const transporter = nodemailer.createTransport({
// //     host: process.env.EMAIL_SERVER_HOST,
// //     port: Number(process.env.EMAIL_SERVER_PORT),
// //     secure: Number(process.env.EMAIL_SERVER_PORT) === 465, // true for 465, false for other ports
// //     auth: {
// //       user: process.env.EMAIL_SERVER_USER,
// //       pass: process.env.EMAIL_SERVER_PASS,
// //     },
// //   });

// //   const displayName = storeName
// //     .split("-")
// //     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
// //     .join(" ");

// //   await transporter.sendMail({
// //     from: `"Edges Network" <${process.env.EMAIL_FROM}>`,
// //     to: email,
// //     subject: `Your ${displayName} Store is Ready!`,
// //     html: `
// //       <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #1E130A; border-radius: 16px; overflow: hidden;">
// //         <div style="background: #C98A54; padding: 28px 24px; text-align: center;">
// //           <h1 style="color: #FDF8F3; margin: 0; font-size: 22px;">🎉 Your Store is Ready!</h1>
// //           <p style="color: rgba(253,248,243,0.8); margin: 8px 0 0;">Welcome to the Edges Network reseller program!</p>
// //         </div>
// //         <div style="padding: 28px 24px; color: #F5E9D9;">
// //           <p style="margin: 0 0 16px; font-size: 15px;">Hi <strong>${displayName}</strong>,</p>
// //           <p style="margin: 0 0 20px; font-size: 14px; color: #B89880; line-height: 1.6;">
// //             Your branded store has been created and will be live within 72 hours.
// //             Here are your login credentials:
// //           </p>

// //           <div style="background: #2A1A0D; border: 1px solid rgba(201,138,84,0.2); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
// //             <div style="margin-bottom: 14px;">
// //               <p style="margin: 0 0 2px; font-size: 11px; color: #7A5C45; text-transform: uppercase; letter-spacing: 0.5px;">Store URL</p>
// //               <p style="margin: 0; font-size: 15px; color: #DEB082;">${storeUrl}</p>
// //             </div>
// //             <div style="margin-bottom: 14px;">
// //               <p style="margin: 0 0 2px; font-size: 11px; color: #7A5C45; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
// //               <p style="margin: 0; font-size: 15px; color: #DEB082;">${email}</p>
// //             </div>
// //             <div>
// //               <p style="margin: 0 0 2px; font-size: 11px; color: #7A5C45; text-transform: uppercase; letter-spacing: 0.5px;">Password</p>
// //               <p style="margin: 0; font-size: 15px; color: #DEB082; font-family: monospace; letter-spacing: 0.5px;">${password}</p>
// //             </div>
// //           </div>

// //           <p style="margin: 0 0 20px; font-size: 13px; color: #B89880;">
// //             Keep these credentials safe. You can change your password anytime from your dashboard settings.
// //           </p>

// //           <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
// //              style="display: block; background: #C98A54; color: #FDF8F3; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin-bottom: 16px;">
// //             Go to Dashboard →
// //           </a>

// //           <p style="margin: 0; font-size: 12px; color: #7A5C45; text-align: center;">
// //             Need help? Reply to this email or contact support.
// //           </p>
// //         </div>
// //       </div>
// //     `,
// //   });
// // }

// // export async function createReseller(
// //   formData: FormData,
// // ): Promise<CreateResellerResult> {
// //   const supabase = await createServerClient();

// //   const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
// //   const email = (formData.get("email") as string)?.trim();
// //   const theme = (formData.get("theme") as ResellerFormData["theme"]) || "light";
// //   const androidApp = formData.get("androidApp") === "true";

// //   // ── Validate ──────────────────────────────────────
// //   if (!storeName || !email) {
// //     return { error: "Store name and email are required" };
// //   }

// //   if (!/^[a-z0-9-]+$/.test(storeName)) {
// //     return {
// //       error:
// //         "Store name can only contain lowercase letters, numbers, and hyphens",
// //     };
// //   }

// //   if (storeName.length < 3) {
// //     return { error: "Store name must be at least 3 characters" };
// //   }

// //   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
// //     return { error: "Please enter a valid email address" };
// //   }

// //   if (!["light", "dark", "custom"].includes(theme)) {
// //     return { error: "Invalid theme selection" };
// //   }

// //   // ── Check store name availability ─────────────────
// //   const { data: existing } = await supabase
// //     .from("resellers")
// //     .select("id")
// //     .eq("store_name", storeName)
// //     .maybeSingle();

// //   if (existing) {
// //     return {
// //       error: "This store name is already taken. Please choose another.",
// //     };
// //   }

// //   // ── Generate password ─────────────────────────────
// //   const password = generatePassword(storeName, email);

// //   // ── Create auth user with password ────────────────
// //   const { data: authData, error: authError } =
// //     await supabase.auth.admin.createUser({
// //       email,
// //       password,
// //       email_confirm: true,
// //       user_metadata: {
// //         store_name: storeName,
// //         role: "reseller",
// //         theme,
// //         android_app: androidApp,
// //       },
// //     });

// //   if (authError || !authData.user) {
// //     console.error("Auth user creation failed:", authError);
// //     return { error: "Failed to create account. Please try again." };
// //   }

// //   // ── Insert reseller record ────────────────────────
// //   const { data: reseller, error: resellerError } = await supabase
// //     .from("resellers")
// //     .insert({
// //       auth_user_id: authData.user.id,
// //       email,
// //       store_name: storeName,
// //       theme,
// //       android_app: androidApp,
// //       status: "active",
// //     })
// //     .select("id")
// //     .single();

// //   if (resellerError || !reseller) {
// //     console.error("Reseller insert failed:", resellerError);
// //     await supabase.auth.admin.deleteUser(authData.user.id);
// //     return { error: "Failed to create reseller account. Please try again." };
// //   }

// //   // ── Send credentials email ────────────────────────
// //   const storeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${storeName}`;

// //   try {
// //     await sendCredentialsEmail(email, storeName, password, storeUrl);
// //   } catch (emailError) {
// //     console.error("Failed to send credentials email:", emailError);
// //     // Don't fail the signup — email can be resent later
// //   }

// //   revalidatePath("/reseller");

// //   return {
// //     success: true,
// //     resellerId: reseller.id,
// //     storeUrl: `/${storeName}`,
// //     message:
// //       "Check your email for login credentials. Your store will be live within 72 hours.",
// //   };
// // }

// // // "use server";

// // // import { createServerClient } from "@/lib/supabase/server";
// // // import { revalidatePath } from "next/cache";
// // // import type { CreateResellerResult, ResellerFormData } from "@/types";

// // // /**
// // //  * Generate a password from store name and email
// // //  */
// // // function generatePassword(storeName: string, email: string): string {
// // //   const prefix = storeName.slice(0, 4);
// // //   const suffix = email.split("@")[0].slice(0, 4);
// // //   const random = Math.random().toString(36).slice(2, 6);
// // //   return `${prefix}${suffix}${random}`;
// // // }

// // // export async function createReseller(
// // //   formData: FormData,
// // // ): Promise<CreateResellerResult> {
// // //   const supabase = await createServerClient();

// // //   const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
// // //   const email = (formData.get("email") as string)?.trim();
// // //   const theme = (formData.get("theme") as ResellerFormData["theme"]) || "light";
// // //   const androidApp = formData.get("androidApp") === "true";

// // //   // ── Validate ──────────────────────────────────────
// // //   if (!storeName || !email) {
// // //     return { error: "Store name and email are required" };
// // //   }

// // //   if (!/^[a-z0-9-]+$/.test(storeName)) {
// // //     return {
// // //       error:
// // //         "Store name can only contain lowercase letters, numbers, and hyphens",
// // //     };
// // //   }

// // //   if (storeName.length < 3) {
// // //     return { error: "Store name must be at least 3 characters" };
// // //   }

// // //   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
// // //     return { error: "Please enter a valid email address" };
// // //   }

// // //   if (!["light", "dark", "custom"].includes(theme)) {
// // //     return { error: "Invalid theme selection" };
// // //   }

// // //   // ── Check store name availability ─────────────────
// // //   const { data: existing } = await supabase
// // //     .from("resellers")
// // //     .select("id")
// // //     .eq("store_name", storeName)
// // //     .maybeSingle();

// // //   if (existing) {
// // //     return {
// // //       error: "This store name is already taken. Please choose another.",
// // //     };
// // //   }

// // //   // ── Generate password ─────────────────────────────
// // //   const password = generatePassword(storeName, email);

// // //   // ── Create auth user with password ────────────────
// // //   const { data: authData, error: authError } =
// // //     await supabase.auth.admin.createUser({
// // //       email,
// // //       password,
// // //       email_confirm: true,
// // //       user_metadata: {
// // //         store_name: storeName,
// // //         role: "reseller",
// // //         theme,
// // //         android_app: androidApp,
// // //       },
// // //     });

// // //   if (authError || !authData.user) {
// // //     console.error("Auth user creation failed:", authError);
// // //     return { error: "Failed to create account. Please try again." };
// // //   }

// // //   // ── Insert reseller record ────────────────────────
// // //   const { data: reseller, error: resellerError } = await supabase
// // //     .from("resellers")
// // //     .insert({
// // //       auth_user_id: authData.user.id,
// // //       email,
// // //       store_name: storeName,
// // //       theme,
// // //       android_app: androidApp,
// // //       status: "pending",
// // //     })
// // //     .select("id")
// // //     .single();

// // //   if (resellerError || !reseller) {
// // //     console.error("Reseller insert failed:", resellerError);
// // //     await supabase.auth.admin.deleteUser(authData.user.id);
// // //     return { error: "Failed to create reseller account. Please try again." };
// // //   }

// // //   revalidatePath("/reseller");

// // //   return {
// // //     success: true,
// // //     resellerId: reseller.id,
// // //     storeUrl: `/${storeName}`,
// // //     message: "Your store will be live within 72 hours",
// // //     password, // Return password so it can be shown on success page
// // //   };
// // // }

// // // // // app/actions/reseller/createReseller.ts

// // // // "use server";

// // // // import { createServerClient } from "@/lib/supabase/server";
// // // // import { revalidatePath } from "next/cache";
// // // // import type { CreateResellerResult, ResellerFormData } from "@/types";

// // // // export async function createReseller(
// // // //   formData: FormData,
// // // // ): Promise<CreateResellerResult> {
// // // //   const supabase = await createServerClient();

// // // //   const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
// // // //   const email = (formData.get("email") as string)?.trim();
// // // //   const theme = (formData.get("theme") as ResellerFormData["theme"]) || "light";
// // // //   const androidApp = formData.get("androidApp") === "true";

// // // //   // ── Validate ──────────────────────────────────────
// // // //   if (!storeName || !email) {
// // // //     return { error: "Store name and email are required" };
// // // //   }

// // // //   if (!/^[a-z0-9-]+$/.test(storeName)) {
// // // //     return {
// // // //       error:
// // // //         "Store name can only contain lowercase letters, numbers, and hyphens",
// // // //     };
// // // //   }

// // // //   if (storeName.length < 3) {
// // // //     return { error: "Store name must be at least 3 characters" };
// // // //   }

// // // //   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
// // // //     return { error: "Please enter a valid email address" };
// // // //   }

// // // //   if (!["light", "dark", "custom"].includes(theme)) {
// // // //     return { error: "Invalid theme selection" };
// // // //   }

// // // //   // ── Check store name availability ─────────────────
// // // //   const { data: existing } = await supabase
// // // //     .from("resellers")
// // // //     .select("id")
// // // //     .eq("store_name", storeName)
// // // //     .maybeSingle();

// // // //   if (existing) {
// // // //     return {
// // // //       error: "This store name is already taken. Please choose another.",
// // // //     };
// // // //   }

// // // //   // ── Create auth user (silent signup) ──────────────
// // // //   const { data: authData, error: authError } =
// // // //     await supabase.auth.admin.createUser({
// // // //       email,
// // // //       email_confirm: true,
// // // //       user_metadata: {
// // // //         store_name: storeName,
// // // //         role: "reseller",
// // // //         theme,
// // // //         android_app: androidApp,
// // // //       },
// // // //     });

// // // //   if (authError || !authData.user) {
// // // //     console.error("Auth user creation failed:", authError);
// // // //     return { error: "Failed to create account. Please try again." };
// // // //   }

// // // //   // ── Insert reseller record ────────────────────────
// // // //   const { data: reseller, error: resellerError } = await supabase
// // // //     .from("resellers")
// // // //     .insert({
// // // //       auth_user_id: authData.user.id,
// // // //       email,
// // // //       store_name: storeName,
// // // //       theme,
// // // //       android_app: androidApp,
// // // //       status: "active",
// // // //     })
// // // //     .select("id")
// // // //     .single();

// // // //   if (resellerError || !reseller) {
// // // //     console.error("Reseller insert failed:", resellerError);
// // // //     // Attempt cleanup: delete the auth user we just created
// // // //     await supabase.auth.admin.deleteUser(authData.user.id);
// // // //     return { error: "Failed to create reseller account. Please try again." };
// // // //   }

// // // //   // The wallet and plan configs are auto-created by database triggers

// // // //   revalidatePath("/reseller");

// // // //   return {
// // // //     success: true,
// // // //     resellerId: reseller.id,
// // // //     storeUrl: `/${storeName}`,
// // // //     message: "Your store will be live within 72 hours",
// // // //   };
// // // // }
