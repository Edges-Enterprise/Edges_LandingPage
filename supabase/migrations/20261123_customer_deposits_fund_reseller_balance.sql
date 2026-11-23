-- 20261123_customer_deposits_fund_reseller_balance.sql
--
-- Resellers hold their customers' money.
--
-- A store owner is the admin of their own store: customers are theirs, support
-- flows through them, and customer funds sit in the store's balance. So a
-- customer deposit credits BOTH the customer wallet and the reseller balance,
-- and a customer purchase settles in two parts:
--
--   customer wallet  -= selling_price
--   reseller balance -= cost_price      (the platform cost)
--
-- The difference (selling - cost) stays in the reseller balance as profit.
--
-- Why the settlement changes
-- --------------------------
-- The previous rule credited the reseller `selling_price - cost_price` at sale
-- time, because customer money never entered their balance. Now that deposits
-- mirror in, keeping that line would pay the reseller twice: once at deposit,
-- once at sale. Taking only the cost out is the single charge for the sale.
--
-- Float is the reseller's responsibility
-- --------------------------------------
-- balance includes customer float, and the reseller may withdraw all of it.
-- That is deliberate: they own the store and its customers. The dashboard shows
-- the float as information, not as a restriction. If a reseller withdraws more
-- than they should, their store cannot cover the platform cost and the customer
-- is told "Service temporarily unavailable. Please try again later." - which
-- purchaseOrchestrator already does on !funding.can_fund. No change needed there.
--
-- Bonus
-- -----
-- The first-deposit bonus is unchanged, per product decision. Its branch below
-- is byte-for-byte what it was in 20261116.

-- ---------------------------------------------------------------------------
-- Float owed: customer money the reseller is holding. Informational only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_reseller_float_owed(p_reseller_id uuid)
RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(SUM(balance), 0)
  FROM public.global_customer_wallets
  WHERE reseller_id = p_reseller_id
    AND status = 'active';
$$;

COMMENT ON FUNCTION public.get_reseller_float_owed(uuid)
  IS 'Customer money the reseller holds on behalf of their customers. Shown in the dashboard for information; it does NOT reduce the withdrawable amount, because the reseller is responsible for their own customers.';

