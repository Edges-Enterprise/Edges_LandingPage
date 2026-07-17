// src/actions/reseller/application/saveApplicationDraft.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface SaveDraftParams {
  applicationId?: string | null;
  data: any;
  countryCode: string;
  step: number;
}

export async function saveDraft(params: SaveDraftParams) {
  try {
    const { applicationId, data, countryCode, step } = params;

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

    // If we have an applicationId, update existing draft
    if (applicationId) {
      const { error } = await supabase
        .from("reseller_applications")
        .update({
          application_data: data,
          current_step: step,
          draft_saved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (error) throw error;

      return {
        success: true,
        applicationId,
      };
    }

    // Otherwise, create a new draft
    const { data: newApplication, error: insertError } = await supabase
      .from("reseller_applications")
      .insert({
        country_code: countryCode,
        application_data: data,
        current_step: step,
        application_status: "draft",
        draft_saved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return {
      success: true,
      applicationId: newApplication.id,
    };
  } catch (error) {
    console.error("Error saving draft:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save draft",
    };
  }
}
