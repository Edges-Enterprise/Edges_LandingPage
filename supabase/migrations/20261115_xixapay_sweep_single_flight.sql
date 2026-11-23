-- 20261115_xixapay_sweep_single_flight.sql
--
-- One in-flight Xixapay sweep at a time.
--
-- The sweeper reads its balance from `xixapay_wallet_ledger` (Xixapay exposes
-- no balance API), then sends a transfer, then writes the `sweep` row. Between
-- the read and the write two admins can both see the same balance and both
-- send it, and the provider cannot be asked to arbitrate afterwards.
--
-- The ledger row is only written after a successful transfer, so it cannot
-- reserve the funds on its own. `xixapay_sweep_logs` is written BEFORE the
-- transfer, so a `pending` row there is the reservation: this index makes a
-- second concurrent sweep fail instead of paying twice.
--
-- `pending` is the existing status for "not yet resolved" (the table's CHECK
-- allows pending/completed/failed), so this needs no constraint change.
--
-- A row left `pending` by a crashed request would block every later sweep, so
-- the application also treats a `pending` row older than 10 minutes as
-- abandoned and clears it before starting (see `releaseStaleSweeps`).

CREATE UNIQUE INDEX IF NOT EXISTS xixapay_sweep_logs_one_in_flight
  ON public.xixapay_sweep_logs ((status))
  WHERE status = 'pending';
