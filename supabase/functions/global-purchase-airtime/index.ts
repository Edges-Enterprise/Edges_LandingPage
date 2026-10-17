// supabase/functions/global-purchase-airtime/index.ts
//
// Task 4, branch 1.d.iii. Multi-country equivalent of the proven
// purchase-airtime edge function, built against global_* tables via
// _shared/purchaseOrchestrator.ts. See that file and
// _shared/providers.ts for the actual logic and the sync/async
// distinction between providers - this file is intentionally thin.
//
// Note: airtime (as opposed to data bundles) has no AccraGH equivalent
// at all - NetFillGh's API is data-bundle-only. A base plan with
// category "airtime" and provider "accragh" should not exist in the
// catalog; if one somehow does, this will still attempt the call and
// get a provider-side rejection, not a special-cased block here (see
// providers.ts's header comment).
import { createClient } from "npm:@supabase/supabase-js@2";
import { processPurchase } from "../_shared/purchaseOrchestrator.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { resellerId, planId, phoneNumber, transactionPin, userId } =
      await req.json();

    if (!resellerId || !planId || !phoneNumber || !transactionPin || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const result = await processPurchase(supabaseAdmin, "airtime", {
      resellerId,
      providerPlanId: planId,
      phoneNumber,
      transactionPin,
      userId,
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("global-purchase-airtime error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Purchase failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
