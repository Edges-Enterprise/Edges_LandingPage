# AGENTS.md

Repository notes for `Edges-Enterprise/Edges_LandingPage` (Next.js storefront +
reseller dashboard).

## Project context

- Docs convention: `HANDOVER.md` (authoritative narrative) and
  `TASK-8-BOARD.md` (execution checklist). Update both after a fix, and note the
  commit hash. Task 8 is the current defect batch.
- **Always merge `handover/supabase-dump` into `main` in the same session you
  push the branch** (standing policy, HANDOVER.md top section) — for both this
  repo and the mobile `reseller-app`. Everything is live on web and mobile, so
  keep the two refs identical; the merge has been a clean fast-forward.
  Verify with `git merge-base --is-ancestor origin/main origin/handover/supabase-dump`
  rather than assuming, and never force-push either ref.
- Typecheck: `npx tsc --noEmit` (must be 0 before committing).
- Production URL: `https://edges-landing-page.vercel.app`.

## Vercel

- Project `edges-landing-page`, id `prj_jxynbeusJCMYJKscqALL3iVpZKyc`,
  team `team_xF3vscoESNKJIyV5aqiHOqZ4`.
- Auth for CLI/API: `$VERCEL_ACCESS_TOKEN`.
- Deploy: `npx vercel deploy --prod --yes` (or `vercel deploy --yes` for a
  preview). `vercel curl <path> --deployment <url>` bypasses deployment
  protection (SSO) on preview URLs.
- Preview URLs are blocked by deployment protection
  (`ssoProtection: all_except_custom_domains`); `vercel curl` handles it.

### Environment variables

- `type: sensitive` variables are **write-only**: the API returns
  `value: ""` and `decrypted: false`, and `vercel env pull` writes the literal
  `[SENSITIVE]`. A length of 0 therefore means *redacted*, not *blank*. To learn
  whether a value exists at runtime, deploy a temporary route that reads
  `process.env[...]` and report only presence/length — do not trust the API
  listing.
- `KORAPAY_*` and `FLUTTERWAVE_*` (secret/public/encryption) target
  `preview` **and** `production`. They used to be `production`-only, which made
  every preview deployment fund with an empty key ("authorization token is
  invalid" / "Payment provider is not configured"). `XIXAPAY_*` and the
  `NEXT_PUBLIC_SUPABASE_*` variables target all three environments.
- Updating only the `target` of an env var with
  `PATCH /v9/projects/{id}/env/{envId}` preserves the stored value (verified for
  `sensitive` vars); the CLI has no target-only update.

## Supabase

- Project ref `jjyyfaxcwanrmiipzkoj` (web app uses the same project).
- Edge functions in `supabase/functions/` (e.g. `global-store-fund-wallet`).

## Payments

- `src/lib/payments/{korapay,flutterwave,xixapay}.ts` read their secret at module
  load (`process.env.X || ""`). Both korapay and flutterwave guard a blank secret
  and return "Payment provider is not configured (<env>). Please contact
  support." — the message names `process.env.VERCEL_ENV` so a missing-secret
  report identifies the runtime.
- Country → gateway: `ng`=xixapay, `ke`/`eg`/`za`/`gh`/`cm`=korapay,
  `rw`/`ug`/`zm`=flutterwave (see `src/config/countries/*.ts`).
- The customer fund path reads the customer row through the service-role client
  (`createAdminClient`) because `global_customers` RLS grants SELECT to the store
  owner only.
- **Both surfaces can fund a customer wallet; the web needs no REST route.** The
  storefront is a client component (`[storeName]/StoreContent.tsx`) whose
  `handleFundMobileMoney` branches on `auth.isStoreOwner` and calls the
  `fundGlobalCustomerWallet` **server action** directly for a customer. A Next
  `"use server"` action is client-reachable without its own route, so the absence
  of a file under `src/app/api/` is NOT evidence that a path is missing — do not
  re-derive the (wrong) "web has no customer fund path" conclusion from that.
  The one REST route, `POST /api/reseller/[countryCode]/wallet/fund`, is
  deliberately the **owner's** (resolves the caller via
  `global_reseller_applications.auth_user_id`). The storefront modal's
  mobile-money form is gated on the **gateway** (`isXixapay`), not the role.
