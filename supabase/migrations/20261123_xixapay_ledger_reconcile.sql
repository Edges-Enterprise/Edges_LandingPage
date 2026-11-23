-- 20261123_xixapay_ledger_reconcile.sql
--
-- Make the Xixapay float read N820, and stop duplicate deliveries inflating it.
--
-- The ledger read N1,100. The owner confirms the real balance is N820, which is
-- exactly the sum of every deposit from BelovedTopup and its customers since
-- that store went live on 2026-11-19:
--
--     90 + 550 + 90 + 90 = 820
--
-- The N280 overstatement had two causes.
--
-- 1. Duplicate deliveries of one payment (N180).
--    Xixapay delivered the same N100 payment three times on 2026-11-20, each
--    with a DIFFERENT transaction_id but an identical payload timestamp
--    (16:56:05.339212Z), amount and sender. The ledger's unique constraint is
--    on transaction_id, so it could not catch this: three N90 rows were
--    recorded, one real and two phantom.
--
-- 2. A pre-go-live residual (N100).
--    BACKFILL_INITIAL_2026_07_29 (+900, manual opening balance) and
--    SWP-1785330649828 (-800, a completed July sweep) net to +100. That money
--    predates go-live, so it is not part of the float the owner is accounting
--    for.
--
-- Both July rows are LEFT IN PLACE: they are history, and the owner asked to
-- keep everything older than the go-live transactions. Only the two duplicate
-- go-live rows are deleted, because they are not history — they are one payment
-- counted twice. The balance is scoped to go-live by redefining the view, so the
-- July residual no longer counts toward the sweepable figure while the rows stay
-- visible for audit.

-- ── 1. Delete only the two duplicate deliveries ─────────────────────────────
-- Keep the earliest row for that payment; drop the two later re-deliveries.
DELETE FROM public.xixapay_wallet_ledger
WHERE transaction_id IN (
  '7d4bc44aa1d3e53dc064d3737375850347329d652',
  '7d4bc44aa1d3e53dc064d3737375850347329d777'
);

-- ── 2. Scope the balance to the go-live day ─────────────────────────────────
-- BelovedTopup's first real payment landed on 2026-11-20. Every deposit from
-- ANY reseller and any reseller customer from that day onward counts toward the
-- float; the ledger is not per-store. Rows before that day (the July manual
-- backfill and its sweep) stay in the table for audit but do not count.
CREATE OR REPLACE VIEW public.xixapay_wallet_balance AS
SELECT COALESCE(
         sum(
           CASE
             WHEN type = 'deposit' THEN amount
             ELSE -amount
           END
         ),
         0::numeric
       ) AS balance
FROM public.xixapay_wallet_ledger
WHERE created_at >= TIMESTAMPTZ '2026-11-20 00:00:00+00';

-- ── 3. Stop the duplicate-delivery class of bug recurring ───────────────────
-- Xixapay may re-deliver a payment under a fresh transaction_id, so
-- transaction_id alone is not a safe idempotency key. A payment is identified
-- by when it happened, who sent it and how much — the triple that was identical
-- across the three phantom rows. A re-delivery now fails the insert instead of
-- silently inflating the balance, and the webhook logs the failure.
--
-- The webhook's `upsert(..., { onConflict: "transaction_id" })` still works:
-- this index is additional, and a re-delivery is rejected by it as a unique
-- violation, which the webhook already catches and logs.
CREATE UNIQUE INDEX IF NOT EXISTS xixapay_wallet_ledger_one_per_payment
  ON public.xixapay_wallet_ledger (
    ((raw_payload ->> 'timestamp')),
    ((raw_payload -> 'sender' ->> 'account_number')),
    amount
  )
  WHERE type = 'deposit';
