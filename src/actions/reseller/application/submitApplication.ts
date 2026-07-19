// src/actions/reseller/application/submitApplication.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SubmitApplicationParams {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string; // ✅ User's password from the form
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

export async function submitApplication(params: SubmitApplicationParams) {
  try {
    const supabase = await createServerClient();
    const admin = createAdminClient();

    // ✅ Check if email already exists in global applications
    const { data: existing, error: checkError } = await supabase
      .from("global_reseller_applications")
      .select("id, email")
      .eq("email", params.email)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existing) {
      return {
        success: false,
        error: "An application with this email already exists.",
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

    // ✅ Create Auth User with the user's provided password
    let authUserId: string | null = null;

    try {
      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email: params.email,
          password: params.password, // ✅ Use user's password from form
          email_confirm: true,
          user_metadata: {
            first_name: params.firstName,
            last_name: params.lastName,
            store_name: params.storeName,
            store_slug: params.storeSlug,
            role: "reseller",
          },
        });

      if (authError) {
        console.error("Auth user creation failed:", authError);
        return {
          success: false,
          error: "Failed to create account. Please try again.",
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

    // ✅ Generate dashboard token
    const dashboardToken = generateDashboardToken();

    // ✅ Insert application
    const { data: application, error: insertError } = await supabase
      .from("global_reseller_applications")
      .insert({
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone: params.phone,
        country_code: params.countryCode,
        store_name: params.storeName,
        store_slug: params.storeSlug,
        logo_url: params.logo || null,
        brand_color: params.brandColor,
        android_app: params.androidApp,
        application_status: "pending",
        agreed: params.agreed,
        auth_user_id: authUserId,
        dashboard_token: dashboardToken,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      // Rollback auth user if created
      if (authUserId) {
        try {
          await admin.auth.admin.deleteUser(authUserId);
        } catch (e) {
          console.error("Failed to rollback auth user:", e);
        }
      }
      throw insertError;
    }

    // ✅ Queue Android build if selected
    if (params.androidApp) {
      await supabase.from("global_app_builds").insert({
        application_id: application.id,
        build_status: "queued",
        queued_at: new Date().toISOString(),
      });
    }

    // ✅ Trigger Edge Function for email (instead of direct Brevo)
    try {
      // Call Supabase Edge Function to send welcome email
      const { error: edgeError } = await supabase.functions.invoke(
        "send-reseller-welcome-email",
        {
          body: {
            applicationId: application.id,
            email: params.email,
            firstName: params.firstName,
            storeName: params.storeName,
            storeSlug: params.storeSlug,
            countryCode: params.countryCode,
            androidApp: params.androidApp,
          },
        },
      );

      if (edgeError) {
        console.error("Edge Function error:", edgeError);
        // Continue even if email fails
      }
    } catch (emailError) {
      console.error("Failed to trigger email:", emailError);
      // Continue even if email fails
    }

    // ✅ Log email (will be updated by Edge Function)
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
