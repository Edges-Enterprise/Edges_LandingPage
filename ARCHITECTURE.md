# ARCHITECTURE — `Edges-Enterprise/Edges_LandingPage`

The map of **what this project is and how it is built**. `HANDOVER.md` records
*what work is to be carried out*; `AGENTS.md` records the conventions a session
must follow. This file answers the structural questions so neither of those has
to be read end-to-end first.

> Written 2026-11-21 from the working tree at `main` (`2eb5294` plus the
> schema, i18n and test commits that follow it), and from the live database
> (`jjyyfaxcwanrmiipzkoj`) queried directly. Facts read from the repo or the
> database are stated plainly; anything inferred is marked _(inferred)_.
> §1.0 was added and §1.1–1.3 re-verified against the GitHub API on 2026-11-15.

---

## 1. Which repository is the latest and most feature-complete?

### 1.0 About the `edges_network` repository name — read this first

The task instruction "clone `Edges-Enterprise/edges_network`" does not resolve
to a repository. Verified on 2026-11-15:

| Check | Result |
|---|---|
| `GET /repos/Edges-Enterprise/edges_network` with token | `404 Not Found` |
| Same URL, unauthenticated | `404 Not Found` |
| `GET /orgs/Edges-Enterprise/repos?type=all` | 7 repos, **0 private** |
| GitHub code search for `edges_network` in the org | 1 hit: `Edges-Network-App` (name match only) |

`edges_network` is the **`name` field in this repo's `package.json`**
(`"name": "edges_network"`, `"version": "0.1.1"`). It is the npm package name
of *this* project, not a separate GitHub repository.

Two consequences follow, and both matter for handover:

1. **Anything that says "work on the mobile app in the `edges_network` repo"
   is stale.** The mobile repo referenced throughout `HANDOVER.md` is
   `Erudite885/reseller-app` (see §1.3), which is outside the
   `Edges-Enterprise` org. If a private `edges_network` repo does exist, this
   token cannot see it, because it can see 0 private repos; access would have
   to be granted explicitly.
