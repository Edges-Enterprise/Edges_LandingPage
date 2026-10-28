-- supabase/migrations/20261029_global_order_status_history.sql
--
-- Task 8, 8.ab.iv. Resellers can update an order's status (the policy added in
-- 20261028_global_orders_rls_policies.sql), but nothing recorded who changed
-- it, when, or from what. This adds an append-only status history and a trigger
-- that writes one row per status transition.
--
-- Design notes:
--   * The trigger is SECURITY DEFINER with a pinned search_path so the insert
--     bypasses RLS; `authenticated` is deliberately NOT granted INSERT on the
--     history table, so the only writer is the trigger itself. That makes the
--     log tamper-resistant from the client (it can be read, never forged).
--   * `changed_by` is `auth.uid()` at the moment of the write, so a reseller
--     changing a status in the dashboard is attributed to that reseller; a
--     purchase RPC running on behalf of a customer is attributed to the
--     customer. `changed_by_email` is a display snapshot resolved from
--     auth.users at write time.
--   * Existing orders are NOT backfilled: their true transitions were never
--     recorded, and inventing "created -> <current status>" rows would
--     misrepresent history. The trail starts at the first change after this
--     migration.
--
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.global_order_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL
        REFERENCES public.global_orders(id) ON DELETE CASCADE,
    reseller_id uuid NOT NULL
        REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    changed_by uuid,
    changed_by_email text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS global_order_status_history_order_id_idx
    ON public.global_order_status_history (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS global_order_status_history_reseller_id_idx
    ON public.global_order_status_history (reseller_id, created_at DESC);

ALTER TABLE public.global_order_status_history ENABLE ROW LEVEL SECURITY;

-- Owner-scoped read, mirroring the global_orders policies. No INSERT/UPDATE/
-- DELETE policy: the trigger is the only writer.
DROP POLICY IF EXISTS "Resellers can view their own order status history"
    ON public.global_order_status_history;
CREATE POLICY "Resellers can view their own order status history"
    ON public.global_order_status_history
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT auth_user_id
            FROM public.global_reseller_applications
            WHERE id = global_order_status_history.reseller_id
        )
    );

CREATE OR REPLACE FUNCTION public.log_global_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := auth.uid();
    actor_email text;
BEGIN
    -- Fire on every insert, but on update only when the status actually moves.
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF actor IS NOT NULL THEN
        SELECT email INTO actor_email FROM auth.users WHERE id = actor;
    END IF;

    INSERT INTO public.global_order_status_history (
        order_id,
        reseller_id,
        from_status,
        to_status,
        changed_by,
        changed_by_email
    )
    VALUES (
        NEW.id,
        NEW.reseller_id,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
        NEW.status,
        actor,
        actor_email
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS global_orders_status_history_trg
    ON public.global_orders;
CREATE TRIGGER global_orders_status_history_trg
    AFTER INSERT OR UPDATE OF status ON public.global_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.log_global_order_status_change();

COMMIT;
