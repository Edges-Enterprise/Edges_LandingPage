// src/actions/reseller/store/updateStoreTheme.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface UpdateStoreThemeParams {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  font_family?: string;
  button_style?: "rounded" | "square" | "pill";
  layout?: "grid" | "list";
}

export async function updateStoreTheme(
  params: UpdateStoreThemeParams,
): Promise<{
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id, theme_settings")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Get existing theme settings or defaults
    const currentTheme = application.theme_settings || {
      primary_color: "#C98A54",
      secondary_color: "#ab6c36",
      accent_color: "#C98A54",
      background_color: "#FFFFFF",
      text_color: "#111827",
      font_family: "Inter",
      button_style: "rounded",
      layout: "grid",
    };

    // Merge with new settings
    const updatedTheme = {
      ...currentTheme,
      ...params,
    };

    // Update application
    const { data: updated, error: updateError } = await supabase
      .from("global_reseller_applications")
      .update({
        theme_settings: updatedTheme,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id)
      .select()
      .single();

      

    if (updateError) {
      console.error("Update theme error:", updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      data: updated.theme_settings,
    };
  } catch (error) {
    console.error("UpdateStoreTheme Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
