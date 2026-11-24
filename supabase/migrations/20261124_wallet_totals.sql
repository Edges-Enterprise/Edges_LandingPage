-- 20261124_wallet_totals.sql
--
-- The wallet page rendered "Total Deposits", "Total Withdrawals" and "Total
-- Spent" by summing the 50 most recent rows of global_transactions that it
-- had already fetched for the history list. Once a store passes 50
-- transactions the older ones fall off the page and the totals silently
-- shrink: a store with 36 deposits shows 0.00 in Total Deposits, and one
-- with two payouts shows only the newer one.
--
-- The sums belong in the database, over the whole ledger. This function
-- returns them per reseller in one pass and is safe to call from the server
-- component.

CREATE OR REPLACE FUNCTION public.get_global_reseller_wallet_totals(
    p_reseller_id uuid
) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH tx AS (
    SELECT
      type,
      amount,
      status,
      reference,
      description,
      metadata,
      -- A purchase is booked as 'purchase', or as a debit carrying a PUR-
      -- reference. Classify once here so the three buckets cannot overlap.
      (
        type IN ('purchase', 'refund')
        OR coalesce(reference, '') LIKE 'PUR-%'
        OR coalesce(description, '') ILIKE '%purchase%'
      ) AS is_purchase,
      -- A granted bonus is a credit, but it is not a deposit: nobody paid
      -- it in. Counting it would overstate Total Deposits.
      (
        coalesce(reference, '') LIKE 'BONUS-%'
        OR metadata->>'kind' IN ('app_first_deposit', 'first_deposit')
      ) AS is_bonus
    FROM public.global_transactions
    WHERE reseller_id = p_reseller_id
      AND status = 'completed'
  )
  SELECT jsonb_build_object(
    'total_deposits', coalesce(sum(amount) FILTER (
      WHERE NOT is_purchase AND NOT is_bonus AND type IN ('credit', 'deposit')), 0),
    'total_withdrawals', coalesce(sum(amount) FILTER (
      WHERE NOT is_purchase AND NOT is_bonus AND type IN ('debit', 'withdrawal')), 0),
    'total_spent', coalesce(sum(amount) FILTER (WHERE is_purchase), 0),
    'transaction_count', count(*)
  )
  FROM tx;
$$;

COMMENT ON FUNCTION public.get_global_reseller_wallet_totals(uuid) IS
  'Whole-ledger deposit, withdrawal and spend totals for a reseller. Replaces summing a 50-row page of transactions, which under-reported once a store passed 50 rows.';

REVOKE ALL ON FUNCTION public.get_global_reseller_wallet_totals(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_reseller_wallet_totals(uuid) TO service_role;
