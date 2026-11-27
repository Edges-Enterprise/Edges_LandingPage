// supabase/functions/lizzy-catalog-sync/index.ts
//
// Keeps the two Nigeria catalogue tables in step with Lizzysub:
//
//   lizzy           — every plan we can sell, priced at cost + buffer
//   lizzy_flashsale — the same plans, with the campaign price at cost
//
// Scheduled by pg_cron (run_scheduled_edge) and safe to run by hand. It is
// idempotent: the same catalogue produces the same rows.
//
// The rules, in the order they matter:
//
//   * Upsert on plan_id / planid. Lizzysub plan ids are unique across networks
//     and types, which is what makes them the natural key.
//   * plan_amount and newprice track the wholesale cost exactly, so the
//     generated cost_price columns follow. sell_price and amount are cost plus
//     the network's buffer, and are never lowered: a plan already on sale
//     keeps its price when the cost drops, so the margin survives.
//   * The flash sale selection is never reset. isflashsale is only seeded for
//     rows the sync creates (SME, the campaign's current rule); an operator's
//     decision to switch a plan on or off is preserved. Stock is preserved for
//     existing rows and simulated for new ones.
//   * Pruning is guarded. If the crawl returns fewer than half the plans we
//     already hold, nothing is deleted — a partial Lizzysub response must not
//     empty the shop.
//   * A delisted plan that was sold cannot be deleted (flashsale_purchases has
//     a foreign key to planid), so it is deactivated instead.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  fetchLizzysubPlans,
  loginLizzysub,
} from "../_shared/catalog/lizzysubClient.ts";
import { parseValidity } from "../_shared/catalog/lizzysubCatalog.ts";

const NETWORK_IDS: Record<string, string> = {
  MTN: "1",
  AIRTEL: "2",
  GLO: "3",
  "9MOBILE": "4",
};

/**
 * Shelf buffer over the Lizzysub cost, per network and plan type. These are
 * the medians already on the shelf; a sync must not reprice the shop.
 */
const MARKUP: Record<string, number> = {
  "MTN/SME": 50,
  "MTN/GIFTING": 22,
  "MTN/COOPERATE GIFTING": 22.5,
  "AIRTEL/SME": 15,
  "AIRTEL/GIFTING": 50,
  "AIRTEL/COOPERATE GIFTING": 40,
  "GLO/SME": 35,
  "GLO/GIFTING": 20,
  "GLO/COOPERATE GIFTING": 0,
  "9MOBILE/SME": 50,
  "9MOBILE/GIFTING": 7.5,
  "9MOBILE/COOPERATE GIFTING": 10,
};
const DEFAULT_MARKUP = 25;

/** The "was" price on the flash sale card. */
const ANCHOR_MULTIPLIER = 1.3;
const ANCHOR_STEP = 50;

/**
 * Plans Lizzysub lists that we must not sell. 242 is 1MB for ₦50,000. Provider
 * test plans are caught by pattern rather than by id, so a new one cannot slip
 * through.
 */
const EXCLUDED_PLAN_IDS = new Set([242]);
const TEST_PLAN_PATTERN = /warning|don'?t\s+buy|\btest(?:ing)?\b/i;

const CHUNK = 500;

interface Summary {
  plansSeen: number;
  plansSkipped: number;
  lizzyUpserted: number;
  lizzyRemoved: number;
  flashUpserted: number;
  flashRemoved: number;
  flashDeactivated: number;
  errors: string[];
}

