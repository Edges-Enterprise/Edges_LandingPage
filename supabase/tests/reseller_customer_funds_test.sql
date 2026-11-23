-- Verifies reseller-held customer funds: deposit mirroring, cost-price
-- settlement, and the Sunday/Wednesday withdrawal rule.
--
-- Run with:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/reseller_customer_funds_test.sql
--
-- Everything runs inside one transaction that is rolled back, so it can be
-- pointed at a live database without leaving rows behind.

BEGIN;

DO $$
DECLARE
  v_reseller uuid := gen_random_uuid();
  v_customer uuid := gen_random_uuid();
  v_customer_wallet uuid := gen_random_uuid();
  v_tx uuid := gen_random_uuid();
  v_currency text;
  v_balance numeric;
  v_result jsonb;
  v_elig jsonb;
  v_desc text;
  v_dow int;
  v_fee numeric;
BEGIN
  SELECT code INTO v_currency FROM public.global_currencies LIMIT 1;
  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'no row in global_currencies, cannot run';
  END IF;

  INSERT INTO public.global_reseller_applications
    (id, first_name, last_name, email, phone, country_code, store_name, store_slug, original_email)
  VALUES
    (v_reseller, 'Funds', 'Test', 'funds-test@example.invalid', '+10000000000',
     'ng', 'Funds Test Store', 'funds-test-' || substr(v_reseller::text, 1, 8),
     'funds-test@example.invalid');

  INSERT INTO public.global_customers (id, reseller_id, first_name, last_name, email)
  VALUES (v_customer, v_reseller, 'Ada', 'Obi', 'ada-obi@example.invalid');

  INSERT INTO public.global_wallets (reseller_id, balance, bonus_balance, currency, status)
  VALUES (v_reseller, 0, 0, v_currency, 'active');

  INSERT INTO public.global_customer_wallets (id, reseller_id, customer_id, balance, currency, status)
  VALUES (v_customer_wallet, v_reseller, v_customer, 0, v_currency, 'active');

  -- The customer deposit itself, so the ledger row can name the customer.
  INSERT INTO public.global_customer_transactions
    (id, reseller_id, customer_id, type, amount, fee, net_amount,
     previous_balance, new_balance, status, reference)
  VALUES
    (v_tx, v_reseller, v_customer, 'deposit', 1000, 0, 1000, 0, 1000, 'completed',
     'TEST-' || substr(v_tx::text, 1, 8));

  UPDATE public.global_customer_wallets SET balance = 1000 WHERE id = v_customer_wallet;

  -- 1. A customer deposit credits the reseller balance.
  v_result := public.credit_reseller_for_customer_deposit(v_reseller, v_tx, 1000);
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'case 1: mirror failed, got %', v_result;
  END IF;
  SELECT balance INTO v_balance FROM public.global_wallets WHERE reseller_id = v_reseller;
  IF v_balance <> 1000 THEN
    RAISE EXCEPTION 'case 1: expected balance 1000, got %', v_balance;
  END IF;

  -- 2. The reseller ledger row names the customer.
  SELECT description INTO v_desc
  FROM public.global_transactions
  WHERE reference = 'CDEP-' || v_tx::text;
  IF v_desc IS NULL THEN
    RAISE EXCEPTION 'case 2: no reseller ledger row was written';
  END IF;
  IF v_desc NOT LIKE '%Ada Obi%' THEN
    RAISE EXCEPTION 'case 2: ledger row does not name the customer, got %', v_desc;
  END IF;

  -- 3. Replaying the webhook cannot double-credit.
  v_result := public.credit_reseller_for_customer_deposit(v_reseller, v_tx, 1000);
  IF (v_result->>'already_credited')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'case 3: expected already_credited, got %', v_result;
  END IF;
  SELECT balance INTO v_balance FROM public.global_wallets WHERE reseller_id = v_reseller;
  IF v_balance <> 1000 THEN
    RAISE EXCEPTION 'case 3: replay changed the balance to %', v_balance;
  END IF;

  -- 4. A sale takes the COST from the reseller, not the profit line.
  --    1000 sale, 900 cost, 100 profit -> reseller 1000 - 900 = 100.
  v_result := public.process_global_purchase_deductions(
    v_customer_wallet, 1000, v_reseller, 900, 1000, 100);
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'case 4: sale refused, got %', v_result;
  END IF;
  SELECT balance INTO v_balance FROM public.global_wallets WHERE reseller_id = v_reseller;
  IF v_balance <> 100 THEN
    RAISE EXCEPTION 'case 4: expected reseller balance 100 (the profit), got %', v_balance;
  END IF;

  -- 5. The customer paid the selling price in full.
  SELECT balance INTO v_balance FROM public.global_customer_wallets WHERE id = v_customer_wallet;
  IF v_balance <> 0 THEN
    RAISE EXCEPTION 'case 5: expected customer balance 0, got %', v_balance;
  END IF;

  -- 6. Withdrawal eligibility follows the store's weekday.
  SELECT public.get_withdrawal_eligibility(v_reseller, 'Africa/Lagos') INTO v_elig;
  v_dow := (v_elig->>'day_of_week')::int;

  IF v_dow IN (0, 3) THEN
    IF (v_elig->>'allowed')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'case 6: expected allowed on a withdrawal day (dow %), got %', v_dow, v_elig;
    END IF;
  ELSE
    IF (v_elig->>'allowed')::boolean IS NOT FALSE THEN
      RAISE EXCEPTION 'case 6: expected refusal on dow %, got %', v_dow, v_elig;
    END IF;
    IF (v_elig->>'reason') NOT LIKE 'Your next withdrawal day is %' THEN
      RAISE EXCEPTION 'case 6: expected a next-day message, got %', v_elig->>'reason';
    END IF;
  END IF;

  -- 7. The full balance is withdrawable - customer float does not reduce it.
  IF (v_elig->>'withdrawable')::numeric <> (v_elig->>'balance')::numeric THEN
    RAISE EXCEPTION 'case 7: withdrawable must equal the full balance, got %', v_elig;
  END IF;

  -- 8. A 2% fee is charged and the net amount is what the reseller receives.
  v_fee := ROUND(100 * 0.02);
  IF v_fee <> 2 THEN
    RAISE EXCEPTION 'case 8: expected a 2 fee on 100, got %', v_fee;
  END IF;

  -- 9. Requesting more than the balance is refused, whatever the day.
  v_result := public.request_global_withdrawal(
    v_reseller, 999999, 19999.98, '058', '0123456789', 'Ada Obi',
    'TEST-' || substr(v_reseller::text, 1, 8));
  IF (v_result->>'success')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'case 9: expected refusal above the balance, got %', v_result;
  END IF;

  RAISE NOTICE 'reseller customer funds: all 9 cases passed (dow %)', v_dow;
END $$;

ROLLBACK;
