// src/lib/auth/email-lookup.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Get the auth email for a given original email
 * This allows users to log in with their original email
 */
export async function getAuthEmail(
  originalEmail: string,
): Promise<string | null> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("global_reseller_applications")
      .select("auth_email")
      .eq("original_email", originalEmail)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.auth_email;
  } catch (error) {
    console.error("Error looking up auth email:", error);
    return null;
  }
}

/**
 * Sign in with original email
 * This looks up the auth email and signs in with it
 */
export async function signInWithOriginalEmail(
  originalEmail: string,
  password: string,
) {
  try {
    const supabase = await createServerClient();

    // Look up the auth email
    const authEmail = await getAuthEmail(originalEmail);

    if (!authEmail) {
      return {
        success: false,
        error: "No account found with this email",
      };
    }

    // Sign in with the auth email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: password,
    });

    if (error) {
      console.error("Sign in error:", error);
      return {
        success: false,
        error: error.message || "Invalid email or password",
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during sign in",
    };
  }
}
