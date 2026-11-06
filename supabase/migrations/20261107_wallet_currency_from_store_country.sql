-- 20261107_wallet_currency_from_store_country.sql
--
-- Blocker 13. A reseller wallet was always created as USD, but the purchase
-- layer deducts store-currency amounts (`platformLocalDecimal`) and deposits
-- credit the store-currency charge, so the balance is a store-currency float
-- mislabelled USD. This makes the currency truthful: the store's own country
-- currency, or USD when the country has no local currency rail.
--
-- One currency per store (AGENTS.md, Phase 2 invariants): the wallet, the
-- shelf price and the charge are all in the store's country currency, so the
-- pricing side (`global_country_currencies`), the wallet-side mirror
-- (`_shared/countryCurrency.ts`) and this function agree by construction.
-- The 24 mapped countries all have a local payment rail; an unmapped country
-- is USD.

-- Country -> wallet currency. Mirrors supabase/functions/_shared/countryCurrency.ts
-- and the pricing side's global_country_currencies. Returns USD for a country
-- with no mapping, which is the documented fallback, not a guess.
CREATE OR REPLACE FUNCTION public.wallet_currency_for_country(p_country_code text)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(
    (SELECT currency_code
       FROM public.global_country_currencies
      WHERE country_code = lower(coalesce(p_country_code, ''))),
    'USD'
  );
$function$;

COMMENT ON FUNCTION public.wallet_currency_for_country(text) IS
  'The currency a store''s wallets are denominated in: its country''s mapped currency, or USD when the country has no local currency rail.';

-- Backfill every reseller wallet to its store country's currency. Balances are
-- an accounting float in the store currency already (deposits and deductions
-- both use it), so this corrects the label without moving money.
UPDATE public.global_wallets w
   SET currency = public.wallet_currency_for_country(a.country_code)
  FROM public.global_reseller_applications a
 WHERE a.id = w.reseller_id
   AND w.currency IS DISTINCT FROM public.wallet_currency_for_country(a.country_code);

-- Recreate the dashboard-context RPC so a wallet created lazily here is also
-- denominated in the store's currency.

CREATE OR REPLACE FUNCTION public.get_global_reseller_dashboard_context(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_wallet_currency TEXT;
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
  
  -- Get or create wallet. The wallet is denominated in the store's own
  -- country currency (USD when the country has no local currency rail), so
  -- the balance, the shelf prices and the funding charge are all one
  -- currency. Was a hardcoded 'USD' (Blocker 13).
  v_wallet_currency := public.wallet_currency_for_country(
    v_application_record.country_code
  );

  INSERT INTO global_wallets (reseller_id, balance, currency, status)
  VALUES (v_application_id, 0, v_wallet_currency, 'active')
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
$function$

