-- Task 4, pointer 1.a.ii.zi.x
-- Adds customer auth/PIN columns + a uniqueness guarantee to
-- global_customers, and creates two new tables (global_customer_wallets,
-- global_customer_virtual_accounts) needed for the wallet/PIN/login
-- customer storefront rebuild. See HANDOVER.md Task 4 for full context.
--
-- This migration is additive/schema-only. It does not modify or
-- backfill any existing row's data, other than the pre-flight
-- duplicate check below (which only reads, never writes).

-- ─── Pre-flight safety check ────────────────────────────────────────
-- The new UNIQUE (reseller_id, email) constraint below will fail to
-- apply if any existing rows already violate it. Fail loudly with a
-- clear message here rather than a cryptic constraint-violation error
-- further down, so whoever runs this knows exactly what to go fix
-- (likely: manually dedupe or merge the offending customer rows)
-- before retrying.
DO $$
DECLARE
  v_dupe_count integer;
BEGIN
  SELECT COUNT(*) INTO v_dupe_count
  FROM (
    SELECT reseller_id, email
    FROM public.global_customers
    GROUP BY reseller_id, email
    HAVING COUNT(*) > 1
  ) dupes;

  IF v_dupe_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % (reseller_id, email) pair(s) in global_customers already have duplicate rows. '
      'Resolve these manually before re-running this migration — '
      'see HANDOVER.md Task 4, pointer 1.a.ii.zi.x for context.',
      v_dupe_count;
  END IF;
END $$;

-- ─── global_customers: add auth/PIN columns ─────────────────────────
ALTER TABLE public.global_customers
    ADD COLUMN auth_user_id uuid,
    ADD COLUMN auth_email text,
    ADD COLUMN transaction_pin text;

-- Same-email-across-multiple-stores model: one customer row per
-- (reseller_id, email) pair, not a single global row per email.
ALTER TABLE public.global_customers
    ADD CONSTRAINT global_customers_reseller_email_key UNIQUE (reseller_id, email);

-- ─── global_customer_wallets ─────────────────────────────────────────
-- Mirrors global_wallets's shape (reseller's own wallet), plus
-- customer_id, since this is one wallet per (reseller_id, customer_id)
-- pair rather than one per reseller.
CREATE TABLE public.global_customer_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    balance numeric(10,2) DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    total_spent numeric(10,2) DEFAULT 0,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT global_customer_wallets_pkey PRIMARY KEY (id),
    CONSTRAINT global_customer_wallets_status_check
        CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text]))),
    CONSTRAINT global_customer_wallets_reseller_id_fkey
        FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE,
    CONSTRAINT global_customer_wallets_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES public.global_customers(id) ON DELETE CASCADE,
    CONSTRAINT global_customer_wallets_reseller_customer_key
        UNIQUE (reseller_id, customer_id)
);

CREATE INDEX idx_global_customer_wallets_reseller_id
    ON public.global_customer_wallets USING btree (reseller_id);
CREATE INDEX idx_global_customer_wallets_customer_id
    ON public.global_customer_wallets USING btree (customer_id);

-- ─── global_customer_virtual_accounts ────────────────────────────────
-- Mirrors global_virtual_accounts's shape (reseller's own virtual
-- account), plus customer_id. In practice this is only populated for
-- xixapay-gateway countries (currently Nigeria only) — see HANDOVER.md
-- Task 4, "Reality check" #5 — but that's a runtime/business-logic
-- concern, not something to bake into the schema itself.
CREATE TABLE public.global_customer_virtual_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reseller_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    account_number text NOT NULL,
    bank_name text NOT NULL,
    account_name text NOT NULL,
    bank_code text,
    provider text DEFAULT 'xixapay'::text,
    account_type text,
    status text DEFAULT 'active'::text,
    tracking_reference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT global_customer_virtual_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT global_customer_virtual_accounts_reseller_id_fkey
        FOREIGN KEY (reseller_id) REFERENCES public.global_reseller_applications(id) ON DELETE CASCADE,
    CONSTRAINT global_customer_virtual_accounts_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES public.global_customers(id) ON DELETE CASCADE,
    CONSTRAINT global_customer_virtual_accounts_reseller_customer_key
        UNIQUE (reseller_id, customer_id)
);

CREATE INDEX idx_global_customer_virtual_accounts_reseller_id
    ON public.global_customer_virtual_accounts USING btree (reseller_id);
CREATE INDEX idx_global_customer_virtual_accounts_customer_id
    ON public.global_customer_virtual_accounts USING btree (customer_id);
