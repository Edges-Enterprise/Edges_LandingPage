// supabase/functions/delete-account/index.ts
//
// Deletes the calling user's own account. The user is identified from the
// Supabase JWT in the Authorization header - never from the request body - so a
// caller cannot delete another user's account by sending a different user_id.
//
// `auth.admin.deleteUser` on its own fails: several tables reference the user
// with no ON DELETE rule, so Postgres rejects the delete with a foreign-key
// violation and nothing is removed. We clear the user's own rows first, then
// delete the auth user.
//
// Requires SUPABASE_SERVICE_ROLE_KEY to call the admin API. Deploy with
// `verify_jwt = true` so the gateway rejects unauthenticated calls first.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Tables that hold the caller's own rows and are not covered by a cascade.
// `referrals` is keyed twice (referrer and referee), hence the repeat. Matched
// by `user_email` where the table keys on the email rather than the id.
//
// `wallet` is keyed by `user_email` and has no FK to `auth.users`, so leaving it
// behind kept the balance alive: the next sign-up with the same address picked
// the old wallet up again.
const OWNED_ROWS: [string, string][] = [
  ["customer_issues", "user_id"],
  ["referrals", "referrer_id"],
  ["referrals", "referee_id"],
  ["rewards", "user_id"],
  ["user_tokens", "user_email"],
  ["cable_purchases", "user_id"],
  ["user_push_tokens", "user_id"],
  ["plan_settings_log", "user_id"],
  ["flashsale_purchases", "user_id"],
  ["wallet", "user_email"],
  ["web_push_tokens", "user_id"],
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing bearer token" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Identify the caller from their own JWT.
  const asUser = createClient(supabaseUrl!, anonKey!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await asUser.auth.getUser();
  if (authError || !user) {
    return json({ error: "Invalid session" }, 401);
  }

  const admin = createClient(supabaseUrl!, serviceKey!);

  // The auth email and the profile email can differ, so match on both.
  const emails = new Set<string>();
  if (user.email) emails.add(user.email);
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.email) emails.add(profile.email);

  // Clear everything that would otherwise block the delete. A failure here
  // leaves the account intact, so the caller can retry safely.
  const failures: string[] = [];
  for (const [table, column] of OWNED_ROWS) {
    const values = column === "user_email" ? [...emails] : [user.id];
    if (!values.length) continue;
    const { error } = await admin.from(table).delete().in(column, values);
    if (error) failures.push(`${table}.${column}: ${error.message}`);
  }

  // Wallet audit is a financial record we keep for tax and anti-fraud, so drop
  // the link to the person rather than the row.
  for (const email of emails) {
    const { error } = await admin
      .from("wallet_audit")
      .update({ user_email: null })
      .eq("user_email", email);
    if (error) failures.push(`wallet_audit.user_email: ${error.message}`);
  }

  if (failures.length) {
    console.error("[DELETE-ACCOUNT] cleanup failed:", failures.join("; "));
    return json({ error: "Could not delete account", details: failures }, 500);
  }

  // Deleting the profile cascades to notifications (fk_user ON DELETE CASCADE).
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", user.id);
  if (profileError) {
    console.error(
      "[DELETE-ACCOUNT] profile delete failed:",
      profileError.message,
    );
    return json({ error: profileError.message }, 500);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[DELETE-ACCOUNT] admin.deleteUser failed:", error.message);
    return json({ error: error.message }, 500);
  }

  return json({ success: true }, 200);
});
