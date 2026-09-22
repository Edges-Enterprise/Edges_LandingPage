# Task 4 pickup brief — Customer Storefront Rebuild

Give this to a fresh session (any environment: sandbox, Ubuntu, or
otherwise) to resume Task 4 exactly where the last session left off.
This is a kickoff summary, not a replacement for the full record —
`HANDOVER.md`'s Task 4 section is the authoritative source; this file
just orients a new session fast and tells it where to look.

## 0. Standard bootstrap first (this is a house rule, not Task-4-specific)

Before anything else, per `HANDOVER.md`'s "Session bootstrap" section:

```bash
git fetch --all
git for-each-ref --sort=-committerdate refs/remotes --format='%(committerdate:iso8601) %(refname:short) %(objectname:short)'
git checkout -B <latest-branch-name> origin/<latest-branch-name>
```

Then read `HANDOVER.md` **from that checked-out branch** in full —
this file assumes you've done that. As of this writing the branch is
`handover/supabase-dump`.

## 1. What Task 4 is

Rebuilding `src/app/[countryCode]/[storeName]/*` from a bare
cart/checkout flow into a wallet/PIN/login customer storefront that
matches `src/app/[countryCode]/(store)/old-storeName/*` (the
Nigeria-only legacy reference) in UI/behavior, but working correctly
across every supported country. Cart/checkout is removed entirely.
Full scope, locked-in decisions, and a "Reality check" section
correcting several assumptions in the original brief all live in
`HANDOVER.md`'s `## Task 4` section — read that in full before writing
any code, don't rely on this summary alone.

## 2. What's already done (branches `1.a`, `1.b`, `1.c` — all closed)

- **Schema** (`1.a`, closed): `global_customers` gained
  `auth_user_id`/`auth_email`/`transaction_pin` + a
  `UNIQUE (reseller_id, email)` constraint. Two new tables:
  `global_customer_wallets`, `global_customer_virtual_accounts`.
  Migration: `supabase/migrations/20260919_customer_auth_wallet_schema.sql`.
- **Auth actions** (`1.b`, closed — one sub-item deliberately
  deferred): `registerCustomerToGlobalReseller.ts`,
  `getGlobalCustomerAuthEmail.ts`,
  `src/hooks/customer/useCustomerAuth.ts` (standalone hook — not yet
  wired into a component, since `StoreContent.tsx`'s rebuild, branch
  `3.a`, hasn't started). **`1.b.iii.zo` is explicitly deferred, not
  done** — verify `useCustomerAuth` against the real `StoreContent.tsx`
  auth-state shape once branch `3.a` is underway. Don't skip this when
  you get to `3.a` — it's tracked, not forgotten.
- **Wallet & virtual account actions (`1.c`, fully closed — `i`
  through `vi`)**:
  - `1.c.i` — `getGlobalCustomerWallet.ts` (read wallet + accounts)
  - `1.c.ii` — `createGlobalCustomerVirtualAccount.ts` (xixapay/BVN
    flow, resolved a schema gap via a two-step customer lookup instead
    of a new column)
  - `1.c.iii` — new migration:
    `supabase/migrations/20260921_customer_transactions_schema.sql`
    (`global_customer_transactions` — found that `global_transactions`
    has no `customer_id` column at all, needed its own table)
  - `1.c.iv` — `fundGlobalCustomerWallet.ts` (mobile-money funding for
    korapay/flutterwave, config-driven exclusion of xixapay countries)
  - `1.c.v` — `handleSuccessfulCustomerDeposit.ts`, wired into
    `korapay/route.ts` and `flutterwave/route.ts` (each now falls back
    to the customer completion path when no reseller transaction
    matches). **Found while doing this**: `[countryCode]/payment/route.ts`
    is likely a stale/orphaned webhook route — its gateway callback
    URLs actually point elsewhere — flagged for someone to confirm and
    probably delete, not touched. Also confirmed
    `src/actions/reseller/wallet/handleSuccessfulDeposit.ts` is dead
    code (nothing calls it) and removed one dangling import of it.
  - `1.c.vi` — xixapay customer virtual-account attribution in
    `xixapay/route.ts` (a fundamentally different shape from `1.c.v` —
    no pending row to match against, so it matches by
    `metadata.receiver.account_number` against
    `global_customer_virtual_accounts` and inserts directly, with its
    own idempotency check by `reference` since there's no existing-row
    guard to rely on). Also fixed a real reseller-side bug while
    already in the file: the first-deposit bonus had no source-gating
    at all (now fires only for `source === "app"`, matching product
    intent confirmed directly with the user).
  - **Real, live bug found and flagged, out of Task 4's scope to fix**:
    `korapay/route.ts`, `flutterwave/route.ts`, and
    `[countryCode]/payment/route.ts` **all three** update
    `completed_at`/`provider_reference` columns that don't exist on
    `global_transactions`. This means reseller wallet deposits via any
    of these three paths may never actually get marked `completed`
    today — a real production-money issue, unrelated to the customer
    storefront, deliberately not fixed here since it's reseller-side
    and pre-existing. Worth its own task if it hasn't been picked up
    separately by the time you read this.

All of the above verified with a full-project `npx tsc --noEmit -p
tsconfig.json` (0 errors) plus, where relevant, an explicit
field-by-field cross-check against `schema.sql`'s real column lists —
not just the type-check, which doesn't validate Supabase column names
in this codebase at all. Keep doing both when you add new
DB-touching code.

## 3. Active pointer right now: `1.d.i.zi.x`

**This is your starting task.** Full detail is in `HANDOVER.md`'s
"Next atomic step" subsection at the end of the Task 4 section — read
it there for the complete reasoning, but the short version:

Branch `1.d` is the **purchase/fulfillment action** — real money
movement plus a live provisioning call to whatever upstream data/
airtime provider the store's country uses. Per Task 4's original
"Reality check" finding #6 (already confirmed, not something to
re-derive): the legacy `purchasePlan.ts` and the RPCs it calls
(`deduct_reseller_cost`, `create_purchase_order`,
`process_purchase_deductions`, `get_reseller_balance`) are
**legacy-table-bound**, not generic — e.g. `create_purchase_order`
does a plain `INSERT INTO reseller_orders`, not `global_orders`. New
parallel `global_*` RPCs are needed, mirroring the legacy ones' logic
against `global_wallets`/`global_customer_wallets`/`global_orders`/
`global_transactions`/`global_customer_transactions`, not a
reuse-as-is.

