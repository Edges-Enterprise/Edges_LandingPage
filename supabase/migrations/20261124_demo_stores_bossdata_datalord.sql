-- 20261124_demo_stores_bossdata_datalord.sql
--
-- Two demonstration stores for marketing campaigns:
--
--   bossdata   ng   boss-topup   NGN
--   datalord   gh   topup-yaw    GHS
--
-- They are ordinary stores. The storefront, dashboard, catalog, purchase
-- orchestrator and wallet reads all run unmodified against them; nothing in
-- the application is special-cased for a demo store.
--
-- MARKING
-- Every row this file writes carries the DT marker, so seeded data is always
-- distinguishable from real data:
--
--   store_slug                   bossdata / datalord
--   auth + customer emails       dt.*@edges.demo
--   ledger references            DT-DEP-*    owner deposit
--                                CDEP-DT-*   customer deposit mirror
--                                DTO-*       order / purchase
--   metadata                     {"seed":"dt", ...}
--
-- BALANCES ARE DERIVED, NOT ASSIGNED
-- The ledger is not inflated towards a round target. Balances are the
-- arithmetic result of the generated history, following the settlement rule
-- in 20261123_customer_deposits_fund_reseller_balance.sql:
--
--   customer wallet  -= selling price
--   reseller balance -= platform cost
--
-- so
--
--   balance = customer float + owner deposit + profit earned
--
-- and a store with real trading history cannot sit on a round number. The
-- deposit amounts are believable round figures; what survives after the
-- customers buy is uneven, which is the point.
--
-- PRICING
-- Both stores sell plans whose cost currency equals the store currency
-- (Lizzysub NGN in an NG store, Accragh GHS in a GH store). That is the
-- pricing pipeline's HOME case, where the platform markup is 0, so
-- cost = base_price and the store's own markup is pure profit:
--
--   cost    = base_price
--   selling = round(base_price * (1 + store_markup), 2)
--
-- Mirrors computePrice() in supabase/functions/_shared/currency/pricing.ts.
--
-- Idempotent: re-running removes the previous seed for these two slugs and
-- rebuilds it. It never touches another store.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Remove a previous run (scoped to these two slugs only)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM public.global_reseller_applications
  WHERE store_slug IN ('bossdata', 'datalord');

  IF v_ids IS NOT NULL THEN
    DELETE FROM public.global_order_status_history      WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_withdrawals               WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_customer_transactions     WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_customer_wallets          WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_orders                    WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_transactions              WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_customers                 WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_reseller_plan_configs     WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_reseller_store_settings   WHERE application_id = ANY (v_ids);
    DELETE FROM public.global_reseller_onboarding       WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_virtual_accounts          WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_customer_virtual_accounts WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_wallets                   WHERE reseller_id = ANY (v_ids);
    DELETE FROM public.global_reseller_settings WHERE auth_user_id IN (
      SELECT auth_user_id FROM public.global_reseller_applications WHERE id = ANY (v_ids)
    );
    DELETE FROM public.global_reseller_applications     WHERE id = ANY (v_ids);
  END IF;

  DELETE FROM auth.identities WHERE user_id IN (
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000002'
  );
  DELETE FROM auth.users WHERE id IN (
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000002'
  );
END $$;

-- ---------------------------------------------------------------------------
-- 2. Auth users (email/password sign-in)
--    Written directly so this migration is self-contained; the app's own
--    signup path uses the Admin API instead. Password: DemoStore@2026
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token
)
-- GoTrue reads these token columns as text and fails the whole login with
-- "Database error querying schema" when they are NULL, so they are set to
-- empty strings rather than left to the column default.
SELECT
  '00000000-0000-0000-0000-000000000000',
  u.id, 'authenticated', 'authenticated', u.email,
  crypt('DemoStore@2026', gen_salt('bf')),
  now(), now() - interval '96 days', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  u.meta, false, false,
  '', '', '', '', '', '', '', ''
