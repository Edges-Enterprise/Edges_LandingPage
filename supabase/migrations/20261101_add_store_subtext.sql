-- A customizable subtext that renders under the welcome message in the
-- storefront hero. The hero's second line was a hardcoded translation
-- ("Get the best deals on data, airtime, and more."), so the reseller could
-- not change it. It lives beside welcome_message, which the Store settings
-- tab already owns.
ALTER TABLE public.global_reseller_store_settings
    ADD COLUMN IF NOT EXISTS store_subtext text;

COMMENT ON COLUMN public.global_reseller_store_settings.store_subtext IS
    'Second hero line on the storefront, shown under welcome_message.';
