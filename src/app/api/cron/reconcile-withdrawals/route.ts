// src/app/api/cron/reconcile-withdrawals/route.ts
//
// Closes withdrawals left `pending` because the provider accepted the payout
// without settling it (Korapay returns `processing`, Flutterwave returns
// `NEW`/`PENDING`). Without this, those rows stay pending forever and the
// reseller's ledger never resolves.
//
// Auth: Vercel cron sends `Authorization: Bearer $CRON_SECRET`. The header is
// required whenever CRON_SECRET is set, so this endpoint cannot be triggered by
// the public.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileWithdrawal } from "@/lib/payments/withdrawalPayout";

// Pending payouts older than this are polled. Younger ones are left alone so a
// payout still settling at the provider is not hammered on every run.
const MIN_AGE_MINUTES = 2;
// Stop polling after this: the row needs a human, not another retry.
const MAX_AGE_HOURS = 72;
const BATCH_SIZE = 25;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Fail closed. This endpoint moves money, so a missing secret must not leave
  // it callable by anyone who guesses the path.
  if (!secret) {
    console.error("reconcile: CRON_SECRET is not set; refusing to run");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pending, error } = await admin
    .from("global_withdrawals")
    .select("id, reseller_id, reference, created_at")
    .eq("status", "pending")
    .lt(
      "created_at",
      new Date(Date.now() - MIN_AGE_MINUTES * 60_000).toISOString(),
    )
    .gt(
      "created_at",
      new Date(Date.now() - MAX_AGE_HOURS * 3_600_000).toISOString(),
    )
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error(
      "reconcile: could not load pending withdrawals",
      error.message,
    );
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!pending?.length) {
    return NextResponse.json({
      checked: 0,
      completed: 0,
      failed: 0,
      pending: 0,
    });
  }

  // The country decides which provider holds the payout, so it has to come from
  // the reseller rather than the withdrawal row.
  const resellerIds = [...new Set(pending.map((w) => w.reseller_id))];
  const { data: resellers } = await admin
    .from("global_reseller_applications")
    .select("id, country_code")
    .in("id", resellerIds);

  const countryById = new Map(
    (resellers ?? []).map((r) => [r.id, r.country_code as string]),
  );

  const tally = { checked: 0, completed: 0, failed: 0, pending: 0 };

  for (const withdrawal of pending) {
    const countryCode = countryById.get(withdrawal.reseller_id);
    if (!countryCode) {
      tally.pending++;
      continue;
    }

    tally.checked++;

    try {
      const outcome = await reconcileWithdrawal(withdrawal.id, countryCode);
      if (outcome.status === "completed") tally.completed++;
      else if (outcome.status === "failed") tally.failed++;
      else tally.pending++;
    } catch (err) {
      // One bad row must not stop the batch.
      console.error("reconcile: withdrawal failed", withdrawal.id, err);
      tally.pending++;
    }
  }

  return NextResponse.json(tally);
}