-- ---------------------------------------------------------------------------
-- Settlement: the cost now comes OUT of the reseller balance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_global_purchase_deductions(
    p_customer_wallet_id uuid,
    p_customer_deduct numeric,
    p_reseller_id uuid,
    p_cost_price numeric,
    p_selling_price numeric,
    p_profit numeric
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_customer_balance NUMERIC;
  v_reseller_balance NUMERIC;
  v_reseller_bonus NUMERIC;
  v_from_bonus NUMERIC := 0;
  v_from_balance NUMERIC := 0;
BEGIN
  -- 1. Lock and check customer wallet
  SELECT balance INTO v_customer_balance
  FROM global_customer_wallets
  WHERE id = p_customer_wallet_id
  FOR UPDATE;

  IF v_customer_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer wallet not found');
  END IF;

  IF v_customer_balance < p_customer_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient customer balance');
  END IF;

  -- 2. Lock and check reseller wallet
  SELECT balance, bonus_balance INTO v_reseller_balance, v_reseller_bonus
  FROM global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_reseller_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller wallet not found');
  END IF;

  -- 3. Funding decision. Balance pays when it can; otherwise the bonus must
  --    cover the whole sale price or the order is refused.
  IF v_reseller_balance < p_cost_price AND v_reseller_bonus < p_selling_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Store has insufficient balance to cover the cost of this order'
    );
  END IF;

  -- 4. Deduct selling price from customer wallet
  UPDATE global_customer_wallets
  SET
    balance = balance - p_customer_deduct,
    total_spent = total_spent + p_customer_deduct,
    updated_at = NOW()
  WHERE id = p_customer_wallet_id;

  IF v_reseller_balance >= p_cost_price THEN
    -- 5a. Normal settlement. The customer's money is already in the reseller
    --     balance from the deposit mirror, so only the platform cost leaves it.
    --     The remainder (selling - cost) is profit and stays put.
    v_from_balance := p_cost_price;
    UPDATE global_wallets
    SET
      balance = balance - p_cost_price,
      updated_at = NOW()
    WHERE reseller_id = p_reseller_id;
  ELSE
    -- 5b. Bonus covers the lost sale: profit to balance, full sale price
    --     burned from the bonus. Unchanged from 20261116.
    v_from_bonus := p_selling_price;
    UPDATE global_wallets
    SET
      balance = balance + p_profit,
      bonus_balance = bonus_balance - p_selling_price,
      updated_at = NOW()
    WHERE reseller_id = p_reseller_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer_new_balance', (SELECT balance FROM global_customer_wallets WHERE id = p_customer_wallet_id),
    'reseller_new_balance', (SELECT balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'reseller_new_bonus_balance', (SELECT bonus_balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'amount_from_bonus', v_from_bonus,
    'amount_from_balance', v_from_balance,
    'bonus_covered_sale', v_from_bonus > 0,
    'profit_earned', p_profit
  );
END;
$$;

COMMENT ON FUNCTION public.process_global_purchase_deductions(uuid, numeric, uuid, numeric, numeric, numeric)
  IS 'Customer sale settlement. The customer wallet pays the selling price and the reseller balance pays the platform cost, leaving the profit in the balance. If the balance cannot cover the cost the bonus stands in and is burned by the full selling price. Refuses the sale when neither can cover it.';

-- ---------------------------------------------------------------------------
-- Deposit mirror: credit the reseller balance, recorded against the customer.
-- Idempotent by customer transaction id, because webhooks retry.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_reseller_for_customer_deposit(
    p_reseller_id uuid,
    p_customer_tx_id uuid,
    p_amount numeric
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_reference TEXT;
  v_existing UUID;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_customer_name TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- One ledger row per customer deposit. A webhook replay finds it and stops.
  v_reference := 'CDEP-' || p_customer_tx_id::text;

  SELECT id INTO v_existing
  FROM global_transactions
  WHERE reference = v_reference
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_credited', true);
  END IF;

  SELECT balance INTO v_balance
  FROM global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller wallet not found');
  END IF;

  v_new_balance := v_balance + p_amount;

  UPDATE global_wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  -- The reseller must see whose money this is.
  SELECT NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), '')
  INTO v_customer_name
  FROM global_customer_transactions t
  LEFT JOIN global_customers c ON c.id = t.customer_id
  WHERE t.id = p_customer_tx_id;

  v_customer_name := COALESCE(v_customer_name, 'Customer');

  -- type must stay within global_transactions_type_check: credit|debit|purchase|refund.
  -- 'credit' renders as a deposit in the dashboard transaction history.
  INSERT INTO global_transactions (
    reseller_id, amount, type, status, reference, description, metadata
  ) VALUES (
    p_reseller_id, p_amount, 'credit', 'completed', v_reference,
    'Customer deposit - ' || v_customer_name,
    jsonb_build_object(
      'customer_tx_id', p_customer_tx_id,
      'customer_name', v_customer_name,
      'kind', 'customer_deposit'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_credited', false,
    'previous_balance', v_balance,
    'new_balance', v_new_balance,
    'customer_name', v_customer_name
  );
END;
$$;

COMMENT ON FUNCTION public.credit_reseller_for_customer_deposit(uuid, uuid, numeric)
  IS 'Mirrors a completed customer deposit into the reseller balance and writes a reseller-side ledger row naming the customer. Keyed by customer transaction id so webhook retries cannot double-credit.';

-- ---------------------------------------------------------------------------
-- Withdrawals: Sundays and Wednesdays, unlimited on those days, 2% fee.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_withdrawals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE,
    amount numeric(18,2) NOT NULL,
    fee numeric(18,2) NOT NULL DEFAULT 0,
    net_amount numeric(18,2) NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    reference text NOT NULL UNIQUE,
    bank_code text,
    account_number text,
    account_name text,
    failure_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT global_withdrawals_status_check
      CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
    CONSTRAINT global_withdrawals_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS global_withdrawals_reseller_created_idx
  ON public.global_withdrawals (reseller_id, created_at DESC);

ALTER TABLE public.global_withdrawals ENABLE ROW LEVEL SECURITY;

-- Read by the server with the admin client, which bypasses RLS. No policy is
-- granted to anon/authenticated: USING (true) here would expose every
-- reseller's payouts to any signed-in user.

CREATE OR REPLACE FUNCTION public.get_withdrawal_eligibility(
    p_reseller_id uuid,
    p_timezone text DEFAULT 'Africa/Lagos'
) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_balance NUMERIC;
  v_float NUMERIC;
  v_local_date date;
  v_dow int;
  v_next_date date;
  v_days_ahead int;
  v_reason text := NULL;
  v_next_label text := NULL;
BEGIN
  SELECT balance INTO v_balance FROM global_wallets WHERE reseller_id = p_reseller_id;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Wallet not found',
                              'balance', 0, 'float_owed', 0, 'withdrawable', 0);
  END IF;

  v_float := public.get_reseller_float_owed(p_reseller_id);

  -- Evaluated in the store's own timezone, not the server's or the browser's,
  -- so a reseller cannot reach an allowed day early by changing their clock.
  v_local_date := (now() AT TIME ZONE p_timezone)::date;
  v_dow := EXTRACT(DOW FROM v_local_date)::int;  -- 0 = Sunday, 3 = Wednesday

  IF v_dow NOT IN (0, 3) THEN
    v_days_ahead := CASE v_dow
      WHEN 1 THEN 2  -- Monday -> Wednesday
      WHEN 2 THEN 1  -- Tuesday -> Wednesday
      WHEN 4 THEN 3  -- Thursday -> Sunday
      WHEN 5 THEN 2  -- Friday -> Sunday
      WHEN 6 THEN 1  -- Saturday -> Sunday
      ELSE 0
    END;
    v_next_date := v_local_date + v_days_ahead;
    v_next_label := to_char(v_next_date, 'FMDay, FMDD FMMonth YYYY');
    v_reason := 'Your next withdrawal day is ' || v_next_label;
  ELSIF v_balance <= 0 THEN
    v_reason := 'No balance available to withdraw';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_reason IS NULL,
    'reason', v_reason,
    'next_withdrawal_day', v_next_label,
    'balance', v_balance,
    -- Full balance is withdrawable: float is the reseller's responsibility.
    'withdrawable', GREATEST(v_balance, 0),
    'float_owed', v_float,
    'local_date', v_local_date,
    'day_of_week', v_dow
  );
