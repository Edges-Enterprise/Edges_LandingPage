--
-- PostgreSQL database dump
--

\restrict qKJpb50gHLFUZINUoD5ohQ2gh3koAlEw38vioIGK7NYXptuTOWQ3pjRaRhJRdsd

-- Dumped from database version 15.8
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: auto_credit_wallet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_credit_wallet() RETURNS trigger
    LANGUAGE plpgsql
    AS $$begin
  if NEW.status = 'success' and OLD.status is distinct from NEW.status then
    update wallet
    set balance = balance + NEW.amount
    where user_email = NEW.user_email;
  end if;
  return NEW;
end;$$;


--
-- Name: calculate_discount_percentage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_discount_percentage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Calculate discount only if both prices are set, positive, and oldprice > newprice (optional sanity check)
  IF NEW.oldprice IS NOT NULL 
     AND NEW.newprice IS NOT NULL 
     AND NEW.oldprice > 0 
     AND NEW.newprice > 0  -- New: Avoid 0 newprice
     THEN
    NEW.discount_percentage := ROUND(((NEW.oldprice - NEW.newprice) / NEW.oldprice * 100)::numeric, 0)::text || '%';
  ELSE
    NEW.discount_percentage := NULL;  -- Explicitly NULL for any invalid case (including newprice=0)
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: calculate_reseller_price(numeric, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_reseller_price(base_price numeric, markup_type text, markup_value numeric) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    IF markup_type = 'percentage' THEN
        RETURN ROUND(base_price * (1 + markup_value / 100.0), 0);
    ELSE
        RETURN ROUND(base_price + markup_value, 0);
    END IF;
END;
$$;


--
-- Name: check_stock_available(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_stock_available(p_planid integer, p_quantity integer DEFAULT 1) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_available INTEGER;
  v_sold INTEGER;
  v_stock_left INTEGER;
BEGIN
  SELECT stock_available, stock_sold INTO v_available, v_sold
  FROM lizzy_flashsale
  WHERE planid = p_planid AND isflashsale = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('available', false, 'message', 'Plan not found or not in flash sale');
  END IF;
  
  v_stock_left := v_available - v_sold;
  
  IF v_stock_left >= p_quantity THEN
    RETURN json_build_object('available', true, 'stock_left', v_stock_left);
  ELSE
    RETURN json_build_object('available', false, 'stock_left', v_stock_left, 'message', 'Insufficient stock');
  END IF;
END;
$$;


--
-- Name: create_customer_wallet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_customer_wallet() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO reseller_customer_wallets (reseller_id, customer_id, balance, total_spent)
    VALUES (NEW.reseller_id, NEW.id, 0.00, 0.00);
    RETURN NEW;
END;
$$;


--
-- Name: create_default_reseller_plan_configs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_reseller_plan_configs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO reseller_plan_configs (reseller_id, plan_id, markup_type, markup_value, enabled)
    SELECT
        NEW.id,
        id,
        'percentage',
        0.00,
        true
    FROM reseller_base_plans
    WHERE is_active = true
    ON CONFLICT (reseller_id, plan_id) DO NOTHING;

    RETURN NEW;
END;
$$;


--
-- Name: create_purchase_order(uuid, text, uuid, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_purchase_order(p_reseller_id uuid, p_customer_email text, p_plan_id uuid, p_amount numeric, p_profit numeric, p_status text DEFAULT 'completed'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order_id UUID;
BEGIN
  INSERT INTO reseller_orders (
    reseller_id,
    customer_email,
    plan_id,
    amount,
    profit,
    status,
    created_at
  ) VALUES (
    p_reseller_id,
    p_customer_email,
    p_plan_id,
    p_amount,
    p_profit,
    p_status,
    NOW()
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;


--
-- Name: create_reseller_wallet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_reseller_wallet() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO reseller_wallets (reseller_id, balance, total_sales, total_profit)
    VALUES (NEW.id, 0.00, 0.00, 0.00);
    RETURN NEW;
END;
$$;


--
-- Name: deduct_reseller_cost(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_reseller_cost(p_reseller_id uuid, p_cost_price numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- 1. Lock the reseller wallet row
  SELECT balance INTO v_balance
  FROM reseller_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;
  
  -- 2. Check if reseller has enough balance
  IF v_balance < p_cost_price THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', 
      v_balance, p_cost_price;
  END IF;
  
  -- 3. ✅ JUST DEDUCT THE COST PRICE (no selling price added!)
  UPDATE reseller_wallets
  SET 
    balance = balance - p_cost_price,  -- Simple deduction
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id
  RETURNING balance INTO v_new_balance;
  
  -- 4. Return the new balance
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_deducted', p_cost_price
  );
END;
$$;


--
-- Name: get_global_reseller_build_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_build_status(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
BEGIN
  -- Get the reseller's application
  SELECT id INTO v_application_id
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_id IS NULL THEN
    RETURN json_build_object('error', 'Reseller not found');
  END IF;
  
  -- Get latest build
  SELECT json_build_object(
    'id', id,
    'build_status', build_status,
    'queued_at', queued_at,
    'building_at', building_at,
    'completed_at', completed_at,
    'apk_url', apk_url,
    'aab_url', aab_url,
    'error_message', error_message,
    'config_id', config_id
  ) INTO v_result
  FROM global_app_builds
  WHERE application_id = v_application_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_global_reseller_customer_growth(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_customer_growth(p_user_id uuid, p_days integer DEFAULT 30) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
BEGIN
  -- Get the reseller's application
  SELECT id INTO v_application_id
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_id IS NULL THEN
    RETURN json_build_object('error', 'Reseller not found');
  END IF;
  
  -- Get customer growth by day
  WITH daily_growth AS (
    SELECT
      date_trunc('day', created_at) as day,
      COUNT(*) as new_customers,
      COUNT(*) OVER (ORDER BY date_trunc('day', created_at) ROWS UNBOUNDED PRECEDING) as cumulative
    FROM global_customers
    WHERE reseller_id = v_application_id
      AND created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY date_trunc('day', created_at)
    ORDER BY day ASC
  )
  SELECT json_agg(
    json_build_object(
      'day', day,
      'new_customers', new_customers,
      'cumulative', cumulative
    )
  ) INTO v_result
  FROM daily_growth;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;


--
-- Name: get_global_reseller_dashboard_context(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_dashboard_context(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
  v_wallet JSON;
  v_stats JSON;
  v_growth JSON;
  v_metrics JSON;
  v_activity JSON;
  v_revenue JSON;
  v_top_products JSON;
  v_build_status JSON;
  v_app_config JSON;
  v_application_record RECORD;
  v_wallet_record RECORD;
BEGIN
  -- Get the reseller's application
  SELECT 
    id,
    store_name,
    store_slug,
    brand_color,
    logo_url,
    country_code,
    android_app,
    application_status,
    created_at
  INTO v_application_record
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_record.id IS NULL THEN
    RETURN json_build_object('error', 'Reseller not found');
  END IF;
  
  v_application_id := v_application_record.id;
  
  -- Get or create wallet
  INSERT INTO global_wallets (reseller_id, balance, currency, status)
  VALUES (v_application_id, 0, 'USD', 'active')
  ON CONFLICT (reseller_id) DO NOTHING
  RETURNING id, balance, currency, status INTO v_wallet_record;
  
  -- If wallet was just created, we need to fetch it
  IF v_wallet_record IS NULL THEN
    SELECT balance, currency, status INTO v_wallet_record
    FROM global_wallets
    WHERE reseller_id = v_application_id;
  END IF;
  
  -- Build wallet JSON
  v_wallet := json_build_object(
    'balance', COALESCE(v_wallet_record.balance, 0),
    'currency', COALESCE(v_wallet_record.currency, 'USD'),
    'status', COALESCE(v_wallet_record.status, 'active')
  );
  
  -- Get stats from existing tables
  SELECT json_build_object(
    'total_customers', COALESCE((SELECT COUNT(*) FROM global_customers WHERE reseller_id = v_application_id), 0),
    'total_orders', COALESCE((SELECT COUNT(*) FROM global_orders WHERE reseller_id = v_application_id), 0),
    'total_revenue', COALESCE((SELECT SUM(amount) FROM global_orders WHERE reseller_id = v_application_id AND status = 'completed'), 0),
    'total_profit', COALESCE((SELECT SUM(profit) FROM global_orders WHERE reseller_id = v_application_id AND status = 'completed'), 0),
    'orders_last_30_days', COALESCE((SELECT COUNT(*) FROM global_orders WHERE reseller_id = v_application_id AND created_at >= NOW() - INTERVAL '30 days'), 0),
    'customers_last_30_days', COALESCE((SELECT COUNT(*) FROM global_customers WHERE reseller_id = v_application_id AND created_at >= NOW() - INTERVAL '30 days'), 0)
  ) INTO v_stats;
  
  -- Get customer growth (last 30 days)
  WITH daily_growth AS (
    SELECT
      date_trunc('day', created_at)::text as day,
      COUNT(*) as new_customers,
      COUNT(*) OVER (ORDER BY date_trunc('day', created_at) ROWS UNBOUNDED PRECEDING) as cumulative
    FROM global_customers
    WHERE reseller_id = v_application_id
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
    ORDER BY day ASC
  )
  SELECT COALESCE(json_agg(row_to_json(dg)), '[]'::JSON) INTO v_growth
  FROM daily_growth dg;
  
  -- Get performance metrics
  WITH metrics AS (
    SELECT
      COALESCE(AVG(amount), 0) as avg_order_value,
      (SELECT COUNT(*) FROM global_customers WHERE reseller_id = v_application_id) as total_customers,
      0 as repeat_rate,
      0 as conversion_rate
    FROM global_orders
    WHERE reseller_id = v_application_id AND status = 'completed'
  )
  SELECT json_build_object(
    'avg_order_value', COALESCE(avg_order_value, 0),
    'total_customers', COALESCE(total_customers, 0),
    'repeat_rate', COALESCE(repeat_rate, 0),
    'conversion_rate', COALESCE(conversion_rate, 0)
  ) INTO v_metrics
  FROM metrics;
  
  -- Get recent activity (orders only for now)
  WITH activities AS (
    SELECT 
      'order' as type,
      id as entity_id,
      created_at,
      json_build_object(
        'order_id', id,
        'customer_name', customer_name,
        'amount', amount,
        'profit', profit,
        'status', status
      ) as data
    FROM global_orders
    WHERE reseller_id = v_application_id
    ORDER BY created_at DESC
    LIMIT 5
  )
  SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::JSON) INTO v_activity
  FROM activities a;
  
  -- Get revenue breakdown (monthly)
  WITH revenue_data AS (
    SELECT
      date_trunc('month', created_at)::text as period,
      COALESCE(SUM(amount), 0) as revenue,
      COALESCE(SUM(profit), 0) as profit,
      COUNT(*) as order_count
    FROM global_orders
    WHERE reseller_id = v_application_id
      AND status = 'completed'
      AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY period ASC
  )
  SELECT COALESCE(json_agg(row_to_json(rd)), '[]'::JSON) INTO v_revenue
  FROM revenue_data rd;
  
  -- Get top products
  WITH product_sales AS (
    SELECT
      plan_id,
      plan_name,
      COUNT(*) as total_orders,
      COALESCE(SUM(amount), 0) as total_revenue,
      COALESCE(AVG(amount), 0) as avg_price
    FROM global_orders
    WHERE reseller_id = v_application_id
      AND status = 'completed'
      AND plan_id IS NOT NULL
    GROUP BY plan_id, plan_name
    ORDER BY total_orders DESC
    LIMIT 5
  )
  SELECT COALESCE(json_agg(row_to_json(ps)), '[]'::JSON) INTO v_top_products
  FROM product_sales ps;
  
  -- Get build status from global_app_builds
  SELECT json_build_object(
    'id', id,
    'build_status', COALESCE(build_status, 'none'),
    'queued_at', queued_at,
    'building_at', building_at,
    'completed_at', completed_at,
    'apk_url', apk_url,
    'aab_url', aab_url,
    'error_message', error_message
  ) INTO v_build_status
  FROM global_app_builds
  WHERE application_id = v_application_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get app config from global_reseller_app_configs
  SELECT config INTO v_app_config
  FROM global_reseller_app_configs
  WHERE application_id = v_application_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Build complete response
  SELECT json_build_object(
    'application_id', v_application_id,
    'store_name', v_application_record.store_name,
    'store_slug', v_application_record.store_slug,
    'brand_color', v_application_record.brand_color,
    'logo_url', v_application_record.logo_url,
    'country_code', v_application_record.country_code,
    'android_app', v_application_record.android_app,
    'application_status', v_application_record.application_status,
    'joined_at', v_application_record.created_at,
    'wallet', v_wallet,
    'stats', v_stats,
    'growth', COALESCE(v_growth, '[]'::JSON),
    'metrics', v_metrics,
    'activity', COALESCE(v_activity, '[]'::JSON),
    'revenue', COALESCE(v_revenue, '[]'::JSON),
    'top_products', COALESCE(v_top_products, '[]'::JSON),
    'build_status', v_build_status,
    'app_config', v_app_config
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_global_reseller_dashboard_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_dashboard_stats(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
BEGIN
  -- Get the reseller's application
  SELECT id INTO v_application_id
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_id IS NULL THEN
    RETURN json_build_object('error', 'Reseller not found');
  END IF;
  
  -- Build stats - using 'amount' instead of 'total'
  WITH stats AS (
    SELECT
      (SELECT COUNT(*) FROM global_customers WHERE reseller_id = v_application_id) as total_customers,
      (SELECT COUNT(*) FROM global_orders WHERE reseller_id = v_application_id) as total_orders,
      (SELECT COALESCE(SUM(amount), 0) FROM global_orders WHERE reseller_id = v_application_id AND status = 'completed') as total_revenue,
      (SELECT COALESCE(SUM(profit), 0) FROM global_orders WHERE reseller_id = v_application_id AND status = 'completed') as total_profit,
      (SELECT COUNT(*) FROM global_orders WHERE reseller_id = v_application_id AND created_at >= NOW() - INTERVAL '30 days') as orders_last_30_days,
      (SELECT COUNT(*) FROM global_customers WHERE reseller_id = v_application_id AND created_at >= NOW() - INTERVAL '30 days') as customers_last_30_days
  )
  SELECT json_build_object(
    'total_customers', total_customers,
    'total_orders', total_orders,
    'total_revenue', total_revenue,
    'total_profit', total_profit,
    'orders_last_30_days', orders_last_30_days,
    'customers_last_30_days', customers_last_30_days
  ) INTO v_result
  FROM stats;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_global_reseller_performance_metrics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_performance_metrics(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
BEGIN
  -- Get the reseller's application
  SELECT id INTO v_application_id
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_id IS NULL THEN
    RETURN json_build_object('error', 'Reseller not found');
  END IF;
  
  -- Calculate performance metrics
  WITH metrics AS (
    SELECT
      -- Average order value
      (SELECT COALESCE(AVG(total), 0) FROM global_orders WHERE reseller_id = v_application_id AND status = 'completed') as avg_order_value,
      -- Total customers
      (SELECT COUNT(*) FROM global_customers WHERE reseller_id = v_application_id) as total_customers,
      -- Repeat customer rate
      (SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(COUNT(CASE WHEN order_count > 1 THEN 1 END)::DECIMAL / COUNT(*) * 100, 2)
        END
       FROM (
        SELECT customer_id, COUNT(*) as order_count
        FROM global_orders
        WHERE reseller_id = v_application_id AND status = 'completed'
        GROUP BY customer_id
       ) t
      ) as repeat_rate,
      -- Conversion rate (customers / visitors)
      (SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT customer_id)::DECIMAL / COUNT(DISTINCT visitor_id) * 100, 2)
        END
       FROM global_store_visits
       WHERE reseller_id = v_application_id
      ) as conversion_rate
  )
  SELECT json_build_object(
    'avg_order_value', avg_order_value,
    'total_customers', total_customers,
    'repeat_rate', repeat_rate,
    'conversion_rate', conversion_rate
  ) INTO v_result
  FROM metrics;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_global_reseller_recent_activity(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_recent_activity(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
BEGIN
  -- Get the reseller's application
  SELECT id INTO v_application_id
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_id IS NULL THEN
    RETURN json_build_object('error', 'Reseller not found');
  END IF;
  
  -- Get recent activities (orders, customers, builds)
  WITH activities AS (
    -- Orders
    SELECT
      'order' as type,
      id as entity_id,
      created_at,
      json_build_object(
        'order_id', id,
        'customer_name', customer_name,
        'total', total,
        'status', status
      ) as data
    FROM global_orders
    WHERE reseller_id = v_application_id
    ORDER BY created_at DESC
    LIMIT p_limit
  )
  SELECT json_agg(
    json_build_object(
      'type', type,
      'entity_id', entity_id,
      'created_at', created_at,
      'data', data
    )
  ) INTO v_result
  FROM activities;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;


--
-- Name: get_global_reseller_revenue_breakdown(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_revenue_breakdown(p_user_id uuid, p_period text DEFAULT 'monthly'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
  v_date_trunc TEXT;
BEGIN
  -- Get the reseller's application
  SELECT id INTO v_application_id
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;
  
  -- Set date trunc based on period
  CASE p_period
    WHEN 'daily' THEN v_date_trunc := 'day';
    WHEN 'weekly' THEN v_date_trunc := 'week';
    WHEN 'yearly' THEN v_date_trunc := 'year';
    ELSE v_date_trunc := 'month';
  END CASE;
  
  -- Build revenue breakdown - using 'amount' instead of 'total'
  WITH revenue_data AS (
    SELECT
      date_trunc(v_date_trunc, created_at) as period,
      COALESCE(SUM(amount), 0) as revenue,
      COALESCE(SUM(profit), 0) as profit,
      COUNT(*) as order_count
    FROM global_orders
    WHERE reseller_id = v_application_id
      AND status = 'completed'
      AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY date_trunc(v_date_trunc, created_at)
    ORDER BY period ASC
  )
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'period', period,
        'revenue', revenue,
        'profit', profit,
        'order_count', order_count
      )
    ),
    '[]'::JSON
  ) INTO v_result
  FROM revenue_data;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_global_reseller_top_products(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_reseller_top_products(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_application_id UUID;
  v_result JSON;
BEGIN
  -- Get the reseller's application
  SELECT id INTO v_application_id
  FROM global_reseller_applications
  WHERE auth_user_id = p_user_id;
  
  IF v_application_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;
  
  -- Get top products - using 'amount' instead of 'total'
  WITH product_sales AS (
    SELECT
      plan_id,
      plan_name,
      COUNT(*) as total_orders,
      COALESCE(SUM(amount), 0) as total_revenue,
      COALESCE(AVG(amount), 0) as avg_price
    FROM global_orders
    WHERE reseller_id = v_application_id
      AND status = 'completed'
    GROUP BY plan_id, plan_name
    ORDER BY total_orders DESC
    LIMIT p_limit
  )
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'plan_id', plan_id,
        'plan_name', plan_name,
        'total_orders', total_orders,
        'total_revenue', total_revenue,
        'avg_price', avg_price
      )
    ),
    '[]'::JSON
  ) INTO v_result
  FROM product_sales;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_reseller_balance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_reseller_balance(p_reseller_id uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT balance INTO v_balance
  FROM reseller_wallets
  WHERE reseller_id = p_reseller_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$;


--
-- Name: get_reseller_dashboard(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_reseller_dashboard(p_reseller_id uuid) RETURNS json
    LANGUAGE sql STABLE
    AS $$
SELECT json_build_object(
  'wallet', (
    SELECT json_build_object(
      'balance', balance,
      'total_sales', total_sales,
      'total_profit', total_profit
    )
    FROM reseller_wallets 
    WHERE reseller_id = p_reseller_id
  ),
  'order_count', (
    SELECT COUNT(*) 
    FROM reseller_orders 
    WHERE reseller_id = p_reseller_id
  ),
  'customer_count', (
    SELECT COUNT(*) 
    FROM reseller_customers 
    WHERE reseller_id = p_reseller_id
  ),
  'has_virtual_account', (
    SELECT EXISTS(
      SELECT 1 FROM reseller_virtual_accounts 
      WHERE reseller_id = p_reseller_id 
      AND status = 'active'
    )
  ),
  'phone', (
    SELECT phone 
    FROM resellers 
    WHERE id = p_reseller_id
  ),
  'recent_orders', (
    SELECT COALESCE(json_agg(o ORDER BY o.created_at DESC), '[]')
    FROM (
      SELECT * FROM reseller_orders 
      WHERE reseller_id = p_reseller_id 
      ORDER BY created_at DESC 
      LIMIT 5
    ) o
  )
);
$$;


--
-- Name: handle_failed_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_failed_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refund on status change to failed for negative amount
    IF OLD.status != 'failed' AND NEW.status = 'failed' AND NEW.amount < 0 THEN
        PERFORM refund_wallet_balance(NEW.user_email, ABS(COALESCE(NEW.metadata->>'actual_cost', ABS(NEW.amount)::TEXT)::NUMERIC));
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: handle_flashsale_transaction_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_flashsale_transaction_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_planid INTEGER;
  v_user_id UUID;
  v_stock_check JSON;
BEGIN
  -- Only for completed flash sales
  IF NEW.type = 'flash_sale_purchase' AND NEW.status = 'completed' THEN
    -- Extract planid from metadata (assumes it's JSONB with 'planid' key)
    v_planid := (NEW.metadata->>'planid')::INTEGER;
    
    -- Get user_id from profiles
    SELECT id INTO v_user_id FROM profiles WHERE email = NEW.user_email;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'No profile found for user_email: %', NEW.user_email;
    END IF;
    
    -- Check stock before insert (using your existing function)
    v_stock_check := check_stock_available(v_planid, 1);
    
    -- Access the 'available' property from the JSON result
    IF (v_stock_check->>'available')::BOOLEAN = false THEN
      RAISE EXCEPTION 'Flash sale plan % stock unavailable', v_planid;
    END IF;
    
    -- Insert into flashsale_purchases (triggers stock increment automatically)
    INSERT INTO flashsale_purchases (
      transaction_id, planid, user_id, phone_number, quantity, purchase_price, status
    ) VALUES (
      NEW.id, v_planid, v_user_id, 
      COALESCE((NEW.metadata->>'phone_number')::TEXT, ''),  -- From metadata if present
      1,  -- Default quantity for flash sales
      ABS(NEW.amount),  -- Use absolute value of transaction amount as price
      'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Skip resellers and reseller customers - their app code handles them
  IF NEW.raw_user_meta_data->>'role' IN ('reseller', 'customer') THEN
    RETURN NEW;
  END IF;

  -- Main store users go to profiles
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'username');

  RETURN NEW;
END;
$$;


--
-- Name: handle_purchase_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_purchase_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If status changed from 'completed' to 'refunded', decrement stock
  IF OLD.status = 'completed' AND NEW.status = 'refunded' THEN
    UPDATE lizzy_flashsale 
    SET stock_sold = GREATEST(0, stock_sold - OLD.quantity)
    WHERE planid = OLD.planid;
  END IF;
  
  -- If status changed from 'refunded' back to 'completed', increment stock
  IF OLD.status = 'refunded' AND NEW.status = 'completed' THEN
    UPDATE lizzy_flashsale 
    SET stock_sold = stock_sold + NEW.quantity
    WHERE planid = NEW.planid;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_welcome_offer_usage_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_welcome_offer_usage_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: increment_customer_spent(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_customer_spent(p_wallet_id uuid, p_amount numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE reseller_customer_wallets
  SET 
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE id = p_wallet_id;
END;
$$;


--
-- Name: increment_stock_sold(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_stock_sold() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only increment for completed purchases
  IF NEW.status = 'completed' THEN
    UPDATE lizzy_flashsale 
    SET stock_sold = stock_sold + NEW.quantity
    WHERE planid = NEW.planid;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: increment_welcome_offer_claim(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_welcome_offer_claim(p_user_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.welcome_offer_usage (
    user_email, used_count, claim_window_start, claim_window_end, weekday_purchase_days
  ) VALUES (
    p_user_email, 1, NOW(), NOW() + INTERVAL '30 seconds', '{}'
  ) ON CONFLICT (user_email) DO UPDATE
  SET
    used_count = LEAST(welcome_offer_usage.used_count + 1, 3),
    claim_window_start = NOW(),
    claim_window_end = NOW() + INTERVAL '30 seconds'
  WHERE welcome_offer_usage.used_count < 3;
END;
$$;


--
-- Name: notify_airtime_purchase(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_airtime_purchase() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'success' THEN
    PERFORM send_push_notification(
      (SELECT id FROM profiles WHERE email = NEW.user_email),
      'Airtime Purchase Successful',
      format('You purchased ₦%s airtime from %s for %s.', NEW.amount, NEW.provider_name, NEW.mobile_number),
      'transaction'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_apk_ready(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_apk_ready() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$BEGIN
  IF (OLD.apk_url IS NULL OR OLD.apk_url = '') 
     AND (NEW.apk_url IS NOT NULL AND NEW.apk_url != '') THEN
    
    PERFORM
      net.http_post(
        url := 'https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/send-apk-email',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeXlmYXhjd2Fucm1paXB6a29qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE1MDk4MCwiZXhwIjoyMDYwNzI2OTgwfQ.PoNIFcd-6gXD8u4bAdK2I4k_-jhldg1Thnti1uZcLq8',
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD)
        )
      );
  END IF;
  
  RETURN NEW;
END;$$;


--
-- Name: notify_app_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_app_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'published' THEN
    PERFORM send_push_notification(
      user_id,
      'New App Update Available',
      format('Version %s is now available. Update now for the latest features!', NEW.version),
      'app_update'
    )
    FROM profiles WHERE notifications_enabled = TRUE;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_cable_purchase(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_cable_purchase() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM profiles WHERE email = NEW.user_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found for email: %', NEW.user_email;
    END IF;
    INSERT INTO notifications (id, transaction_id, user_id, notification_type, message, created_at)
    VALUES (
        gen_random_uuid(),
        NEW.id,
        v_user_id,
        'cable_purchase',
        'Cable purchase of ₦' || NEW.amount || ' for ' || (NEW.metadata->>'subscription'),
        NOW()
    );
    RETURN NEW;
END;
$$;


--
-- Name: notify_data_purchase(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_data_purchase() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'success' THEN
    PERFORM send_push_notification(
      (SELECT id FROM profiles WHERE email = NEW.user_email),
      'Data Purchase Successful',
      format('You purchased %s from %s for %s.', NEW.plan_name, NEW.provider_name, NEW.mobile_number),
      'transaction'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_deposit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_deposit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM profiles WHERE email = NEW.user_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found for email: %', NEW.user_email;
    END IF;
    INSERT INTO notifications (id, transaction_id, user_id, notification_type, message, created_at)
    VALUES (
        gen_random_uuid(),
        NEW.id,
        v_user_id,
        'deposit',
        'Deposit of ₦' || NEW.amount,
        NOW()
    );
    RETURN NEW;
END;
$$;


--
-- Name: notify_electricity_purchase(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_electricity_purchase() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM profiles WHERE email = NEW.user_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found for email: %', NEW.user_email;
    END IF;
    INSERT INTO notifications (id, transaction_id, user_id, notification_type, message, created_at)
    VALUES (
        gen_random_uuid(),
        NEW.id,
        v_user_id,
        'electricity_purchase',
        'Electricity purchase of ₦' || NEW.amount || ' for meter ' || (NEW.metadata->>'meter_number'),
        NOW()
    );
    RETURN NEW;
END;
$$;


--
-- Name: notify_hot_deal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_hot_deal() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
  INSERT INTO notifications (user_id, notification_type, message, metadata, created_at)
  SELECT id, 'hot_plan', format('%s: %s for ₦%s (%s)', NEW.category, NEW.data, NEW.price, NEW.validity), jsonb_build_object('deal_id', NEW.id), NOW()
  FROM profiles WHERE notifications_enabled = TRUE;
  RETURN NEW;
END;$$;


--
-- Name: notify_new_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Call the Edge Function when a new notification is inserted
  PERFORM net.http_post(
    url := 'https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/send-push-notification',
    body := json_build_object('record', row_to_json(NEW))::jsonb,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeXlmYXhjd2Fucm1paXB6a29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNTA5ODAsImV4cCI6MjA2MDcyNjk4MH0.QtQzG8cw_J5PLuszAWtJRINkWQUkAnS9t7aGhO-E6JA'
    )::jsonb
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: process_airtime_purchase(uuid, text, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_airtime_purchase(p_user_id uuid, p_network text, p_phone_number text, p_amount numeric, p_request_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
  v_reseller_id UUID;
  v_customer_id UUID;
  v_user_type TEXT;
  v_customer_wallet_id UUID;
  v_customer_balance NUMERIC;
  v_reseller_wallet_id UUID;
  v_reseller_balance NUMERIC;
  v_transaction_id UUID;
  v_discount NUMERIC := 0.03; -- 3% discount on airtime
  v_reseller_cost NUMERIC;
  v_profit NUMERIC;
BEGIN
  -- 1. Determine user type
  SELECT id INTO v_reseller_id
  FROM resellers
  WHERE auth_user_id = p_user_id AND status = 'active';

  IF FOUND THEN
    v_user_type := 'reseller';
    v_customer_id := NULL;
  ELSE
    SELECT rc.id, rc.reseller_id INTO v_customer_id, v_reseller_id
    FROM reseller_customers rc
    JOIN resellers r ON r.id = rc.reseller_id
    WHERE rc.auth_user_id = p_user_id AND r.status = 'active'
    LIMIT 1;

    IF FOUND THEN
      v_user_type := 'customer';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
  END IF;

  -- 2. Validate minimum
  IF p_amount < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum airtime purchase is ₦50');
  END IF;

  -- 3. Calculate reseller cost (with discount)
  v_reseller_cost := ROUND(p_amount * (1 - v_discount));
  v_profit := p_amount - v_reseller_cost;

  -- ============================================================
  -- 4. CUSTOMER PURCHASE
  -- ============================================================
  IF v_user_type = 'customer' THEN
    -- Get customer wallet
    SELECT id, balance INTO v_customer_wallet_id, v_customer_balance
    FROM reseller_customer_wallets
    WHERE reseller_id = v_reseller_id AND customer_id = v_customer_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Customer wallet not found');
    END IF;

    IF v_customer_balance < p_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient balance. Need ₦%s but have ₦%s', p_amount::text, v_customer_balance::text)
      );
    END IF;

    -- Get reseller wallet
    SELECT id, balance INTO v_reseller_wallet_id, v_reseller_balance
    FROM reseller_wallets
    WHERE reseller_id = v_reseller_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Store wallet not found');
    END IF;

    IF v_reseller_balance < v_reseller_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Store cannot process this transaction');
    END IF;

    -- Deduct from customer
    UPDATE reseller_customer_wallets
    SET balance = balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = NOW()
    WHERE id = v_customer_wallet_id;

    -- Deduct cost from reseller + add profit
    UPDATE reseller_wallets
    SET balance = balance + p_amount - v_reseller_cost,
        total_sales = total_sales + p_amount,
        total_profit = total_profit + v_profit,
        updated_at = NOW()
    WHERE id = v_reseller_wallet_id;

  -- ============================================================
  -- 5. RESELLER SELF-PURCHASE
  -- ============================================================
  ELSE
    SELECT id, balance INTO v_reseller_wallet_id, v_reseller_balance
    FROM reseller_wallets
    WHERE reseller_id = v_reseller_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF v_reseller_balance < v_reseller_cost THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient balance. Need ₦%s but have ₦%s', v_reseller_cost::text, v_reseller_balance::text)
      );
    END IF;

    UPDATE reseller_wallets
    SET balance = balance - v_reseller_cost,
        total_sales = total_sales + p_amount,
        updated_at = NOW()
    WHERE id = v_reseller_wallet_id;

    v_profit := 0;
  END IF;

  -- 6. Record transaction
  INSERT INTO reseller_transactions (
    reseller_id, amount, type, status, reference, metadata
  ) VALUES (
    v_reseller_id,
    p_amount,
    'airtime',
    'pending',
    p_request_id,
    jsonb_build_object(
      'network', p_network,
      'phone_number', p_phone_number,
      'user_type', v_user_type,
      'customer_id', v_customer_id,
      'amount', p_amount,
      'reseller_cost', v_reseller_cost,
      'profit', v_profit
    )
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'network', p_network,
    'amount', p_amount,
    'profit', v_profit,
    'phone_number', p_phone_number,
    'request_id', p_request_id,
    'user_type', v_user_type
  );
END;$$;


--
-- Name: process_data_purchase(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_data_purchase(p_user_id uuid, p_plan_id integer, p_phone_number text, p_request_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
  v_reseller_id UUID;
  v_customer_id UUID;
  v_user_type TEXT;
  v_customer_wallet_id UUID;
  v_customer_balance NUMERIC;
  v_reseller_wallet_id UUID;
  v_reseller_balance NUMERIC;
  v_plan_amount NUMERIC;
  v_plan_name TEXT;
  v_network TEXT;
  v_markup_type TEXT;
  v_markup_value NUMERIC;
  v_final_price NUMERIC;
  v_reseller_cost NUMERIC;
  v_profit NUMERIC;
  v_transaction_id UUID;
  v_customer_prev_balance NUMERIC;
  v_reseller_prev_balance NUMERIC;
BEGIN
  -- 1. Determine user type
  SELECT id INTO v_reseller_id
  FROM resellers
  WHERE auth_user_id = p_user_id AND status = 'active';

  IF FOUND THEN
    -- Resellers can buy for themselves
    v_user_type := 'reseller';
    v_customer_id := NULL;
  ELSE
    -- Customer must belong to a reseller store
    SELECT rc.id, rc.reseller_id INTO v_customer_id, v_reseller_id
    FROM reseller_customers rc
    JOIN resellers r ON r.id = rc.reseller_id
    WHERE rc.auth_user_id = p_user_id AND r.status = 'active'
    LIMIT 1;

    IF FOUND THEN
      v_user_type := 'customer';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
  END IF;

  -- 2. Get plan with reseller markup
  SELECT 
    bp.amount,
    bp.plan_name,
    bp.network,
    rpc.markup_type,
    rpc.markup_value
  INTO 
    v_plan_amount, v_plan_name, v_network, v_markup_type, v_markup_value
  FROM reseller_base_plans bp
  JOIN reseller_plan_configs rpc ON rpc.plan_id = bp.id
  WHERE bp.plan_id = p_plan_id
    AND rpc.reseller_id = v_reseller_id
    AND rpc.enabled = true
    AND bp.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not available');
  END IF;

  -- 3. Calculate prices
  v_reseller_cost := v_plan_amount; -- What reseller pays to VTU provider

  IF v_markup_type = 'percentage' THEN
    v_final_price := ROUND(v_plan_amount * (1 + v_markup_value / 100));
  ELSE
    v_final_price := ROUND(v_plan_amount + v_markup_value);
  END IF;

  v_profit := v_final_price - v_reseller_cost;

  -- ============================================================
  -- 4. CUSTOMER PURCHASE: Deduct from customer + reseller
  -- ============================================================
  IF v_user_type = 'customer' THEN
    -- Get customer wallet
    SELECT id, balance INTO v_customer_wallet_id, v_customer_balance
    FROM reseller_customer_wallets
    WHERE reseller_id = v_reseller_id AND customer_id = v_customer_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Customer wallet not found. Fund your wallet first.');
    END IF;

    -- Check customer has enough
    IF v_customer_balance < v_final_price THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient balance. Need ₦%s but have ₦%s', v_final_price::text, v_customer_balance::text)
      );
    END IF;

    -- Get reseller wallet
    SELECT id, balance INTO v_reseller_wallet_id, v_reseller_balance
    FROM reseller_wallets
    WHERE reseller_id = v_reseller_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Store wallet not found. Contact support.');
    END IF;

    -- Check reseller has enough to cover base cost
    IF v_reseller_balance < v_reseller_cost THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Store cannot process this transaction. Contact support.'
      );
    END IF;

    -- Deduct from customer wallet
    v_customer_prev_balance := v_customer_balance;
    UPDATE reseller_customer_wallets
    SET balance = balance - v_final_price,
        total_spent = total_spent + v_final_price,
        updated_at = NOW()
    WHERE id = v_customer_wallet_id;

    -- ✅ CORRECT: Add selling price, subtract cost price
    v_reseller_prev_balance := v_reseller_balance;
    UPDATE reseller_wallets
    SET balance = balance + v_final_price - v_reseller_cost,
        total_sales = total_sales + v_final_price,
        total_profit = total_profit + v_profit,
        updated_at = NOW()
    WHERE id = v_reseller_wallet_id;

  -- ============================================================
  -- 5. RESELLER SELF-PURCHASE: Just deduct cost from reseller
  -- ============================================================
  ELSE
    SELECT id, balance INTO v_reseller_wallet_id, v_reseller_balance
    FROM reseller_wallets
    WHERE reseller_id = v_reseller_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF v_reseller_balance < v_reseller_cost THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient balance. Need ₦%s but have ₦%s', v_reseller_cost::text, v_reseller_balance::text)
      );
    END IF;

    v_reseller_prev_balance := v_reseller_balance;
    UPDATE reseller_wallets
    SET balance = balance - v_reseller_cost,
        total_sales = total_sales + v_final_price,
        updated_at = NOW()
    WHERE id = v_reseller_wallet_id;

    v_customer_prev_balance := 0;
    v_final_price := v_reseller_cost;
    v_profit := 0;
  END IF;

  -- 6. Record transaction
  INSERT INTO reseller_transactions (
    reseller_id, amount, type, status, reference, metadata
  ) VALUES (
    v_reseller_id,
    v_final_price,
    'data',
    'pending',
    p_request_id,
    jsonb_build_object(
      'plan_id', p_plan_id,
      'plan_name', v_plan_name,
      'network', v_network,
      'phone_number', p_phone_number,
      'user_type', v_user_type,
      'customer_id', v_customer_id,
      'base_price', v_reseller_cost,
      'final_price', v_final_price,
      'profit', v_profit,
      'markup_type', v_markup_type,
      'markup_value', v_markup_value
    )
  )
  RETURNING id INTO v_transaction_id;

  -- 7. Record order for customer purchases
  IF v_user_type = 'customer' THEN
    INSERT INTO reseller_orders (
      reseller_id, customer_email, plan_id, amount, profit, status
    )
    SELECT 
      v_reseller_id,
      rc.email,
      bp.id,
      v_final_price,
      v_profit,
      'pending'
    FROM reseller_customers rc
    JOIN reseller_base_plans bp ON bp.plan_id = p_plan_id
    WHERE rc.id = v_customer_id
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'plan_name', v_plan_name,
    'network', v_network,
    'amount', v_final_price,
    'profit', v_profit,
    'phone_number', p_phone_number,
    'request_id', p_request_id,
    'user_type', v_user_type
  );
END;$$;


--
-- Name: process_purchase_deductions(uuid, numeric, uuid, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_purchase_deductions(p_customer_wallet_id uuid, p_customer_deduct numeric, p_reseller_id uuid, p_cost_price numeric, p_selling_price numeric, p_profit numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$DECLARE
  v_customer_balance NUMERIC;
  v_reseller_balance NUMERIC;
BEGIN
  -- 1. Lock and check customer wallet
  SELECT balance INTO v_customer_balance
  FROM reseller_customer_wallets
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
  FROM reseller_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;

  IF v_reseller_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller wallet not found');
  END IF;

  -- 3. Check if reseller has enough balance to cover the cost price
  IF v_reseller_balance < p_cost_price THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Store has insufficient balance to cover the cost of this order'
    );
  END IF;

  -- 4. Deduct selling price from customer wallet
  UPDATE reseller_customer_wallets
  SET
    balance = balance - p_customer_deduct,
    total_spent = total_spent + p_customer_deduct,
    updated_at = NOW()
  WHERE id = p_customer_wallet_id;

  -- 5. ✅ CORRECT: Add selling price to reseller, subtract cost price
  UPDATE reseller_wallets
  SET
    balance = balance + p_selling_price - p_cost_price,  -- ✅ FIXED
    total_sales = total_sales + p_selling_price,
    total_profit = total_profit + p_profit,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  -- 6. Return success with new balances
  RETURN jsonb_build_object(
    'success', true,
    'customer_new_balance', (SELECT balance FROM reseller_customer_wallets WHERE id = p_customer_wallet_id),
    'reseller_new_balance', (SELECT balance FROM reseller_wallets WHERE reseller_id = p_reseller_id),
    'profit_earned', p_profit
  );
END;$$;


--
-- Name: recalculate_reseller_wallet(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_reseller_wallet(p_reseller_id uuid, p_for_update boolean DEFAULT true) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
  v_balance DECIMAL;
  v_total_sales DECIMAL;
  v_total_profit DECIMAL;
  v_withdrawable DECIMAL;
  v_wallet_id UUID;
  v_wallet_exists BOOLEAN;
BEGIN
  -- 1. Check if wallet exists, create if not
  SELECT EXISTS (
    SELECT 1 FROM reseller_wallets WHERE reseller_id = p_reseller_id
  ) INTO v_wallet_exists;
  
  IF NOT v_wallet_exists THEN
    INSERT INTO reseller_wallets (reseller_id, balance, total_sales, total_profit)
    VALUES (p_reseller_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  -- 2. Lock the wallet row (prevents race conditions)
  IF p_for_update THEN
    SELECT id INTO v_wallet_id
    FROM reseller_wallets
    WHERE reseller_id = p_reseller_id
    FOR UPDATE;
  END IF;

  -- 3. Compute balance from transactions (source of truth)
  SELECT COALESCE(
    (SELECT SUM(amount) FROM reseller_transactions 
     WHERE reseller_id = p_reseller_id 
     AND type = 'deposit' 
     AND status = 'completed'), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM reseller_transactions 
     WHERE reseller_id = p_reseller_id 
     AND type = 'withdrawal' 
     AND status = 'completed'), 0
  ) INTO v_balance;

  -- 4. Compute total_sales from orders (source of truth)
  SELECT COALESCE(
    (SELECT SUM(amount) FROM reseller_orders 
     WHERE reseller_id = p_reseller_id 
     AND status = 'completed'), 0
  ) INTO v_total_sales;

  -- 5. Compute total_profit from orders (source of truth)
  SELECT COALESCE(
    (SELECT SUM(profit) FROM reseller_orders 
     WHERE reseller_id = p_reseller_id 
     AND status = 'completed'), 0
  ) INTO v_total_profit;

  -- 6. Calculate withdrawable amount
  v_withdrawable = v_balance;


  -- 7. Update the cache
  UPDATE reseller_wallets
  SET 
    balance = v_balance,
    total_sales = v_total_sales,
    total_profit = v_total_profit,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id;

  -- 8. Return computed values
  RETURN json_build_object(
    'success', TRUE,
    'balance', v_balance,
    'total_sales', v_total_sales,
    'total_profit', v_total_profit,
    'withdrawable', v_withdrawable,
    'wallet_id', v_wallet_id
  );
END;$$;


--
-- Name: record_flashsale_purchase(integer, text, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_flashsale_purchase(p_planid integer, p_phone_number text, p_user_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_plan lizzy_flashsale%ROWTYPE;
  v_purchase_id BIGINT;
  v_stock_left INTEGER;
BEGIN
  -- Get plan details and check stock
  SELECT * INTO v_plan FROM lizzy_flashsale WHERE planid = p_planid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Plan not found');
  END IF;
  
  IF NOT v_plan.isflashsale THEN
    RETURN json_build_object('success', false, 'message', 'This plan is not part of flash sale');
  END IF;
  
  v_stock_left := v_plan.stock_available - v_plan.stock_sold;
  
  IF v_stock_left < p_quantity THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient stock', 'stock_left', v_stock_left);
  END IF;
  
  -- Record the purchase
  INSERT INTO flashsale_purchases (planid, user_id, phone_number, quantity, purchase_price, status)
  VALUES (p_planid, p_user_id, p_phone_number, p_quantity, v_plan.newprice::decimal, 'completed')
  RETURNING id INTO v_purchase_id;
  
  -- Get updated stock info
  SELECT stock_available - stock_sold INTO v_stock_left 
  FROM lizzy_flashsale 
  WHERE planid = p_planid;
  
  RETURN json_build_object(
    'success', true, 
    'purchase_id', v_purchase_id,
    'stock_left', v_stock_left,
    'message', 'Purchase successful'
  );
END;
$$;


--
-- Name: refund_wallet_balance(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refund_wallet_balance(p_user_email text, p_amount numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_balance_before NUMERIC;
BEGIN
    -- Lock wallet row
    PERFORM 1 FROM wallet WHERE user_email = p_user_email FOR UPDATE;

    -- Get current balance
    SELECT balance INTO v_balance_before
    FROM wallet
    WHERE user_email = p_user_email;

    -- Refund amount
    UPDATE wallet
    SET balance = balance + p_amount
    WHERE user_email = p_user_email;

    -- Log to audit table
    INSERT INTO wallet_audit (
        user_email,
        transaction_id,
        amount,
        balance_before,
        balance_after,
        change_type
    )
    SELECT
        p_user_email,
        (SELECT id FROM transactions WHERE user_email = p_user_email AND amount = -p_amount AND status = 'failed' LIMIT 1),
        p_amount,
        v_balance_before,
        v_balance_before + p_amount,
        'refund';
END;
$$;


--
-- Name: set_network_id_from_provider(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_network_id_from_provider() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.network_id := CASE
    WHEN LOWER(NEW.provider_name) = 'mtn' THEN 1
    WHEN LOWER(NEW.provider_name) = 'airtel' THEN 2
    WHEN LOWER(NEW.provider_name) = 'glo' THEN 3
    WHEN LOWER(NEW.provider_name) IN ('9mobile', 'etisalat') THEN 4
    ELSE NEW.network_id
  END;
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: trigger_customer_push(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_customer_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$BEGIN
  PERFORM net.http_post(
    url := 'https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/reseller-send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeXlmYXhjd2Fucm1paXB6a29qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE1MDk4MCwiZXhwIjoyMDYwNzI2OTgwfQ.PoNIFcd-6gXD8u4bAdK2I4k_-jhldg1Thnti1uZcLq8'
    ),
    body := jsonb_build_object(
      'table', 'reseller_customer_notifications',
      'record', row_to_json(NEW)::jsonb
    )
  );
  RETURN NEW;
END;$$;


--
-- Name: trigger_push_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_push_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM http_post(
    'YOUR_EDGE_FUNCTION_URL',
    jsonb_build_object('record', to_jsonb(NEW)),
    'application/json'
  );
  RETURN NEW;
END;
$$;


--
-- Name: trigger_push_notification_webhook(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_push_notification_webhook() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/send-push-notification',
    headers := '{
      "Content-Type": "application/json",
      "Authorization": "Bearer ' || (SELECT anon_key FROM auth.config) || '"
    }'::jsonb,
    body := jsonb_build_object('record', NEW)
  );
  RETURN NEW;
END;
$$;


--
-- Name: trigger_reseller_push(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_reseller_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$BEGIN
  PERFORM net.http_post(
    url := 'https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/reseller-send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeXlmYXhjd2Fucm1paXB6a29qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE1MDk4MCwiZXhwIjoyMDYwNzI2OTgwfQ.PoNIFcd-6gXD8u4bAdK2I4k_-jhldg1Thnti1uZcLq8'
    ),
    body := jsonb_build_object(
      'table', 'reseller_notifications',
      'record', row_to_json(NEW)::jsonb
    )
  );
  RETURN NEW;
END;$$;


--
-- Name: update_global_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_global_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_transaction_status(uuid, text, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_transaction_status(p_transaction_id uuid, p_status text, p_provider_reference text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text, p_refund boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_tx RECORD;
BEGIN
  SELECT * INTO v_tx
  FROM reseller_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  -- Update status
  UPDATE reseller_transactions
  SET 
    status = p_status,
    reference = COALESCE(p_provider_reference, reference),
    metadata = metadata || jsonb_build_object(
      'error_message', p_error_message,
      'completed_at', CASE WHEN p_status = 'completed' THEN NOW()::text ELSE NULL END
    )
  WHERE id = p_transaction_id;

  -- Refund on failure
  IF p_refund AND p_status = 'failed' THEN
    -- Refund customer if it was a customer purchase
    IF (v_tx.metadata->>'customer_id') IS NOT NULL THEN
      UPDATE reseller_customer_wallets
      SET balance = balance + v_tx.amount, updated_at = NOW()
      WHERE customer_id = (v_tx.metadata->>'customer_id')::UUID
        AND reseller_id = v_tx.reseller_id;
    END IF;

    -- Refund reseller the base cost
    UPDATE reseller_wallets
    SET balance = balance + COALESCE((v_tx.metadata->>'reseller_cost')::NUMERIC, v_tx.amount),
        updated_at = NOW()
    WHERE reseller_id = v_tx.reseller_id;
  END IF;

  -- Notify
  IF p_status = 'completed' THEN
    INSERT INTO reseller_notifications (
      reseller_id, notification_type, message, metadata
    ) VALUES (
      v_tx.reseller_id,
      'transaction_success',
      format('%s purchase of ₦%s completed', 
        CASE WHEN v_tx.type = 'data' THEN 'Data' ELSE 'Airtime' END,
        v_tx.amount::text
      ),
      jsonb_build_object('transaction_id', p_transaction_id, 'type', v_tx.type, 'status', 'completed')
    );
  ELSIF p_status = 'failed' THEN
    INSERT INTO reseller_notifications (
      reseller_id, notification_type, message, metadata
    ) VALUES (
      v_tx.reseller_id,
      'transaction_failed',
      COALESCE(p_error_message, 'Transaction failed. Amount refunded.'),
      jsonb_build_object('transaction_id', p_transaction_id, 'type', v_tx.type, 'status', 'failed', 'refunded', p_refund)
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_wallet_after_deposit(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_after_deposit(p_reseller_id uuid, p_amount numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE reseller_wallets
    SET 
        balance = balance + p_amount,
        updated_at = NOW()
    WHERE reseller_id = p_reseller_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for reseller %', p_reseller_id;
    END IF;
END;
$$;


--
-- Name: update_wallet_after_sale(uuid, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_after_sale(p_reseller_id uuid, p_selling_price numeric, p_cost_price numeric, p_profit numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_balance DECIMAL;
  v_total_sales DECIMAL;
  v_total_profit DECIMAL;
  v_new_balance DECIMAL;
  v_new_sales DECIMAL;
  v_new_profit DECIMAL;
BEGIN
  SELECT balance, total_sales, total_profit 
  INTO v_balance, v_total_sales, v_total_profit
  FROM reseller_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for reseller %', p_reseller_id;
  END IF;
  
  -- ✅ CORRECT: Add selling price, subtract cost price
  IF v_balance < p_cost_price THEN
    RAISE EXCEPTION 'Insufficient balance to cover cost. Available: %, Required: %', v_balance, p_cost_price;
  END IF;
  
  UPDATE reseller_wallets
  SET 
    balance = balance + p_selling_price - p_cost_price,  -- ✅ FIXED
    total_sales = total_sales + p_selling_price,
    total_profit = total_profit + p_profit,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id
  RETURNING balance, total_sales, total_profit 
  INTO v_new_balance, v_new_sales, v_new_profit;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'new_total_sales', v_new_sales,
    'new_total_profit', v_new_profit,
    'profit_earned', p_profit,
    'amount_deducted', p_cost_price
  );
END;
$$;


--
-- Name: update_wallet_after_withdrawal(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_after_withdrawal(p_reseller_id uuid, p_amount numeric, p_fee numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_balance DECIMAL;
  v_withdraw_total DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_balance
  FROM reseller_wallets
  WHERE reseller_id = p_reseller_id
  FOR UPDATE;
  
  -- Calculate total withdrawal (amount + fee)
  v_withdraw_total = p_amount + p_fee;
  
  -- ✅ Check if enough balance (only balance)
  IF v_balance < v_withdraw_total THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_balance, v_withdraw_total;
  END IF;
  
  -- ✅ Deduct from balance only
  v_new_balance = v_balance - v_withdraw_total;
  
  -- Update the wallet
  UPDATE reseller_wallets 
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE reseller_id = p_reseller_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'withdrawn_amount', p_amount,
    'fee_charged', p_fee,
    'total_deducted', v_withdraw_total
  );
END;
$$;


--
-- Name: update_wallet_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only run if status is 'success'
  IF NEW.status = 'success' THEN
    -- Check if this transaction has already been credited
    IF (OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
      -- If wallet exists, update it
      IF EXISTS (SELECT 1 FROM wallet WHERE user_email = NEW.user_email) THEN
        UPDATE wallet
        SET balance = balance + NEW.amount
        WHERE user_email = NEW.user_email;
      ELSE
        -- If not, create wallet and credit it
        INSERT INTO wallet (user_email, balance)
        VALUES (NEW.user_email, NEW.amount);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_wallet_balance(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_balance(p_user_email text, p_amount numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    wallet_exists BOOLEAN;
BEGIN
    -- Check if wallet exists
    SELECT EXISTS (SELECT 1 FROM wallet WHERE user_email = p_user_email) INTO wallet_exists;

    IF wallet_exists THEN
        -- Update wallet balance
        UPDATE wallet
        SET balance = balance + p_amount
        WHERE user_email = p_user_email;
    ELSE
        -- Create wallet if it doesn't exist
        INSERT INTO wallet (user_email, balance)
        VALUES (p_user_email, p_amount);
    END IF;
END;
$$;


--
-- Name: update_welcome_offer_on_purchase(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_welcome_offer_on_purchase() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  today_date TEXT;
  is_weekday BOOLEAN;
  current_days TEXT[];
  day_count INT;
BEGIN
  -- Get today in YYYY-MM-DD
  today_date := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
  
  -- Check if today is Mon–Fri (1=Mon, 5=Fri)
  is_weekday := EXTRACT(DOW FROM CURRENT_DATE) BETWEEN 1 AND 5;

  -- Ignore weekends
  IF NOT is_weekday THEN
    RETURN NEW;
  END IF;

  -- Fetch current weekday_purchase_days
  SELECT COALESCE(weekday_purchase_days, '{}') INTO current_days
  FROM public.welcome_offer_usage
  WHERE user_email = NEW.user_email;

  -- If no record, create one
  IF current_days IS NULL THEN
    INSERT INTO public.welcome_offer_usage (
      user_email, 
      used_count, 
      weekday_purchase_days,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_email, 
      0, 
      ARRAY[today_date],
      NOW(),
      NOW()
    ) ON CONFLICT (user_email) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Add today if not already present
  IF NOT (today_date = ANY(current_days)) THEN
    current_days := current_days || today_date;
    day_count := CARDINALITY(current_days);

    -- Update the record
    UPDATE public.welcome_offer_usage
    SET 
      weekday_purchase_days = current_days,
      used_count = CASE WHEN day_count >= 5 THEN 0 ELSE used_count END,
      last_used_date = CASE WHEN day_count >= 5 THEN NULL ELSE last_used_date END,
      claim_window_start = CASE WHEN day_count >= 5 THEN NULL ELSE claim_window_start END,
      claim_window_end = CASE WHEN day_count >= 5 THEN NULL ELSE claim_window_end END,
      updated_at = NOW()
    WHERE user_email = NEW.user_email;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_metadata_json(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_metadata_json() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Validate that metadata is valid JSON
    PERFORM NEW.metadata::jsonb;
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Invalid JSON in metadata field for transaction %', NEW.id;
END;
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[array_length(_parts, 1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_prefix_len INT;
    v_prefix_start INT;
    v_combined_levels INT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_prefix_len := length(coalesce(prefix, ''));
    v_prefix_start := coalesce(array_length(string_to_array(coalesce(prefix, ''), v_delimiter), 1), 1);
    v_combined_levels := coalesce(array_length(string_to_array(v_prefix, v_delimiter), 1), 1);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT array_to_string(path_tokens[$1:$2], '/') AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $3 || '%%'
                  AND bucket_id = $4
                  AND array_length(objects.path_tokens, 1) <> $2
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT array_to_string(path_tokens[$1:$2], '/') AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $3 || '%%'
               AND bucket_id = $4
               AND array_length(objects.path_tokens, 1) = $2
             ORDER BY %I %s)
            LIMIT $5 OFFSET $6
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING v_prefix_start, v_combined_levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := substring(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter) from v_prefix_len + 1);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := substring(v_current.name from v_prefix_len + 1);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
    v_sort_order text;
    v_sort_column text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    -- Defense-in-depth: this function is independently reachable and must
    -- not trust p_sort_order/p_sort_column to already be validated by a
    -- caller. Normalize to the same strict allow-list storage.search_v2
    -- uses before interpolating anything into dynamic SQL below.
    v_sort_order := lower(coalesce(p_sort_order, 'asc'));
    IF v_sort_order NOT IN ('asc', 'desc') THEN
        v_sort_order := 'asc';
    END IF;

    v_sort_column := lower(coalesce(p_sort_column, 'updated_at'));
    IF v_sort_column NOT IN ('updated_at', 'created_at') THEN
        v_sort_column := 'updated_at';
    END IF;

    IF v_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        v_sort_column,
        v_cursor_op,
        v_sort_column,
        v_sort_order,
        v_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: airtime_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.airtime_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    user_email text NOT NULL,
    amount double precision NOT NULL,
    provider_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    mobile_number text,
    metadata jsonb,
    status character varying(50)
);


--
-- Name: app_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_updates (
    id uuid NOT NULL,
    version text,
    status text,
    created_at timestamp without time zone DEFAULT now(),
    apk_url text
);


--
-- Name: business_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    user_email text NOT NULL,
    fee_amount double precision NOT NULL,
    fee_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    balance_carried_forward numeric(12,2) DEFAULT 0 NOT NULL,
    description text,
    CONSTRAINT positive_balance CHECK ((balance_carried_forward >= (0)::numeric))
);


--
-- Name: cable_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cable_plans (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    provider character varying(50) NOT NULL,
    cableplan_id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    duration character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_provider CHECK (((provider)::text = ANY ((ARRAY['DSTV'::character varying, 'GOTV'::character varying, 'STARTIMES'::character varying])::text[])))
);


--
-- Name: cable_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cable_purchases (
    id uuid NOT NULL,
    user_id uuid,
    provider text,
    plan_name text,
    amount integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: coming_soon_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coming_soon_notifications (
    id integer NOT NULL,
    email character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: coming_soon_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coming_soon_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coming_soon_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coming_soon_notifications_id_seq OWNED BY public.coming_soon_notifications.id;


--
-- Name: customer_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_issues (
    id integer NOT NULL,
    user_id uuid,
    title character varying(255),
    description text,
    email character varying(255),
    status character varying(20) DEFAULT 'Pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_issues_id_seq OWNED BY public.customer_issues.id;


--
-- Name: data_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    user_email character varying(255),
    mobile_number text NOT NULL,
    provider_name character varying(100),
    plan_name text,
    validity character varying(50),
    network_id integer,
    plan_id integer,
    payment_method character varying(50),
    payment_date timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: debug_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debug_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    context text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deposits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    user_email text NOT NULL,
    amount double precision NOT NULL,
    phone_number text,
    payment_method text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: e_data_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.e_data_plans (
    id integer NOT NULL,
    dataplan_id character varying(10) NOT NULL,
    network integer NOT NULL,
    plan_type character varying(50) NOT NULL,
    plan_network character varying(20) NOT NULL,
    month_validate character varying(100) NOT NULL,
    plan character varying(20) NOT NULL,
    plan_amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    sell_price numeric(10,2)
);


--
-- Name: electricity_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.electricity_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    meter_number character varying(20) NOT NULL,
    meter_type character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    token text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT electricity_purchases_meter_type_check CHECK (((meter_type)::text = ANY ((ARRAY['prepaid'::character varying, 'postpaid'::character varying])::text[])))
);


--
-- Name: TABLE electricity_purchases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.electricity_purchases IS 'Stores electricity bill purchase history for users';


--
-- Name: payscribe_flashsale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payscribe_flashsale (
    id integer NOT NULL,
    network_name text NOT NULL,
    plan_code text NOT NULL,
    name text NOT NULL,
    category text,
    alias text,
    amount integer NOT NULL,
    discount numeric,
    discount_type text,
    capped_at text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: flashsale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flashsale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flashsale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flashsale_id_seq OWNED BY public.payscribe_flashsale.id;


--
-- Name: flashsale_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flashsale_purchases (
    id bigint NOT NULL,
    planid integer,
    user_id uuid,
    phone_number text,
    quantity integer DEFAULT 1,
    purchase_price numeric(10,2),
    purchase_date timestamp without time zone DEFAULT now(),
    status text DEFAULT 'completed'::text,
    transaction_id uuid
);


--
-- Name: flashsale_purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flashsale_purchases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flashsale_purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flashsale_purchases_id_seq OWNED BY public.flashsale_purchases.id;


--
-- Name: global_app_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_app_builds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    build_status text DEFAULT 'queued'::text,
    apk_url text,
    aab_url text,
    build_logs text,
    error_message text,
    queued_at timestamp with time zone DEFAULT now(),
    building_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    app_config jsonb,
    config_id uuid
);


--
-- Name: global_base_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_base_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    provider_plan_id text NOT NULL,
    country_code text NOT NULL,
    network text,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    data_amount text,
    validity text,
    duration_days integer,
    base_price numeric NOT NULL,
    currency text NOT NULL,
    send_value numeric,
    send_currency text,
    metadata jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    city text,
    state text,
    country text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT global_customers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: global_email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    email_type text NOT NULL,
    subject text NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    customer_id uuid,
    customer_name text NOT NULL,
    plan_id uuid,
    plan_name text NOT NULL,
    amount numeric(10,2) NOT NULL,
    profit numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    payment_method text,
    transaction_reference text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT global_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: global_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    cost numeric(10,2) NOT NULL,
    profit numeric(10,2) DEFAULT 0 NOT NULL,
    category text NOT NULL,
    provider text NOT NULL,
    data_amount text,
    validity text,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_reseller_app_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_reseller_app_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    config jsonb NOT NULL,
    build_status text DEFAULT 'configuring'::text,
    build_logs text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_reseller_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_reseller_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    country_code text NOT NULL,
    store_name text NOT NULL,
    store_slug text NOT NULL,
    logo_url text,
    brand_color text DEFAULT '#C98A54'::text,
    android_app boolean DEFAULT false,
    application_status text DEFAULT 'pending'::text,
    agreed boolean DEFAULT true,
    auth_user_id uuid,
    temp_password text,
    dashboard_token text,
    submitted_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    original_email text NOT NULL,
    auth_email text,
    notification_icon_url text,
    bvn text
);


--
-- Name: global_reseller_plan_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_reseller_plan_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    enabled boolean DEFAULT true,
    markup_type text DEFAULT 'percentage'::text,
    markup_value numeric DEFAULT 0,
    selling_price numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_reseller_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_reseller_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id uuid NOT NULL,
    notification_settings jsonb DEFAULT '{"build_updates": true, "order_updates": true, "marketing_emails": false, "sms_notifications": false, "push_notifications": true, "email_notifications": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_reseller_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_reseller_stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    reseller_id uuid,
    store_name text NOT NULL,
    store_slug text NOT NULL,
    store_url text,
    logo_url text,
    brand_color text DEFAULT '#C98A54'::text,
    theme text DEFAULT 'modern'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_store_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_store_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    visitor_id text,
    session_id text,
    ip_address text,
    user_agent text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    page_url text,
    page_path text,
    action_type text,
    action_value text,
    visited_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    wallet_id uuid,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text,
    reference text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    payment_gateway text,
    CONSTRAINT global_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text]))),
    CONSTRAINT global_transactions_type_check CHECK ((type = ANY (ARRAY['credit'::text, 'debit'::text])))
);


--
-- Name: global_virtual_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_virtual_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    account_number text NOT NULL,
    bank_name text NOT NULL,
    account_name text NOT NULL,
    bank_code text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    customer_bvn text,
    customer_email text,
    customer_phone text,
    tracking_reference text,
    provider text DEFAULT 'xixapay'::text,
    account_type text,
    customer_name text,
    status text DEFAULT 'active'::text
);


--
-- Name: global_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    balance numeric(10,2) DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    first_deposit_bonus_claimed boolean DEFAULT false,
    first_deposit_bonus_amount numeric(10,2) DEFAULT 0,
    CONSTRAINT global_wallets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])))
);


--
-- Name: hot_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hot_deals (
    id integer NOT NULL,
    data text NOT NULL,
    price real NOT NULL,
    validity text NOT NULL,
    category text NOT NULL,
    description text,
    plan_type text NOT NULL
);


--
-- Name: lizzy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lizzy (
    plan_id integer NOT NULL,
    network character varying(20) NOT NULL,
    plan_type character varying(100) NOT NULL,
    plan_network character varying(50),
    validity character varying(150),
    plan character varying(100),
    plan_amount numeric(12,2) NOT NULL,
    sell_price numeric(12,2)
);


--
-- Name: lizzy_flashsale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lizzy_flashsale (
    planid integer NOT NULL,
    network text NOT NULL,
    plantype text NOT NULL,
    planname text NOT NULL,
    amount numeric(10,2) NOT NULL,
    validate text NOT NULL,
    flashname text,
    oldprice numeric(10,2),
    newprice numeric(10,2),
    isflashsale boolean DEFAULT false,
    stock_available integer DEFAULT 0,
    stock_sold integer DEFAULT 0,
    discount_percentage character varying(10)
);


--
-- Name: lizzy_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lizzy_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lizzy_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lizzy_plan_id_seq OWNED BY public.lizzy.plan_id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_read boolean DEFAULT false,
    metadata jsonb,
    CONSTRAINT notifications_notification_type_check CHECK ((notification_type = ANY (ARRAY['airtime'::text, 'data'::text, 'deposit'::text, 'data_purchase'::text, 'airtime_purchase'::text, 'cable_purchase'::text, 'hot_data'::text, 'special_data'::text, 'weekend_plan'::text, 'weekly_plan'::text, 'hot_plan'::text, 'special_plan'::text, 'promotional'::text, 'gifting_plan'::text, 'corporate_gifting_plan'::text, 'sme_plan'::text, 'sme_2_plan'::text, 'app_update'::text, 'test'::text])))
);


--
-- Name: plan_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_settings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    provider character varying(50) NOT NULL,
    plan_id integer NOT NULL,
    price numeric,
    is_enabled boolean DEFAULT true,
    category_enabled boolean DEFAULT true,
    card_color character varying(50),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    bundle_id integer NOT NULL
);


--
-- Name: plan_settings_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_settings_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    provider character varying(50),
    plan_id integer,
    changes jsonb,
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: price_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_adjustments (
    id integer NOT NULL,
    provider character varying(20) NOT NULL,
    data_amount character varying(50) NOT NULL,
    validity character varying(50) NOT NULL,
    target_price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: price_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_adjustments_id_seq OWNED BY public.price_adjustments.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar text,
    birthday date,
    transaction_pin text DEFAULT ''::text NOT NULL,
    is_admin boolean DEFAULT false,
    notifications_enabled boolean DEFAULT true,
    welcome_offer_window_start timestamp with time zone,
    welcome_offer_window_end timestamp with time zone
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id integer NOT NULL,
    referrer_id uuid,
    referee_id uuid,
    referral_code character varying(50),
    status character varying(20) DEFAULT 'Pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referrals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referrals_id_seq OWNED BY public.referrals.id;


--
-- Name: reseller_app_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_app_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    build_status text DEFAULT 'pending'::text,
    build_id text,
    apk_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reseller_app_configs_build_status_check CHECK ((build_status = ANY (ARRAY['pending'::text, 'configuring'::text, 'building'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: reseller_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    type text NOT NULL,
    url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reseller_assets_type_check CHECK ((type = ANY (ARRAY['icon'::text, 'splash'::text, 'logo'::text, 'adaptive_icon'::text, 'notification_icon'::text])))
);


--
-- Name: reseller_base_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_base_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id integer NOT NULL,
    network text NOT NULL,
    plan_type text NOT NULL,
    plan_name text NOT NULL,
    amount numeric(12,2) NOT NULL,
    validity text,
    flash_name text,
    old_price numeric(12,2),
    new_price numeric(12,2),
    is_flash_sale boolean DEFAULT false,
    stock_available integer DEFAULT 0,
    stock_sold integer DEFAULT 0,
    discount_percentage text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reseller_customer_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_customer_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    customer_id uuid,
    notification_type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reseller_customer_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_customer_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    fee numeric(10,2) DEFAULT 0,
    net_amount numeric(10,2) NOT NULL,
    previous_balance numeric(10,2) NOT NULL,
    new_balance numeric(10,2) NOT NULL,
    reference character varying(255),
    order_id uuid,
    plan_id uuid,
    status character varying(50) DEFAULT 'completed'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reseller_customer_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying])::text[]))),
    CONSTRAINT reseller_customer_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['deposit'::character varying, 'purchase'::character varying, 'refund'::character varying, 'adjustment'::character varying])::text[])))
);


--
-- Name: reseller_customer_virtual_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_customer_virtual_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    customer_id uuid,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    account_name text NOT NULL,
    account_type text DEFAULT 'static'::text,
    tracking_reference text,
    expire_date timestamp with time zone,
    provider text DEFAULT 'xixapay'::text,
    customer_email text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_bvn text,
    customer_nin text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reseller_customer_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_customer_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    customer_id uuid,
    balance numeric(12,2) DEFAULT 0.00,
    total_spent numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reseller_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    email text NOT NULL,
    first_name text,
    last_name text,
    auth_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    transaction_pin text,
    push_token text,
    notifications_enabled boolean DEFAULT false,
    bvn character varying(11),
    auth_email text,
    fcm_token text
);


--
-- Name: reseller_email_sequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_email_sequence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    email_number integer NOT NULL,
    sent_at timestamp with time zone DEFAULT now()
);


--
-- Name: reseller_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    notification_type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reseller_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    customer_email text NOT NULL,
    plan_id uuid,
    amount numeric(12,2) NOT NULL,
    profit numeric(12,2) DEFAULT 0.00 NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reseller_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: reseller_plan_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_plan_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    plan_id uuid,
    enabled boolean DEFAULT true,
    markup_type text NOT NULL,
    markup_value numeric(12,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reseller_plan_configs_markup_type_check CHECK ((markup_type = ANY (ARRAY['fixed'::text, 'percentage'::text])))
);


--
-- Name: reseller_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    amount numeric(12,2) NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text,
    reference text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reseller_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text]))),
    CONSTRAINT reseller_transactions_type_check CHECK ((type = ANY (ARRAY['deposit'::text, 'purchase'::text, 'withdrawal'::text])))
);


--
-- Name: reseller_virtual_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_virtual_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    account_name text NOT NULL,
    account_type text DEFAULT 'static'::text,
    tracking_reference text,
    expire_date timestamp with time zone,
    provider text DEFAULT 'xixapay'::text,
    customer_email text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_bvn text,
    customer_nin text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reseller_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reseller_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid,
    balance numeric(12,2) DEFAULT 0.00,
    total_sales numeric(12,2) DEFAULT 0.00,
    total_profit numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: resellers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resellers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id uuid,
    email text NOT NULL,
    store_name text NOT NULL,
    theme text DEFAULT 'light'::text,
    android_app boolean DEFAULT false,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    transaction_pin text,
    push_token text,
    notifications_enabled boolean DEFAULT false,
    phone text,
    temp_password text,
    bvn character varying(11),
    fcm_token text,
    dashboard_token text,
    CONSTRAINT resellers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text])))
);


--
-- Name: COLUMN resellers.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resellers.phone IS 'WhatsApp contact number for the reseller';


--
-- Name: revenue_withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    withdrawal_amount double precision NOT NULL,
    withdrawal_month text NOT NULL,
    withdrawal_date timestamp with time zone DEFAULT now(),
    carried_forward double precision DEFAULT 0 NOT NULL,
    notes text
);


--
-- Name: rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rewards (
    id integer NOT NULL,
    user_id uuid,
    reward_type character varying(50),
    reward_amount numeric(10,2),
    awarded_at timestamp with time zone DEFAULT now()
);


--
-- Name: rewards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rewards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rewards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rewards_id_seq OWNED BY public.rewards.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email text NOT NULL,
    amount double precision NOT NULL,
    reference text NOT NULL,
    status text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    env text DEFAULT 'live'::text,
    type text,
    description text,
    CONSTRAINT metadata_must_be_json CHECK ((metadata IS NOT NULL))
);


--
-- Name: user_push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_push_tokens (
    user_id uuid NOT NULL,
    push_token text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tokens (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_email text NOT NULL,
    lizzysub_token text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    is_valid boolean DEFAULT true,
    ujaydata_token text
);


--
-- Name: virtual_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.virtual_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    account_name text NOT NULL,
    account_type text DEFAULT 'STATIC'::text,
    tracking_reference text,
    expire_date timestamp with time zone,
    provider text DEFAULT 'payvessel'::text,
    customer_email text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_bvn text,
    customer_nin text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    bvn character varying(11) NOT NULL,
    mobile character varying(15) NOT NULL,
    status text DEFAULT 'pending'::text,
    assigned_to uuid,
    assigned_to_type text,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT waitlist_assigned_to_type_check CHECK ((assigned_to_type = ANY (ARRAY['reseller'::text, 'customer'::text]))),
    CONSTRAINT waitlist_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'used'::text])))
);


--
-- Name: wallet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet (
    user_email text NOT NULL,
    balance numeric DEFAULT 0 NOT NULL
);


--
-- Name: wallet_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_audit (
    id integer NOT NULL,
    user_email text,
    transaction_id uuid,
    amount numeric,
    balance_before numeric,
    balance_after numeric,
    change_type text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: wallet_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_audit_id_seq OWNED BY public.wallet_audit.id;


--
-- Name: web_push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.web_push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    fcm_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: welcome_offer_product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.welcome_offer_product (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    data text NOT NULL,
    price integer NOT NULL,
    validity text NOT NULL,
    category text DEFAULT 'Hot'::text NOT NULL,
    description text,
    variation_code text NOT NULL,
    plantype text NOT NULL,
    network_id integer DEFAULT 1 NOT NULL,
    provider_name text DEFAULT 'MTN'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: welcome_offer_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.welcome_offer_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: welcome_offer_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.welcome_offer_product_id_seq OWNED BY public.welcome_offer_product.id;


--
-- Name: welcome_offer_text; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.welcome_offer_text (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: welcome_offer_text_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.welcome_offer_text ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.welcome_offer_text_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: welcome_offer_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.welcome_offer_usage (
    user_email text NOT NULL,
    used_count integer DEFAULT 0 NOT NULL,
    last_used_date date,
    week_start_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_refill_date date,
    window_start timestamp with time zone,
    window_end timestamp with time zone,
    claim_window_start timestamp with time zone,
    claim_window_end timestamp with time zone,
    weekday_purchase_days text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: xixapay_sweep_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.xixapay_sweep_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    balance_before numeric,
    sweep_amount numeric,
    threshold numeric DEFAULT 100,
    reference text,
    target_account text,
    target_bank text,
    status text,
    error text,
    "timestamp" timestamp with time zone DEFAULT now(),
    min_sweep_amount numeric DEFAULT 500,
    CONSTRAINT xixapay_sweep_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: xixapay_wallet_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.xixapay_wallet_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id text NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT xixapay_wallet_ledger_type_check CHECK ((type = ANY (ARRAY['deposit'::text, 'sweep'::text])))
);

ALTER TABLE ONLY public.xixapay_wallet_ledger FORCE ROW LEVEL SECURITY;


--
-- Name: xixapay_wallet_balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.xixapay_wallet_balance AS
 SELECT COALESCE(sum(
        CASE
            WHEN (xixapay_wallet_ledger.type = 'deposit'::text) THEN xixapay_wallet_ledger.amount
            ELSE (- xixapay_wallet_ledger.amount)
        END), (0)::numeric) AS balance
   FROM public.xixapay_wallet_ledger;


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL,
    versioning_status text DEFAULT 'DISABLED'::text NOT NULL,
    CONSTRAINT buckets_versioning_dark_check CHECK ((versioning_status = 'DISABLED'::text)),
    CONSTRAINT buckets_versioning_standard_only_check CHECK (((type = 'STANDARD'::storage.buckettype) OR (versioning_status = 'DISABLED'::text))),
    CONSTRAINT buckets_versioning_status_check CHECK ((versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])))
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    archived_at timestamp with time zone,
    is_delete_marker boolean DEFAULT false NOT NULL,
    is_versioned boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: coming_soon_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coming_soon_notifications ALTER COLUMN id SET DEFAULT nextval('public.coming_soon_notifications_id_seq'::regclass);


--
-- Name: customer_issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_issues ALTER COLUMN id SET DEFAULT nextval('public.customer_issues_id_seq'::regclass);


--
-- Name: flashsale_purchases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashsale_purchases ALTER COLUMN id SET DEFAULT nextval('public.flashsale_purchases_id_seq'::regclass);


--
-- Name: lizzy plan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lizzy ALTER COLUMN plan_id SET DEFAULT nextval('public.lizzy_plan_id_seq'::regclass);


--
-- Name: payscribe_flashsale id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payscribe_flashsale ALTER COLUMN id SET DEFAULT nextval('public.flashsale_id_seq'::regclass);


--
-- Name: price_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_adjustments ALTER COLUMN id SET DEFAULT nextval('public.price_adjustments_id_seq'::regclass);


--
-- Name: referrals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals ALTER COLUMN id SET DEFAULT nextval('public.referrals_id_seq'::regclass);


--
-- Name: rewards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards ALTER COLUMN id SET DEFAULT nextval('public.rewards_id_seq'::regclass);


--
-- Name: wallet_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_audit ALTER COLUMN id SET DEFAULT nextval('public.wallet_audit_id_seq'::regclass);


--
-- Name: welcome_offer_product id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.welcome_offer_product ALTER COLUMN id SET DEFAULT nextval('public.welcome_offer_product_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: airtime_purchases airtime_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airtime_purchases
    ADD CONSTRAINT airtime_purchases_pkey PRIMARY KEY (id);


--
-- Name: app_updates app_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_updates
    ADD CONSTRAINT app_updates_pkey PRIMARY KEY (id);


--
-- Name: business_ledger business_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_ledger
    ADD CONSTRAINT business_ledger_pkey PRIMARY KEY (id);


--
-- Name: cable_plans cable_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cable_plans
    ADD CONSTRAINT cable_plans_pkey PRIMARY KEY (id);


--
-- Name: cable_purchases cable_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cable_purchases
    ADD CONSTRAINT cable_purchases_pkey PRIMARY KEY (id);


--
-- Name: coming_soon_notifications coming_soon_notifications_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coming_soon_notifications
    ADD CONSTRAINT coming_soon_notifications_email_key UNIQUE (email);


--
-- Name: coming_soon_notifications coming_soon_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coming_soon_notifications
    ADD CONSTRAINT coming_soon_notifications_pkey PRIMARY KEY (id);


--
-- Name: customer_issues customer_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_issues
    ADD CONSTRAINT customer_issues_pkey PRIMARY KEY (id);


--
-- Name: data_purchases data_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_purchases
    ADD CONSTRAINT data_purchases_pkey PRIMARY KEY (id);


--
-- Name: debug_logs debug_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debug_logs
    ADD CONSTRAINT debug_logs_pkey PRIMARY KEY (id);


--
-- Name: deposits deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);


--
-- Name: e_data_plans e_data_plans_dataplan_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_data_plans
    ADD CONSTRAINT e_data_plans_dataplan_id_key UNIQUE (dataplan_id);


--
-- Name: e_data_plans e_data_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_data_plans
    ADD CONSTRAINT e_data_plans_pkey PRIMARY KEY (id);


--
-- Name: electricity_purchases electricity_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.electricity_purchases
    ADD CONSTRAINT electricity_purchases_pkey PRIMARY KEY (id);


--
-- Name: payscribe_flashsale flashsale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payscribe_flashsale
    ADD CONSTRAINT flashsale_pkey PRIMARY KEY (id);


--
-- Name: payscribe_flashsale flashsale_plan_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payscribe_flashsale
    ADD CONSTRAINT flashsale_plan_code_key UNIQUE (plan_code);


--
-- Name: flashsale_purchases flashsale_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashsale_purchases
    ADD CONSTRAINT flashsale_purchases_pkey PRIMARY KEY (id);


--
-- Name: global_app_builds global_app_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_app_builds
    ADD CONSTRAINT global_app_builds_pkey PRIMARY KEY (id);


--
-- Name: global_base_plans global_base_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_base_plans
    ADD CONSTRAINT global_base_plans_pkey PRIMARY KEY (id);


--
-- Name: global_customers global_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_customers
    ADD CONSTRAINT global_customers_pkey PRIMARY KEY (id);


--
-- Name: global_email_logs global_email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_email_logs
    ADD CONSTRAINT global_email_logs_pkey PRIMARY KEY (id);


--
-- Name: global_orders global_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_orders
    ADD CONSTRAINT global_orders_pkey PRIMARY KEY (id);


--
-- Name: global_plans global_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_plans
    ADD CONSTRAINT global_plans_pkey PRIMARY KEY (id);


--
-- Name: global_reseller_app_configs global_reseller_app_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_app_configs
    ADD CONSTRAINT global_reseller_app_configs_pkey PRIMARY KEY (id);


--
-- Name: global_reseller_applications global_reseller_applications_auth_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_applications
    ADD CONSTRAINT global_reseller_applications_auth_email_key UNIQUE (auth_email);


--
-- Name: global_reseller_applications global_reseller_applications_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_applications
    ADD CONSTRAINT global_reseller_applications_email_key UNIQUE (email);


--
-- Name: global_reseller_applications global_reseller_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_applications
    ADD CONSTRAINT global_reseller_applications_pkey PRIMARY KEY (id);


--
-- Name: global_reseller_applications global_reseller_applications_store_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_applications
    ADD CONSTRAINT global_reseller_applications_store_slug_key UNIQUE (store_slug);


--
-- Name: global_reseller_plan_configs global_reseller_plan_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_plan_configs
    ADD CONSTRAINT global_reseller_plan_configs_pkey PRIMARY KEY (id);


--
-- Name: global_reseller_plan_configs global_reseller_plan_configs_reseller_id_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_plan_configs
    ADD CONSTRAINT global_reseller_plan_configs_reseller_id_plan_id_key UNIQUE (reseller_id, plan_id);


--
-- Name: global_reseller_settings global_reseller_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_settings
    ADD CONSTRAINT global_reseller_settings_pkey PRIMARY KEY (id);


--
-- Name: global_reseller_stores global_reseller_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_stores
    ADD CONSTRAINT global_reseller_stores_pkey PRIMARY KEY (id);


--
-- Name: global_reseller_stores global_reseller_stores_store_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_stores
    ADD CONSTRAINT global_reseller_stores_store_slug_key UNIQUE (store_slug);


--
-- Name: global_store_visits global_store_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_store_visits
    ADD CONSTRAINT global_store_visits_pkey PRIMARY KEY (id);


--
-- Name: global_transactions global_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_transactions
    ADD CONSTRAINT global_transactions_pkey PRIMARY KEY (id);


--
-- Name: global_virtual_accounts global_virtual_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_virtual_accounts
    ADD CONSTRAINT global_virtual_accounts_account_number_key UNIQUE (account_number);


--
-- Name: global_virtual_accounts global_virtual_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_virtual_accounts
    ADD CONSTRAINT global_virtual_accounts_pkey PRIMARY KEY (id);


--
-- Name: global_wallets global_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_wallets
    ADD CONSTRAINT global_wallets_pkey PRIMARY KEY (id);


--
-- Name: hot_deals hot_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_deals
    ADD CONSTRAINT hot_deals_pkey PRIMARY KEY (id);


--
-- Name: lizzy_flashsale lizzy_flashsale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lizzy_flashsale
    ADD CONSTRAINT lizzy_flashsale_pkey PRIMARY KEY (planid);


--
-- Name: lizzy lizzy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lizzy
    ADD CONSTRAINT lizzy_pkey PRIMARY KEY (plan_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: plan_settings_log plan_settings_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_settings_log
    ADD CONSTRAINT plan_settings_log_pkey PRIMARY KEY (id);


--
-- Name: plan_settings plan_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_settings
    ADD CONSTRAINT plan_settings_pkey PRIMARY KEY (provider, plan_id);


--
-- Name: plan_settings plan_settings_provider_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_settings
    ADD CONSTRAINT plan_settings_provider_plan_id_key UNIQUE (provider, plan_id);


--
-- Name: price_adjustments price_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_adjustments
    ADD CONSTRAINT price_adjustments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: reseller_app_configs reseller_app_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_app_configs
    ADD CONSTRAINT reseller_app_configs_pkey PRIMARY KEY (id);


--
-- Name: reseller_app_configs reseller_app_configs_reseller_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_app_configs
    ADD CONSTRAINT reseller_app_configs_reseller_id_key UNIQUE (reseller_id);


--
-- Name: reseller_assets reseller_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_assets
    ADD CONSTRAINT reseller_assets_pkey PRIMARY KEY (id);


--
-- Name: reseller_base_plans reseller_base_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_base_plans
    ADD CONSTRAINT reseller_base_plans_pkey PRIMARY KEY (id);


--
-- Name: reseller_customer_notifications reseller_customer_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_notifications
    ADD CONSTRAINT reseller_customer_notifications_pkey PRIMARY KEY (id);


--
-- Name: reseller_customer_transactions reseller_customer_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_transactions
    ADD CONSTRAINT reseller_customer_transactions_pkey PRIMARY KEY (id);


--
-- Name: reseller_customer_transactions reseller_customer_transactions_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_transactions
    ADD CONSTRAINT reseller_customer_transactions_reference_key UNIQUE (reference);


--
-- Name: reseller_customer_virtual_accounts reseller_customer_virtual_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_virtual_accounts
    ADD CONSTRAINT reseller_customer_virtual_accounts_pkey PRIMARY KEY (id);


--
-- Name: reseller_customer_wallets reseller_customer_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_wallets
    ADD CONSTRAINT reseller_customer_wallets_pkey PRIMARY KEY (id);


--
-- Name: reseller_customer_wallets reseller_customer_wallets_reseller_customer_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_wallets
    ADD CONSTRAINT reseller_customer_wallets_reseller_customer_unique UNIQUE (reseller_id, customer_id);


--
-- Name: reseller_customer_wallets reseller_customer_wallets_reseller_id_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_wallets
    ADD CONSTRAINT reseller_customer_wallets_reseller_id_customer_id_key UNIQUE (reseller_id, customer_id);


--
-- Name: reseller_customers reseller_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customers
    ADD CONSTRAINT reseller_customers_pkey PRIMARY KEY (id);


--
-- Name: reseller_customers reseller_customers_reseller_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customers
    ADD CONSTRAINT reseller_customers_reseller_email_unique UNIQUE (reseller_id, email);


--
-- Name: reseller_email_sequence reseller_email_sequence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_email_sequence
    ADD CONSTRAINT reseller_email_sequence_pkey PRIMARY KEY (id);


--
-- Name: reseller_email_sequence reseller_email_sequence_reseller_id_email_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_email_sequence
    ADD CONSTRAINT reseller_email_sequence_reseller_id_email_number_key UNIQUE (reseller_id, email_number);


--
-- Name: reseller_notifications reseller_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_notifications
    ADD CONSTRAINT reseller_notifications_pkey PRIMARY KEY (id);


--
-- Name: reseller_orders reseller_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_orders
    ADD CONSTRAINT reseller_orders_pkey PRIMARY KEY (id);


--
-- Name: reseller_plan_configs reseller_plan_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_plan_configs
    ADD CONSTRAINT reseller_plan_configs_pkey PRIMARY KEY (id);


--
-- Name: reseller_plan_configs reseller_plan_configs_reseller_id_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_plan_configs
    ADD CONSTRAINT reseller_plan_configs_reseller_id_plan_id_key UNIQUE (reseller_id, plan_id);


--
-- Name: reseller_transactions reseller_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_transactions
    ADD CONSTRAINT reseller_transactions_pkey PRIMARY KEY (id);


--
-- Name: reseller_virtual_accounts reseller_virtual_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_virtual_accounts
    ADD CONSTRAINT reseller_virtual_accounts_pkey PRIMARY KEY (id);


--
-- Name: reseller_wallets reseller_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_wallets
    ADD CONSTRAINT reseller_wallets_pkey PRIMARY KEY (id);


--
-- Name: reseller_wallets reseller_wallets_reseller_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_wallets
    ADD CONSTRAINT reseller_wallets_reseller_id_key UNIQUE (reseller_id);


--
-- Name: resellers resellers_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resellers
    ADD CONSTRAINT resellers_auth_user_id_key UNIQUE (auth_user_id);


--
-- Name: resellers resellers_dashboard_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resellers
    ADD CONSTRAINT resellers_dashboard_token_key UNIQUE (dashboard_token);


--
-- Name: resellers resellers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resellers
    ADD CONSTRAINT resellers_email_key UNIQUE (email);


--
-- Name: resellers resellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resellers
    ADD CONSTRAINT resellers_pkey PRIMARY KEY (id);


--
-- Name: resellers resellers_store_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resellers
    ADD CONSTRAINT resellers_store_name_key UNIQUE (store_name);


--
-- Name: revenue_withdrawals revenue_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_withdrawals
    ADD CONSTRAINT revenue_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: rewards rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_reference_key UNIQUE (reference);


--
-- Name: profiles unique_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: plan_settings unique_provider_bundle_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_settings
    ADD CONSTRAINT unique_provider_bundle_id UNIQUE (provider, bundle_id);


--
-- Name: transactions unique_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT unique_reference UNIQUE (reference);


--
-- Name: reseller_customers unique_reseller_customer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customers
    ADD CONSTRAINT unique_reseller_customer UNIQUE (reseller_id, auth_user_id);


--
-- Name: global_wallets unique_reseller_wallet; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_wallets
    ADD CONSTRAINT unique_reseller_wallet UNIQUE (reseller_id);


--
-- Name: user_push_tokens user_push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_push_tokens
    ADD CONSTRAINT user_push_tokens_pkey PRIMARY KEY (user_id);


--
-- Name: user_tokens user_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (id);


--
-- Name: virtual_accounts virtual_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_accounts
    ADD CONSTRAINT virtual_accounts_pkey PRIMARY KEY (id);


--
-- Name: virtual_accounts virtual_accounts_user_id_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_accounts
    ADD CONSTRAINT virtual_accounts_user_id_account_number_key UNIQUE (user_id, account_number);


--
-- Name: waitlist waitlist_bvn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_bvn_key UNIQUE (bvn);


--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);


--
-- Name: wallet_audit wallet_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_audit
    ADD CONSTRAINT wallet_audit_pkey PRIMARY KEY (id);


--
-- Name: wallet wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet
    ADD CONSTRAINT wallet_pkey PRIMARY KEY (user_email);


--
-- Name: web_push_tokens web_push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_push_tokens
    ADD CONSTRAINT web_push_tokens_pkey PRIMARY KEY (id);


--
-- Name: web_push_tokens web_push_tokens_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_push_tokens
    ADD CONSTRAINT web_push_tokens_user_id_key UNIQUE (user_id);


--
-- Name: welcome_offer_product welcome_offer_product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.welcome_offer_product
    ADD CONSTRAINT welcome_offer_product_pkey PRIMARY KEY (id);


--
-- Name: welcome_offer_text welcome_offer_text_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.welcome_offer_text
    ADD CONSTRAINT welcome_offer_text_key_key UNIQUE (key);


--
-- Name: welcome_offer_text welcome_offer_text_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.welcome_offer_text
    ADD CONSTRAINT welcome_offer_text_pkey PRIMARY KEY (id);


--
-- Name: welcome_offer_usage welcome_offer_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.welcome_offer_usage
    ADD CONSTRAINT welcome_offer_usage_pkey PRIMARY KEY (user_email);


--
-- Name: xixapay_sweep_logs xixapay_sweep_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xixapay_sweep_logs
    ADD CONSTRAINT xixapay_sweep_logs_pkey PRIMARY KEY (id);


--
-- Name: xixapay_wallet_ledger xixapay_wallet_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xixapay_wallet_ledger
    ADD CONSTRAINT xixapay_wallet_ledger_pkey PRIMARY KEY (id);


--
-- Name: xixapay_wallet_ledger xixapay_wallet_ledger_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xixapay_wallet_ledger
    ADD CONSTRAINT xixapay_wallet_ledger_transaction_id_key UNIQUE (transaction_id);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_base_plans_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_plans_active ON public.reseller_base_plans USING btree (is_active);


--
-- Name: idx_base_plans_flash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_plans_flash ON public.reseller_base_plans USING btree (is_flash_sale);


--
-- Name: idx_base_plans_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_plans_network ON public.reseller_base_plans USING btree (network);


--
-- Name: idx_base_plans_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_plans_type ON public.reseller_base_plans USING btree (plan_type);


--
-- Name: idx_cable_plans_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cable_plans_provider ON public.cable_plans USING btree (provider);


--
-- Name: idx_customer_active_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_customer_active_account ON public.reseller_customer_virtual_accounts USING btree (reseller_id, customer_id) WHERE (status = 'active'::text);


--
-- Name: idx_customer_notifications_reseller_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_notifications_reseller_customer ON public.reseller_customer_notifications USING btree (reseller_id, customer_id, created_at DESC);


--
-- Name: idx_customer_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_transactions_created_at ON public.reseller_customer_transactions USING btree (created_at DESC);


--
-- Name: idx_customer_transactions_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_transactions_customer_id ON public.reseller_customer_transactions USING btree (customer_id);


--
-- Name: idx_customer_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_transactions_reference ON public.reseller_customer_transactions USING btree (reference);


--
-- Name: idx_customer_transactions_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_transactions_reseller_id ON public.reseller_customer_transactions USING btree (reseller_id);


--
-- Name: idx_customer_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_transactions_type ON public.reseller_customer_transactions USING btree (type);


--
-- Name: idx_e_data_plans_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e_data_plans_network ON public.e_data_plans USING btree (network);


--
-- Name: idx_e_data_plans_plan_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e_data_plans_plan_network ON public.e_data_plans USING btree (plan_network);


--
-- Name: idx_e_data_plans_plan_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e_data_plans_plan_type ON public.e_data_plans USING btree (plan_type);


--
-- Name: idx_electricity_purchases_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_electricity_purchases_created_at ON public.electricity_purchases USING btree (created_at DESC);


--
-- Name: idx_electricity_purchases_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_electricity_purchases_user_id ON public.electricity_purchases USING btree (user_id);


--
-- Name: idx_flashsale_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flashsale_active ON public.lizzy_flashsale USING btree (network, isflashsale) WHERE (isflashsale = true);


--
-- Name: idx_flashsale_purchases_planid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flashsale_purchases_planid ON public.flashsale_purchases USING btree (planid, status);


--
-- Name: idx_global_app_configs_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_app_configs_application ON public.global_reseller_app_configs USING btree (application_id);


--
-- Name: idx_global_app_configs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_app_configs_status ON public.global_reseller_app_configs USING btree (build_status);


--
-- Name: idx_global_applications_auth_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_applications_auth_email ON public.global_reseller_applications USING btree (auth_email);


--
-- Name: idx_global_applications_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_applications_email ON public.global_reseller_applications USING btree (email);


--
-- Name: idx_global_applications_original_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_applications_original_email ON public.global_reseller_applications USING btree (original_email);


--
-- Name: idx_global_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_applications_status ON public.global_reseller_applications USING btree (application_status);


--
-- Name: idx_global_applications_store_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_applications_store_slug ON public.global_reseller_applications USING btree (store_slug);


--
-- Name: idx_global_base_plans_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_base_plans_active ON public.global_base_plans USING btree (is_active);


--
-- Name: idx_global_base_plans_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_base_plans_category ON public.global_base_plans USING btree (category);


--
-- Name: idx_global_base_plans_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_base_plans_country ON public.global_base_plans USING btree (country_code);


--
-- Name: idx_global_base_plans_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_base_plans_network ON public.global_base_plans USING btree (network);


--
-- Name: idx_global_base_plans_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_base_plans_provider ON public.global_base_plans USING btree (provider);


--
-- Name: idx_global_base_plans_provider_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_base_plans_provider_plan ON public.global_base_plans USING btree (provider_plan_id);


--
-- Name: idx_global_builds_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_builds_application ON public.global_app_builds USING btree (application_id);


--
-- Name: idx_global_builds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_builds_status ON public.global_app_builds USING btree (build_status);


--
-- Name: idx_global_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_customers_email ON public.global_customers USING btree (email);


--
-- Name: idx_global_customers_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_customers_reseller_id ON public.global_customers USING btree (reseller_id);


--
-- Name: idx_global_email_logs_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_email_logs_application ON public.global_email_logs USING btree (application_id);


--
-- Name: idx_global_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_orders_customer_id ON public.global_orders USING btree (customer_id);


--
-- Name: idx_global_orders_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_orders_reseller_id ON public.global_orders USING btree (reseller_id);


--
-- Name: idx_global_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_orders_status ON public.global_orders USING btree (status);


--
-- Name: idx_global_plans_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_plans_reseller_id ON public.global_plans USING btree (reseller_id);


--
-- Name: idx_global_reseller_plan_configs_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_reseller_plan_configs_plan ON public.global_reseller_plan_configs USING btree (plan_id);


--
-- Name: idx_global_reseller_plan_configs_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_reseller_plan_configs_reseller ON public.global_reseller_plan_configs USING btree (reseller_id);


--
-- Name: idx_global_stores_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_stores_slug ON public.global_reseller_stores USING btree (store_slug);


--
-- Name: idx_global_transactions_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_transactions_reseller_id ON public.global_transactions USING btree (reseller_id);


--
-- Name: idx_global_transactions_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_transactions_wallet_id ON public.global_transactions USING btree (wallet_id);


--
-- Name: idx_global_virtual_accounts_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_virtual_accounts_account_number ON public.global_virtual_accounts USING btree (account_number);


--
-- Name: idx_global_virtual_accounts_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_virtual_accounts_reseller_id ON public.global_virtual_accounts USING btree (reseller_id);


--
-- Name: idx_global_wallets_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_wallets_reseller_id ON public.global_wallets USING btree (reseller_id);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_price_adjustments_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_adjustments_provider ON public.price_adjustments USING btree (provider);


--
-- Name: idx_price_adjustments_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_price_adjustments_unique ON public.price_adjustments USING btree (provider, data_amount, validity) WHERE (is_active = true);


--
-- Name: idx_referrals_referee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referee_id ON public.referrals USING btree (referee_id);


--
-- Name: idx_referrals_referrer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);


--
-- Name: idx_reseller_active_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_reseller_active_account ON public.reseller_virtual_accounts USING btree (reseller_id) WHERE (status = 'active'::text);


--
-- Name: idx_reseller_app_configs_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_app_configs_reseller ON public.reseller_app_configs USING btree (reseller_id);


--
-- Name: idx_reseller_app_configs_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_app_configs_reseller_id ON public.reseller_app_configs USING btree (reseller_id);


--
-- Name: idx_reseller_app_configs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_app_configs_status ON public.reseller_app_configs USING btree (build_status);


--
-- Name: idx_reseller_assets_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_assets_reseller ON public.reseller_assets USING btree (reseller_id);


--
-- Name: idx_reseller_assets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_assets_type ON public.reseller_assets USING btree (reseller_id, type);


--
-- Name: idx_reseller_customer_wallets_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_customer_wallets_customer ON public.reseller_customer_wallets USING btree (customer_id);


--
-- Name: idx_reseller_customer_wallets_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_customer_wallets_reseller ON public.reseller_customer_wallets USING btree (reseller_id);


--
-- Name: idx_reseller_customers_auth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_customers_auth ON public.reseller_customers USING btree (auth_user_id);


--
-- Name: idx_reseller_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_customers_email ON public.reseller_customers USING btree (email, reseller_id);


--
-- Name: idx_reseller_customers_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_customers_reseller ON public.reseller_customers USING btree (reseller_id);


--
-- Name: idx_reseller_customers_reseller_notif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_customers_reseller_notif ON public.reseller_customers USING btree (reseller_id, notifications_enabled);


--
-- Name: idx_reseller_email_seq_reseller_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_email_seq_reseller_email ON public.reseller_email_sequence USING btree (reseller_id, email_number);


--
-- Name: idx_reseller_notifications_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_notifications_reseller ON public.reseller_notifications USING btree (reseller_id, created_at DESC);


--
-- Name: idx_reseller_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_orders_created ON public.reseller_orders USING btree (created_at DESC);


--
-- Name: idx_reseller_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_orders_customer ON public.reseller_orders USING btree (customer_email, reseller_id);


--
-- Name: idx_reseller_orders_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_orders_reseller ON public.reseller_orders USING btree (reseller_id);


--
-- Name: idx_reseller_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_orders_status ON public.reseller_orders USING btree (status);


--
-- Name: idx_reseller_plan_configs_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_plan_configs_enabled ON public.reseller_plan_configs USING btree (enabled);


--
-- Name: idx_reseller_plan_configs_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_plan_configs_plan ON public.reseller_plan_configs USING btree (plan_id);


--
-- Name: idx_reseller_plan_configs_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_plan_configs_reseller ON public.reseller_plan_configs USING btree (reseller_id);


--
-- Name: idx_reseller_transactions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_transactions_created ON public.reseller_transactions USING btree (created_at DESC);


--
-- Name: idx_reseller_transactions_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_transactions_reseller ON public.reseller_transactions USING btree (reseller_id);


--
-- Name: idx_reseller_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_transactions_status ON public.reseller_transactions USING btree (status);


--
-- Name: idx_reseller_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_transactions_type ON public.reseller_transactions USING btree (type);


--
-- Name: idx_reseller_virtual_accounts_reseller_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_virtual_accounts_reseller_status ON public.reseller_virtual_accounts USING btree (reseller_id, status);


--
-- Name: idx_reseller_wallets_reseller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_wallets_reseller ON public.reseller_wallets USING btree (reseller_id);


--
-- Name: idx_reseller_wallets_reseller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reseller_wallets_reseller_id ON public.reseller_wallets USING btree (reseller_id);


--
-- Name: idx_resellers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resellers_email ON public.resellers USING btree (email);


--
-- Name: idx_resellers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resellers_status ON public.resellers USING btree (status);


--
-- Name: idx_resellers_store_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resellers_store_name ON public.resellers USING btree (store_name);


--
-- Name: idx_sweep_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sweep_logs_status ON public.xixapay_sweep_logs USING btree (status);


--
-- Name: idx_sweep_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sweep_logs_timestamp ON public.xixapay_sweep_logs USING btree ("timestamp" DESC);


--
-- Name: idx_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_reference ON public.transactions USING btree (reference);


--
-- Name: idx_transactions_user_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_email ON public.transactions USING btree (user_email);


--
-- Name: idx_user_push_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens USING btree (user_id);


--
-- Name: idx_virtual_accounts_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtual_accounts_account_number ON public.virtual_accounts USING btree (account_number);


--
-- Name: idx_virtual_accounts_customer_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtual_accounts_customer_email ON public.virtual_accounts USING btree (customer_email);


--
-- Name: idx_virtual_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtual_accounts_user_id ON public.virtual_accounts USING btree (user_id);


--
-- Name: idx_xixapay_ledger_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_xixapay_ledger_created_at ON public.xixapay_wallet_ledger USING btree (created_at DESC);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: reseller_customers after_customer_insert_wallet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_customer_insert_wallet AFTER INSERT ON public.reseller_customers FOR EACH ROW EXECUTE FUNCTION public.create_customer_wallet();

ALTER TABLE public.reseller_customers DISABLE TRIGGER after_customer_insert_wallet;


--
-- Name: resellers after_reseller_insert_plans; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_reseller_insert_plans AFTER INSERT ON public.resellers FOR EACH ROW EXECUTE FUNCTION public.create_default_reseller_plan_configs();


--
-- Name: resellers after_reseller_insert_wallet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_reseller_insert_wallet AFTER INSERT ON public.resellers FOR EACH ROW EXECUTE FUNCTION public.create_reseller_wallet();


--
-- Name: airtime_purchases airtime_purchase_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER airtime_purchase_trigger AFTER INSERT ON public.airtime_purchases FOR EACH ROW EXECUTE FUNCTION public.notify_airtime_purchase();


--
-- Name: reseller_app_configs apk_ready_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER apk_ready_trigger AFTER UPDATE OF apk_url ON public.reseller_app_configs FOR EACH ROW EXECUTE FUNCTION public.notify_apk_ready();


--
-- Name: app_updates app_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER app_update_trigger AFTER INSERT ON public.app_updates FOR EACH ROW EXECUTE FUNCTION public.notify_app_update();


--
-- Name: welcome_offer_product auto_set_network_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_set_network_id BEFORE INSERT OR UPDATE ON public.welcome_offer_product FOR EACH ROW EXECUTE FUNCTION public.set_network_id_from_provider();


--
-- Name: cable_purchases cable_purchase_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cable_purchase_trigger AFTER INSERT ON public.cable_purchases FOR EACH ROW EXECUTE FUNCTION public.notify_cable_purchase();


--
-- Name: reseller_customer_notifications customer_push_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_push_trigger AFTER INSERT ON public.reseller_customer_notifications FOR EACH ROW EXECUTE FUNCTION public.trigger_customer_push();


--
-- Name: data_purchases data_purchase_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER data_purchase_trigger AFTER INSERT ON public.data_purchases FOR EACH ROW EXECUTE FUNCTION public.notify_data_purchase();


--
-- Name: deposits deposit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deposit_trigger AFTER INSERT ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.notify_deposit();


--
-- Name: transactions failed_transaction_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER failed_transaction_trigger AFTER UPDATE OF status ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_failed_transaction();


--
-- Name: hot_deals hot_deal_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hot_deal_trigger AFTER INSERT ON public.hot_deals FOR EACH ROW EXECUTE FUNCTION public.notify_hot_deal();


--
-- Name: notifications on_insert_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_insert_notification AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notify_new_notification();


--
-- Name: reseller_notifications reseller_push_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reseller_push_trigger AFTER INSERT ON public.reseller_notifications FOR EACH ROW EXECUTE FUNCTION public.trigger_reseller_push();


--
-- Name: notifications send-push-on-notification-insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "send-push-on-notification-insert" AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/send-push-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeXlmYXhjd2Fucm1paXB6a29qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE1MDk4MCwiZXhwIjoyMDYwNzI2OTgwfQ.PoNIFcd-6gXD8u4bAdK2I4k_-jhldg1Thnti1uZcLq8"}', '{}', '5000');


--
-- Name: welcome_offer_usage trg_welcome_offer_usage_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_welcome_offer_usage_updated_at BEFORE UPDATE ON public.welcome_offer_usage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lizzy_flashsale trigger_calculate_discount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_discount BEFORE INSERT OR UPDATE OF oldprice, newprice ON public.lizzy_flashsale FOR EACH ROW EXECUTE FUNCTION public.calculate_discount_percentage();


--
-- Name: transactions trigger_flashsale_purchase_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_flashsale_purchase_insert AFTER INSERT ON public.transactions FOR EACH ROW WHEN (((new.type = 'flash_sale_purchase'::text) AND (new.status = 'completed'::text))) EXECUTE FUNCTION public.handle_flashsale_transaction_insert();


--
-- Name: flashsale_purchases trigger_increment_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_increment_stock AFTER INSERT ON public.flashsale_purchases FOR EACH ROW EXECUTE FUNCTION public.increment_stock_sold();


--
-- Name: flashsale_purchases trigger_purchase_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_purchase_status_change AFTER UPDATE OF status ON public.flashsale_purchases FOR EACH ROW EXECUTE FUNCTION public.handle_purchase_status_change();


--
-- Name: transactions trigger_update_wallet_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_wallet_balance AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();


--
-- Name: welcome_offer_usage trigger_update_welcome_offer_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_welcome_offer_usage BEFORE UPDATE ON public.welcome_offer_usage FOR EACH ROW EXECUTE FUNCTION public.handle_welcome_offer_usage_update();


--
-- Name: transactions trigger_welcome_offer_on_purchase; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_welcome_offer_on_purchase AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_welcome_offer_on_purchase();


--
-- Name: cable_plans update_cable_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cable_plans_updated_at BEFORE UPDATE ON public.cable_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: electricity_purchases update_electricity_purchases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_electricity_purchases_updated_at BEFORE UPDATE ON public.electricity_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: global_base_plans update_global_base_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_global_base_plans_updated_at BEFORE UPDATE ON public.global_base_plans FOR EACH ROW EXECUTE FUNCTION public.update_global_updated_at_column();


--
-- Name: global_reseller_plan_configs update_global_reseller_plan_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_global_reseller_plan_configs_updated_at BEFORE UPDATE ON public.global_reseller_plan_configs FOR EACH ROW EXECUTE FUNCTION public.update_global_updated_at_column();


--
-- Name: price_adjustments update_price_adjustments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_adjustments_updated_at BEFORE UPDATE ON public.price_adjustments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reseller_app_configs update_reseller_app_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reseller_app_configs_updated_at BEFORE UPDATE ON public.reseller_app_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reseller_customer_wallets update_reseller_customer_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reseller_customer_wallets_updated_at BEFORE UPDATE ON public.reseller_customer_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reseller_plan_configs update_reseller_plan_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reseller_plan_configs_updated_at BEFORE UPDATE ON public.reseller_plan_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reseller_wallets update_reseller_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reseller_wallets_updated_at BEFORE UPDATE ON public.reseller_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: resellers update_resellers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON public.resellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions validate_metadata_before_insert_or_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_metadata_before_insert_or_update BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.validate_metadata_json();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: airtime_purchases airtime_purchases_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airtime_purchases
    ADD CONSTRAINT airtime_purchases_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: business_ledger business_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_ledger
    ADD CONSTRAINT business_ledger_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: cable_purchases cable_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cable_purchases
    ADD CONSTRAINT cable_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: customer_issues customer_issues_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_issues
    ADD CONSTRAINT customer_issues_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: data_purchases data_purchases_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_purchases
    ADD CONSTRAINT data_purchases_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: deposits deposits_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: electricity_purchases electricity_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.electricity_purchases
    ADD CONSTRAINT electricity_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications fk_transaction; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: notifications fk_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: flashsale_purchases flashsale_purchases_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashsale_purchases
    ADD CONSTRAINT flashsale_purchases_planid_fkey FOREIGN KEY (planid) REFERENCES public.lizzy_flashsale(planid);


--
-- Name: flashsale_purchases flashsale_purchases_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashsale_purchases
    ADD CONSTRAINT flashsale_purchases_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: flashsale_purchases flashsale_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashsale_purchases
    ADD CONSTRAINT flashsale_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: global_app_builds global_app_builds_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_app_builds
    ADD CONSTRAINT global_app_builds_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_customers global_customers_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_customers
    ADD CONSTRAINT global_customers_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_email_logs global_email_logs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_email_logs
    ADD CONSTRAINT global_email_logs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_orders global_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_orders
    ADD CONSTRAINT global_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.global_customers(id) ON DELETE SET NULL;


--
-- Name: global_orders global_orders_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_orders
    ADD CONSTRAINT global_orders_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_plans global_plans_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_plans
    ADD CONSTRAINT global_plans_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_reseller_app_configs global_reseller_app_configs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_app_configs
    ADD CONSTRAINT global_reseller_app_configs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_reseller_plan_configs global_reseller_plan_configs_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_plan_configs
    ADD CONSTRAINT global_reseller_plan_configs_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.global_base_plans(id) ON DELETE CASCADE;


--
-- Name: global_reseller_plan_configs global_reseller_plan_configs_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_plan_configs
    ADD CONSTRAINT global_reseller_plan_configs_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_reseller_stores global_reseller_stores_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_reseller_stores
    ADD CONSTRAINT global_reseller_stores_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_store_visits global_store_visits_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_store_visits
    ADD CONSTRAINT global_store_visits_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_transactions global_transactions_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_transactions
    ADD CONSTRAINT global_transactions_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_transactions global_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_transactions
    ADD CONSTRAINT global_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.global_wallets(id) ON DELETE SET NULL;


--
-- Name: global_virtual_accounts global_virtual_accounts_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_virtual_accounts
    ADD CONSTRAINT global_virtual_accounts_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: global_wallets global_wallets_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_wallets
    ADD CONSTRAINT global_wallets_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE;


--
-- Name: plan_settings_log plan_settings_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_settings_log
    ADD CONSTRAINT plan_settings_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: referrals referrals_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.profiles(id);


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id);


