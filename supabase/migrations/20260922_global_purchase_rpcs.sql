-- Task 4, branch 1.d.i: global_* equivalents of the legacy purchase RPCs.
--
-- Legacy versions (get_reseller_balance, deduct_reseller_cost,
-- process_purchase_deductions, create_purchase_order) are confirmed
-- legacy-table-bound (reseller_wallets / reseller_customer_wallets /
-- reseller_orders) — see HANDOVER.md Task 4, "Reality check" finding #6.
-- These are new, parallel functions against the global_* tables, not a
-- reuse or a rename of the legacy ones.
--
-- Two real deviations from a literal mirror, both resolved by reading the
-- actual global_* schema rather than assumed:
--
-- 1. global_wallets has no total_sales/total_profit columns (unlike
--    reseller_wallets). get_global_reseller_dashboard_stats already
--    computes those live from SUM(global_orders.amount)/SUM(profit)
--    WHERE status = 'completed' instead of maintaining denormalized
--    counters — so process_global_purchase_deductions below only touches
--    balance on both wallets, matching the columns that actually exist.
--    (deduct_global_reseller_cost needs no change here either way: the
--    legacy deduct_reseller_cost also only ever touched balance.)
--
-- 2. global_orders requires customer_id, customer_name and plan_name
--    (customer_name/plan_name are NOT NULL, unlike reseller_orders which
--    only stores customer_email). create_global_purchase_order's
--    signature is therefore wider than create_purchase_order's to satisfy
--    those columns — customer_id is nullable (NULL for reseller
--    self-purchase), customer_name/plan_name are required inputs from the
--    caller, and payment_method/transaction_reference are optional extras
--    the legacy table never had.

CREATE FUNCTION public.get_global_reseller_balance(p_reseller_id uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT balance INTO v_balance
  FROM global_wallets
  WHERE reseller_id = p_reseller_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;


CREATE FUNCTION public.deduct_global_reseller_cost(p_reseller_id uuid, p_cost_price numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- 1. Lock the reseller wallet row
  SELECT balance INTO v_balance
  FROM global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  -- 2. Check if reseller has enough balance
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller wallet not found');
  END IF;

  IF v_balance < p_cost_price THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
      v_balance, p_cost_price;
  END IF;

  -- 3. Just deduct the cost price (no selling price added) — same as legacy
  UPDATE global_wallets
  SET
    balance = balance - p_cost_price,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id
  RETURNING balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_deducted', p_cost_price
  );
END;
$$;


CREATE FUNCTION public.process_global_purchase_deductions(
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
  SELECT balance INTO v_reseller_balance
  FROM global_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_reseller_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller wallet not found');
  END IF;

  -- 3. Reseller must be able to cover the cost price
  IF v_reseller_balance < p_cost_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Store has insufficient balance to cover the cost of this order'
    );
  END IF;

  -- 4. Deduct selling price from customer wallet (total_spent exists here, same as legacy)
  UPDATE global_customer_wallets
  SET
    balance = balance - p_customer_deduct,
    total_spent = total_spent + p_customer_deduct,
    updated_at = NOW()
  WHERE id = p_customer_wallet_id;

  -- 5. Add selling price to reseller, subtract cost price.
  --    NOTE: unlike legacy's reseller_wallets, global_wallets has no
  --    total_sales/total_profit columns — those figures are computed live
  --    from global_orders elsewhere (get_global_reseller_dashboard_stats),
  --    so only balance is touched here.
  UPDATE global_wallets
  SET
    balance = balance + p_selling_price - p_cost_price,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  RETURN jsonb_build_object(
    'success', true,
    'customer_new_balance', (SELECT balance FROM global_customer_wallets WHERE id = p_customer_wallet_id),
    'reseller_new_balance', (SELECT balance FROM global_wallets WHERE reseller_id = p_reseller_id),
    'profit_earned', p_profit
  );
END;
$$;


CREATE FUNCTION public.create_global_purchase_order(
    p_reseller_id uuid,
    p_customer_id uuid,
    p_customer_name text,
    p_plan_id uuid,
    p_plan_name text,
    p_amount numeric,
    p_profit numeric,
    p_payment_method text DEFAULT NULL,
    p_transaction_reference text DEFAULT NULL,
    p_status text DEFAULT 'completed'
) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order_id UUID;
BEGIN
  INSERT INTO global_orders (
    reseller_id,
    customer_id,
    customer_name,
    plan_id,
    plan_name,
    amount,
    profit,
    status,
    payment_method,
    transaction_reference,
    created_at
  ) VALUES (
    p_reseller_id,
    p_customer_id,
    p_customer_name,
    p_plan_id,
    p_plan_name,
    p_amount,
    p_profit,
    p_status,
    p_payment_method,
    p_transaction_reference,
    NOW()
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;