FROM (VALUES
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'dt.bossdata@edges.demo',
   '{"role":"reseller","store_slug":"bossdata","store_name":"BossData","country_code":"ng","seed":"dt"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000002'::uuid, 'dt.datalord@edges.demo',
   '{"role":"reseller","store_slug":"datalord","store_name":"DataLord","country_code":"gh","seed":"dt"}'::jsonb)
) AS u(id, email, meta)
WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.email = u.email);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', u.id::text, now(), now(), now()
FROM (VALUES
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'dt.bossdata@edges.demo'),
  ('d1000000-0000-4000-8000-000000000002'::uuid, 'dt.datalord@edges.demo')
) AS u(id, email)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

-- ---------------------------------------------------------------------------
-- 3. The stores
-- ---------------------------------------------------------------------------
INSERT INTO public.global_reseller_applications (
  id, first_name, last_name, email, original_email, auth_email, phone,
  country_code, store_name, store_slug, brand_color, android_app,
  application_status, agreed, auth_user_id, temp_password,
  dashboard_token, submitted_at, approved_at,
  branding_updated_at, password_changed_at,
  catalog_mode, default_markup_type, default_markup_value,
  transaction_pin, notifications_enabled
) VALUES
  (
    'd2000000-0000-4000-8000-000000000001',
    'Boss', 'Data', 'dt.bossdata@edges.demo', 'dt.bossdata@edges.demo',
    'dt.bossdata@edges.demo', '08030000001',
    'ng', 'BossData', 'bossdata', '#1D4ED8', true,
    'active', true, 'd1000000-0000-4000-8000-000000000001', 'DemoStore@2026',
    'dt_bossdata_dashboard_token_2026',
    now() - interval '96 days', now() - interval '96 days',
    now() - interval '96 days', now() - interval '96 days',
    'selected', 'percentage', 8, '1234', true
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'Yaw', 'Mensah', 'dt.datalord@edges.demo', 'dt.datalord@edges.demo',
    'dt.datalord@edges.demo', '0243000002',
    'gh', 'DataLord', 'datalord', '#0F766E', true,
    'active', true, 'd1000000-0000-4000-8000-000000000002', 'DemoStore@2026',
    'dt_datalord_dashboard_token_2026',
    now() - interval '88 days', now() - interval '88 days',
    now() - interval '88 days', now() - interval '88 days',
    'selected', 'percentage', 10, '1234', true
  );

INSERT INTO public.global_reseller_store_settings (
  application_id, welcome_message, store_status, contact_phone, store_subtext
) VALUES
  ('d2000000-0000-4000-8000-000000000001',
   'Welcome to BossData!', 'active', '08030000001',
   'Instant data, airtime and bills — delivered in seconds.'),
  ('d2000000-0000-4000-8000-000000000002',
   'Welcome to DataLord!', 'active', '0243000002',
   'Ghana''s fastest data bundles — MTN, AirtelTigo and Telecel.');

INSERT INTO public.global_reseller_onboarding (reseller_id, dismissed_at, completed_at)
VALUES
  ('d2000000-0000-4000-8000-000000000001', now() - interval '90 days', now() - interval '90 days'),
  ('d2000000-0000-4000-8000-000000000002', now() - interval '85 days', now() - interval '85 days');

INSERT INTO public.global_reseller_settings (auth_user_id, notification_settings)
VALUES
  ('d1000000-0000-4000-8000-000000000001',
   '{"order_updates": true, "build_updates": true, "marketing_emails": false}'::jsonb),
  ('d1000000-0000-4000-8000-000000000002',
   '{"order_updates": true, "build_updates": true, "marketing_emails": false}'::jsonb);

