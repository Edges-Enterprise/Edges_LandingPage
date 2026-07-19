// src/actions/reseller/application/submitApplication.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SubmitApplicationParams {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  storeName: string;
  storeSlug: string;
  logo?: string;
  brandColor: string;
  androidApp: boolean;
  countryCode: string;
  agreed: boolean;
}

function generateDashboardToken(): string {
  const timestamp = Date.now();
  const random = require("crypto").randomBytes(32).toString("hex");
  return `${timestamp}_${random}`;
}

function generateAuthEmail(
  originalEmail: string,
  countryCode: string,
  storeSlug: string,
): string {
  const [username, domain] = originalEmail.split("@");
  const randomStr = Math.random().toString(36).substring(2, 7);
  const cleanStoreSlug = storeSlug.replace(/[^a-zA-Z0-9-]/g, "");
  const authEmail = `${username}+reseller-${countryCode}-${cleanStoreSlug}-${randomStr}@${domain}`;
  return authEmail;
}

/**
 * Upload logo to Supabase storage
 * Handles both generated and custom logos
 */
async function uploadLogo(
  supabase: any,
  applicationId: string,
  logoDataUrl: string,
): Promise<string | null> {
  if (!logoDataUrl || !logoDataUrl.startsWith("data:image")) {
    return null;
  }

  try {
    // Extract base64 data from data URL
    const matches = logoDataUrl.match(
      /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/,
    );

    if (!matches) {
      console.error("Invalid data URL format");
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `reseller-${applicationId}-icon-${Date.now()}.png`;
    const filePath = `${applicationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("reseller-assets")
      .upload(filePath, buffer, {
        contentType: `image/${mimeType === "jpg" ? "jpeg" : mimeType}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload failed:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("reseller-assets")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Logo processing failed:", error);
    return null;
  }
}

export async function submitApplication(params: SubmitApplicationParams) {
  try {
    const supabase = await createServerClient();
    const admin = createAdminClient();

    const authEmail = generateAuthEmail(
      params.email,
      params.countryCode,
      params.storeSlug,
    );

    // ✅ Check if original email already exists
    const { data: existing, error: checkError } = await supabase
      .from("global_reseller_applications")
      .select("id, original_email")
      .eq("original_email", params.email)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existing) {
      return {
        success: false,
        error:
          "An application with this email already exists. Please use a different email or login to your existing account.",
      };
    }

    // ✅ Check if store slug is available
    const { data: existingStore, error: storeCheckError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("store_slug", params.storeSlug)
      .maybeSingle();

    if (storeCheckError && storeCheckError.code !== "PGRST116") {
      throw storeCheckError;
    }

    if (existingStore) {
      return {
        success: false,
        error: "This store name is already taken. Please choose another.",
      };
    }

    // ✅ Create Auth User
    let authUserId: string | null = null;

    try {
      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email: authEmail,
          password: params.password,
          email_confirm: true,
          user_metadata: {
            original_email: params.email,
            first_name: params.firstName,
            last_name: params.lastName,
            store_name: params.storeName,
            store_slug: params.storeSlug,
            role: "reseller",
            country_code: params.countryCode,
          },
        });

      if (authError) {
        console.error("Auth user creation failed:", authError);
        return {
          success: false,
          error:
            authError.message || "Failed to create account. Please try again.",
        };
      }

      if (authData?.user) {
        authUserId = authData.user.id;
      }
    } catch (authError) {
      console.error("Auth error:", authError);
      return {
        success: false,
        error: "Failed to create account. Please try again.",
      };
    }

    const dashboardToken = generateDashboardToken();

    // ✅ Insert application
    const { data: application, error: insertError } = await supabase
      .from("global_reseller_applications")
      .insert({
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        original_email: params.email,
        auth_email: authEmail,
        phone: params.phone,
        country_code: params.countryCode,
        store_name: params.storeName,
        store_slug: params.storeSlug,
        logo_url: null,
        brand_color: params.brandColor,
        android_app: params.androidApp,
        application_status: "pending",
        agreed: params.agreed,
        auth_user_id: authUserId,
        temp_password: params.password,
        dashboard_token: dashboardToken,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      if (authUserId) {
        try {
          await admin.auth.admin.deleteUser(authUserId);
        } catch (e) {
          console.error("Failed to rollback auth user:", e);
        }
      }
      console.error("Insert error:", insertError);
      return {
        success: false,
        error: "Failed to submit application. Please try again.",
      };
    }

    // ============================================================
    // ✅ UPLOAD LOGO - Handles BOTH generated AND custom logos
    // ============================================================
    let logoUrl: string | null = null;

    if (params.logo && params.logo.startsWith("data:image")) {
      // ✅ This handles both:
      // 1. Generated logo (base64 from generateIconPng)
      // 2. Custom logo (user uploaded image as base64)
      logoUrl = await uploadLogo(supabase, application.id, params.logo);

      if (logoUrl) {
        // ✅ Update the application with the logo URL
        await supabase
          .from("global_reseller_applications")
          .update({ logo_url: logoUrl })
          .eq("id", application.id);

        console.log(`✅ Logo uploaded for application: ${application.id}`);
      }
    }

    // ✅ Queue Android build if selected
    if (params.androidApp) {
      await supabase.from("global_app_builds").insert({
        application_id: application.id,
        build_status: "queued",
        queued_at: new Date().toISOString(),
      });
    }

    // ✅ Trigger Edge Function for email
    try {
      const { error: edgeError } = await supabase.functions.invoke(
        "send-global-reseller-welcome",
        {
          body: {
            applicationId: application.id,
            firstName: params.firstName,
            lastName: params.lastName,
            email: params.email,
            password: params.password,
            storeName: params.storeName,
            storeSlug: params.storeSlug,
            countryCode: params.countryCode,
            androidApp: params.androidApp,
            logoUrl: logoUrl,
          },
        },
      );

      if (edgeError) {
        console.error("Edge Function error:", edgeError);
      }
    } catch (emailError) {
      console.error("Failed to trigger email:", emailError);
    }

    // ✅ Log email
    await supabase.from("global_email_logs").insert({
      application_id: application.id,
      email_type: "welcome",
      subject: "Welcome to Edges Network!",
      sent_at: new Date().toISOString(),
    });

    return {
      success: true,
      applicationId: application.id,
      status: "pending",
      email: params.email,
      storeSlug: params.storeSlug,
      androidApp: params.androidApp,
      logoUrl: logoUrl,
      message: "Application submitted successfully!",
    };
  } catch (error) {
    console.error("Error submitting application:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit application",
    };
  }
}
