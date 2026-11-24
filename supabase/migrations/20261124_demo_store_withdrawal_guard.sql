-- 20261124_demo_store_withdrawal_guard.sql
--
-- The demonstration stores (bossdata, datalord) carry a seeded balance that
-- was never deposited. Their wallet is deliberately large so the storefront
-- and dashboard look like a working business, but that balance must never be
-- payable out: there is no money behind it.
--
-- Without this guard, get_withdrawal_eligibility() reports the full seeded
-- balance as withdrawable on the next Sunday or Wednesday, and
-- request_global_withdrawal() would then move real cash against it.
--
-- The guard is keyed on the same DT marker the seed uses (the store slug),
-- not on a magic balance or a user id, so it survives a reseed and cannot be
-- tripped by a legitimate store. Demo stores can still trade, sell plans and
-- settle customer purchases - they simply cannot withdraw.

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
  v_slug text;
BEGIN
  SELECT balance INTO v_balance FROM global_wallets WHERE reseller_id = p_reseller_id;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Wallet not found',
                              'balance', 0, 'float_owed', 0, 'withdrawable', 0);
  END IF;

  v_float := public.get_reseller_float_owed(p_reseller_id);

  -- Seeded demonstration stores hold no real money.
  SELECT store_slug INTO v_slug
  FROM public.global_reseller_applications
  WHERE id = p_reseller_id;

  IF v_slug IN ('bossdata', 'datalord') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'This is a demonstration store, so its balance cannot be withdrawn.',
      'balance', v_balance,
      'float_owed', v_float,
      'withdrawable', 0,
      'demo_store', true
    );
  END IF;

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
    'withdrawable', GREATEST(v_balance, 0),
    'float_owed', v_float,
    'local_date', v_local_date,
    'day_of_week', v_dow
  );
END;
$$;

COMMENT ON FUNCTION public.get_withdrawal_eligibility(uuid, text)
  IS 'Whether a reseller may withdraw right now (Sundays and Wednesdays only, in the store timezone) and the full withdrawable balance. Float owed is reported for information but does not reduce it. Seeded demonstration stores are never eligible.';

REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility(uuid, text) TO service_role;