interface ExistingFlashRow {
  planid: number;
  isflashsale: boolean | null;
  stock_available: number | null;
  stock_sold: number | null;
  flashname: string | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "6.01GB GIFTING = ₦1,860.00 ..." -> "6.01GB", or "1.0GB" for lizzy. */
function sizeOf(name: string, withDecimal: boolean): string {
  const match = name.match(/^\s*([\d.]+)\s*(GB|TB|MB)\b/i);
  if (!match) return name.trim().slice(0, 32);
  const unit = match[2].toUpperCase();
  let text = String(Number(Number(match[1]).toFixed(2)));
  if (withDecimal && unit !== "MB" && !text.includes(".")) text += ".0";
  return `${text}${unit}`;
}

function validityOf(name: string): string {
  const { label } = parseValidity(name);
  if (!label) return "30 Days";
  return label
    .replace(
      /\b(days?|months?|weeks?|years?|hours?)\b/gi,
      (word) => word[0].toUpperCase() + word.slice(1),
    )
    .replace(/^./, (char) => char.toUpperCase());
}

function anchorOf(sell: number): number {
  return Math.ceil((sell * ANCHOR_MULTIPLIER) / ANCHOR_STEP) * ANCHOR_STEP;
}

function markupFor(network: string, planType: string): number {
  return MARKUP[`${network}/${planType}`] ?? DEFAULT_MARKUP;
}

function emptySummary(): Summary {
  return {
    plansSeen: 0,
    plansSkipped: 0,
    lizzyUpserted: 0,
    lizzyRemoved: 0,
    flashUpserted: 0,
    flashRemoved: 0,
    flashDeactivated: 0,
    errors: [],
  };
}

async function upsertChunked(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  onError: (message: string) => void,
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) onError(`${table} upsert failed (${chunk.length} rows): ${error.message}`);
    else written += chunk.length;
  }
  return written;
}

