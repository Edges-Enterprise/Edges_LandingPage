
// app/actions/auth.ts

"use server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function signInAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createServerClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === "true";

  if (!email || !password) return { error: "Email and password required" };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };

  if (data.user) {
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;

    // Set cookie using cookies() API
    const cookieStore = await cookies();
    cookieStore.set("rememberMe", rememberMe.toString(), {
      maxAge,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Use redirect() instead of NextResponse
    redirect("/home");
  }

  return { error: "Sign in failed" };
}

export async function signUpAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createServerClient();
  const username = (formData.get("username") as string)?.trim();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === "true";

  if (
    !username ||
    !email ||
    !password ||
    username.length < 3 ||
    password.length < 6
  ) {
    return {
      error:
        "Please ensure username is at least 3 characters, email is valid, and password is at least 6 characters.",
    };
  }

  // Basic email validation (server-side fallback)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Invalid email format." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username } },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      return { error: "This email is already registered." };
    }
    return { error: error.message };
  }

  if (data.user) {
    // Upsert profile - match actual table structure
    const { error: profileError } = await supabase.from("profiles").upsert([
      {
        id: data.user.id,
        username,
        email: email.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notifications_enabled: true,
        is_admin: false,
      },
    ]);

    if (profileError) {
      // Rollback - Note: admin.deleteUser requires service role key
      // Consider using an Edge Function for this
      return { error: "Failed to save user profile." };
    }

    // Set rememberMe cookie
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const cookieStore = await cookies();
    cookieStore.set("rememberMe", rememberMe.toString(), {
      maxAge,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Use redirect() instead of NextResponse
    redirect("/home");
  }

  return { error: "Sign up failed" };
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();

  // Delete rememberMe cookie
  const cookieStore = await cookies();
  cookieStore.delete("rememberMe");

  // Use redirect() instead of NextResponse
  redirect("/");
}

// export async function signOutAction() {
//   const supabase = createClient(); // Use your server client factory
//   const { error } = await supabase.auth.signOut();

//   if (error) {
//     throw new Error("Failed to sign out: " + error.message);
//   }

//   // Delete rememberMe cookie
//   const cookieStore = cookies();
//   cookieStore.delete("rememberMe");

//   return { success: true }; // Signal success to client
// }

export async function deleteOwnAccountAction() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Not authenticated");

  const response = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL!,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ user_id: session.user.id }),
    }
  );

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "Delete failed");
  }

  // Chain to signOutAction
  return signOutAction();
}

export async function getTransactionPinAction() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Not authenticated");

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("transaction_pin")
    .eq("id", session.user.id)
    .single();

  if (fetchError || !profile) {
    throw new Error("Failed to fetch PIN");
  }

  return { pin: profile.transaction_pin };
}

export async function updateTransactionPinAction(
  currentPin: string,
  newPin: string
) {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Not authenticated");

  // Fetch & validate current PIN
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("transaction_pin")
    .eq("id", session.user.id)
    .single();

  if (fetchError || profile?.transaction_pin !== currentPin) {
    throw new Error("Current PIN incorrect");
  }

  // Update
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ transaction_pin: newPin })
    .eq("id", session.user.id);

  if (updateError) throw updateError;

  // Revalidate profile cache
  revalidatePath("/profile");
}


/**
 * Forgot Password Action
 * Sends a password recovery email with redirect to /reset-password
 */
export async function forgotPasswordAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Email is required." };

  const supabase = await createServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Reset Password Action
 * Updates the password using the recovery token from Supabase
 */
// export async function resetPasswordAction(formData: FormData) {
//   const token = (formData.get("token") as string)?.trim();
//   const email = (formData.get("email") as string)?.trim();
//   const newPassword = (formData.get("newPassword") as string)?.trim();

//   if (!token || !email || !newPassword) {
//     return { error: "Missing required fields." };
//   }

//   const supabase = await createServerClient();

//   // Supabase expects a token + new password
//   const { error } = await supabase.auth.updateUser({
//     access_token: token,
//     password: newPassword,
//   });

//   if (error) return { error: error.message };
//   return { success: true };
// }

export async function resetPasswordAction(formData: FormData) {
  const token = (formData.get("token") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const newPassword = (formData.get("newPassword") as string)?.trim();

  if (!token || !email || !newPassword) {
    return { error: "Missing required fields." };
  }

  const supabase = await createServerClient();

  // Verify the recovery token to temporarily authenticate the user
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery" as const,
  });

  if (verifyError) {
    return { error: verifyError.message };
  }

  // Update the user's password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}