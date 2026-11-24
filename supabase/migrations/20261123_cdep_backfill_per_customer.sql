-- Replace the single aggregated BelovedTopup opening-balance ledger row with one
-- row per customer deposit, matching what credit_reseller_for_customer_deposit
-- writes for live deposits.
--
-- The ₦730 lump sum is the sum of three completed customer deposits' net amounts
-- (₦90 + ₦550 + ₦90). The reseller wallet is already correct at ₦820 and is NOT
-- touched here: this migration only rewrites the ledger presentation, so the
-- balance UPDATE from the original backfill must not be repeated.
--
-- Rows are keyed 'CDEP-<customer_tx_id>' — the same reference the live mirror
-- uses — so a late webhook replay for any of these deposits finds the row and
-- reports already_credited instead of crediting a second time.
--
-- Only rewrites when the deposits reconcile exactly to the lump sum. Anything
-- that does not reconcile is left as the lump row and reported, rather than
-- silently inventing a split.

DO $$
DECLARE
  r RECORD;
  v_dep RECORD;
  v_sum numeric;
  v_count int;
  v_written int;
BEGIN
  FOR r IN
    SELECT t.id, t.reseller_id, t.amount
    FROM public.global_transactions t
    WHERE t.reference LIKE 'CDEP-BACKFILL-%'
  LOOP
    SELECT COALESCE(SUM(ct.net_amount), 0), COUNT(*)
    INTO v_sum, v_count
    FROM public.global_customer_transactions ct
    WHERE ct.reseller_id = r.reseller_id
      AND ct.type = 'deposit'
      AND ct.status = 'completed';

    IF v_count = 0 OR v_sum <> r.amount THEN
      RAISE NOTICE 'skipping reseller %: deposits sum % (n=%) does not reconcile to lump %',
        r.reseller_id, v_sum, v_count, r.amount;
      CONTINUE;
    END IF;

    DELETE FROM public.global_transactions WHERE id = r.id;

    v_written := 0;
    FOR v_dep IN
      SELECT ct.id AS tx_id, ct.net_amount, ct.created_at,
             COALESCE(
               NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''),
               'Customer'
             ) AS customer_name
      FROM public.global_customer_transactions ct
      LEFT JOIN public.global_customers c ON c.id = ct.customer_id
      WHERE ct.reseller_id = r.reseller_id
        AND ct.type = 'deposit'
        AND ct.status = 'completed'
      ORDER BY ct.created_at
    LOOP
      INSERT INTO public.global_transactions (
        reseller_id, amount, type, status, reference, description, metadata, created_at
      ) VALUES (
        r.reseller_id, v_dep.net_amount, 'credit', 'completed',
        'CDEP-' || v_dep.tx_id::text,
        'Customer deposit - ' || v_dep.customer_name || ' (opening balance)',
        jsonb_build_object(
          'kind', 'customer_deposit_backfill',
          'customer_tx_id', v_dep.tx_id,
          'customer_name', v_dep.customer_name
        ),
        v_dep.created_at
      );
      v_written := v_written + 1;
    END LOOP;

    RAISE NOTICE 'reseller %: replaced lump % with % rows', r.reseller_id, r.amount, v_written;
  END LOOP;
END $$;
