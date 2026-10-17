// src/actions/reseller/application/getApplicationStatus.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getApplicationStatus(applicationId: string) {
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

    const { data, error } = await supabase
      .from("reseller_applications")
      .select(
        "application_status, submitted_at, updated_at, full_name, email, store_name",
      )
      .eq("id", applicationId)
      .single();

    if (error) throw error;

    return {
      success: true,
      status: data.application_status,
      submittedAt: data.submitted_at,
      updatedAt: data.updated_at,
      fullName: data.full_name,
      email: data.email,
      storeName: data.store_name,
    };
  } catch (error) {
    console.error("Error getting application status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get application status",
    };
  }
}