2. **`Edges-Network-App` is not a source repo.** Its root contains exactly one
   file, `README.md`, which is marketing copy for the Android app ("Nigeria's
   #1 trusted platform…"). It holds no code and cannot be built.

### 1.1 By date of last commit

| Repo | Last push | Language | Role | Status |
|---|---|---|---|---|
| **`Edges_LandingPage`** (this repo) | **2026-11-25** | TypeScript / Next.js 16 | Multi-tenant reseller platform: storefronts, dashboard, wallet, purchases, backend orchestration | **Latest. 47 commits on `main`, active development** |
| `B-PAY` | 2026-01-08 | TypeScript / Expo | Separate fintech/wallet app with its own Supabase schema | Real code (`yarn` zero-install), ~160 MB |
| `Edges-Network-App` | 2025-10-07 | — | Android app marketing / release pointer | **Stub — `README.md` only, no source** |
| `localsend2` | 2026-02-22 | — | Fork of `localsend/localsend` | Unrelated to Edges product |
| `editmovie2` | 2026-02-01 | — | Fork of `fmhy/edit` | Unrelated to Edges product |
| `cal.com` | 2026-02-10 | — | Fork of `calcom/cal.diy` | Unrelated to Edges product |
| `postiz-app` | 2025-07-17 | — | Fork of `gitroomhq/postiz-app` | Unrelated to Edges product |

Read from the GitHub API on 2026-11-15 (`pushed_at`, `language`, root-contents
listing, fork/parent metadata). The four forked repos are third-party projects
mirrored into the org; they share no code with the Edges product.

**`Edges_LandingPage` is the most recently updated repo** *and* the one where
active feature work is landing. `HANDOVER.md` records its history through Task
11 (the Xixapay sweeper); the newest commits concern the customer purchase flow,
diagnosed and fixed on 2026-11-24/25.

### 1.2 By working features

`Edges_LandingPage` is the only repo with a working, end-to-end reseller
platform: storefront, dashboard, publishing, wallet, catalogue, FX and the
purchase orchestration described in this file. The Supabase backend it drives
(`jjyyfaxcwanrmiipzkoj`) is shared with the legacy mobile client, and the
functions that matter for money live in this repo's `supabase/functions/`.

Feature status, verified live on 2026-11-15:

| Capability | State | Evidence |
|---|---|---|
| Multi-tenant storefronts | **Working** | `/ng/belovedtopup` server-renders its plans and a Buy button |
| Customer login with aliased email | **Working** | Real login as `beloveddavid80@gmail.com`, mapped to `…+belovedtopup1@gmail.com` |
| Reseller dashboard login | **Working** | `adegbiledavid83@gmail.com` → `/ng/dashboard` |
| Catalogue + per-store pricing | **Working** | 37 plans returned (30 NG, 7 GH) |
| First-time customer PIN creation | **Working** (fixed 2026-11-24, `c0c0cfd`) | PIN `9034` persisted to `global_customers` from the storefront |
| Transaction-PIN enforcement | **Working** | Wrong PIN → *"Invalid transaction PIN"*; correct PIN proceeds |
| Wallet debit → provider delivery | **Unverified end-to-end** | Reaches the provider, then *"Insufficient balance"*; demo wallets are near-empty |
| Lizzysub 11-digit phone fix | **Fixed in source, NOT deployed** | `_shared/providers.ts` sends the local form; the live function is stale |
| Xixapay sweeper (admin) | Working per `HANDOVER.md` | Task 11; not browser-verified by this session |
| Legacy Android app | **Not available in this org** | `Edges-Network-App` is README-only |

The useful conclusion: **work on the platform → `Edges_LandingPage`.** There is
no other first-party source repo in this org to work in.

### 1.3 What this means in practice

- **Work on the platform, storefront, dashboard, wallet or backend → this repo.**
- **The mobile app is `Erudite885/reseller-app`**, outside this org, per
  `HANDOVER.md` §"Repos in scope". It cannot be cloned from `Edges-Enterprise`.
- That mobile client talks to the same Supabase project (`jjyyfaxcwanrmiipzkoj`),
  so **schema changes made here affect the mobile app**. This is the single most
  important operational fact in this document; see §6.

> Caution: older notes (including an `ARCHITECTURE.md` in the mobile repo)
> describe `edges_network` as the latest repo and the place to do mobile work.
> That repo is not reachable from this org (§1.0). Treat those notes as stale.

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
   legacy mobile client (`Erudite885/reseller-app`).
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

## 13. Reseller-held customer funds (2026-11-23, LIVE)

Fully deployed 2026-11-23: migration applied, web at `596e4f9`, and both edge
functions importing `purchaseOrchestrator.ts` (`global-purchase-data`,
`global-purchase-airtime`) at v30. Note that only those two import it — the
others reference it in comments only. See `HANDOVER.md`.

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

#### Payout dispatch

`request_global_withdrawal` only writes the ledger. The bank transfer itself is
sent afterwards by `dispatchWithdrawalPayout`
(`src/lib/payments/withdrawalPayout.ts`), called from the withdraw route once
the row exists.

The provider receives the **net** amount (₦1,000 → provider is told ₦980); the
fee never leaves the platform.

| Provider | Countries | Payout endpoint | Settles |
|---|---|---|---|
| Xixapay | NG | `POST /api/v1/transfer` | instantly, final |
| Korapay | 20 others | `POST /merchant/api/v1/transactions/disburse` | async (`processing`) |
| Flutterwave | rw, ug, usd, zm | `POST /v3/transfers` | async (`NEW`/`PENDING`) |

Only Xixapay, Korapay and Flutterwave implement `processPayout`. A country
whose provider lacks it fails the withdrawal and refunds rather than silently
leaving it pending.

**Failure handling.** The three outcomes are deliberately different, because
the expensive mistake is refunding a payout that actually went through:

| Provider result | Withdrawal | Balance |
|---|---|---|
| Rejected (`definitive: true`) | `failed` | refunded in full |
| Unknown — timeout, socket error, 5xx (`definitive: false`) | stays `pending` | **not** refunded |
| Accepted, not settled (`pending: true`) | stays `pending` | not refunded |
| Accepted and settled | `completed` | not refunded |

An unknown outcome stays pending because the request may have reached the
provider; refunding it would pay the reseller twice. The same rule applies if
the payout succeeds but `complete_global_withdrawal` then fails — the money is
gone, so the row is left pending and logged for reconciliation instead of being
refunded.

**Settlement.** Korapay and Flutterwave settle asynchronously, so a payout they
accept stays `pending` until its status is polled. Two paths do that:

- **When the reseller opens their wallet** — `GET /api/reseller/wallet/withdraw`
  calls `settleResellerPayouts` for that reseller's own rows before reporting
  the balance. This is the path that normally resolves a payout, since it runs
  as soon as someone looks.
- **Daily cron** — `GET /api/cron/reconcile-withdrawals` at 03:00
  (`vercel.json`) is the backstop for resellers who never return. Vercel's
  Hobby plan only permits **daily** cron jobs; a `*/10` schedule fails the
  deployment outright ("Hobby accounts are limited to daily cron jobs"), so do
  not tighten this without first confirming the plan.

The cron requires `Authorization: Bearer $CRON_SECRET` and returns 503 when
that variable is unset, so it cannot be triggered by the public. Rows younger
than 2 minutes are skipped; rows older than 72 hours are left for a human.

Withdrawals are only permitted on **Sundays and Wednesdays**, so a Sunday
payout gets cron attempts on Monday, Tuesday and Wednesday before the 72-hour
cutoff. Xixapay exposes no payout status endpoint, so a stuck Xixapay row can
only be resolved manually.

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

---

## 14. The Xixapay sweeper (2026-11-23, LIVE)

Platform admins can move the Xixapay float to a bank account at
`/[countryCode]/admin/sweeper`. Server-gated by `getPlatformAdmin`; a non-admin
gets `notFound()`, never the balance. Every action re-checks the gate.

### 14.1 Xixapay has no balance API

Verified: `api/v1/balance`, `api/balance`, `api/v1/wallet/balance`,
`api/get/balance`, `api/v1/account/balance` all return 404. So the balance is
**derived from our own ledger**, never quoted by the provider.

The page says this to the admin rather than presenting the figure as
provider-confirmed, because an admin moving real money needs to know which
number they are trusting.

### 14.2 How the balance is computed

`xixapay_wallet_balance` sums `xixapay_wallet_ledger`:

```
balance = Σ deposits − Σ sweeps      where created_at >= 2026-11-20
```

Three things about that rule:

- **Every reseller counts.** The ledger is central, not per-store. The view
  filters on date only — it has no reseller, store or receiver column in its
  predicate. A deposit from any store adds to the same float. (Verified by
  inserting a deposit attributed to an unrelated store inside a rolled-back
  transaction: the balance rose by exactly that amount.)
- **The start date is the first real payment**, 2026-11-20, the day BelovedTopup
  took its first deposit. Not the day the store was created. Rows older than
  that stay in the table for audit but do not count.
- **Deposits are recorded NET** of the platform fee (4%). So the ledger is what
  resellers were credited, not what Xixapay settled. The gap is platform fee
  revenue still sitting in the Xixapay account, which is expected.

The webhook writes the ledger row at STEP 4.5, before any reseller or
global-app routing, so it runs once per successful payment regardless of which
store ends up claiming it.

### 14.3 Why it read ₦1,100 instead of ₦820

Two independent faults, both corrected by
`supabase/migrations/20261123_xixapay_ledger_reconcile.sql`:

| Cause | Effect |
|---|---|
| Xixapay re-delivered one ₦100 payment three times, each under a **new** `transaction_id` but with an identical payload timestamp | +₦180 |
| A July manual backfill (+₦900) and its sweep (−₦800), both pre-go-live | +₦100 |

The re-delivery slipped through because the ledger's unique constraint is on
`transaction_id`, and the re-deliveries carried different ones. A unique index on
the payment's real identity — payload timestamp + sender account + amount — now
rejects them; the webhook already catches and logs the resulting error.

### 14.4 One sweep at a time

The balance is read, the transfer is sent, then the ledger row is written. Two
admins could read the same balance and both send it, and the provider cannot
arbitrate afterwards because it exposes no balance.

`xixapay_sweep_logs` is written **before** the transfer with status `pending`,
and a partial unique index (`WHERE status = 'pending'`) makes a second concurrent
sweep fail with `23505` instead of paying twice. A claim abandoned by a crashed
request is cleared after 10 minutes by `releaseStaleSweeps`, so a dead request
cannot lock the sweeper out permanently.

`pending` was used rather than a new `in_flight` status because the table's CHECK
constraint only permits `pending`/`completed`/`failed`.

### 14.5 Outcome handling

The transfer is instant and final; there is no payout-status endpoint to ask
afterwards. So an unknown outcome is treated as unknown rather than assumed
either way:

| Provider result | Sweep log | Balance |
|---|---|---|
| Accepted | `completed` | ledger row written, balance drops |
| Rejected (`definitive: true`) | `failed` | untouched — no money moved |
| Threw, or `definitive: false` | `failed`, "check the dashboard" | untouched, admin told to verify before retrying |
| Accepted but ledger write failed | `completed` with a loud error | **overstates** until corrected by hand |

The last row is the dangerous one: money has left but the ledger still shows it.
It is logged with the overstatement amount and surfaced to the admin rather than
silently swallowed.

### 14.6 Bank verification

The account name is resolved by the provider before the send and shown to the
admin for confirmation, and it is re-verified server-side immediately before the
transfer — a name typed into the form is not trusted, and a payout to the wrong
name is unrecoverable.

### 14.7 Minimum sweep

`MIN_SWEEP` is ₦500. Below that the transfer is not worth the fee.
