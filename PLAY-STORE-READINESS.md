# Play Store readiness — task list

**Written:** 2026-11-21
**Scope:** the **countryCode multi-tenant, multi-country** product only.
Legacy `edges_network`, and the legacy `reseller_*` folders and tables, are
**out of scope** and must not be touched.

---

## How the two repos connect

One Supabase project (`jjyyfaxcwanrmiipzkoj`), two clients. Same Postgres,
different env-var names per client:

| Client | Repo | Env vars |
|---|---|---|
| Web | `Edges-Enterprise/Edges_LandingPage` (`/workspace/lp`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` |
| Mobile | `Erudite885/reseller-app` (`/workspace/reseller-app`) | `EXPO_PUBLIC_BIMBO_SUPABASE_URL`, `EXPO_PUBLIC_BIMBO_SUPABASE_PUBLISHABLE_KEY` |

**`reseller-app` is a template, not a shippable app.** It is never published on
its own. A reseller submits details on the web; `triggerAppBuild.ts` bakes that
reseller's identity into a config row; CI generates `reseller-config.json` from
it and builds one app for that reseller. `app.config.ts` reads that file. So one
repo, N published apps, each with its own package name (`com.edges.<storeslug>`).

That is why the per-user version bump belongs in the **web** repo, not the
mobile one — the web is what creates each reseller's config.

Relevant tables (all `global_*`):
`global_reseller_applications` (the reseller), `global_reseller_app_configs`
(baked config JSONB), `global_app_builds` (build rows, `aab_url`/`apk_url`).

---

## Findings

### A. The countryCode storefront has NO privacy or terms page

This is the gap you suspected, and it is worse than a missing link.

| Route | Result |
|---|---|
| `/rw/simi` | **200** |
| `/rw/simi/privacy` | **404** |
| `/rw/simi/terms` | **404** |
| `/rw/simi/legal` | **404** |
| `/rw/simi/profile` | 200 (proves `[storeName]` subroutes work) |

The `[storeName]` segment resolves fine — `profile/` exists and serves. So
`privacy/` and `terms/` are simply not built. There is no route, no page, and no
link: `StoreFooter.tsx` renders only the store name and a copyright year, with
no legal links at all.

The legal routes that *do* exist are the wrong ones:

- `src/app/privacy/page.tsx` and `src/app/terms/page.tsx` — the **legacy global**
  pages. Live at `/privacy` (200) but hardcoded to "Edges Network … based in
  Nigeria". Not per-reseller. Must not be used.
- `src/app/[countryCode]/dashboard/legal/*` — the reseller's own dashboard view.
  **Every component in that folder is 0 bytes** (`PrivacyPolicy.tsx`,
  `TermsOfService.tsx`, `AcceptableUse.tsx`, `RefundPolicy.tsx`,
  `PolicyGenerator.tsx`, `LegalClient.tsx`, `ComplianceDashboard.tsx`), and
  `page.tsx` is an "Option A" placeholder that renders "Coming soon". Nothing
  works there.

**The mobile app is the only place this exists properly.** `hooks/useResellerLegal.ts`
→ `constants/legalTextGenerator.ts` (162 lines) generates the text at runtime
from the store's name, contact email, and country. Per-user, as you said.

The data source it uses is already public and already live. I called it:

```
POST /functions/v1/global-store-catalog  {"resellerId":"a545e62b-..."}
→ store: { name: "Simi ", email: "greengale+4@maxxspace.com",
           country_code: "rw", currency: "RWF" }
```

So the web can render the same per-reseller text from the same function, with no
JWT, no schema change, and no new table. Confirmed: **no** legal/privacy/terms
column exists anywhere in the schema — the copy is generated, never stored.

### B. `versionCode` is not set at all — decided: one shared project version

**Decision (person, 2026-11-21): the version lives in the `reseller-app`
project, not per tenant.** The app is what improves, and every tenant receives
that improvement. The package name is what differentiates tenants; the EAS
project id never reaches Play Console. So a new reseller starts at whatever
`reseller-app` is currently at — not at 1.

This is sound, and here is why the shared counter is not a problem. Play scopes
`versionCode` per package name, not per EAS project:

> Each APK for the same application must have a unique version code
> — [Play docs, multiple APKs](https://developer.android.com/google/play/publishing/multiple-apks)

So Simi at 14, Kesh-data at 14, and belovedtopup at 14 are three independent
counters as far as Play is concerned. No collision, and nothing needs to be
per-tenant.

**What is broken today.** `android.versionCode` is never set —
`grep -c versionCode app.config.ts` → **0**. `buildNumber: 1` is hardcoded in
four web files (`triggerAppBuild.ts` ×2, `getBuildContext.ts`, the config
route), written into the config JSONB, and then ignored by the build.

Proven against shipped artifacts: two Simi AABs a day apart both report
`versionCode 1`.

| Release | Built | versionCode |
|---|---|---|
| `rw-simi-1b08a647-20261107_182952` | 2026-11-07 | **1** |
| `rw-simi-1b08a647-20261108_121435` | 2026-11-08 | **1** |

**What to build.** A single source of truth in the mobile repo:

1. `android.versionCode` in `app.config.ts` = the project version code.
2. Bump it in **one** place when shipping an improvement to all tenants.
3. Keep `android.versionName` in step with it (currently `1.0.0`).

Then **drop** `appVersionSource: "remote"` in `eas.json`. With an explicit
`versionCode` in `app.config.ts`, remote EAS bookkeeping only creates a second,
disagreeing source of truth — exactly the drift that produced `versionCode 1`
twice. Prefer `"local"` so the committed value wins.

**The trap that makes this matter more than it looks.** `app.config.ts:92` sets
`runtimeVersion: { policy: "appVersion" }`, so the OTA runtime version is
derived from `version`. Two consequences:

- If the project version code moves but `version` does not, every tenant stays
  on the same runtime version and an OTA update built for new native code can
  be served to binaries that do not have it. That is the classic OTA crash.
- The OTA `updates.url` is the single shared EAS `projectId`
  (`bde21e0b-dd38-48b3-a695-ec1b381c3890`). One EAS project, N package names.

So "all tenants get the improvement" only holds if `version` and `versionCode`
move together. Treat them as one value with two spellings.

### C. `targetSdkVersion` is 35; Play requires 36

From the shipped Simi AAB: `minSdk 24`, `targetSdk 35`, `compileSdk 35`.
From Google's target-SDK page (fetched today): *"Starting August 31 2026: New
apps and app updates must target Android 16 (API level 36) or higher."* That
date has passed, so uploads targeting 35 are refused.

Cause: Expo SDK 53 defaults to 35. The obvious-looking fix — install
`expo-build-properties` and set `compileSdkVersion: 36` — **does not work on
SDK 53**, and this is worth stating plainly because it looks like a one-line
change:

| Link in the chain | Version | API 36 possible? |
|---|---|---|
| Expo SDK 53 | → RN 0.79.6 | — |
| RN 0.79.6 pins AGP | **8.8.2** | no — max API **35** |
| AGP 8.9 | — | no — still max 35 |
| AGP 8.11 | ← RN 0.81 / SDK 54 | **yes — max 36** |

`expo-build-properties@0.14.8` (the SDK 53 line) exposes `compileSdkVersion`,
`targetSdkVersion`, `buildToolsVersion`, `kotlinVersion`, and some packaging
options — but **no AGP version override**. So config cannot lift the ceiling on
SDK 53; the ceiling is the build plugin, and only an SDK upgrade moves it.

**There is in-org precedent, and it is a working recipe.** `edges_network` is
already on the target stack and builds with API 36. Its `app.json` carries:

```jsonc
"newArchEnabled": true,
"plugins": [ ..., ["expo-build-properties", {
  "android": { "compileSdkVersion": 36, "targetSdkVersion": 36 }
}]]
```

with `expo ~54.0.38`, `react-native 0.81.5`, `react-native-reanimated ~4.1.1`,
and `expo-build-properties ~1.0.10`. That is the exact combination this app
needs, so the upgrade path is known-good inside the org rather than theoretical.

(An earlier version of this report withdrew the `edges_network` precedent
claim after I checked the wrong thing — I looked for an `android/` directory
and an Expo dependency, found neither, and concluded the repo was web-only. It
is not: it is an Expo app configured through `app.json`, which I had not opened
at that point. The claim stands, and the config above is the citation.)

### D. What already passes

| Check | Result |
|---|---|
| 16 KB page alignment | Pass — `libhermes.so`, `libexpo-modules-core.so` LOAD segments all `0x4000` |
| Account deletion | Pass — `delete-account` function live (401 = deployed, JWT-protected); in-app flow in `settings.tsx` |
| No `READ_MEDIA_*` | Absent — the earlier upload rejection cause is fixed on this path |
| Package name | `com.edges.simi`, as expected |
| Icon | 2048×2048, downscales fine to Play's 512×512 |

### E. Needs a decision — leftover permissions

Declared but unused by app code: `SYSTEM_ALERT_WINDOW`, `DUMP`,
`READ_APP_BADGE`, `RECEIVE_BOOT_COMPLETED`, `WRITE_EXTERNAL_STORAGE`.
`SYSTEM_ALERT_WINDOW` and `DUMP` are the ones reviewers query. `reseller-app`
has no `android.blockedPermissions` entry; `edges_network` solved the same
problem with one.

### F. No Simi listing content exists

`reseller-app` has no `store/play/` — `store/` holds only app code. There is no
short description, full description, screenshot set, or feature graphic under
version control for any tenant. The Edges Network copy can't be reused: it says
"a Nigerian bills and wallet app … prices are in Nigerian Naira".

### G. What "Play listing content" actually is

The Play **store listing** is the product page a user sees before installing —
what replaces an app-store website. Play enforces these limits (verified against
Google's docs today):

| Field | Limit / spec | Have it? |
|---|---|---|
| App name | 30 characters | Have ("Simi") |
| Short description | 80 characters | **No** |
| Full description | 4,000 characters | **No** |
| App icon | 512×512 PNG, 32-bit with alpha, ≤1 MB | Derivable — repo icon is 2048×2048 |
| Feature graphic | 1024×500, JPEG or 24-bit PNG, no alpha | **No** |
| Phone screenshots | 2–8, PNG/JPEG ≤8 MB each, sides 320–3,840 px, 9:16 portrait | **No** |
| Videos | Optional YouTube link | n/a |

The two that are easy to miss: **at least two screenshots are mandatory** to
publish at all, and the **feature graphic** is required, not optional.

Then, separately from the listing, Play Console asks for four declarations that
are *not* listing content but gate publishing:

- **Data safety** — what data is collected, whether it is shared, whether it is
  encrypted in transit, and whether users can request deletion. This must match
  the privacy policy or the app gets rejected.
- **Content rating** — a questionnaire; produces the age rating.
- **Target audience** — age groups, and whether the app is designed for children.
- **Ads declaration** — whether the app contains ads.

Practical point for a multi-tenant product: the *screenshots* are the hard part,
because they show one tenant's branding. The **text** can be templated per
tenant (store name, country, currency) the same way the legal copy is. So the
decision in P1-5 is really "are screenshots hand-made per tenant, or do we
generate them from a build?" — the text side is already solved by the generator.

---

## Task list

Grouped by what actually blocks what. **P0 blocks upload. P1 blocks approval.
P2 is cleanup.**

### P0 — blocks upload

- [x] **P0-1 · Set one shared project `versionCode`.** **Done 2026-11-21.**
      `app.config.ts` now derives both `version` and `versionCode` from
      `package.json`'s `version` (`major*10000 + minor*100 + patch`), so the two
      cannot drift, with a build-time guard that throws if minor or patch exceed
      99 (otherwise `1.0.100` and `1.1.0` would collide). `android.versionCode`
      is set, and `eas.json` moved to
      `appVersionSource: "local"` with `autoIncrement` removed. The four
      hardcoded `buildNumber: 1` writes are gone from the web repo, and the
      config route no longer injects `version`/`buildNumber` fallbacks.
      Verified by evaluating the config: project `1.0.4` → `versionCode 10004`,
      and a Simi-shaped tenant config (`com.edges.simi`) still yields
      `versionCode 10004` — the tenant's own `1.0.0` / `buildNumber 1` is
      correctly ignored. *(mobile + web)*
- [ ] **P0-2 · Target SDK 36 — requires an Expo SDK 54 upgrade, not a config
      flag.** The previously written fix here ("install `expo-build-properties`;
      set `compileSdkVersion: 36`") **does not work**, and I should correct it
      before anyone spends time on it:

      Expo SDK 53 ships React Native 0.79, which pins **AGP 8.8.2**. Google
      documents AGP 8.8 as supporting a *maximum* API level of **35**. AGP 8.9
      is also capped at 35; **AGP 8.11 is the first to support API 36**. So
      `compileSdkVersion: 36` on SDK 53 asks Gradle to compile against an API
      the build plugin does not support. `expo-build-properties@0.14.8` exposes
      `compileSdkVersion` / `targetSdkVersion` / `buildToolsVersion` /
      `kotlinVersion` but **no AGP override**, so there is no escape hatch from
      config. Expo's own SDK 54 announcement states RN for Android "now targets
      Android 16 / API 36", and SDK 54 ships RN 0.81 → AGP 8.11.

      So the real task is **upgrading to Expo SDK 54**. That is not a flag; it
      is a coordinated dependency migration across ~19 `expo-*` packages plus
      React Native. The sharp edge: **SDK 54 requires
      `react-native-reanimated` 4.x, and Reanimated 4 works *only* with the New
      Architecture.** This app has `newArchEnabled: false`, so the upgrade
      forces a New Architecture migration on an app that has never run on it.

      The good news, verified in this repo: **no application code imports
      Reanimated.** `react-native-reanimated ~3.17.4` is declared in
      `package.json` but never referenced in `app/` or `components/`, so the
      Reanimated 4 bump should be a version change rather than a code rewrite.
      The only New Architecture surface is `GestureHandlerRootView` in
      `app/_layout.tsx`, which is Fabric-compatible in
      `react-native-gesture-handler 2.28`. That makes this migration materially
      smaller than the `edges_network` one — but "smaller" is not "small", and
      it still needs a device pass.

      Do not start this without scheduling it properly. The org already runs
      this exact stack in `edges_network` (`expo ~54.0.38`, RN `0.81.5`,
      reanimated `~4.1.1`, `newArchEnabled: true`,
      `expo-build-properties ~1.0.10` with `compileSdkVersion`/`targetSdkVersion`
      `36`), so copy that configuration rather than inventing one. Sequence:
      `npx expo install expo@^54`, then `npx expo install --fix`, add
      `expo-build-properties` with the 36 pair, flip `newArchEnabled: true`,
      then validate the whole app on a device. *(mobile — needs a dedicated
      change, not a drive-by edit)*

      **Read `edges_network`'s `ARCHITECTURE.md` §10.2.1 before starting.** It
      records that org's own SDK 52 → 54 upgrade and the runtime-breaking
      changes it hit, which are the checklist for this upgrade. The ones most
      likely to bite here:

      - Reanimated 4 needs **`react-native-worklets`** as a separate package
        (`babel-preset-expo` auto-injects its plugin — no `babel.config.js`
        edit).
      - `useAnimatedGestureHandler` is **removed** in Reanimated 4; drag code
        must move to `Gesture` / `GestureDetector`.
      - Metro enables package `exports` by default in SDK 54, which broke
        `require("ws")` via `@supabase/realtime-js`; that repo set
        `unstable_enablePackageExports = false` in `metro.config.js`.
        **`reseller-app` also depends on `@supabase/supabase-js`**, so expect
        the same failure.
      - SDK 54 + New Architecture needs more JVM metaspace; that repo added a
        config plugin raising `MaxMetaspaceSize` and raised its CI timeout
        90 → 120 min.
- [ ] **P0-3 · Prove both.** Rebuild Simi, then read the AAB manifest and
      confirm `versionCode` matches the committed project version **and**
      `targetSdkVersion 36`. Do not trust config alone — that is how the
      current versionCode bug stayed invisible across two releases. Note both
      CI builds use `eas build --local`, so the manifest is produced in the
      runner and is inspectable as an artifact.
- [ ] **P0-4 · Device pass on Android 16.** Edge-to-edge and predictive back
      change behaviour. `edgeToEdgeEnabled: true` is already set, so this should
      be fine, but it is unverified. *(person)*
- [x] **P0-5 · Developer account type.** **Answered 2026-11-21: organization
      account.** The 12-tester / 14-day closed-test rule applies only to
      *personal* accounts created after 2023-11-13, so it does **not** apply
      here. No two-week gate; production access is available on first publish.

### P1 — blocks approval

- [ ] **P1-1 · Build the countryCode legal pages.** Add
      `src/app/[countryCode]/[storeName]/privacy/page.tsx` and `.../terms/page.tsx`.
      Server-render per reseller: look up the store by `store_slug` +
      `country_code`, then generate the text from store name, contact email, and
      country — mirroring `useResellerLegal.ts` so web and app read identically.
      `getCountryConfig` already resolves `rw` → Rwanda/RWF.
- [ ] **P1-2 · Share one legal generator.** `legalTextGenerator.ts` (162 lines)
      lives only in the mobile repo. Move it to `supabase/functions/_shared/`
      and have both clients use it, so the app and the web cannot drift. This is
      the pattern already used by `storeIdentity.ts` and `storeCatalog.ts`.
- [ ] **P1-3 · Link the pages.** `StoreFooter.tsx` needs privacy + terms links
      pointing at the tenant-scoped routes (not `/privacy`). Also update
      `ResellerFooter.tsx` and `Footer.tsx`, which currently hardcode the legacy
      paths.
- [ ] **P1-4 · Give Play a real URL.** The Data safety form needs a public
      privacy policy URL per app. For Simi that becomes
      `https://telcos.opik.net/rw/simi/privacy`. Today the only thing available
      is the legacy global page, which names the wrong company and country.
- [ ] **P1-5 · Author Simi listing content.** See §G above for exactly what
      this is and the sizes Play enforces. Needs a decision on where it lives:
      per-tenant files in `reseller-app` under `store/play/<slug>/`, or generated
      from the DB like everything else.
- [ ] **P1-6 · Play Console items** *(person)*: Data safety, content rating,
      target audience, ads declaration. Not verifiable from code.
- [ ] **P1-7 · Clear `SYSTEM_ALERT_WINDOW` + `DUMP`.** Add
      `android.blockedPermissions`, confirm the app still works, keep
      `WRITE_EXTERNAL_STORAGE` for the legacy receipt-save path.
- [ ] **P1-8 · Account deletion via the privacy policy.** **Decision
      (person, 2026-11-21): deletion is requested by email, documented in the
      privacy policy.** No separate deletion page.

      Play's requirement is *both* an in-app path **and** a web link resource:

      > If your app enables account creation, you must: provide users with an
      > in-app path to delete their app accounts and associated data; and
      > provide a web link resource where users can request app account
      > deletion and associated data deletion.

      In-app is already covered (`settings.tsx` → PIN-confirmed
      `handleDeleteAccount`, and `delete-account` is live). The privacy page can
      serve as the web resource, **but only if it actually tells the user how to
      ask**. Today it does not. The whole clause is:

      ```
      7. Data Protection Rights
      You have the right to:
      • Request deletion of your data
      ...
      Contact: <the reseller's email>
      ```

      That is a rights list, not instructions. Play's Data safety form asks
      specifically *how* a user requests deletion and *what* is deleted, and a
      reviewer will open the URL and look for it. Needs its own section:
      the email to write to, what to include, what gets deleted, what is
      retained and why, and the turnaround time. Work item:

      - [ ] Add a "How to request account deletion" section to
            `generatePrivacyPolicy()` in `constants/legalTextGenerator.ts`,
            naming the designated email explicitly.
      - [ ] Use that page's URL in the Data safety form
            (`https://telcos.opik.net/rw/simi/privacy`).
      - [ ] Confirm the in-app and email paths delete the same data, so the
            policy does not over-promise. In-app deletes wallet balance,
            transaction history, personal info, and virtual accounts.

- [x] **P1-9 · Verify each tenant's contact email is a real, monitored inbox.**
      **Answered 2026-11-21:** Simi's `greengale+4@maxxspace.com` is correct —
      use as is. The `+4` suffix is deliberate, not a leftover test alias. Keep
      the address exactly as `global-store-catalog` returns it; do not normalise
      or strip the tag. (Still worth a spot-check per tenant before each one
      ships, since the policy makes this the only deletion channel.)

### P2 — cleanup

- [ ] **P2-1 · Remove the dead Xixapay secret gate.** The workflow hard-fails if
      `EXPO_PUBLIC_XIXAPAY_SECRET_KEY` is missing and injects it into the bundle,
      but no code reads any `EXPO_PUBLIC_XIXAPAY_*` var. I checked the shipped
      bundle: the only `clientSecret` hit is React Native's own
      `regenerateClientSecret`. The gate forces a secret to exist and ship for
      nothing.
- [ ] **P2-2 · Decide on the 0-byte dashboard legal components.** Either build
      them (the reseller-facing view of their own policy) or delete them. Seven
      empty files plus a "Coming soon" placeholder is a trap for the next
      reader.
- [ ] **P2-3 · Dependency vulnerabilities.** `npm audit --omit=dev` → 41 (2
      critical). Both criticals are build tooling (`shell-quote`, `node-tar`),
      not runtime, so low Play risk. `npm audit fix` is available; needs a
      rebuild to validate.

---

## Open questions

1. ~~Per-user counter or EAS `autoIncrement`?~~ **Answered 2026-11-21:** one
   shared project version in `reseller-app`, bumped when the app improves. New
   resellers start at the current project version, not 1. Package name is the
   tenant discriminator. See §B.
2. **Where does Play listing content live?** Per-tenant files in `reseller-app`,
   or generated from the DB? This decides whether P1-5 is a content task or a
   code task. Text can be templated; screenshots are the open question.
3. ~~Is there a Play Console entry for `com.edges.simi`?~~ **Answered
   2026-11-21: no, it does not exist yet.** So the first upload establishes the
   app and its signing key. Nothing to migrate. It also means P0-5 (account type
   and the 12-tester rule) is live, because nothing has been published before.

## Could not verify

- ~~Whether the EAS signing key is linked to a Play app entry.~~ Not relevant
  now: there is no Play entry yet, so the first upload establishes it.
- `npx tsc --noEmit` did not finish in 15 minutes; I killed it. Not evidence of
  a problem, but the typecheck state is unknown. CI (`ci.yml`) is the place to
  confirm.

---

*Produced by an AI agent (OpenHands) on behalf of the user.*
