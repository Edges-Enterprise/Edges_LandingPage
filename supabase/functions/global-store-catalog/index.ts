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
import { uniqueSorted } from "../_shared/storeCatalog.ts";
import {
  loadStoreContext,
  pricePlan,
  priceRangePlan,
  PriceUnavailableError,
} from "../_shared/currency/storePrice.ts";

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
  /** The store's currency. Every price in a store is in this currency. */
  currency: string;
  validity?: string;
  data_amount?: string;
  /** Phase 2: the country the topup is delivered to. */
  country_code?: string;
  /** Phase 2: FIXED (a set plan) or RANGE (the buyer chooses the amount). */
  price_type: "FIXED" | "RANGE";
  /** For RANGE offers, the allowed amounts in the send currency. */
  range_min?: number;
  range_max?: number;
  /** The step a RANGE amount must land on, so the client's stepper matches. */
  range_increment?: number;
  /** What the recipient receives, for FIXED offers. */
  send_value?: number;
  send_currency?: string;
}

const EMPTY = { plans: [], networks: [], categories: [], store: null };

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
      .select("id, country_code, store_name, email")
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

    // 3. Base plans for those ids. Phase 2: NOT scoped to the store's own
    //    country. A reseller sells any country Zendit covers, so the catalog
    //    is every enabled plan; the country filter is the customer's to make.
    //    (Was scopeToCountry(...) — that was the 24-country restriction.)
    let query = admin
      .from("global_base_plans")
      .select(
        "id, provider, provider_plan_id, country_code, network, name, description, category, data_amount, validity, base_price, currency, is_active, price_type, range_min, range_max, range_increment, send_value, send_currency",
      )
      .in("id", configs.map((c) => c.plan_id))
      .eq("is_active", true)
      .order("country_code", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (category) query = query.eq("category", category);

    const { data: basePlans, error: plansError } = await query;

    if (plansError) {
      console.error("global-store-catalog plans error:", plansError);
      return json({ error: "Failed to load catalog" }, 500);
    }

    const country = (reseller.country_code || "").toLowerCase();
    const available = basePlans || [];

    if (available.length === 0) {
      return json(EMPTY);
    }

    // 4. Load the store's currency and rate once, then price every plan
    //    through the one pipeline the purchase flow also uses.
    let storeContext, platformMarkups;
    try {
      const loaded = await loadStoreContext(admin, { countryCode: country });
      storeContext = loaded.context;
      platformMarkups = loaded.platformMarkups;
    } catch (error) {
      if (error instanceof PriceUnavailableError) {
        console.error("global-store-catalog pricing unavailable:", error.message);
        return json({ error: "Store pricing unavailable" }, 503);
      }
      throw error;
    }

    const configById = new Map(configs.map((c) => [c.plan_id, c]));

    const plans: CatalogPlan[] = available.map((p) => {
      const cfg = configById.get(p.id);
      // A RANGE offer has no single price — the customer chooses the amount.
      // The tile shows the price of the MINIMUM amount ("from X"), priced
      // through the same pipeline as the purchase, so the number shown and
      // the number charged cannot disagree.
      const isRange = (p.price_type ?? "FIXED").toUpperCase() === "RANGE";
      const priced = isRange && p.range_min != null
        ? priceRangePlan(p as never, cfg as never, storeContext, platformMarkups, Number(p.range_min))
        : pricePlan(p as never, cfg as never, storeContext, platformMarkups);

      return {
        id: p.id,
        plan_id: p.provider_plan_id,
        name: p.name,
        description: p.description ?? undefined,
        category: p.category,
        network: (p.network && p.network.trim()) || p.provider || undefined,
        price: priced.customerPriceDecimal,
        currency: priced.storeCurrency,
        validity: p.validity ?? undefined,
        data_amount: p.data_amount ?? undefined,
        country_code: p.country_code ?? undefined,
        price_type: priced.priceType,
        range_min: priced.rangeMin ?? undefined,
        range_max: priced.rangeMax ?? undefined,
        range_increment: priced.rangeIncrement ?? undefined,
        send_value: priced.sendValue ?? undefined,
        send_currency: priced.sendCurrency ?? undefined,
      };
    });

    return json({
      plans,
      networks: uniqueSorted(plans.map((p) => p.network)),
      categories: uniqueSorted(plans.map((p) => p.category)),
      // Phase 2: the destinations present in this catalog, so the storefront
      // can offer a country filter without hardcoding a list.
      countries: uniqueSorted(plans.map((p) => p.country_code)),
      // Public store identity for presentation (storefront header, legal
      // copy). No customer data, so it is safe on this anonymous endpoint.
      store: {
        id: reseller.id,
        name: reseller.store_name,
        email: reseller.email ?? null,
        country_code: reseller.country_code,
        // The store's currency, so the storefront formats every price in it.
        currency: storeContext.currency,
      },
    });
  } catch (error) {
    console.error("global-store-catalog error:", error);
    return json({ error: "Catalog request failed" }, 400);
  }
});
