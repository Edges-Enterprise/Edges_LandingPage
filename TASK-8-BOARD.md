# Task 8 — Mobile app multi-country board

The single to-do board for completing **Task 8: move the mobile app
(`Erudite885/reseller-app`) off the legacy `reseller*` tables onto the
`global_*` data model so plans are country-scoped at the source and the app
supports every country the web does.**

This board is the execution checklist. `HANDOVER.md`'s Task 8 sections remain
the authoritative narrative; where they disagree, HANDOVER wins.

Last updated: 2026-10-27 (thirty-second check) - **storefront reseller
sign-in now stays on the storefront, the wallet and store dashboard pages no
longer show a horizontal scrollbar, the theme toggles from the Store > Theme
tab and the sidebar, and the reseller sign-in page server-renders again (8.s
through 8.v).** A reseller signing in from the storefront used to be pushed to
`/[countryCode]/dashboard` the instant they authenticated; the owner redirect
is gone, so sign-in always lands on the storefront and the owner reaches the
dashboard deliberately through the header/drawer entry. The wallet action row,
the transaction filter chips and the store tab strip were nowrap flex rows that
overflowed a phone (379px of content in a 360px viewport on the wallet page,
618px in 342px on the store page) — they now wrap. The Store > Theme tab wrote
`data-theme` on `<html>`, which no stylesheet reads (the rules match
`body.dashboard-theme[data-theme]`), so it did nothing; it now drives
`ThemeProvider` like the header toggle, and the sidebar footer gained a toggle
because the header's is hidden under 768px. The sign-in page touched
`window.location` while rendering, which aborted SSR ("window is not defined");
it now reads the country from `useParams`. Standing policy still applies: merge
`handover/supabase-dump` into `main` in the same session it is pushed, for both
repos. 8.j, 8.k, 8.l, 8.m, 8.n, 8.o, 8.p, 8.q, 8.r, 8.s, 8.t, 8.u and 8.v are
done; the only remaining work is person-side device testing.**

- **Resolution (8.s, 2026-10-27): a reseller signing in from the storefront
  stayed on the storefront.** `useStoreCustomerAuth.handleLogin` redirected an
  owner to `/[countryCode]/dashboard`; that line is removed, so sign-in lands
  on the storefront for owner and customer alike. The hook's `countryCode`
  argument and its only `router` use went with it.

- **Resolution (8.t, 2026-10-27): the wallet and store pages no longer scroll
  sideways on a phone.** Their action rows are nowrap flex rows of fixed-width
  children, so the row set a min-content floor wider than the viewport. Each
  row now wraps; the store tab strip also drops `overflowX: auto` so its four
  tabs wrap instead of scrolling.

- **Resolution (8.u, 2026-10-27): the theme is now togglable from the Store >
  Theme tab and the sidebar.** The Theme tab set `data-theme` on `<html>` but
  the CSS matches `body.dashboard-theme[data-theme]`, so it never applied; it
  now calls `ThemeProvider.setTheme`. The sidebar footer gained a toggle,
  because on phones the header's toggle is `.desktop-only` (hidden) and the
  sidebar is the only nav surface.

- **Resolution (8.v, 2026-10-27): the reseller sign-in page can server-render
  again.** It read `window.location` during render, aborting SSR with "window
  is not defined" and forcing the whole page to client-render; it now reads the
  country from `useParams`.

- **Resolution (8.r, 2026-10-26): the storefront drawer was order-blind, and
  the header could not reliably tell an owner from a customer.** The drawer
  rendered one fixed list for everyone, the owner test compared
  `user_metadata.store_name` against `storeData.application.store_name` (a
  display name the reseller can edit, while signup stores the slug), and the
  drawer element itself lacked the `mobile-drawer` class its own stylesheet
  targets. The drawer is now ordered per role, owner detection compares
  `store_slug` in both the mount and the auth-change paths, the element carries
  its class, and the owner redirect from the auth modal points at
  `/[countryCode]/dashboard` rather than the bare `/dashboard` legacy shell.

- **Resolution (8.q, 2026-10-26): the dashboard stat cards were one-per-row on
  a phone, and the storefront had no profile page.** Both stats grids were
  `grid-template-columns: repeat(auto-fit, minmax(Npx, 1fr))`. `auto-fit` drops
  to a single track when the container is narrower than the min, so on a phone
  the Plans trio (`minmax(150px,1fr)`) and the Customers quartet
  (`minmax(180px,1fr)`) each stacked vertically — while desktop showed them in
  one row. Fix: fixed-track grids behind a class (`plans-stats-grid`,
  `customers-stats-grid`) — Plans is always `repeat(3, minmax(0,1fr))`;
  Customers is `repeat(4, minmax(0,1fr))` at ≥1024px and `repeat(2, …)` below,
  which is the 2x2 the person asked for when four will not fit. Below 768px the
  gap tightens to `0.5rem`, card padding shrinks, and the label/value font
  sizes step down so three cards still read cleanly at 320px. Customer labels
  are now `Total` / `Active` / `New` (new keys added to the `en`/`fr`/`ar`
  customer message files) with `Inactive` unchanged. The storefront profile page
  is new: `/[countryCode]/[storeName]/profile` (server page + client), reachable
  from the header avatar (desktop) and a `Profile` row in the mobile drawer. It
  resolves the signed-in visitor through two new actions
  (`getCurrentStoreProfile` / `updateCurrentStoreProfile`, service-role reads
  past the owner-only `global_customers` RLS policy, identity from the session),
  renders owner and customer alike, and lets the visitor edit name/phone.
  `useStoreCustomerAuth` gained an `authReady` flag so the page can tell
  "signed out" from "not yet known" instead of spinning forever. **Verified, not
  assumed** in headless Chromium: Plans is one row of three at
  320/375/414/768/1024/1440px with no overflow and no clipped text; Customers is
  2x2 below 1024px and one row of four at 1024/1440px; the profile page is clean
  (no horizontal overflow) at 320–1440px in both themes, the edit/save round-trip
  persists, and an anonymous visitor sees the sign-in prompt rather than a
  spinner. `tsc --noEmit` = 0. Test users/rows deleted afterwards (verified
  clean).
- **Resolution (8.p, 2026-10-26): the storefront mobile-money field was white
  text on a white box.** `StoreFundWalletModal`'s `<input type="tel">` set its
  own `background: var(--bg-muted, #F9FAFB)`, but `--bg-muted` is **not defined
  anywhere in the codebase** — it only ever appears as `var(--bg-muted,
  <fallback>)` — so it always resolved to the light `#F9FAFB` fallback, even in
  the dark storefront theme, while the text stayed `var(--text)` (`#F5F0EB`).
  The **amount** field never had the bug: its `<input>` is `background:
  transparent` inside a wrapper `<div>`, and `store-theme.css` forces
  `body.storefront-theme div { background-color: var(--bg) !important }` — the
  selector list covers `div`/`section`/`main`/`header`/`footer`/`article`/`aside`
  but **not `input`**, so a bare themed input keeps whatever background it sets.
  Fix: give the mobile input the same flex wrapper the amount field uses, with
  `background: transparent` and `color: var(--text)` on the input. Verified in a
  real headless-Chromium session against a harness page rendering the actual
  component with `store-theme.css` loaded: before, the tel input computed
  `background: rgb(249,250,251)` with `color: rgb(245,240,235)` (contrast ~1.1 —
  invisible); after, it matches the amount input exactly (`sameColors` and
  `sameBg` both `true`), contrast 18.54 in dark and consistent in light.
- **Resolution (8.o, 2026-10-26): the dashboard was not responsive because the
  shell could not shrink.** The dashboard shell is a `display: flex` row; its
  content column, header bar and `<main>` are flex items, and a flex item
  defaults to `min-width: auto`, i.e. it refuses to shrink below its content's
  min-content width. `DashboardHeader`'s greeting is `white-space: nowrap`, so on
  a phone that one line set a **666px** floor on the entire dashboard — a
  horizontal scrollbar, and the theme toggle pushed off-screen — on *every*
  dashboard page. Reproduced with a headless Chromium session at 320/375/414px
  (`scrollWidth` 666 vs `clientWidth` 320/375/414; 768px → 906). Fix: `min-width:
  0` on `.dashboard-content`, the header bar and `<main>` in
  `dashboard/layout.tsx`, and on `<header>` in `DashboardHeader.tsx`. Verified
  after: `scrollWidth == clientWidth` at 320/375/414/768/1024px on the store
  page, on all seven dashboard routes (320/375/768px, 21/21), and on all four
  store tabs (320/375/768/1024px, 16/16); the greeting now ellipsises and the
  mobile menu button shows.
- **Resolution (8.n, 2026-10-26): the keys really were set — but only for
  `production`.** The earlier "len 0" reading was the Vercel API **redacting**
  `type: sensitive` values (`value: ""`, `decrypted: false`; `vercel env pull`
  writes `[SENSITIVE]`), not a blank secret. A temporary route deployed to each
  environment proved it: **production** has `KORAPAY_SECRET_KEY` (48 chars) and
  `FLUTTERWAVE_SECRET_KEY` (56 chars) and completes a real Korapay checkout
  (`success: true`), while a **preview** deployment of the same commit reported
  **both absent** (`{present: false}`) — they were `target: ["production"]`
  only. All six payment variables were extended to `["preview","production"]`
  with a target-only `PATCH` that preserves the stored value (verified on a
  disposable sensitive variable first). A fresh preview then saw both keys. The
  error message now names the environment (`… not configured (preview).`) so
  this is self-evident next time. Code commits `5cd2383`, `1942c2f`.
- **New finding + fix (8.l, 2026-10-26): the storefront fund path failed with
  "Customer record not found" for two independent reasons.** (1) **RLS:**
  `global_customers` grants SELECT **only to the store owner**, so a customer
  reading their **own** row through the session client got `200 []`; the three
  customer actions (`fundGlobalCustomerWallet`, `getCurrentCustomerWallet`,
  `getCurrentCustomerPinStatus`) all resolved that row that way, so every
  customer was `null`. They now read it through the service-role client after
  the session check — the same pattern the working NG path
  (`createGlobalCustomerVirtualAccount`) already used. (2) **Owner identity:**
  `useStoreCustomerAuth` compared `user_metadata.store_name` against the store
  **slug** ("Kwam Two" vs "kwam-two"), so an owner was classified as a customer
  and fell into the customer branch — where no `global_customers` row exists at
  all. It now compares `store_slug`. `StoreContent`'s fund and virtual-account
  handlers also branch on the role, mirroring the mobile
  `global-store-fund-wallet` edge function. Web commit `9b8a36b`.
- **New fix (8.m, 2026-10-26): the storefront wallet is now reachable on a
  phone.** The only wallet entry point was the balance pill inside
  `desktop-nav`, hidden below 768px, and the mobile drawer had no wallet row, so
  the wallet was unreachable on mobile. The drawer now shows a wallet link
  (owner) or the balance + fund action (customer).

- **New finding + fix (8.n, 2026-10-26): the fund step then said "authorization
  token is invalid".** That is Korapay's own wording for an **empty** bearer —
  reproduced live: an empty `Authorization: Bearer ` gives `401 "authorization
  token is invalid"`, a non-empty but wrong key gives `403 "invalid
  authorization key"`, and no header gives `"no authorization token found"`. The
  web fund path calls the gateway directly with `process.env.KORAPAY_SECRET_KEY`,
  which the module defaulted to `""` and sent unguarded. `korapay.ts` /
  `flutterwave.ts` now fail with "Payment provider is not configured. Please
  contact support." when the secret is blank. `KORAPAY_SECRET_KEY` /
  `FLUTTERWAVE_SECRET_KEY` are Vercel **`production`-only** targets, so a preview
  deployment or the sandbox dev server has no key — test the **production** URL.
  Production holds the secrets (both production webhooks reject an empty-key
  signature). Web commit `4f792bc`.

- **New person request (8.k, 2026-10-25): the fund-account/wallet checkout opens
  in a browser outside the app.** NG was fine (its gateway, xixapay, issues a
  virtual account and never redirects); every other country was handed to a
  Chrome Custom Tab / Safari sheet. The checkout now renders in an in-app
  WebView sheet and returns to the wallet without leaving the app (`8b18d03`),
  and the four test-store APKs were rebuilt from `main` (`814b0fd`) and
  published (8.k.ii).

- **Merge + rebuild (2026-10-25, person-requested):** mobile `main` →
  `1d8465b` (merge of `725fff9`), web `main` → `fdab108` (merge of `6d0fdba`).
  Both merges are content-complete: each merged `main` tree is byte-identical to
  the corresponding handover tip, so nothing was dropped. `main` had diverged on
  mobile only by the PR #11 merge commit `210c295`, whose tree equals the
  handover ancestor `0c0270e` — so the merge is lossless. The four builds
  (roseline/ng, kesh-data/ke, sweet-data/cm, kwam-two/gh) were then dispatched
  **on `main`**, not the branch, so the previously-flagged `main`-is-stale trap
  (8.i.ii) no longer applies.
- **New person request (8.j, 2026-10-24): show plans only after the phone number
  identifies the network.** The buy screen showed the network tabs before any
  number was typed, so a user tapped a tab, saw that network's plans, then had to
  retype the number for another network. Now the plans appear only after the first
  **6** digits, the tabs are removed, and the network is resolved from the prefix.
  Every country now has a prefix table (generated from Google's libphonenumber
  carrier data), not just Nigeria. Code done + verified, then corrected to
  full-form matching (`725fff9`); shipping it to a device is the remaining person
  step (8.j.ii).
