# ARCHITECTURE — `Edges-Enterprise/Edges_LandingPage`

The map of **what this project is and how it is built**. `HANDOVER.md` records
*what work is to be carried out*; `AGENTS.md` records the conventions a session
must follow. This file answers the structural questions so neither of those has
to be read end-to-end first.

> Written 2026-11-21 from the working tree at `main` (`2eb5294` plus the
> schema, i18n and test commits that follow it), and from the live database
> (`jjyyfaxcwanrmiipzkoj`) queried directly. Facts read from the repo or the
> database are stated plainly; anything inferred is marked _(inferred)_.

---

## 1. Which repository is the latest and most feature-complete?

This is the question that gets answered wrongly most often, because the
organisation has two first-party product repos that are both actively
developed and share one database. The honest answer depends on what "latest"
means, so both axes are given.

### 1.1 By date of last commit

| Repo | Last push | Commits | Language | Role |
|---|---|---|---|---|
| **`Edges_LandingPage`** (this repo) | **2026-11-21** | 11 on `main` (shallow clone) | TypeScript / Next.js 16 | Multi-tenant reseller platform, storefronts, backend orchestration |
| `edges_network` | 2026-11-19 | 494 | TypeScript / Expo React Native | Legacy single-country (Nigeria) mobile app |
| `Edges-Network-App` | 2025-10-07 | — | — | APK release/discovery repo, no source |
| `B-PAY` | 2026-01-08 | — | TypeScript | Separate fintech app |
| `Bimbo-Data-App` | 2026-02-28 | — | TypeScript | Separate small data app |

**`Edges_LandingPage` is the most recently updated repo** and the one where
active feature work is landing.

### 1.2 By working features

`Edges_LandingPage` is also the most feature-complete for the reseller/multi-tenant
product: it holds the storefront, the reseller dashboard, publishing, wallet,
catalogue, FX and the purchase orchestration described in this file. The
Supabase backend it drives is the same one `edges_network` uses, and the
functions that matter for money live in this repo's `supabase/functions/`.

**`edges_network` is the larger and older codebase** (494 commits since 2023)
and remains the shipped Android app, but it is the legacy single-country
product. It is not where new platform features are being added.

### 1.3 What this means in practice

- **Work on the platform, storefront, dashboard, wallet or backend → this repo.**
- **Work on the legacy Nigerian mobile app → `edges_network`.**
- Both share Supabase project `jjyyfaxcwanrmiipzkoj`, so **schema changes made
  here affect the mobile app**. This is the single most important operational
  fact in this document; see §6.

> Caution: an older `ARCHITECTURE.md` in `edges_network` argues that
> `edges_network` is the latest repo. That was written on 2026-11-15, when it
> was true. It is no longer true as of 2026-11-21.

---

## 2. What the product is

A multi-tenant platform for **resellers** who sell digital top-ups (airtime,
data bundles, cable TV, electricity, education pins) to their own customers
under their own storefront and branding.

Three surfaces ship from this repo:

1. **Public storefront** — `/{countryCode}/{storeName}`. Per-reseller branding,
   catalogue and prices. Customers sign in, fund a wallet, and buy.
2. **Reseller dashboard** — `/{countryCode}/dashboard/*`. Wallet, catalogue
   pricing, customers, transactions, publishing (Play Store presence), settings.
3. **Admin** — `/(admin)/panel`, `/{countryCode}/admin`. Applications, users,
   mail, notifications.

Supported reseller countries (from the live `global_reseller_applications`
table): `cm, eg, gh, ke, ng, rw, za, zm`. 61 reseller applications exist today,
all with a store slug.

### 2.1 Tenancy model

Every reseller is a row in `global_reseller_applications` and owns:

- a **wallet** (`global_wallets`, one per reseller, unique on `reseller_id`),
- **customers** (`global_customers`) each with their own wallet
  (`global_customer_wallets`, unique on `(reseller_id, customer_id)`),
- a **storefront** (slug, branding, catalogue mode, markup),
- a **publishing** record for their Android app (`global_reseller_publishing`).

