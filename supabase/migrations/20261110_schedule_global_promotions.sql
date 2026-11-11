-- supabase/migrations/20261110_schedule_global_promotions.sql
--
-- Schedules the global_* promotional notifications.
--
-- The legacy reseller-scheduled-promotions / web-scheduled-promotions wrote the
-- retired reseller_* tables and, because their cron ran only weekly (Monday
-- 09:00 UTC), their time/day rules could never fire — only the Monday rule
-- matched. This adds the multi-tenant successor: one job, every 5 minutes, that
-- fans out to every active store on the global_* model.
--
-- global_promotion_sends is the dedupe ledger: the function claims a
-- (scheduled_id, sent_for) row before inserting, and the unique constraint
-- makes a second run in the same window a no-op. The function runs as the
-- service role, so the table is RLS-locked with no policies (no client access).
--
-- Idempotent: safe to re-run.

BEGIN;

-- 1. Dedupe ledger: one row per scheduled promotion per day, per country. The
--    country dimension exists because a local-time rule ("evening") fires at a
--    different UTC instant in each market, so each country claims its own slot.
CREATE TABLE IF NOT EXISTS public.global_promotion_sends (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_id text NOT NULL,
    sent_for date NOT NULL,
    country_code text NOT NULL DEFAULT 'ALL',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- The table was first shipped without country_code; add it for existing installs.
ALTER TABLE public.global_promotion_sends
    ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'ALL';

-- Replace the (scheduled_id, sent_for) uniqueness with the country-aware key.
ALTER TABLE public.global_promotion_sends
    DROP CONSTRAINT IF EXISTS global_promotion_sends_unique;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'global_promotion_sends_unique'
    ) THEN
        ALTER TABLE public.global_promotion_sends
            ADD CONSTRAINT global_promotion_sends_unique
            UNIQUE (scheduled_id, sent_for, country_code);
    END IF;
END $$;

ALTER TABLE public.global_promotion_sends ENABLE ROW LEVEL SECURITY;

-- 2. Shared secret the cron presents to the function (mirrors
--    catalog_sync_secret / fx_refresh_secret consumed by run_scheduled_edge).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'scheduled_promotions_secret') THEN
        PERFORM vault.create_secret(
            encode(gen_random_bytes(32), 'hex'),
            'scheduled_promotions_secret',
            'Shared secret for the global-scheduled-promotions cron job'
        );
    END IF;
END $$;

-- 3. Run every 5 minutes. The function's shouldSendNow() matches the exact and
--    the 5-minute-rounded minute, and the dedupe ledger absorbs the overlap.
DO $$
DECLARE v_jobid bigint;
BEGIN
    SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'global-scheduled-promotions';
    IF v_jobid IS NOT NULL THEN
        PERFORM cron.unschedule(v_jobid);
    END IF;
END $$;

SELECT cron.schedule(
    'global-scheduled-promotions',
    '*/5 * * * *',
    $$SELECT public.run_scheduled_edge('global-scheduled-promotions', 'scheduled_promotions_secret')$$
);

COMMIT;
