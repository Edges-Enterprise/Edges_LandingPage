-- Task 9 — first-time reseller setup guide (dashboard onboarding checklist).
--
-- The dashboard shows a first-time reseller a checklist of setup steps
-- (virtual account where the country uses one, fund wallet, set markup,
-- publish, visit the storefront) and congratulates them once all applicable
-- steps are done. Most of those steps are already visible in existing data
-- (a global_virtual_accounts row, a funded global_wallets row, a
-- global_reseller_plan_configs row with a non-zero markup, a completed
-- global_app_builds row), so those are DERIVED, not stored.
--
-- Only the state that cannot be derived is persisted here, one row per
-- reseller application:
--   * dismissed_at        - the reseller hid the guide (decision 2: it comes
--                           back on the next load while any step is unfinished)
--   * visited_storefront  - the reseller actually opened the storefront
--                           (decision 3: a real click-through, not "store is
--                           live")
--   * completed_at        - stamped once, the first time every applicable step
--                           is done, so the congratulation state is remembered
--
-- Which steps APPLY is a per-country question (only ng uses virtual accounts
-- today) and the country -> payment-method map lives in the web config, so
-- applicability is resolved in the app layer; this table stays country-agnostic.

CREATE TABLE IF NOT EXISTS public.global_reseller_onboarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    dismissed_at timestamp with time zone,
    visited_storefront boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Constraints are added inside a guard so the migration can be re-run safely
-- (a bare ADD CONSTRAINT errors with "already exists" on a second run).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.global_reseller_onboarding'::regclass
          AND conname = 'global_reseller_onboarding_pkey'
    ) THEN
        ALTER TABLE ONLY public.global_reseller_onboarding
            ADD CONSTRAINT global_reseller_onboarding_pkey PRIMARY KEY (id);
    END IF;

    -- One row per reseller application; the RPCs upsert against this key.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.global_reseller_onboarding'::regclass
          AND conname = 'global_reseller_onboarding_reseller_id_key'
    ) THEN
        ALTER TABLE ONLY public.global_reseller_onboarding
            ADD CONSTRAINT global_reseller_onboarding_reseller_id_key
            UNIQUE (reseller_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.global_reseller_onboarding'::regclass
          AND conname = 'global_reseller_onboarding_reseller_id_fkey'
    ) THEN
        ALTER TABLE ONLY public.global_reseller_onboarding
            ADD CONSTRAINT global_reseller_onboarding_reseller_id_fkey
            FOREIGN KEY (reseller_id)
            REFERENCES public.global_reseller_applications(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_global_reseller_onboarding_reseller_id
    ON public.global_reseller_onboarding USING btree (reseller_id);

ALTER TABLE public.global_reseller_onboarding ENABLE ROW LEVEL SECURITY;

-- Owner-only access, mirroring the global_customers policies. The reseller
-- dashboard reads and writes with the reseller's own session; INSERT and
-- UPDATE are both needed (the guide upserts its row).
DROP POLICY IF EXISTS "Resellers can view their own onboarding"
  ON public.global_reseller_onboarding;
CREATE POLICY "Resellers can view their own onboarding"
  ON public.global_reseller_onboarding
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT global_reseller_applications.auth_user_id
      FROM public.global_reseller_applications
      WHERE global_reseller_applications.id = global_reseller_onboarding.reseller_id
    )
  );

DROP POLICY IF EXISTS "Resellers can insert their own onboarding"
  ON public.global_reseller_onboarding;
CREATE POLICY "Resellers can insert their own onboarding"
  ON public.global_reseller_onboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT global_reseller_applications.auth_user_id
      FROM public.global_reseller_applications
      WHERE global_reseller_applications.id = global_reseller_onboarding.reseller_id
    )
  );

DROP POLICY IF EXISTS "Resellers can update their own onboarding"
  ON public.global_reseller_onboarding;
CREATE POLICY "Resellers can update their own onboarding"
  ON public.global_reseller_onboarding
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT global_reseller_applications.auth_user_id
      FROM public.global_reseller_applications
      WHERE global_reseller_applications.id = global_reseller_onboarding.reseller_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT global_reseller_applications.auth_user_id
      FROM public.global_reseller_applications
      WHERE global_reseller_applications.id = global_reseller_onboarding.reseller_id
    )
  );

COMMENT ON TABLE public.global_reseller_onboarding IS
    'Task 9: per-reseller state for the first-time setup guide. Only non-derivable state is stored; step completion is otherwise derived from global_virtual_accounts / global_wallets / global_reseller_plan_configs / global_app_builds.';

-- ---------------------------------------------------------------------------
-- get_reseller_onboarding()
--
-- Returns the reseller's stored onboarding state plus the DERIVED completion
-- signals for each step. The app layer decides which steps apply for the
-- country and renders the checklist. SECURITY DEFINER with an auth.uid() owner
-- check so it works regardless of RLS and cannot read another reseller's data.
-- ---------------------------------------------------------------------------
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
    'visited_storefront', COALESCE(v_row.visited_storefront, false),
    'completed_at', v_row.completed_at,
    'signals', jsonb_build_object(
      'has_virtual_account', v_has_virtual_account,
      'wallet_funded', v_wallet_funded,
      'markup_set', v_markup_set,
      'published', v_published,
      'store_live', (v_store_slug IS NOT NULL AND length(v_store_slug) > 0),
      'storefront_visited', COALESCE(v_row.visited_storefront, false)
    )
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- dismiss_onboarding() — hide the guide (decision 2: it returns on the next
-- load while any applicable step is unfinished).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dismiss_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_app_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id INTO v_app_id
  FROM global_reseller_applications
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_app_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller not found');
  END IF;

  INSERT INTO global_reseller_onboarding (reseller_id, dismissed_at)
  VALUES (v_app_id, now())
  ON CONFLICT (reseller_id)
  DO UPDATE SET dismissed_at = now(), updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ---------------------------------------------------------------------------
-- mark_storefront_visited() — the reseller opened the storefront
-- (decision 3: a real click-through).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_storefront_visited()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_app_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id INTO v_app_id
  FROM global_reseller_applications
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_app_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller not found');
  END IF;

  INSERT INTO global_reseller_onboarding (reseller_id, visited_storefront)
  VALUES (v_app_id, true)
  ON CONFLICT (reseller_id)
  DO UPDATE SET visited_storefront = true, updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ---------------------------------------------------------------------------
-- complete_onboarding() — stamp completed_at once, the first time every
-- applicable step is done, so the congratulation state is remembered.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_app_id uuid;
  v_completed_at timestamp with time zone;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id INTO v_app_id
  FROM global_reseller_applications
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_app_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller not found');
  END IF;

  INSERT INTO global_reseller_onboarding (reseller_id, completed_at)
  VALUES (v_app_id, now())
  ON CONFLICT (reseller_id)
  DO UPDATE SET
    completed_at = COALESCE(global_reseller_onboarding.completed_at, now()),
    updated_at = now()
  RETURNING completed_at INTO v_completed_at;

  RETURN jsonb_build_object('success', true, 'completed_at', v_completed_at);
END;
$function$;

-- These are reseller-only RPCs; they must not be callable anonymously.
-- REVOKE from PUBLIC too: Postgres grants EXECUTE to PUBLIC by default, and
-- Supabase's default privileges also add an explicit anon grant.
REVOKE ALL ON FUNCTION public.get_reseller_onboarding() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_onboarding() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_storefront_visited() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reseller_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_storefront_visited() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;
