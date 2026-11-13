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
- **Pushing `main` auto-deploys to production.** The repo has a Vercel Git
  integration, so a push to `main` triggers a production build and moves the
  `edges-landing-page.vercel.app` alias to it — **no manual deploy is needed
  after a push**. Confirm it with
  `GET https://api.vercel.com/v6/deployments?projectId=prj_jxynbeusJCMYJKscqALL3iVpZKyc&teamId=team_xF3vscoESNKJIyV5aqiHOqZ4&target=production`
  (newest entry should carry your commit's `githubCommitSha` and reach
  `READY`), then check the alias:
  `GET https://api.vercel.com/v4/aliases?projectId=...&teamId=...`.
- Deploy: `npx vercel deploy --prod --yes` (or `vercel deploy --yes` for a
  preview) — only needed to ship something **without** a push (e.g. an
  uncommitted change). `vercel curl <path> --deployment <url>` bypasses
  deployment protection (SSO) on preview URLs.
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
- `npx next build` needs the Supabase vars **exported in the shell** or it dies
  during "Collecting page data" on `/api/xixa-account/webhook` with
  `Error: supabaseUrl is required` (that route builds a Supabase client at
  module scope). `APP2_SUPABASE_URL` / `APP2_SUPABASE_SECRET_KEY` and the
  `APP3_*` pair come from the registered secrets. This failure is unrelated to
  whatever you are changing — reproduce it with your change stashed before
  blaming the diff.

### Env var names: use the `NEXT_PUBLIC_` Supabase vars on Vercel

- The web app runs on Vercel, which defines only `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  The **non-prefixed** `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
  `SUPABASE_ANON_KEY` exist only as **Supabase edge-function secrets** — a
  Vercel runtime never sees them. They hold the same values (proved by
  comparing `sha256(NEXT_PUBLIC_*)` against the Management API digests).
- Server code that needs the service-role client must use
  `createAdminClient()` from `@/lib/supabase/admin`, not
  `createClient(process.env.SUPABASE_URL, ...)`: with the var unset,
  `createClient` throws `supabaseUrl is required.` A route that swallowed that
  in a `try/catch` (the XixaPay webhook ledger) silently dropped every write.