- `global_customers` has **no** `customer_type` or `customer_reference` column —
  sending either in an insert makes PostgREST reject the whole row (`PGRST204`).
  Its real columns are `id, reseller_id, first_name, last_name, email, phone,
  address, city, state, country, status, created_at, updated_at, auth_user_id,
  auth_email, transaction_pin, push_token, fcm_token, notifications_enabled`;
  `last_name` and `email` are `NOT NULL`, so a blank must be `""`, never `null`
  (`23502` otherwise).
- `global_customers_status_check` accepts only `active` and `inactive` — there is
  no `suspended` status (`23514`). Do not offer it in a status control.
- `global_orders` has exactly 14 columns: `id, reseller_id, customer_id,
  customer_name, plan_id, plan_name, amount, profit, status, payment_method,
  transaction_reference, metadata, created_at, updated_at`. There is no
  `order_number`, `plan_category`, `customer_email`, `completed_at`,
  `payment_status` or `provider_reference` — writing any of them fails
  (`42703`), so use `transaction_reference` for a human-readable id and
  `payment_method` as the only grouping field.
- `global_orders_status_check` accepts only `pending`, `completed`, `failed`
  and `cancelled` — not `processing` or `refunded`.
- `global_orders` had **RLS enabled with no policies** until 2026-10-28, so a
  reseller's SELECT (and the browser-client UPDATE) was denied and the orders
  page always read zero rows. Migration
  `supabase/migrations/20261028_global_orders_rls_policies.sql` adds owner-scoped
  SELECT + UPDATE policies (mirroring `global_customers`); INSERT/DELETE are
  intentionally not granted. Check `pg_policies` before assuming a `global_*`
  table is readable with the user's session.
- `global_order_status_history` (added 2026-10-28) is the order-status audit
  trail: `id, order_id, reseller_id, from_status, to_status, changed_by,
  changed_by_email, created_at`, one row per transition. It is written **only**
  by the `global_orders_status_history_trg` trigger on `global_orders`
  (`AFTER INSERT OR UPDATE OF status`); `authenticated` has a SELECT policy
  (owner-scoped) but **no INSERT**, so a client can read the log and cannot
  forge it. The trigger function is `SECURITY DEFINER` with a pinned
  `search_path`. Existing orders were deliberately not backfilled.
- Reseller-side SQL migrations live in `supabase/migrations/` and are applied by
  hand against the pooler (`aws-0-eu-central-1.pooler.supabase.com:6543`, user
  `postgres.jjyyfaxcwanrmiipzkoj`, password `$DB_PASSWORD`) — there is no
  `supabase db push` in this workflow. Keep each migration idempotent.
- Plan enablement is **opt-in via `global_reseller_plan_configs`**: a plan with
  no config row for the reseller is disabled everywhere (the storefront catalog
  is strictly opt-in, and the dashboard toggle reads `config?.enabled === true`).
  Most catalog plans have no row — e.g. the `rw`/Simi store's MTN network has
  100 active plans but only 3 config rows. So any UI that flips a plan's
  `enabled` flag must **materialize the config object** in local state rather
  than writing `config: null`, or the change appears to need a reload
  (`togglePlan` inserts the row with the country's `defaultMarkup` and the
  matching `selling_price`; mirror those values optimistically).
- The plans dashboard loads **every** network's plans up front:
  `src/app/[countryCode]/dashboard/plans/page.tsx` calls `getPlans()` with no
  network filter, so `PlansClient`'s `plansData` already holds all of them and
  the visible list is a `useMemo` filter on `activeNetwork`. Switching the
  network tab must therefore only re-filter — do not call `refreshPlans()` on
  a tab click (that refetches data already in memory and reads as a reload).
  `refreshPlans()` is still correct after a bulk update, which does change rows.
- The bulk-update card's layout classes (`.bulk-head`, `.bulk-row`,
  `.bulk-networks`) are declared **outside** the media query so desktop and
  mobile share one horizontal layout; the `max-width: 767px` block only
  tightens spacing. Do not reintroduce desktop rules inside the mobile block
  (8.ad did, and stacked the desktop row into a column).
