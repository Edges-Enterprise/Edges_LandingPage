# Task 8 — Mobile app multi-country board

The single to-do board for completing **Task 8: move the mobile app
(`Erudite885/reseller-app`) off the legacy `reseller*` tables onto the
`global_*` data model so plans are country-scoped at the source and the app
supports every country the web does.**

This board is the execution checklist. `HANDOVER.md`'s Task 8 sections remain
the authoritative narrative; where they disagree, HANDOVER wins.

Last updated: 2026-10-14.

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
| **8.a.ii** | **Customer identity & money reads** | | ⬜ | — |
| 8.a.ii.zi | Function `global-store-customer-context` (id, name, pin-set) | 🤖 | ⬜ | identity pattern proven |
| 8.a.ii.zo | Function `global-store-wallet` (wallet + virtual accounts) | 🤖 | ⬜ | 8.a.ii.zi |
| 8.a.ii.zp | Function `global-store-transactions` (history) | 🤖 | ⬜ | 8.a.ii.zi |
| 8.a.ii.zq | App: `login`/`register`/`_layout` + hooks call those functions | 🤖 | ⬜ | 8.a.ii.zi–zp |
| 8.a.ii.zr | Deploy the three functions | 🧑 | ⬜ | 8.a.ii.zi–zp pushed |
| **8.a.iii** | **Catalog read path** | | 🔄 | — |
| 8.a.iii.zi | (superseded — Option B needs no migration) | — | ✅ | — |
| 8.a.iii.zo | Function `global-store-catalog` | 🤖🧑 | ✅ | deployed + live-verified |
| 8.a.iii.zp | App: `useDataPlans` → call the function | 🤖 | ✅ | mobile `tsc` 0 (unpushed) |
| 8.a.iii.zq | End-to-end catalog test (browse, signed-out + signed-in) | 🧑🤖 | ⬜ | build with a real `resellerId` |
| **8.b** | **Country-aware presentation** | | ⬜ | — |
| 8.b.i | Port country config into the app (currency, symbol, locale, phone digits, telecoms) | 🤖 | ⬜ | pick the shape (see note) |
| 8.b.ii | De-hardcode currency/locale (16 sites) | 🤖 | ⬜ | 8.b.i |
| 8.b.iii | Per-country network list, prefixes, colours, images (`helpers.ts`) | 🤖 | ⬜ | 8.b.i |
| 8.b.iv | Per-country copy (e.g. help "Nigerian networks") | 🤖 | ⬜ | 8.b.i |
| 8.b.v | Remove dead `allDataPlans` (~250 lines) | 🤖 | ⬜ | — |
| 8.b.vi | Network auto-detect from country config, not NG prefixes | 🤖 | ⬜ | 8.b.iii |
| **8.c** | **Purchases & money movement** | | ⬜ | — |
| 8.c.i | Repoint `usePurchaseVTU` → `global-purchase-data` / `global-purchase-airtime` | 🤖 | ⬜ | catalog done (8.a.iii) |
| 8.c.ii | Wallet / VA / transaction hooks read the new functions | 🤖 | ⬜ | 8.a.ii.zq |
| 8.c.iii | Notifications on `global_*` | 🚫 | 🚫 | **Blocker 2** |
| **8.d** | **Verification & rollout** | | ⬜ | — |
| 8.d.i | Mobile `tsc --noEmit` = 0 (gate after every leaf) | 🤖 | 🔄 | — |
| 8.d.ii | APK build for `ng` + `gh` + one more (e.g. `ke`/`zm`) | 🧑 | ⬜ | 8.a–8.c complete |
| 8.d.iii | Signed-out vs signed-in storefront parity | 🧑 | ⬜ | 8.d.ii |
| 8.d.iv | Push mobile + web | 🧑 | ⬜ | all above |

## Critical path

```
8.a.iii.zq (catalog e2e)  ──►  8.c.i (purchase repoint)  ──►  8.d.ii (APK)
        │                              ▲
        └──►  8.a.ii.zi→zp (functions) ─┘   [wallet must exist to buy]
                        │
                        └──►  8.a.ii.zq (app identity/money wiring) ──► 8.c.ii

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

### 8.a.iii.zq — End-to-end catalog test ⬜

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
| 2 | **No `global_*` notifications table** — only legacy `reseller_notifications` / `reseller_customer_notifications` | 8.c.iii cannot start | (a) add `global_notifications` (+ customer scope); (b) leave notifications on the legacy tables. Needs a decision. |

Blocker 1 (customer cannot read `global_*` under RLS) is **resolved by Option B**.

## Person-only manual steps (roll-up)

| Step | When | Command / action |
|---|---|---|
| Apply the 2 web patches (in order) + 1 mobile patch, push | now | see "Delivery" below |
| Deploy `global-store-catalog` | done | `supabase functions deploy global-store-catalog --no-verify-jwt` |
| Deploy the 3 `8.a.ii` functions | after 8.a.ii pushed | same, `--no-verify-jwt` |
| Device/APK test for `ng` + `gh` | after 8.c | dispatch the build workflow |
| Decide 8.b.i shape + Blocker 2 | before those items | — |

## Delivery (current, unpushed)

Web (`Edges-Enterprise/Edges_LandingPage`, `handover/supabase-dump`, origin tip
`cc0914f`) — **two patches, apply in order**:

| Patch | sha256 |
|---|---|
| `edges-task8-catalog-deployed.patch` | `62806ae2315f5a3ce44f71fc86ac32f52c01690cd19c7d373d5c5baed2d476d0` |
| `edges-task8-app-wired.patch` | `9f50e5f6f165778d06391001b0703bd58833e2bd6d0789b200da9253dfbf6d4a` |

Mobile (`Erudite885/reseller-app`, `handover/supabase-dump`, origin tip
`c556096`) — one patch:

| Patch | sha256 |
|---|---|
| `reseller-app-task8-catalog-read.patch` | `72e7636da11d82f2e66715ec406659e106c4ce3579cb381f3e4895e0e3079e73` |

All three verified to `git am` cleanly (web sequence tree `9a1ffd05…`, mobile
tree `7bfd8ff3…`, both matching the local commits).

## Progress summary

| Branch | Done | Total | State |
|---|---|---|---|
| 8.a.i | 2 | 2 | ✅ complete |
| 8.a.ii | 0 | 5 | ⬜ not started |
| 8.a.iii | 3 | 4 | 🔄 e2e test left |
| 8.b | 0 | 6 | ⬜ not started |
| 8.c | 0 | 3 | ⬜ not started (8.c.iii blocked) |
| 8.d | 0 | 4 | ⬜ not started |

**Next atomic step:** `8.a.iii.zq` (end-to-end catalog test) — or `8.c.i` if the
person prefers to make buying work before device testing.

## Not part of Task 8 (recorded for completeness)

- Task 6 follow-ups are done: "public RLS SELECT policy for catalog tables" is
  recorded as a suggested upgrade in HANDOVER; the Popular Plans card colour fix
  is done.
- `hooks/usePurchaseVTU.ts` is the only purchase path; the legacy
  `purchase-data`/`purchase-airtime` functions stay deployed until 8.c.i.
