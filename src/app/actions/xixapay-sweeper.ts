"use server";

// src/app/actions/xixapay-sweeper.ts
//
// Platform-admin sweeper: move the Xixapay float to a bank account.
//
// Xixapay exposes NO balance endpoint (verified live — every /balance path
// returns 404 HTML while `api/get/banks` returns 200 with the same keys), so
// the balance here is derived from `xixapay_wallet_ledger` via the
// `xixapay_wallet_balance` view. The webhook writes a `deposit` row per
// successful payment and a `sweep` row per payout, so the view is the source of
// truth for what should be sitting in the Xixapay account.
//
// The sweeper is platform-wide, not per-country: there is one Xixapay business
// account serving every storefront, so `countryCode` is context for the admin,
// not a filter on the money.
//
// Every action re-checks the admin gate — the page's gate is not a substitute.

import { revalidatePath } from "next/cache";
import { getPlatformAdmin } from "@/lib/admin/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { xixapay } from "@/lib/payments/xixapay";

/** Smallest sweep we will send. Below this the transfer is not worth the fee. */
const MIN_SWEEP = 500;

/**
 * Start of the period the sweeper accounts for: the day the first real payment
 * reached the Xixapay account. Every reseller and reseller-customer deposit from
 * this day onward counts, not just the first store's.
 *
 * It mirrors the cutoff in the `xixapay_wallet_balance` view — if the two drift
 * apart the page's breakdown stops adding up to the balance beside it, so
 * change both together.
 */
const LEDGER_EPOCH = "2026-11-20T00:00:00.000Z";

export interface SweepLogRow {
  id: string;
  balance_before: number | null;
  sweep_amount: number | null;
  status: string;
  reference: string | null;
  target_account: string | null;
  target_bank: string | null;
  error: string | null;
  timestamp: string;
}

export interface SweeperState {
  balance: number;
  ledgerDeposits: number;
  ledgerSweeps: number;
  minSweep: number;
  history: SweepLogRow[];
}

type Ok<T> = { success: true } & T;
type Err = { success: false; error: string };
type Result<T> = Ok<T> | Err;

async function requireAdmin(): Promise<boolean> {
  return (await getPlatformAdmin()) !== null;
}

/**
 * `PaymentGateway` declares these as optional because not every provider
 * implements them. Xixapay does, but narrowing keeps the compiler honest and
 * turns a future regression into a clear error rather than a runtime crash.
 *
 * The narrowed functions are returned rather than checked in place, because a
 * `typeof` guard does not narrow across a helper boundary.
 */
function xixapayCapabilities():
  | { error: string }
  | {
      verify: NonNullable<typeof xixapay.verifyBankAccount>;
      payout: NonNullable<typeof xixapay.processPayout>;
    } {
  const verify = xixapay.verifyBankAccount;
  const payout = xixapay.processPayout;

  if (typeof verify !== "function") {
    return { error: "Xixapay account verification is unavailable" };
  }
  if (typeof payout !== "function") {
    return { error: "Xixapay payouts are unavailable" };
  }
  return { verify, payout };
}

/**
 * A `pending` row older than this is treated as abandoned and cleared. A
 * sweep is a single transfer, so ten minutes is far longer than a live request
 * needs, and short enough that a crashed run does not lock the sweeper out.
 */
const STALE_CLAIM_MINUTES = 10;

/**
 * Clear claims left `pending` by a request that died mid-transfer.
 *
 * These are marked `failed` rather than deleted: the row still says a sweep was
 * attempted, and the admin needs to know the outcome was never confirmed. The
 * balance was not touched, so the funds remain sweepable.
 */
async function releaseStaleSweeps(
  admin: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const cutoff = new Date(
    Date.now() - STALE_CLAIM_MINUTES * 60_000,
  ).toISOString();

  const { error } = await admin
    .from("xixapay_sweep_logs")
    .update({
      status: "failed",
      error:
        "Sweep was interrupted before its outcome was confirmed. Check the Xixapay dashboard before retrying.",
    })
    .eq("status", "pending")
    .lt("timestamp", cutoff);

  if (error) {
    console.error("sweeper: could not release stale claims", error.message);
  }
}