- **Person correction to 8.j (2026-10-24, latest): matching must be on the FULL
  dialed form — do NOT strip the trunk `0`.** `0803…` resolves; bare `803…` must
  NOT. The first cut stripped a leading `0` to match the web convention, which is
  wrong here for two reasons: the providers expect the trunk form, and the
  countries with no trunk at all (Benin, Côte d'Ivoire, Congo, Gabon) have numbers
  that legitimately **start with `0`**, so stripping broke them. The tables are now
  keyed on the full dialed form (trunk read back from libphonenumber's metadata and
  prepended), detection never strips, and the same rule applies to every country
  with a trunk. Reworked and re-verified; mobile commit updated (see 8.j.i).
- **New defect from the same device test (8.i, person-filed 2026-10-24):
  reseller/owner login on mobile failed while customers succeeded.** The login
  screen's email resolver only searched `global_customers`, so an owner — whose
  Auth identity is the application's own `+reseller-<cc>-<slug>-<rand>` alias —
  resolved to nothing and got "Invalid login credentials". Fixed in the shared
  resolver (store-scoped, exact-match), deployed as edge function **v6**, and
  live-verified. 3 new tests fail on the old code and pass on the new; full
  suite 56/56.
- **Fresh APKs for all four test stores are built and published (8.i.ii,
  person-requested).** Four green runs from the fix commit `aeb8dea`; each
  release carries `.apk` + `.aab`. The fix was confirmed **inside each shipped
  bundle** (not just in git). Download commands are in the 8.i.ii row.

- **The four APKs were downloaded and tested on a device (person, 2026-10-23 →
  2026-10-24).** `roseline` (ng), `kesh-data` (ke), `sweet-data` (cm) and
  `kwam-two` (gh) — the four releases that carry both `.aab` + `.apk` — were
  installed and driven through the app.
- **Bug B / 8.e.iii / 8.g.ii — CLOSED (PROVEN LIVE, not inferred).** Three
  non-NG fund attempts from the app produced **live Korapay checkout URLs** and
  three `pending` rows in `global_customer_transactions`, in three different
  currencies — `KES` (kesh-data, `ke`), `XAF` (sweet-data, `cm`), `GHS`
  (kwam-two, `gh`), all `status: pending`, all with `metadata.source: "app"`:
  `KPY-MVM4ZDKG-Q7GGDP` (2026-10-24 08:28), `KPY-MVM4W6QR-1FMLQH` (08:25),
  `KPY-MVM4XIDX-1H1HII` (08:26). Two earlier attempts on 2026-10-23 (18:13, 18:31)
  are also present. **`charges/initialize` only returns success *after* the
  gateway accepts the request** — the function inserts the pending row on
  `result.success`, and a rejection (the old `403 invalid authorization key`)
  takes the `!result.success` branch and inserts **nothing**. So a
  `korapay`-gateway pending row *is* proof the `403` is gone. All three
  currencies are non-NG, which also confirms the currency fix (8.e.ii) on the
  live path. The same person's earlier web attempts at this bug
  (`8.e.iii`/`8.g.ii`) failed at the gateway and therefore left **no** row, so
  the empty-row state is the documented failure signature — and it is now gone.
- **8.f.ii (the gateway leg of the mobile fund flow) — PROVEN, with one caveat.**
  The app's own path was exercised end-to-end: signed-in customer → JWT identity →
  gateway chosen from the **store's** `country_code` (not the body) → Korapay
  `charges/initialize` → live `checkout_url`. The person reports the four apps
  "tested". **What is NOT yet evidenced is the post-checkout leg:** every row is
  still `pending` and the customer wallets are still `0.0`, i.e. no checkout was
  completed, so the Korapay **webhook → `handleSuccessfulCustomerDeposit` →
  `global_customer_wallets` credit** step is not proven. That is the one item
  left for a person, and it needs a real mobile-money payment.
- **Correction (2026-10-26): the web DOES have a customer-fund path, and it was
  broken.** This finding previously concluded the web had "no route to
  `fundGlobalCustomerWallet`". That was wrong: `StoreContent`'s
  `handleFundMobileMoney` calls that server action directly (8.f.i shipped the
  amount + mobile-money form for it), and a Next `"use server"` action is
  reachable from the client without its own REST route. What was actually wrong
  was inside the action — it resolved the customer row through the session client
  against an owner-only RLS policy, so it failed with "Customer record not
  found". That is fixed in `8.l.i`. So both surfaces (web storefront and mobile)
  can fund a customer wallet; the mobile edge function was simply the first one
  proven live.
- **Purchase (`8.a.iii.zr`) — still NOT exercised.** `global_orders` is empty,
  `global_customer_transactions` has only the five `deposit` rows above (no
  purchase rows), and every `global_customer_wallets.balance` is `0.0`. The
  signed-in **catalog browse** half of the device e2e was already confirmed
  earlier; the signed-in **purchase** half remains unproven, and it is gated on a
  funded wallet — which needs the webhook leg above.
- **8.h re-verified as still good:** the four `global_app_builds` rows are
  `completed` with **both** `apk_url` and `aab_url`, and each release still
  carries both artifacts. Production is healthy (`/`, `/ke/kesh-data`,
  `/gh/kwams-sub`, `/ng/roseline`, `/api/config/korapay` all 200).
- **No code changed this session** — the testing was person-side; the repos are
  still at web `4a7c9e0` / mobile `0c0270e` on `handover/supabase-dump`, and
  `main` at web `f7bbdb8` / mobile `210c295`.

Earlier (2026-10-22, sixteenth check) - **full-Task-8 push: web 8.e.ii
located + fixed, mobile follow-up fixed, both repos merged to `main` and
Production redeployed.**

- **8.e.ii (web half) - FOUND AND FIXED.** The board previously recorded the web
  half as "still to be located". It is not `Intl` on the web (the storefront uses
  `formatStorePrice`, which already prefixes `config.currencySymbol`); it is
  `CURRENCY_SYMBOLS` in `src/lib/currency/currency.ts` having drifted from
  `src/config/countries/*` (the source of truth). **`CDF` was missing entirely**,
  so `getCurrencySymbol("CDF")` returned the code itself and DR Congo rendered
  `CDF 500`; **`MAD` mapped to the Arabic `د.م.`** while the config (and mobile)
  use `DH`. Fixed both and added `currencySymbols.test.ts`, which parses both
  files and asserts they agree so they cannot drift again. The test fails on the
  old map (`cd: CDF has no symbol`; `ma: MAD maps to "د.م." but the config says
  "DH"`) and passes on the new one.
- **Mobile follow-up - FIXED.** `app/_layout.tsx`'s `setupCustomerForReseller`
  passed the session address (the derived alias) as both `email` and `authEmail`,
  so a row it had to *create* was legacy-shaped (`email == auth_email == alias`)
  instead of the web's shape. It now sends the typed address
  (`user_metadata.original_email`) as `email` and the session address as
  `authEmail`. Login worked either way already; this only aligns the row shape.
- **Both merged to `main` and deployed.** Web PR #33 → `main` = `0570bcc`
  (Vercel Production `READY` from `0570bcc`); mobile PR #8 → `main` = `501eff9`.
  Both dry runs were clean with zero conflicts and a tree byte-identical to the
  branch tip. Post-deploy health: `/`, `/ke/kesh-data`, `/gh/kwams-sub`, `/cd`,
  `/ma`, `/api/config/korapay` all 200.
- **Edge functions re-deployed** from this checkout (step a): both
  `global-store-customer-auth-email` and `global-store-fund-wallet` are now
  **version 5**, and bug A's aliased-row recovery was re-verified live on v5.
- **8.g.ii / 8.e.iii live gateway call remains the only open item** and is a
  person step (needs a signed-in customer of a non-NG store + a real mobile-money
  number; writes a pending row → DB HOLD).

Earlier (2026-10-22, fifteenth check) - **web merged to `main` (PR #32) and
deployed to Production; bug B's last blocker is cleared.**

- **Merged + deployed.** PR #32 merged `handover/supabase-dump` → `main`
  (`72faffe`); the dry run was clean with zero conflicts and a tree
  byte-identical to the branch tip. Vercel built Production from `72faffef`
  (`READY`, 2026-10-22T11:28Z), replacing the old `776f103`. Post-deploy health:
  `/` 200, `/ke/kesh-data` 200, `/api/config/korapay` 200, webhook 405 to GET.
  **Production now serves bug A's web half and bug C's sanitizer.**
- **Mobile needed no merge:** `reseller-app` `origin/main` (`c54e142`) already
  contains `733e5e5`; the two repos are level.
- **Bug B is now code-side unblocked.** `KORAPAY_SECRET_KEY` is present in the
  Vercel Production env (`type: sensitive`), the Production runtime provably sees
  a **non-empty** key (the Korapay webhook rejects an empty-key HMAC), and the
  sanitizer is deployed. What remains is only the **live gateway call**.

Earlier (2026-10-22, fourteenth check) - **step (a) DONE: both changed
edge functions deployed + live-verified; bug B's env half CONFIRMED.**

- **Deploy (step a) - DONE.** `global-store-customer-auth-email` and
  `global-store-fund-wallet` are both at **version 4**, deployed from a checkout
  of `handover/supabase-dump` with `--no-verify-jwt`; the deploy log proves the
  changed `_shared` files were bundled (`storeAuthEmail.ts`; `paymentGateway.ts`
  + `countryCurrency.ts`).
- **Live verification (step a) - PASSES.** On the deployed function, `kesh-data`
  (`ke`) legacy aliased rows resolve exactly (`tan289+1@maxxspace.com` →
  `tan289+1kesh-data1@maxxspace.com`; `tan289@maxxspace.com` →
  `tan289+kesh-data2@maxxspace.com`), casing normalises, and `roseline` (`ng`)
  resolves `exploit7492+100@gmail.com` → `exploit7492+100roseline7@gmail.com`;
  owner / unknown address / unknown `resellerId` all resolve `null`. Negatives
  correct (400 / 405). `global-store-fund-wallet` probes: 400 on empty body, 401
  on no/garbage token, 405 on GET.
- **Bug B (8.g.ii) env half - CONFIRMED, not assumed.** `KORAPAY_SECRET_KEY` is
  present in Vercel **Production** (`type: sensitive`, `updatedAt`
  2026-10-21T08:23:56Z, i.e. before the latest Production deploy at
  16:26:41Z). Its value is unreadable by design (`decrypt=true` →
  `decrypted:false`; `vercel env pull` writes `[SENSITIVE]`), so it was proven
  with a read-only oracle: the Production Korapay **webhook** HMACs with this
  same key, and an empty-key signature is rejected `401 Invalid signature` —
  so the runtime holds a **non-empty** key.
- **Still open on bug B (person):** the literal 403 needs a real gateway call
  from a signed-in customer of a non-NG store with a real mobile-money number.
  No test credentials exist, the only web path is a `"use server"` action (not
  HTTP-reachable), and it writes a pending DB row (HOLD).
- **New finding (material):** the web's `e4e36ae` + `5ee2f54` are **not on
  `origin/main`** (tip `776f103`), so Production does not yet serve either fix.
  Merge them before the live fund attempt, or the attempt still hits the
  unsanitized payer name. The deployed **edge** functions already carry both.

Earlier (2026-10-17, thirteenth check) - **defect batch: bug A + bug C
fixed in code** (web `e4e36ae` / `5ee2f54`, verified against live data).
Prior work: `8.d.xi` PASSES and `8.f.iii` shipped the `kesh-data` APK.

## Decisions already locked (do not re-litigate)

| Decision | Choice | Where |
|---|---|---|
| Scope | **Full (data model)** — not the cosmetic minimum | HANDOVER, Task 8 (continued) |
| Read layer | **Option B** — edge functions as the trusted read layer; `global_*` tables stay locked down (no new customer RLS policies) | HANDOVER, Task 8 (continued) |
| Country set | All countries the web supports | HANDOVER, Task 8 |
| Store/country context | Comes from the **build config** (`resellerId` + `countryCode` already baked in) — no DB read, no function | HANDOVER, Task 8 (continued) |

## How to read this board

- **Status:** ✅ done · 🔄 in progress · ⬜ todo · 🚫 blocked · ⏸️ hold (needs a decision)
- **Owner:** 🤖 agent (writes code) · 🧑 person (deploy / DB / device / decision)
- **Gate:** what must be true before the item can start.
- Work one leaf at a time; decompose any non-atomic leaf before executing.
- Anything touching the DB is **⏸️ HOLD until the person approves**.

## Board

| ID | Item | Owner | Status | Gate / depends on |
|---|---|---|---|---|
| **8.a.i** | **Store & country context** | | ✅ | — |
| 8.a.i.zi | Build config already carries `resellerId` + `countryCode` (no read needed) | 🤖 | ✅ | — |
| 8.a.i.zo | App exposes them: `ResellerConfig` + `resellerStore` | 🤖 | ✅ | — |
| **8.a.ii** | **Customer identity & money reads** | | ✅ | — |
| 8.a.ii.zi | Function `global-store-customer-context` (id, name, pin-set) | 🤖 | ✅ | identity pattern proven |
| 8.a.ii.zo | Function `global-store-wallet` (wallet + virtual accounts) | 🤖 | ✅ | 8.a.ii.zi |
| 8.a.ii.zp | Function `global-store-transactions` (history) | 🤖 | ✅ | 8.a.ii.zi |
| 8.a.ii.zq | App: `login`/`register`/`_layout` + hooks call those functions | 🤖 | ✅ | 8.a.ii.zi–zp |
| 8.a.ii.zr | Deploy the functions | 🧑 | ✅ | 10 functions deployed + live-verified (2026-10-17) |
| **8.a.iii** | **Catalog read path** | | 🔄 | — |
| 8.a.iii.zi | (superseded — Option B needs no migration) | — | ✅ | — |
| 8.a.iii.zo | Function `global-store-catalog` | 🤖🧑 | ✅ | deployed + live-verified |
| 8.a.iii.zp | App: `useDataPlans` → call the function | 🤖 | ✅ | pushed (mobile `d923185`) |
| 8.a.iii.zq | Scripted e2e: function response → hook filter/map | 🤖 | ✅ | ALL PASS (see card) |
| 8.a.iii.zr | Device e2e: browse signed-out + signed-in on a real build | 🧑 | 🔄 | **Catalog half DONE** — `roseline.apk` installed; 7 plans, MTN/AIRTEL/9MOBILE confirmed. **2026-10-23/24: all four APKs (`roseline`, `kesh-data`, `sweet-data`, `kwam-two`) downloaded and tested on a device.** Signed-in **catalog browse** works (the fund flow proves a signed-in customer session reaching a non-NG store). Signed-in **purchase** still NOT exercised: `global_orders` is empty, `global_customer_transactions` holds only the five `deposit` rows (no purchase rows), and every wallet balance is `0.0` — so a purchase has not run yet, and it is gated on a funded wallet (see `8.f.ii`) |
| **8.b** | **Country-aware presentation** | | ✅ | — |
| 8.b.i | Port country config into the app (currency, symbol, locale, phone digits, telecoms) | 🤖 | ✅ | pick the shape (see note) |
| 8.b.ii | De-hardcode currency/locale (16 sites) | 🤖 | ✅ | 8.b.i |
| 8.b.iii | Per-country network list, prefixes, colours, images (`helpers.ts`) | 🤖 | ✅ | 8.b.i |
| 8.b.iv | Per-country copy (e.g. help "Nigerian networks") | 🤖 | ✅ | 8.b.i |
| 8.b.v | Remove dead `allDataPlans` (~250 lines) | 🤖 | ✅ | — |
| 8.b.vi | Network auto-detect from country config, not NG prefixes | 🤖 | ✅ | 8.b.iii |
| **8.c** | **Purchases & money movement** | | ✅ | — |
| 8.c.i | Repoint `usePurchaseVTU` → `global-purchase-data` / `global-purchase-airtime` | 🤖 | ✅ | catalog done (8.a.iii) |
| 8.c.ii | Wallet / VA / transaction hooks read the new functions | 🤖 | ✅ | 8.a.ii.zq |
| 8.c.iii | Notifications on `global_*` | 🤖 | ✅ | migration `20261015` **applied live** (2026-10-17) |
| **8.d** | **Verification & rollout** | | 🔄 | — |
| 8.d.i | Mobile `tsc --noEmit` = 0 (gate after every leaf) | 🤖 | ✅ | 0 after every leaf (2026-10-15) |
| 8.d.ii | APK build for `ng` + `gh` + one more (e.g. `ke`/`zm`) | 🧑 | ✅ | **Roseline DONE** — run `39089167745` green; `roseline.apk` 110 MB at tag `ng-roseline-330e68c4-20261018_022744`; **`ke` DONE** — `kesh-data` APK (8.f.iii). **`gh` DONE 2026-10-22** — `kwam-two` built green (run 37) with the AAB; turnkey inputs (gathered 2026-10-22, all 9 `gh` stores active; `global_reseller_app_configs` links by `application_id`, no `reseller_id` column) (all 9 `gh` stores active; `global_reseller_app_configs` links by `application_id`, no `reseller_id` column): `kwams-sub` cfg `6d1e070f-36e4-4ef1-bd1c-735470d40619` / reseller `1daf1762-815a-4f4a-9757-019e437a2419`; `kwam-one` cfg `959a4729-7eac-4954-b2a0-0a7dd26414ee` / reseller `45358dd5-9c28-4ba1-80df-abbc61c0f223`; `kwam-two` cfg `aaaf1cff-aaf5-4e63-9aa7-b63fb322cf55` / reseller `2731f8e9-7ce7-4f52-8abf-1793813dac92`; `kwam-three` cfg `2dbb9b89-b889-497e-aa1f-5953d2d56c4e` / reseller `109b3daf-42a5-4239-987e-79f1939315c9`; `kwam-four` cfg `953a8cb1-73d5-465a-83bf-c76c26f7e78e` / reseller `54dc982c-0ce0-4283-9fef-afc6f3c1b09d`; `kwam-five` cfg `f304000e-7ea6-4f0a-b7fe-c469b20049cb` / reseller `ecc814f6-d384-431e-9c6b-04663f7c4f46`; `marcel-data` cfg `49fbbd5e-a4a6-473f-bbb5-28464a8068ae` / reseller `398c1ef6-791e-4373-a2e6-b22788a06e2b`; `linda-plas` cfg `3cd57bbf-1206-4f45-900b-eb595041396f` / reseller `6374c61d-1133-4336-9eab-d03fea9cfe4d`; `data-test-one` cfg `4b12117c-bde8-42d4-9a9d-762e496d1f39` / reseller `396b64b7-c302-4785-a6ff-8e25fb33bdde`. Dispatch writes DB rows → person step (not run) |
| 8.d.iii | Signed-out vs signed-in storefront parity | 🧑 | ⬜ | 8.d.ii |
| 8.d.iv | Push mobile + web | 🧑 | ✅ | web `9be9e80` (merged to `main`) / mobile `778e937` (2026-10-17) |
| 8.d.v | Deploy the web to production | 🧑 | ✅ | **DONE** — PR #25 → `main` `50e2b7c`; Production deploy `7145175251` success |
| 8.d.vi | Fix config route select (`apk_url, aab_url` not on `global_reseller_app_configs`) | 🤖 | ✅ | **DONE** — `e9e7a6b`, merged to `main` (PR #26 `f842969`); prod endpoint 200 |
| 8.d.vii | **Merge web branch to `main`** | 🧑 | ✅ | **DONE** — PR #26 → `f842969`; Production deploy `7145723808` |
| 8.d.viii | **Merge mobile branch to `main`** (clean fast-forward, no conflicts) | 🧑 | ✅ | **DONE** — PR #6 → `64303e1` — but it merged `778e937`, so `main` still lacks the Blocker 5 fix `462fa82`; re-merge needed |
| 8.d.ix | **Deploy the build-webhook `config_id` fix + re-dispatch** (Blocker 6) | 🧑+🤖 | ✅ | **DONE** — web `5cf4d2b` live in Production (probe: non-UUID `buildId` → 400, old code returned 500); run `39095674274` callback returned `{"success":true}` and the build row is `completed` |
| 8.d.x | **Merge PR #29 (Blockers 7 + 8 + email)** | 🧑 | ✅ | **DONE** — PR [#29](https://github.com/Edges-Enterprise/Edges_LandingPage/pull/29) merged as `bcf4db3`; Production deploy `7195314279` **success**; all three fixes verified in `main` |
| 8.d.xi | **Confirm the fixes live**: re-submit from the web, check `head_branch: main` + email arrives | 🧑 | ✅ | **PASSES** — web submission dispatched from `main` and the build-complete email arrived (2026-10-20) |
| **8.e** | **Defect batch (person-filed 2026-10-20)** | | ✅ | — |
| 8.e.i | Build email must come from the store, not "Edges Network" | 🤖 | ✅ | **DONE** — From display name = store name, Reply-To = owner’s address (`sendAdminEmail` gained `fromName`/`replyTo`); web route updated. NOTE: the sending *address/domain* must stay the verified mail account — a per-store From address needs a per-store verified domain + credentials, which do not exist in the schema |
| 8.e.ii | Currency shows country code + symbol for non-NG; should be symbol only (web + mobile) | 🤖 | ✅ | **BOTH HALVES DONE.** **MOBILE** (`81654a7`) — reproduced exactly: `Intl.NumberFormat(style:"currency")` on a small-ICU runtime prints `GH₵1,500.00` for GHS (and `KSh`/`USh`/`RF`), while NGN renders as a lone `₦`. `index.tsx` formatCurrency now formats the number with the country locale and prefixes `country.currencySymbol`, matching the web storefront. **WEB** (`18e7644`, on `main` via PR #33 → `0570bcc`) — the web half was previously "still to be located"; it is not `Intl` (the storefront uses `formatStorePrice`, which already prefixes `config.currencySymbol`), it is `CURRENCY_SYMBOLS` in `src/lib/currency/currency.ts` drifting from `src/config/countries/*`: **`CDF` was missing entirely** (so `getCurrencySymbol("CDF")` fell back to the code and DR Congo rendered `CDF 500`) and **`MAD` mapped to the Arabic `د.م.`** while the config (and mobile) use `DH`. Fixed both and added `currencySymbols.test.ts`, which parses both files and asserts they agree. The test fails on the old map and passes on the new one; 51/51 Deno tests pass; web `tsc` = 0 |
| 8.e.iii | Web fund-wallet for non-NG countries → "authorization token invalid" | 🤖🧑 | ✅ | **CLOSED 2026-10-24 — proven on the live gateway.** Root cause: Korapay returns literally `invalid authorization key` (reproduced live: HTTP 403 `{"error":"not_authorized","message":"invalid authorization key"}`). Non-NG fund uses `korapay.ts`; NG uses `xixapay.ts`. **`KORAPAY_SECRET_KEY` is verified present in the Vercel Production env** (`type: sensitive`, `updatedAt 2026-10-21T08:23:56Z`), and a read-only oracle confirms the runtime holds a **non-empty** key (the Production Korapay webhook rejects an empty-key HMAC with `401 Invalid signature`). **Former blocker cleared:** PR #32 merged `e4e36ae` + `5ee2f54` to `main` (`72faffe`) and Vercel deployed Production from `72faffef` (`READY`), so the sanitizer is live. **Live proof (2026-10-23/24, from the app on a device):** three non-NG fund attempts produced live Korapay checkout URLs + `pending` rows — `KES`/`ke`, `XAF`/`cm`, `GHS`/`gh` — and the `403` produces no row, so its absence from the data is the proof the error is gone. Note the reproduction vehicle was the **mobile** app (its `global-store-fund-wallet` edge function is the only HTTP-reachable customer-fund path; the web's route is owner-only) |
| 8.e.iv | Mobile wallet not dynamic per country; should mirror web (virtual account vs mobile money) | 🤖 | ✅ | **DONE** (`51897a2`) — the branch is now in place: `countryConfig` gained `paymentGateway { provider, methods }` for all 24 countries (copied from the web source of truth, verified byte-for-byte against `src/config/countries/*.ts`), and both `wallet.tsx` and the home wallet card branch on `provider === "xixapay"` — Nigeria keeps the one-click virtual account; every other country shows an “Add Money” contact-support fallback instead of a virtual-account form its gateway cannot issue. **Mobile-money funding is deliberately NOT built:** the web’s *customer* modal (`StoreFundWalletModal`) shows the identical “coming soon — contact the store owner” fallback for non-xixapay stores, and the only mobile-money path that exists is the reseller-dashboard fund (`FundWalletModal` → `/api/reseller/[countryCode]/wallet/fund`), which is a different flow. So mobile now *mirrors* the web storefront rather than diverging from it. Mobile `tsc` = 0. Remaining: a fresh APK to ship it. **SUPERSEDED IN PART by 8.f** — the person has since asked for customer wallet funding on both surfaces, so the "contact the store owner" fallback is being replaced by a real mobile-money flow (8.f.i web, 8.f.ii mobile). The mirror is still accurate for what this commit shipped |
| 8.e.v | Mobile "create virtual account" → "store not found" | 🤖🧑 | ✅ | **DONE + DEPLOYED + LIVE-VERIFIED** (`e1c623c` web + `d660884` mobile; deployed 2026-10-20). Reproduced live: legacy `create-mobile-customer-virtual-account` returns 404 `{"error":"Store not found"}` for **every** store (roseline, toms-sub, kwams-sub, marcel-data …), by slug *and* by store_name — it is dead under the global_* model, not a slug-vs-name bug. Added `global-create-customer-virtual-account` (mirrors the web action; store + customer from the JWT, customer-only, same waitlist/BVN + Xixapay + insert path) and repointed `useVirtualAccounts.ts` at it via `callStoreFunction`. Deployed with `--no-verify-jwt`; live probes confirm the deployed function (no auth → 401 "Missing authorization token"; anon key → 401 "Invalid authorization token"; missing resellerId → 400) — the legacy function never returned these. **Remaining:** rebuild the app so the repointed hook ships (the endpoint is live now, but the fix reaches a device only in a fresh APK) |
| 8.e.vi | Mobile login "invalid login credentials" for a user registered on the web | 🤖 | ✅ | **DONE + LIVE-VERIFIED** — the cause was exactly the guess: when the `auth_email` lookup missed, `login.tsx` reconstructed a derived email with its own **deterministic** suffix, while web signup writes a **random** one (`Math.floor(Math.random()*9)+1`), so the guess was wrong and surfaced as "invalid credentials". `login.tsx` now mirrors the web storefront: resolve the typed address through `global-store-customer-auth-email`, fall back to the typed address when there is no mapping (owners; pre-suffix accounts), and **never reconstruct**. Also switched the lookup from a hand-built `fetch` (which read `EXPO_PUBLIC_BIMBO_SUPABASE_ANON_KEY`, an env var that is *not* set — the client uses `..._PUBLISHABLE_KEY`, so the request went out with no `Authorization` and could 401) to the configured Supabase client, and now send the trimmed, lowercased address (the web lookup is case-sensitive and signup never lowercases). **Verified live end-to-end** on a temporary account: typed `edgesvi@example.com` → lookup returned the derived `edgesvi+probe1@example.com` → `token?grant_type=password` with the typed password returned an `access_token`. Probe rows deleted. Mobile `tsc` = 0 |
| 8.e.vii | Mobile: non-NG plans, phone numbers, networks not recognized | 🤖 | ✅ | **DONE** (`e974a36`) — prefix tables are now keyed by country (`NETWORK_PREFIXES_BY_COUNTRY`); only NG has one, because **no prefix data exists anywhere** for the other countries (checked web `src/config/countries` + mobile `countryConfig` + the plan tables), so inventing one was not an option. `detectNetwork()` returns null where there is no table; the phone input is capped at `country.phoneNumber.maxDigits` and `handlePurchase` rejects anything shorter than `minDigits`; and where there is no table the buy screen shows a **network picker built from the store’s own `networks`** (already returned by `global-store-catalog`) instead of an auto-detect that never fires. Mobile `tsc` = 0 |
| **8.f** | **Customer wallet funding (person request 2026-10-17)** — reseller customers must be able to fund their own wallet on web and mobile, the way a reseller funds theirs from the dashboard | | ✅ | — |
| 8.f.i | Web: storefront customer can fund by mobile money (korapay/flutterwave), not just xixapay VA | 🤖 | ✅ | **DONE** — `StoreFundWalletModal` non-xixapay branch no longer shows the "coming soon — contact the store owner" fallback; it now renders an amount + mobile-money form (mobile-number field only when the gateway needs it: flutterwave, or korapay direct-API) and calls the previously-dead `fundGlobalCustomerWallet` action (1.c.iv). `returnPath` was threaded action → gateway → `/api/payment/callback` so the customer lands back on the **store**, not the reseller dashboard (open-redirect-guarded: only a same-origin `/…` path is honoured). Completion already existed: both the korapay and flutterwave webhooks fall back to `global_customer_transactions` → `handleSuccessfulCustomerDeposit` (which credits `global_customer_wallets`). Web `tsc` = 0 |
| 8.f.ii | Mobile: customer/reseller wallet funding for non-NG countries | 🤖🧑 | ✅ | **CODE DONE** (web `3bc4054` + mobile `733e5e5`; deploy is a person step). Added `global-store-fund-wallet` (web) — the Deno port of **both** web actions (`fundWallet.ts` for the owner, `fundGlobalCustomerWallet.ts` for a customer), because the app cannot invoke a Next `"use server"` action. Identity comes from the JWT via `resolveStoreIdentity`, so a caller can only fund their own wallet; the gateway and currency come from the **store's** `country_code` in the DB, not the request body. It inserts the PENDING row (`global_transactions` for an owner, `global_customer_transactions` for a customer — the split the webhooks already route on) and returns the checkout URL. New `_shared/paymentGateway.ts` mirrors the web's korapay/flutterwave initiate step (Deno cannot import the React-flavoured `src/lib/payments/*`); its country→provider map is asserted **byte-identical** to `src/config/countries/*.ts` (24/24) by `paymentGateway.test.ts` (5 tests, all pass; the tests caught a module-load `Deno.env` bug). `returnPath` is derived server-side as `/{country}/{store_slug}`, so the payer lands on the store, not the dashboard, and no client-supplied value reaches the redirect. Mobile: new `hooks/useFundWallet.ts` invokes the function and opens the checkout with `WebBrowser.openBrowserAsync`, refreshing wallet/transactions on return; `wallet.tsx`'s "coming soon" card (8.e.iv) is replaced by a real amount + mobile-money form (number field only for flutterwave), and the home card now routes to the wallet screen instead of saying "coming soon". `deno check` clean; mobile `tsc` = 0. **DEPLOYED + VERIFIED LIVE 2026-10-17** — `supabase functions deploy global-store-fund-wallet --no-verify-jwt` run by the operator, and `KORAPAY_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` / `APP_URL` are all present in the Supabase secret store (confirmed via `supabase secrets list`, digests only). Probed the live endpoint: `POST` with no body → `400 {"error":"Amount must be greater than 0"}` (function executing); with a valid amount but no token → `401 {"error":"Missing authorization token"}`; with a garbage token → `401 {"error":"Invalid authorization token"}`. So `--no-verify-jwt` is correct and the function does its own JWT check, exactly as designed. **GATEWAY LEG PROVEN LIVE 2026-10-24 (from the app, on a device):** three non-NG fund attempts returned **live Korapay checkout URLs** and wrote `pending` rows to `global_customer_transactions` — `KES` (kesh-data/ke), `XAF` (sweet-data/cm), `GHS` (kwam-two/gh), all `metadata.source: "app"`. `charges/initialize` succeeds only *after* the gateway accepts, so the row's existence proves the gateway call worked. **Still unproven: the post-checkout leg** — all rows remain `pending` and every wallet is `0.0`, so the Korapay **webhook → `handleSuccessfulCustomerDeposit` → wallet credit** step has not run. That is the one remaining person step (needs a completed real mobile-money payment). Related finding: the web has **no HTTP-reachable customer-fund path** (its only fund route is owner-only), so this flow is currently mobile-only |
| 8.f.iii | Ship a fresh APK carrying 8.e.iv–vii + 8.f.ii | 🧑 | ✅ | **DONE 2026-10-17 — `kesh-data` APK built and released.** Dispatched `build-global-reseller-apk.yml` on mobile `main`; run [39617638115](https://github.com/Erudite885/reseller-app/actions/runs/39617638115) succeeded end-to-end, and its `head_sha` is `c54e142` — i.e. it built exactly the merged commit, so the APK carries 8.e.iv–vii + 8.f.ii. Release: [`ke-kesh-data-96408a53-20261021_144915`](https://github.com/Erudite885/tenant-distribution/releases/download/ke-kesh-data-96408a53-20261021_144915/kesh-data.apk) (~110 MB) in `Erudite885/tenant-distribution`; backend webhook closed the loop (`global_app_builds` row `b29d4ff2` → `build_status: completed` + `apk_url`). **The old "config route 404" blocker is now genuinely disproven, not assumed:** step 7 `Generate global reseller assets` completed success, and `/api/reseller/ke/config/96408a53…` returns 200 with every field the script needs (`storeName`, `appName`, `theme.primary`, all 5 asset URLs, `config.androidPackageName`). Inputs used: `reseller_id=43d24f2f-80df-4f75-bd9e-5960982db222`, `config_id=96408a53-9c5a-474d-97f7-8777cfbcd2cd`, `store_name=kesh-data`, `country_code=ke`. **`kesh-data` is a Kenya (non-NG) store**, so this is also the right vehicle for the 8.f.ii end-to-end test: install it, sign in as a Kesh Data customer, and fund by mobile money |
| **8.g** | **Defect batch (person-filed, from the merged mobile branch)** — three bugs surfaced by the APK build | | ✅ | — |
| 8.g.i | Bug A: login "invalid login credentials" for a legacy customer row | 🤖 | ✅ | **DONE + DEPLOYED + LIVE-VERIFIED** (web `e4e36ae`; edge fn **v5**, 2026-10-22). `global_customers` has two row shapes: the current one (`email` = typed address, `auth_email` = derived alias) and a legacy one where `email` **is** the alias (`email == auth_email`). The lookup matched `email` to the typed address only, so legacy rows resolved to nothing. Both login lookups now fall back to recovering the alias from Supabase Auth's `user_metadata.original_email`, scoped to the store slug and confirmed against the customer row. Extracted to `_shared/storeAuthEmail.ts` (6 new Deno tests, `deno check` clean). **Verified live against the deployed function** (publishable key, no JWT): `tan289+1@maxxspace.com` → `tan289+1kesh-data1@maxxspace.com` and `tan289@maxxspace.com` → `tan289+kesh-data2@maxxspace.com` (kesh-data/ke), `TAN289+1@MAXXSPACE.COM` normalises to the same value, `exploit7492+100@gmail.com` → `exploit7492+100roseline7@gmail.com` (roseline/ng); owner, unknown address and unknown `resellerId` all resolve `null`; missing fields → 400, GET → 405. Web `tsc` = 0. Follow-up **DONE** (`31b3c6c`, on mobile `main` via PR #8 → `501eff9`): `setupCustomerForReseller` no longer passes the alias as `email` — it sends `user_metadata.original_email` as `email` and the session address as `authEmail`, so a row it creates is web-shaped rather than legacy-shaped |
| 8.g.ii | Bug B: web fund-wallet non-NG → "invalid authorization key" | 🧑 | ✅ | **CLOSED 2026-10-24 — PROVEN GONE on the live gateway, from the app.** `KORAPAY_SECRET_KEY` **is present in Vercel Production** — `GET /v10/projects/prj_jxynbeusJCMYJKscqALL3iVpZKyc/env` → key `KORAPAY_SECRET_KEY`, `target:["production"]`, `type:sensitive`, `updatedAt 2026-10-21T08:23:56Z`. The value is unreadable by design (`decrypt=true` → `decrypted:false`; `vercel env pull` writes `[SENSITIVE]`), so it was proven with a read-only oracle: the Production Korapay **webhook** HMACs with this same key, and an empty-key signature is rejected `401 Invalid signature` — therefore the runtime holds a **non-empty** key. **Former blocker cleared:** PR #32 merged `e4e36ae` + `5ee2f54` to `main` (`72faffe`) and Vercel deployed Production from `72faffef` (`READY`), so the sanitizer is live. **The live proof:** the four built apps were tested on a device (2026-10-23/24) and three non-NG fund attempts returned **live Korapay checkout URLs** with `pending` rows in `global_customer_transactions` — `KES`/`ke`, `XAF`/`cm`, `GHS`/`gh`. Since `charges/initialize` only returns success *after* the gateway accepts (a `403` takes the `!result.success` branch and writes **no** row), those rows prove the `403 invalid authorization key` is gone. The earlier web attempts at this bug failed at the gateway and left no rows — the failure signature is now absent |
| 8.g.iii | Bug C: funding "One or more fields are invalid" | 🤖 | ✅ | **DONE + DEPLOYED + MERGED** (web `5ee2f54`; edge fn **v5**, 2026-10-22; on `main` via PR #32 → `72faffe`). Reproduced live: Korapay `charges/initialize` 400s with that message when `customer.name` contains `+ ( ) % < > =` or is empty; `-`, `_`, `.`, `,`, `'`, spaces and normal names pass. A payer name is derived from the email local part at signup, so alias-shaped names reached the gateway verbatim. `sanitizeCustomerName` replaces the rejected set with spaces and falls back to `"Customer"`, applied at both gateway boundaries (`_shared/paymentGateway.ts` and `korapay.ts`); Flutterwave untouched (only Korapay rejects these). 5 new Deno tests, `deno check` clean, web `tsc` = 0. **Both halves now live:** the app-side via function v5, and the web-side via Production deploy `72faffef` (`READY`) |

| **8.h** | **Person request (2026-10-22): remove the pawns module; build an AAB beside the APK** | | ✅ | — |
| 8.h.i | Remove the pawns module + every surface that fed it | 🤖 | ✅ | **DONE** (mobile `c1c16be`). Deleted `module/pawns/` (native Kotlin module `PawnsModule.kt` / `PawnsBootReceiver.kt`, the `pawns-ndk-1.8.1.aar` + `internet-sharing-1.8.1.aar` binaries, manifest, drawables/strings, gradle state, `index.ts`, `expo-module.config.json`) and `components/EarningsConsentGate.tsx`. Stripped the consent-gate wiring from `app/_layout.tsx` (gate render, `showConsentGate`/`isCheckingConsent`/`isNavigatingToSettings`/`previousPathname` state, `checkConsentStatus` effect, three consent handlers, the early-return, and the now-unused `usePathname`/`useCallback`/`useState` imports) and the Bandwidth Sharing section from `app/(app)/(protected)/security.tsx` (`BandwidthSharingSection`, the `"bandwidth"` union member, `previewMode`, and the `@/module/pawns`/`AsyncStorage`/`Switch`/`ActivityIndicator`/`useRouter` imports). Dropped the `pawns-sdk` dependency, regenerated `package-lock.json`, removed the stale `node_modules/pawns-sdk` symlink, and removed the `Honeygain - bandwidth sharing` line from both legal-text blocks in `constants/legalTextGenerator.ts`. Repo-wide grep for `pawn` now matches only unrelated npm packages (`@expo/spawn-async`, `cross-spawn`) |
| 8.h.ii | Build an AAB alongside the APK in the pipeline | 🤖 | ✅ | **DONE** (mobile `c1c16be` + web `e63623a`). New `production-aab` profile in `eas.json` (`android.buildType: "app-bundle"` → `:app:bundleRelease`, the store-submission default, per Expo's `eas.json` schema). Both workflows now run a second `eas build --profile production-aab --local --output=./<store>.aab` step after the APK step with identical env, attach **both** artifacts to the one GitHub release, and post `aabUrl` to the build webhook; job timeout 45 → 90 min. Web: the `BuildStatus.tsx` AAB link (previously written but commented out) is now live, `BuildHistory.tsx` shows an `AAB` link beside `APK`, and the global webhook already persists `aab_url`. The **legacy** `api/build-webhook/route.ts` is left untouched (my earlier `aabUrl` log-only branch was reverted): the person has confirmed the legacy `reseller_app_configs` table is not used, and the evidence agrees — its last write is **2026-10-07** (48 rows, all pre-migration) while `global_app_builds` is current (2026-10-21), and the legacy workflow last ran 2026-10-07 (last success 2026-08-04) against the global one's 2026-10-21. So there is no schema decision to make: the AAB is carried on the global path only |
| 8.h.iii | Verify the removal + the new build config | 🤖 | ✅ | Mobile `tsc --noEmit` = 0 (sanity-checked: injecting a deliberate type error made tsc report it, then reverted); web `tsc --noEmit` = 0; both workflow YAMLs re-parsed and each lists 15 steps with the AAB step between the APK and the release; `expo lint` 55 problems (23 errors) → 42 (12 errors), no new finding in any touched file |
| 8.h.iv | **Prove the AAB actually builds** (dispatch a real run) | 🤖 | ✅ | **DONE — PROVEN LIVE 2026-10-22, four builds, all green.** Person-approved dispatch of **roseline** (`ng`), **kesh-data** (`ke`), **sweet-data** (`cm`), **kwam-two** (`gh`) from `main` `210c295` (runs 34–37 in `Erudite885/reseller-app`; all four `completed success`, every step green incl. `Build Android AAB`). Each release carries **both** artifacts: `roseline.aab` 41.5 MB + `.apk` 79.0 MB (`ng-roseline-330e68c4-20261022_145011`), `kesh-data.aab` 41.5 + 79.0 (`ke-kesh-data-96408a53-20261022_144509`), `sweet-data.aab` 41.5 + 79.0 (`cm-sweet-data-b58d3aa6-20261022_145050`), `kwam-two.aab` 41.6 + 79.1 (`gh-kwam-two-aaaf1cff-20261022_145445`). The `global_app_builds` row for each config updated in place with **both** `apk_url` and `aab_url` (kesh-data `14:45:18`, roseline `14:50:20`, sweet-data `14:50:56`, kwam-two `14:54:51`), so the dashboard's AAB link now has real data. **This also closes 8.d.ii's `gh` leg** (`kwam-two` is a `gh` store). Inputs were resolved from live `global_reseller_applications` + `global_reseller_app_configs` and cross-checked against the deployed config route, which echoes the authoritative `resellerId`/`countryCode` — all four matched exactly |

| **8.i** | **Defect batch (person-filed 2026-10-24, from the device test): store owners cannot sign in on mobile** | | ✅ | — |
| 8.i.i | Mobile: reseller/owner login fails while customers succeed | 🤖 | ✅ | **DONE + DEPLOYED + LIVE-VERIFIED 2026-10-24** (web `storeAuthEmail.ts`; edge fn **v6**). Root cause: the mobile login screen resolves the typed address to the Auth identity behind it via `global-store-customer-auth-email` → `resolveStoreAuthEmail`, which only searched **`global_customers`**. Resellers have no customer row — their Auth identity is the application's own derived alias (`<local>+reseller-<cc>-<slug>-<rand>@<domain>`, `generateAuthEmail` in `submitApplication.ts`), e.g. `erudite885@gmail.com` → `erudite885+reseller-zm-zam-store-neh5u@gmail.com`. So the lookup returned `null`, the screen fell back to the typed address, and `signInWithPassword` failed with "Invalid login credentials" — the same symptom as bug A, different cause. Customers were unaffected because they *do* have rows. **Fix:** the resolver now also matches the typed address against **this store's** `global_reseller_applications` row and returns its `auth_email`. Matching is exact + store-scoped, and compared in code (not via a case-insensitive SQL filter) because `_` is a wildcard in `ilike` and is common in email local parts. Ordering is deliberate: the customer lookup still runs first, so a customer of the store keeps resolving. **Verified live on the deployed function** (publishable key, no JWT): `erudite885@gmail.com` and ` ERUDITE885@GMAIL.COM ` (case/trim) both → `erudite885+reseller-zm-zam-store-neh5u@gmail.com`; unknown address → `null`; customer regressions intact (`tan289+1@maxxspace.com` → `tan289+1kesh-data1@maxxspace.com`, `exploit7492+100@gmail.com` → `exploit7492+100roseline7@gmail.com`); `GET` → 405. **Proven the tests catch it:** 3 new owner tests **fail on the old resolver** and pass on the new one; full suite **56/56**. Confirmed all **43** `global_reseller_applications` rows carry a non-null `auth_email` (so no owner is left unresolvable) and the resolved alias maps to a real, email-confirmed Auth user (124 of 382 Auth users are `role: reseller`). `deno check` clean. Post-login is sound for owners: `global-store-register-customer` already skips the owner, and `(app)/_layout.tsx` tolerates a reseller. Web reseller login is a *different* path (`global_reseller_applications.original_email` via `getAuthEmail`) and was not affected. **Person step:** none for the login itself — the function is deployed; the fix reaches a device in the next APK build |
| 8.i.ii | Ship the fix in fresh APKs for the four test stores | 🤖 | ✅ | **DONE — DISPATCHED + PROVEN LIVE 2026-10-24.** Person-requested. Four `workflow_dispatch` runs of `build-global-reseller-apk.yml` in `Erudite885/reseller-app`, all on ref **`handover/supabase-dump` @ `aeb8dea`** — the commit carrying the owner-login fix (verified: every run's `head_sha` = `aeb8dea`). **Note on the ref:** the dashboard's own trigger uses `BUILD_WORKFLOW_REF = "main"`, but `main` (`210c295`, a merge of the older branch head `6721a4b`) does **not** contain the fix, so dispatching on `main` would have shipped the bug. Built from the branch ref instead; `main` is left untouched pending a person decision on merging. All four runs `completed/success`, job `build` success (runs **40134953636** roseline, **40134955279** kesh-data, **40134956730** sweet-data, **40134958352** kwam-two; ~20–27 min each). Each release carries **both** artifacts in `Erudite885/tenant-distribution`: `ng-roseline-330e68c4-20261024_215615` (`.apk` 79.0 MB + `.aab` 41.5), `ke-kesh-data-96408a53-20261024_220251` (79.0 + 41.5), `cm-sweet-data-b58d3aa6-20261024_220012` (79.0 + 41.5), `gh-kwam-two-aaaf1cff-20261024_220021` (79.1 + 41.6). **Fix confirmed inside the shipped bundles, not just in git:** all four `assets/index.android.bundle` files contain `resolveAuthEmail` (1×) and `global-store-customer-auth-email` (1×), and **zero** occurrences of the old `getCustomerAuthEmail`. APK HTTP 200 on every URL; SHA-256 recorded for the download instructions. `global_app_builds` updated in place by the workflow's success webhook |

| **8.j** | **Person request (2026-10-24, after 8.i closed): show plans only after the phone number identifies the network** | | ✅ | — |
| 8.j.i | Mobile: gate plans on the typed number, remove the network tabs, auto-detect the network from the prefix | 🤖 | ✅ | **CODE DONE + VERIFIED + CORRECTED 2026-10-24** (mobile `725fff9`, reworking `78fa753`). The buy screen showed the network tabs before any number was typed — tap a tab, see that network's plans, then retype the number for another network. Now the plans appear only once the first **6** digits are typed, the tabs are gone, and the network is resolved from the prefix. **Every country now has a prefix table, not just NG:** `constants/networkPrefixes.ts` is **generated** from Google's libphonenumber data by `scripts/generate-network-prefixes.mjs`, covering all **24** countries in `countryConfig`. Detection moved to `constants/networkDetection.ts`, deliberately free of the image imports in `constants/helpers.ts` so it runs under plain Node. **Person correction applied (`725fff9`): matching is on the FULL dialed form — the trunk `0` is NOT stripped.** `0803…` resolves; bare `803…` does NOT, in every country that has a trunk. The first cut stripped a leading `0` (to mirror the web's `normalizePhoneDigits`); that was wrong twice over — the providers expect the trunk form, and the countries with **no** trunk (Benin, Côte d'Ivoire, Congo, Gabon) have numbers that legitimately **start with `0`**, so stripping made them unresolvable. The generator now reads each country's trunk prefix out of libphonenumber's `PhoneNumberMetadata.xml` and prepends it, so the tables are keyed on the full dialed form; `detectNetwork` matches the typed digits as-is; `isValidNationalPhoneNumber` requires and removes the country's **own** trunk by value (not any leading `0`) and now takes the country code; the buy screen caps input at `maxDigits` + the country's trunk length. **Verified, not assumed** (`scripts/verify-network-prefixes.mjs`, all checks pass): all **438** published prefixes resolve once typed in full; the 6-digit gate **never mis-resolves** to the wrong network (38 seven-digit South African landline ranges simply defer one digit, and the screen re-runs detection per keystroke); every network in the table is reachable; and all **24** libphonenumber mobile example numbers validate as complete. **Coverage audited against live data:** every network any active store sells is in its country's table; the only gap in a shipped country is the duplicate NG label `NineMobile`, which **no store enables** (0 `global_reseller_plan_configs` rows). `tsc --noEmit` = 0; `expo lint` unchanged at 42 problems (12 errors), none in a touched file |
| 8.j.ii | Ship the change in fresh APKs for the four test stores | 🤖 | ✅ | **DONE — MERGED + DISPATCHED + PROVEN IN THE SHIPPED BYTES 2026-10-25.** Person-requested ("merge to main and then provide the curl command to download the four via termux each"). **Merge:** `handover/supabase-dump` → `main` in both repos — mobile `main` `210c295` → **`1d8465b`** (merge of `725fff9`), web `main` `f7bbdb8` → **`fdab108`** (merge of `6d0fdba`). Both merges are content-complete: each merged `main` tree is byte-identical to the corresponding handover tip (`f099213…` mobile, `50b46d0…` web). Mobile `main` had diverged only by the PR #11 merge commit `210c295`, whose tree equals the handover ancestor `0c0270e` (`ce08680…`), so nothing was dropped. **Dispatch:** four `workflow_dispatch` runs of `build-global-reseller-apk.yml` **on `main`** (not the branch) — the 8.i.ii stale-`main` trap no longer applies because `main` now carries the change. Inputs from live data: roseline `586de786…`/`330e68c4…` (ng), kesh-data `43d24f2f…`/`96408a53…` (ke), sweet-data `34095666…`/`b58d3aa6…` (cm), kwam-two `2731f8e9…`/`aaaf1cff…` (gh). All four runs `completed/success`, job `build` green, **every `head_sha` = `1d8465b`** (runs **40222128214** roseline, **40222129764** kesh-data, **40222131711** sweet-data, **40222133318** kwam-two). **Releases** in `Erudite885/tenant-distribution`, each with `.apk` + `.aab`: `ng-roseline-330e68c4-20261025_190033`, `ke-kesh-data-96408a53-20261025_185355`, `cm-sweet-data-b58d3aa6-20261025_185452`, `gh-kwam-two-aaaf1cff-20261025_190123`. **Proven in the shipped bytes, not just in git:** all four `assets/index.android.bundle` files contain `NATIONAL_TRUNK_BY_COUNTRY` (1×), `MIN_DETECT_DIGITS` (1×), `detectNetwork` (1×), `resolveAuthEmail` (1×) and **zero** `normalizeNationalDigits` and **zero** `getCustomerAuthEmail` — i.e. both the 8.j full-form detection and the 8.i resolver rename are in the builds. APK HTTP 200 on every URL; SHA-256 (`roseline` `cedd59b4…c1f998d`, `kesh-data` `57367d27…7132d59c`, `sweet-data` `84133aff…d6798cb3`, `kwam-two` `d7d55a53…17b09c59`) recorded for the download instructions. **Person step (remaining):** install a build and confirm on-device that plans appear after 6 digits, match the number's network, and that the trunk `0` is required (`0803…` resolves, `803…` does not). **Termux download (public releases, no auth):** `cd /sdcard/Download 2>/dev/null || cd ~` then, one per line — `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/ng-roseline-330e68c4-20261025_190033/roseline.apk` · `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/ke-kesh-data-96408a53-20261025_185355/kesh-data.apk` · `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/cm-sweet-data-b58d3aa6-20261025_185452/sweet-data.apk` · `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/gh-kwam-two-aaaf1cff-20261025_190123/kwam-two.apk` · verify with `sha256sum roseline.apk kesh-data.apk sweet-data.apk kwam-two.apk` → expect `cedd59b4…c1f998d`, `57367d27…7132d59c`, `84133aff…d6798cb3`, `d7d55a53…17b09c59` · install with `termux-open roseline.apk` (etc.) |
| **8.k** | **Person request (2026-10-25, after 8.j shipped): the fund-account/wallet checkout opens in a browser outside the app; korapay/flutterwave must open inside the app so the user stays in it** | | ✅ | — |
| 8.k.i | Mobile: render the gateway checkout in-app instead of the OS browser | 🤖 | ✅ | **CODE DONE + VERIFIED 2026-10-25** (mobile `8b18d03`). Root cause: `hooks/useFundWallet.ts` handed the checkout URL from `global-store-fund-wallet` to `WebBrowser.openBrowserAsync`, which opens a Chrome Custom Tab / Safari sheet — so a non-NG payer visibly left the app, and on some devices landed in the full browser with the app's session behind them. NG was unaffected because its gateway (xixapay) issues a virtual account and never redirects. **Fix:** the checkout now renders in an in-app full-screen `Modal` + `WebView` (`components/PaymentWebView.tsx`), with a header/close, loading overlay, error state with retry and an "open in browser instead" fallback, and interception of the gateway's redirect back to the app's own `/api/payment/callback` — the moment the payer is done, the sheet closes and the wallet query refreshes. `constants/paymentReturn.ts` does that recognition and is deliberately import-free and `URL`-class-free, so it compiles and runs under plain Node and needs no polyfill on device. `react-native-webview` was already a dependency (13.13.5) and its Android classes are already in every shipped APK (`com/reactnativecommunity/webview` ×67 in the dex), so **no new native module** — this is a JS-only change, no rebuild of native config needed. Only http(s) loads are allowed through; other schemes (`tel:`, USSD) are handed to the OS so they still work without the checkout leaving the app. `useFundWallet` now only initiates; `setSupportMultipleWindows={false}` keeps any `window.open` inside the WebView, and `thirdPartyCookiesEnabled`/`sharedCookiesEnabled` carry the gateway's session cookies through the redirects. **Verified:** `node scripts/verify-payment-return.mjs` — **27/27** (callback recognised as absolute, protocol-relative and bare path, and on a *different* origin than the build baked in; the gateway pages, the storefront and a `/api/payment/callback/extra` lookalike are all rejected; query parsing handles encoding, `+`, and missing keys). `tsc --noEmit` = 0; `expo lint` unchanged at 42 problems (12 errors), none in a touched file. The 8.j verification still passes. **Crediting is unchanged:** the korapay/flutterwave webhooks still complete the deposit; "returned" only means "stop showing checkout". **Person step:** see 8.k.ii |
| 8.k.ii | Ship the change in fresh APKs for the four test stores | 🤖 | ✅ | **DONE — MERGED + DISPATCHED + PROVEN IN THE SHIPPED BYTES 2026-10-26.** Mobile `handover/supabase-dump` → `main`: `1d8465b` → **`814b0fd`** (`--no-ff` merge of `8b18d03`; merged `main` tree byte-identical to the handover tip, `cb6d3be…`). Four `workflow_dispatch` runs of `build-global-reseller-apk.yml` **on `main`** — all `completed/success`, job `build` green, **every `head_sha` = `814b0fd`** (runs **40280088780** roseline, **40280090379** kesh-data, **40280091941** sweet-data, **40280093608** kwam-two). **Releases** in `Erudite885/tenant-distribution`, each with `.apk` + `.aab`: `ng-roseline-330e68c4-20261026_065249`, `ke-kesh-data-96408a53-20261026_064622`, `cm-sweet-data-b58d3aa6-20261026_065223`, `gh-kwam-two-aaaf1cff-20261026_065235`. **Proven in the shipped bytes:** all four `assets/index.android.bundle` files contain `api/payment/callback` (1×), `isPaymentReturnUrl` (1×) and `PaymentWebView` (1×), with **zero** `openBrowserAsync` — the browser call is gone — and each APK's dex still carries `com/reactnativecommunity/webview` (67 refs), so the in-app WebView will load. The 8.j and 8.i markers are still present. APK HTTP 200 on every URL; SHA-256 (`roseline` `80e5104a…722485f`, `kesh-data` `4a0fcb62…0b281cfd`, `sweet-data` `3d10cfea…3172feb8`, `kwam-two` `537519b6…dcedd647c9`) recorded below. **Person step (remaining):** install a build, fund the wallet on a non-NG store (ke/cm/gh), and confirm the Korapay/Flutterwave checkout opens **inside the app** and returns to the wallet without ever leaving it. **Termux download (public releases, no auth):** `cd /sdcard/Download 2>/dev/null || cd ~` then, one per line — `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/ng-roseline-330e68c4-20261026_065249/roseline.apk` · `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/ke-kesh-data-96408a53-20261026_064622/kesh-data.apk` · `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/cm-sweet-data-b58d3aa6-20261026_065223/sweet-data.apk` · `curl -L -O https://github.com/Erudite885/tenant-distribution/releases/download/gh-kwam-two-aaaf1cff-20261026_065235/kwam-two.apk` · verify with `sha256sum roseline.apk kesh-data.apk sweet-data.apk kwam-two.apk` → expect `80e5104a…722485f`, `4a0fcb62…0b281cfd`, `3d10cfea…3172feb8`, `537519b6…dcedd647c9` · install with `termux-open roseline.apk` (etc.) |

| **8.l** | **Storefront fund fails with "Customer record not found" (found 2026-10-26 while diagnosing the storefront)** | | ✅ | — |
| 8.l.i | Web: resolve the customer row past the owner-only RLS policy in the three customer actions | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`9b8a36b`). `global_customers` grants SELECT **only to the store owner** (`auth.uid() IN (SELECT auth_user_id FROM global_reseller_applications …)`), so a customer reading their **own** row through `createServerClient()` — which sends the user's JWT — got `200 []` (proven with a throwaway user: same filtered query returns the row under the service role, `[]` under the customer's JWT). `fundGlobalCustomerWallet.ts`, `getCurrentCustomerWallet.ts` and `getCurrentCustomerPinStatus.ts` all did that lookup, so every customer resolved to `null`. They now read that one lookup through the **service-role** client after the session check — the pattern `createGlobalCustomerVirtualAccount` (the working NG path) already used; the filter stays the authenticated user's own id, so only their own row is reachable. **Verified live:** a signed-in customer that previously read a null wallet now renders `₵250.75`; both actions return 200. `tsc --noEmit` = 0 |
| 8.l.ii | Web: detect the store owner by `store_slug`, not `store_name` | 🤖 | ✅ | **DONE 2026-10-26** (`9b8a36b`). `useStoreCustomerAuth` compared `user_metadata.store_name` against the store **slug** ("Kwam Two" vs "kwam-two") — never equal — so an owner was classified as a customer and fell into the customer branch, and an owner has **no** `global_customers` row at all (verified for every test store), producing the same error. Now compares `store_slug`, matching `useCustomerAuth`. `StoreContent`'s fund and virtual-account handlers branch on the role (owner → `fundWallet`/`createVirtualAccount`), mirroring the mobile `global-store-fund-wallet` edge function |
| **8.m** | **Storefront wallet unreachable on a phone (found 2026-10-26, same diagnosis)** | | ✅ | — |
| 8.m.i | Web: add a wallet entry to the storefront mobile drawer | 🤖 | ✅ | **DONE 2026-10-26** (`9b8a36b`). The only wallet entry point was the balance pill inside `desktop-nav`, which is `display:none` below 768px, and the mobile drawer carried Theme/Notifications/Dashboard/Contact/Sign out but **no** wallet row. The drawer now shows a wallet link (owner) or the balance + fund action (customer). **Person step:** confirm on a real phone browser that the drawer wallet row appears and funds end-to-end (no APK needed — this is the web storefront) |
| **8.n** | **Storefront fund now says "authorization token is invalid" (person-filed 2026-10-26, immediately after 8.l/8.m shipped)** | | ✅ | — |
| 8.n.i | Web: fail legibly when the gateway secret is missing, instead of forwarding Korapay's empty-token message | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`4f792bc`). Reproduced the exact wording live: Korapay returns `401 {"status":false,"error":"not_authenticated","message":"authorization token is invalid"}` **only** for an empty bearer (`Authorization: Bearer `); a non-empty but wrong key gives `403 "invalid authorization key"` and a missing header gives `"no authorization token found"`. The web fund path (`fundGlobalCustomerWallet` for a customer, `fundWallet` for an owner) calls the gateway directly with `process.env.KORAPAY_SECRET_KEY`, which the module defaulted to `""` and sent unguarded — so any runtime without the secret produces exactly that message. `korapay.ts`/`flutterwave.ts` now return `"Payment provider is not configured. Please contact support."` when the secret is blank, the same guard `createGlobalCustomerVirtualAccount` already used for Xixapay. `tsc --noEmit` = 0. **Where the person hit it (now fixed):** `KORAPAY_SECRET_KEY`/`FLUTTERWAVE_SECRET_KEY` were set in Vercel for the **`production` target only**, so a **preview deployment** had no key and produced this. **RESOLVED 2026-10-26 — see 8.n.ii** |
| 8.n.ii | Vercel: make the payment secrets available to `preview`, and name the environment in the error | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`5cd2383`, `1942c2f`). The person was right that the keys are set — the earlier "len 0" reading was the Vercel API **redacting** `type: sensitive` values (`value: ""`, `decrypted: false`; `vercel env pull` writes `[SENSITIVE]`), not a blank secret. Proved by running code, not reading config: a temporary route deployed to each environment reported **production** `KORAPAY_SECRET_KEY` present **48** chars and `FLUTTERWAVE_SECRET_KEY` present **56** chars, with a real `korapay.initiatePayment()` for kesh-data returning `success: true` (checkout `KPY-MVQB7I64-T60RZC`); a **preview** deployment of the same commit reported **both `{present: false}`** (and `XIXAPAY_SECRET_KEY`, target `development,preview,production`, present) — the secrets were `target: ["production"]` only. A target-only `PATCH /v9/projects/…/env/{id}` preserves a sensitive value (verified on a disposable `sensitive` variable first: its value survived and a fresh deployment saw it), so all six payment variables — `KORAPAY_SECRET_KEY`, `KORAPAY_PUBLIC_KEY`, `KORAPAY_ENCRYPTION_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_ENCRYPTION_KEY` — were extended to `["preview","production"]` **without rewriting their values**. A fresh preview then reported `KORAPAY_SECRET_KEY` **48** chars and `FLUTTERWAVE_SECRET_KEY` **56** chars — error gone. The guard now also logs the serving deployment and names the environment in the message (`Payment provider is not configured (preview).`). Production redeployed clean; `/` and `/ke/kesh-data` 200. `tsc --noEmit` = 0. **Person step:** re-run the fund flow on a fresh preview (or the production URL) for both a reseller and a reseller customer |
| **8.o** | **Dashboard store page is not responsive across devices (person-filed 2026-10-26)** | | ✅ | — |
| 8.o.i | Web: stop the dashboard shell overflowing horizontally on phones | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`7bbf172`). Root cause: the dashboard shell's flex children had no `min-width: 0`, so a flex item defaults to `min-width: auto` and refuses to shrink below its content's min-content width. The greeting in `DashboardHeader` is `white-space: nowrap` ("Good morning, &lt;name&gt; 👋"), and the whole dashboard content column is a flex child of the `display:flex` shell — so on a narrow viewport the **header's nowrap text set a 666px floor** on the entire shell, producing a horizontal scrollbar and pushing the theme toggle off-screen on every dashboard page (reproduced at 320/375/414px with a headless Chromium session: `documentElement.scrollWidth` = **666** vs `clientWidth` = **320/375/414**; 768px measured 906). Added `minWidth: 0` to `.dashboard-content`, the header bar, and `<main>` in `dashboard/layout.tsx`, plus the `<header>` in `DashboardHeader.tsx`. Nothing else changed — the tab strip's intentional `overflow-x: auto` is untouched. **Verified, not assumed:** after the fix `scrollWidth == clientWidth` at 320/375/414/768/1024px on the store page, and on **all seven** dashboard routes (overview, wallet, customers, orders, plans, store, settings) at 320/375/768px — 21/21 clean, and the greeting now ellipsises (`text-overflow: ellipsis` at 188px wide at 320px) while the mobile menu button shows and the desktop theme toggle correctly stays hidden. Every store-page tab (Store Settings, Branding, Theme, Store Preview) was exercised at 320/375/768/1024px — 16/16 clean. `tsc --noEmit` = 0. Test user + rows deleted afterwards (verified clean) |
| **8.p** | **Storefront mobile-money number field is white/invisible (person-filed 2026-10-26)** | | ✅ | — |
| 8.p.i | Web: make the storefront mobile-money input match the amount field | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`8d9a9dc`). The mobile-money `<input type="tel">` in `StoreFundWalletModal` carried its own `background: var(--bg-muted, #F9FAFB)`, and `--bg-muted` is **not defined anywhere in the codebase** (only ever used as `var(--bg-muted, <fallback>)`) — so it resolved to the light `#F9FAFB` fallback on every storefront, including the dark storefront theme, while the text stayed `var(--text)` (`#F5F0EB`, near-white). White text on a white box: the customer could not see what they typed. The **amount** field never had this bug because its `<input>` is `background: transparent` inside a wrapper `<div>`, and `store-theme.css` forces `body.storefront-theme div { background-color: var(--bg) !important }` — it targets `div`/`section`/`main`/`header`/… but **not `input`**, so a bare themed input keeps its own background. Fix: wrap the mobile input in the same flex wrapper the amount field uses (border + radius on the wrapper, `background: transparent` and `color: var(--text)` on the input) so both fields render identically. **Verified, not assumed** — reproduced and fixed in a real headless-Chromium session against a throwaway harness page rendering the actual component with `store-theme.css` loaded: before, the tel input computed `background: rgb(249,250,251)` with `color: rgb(245,240,235)` (contrast ~1.1, invisible); after, it computes `background: transparent` inside a `var(--bg)` wrapper, identical to the amount input (`sameColors` and `sameBg` both `true`), contrast 18.54 in dark and matching the amount field in light. `tsc --noEmit` = 0. Harness page, `.env.local` and the Playwright scratch dir removed afterwards |
| **8.q** | **Dashboard stat cards stack one-per-row on phones, and the storefront has no profile page (person-filed 2026-10-26)** | | ✅ | — |
| 8.q.i | Web: make the Plans and Customers stat grids horizontal on mobile | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26.** Both grids were `repeat(auto-fit, minmax(Npx, 1fr))`, which collapses to **one column** whenever the container is narrower than the min — so the Plans trio (`150px`) and the Customers quartet (`180px`) each stacked vertically on a phone while desktop showed one row. Replaced with fixed-track grids behind a class: `.plans-stats-grid` is always `repeat(3, minmax(0,1fr))`; `.customers-stats-grid` is `repeat(4, minmax(0,1fr))` at ≥1024px and `repeat(2, minmax(0,1fr))` below (the 2x2 the person specified when four will not fit). Sub-768px media rules tighten the gap to `0.5rem`, shrink card padding, and step the label/value font sizes down so the row still reads at 320px. Customer labels shortened to `Total` / `Active` / `New` (`Inactive` unchanged); `total`/`new` keys added to `src/messages/{en,fr,ar}/customers.json`. **Verified, not assumed** in headless Chromium on the **real** dashboard routes signed in as a reseller: Plans renders one row of three (`cols` `103.656px 103.672px 103.656px`) at 320/375/414/768/1024/1440px; Customers renders `159.5px 159.5px` (2x2) at 375px and one row of four at 1024/1440px; `documentElement.scrollWidth == clientWidth` at every width, and no label or value clips (`scrollWidth <= clientWidth`). Rendered labels confirmed as `Total 0 / Active 0 / New 0 / Inactive 0`. `tsc --noEmit` = 0 |
| 8.q.ii | Web: add a responsive profile page to the storefront | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26.** New route `src/app/[countryCode]/[storeName]/profile/` (server `page.tsx` + `StoreProfileClient.tsx`). Entry points: the header avatar is now a `Link` to it (desktop), and the mobile drawer gained a `Profile` row — the account cluster is hidden below 768px, so the drawer needed its own entry. Two new server actions resolve identity the same way `getCurrentCustomerWallet` does — the session client proves who is calling, then the **service-role** client reads/writes the row, because `global_customers` SELECT is owner-only under RLS and the owner has no `global_customers` row at all: `getCurrentStoreProfile` (owner vs customer branch on `global_reseller_applications.auth_user_id`) and `updateCurrentStoreProfile` (name/phone, own row only). The page shows an identity card, account-type badge, email/phone/status/member-since grid, an inline edit form, and a wallet summary for customers. `useStoreCustomerAuth` gained an `authReady` flag so the page can distinguish "signed out" from "not yet known" — without it an anonymous visitor sat on an infinite spinner (found and fixed during verification). 14 new keys added to `src/messages/{en,fr,ar,es}/storefront.json`. **Verified, not assumed:** loaded as a real customer (created via the admin API) and as a real store owner (temporary application row); the owner sees `Store Owner` and the store's own name/phone, the customer sees `Customer` and their own row; edit→save round-trip persisted and re-rendered (`Renamed Profile`); anonymous visit shows the sign-in prompt (not a spinner); no horizontal overflow at 320/375/414/768/1024/1440px in both dark and light themes; cards compute `var(--card)` correctly in each theme. `tsc --noEmit` = 0. Test customer, test application and both auth users deleted afterwards (verified clean) |
| **8.r** | **Storefront mobile drawer is order-blind, owner/customer misclassified, reseller sign-out lands on the storefront (person-filed 2026-10-26)** | | ✅ | — |
| 8.r.i | Web: order the mobile drawer per role (reseller customer vs reseller) | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`6f8eaa9`). The drawer rendered one fixed list regardless of role. It now orders by role: a **reseller customer** (storefront only) sees Profile, Wallet, Notifications, light mode, Contact Store; a **reseller** (owner) sees Profile, Wallet, Dashboard, Notifications, light mode. Ordering was blocked by a real classification bug — `StoreHeader` compared `user_metadata.store_name` against `storeData.application.store_name` (the *display* name, which a reseller can rename) while signup writes `store_name` as the **slug**, so a genuine owner could be silently treated as a customer; both the mount and the auth-change path now compare `store_slug`, matching `useStoreCustomerAuth` and the profile page. The drawer element also had no `className="mobile-drawer"`, so its own stylesheet (which hides it at ≥769px) never applied — added. Rows share one `drawerRow` style object. **Verified, not assumed** in headless Chromium at 390x900 against `/ng/toms-sub` with real accounts: customer drawer `["Profile","Wallet ₦0","Notifications","Dark Mode","Contact Store","Sign Out"]`, owner drawer `["Profile","Wallet","Dashboard","Notifications","Dark Mode","Sign Out"]`; desktop (1280px) computes `.mobile-drawer` `display: none` and `.mobile-toggle` `display: none`. `tsc --noEmit` = 0. Test customer, test owner and all rows deleted afterwards (verified clean) |
| 8.r.ii | Web: reseller sign-out routes to the reseller sign-in page | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`6f8eaa9`). `StoreHeader.handleLogout` now sends a store owner to `/[countryCode]/sign-in` and keeps a reseller customer on the storefront they were browsing (the current behaviour). The dashboard sidebar's own sign-out (`DashboardSidebar.handleLogout`) had the same mismatch — it dropped the reseller on `/[countryCode]` (a country landing page with no sign-in form) — and now goes to `/[countryCode]/sign-in` too. **Verified, not assumed:** signed in as the owner, opened the storefront drawer, clicked Sign Out, and watched the main frame navigate to `/ng/sign-in` with the reseller sign-in form ("Welcome Back" + an email input) rendered; a reseller customer's sign-out stayed on `/ng/toms-sub`. `tsc --noEmit` = 0 |
| 8.r.iii | Web: the header's Sign In button opens the auth modal, and a successful sign-in closes it | 🤖 | ✅ | **DONE + VERIFIED 2026-10-26** (`6f8eaa9`). The header's Sign In button previously navigated to `?login=true`; the storefront read that param once on mount, so a soft navigation to the same path did **not** reopen the modal, and the param was never cleared (it also made the modal reappear on refresh or Back). `StoreHeader` now takes an optional `onLoginClick` and, when present, calls it directly to open the modal in place — `StoreContent` passes `onLoginClick={() => setLoginOpen(true)}`; the profile page still omits it, so Sign In there keeps navigating to `?login=true`. `StoreContent` also clears the marker and closes the modal when `auth.loggedIn` flips true. The owner redirect from the modal pointed at the bare `/dashboard` (the legacy reseller shell, a different app) — it now goes to `/[countryCode]/dashboard`, the same route the storefront header links to; `useStoreCustomerAuth` takes `countryCode` for that. **Verified, not assumed:** from the storefront drawer, clicking Sign In opened the modal ("Welcome Back" visible); signing up as a customer left `hasModalText: false` (modal closed) on `/ng/toms-sub`; signing in as the owner from `/ng/sign-in` landed on `/ng/dashboard` and the storefront drawer then rendered the owner order. `tsc --noEmit` = 0. All test rows deleted afterwards (verified clean) |
| **8.s** | **Reseller sign-in from the storefront ejects the visitor to the dashboard (person-filed 2026-10-27)** | | ✅ | — |
| 8.s.i | Web: sign-in from the storefront stays on the storefront for a reseller too | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`2774623`). Person: "fix the storefront sign in so that resellers can also be able to sign in from the storefront. When resellers sign in from the storefront, they are not routed to the dashboard, they will be on the storefront too just like a customer would." 8.r had done the opposite — `useStoreCustomerAuth.handleLogin` ran `if (owner) router.push(\`/${countryCode}/dashboard\`)`, so a reseller was thrown out of the store on authentication. The redirect is removed; sign-in always lands on the storefront, and the owner reaches the dashboard deliberately via the header/drawer `Dashboard` entry. That removes the hook's only `router` use and its `countryCode` argument, so both are deleted and the two call sites (`StoreContent`, `profile/StoreProfileClient`) no longer pass `countryCode`. **Verified, not assumed, in headless Chromium against `/gh/oh-test-1793114478438`:** owner sign-in leaves the URL on the storefront (it was `/gh/dashboard`), and the mobile drawer then renders `["Profile","Wallet","Dashboard","Notifications","Dark Mode","Sign Out"]`. `tsc --noEmit` = 0 |
| **8.t** | **Horizontal scrollbar on the dashboard wallet page and store page (person-filed 2026-10-27)** | | ✅ | — |
| 8.t.i | Web: remove the horizontal scrollbar on the wallet page | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`abb69ea`). Person: "why is there a scroll bar in the fund wallet page in the dashboard if [it wasn't] there before, take it out." The wallet page header's action row (Fund Wallet / Withdraw / refresh) is a `display:flex` row with no wrap and fixed-width buttons (~330px, starting at the content column's left inset); as a flex item of the page header it set a min-content floor wider than a phone, pushing `<main>` to `scrollWidth` **379** vs `clientWidth` **360**. The transaction filter chip row overflowed at 360px too. Both rows now `flexWrap: "wrap"`. **Verified, not assumed:** swept 9 viewports (360–1920px) before and after; every horizontal overflow is gone (`documentElement.scrollWidth == clientWidth`, no inner element reports a horizontal scroll delta). `tsc --noEmit` = 0 |
| 8.t.ii | Web: remove the horizontal scrollbar on the store page | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`abb69ea`). Person: "Also remove the scrollbar in the store page." The store header's "View Store" row overflowed, and the tab strip carried `overflowX: "auto"`, so it rendered the tabs as a scroll container showing a scrollbar (`scrollWidth` **618** vs `clientWidth` **342** at 360px) rather than wrapping. The header row now wraps and the tab strip drops `overflowX: auto`, so the four tabs wrap onto a second line on a phone. **Verified, not assumed:** same 9-viewport sweep; no horizontal overflow on the store page at any width. `tsc --noEmit` = 0 |
| **8.u** | **Dashboard theme cannot be toggled from the Store > Theme tab or the sidebar (person-filed 2026-10-27)** | | ✅ | — |
| 8.u.i | Web: the Store > Theme tab actually applies the theme | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`8786ec7`). `ThemeSettings.handleThemeChange` wrote `document.documentElement.setAttribute("data-theme", theme)`, but `dashboard-theme.css` matches `body.dashboard-theme[data-theme="light"]` — the attribute was written on `<html>` where no rule reads it — and it bypassed `ThemeProvider`. `ThemeProvider` now exposes `setTheme`, and `ThemeSettings` calls it (the stale `<html>`/`localStorage` lines are removed), so picking Light/Dark applies immediately and persists like the header toggle. **Verified, not assumed, in headless Chromium:** picking `Dark` flips `body[data-theme]` to `dark`, the body background from light `srgb 0.98…` to dark `srgb 0.084…`, and `localStorage.theme` = `dark`. `tsc --noEmit` = 0 |
| 8.u.ii | Web: a theme toggle on mobile, where the header's is hidden | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`8786ec7`). The header toggle lives in a `.desktop-only` wrapper (`display: none` under 768px), and the sidebar is the only nav surface on a phone — so there was no way to switch theme there. The sidebar footer now carries a theme toggle above Sign Out. **Verified, not assumed:** at 390px the header toggle is invisible (`offsetParent === null`) while the new sidebar toggle is visible and switches the theme back to light. `tsc --noEmit` = 0 |
| **8.v** | **Reseller sign-in page cannot server-render (`window is not defined`) (found 2026-10-27 while reproducing the mobile sign-in report)** | | ✅ | — |
| 8.v.i | Web: read the country from the route, not `window`, on the sign-in page | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`c7dcf7b`). `/[countryCode]/sign-in/page.tsx` touched `window.location` **during render** twice — to derive the post-login country and for the Apply link href — which aborts SSR, so every visit logged `Switched to client rendering because the server rendering errored: window is not defined` and the page was client-only. It now reads the country from `useParams` (the route already provides it) for both. **Verified, not assumed, in headless Chromium at 390x844 and 360x640:** the SSR error is gone and a reseller signs in to `/gh/dashboard`. `tsc --noEmit` = 0 |
| **8.w** | **Every loading spinner is a text "Loading..." + circle; the person wants the store name and a sweeping bar (person-filed 2026-10-27)** | | ✅ | — |
| 8.w.i | Web: shared `StoreLoader` — "<store name> Store" over a bar that sweeps back and forth | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`485fae9`). Person, verbatim: "Replace ALL loading spinners — instead of just a text 'Loading...' + circle spinner, show the text `<storename> Store` (e.g. 'Simi Store') with a horizontal loader bar that sweeps back and forth below it." New `src/components/common/StoreLoader.tsx` renders the label above a 160px track (`maxWidth: 60vw`) whose 40%-wide bar animates on `@keyframes store-loader-sweep` added to `globals.css` (`translateX(-100%)` → `250%` → `-100%`, 1.4s `ease-in-out` infinite; the percentage is relative to the bar's own width, so it holds at any track width). `storeLabel(name, slug?)` builds `"<name> Store"` and title-cases a slug when only the URL segment is known (`toms-sub` → `Toms Sub Store`), leaving a name that already ends in "Store" alone and falling back to `PLATFORM_LABEL` ("Loading") where no store is in context. Pure CSS, so it animates identically before hydration and inside a `<Suspense>` fallback; `prefers-reduced-motion: reduce` freezes it full-width at 0.5 opacity. **Verified, not assumed, in headless Chromium:** the storefront loader reads exactly `"Simi Store"` with `animationName: store-loader-sweep`, `1.4s`, bar `rgb(201,138,84)` (the brand colour) on a 160px track; sampling the bar's `x` over 1.6s gives 2 direction reversals (a true back-and-forth); `documentElement.scrollWidth == clientWidth` at 390px; with `reducedMotion: "reduce"` the bar computes `animation: none`. `tsc --noEmit` = 0 |
| 8.w.ii | Web: replace the spinner at every call site | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`485fae9`). Wired at: the storefront boundary (`[storeName]/loading.tsx`), the storefront layout and profile page, the dashboard layout, `pending`, `rejected` and `app/AppBuildClient`, the reseller sign-in `Suspense` fallback, the `/redirect/reset-password` fallback and `(auth)/reset-password`, the `admin/loading.tsx` scaffold, and the legacy consumer shell (`(protected)/data`, `(protected)/changepin`). Unused `Loader2`/`ImSpinner9` imports were dropped where they became dead. **Two defects were found and fixed while wiring, both verified in a real browser:** (1) the storefront `loading.tsx` had been made `async` to `await params`, but a Next.js `loading` boundary receives **no params** — every storefront render threw `Cannot destructure property 'storeName' of '(undefined)'` in the server log; it now renders a small client component (`StoreLoadingIndicator.tsx`) that reads the segment with `useParams`, so the label still names the store. (2) the dashboard loader showed the **platform** label for the whole wait, because the store name only arrived with the dashboard-context RPC it was waiting on; both `dashboard/layout.tsx` and `useResellerStoreName` now seed the name from the session's `store_slug` first and let the RPC refine it, and the delayed-RPC probe now reads `"Oh Test 1793114478438 Store"` instead of `"Edges Network"`. **Verified, not assumed:** the storefront page HTML contains `Simi Store` + `.store-loader-bar`, and the dev-server log is free of the destructure error after the fix. `tsc --noEmit` = 0. `next build` reaches page-data collection and fails only on the **pre-existing** `/api/xixa-account/webhook` "supabaseUrl is required" (confirmed identical at the parent commit with the changes stashed). |
| 8.w.iii | Web: the no-store fallback label is the generic "Loading", not the platform name | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`b57547f`). Person: "PLATFORM_LABEL should be `Loading` instead of `Edges Network`." `PLATFORM_LABEL` now reads `"Loading"`, so the surfaces with no store in context (the `[countryCode]` boundary, the reseller sign-in `Suspense` fallback, both reset-password fallbacks, the admin scaffold, the legacy consumer shell, and the `pending`/`rejected`/`app-build` fallbacks before a name is known) show "Loading" over the bar instead of a platform name. Store-labelled loaders are unchanged. **Verified, not assumed, in a browser and against the rendered HTML:** `/gh/simi` yields loader labels `["Loading", "Simi Store"]` — the country boundary plus the store boundary — and neither page contains the string "Edges Network" any more; the dashboard's delayed-RPC probe still reads "<Store> Store". `tsc --noEmit` = 0. The doc comments in the component and the three call sites that described the old value were updated to match. |
| **8.x** | **Dashboard polish: greeting, overview order/layout, wallet stats + pending tab (person-filed 2026-10-27)** | | ✅ | — |
| 8.x.i | Web: the dashboard greeting is "hey {name} 👋" | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`3c1fceb`). `DashboardHeader` rendered a time-of-day greeting ("Good morning/afternoon/evening, {name} 👋") and carried a 60s ticker just to recompute it; the person asked for "hey {name} 👋" instead. Replaced the string, deleted `getGreeting` and the now-unused interval. **Verified, not assumed, in headless Chromium signed in as a real reseller:** the header renders exactly `hey oh-test-reseller-1793114478438 👋`. `tsc --noEmit` = 0 |
| 8.x.ii | Web: overview — Quick Actions on top and 2x2 on mobile | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`3c1fceb`). Quick Actions was rendered *below* the stats and used `repeat(auto-fit, minmax(140px, 1fr))`, which produced an uneven row on a phone. It now renders first, and a `max-width: 767px` override pins it to `repeat(2, minmax(0,1fr))` with tightened padding so all four actions form a clean 2x2. Desktop is untouched (the person: "Desktop is okay as it is"). **Verified, not assumed:** computed `gridTemplateColumns` is 2 tracks at 360/390px and 4 at ≥1024px; the overview DOM order is Quick Actions → stats → charts → top products; all four labels render unclipped at 360px (125px each). `tsc --noEmit` = 0 |
| 8.x.iii | Web: overview — stats follow Quick Actions, one row, 2x2 on mobile | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`3c1fceb`). The stats grid used `repeat(auto-fit, minmax(200px, 1fr))`; on a phone the container is narrower than 200px so it collapsed to **one column of oversized boxes** — exactly the reported symptom. It is now `repeat(4, minmax(0,1fr))` (always one horizontal row that fits) and `repeat(2, minmax(0,1fr))` at ≤1023px, matching the pattern 8.q already established for the Plans/Customers grids, with font/padding steps at ≤767px. **Verified, not assumed:** 2 tracks at 360/390/768px and 4 at 1024/1280/1440px; no card clips (`scrollWidth <= clientWidth`); values read `TOTAL CUSTOMERS 1 / TOTAL ORDERS 0 / TOTAL REVENUE ₵ 0 / TOTAL PROFIT ₵ 0`. `tsc --noEmit` = 0 |
| 8.x.iv | Web: overview — revenue + recent activity stack in one column on mobile | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`3c1fceb`). The row was a hard-coded `gridTemplateColumns: "2fr 1fr"`, so on a phone the revenue chart and activity feed were squeezed side by side. Moved behind an `.overview-charts-row` class that is `2fr 1fr` by default and a single `minmax(0,1fr)` column at ≤767px. **Verified, not assumed:** the computed column list is 1 track at 360/390px and 2 at 768/1024/1280/1440px. `tsc --noEmit` = 0 |
| 8.x.v | Web: wallet — stats fit horizontally, 2x2 on small screens | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`3c1fceb`). `WalletSummary` used the same `auto-fit minmax(200px, 1fr)` as the overview stats, so it also stacked into one column of big boxes on a phone. Now `repeat(4, minmax(0,1fr))` (one row at every width) collapsing to 2x2 at ≤1023px — the same breakpoint the overview stats use, so the two pages agree. **Verified, not assumed:** 2 tracks at 360/390/768px and 4 at 1024/1280/1440px; cards read `AVAILABLE BALANCE ₵ 0.00 / Active`, `TOTAL DEPOSITS ₵ 0.00`, `TOTAL WITHDRAWALS ₵ 0.00`, `TOTAL SPENT ₵ 0.00` with no clipping. `tsc --noEmit` = 0 |
| 8.x.vi | Web: wallet — Transaction History gains a Pending tab | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`3c1fceb`). The tab strip offered All / Deposits / Withdrawals / Purchases; the person asked for a **Pending** tab. Pending is a *status*, not a transaction *type*, so it could not simply be appended to the option list — the filter compares `tx.type === filter`, and `pending` is never a type, so a naive tab would have matched nothing forever. The filter now branches on `tx.status === "pending"` first. A `pending` key was added to all five `src/messages/{en,fr,ar,es,pt}/wallet.json` files. **Verified, not assumed, in headless Chromium against the store's two real pending rows:** All shows 2 rows; **Pending shows the same 2 rows** ("Wallet funding via korapay … pending"); Deposits, Withdrawals and Purchases each show the empty state — i.e. the new tab genuinely filters rather than passing everything through. `tsc --noEmit` = 0 |
| 8.y.i | Web: wallet — transaction rows collapse to title + amount on mobile, details behind a tap | 🤖 | ✅ | **DONE + VERIFIED 2026-10-27** (`a025fd4`). Person: "on devices smaller than the desktop, the transaction history list items should show only the `Wallet funding via flutterwave` and amount, other details should be in a dropdown so when user clicks on the item then the details show, for larger devices it should maintain its current look." Each row now keeps only its title and amount visible below 768px; date/time/status/reference move into a panel that opens on tap, with a rotating chevron. The panel is CSS-driven (`.tx-details` hidden by default, shown only under `max-width: 767px` + `.tx-row--expanded`), so **desktop keeps its exact previous markup and look** — no chevron, details inline, click does nothing. The toggle is gated on `matchMedia` so a desktop click cannot set inert state. **Two real defects caught by measuring rather than eyeballing:** (1) `.tx-row-meta` needed `!important` — it carries an inline `display: flex` that otherwise beat the class rule, leaving the meta line visible on mobile; (2) detail values use `text-align: end`, not `right`, so the columns flip correctly under RTL (Egypt). Rows are keyboard-operable (`role=button`, `tabIndex=0`, Enter/Space) with `aria-expanded`. Labels use `t?.status/date/time/reference`, added to all five wallet locale files so no locale falls back to English. **Verified, not assumed, in headless Chromium against a real signed-in store, sweeping 360/390/414/767/768/1024/1280/1440px:** mobile rows read exactly "Wallet funding via korapay | -₵ 100" collapsed and add "Status/Date/Time/Reference" when opened; only one row is open at a time; desktop shows no chevron and never opens; keyboard Enter toggles; no horizontal overflow with the panel open or closed; the All/Pending filters still work. `tsc --noEmit` = 0 |
| **8.z** | **Customers page responsiveness: icon-only add button, responsive modal, mobile list dropdown (person-filed 2026-10-28)** | | ✅ | — |
| 8.z.i | Web: the Add Customer button is icon-only on small screens, keeps its label from 768px up | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`93484e4`). Person, verbatim: "The add customers text should not show for small devices it should only be the icon. On large devices it's okay as is." The button now renders the `UserPlus` icon alone below 768px and the icon + "Add Customer" label from 768px up, driven by a CSS `max-width: 767px` rule on `.add-customer-label` so no JS breakpoint is involved; an `aria-label`/`title` keep it announced for screen readers when the text is hidden. **Verified, not assumed, in headless Chromium signed in as a real reseller store (`gh`):** the label's `isVisible()` is `false` at 360/390/767px and `true` at 768/1280px while the button itself stays visible at every width. `tsc --noEmit` = 0 |
| 8.z.ii | Web: the Add Customer modal is responsive across devices | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`93484e4`). Person: "The add customers modal should be responsive across devices." The name row (first/last) is now a `.add-customer-name-grid` that stacks to one column below 768px (two above), padding steps down on small screens, and the inputs are 16px on small screens so iOS does not zoom the viewport on focus. **Verified, not assumed:** the panel fits the viewport at 320px (288px wide) and 390px (358px); the two name fields are stacked at 320/390/767px and side by side at 768/1280px; the first input computes `font-size: 16px` below 768px and `14.4px` above. `tsc --noEmit` = 0 |
| 8.z.iii | Web: on small screens the customer list is name + status with the remaining details in a tap-to-open dropdown | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`93484e4`). Person, verbatim: "on smaller devices it should display the name and status, other details should be put in a dropdown so when user clicks on the name the drop down shows, in the drop down one can perform the selected action." Below 768px the desktop table is hidden and a `.customers-mobile-only` list renders one row per customer showing name + status; tapping the name expands a `.cust-details` panel with the remaining details (email, phone, joined) plus **Edit** and **Delete**. The toggle is a single-open accordion, keyboard-operable (`aria-expanded`), and the detail values use `text-align: end` so they flip correctly under RTL. A new `CustomerInlineEdit.tsx` performs the edit inline in the dropdown (no modal). **Verified, not assumed, in headless Chromium:** at 360/390/767px the mobile list is visible, the desktop table is hidden, and the header shows name + status; tapping a name reveals 4 detail rows with Edit and Delete present, tapping again collapses it, and opening a second row closes the first; at 768/1280px the desktop table is visible and the mobile list is hidden. Zero console/page errors at every width. `tsc --noEmit` = 0 |
| 8.z.iv | Web: the View action is removed on every viewport | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`93484e4`). Person, verbatim: "There will not be need for the view action anymore since the dropdown shows the details, also no need for the modal that shows for the edit action since it's will be performed in the dropdown." The `Eye`/View button is gone from the desktop actions column; the dropdown already shows the details on small screens, and on large screens the remaining **Edit** action opens the existing details modal (where edits are made). **Verified, not assumed:** the first desktop row's action column now has exactly 2 buttons, titled `Edit` and `Delete`, and clicking Edit opens the details modal ("Order History" / "Save Changes" present). `tsc --noEmit` = 0 |
| 8.z.v | Web: **BUG FIX** — Add Customer could never save (PGRST204 `customer_type`; NOT NULL `last_name`/`email`) | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`93484e4`). Found while verifying 8.z.i–8.z.iv: every Add Customer save failed. Two independent defects: (1) the insert sent a `customer_type` column that **does not exist** on `global_customers`, so PostgREST rejected the whole insert with `PGRST204` — the column is removed from the insert, the form and the state; (2) `last_name` and `email` are `NOT NULL` while the form sent `null` for blanks, raising `23502` — blanks now send ``. The same null→empty-string bug was fixed in the new `CustomerInlineEdit.tsx` and in `CustomerDetailsModal.tsx`'s update path. `last_name` and `email` are now marked required in the form (new `lastNameRequired`/`emailRequired` keys added to `en`/`fr`/`ar`). **Verified, not assumed:** a corrected insert was confirmed at the REST layer (`201`, row read back with `last_name="" email=""`), and end to end through the UI at 390px the modal closes, the new row appears in the list, no error banner shows, and there are no console errors. `tsc --noEmit` = 0 |
| 8.z.vi | Web: the `suspended` customer status is removed — the DB does not accept it | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`d025eb8`). Found while verifying 8.z.v: the `global_customers_status_check` constraint accepts only `active` and `inactive` (confirmed live — an insert of `suspended` returns `23514`), but the status **filter** and **both** edit selects (inline editor + details modal) offered `suspended`, so a customer set to that value could never save. Removed from all three, with the now-dead colour entries. The `Customer` type's phantom `customer_type`/`customer_reference` fields (neither exists on the table) were replaced by the real optional columns. **Verified, not assumed:** the filter reads exactly `All Status / Active / Inactive` and the inline editor `Active / Inactive`; changing a customer to Inactive in the mobile dropdown saves with no constraint error and the row reads `inactive` in the DB. `tsc --noEmit` = 0 |