- The **Firebase admin** vars are the same trap: `FIREBASE_SERVICE_ACCOUNT`
  lives only in the Supabase function secrets, and Vercel carries only
  `NEXT_PUBLIC_FIREBASE_*` (client config). `FIREBASE_PROJECT_ID` is likewise
  unset on Vercel — fall back to `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
- Never `JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)` unguarded (see the
  edge-function note below; the same trap exists on both sides).

### Edge functions: don't `JSON.parse` a secret at module scope

- **Push delivery is per data model.** The app is now multi-country /
  multi-tenant on the `global_*` tables. New work uses
  `global-send-push-notification`; the legacy
  `reseller-send-push-notification` reads the retired
  `resellers` / `reseller_customers` tables and is **reference-only** — do not
  extend it or wire anything new to it.
- `global-send-push-notification` is triggered by
  `global_reseller_push_trigger` / `global_customer_push_trigger` on
  `global_notifications` / `global_customer_notifications` (migration
  `20261110_create_global_push_notifications.sql`). It resolves tokens from
  `global_reseller_applications` (owner) or `global_customers` (customer) and
  sends via direct FCM when a Firebase service account is configured, else the
  Expo push service. The trigger presents a shared secret as `x-push-secret`;
  the function enforces it against the `PUSH_TRIGGER_SECRET` env secret (set it
  to the same value as the vault `push_trigger_secret`).
- Both push functions once did `JSON.parse(Deno.env.get("FIREBASE_ADMIN_SDK_JSON")!)`
  at **module scope**. `Deno.env.get` returns `undefined` when the secret is
  missing, so `JSON.parse(undefined)` throws during isolate boot and 500s the
  whole function — including the Expo path that never needs Firebase. Read it
  lazily, accept `FIREBASE_ADMIN_SDK_JSON` or `FIREBASE_SERVICE_ACCOUNT`, and
  take the direct-FCM branch only when a service account actually parsed.
- Never let a push failure reject a request whose DB writes already committed
  (a wallet credit must not return 500 just because FCM was unreachable).
- `send-push-notification` (the legacy `notifications`-table trigger) is
  **Expo-only** and reads no Firebase secret, so it has no env-name trap.
- Deploy either push function with `--no-verify-jwt` (the DB trigger presents no
  JWT). Neither function's source was in the repo originally; both are now
  versioned under `supabase/functions/` — keep them in sync when deploying.

### Scheduled promotions

- `global-scheduled-promotions` sends the recurring promotional notifications
  to every active store on the `global_*` model. It inserts into
  `global_notifications` / `global_customer_notifications`; the push triggers
  above deliver them. The legacy `reseller-scheduled-promotions` /
  `web-scheduled-promotions` are **reference-only** (retired `reseller_*`
  tables, and their weekly cron could never fire a time/day rule). The legacy
  content was **movie promos** (Omotala Jalade / "Village Girl"); the current
  content is **data-bundle + airtime** offers only.
- Content lives in `config.ts` (`SCHEDULED_NOTIFICATIONS`). There is currently
  **one** entry, `daily-evening-deals`, so a promotion is sent **once a day**.
- The evening send is **local time, not UTC**: `dailyLocalWindow`
  (`{start:"19:00", end:"21:00"}`) is matched per country against
  `COUNTRY_UTC_OFFSETS` (every `SUPPORTED_COUNTRIES` entry; none observes DST),
  because the markets span UTC+0 to UTC+3 and one UTC instant cannot be evening
  everywhere. Any other schedule type (`time`/`days`/`monthly`/`holiday`/
  `event`) is UTC and offset-independent.
- `index.ts` groups recipients by `country_code` (customers inherit their
  store's country through `global_reseller_applications`) and evaluates the
  window per country.
- The cron runs **every 5 minutes**; `shouldSendNow()` matches the exact and the
  5-minute-rounded minute. `global_promotion_sends` is the dedupe ledger, keyed
  on `(scheduled_id, sent_for, country_code)` — the function claims a row before
  inserting, and the unique constraint makes a second run in the same window a
  no-op. `sent_for` is the recipient's **local** date.
- A **`dry_run=1&at=<iso>`** query mode reports what a real run would do without
  writing anything (`at` is ignored on real runs). Use it to verify timing
  changes without sending a push or touching the ledger.
- Scheduled by `cron.schedule` → `public.run_scheduled_edge(...)`, which
  presents the vault secret `scheduled_promotions_secret` as `x-sync-secret`;
  the function enforces it against `SCHEDULED_PROMOTIONS_SECRET`.

### Testing against the live project: back up **every** column you touch

When a live check needs to neutralise data (e.g. nulling push tokens so a probe
does not ring real phones), the backup must capture **every column the test
writes**, and restoring must be verified. A backup that captured a row's id and
flag but not its `fcm_token`/`push_token` meant those tokens were
**unrecoverable** — the project has no PITR (`pitr_enabled: false`) and no
physical backups (`backups: []`), so there is nothing to restore from. Prefer a
narrower test that never writes to shared tables, or snapshot the full rows
(`create table ... as select *`). This is a real incident, not a hypothetical:
it nulled six customers' tokens.


## Supabase

- Project ref `jjyyfaxcwanrmiipzkoj` (web app uses the same project).
- Edge functions in `supabase/functions/` (e.g. `global-store-fund-wallet`).
- **`supabase/schema.sql` must never contain a JWT.** This repo is public, and
  a schema-only dump still embeds function bodies and trigger definitions that
  carry bearer tokens. Five live JWTs (four `service_role`, one `anon`) sat in
  it until they were redacted in `3840935`. `scripts/supabase_dump.sh` now
  redacts every JWT before writing the file and fails if one survives — keep
  that step. The exposed `service_role` key still needs rotating; see the
  SECURITY section and the END-OF-PROJECT REMINDER in `HANDOVER.md`.
- The Management API `/secrets` endpoint returns **sha256 digests, not values**
  (every secret comes back as 64 hex chars, including ones like `SUPABASE_URL`
  whose real value is not hex). To check whether a secret exists, compare
  names; to check whether a sandbox secret *matches* the live one, compare
  `sha256(sandbox_value)` against the digest — never treat the digest as the
  value.

### Money RPCs must not be anon-callable

Every `public` function is reachable at `POST /rest/v1/rpc/<name>` with the
**public** anon key (it ships in the web bundle and the mobile app), and
Supabase's default privileges grant `EXECUTE` to `PUBLIC`/`anon`/`authenticated`.
A `SECURITY DEFINER` function therefore runs as its owner and **bypasses RLS**
for any caller. Four wallet-moving functions were exposed this way and were
locked down in `supabase/migrations/20261111_revoke_global_money_rpcs.sql`
(`REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO
service_role`):

`create_global_purchase_order`, `deduct_global_reseller_cost`,
`get_global_reseller_balance`, `process_global_purchase_deductions`.

They are called only by the service-role layer
(`_shared/purchaseOrchestrator.ts`, `src/actions/reseller/publishing/purchasePublishingPlan.ts`),
so `service_role` keeps `EXECUTE`. When you add a `SECURITY DEFINER` function
that touches money, revoke `anon`/`authenticated` in the same migration.

**Known remaining exposure (not yet fixed, tracked in `HANDOVER.md`):** the
legacy twins are still anon-callable `SECURITY DEFINER` —
`create_purchase_order`, `deduct_reseller_cost`, `get_reseller_balance`,
`process_purchase_deductions`, `update_wallet_after_sale`, plus
`award_app_first_deposit_bonus`. Treat them the same way once it is decided to
touch the legacy path.

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

## Responsive conventions (mobile ≤767px)

- The web app's mobile boundary is **767px** (`max-width: 767px`), matching the
  dashboard blocks; the storefront's own blocks use 480px and 768px. Prefer 767
  for new "phone" rules so they line up with the rest of the dashboard.
- A flex row that should reach both edges needs `flex: 1 1 auto` **and** a
  right-edge anchor (e.g. `margin-left: auto` on the trailing item). A
  `justify-content: space-between` row with no `flex-grow` shrinks to its
  content width and leaves the trailing control short of the card edge — this
  is what left the publishing Download button ~39px inside the card.
- When hiding a badge's text on mobile but keeping its icon, give the icon a
  `margin-right` so the glyph is not flush against the label. If the label is a
  translated string, pair it with `white-space: nowrap` on the badge **and**
  `flex-wrap: wrap` on the row: a long fr/ar phrase then moves the whole
  sibling (e.g. a button) to the next line instead of breaking mid-phrase or
  overflowing the card. `nowrap` on the row itself will overflow — do not use it.
- **Use `margin`, not `padding`, to space a lucide `<CheckCircle size={14}>`**
  (or any inline SVG sized by width/height attributes). `lucide-react` renders
  `width/height` attributes with no `box-sizing` override, so the SVG is
  `border-box`; a `padding-right` has to come out of the 14px box and squashes
  the glyph (measured: the path's rendered width dropped 11.7px → 3.3px) instead
  of opening a gap. This is a silent visual defect, not a compile error.
- The storefront install banner renders only for an **Android + mobile/tablet**
  user agent (`showInstallBanner`); to see it in headless Chromium, set an
  Android UA and `isMobile: true`/`hasTouch: true`, and wait ~3s for its timer.
- Hiding an element with `display: none` **removes it from the accessibility
  tree**. When a mobile rule swaps one element for another (e.g. the global plan
  card shows the plan name collapsed and the country flag expanded), put the
  swapped-out text on an `aria-label` of the interactive container so a screen
  reader still announces it. `GlobalPlansPanel` does this on the plan title.
- A styled-jsx `display: none` (or any class rule) **loses to an inline
  `style` prop**. `GlobalPlansPanel`'s edit pencil uses the shared
  `btnIconStyle`, which sets `display: "inline-flex"`, so the mobile media
  query that should hide the desktop pencil (`.global-plan-edit-desktop {
  display: none }`) was silently beaten and **both** pencils rendered on an
  expanded mobile card. Either move `display` out of the shared style object
  or add `!important` to the media-query rule; the panel does the latter for
  both `.global-plan-edit-inline` and `.global-plan-edit-desktop`. Verify with
  `getComputedStyle(btn).display`, not by counting buttons in the DOM — the
  hidden one is still in the DOM.
- The per-plan markup-type field must be the themed `ThemeSelect` (as the bulk
  card uses), **not** a native `<select>`: the OS paints the native popup and
  ignores the store theme. `ThemeSelect` renders its trigger inside the
  component, so styled-jsx needs `:global(.theme-select-trigger)` to size it
  (the edit row sets `height: 34px` to match the value input).

## Downloading test APKs (Termux)

- The person installs builds on an Android device via **Termux**. The canonical
  download directory is **`~/storage/downloads/edges-apks/`** — the handover
  does not name one, so use this and `mkdir -p` it first (run
  `termux-setup-storage` once to create the `~/storage/downloads` symlink).
- Releases live in **`Erudite885/tenant-distribution`** and are public, so no
  token is needed. Pattern:
  `curl -L --fail --retry 3 -C - -o ~/storage/downloads/edges-apks/<store>.apk "https://github.com/Erudite885/tenant-distribution/releases/download/<tag>/<store>.apk"`.
  `-L` is required (GitHub 302s to a signed CDN URL); `--fail` avoids writing an
  error page as the APK; `-C -` resumes a dropped mobile download.
- Each release carries **both** `<store>.apk` (sideload) and `<store>.aab`
  (Play upload). Record the APK **byte size and SHA-256** in `HANDOVER.md` so
  the person can verify the download with
  `ls -l … && sha256sum …`. Releases are cut from `main`, and the build's
  `head_sha` plus bundle markers (see below) prove the shipped bytes, not just
  git.


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


## Phase 2 pricing invariants (multi-country catalog / FX / pricing)

These are the rules the Phase 2 pricing layer is built on. Break one and the
storefront, the dashboard and the purchase flow can disagree on price — which
is the specific bug the layer exists to prevent.

- **One currency per store, from the store's country.** The mapping is
  `global_country_currencies` (pricing) mirrored by
  `_shared/countryCurrency.ts` (wallets). A country not in either list is
  **USD**, never NGN and never an error — that is what lets a reseller
  outside the 24 mapped countries sell every Zendit plan. `phase2.integration.test.ts`
  fails if the two lists drift.
- **The reseller wallet's currency is the store's country currency too.**
  `global_wallets.currency` is set at creation from
  `public.wallet_currency_for_country(country_code)` (the SQL twin of
  `_shared/countryCurrency.ts`), never hardcoded. It was USD for every store
  until 2026-11-06 (Blocker 13), which mislabelled a store-currency float as
  dollars. Deposits credit and the purchase RPCs debit the store currency, so
  the wallet, the shelf price and the charge are one currency; do not convert
  the deduction to USD or back.
- **`base_price` is a USD wholesale cost.** It is normalised at catalog sync.
  Nothing may compare a `base_price` to a store-currency price without
  converting first.
- **One pricing function.** `_shared/currency/pricing.ts` `computePrice`,
  reached through `storePrice.ts` `pricePlan`/`loadStoreContext`. The
  storefront, the orchestrator and the dashboard all call it. Do not add a
  second arithmetic path (the old `computeStorePrice` was removed for this
  reason).
- **`cost_price` passed to the purchase RPC is the PLATFORM price**
  (`platformLocalDecimal`) — the raw cost with the platform markup and FX
  buffer applied — not the USD `base_price` and not the raw cost. The RPC
  credits the reseller `selling_price - cost_price` and checks the reseller's
  balance against it, so passing the raw cost would hand the reseller the
  platform's markup as margin. The raw cost (`costLocalDecimal`) is what the
  provider call is paid; the two are different numbers and must not be swapped.
- **The markup is the source of truth; `selling_price` is only a cache.** The
  reseller's price is always Cost Price + Markup, recomputed through the
  pipeline. Every write path (`updatePlanConfig`, `togglePlan`,
  `bulkUpdatePlans`) derives the stored
  `global_reseller_plan_configs.selling_price` from cost + markup and passes
  `selling_price: null` to `pricePlan`. Do NOT let a stored `selling_price`
  override the markup: it goes stale the moment the platform markup or the FX
  rate changes, and then the card, the storefront and the charge disagree. The
  override is dropped once, at the single choke point every read and the
  purchase path resolve through (`resolveCatalogPlan` in
  `_shared/catalog/catalogResolution.ts`, which nulls the pin), and
  `priceRangeAmount.ts` nulls it too because a RANGE price depends on the
  amount. A display that re-derives `cost + markup` itself is the same defect
  in another place — show the pipeline's `customerPriceDecimal`
  (`selling_price_local`) instead.
- **A plan's cost basis is `cost_local`, for every provider.** It is the
  platform price the purchase path deducts and the markup applies to. Do not
  branch to `base_price` for non-Zendit providers (lizzysub/accragh): that is
  a raw wholesale cost, so it understates cost and overstates profit by the
  platform markup + FX buffer.
- **The FX buffer stays with the platform.** The floor and the platform price
  use the buffered rate (`usdToStoreRate * (1 + bufferFraction)`). Measuring
  them at the raw rate pays the buffer out as reseller margin.
- **The platform markup chain splits by CASE: home vs cross-border.** The
  switch is `home = (plan.currency ?? "USD") === ctx.currency` — the plan's
  cost currency equals the store's. `_shared/currency/markup.ts`
  `resolvePlatformMarkup`/`platformMarkupChain` take `home` and resolve
  differently:
  - **HOME** (a Lizzysub NGN plan in an NG store, an Accragh GHS plan in a GH
    store): `plan -> provider -> 0`. There is no FX, so nothing converts and
    the pipeline adds **no buffer** (`bufferFraction = 0` in
    `pricePlan`/`priceRangePlan`). The reseller's cost basis is the **raw
    cost**; the platform takes nothing unless it set a plan/provider row. The
    **country row and the 12% default do NOT apply at home.**
  - **CROSS-BORDER** (any mismatch, including **every Zendit plan**, because
    Zendit is USD): `country -> default` (12%), plus the FX buffer. Plan and
    provider rows are **home-only** and are ignored here, so a per-plan cut
    cannot leak into the FX path.
  Do not "simplify" this back to a single chain: applying the default 12% at
  home would re-introduce the double-charge the split exists to remove, and
  letting plan/provider rows into the cross-border path would let a
  provider-wide cut silently reprice every foreign plan.
- **Plan- and provider-scoped markup rows apply at home only** (decision of
  record, 2026-11-13, "option b"). They are read only when `home` is true.
- **A disabled markup row is terminal, not a fall-through.** A disabled row at
  a more specific level means "no platform markup here", so it must NOT fall
  back to a broader level. `loadStoreContextRows` therefore loads **every**
  row (not only `enabled = true`) — filtering `enabled` in SQL would make a
  disabled row vanish and fall through to the country/default row, which is
  the opposite of what the admin surface's "Disable" means.
- **The floor is 0** — sell-at-cost is allowed. There is no minimum platform
  markup.
- **A stale or missing rate is a hard failure**, not a guess — except USD,
  whose rate is 1 and needs no row.

### Running the Phase 2 tests

Unit (no database):

```
deno test --no-check --allow-env --allow-read supabase/functions/
```

Integration (real PostgreSQL, real migration). Skipped when `PHASE2_DB_URL`
is unset:

```
PHASE2_DB_URL=postgres://postgres@localhost:5432/phase2 \
  deno test --no-check --allow-env --allow-read --allow-net \
  supabase/functions/_shared/currency/phase2.integration.test.ts