Almost every table carries `reseller_id`. Tenant isolation is enforced with RLS
policies (136 live) plus `SECURITY DEFINER` functions that re-check the caller.

---

## 3. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), inline styles in places |
| Data | Supabase (Postgres 15.8 + Auth + Edge Functions + Storage) |
| Edge runtime | Deno (Supabase Edge Functions) |
| Payments / money | XixaPay, Flutterwave, Korapay, Zendit (airtime/data), AccraGh webhook |
| Deploy | Vercel (frontend), Supabase (DB + functions) |

18 runtime dependencies, 16 dev. Scripts: `dev`, `build`, `start`, `lint`.

---

## 4. Repository layout

```
src/
  app/
    [countryCode]/          storefront + reseller dashboard + admin, per country
      [storeName]/          public storefront
      dashboard/            reseller dashboard (wallet, catalogue, publishing…)
      admin/  apply/  launch/  sign-in/  status/  success/
    (auth)/                 sign-in, sign-up, forgot/reset password
    (protected)/            legacy Nigeria flows (airtime, data, cable, electric…)
    (admin)/                panel, send-mail, admin-notifications
    (reseller-dashboard)/   dashboard alias
  actions/                  Next.js server actions (data, electricity, …)
  components/  hooks/  providers/  context
  config/                   countries, languages
  constants/  types/  lib/
  messages/                 i18n JSON, one dir per locale (en es pt fr ar)
  middleware/  proxy.ts
supabase/
  functions/                26 edge functions + _shared/
    _shared/                purchaseOrchestrator.ts, storeCatalog.ts,
                            paymentGateway.ts, currency/, phone/, catalog/
  migrations/               39 migration files (13 are empty placeholders)
  schema.sql                schema-only snapshot of the live DB (see §6.3)
  edge-functions.json       Management API snapshot of deployed functions
  tests/                    SQL tests run against the live DB
scripts/                    supabase_dump.sh, upload_server.py
```

---

## 5. Money flow — the part to understand before touching anything

Money is the highest-risk area in this codebase. A purchase is priced,
pre-flighted for affordability, then settled. **The settlement rule lives in
SQL, not in TypeScript**, and the TypeScript must not reimplement it.

### 5.1 The purchase path

```
client
  └─ edge function: global-purchase-data | global-purchase-airtime
       └─ _shared/purchaseOrchestrator.ts
            1. resolve store + tenant
            2. resolve price (markup, FX, provider cost)   → finalPrice, costPrice, profit
            3. affordability pre-flight                    → get_global_sale_funding
                                                             (customer sale)
                                                             get_global_reseller_balance_only
                                                             (self-purchase)
            4. customer wallet check
            5. provider call (fulfilment)
            6. settlement                                  → process_global_purchase_deductions
```

Prices come in three layers: `providerCost` (what the upstream provider
charges), `costPrice` (platform cost to the reseller, after platform markup),
`finalPrice` (what the customer pays, after reseller markup). `profit =
finalPrice - costPrice`.

### 5.2 The first-deposit bonus rule

Resellers get a **first-deposit bonus** (`global_wallets.bonus_balance`) as an
adoption incentive. It is **not money**: it cannot be withdrawn, and it does
not count toward publishing.

The bonus applies **only when the reseller's own balance cannot cover the
platform cost** — i.e. only to rescue a sale that would otherwise be lost:

| Condition | Result |
|---|---|
| `balance >= costPrice` | Normal settlement. `balance += finalPrice - costPrice`. **Bonus untouched.** |
| `balance < costPrice` and `bonus >= finalPrice` | Lost sale rescued. `balance += profit`, `bonus -= finalPrice`. |
| `balance < costPrice` and `bonus < finalPrice` | **Refused.** No part-funding. |

The bonus burns the **full selling price**, not the shortfall, so the number of
sales it can rescue is finite. Part-funding is refused on purpose: crediting a
profit on a sale the platform largely funded would reopen the leak the rule
exists to close.

**Known consequence:** a bonus smaller than any available sale price is
stranded. A healthy reseller never burns the bonus at all, because it only
applies when their balance is insufficient. The wallet UI shows `bonus_balance`
as a number, which reads like spendable cash but usually is not.