| **8.aa** | **Orders page responsiveness + the missing `global_orders` RLS policies (person-filed 2026-10-28)** | | ✅ | — |
| 8.aa.i | Web: the `Order` type matches the live `global_orders` schema | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28.** The interface declared ~13 columns that do not exist on the table (`order_number`, `plan_category`, `customer_email`, `customer_phone`, `completed_at`, `payment_status`, `provider_reference`, `delivery_details`, …). Trimmed to the 14 real columns (`id`, `reseller_id`, `customer_id`, `customer_name`, `plan_id`, `plan_name`, `amount`, `profit`, `status`, `payment_method`, `transaction_reference`, `metadata`, `created_at`, `updated_at`), with `ORDER_STATUSES` exported as the single source of truth for the status union. Every consumer was repointed: search now matches reference/name/plan/payment, and the second filter groups by `payment_method` (the only grouping column the table has) instead of `plan_category`. `tsc --noEmit` = 0 |
| 8.aa.ii | Web: the UI offers only statuses the DB check constraint accepts | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28.** `global_orders_status_check` accepts only `pending`/`completed`/`failed`/`cancelled`; the UI offered `processing` and `refunded`, so those could never be saved. Removed from the stats buckets, the client filter, the table, the details modal, the update modal and all three locale files (`en`/`fr`/`ar`), with `cancelled` added. `UpdateStatusModal` also stopped writing a `completed_at` column that does not exist (that alone made every status update fail with `42703`). **Verified, not assumed:** changing a live order `pending` → `completed` through the dropdown persists (REST reads back `completed`) and the stat cards move `COMPLETED 2 → 3`. `tsc --noEmit` = 0 |
| 8.aa.iii | Web: the orders stats are horizontal on desktop and a 2x2 grid on small screens | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28.** Person, verbatim: "The stats section should be horizontal, and the 2x2 grid on small devices." The grid is `repeat(4, minmax(0,1fr))` — one horizontal row that always fits — collapsing to 2x2 at ≤1023px, matching the pattern set by 8.x/8.z. **Verified, not assumed, in headless Chromium signed in as a real reseller store (`rw`/Simi):** computed `grid-template-columns` is 4 tracks at 1280px and 2 at 320/390/767/768px, with zero horizontal overflow. `tsc --noEmit` = 0 |
| 8.aa.iv | Web: on small screens the order list is a compact row with a tap-to-open dropdown | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28.** Person, verbatim: "The order list should have the drop-down just like customers page, the details of the orders will be soon seen in the drop down." Below 768px the desktop table is hidden and a `.orders-mobile-only` list shows plan + customer + amount + status per row; tapping the row expands a `.order-details` panel with order id, profit, payment method and date, plus an **Update Status** action for pending orders (the same single-open accordion as customers). **Verified, not assumed:** at 390px the mobile list shows 5 rows and the table is hidden; tapping the first row reveals 4 detail rows and the Update Status button; opening a second row closes the first (`aria-expanded` flips); at ≥768px the desktop table shows and the mobile list is hidden. `tsc --noEmit` = 0 |
| 8.aa.v | Web: `OrderDetailsModal` shows only real fields | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28.** Rewritten to the live columns (reference, plan, payment method, customer, amount, profit, created/updated) — the phantom `order_number`/`plan_category` sections are gone. **Verified, not assumed:** the View modal renders `Order Details / Order #ORD-1A6F77 / Pending / TOTAL FRw 15,000 / PROFIT +FRw 2,100 / … / Payment Method airtel-rw / Customer exploit7492` with no console errors. `tsc --noEmit` = 0 |
| 8.aa.vi | Web: **BUG FIX (blocking)** — `global_orders` had RLS on with **no policies**, so every reseller saw zero orders | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28.** Found while verifying 8.aa.iii/iv: the page rendered "No orders yet" and 0 in every card despite the rows existing. Root cause proven against the live DB (project `jjyyfaxcwanrmiipzkoj`): `pg_class.relrowsecurity` is true for `global_orders` but `pg_policies` returns **no rows**, and the standard table grants are present — so Postgres denies by default and a signed-in reseller's SELECT (and the browser-client UPDATE used by the update modal) both returned nothing. `global_customers` was unaffected because it has its four owner policies, which is exactly why the customers page worked and orders did not. Fix: `supabase/migrations/20261028_global_orders_rls_policies.sql` adds owner-scoped **SELECT** and **UPDATE** policies (`auth.uid() IN (SELECT auth_user_id FROM global_reseller_applications WHERE id = global_orders.reseller_id)`), mirroring the customers policies; INSERT/DELETE are deliberately not granted (orders are created by the purchase RPC/service role, and resellers must not delete them). **Verified, not assumed:** applied live, the same signed-in session that read `[]` now reads all 5 orders; the stat cards read `TOTAL ORDERS 5 / COMPLETED 2 / PENDING 2 / TOTAL REVENUE FRw 12,700`; and a status update through the UI persists. |
| 8.aa.vii | Web: 5 test orders seeded for the Simi store so the page can be seen with data | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28.** Person, verbatim: "Insert 5 test orders to Simi store so we can see how it looks like." Inserted 5 rows into `global_orders` for `reseller_id a545e62b-…` (Simi, `rw`) against the store's 4 real customers, with mixed statuses (2 completed, 2 pending, 1 failed), varied `payment_method` (`mtn-rw`/`airtel-rw`), realistic FRw amounts/profits, `transaction_reference`s (`ORD-…`) and staggered `created_at` (9d/6d/2d/1d/3h ago). **Verified, not assumed:** read back through the signed-in page — all 5 rows render with the totals above. |

