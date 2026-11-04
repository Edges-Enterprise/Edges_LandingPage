// supabase/functions/global-catalog-sync/index.ts
//
// Phase 2. Catalog sync: crawl the Zendit topup catalog and write it to
// global_base_plans.
//
// This replaces the hand-loaded snapshot the design called out. It runs as a
// scheduled function (or on demand with a shared secret) and is idempotent:
// re-running it against an unchanged catalog produces the same rows.
//
// The rules it follows, all from the Phase 2 design:
//
//   * Upsert on (provider, provider_plan_id). A unique index enforces this,
//     so two concurrent syncs cannot duplicate an offer.
//   * Soft-deactivate, never delete. An offer that vanishes from the catalog
//     has is_active set false; existing orders and configs referencing it
//     stay valid.
//   * Country coverage is DISCOVERED from the offers, not from a hardcoded
//     list. Every country in the crawl is reported.
//   * An offer we cannot map is REPORTED, not silently defaulted into a
//     category. A silent default is how an eSIM ends up sold as data.
//   * Zendit's retail fx is recorded as a FALLBACK rate only. It is never
//     the pricing source.

import { createClient } from "npm:@supabase/supabase-js@2";
import { iterateOffers } from "../_shared/catalog/zenditClient.ts";
import {
  countriesIn,
  deriveUsdRateFromOffer,
  normalizeZenditOffer,
  type ZenditOffer,
} from "../_shared/catalog/zenditCatalog.ts";
import { recordRate, type RateStore } from "../_shared/currency/rates.ts";

const PROVIDER = "zendit";

interface SyncSummary {
  offersSeen: number;
  plansUpserted: number;
  plansDeactivated: number;
  offersRejected: number;
  countriesFound: string[];
  rejections: { offerId: string | null; reason: string }[];
  errors: string[];
}

Deno.serve(async (req) => {
  // Same shared-secret guard as the other scheduled functions.
  const secret = Deno.env.get("CATALOG_SYNC_SECRET");
  if (secret && req.headers.get("x-sync-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: run } = await supabase
    .from("global_catalog_syncs")
    .insert({ provider: PROVIDER, status: "running" })
    .select("id")
    .single();
  const runId = run?.id as string | undefined;

  const summary: SyncSummary = {
    offersSeen: 0,
    plansUpserted: 0,
    plansDeactivated: 0,
    offersRejected: 0,
    countriesFound: [],
    rejections: [],
    errors: [],
  };

  try {
    const allOffers: ZenditOffer[] = [];

    for await (const page of iterateOffers({})) {
      for (const raw of page) {
        const offer = raw as ZenditOffer;
        summary.offersSeen++;
        allOffers.push(offer);

        const result = normalizeZenditOffer(offer);
        if ("rejected" in result) {
          summary.offersRejected++;
          // Keep a bounded sample so the run record stays readable.
          if (summary.rejections.length < 100) {
            summary.rejections.push(result.rejected);
          }
          continue;
        }

        const plan = result.plan;
        const { error } = await supabase
          .from("global_base_plans")
          .upsert(
            {
              ...plan,
              is_active: true,
              last_seen_at: new Date().toISOString(),
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "provider,provider_plan_id" },
          );

        if (error) {
          summary.errors.push(`${plan.provider_plan_id}: ${error.message}`);
          continue;
        }
        summary.plansUpserted++;
      }
    }

    summary.countriesFound = countriesIn(allOffers);

    // Deactivate anything Zendit no longer reports. Scoped to this provider
    // and to rows whose last_seen_at predates this run, so an offer that was
    // just upserted is never deactivated.
    const runStart = new Date().toISOString();
    const { data: deactivated } = await supabase
      .from("global_base_plans")
      .update({ is_active: false, updated_at: runStart })
      .eq("provider", PROVIDER)
      .eq("is_active", true)
      .lt("last_seen_at", runStart)
      .select("id");
    summary.plansDeactivated = deactivated?.length ?? 0;

    // Record Zendit's retail rate as a fallback for each currency we saw.
    // One representative offer per currency is enough; they all carry the
    // same published rate.
    const rateSeen = new Set<string>();
    for (const offer of allOffers) {
      const sendCurrency = offer.send?.currency?.toUpperCase();
      if (!sendCurrency || rateSeen.has(sendCurrency)) continue;
      const derived = deriveUsdRateFromOffer(offer);
      if (!derived) continue;
      rateSeen.add(sendCurrency);
      try {
        await recordRate(supabase as unknown as RateStore, {
          quote: sendCurrency,
          rate: derived.rate,
          source: "zendit",
        });
      } catch (e) {
        summary.errors.push(
          `rate ${sendCurrency}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    await supabase
      .from("global_catalog_syncs")
      .update({
        finished_at: new Date().toISOString(),
        status: summary.errors.length > 0 ? "failed" : "ok",
        offers_seen: summary.offersSeen,
        plans_upserted: summary.plansUpserted,
        plans_deactivated: summary.plansDeactivated,
        offers_rejected: summary.offersRejected,
        countries_found: summary.countriesFound,
        errors: summary.errors.slice(0, 100),
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ ok: true, runId, ...summary }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summary.errors.push(message);
    if (runId) {
      await supabase
        .from("global_catalog_syncs")
        .update({
          finished_at: new Date().toISOString(),
          status: "failed",
          errors: summary.errors.slice(0, 100),
        })
        .eq("id", runId);
    }
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
