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

/**
 * Generate a unique auth email
 * Format: {originalEmail}+reseller-{countryCode}-{storeSlug}-{random}@gmail.com
 * Example: erudite885+reseller-ng-alice-store-7x9k2@gmail.com
 */
function generateAuthEmail(originalEmail: string, countryCode: string, storeSlug: string): string {
  // Extract the username and domain from the original email
  const [username, domain] = originalEmail.split('@');
  
  // Generate a random 5-character string
  const randomStr = Math.random().toString(36).substring(2, 7);
  
  // Clean the storeSlug (remove special chars)
  const cleanStoreSlug = storeSlug.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Create the auth email
  const authEmail = `${username}+reseller-${countryCode}-${cleanStoreSlug}-${randomStr}@${domain}`;
  
  return authEmail;
}

export async function submitApplication(params: SubmitApplicationParams) {
  try {
    const supabase = await createServerClient();
    const admin = createAdminClient();

    // ✅ Generate the auth email
    const authEmail = generateAuthEmail(
      params.email,
      params.countryCode,
      params.storeSlug,
    );

    // ✅ Check if original email already exists in global applications
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

    // ✅ Create Auth User with the auth email (not the original email)
    let authUserId: string | null = null;

    try {
      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email: authEmail, // ✅ Use the generated auth email
          password: params.password,
          email_confirm: true,
          user_metadata: {
            original_email: params.email, // Store original email in metadata
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

    // ✅ Generate dashboard token
    const dashboardToken = generateDashboardToken();

    // ✅ Insert application (store both original and auth emails)
    const { data: application, error: insertError } = await supabase
      .from("global_reseller_applications")
      .insert({
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email, // ✅ Original email for display/communication
        original_email: params.email, // ✅ Store original email
        auth_email: authEmail, // ✅ Store the auth email for login lookup
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
        temp_password: params.password, // ✅ Store the password temporarily
        dashboard_token: dashboardToken,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, original_email, auth_email")
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
      console.error("Insert error:", insertError);
      return {
        success: false,
        error: "Failed to submit application. Please try again.",
      };
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
        "send-global-reseller-welcome",
        {
          body: {
            applicationId: application.id,
            firstName: params.firstName,
            lastName: params.lastName,
            email: params.email,
            password: params.password, // ✅ Send the password for the email
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
