// supabase/functions/global-store-update-profile/index.ts
//
// Task 8, branch 8.a.ii. The write half of the profile: rename the caller
// (store name for a reseller, first name for a customer). Runs with the
// service role because the customer holds only the publishable key and no
// global_* policy grants a customer update. The target row is the caller's
// own, resolved from the JWT (see _shared/storeIdentity.ts).
import {
  resolveStoreIdentity,
  adminClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/storeIdentity.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { resellerId, name } = await req.json();
    const admin = adminClient();

    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) return jsonResponse({ error: "Name is required" }, 400);

    const { identity, error, status } = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );
    if (error) return jsonResponse({ error }, status ?? 400);
    if (!identity) return jsonResponse({ error: "User not found" }, 404);

    if (identity.userType === "reseller") {
      const { error: updateError } = await admin
        .from("global_reseller_applications")
        .update({ store_name: trimmed })
        .eq("id", identity.resellerId);
      if (updateError) return jsonResponse({ error: "Update failed" }, 400);
    } else {
      const { error: updateError } = await admin
        .from("global_customers")
        .update({ first_name: trimmed })
        .eq("id", identity.customerId!);
      if (updateError) return jsonResponse({ error: "Update failed" }, 400);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("global-store-update-profile error:", error);
    return jsonResponse({ error: "Profile update failed" }, 400);
  }
});
