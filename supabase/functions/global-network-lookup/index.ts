// supabase/functions/global-network-lookup/index.ts
//
// Phase 2, build-order step 7. Phone-number detection for the storefront.
//
// The design's rule: ask the provider, do not guess from prefix tables. The
// storefront calls this with the recipient number the customer typed and
// gets back the country and carrier Zendit will actually deliver to, so the
// catalog can filter to the right country's plans. A prefix table is a copy
// of reality that drifts; this is the answer from the party doing the work.
//
// `_shared/catalog/detectNetwork.ts` does the work and falls back to a small
// local prefix map only when the lookup is unavailable — never silently, and
// the response's `method` says which happened so the UI can degrade.
import { detectNetwork } from "../_shared/catalog/detectNetwork.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return json({ error: "Missing required field: phoneNumber" }, 400);
    }

    const detection = await detectNetwork(phoneNumber);

    return json({
      country: detection.country,
      brand: detection.brand,
      // "lookup" (from Zendit), "prefix" (local fallback) or "unknown".
      method: detection.method,
      network: detection.network,
      // True when the answer came from the fallback rather than the provider,
      // so the caller can avoid caching it or offer a manual picker.
      fallback: detection.method === "prefix",
    });
  } catch (error) {
    console.error("global-network-lookup error:", error);
    return json({ error: "Lookup failed" }, 400);
  }
});
