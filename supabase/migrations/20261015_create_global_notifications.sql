-- supabase/migrations/20261015_create_global_notifications.sql
--
-- Task 8, Blocker 2. The global_* data model had no notifications tables, so
-- 8.c.iii ("notifications on global_*") could not start and the mobile app's
-- useNotifications/useNotificationSettings hooks still read the legacy
-- reseller_notifications / reseller_customer_notifications tables.
--
-- These mirror the legacy pair column-for-column, with FKs onto the global_*
-- parents and RLS enabled with NO customer-facing policy. Reads and writes go
-- through edge functions holding the service role (Option B), exactly like the
-- catalog. That keeps the "customer session reads nothing" invariant.
--
-- Idempotent: safe to re-run.

BEGIN;

-- 1. Reseller/owner notifications (store-wide, addressed to the store owner).
CREATE TABLE IF NOT EXISTS public.global_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL
        REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    message text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Customer notifications (addressed to one customer of one store).
CREATE TABLE IF NOT EXISTS public.global_customer_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL
        REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL
        REFERENCES public.global_customers(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    message text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Indexes for the read patterns: newest-first, scoped to the owner/customer.
CREATE INDEX IF NOT EXISTS global_notifications_reseller_created_idx
    ON public.global_notifications (reseller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS global_customer_notifications_customer_created_idx
    ON public.global_customer_notifications (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS global_customer_notifications_reseller_created_idx
    ON public.global_customer_notifications (reseller_id, created_at DESC);

-- 4. RLS on, no policies. Service-role edge functions bypass RLS; no
--    customer-facing path may read or write these directly.
ALTER TABLE public.global_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_customer_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Push-token / notification-preference columns. The legacy
--    resellers/reseller_customers tables carried push_token, fcm_token and
--    notifications_enabled; the global_* parents did not, so the app's
--    useNotificationSettings hook had nowhere to store them. These mirror the
--    legacy columns. Writes still go through the service-role function.
ALTER TABLE public.global_reseller_applications
    ADD COLUMN IF NOT EXISTS push_token text,
    ADD COLUMN IF NOT EXISTS fcm_token text,
    ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.global_customers
    ADD COLUMN IF NOT EXISTS push_token text,
    ADD COLUMN IF NOT EXISTS fcm_token text,
    ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT false;

COMMIT;
