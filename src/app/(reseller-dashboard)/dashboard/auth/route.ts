// app/(reseller-dashboard)/auth/route.ts

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return redirect("/reseller");
  }

  const supabase = await createServerClient();
  const admin = createAdminClient();

  // Look up the reseller by dashboard_token
  const { data: reseller, error: resellerError } = await admin
    .from("resellers")
    .select("id, email, store_name, auth_user_id, status, temp_password")
    .eq("dashboard_token", token)
    .eq("status", "active")
    .single();

  if (resellerError || !reseller) {
    console.error("Invalid dashboard token:", resellerError);
    return redirect("/reseller");
  }

  // Check if the token has expired (optional: add expiry)
  const tokenParts = token.split("_");
  if (tokenParts.length === 2) {
    const timestamp = parseInt(tokenParts[0]);
    const now = Date.now();
    // Token expires after 30 days
    const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
    if (now - timestamp > TOKEN_EXPIRY_MS) {
      console.error("Dashboard token expired for:", reseller.email);
      return redirect("/reseller");
    }
  }

  // Check if the user is already signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If signed in and the user matches the reseller, just redirect to dashboard
  if (user && user.id === reseller.auth_user_id) {
    return redirect("/dashboard");
  }

  // If signed in as a different user, sign them out first
  if (user) {
    await supabase.auth.signOut();
  }

  // Now sign in with the stored password
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: reseller.email,
      password: reseller.temp_password,
    });

    if (signInError) {
      console.error("Auto-login failed:", signInError);
      return redirect("/reseller");
    }
  } catch (error) {
    console.error("Auto-login error:", error);
    return redirect("/reseller");
  }

  // Redirect to dashboard
  return redirect("/dashboard");
}