The rule is implemented twice by necessity and kept in step by construction:

- `process_global_purchase_deductions(...)` — settlement.
- `get_global_sale_funding(...)` — pre-flight, returns `{can_fund, mode,
  balance, bonus}` where `mode` is `balance` | `bonus` | `none`.

`supabase/tests/sale_funding_test.sql` asserts both agree across eight cases.
It runs inside a transaction that rolls back, so it is safe against the live DB.

**Self-purchases** (a reseller buying their own plan, e.g. publishing) are
**balance-only**. The bonus never funds them.

---

## 6. Database

Live project: **`jjyyfaxcwanrmiipzkoj`** (eu-central-1), Postgres 15.8.
Current size: **85 tables, 102 functions, 136 RLS policies** in `public`.

### 6.1 Access

- Connection string via `$DB_PASSWORD`; user `postgres.jjyyfaxcwanrmiipzkoj`,
  host `aws-0-eu-central-1.pooler.supabase.com:5432`.
- `psql` / `pg_dump` are the working tools. The Supabase CLI is not required
  and this project does not use `supabase db push` — migrations are applied by
  hand with `psql` (see `AGENTS.md`).

### 6.2 Migrations

39 files in `supabase/migrations/`. **13 are 0-byte placeholders** from the
earliest (2025-01) work; the 26 non-empty files are the real history, and all
26 are confirmed applied against the live database.

`schema_migrations` was empty until 2026-11-21 and now records 24 of those 26.
Two are unrecorded because three files share the version `20261110`
(`create_global_push_notifications`, `drop_storefront_visit_onboarding`,
`schedule_global_promotions`) and `version` is the primary key. This is
informational only while migrations are applied by hand; it would need
renumbering before any move to `supabase db push`.

### 6.3 `supabase/schema.sql`

A **schema-only** snapshot of the live DB (tables, policies, functions —
no row data), regenerated with:

```bash
pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" \
  --schema-only --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage -f schema.sql
```

Two hard rules, both load-bearing:

1. **Never commit row data.** `data.sql` / `full.dump` contain real user
   records. `supabase/dumps/` is gitignored for this reason.
2. **Never commit a JWT.** The repo is public, and the live `service_role` and
   `anon` keys appear hardcoded inside several trigger functions in the
   database itself. A raw dump therefore *contains working keys* and must be
   redacted to `<REDACTED-SERVICE-ROLE-KEY>` / `<REDACTED-ANON-KEY>` before
   committing. This has been done for the current file; redo it after every
   regeneration.

Because `--no-privileges` is used, `schema.sql` contains **no GRANT/REVOKE
statements**. It is not a complete restore source — it does not capture who can
execute the money RPCs.

### 6.4 `supabase/edge-functions.json`

A Management API snapshot of deployed functions (slug, version, `verify_jwt`,
timestamps, content sha256). Reference only, not a build artifact.

`verify_jwt` is deliberately `false` for `accragh-webhook` and
`global-store-catalog` (provider callbacks and public catalogue), and `true` for
the purchase functions.

### 6.5 Money RPC grants

The money functions (`process_global_purchase_deductions`,
`get_global_sale_funding`, `get_global_reseller_balance_only`) are granted to
**`service_role` only**. `PUBLIC`, `anon` and `authenticated` are revoked
(`20261111_revoke_global_money_rpcs.sql`). Do not widen this.

---

## 7. Edge functions

26 functions in `supabase/functions/`. Shared logic lives in `_shared/` and is
the only place it should live — several functions import the same orchestrator,
so a fix in `_shared/` propagates to all of them on deploy.

Key shared modules:

| Module | Responsibility |
|---|---|
| `purchaseOrchestrator.ts` | The whole purchase path: pricing, funding pre-flight, provider call, settlement |
| `storeCatalog.ts` | Catalogue assembly, plan filtering, dedupe/sort |
| `paymentGateway.ts` | Gateway selection and charge handling |
| `currency/`, `countryCurrency.ts` | FX and per-country currency |
| `phone/` | Number normalisation and country detection |
| `storeAuthEmail.ts`, `smtpEmail.ts` | Transactional mail |
| `zenditWebhook.ts`, `accraghWebhook.ts` | Provider callbacks |