END;
$$;

COMMENT ON FUNCTION public.get_withdrawal_eligibility(uuid, text)
  IS 'Whether a reseller may withdraw right now (Sundays and Wednesdays only, in the store timezone) and the full withdrawable balance. Float owed is reported for information but does not reduce it.';

CREATE OR REPLACE FUNCTION public.request_global_withdrawal(
    p_reseller_id uuid,
    p_amount numeric,
    p_fee numeric,
    p_bank_code text,
    p_account_number text,
    p_account_name text,
    p_reference text,
    p_timezone text DEFAULT 'Africa/Lagos'
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_elig jsonb;
  v_balance NUMERIC;
  v_net NUMERIC;
  v_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;

  v_elig := public.get_withdrawal_eligibility(p_reseller_id, p_timezone);
  IF (v_elig->>'allowed')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', v_elig->>'reason', 'eligibility', v_elig);
  END IF;

  -- Re-check under the lock: eligibility read the balance unlocked.
  SELECT balance INTO v_balance
  FROM global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF p_amount > v_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  v_net := p_amount - COALESCE(p_fee, 0);
  IF v_net <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount does not cover the fee');
  END IF;

  UPDATE global_wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  INSERT INTO global_withdrawals (
    reseller_id, amount, fee, net_amount, status, reference,
    bank_code, account_number, account_name
  ) VALUES (
    p_reseller_id, p_amount, COALESCE(p_fee, 0), v_net, 'pending', p_reference,
    p_bank_code, p_account_number, p_account_name
  ) RETURNING id INTO v_id;

  -- global_transactions_type_check has no 'withdrawal' member, so a withdrawal
  -- is recorded as a debit.
  INSERT INTO global_transactions (
    reseller_id, amount, type, status, reference, description, metadata
  ) VALUES (
    p_reseller_id, p_amount, 'debit', 'pending', 'WDR-' || p_reference,
    'Withdrawal to bank account',
    jsonb_build_object('withdrawal_id', v_id, 'fee', p_fee, 'net_amount', v_net)
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_id,
    'amount', p_amount,
    'fee', COALESCE(p_fee, 0),
    'net_amount', v_net,
    'reference', p_reference
  );
END;
$$;

COMMENT ON FUNCTION public.request_global_withdrawal(uuid, numeric, numeric, text, text, text, text, text)
  IS 'Atomically checks withdrawal eligibility, deducts the amount, and records a pending withdrawal plus a debit ledger row.';

CREATE OR REPLACE FUNCTION public.fail_global_withdrawal(
    p_withdrawal_id uuid,
    p_reason text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_w RECORD;
BEGIN
  SELECT id, reseller_id, amount, status, reference
  INTO v_w
  FROM global_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF v_w IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_w.status = 'failed' THEN
    RETURN jsonb_build_object('success', true, 'already_failed', true);
  END IF;

  IF v_w.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal already completed');
  END IF;

  -- A failed payout returns the money. Eligibility is day-based rather than
  -- count-based, so nothing else needs restoring.
  UPDATE global_wallets
  SET balance = balance + v_w.amount, updated_at = NOW()
  WHERE reseller_id = v_w.reseller_id;

  UPDATE global_withdrawals
  SET status = 'failed', failure_reason = p_reason, updated_at = NOW()
  WHERE id = p_withdrawal_id;

  UPDATE global_transactions
  SET status = 'failed'
  WHERE reference = 'WDR-' || v_w.reference;

  RETURN jsonb_build_object('success', true, 'refunded', v_w.amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_global_withdrawal(p_withdrawal_id uuid)
RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_w RECORD;
BEGIN
  SELECT id, status, reference INTO v_w
  FROM global_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF v_w IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_w.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  IF v_w.status = 'failed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal already failed');
  END IF;

  UPDATE global_withdrawals
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_withdrawal_id;

  UPDATE global_transactions
  SET status = 'completed'
  WHERE reference = 'WDR-' || v_w.reference;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: these move money, so service_role only.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_reseller_float_owed(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_reseller_for_customer_deposit(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_global_withdrawal(uuid, numeric, numeric, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_global_withdrawal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_global_withdrawal(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_reseller_float_owed(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_reseller_for_customer_deposit(uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_global_withdrawal(uuid, numeric, numeric, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_global_withdrawal(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_global_withdrawal(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Backfill: BelovedTopup, plus any store with customer activity in the 24h
-- before this migration was written. Everything else is left alone.
--
-- The cutoff is pinned rather than `now() - interval '24 hours'` so the result
-- is deterministic whenever this file is applied. Pinned at 2026-11-22 16:58Z.
--
-- The amount is the CURRENT customer wallet balance, not historical deposits:
-- the two disagree where purchases were never written to the ledger.
--
-- Do NOT key off global_wallets.updated_at here. That column is touched by any
-- wallet write, so it would sweep in stores that had no customer activity.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_cutoff timestamptz := '2026-11-22 16:58:09+00';
  r RECORD;
  v_ref text;
  v_existing uuid;
BEGIN
  FOR r IN
    SELECT w.reseller_id, SUM(cw.balance) AS float_owed
    FROM public.global_customer_wallets cw
    JOIN public.global_wallets w ON w.reseller_id = cw.reseller_id
    JOIN public.global_reseller_applications a ON a.id = cw.reseller_id
    WHERE cw.status = 'active'
      AND cw.balance > 0
      AND (
        a.store_slug = 'belovedtopup'
        OR cw.updated_at >= v_cutoff
        OR EXISTS (
          SELECT 1 FROM public.global_customer_transactions t
          WHERE t.reseller_id = cw.reseller_id AND t.created_at >= v_cutoff
        )
      )
    GROUP BY w.reseller_id
    HAVING SUM(cw.balance) > 0
  LOOP
    v_ref := 'CDEP-BACKFILL-' || r.reseller_id::text;

    SELECT id INTO v_existing FROM public.global_transactions WHERE reference = v_ref LIMIT 1;
    IF v_existing IS NOT NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.global_wallets
    SET balance = balance + r.float_owed, updated_at = NOW()
    WHERE reseller_id = r.reseller_id;

    INSERT INTO public.global_transactions (
      reseller_id, amount, type, status, reference, description, metadata
    ) VALUES (
      r.reseller_id, r.float_owed, 'credit', 'completed', v_ref,
      'Customer deposits held in store balance (opening balance)',
      jsonb_build_object('kind', 'customer_deposit_backfill', 'cutoff', v_cutoff)
    );

    RAISE NOTICE 'backfilled % for reseller %', r.float_owed, r.reseller_id;
  END LOOP;
END $$;
