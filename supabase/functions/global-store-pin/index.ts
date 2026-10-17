// supabase/functions/global-store-pin/index.ts
//
// Task 8, branch 8.a.ii. Transaction-PIN management (the write half of
// hooks/useTransactionPin.ts). Setting/changing a PIN needs the service role
// for the same reason reads do: the customer holds only the publishable key
// and no global_* policy grants a customer write access.
//
// Security: the caller is identified from the JWT (never the body). The
// target row is the caller's own, resolved server-side. A change requires
// the current PIN; a first-time set does not (there is nothing to verify
// against). The PIN is never returned.
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
    const { resellerId, action, newPin, oldPin } = await req.json();
    const admin = adminClient();

    if (!newPin || !/^\d{4}$/.test(String(newPin))) {
      return jsonResponse({ error: "PIN must be exactly 4 digits" }, 400);
    }
    if (action !== "set" && action !== "change") {
      return jsonResponse({ error: "Unknown action" }, 400);
    }

    const { identity, error, status } = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );
    if (error) return jsonResponse({ error }, status ?? 400);
    if (!identity) return jsonResponse({ error: "User not found" }, 404);

    const table =
      identity.userType === "reseller"
        ? "global_reseller_applications"
        : "global_customers";
    const rowId =
      identity.userType === "reseller" ? identity.resellerId : identity.customerId!;

    const { data: row } = await admin
      .from(table)
      .select("transaction_pin")
      .eq("id", rowId)
      .maybeSingle();

    if (!row) return jsonResponse({ error: "User not found" }, 404);

    if (row.transaction_pin) {
      // A PIN already exists: require and verify the current one.
      if (!oldPin || String(oldPin) !== String(row.transaction_pin)) {
        return jsonResponse({ error: "Current PIN is incorrect" }, 400);
      }
    }

    const { error: updateError } = await admin
      .from(table)
      .update({ transaction_pin: String(newPin) })
      .eq("id", rowId);

    if (updateError) {
      console.error("global-store-pin update error:", updateError);
      return jsonResponse({ error: "Failed to save PIN" }, 400);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("global-store-pin error:", error);
    return jsonResponse({ error: "PIN request failed" }, 400);
  }
});
