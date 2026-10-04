-- Task 4, branch 1.d.iii (global-purchase-data / global-purchase-airtime
-- edge functions). Two small, additive gaps found while mirroring the
-- proven purchase-data/purchase-airtime pattern against the global_*
-- schema — see HANDOVER.md Task 4 for full context.

-- 1. global_reseller_applications has no transaction_pin column at all
--    (unlike legacy's resellers.transaction_pin). The proven pattern
--    branches on caller identity (reseller self-purchase vs customer
--    purchase) and reads a PIN from whichever table matches; without
--    this column a reseller buying on their own global store has
--    nowhere to store/verify a PIN. Nullable, same as legacy's column -
--    a reseller who hasn't set one yet simply can't self-purchase until
--    they do, mirroring legacy's "No transaction PIN found" branch.
ALTER TABLE public.global_reseller_applications
  ADD COLUMN transaction_pin text;

-- 2. global_transactions' type check only allows 'credit'/'debit'.
--    Legacy's reseller_transactions.type includes 'purchase', used to
--    record the reseller-side ledger entry for every sale (both
--    reseller self-purchases and the cost-side movement from a
--    customer's purchase). Widening additively - existing 'credit'/
--    'debit' rows and any code keyed on those two values are
--    unaffected, this only permits a new value going forward.
ALTER TABLE public.global_transactions
  DROP CONSTRAINT global_transactions_type_check;

ALTER TABLE public.global_transactions
  ADD CONSTRAINT global_transactions_type_check
  CHECK ((type = ANY (ARRAY['credit'::text, 'debit'::text, 'purchase'::text, 'refund'::text])));
