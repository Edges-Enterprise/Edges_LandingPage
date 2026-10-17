-- Task 4, branch 1.d.iv.zi (AccraGH half): atomic settlement of a PENDING
-- purchase once the async provider (AccraGH / NetFillGh; Zendit later)
-- reports a final status.
--
-- Background: global-purchase-data/airtime (1.d.iii) record an accepted-but-
-- unconfirmed async purchase as a `pending` global_orders row (plus a
-- `pending` global_customer_transactions row for customer buyers) and move
-- NO wallet balance. This function is what finishes that order.
--
-- Why one SQL function instead of several client-side calls: the debit,
-- the order status flip and the ledger rows must be all-or-nothing, and a
-- webhook can be retried or delivered twice. The order row is locked
-- (FOR UPDATE) and its status is re-checked under the lock, so a repeated
-- or concurrent delivery for the same order is a no-op, never a second debit.
--
-- Cost price is not stored on the pending order, so it is derived the same
-- way the orchestrator wrote it: customer order  -> amount = selling price,
-- profit = selling - cost; reseller self-purchase -> amount = cost, profit = 0.
-- In both cases cost = amount - profit.
--
-- Returns jsonb { success, code, ... }. Codes:
--   SETTLED            order moved pending -> completed|failed
--   ALREADY_SETTLED    order was already in the requested final state (idempotent no-op)
--   INVALID_STATE      order is in a different final state (e.g. completed, then "failed" arrives)
--   ORDER_NOT_FOUND    no order with that provider reference (may be a race with order creation)
--   AMBIGUOUS_REFERENCE more than one order matches (should never happen)
--   DEDUCTION_FAILED   completed was reported but the wallet debit could not be made;
--                      nothing was changed, order stays pending
--   INVALID_OUTCOME    p_outcome is not 'completed' or 'failed'

CREATE INDEX IF NOT EXISTS idx_global_orders_transaction_reference
    ON public.global_orders USING btree (transaction_reference);

