// src/actions/reseller/settings/changePassword.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase stores the password hash, so verifying the current password means
// attempting a sign-in. `auth.email` on the account is the derived auth
// address, which is exactly what signInWithPassword expects, so the session's
// own email is used directly.
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{
  success: boolean;
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

    if (!currentPassword || !newPassword) {
      return { success: false, error: "Both password fields are required" };
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        error: "The new password must be different from the current one",
      };
    }

    // Re-authenticate. signInWithPassword on the server client writes the
    // resulting session to cookies, which is what lets updateUser() below
    // change the password on the caller's own account.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: "Current password is incorrect" };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("Update password error:", updateError);
      return { success: false, error: updateError.message };
    }

    // `last_password_change` is what the Security tab renders. GoTrue exposes
    // no "password changed at" field, so it is recorded on the reseller
    // application row (the admin client is required: the table is RLS-locked).
    const admin = createAdminClient();
    const { error: stampError } = await admin
      .from("global_reseller_applications")
      .update({ password_changed_at: new Date().toISOString() })
      .eq("auth_user_id", user.id);

    if (stampError) {
      // The password did change; a failed timestamp must not read as failure.
      console.error("Password timestamp error:", stampError);
    }

    return { success: true };
  } catch (error) {
    console.error("ChangePassword Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
