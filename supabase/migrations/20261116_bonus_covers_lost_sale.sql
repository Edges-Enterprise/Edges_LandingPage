-- 20261116_bonus_covers_lost_sale.sql
--
-- The first-deposit bonus is an adoption incentive with a deliberately
-- limited life: it lets a reseller complete a sale their own balance cannot
-- cover, and it is burned in units of the SALE PRICE each time it does so.
-- It is not money and it never becomes withdrawable.
--
-- Two funding paths:
--
--   A. Reseller balance covers the platform cost.
--      Normal settlement. Cost comes from balance, bonus untouched.
--        balance += selling_price - cost_price
--
--   B. Reseller balance cannot cover the platform cost.
--      The bonus stands in for the missing funds so the customer is not
--      turned away, and is burned by the full selling price.
--        balance += profit
--        bonus   -= selling_price
--      The customer's payment still settles the transaction in full.
--
--   If the bonus cannot cover the full selling price, the sale is refused.
--   A partial bonus burn would leave the reseller credited a profit on a
--   sale the platform had to fund, so it is all-or-nothing.
--
-- Worked example (bonus 13000, balance 1000):
--   sale 5000, cost 4500, profit 500, balance 1000 < 4500
--     -> bonus 8000,  balance 1500
--   sale 8000, cost 7000, profit 1000, balance 1500 < 7000, bonus 8000 >= 8000
--     -> bonus 0,     balance 2500
--   sale 3000, cost 2800, balance 2500 < 2800, bonus 0 < 3000
--     -> refused, customer told the service is temporarily unavailable
--   sale 500,  cost 450,  profit 50, balance 2500 >= 450
--     -> bonus 0,     balance 2550
--
-- Self-purchases remain balance-only (20261115); the bonus never funds them.

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
    -- 5a. Normal settlement: cost from balance, profit is the difference.
    v_from_balance := p_cost_price;
    UPDATE global_wallets
    SET
      balance = balance + p_selling_price - p_cost_price,
      updated_at = NOW()
    WHERE reseller_id = p_reseller_id;
  ELSE
    -- 5b. Bonus covers the lost sale: profit to balance, full sale price
    --     burned from the bonus.
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
  IS 'Customer sale settlement. If the reseller balance covers the platform cost the cost is taken from balance and the bonus is untouched; otherwise the bonus stands in for the missing funds and is burned by the full selling price, with only the profit credited to the reseller. Refuses the sale when neither can cover it.';

-- Pre-flight funding check. Callers must not reimplement the rule above: a
-- balance+bonus total is not sufficient, because the bonus only applies when
-- it can cover the whole selling price.
CREATE OR REPLACE FUNCTION public.get_global_sale_funding(
    p_reseller_id uuid,
    p_cost_price numeric,
    p_selling_price numeric
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_balance NUMERIC;
  v_bonus NUMERIC;
BEGIN
  SELECT balance, bonus_balance INTO v_balance, v_bonus
  FROM public.global_wallets
  WHERE reseller_id = p_reseller_id;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('can_fund', false, 'mode', 'none');
  END IF;

  IF v_balance >= p_cost_price THEN
    RETURN jsonb_build_object('can_fund', true, 'mode', 'balance',
      'balance', v_balance, 'bonus', v_bonus);
  END IF;

  IF v_bonus >= p_selling_price THEN
    RETURN jsonb_build_object('can_fund', true, 'mode', 'bonus',
      'balance', v_balance, 'bonus', v_bonus);
  END IF;

  RETURN jsonb_build_object('can_fund', false, 'mode', 'none',
    'balance', v_balance, 'bonus', v_bonus);
END;
$$;

COMMENT ON FUNCTION public.get_global_sale_funding(uuid, numeric, numeric)
  IS 'Whether a customer sale can be funded: by reseller balance when it covers the cost, else by the bonus when it covers the full selling price. Mirrors process_global_purchase_deductions.';

REVOKE ALL ON FUNCTION public.process_global_purchase_deductions(uuid, numeric, uuid, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_global_purchase_deductions(uuid, numeric, uuid, numeric, numeric, numeric) TO service_role;

REVOKE ALL ON FUNCTION public.get_global_sale_funding(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_sale_funding(uuid, numeric, numeric) TO service_role;