| **8.ab** | **Orders page refinements: smaller stats, icon-only View, mobile dropdown reorg, status audit trail (person-filed 2026-10-28)** | | ✅ | — |
| 8.ab.i | Web: the orders stat cards are smaller and stay four-across on desktop/large devices | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`cf90ed8`). Person, verbatim: "the stats box should be smaller, all four boxes should be in a horizontal layout on desktop devices and large devices." Root cause of the earlier mis-flip: the dashboard sidebar is a fixed 240px, so a 1024px **viewport** leaves only ~736px of **content** — a viewport media query could not see that. Replaced with a **CSS container query** on a `.orders-stats-wrap` (`container-type: inline-size`); the 2x2 collapse is now keyed to the content column (`@container (max-width: 600px)`), not the viewport. Card padding/font stepped down (card height 96px → 79px). **Verified, not assumed, in headless Chromium signed in as `rw`/Simi, sweeping 320–1600px:** 4 tracks down to a 612px container and 2 below it; zero horizontal overflow and zero card clipping at every width. `tsc --noEmit` = 0 |
| 8.ab.ii | Web: the order listing View action is the eye icon only, no text | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`cf90ed8`). Person, verbatim: "since the eye icon is there no need for the text 'view'." The desktop row action is now the `Eye` icon alone; `aria-label`/`title` "View" is retained so it is still announced. **Verified, not assumed:** the first desktop row's button `innerText` is `""` while its `aria-label` is `View`, at 1024/1280/1600px. `tsc --noEmit` = 0 |
| 8.ab.iii | Web: on small screens customer and amount move into the order dropdown | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`cf90ed8`). Person, verbatim: "From the order listing on smaller devices customer and amount should also be added to the drop-down." The collapsed mobile row is now plan name + status only; customer and amount render inside the tap-to-open `.order-details` panel, above order id / profit / payment / date. **Verified, not assumed, at 390px:** the collapsed row reads exactly `Airtel 20GB Monthly Pending` and opening it shows `Customer / Amount / Order ID / Profit / Payment Method / Date` in that order. `tsc --noEmit` = 0 |
| 8.ab.iv | Web: an audit trail records who changed an order's status, from what, and when | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`cf90ed8`; migration `supabase/migrations/20261029_global_order_status_history.sql`). Person, verbatim: "Include audit trail on who changed order status." New append-only `global_order_status_history` table (one row per transition) plus an `AFTER INSERT OR UPDATE OF status` trigger on `global_orders`. The trigger function is `SECURITY DEFINER` with a pinned `search_path`, so it writes past RLS while `authenticated` is **not** granted INSERT — the client can read the log but never forge it. `changed_by` is `auth.uid()` and `changed_by_email` a display snapshot resolved from `auth.users`. Read policy is owner-scoped, mirroring the `global_orders` policies. Rendered by a shared `OrderStatusTimeline` in both the mobile dropdown and `OrderDetailsModal`. **Deliberate non-goal:** existing orders are **not** backfilled — their real transitions were never recorded, so inventing `created → <current>` rows would misrepresent history. **Verified, not assumed, end to end:** a `pending` → `completed` change made through the signed-in UI writes one row (`from_status pending`, `to_status completed`, `changed_by_email greengale+4+reseller-rw-simi-ofuwm@maxxspace.com`) and the dropdown then reads `STATUS HISTORY · Pending → Completed · <email> · Oct 28, 2026, 05:55 PM`; the trigger was also exercised in a rolled-back transaction. The verification-generated row was deleted afterwards and the seeded order returned to `pending`, so no synthetic audit rows remain. `tsc --noEmit` = 0 |