--
-- Name: reseller_app_configs reseller_app_configs_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_app_configs
    ADD CONSTRAINT reseller_app_configs_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_assets reseller_assets_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_assets
    ADD CONSTRAINT reseller_assets_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_notifications reseller_customer_notifications_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_notifications
    ADD CONSTRAINT reseller_customer_notifications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.reseller_customers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_notifications reseller_customer_notifications_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_notifications
    ADD CONSTRAINT reseller_customer_notifications_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_transactions reseller_customer_transactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_transactions
    ADD CONSTRAINT reseller_customer_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.reseller_customers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_transactions reseller_customer_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_transactions
    ADD CONSTRAINT reseller_customer_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.reseller_orders(id) ON DELETE SET NULL;


--
-- Name: reseller_customer_transactions reseller_customer_transactions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_transactions
    ADD CONSTRAINT reseller_customer_transactions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.reseller_base_plans(id) ON DELETE SET NULL;


--
-- Name: reseller_customer_transactions reseller_customer_transactions_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_transactions
    ADD CONSTRAINT reseller_customer_transactions_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_virtual_accounts reseller_customer_virtual_accounts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_virtual_accounts
    ADD CONSTRAINT reseller_customer_virtual_accounts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.reseller_customers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_virtual_accounts reseller_customer_virtual_accounts_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_virtual_accounts
    ADD CONSTRAINT reseller_customer_virtual_accounts_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_wallets reseller_customer_wallets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_wallets
    ADD CONSTRAINT reseller_customer_wallets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.reseller_customers(id) ON DELETE CASCADE;


