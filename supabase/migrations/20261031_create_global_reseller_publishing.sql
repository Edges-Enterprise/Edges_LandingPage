-- Publishing plan state for the dashboard's Publishing page.
--
-- The "Publish Now" flow used to upsert `global_reseller_settings` with
-- `reseller_id` and `publishing_plan` columns. Neither exists (the real table
-- is id/auth_user_id/notification_settings/...), so every attempt failed with
-- "Payment failed. Please try again." — no plan was recorded and no money
-- moved. The purchased plan lives here instead, written only by the
-- service-role purchase action.
--
-- RLS is enabled with no policies (service-role only), matching
-- global_reseller_store_settings.

CREATE TABLE IF NOT EXISTS public.global_reseller_publishing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    publishing_plan text,
    amount_usd numeric,
    amount_local numeric,
    local_currency text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.global_reseller_publishing
    ADD CONSTRAINT global_reseller_publishing_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.global_reseller_publishing
    ADD CONSTRAINT global_reseller_publishing_application_id_key
    UNIQUE (application_id);

ALTER TABLE ONLY public.global_reseller_publishing
    ADD CONSTRAINT global_reseller_publishing_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES public.global_reseller_applications(id)
    ON DELETE CASCADE;

ALTER TABLE public.global_reseller_publishing ENABLE ROW LEVEL SECURITY;
