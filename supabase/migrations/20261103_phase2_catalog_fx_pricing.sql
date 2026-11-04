-- Phase 2 (2026-11-02). Multi-country catalog, FX and pricing.
--
-- Adds what the Phase 2 design needs and nothing more. The design and its
-- scope decisions are in HANDOVER.md, section "Phase 2 — Multi-country
-- catalog, FX, and pricing".
--
-- Three things this migration is deliberately NOT doing:
--
--   * No treasury/conversion tables. The platform is a ledger over funds
--     held at the payment provider; there is no local->USD conversion in
--     this system (HANDOVER.md, "This system is a ledger, not a treasury").
--   * No multi-currency store support. One currency per store, permanent.
--   * No migration of existing catalog rows. Existing data is rewritten to
--     fit the new structure (scope decisions, 2026-11-01), so this only
--     adds columns and tables.

-- ─── global_base_plans: Phase 2 columns ─────────────────────────────
--
-- The catalog becomes per-country and rate-dependent, so it has to carry
-- everything pricing needs without a second lookup: the offer's price type,
-- what the recipient receives, and the RANGE bounds for a variable offer.

ALTER TABLE public.global_base_plans
  ADD COLUMN IF NOT EXISTS price_type text NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS range_min numeric,
  ADD COLUMN IF NOT EXISTS range_max numeric,
  ADD COLUMN IF NOT EXISTS zendit_fx numeric,
  -- When the provider last reported this offer. Lets a sync soft-deactivate
  -- an offer that has disappeared rather than deleting live rows.
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT now(),
  -- When this row was last changed by a sync, as opposed to read.
  ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone;

ALTER TABLE public.global_base_plans
  DROP CONSTRAINT IF EXISTS global_base_plans_price_type_check;
ALTER TABLE public.global_base_plans
  ADD CONSTRAINT global_base_plans_price_type_check
  CHECK (price_type IN ('FIXED', 'RANGE'));

-- A RANGE offer must carry bounds; a FIXED offer must not need them.
ALTER TABLE public.global_base_plans
  DROP CONSTRAINT IF EXISTS global_base_plans_range_check;
ALTER TABLE public.global_base_plans
  ADD CONSTRAINT global_base_plans_range_check
  CHECK (
    (price_type = 'FIXED')
    OR (price_type = 'RANGE' AND range_min IS NOT NULL AND range_max IS NOT NULL
        AND range_min >= 0 AND range_max >= range_min)
  );

-- The sync upserts on (provider, provider_plan_id). Without this the
-- "upsert on offer id" step would need a manual lookup and could duplicate
-- rows under concurrent syncs.
CREATE UNIQUE INDEX IF NOT EXISTS global_base_plans_provider_plan_uidx
  ON public.global_base_plans (provider, provider_plan_id);

CREATE INDEX IF NOT EXISTS global_base_plans_country_active_idx
  ON public.global_base_plans (country_code, is_active);

-- ─── Currency registry ──────────────────────────────────────────────
--
-- Country coverage is discovered from the Zendit catalog, not hardcoded, so
-- the set of currencies is no longer the fixed 24-country map. This table
-- records what the platform knows about each currency: its minor units, its
-- symbol, and whether it has a funding rail.

CREATE TABLE IF NOT EXISTS public.global_currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  -- ISO 4217 minor-unit exponent. 0 for RWF/UGX/XOF/XAF, 2 for NGN, 3 for KWD.
  decimals integer NOT NULL DEFAULT 2,
  -- Can a reseller fund a wallet in this currency? Derived from funding-rail
  -- availability, NOT from Zendit coverage (design: store wallet_currency).
  fundable boolean NOT NULL DEFAULT false,
  -- Extra margin over the converted cost, as a fraction, protecting the
  -- pricing margin from rate movement between pricing and settlement.
  buffer_fraction numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT global_currencies_decimals_check CHECK (decimals BETWEEN 0 AND 3),
  CONSTRAINT global_currencies_buffer_check CHECK (buffer_fraction >= 0)
);

-- ─── Rates ──────────────────────────────────────────────────────────
--
-- One row per (base, quote) observation. The pricing leg reads the newest
-- unexpired row; `source` records which leg this is so a provider rate can
-- never be mistaken for Zendit's retail rate.

CREATE TABLE IF NOT EXISTS public.global_fx_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  -- Multiply a base amount by this to get the quote amount.
  rate numeric NOT NULL,
  source text NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT global_fx_rates_rate_check CHECK (rate > 0),
  CONSTRAINT global_fx_rates_source_check
    CHECK (source IN ('collection_provider', 'zendit', 'manual'))
);

CREATE INDEX IF NOT EXISTS global_fx_rates_pair_idx
  ON public.global_fx_rates (base_currency, quote_currency, fetched_at DESC);