--
-- Name: reseller_customer_wallets reseller_customer_wallets_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customer_wallets
    ADD CONSTRAINT reseller_customer_wallets_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_customers reseller_customers_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_customers
    ADD CONSTRAINT reseller_customers_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_email_sequence reseller_email_sequence_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_email_sequence
    ADD CONSTRAINT reseller_email_sequence_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_notifications reseller_notifications_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_notifications
    ADD CONSTRAINT reseller_notifications_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_orders reseller_orders_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_orders
    ADD CONSTRAINT reseller_orders_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_plan_configs reseller_plan_configs_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_plan_configs
    ADD CONSTRAINT reseller_plan_configs_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.reseller_base_plans(id) ON DELETE CASCADE;


--
-- Name: reseller_plan_configs reseller_plan_configs_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_plan_configs
    ADD CONSTRAINT reseller_plan_configs_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_transactions reseller_transactions_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_transactions
    ADD CONSTRAINT reseller_transactions_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_virtual_accounts reseller_virtual_accounts_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_virtual_accounts
    ADD CONSTRAINT reseller_virtual_accounts_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: reseller_wallets reseller_wallets_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reseller_wallets
    ADD CONSTRAINT reseller_wallets_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;


--
-- Name: rewards rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: user_push_tokens user_push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_push_tokens
    ADD CONSTRAINT user_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_tokens user_tokens_user_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_user_email_fkey FOREIGN KEY (user_email) REFERENCES public.profiles(email);


