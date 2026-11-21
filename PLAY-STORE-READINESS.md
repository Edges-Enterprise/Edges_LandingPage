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

**Status: fixed.** `reseller-app` has since been upgraded to this exact stack,
and `expo prebuild` on the upgraded project emits `android.targetSdkVersion=36`
with AGP 8.11.0 resolved. The Simi AAB will only carry 36 after a rebuild
(P0-3). See P0-2 for the full change set and verification table.

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
- [x] **P0-2 · Target SDK 36 — done via Expo SDK 54 upgrade.** **Completed
      2026-11-21.** The original entry here said "install `expo-build-properties`
      and set `compileSdkVersion: 36`", which does **not** work on SDK 53 and is
      worth restating because it is the trap:

      SDK 53 ships RN 0.79 → **AGP 8.8.2**, and Google caps AGP 8.8/8.9 at API
      **35**. AGP 8.11 is the first that supports 36. `expo-build-properties@0.14.8`
      has no AGP override, so config alone cannot reach 36. The upgrade was the
      only path.

      `reseller-app` now runs the SDK 54 matrix (commit `cead42b`, branch
      `fix/shared-project-versioncode`): `expo 54.0.38`, RN `0.81.5`, React
      `19.1.0`, `react-native-reanimated 4.1.7`, `react-native-worklets 0.5.1`,
      `react-native-gesture-handler 2.28.0`, `expo-router 6.0.24`,
      `expo-notifications 0.32.17`, `expo-updates 29.0.20`.

      Four changes beyond the dependency bump, all of them load-bearing:

      1. `newArchEnabled: true` — Reanimated 4 runs **only** on the New
         Architecture, so this was forced, not optional.
      2. `expo-build-properties ~1.0.10` pins `compileSdkVersion` /
         `targetSdkVersion` to **36**.
      3. `metro.config.js` sets `unstable_enablePackageExports = false`. This
         was **predicted** in the previous version of this report and it did
         bite: SDK 54 enables package `exports` by default, so
         `@supabase/realtime-js` resolved `require("ws")` to the Node build and
         the release bundle failed.
      4. `plugins/withGradleJvmArgs.js` raises the Gradle daemon to
         `-Xmx4096m -XX:MaxMetaspaceSize=2048m`. New Architecture overflows the
         default Metaspace during `:app:lintVitalAnalyzeRelease`. Also raised
         both CI timeouts to 120 min (was 90 and 45).

      **The predicted Reanimated risk did not materialise.** No file in `app/` or
      `components/` ever imported Reanimated, so there was no
      `useAnimatedGestureHandler` migration and no code rewrite. `tsc --noEmit`
      passes with zero errors — no React 19.1 `useRef` breakage, no expo-router 6
      or notifications API breakage.

      Verification actually performed (not config-reading):

      | Check | Result |
      | --- | --- |
      | `expo-doctor` | 18/18 passed |
      | `tsc --noEmit` | exit 0, zero errors |
      | `expo export --platform android` | 5.07 MB Hermes bundle, 32 assets |
      | `expo prebuild` → `gradle.properties` | `android.compileSdkVersion=36`, `android.targetSdkVersion=36` |
      | `expo prebuild` → `app/build.gradle` | `versionCode 10004`, `versionName "1.0.4"` |
      | AGP actually resolved | **8.11.0** (`@react-native/gradle-plugin/gradle/libs.versions.toml`) |
      | `newArchEnabled` in native project | `true`, `hermesEnabled=true` |
      | JVM args applied | `-Xmx4096m -XX:MaxMetaspaceSize=2048m` |
      | P0-1 version guard | still throws on `1.0.100` |

      Two caveats. First, a clean `npm install` was only possible after deleting
      the stale SDK 53 `node_modules` **and** `package-lock.json`; installing
      over the old tree fails `ERESOLVE` on `@expo/vector-icons`. Anyone
      repeating this must clear both. Second, `assets/custom/` is generated at
      build time by `scripts/generate-global-reseller-assets.sh`, which needs
      network and a `CONFIG_ID`; a local bundle test fails until those
      placeholders exist. I created them temporarily to run the export and
      removed them afterwards, so the bundle result above is real but the
      directory is correctly absent in the repo.

      *(mobile — done; still needs P0-3 on real CI output)*

