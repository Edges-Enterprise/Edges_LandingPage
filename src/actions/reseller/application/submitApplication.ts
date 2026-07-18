// src/actions/reseller/application/submitApplication.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface SubmitApplicationParams {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  storeName: string;
  storeSlug: string;
  logo?: string;
  brandColor: string;
  androidApp: boolean;
  countryCode: string;
  agreed: boolean;
}

export async function submitApplication(params: SubmitApplicationParams) {
  try {
    // ✅ Next.js 16 pattern - await cookies()
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from("reseller_applications")
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

    // Check if store slug is available
    const { data: existingStore, error: storeCheckError } = await supabase
      .from("reseller_app_configs")
      .select("id")
      .eq("config->>storeName", params.storeSlug)
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

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from("reseller_applications")
      .insert({
        irst_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone: params.phone,
        country_code: params.countryCode,
        store_name: params.storeName,
        store_slug: params.storeSlug,
        logo: params.logo || null,
        brand_color: params.brandColor,
        android_app: params.androidApp,
        application_status: "submitted",
        agreed: params.agreed,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return {
      success: true,
      applicationId: application.id,
      status: "submitted",
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
