-- Store-level catalog mode + default markup.
--
-- Before this, "what the store sells" was strictly opt-in: one
-- global_reseller_plan_configs row per (store, plan), carrying its own markup.
-- That is one row per enabled plan, so a store that wants the WHOLE catalog
-- (11,127 active plans) would need 11,127 rows - and the read path had to ship
-- those ids in the PostgREST URL, which overflows past ~700 ids and returns
-- HTTP 400 (the storefront's "no active plans" failure).
--
-- catalog_mode = 'all' makes the store's catalog "every active plan", priced by
-- the store's default markup, with a per-plan config row acting as an OVERRIDE
-- (a row still wins; a row with enabled = false opts that one plan out). That
-- mirrors how the platform's own markup resolves (global_platform_markups:
-- default -> country -> plan, most specific wins) and collapses "sell
-- everything" from 11,127 rows to a single field.
--
-- catalog_mode = 'selected' is the previous behaviour and the default, so
-- every existing store is unchanged.

ALTER TABLE public.global_reseller_applications
    ADD COLUMN IF NOT EXISTS catalog_mode text NOT NULL DEFAULT 'selected';

ALTER TABLE public.global_reseller_applications
    ADD COLUMN IF NOT EXISTS default_markup_type text NOT NULL DEFAULT 'percentage';

ALTER TABLE public.global_reseller_applications
    ADD COLUMN IF NOT EXISTS default_markup_value numeric NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'global_reseller_applications_catalog_mode_check'
    ) THEN
        ALTER TABLE public.global_reseller_applications
            ADD CONSTRAINT global_reseller_applications_catalog_mode_check
            CHECK (catalog_mode IN ('selected', 'all'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'global_reseller_applications_default_markup_type_check'
    ) THEN
        ALTER TABLE public.global_reseller_applications
            ADD CONSTRAINT global_reseller_applications_default_markup_type_check
            CHECK (default_markup_type IN ('percentage', 'fixed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'global_reseller_applications_default_markup_value_check'
    ) THEN
        ALTER TABLE public.global_reseller_applications
            ADD CONSTRAINT global_reseller_applications_default_markup_value_check
            CHECK (default_markup_value >= 0);
    END IF;
END $$;

COMMENT ON COLUMN public.global_reseller_applications.catalog_mode IS
    'selected = only plans with an enabled config row (opt-in). all = every active plan, priced by default_markup_*, with per-plan config rows as overrides.';

COMMENT ON COLUMN public.global_reseller_applications.default_markup_value IS
    'Reseller markup applied to a plan that has no config row when catalog_mode = all. A per-plan config row overrides it.';
