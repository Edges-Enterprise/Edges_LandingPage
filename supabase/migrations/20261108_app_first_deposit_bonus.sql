-- 20261108_app_first_deposit_bonus.sql
--
-- The reseller app first-deposit bonus: a one-time, non-withdrawable credit
-- of USD 10 (converted to the store's own currency at the live FX rate) the
-- first time a reseller funds their wallet *from the app*.
--
-- Replaces the previous 5% withdrawable first-deposit bonus
-- (src/lib/bonus/first-deposit.ts, first_deposit_bonus_* columns), which
-- credited the reseller's normal balance. The new bonus is a SEPARATE
-- balance:
--
--   * non-withdrawable — the withdrawal path only ever reads `balance`;
--     `bonus_balance` is never a source of cash-out,
--   * spendable — it covers the wholesale cost of a purchase (the reseller's
--     own self-purchase, or a customer sale) before the withdrawable
--     `balance` is touched,
--   * profit lands in the withdrawable `balance`, as before.
--
-- Money model (unchanged for the withdrawable side): a customer sale credits
-- the reseller the selling price and debits the wholesale cost; a self-
-- purchase debits the wholesale cost only. The bonus only changes WHERE the
-- cost is debited from — bonus first, then balance — so total value still
-- moves by the profit alone.

-- ─── Columns ────────────────────────────────────────────────────────

ALTER TABLE public.global_wallets
  ADD COLUMN IF NOT EXISTS bonus_balance numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS app_bonus_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_bonus_claimed_at timestamp with time zone;

COMMENT ON COLUMN public.global_wallets.bonus_balance IS
  'Non-withdrawable, spendable app first-deposit bonus. Debited before balance when covering a purchase cost.';
COMMENT ON COLUMN public.global_wallets.app_bonus_claimed IS
  'True once the app first-deposit bonus has been awarded (one-time).';

-- ─── USD -> local conversion of the fixed USD 10 ────────────────────
--
-- The bonus is fixed at USD 10. A store whose wallet is not USD receives the
-- equivalent at the live FX rate: the newest unexpired `global_fx_rates` row
-- for USD -> the wallet currency, preferring the collection-provider rate,
-- then Zendit's, then a manual one — the same source order the pricing leg
-- uses (_shared/currency/rates.ts). Rounded to the currency's own ISO 4217
-- exponent, so a 0-decimal currency (RWF/UGX/XOF/XAF) never carries a
-- fractional unit.
--
-- Returns NULL when there is no fresh rate. The caller then leaves the bonus
-- unclaimed rather than inventing a rate, so a later app deposit can still
-- award it.

CREATE OR REPLACE FUNCTION public.app_bonus_amount_local(p_currency text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_currency text := upper(coalesce(p_currency, 'USD'));
  v_rate numeric;
  v_decimals integer;
BEGIN
  IF v_currency = 'USD' THEN
    RETURN 10.00;
  END IF;

  SELECT r.rate INTO v_rate
  FROM public.global_fx_rates r
  WHERE r.base_currency = 'USD'
    AND r.quote_currency = v_currency
    AND r.expires_at > now()
  ORDER BY
    CASE r.source
      WHEN 'collection_provider' THEN 0
      WHEN 'zendit' THEN 1
      WHEN 'manual' THEN 2
      ELSE 3
    END,
    r.fetched_at DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT c.decimals INTO v_decimals
  FROM public.global_currencies c
  WHERE c.code = v_currency;

  RETURN round(10 * v_rate, coalesce(v_decimals, 2));
END;
$function$;

COMMENT ON FUNCTION public.app_bonus_amount_local(text) IS
  'USD 10 expressed in the given currency at the live FX rate, rounded to that currency''s decimals. NULL when no fresh rate exists.';

-- ─── Award ──────────────────────────────────────────────────────────
--
-- Idempotent: the wallet row is locked and `app_bonus_claimed` is re-checked
-- under the lock, so a retried or concurrent webhook awards at most once.

CREATE OR REPLACE FUNCTION public.award_app_first_deposit_bonus(p_reseller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet RECORD;
  v_amount numeric;
  v_currency text;
BEGIN
  SELECT id, currency, app_bonus_claimed
  INTO v_wallet
  FROM public.global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'wallet_not_found');
  END IF;

  IF v_wallet.app_bonus_claimed THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_claimed');
  END IF;

  v_currency := upper(coalesce(v_wallet.currency, 'USD'));
  v_amount := public.app_bonus_amount_local(v_currency);

  IF v_amount IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'no_rate');
  END IF;

  UPDATE public.global_wallets
  SET
    bonus_balance = bonus_balance + v_amount,
    app_bonus_claimed = true,
    app_bonus_claimed_at = now(),
    updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.global_transactions (
    reseller_id, wallet_id, type, amount, description, status, reference,
    metadata
  ) VALUES (
    p_reseller_id,
    v_wallet.id,
    'credit',
    v_amount,
    'App first deposit bonus',
    'completed',
    'BONUS-APP-' || replace(p_reseller_id::text, '-', '') || '-'
      || extract(epoch from now())::bigint,
    jsonb_build_object(
      'bonus_type', 'app_first_deposit',
      'usd_value', 10,
      'currency', v_currency
    )
  );

  RETURN jsonb_build_object(
    'awarded', true,
    'amount', v_amount,
    'currency', v_currency
  );
END;
$function$;

COMMENT ON FUNCTION public.award_app_first_deposit_bonus(uuid) IS
  'One-time, non-withdrawable USD 10 app first-deposit bonus (in the wallet currency). Idempotent per reseller.';

-- ─── Balance read: spendable = withdrawable + bonus ─────────────────
--
-- Used by the purchase orchestrator's solvency check. The bonus is
-- spendable, so it counts toward what a reseller can cover.

CREATE OR REPLACE FUNCTION public.get_global_reseller_balance(p_reseller_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
BEGIN
  SELECT balance + bonus_balance INTO v_total
  FROM public.global_wallets
  WHERE reseller_id = p_reseller_id;

  RETURN COALESCE(v_total, 0);
END;
$function$;

-- ─── Cost deduction: bonus first, then balance ──────────────────────
--
-- Self-purchase path. Previously deducted the whole cost from `balance`.

CREATE OR REPLACE FUNCTION public.deduct_global_reseller_cost(p_reseller_id uuid, p_cost_price numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance DECIMAL;
  v_bonus DECIMAL;
  v_from_bonus DECIMAL;
  v_from_balance DECIMAL;
BEGIN
  SELECT balance, bonus_balance INTO v_balance, v_bonus
  FROM global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller wallet not found');
  END IF;

  IF v_balance + v_bonus < p_cost_price THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
      v_balance + v_bonus, p_cost_price;
  END IF;

  v_from_bonus := LEAST(v_bonus, p_cost_price);
  v_from_balance := p_cost_price - v_from_bonus;

  UPDATE global_wallets
  SET
    bonus_balance = bonus_balance - v_from_bonus,
    balance = balance - v_from_balance,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', (SELECT balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'new_bonus_balance', (SELECT bonus_balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'amount_deducted', p_cost_price,
    'amount_from_bonus', v_from_bonus,
    'amount_from_balance', v_from_balance
  );
END;
$function$;

-- ─── Customer purchase: bonus covers cost, selling price to balance ─
--
-- Credits the reseller the selling price and debits the wholesale cost, with
-- the cost taken from the bonus first. Net effect on the withdrawable
-- balance is (selling - cost_from_balance); the bonus absorbs the rest.

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
  v_from_bonus NUMERIC;
  v_from_balance NUMERIC;
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

  -- 3. Reseller must be able to cover the cost price (bonus is spendable)
  IF v_reseller_balance + v_reseller_bonus < p_cost_price THEN
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

  -- 5. Credit the selling price, debit the cost from bonus first.
  v_from_bonus := LEAST(v_reseller_bonus, p_cost_price);
  v_from_balance := p_cost_price - v_from_bonus;

  UPDATE global_wallets
  SET
    balance = balance + p_selling_price - v_from_balance,
    bonus_balance = bonus_balance - v_from_bonus,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  RETURN jsonb_build_object(
    'success', true,
    'customer_new_balance', (SELECT balance FROM global_customer_wallets WHERE id = p_customer_wallet_id),
    'reseller_new_balance', (SELECT balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'reseller_new_bonus_balance', (SELECT bonus_balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'amount_from_bonus', v_from_bonus,
    'amount_from_balance', v_from_balance,
    'profit_earned', p_profit
  );
END;
$$;

-- ─── Pre-ship app funders are NOT bonus-eligible ────────────────────
--
-- Product decision: a reseller who already funded their wallet from the app
-- before this bonus shipped is assumed not eligible. Mark them claimed so the
-- (idempotent) award can never fire for them retroactively. A no-op when no
-- such deposit exists.

UPDATE public.global_wallets w
SET app_bonus_claimed = true,
    app_bonus_claimed_at = now(),
    updated_at = now()
WHERE w.app_bonus_claimed = false
  AND EXISTS (
    SELECT 1
    FROM public.global_transactions t
    WHERE t.reseller_id = w.reseller_id
      AND t.status = 'completed'
      AND t.type IN ('credit', 'deposit')
      AND t.metadata->>'source' = 'app'
  );
