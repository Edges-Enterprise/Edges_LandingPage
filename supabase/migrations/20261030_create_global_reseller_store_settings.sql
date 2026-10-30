-- Store-level settings the dashboard's Store page owns.
--
-- The Store settings tab previously upserted into global_reseller_settings
-- with `reseller_id` and `store_settings` columns that do not exist (the real
-- table is id/auth_user_id/notification_settings/...), so every save failed
-- with a PostgREST "column does not exist" error. welcome_message and
-- store_status have no home on global_reseller_applications either, which is
-- why the storefront hardcoded "Welcome to <store>!".
--
-- One row per reseller application. Read by the anonymous storefront through
-- the service-role client, so RLS is enabled with no policies (service-role
-- bypasses RLS; anon/authenticated get nothing). This mirrors how
-- global_reseller_settings is locked down.

CREATE TABLE IF NOT EXISTS public.global_reseller_store_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    welcome_message text,
    store_status text DEFAULT 'active',
    contact_phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.global_reseller_store_settings
    ADD CONSTRAINT global_reseller_store_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.global_reseller_store_settings
    ADD CONSTRAINT global_reseller_store_settings_application_id_key
    UNIQUE (application_id);

ALTER TABLE ONLY public.global_reseller_store_settings
    ADD CONSTRAINT global_reseller_store_settings_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES public.global_reseller_applications(id)
    ON DELETE CASCADE;

ALTER TABLE public.global_reseller_store_settings ENABLE ROW LEVEL SECURITY;

-- Branding changes rebuild the customer APK, so they are rate limited to once
-- per 90 days. branding_updated_at is the last accepted change; the cooldown
-- is derived from it rather than stored, so a policy change needs no backfill.
ALTER TABLE public.global_reseller_applications
    ADD COLUMN IF NOT EXISTS branding_updated_at timestamp with time zone;

COMMENT ON COLUMN public.global_reseller_applications.branding_updated_at IS
    'Last accepted brand colour / logo / notification icon change. Drives the 90-day rebuild cooldown.';
