# Task 8 — Mobile app multi-country board

The single to-do board for completing **Task 8: move the mobile app
(`Erudite885/reseller-app`) off the legacy `reseller*` tables onto the
`global_*` data model so plans are country-scoped at the source and the app
supports every country the web does.**

This board is the execution checklist. `HANDOVER.md`'s Task 8 sections remain
the authoritative narrative; where they disagree, HANDOVER wins.

Last updated: 2026-10-17 (third check) - **the web IS now deployed to
production** (`8.d.v` DONE: PR #25 merged `handover/supabase-dump` into `main` as
`50e2b7c`; Production deployment `7145175251` succeeded at 20:14Z). That
unblocked the APK build past the missing-deployment problem and exposed a new
code-level blocker: the config route selects `apk_url, aab_url` off
`global_reseller_app_configs`, which has no such columns (Blocker 4). New active
leaf **`8.d.vi` (agent: fix the config-route select)**; the device e2e
(`8.a.iii.zr`) is gated on it.

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
| 8.a.iii.zr | Device e2e: browse signed-out + signed-in on a real build | 🧑 | ⬜ | build with a real `resellerId` |
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
| 8.d.ii | APK build for `ng` + `gh` + one more (e.g. `ke`/`zm`) | 🧑 | 🚫 | Roseline dispatched `39058017316`; re-run after **Blocker 4** fix |
| 8.d.iii | Signed-out vs signed-in storefront parity | 🧑 | ⬜ | 8.d.ii |
| 8.d.iv | Push mobile + web | 🧑 | ✅ | web `9be9e80` (merged to `main`) / mobile `778e937` (2026-10-17) |
| 8.d.v | Deploy the web to production | 🧑 | ✅ | **DONE** — PR #25 → `main` `50e2b7c`; Production deploy `7145175251` success |
| 8.d.vi | **Fix config route select** (`apk_url, aab_url` not on `global_reseller_app_configs`) | 🤖 | ⬜ | **NEW + critical path** — see Blocker 4 |

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
| 4 | **Config route selects columns that do not exist.** `src/app/api/reseller/[countryCode]/config/[configId]/route.ts:25` selects `apk_url, aab_url` off `global_reseller_app_configs` (which lacks them; they are on `global_app_builds`), so PostgREST returns `42703` and the route maps any error to its 404 branch. | Blocks the APK build (`8.d.ii`) → device e2e (`8.a.iii.zr`) even now that production serves the branch | (a) drop `apk_url, aab_url` from the select + the `fullConfig` echoes — no caller reads them from this endpoint (the build script uses storeName/appName/theme/assets; the app reads neither; the real APK-URL source is `global_app_builds`, which the storefront already queries). Legacy carry-over: the old `reseller_app_configs` had these columns, the global table does not. (b) if a consumer ever needs them here, source them from `global_app_builds` by `application_id`. Agent fix. |

Blocker 1 (customer cannot read `global_*` under RLS) is **resolved by Option B**.

## Person-only manual steps (roll-up)

| Step | When | Command / action |
|---|---|---|
| ~~Apply the 1 web patch + 1 mobile patch, push~~ | **DONE** | both landed on origin (`8bc1c00` / `fe92bb2`) |
| ~~Apply the notifications migration (Ubuntu, direct psql)~~ | **DONE** | `20261015_create_global_notifications.sql` applied (tables + columns return 200) |
| ~~Deploy the new `global-store-*` functions~~ | **DONE** | all 10 deployed `--no-verify-jwt` + live-verified |
| ~~Deploy the web to production~~ (`8.d.v`) | **DONE** | PR #25 merged `handover/supabase-dump` → `main` (`50e2b7c`); Production deploy `7145175251` success |
| **Merge the `8.d.vi` fix to `main`** | after the agent fix | once the config route stops selecting `apk_url, aab_url`, merge/deploy so production serves it |
| **Dispatch the Roseline APK build** | after `8.d.vi` lands | `gh workflow run build-global-reseller-apk.yml …` (may use `--ref main` now) |
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
| 8.d | 3 | 6 | 🔄 tsc + push + prod deploy done; **`8.d.vi` (config-route fix)** is the gate, then APK + parity |

**Next atomic step:** `8.d.vi` (agent) — drop `apk_url, aab_url` from the
config route’s select (and the `fullConfig` echoes), then merge to `main`;
then re-dispatch the Roseline APK build (`8.d.ii`) and run the device e2e
(`8.a.iii.zr`: browse the catalog, expect 7 plans, MTN/AIRTEL/9MOBILE; then
attempt a purchase). Everything else is done: both repos landed, `main` carries
the full Task 8 lineage, production is deployed, the migration is applied live,
and all 10 functions are deployed + live-verified.

## Not part of Task 8 (recorded for completeness)

- Task 6 follow-ups are done: "public RLS SELECT policy for catalog tables" is
  recorded as a suggested upgrade in HANDOVER; the Popular Plans card colour fix
  is done.
- `hooks/usePurchaseVTU.ts` is the only purchase path; the legacy
  `purchase-data`/`purchase-airtime` functions stay deployed until 8.c.i.