/** Balance and history for the sweeper page. */
export async function getSweeperState(): Promise<Result<SweeperState>> {
  if (!(await requireAdmin())) return { success: false, error: "Not found" };

  const admin = createAdminClient();

  const { data: balanceRow, error: balanceError } = await admin
    .from("xixapay_wallet_balance")
    .select("balance")
    .single();

  if (balanceError) {
    console.error("sweeper: balance read failed", balanceError.message);
    return { success: false, error: "Could not read the Xixapay balance" };
  }

  // Breakdown for the page. Scoped to the same go-live cutoff as the view, or
  // the totals would not reconcile with the balance shown above them.
  const { data: ledger } = await admin
    .from("xixapay_wallet_ledger")
    .select("type, amount")
    .gte("created_at", LEDGER_EPOCH);

  let deposits = 0;
  let sweeps = 0;
  for (const row of ledger ?? []) {
    const amount = Number(row.amount) || 0;
    if (row.type === "deposit") deposits += amount;
    else if (row.type === "sweep") sweeps += amount;
  }

  const { data: history } = await admin
    .from("xixapay_sweep_logs")
    .select(
      "id, balance_before, sweep_amount, status, reference, target_account, target_bank, error, timestamp",
    )
    .order("timestamp", { ascending: false })
    .limit(20);

  return {
    success: true,
    balance: Number(balanceRow?.balance ?? 0),
    ledgerDeposits: deposits,
    ledgerSweeps: sweeps,
    minSweep: MIN_SWEEP,
    history: (history ?? []) as SweepLogRow[],
  };
}

/** Banks a sweep can be sent to, as Xixapay reports them. */
export async function listSweepBanks(): Promise<
  Result<{ banks: Array<{ bankName: string; bankCode: string }> }>
> {
  if (!(await requireAdmin())) return { success: false, error: "Not found" };

  if (typeof xixapay.getBanks !== "function") {
    return { success: false, error: "Bank list is unavailable" };
  }

  const banks = await xixapay.getBanks();
  return { success: true, banks };
}

/**
 * Resolve an account name before the admin commits to a payout.
 *
 * Separate from `requestSweep` so a typo is caught while the admin is still
 * looking at the form, rather than after the money has left.
 */
export async function resolveSweepBank(
  bankCode: string,
  accountNumber: string,
): Promise<Result<{ accountName: string }>> {
  if (!(await requireAdmin())) return { success: false, error: "Not found" };

  const bank = (bankCode ?? "").trim();
  const account = (accountNumber ?? "").trim();

  if (!bank) return { success: false, error: "Choose a bank" };
  if (!/^\d{6,}$/.test(account)) {
    return { success: false, error: "Enter a valid account number" };
  }

  const caps = xixapayCapabilities();
  if ("error" in caps) return { success: false, error: caps.error };

  const resolved = await caps.verify(bank, account);
  if (!resolved.success || !resolved.accountName) {
    return {
      success: false,
      error: resolved.error || "Could not verify that account",
    };
  }

  return { success: true, accountName: resolved.accountName };
}

/**
 * Sweep the balance to a bank account.
 *
 * Ordering matters. The provider call happens BEFORE the ledger write, because
 * a `sweep` row records money that has actually left. If the write happened
 * first and the transfer then failed, the ledger would understate the balance
 * and hide real float.
 *
 * The reverse risk — money sent but the ledger write fails — is the dangerous
 * one, so it is logged loudly and reported to the admin rather than silently
 * swallowed. A sweep log row is written in both cases.
 */