--
-- Name: virtual_accounts virtual_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_accounts
    ADD CONSTRAINT virtual_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_audit wallet_audit_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_audit
    ADD CONSTRAINT wallet_audit_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: wallet_audit wallet_audit_user_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_audit
    ADD CONSTRAINT wallet_audit_user_email_fkey FOREIGN KEY (user_email) REFERENCES public.profiles(email);


--
-- Name: web_push_tokens web_push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_push_tokens
    ADD CONSTRAINT web_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: global_reseller_plan_configs Admin can delete configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete configs" ON public.global_reseller_plan_configs FOR DELETE USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: global_base_plans Admin can delete plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete plans" ON public.global_base_plans FOR DELETE USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: global_base_plans Admin can insert plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert plans" ON public.global_base_plans FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: global_reseller_plan_configs Admin can read all configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read all configs" ON public.global_reseller_plan_configs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: global_base_plans Admin can read all plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read all plans" ON public.global_base_plans FOR SELECT USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: global_reseller_plan_configs Admin can update all configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update all configs" ON public.global_reseller_plan_configs FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: global_base_plans Admin can update plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update plans" ON public.global_base_plans FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: reseller_customer_notifications Admins can insert customer notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert customer notifications" ON public.reseller_customer_notifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: reseller_notifications Admins can insert reseller notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert reseller notifications" ON public.reseller_notifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: reseller_customer_virtual_accounts Admins can manage all customer virtual accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all customer virtual accounts" ON public.reseller_customer_virtual_accounts USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: reseller_virtual_accounts Admins can manage all reseller virtual accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reseller virtual accounts" ON public.reseller_virtual_accounts USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: plan_settings Allow admins to upsert plan_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to upsert plan_settings" ON public.plan_settings TO authenticated USING ((auth.email() = 'bossblingzs@gmail.com'::text));