| **8.ac** | **Plans page listing: instant toggle + mobile name/toggle-with-dropdown (person-filed 2026-10-28)** | | ✅ | — |
| 8.ac.i | Web: toggling an individual plan applies instantly, without a page reload | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`17fa36f`). Person, verbatim: "plans listing: toggling an individual plan needs a page reload before it displays, it's supposed to toggle instantly." Root cause proven against the live `rw`/Simi store, not guessed: a plan with **no `global_reseller_plan_configs` row** is treated as disabled everywhere (the storefront catalog is strictly opt-in, so the toggle reads `config?.enabled === true`), and the MTN network carries **100 active plans but only 3 config rows**. For the other 97, both the optimistic update and the server-reconcile wrote `config: p.config ? {...} : null`, so the write was a **no-op** and the switch only moved after a reload. Confirmed by instrumenting a real click: the DB gained the config row (`enabled=true`) while the UI stayed OFF. Fix: the optimistic update now builds the row `togglePlan` is about to create (same default markup and selling price the server seeds), so the switch has a real object to flip; a failure rolls back to the exact previous config instead of leaving a phantom one. **Verified, not assumed:** with every server action delayed 3s the switch paints ON at **~120ms** (genuinely optimistic, not waiting on the server); ON survives a reload and OFF survives a reload; `aria-pressed` tracks the state. `tsc --noEmit` = 0 |
| 8.ac.ii | Web: on mobile the plan list shows name + toggle only, the rest behind a tap-to-open dropdown; toggling opens the dropdown | 🤖 | ✅ | **DONE + VERIFIED 2026-10-28** (`17fa36f`). Person, verbatim: "On mobile the plan list should show name + toggle button, rest in a drop-down; toggling a plan opens the drop-down." Below 768px the card collapses to plan name, status badge, toggle and a chevron; the cost price, markup, selling price and profit move into a panel that opens on tap **and also opens when the toggle is used** (the toggle is `stopPropagation`-ed so it does not double-toggle the accordion). The desktop card is **unchanged** — the details wrapper is `display: contents` above the breakpoint, so its layout is byte-identical and no chevron renders. Single-open accordion, keyboard-operable (Enter/Space, `aria-expanded`), `aria-label`/`aria-pressed` on the toggle; `enablePlan`/`disablePlan` keys added to all five `plans` locale files. **Verified, not assumed, in headless Chromium at 320/390/414/600/767/768/1024/1280/1440px:** below 768px the collapsed row reads exactly `Airtel Airtime 10,354 RWF Inactive` (details and cost-price line hidden, chevron shown); tapping the name expands to add `Cost Price / Markup / Your Price / Profit`; tapping the toggle both flips it and opens the panel; above 768px `display: contents` with no chevron and the full inline layout; zero horizontal overflow at every width. Test-created config rows were deleted afterwards and the seed restored to 15 rows. `tsc --noEmit` = 0 |