- [ ] **P0-3 · Prove both.** Rebuild Simi, then read the AAB manifest and
      confirm `versionCode` matches the committed project version **and**
      `targetSdkVersion 36`. Do not trust config alone — that is how the
      current versionCode bug stayed invisible across two releases. Note both
      CI builds use `eas build --local`, so the manifest is produced in the
      runner and is inspectable as an artifact.
- [x] **P0-4a · Orientation — the API 36 upgrade silently unlocks rotation.**
      **This item was missing from earlier versions of this report, and it is a
      direct consequence of the P0-2 upgrade rather than a pre-existing bug.**

      `app.config.ts` sets `orientation: "portrait"`, which lands in the
      manifest as `android:screenOrientation="portrait"` on `MainActivity`
      (confirmed by prebuild). On API 35 that is a hard lock. On **API 36 it is
      ignored**, so this app now rotates on tablets, foldables and desktop
      windowing even though it still declares portrait.

      Google's Android 16 behaviour-changes page, quoted exactly: *"For apps
      targeting Android 16 (API level 36), orientation, resizability, and aspect
      ratio restrictions no longer apply on displays with smallest width >=
      600dp."* The ignored attributes include `screenOrientation`,
      `resizableActivity`, `minAspectRatio`, `maxAspectRatio`, and the runtime
      `setRequestedOrientation()`. Portrait, landscape and the `sensor*` /
      `user*` variants are all in the ignored list.

      **Phones are unaffected** — a normal phone is below sw600dp, so portrait
      still holds there. This only changes behaviour on large screens.

      **Why not just opt out.** Android offers
      `android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`, per
      activity or per application. The docs are explicit that it is temporary:
      *"The opt-out is temporary and won't apply when targeting API level 37."*
      Opting out buys one API cycle and then the rotation arrives anyway, on a
      codebase that never adapted. The recommendation is to accept rotation and
      make the layouts survive it, which is what the platform is pushing
      towards. Recorded as a decision, not an oversight.

      **One real bug found and fixed** (`reseller-app` commit `199aa14`).
      `components/PlanCarousel.tsx` sized each carousel page with
      `Dimensions.get("window").width`. That value is read once and never
      updates, so after a rotation every page keeps its pre-rotation width and
      the `pagingEnabled` offsets drift — pages land half-way between snaps.
      Swapped to `useWindowDimensions()`, which re-renders on change. This was
      the **only** non-reactive `Dimensions` usage in the app; nothing else
      reads it, and no other screen had a hard-coded viewport width.

      **What still needs a human.** Everything else is unverified rather than
      proven broken. The layouts use flexbox and percentage widths, and the only
      absolute-positioned elements are overlays pinned with `left`/`right: 0`
      (a scroll shadow, a badge, a toast, a loading scrim) — those stretch
      correctly. But "probably fine" is not "verified", and a phone-portrait
      layout on a 600dp+ landscape tablet is exactly the case nobody tests.
      Screen checklist for P0-4: login, home/dashboard, plan carousel
      (especially this one), transaction history, payment WebView, settings, and
      the modals — on a tablet or unfolded foldable in landscape.

      *(mobile — carousel fixed; device pass still open)*

- [ ] **P0-4 · Device pass on Android 16.** Edge-to-edge and predictive back
      change behaviour. `edgeToEdgeEnabled: true` is already set, so this should
      be fine, but it is unverified. **This pass must now also cover rotation on
      a large screen** (P0-4a) — the two are the same session, since both are
      Android 16 windowing behaviour. Use the screen checklist in P0-4a.
      *(person)*
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
