// src/actions/reseller/application/getApplicationDraft.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getApplicationDraft(applicationId: string) {
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
      .select("application_data, current_step")
      .eq("id", applicationId)
      .eq("application_status", "draft")
      .single();

    if (error) throw error;

    return data?.application_data || null;
  } catch (error) {
    console.error("Error getting draft:", error);
    return null;
  }
}