Deploying a change to `_shared/` requires redeploying **every function that
imports it**. The purchase change on 2026-11-20 required redeploying four
(`global-purchase-data`, `global-purchase-airtime`, `global-store-catalog`,
`accragh-webhook`) even though only two of them call the funding RPC — the
other two bundle the orchestrator.

---

## 8. Internationalisation

Five locales: `en`, `es`, `pt`, `fr`, `ar`, in `src/messages/<locale>/*.json`
(namespaced: `publishing.json`, `wallet.json`, and others). Server pages import
the namespace dynamically:

```ts
const translations = await import(`@/messages/${language}/publishing.json`);
```

Missing keys **silently fall back to English**, because components read them as
`t?.key || "English default"`. There is no build-time check that a key exists in
every locale, so a new key added only to `en` produces no error and no warning —
it just shows English to four locales. When adding a key, add it to all five.

---

## 9. Testing

- **TypeScript unit tests**: `deno test supabase/functions/_shared/<file>.test.ts`.
  No `package.json` test script; there is no vitest/jest.
  Some shared modules import npm packages, so a bare `deno test` on the whole
  directory fails without `node_modules` — run individual files.
- **SQL tests**: `supabase/tests/*.sql`, run with
  `psql "$DB_URL" -v ON_ERROR_STOP=1 -f <file>`. These run in a transaction and
  `ROLLBACK`, so they leave no rows.
- **Typecheck**: `deno check supabase/functions/_shared/<file>.ts`.
- **No E2E or component test suite exists.**

---

## 10. Deployment

| Target | How |
|---|---|
| Frontend | Vercel, from `main` |
| DB migrations | `psql` by hand, `ON_ERROR_STOP` + `--single-transaction` |
| Edge functions | Supabase Management API / CLI deploy, then refresh `edge-functions.json` |
| Schema snapshot | `pg_dump` per §6.3, redact keys, commit |

Order matters: **migration before function deploy**, because the deployed
function calls the RPC the migration creates. Deploying first yields
`Store configuration error` until the migration lands.

---

## 11. Known gaps and sharp edges

Collected here so they are not rediscovered each session.

1. **`schema.sql` carries no grants** (§6.3). Restoring from it does not restore
   permissions on the money RPCs. Re-grant explicitly after any restore.
2. **Two migrations are untracked** because of the `20261110` version collision
   (§6.2).
3. **i18n has no missing-key check** (§8). Silent English fallback.
4. **The bonus can be stranded** below the smallest sale price (§5.2), and the
   UI presents it as though it were spendable.
5. **`_shared/` changes need multi-function redeploys** (§7); it is easy to fix
   one function and leave a stale bundle on another.
6. **Two repos share one database** (§1.3). A schema change here can break the
   legacy `edges_network` mobile app.
7. **13 empty migration placeholders** (§6.2) make the history look fuller than
   it is.