export async function requestSweep(params: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  countryCode: string;
}): Promise<Result<{ reference: string; amount: number }>> {
  if (!(await requireAdmin())) return { success: false, error: "Not found" };

  const admin = createAdminClient();
  const amount = Math.round(Number(params.amount) * 100) / 100;
  const bank = (params.bankCode ?? "").trim();
  const account = (params.accountNumber ?? "").trim();

  if (!bank) return { success: false, error: "Choose a bank" };
  if (!/^\d{6,}$/.test(account)) {
    return { success: false, error: "Enter a valid account number" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter an amount to sweep" };
  }
  if (amount < MIN_SWEEP) {
    return {
      success: false,
      error: `The minimum sweep is ₦${MIN_SWEEP.toLocaleString()}`,
    };
  }

  const { data: balanceRow, error: balanceError } = await admin
    .from("xixapay_wallet_balance")
    .select("balance")
    .single();

  if (balanceError) {
    console.error("sweeper: balance read failed", balanceError.message);
    return { success: false, error: "Could not read the Xixapay balance" };
  }

  const balance = Number(balanceRow?.balance ?? 0);
  if (amount > balance) {
    return {
      success: false,
      error: `Only ₦${balance.toLocaleString()} is available to sweep`,
    };
  }

  const reference = `SWP-${Date.now()}`;
  const narration = `Platform sweep ${params.countryCode?.toUpperCase() ?? ""}`.trim();

  const caps = xixapayCapabilities();
  if ("error" in caps) return { success: false, error: caps.error };

  // Re-verify immediately before sending: the name the admin saw could have
  // been typed into the form, and a payout to the wrong name is unrecoverable.
  const resolved = await caps.verify(bank, account);
  if (!resolved.success || !resolved.accountName) {
    return {
      success: false,
      error: resolved.error || "Could not verify that account",
    };
  }

  // Claim the single in-flight slot BEFORE the transfer. A partial unique index
  // on `status = 'pending'` (see the migration) means a second concurrent
  // sweep fails here instead of paying the same balance twice — which matters
  // because Xixapay cannot be asked for a balance to arbitrate afterwards.
  await releaseStaleSweeps(admin);

  const { data: claim, error: claimError } = await admin
    .from("xixapay_sweep_logs")
    .insert({
      balance_before: balance,
      sweep_amount: amount,
      threshold: MIN_SWEEP,
      reference,
      target_account: account,
      target_bank: resolved.accountName,
      status: "pending",
      error: null,
      min_sweep_amount: MIN_SWEEP,
    })
    .select("id")
    .single();

  if (claimError || !claim) {
    const conflict = claimError?.code === "23505";
    console.error("sweeper: could not claim sweep slot", claimError?.message);
    return {
      success: false,
      error: conflict
        ? "Another sweep is already in progress. Wait for it to finish, then refresh."
        : "Could not start the sweep. Please try again.",
    };
  }

  const claimId = claim.id as string;
  const settleClaim = async (
    status: "completed" | "failed",
    error: string | null,
  ) => {
    await admin
      .from("xixapay_sweep_logs")
      .update({ status, error })
      .eq("id", claimId);
  };

  let payout;
  try {
    payout = await caps.payout({
      resellerId: "platform-sweeper",
      amount,
      currency: "NGN",
      bankCode: bank,
      accountNumber: account,
      accountName: resolved.accountName,
      narration,
      reference,
    });
  } catch (err) {
    // Transport fault: the transfer may or may not have reached Xixapay. Do NOT
    // record a sweep (the money may not have moved) and do NOT let the admin
    // retry blindly — tell them to check the Xixapay dashboard first.
    console.error("sweeper: payout threw", err);
    await settleClaim(
      "failed",
      "Unknown outcome — the request may have reached Xixapay. Check the Xixapay dashboard before retrying.",
    );
    return {
      success: false,
      error:
        "The sweep outcome is unknown — check the Xixapay dashboard before retrying, so you do not sweep twice.",
    };
  }

  if (!payout.success) {
    // Xixapay refused it (`definitive: true`), so no money moved and the balance
    // is untouched. An ambiguous refusal is treated as unknown for the same
    // reason as the throw above.
    const ambiguous = payout.definitive === false;
    const message = ambiguous
      ? "Unknown outcome — the request may have reached Xixapay. Check the Xixapay dashboard before retrying."
      : payout.error || "Xixapay refused the sweep";
    await settleClaim("failed", message);
    return { success: false, error: message };
  }

  const { error: ledgerError } = await admin
    .from("xixapay_wallet_ledger")
    .insert({
      transaction_id: reference,
      type: "sweep",
      amount,
      raw_payload: {
        reference: payout.reference ?? reference,
        swept_at: new Date().toISOString(),
        target_account: account,
        target_bank: resolved.accountName,
        bank_code: bank,
      },
    });

  if (ledgerError) {
    // Money has left the Xixapay account but the ledger still shows it. Logging
    // this is the only safe option: the balance will read high until it is
    // corrected by hand.
    console.error(
      "sweeper: TRANSFER SUCCEEDED BUT LEDGER WRITE FAILED — balance now overstates by",
      amount,
      ledgerError.message,
    );
    await settleClaim(
      "completed",
      `Ledger write failed: ${ledgerError.message}. Balance overstates by ₦${amount}.`,
    );
    revalidatePath("/", "layout");
    return {
      success: false,
      error: `The sweep was sent but the ledger could not be updated, so the balance is now overstated. Contact an engineer. Reference: ${reference}`,
    };
  }

  await settleClaim("completed", null);

  revalidatePath("/", "layout");

  return { success: true, reference, amount };
}