- In `PlansClient.tsx` the styled-jsx classes lose to **inline** `style` props,
  so a width/display that lives in a shared style object (e.g. `inputStyle`'s
  old `width: 100`) cannot be overridden by a class. Move the property out of
  the style object instead of adding `!important`. When two class selectors tie
  on specificity (`.bulk-field` vs `.bulk-field--apply`), source order decides
  — put the more specific rule last.
- The bulk value input shows a resting `0` that clears on focus (person
  requirement: visible `0` at rest, empty on entry). It is a controlled
  `type="number"` field, so the pattern is a `bulkValueFocused` flag plus an
  `onFocus` that drops the resting `0` to `""` and an `onBlur` that restores it.
  Its native **spinner is hidden** on purpose: on the 56–72px field the arrows
  cover the middle of the box, so a tap there increments `0`→`1` instead of
  focusing the text.
- The per-plan editor field (`editValue`) uses the same empty-on-focus pattern
  but must **not** restore to `0` on blur: its resting value is the plan's
  current markup, so an abandoned edit would silently wipe a real markup. It
  stashes the pre-focus value in `editValueBeforeFocus` and restores that on
  blur when the user typed nothing. Route every numeric use through
  `editValueNumber` so `""` becomes `0`, never `NaN`.

## Store page (dashboard) data flow

- `dashboard/store/page.tsx` reads the reseller application through the session
  client but the settings row through the **admin** client: `global_reseller_store_settings`
  is RLS-locked with no policies (service role only), so a session-client read
  returns no row and saved settings never come back. Filter on `application_id`.
- `StoreClient` owns one `StoreData` (`{ application, settings }`). Each tab
  (`StoreSettings` / `BrandingSettings` / `ThemeSettings`) reports its own slice
  through `onUpdate` and **must** send it keyed (`{ settings: {...} }` /
  `{ application: {...} }`); `handleDataUpdate` merges into the previous object.
  The tabs' `onUpdate` props are typed `Partial<StoreData>`. Passing a bare
  slice (the old `setData(updatedData)` shape) wipes `data.application` and the
  header's `storeUrl` deref throws `Cannot read properties of undefined (reading
  'store_slug')` — this was a live crash on every Store save.
- The storefront hero reads `global_reseller_store_settings.store_subtext` for
  its second line, falling back to `welcome_message`'s hardcoded translation
  only when the reseller has never set one.

## Security tab (dashboard settings)

- `auth.mfa_factors` is **not** exposed through PostgREST — reading it as
  `supabase.from("auth.mfa_factors")` errors `relation "public.mfa_factors"
  does not exist`. Read factors with the GoTrue admin API instead:
  `createAdminClient().auth.admin.mfa.listFactors({ userId })` → `{ factors }`.
- Turning 2FA **off** requires aal2: challenge + verify the code first, then
  `supabase.auth.mfa.unenroll({ factorId })`. Never gate this on `window.prompt`
  — it is auto-dismissed in automation and reads as a dead button.
- `auth.sessions` is likewise not exposed; the session list and revocation go
  through the `SECURITY DEFINER` functions `get_my_active_sessions()` /
  `revoke_my_session(uuid)` (`20261102_security_sessions.sql`), each pinned to
  `auth.uid()`.
- GoTrue has no "password last changed" field; it is stamped on
  `global_reseller_applications.password_changed_at` by `changePassword`.

## Pushing to this repo (credentials)

- The system-injected `GITHUB_TOKEN` is a GitHub **App installation token**
  (`ghu_…`, identity `Phoenix-Boss`). It authenticates and *reads* this repo —
  and the API even reports `permissions: {admin: true, push: true}` — but it
  **cannot write**: `git push` fails with `403 … denied to Phoenix-Boss`, and
  `POST /repos/…/git/refs` returns `Resource not accessible by integration`.
  Do not trust the API `permissions` block or the account name here.
- Use **`P_TOKEN`** (a classic PAT, `repo` scope) to push:
  `git push "https://${P_TOKEN}@github.com/Edges-Enterprise/Edges_LandingPage.git" main:main`.
  The `origin` remote is already pointed at this URL, so a bare `git push`
  works once the URL carries `P_TOKEN`.
- Standing policy: after pushing `handover/supabase-dump`, merge it into `main`
  (fast-forward; the two refs are normally identical) and push both, in the same
  session. Verify with `git rev-parse` on all four refs rather than assuming.