```
### Testing the edge functions (read this before trusting a green suite)

The Phase 2 unit tests stub the Supabase client and hand-build every row.
That is why **six defects shipped with a 99/99 green suite** — the stubs were
written against imagined shapes, not the real ones. When you touch a function
that talks to PostgREST or a provider API, verify against the live shape:

- **PostgREST returns snake_case columns.** A stub that returns camelCase
  (`expiresAt`) hides a query that selects a non-existent column (`base,
  quote`) and a guard that reads `undefined`. Select exactly the column names
  that exist; read exactly what PostgREST returns.
- **`select("*")` masks a broken explicit select.** The store-catalog bug
  (a missing `zendit_fx` in the select list) was invisible to a probe that
  used `select("*")`. Test the query the function actually runs.
- **Verify a provider shape from a live response**, not from memory. Zendit
  RANGE offers use `cost.min`/`cost.max` (never `cost.fixed`), and the real
  USD→local rate is `cost.fx` — `send.fx` is always 1. Reading the wrong
  field produced 1:1 rates and silently rejected every RANGE offer.
- **A function that swallows errors into a 400/503 hides its own failure.**
  `global-store-catalog` returned "Catalog request failed" for a single bad
  plan; it now skips and logs the offending plan id.
- **Run the deployed function, not just the module.** `deno check` and the
  unit suite both passed while every store 503'd.

Operational invariants worth keeping:

- **CLI 3.0.0 defaults `verify_jwt` to `false`, and there is no positive
  flag to set it back** — `supabase functions deploy` only offers
  `--no-verify-jwt`. So `supabase functions deploy global-purchase-airtime
  global-purchase-data` silently flips both to `verify_jwt=false`, a
  regression: an unauthenticated `POST` then reaches the purchase function
  (it returned 200, should be 401). Restore it with the Management API after
  any such deploy, and verify the posture rather than assume it:
  ```bash
  curl -s -X PATCH -H "Authorization: Bearer $SUPABASE_OPEN_HANDS" \
    -H "Content-Type: application/json" \
    "https://api.supabase.com/v1/projects/<ref>/functions/<slug>" \
    -d '{"verify_jwt":true}'
  # then GET the function and check verify_jwt
  ```
  Expected posture: `global-purchase-airtime`/`-data` and
  `global-store-fund-wallet` = `true`; `global-network-lookup`,
  `global-store-catalog`, `global-catalog-sync`, `global-fx-refresh` =
  `false` (deliberately anon or secret-header-gated).

- The **Zendit fallback rate has a 6h TTL** and `catalog-sync` is the only
  writer of it while Korapay's key is invalid, so `catalog-sync` runs **every
  4h**, not daily — a daily run leaves stores unpriceable ~18h a day.
- The cron chain is `pg_cron` → `public.run_scheduled_edge(fn, vault_secret)`
  (`SECURITY DEFINER`, reads the secret from Vault) → the edge function, which
  checks the `x-sync-secret` header. Run the `cron.job.command` by hand to
  test the whole chain; the response lands in `net._http_response`.

- **`global_base_plans.country_code` is mixed-case.** The Zendit sync writes
  it lowercased (`rw`), the Accragh sync uppercased (`GH`). Any filter on it
  must be case-insensitive (`.ilike`) — an exact `.eq` on one case silently
  returns zero rows for the other provider's stores (this made the dashboard
  plans page show "no plans" while the storefront, which does not filter by
  country, listed them). The storefront comment in `global-store-catalog`
  already states this; the dashboard actions now follow it.

- **Cross-border selling is a READ-scoping issue, not a write one.** A plan
  is enabled/marked-up by its `global_base_plans.id`, which is unique across
  countries, so `togglePlan` / `updatePlanConfig` / `bulkUpdatePlans` already
  accept a plan from any country — do NOT re-scope those writes to the
  reseller's own `country_code`/`serviceProvider` (that guard was removed).
  What was missing was only the dashboard read: `getPlans` filters to the
  store's own country, so foreign plans never appeared. `getGlobalPlans`
  (all Zendit countries) + `GlobalPlansPanel` (the globe icon next to "Plan
  Management") supply the missing read, and `bulkUpdatePlans` gained a
  `global`/`provider`/`country` scope. The storefront (`getStoreCatalog`)
  and the purchase pipeline were already country-agnostic: enabling a UG
  plan for an RW store surfaces it there with no further change.

- **A storefront purchase must validate the number against the PLAN's
  country, not the store's.** `useStorePurchase.handlePurchase` now looks up
  `getCountryConfig(selectedPlan.country_code).phoneNumber`, otherwise an RW
  store could never accept a valid 9-digit UG number (and vice-versa). The
  destination country for a typed number comes from `lookupNetwork`
  (`global-network-lookup`), with the store's own country as the fallback
  when the lookup cannot run.

- **Plan `category` values are exactly `airtime` and `data`** (live catalog:
  917 airtime, 83 data across 66 countries). The storefront destination flow
  keys its two tabs on those strings; `price_type === "RANGE"` is what marks
  a top-up ("choose an amount") versus a fixed bundle tile.

- **A network name is NOT unique across countries.** `Airtel` sells in rw, ug,
  ke, tz, zm, mw…; `MTN` in rw, gh, ng… So the storefront's own network tabs
  must be scoped by the plan's `country_code`, not by network name — filtering
  `products` by network alone mixes countries. `getStoreCatalog` returns
  `networksByCountry` (a `Record<cc, string[]>`); `StoreContent` uses only the
  store's own country's group for the local tabs, and passes the whole catalog
  to `StoreDestinationFlow`, whose country tabs (`countryTabs`, derived from
  the enabled plans) each carry that country's own network tabs. A Rwandan
  store previously showed UAE (`Du`/`Etisalat`) and Zimbabwe (`Econet`) tabs
  because 11 AE and 6 ZW plans were enabled for it.


## Bulk plan updates (dashboard)

- The bulk upsert in `src/actions/reseller/plans/bulkUpdatePlans.ts` writes
  **one batched `upsert(..., { onConflict: "reseller_id,plan_id" })` per 500-row
  chunk**, not a per-plan `SELECT` + write. The `(reseller_id, plan_id)` unique
  constraint is what makes this safe; if it ever disappears, the upsert silently
  duplicates instead of updating.
- Bulk writes set **`enabled: true`** on both the insert and update paths — a
  plan a reseller bulk-priced is a plan they intend to sell.
- The "Value" field beside "Apply To" reflects the markup of the **selected
  scope network**, derived in `PlansClient` (`bulkScopeMarkup`), not a stored
  value. Do not reintroduce the old empty-on-focus input trick; a derived value
  is the correct resting state.
- Both plan views (local + global) stay mounted (`display:none` / `display:contents`),
  so the global catalog preloads once and toggling the globe never remounts or
  refetches the local list.
- `refreshPlans(network)` refreshes one network; `refreshPlans(null)` refreshes
  the whole catalog. A global-panel change calls the latter (`onChanged`).
- The "already applied" guard fires only when the **whole** scope already carries
  an **enabled** config at the chosen markup (`bulkScopeFullyApplied`), because a
  bulk apply also *enables* what it touches. A scope with a disabled or missing
  config is therefore a real apply, not a no-op — do not "test" the guard by
  clicking Apply on such a scope against a live store; it writes.
- Verifying a bulk/plan action against the **live** store is a **write**, not a
  read. Read the scope's current state first so the click is a true no-op (or use
  a scratch store). A verification click once enabled 5 live Airtel plans on
  rw/Simi; `global_reseller_plan_configs` keeps no history, so the prior
  `enabled` flags were unrecoverable.


## Platform-admin surface (`/…/admin/platform-plans`)

- The surface lives at `src/app/[countryCode]/admin/platform-plans/` and is
  **gated server-side** by `getPlatformAdmin()` (`src/lib/admin/requirePlatformAdmin.ts`),
  which reads `profiles.is_admin`; a non-admin gets `notFound()`. Every server
  action in `src/app/actions/platform-plans.ts` re-checks the gate — the page
  gate is not a substitute. **Do not** reuse the `[countryCode]/admin/layout`
  placeholder: it has **no** auth check.
- Writes go through the **service-role** client (`createAdminClient`), because
  `global_platform_markups` and `global_base_plans` have **RLS on with no
  policies** — only the service role reaches them. A user-scoped client returns
  empty for reads and silently fails for writes.
- It sets platform markup at **default / country / provider / plan** (upsert on
  the `(scope, scope_key)` unique index) and **enables/disables** a plan
  (`is_active`, which every catalog read already filters).
- **Adding a new plan is deliberately out of scope** (deferred item 9): the
  person said Lizzysub/Accragh plans are added by SQL. Do not add a "new plan"
  form here without picking the pin up.

## Adding a customer from the dashboard

`src/actions/reseller/customers/addCustomerWithLogin.ts` is the only correct
path for the dashboard "Add customer" modal. It must create the Supabase Auth
user as well as the customer row: `global_customers.auth_user_id` /
`auth_email` are what the storefront sign-in resolves against
(`getGlobalCustomerAuthEmail`), so a row written without them is a customer who
can never log in. The action creates the auth user with the same per-store
alias-email scheme as self-signup (`<local>+<storeSlug><n>@<domain>`), retrying
the suffix on a duplicate; it rolls the auth user back if the customer insert
fails, creates the wallet, and emails the generated credentials. Do not revert
the modal to a direct `global_customers` insert.

**Store ownership is never decided from `user_metadata.store_slug`.** That
comparison (`user.user_metadata?.store_slug === storeSlug`) is wrong: the
Add-customer action above stamps a customer's auth account with the **owner's**
`store_slug`, so those customers compare equal and get misclassified as the
owner — they then see the owner-only Dashboard in the storefront header/sidebar.
Self-signup sets no `store_slug`, so it never showed the bug. The only reliable
signal is a `global_reseller_applications` row whose `auth_user_id` is the
session user's own id; use the server action
`src/actions/reseller/store/checkStoreOwnership.ts` (returns a boolean — never
ship the owner's UUID to the client, because the dashboard RPC
`get_global_reseller_dashboard_context` is `SECURITY DEFINER`, anon/authenticated
callable, and trusts its `p_user_id` argument, while
`global_reseller_applications` has RLS disabled). The dashboard is also gated to
owners in `dashboard/layout.tsx` and `dashboard/page.tsx`.



## Pushing to GitHub from the sandbox

`git push` with the default `GITHUB_TOKEN` (a GitHub App installation token)
fails with **403 "Resource not accessible by integration"** even though
`GET /repos/...` reports `push: true` — the installation lacks write access to
this repo's git data, so both `git push` and the Git Data API (create blob /
tree / commit) are refused.

Use the classic PAT in `$P_TOKEN` instead (scope `repo`). Either set the remote
once:

```bash
git remote set-url origin "https://Phoenix-Boss:${P_TOKEN}@github.com/Edges-Enterprise/Edges_LandingPage.git"
```

or push explicitly per invocation:

```bash
GIT_TERMINAL_PROMPT=0 git push \
  "https://Phoenix-Boss:${P_TOKEN}@github.com/Edges-Enterprise/Edges_LandingPage.git" <branch>
