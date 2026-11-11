-- supabase/migrations/20261110_create_global_push_notifications.sql
--
-- Push delivery for the global_* (multi-country, multi-tenant) data model.
--
-- The legacy model pushed from `reseller_notifications` /
-- `reseller_customer_notifications` via `trigger_reseller_push` /
-- `trigger_customer_push` -> `reseller-send-push-notification`. Those read the
-- retired `resellers` / `reseller_customers` tables and are reference-only.
-- The global_* tables (migration 20261015) never got a push path: rows landed
-- in the inbox but no device was ever notified. This closes that gap by
-- triggering `global-send-push-notification` on the two global_* notification
-- tables.
--
-- The trigger presents a shared secret (vault: `push_trigger_secret`) as
-- `x-push-secret`, mirroring `run_scheduled_edge`. The secret is generated
-- here so no secret is committed; set the function's `PUSH_TRIGGER_SECRET`
-- environment secret to the same value to enforce the gate (the function
-- ignores the header when that env secret is unset).
--
-- Idempotent: safe to re-run.

BEGIN;

-- 1. Shared secret the triggers present to the push function.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_trigger_secret') THEN
        PERFORM vault.create_secret(
            encode(gen_random_bytes(32), 'hex'),
            'push_trigger_secret',
            'Shared secret presented by the global_* push triggers'
        );
    END IF;
END $$;

-- 2. Store-owner notifications -> the owner's device tokens on
--    global_reseller_applications.
CREATE OR REPLACE FUNCTION public.trigger_global_reseller_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
    v_secret text;
BEGIN
    SELECT decrypted_secret INTO v_secret
        FROM vault.decrypted_secrets WHERE name = 'push_trigger_secret';

    PERFORM net.http_post(
        url := 'https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/global-send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-push-secret', coalesce(v_secret, '')
        ),
        body := jsonb_build_object(
            'table', 'global_notifications',
            'record', row_to_json(NEW)::jsonb
        ),
        timeout_milliseconds := 5000
    );
    RETURN NEW;
END;
$$;

-- 3. Customer notifications -> the customer's device tokens on global_customers.
CREATE OR REPLACE FUNCTION public.trigger_global_customer_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
    v_secret text;
BEGIN
    SELECT decrypted_secret INTO v_secret
        FROM vault.decrypted_secrets WHERE name = 'push_trigger_secret';

    PERFORM net.http_post(
        url := 'https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/global-send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-push-secret', coalesce(v_secret, '')
        ),
        body := jsonb_build_object(
            'table', 'global_customer_notifications',
            'record', row_to_json(NEW)::jsonb
        ),
        timeout_milliseconds := 5000
    );
    RETURN NEW;
END;
$$;

-- 4. Attach the triggers. The global_* notification tables had none.
DROP TRIGGER IF EXISTS global_reseller_push_trigger ON public.global_notifications;
CREATE TRIGGER global_reseller_push_trigger
    AFTER INSERT ON public.global_notifications
    FOR EACH ROW EXECUTE FUNCTION public.trigger_global_reseller_push();

DROP TRIGGER IF EXISTS global_customer_push_trigger ON public.global_customer_notifications;
CREATE TRIGGER global_customer_push_trigger
    AFTER INSERT ON public.global_customer_notifications
    FOR EACH ROW EXECUTE FUNCTION public.trigger_global_customer_push();

COMMIT;