Before writing anything:
- Re-read `src/app/actions/reseller/orders/purchasePlan.ts` in full
  (already read once during this task's opening investigation — the
  findings are in `HANDOVER.md`, but re-confirm details directly
  rather than trusting a summary for something this consequential).
- Read the four RPC function bodies directly in `schema.sql` to
  confirm current behavior, not just their names.
- Check `config.providers.data`/`.providers.airtime` per country
  (e.g. `lizzysub` for Nigeria, `zendit` for Senegal) — fulfillment
  must dispatch to the right upstream provider, not hardcode one.
  Confirm each configured provider's actual API shape before assuming
  they all take the same payload shape as Lizzysub's.

Treat this with at least as much care as the `1.c` wallet-funding
work — expect it not to fit a single atomic `x` either; several `1.c`
steps turned into "write a migration first" or "split by gateway"
once actually in the code, and this branch is likely to do the same.

Branch `1.d`'s own sub-items (`i`, `ii`, `iii`) are listed in
`HANDOVER.md`'s architecture tree under Task 4 — read that tree in
full before deciding how to decompose `1.d.i` itself.

## 4. Standing process reminders (all detailed in `HANDOVER.md`, summarized here)

- **Patch/handoff process**: sandbox sessions lack push credentials.
  Commit locally, `git format-patch`, hand the `.patch` file(s) to the
  user, they run `git am` + `git push` (with `git pull --rebase`
  first — recent sessions have hit divergence races more than once).
- **Schema snapshot exception**: `supabase/schema.sql` is committed
  directly from the Ubuntu environment (which has real push access),
  not via patch — see "Schema snapshots" section in `HANDOVER.md`.
- **Migrations**: drafted here, applied via a direct `psql` command
  the user runs in Ubuntu — see "Handoff process for DB migrations"
  section.
- **Task-decomposition/pointer methodology**: exactly one active
  pointer at a time, a full path ending in `x` (e.g. `1.c.v.zi.x`).
  Complete only that leaf, then advance the pointer depth-first per
  the documented order. Full rules in the "Task decomposition &
  session-pointer methodology" section near the top of `HANDOVER.md`.
- **"Option A" standing policy**: empty/broken scaffold files outside
  what the current task is actually building get a minimal honest
  placeholder or get disabled (`.tsx.disabled` + explanatory comment),
  not a full feature build — unless a task is specifically scoped to
  that file/feature.
- **Verification discipline established across this task**: after any
  DB-touching code, run a full-project `npx tsc --noEmit -p
  tsconfig.json` (not an isolated single-file check — path aliases
  don't resolve that way) *and* manually cross-check every selected
  field against `schema.sql`'s real column list, since this codebase's
  Supabase client isn't strictly typed against generated DB types —
  `tsc` alone won't catch a wrong column name.
- **Before disabling any file as orphaned scaffold**: confirm via a
  repo-wide import search first. Don't assume unused just because it
  looks stale.

## 5. Key reference files

- `HANDOVER.md` (this repo, `Edges_LandingPage`) — the full record.
  Task 4 section, "Reality check" subsection especially.
- `src/app/[countryCode]/(store)/old-storeName/StoreContent.tsx` —
  the 3920-line legacy behavioral/layout reference. Already read in
  full during this task's opening session; don't need to re-read it
  cover-to-cover, but do check back against it for any UI/behavior
  detail not already covered in `HANDOVER.md`'s findings.
- `src/app/[countryCode]/dashboard/wallet/FundWalletModal.tsx` +
  `src/actions/reseller/wallet/fundWallet.ts` — the real, working
  multi-gateway funding pattern that `1.c.iv`'s customer-side version
  mirrors. Useful template if branch `3.a`'s customer-facing modal
  needs the same UI pattern, customer-scoped.
