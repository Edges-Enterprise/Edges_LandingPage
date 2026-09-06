-- ============================================================================
-- RBAC foundation: close the RLS gap on 6 global_ tables
-- ============================================================================
-- Context: src/lib/supabase/server.ts previously ran the cookie-bound session
-- client on SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely (Known
-- Irregularity #9, handover.md). That client now runs on the anon key so
-- Postgres RLS actually scopes access to the logged-in reseller. Auditing the
-- 15 global_ tables against that change surfaced 6 with no working RLS:
--
--   - global_reseller_settings: RLS enabled, zero policies -> deny-all today
--   - global_reseller_applications, global_reseller_stores,
--     global_reseller_app_configs, global_store_visits, global_app_builds,
--     global_email_logs: RLS not enabled at all -> open to any grantee
--
-- global_reseller_applications holds bvn and a plaintext temp_password
-- column, so the "not enabled" state is a real exposure via the
-- client-visible anon key, not just a functional gap.
--
-- Policy shape mirrors the pattern already live on global_customers /
-- global_wallets: auth.uid() resolved against
-- global_reseller_applications.auth_user_id, scoped through each table's
-- existing application_id / reseller_id foreign key.
--
-- Machine-to-machine call sites (payment/build webhooks, the /api/v1
-- X-API-Key middleware) have no user session to run under and were switched
-- to createAdminClient() (service role, intentionally bypasses RLS)
-- separately from this migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- global_reseller_applications: the root identity row (auth_user_id direct)
-- ----------------------------------------------------------------------------
ALTER TABLE public.global_reseller_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own application" ON public.global_reseller_applications
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own application" ON public.global_reseller_applications
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- No INSERT policy: applications are created via the public /apply flow
-- before an account necessarily exists, through createAdminClient()
-- (src/actions/reseller/application/submitApplication.ts). No DELETE policy:
-- no delete use case exists in the app today.

-- ----------------------------------------------------------------------------
-- global_reseller_settings: RLS was already enabled with zero policies
-- (deny-all). Same auth_user_id column as applications.
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own settings" ON public.global_reseller_settings
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own settings" ON public.global_reseller_settings
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own settings" ON public.global_reseller_settings
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- ----------------------------------------------------------------------------
-- global_reseller_app_configs: keyed by application_id. Reseller dashboard
-- reads/writes this directly via the session client
-- (src/actions/reseller/build/triggerAppBuild.ts, the publishing page, and
-- src/app/api/reseller/[countryCode]/config/[configId]/route.ts).
-- ----------------------------------------------------------------------------
ALTER TABLE public.global_reseller_app_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own app configs" ON public.global_reseller_app_configs
  FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_reseller_app_configs.application_id))));

CREATE POLICY "Users can insert their own app configs" ON public.global_reseller_app_configs
  FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_reseller_app_configs.application_id))));

CREATE POLICY "Users can update their own app configs" ON public.global_reseller_app_configs
  FOR UPDATE USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_reseller_app_configs.application_id))));

-- ----------------------------------------------------------------------------
-- global_app_builds: keyed by application_id. Reseller reads build status
-- and updates config_id via the session client
-- (getBuildStatus.ts, getBuildHistory.ts, triggerAppBuild.ts). The build
-- webhook (external CI, no session) now runs on createAdminClient() instead.
-- ----------------------------------------------------------------------------
ALTER TABLE public.global_app_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own app builds" ON public.global_app_builds
  FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_app_builds.application_id))));

CREATE POLICY "Users can update their own app builds" ON public.global_app_builds
  FOR UPDATE USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_app_builds.application_id))));

-- No INSERT policy: no code path in the repo inserts build rows via the
-- session client today; whatever queues a build should go through
-- createAdminClient() until that pipeline is actually wired up.

-- ----------------------------------------------------------------------------
-- global_email_logs: keyed by application_id, read-only audit trail for the
-- owning reseller. All writes are system-triggered (submitApplication.ts
-- already uses createAdminClient()).
-- ----------------------------------------------------------------------------
ALTER TABLE public.global_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs" ON public.global_email_logs
  FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_email_logs.application_id))));

-- ----------------------------------------------------------------------------
-- global_reseller_stores: keyed by application_id. No code reads/writes this
-- table yet (storefront feature not wired up) — owner-scoped access only,
-- for forward compatibility. Whoever builds the public storefront will also
-- need a public SELECT policy scoped to is_active = true; not added here
-- since no such read path exists in the app today.
-- ----------------------------------------------------------------------------
ALTER TABLE public.global_reseller_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store" ON public.global_reseller_stores
  FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_reseller_stores.application_id))));

CREATE POLICY "Users can update their own store" ON public.global_reseller_stores
  FOR UPDATE USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_reseller_stores.application_id))));

-- ----------------------------------------------------------------------------
-- global_store_visits: keyed by reseller_id, an analytics/visitor-log table.
-- No code reads/writes this yet either. Insert is left open to anon +
-- authenticated (WITH CHECK true) since the entire point of the table is
-- logging anonymous storefront visitors; only the owning reseller can read
-- their own analytics back.
-- ----------------------------------------------------------------------------
ALTER TABLE public.global_store_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store visits" ON public.global_store_visits
  FOR SELECT USING ((auth.uid() IN ( SELECT global_reseller_applications.auth_user_id
     FROM public.global_reseller_applications
    WHERE (global_reseller_applications.id = global_store_visits.reseller_id))));

CREATE POLICY "Anyone can log a store visit" ON public.global_store_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);