## Critical path

```
8.a.iii.zq (catalog e2e)  ──►  8.c.i (purchase repoint)  ──►  8.d.ii (APK)
        │                              ▲                            ▲
        └──►  8.a.ii.zi→zp (functions) ─┘   [wallet must exist]     │
                        │                                          │
                        └──►  8.a.ii.zq (app identity/money) ──► 8.c.ii
                                                                   │
8.d.v (web → production)  ─────────────────────────────────────────┘  DONE (PR #25 → main 50e2b7c)
        [the APK build fetches its config from the deployed web, so this
         is now a hard prerequisite for 8.d.ii → 8.a.iii.zr]
8.d.vi (fix config-route select)  ─────────────────────────────────────────────────────────
        [the APK build fetches its config from the deployed web; the route must
         stop selecting non-existent columns, else 8.d.ii → 8.a.iii.zr stays blocked]

8.b (presentation) can proceed in parallel once 8.b.i shape is picked.
8.c.iii is blocked on Blocker 2 and is NOT on the critical path.
```

## Detailed cards

### 8.a.i — Store & country context ✅

Done and needs nothing further. `src/actions/reseller/build/triggerAppBuild.ts`
writes `resellerId` + `countryCode` into the build config; the config API echoes
`countryCode`; `scripts/generate-global-reseller-assets.sh:68` writes the whole
response to `reseller-config.json`; `app.config.ts` spreads it into
`extra.resellerConfig`; `store/resellerStore.ts` reads it. Verified against live
`global_reseller_app_configs` rows (every config carries both fields).