-- ─── Platform markup ────────────────────────────────────────────────
--
-- The platform's own markup, applied in USD before conversion, at three
-- levels of specificity. A plan row wins over a country row wins over the
-- default. `scope_key` is the country code or the plan id, and is a fixed
-- sentinel for the default row so the uniqueness constraint is total.

CREATE TABLE IF NOT EXISTS public.global_platform_markups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scope text NOT NULL,
  scope_key text NOT NULL DEFAULT '*',
  markup_type text NOT NULL DEFAULT 'percentage',
  markup_value numeric NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT global_platform_markups_scope_check
    CHECK (scope IN ('default', 'country', 'plan')),
  CONSTRAINT global_platform_markups_type_check
    CHECK (markup_type IN ('percentage', 'fixed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS global_platform_markups_scope_uidx
  ON public.global_platform_markups (scope, scope_key);

-- ─── Catalog sync runs ──────────────────────────────────────────────
--
-- A sync is the one job that can silently deactivate a live plan, so each
-- run is recorded with its counts.

CREATE TABLE IF NOT EXISTS public.global_catalog_syncs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running',
  offers_seen integer NOT NULL DEFAULT 0,
  plans_upserted integer NOT NULL DEFAULT 0,
  plans_deactivated integer NOT NULL DEFAULT 0,
  offers_rejected integer NOT NULL DEFAULT 0,
  countries_found text[] DEFAULT '{}',
  errors jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT global_catalog_syncs_status_check
    CHECK (status IN ('running', 'ok', 'failed'))
);

-- ─── Seed the currency registry ─────────────────────────────────────
--
-- Seeded from the currencies the project already meets plus the ones Zendit
-- exposes that the design named (RWF/UGX/XOF/XAF were the awkward cases).
-- This is a starting set, not a ceiling: the catalog sync adds countries,
-- and a currency row is what makes one fundable.

INSERT INTO public.global_currencies (code, name, symbol, decimals, fundable, buffer_fraction)
VALUES
  ('NGN', 'Nigerian Naira',        '₦',    2, true,  0.02),
  ('GHS', 'Ghanaian Cedi',         '₵',    2, true,  0.02),
  ('KES', 'Kenyan Shilling',       'KSh',  2, true,  0.02),
  ('ZAR', 'South African Rand',    'R',    2, true,  0.02),
  ('EGP', 'Egyptian Pound',        'E£',   2, true,  0.02),
  ('MAD', 'Moroccan Dirham',       'DH',   2, true,  0.02),
  ('CDF', 'Congolese Franc',       '₣',    2, true,  0.03),
  ('ZMW', 'Zambian Kwacha',        'ZK',   2, true,  0.03),
  ('RWF', 'Rwandan Franc',         '₣',    0, true,  0.03),
  ('UGX', 'Ugandan Shilling',      'USh',  0, true,  0.03),
  ('XAF', 'Central African CFA',   '₣',    0, true,  0.03),
  ('XOF', 'West African CFA',      '₣',    0, true,  0.03),
  ('TZS', 'Tanzanian Shilling',    'TSh',  2, true,  0.03),
  ('GMD', 'Gambian Dalasi',        'D',    2, false, 0.03),
  ('SLE', 'Sierra Leonean Leone',  'Le',   2, false, 0.03),
  ('AOA', 'Angolan Kwanza',        'Kz',   2, false, 0.03),
  ('MGA', 'Malagasy Ariary',       'Ar',   2, false, 0.03),
  ('MWK', 'Malawian Kwacha',       'MK',   2, false, 0.03),
  ('BWP', 'Botswana Pula',         'P',    2, false, 0.03),
  ('MZN', 'Mozambican Metical',    'MT',   2, false, 0.03),
  ('NAD', 'Namibian Dollar',       'N$',   2, false, 0.03),
  ('SCR', 'Seychellois Rupee',     'SR',   2, false, 0.03),
  ('SZL', 'Swazi Lilangeni',       'L',    2, false, 0.03),
  ('USD', 'US Dollar',             '$',    2, true,  0.00)
ON CONFLICT (code) DO NOTHING;

-- ─── Country -> currency ────────────────────────────────────────────
--
-- One currency per store, permanent. The store's currency is its country's
-- currency, so the mapping lives here rather than on the currency row: XAF
-- serves six countries, XOF serves eight, so a currency cannot own a single
-- country. The catalog sync discovers which countries Zendit covers; this
-- table is what says which currency a store in that country is priced in.
--
-- Scope (2026-11-01): the 24 countries the platform has always served, plus
-- `us` for the USD default. A country NOT listed here prices in USD, the
-- same fallback `getCountryCurrency` uses for wallets — so a store outside
-- the 24 can still sell every Zendit plan, priced and held in USD. The two
-- lists must stay identical; phase2.integration.test.ts fails if they drift.
--
-- Defined after the currency seed because of the foreign key.

CREATE TABLE IF NOT EXISTS public.global_country_currencies (
  country_code text PRIMARY KEY,
  currency_code text NOT NULL REFERENCES public.global_currencies (code),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.global_country_currencies (country_code, currency_code)
VALUES
  ('ng', 'NGN'), ('gh', 'GHS'), ('ke', 'KES'), ('za', 'ZAR'), ('eg', 'EGP'),
  ('ma', 'MAD'), ('cd', 'CDF'), ('zm', 'ZMW'), ('ug', 'UGX'), ('rw', 'RWF'),
  ('cm', 'XAF'), ('cf', 'XAF'), ('td', 'XAF'), ('cg', 'XAF'), ('ga', 'XAF'),
  ('gq', 'XAF'),
  ('ci', 'XOF'), ('sn', 'XOF'), ('bf', 'XOF'), ('bj', 'XOF'), ('tg', 'XOF'),
  ('ne', 'XOF'), ('ml', 'XOF'), ('gn', 'XOF'),
  ('us', 'USD')
ON CONFLICT (country_code) DO NOTHING;

-- ─── Seed the platform default markup ───────────────────────────────
-- A zero default means "no platform markup yet", which is the honest state:
-- a non-zero default would change every existing price silently.

INSERT INTO public.global_platform_markups (scope, scope_key, markup_type, markup_value)
VALUES ('default', '*', 'percentage', 0)
ON CONFLICT (scope, scope_key) DO NOTHING;

-- ─── Wallet precision ───────────────────────────────────────────────
--
-- The existing wallet columns are numeric(10,2): at most 99,999,999.99. For
-- a 0-decimal currency that is a ceiling of about $26,000 (UGX) or $70,000
-- (RWF) on a reseller's balance, which a busy reseller can exceed. Widened
-- to numeric(18,2), which is still an exact decimal and still two places —
-- the currency registry's `decimals` is what says how many are meaningful,
-- not the column width. The deposit structure itself is unchanged.

ALTER TABLE public.global_wallets
  ALTER COLUMN balance TYPE numeric(18,2);

ALTER TABLE public.global_customer_wallets
  ALTER COLUMN balance TYPE numeric(18,2),
  ALTER COLUMN total_spent TYPE numeric(18,2);

-- ─── Wallet currency is explicit and constrained ────────────────────
--
-- A wallet's currency is set from the reseller's country at creation:
-- global_country_currencies for a country we have a currency for, USD
-- otherwise. That is the "reseller not in one of the 24" case from the
-- design — the wallet is a USD wallet and Korapay/Flutterwave fund it, with
-- no change to the deposit path.
--
-- The currency is made NOT NULL and constrained to the registry so a wallet
-- can never hold a balance in a currency the pricing layer does not know.
-- Existing rows are normalised first: an unknown or empty currency becomes
-- USD, which is the documented fallback rather than a guess.

UPDATE public.global_wallets
  SET currency = 'USD'
  WHERE currency IS NULL
     OR upper(currency) NOT IN (SELECT code FROM public.global_currencies);

UPDATE public.global_customer_wallets
  SET currency = 'USD'
  WHERE currency IS NULL
     OR upper(currency) NOT IN (SELECT code FROM public.global_currencies);

UPDATE public.global_wallets SET currency = upper(currency);
UPDATE public.global_customer_wallets SET currency = upper(currency);

ALTER TABLE public.global_wallets
  ALTER COLUMN currency SET NOT NULL;
ALTER TABLE public.global_customer_wallets
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.global_wallets
  DROP CONSTRAINT IF EXISTS global_wallets_currency_fkey;
ALTER TABLE public.global_wallets
  ADD CONSTRAINT global_wallets_currency_fkey
  FOREIGN KEY (currency) REFERENCES public.global_currencies (code);

ALTER TABLE public.global_customer_wallets
  DROP CONSTRAINT IF EXISTS global_customer_wallets_currency_fkey;
ALTER TABLE public.global_customer_wallets
  ADD CONSTRAINT global_customer_wallets_currency_fkey
  FOREIGN KEY (currency) REFERENCES public.global_currencies (code);

-- ─── RLS ────────────────────────────────────────────────────────────
-- These are read by edge functions with the service role, which bypasses
-- RLS. Enable it anyway so a client key cannot read the rate table or the
-- platform's own markup configuration.

ALTER TABLE public.global_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_country_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_platform_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_catalog_syncs ENABLE ROW LEVEL SECURITY;

-- Currency metadata is public information; the storefront needs it to format
-- prices. The other tables are platform-internal.
DROP POLICY IF EXISTS global_currencies_public_read ON public.global_currencies;
CREATE POLICY global_currencies_public_read ON public.global_currencies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS global_country_currencies_public_read ON public.global_country_currencies;
CREATE POLICY global_country_currencies_public_read ON public.global_country_currencies
  FOR SELECT USING (true);