--
-- Name: reseller_customers Allow authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert" ON public.reseller_customers FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: business_ledger Allow authenticated insert on business_ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert on business_ledger" ON public.business_ledger FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: revenue_withdrawals Allow authenticated insert on revenue_withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert on revenue_withdrawals" ON public.revenue_withdrawals FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: transactions Allow authenticated insert on transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert on transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: airtime_purchases Allow authenticated inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated inserts" ON public.airtime_purchases FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: cable_purchases Allow authenticated inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated inserts" ON public.cable_purchases FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: coming_soon_notifications Allow authenticated inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated inserts" ON public.coming_soon_notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: customer_issues Allow authenticated inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated inserts" ON public.customer_issues FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: referrals Allow authenticated inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated inserts" ON public.referrals FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: rewards Allow authenticated inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated inserts" ON public.rewards FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: business_ledger Allow authenticated read on business_ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read on business_ledger" ON public.business_ledger FOR SELECT TO authenticated USING (true);


--
-- Name: revenue_withdrawals Allow authenticated read on revenue_withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read on revenue_withdrawals" ON public.revenue_withdrawals FOR SELECT TO authenticated USING (true);


--
-- Name: transactions Allow authenticated read on transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read on transactions" ON public.transactions FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Allow authenticated reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated reads" ON public.profiles FOR SELECT TO authenticated USING ((email = auth.email()));