```

The same applies to PR comments — `gh pr comment` fails with the default token;
post via the REST API with `$P_TOKEN`.

## Onboarding walkthrough (reseller dashboard)

The informational tour lives in `src/lib/onboarding/` (pure step/state logic),
`src/components/onboarding/` (overlay + anchor hook) and
`src/providers/OnboardingProvider.tsx` (context, navigation, mobile
coordination). Steps carry a `data-tour="<anchor>"` target and the dashboard
page they belong to; the provider pushes to that page and the overlay spotlights
the anchor.

Mobile gotchas (fixed in PR #38 — keep them in mind before "simplifying" this):

* The sidebar is a **drawer** below 768px, not always-visible. A `nav_*` step
  points at an item inside it, so the tour sets `tourWantsSidebar` in context
  and `DashboardShell` opens the drawer. `DashboardShell` must stay **inside**
  `OnboardingProvider` to read that flag. The drawer's own scrim is suppressed
  while the tour drives it (`showBackdrop={false}`) or the tour card cannot be
  tapped.
* The step card is a **bottom sheet** on phones (`vw < DESKTOP_MIN` in
  `TourOverlay.tsx`) so it never covers the drawer or the anchor.
* `useTourAnchor` takes a `rearm` argument. A CSS transform (the drawer
  sliding open) fires no scroll/resize, so the hook cannot notice on its own;
  the provider bumps `rearm` when the drawer opens.
* Anchors settle with a **snap-and-verify** loop, not a single
  `scrollIntoView`: Next restores scroll after navigation, and pages that
  lazily expand (the plan list) shift the anchor after a scroll already ran.

Test logic with `deno test src/lib/onboarding/` (install deno via
`npm install --prefix /tmp/deno-g deno`; the binary is
`/tmp/deno-g/node_modules/.bin/deno`). `next lint` is broken repo-wide
(ESLint config throws `Converting circular structure to JSON`) — use
`npx tsc --noEmit` for a fast gate.
