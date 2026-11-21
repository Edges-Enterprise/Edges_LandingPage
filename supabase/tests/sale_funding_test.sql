-- Verifies the sale funding rule against the real database functions.
--
-- Run with:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sale_funding_test.sql
--
-- Everything runs inside one transaction that is rolled back, so it can be
-- pointed at a live database without leaving rows behind. Each case asserts
-- with a raised exception, so the first failure stops the run.

BEGIN;

DO $$
DECLARE
  v_reseller uuid := gen_random_uuid();
  v_customer uuid := gen_random_uuid();
  v_wallet uuid := gen_random_uuid();
  v_customer_wallet uuid := gen_random_uuid();
  v_currency text;
  v_funding jsonb;
  v_result jsonb;
  v_balance numeric;
  v_bonus numeric;
BEGIN
  SELECT code INTO v_currency FROM public.global_currencies LIMIT 1;
  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'no row in global_currencies, cannot run';
  END IF;

  INSERT INTO public.global_reseller_applications
    (id, first_name, last_name, email, phone, country_code, store_name, store_slug, original_email)
  VALUES
    (v_reseller, 'Test', 'Reseller', 'funding-test@example.invalid', '+10000000000',
     'rw', 'Funding Test Store', 'funding-test-' || substr(v_reseller::text, 1, 8),
     'funding-test@example.invalid');

  INSERT INTO public.global_customers (id, reseller_id, first_name, last_name, email)
  VALUES (v_customer, v_reseller, 'Test', 'Customer', 'funding-customer@example.invalid');

  -- Start with a balance too small to cover any cost below, and a bonus large
  -- enough to stand in for the lost sales.
  INSERT INTO public.global_wallets (id, reseller_id, balance, bonus_balance, currency, status)
  VALUES (v_wallet, v_reseller, 1000, 13000, v_currency, 'active');

  INSERT INTO public.global_customer_wallets (id, reseller_id, customer_id, balance, currency, status)
  VALUES (v_customer_wallet, v_reseller, v_customer, 100000, v_currency, 'active');

  -- 1. Balance covers the cost: the bonus must not move.
  SELECT public.get_global_sale_funding(v_reseller, 450, 500) INTO v_funding;
  IF v_funding->>'mode' <> 'balance' THEN
    RAISE EXCEPTION 'case 1: expected mode balance, got %', v_funding;
  END IF;

  -- 2. Balance below cost, bonus covers the whole selling price: fundable by bonus.
  SELECT public.get_global_sale_funding(v_reseller, 4500, 5000) INTO v_funding;
  IF (v_funding->>'can_fund')::boolean IS NOT TRUE OR v_funding->>'mode' <> 'bonus' THEN
    RAISE EXCEPTION 'case 2: expected fundable by bonus, got %', v_funding;
  END IF;

  -- 3. Bonus cannot cover the full selling price: refused, not part-funded.
  --    Balance 1000 >= cost 4000 is false, bonus 13000 >= 20000 is false.
  SELECT public.get_global_sale_funding(v_reseller, 4000, 20000) INTO v_funding;
  IF (v_funding->>'can_fund')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'case 3: expected refusal, got %', v_funding;
  END IF;

  -- 4. A refused sale must leave both wallets untouched.
  v_result := public.process_global_purchase_deductions(v_customer_wallet, 20000, v_reseller, 4000, 20000, 16000);
  IF (v_result->>'success')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'case 4: settlement should have refused, got %', v_result;
  END IF;
  SELECT balance, bonus_balance INTO v_balance, v_bonus FROM public.global_wallets WHERE reseller_id = v_reseller;
  IF v_balance <> 1000 OR v_bonus <> 13000 THEN
    RAISE EXCEPTION 'case 4: refused sale changed the wallet (balance %, bonus %)', v_balance, v_bonus;
  END IF;

  -- 5. Bonus-funded sale: bonus burns the full selling price, only profit lands
  --    in the balance. 5000 sale, 4500 cost, 500 profit.
  v_result := public.process_global_purchase_deductions(v_customer_wallet, 5000, v_reseller, 4500, 5000, 500);
  IF (v_result->>'success')::boolean IS NOT TRUE OR (v_result->>'bonus_covered_sale')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'case 5: expected a bonus-covered sale, got %', v_result;
  END IF;
  SELECT balance, bonus_balance INTO v_balance, v_bonus FROM public.global_wallets WHERE reseller_id = v_reseller;
  IF v_balance <> 1500 OR v_bonus <> 8000 THEN
    RAISE EXCEPTION 'case 5: expected balance 1500 bonus 8000, got balance % bonus %', v_balance, v_bonus;
  END IF;

  -- 6. A second bonus-funded sale drains the bonus to exactly zero.
  --    8000 sale, 7000 cost, 1000 profit.
  v_result := public.process_global_purchase_deductions(v_customer_wallet, 8000, v_reseller, 7000, 8000, 1000);
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'case 6: expected success, got %', v_result;
  END IF;
  SELECT balance, bonus_balance INTO v_balance, v_bonus FROM public.global_wallets WHERE reseller_id = v_reseller;
  IF v_balance <> 2500 OR v_bonus <> 0 THEN
    RAISE EXCEPTION 'case 6: expected balance 2500 bonus 0, got balance % bonus %', v_balance, v_bonus;
  END IF;

  -- 7. With the bonus spent, an unaffordable sale is refused again.
  --    3000 sale, 2800 cost, balance 2500 < 2800, bonus 0 < 3000.
  v_result := public.process_global_purchase_deductions(v_customer_wallet, 3000, v_reseller, 2800, 3000, 200);
  IF (v_result->>'success')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'case 7: expected refusal after the bonus ran out, got %', v_result;
  END IF;

  -- 8. An affordable sale settles from balance and leaves the bonus alone.
  --    500 sale, 450 cost, 50 profit.
  v_result := public.process_global_purchase_deductions(v_customer_wallet, 500, v_reseller, 450, 500, 50);
  IF (v_result->>'success')::boolean IS NOT TRUE OR (v_result->>'bonus_covered_sale')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'case 8: expected a balance-funded sale, got %', v_result;
  END IF;
  SELECT balance, bonus_balance INTO v_balance, v_bonus FROM public.global_wallets WHERE reseller_id = v_reseller;
  IF v_balance <> 2550 OR v_bonus <> 0 THEN
    RAISE EXCEPTION 'case 8: expected balance 2550 bonus 0, got balance % bonus %', v_balance, v_bonus;
  END IF;

  RAISE NOTICE 'sale funding rule: all 8 cases passed';
END $$;

ROLLBACK;