--
-- Name: transactions Allow authenticated update on transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated update on transactions" ON public.transactions FOR UPDATE TO authenticated USING (true);


--
-- Name: profiles Allow authenticated updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated updates" ON public.profiles FOR UPDATE TO authenticated USING ((email = auth.email()));


--
-- Name: lizzy_flashsale Allow authenticated users to read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to read" ON public.lizzy_flashsale FOR SELECT TO authenticated USING (true);


--
-- Name: cable_plans Allow authenticated users to read cable plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to read cable plans" ON public.cable_plans FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: plan_settings Allow authenticated users to read plan_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to read plan_settings" ON public.plan_settings FOR SELECT TO authenticated USING (true);


--
-- Name: deposits Allow deposit inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow deposit inserts" ON public.deposits FOR INSERT TO authenticated, service_role WITH CHECK (true);


--
-- Name: transactions Allow edge function to update transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow edge function to update transactions" ON public.transactions FOR UPDATE USING (((auth.role() = 'anon'::text) OR (auth.role() = 'service_role'::text))) WITH CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text])));


--
-- Name: transactions Allow edge function transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow edge function transactions" ON public.transactions TO authenticated, service_role USING (true) WITH CHECK (true);


--
-- Name: reseller_orders Allow insert orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert orders" ON public.reseller_orders FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: profiles Allow insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: transactions Allow read access to own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to own transactions" ON public.transactions FOR SELECT USING ((auth.email() = user_email));