### 8.a.ii — Customer identity & money reads ⬜

The app authenticates as a **customer** with the **publishable key**, and every
`global_*` SELECT policy is scoped to the reseller owner, so a customer session
reads nothing. Each of these reads must become a function that reads with the
service role, using the identity branch already proven in
`_shared/purchaseOrchestrator.ts` (owner = `global_reseller_applications` by
`(id, auth_user_id)`; customer = `global_customers` by
`(reseller_id, auth_user_id)`).

| New function | Replaces (app) | Reads |
|---|---|---|
| `global-store-customer-context` | `hooks/useProfiles.ts`, `useTransactionPin.ts` reads, `login`/`register` customer lookups | `global_customers` (own row) |
| `global-store-wallet` | `hooks/useWallet.ts`, `hooks/useVirtualAccounts.ts` reads | `global_customer_wallets`, `global_customer_virtual_accounts` |
| `global-store-transactions` | `hooks/useTransactions.ts` | `global_customer_transactions` (+ `global_orders`) |

**Invariant to preserve:** these functions return only the caller's own rows.
Resolve identity from `auth.uid()`, never from a request-supplied id.

### 8.a.iii.zq — Scripted e2e ✅ (ALL PASS)

Ran the live function's response through the exact filter/map from
`hooks/useDataPlans.ts` and asserted the shape `PlanCarousel` consumes, for a
NG store and a GH store, plus negatives:

- **roseline (NG)** — 7 plans; filter by MTN/AIRTEL/9MOBILE returns 4/1/2,
  price-sorted; an absent network (GLO) yields `[]`.
- **marcel-data (GH)** — 6 plans; filter by AirtelTigo/MTN returns 2/4. No
  cross-country leakage.
- **shape** — every plan: `plan_id` str, `price` number, `name` str, `validity`
  str-or-absent. No `base_price`/`markup`/`selling_price`/`currency` anywhere.
- **negatives** — unknown `resellerId` → 200 with empty plans; missing → 400.

**Finding (data, not code): GH base plans have no `validity`.** The 6
`marcel-data` plans carry `data_amount` (e.g. "1GB") but no validity string,
while NG plans do. The carousel renders an empty validity node rather than
crashing — which is exactly why `DataPlan.validity` is optional. Worth a
decision later: should the GH (and other-country) plans get a validity value, or
should the carousel fall back to `data_amount`? Not a blocker.

This is a **weaker** check than a device run: it exercises the real function
response and the real hook logic, but not the React Native render or the
signed-in session path. The device run remains as `8.a.iii.zr`.

### 8.a.iii.zr — Device e2e ⬜ (person)

Confirm the storefront lists plans for a store that has toggled plans ON, both
signed-out and signed-in. Needs a build whose `reseller-config.json` has a real
`resellerId` (e.g. `roseline`/ng or `marcel-data`/gh) and the app pointed at
project `jjyyfaxcwanrmiipzkoj` (`EXPO_PUBLIC_BIMBO_SUPABASE_URL`,
`..._PUBLISHABLE_KEY` — not in the repo). If a device run isn't practical, a
scripted check that feeds the function's real response through the hook's
filter/map is the weaker fallback.

### 8.b.i — Country config port ⬜ (shape decision needed)

The web already has the data: `src/config/countries/*` defines `CountryConfig`
(currency, `currencySymbol`, `locale`, `phoneNumber.min/maxDigits`, `telecoms[]`,
timezone) for 20 `SUPPORTED_COUNTRIES`. **Open question for the person:** port it
as (a) a bundled TS module in the app (simple, needs a release to change
countries), or (b) fetched from a web endpoint at runtime (flexible, adds a
dependency). Recommend (a) to start — it mirrors the web file and needs no new
API surface.

### 8.c.i — Purchase repoint ⬜

**This is the known break.** The catalog now returns
`global_base_plans.provider_plan_id` values, but `hooks/usePurchaseVTU.ts` still
calls the legacy `purchase-data`/`purchase-airtime` functions with `storeSlug`.
It must call `global-purchase-data`/`global-purchase-airtime` with
`{ resellerId, planId, phoneNumber, transactionPin, userId }` (the shape
`global-store-catalog` and `purchaseOrchestrator` already expect). **Until this
lands, browsing a catalog works but buying fails.**

## Blockers

| # | Blocker | Impact | Resolution options |
|---|---|---|---|
| 2 | ~~**No `global_*` notifications table**~~ **RESOLVED** — migration `20261015_create_global_notifications.sql` adds `global_notifications` + `global_customer_notifications` + push-token columns | 8.c.iii done (migration applied live) | (a) chosen |
| 3 | ~~**The web has never been deployed to production.**~~ **RESOLVED (2026-10-17)** — PR #25 merged the branch to `main` (`50e2b7c`) and Production deployment `7145175251` succeeded. Originally: Vercel showed 100 deployments, all `Preview`, zero `Production`; `edges-landing-page.vercel.app` serves a stale `main` lineage (`57b3d1c`) that predates Tasks 4–8, so every Task 4–8 route 404s — including the config API the APK build fetches. | Blocks the APK build (`8.d.ii`) → device e2e (`8.a.iii.zr`); also the cause of Task 7's webhook 404 | (a) promote a preview of `handover/supabase-dump` to production + set the mobile `API_URL` secret to that host; (b) merge `handover/supabase-dump` → `main` and let Production build. **Person/Vercel-dashboard step** — no `VERCEL_TOKEN` in the sandbox. |
| 4 | ~~**Config route selects columns that do not exist.**~~ **RESOLVED (2026-10-17)** — fixed in `e9e7a6b`. Originally: `src/app/api/reseller/[countryCode]/config/[configId]/route.ts:25` selects `apk_url, aab_url` off `global_reseller_app_configs` (which lacks them; they are on `global_app_builds`), so PostgREST returns `42703` and the route maps any error to its 404 branch. | Blocks the APK build (`8.d.ii`) → device e2e (`8.a.iii.zr`) even now that production serves the branch | (a) drop `apk_url, aab_url` from the select + the `fullConfig` echoes — no caller reads them from this endpoint (the build script uses storeName/appName/theme/assets; the app reads neither; the real APK-URL source is `global_app_builds`, which the storefront already queries). Legacy carry-over: the old `reseller_app_configs` had these columns, the global table does not. (b) if a consumer ever needs them here, source them from `global_app_builds` by `application_id`. Agent fix. |
| 5 | ~~**Asset script uses a shell variable as a jq variable.**~~ **RESOLVED (2026-10-17)** — fixed in mobile `462fa82`. `scripts/generate-global-reseller-assets.sh:72` ran `jq -r '.appName // .config.appName // $STORE_NAME'`: `$STORE_NAME` is a **shell** variable, but inside the single-quoted jq program jq parses it as an (undefined) **jq** variable, which is a *compile-time* error — so the script aborted with `jq: error: $STORE_NAME is not defined` even though `.appName` exists. Latent since `13d7123` (2026-07-21) because the config fetch failed first (Blockers 3/4) and this line was never reached. Fix: pass the fallback via `--arg fallback "$STORE_NAME"`. | Blocked the Roseline APK build (`8.d.ii`) the moment Blocker 4 was fixed | Agent fix (one line); verified against the live production response (`STORE_NAME=roseline`, `APP_NAME=Roseline`). |
| 6 | ~~**Build webhook resolves the wrong id — success callbacks 500.**~~ **RESOLVED (2026-10-17)** — fixed in web `5cf4d2b` (merge + deploy pending). The APK workflow posts the **config** id as `buildId` (its only id input is `config_id`; it never learns the build row id), but `src/app/api/reseller/[countryCode]/webhooks/build/route.ts` looked that value up in `global_app_builds.id`. The ids differ, so every callback matched nothing, `.single()` raised `PGRST116`, and the route returned 500 `Failed to update build status`. Observed live: run `39089167745` built + uploaded `roseline.apk` yet the success callback 500'd and `global_app_builds` stayed `building`. Fix: resolve with `or(config_id.eq.<id>, id.eq.<id>)` so both callers work; distinguish not-found (404) from a real fault (500); validate the UUID shape. | Silently breaks the whole build-status pipeline (dashboard status, APK install banner, "built" application status, build-complete email) even though the APK itself is fine | Agent fix (web); verified against live data. The legacy workflow sent `configId` and the legacy route read `config_id` — the mismatch came in with the global rewrite. |
| 7 | ~~**Two silent failures in the build-complete path.**~~ **RESOLVED (2026-10-17)** — fixed in web `c16a34d` (merge + deploy pending). (a) `android_app_status` **does not exist** on `global_reseller_applications` (nor in the schema or any migration); the build webhook and `completeBuild.ts` both set it fire-and-forget, so PostgREST’s `42703` was swallowed and no record that a build finished was ever written. No reader consumes it — the table exposes the `android_app` boolean. Removed both writes. (b) `supabase.functions.invoke` returns `{ error }` rather than throwing, so the build-complete email failed silently against `send-app-build-complete`, which is **not deployed** (404). Now logged, kept non-fatal. | Both are invisible failures that made a working build look broken and hid the email step | Agent fix (web); found by watching run `39095674274` end to end. |
| 8 | ~~**Build dispatch pinned to the handover branch.**~~ **RESOLVED (2026-10-17)** — fixed in web `38805a0` (merge + deploy pending). `BUILD_WORKFLOW_REF` was hardcoded to `"handover/supabase-dump"` in both dispatch paths (`actions/reseller/build/triggerAppBuild.ts`, used by `submitApplication`, and the legacy `app/actions/reseller/triggerAppBuild.ts`), so a reseller submitting from the web built the handover branch rather than `main`. The surrounding comment already said to revert to `main` once everything was merged — never done. The constant is the *mobile* repo’s build source, not this web repo’s branch. Set both to `"main"`. | The reported symptom: a web submission "builds but not on the main branch" | Agent fix (web); both files parse, no other ref pins a branch. |
| 9 | ~~**Build-complete email invoked a function that does not exist.**~~ **RESOLVED (2026-10-17)** — fixed in web `9721e0a` (merge + deploy pending). The webhook called `supabase.functions.invoke("send-app-build-complete")`, but no such function is deployed (404). The legacy flow sent this exact email from the app’s own mailer (`notifyBuildComplete.ts`); the global rewrite replaced it with the invoke and dropped the mailer call. Now sent from the app mailer again — the app already owns the transport and credentials, so no new function or deploy is needed. Best-effort and non-fatal, after the status row is written. | No build-complete email ever reached the reseller | Agent fix (web); the route now bundles cleanly with the project tsconfig, so the mailer import resolves. |

Blocker 1 (customer cannot read `global_*` under RLS) is **resolved by Option B**.

## Person-only manual steps (roll-up)

**The remaining person steps (the last three rows below, plus `8.d.iii`) are
parked for project completion** — the person confirmed they will be handled
then, so they are recorded in `HANDOVER.md` under
**"Project-completion stage — deferred items (decided by the person)"**
alongside the database-password rotation. Do not re-flag them mid-task.

| Step | When | Command / action |
|---|---|---|
| ~~Apply the 1 web patch + 1 mobile patch, push~~ | **DONE** | both landed on origin (`8bc1c00` / `fe92bb2`) |
| ~~Apply the notifications migration (Ubuntu, direct psql)~~ | **DONE** | `20261015_create_global_notifications.sql` applied (tables + columns return 200) |
| ~~Deploy the new `global-store-*` functions~~ | **DONE** | all 10 deployed `--no-verify-jwt` + live-verified |
| ~~Deploy the web to production~~ (`8.d.v`) | **DONE** | PR #25 merged `handover/supabase-dump` → `main` (`50e2b7c`); Production deploy `7145175251` success |
| ~~Merge the `8.d.vi` fix to `main`~~ | **DONE** | PR #26 merged `handover/supabase-dump` → `main` (`f842969`); Production deploy `7145723808`; prod config endpoint 200 |
| ~~Merge mobile to `main`~~ (`8.d.viii`) | **DONE** | PR #6 → `64303e1`; `main` is now the correct build source |
| ~~Dispatch the Roseline APK build~~ | **DONE** | run `39089167745` on `462fa82`; config fetch + assets + secrets pass, APK building |
| ~~Deploy the Blocker 6 webhook fix~~ (`8.d.ix`) | **DONE** | `5cf4d2b` is live in Production; callback returned `{"success":true}` |
| ~~Merge PR #29~~ (`8.d.x`) | **DONE** | merged `bcf4db3`; Production deploy success |
| ~~Confirm the fixes live~~ (`8.d.xi`) | **DONE** | web submission dispatched from `main`; build-complete email arrived (2026-10-20) |
| ~~Deploy the two changed edge functions~~ | **DONE 2026-10-22** | both `global-store-customer-auth-email` and `global-store-fund-wallet` at **v5**, `--no-verify-jwt`, from a `handover/supabase-dump` checkout; live-verified |
| ~~Merge `e4e36ae` + `5ee2f54` to `main`~~ | **DONE 2026-10-22** | PR #32 → `main` = `72faffe`; clean merge, tree byte-identical to the branch tip; Vercel Production built from `72faffef` and is `READY` |
| ~~**One non-NG fund attempt on Production**~~ (`8.g.ii` / `8.e.iii`) | **DONE 2026-10-24** | three non-NG fund attempts from the app (kesh-data/`ke`/`KES`, sweet-data/`cm`/`XAF`, kwam-two/`gh`/`GHS`) returned live Korapay checkout URLs + `pending` rows. The `403 invalid authorization key` is gone (a 403 writes no row). **Bug B closed.** |
| **Complete one non-NG mobile-money checkout** (`8.f.ii`, person) | **now — the last unexercised leg** | pay one of the pending Korapay checkouts (e.g. the `kesh-data`/`KES` one) with a real mobile-money number and confirm the webhook credits `global_customer_wallets` (balance moves off `0.0`, row leaves `pending`). This also unblocks the signed-in purchase test |
| **Storefront fund on web — check on a phone browser** (`8.l` / `8.m`, person) | **now — no APK needed** | sign in to a store (`/gh/kwam-two` etc.), open the drawer on a narrow viewport, and confirm the wallet row appears and the fund flow completes. Both causes are fixed and verified in-browser already; this is the phone confirmation |
| ~~Fix web 8.e.ii (currency symbol map)~~ | **DONE 2026-10-22** | `18e7644` — `CDF` added, `MAD` corrected, guard test added; on `main` via PR #33 → `0570bcc` |
| ~~Fix mobile `setupCustomerForReseller` row shape~~ | **DONE 2026-10-22** | `31b3c6c` — sends `original_email` as `email`; on mobile `main` via PR #8 → `501eff9` |
| ~~Merge the full-Task-8 work to `main`~~ | **DONE 2026-10-22** | web PR #33 → `0570bcc` (Production `READY` from `0570bcc`); mobile PR #8 → `501eff9`; both dry runs clean, trees byte-identical to the branch tips |
| **Device/APK test for `ng` + `gh` + `ke`** | after build | install the release APK; browse + buy (`8.a.iii.zr`); the `kesh-data` (ke) APK is the 8.f.ii gateway-leg vehicle |
| ~~Re-merge mobile `462fa82` to `main`~~ | **DONE** | PR #7 → `72d9b8d`; `main` line 72 now uses `--arg fallback` |

## Delivery

### ✅ Web — LANDED

Web (`Edges-Enterprise/Edges_LandingPage`, `handover/supabase-dump`) is
**pushed and current**. Origin tip is now `8bc1c00` (= `be040bb` + the
2026-10-17 doc refresh, tree `5bd5390…`); all prior patches landed
(verified by patch-id match): the `global-store-catalog` function, the deploy +
live-verify docs, and this board. Local tree == origin tree. Nothing to apply.