-- Settlement account. getStoreReadiness() requires an active row here or the
-- storefront disables every Buy button ("still setting up their payment
-- system"). The number is deliberately not a live account - all zeroes, and
-- the name says DEMO - so nobody can send real money to it. These stores take
-- no real deposits; their customers are seeded.
INSERT INTO public.global_virtual_accounts (
  reseller_id, account_number, bank_name, account_name,
  provider, account_type, status, tracking_reference
) VALUES
  ('d2000000-0000-4000-8000-000000000001', '0000000001', 'PalmPay',
   'DEMO - BossData (seed, do not fund)', 'xixapay', 'static', 'active', 'dt-bossdata-va'),
  ('d2000000-0000-4000-8000-000000000002', '0000000002', 'PalmPay',
   'DEMO - DataLord (seed, do not fund)', 'xixapay', 'static', 'active', 'dt-datalord-va');

INSERT INTO public.global_wallets (reseller_id, balance, currency, status, created_at, updated_at)
VALUES
  ('d2000000-0000-4000-8000-000000000001', 0, 'NGN', 'active', now() - interval '96 days', now()),
  ('d2000000-0000-4000-8000-000000000002', 0, 'GHS', 'active', now() - interval '88 days', now());

-- ---------------------------------------------------------------------------
-- 4. Activated catalog
--    The real provider plans for each store's own country. selling_price stays
--    NULL on purpose: the pipeline treats a stored price as a cache and always
--    recomputes from the markup, so leaving it null keeps the data honest.
-- ---------------------------------------------------------------------------
INSERT INTO public.global_reseller_plan_configs (
  reseller_id, plan_id, enabled, markup_type, markup_value, selling_price
)
SELECT
  'd2000000-0000-4000-8000-000000000001', p.id, true, 'percentage', 8, NULL
FROM public.global_base_plans p
WHERE p.is_active
  AND lower(p.country_code) = 'ng'
  AND p.provider = 'lizzysub'
  AND p.category = 'data'
  AND p.price_type = 'FIXED'
ON CONFLICT (reseller_id, plan_id) DO UPDATE
  SET enabled = true, markup_type = 'percentage', markup_value = 8, selling_price = NULL;

INSERT INTO public.global_reseller_plan_configs (
  reseller_id, plan_id, enabled, markup_type, markup_value, selling_price
)
SELECT
  'd2000000-0000-4000-8000-000000000002', p.id, true, 'percentage', 10, NULL
FROM public.global_base_plans p
WHERE p.is_active
  AND lower(p.country_code) = 'gh'
  AND p.provider = 'accragh'
  AND p.category = 'data'
  AND p.price_type = 'FIXED'
ON CONFLICT (reseller_id, plan_id) DO UPDATE
  SET enabled = true, markup_type = 'percentage', markup_value = 10, selling_price = NULL;

-- ---------------------------------------------------------------------------
-- 5. Customers
-- ---------------------------------------------------------------------------
INSERT INTO public.global_customers (
  reseller_id, first_name, last_name, email, phone, city, state, country,
  status, created_at, auth_email, transaction_pin, notifications_enabled
)
SELECT
  s.reseller_id, c.first_name, c.last_name,
  'dt.' || s.slug || '.' || c.n || '@edges.demo',
  c.phone, c.city, c.state, s.country_name,
  'active',
  now() - (c.days_ago || ' days')::interval,
  'dt.' || s.slug || '.' || c.n || '@edges.demo',
  '1234', true
FROM (VALUES
  ('d2000000-0000-4000-8000-000000000001'::uuid, 'bossdata', 'Nigeria', 35),
  ('d2000000-0000-4000-8000-000000000002'::uuid, 'datalord', 'Ghana',   17)
) AS s(reseller_id, slug, country_name, n_customers)
CROSS JOIN LATERAL (
  SELECT g.n,
         (ARRAY['Chinedu','Aisha','Tunde','Ngozi','Emeka','Fatima','Segun','Blessing',
                'Ibrahim','Chioma','Yusuf','Adaeze','Musa','Oluwaseun','Halima','Ifeanyi',
                'Zainab','Kelechi','Bola','Amaka','Sani','Temi','Uche','Rukayat','Femi',
                'Nneka','Bashir','Ope','Sade','Kunle','Hauwa','Chidi','Yemi','Amina','Gbenga'])[g.n] AS first_name,
         (ARRAY['Okafor','Bello','Adeyemi','Eze','Ibrahim','Olawale','Nwosu','Abdullahi',
                'Adebayo','Obi','Sule','Okonkwo','Balogun','Umar','Afolabi','Chukwu',
                'Lawal','Onyeka','Danjuma','Ojo','Mohammed','Ekwueme','Salami','Nwachukwu',
                'Ajayi','Garba','Ogbonna','Yakubu','Olawunmi','Ezeani','Bakare','Odom',
                'Aliyu','Ikenna','Oyelaran'])[g.n] AS last_name,
         '080' || lpad((30000000 + g.n * 137)::text, 8, '0') AS phone,
         (ARRAY['Lagos','Abuja','Kano','Ibadan','Enugu','Port Harcourt','Kaduna','Benin City'])[1 + (g.n % 8)] AS city,
         (ARRAY['Lagos','FCT','Kano','Oyo','Enugu','Rivers','Kaduna','Edo'])[1 + (g.n % 8)] AS state,
         2 + (g.n * 7) % 86 AS days_ago
  FROM generate_series(1, s.n_customers) AS g(n)
) AS c
ON CONFLICT (reseller_id, email) DO NOTHING;

INSERT INTO public.global_customer_wallets (
  reseller_id, customer_id, balance, currency, total_spent, status, created_at, updated_at
)
SELECT c.reseller_id, c.id, 0, w.currency, 0, 'active', c.created_at, now()
FROM public.global_customers c
JOIN public.global_wallets w ON w.reseller_id = c.reseller_id
WHERE c.reseller_id IN (
  'd2000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000002'
)
ON CONFLICT (reseller_id, customer_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Trading history
--
-- Per store: one owner deposit, then for each customer a deposit followed by
-- 1..n purchases, walking both wallets exactly as the live settlement does:
--
--   customer wallet  += deposit, then -= selling price per purchase
--   reseller balance += deposit, then -= platform cost per purchase
--
-- Both ledgers are consistent with the balances, so the store reconciles as
--
--   balance = owner deposit + customer float + profit earned
--
-- Two passes. The first works out what every customer will spend. The second
-- sizes their deposits so the surviving float is exactly the requested figure,
-- while each deposit stays a believable amount. The balance is then
-- owner deposit + float + profit, and profit is what makes it land on a
-- non-round number: a demo store sitting on exactly 260,000.00 would look
-- staged, and the whole point is that it looks traded.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  s               record;
  v_cust_ids      uuid[];
  v_plan_ids      uuid[];
  v_plan_names    text[];
  v_plan_nets     text[];
  v_plan_bases    numeric[];
  v_spend         numeric[];
  v_deposits      numeric[];
  v_shares        numeric[];
  v_n_cust        int;
  v_n_orders      int;
  v_i             int;
  v_j             int;
  v_cust_idx      int;
  v_plan_idx      int;
  v_cust_id       uuid;
  v_wallet_id     uuid;
  v_plan_id       uuid;
  v_base          numeric;
  v_selling       numeric;
  v_profit        numeric;
  v_orders_for    int[];
  v_cust_balance  numeric;
  v_float         numeric;
  v_bal           numeric;
  v_profit_total  numeric;
  v_ts            timestamptz;
  v_order_id      uuid;
  v_cust_name     text;
  v_cust_email    text;
  v_ref           text;
  v_seq           int;
  v_share_total   numeric;
  v_remainder     numeric;
  v_own_money     numeric;
  v_wd            record;
  v_bonus_award   numeric;
  v_bonus_left    numeric;
  v_currency      text;
BEGIN
  FOR s IN
    SELECT * FROM (VALUES
      ('d2000000-0000-4000-8000-000000000001'::uuid, 'bossdata', 40000::numeric, 50, 8::numeric, 220000::numeric),
      ('d2000000-0000-4000-8000-000000000002'::uuid, 'datalord',   500::numeric, 25, 10::numeric,  16500::numeric)
    ) AS t(app_id, slug, owner_deposit, n_orders, markup, target_float)
  LOOP
    SELECT array_agg(c.id ORDER BY c.email) INTO v_cust_ids
    FROM public.global_customers c WHERE c.reseller_id = s.app_id;
    v_n_cust := coalesce(array_length(v_cust_ids, 1), 0);
    CONTINUE WHEN v_n_cust = 0;

    -- The cheapest plans this store sells: the bundles customers buy
    -- repeatedly, rather than one-off premium plans.
    SELECT array_agg(id), array_agg(name), array_agg(net), array_agg(base)
      INTO v_plan_ids, v_plan_names, v_plan_nets, v_plan_bases
    FROM (
      SELECT p.id, p.name, coalesce(p.network, p.provider) AS net, p.base_price AS base
      FROM public.global_base_plans p
      JOIN public.global_reseller_plan_configs cfg
        ON cfg.plan_id = p.id AND cfg.reseller_id = s.app_id AND cfg.enabled
      WHERE p.is_active
      ORDER BY p.base_price, p.provider_plan_id
      LIMIT 12
    ) AS pool;
    CONTINUE WHEN v_plan_ids IS NULL;

    v_n_orders := s.n_orders;

    -- Spread n_orders over n_cust so every customer trades at least once.
    v_orders_for := array_fill(1, ARRAY[v_n_cust]);
    FOR v_j IN v_n_cust + 1 .. v_n_orders LOOP
      v_cust_idx := ((v_j - 1) % v_n_cust) + 1;
      v_orders_for[v_cust_idx] := v_orders_for[v_cust_idx] + 1;
    END LOOP;

    -- Pass 1: what each customer will spend. Plan choice is deterministic in
    -- (customer, order), so this matches the orders written below exactly.
    v_spend := ARRAY(SELECT 0::numeric FROM generate_series(1, v_n_cust));
    FOR v_i IN 1..v_n_cust LOOP
      FOR v_j IN 1..v_orders_for[v_i] LOOP
        v_plan_idx := 1 + ((v_i * 3 + v_j * 5) % array_length(v_plan_ids, 1));
        v_spend[v_i] := v_spend[v_i]
          + round(v_plan_bases[v_plan_idx] * (1 + s.markup / 100), 2);
      END LOOP;
    END LOOP;

    -- Uneven share of the target float per customer (0.55x-1.45x of an equal
    -- split, normalised so the shares sum to the target).
    v_shares := ARRAY(
      SELECT (s.target_float / v_n_cust) * (0.55 + ((g.n * 37) % 91) / 100.0)
      FROM generate_series(1, v_n_cust) AS g(n)
    );
    SELECT sum(x) INTO v_share_total FROM unnest(v_shares) AS x;
    v_shares := ARRAY(
      SELECT round(x * (s.target_float / v_share_total), 2)
      FROM unnest(v_shares) AS x
    );

    -- Deposits: spend + that customer's float share, rounded to a believable
    -- hundred. The final customer absorbs the rounding remainder, so the float
    -- that survives is exactly the target rather than an approximation.
    v_deposits := ARRAY(
      SELECT ceil((v_spend[g.n] + v_shares[g.n]) / 100.0) * 100
      FROM generate_series(1, v_n_cust) AS g(n)
    );
    SELECT sum(x) INTO v_remainder FROM unnest(v_deposits) AS x;
    v_remainder := (SELECT sum(x) FROM unnest(v_spend) AS x) + s.target_float
                   - v_remainder;
    v_deposits[v_n_cust] := v_deposits[v_n_cust] + v_remainder;

    -- The owner funds the store before anything else happens.
    INSERT INTO public.global_transactions (
      reseller_id, type, amount, description, status, reference, metadata,
      created_at, payment_gateway
    ) VALUES (
      s.app_id, 'credit', s.owner_deposit,
      'Wallet funding - store opening balance',
      'completed', 'DT-DEP-' || upper(s.slug),
      jsonb_build_object('seed', 'dt', 'kind', 'owner_deposit'),
      now() - interval '94 days', 'manual'
    );

    v_bal          := s.owner_deposit;
    v_float        := 0;
    v_profit_total := 0;
    v_seq          := 0;

    -- Pass 2: write the history.
    FOR v_i IN 1..v_n_cust LOOP
      v_cust_id := v_cust_ids[v_i];

      SELECT cw.id INTO v_wallet_id
      FROM public.global_customer_wallets cw
      WHERE cw.reseller_id = s.app_id AND cw.customer_id = v_cust_id;

      SELECT trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')),
             c.email
        INTO v_cust_name, v_cust_email
      FROM public.global_customers c WHERE c.id = v_cust_id;

      v_ts := now() - interval '80 days' + (v_i * interval '1 day')
                       + ((v_i * 13) % 20) * interval '1 hour';
      IF v_ts > now() - interval '2 days' THEN
        v_ts := now() - interval '2 days' - (v_i * interval '37 minutes');
      END IF;

      INSERT INTO public.global_customer_transactions (
        reseller_id, customer_id, type, amount, fee, net_amount,
        previous_balance, new_balance, reference, status, metadata,
        description, payment_gateway, created_at, updated_at
      ) VALUES (
        s.app_id, v_cust_id, 'deposit', v_deposits[v_i], 0, v_deposits[v_i],
        0, v_deposits[v_i], 'DT-CDEP-' || upper(s.slug) || '-' || v_i,
        'completed',
        jsonb_build_object('seed', 'dt', 'kind', 'customer_deposit'),
        'Wallet funding', 'xixapay', v_ts, v_ts
      ) RETURNING id INTO v_order_id;

      INSERT INTO public.global_transactions (
        reseller_id, type, amount, description, status, reference, metadata,
        created_at, payment_gateway
      ) VALUES (
        s.app_id, 'credit', v_deposits[v_i],
        'Customer deposit - ' || v_cust_name,
        'completed', 'CDEP-DT-' || upper(s.slug) || '-' || v_i,
        jsonb_build_object('seed', 'dt', 'kind', 'customer_deposit',
                           'customer_tx_id', v_order_id, 'customer_name', v_cust_name),
        v_ts, 'xixapay'
      );

      -- Credit the customer wallet: this is the deposit landing.
      UPDATE public.global_customer_wallets
      SET balance = balance + v_deposits[v_i], updated_at = v_ts
      WHERE id = v_wallet_id;

      v_bal          := v_bal + v_deposits[v_i];
      v_cust_balance := v_deposits[v_i];

      -- Purchases, after the deposit. Running balances are tracked so the
      -- customer's history reads like a real statement.
      FOR v_j IN 1..v_orders_for[v_i] LOOP
        v_seq := v_seq + 1;
        v_plan_idx := 1 + ((v_i * 3 + v_j * 5) % array_length(v_plan_ids, 1));
        v_plan_id  := v_plan_ids[v_plan_idx];
        v_base     := v_plan_bases[v_plan_idx];
        v_selling  := round(v_base * (1 + s.markup / 100), 2);
        v_profit   := v_selling - v_base;

        -- The most recent orders land within the last few hours, so the
        -- dashboard shows trading happening now rather than a stale history.
        v_ts := now()
                - ((v_n_orders - v_seq) * interval '17 hours')
                - (((v_i * 7 + v_j * 11) % 90) * interval '1 minute');
        IF v_ts > now() THEN
          v_ts := now() - (v_j * interval '7 minutes');
        END IF;

        v_ref := 'DTO-' || upper(s.slug) || '-' || lpad(v_seq::text, 4, '0');

        INSERT INTO public.global_orders (
          reseller_id, customer_id, customer_name, plan_id, plan_name,
          amount, profit, status, payment_method, transaction_reference,
          metadata, created_at, updated_at
        ) VALUES (
          s.app_id, v_cust_id, v_cust_name, v_plan_id, v_plan_names[v_plan_idx],
          v_selling, v_profit, 'completed', 'wallet', v_ref,
          jsonb_build_object('seed', 'dt', 'plan_id', v_plan_id,
                             'plan_name', v_plan_names[v_plan_idx],
                             'customer_email', v_cust_email,
                             'customer_name', v_cust_name,
                             'cost_price', v_base, 'selling_price', v_selling,
                             'profit', v_profit, 'kind', 'customer_purchase',
                             'network', v_plan_nets[v_plan_idx]),
          v_ts, v_ts
        ) RETURNING id INTO v_order_id;

        INSERT INTO public.global_order_status_history (
          order_id, reseller_id, from_status, to_status, changed_by_email, created_at
        ) VALUES (
          v_order_id, s.app_id, 'pending', 'completed',
          'dt.' || s.slug || '@edges.demo', v_ts
        );

        INSERT INTO public.global_customer_transactions (
          reseller_id, customer_id, type, amount, fee, net_amount,
          previous_balance, new_balance, reference, order_id, plan_id, status,
          metadata, description, created_at, updated_at
        ) VALUES (
          s.app_id, v_cust_id, 'purchase', v_selling, 0, v_selling,
          v_cust_balance, v_cust_balance - v_selling, v_ref, v_order_id, v_plan_id,
          'completed',
          jsonb_build_object('seed', 'dt', 'plan_name', v_plan_names[v_plan_idx],
                             'network', v_plan_nets[v_plan_idx],
                             'cost_price', v_base, 'selling_price', v_selling,
                             'profit', v_profit),
          'Purchased ' || v_plan_names[v_plan_idx]
            || ' (' || v_plan_nets[v_plan_idx] || ')', v_ts, v_ts
        );

        INSERT INTO public.global_transactions (
          reseller_id, type, amount, description, status, reference, metadata,
          created_at, payment_gateway
        ) VALUES (
          s.app_id, 'purchase', v_selling,
          'Customer purchase - ' || v_cust_name || ' - ' || v_plan_names[v_plan_idx]
            || ' (' || v_plan_nets[v_plan_idx] || ')',
          'completed', v_ref,
          jsonb_build_object('seed', 'dt', 'order_id', v_order_id, 'plan_id', v_plan_id,
                             'plan_name', v_plan_names[v_plan_idx],
                             'customer_name', v_cust_name,
                             'cost_price', v_base, 'selling_price', v_selling,
                             'profit', v_profit, 'kind', 'customer_purchase'),
          v_ts, 'lizzysub'
        );

        -- Settlement: the customer pays the selling price, the store pays the
        -- platform cost. The difference stays as profit.
        UPDATE public.global_customer_wallets
        SET balance = balance - v_selling,
            total_spent = total_spent + v_selling,
            updated_at = v_ts
        WHERE id = v_wallet_id;

        v_cust_balance := v_cust_balance - v_selling;
        v_bal          := v_bal - v_base;
        v_profit_total := v_profit_total + v_profit;
      END LOOP;

      v_float := v_float + v_cust_balance;
    END LOOP;

    -- -----------------------------------------------------------------
    -- Withdrawals and bonus.
    --
    -- A store that has traded for months would have paid itself out at
    -- least once, and would have collected the one-time first-deposit
    -- bonus. Leaving both at zero makes the wallet page look like an
    -- untouched account, which is the one thing these demo stores are
    -- not.
    --
    -- Two rules keep the numbers honest:
    --   1. Withdrawals come out of owner money only. Customer float is
    --      money the store owes its customers, so each payout is capped
    --      at (balance - float) and can never dig into it.
    --   2. app_bonus_claimed is set, so a later real deposit cannot
    --      award a second USD 10 bonus on top of the seeded one.
    --
    -- Amounts are deliberately not round: a payout of exactly 20,000
    -- reads as fabricated. Each is fee-bearing like a real bank payout.
    v_own_money := v_bal - v_float;

    FOR v_wd IN
      SELECT * FROM (VALUES
        -- slug,   amount,   fee,   bank,  account,      holder,             days_ago
        ('bossdata', 18500.00, 100.00, '058', '0123456789', 'Boss Data Ltd',      41),
        ('bossdata', 11750.00,  75.00, '058', '0123456789', 'Boss Data Ltd',      19),
        ('datalord',   350.00,  10.00, '022', '1098765432', 'DataLord Ventures',  33)
      ) AS t(slug, amount, fee, bank_code, acct, holder, days_ago)
      WHERE t.slug = s.slug
    LOOP
      CONTINUE WHEN v_wd.amount > v_own_money;

      INSERT INTO public.global_withdrawals (
        reseller_id, amount, fee, net_amount, status, reference,
        bank_code, account_number, account_name, created_at, updated_at
      ) VALUES (
        s.app_id, v_wd.amount, v_wd.fee, v_wd.amount - v_wd.fee,
        'completed',
        'DT-WDR-' || upper(s.slug) || '-' || v_wd.days_ago,
        v_wd.bank_code, v_wd.acct, v_wd.holder,
        now() - (v_wd.days_ago || ' days')::interval,
        now() - (v_wd.days_ago || ' days')::interval
      );

      -- request_global_withdrawal() books a payout as a 'debit' because
      -- the type check has no 'withdrawal' member; mirror that exactly.
      INSERT INTO public.global_transactions (
        reseller_id, type, amount, description, status, reference, metadata,
        created_at, payment_gateway
      ) VALUES (
        s.app_id, 'debit', v_wd.amount,
        'Withdrawal to bank account',
        'completed',
        'WDR-DT-' || upper(s.slug) || '-' || v_wd.days_ago,
        jsonb_build_object('seed', 'dt', 'kind', 'withdrawal',
                           'fee', v_wd.fee, 'net_amount', v_wd.amount - v_wd.fee),
        now() - (v_wd.days_ago || ' days')::interval, 'manual'
      );

      v_bal       := v_bal - v_wd.amount;
      v_own_money := v_own_money - v_wd.amount;
    END LOOP;

    -- Bonus balance: the USD 10 first-deposit bonus at the live FX rate,
    -- less a little already spent. Not the full award, because a store
    -- this old would have dipped into it; and not a round figure, for
    -- the same reason the withdrawals are not.
    SELECT currency INTO v_currency
    FROM public.global_wallets WHERE reseller_id = s.app_id;

    v_bonus_award := public.app_bonus_amount_local(v_currency);
    IF v_bonus_award IS NOT NULL THEN
      v_bonus_left := round(v_bonus_award * 0.3034, 2);

      UPDATE public.global_wallets
      SET bonus_balance        = v_bonus_left,
          app_bonus_claimed    = true,
          app_bonus_claimed_at = now() - interval '90 days',
          updated_at           = now()
      WHERE reseller_id = s.app_id;

      INSERT INTO public.global_transactions (
        reseller_id, type, amount, description, status, reference, metadata,
        created_at, payment_gateway
      ) VALUES (
        s.app_id, 'credit', v_bonus_award,
        'App first deposit bonus',
        'completed',
        'BONUS-APP-DT-' || upper(s.slug),
        jsonb_build_object('seed', 'dt', 'kind', 'app_first_deposit',
                           'usd_value', 10, 'currency', v_currency),
        now() - interval '90 days', 'manual'
      );

      -- The award is credited in full, then the part already used is
      -- debited, so the ledger and bonus_balance agree. Without this the
      -- history would show a 13,888.89 credit next to a 4,213.89 balance
      -- and no explanation of the difference.
      IF v_bonus_award > v_bonus_left THEN
        INSERT INTO public.global_transactions (
          reseller_id, type, amount, description, status, reference, metadata,
          created_at, payment_gateway
        ) VALUES (
          s.app_id, 'debit', v_bonus_award - v_bonus_left,
          'Bonus applied to orders',
          'completed',
          'BONUS-SPEND-DT-' || upper(s.slug),
          jsonb_build_object('seed', 'dt', 'kind', 'bonus_spend',
                             'currency', v_currency),
          now() - interval '44 days', 'manual'
        );
      END IF;
    END IF;

    UPDATE public.global_wallets
    SET balance = v_bal, updated_at = now()
    WHERE reseller_id = s.app_id;

    RAISE NOTICE 'seed % : balance=% float=% profit=% customers=% orders=%',
      s.slug, v_bal, v_float, v_profit_total, v_n_cust, v_n_orders;
  END LOOP;
END $$;

COMMIT;
