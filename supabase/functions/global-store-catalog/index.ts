// supabase/functions/global-store-catalog/index.ts
//
// Task 8, pointer 8.a.iii.zo.x. Option B read layer: the customer
// storefront catalog for the mobile app, served from the global_* tables.
//
// Why a function and not a direct Supabase read: the app holds only the
// publishable (anon) key, and every SELECT policy on
// global_reseller_plan_configs / global_base_plans is scoped to the
// reseller owner (auth.uid() IN (SELECT ... FROM global_reseller_applications)),
// so a customer session reads nothing. Rather than open those tables to
// customers with new RLS policies (Option A), the catalog is served here
// with the service-role client - the same choice the web storefront makes
// via createAdminClient() in src/lib/storefront/getStoreCatalog.ts.
//
// Column discipline: the response carries ONLY storefront fields. It never
// returns base_price, markup_value, markup_type or selling_price, so a
// customer cannot read the reseller's wholesale cost or markup. That is
// the reason for a column-limited function rather than exposing the tables
// (or a broad view) to customers.
//
// Country scoping is derived from the reseller's own
// global_reseller_applications.country_code, never from a caller-supplied
// value, so a caller cannot request another country's catalog. Mirrors
// registerCustomerToGlobalReseller's "resolve from the reseller's own
// country" reasoning. The comparison is case-insensitive because the two
// tables' country_code values are written by different paths.
//
// Pricing mirrors _shared/purchaseOrchestrator.ts (steps 2-4) exactly:
// selling_price when set, otherwise the markup recomputed from base_price.
// The storefront and the purchase flow must always agree on the amount.
//
// Strict opt-in: a base plan with no enabled config row is NOT returned.
// An empty result means the store has no active plans.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  computeStorePrice,
  scopeToCountry,
  uniqueSorted,
} from "../_shared/storeCatalog.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CatalogPlan {
  id: string;
  /** global_base_plans.provider_plan_id - the id the purchase functions expect. */
  plan_id: string;
  name: string;
  description?: string;
  category: string;
  network?: string;
  price: number;
  validity?: string;
  data_amount?: string;
}

const EMPTY = { plans: [], networks: [], categories: [] };

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
    const { resellerId, category } = await req.json();

    if (!resellerId) {
      return json({ error: "Missing required field: resellerId" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Resolve the store + its country. The country comes from the
    //    reseller's own row, never from the caller.
    const { data: reseller, error: resellerError } = await admin
      .from("global_reseller_applications")
      .select("id, country_code")
      .eq("id", resellerId)
      .eq("application_status", "active")
      .maybeSingle();

    if (resellerError || !reseller) {
      return json(EMPTY);
    }

    // 2. This reseller's enabled plan configs (strict opt-in).
    const { data: configs, error: configError } = await admin
      .from("global_reseller_plan_configs")
      .select("plan_id, markup_type, markup_value, selling_price")
      .eq("reseller_id", resellerId)
      .eq("enabled", true);

    if (configError) {
      console.error("global-store-catalog config error:", configError);
      return json({ error: "Failed to load catalog" }, 500);
    }
    if (!configs || configs.length === 0) {
      return json(EMPTY);
    }

    // 3. Base plans for those ids. country_code is filtered in JS
    //    (case-insensitively) rather than in SQL because the two tables'
    //    values are written by different paths and their casing is not
    //    guaranteed to match.
    let query = admin
      .from("global_base_plans")
      .select(
        "id, provider, provider_plan_id, country_code, network, name, description, category, data_amount, validity, base_price, currency, is_active",
      )
      .in("id", configs.map((c) => c.plan_id))
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (category) query = query.eq("category", category);

    const { data: basePlans, error: plansError } = await query;

    if (plansError) {
      console.error("global-store-catalog plans error:", plansError);
      return json({ error: "Failed to load catalog" }, 500);
    }

    const country = (reseller.country_code || "").toLowerCase();
    const scoped = scopeToCountry(basePlans || [], country);

    if (scoped.length === 0) {
      return json(EMPTY);
    }

    const configById = new Map(configs.map((c) => [c.plan_id, c]));

    const plans: CatalogPlan[] = scoped.map((p) => {
      const cfg = configById.get(p.id);

      return {
        id: p.id,
        plan_id: p.provider_plan_id,
        name: p.name,
        description: p.description ?? undefined,
        category: p.category,
        network: (p.network && p.network.trim()) || p.provider || undefined,
        price: computeStorePrice(Number(p.base_price), cfg),
        validity: p.validity ?? undefined,
        data_amount: p.data_amount ?? undefined,
      };
    });

    return json({
      plans,
      networks: uniqueSorted(plans.map((p) => p.network)),
      categories: uniqueSorted(plans.map((p) => p.category)),
    });
  } catch (error) {
    console.error("global-store-catalog error:", error);
    return json({ error: "Catalog request failed" }, 400);
  }
});
