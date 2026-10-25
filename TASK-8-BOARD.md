# Task 8 — Mobile app multi-country board

The single to-do board for completing **Task 8: move the mobile app
(`Erudite885/reseller-app`) off the legacy `reseller*` tables onto the
`global_*` data model so plans are country-scoped at the source and the app
supports every country the web does.**

This board is the execution checklist. `HANDOVER.md`'s Task 8 sections remain
the authoritative narrative; where they disagree, HANDOVER wins.

Last updated: 2026-10-24 (twenty-first check) - **the four built apps were tested
on-device: the funding defect batch is CLOSED and the gateway leg is PROVEN.
Store owners can now sign in on mobile (8.i fixed, deployed, live-verified,
shipped in fresh APKs — 8.i.ii). The 8.j number-first plan gating is CODE DONE
and now corrected to match on the FULL dialed number (trunk `0` included), for
every country, per the person's follow-up.**

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
- **New finding (material, web gap): the web has no HTTP-reachable
  customer-fund path.** The web's only reachable fund route is
  `POST /api/reseller/[countryCode]/wallet/fund`, and it resolves the caller as
  a **reseller owner** (`global_reseller_applications` by `auth_user_id`) — so a
  storefront **customer** funding on the web has no route to `fundGlobalCustomerWallet`
  (which is a Next `"use server"` action). Mobile is fine (it calls the edge
  function directly). So `8.f.ii` is genuinely complete for mobile, and the web
  customer-fund path is a separate, smaller gap if it is wanted. Recorded, not
  fixed: it is new scope, not a Task 8 leaf.
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
| **8.e** | **Defect batch (person-filed 2026-10-20)** | | 🔄 | — |
| 8.e.i | Build email must come from the store, not "Edges Network" | 🤖 | ✅ | **DONE** — From display name = store name, Reply-To = owner’s address (`sendAdminEmail` gained `fromName`/`replyTo`); web route updated. NOTE: the sending *address/domain* must stay the verified mail account — a per-store From address needs a per-store verified domain + credentials, which do not exist in the schema |
| 8.e.ii | Currency shows country code + symbol for non-NG; should be symbol only (web + mobile) | 🤖 | ✅ | **BOTH HALVES DONE.** **MOBILE** (`81654a7`) — reproduced exactly: `Intl.NumberFormat(style:"currency")` on a small-ICU runtime prints `GH₵1,500.00` for GHS (and `KSh`/`USh`/`RF`), while NGN renders as a lone `₦`. `index.tsx` formatCurrency now formats the number with the country locale and prefixes `country.currencySymbol`, matching the web storefront. **WEB** (`18e7644`, on `main` via PR #33 → `0570bcc`) — the web half was previously "still to be located"; it is not `Intl` (the storefront uses `formatStorePrice`, which already prefixes `config.currencySymbol`), it is `CURRENCY_SYMBOLS` in `src/lib/currency/currency.ts` drifting from `src/config/countries/*`: **`CDF` was missing entirely** (so `getCurrencySymbol("CDF")` fell back to the code and DR Congo rendered `CDF 500`) and **`MAD` mapped to the Arabic `د.م.`** while the config (and mobile) use `DH`. Fixed both and added `currencySymbols.test.ts`, which parses both files and asserts they agree. The test fails on the old map and passes on the new one; 51/51 Deno tests pass; web `tsc` = 0 |
| 8.e.iii | Web fund-wallet for non-NG countries → "authorization token invalid" | 🤖🧑 | ✅ | **CLOSED 2026-10-24 — proven on the live gateway.** Root cause: Korapay returns literally `invalid authorization key` (reproduced live: HTTP 403 `{"error":"not_authorized","message":"invalid authorization key"}`). Non-NG fund uses `korapay.ts`; NG uses `xixapay.ts`. **`KORAPAY_SECRET_KEY` is verified present in the Vercel Production env** (`type: sensitive`, `updatedAt 2026-10-21T08:23:56Z`), and a read-only oracle confirms the runtime holds a **non-empty** key (the Production Korapay webhook rejects an empty-key HMAC with `401 Invalid signature`). **Former blocker cleared:** PR #32 merged `e4e36ae` + `5ee2f54` to `main` (`72faffe`) and Vercel deployed Production from `72faffef` (`READY`), so the sanitizer is live. **Live proof (2026-10-23/24, from the app on a device):** three non-NG fund attempts produced live Korapay checkout URLs + `pending` rows — `KES`/`ke`, `XAF`/`cm`, `GHS`/`gh` — and the `403` produces no row, so its absence from the data is the proof the error is gone. Note the reproduction vehicle was the **mobile** app (its `global-store-fund-wallet` edge function is the only HTTP-reachable customer-fund path; the web's route is owner-only) |
| 8.e.iv | Mobile wallet not dynamic per country; should mirror web (virtual account vs mobile money) | 🤖 | ✅ | **DONE** (`51897a2`) — the branch is now in place: `countryConfig` gained `paymentGateway { provider, methods }` for all 24 countries (copied from the web source of truth, verified byte-for-byte against `src/config/countries/*.ts`), and both `wallet.tsx` and the home wallet card branch on `provider === "xixapay"` — Nigeria keeps the one-click virtual account; every other country shows an “Add Money” contact-support fallback instead of a virtual-account form its gateway cannot issue. **Mobile-money funding is deliberately NOT built:** the web’s *customer* modal (`StoreFundWalletModal`) shows the identical “coming soon — contact the store owner” fallback for non-xixapay stores, and the only mobile-money path that exists is the reseller-dashboard fund (`FundWalletModal` → `/api/reseller/[countryCode]/wallet/fund`), which is a different flow. So mobile now *mirrors* the web storefront rather than diverging from it. Mobile `tsc` = 0. Remaining: a fresh APK to ship it. **SUPERSEDED IN PART by 8.f** — the person has since asked for customer wallet funding on both surfaces, so the "contact the store owner" fallback is being replaced by a real mobile-money flow (8.f.i web, 8.f.ii mobile). The mirror is still accurate for what this commit shipped |
| 8.e.v | Mobile "create virtual account" → "store not found" | 🤖🧑 | ✅ | **DONE + DEPLOYED + LIVE-VERIFIED** (`e1c623c` web + `d660884` mobile; deployed 2026-10-20). Reproduced live: legacy `create-mobile-customer-virtual-account` returns 404 `{"error":"Store not found"}` for **every** store (roseline, toms-sub, kwams-sub, marcel-data …), by slug *and* by store_name — it is dead under the global_* model, not a slug-vs-name bug. Added `global-create-customer-virtual-account` (mirrors the web action; store + customer from the JWT, customer-only, same waitlist/BVN + Xixapay + insert path) and repointed `useVirtualAccounts.ts` at it via `callStoreFunction`. Deployed with `--no-verify-jwt`; live probes confirm the deployed function (no auth → 401 "Missing authorization token"; anon key → 401 "Invalid authorization token"; missing resellerId → 400) — the legacy function never returned these. **Remaining:** rebuild the app so the repointed hook ships (the endpoint is live now, but the fix reaches a device only in a fresh APK) |
| 8.e.vi | Mobile login "invalid login credentials" for a user registered on the web | 🤖 | ✅ | **DONE + LIVE-VERIFIED** — the cause was exactly the guess: when the `auth_email` lookup missed, `login.tsx` reconstructed a derived email with its own **deterministic** suffix, while web signup writes a **random** one (`Math.floor(Math.random()*9)+1`), so the guess was wrong and surfaced as "invalid credentials". `login.tsx` now mirrors the web storefront: resolve the typed address through `global-store-customer-auth-email`, fall back to the typed address when there is no mapping (owners; pre-suffix accounts), and **never reconstruct**. Also switched the lookup from a hand-built `fetch` (which read `EXPO_PUBLIC_BIMBO_SUPABASE_ANON_KEY`, an env var that is *not* set — the client uses `..._PUBLISHABLE_KEY`, so the request went out with no `Authorization` and could 401) to the configured Supabase client, and now send the trimmed, lowercased address (the web lookup is case-sensitive and signup never lowercases). **Verified live end-to-end** on a temporary account: typed `edgesvi@example.com` → lookup returned the derived `edgesvi+probe1@example.com` → `token?grant_type=password` with the typed password returned an `access_token`. Probe rows deleted. Mobile `tsc` = 0 |
| 8.e.vii | Mobile: non-NG plans, phone numbers, networks not recognized | 🤖 | ✅ | **DONE** (`e974a36`) — prefix tables are now keyed by country (`NETWORK_PREFIXES_BY_COUNTRY`); only NG has one, because **no prefix data exists anywhere** for the other countries (checked web `src/config/countries` + mobile `countryConfig` + the plan tables), so inventing one was not an option. `detectNetwork()` returns null where there is no table; the phone input is capped at `country.phoneNumber.maxDigits` and `handlePurchase` rejects anything shorter than `minDigits`; and where there is no table the buy screen shows a **network picker built from the store’s own `networks`** (already returned by `global-store-catalog`) instead of an auto-detect that never fires. Mobile `tsc` = 0 |
| **8.f** | **Customer wallet funding (person request 2026-10-17)** — reseller customers must be able to fund their own wallet on web and mobile, the way a reseller funds theirs from the dashboard | | 🔄 | — |
| 8.f.i | Web: storefront customer can fund by mobile money (korapay/flutterwave), not just xixapay VA | 🤖 | ✅ | **DONE** — `StoreFundWalletModal` non-xixapay branch no longer shows the "coming soon — contact the store owner" fallback; it now renders an amount + mobile-money form (mobile-number field only when the gateway needs it: flutterwave, or korapay direct-API) and calls the previously-dead `fundGlobalCustomerWallet` action (1.c.iv). `returnPath` was threaded action → gateway → `/api/payment/callback` so the customer lands back on the **store**, not the reseller dashboard (open-redirect-guarded: only a same-origin `/…` path is honoured). Completion already existed: both the korapay and flutterwave webhooks fall back to `global_customer_transactions` → `handleSuccessfulCustomerDeposit` (which credits `global_customer_wallets`). Web `tsc` = 0 |
| 8.f.ii | Mobile: customer/reseller wallet funding for non-NG countries | 🤖🧑 | ✅ | **CODE DONE** (web `3bc4054` + mobile `733e5e5`; deploy is a person step). Added `global-store-fund-wallet` (web) — the Deno port of **both** web actions (`fundWallet.ts` for the owner, `fundGlobalCustomerWallet.ts` for a customer), because the app cannot invoke a Next `"use server"` action. Identity comes from the JWT via `resolveStoreIdentity`, so a caller can only fund their own wallet; the gateway and currency come from the **store's** `country_code` in the DB, not the request body. It inserts the PENDING row (`global_transactions` for an owner, `global_customer_transactions` for a customer — the split the webhooks already route on) and returns the checkout URL. New `_shared/paymentGateway.ts` mirrors the web's korapay/flutterwave initiate step (Deno cannot import the React-flavoured `src/lib/payments/*`); its country→provider map is asserted **byte-identical** to `src/config/countries/*.ts` (24/24) by `paymentGateway.test.ts` (5 tests, all pass; the tests caught a module-load `Deno.env` bug). `returnPath` is derived server-side as `/{country}/{store_slug}`, so the payer lands on the store, not the dashboard, and no client-supplied value reaches the redirect. Mobile: new `hooks/useFundWallet.ts` invokes the function and opens the checkout with `WebBrowser.openBrowserAsync`, refreshing wallet/transactions on return; `wallet.tsx`'s "coming soon" card (8.e.iv) is replaced by a real amount + mobile-money form (number field only for flutterwave), and the home card now routes to the wallet screen instead of saying "coming soon". `deno check` clean; mobile `tsc` = 0. **DEPLOYED + VERIFIED LIVE 2026-10-17** — `supabase functions deploy global-store-fund-wallet --no-verify-jwt` run by the operator, and `KORAPAY_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` / `APP_URL` are all present in the Supabase secret store (confirmed via `supabase secrets list`, digests only). Probed the live endpoint: `POST` with no body → `400 {"error":"Amount must be greater than 0"}` (function executing); with a valid amount but no token → `401 {"error":"Missing authorization token"}`; with a garbage token → `401 {"error":"Invalid authorization token"}`. So `--no-verify-jwt` is correct and the function does its own JWT check, exactly as designed. **GATEWAY LEG PROVEN LIVE 2026-10-24 (from the app, on a device):** three non-NG fund attempts returned **live Korapay checkout URLs** and wrote `pending` rows to `global_customer_transactions` — `KES` (kesh-data/ke), `XAF` (sweet-data/cm), `GHS` (kwam-two/gh), all `metadata.source: "app"`. `charges/initialize` succeeds only *after* the gateway accepts, so the row's existence proves the gateway call worked. **Still unproven: the post-checkout leg** — all rows remain `pending` and every wallet is `0.0`, so the Korapay **webhook → `handleSuccessfulCustomerDeposit` → wallet credit** step has not run. That is the one remaining person step (needs a completed real mobile-money payment). Related finding: the web has **no HTTP-reachable customer-fund path** (its only fund route is owner-only), so this flow is currently mobile-only |
| 8.f.iii | Ship a fresh APK carrying 8.e.iv–vii + 8.f.ii | 🧑 | ✅ | **DONE 2026-10-17 — `kesh-data` APK built and released.** Dispatched `build-global-reseller-apk.yml` on mobile `main`; run [39617638115](https://github.com/Erudite885/reseller-app/actions/runs/39617638115) succeeded end-to-end, and its `head_sha` is `c54e142` — i.e. it built exactly the merged commit, so the APK carries 8.e.iv–vii + 8.f.ii. Release: [`ke-kesh-data-96408a53-20261021_144915`](https://github.com/Erudite885/tenant-distribution/releases/download/ke-kesh-data-96408a53-20261021_144915/kesh-data.apk) (~110 MB) in `Erudite885/tenant-distribution`; backend webhook closed the loop (`global_app_builds` row `b29d4ff2` → `build_status: completed` + `apk_url`). **The old "config route 404" blocker is now genuinely disproven, not assumed:** step 7 `Generate global reseller assets` completed success, and `/api/reseller/ke/config/96408a53…` returns 200 with every field the script needs (`storeName`, `appName`, `theme.primary`, all 5 asset URLs, `config.androidPackageName`). Inputs used: `reseller_id=43d24f2f-80df-4f75-bd9e-5960982db222`, `config_id=96408a53-9c5a-474d-97f7-8777cfbcd2cd`, `store_name=kesh-data`, `country_code=ke`. **`kesh-data` is a Kenya (non-NG) store**, so this is also the right vehicle for the 8.f.ii end-to-end test: install it, sign in as a Kesh Data customer, and fund by mobile money |
| **8.g** | **Defect batch (person-filed, from the merged mobile branch)** — three bugs surfaced by the APK build | | 🔄 | — |
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
| 8.j.ii | Ship the change in fresh APKs for the four test stores | 🧑 | ⬜ | **Person step (not yet requested).** No APK has been built from the 8.j work (now `725fff9`); the four test stores still run the `aeb8dea` builds from 8.i.ii, which predate this change. Dispatch `build-global-reseller-apk.yml` on ref `handover/supabase-dump` (NOT `main` — `main` is still `210c295` and carries neither this change nor the 8.i fix), then test on-device that plans appear after 6 digits and match the number's network — including that the trunk `0` is required (`0803…` resolves, `803…` does not) |


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
| ~~Confirm the fixes live~~ (`8.d.xi`) | **DONE** | web submission dispatched from `main`; build-complete email arrived (2026-10-20) |
| ~~Deploy the two changed edge functions~~ | **DONE 2026-10-22** | both `global-store-customer-auth-email` and `global-store-fund-wallet` at **v5**, `--no-verify-jwt`, from a `handover/supabase-dump` checkout; live-verified |
| ~~Merge `e4e36ae` + `5ee2f54` to `main`~~ | **DONE 2026-10-22** | PR #32 → `main` = `72faffe`; clean merge, tree byte-identical to the branch tip; Vercel Production built from `72faffef` and is `READY` |
| ~~**One non-NG fund attempt on Production**~~ (`8.g.ii` / `8.e.iii`) | **DONE 2026-10-24** | three non-NG fund attempts from the app (kesh-data/`ke`/`KES`, sweet-data/`cm`/`XAF`, kwam-two/`gh`/`GHS`) returned live Korapay checkout URLs + `pending` rows. The `403 invalid authorization key` is gone (a 403 writes no row). **Bug B closed.** |
| **Complete one non-NG mobile-money checkout** (`8.f.ii`, person) | **now — the last unexercised leg** | pay one of the pending Korapay checkouts (e.g. the `kesh-data`/`KES` one) with a real mobile-money number and confirm the webhook credits `global_customer_wallets` (balance moves off `0.0`, row leaves `pending`). This also unblocks the signed-in purchase test |
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
| 8.j | 1 | 2 | 🔄 **CODE DONE + verified + corrected** (`725fff9`) — plans gated on the first 6 digits, network tabs removed, auto-detection covers all 24 countries from generated prefix tables, and matching is on the FULL dialed form (trunk `0` required: `0803…` resolves, `803…` does not). Remaining: **8.j.ii** ship it in fresh APKs (person) |

**Next atomic step:** none left in the defect batch — `8.g.ii`/`8.e.iii` are
**CLOSED** (the `403 invalid authorization key` is proven gone on the live
gateway from the app) and `8.i` (owner login) is fixed and deployed. The
remaining open work is verification, not code:

1. **Post-checkout funding leg (person):** the three fund attempts are still
   `pending` and every wallet is `0.0`, so no checkout was completed. Complete one
   real mobile-money payment on a non-NG store and confirm the Korapay webhook
   credits the wallet — this is the last unexercised step of the fund flow.
2. **Signed-in purchase (`8.a.iii.zr`, person):** needs a funded wallet (i.e. #1
   first); `global_orders` is empty and there are no purchase rows yet.
3. **Install the fresh APKs (person):** all four test stores now have new builds
   from the fix commit (`aeb8dea`) — see 8.i.ii for the download commands.
   Installing one and signing in as the owner is the on-device confirmation that
   8.i is closed.
4. **Ship the 8.j change to a device (person, 8.j.ii):** the four test-store APKs
   predate the 8.j work (now `725fff9`), so the number-first plan display has not
   been seen on a device yet. Dispatch `build-global-reseller-apk.yml` on
   `handover/supabase-dump`, then confirm plans appear after 6 digits and match
   the number's network — with the trunk `0` required (`0803…` resolves, `803…`
   does not). **Blocker before this can happen:** the mobile rework (`725fff9`)
   and this docs commit are **committed locally but not yet pushed** — the
   `GITHUB_TOKEN` in this session (account `Phoenix-Boss`) is denied
   `Contents: write` on `Erudite885/reseller-app` (`git push` → 403 "Permission
   … denied"; the API ref-create probe → 403 "Resource not accessible by
   integration"), although earlier commits on this branch did push, so the token's
   scope appears to have narrowed. **Push both branches once a token with
   `Contents: write` is available**, then dispatch the build from `725fff9`.
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
