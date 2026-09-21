-- Task 4, pointer 1.c.iii.zi.x
-- Adds global_customer_transactions, needed before the customer-side
-- mobile-money funding action (and, later, the purchase action in
-- branch 1.d) can record anything. Discovered missing while starting
-- 1.c.iii: global_transactions is reseller-only (no customer scoping
-- at all — no customer_id column), and legacy's equivalent
-- (reseller_customer_transactions) is a dedicated table, not a shared
-- one with the reseller's own transactions. See HANDOVER.md Task 4 for
-- full context.
--
-- This migration is additive/schema-only — no existing table is
-- modified, no data is backfilled.

-- ─── global_customer_transactions ────────────────────────────────────
-- Mirrors reseller_customer_transactions's shape (type/fee/net_amount/
-- previous_balance/new_balance/reference/order_id/plan_id/status/
-- metadata/description), using text instead of character varying for
-- type/reference/status to match this task's other new tables'
-- convention rather than legacy's. No separate currency column, same
-- as legacy's table and as global_transactions — the owning wallet
-- (global_customer_wallets.currency) is the source of truth for that,
-- consistent with how the rest of this task's tables avoid duplicating
-- currency next to every balance-affecting row.
CREATE TABLE public.global_customer_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    fee numeric(10,2) DEFAULT 0,
    net_amount numeric(10,2) NOT NULL,
    previous_balance numeric(10,2) NOT NULL,
    new_balance numeric(10,2) NOT NULL,
    reference text,
    order_id uuid,
    plan_id uuid,
    status text DEFAULT 'completed'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    description text,
    payment_gateway text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT global_customer_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT global_customer_transactions_status_check
        CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'reversed'::text]))),
    CONSTRAINT global_customer_transactions_type_check
        CHECK ((type = ANY (ARRAY['deposit'::text, 'purchase'::text, 'refund'::text, 'adjustment'::text]))),
    CONSTRAINT global_customer_transactions_reseller_id_fkey
        FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE,
    CONSTRAINT global_customer_transactions_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES public.global_customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_global_customer_transactions_reseller_id
    ON public.global_customer_transactions USING btree (reseller_id);
CREATE INDEX idx_global_customer_transactions_customer_id
    ON public.global_customer_transactions USING btree (customer_id);
CREATE INDEX idx_global_customer_transactions_reference
    ON public.global_customer_transactions USING btree (reference);