| Patch | Landed as | sha256 |
|---|---|---|
| `edges-task8-catalog-deployed.patch` | `6551097` | `62806ae2315f5a3ce44f71fc86ac32f52c01690cd19c7d373d5c5baed2d476d0` |
| `edges-task8-app-wired.patch` | `fdf48fa` | `9f50e5f6f165778d06391001b0703bd58833e2bd6d0789b200da9253dfbf6d4a` |
| `edges-task8-board.patch` | `ed325c3` | `8e279418623c91f490305f5ceba793e88cf4f99dea18cae1d9baefff07e3998e` |
| `edges-task8-doc-refresh.patch` | `8bc1c00` | `cd021e54cc078ce802203bf4095063a8860eddce04246792b4ec0a6eb661c3d1` |
| (doc commit, this session) | `9be9e80` | tree `df437711…` |

**Deployed to production? YES (2026-10-17).** PR #25 merged `handover/supabase-dump`
into `main` (`50e2b7c`) and Production deployment `7145175251` succeeded; the
storefront routes now answer on `edges-landing-page.vercel.app`. The config route
is deployed but fails internally — see Blocker 4.

### ✅ Mobile — LANDED

Mobile (`Erudite885/reseller-app`, `handover/supabase-dump`) — pushed. Origin
tip is now `fe92bb2` (tree `e4216570…`, matches local); the catalog-read change
is present by patch-id. **The 8.a.iii.zq blocker is cleared** — the storefront
now reads the function on this branch. The workflow on this branch carries the
Node 22 fix (CI-confirmed 2026-10-17).

| Patch | Landed as | sha256 |
|---|---|---|
| `reseller-app-task8-catalog-read.patch` | `d923185` | `72e7636da11d82f2e66715ec406659e106c4ce3579cb381f3e4895e0e3079e73` |

### ✅ Task 8 full agent work — LANDED (2026-10-17)

The full agent work is on origin on both repos; nothing is left to apply.

| Repo | Branch tip | Tree | Content |
|---|---|---|---|
| `Edges-Enterprise/Edges_LandingPage` | `9be9e80` (merged to `main` as `50e2b7c`) | `df437711…` | 10 `global-store-*` functions, `_shared` helpers, `constants/countryConfig.ts`, de-hardcoded presentation, `usePurchaseVTU` repoint, migration `20261015_create_global_notifications.sql`, board, 2026-10-17 doc refresh |
| `Erudite885/reseller-app` | `778e937` | tree `…` | app moved onto the `global_*` model: catalog via `global-store-catalog`, identity/money/notifications hooks on the `global-store-*` functions, country presentation, build-pipeline doc correction |

The earlier `be040bb` tip was the code commit; `8bc1c00` adds the doc refresh on
top. Local sandbox commits `370a411` / `87dab5b` are content-identical (same
trees); no divergence from origin.

**Applied / deployed / verified live (2026-10-17):**

- Migration `20261015` is **applied**: `global_notifications` and
  `global_customer_notifications` return HTTP 200 via service-role REST;
  `push_token` exists on both `global_reseller_applications` and
  `global_customers`.
- All **10 edge functions deployed** with `--no-verify-jwt`, live-probed with
  the publishable key: `global-store-catalog` → 200 (7 NG plans);
  `global-store-customer-auth-email` → `{"success":true,"authEmail":null}`;
  identity functions (`-customer-context`, `-wallet`, `-transactions`,
  `-notifications`, `-notifications-settings`, `-register-customer`) → 401
  `Invalid authorization token` with no JWT; field-validation
  (`-pin`, `-update-profile`) → 400.

### ⬜ Remaining — fix the config route (`8.d.vi`), then APK + device e2e

**`8.d.v` is DONE** (see Blocker 3): PR #25 merged `handover/supabase-dump` into
`main` (`50e2b7c`) and the Production deployment succeeded. The Roseline build
was dispatched this session (run `39058017316`) and cleared "Setup Expo" +
"Install dependencies", then failed at "Generate global reseller assets" because
the config route errors internally (Blocker 4): it selects `apk_url, aab_url`
off `global_reseller_app_configs`, which has no such columns.

1. **Fix the route** (`8.d.vi`, agent): drop `apk_url, aab_url` from the
   `.select()` and the two `fullConfig` echoes. Then merge to `main` so
   production serves it (or dispatch the build from the branch).
2. **Re-dispatch the Roseline build:**

```bash
gh workflow run build-global-reseller-apk.yml \
  --repo Erudite885/reseller-app --ref handover/supabase-dump \
  -f reseller_id=586de786-872c-42c7-af3e-aa5385610ae3 \
  -f config_id=330e68c4-af17-4a57-be7e-76f67bf0f492 \
  -f store_name=roseline -f country_code=ng -f environment=production
```

Watch for a `ng-roseline-330e68c4-<timestamp>` release in
`Erudite885/tenant-distribution`.

**Caveat:** the workflow callback POSTs to
`$API_URL/api/reseller/ng/webhooks/build`; that route is now deployed (405 on
GET = present), so a completed build should update the DB row — but still judge
by the `tenant-distribution` release.

## Progress summary

| Branch | Done | Total | State |
|---|---|---|---|
| 8.a.i | 2 | 2 | ✅ complete |
| 8.a.ii | 5 | 5 | ✅ complete (deployed + live-verified) |
| 8.a.iii | 4 | 5 | 🔄 device e2e: signed-in **catalog browse** works (four APKs tested); signed-in **purchase** still unproven (no order rows; needs a funded wallet) |
| 8.b | 6 | 6 | ✅ complete |
| 8.c | 3 | 3 | ✅ complete |
| 8.d | 10 | 14 | 🔄 Blockers 5–9 fixed, merged (`bcf4db3`) and deployed; device e2e catalog half PASSES |
| 8.e | 7 | 7 | ✅ complete (8.e.ii web half fixed; **8.e.iii CLOSED 2026-10-24 — the non-NG fund path is proven live on the gateway**) |
| 8.f | 3 | 3 | ✅ complete (8.f.iii shipped the `kesh-data` APK; **8.f.ii gateway leg PROVEN LIVE 2026-10-24** — three non-NG fund attempts from the app returned live Korapay checkouts. Only the post-checkout **webhook → wallet credit** leg remains unexercised) |
| 8.g | 3 | 3 | ✅ complete — bug A + bug C fixed and deployed; **bug B (8.g.ii) CLOSED 2026-10-24, proven live from the app** |
| 8.h | 4 | 4 | ✅ complete — pawns module + consent gate + bandwidth section removed from the app; the AAB is built beside the APK and **proven live** (4 stores built 2026-10-22, each release carrying `.aab` + `.apk`, both URLs persisted to `global_app_builds`) |
| 8.i | 2 | 2 | ✅ complete — **owner login on mobile fixed, deployed (edge fn v6) and live-verified; fresh APKs for all four test stores built from the fix commit (`aeb8dea`) and published, fix confirmed present inside each shipped bundle** (2026-10-24) |
| 8.j | 2 | 2 | ✅ complete — **8.j.i code done + verified + corrected (`725fff9`), and 8.j.ii shipped: `handover/supabase-dump` merged into `main` (mobile `1d8465b`, web `fdab108`) and the four test-store APKs rebuilt from `main` (`40222128214`/`40222129764`/`40222131711`/`40222133318`, all green, `head_sha` `1d8465b`) and published with both the full-form detection and the 8.i resolver present in the shipped bundles** (2026-10-25) |
| 8.k | 2 | 2 | ✅ complete — **8.k.i code done + verified (`8b18d03`): the Korapay/Flutterwave checkout renders in an in-app WebView sheet instead of the OS browser, and 8.k.ii shipped: merged to `main` (`814b0fd`) and the four test-store APKs rebuilt from `main` (`40280088780`/`40280090379`/`40280091941`/`40280093608`, all green, `head_sha` `814b0fd`) and published with the in-app markers present and `openBrowserAsync` absent** (2026-10-26) |
| 8.l | 2 | 2 | ✅ complete — **the storefront "Customer record not found" is fixed (`9b8a36b`): the three customer actions read the customer row through the service-role client past the owner-only `global_customers` RLS policy, and `useStoreCustomerAuth` now detects the owner by `store_slug`** (2026-10-26) |
| 8.m | 1 | 1 | ✅ complete — **the storefront mobile drawer now carries a wallet row, so the wallet is reachable on a phone (`9b8a36b`); person-side phone check outstanding** (2026-10-26) |
| 8.n | 2 | 2 | ✅ complete — **`8.n.i`: the fund path no longer surfaces Korapay's "authorization token is invalid"; a blank gateway secret now reads "Payment provider is not configured" (`4f792bc`). `8.n.ii`: root-caused definitively — the keys were set but scoped to the Vercel `production` target only, so every preview deployment had no key; the six payment variables now also target `preview` (values preserved), verified by running code in each environment, and the error now names the environment (`5cd2383`, `1942c2f`)** (2026-10-26) |
| 8.o | 1 | 1 | ✅ complete — **the dashboard shell no longer overflows horizontally on phones: `min-width: 0` on the dashboard content column, header bar, `<main>` and `<header>` stops the nowrap greeting from setting a 666px floor; verified `scrollWidth == clientWidth` at 320–1024px on the store page, on all seven dashboard routes, and on all four store tabs** (2026-10-26) |
| 8.p | 1 | 1 | ✅ complete — **the storefront mobile-money input is now visible: it was `background: var(--bg-muted, #F9FAFB)` (white) with `var(--text)` (near-white) text, because `--bg-muted` is undefined and the storefront theme only overrides `div`, not `input`; it now uses the amount field's wrapper + transparent-input structure and matches it exactly** (2026-10-26) |
| 8.q | 3 | 3 | ✅ complete — **the dashboard stat grids are horizontal on phones: the Plans trio is always one row of three and the Customers quartet is one row of four at ≥1024px with a 2x2 fallback below (both were `auto-fit` and collapsed to a single column); customer labels shortened to Total/Active/New; and the storefront gained a signed-in profile page at `/[countryCode]/[storeName]/profile`, reachable from the header avatar and the mobile drawer, responsive 320–1440px for owner and customer alike** (2026-10-26) |
| 8.r | 3 | 3 | ✅ complete — **the storefront mobile drawer is role-aware (customer: Profile, Wallet, Notifications, light mode, Contact Store; reseller: Profile, Wallet, Dashboard, Notifications, light mode), owner detection compares `store_slug` instead of the editable display name, the drawer carries the `mobile-drawer` class its CSS targets, owner sign-out lands on `/[countryCode]/sign-in` (customer sign-out keeps returning to the storefront), and the header's Sign In button opens the auth modal in place with the owner sent to `/[countryCode]/dashboard` on success** (2026-10-26) |
| 8.s | 1 | 1 | ✅ complete — **a reseller signing in from the storefront now stays on the storefront (the 8.r owner redirect is removed), verified in the browser; the hook's `countryCode` argument and its only `router` use went with it (`2774623`)** (2026-10-27) |
| 8.t | 2 | 2 | ✅ complete — **the wallet and store dashboard pages no longer show a horizontal scrollbar: their nowrap action rows (wallet buttons + transaction filter chips; store "View Store" row + tab strip) now wrap, and the tab strip drops `overflowX: auto`; verified across 9 viewports (`abb69ea`)** (2026-10-27) |
| 8.u | 2 | 2 | ✅ complete — **the theme is now togglable from the Store > Theme tab (it wrote `data-theme` on `<html>`, which no stylesheet reads; it now calls `ThemeProvider.setTheme`) and from the sidebar footer (the header's toggle is hidden under 768px); verified in the browser (`8786ec7`)** (2026-10-27) |
| 8.v | 1 | 1 | ✅ complete — **the reseller sign-in page can server-render again: it read `window.location` during render (aborting SSR with "window is not defined"); it now reads the country from `useParams`, verified at 390px and 360px (`c7dcf7b`)** (2026-10-27) |
| 8.ab | 4 | 4 | ✅ complete — **the orders page refinements shipped: the stat cards are smaller and stay four-across on desktop (a container query replaces the viewport media query, because the fixed 240px sidebar made a 1024px viewport only ~736px of content), the View action is the eye icon alone, customer + amount moved into the mobile dropdown, and a status audit trail now records who changed an order's status and when (`cf90ed8`; migration `20261029_global_order_status_history.sql`)** (2026-10-28) |
| 8.ac | 2 | 2 | ✅ complete — **the plans listing now toggles instantly (a plan with no config row wrote `config: null`, a no-op, so the switch only moved after a reload — the optimistic update now builds the row `togglePlan` creates), and on mobile the card is name + toggle with the cost/markup/price/profit in a dropdown that opens on tap and on toggle; desktop is unchanged (`17fa36f`)** (2026-10-28) |

**Next atomic step:** none left in the defect batch — `8.g.ii`/`8.e.iii` are
**CLOSED** (the `403 invalid authorization key` is proven gone on the live
gateway from the app), `8.i` (owner login) is fixed and deployed, `8.j`
(number-first plan gating) and `8.k` (in-app gateway checkout) are **DONE and
shipped**, the two storefront items found while diagnosing the fund failure
(`8.l` RLS + owner detection, `8.m` mobile wallet reach) are **done in code**,
and the follow-on fund error (`8.n` "authorization token is invalid") is fixed
and diagnosed, the dashboard responsiveness defect (`8.o`) is fixed and
verified across widths, the follow-up layout/profile batch (`8.q`) is done and
verified in the browser, and the storefront drawer/sign-out/sign-in batch
(`8.r`) is done and verified in the browser. The follow-on person report
(`8.s` reseller sign-in stays on the storefront, `8.t` wallet/store scrollbars,
`8.u` theme toggles, `8.v` sign-in SSR) is done and verified in the browser
too. The remaining open work is verification, not code:

0. **Storefront fund on web (person, 8.l/8.m/8.n):** sign in to a store on a
   phone browser, open the drawer, and confirm the wallet row appears and funds
   end-to-end. This is the web storefront, so no APK is needed — the two causes
   are already fixed and verified in the browser here. The "Payment provider is
   not configured" leg is now **resolved**: the secrets were set for the Vercel
   `production` target **only**, so every preview deployment funded with an
   empty key; all six payment variables now also target `preview` (values
   preserved) and a fresh preview sees `KORAPAY_SECRET_KEY` (48 chars) and
   `FLUTTERWAVE_SECRET_KEY` (56 chars). Re-run on a **fresh** preview deployment
   (or the production URL) — the fund attempt should now reach the gateway. If
   the message still appears it now names the environment it came from, e.g.
   `Payment provider is not configured (preview).`

1. **Post-checkout funding leg (person):** the three fund attempts are still
   `pending` and every wallet is `0.0`, so no checkout was completed. Complete one
   real mobile-money payment on a non-NG store — now **inside the app** (8.k) —
   and confirm the Korapay/Flutterwave webhook credits the wallet. This is the
   last unexercised step of the fund flow, and the one 8.k makes reachable
   without the payer leaving the app.
2. **Signed-in purchase (`8.a.iii.zr`, person):** needs a funded wallet (i.e. #1
   first); `global_orders` is empty and there are no purchase rows yet.
3. **Install the 8.k rebuilds and confirm the checkout stays in-app (person,
   8.k.ii):** the four test-store APKs have been rebuilt from `main` (`814b0fd`)
   and published — see the 8.k.ii row for the release tags, SHA-256s and the
   Termux download commands. On-device, fund the wallet on a non-NG store
   (ke/cm/gh) and confirm the Korapay/Flutterwave checkout opens **inside the
   app** and returns to the wallet without ever leaving it.
4. **Install the 8.j rebuilds on a device (person, 8.j.ii):** the four test-store
   APKs have been rebuilt from `main` (`1d8465b`) and published — see the 8.j.ii
   row for the release tags, SHA-256s and the Termux download commands. On-device,
   confirm plans appear only after 6 digits, match the number's network, and that
   the trunk `0` is required (`0803…` resolves, `803…` does not). **Push note:**
   the four 8.k builds were dispatched from mobile `main` at `814b0fd`; a
   docs-only merge on top brings the current tip to `e1e4bbc` (identical tree,
   `656cfb0…`, so the shipped builds are unaffected). Mobile `handover/supabase-dump`
   is `85e4e0a`. Web `main` and `handover/supabase-dump` are kept in lockstep and
   carry the 8.k board + log entries (the exact tip advances with each docs
   commit, so read it from the branch rather than from here). All four refs are
   pushed. The session's `GITHUB_TOKEN` (account `Phoenix-Boss`) is denied
   `Contents: write` on `Erudite885/reseller-app` (`git push` → 403 "Permission …
   denied"; API ref-create → 403 "Resource not accessible by integration") even
   though earlier commits on this branch pushed, so its scope appears to have
   narrowed; `P_TOKEN` (full `repo` scope) pushed everything. Use a token with
   `Contents: write` for further pushes.
5. **Optional, new scope (not a Task 8 leaf):** the web storefront has no
   HTTP-reachable **customer** fund path (its only fund route is owner-only), so
   mobile is currently the only surface that can fund a customer wallet by mobile
   money.

`8.h` (2026-10-22 person request) is **complete and proven live**: the pawns
module, its consent gate and the bandwidth-sharing section are gone from the
mobile app, and the AAB is built beside the APK — confirmed by four real builds
(roseline, kesh-data, sweet-data, kwam-two; all green, every release carrying both
artifacts, both URLs persisted). The four dispatches were person-approved and also
closed `8.d.ii`'s `gh` leg.

Also settled this session: the **legacy `reseller_app_configs` table is not in
use** (person-confirmed, and the evidence agrees — last write 2026-10-07 vs
`global_app_builds` 2026-10-21; legacy workflow last run 2026-10-07 vs the global
one's 2026-10-21). The `aabUrl` log-only branch I had added to the legacy
`api/build-webhook/route.ts` was therefore reverted as a half-measure, so there is
no outstanding schema decision on that table. Everything on the code and config side is
now done: both edge functions are at **v5** and live-verified, `KORAPAY_SECRET_KEY`
is present in the Production env with a provably non-empty value, and Production
serves the bug A + bug C fixes (PR #32 → `72faffe`, PR #33 → `0570bcc`).

What remains needs a person, because it is a real payment:

1. **The gateway leg is now DONE** (2026-10-24): the four built apps were tested
   on a device, and three non-NG fund attempts from the app returned live Korapay
   checkout URLs + `pending` rows (`KES`/`ke`, `XAF`/`cm`, `GHS`/`gh`). The `403
   invalid authorization key` is gone — it writes no row, and rows now exist.
2. **What is still unexercised is the *post-checkout* leg.** All three rows remain
   `pending` and every `global_customer_wallets.balance` is `0.0`, so no checkout
   was completed and the Korapay **webhook → `handleSuccessfulCustomerDeposit` →
   wallet credit** step has not run. Complete one real mobile-money payment on a
   non-NG store and confirm the wallet is credited and the row leaves `pending`.
   That is the last step of the fund flow, and it is a DB write → person/HOLD.

**Then the signed-in purchase test (`8.a.iii.zr`):** once a wallet is funded,
buy a plan from the app and confirm an order row appears (`global_orders` is
currently empty and there are no purchase rows in
`global_customer_transactions`).

**New finding (optional scope, not a Task 8 leaf):** the web storefront has **no
HTTP-reachable customer fund path** — its only fund route,
`POST /api/reseller/[countryCode]/wallet/fund`, resolves the caller as a
**reseller owner** (`global_reseller_applications` by `auth_user_id`), and
`fundGlobalCustomerWallet` is a Next `"use server"` action with no route. So
mobile is currently the only surface that can fund a *customer* wallet by mobile
money.

## Not part of Task 8 (recorded for completeness)

- Task 6 follow-ups are done: "public RLS SELECT policy for catalog tables" is
  recorded as a suggested upgrade in HANDOVER; the Popular Plans card colour fix
  is done.
- `hooks/usePurchaseVTU.ts` is the only purchase path; the legacy
  `purchase-data`/`purchase-airtime` functions stay deployed until 8.c.i.
