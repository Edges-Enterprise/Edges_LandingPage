# Task 8 — Mobile app multi-country board

The single to-do board for completing **Task 8: move the mobile app
(`Erudite885/reseller-app`) off the legacy `reseller*` tables onto the
`global_*` data model so plans are country-scoped at the source and the app
supports every country the web does.**

This board is the execution checklist. `HANDOVER.md`'s Task 8 sections remain
the authoritative narrative; where they disagree, HANDOVER wins.

Last updated: 2026-10-20 (twelfth check) - **live re-submit CONFIRMED; the person
filed 7 follow-up defects, all diagnosed.** `8.d.xi` PASSES: a web submission now
dispatches from `main` and the build-complete email arrives. New work is
`8.e` (defect batch, below). Three fixes done: the build-complete email now goes out **as the store**
(store display name on the From line, owner’s address as Reply-To) instead of as
"Edges Network" (web `090dd0f`); the mobile balance is **symbol-only**
(`81654a7`) instead of "GH₵50.00"; and the mobile virtual-account button now
calls the new `global-create-customer-virtual-account` function instead of the
legacy one that 404s for every store (web `e1c623c`, mobile `d660884`) — **deployed and
live-verified 2026-10-20** (a fresh APK is still needed to ship the hook).

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
| 8.a.iii.zr | Device e2e: browse signed-out + signed-in on a real build | 🧑 | 🔄 | **Catalog half DONE** — `roseline.apk` installed; 7 plans, MTN/AIRTEL/9MOBILE confirmed. Signed-in + purchase still to check |
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
| 8.d.ii | APK build for `ng` + `gh` + one more (e.g. `ke`/`zm`) | 🧑 | ✅ | **Roseline DONE** — run `39089167745` green; `roseline.apk` 110 MB at tag `ng-roseline-330e68c4-20261018_022744` (`gh` + a third country still to do) |
| 8.d.iii | Signed-out vs signed-in storefront parity | 🧑 | ⬜ | 8.d.ii |
| 8.d.iv | Push mobile + web | 🧑 | ✅ | web `9be9e80` (merged to `main`) / mobile `778e937` (2026-10-17) |
| 8.d.v | Deploy the web to production | 🧑 | ✅ | **DONE** — PR #25 → `main` `50e2b7c`; Production deploy `7145175251` success |
| 8.d.vi | Fix config route select (`apk_url, aab_url` not on `global_reseller_app_configs`) | 🤖 | ✅ | **DONE** — `e9e7a6b`, merged to `main` (PR #26 `f842969`); prod endpoint 200 |
| 8.d.vii | **Merge web branch to `main`** | 🧑 | ✅ | **DONE** — PR #26 → `f842969`; Production deploy `7145723808` |
| 8.d.viii | **Merge mobile branch to `main`** (clean fast-forward, no conflicts) | 🧑 | ✅ | **DONE** — PR #6 → `64303e1` — but it merged `778e937`, so `main` still lacks the Blocker 5 fix `462fa82`; re-merge needed |
| 8.d.ix | **Deploy the build-webhook `config_id` fix + re-dispatch** (Blocker 6) | 🧑+🤖 | ✅ | **DONE** — web `5cf4d2b` live in Production (probe: non-UUID `buildId` → 400, old code returned 500); run `39095674274` callback returned `{"success":true}` and the build row is `completed` |
| 8.d.x | **Merge PR #29 (Blockers 7 + 8 + email)** | 🧑 | ✅ | **DONE** — PR [#29](https://github.com/Edges-Enterprise/Edges_LandingPage/pull/29) merged as `bcf4db3`; Production deploy `7195314279` **success**; all three fixes verified in `main` |
| 8.d.xi | **Confirm the fixes live**: re-submit from the web, check `head_branch: main` + email arrives | 🧑 | ✅ | **PASSES** — web submission dispatched from `main` and the build-complete email arrived (2026-10-20) |
| **8.e** | **Defect batch (person-filed 2026-10-20)** | | 🔄 | — |
| 8.e.i | Build email must come from the store, not "Edges Network" | 🤖 | ✅ | **DONE** — From display name = store name, Reply-To = owner’s address (`sendAdminEmail` gained `fromName`/`replyTo`); web route updated. NOTE: the sending *address/domain* must stay the verified mail account — a per-store From address needs a per-store verified domain + credentials, which do not exist in the schema |
| 8.e.ii | Currency shows country code + symbol for non-NG; should be symbol only (web + mobile) | 🤖 | ✅ | **MOBILE DONE** (`81654a7`) — reproduced exactly: `Intl.NumberFormat(style:"currency")` on a small-ICU runtime prints `GH₵1,500.00` for GHS (and `KSh`/`USh`/`RF`), while NGN renders as a lone `₦`. `index.tsx` formatCurrency now formats the number with the country locale and prefixes `country.currencySymbol`, matching the web storefront. The other mobile price sites already used the symbol directly. Web `formatStorePrice` is already symbol-only — the web half of the report is still to be located |
| 8.e.iii | Web fund-wallet for non-NG countries → "authorization token invalid" | 🤖🧑 | ⏳ | **AWAITING LIVE CHECK** — `KORAPAY_SECRET_KEY` has now been set in the Vercel environment (person step done 2026-10-21); needs a non-NG fund attempt on Production to confirm the 403 is gone. Root cause was — Korapay returns literally `invalid authorization key` (reproduced live: HTTP 403 `{"error":"not_authorized","message":"invalid authorization key"}`). Non-NG fund uses `korapay.ts`; NG uses `xixapay.ts`. So `KORAPAY_SECRET_KEY` is unset/invalid in Production — **env fix, person step** |
| 8.e.iv | Mobile wallet not dynamic per country; should mirror web (virtual account vs mobile money) | 🤖 | ✅ | **DONE** (`51897a2`) — the branch is now in place: `countryConfig` gained `paymentGateway { provider, methods }` for all 24 countries (copied from the web source of truth, verified byte-for-byte against `src/config/countries/*.ts`), and both `wallet.tsx` and the home wallet card branch on `provider === "xixapay"` — Nigeria keeps the one-click virtual account; every other country shows an “Add Money” contact-support fallback instead of a virtual-account form its gateway cannot issue. **Mobile-money funding is deliberately NOT built:** the web’s *customer* modal (`StoreFundWalletModal`) shows the identical “coming soon — contact the store owner” fallback for non-xixapay stores, and the only mobile-money path that exists is the reseller-dashboard fund (`FundWalletModal` → `/api/reseller/[countryCode]/wallet/fund`), which is a different flow. So mobile now *mirrors* the web storefront rather than diverging from it. Mobile `tsc` = 0. Remaining: a fresh APK to ship it. **SUPERSEDED IN PART by 8.f** — the person has since asked for customer wallet funding on both surfaces, so the "contact the store owner" fallback is being replaced by a real mobile-money flow (8.f.i web, 8.f.ii mobile). The mirror is still accurate for what this commit shipped |
| 8.e.v | Mobile "create virtual account" → "store not found" | 🤖🧑 | ✅ | **DONE + DEPLOYED + LIVE-VERIFIED** (`e1c623c` web + `d660884` mobile; deployed 2026-10-20). Reproduced live: legacy `create-mobile-customer-virtual-account` returns 404 `{"error":"Store not found"}` for **every** store (roseline, toms-sub, kwams-sub, marcel-data …), by slug *and* by store_name — it is dead under the global_* model, not a slug-vs-name bug. Added `global-create-customer-virtual-account` (mirrors the web action; store + customer from the JWT, customer-only, same waitlist/BVN + Xixapay + insert path) and repointed `useVirtualAccounts.ts` at it via `callStoreFunction`. Deployed with `--no-verify-jwt`; live probes confirm the deployed function (no auth → 401 "Missing authorization token"; anon key → 401 "Invalid authorization token"; missing resellerId → 400) — the legacy function never returned these. **Remaining:** rebuild the app so the repointed hook ships (the endpoint is live now, but the fix reaches a device only in a fresh APK) |
| 8.e.vi | Mobile login "invalid login credentials" for a user registered on the web | 🤖 | ✅ | **DONE + LIVE-VERIFIED** — the cause was exactly the guess: when the `auth_email` lookup missed, `login.tsx` reconstructed a derived email with its own **deterministic** suffix, while web signup writes a **random** one (`Math.floor(Math.random()*9)+1`), so the guess was wrong and surfaced as "invalid credentials". `login.tsx` now mirrors the web storefront: resolve the typed address through `global-store-customer-auth-email`, fall back to the typed address when there is no mapping (owners; pre-suffix accounts), and **never reconstruct**. Also switched the lookup from a hand-built `fetch` (which read `EXPO_PUBLIC_BIMBO_SUPABASE_ANON_KEY`, an env var that is *not* set — the client uses `..._PUBLISHABLE_KEY`, so the request went out with no `Authorization` and could 401) to the configured Supabase client, and now send the trimmed, lowercased address (the web lookup is case-sensitive and signup never lowercases). **Verified live end-to-end** on a temporary account: typed `edgesvi@example.com` → lookup returned the derived `edgesvi+probe1@example.com` → `token?grant_type=password` with the typed password returned an `access_token`. Probe rows deleted. Mobile `tsc` = 0 |
| 8.e.vii | Mobile: non-NG plans, phone numbers, networks not recognized | 🤖 | ✅ | **DONE** (`e974a36`) — prefix tables are now keyed by country (`NETWORK_PREFIXES_BY_COUNTRY`); only NG has one, because **no prefix data exists anywhere** for the other countries (checked web `src/config/countries` + mobile `countryConfig` + the plan tables), so inventing one was not an option. `detectNetwork()` returns null where there is no table; the phone input is capped at `country.phoneNumber.maxDigits` and `handlePurchase` rejects anything shorter than `minDigits`; and where there is no table the buy screen shows a **network picker built from the store’s own `networks`** (already returned by `global-store-catalog`) instead of an auto-detect that never fires. Mobile `tsc` = 0 |
| **8.f** | **Customer wallet funding (person request 2026-10-17)** — reseller customers must be able to fund their own wallet on web and mobile, the way a reseller funds theirs from the dashboard | | 🔄 | — |
| 8.f.i | Web: storefront customer can fund by mobile money (korapay/flutterwave), not just xixapay VA | 🤖 | ✅ | **DONE** — `StoreFundWalletModal` non-xixapay branch no longer shows the "coming soon — contact the store owner" fallback; it now renders an amount + mobile-money form (mobile-number field only when the gateway needs it: flutterwave, or korapay direct-API) and calls the previously-dead `fundGlobalCustomerWallet` action (1.c.iv). `returnPath` was threaded action → gateway → `/api/payment/callback` so the customer lands back on the **store**, not the reseller dashboard (open-redirect-guarded: only a same-origin `/…` path is honoured). Completion already existed: both the korapay and flutterwave webhooks fall back to `global_customer_transactions` → `handleSuccessfulCustomerDeposit` (which credits `global_customer_wallets`). Web `tsc` = 0 |
| 8.f.ii | Mobile: customer/reseller wallet funding for non-NG countries | 🤖🧑 | ✅ | **CODE DONE** (web `3bc4054` + mobile `733e5e5`; deploy is a person step). Added `global-store-fund-wallet` (web) — the Deno port of **both** web actions (`fundWallet.ts` for the owner, `fundGlobalCustomerWallet.ts` for a customer), because the app cannot invoke a Next `"use server"` action. Identity comes from the JWT via `resolveStoreIdentity`, so a caller can only fund their own wallet; the gateway and currency come from the **store's** `country_code` in the DB, not the request body. It inserts the PENDING row (`global_transactions` for an owner, `global_customer_transactions` for a customer — the split the webhooks already route on) and returns the checkout URL. New `_shared/paymentGateway.ts` mirrors the web's korapay/flutterwave initiate step (Deno cannot import the React-flavoured `src/lib/payments/*`); its country→provider map is asserted **byte-identical** to `src/config/countries/*.ts` (24/24) by `paymentGateway.test.ts` (5 tests, all pass; the tests caught a module-load `Deno.env` bug). `returnPath` is derived server-side as `/{country}/{store_slug}`, so the payer lands on the store, not the dashboard, and no client-supplied value reaches the redirect. Mobile: new `hooks/useFundWallet.ts` invokes the function and opens the checkout with `WebBrowser.openBrowserAsync`, refreshing wallet/transactions on return; `wallet.tsx`'s "coming soon" card (8.e.iv) is replaced by a real amount + mobile-money form (number field only for flutterwave), and the home card now routes to the wallet screen instead of saying "coming soon". `deno check` clean; mobile `tsc` = 0. **DEPLOYED + VERIFIED LIVE 2026-10-17** — `supabase functions deploy global-store-fund-wallet --no-verify-jwt` run by the operator, and `KORAPAY_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` / `APP_URL` are all present in the Supabase secret store (confirmed via `supabase secrets list`, digests only). Probed the live endpoint: `POST` with no body → `400 {"error":"Amount must be greater than 0"}` (function executing); with a valid amount but no token → `401 {"error":"Missing authorization token"}`; with a garbage token → `401 {"error":"Invalid authorization token"}`. So `--no-verify-jwt` is correct and the function does its own JWT check, exactly as designed. **Still unproven:** the gateway leg. The next gate after identity is the korapay/flutterwave `initiate` call, which needs a real signed-in customer of a non-NG store — not reachable from a sandbox, so no live end-to-end payment has been run. Code-complete and reachable, not yet proven end-to-end |
| 8.f.iii | Ship a fresh APK carrying 8.e.iv–vii + 8.f.ii | 🧑 | ✅ | **DONE 2026-10-17 — `kesh-data` APK built and released.** Dispatched `build-global-reseller-apk.yml` on mobile `main`; run [39617638115](https://github.com/Erudite885/reseller-app/actions/runs/39617638115) succeeded end-to-end, and its `head_sha` is `c54e142` — i.e. it built exactly the merged commit, so the APK carries 8.e.iv–vii + 8.f.ii. Release: [`ke-kesh-data-96408a53-20261021_144915`](https://github.com/Erudite885/tenant-distribution/releases/download/ke-kesh-data-96408a53-20261021_144915/kesh-data.apk) (~110 MB) in `Erudite885/tenant-distribution`; backend webhook closed the loop (`global_app_builds` row `b29d4ff2` → `build_status: completed` + `apk_url`). **The old "config route 404" blocker is now genuinely disproven, not assumed:** step 7 `Generate global reseller assets` completed success, and `/api/reseller/ke/config/96408a53…` returns 200 with every field the script needs (`storeName`, `appName`, `theme.primary`, all 5 asset URLs, `config.androidPackageName`). Inputs used: `reseller_id=43d24f2f-80df-4f75-bd9e-5960982db222`, `config_id=96408a53-9c5a-474d-97f7-8777cfbcd2cd`, `store_name=kesh-data`, `country_code=ke`. **`kesh-data` is a Kenya (non-NG) store**, so this is also the right vehicle for the 8.f.ii end-to-end test: install it, sign in as a Kesh Data customer, and fund by mobile money |

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
| **Confirm the fixes live** (`8.d.xi`) | **now** | re-submit an application from the web; confirm the run’s `head_branch` is `main` and the build-complete email arrives |
| ~~Re-merge mobile `462fa82` to `main`~~ | **DONE** | PR #7 → `72d9b8d`; `main` line 72 now uses `--arg fallback` |
| **Device/APK test for `ng` + `gh`** | after build | install the release APK; browse + buy (`8.a.iii.zr`) |

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
| 8.a.iii | 4 | 5 | 🔄 device e2e left (scripted e2e ✅) |
| 8.b | 6 | 6 | ✅ complete |
| 8.c | 3 | 3 | ✅ complete |
| 8.d | 10 | 14 | 🔄 Blockers 5–9 fixed, merged (`bcf4db3`) and deployed; device e2e catalog half PASSES; remaining: live re-submit confirm + signed-in purchase check |

**Next atomic step:** `8.d.xi` — re-submit an application from the web and confirm
two things in one shot: the resulting run’s `head_branch` is **`main`** (Blocker 8)
and the build-complete email **arrives** (Blocker 9). Both fixes are already merged
(`bcf4db3`) and deployed to Production, so this is a pure confirmation. Then finish
`8.a.iii.zr` with the signed-in + purchase check on `roseline.apk`.
(`https://github.com/Erudite885/tenant-distribution/releases/download/ng-roseline-330e68c4-20261018_041601/roseline.apk`)
and run the device e2e (`8.a.iii.zr`): browse the catalog (expect 7 plans,
MTN/AIRTEL/9MOBILE) and attempt a purchase. The whole build pipeline is now proven
end to end — dispatch → build → publish → status recorded. Both branches are on
`main`; the migration is applied live; all 10 functions are deployed +
live-verified. Open loose end: `send-app-build-complete` is referenced but not
deployed, so the build-complete email does not send.

## Not part of Task 8 (recorded for completeness)

- Task 6 follow-ups are done: "public RLS SELECT policy for catalog tables" is
  recorded as a suggested upgrade in HANDOVER; the Popular Plans card colour fix
  is done.
- `hooks/usePurchaseVTU.ts` is the only purchase path; the legacy
  `purchase-data`/`purchase-airtime` functions stay deployed until 8.c.i.