--
-- Name: referrals Allow referrer reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow referrer reads" ON public.referrals FOR SELECT TO authenticated USING ((referrer_id = ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.email = auth.email()))));


--
-- Name: profiles Allow select profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select profiles" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Allow update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: airtime_purchases Allow user reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow user reads" ON public.airtime_purchases FOR SELECT TO authenticated USING ((id = ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.email = auth.email()))));


--
-- Name: cable_purchases Allow user reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow user reads" ON public.cable_purchases FOR SELECT TO authenticated USING ((id = ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.email = auth.email()))));


--
-- Name: customer_issues Allow user reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow user reads" ON public.customer_issues FOR SELECT TO authenticated USING ((user_id = ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.email = auth.email()))));


--
-- Name: rewards Allow user reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow user reads" ON public.rewards FOR SELECT TO authenticated USING ((user_id = ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.email = auth.email()))));


--
-- Name: reseller_customer_virtual_accounts Customers can create own virtual accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create own virtual accounts" ON public.reseller_customer_virtual_accounts FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT reseller_customers.auth_user_id
   FROM public.reseller_customers
  WHERE (reseller_customers.id = reseller_customer_virtual_accounts.customer_id))));


--
-- Name: reseller_customer_wallets Customers can create own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create own wallet" ON public.reseller_customer_wallets FOR INSERT TO authenticated WITH CHECK ((customer_id IN ( SELECT reseller_customers.id
   FROM public.reseller_customers
  WHERE (reseller_customers.auth_user_id = auth.uid()))));