async function syncCatalog(
  supabase: SupabaseClient,
): Promise<Summary & { runId?: string }> {
  const summary = emptySummary();
  const { data: run } = await supabase
    .from("lizzy_catalog_syncs")
    .insert({ status: "running" })
    .select("id")
    .single();
  const runId = run?.id as string | undefined;

  try {
    const token = await loginLizzysub();
    const plans = await fetchLizzysubPlans(token);
    summary.plansSeen = plans.length;

    const usable = plans.filter((plan) => {
      const id = Number(plan.plan_id);
      const keep =
        Number.isInteger(id) &&
        id > 0 &&
        !EXCLUDED_PLAN_IDS.has(id) &&
        !TEST_PLAN_PATTERN.test(plan.name) &&
        Number(plan.amount) > 0 &&
        NETWORK_IDS[plan.network] !== undefined;
      if (!keep) {
        summary.plansSkipped++;
        if (NETWORK_IDS[plan.network] === undefined) {
          summary.errors.push(`unknown network "${plan.network}" on plan ${id}`);
        }
      }
      return keep;
    });

    const { data: existingLizzy, error: lizzyReadError } = await supabase
      .from("lizzy")
      .select("plan_id,sell_price");
    if (lizzyReadError) throw new Error(`read lizzy: ${lizzyReadError.message}`);

    const { data: existingFlash, error: flashReadError } = await supabase
      .from("lizzy_flashsale")
      .select("planid,isflashsale,stock_available,stock_sold,flashname");
    if (flashReadError) {
      throw new Error(`read lizzy_flashsale: ${flashReadError.message}`);
    }

    const sellByPlan = new Map<number, number>(
      (existingLizzy ?? []).map((row: { plan_id: number; sell_price: string }) => [
        Number(row.plan_id),
        Number(row.sell_price ?? 0),
      ]),
    );
    const flashByPlan = new Map<number, ExistingFlashRow>(
      ((existingFlash ?? []) as ExistingFlashRow[]).map((row) => [
        Number(row.planid),
        row,
      ]),
    );

    const lizzyRows: Record<string, unknown>[] = [];
    const flashRows: Record<string, unknown>[] = [];

    for (const plan of usable) {
      const id = Number(plan.plan_id);
      const cost = round2(Number(plan.amount));
      const shelf = Math.max(
        sellByPlan.get(id) ?? 0,
        round2(cost + markupFor(plan.network, plan.plan_type)),
      );
      const validity = validityOf(plan.name);
      const anchor = anchorOf(shelf);

      lizzyRows.push({
        plan_id: id,
        network: plan.network,
        plan_type: plan.plan_type,
        plan_network: NETWORK_IDS[plan.network],
        validity,
        plan: sizeOf(plan.name, true),
        plan_amount: cost,
        sell_price: shelf,
      });

      const previous = flashByPlan.get(id);
      const stockAvailable = previous?.stock_available ?? 10 + (id % 11);
      flashRows.push({
        planid: id,
        network: plan.network,
        plantype: plan.plan_type,
        planname: sizeOf(plan.name, false),
        amount: shelf,
        validate: validity,
        flashname: previous?.flashname ?? null,
        oldprice: anchor,
        newprice: cost,
        isflashsale: previous
          ? (previous.isflashsale ?? false)
          : plan.plan_type === "SME",
        stock_available: stockAvailable,
        stock_sold: previous?.stock_sold ?? (id * 7) % stockAvailable,
        discount_percentage: `${Math.round(((anchor - cost) / anchor) * 100)}%`,
      });
    }

    summary.lizzyUpserted = await upsertChunked(
      supabase,
      "lizzy",
      lizzyRows,
      "plan_id",
      (message) => summary.errors.push(message),
    );
    summary.flashUpserted = await upsertChunked(
      supabase,
      "lizzy_flashsale",
      flashRows,
      "planid",
      (message) => summary.errors.push(message),
    );

    const storedLizzy = (existingLizzy ?? []).length;
    if (usable.length === 0 || (storedLizzy > 0 && usable.length < storedLizzy * 0.5)) {
      summary.errors.push(
        `refusing to prune: crawl returned ${usable.length} plans against ${storedLizzy} stored`,
      );
    } else {
      const keep = new Set(lizzyRows.map((row) => row.plan_id as number));

      const staleLizzy = (existingLizzy ?? [])
        .map((row: { plan_id: number }) => Number(row.plan_id))
        .filter((id) => !keep.has(id));
      for (let i = 0; i < staleLizzy.length; i += CHUNK) {
        const chunk = staleLizzy.slice(i, i + CHUNK);
        const { error } = await supabase.from("lizzy").delete().in("plan_id", chunk);
        if (error) summary.errors.push(`lizzy prune failed: ${error.message}`);
        else summary.lizzyRemoved += chunk.length;
      }

      const staleFlash = (existingFlash ?? [])
        .map((row: { planid: number }) => Number(row.planid))
        .filter((id) => !keep.has(id));

      const { data: purchased } = await supabase
        .from("flashsale_purchases")
        .select("planid");
      const purchasedIds = new Set(
        (purchased ?? []).map((row: { planid: number }) => Number(row.planid)),
      );

      const deletable = staleFlash.filter((id) => !purchasedIds.has(id));
      const deactivate = staleFlash.filter((id) => purchasedIds.has(id));

      for (let i = 0; i < deletable.length; i += CHUNK) {
        const chunk = deletable.slice(i, i + CHUNK);
        const { error } = await supabase
          .from("lizzy_flashsale")
          .delete()
          .in("planid", chunk);
        if (error) summary.errors.push(`flash prune failed: ${error.message}`);
        else summary.flashRemoved += chunk.length;
      }

      if (deactivate.length > 0) {
        const { error } = await supabase
          .from("lizzy_flashsale")
          .update({ isflashsale: false })
          .in("planid", deactivate);
        if (error) summary.errors.push(`flash deactivate failed: ${error.message}`);
        else summary.flashDeactivated = deactivate.length;
      }
    }

    await supabase
      .from("lizzy_catalog_syncs")
      .update({
        finished_at: new Date().toISOString(),
        status: summary.errors.length > 0 ? "partial" : "ok",
        plans_seen: summary.plansSeen,
        plans_skipped: summary.plansSkipped,
        lizzy_upserted: summary.lizzyUpserted,
        lizzy_removed: summary.lizzyRemoved,
        flash_upserted: summary.flashUpserted,
        flash_removed: summary.flashRemoved,
        flash_deactivated: summary.flashDeactivated,
        errors: summary.errors.slice(0, 100),
      })
      .eq("id", runId);

    return { ...summary, runId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summary.errors.push(message);
    if (runId) {
      await supabase
        .from("lizzy_catalog_syncs")
        .update({
          finished_at: new Date().toISOString(),
          status: "failed",
          errors: summary.errors.slice(0, 100),
        })
        .eq("id", runId);
    }
    return { ...summary, runId };
  }
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

  const summary = await syncCatalog(supabase);
  const failed = summary.errors.length > 0 && summary.lizzyUpserted === 0;

  return new Response(JSON.stringify({ ok: !failed, ...summary }), {
    status: failed ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
});