CREATE FUNCTION public.settle_global_pending_purchase(
    p_transaction_reference text,
    p_payment_method text,
    p_outcome text,
    p_provider_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_match_count integer;
  v_order global_orders%ROWTYPE;
  v_cost numeric;
  v_customer_wallet_id uuid;
  v_reseller_wallet_id uuid;
  v_deduct jsonb;
  v_customer_new_balance numeric;
  v_customer_prev_balance numeric;
  v_rows integer;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('completed', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_OUTCOME',
      'error', 'p_outcome must be completed or failed');
  END IF;

  SELECT count(*) INTO v_match_count
  FROM global_orders
  WHERE transaction_reference = p_transaction_reference
    AND payment_method = p_payment_method;

  IF v_match_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND',
      'error', 'No order with that reference');
  END IF;

  IF v_match_count > 1 THEN
    RETURN jsonb_build_object('success', false, 'code', 'AMBIGUOUS_REFERENCE',
      'error', 'More than one order matches that reference');
  END IF;

  -- Lock the order; status is re-read after any concurrent settle finishes.
  SELECT * INTO v_order
  FROM global_orders
  WHERE transaction_reference = p_transaction_reference
    AND payment_method = p_payment_method
  FOR UPDATE;

  IF v_order.status = p_outcome THEN
    RETURN jsonb_build_object('success', true, 'code', 'ALREADY_SETTLED',
      'order_id', v_order.id);
  END IF;

  IF v_order.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STATE',
      'order_id', v_order.id, 'current_status', v_order.status);
  END IF;

  -- ── Provider reported failure: nothing was ever debited, just close out.
  IF p_outcome = 'failed' THEN
    UPDATE global_orders
    SET status = 'failed',
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object('provider_settlement', p_provider_payload)
    WHERE id = v_order.id;

    UPDATE global_customer_transactions
    SET status = 'failed',
        updated_at = NOW(),
        description = regexp_replace(COALESCE(description, ''), ' - awaiting confirmation$', ' - failed'),
        metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object('provider_settlement', p_provider_payload)
    WHERE order_id = v_order.id
      AND type = 'purchase'
      AND status = 'pending';

    RETURN jsonb_build_object('success', true, 'code', 'SETTLED',
      'outcome', 'failed', 'order_id', v_order.id);
  END IF;

  -- ── Provider reported completion: debit for real.
  v_cost := v_order.amount - v_order.profit;

  SELECT id INTO v_reseller_wallet_id
  FROM global_wallets
  WHERE reseller_id = v_order.reseller_id;

  IF v_order.customer_id IS NOT NULL THEN
    SELECT id INTO v_customer_wallet_id
    FROM global_customer_wallets
    WHERE reseller_id = v_order.reseller_id
      AND customer_id = v_order.customer_id;

    IF v_customer_wallet_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'DEDUCTION_FAILED',
        'order_id', v_order.id, 'error', 'Customer wallet not found');
    END IF;

    v_deduct := process_global_purchase_deductions(
      v_customer_wallet_id, v_order.amount,
      v_order.reseller_id, v_cost, v_order.amount, v_order.profit
    );

    IF NOT COALESCE((v_deduct->>'success')::boolean, false) THEN
      RETURN jsonb_build_object('success', false, 'code', 'DEDUCTION_FAILED',
        'order_id', v_order.id, 'error', COALESCE(v_deduct->>'error', 'Deduction failed'));
    END IF;

    v_customer_new_balance := (v_deduct->>'customer_new_balance')::numeric;
    v_customer_prev_balance := v_customer_new_balance + v_order.amount;
  ELSE
    -- Reseller self-purchase. deduct_global_reseller_cost RAISES on
    -- insufficient balance, so catch it and report instead of aborting.
    BEGIN
      v_deduct := deduct_global_reseller_cost(v_order.reseller_id, v_cost);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'code', 'DEDUCTION_FAILED',
        'order_id', v_order.id, 'error', SQLERRM);
    END;

    IF NOT COALESCE((v_deduct->>'success')::boolean, false) THEN
      RETURN jsonb_build_object('success', false, 'code', 'DEDUCTION_FAILED',
        'order_id', v_order.id, 'error', COALESCE(v_deduct->>'error', 'Deduction failed'));
    END IF;
  END IF;

  UPDATE global_orders
  SET status = 'completed',
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb)
                 || jsonb_build_object('provider_settlement', p_provider_payload)
  WHERE id = v_order.id;

  IF v_order.customer_id IS NOT NULL THEN
    UPDATE global_customer_transactions
    SET status = 'completed',
        previous_balance = v_customer_prev_balance,
        new_balance = v_customer_new_balance,
        updated_at = NOW(),
        description = regexp_replace(COALESCE(description, ''), ' - awaiting confirmation$', ''),
        metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object('provider_settlement', p_provider_payload,
                                         'cost_price', v_cost,
                                         'profit', v_order.profit)
    WHERE order_id = v_order.id
      AND type = 'purchase'
      AND status = 'pending';

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    -- The pending row is always written by the orchestrator; if it is
    -- somehow missing, still leave a ledger entry rather than a silent gap.
    IF v_rows = 0 THEN
      INSERT INTO global_customer_transactions (
        reseller_id, customer_id, type, amount, net_amount,
        previous_balance, new_balance, order_id, plan_id, reference,
        status, description, payment_gateway, metadata
      ) VALUES (
        v_order.reseller_id, v_order.customer_id, 'purchase', v_order.amount, v_order.amount,
        v_customer_prev_balance, v_customer_new_balance, v_order.id, v_order.plan_id,
        v_order.transaction_reference,
        'completed', 'Purchased ' || v_order.plan_name, p_payment_method,
        jsonb_build_object('provider_settlement', p_provider_payload,
                           'cost_price', v_cost, 'profit', v_order.profit,
                           'note', 'pending row was missing at settlement')
      );
    END IF;
  END IF;

  -- Reseller-side ledger entry (always: customer sale or self-purchase).
  INSERT INTO global_transactions (
    reseller_id, wallet_id, type, amount, description, status,
    reference, payment_gateway, metadata
  ) VALUES (
    v_order.reseller_id, v_reseller_wallet_id, 'purchase', v_order.amount,
    'Purchased ' || v_order.plan_name,
    'completed', v_order.id::text, p_payment_method,
    jsonb_build_object(
      'order_id', v_order.id,
      'plan_id', v_order.plan_id,
      'plan_name', v_order.plan_name,
      'provider_ref', v_order.transaction_reference,
      'self_purchase', v_order.customer_id IS NULL,
      'provider_settlement', p_provider_payload
    )
  );

  RETURN jsonb_build_object('success', true, 'code', 'SETTLED',
    'outcome', 'completed', 'order_id', v_order.id);
END;
$$;

-- This function moves money and is SECURITY DEFINER: it must only be
-- callable with the service-role key (i.e. from the edge function), never
-- via PostgREST with the anon/authenticated keys.
REVOKE ALL ON FUNCTION public.settle_global_pending_purchase(text, text, text, jsonb)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_global_pending_purchase(text, text, text, jsonb)
    TO service_role;