--
-- Name: reseller_customer_transactions Customers can insert their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can insert their own transactions" ON public.reseller_customer_transactions FOR INSERT WITH CHECK ((auth.uid() = ( SELECT reseller_customers.auth_user_id
   FROM public.reseller_customers
  WHERE ((reseller_customers.id = reseller_customer_transactions.customer_id) AND (reseller_customers.reseller_id = reseller_customer_transactions.reseller_id)))));


--
-- Name: reseller_customer_notifications Customers can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can update own notifications" ON public.reseller_customer_notifications FOR UPDATE USING ((auth.uid() IN ( SELECT reseller_customers.auth_user_id
   FROM public.reseller_customers
  WHERE (reseller_customers.id = reseller_customer_notifications.customer_id))));


--
-- Name: reseller_customers Customers can update own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can update own record" ON public.reseller_customers FOR UPDATE TO authenticated USING ((auth_user_id = auth.uid()));


--
-- Name: reseller_plan_configs Customers can view enabled plan configs for their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view enabled plan configs for their store" ON public.reseller_plan_configs FOR SELECT USING (((enabled = true) AND (EXISTS ( SELECT 1
   FROM public.reseller_customers
  WHERE ((reseller_customers.reseller_id = reseller_plan_configs.reseller_id) AND (reseller_customers.auth_user_id = auth.uid()))))));


--
-- Name: reseller_customer_notifications Customers can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own notifications" ON public.reseller_customer_notifications FOR SELECT USING ((auth.uid() IN ( SELECT reseller_customers.auth_user_id
   FROM public.reseller_customers
  WHERE (reseller_customers.id = reseller_customer_notifications.customer_id))));


--
-- Name: reseller_customers Customers can view own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own record" ON public.reseller_customers FOR SELECT TO authenticated USING ((auth_user_id = auth.uid()));


--
-- Name: reseller_customer_virtual_accounts Customers can view own virtual accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own virtual accounts" ON public.reseller_customer_virtual_accounts FOR SELECT USING ((auth.uid() IN ( SELECT reseller_customers.auth_user_id
   FROM public.reseller_customers
  WHERE (reseller_customers.id = reseller_customer_virtual_accounts.customer_id))));


--
-- Name: reseller_customer_wallets Customers can view own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own wallet" ON public.reseller_customer_wallets FOR SELECT USING ((customer_id IN ( SELECT reseller_customers.id
   FROM public.reseller_customers
  WHERE (reseller_customers.auth_user_id = auth.uid()))));


--
-- Name: reseller_customer_transactions Customers can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view their own transactions" ON public.reseller_customer_transactions FOR SELECT USING ((auth.uid() = ( SELECT reseller_customers.auth_user_id
   FROM public.reseller_customers
  WHERE ((reseller_customers.id = reseller_customer_transactions.customer_id) AND (reseller_customers.reseller_id = reseller_customer_transactions.reseller_id)))));


--
-- Name: global_transactions Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.global_transactions FOR INSERT WITH CHECK (true);


--
-- Name: global_transactions Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.global_transactions FOR UPDATE USING (true);


--
-- Name: flashsale_purchases Public can view purchase counts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view purchase counts" ON public.flashsale_purchases FOR SELECT USING (true);


--
-- Name: profiles Public profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: reseller_virtual_accounts Resellers can create own virtual accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can create own virtual accounts" ON public.reseller_virtual_accounts FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_virtual_accounts.reseller_id))));


--
-- Name: reseller_transactions Resellers can insert own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can insert own transactions" ON public.reseller_transactions FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_transactions.reseller_id))));


--
-- Name: global_reseller_plan_configs Resellers can insert their own configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can insert their own configs" ON public.global_reseller_plan_configs FOR INSERT WITH CHECK ((reseller_id = ( SELECT global_reseller_applications.id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.auth_user_id = auth.uid())
 LIMIT 1)));


--
-- Name: reseller_customer_transactions Resellers can insert transactions for their customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can insert transactions for their customers" ON public.reseller_customer_transactions FOR INSERT WITH CHECK ((auth.uid() = ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_customer_transactions.reseller_id))));


--
-- Name: global_base_plans Resellers can read active plans for their country; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can read active plans for their country" ON public.global_base_plans FOR SELECT USING (((is_active = true) AND (country_code = ( SELECT global_reseller_applications.country_code
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.auth_user_id = auth.uid())
 LIMIT 1))));


--
-- Name: global_reseller_plan_configs Resellers can read their own configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can read their own configs" ON public.global_reseller_plan_configs FOR SELECT USING ((reseller_id = ( SELECT global_reseller_applications.id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.auth_user_id = auth.uid())
 LIMIT 1)));


--
-- Name: reseller_notifications Resellers can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can update own notifications" ON public.reseller_notifications FOR UPDATE USING ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_notifications.reseller_id))));


--
-- Name: reseller_plan_configs Resellers can update own plan configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can update own plan configs" ON public.reseller_plan_configs FOR UPDATE USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_transactions Resellers can update own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can update own transactions" ON public.reseller_transactions FOR UPDATE USING ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_transactions.reseller_id)))) WITH CHECK ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_transactions.reseller_id))));


--
-- Name: reseller_customer_transactions Resellers can update their customers' transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can update their customers' transactions" ON public.reseller_customer_transactions FOR UPDATE USING ((auth.uid() = ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_customer_transactions.reseller_id)))) WITH CHECK ((auth.uid() = ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_customer_transactions.reseller_id))));


--
-- Name: global_reseller_plan_configs Resellers can update their own configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can update their own configs" ON public.global_reseller_plan_configs FOR UPDATE USING ((reseller_id = ( SELECT global_reseller_applications.id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.auth_user_id = auth.uid())
 LIMIT 1)));


--
-- Name: reseller_customer_virtual_accounts Resellers can view customer virtual accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view customer virtual accounts" ON public.reseller_customer_virtual_accounts FOR SELECT USING ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_customer_virtual_accounts.reseller_id))));


--
-- Name: reseller_app_configs Resellers can view own app configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own app configs" ON public.reseller_app_configs FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_assets Resellers can view own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own assets" ON public.reseller_assets FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_customers Resellers can view own customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own customers" ON public.reseller_customers FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_notifications Resellers can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own notifications" ON public.reseller_notifications FOR SELECT USING ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_notifications.reseller_id))));


--
-- Name: reseller_orders Resellers can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own orders" ON public.reseller_orders FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_plan_configs Resellers can view own plan configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own plan configs" ON public.reseller_plan_configs FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_transactions Resellers can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own transactions" ON public.reseller_transactions FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_virtual_accounts Resellers can view own virtual accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own virtual accounts" ON public.reseller_virtual_accounts FOR SELECT USING ((auth.uid() IN ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_virtual_accounts.reseller_id))));


--
-- Name: reseller_wallets Resellers can view own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view own wallet" ON public.reseller_wallets FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_customer_wallets Resellers can view their customer wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view their customer wallets" ON public.reseller_customer_wallets FOR SELECT USING ((reseller_id IN ( SELECT resellers.id
   FROM public.resellers
  WHERE (resellers.auth_user_id = auth.uid()))));


--
-- Name: reseller_customer_transactions Resellers can view their customers' transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resellers can view their customers' transactions" ON public.reseller_customer_transactions FOR SELECT USING ((auth.uid() = ( SELECT resellers.auth_user_id
   FROM public.resellers
  WHERE (resellers.id = reseller_customer_transactions.reseller_id))));


--
-- Name: waitlist Service role can manage waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage waitlist" ON public.waitlist USING ((auth.role() = 'service_role'::text));


--
-- Name: profiles Users can access own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can access own profile" ON public.profiles USING ((auth.email() = email)) WITH CHECK ((auth.email() = email));


--
-- Name: global_customers Users can delete their own customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own customers" ON public.global_customers FOR DELETE USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_customers.reseller_id))));


--
-- Name: global_customers Users can insert their own customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own customers" ON public.global_customers FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_customers.reseller_id))));


--
-- Name: electricity_purchases Users can insert their own electricity purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own electricity purchases" ON public.electricity_purchases FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: global_wallets Users can insert their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own wallet" ON public.global_wallets FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_wallets.reseller_id))));


--
-- Name: web_push_tokens Users can manage own token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own token" ON public.web_push_tokens USING ((auth.uid() = user_id));


--
-- Name: user_tokens Users can manage their own tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own tokens" ON public.user_tokens USING ((user_email = auth.email()));


--
-- Name: user_tokens Users can read their own tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own tokens" ON public.user_tokens FOR SELECT USING ((user_email = auth.email()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: global_customers Users can update their own customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own customers" ON public.global_customers FOR UPDATE USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_customers.reseller_id))));


--
-- Name: global_wallets Users can update their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own wallet" ON public.global_wallets FOR UPDATE USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_wallets.reseller_id))));


--
-- Name: flashsale_purchases Users can view own purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own purchases" ON public.flashsale_purchases FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: global_customers Users can view their own customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own customers" ON public.global_customers FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_customers.reseller_id))));


--
-- Name: electricity_purchases Users can view their own electricity purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own electricity purchases" ON public.electricity_purchases FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: global_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.global_transactions FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_transactions.reseller_id))));


--
-- Name: global_virtual_accounts Users can view their own virtual account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own virtual account" ON public.global_virtual_accounts FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_virtual_accounts.reseller_id))));


--
-- Name: global_wallets Users can view their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wallet" ON public.global_wallets FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
   FROM public.global_reseller_applications
  WHERE (global_reseller_applications.id = global_wallets.reseller_id))));


--
-- Name: plan_settings_log admin_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_access ON public.plan_settings_log USING ((( SELECT profiles.is_admin
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = true));


--
-- Name: profiles admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update ON public.profiles FOR UPDATE USING ((is_admin = true));


--
-- Name: airtime_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.airtime_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: debug_logs anyone can insert debug logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can insert debug logs" ON public.debug_logs FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: resellers authenticated_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_delete ON public.resellers FOR DELETE TO authenticated USING ((auth_user_id = auth.uid()));


--
-- Name: resellers authenticated_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert ON public.resellers FOR INSERT TO authenticated WITH CHECK ((auth_user_id = auth.uid()));


--
-- Name: resellers authenticated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_select ON public.resellers FOR SELECT TO authenticated USING ((auth_user_id = auth.uid()));


--
-- Name: resellers authenticated_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update ON public.resellers FOR UPDATE TO authenticated USING ((auth_user_id = auth.uid())) WITH CHECK ((auth_user_id = auth.uid()));


--
-- Name: business_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: cable_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cable_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: cable_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cable_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: coming_soon_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coming_soon_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_issues ENABLE ROW LEVEL SECURITY;

--
-- Name: debug_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: deposits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

--
-- Name: electricity_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.electricity_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: flashsale_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flashsale_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: global_base_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_base_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: global_customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: global_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: global_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: global_reseller_plan_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_reseller_plan_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: global_reseller_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_reseller_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: global_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: global_virtual_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_virtual_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: global_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: lizzy_flashsale; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lizzy_flashsale ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_settings_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_settings_log ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: resellers public_read_active_resellers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_active_resellers ON public.resellers FOR SELECT TO authenticated, anon USING ((status = 'active'::text));


--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_app_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_app_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_customer_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_customer_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_customer_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_customer_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_customer_virtual_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_customer_virtual_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_customer_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_customer_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_email_sequence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_email_sequence ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_plan_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_plan_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_virtual_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_virtual_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reseller_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: resellers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

--
-- Name: revenue_withdrawals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.revenue_withdrawals ENABLE ROW LEVEL SECURITY;

--
-- Name: rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_email_sequence service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service role full access" ON public.reseller_email_sequence USING (true) WITH CHECK (true);


--
-- Name: resellers service_role_manage_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_manage_all ON public.resellers TO service_role USING (true) WITH CHECK (true);


--
-- Name: xixapay_sweep_logs sweep_logs_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sweep_logs_admin_all ON public.xixapay_sweep_logs USING ((auth.role() = 'service_role'::text));


--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: welcome_offer_usage users can manage own welcome offer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can manage own welcome offer" ON public.welcome_offer_usage USING ((auth.uid() = ( SELECT users.id
   FROM auth.users
  WHERE ((users.email)::text = welcome_offer_usage.user_email)))) WITH CHECK ((auth.uid() = ( SELECT users.id
   FROM auth.users
  WHERE ((users.email)::text = welcome_offer_usage.user_email))));


--
-- Name: waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: web_push_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.web_push_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: xixapay_sweep_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.xixapay_sweep_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: xixapay_wallet_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.xixapay_wallet_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Public can view reseller assets; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Public can view reseller assets" ON storage.objects FOR SELECT USING ((bucket_id = 'reseller-assets'::text));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict qKJpb50gHLFUZINUoD5ohQ2gh3koAlEw38vioIGK7NYXptuTOWQ3pjRaRhJRdsd

