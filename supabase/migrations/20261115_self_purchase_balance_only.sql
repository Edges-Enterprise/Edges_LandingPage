-- 20261115_self_purchase_balance_only.sql
--
-- The first-deposit bonus must only ever fund the wholesale cost of a sale to
-- a CUSTOMER. A reseller buying from their own store must pay from their own
-- withdrawable `balance` and never from `bonus_balance`.
--
-- Before this migration `deduct_global_reseller_cost` spent the bonus first on
-- every path, including self-purchase. That made the bonus convertible to cash:
-- a reseller could fund once, spend the bonus on data for themselves, and walk
-- away — the bonus left the system as goods rather than being earned back
-- through a customer sale.
--
-- After this migration the split is:
--
--   * customer sale (process_global_purchase_deductions) — unchanged; the
--     customer pays the selling price from their own wallet and the wholesale
--     cost is taken from the bonus first, so a capital-poor reseller can fill
--     an order they could not otherwise fund. Profit lands in `balance`.
--   * reseller self-purchase (deduct_global_reseller_cost) — debits `balance`
--     only. If `balance` alone cannot cover the cost the purchase fails, even
--     when `bonus_balance` would have covered it.
--
-- The bonus is a flat USD 10 converted at the live FX rate and there is no
-- minimum qualifying deposit, by product decision.

-- ─── Self-purchase cost deduction: balance only ─────────────────────
--
-- Signature and return shape are unchanged so existing callers keep working;
-- `amount_from_bonus` is now always 0 and `amount_from_balance` always the
-- full cost.

CREATE OR REPLACE FUNCTION public.deduct_global_reseller_cost(
    p_reseller_id uuid,
    p_cost_price numeric
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $function$
DECLARE
  v_balance DECIMAL;
  v_bonus DECIMAL;
BEGIN
  SELECT balance, bonus_balance INTO v_balance, v_bonus
  FROM global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller wallet not found');
  END IF;

  -- Balance only. The bonus is deliberately excluded from the self-purchase
  -- solvency check so it cannot authorise a purchase it will not pay for.
  IF v_balance < p_cost_price THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
      v_balance, p_cost_price;
  END IF;

  UPDATE global_wallets
  SET
    balance = balance - p_cost_price,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', (SELECT balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'new_bonus_balance', (SELECT bonus_balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'amount_deducted', p_cost_price,
    'amount_from_bonus', 0,
    'amount_from_balance', p_cost_price
  );
END;
$function$;

COMMENT ON FUNCTION public.deduct_global_reseller_cost(uuid, numeric) IS
  'Debits a reseller self-purchase cost from the withdrawable balance only. The first-deposit bonus is never spent here; it is reserved for customer-sale fulfilment.';

-- ─── Balance-only read for the self-purchase solvency check ─────────
--
-- get_global_reseller_balance() returns balance + bonus_balance, which is
-- correct for a customer sale (the bonus funds the cost) but wrong for a
-- self-purchase, where the bonus cannot be spent. Without this the
-- orchestrator would pass its pre-flight check and the deduction would then
-- fail, turning an eligibility error into a generic transaction failure.

CREATE OR REPLACE FUNCTION public.get_global_reseller_balance_only(p_reseller_id uuid)
RETURNS numeric
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $function$
DECLARE
  v_balance numeric;
BEGIN
  SELECT balance INTO v_balance
  FROM public.global_wallets
  WHERE reseller_id = p_reseller_id;

  RETURN COALESCE(v_balance, 0);
END;
$function$;

COMMENT ON FUNCTION public.get_global_reseller_balance_only(uuid) IS
  'Withdrawable balance only, excluding the non-withdrawable first-deposit bonus. Used to gate reseller self-purchases.';

-- ─── Grants ─────────────────────────────────────────────────────────
--
-- Same posture as 20261111_revoke_global_money_rpcs.sql: SECURITY DEFINER
-- money functions must not be reachable with the public anon key.

REVOKE ALL ON FUNCTION public.deduct_global_reseller_cost(uuid, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_global_reseller_cost(uuid, numeric)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_global_reseller_balance_only(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_reseller_balance_only(uuid)
  TO service_role;