8. **The purchase refusal message is deliberately vague** ("Service temporarily
   unavailable"). Refusals now log the reseller and balances so support can tell
   an unfunded store from an outage — but the logs, not the message, are the
   source of truth.

---

## 12. Where to look next

| Question | File |
|---|---|
| What work is outstanding? | `HANDOVER.md` |
| What conventions must I follow? | `AGENTS.md` |
| What is the schema, exactly? | `supabase/schema.sql` |
| What is deployed right now? | `supabase/edge-functions.json` |
| How does a purchase settle? | `supabase/functions/_shared/purchaseOrchestrator.ts`, `supabase/migrations/20261116_bonus_covers_lost_sale.sql` |
| Does the funding rule still work? | `supabase/tests/sale_funding_test.sql` |

---

## 13. Reseller-held customer funds (2026-11-23)

Before this change a customer's wallet and the store's wallet were financially
unrelated: a customer deposited into their own wallet, and the store only ever
touched its own money. The store owner is the admin of their own store —
customers are theirs, support runs through them — so customer money now sits in
the store balance, and a sale settles at cost.

### 13.1 The two invariants

A customer deposit credits **both** wallets by the same amount:

```
customer wallet  += net_amount
reseller balance += net_amount      (ledger row names the customer)
```

A customer purchase moves money in two parts:

```
customer wallet  -= selling_price
reseller balance -= cost_price      (the platform cost)
```

The difference, `selling_price - cost_price`, stays in the reseller balance as
profit. It is not a credit; it is the part of the customer's money no longer
owed back to them.

**This replaced a profit-only rule.** Previously settlement ran
`reseller balance += selling_price - cost_price`, because customer money never
entered the balance. Left in place, that would have paid the reseller twice —
once when the customer deposited, again when they bought. Taking only the cost
out is the single charge for the sale.

### 13.2 Float is the reseller's responsibility

`reseller balance` therefore contains customer money. This is deliberate:

- The reseller may withdraw the **full** balance, float included.
- `get_reseller_float_owed()` reports the float so the dashboard can show it,
  but it never reduces the withdrawable amount.
- If a reseller withdraws too much, their store cannot cover the platform cost
  and the sale is refused. The customer is told *"Service temporarily
  unavailable. Please try again later."* — deliberately vague, so a poorly
  funded store is not distinguishable from an outage.

The dashboard shows "Includes customer funds" next to the available balance so
the figure is never a surprise.

### 13.3 Where the money logic lives

| Concern | Location |
|---|---|
| Deposit mirror (idempotent) | `credit_reseller_for_customer_deposit(reseller, customer_tx_id, amount)` |
| Settlement | `process_global_purchase_deductions(...)` — now takes the cost from balance |
| Funding pre-check | `get_global_sale_funding(...)` — unchanged; already agreed with settlement |
| Withdrawal rule | `get_withdrawal_eligibility(reseller, timezone)` |
| Withdrawal request | `request_global_withdrawal(...)` — day gate, lock, deduction, ledger in one call |
| Withdrawal outcomes | `fail_global_withdrawal(...)` refunds; `complete_global_withdrawal(...)` finalises |
| Migration | `supabase/migrations/20261123_customer_deposits_fund_reseller_balance.sql` |
| Tests | `supabase/tests/reseller_customer_funds_test.sql` (9 cases) |

All of these are `SECURITY DEFINER` and granted to `service_role` only.

### 13.4 Withdrawals

- **Sundays and Wednesdays**, evaluated in the store's timezone
  (`config.timezone`, `Africa/Lagos` for NG) — never the browser's, so a
  reseller cannot reach an allowed day early by changing their clock.
- **Unlimited** on those days. There is no weekly count.
- Any other day: *"Your next withdrawal day is {Weekday}, {D} {Month} {YYYY}"*.
- **2% fee**, deducted from the requested amount (₦1,000 → ₦20 fee → ₦980).
- A **failed** payout refunds in full. A completed one does not.

Withdrawals are recorded in `global_withdrawals` and mirrored to
`global_transactions` as a **`debit`**, because `global_transactions_type_check`
permits only `credit|debit|purchase|refund` — there is no `withdrawal` member.

### 13.5 Idempotency

Deposits arrive through webhooks that retry. The mirror is keyed on
`CDEP-<customer_tx_id>` in `global_transactions.reference`, and returns
`already_credited` on a replay rather than crediting again. The deposit handler
treats a mirror failure as **non-fatal**: the customer is already credited, and
a missing mirror can be re-run, whereas failing the request would provoke a
retry of the whole deposit.

### 13.6 What is not retroactive

Historical purchases never wrote `global_customer_transactions` rows — six
deposits and zero purchases exist despite ₦57,600 of spend. Reseller-side
"customer purchase" history therefore starts from deploy. Customer deposits
were backfilled (see HANDOVER) but purchases were not, by decision.

### 13.7 Known consequence

A reseller can withdraw money their customers deposited, leaving the store
unable to fund orders. Accepted by product decision. The failure mode is a
refused sale with the vague message above, not a negative balance: settlement
refuses before deducting anything from the customer.
