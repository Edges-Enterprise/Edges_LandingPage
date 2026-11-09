-- Drop the storefront-visit onboarding artifacts.
--
-- The guided dashboard tour used to gate a step on the reseller actually
-- opening their storefront, tracked via mark_storefront_visited() and the
-- global_reseller_onboarding.visited_storefront column. The tour is now a
-- plain informational walkthrough that no longer waits on any action, so both
-- are dead weight. get_reseller_onboarding() is redefined without the
-- storefront signal it used to derive from that column.
--
-- Idempotent: safe to re-run (DROP ... IF EXISTS, CREATE OR REPLACE).

-- The RPC that recorded a storefront visit.
DROP FUNCTION IF EXISTS public.mark_storefront_visited();

-- The column it wrote, and the signal derived from it.
ALTER TABLE public.global_reseller_onboarding
    DROP COLUMN IF EXISTS visited_storefront;

-- get_reseller_onboarding() no longer returns visited_storefront /
-- storefront_visited. Everything else is unchanged.
CREATE OR REPLACE FUNCTION public.get_reseller_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_app_id uuid;
  v_store_slug text;
  v_country_code text;
  v_row public.global_reseller_onboarding%ROWTYPE;
  v_has_virtual_account boolean;
  v_wallet_funded boolean;
  v_markup_set boolean;
  v_published boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT id, store_slug, country_code
    INTO v_app_id, v_store_slug, v_country_code
  FROM global_reseller_applications
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_app_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Reseller not found');
  END IF;

  SELECT * INTO v_row
  FROM global_reseller_onboarding
  WHERE reseller_id = v_app_id;

  -- A virtual account exists for the reseller.
  SELECT EXISTS (
    SELECT 1 FROM global_virtual_accounts WHERE reseller_id = v_app_id
  ) INTO v_has_virtual_account;

  -- The wallet has been funded: a positive balance (incl. bonus), or a
  -- completed credit that has since been spent down to zero.
  SELECT EXISTS (
    SELECT 1 FROM global_wallets
    WHERE reseller_id = v_app_id
      AND (COALESCE(balance, 0) > 0 OR COALESCE(bonus_balance, 0) > 0)
  ) OR EXISTS (
    SELECT 1 FROM global_transactions
    WHERE reseller_id = v_app_id
      AND type = 'credit'
      AND status = 'completed'
  ) INTO v_wallet_funded;

  -- At least one plan carries a non-zero markup.
  SELECT EXISTS (
    SELECT 1 FROM global_reseller_plan_configs
    WHERE reseller_id = v_app_id
      AND COALESCE(markup_value, 0) > 0
  ) INTO v_markup_set;

  -- A build finished successfully.
  SELECT EXISTS (
    SELECT 1 FROM global_app_builds
    WHERE application_id = v_app_id
      AND build_status = 'completed'
  ) INTO v_published;

  RETURN jsonb_build_object(
    'reseller_id', v_app_id,
    'country_code', v_country_code,
    'store_slug', v_store_slug,
    'dismissed_at', v_row.dismissed_at,
    'completed_at', v_row.completed_at,
    'signals', jsonb_build_object(
      'has_virtual_account', v_has_virtual_account,
      'wallet_funded', v_wallet_funded,
      'markup_set', v_markup_set,
      'published', v_published,
      'store_live', (v_store_slug IS NOT NULL AND length(v_store_slug) > 0)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_reseller_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reseller_onboarding() TO authenticated;
