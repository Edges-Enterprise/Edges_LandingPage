# ARCHITECTURE.md — Edges Network / Edges_LandingPage

**Repository:** `Edges-Enterprise/Edges_LandingPage`
**Branch this document was produced on:** `codebase-analysis` (cut from `reseller-gh`)
**Generated:** 2026-08-29
**Total commits analyzed:** 902 (first commit 2025-06-23, latest 2026-08-16)
**Primary contributor:** Erudite885 (845 commits), Bianca Uche (54), Phoenix-Boss/Phoenix (3)
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · Supabase (Postgres/Auth/Storage) · Firebase (FCM push) · Brevo/Resend/Nodemailer (email) · Flutterwave / Korapay / Xixapay / Payvessel (payment rails) · Zendit / Accragh / Lizzysub (VTU/data upstream providers) · Octokit (GitHub Actions build triggers for reseller Android apps)

## Purpose of this document

This is the exhaustive, file-level map of the entire codebase across all three architectural layers the product has passed through. It exists so that no future session — human or AI — has to re-derive this picture from scratch by crawling the repository again. If you are about to run `find`, `grep -r`, or open dozens of files to "understand the codebase," **stop and read `handover.md` first** — it tells you whether this document is still trustworthy and what to do if it is not.

This document answers, per layer: what routes exist, what server actions exist, what components exist, what library/domain code exists, what API routes exist, and — critically — **which of those files are fully empty (0 bytes) placeholders versus which contain real, working code.** Byte size is used as the completion signal throughout this document: an empty file is an intentional placeholder in the planned file tree, not a bug, not something to delete, and not evidence the feature was attempted and abandoned. It means "this feature is designed into the file/folder structure but not yet written."

## Methodology (see handover.md for the full reproducible procedure)

File counts and empty/non-empty status were derived with `find`, `stat`, and `wc` against the working tree at commit `7603a82` (tip of `reseller-gh` at the time of writing) plus the current uncommitted state of the `codebase-analysis` branch. Layer boundaries were derived from **import-graph analysis**, not guesswork: every route group's actual `import` statements were grepped to see which `actions/`, `components/`, and `lib/` trees it pulls from, and directories were assigned to a layer based on who imports them. Two directories with colliding names but different import roots exist on purpose:

- `src/app/actions/reseller/**` (import alias `@/app/actions/reseller/...`) → **Layer 2**
- `src/actions/reseller/**` (import alias `@/actions/reseller/...`) → **Layer 3**

These are NOT duplicates of each other and must never be merged or deleted into one another. They are separate implementations serving separate route trees. See "Known Irregularities" at the end of this document for more traps like this.

---

## The Three Layers — Overview

| Layer | Name | Status | Route root | File count (ts/tsx) | Empty files | Completion |
|---|---|---|---|---|---|---|
| 1 | Legacy single-tenant consumer VTU app | **Complete, in production** | `(auth)`, `(protected)`, `(admin)`, root `/`, `/edges` | 120 | 0 | 100% |
| 2 | Multi-tenant VTU reseller platform (single country / Nigeria-centric) | **Complete, functional — REFERENCE MATERIAL ONLY, not the active development target** | `(reseller-dashboard)`, `/reseller`, `/api/v1/*` | 72 | 0 | 100% |
| 3 | Multi-country, multi-tenant reseller platform | **Actively being built — THE CURRENT FOCUS** | `/[countryCode]/**` | 981 (across app/actions/components/lib/hooks/config/types/etc.) | 705 | 28% (276/981 files non-empty) |

Layer 1 and Layer 2 are stable and were built to prove the model out (single-tenant consumer app → then a multi-tenant reseller platform on top of it). Layer 3 is the ground-up rebuild that generalizes Layer 2's concept (one reseller, one storefront, one Android app) into a multi-country platform where the country is a first-class routing/config dimension (`[countryCode]`), everything is scaffolded ahead of time as an intentional file tree, and implementation is filled in incrementally. **All new work should happen in Layer 3.** Layer 2 should only be opened to see "how did the working version do X" as a reference when implementing the equivalent Layer 3 feature.


---

## LAYER 1 — Legacy Single-Tenant Consumer VTU App

### Purpose
This is the original product: a direct-to-consumer app where an end user signs up, funds a wallet, and buys airtime, mobile data, cable TV subscriptions, electricity tokens, and exam pins (WAEC/NECO) for themselves, in Nigeria, at a discount. It has its own notification system (push via Firebase + in-app), transaction history, a transaction PIN security layer, and virtual-account wallet funding via Xixapay/Payvessel. This layer predates the idea of "reselling" entirely — there is one tenant (Edges Network itself) and one storefront (the root `/` site and the `/edges` landing page).

### Status
**100% complete, zero empty files, in production.** This is the foundation the other two layers were built on top of. Its `lib/` (Supabase clients, payment gateway wrappers, provider integrations, email) is shared infrastructure that Layers 2 and 3 also depend on — see "Shared Infrastructure" near the end of this document.

### Route tree (App Router)
- `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` — root marketing/landing shell
- `src/app/edges/page.tsx` — secondary marketing landing page ("Edges Network — Nigeria's #1 Platform for Data Bundles & Airtime"), composed from `Hero`, `Features`, `Footer`, `Header` components
- `src/app/ProtectedLayoutClient.tsx` — client-side wrapper enforcing auth on the `(protected)` group
- `src/app/(auth)/sign-in`, `sign-up`, `forgot-password`, `reset-password` — auth flow pages
- `src/app/(protected)/home`, `airtime`, `data`, `data/[id]`, `cable`, `electric`, `education`, `flashsale`, `wallet`, `history`, `notification`, `profile`, `settings`, `support`, `changepassword`, `changepin`, `confirmation`, `commingsoon` — the full consumer app surface
- `src/app/(admin)/panel`, `admin-notifications`, `send-mail` — a small internal admin tool for broadcasting push notifications and emails to consumer users (NOT the same thing as `[countryCode]/admin`, which is Layer 3's country-scoped reseller-management admin — see Known Irregularities)
- `src/app/auth/confirm` — Supabase email-confirmation callback route
- `src/app/contact`, `src/app/help`, `src/app/privacy`, `src/app/terms` — static content pages
- `src/app/redirect/reset-password` — password-reset deep-link redirect handler

### Server Actions (`src/app/actions/*`, flat directory, alias `@/app/actions/...`)
Every file below is fully implemented. Exported action names were extracted directly from source:

- `admin-emails.ts` → `sendAdminEmailAction`
- `admin-notifications.ts` → `sendAdminNotificationAction`, `getNotificationStatsAction`, `checkPushTokenHealthAction`, `cleanupOldProjectTokensAction`
- `airtime.ts` → `purchaseAirtimeAction`, `getWalletBalanceForAirtimeAction`, `checkTransactionPinAction`
- `auth.ts` → `signInAction`, `signUpAction`, `signOutAction`, `deleteOwnAccountAction`, `getTransactionPinAction`, `updateTransactionPinAction`, `forgotPasswordAction`, `resetPasswordAction`, `updatePasswordAction`
- `cable.ts` → `validateIucAction`, `purchaseCableAction`, `getCablePlansAction`
- `data.ts` → `getHotDealsAction`, `getDataPlansAction`, `getWalletBalanceForDataAction`, `checkTransactionPinAction`, `purchaseDataAction`
- `education.ts` → `purchaseExamPinsAction`, `getWalletBalanceForEducationAction`, `checkTransactionPinAction`
- `electricity.ts` → `validateMeterAction`, `purchaseElectricityAction`
- `flashsale.ts` → `getFlashSalePlansAction`, `isFlashSaleActiveAction`, `purchaseFlashSaleAction`, `getWalletBalanceForFlashSaleAction`
- `notifications.ts` → `markNotificationAsReadAction`, `dismissNotificationAction`, `clearAllNotificationsAction`, `markAllAsReadAction`, `saveFCMTokenAction`, `sendWebPushAction`
- `profile.ts` → `updateProfileNotificationsAction`
- `wallet.ts` → `createTransactionPinAction`, `verifyTransactionPinAction`, `getWalletBalanceAction`, `updateTransactionPinAction`, `createVirtualAccountAction`
- `wallet-withxixicopy.ts` → same shape as `wallet.ts` plus `createVirtualAccountXixaPayAction`, `createVirtualAccountPayVesselAction` — **this is a parked/duplicate variant, see Known Irregularities**

### Components (`src/components/*`, flat, non-`reseller/` subtree)
`BundleCard.tsx`, `CreatePinModal.tsx`, `DataScreenHeader.tsx`, `FCMTokenSync.tsx`, `Features.tsx`, `Footer.tsx`, `Header.tsx`, `Hero.tsx`, `InstallationGuide.tsx`, `PurchaseModal.tsx`, `SupportClient.tsx`, `TransactionStatusModal.tsx`, `WalletClient.tsx`, `WalletClient-withxixicopy.tsx` (duplicate, see Known Irregularities), `airtime-client.tsx`, `education-client.tsx`, `forgot-password.tsx`, `modal.tsx`, `reset-password.tsx`, `sign-in-form.tsx`, `sign-up-form.tsx` — all fully implemented, all in active use by `(protected)` and `(auth)` route groups.

### API Routes (non-country-scoped, legacy)
- `POST /api/payment/callback` — generic payment callback handler
- `POST /api/create-customer-virtual-account` — Xixapay/Payvessel virtual account provisioning for a consumer
- `POST /api/create-pin` — transaction PIN creation
- `GET /api/get-transaction-pin` — transaction PIN retrieval/verification
- `POST /api/webhooks/flutterwave` — Flutterwave payment webhook (wallet funding)
- `POST /api/webhooks/korapay` — Korapay payment webhook (imports `@/lib/payments/korapay`, `@/lib/payments/fees`)
- `POST /api/xixa-account/webhook` — Xixapay virtual-account webhook, **53,922 bytes, by far the largest single file in the repository.** Handles virtual account creation confirmations and incoming-payment notifications for the consumer wallet. Imports `@/app/actions/notifications` directly. This file is a strong refactor candidate (see Blueprint/Known Irregularities) but is functionally load-bearing — do not touch without care.

### Constants used by this layer
`src/constants/helper.ts` (7,549 bytes — grab-bag of shared helper functions used across the legacy app), `src/constants/flags.tsx` (62,188 bytes — SVG flag components for country selectors, shared with Layer 3), `src/constants/index.tsx` (15,563 bytes — shared constant data), `src/constants/swatches.ts` (236 bytes).

### Library code owned/originated by this layer (also consumed by Layers 2 & 3 — see Shared Infrastructure)
- `src/lib/payments/flutterwave.ts`, `korapay.ts`, `xixapay.ts`, `fees.ts`, `xixapayFees.ts`, `payment.types.ts`, `index.ts`
- `src/lib/providers/zendit.ts`, `accragh.ts`, `lizzysub.ts`, `provider.types.ts`, `index.ts` — the upstream VTU data providers that actually fulfil airtime/data purchases
- `src/lib/email/email.ts`, `brevo-api.ts`, `validateEmail.ts`
- `src/lib/fcm/firebase.ts` — Firebase Cloud Messaging push setup
- `src/lib/currency/currency.ts`
- `src/lib/webhooks.ts`
- `src/lib/supabase/admin.ts`, `client.ts`, `server.ts` — the Supabase client factories every layer uses


---

## LAYER 2 — Multi-Tenant VTU Reseller Platform (Reference Material Only)

### Purpose
This is the first "reseller" iteration: a single reseller signs up, gets a branded storefront (their own subdomain/store name, e.g. `/reseller/[storeName]`-style resolution), gets their own Android app built and shipped via a GitHub Actions build-trigger pipeline (Octokit), sells airtime/data to their own customers at their own markup, and withdraws their earnings. It also exposes a versioned **public REST API** (`/api/v1/*`) so a reseller's own app/website can integrate directly (API-key auth, OpenAPI docs served live at `/api/v1/docs`).

### Status
**Explicitly instructed by the product owner: this layer is complete and functional, and exists from this point forward ONLY as reference material for how a working feature was implemented. Do not build new product surface here. Do not route new users here. When Layer 3 needs to replicate a Layer-2 behavior (e.g. "how does wallet funding work," "how does the build-trigger pipeline work"), open the corresponding Layer-2 file to see the working pattern, then reimplement it properly inside Layer 3's `src/actions/reseller/**`, `src/components/reseller/**`, and `[countryCode]` route tree — never import Layer-2 code into Layer-3 route files, and never redirect Layer-2 routes into Layer-3 ones or vice versa.**

Zero empty files in this layer — it is fully built out.

### Route tree
- `src/app/(reseller-dashboard)/dashboard/` and subfolders `app/`, `auth/`, `customers/`, `orders/`, `plans/`, `settings/`, `wallet/` — the reseller's own dashboard (single country, single currency, no `[countryCode]` segment)
- `src/app/reseller/success/` — post-application success page
- `src/app/reseller.css` — dedicated stylesheet for this dashboard's theme, separate from the Layer-3 `dashboard-theme.css`

### Server Actions (`src/app/actions/reseller/*`, alias `@/app/actions/reseller/...`)
All fully implemented:
- `checkStoreName.ts` → `checkStoreName`
- `createReseller.ts` → `createReseller`
- `getCustomerAuthEmail.ts` → `getCustomerAuthEmail`
- `getReseller.ts` → `getResellerByStoreName`, `getResellerByAuthId`, `getCurrentReseller`
- `getStoreAsset.ts` → `getStoreAsset`
- `logout.ts` → `logoutReseller`, `logoutCustomer`
- `notifyBuildComplete.ts` → `notifyBuildComplete`
- `regenerateDashboardToken.ts` → `regenerateDashboardToken`
- `registerCustomer.ts` → `registerCustomerToReseller`
- `triggerAppBuild.ts` → `triggerAppBuild` (the GitHub Actions / Octokit build trigger — the working reference for Layer 3's equivalent, currently-empty `src/actions/reseller/publishing/*`)
- `analytics/getDashboardStats.ts` → `getDashboardStats`
- `customers/getCustomers.ts` → `getCustomers`
- `orders/createOrder.ts` → `createOrder`
- `orders/getOrders.ts` → `getOrders`, `getRecentOrders`
- `orders/purchasePlan.ts` → `purchasePlan`
- `plans/getPlans.ts` → `getResellerPlans`, `getStorePlans`, `getBasePlans`
- `plans/updatePlan.ts` → `updateResellerPlan`, `bulkUpdateAllPlans`
- `r-settings/updateSettings.ts` → `updateResellerSettings`
- `wallet/customerVirtualAccount.ts` → `getCustomerVirtualAccounts`, `customerHasVirtualAccount`, `getCustomerWalletWithAccounts`, `createCustomerVirtualAccount`
- `wallet/fundWallet.ts` → `fundWallet`
- `wallet/getTransactions.ts` → `getTransactions`
- `wallet/getWallet.ts` → `getWallet`
- `wallet/resellerCustomerWallet.ts` → `checkResellerCanSell`, `checkResellerStatusById`, `getOrCreateCustomerWallet`, `getResellerVirtualAccounts`, `createResellerVirtualAccount`
- `wallet/withdrawFunds.ts` → `getBanks`, `verifyBankAccount`, `withdrawFunds` — **the working reference for reseller payout-to-bank, the exact feature the product owner called out as "payout to resellers"**

### API Routes
Internal/infra:
- `GET /api/build-config` — Android build configuration fetch (feeds the CI pipeline)
- `POST /api/build-webhook` (two POST handlers) — receives build status callbacks from the GitHub Actions pipeline
- `GET /api/config/korapay` — Korapay public config
- `GET /api/generate-icon` — dynamic app-icon generation for a reseller's Android app
- `POST /api/lizzysub/webhook` — Lizzysub VTU provider webhook
- `GET /api/reseller-configs` — bulk reseller configuration fetch
- `GET /api/store-status` — storefront availability check
- `GET /api/store/storeName/favicon` — dynamic favicon per store (non-country-scoped variant; compare to Layer 3's empty `/api/store/[countryCode]/[storeName]/favicon`)
- `GET /api/trigger-build` — manual build trigger endpoint
- `POST /api/webhooks/xixapay` — Xixapay webhook for reseller/customer wallets specifically (distinct from Layer 1's consumer-facing `/api/xixa-account/webhook`)

Public versioned REST API for resellers' own integrations (`src/app/api/v1/*`, OpenAPI-documented, API-key auth):
- `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/verify`
- `GET /api/v1/docs` — serves a full OpenAPI 3.0 spec (16,204 bytes) titled "Reseller API — API for purchasing data and airtime bundles"
- `GET /api/v1/plans`
- `POST /api/v1/purchase/airtime`, `POST /api/v1/purchase/data`
- `GET/PUT /api/v1/settings`
- `GET /api/v1/transactions`
- `POST /api/v1/wallet/deposit`, `GET /api/v1/wallet`
- `GET/POST /api/v1/webhooks`, `PUT/DELETE /api/v1/webhooks/[webhookId]`, `GET /api/v1/webhooks/[webhookId]/logs`
- `src/app/api/v1/middleware.ts` — API-key auth middleware scoped to this API surface only

### What Layer 3 should mine from Layer 2 when implementing the equivalent feature
| Layer-3 empty/stub area | Layer-2 working reference |
|---|---|
| `src/actions/reseller/publishing/*` (all empty) | `src/app/actions/reseller/triggerAppBuild.ts` + `/api/build-config`, `/api/build-webhook`, `/api/trigger-build`, `/api/generate-icon` |
| `src/actions/reseller/wallet/*` payout pieces | `src/app/actions/reseller/wallet/withdrawFunds.ts` (bank verification + payout) |
| `src/components/reseller/store/*` (all empty) | The working storefront resolution pattern under `(reseller-dashboard)` and `/api/store/storeName/favicon` |
| Public reseller API (not yet started under `[countryCode]`) | The entire `/api/v1/*` surface, including its OpenAPI doc pattern |
| `src/actions/reseller/admin/*` (all empty) | There is no direct Layer-2 admin equivalent — Layer 2 has no admin panel of its own; admin actions for Layer 2 resellers are handled through Layer 1's `(admin)` panel or manually. This is a genuinely new build for Layer 3, not a port. |


---

## LAYER 3 — Multi-Country, Multi-Tenant Reseller Platform (THE ACTIVE DEVELOPMENT TARGET)

### Purpose
The generalization of Layer 2 across many African countries simultaneously. Every route lives under a `[countryCode]` dynamic segment (24 countries configured: BF, BJ, CD, CF, CG, CI, CM, EG, GA, GH, GN, GQ, KE, MA, ML, NE, NG, RW, SN, TD, TG, UG, ZA, ZM). A reseller applies, goes through country-aware KYC verification, gets a branded storefront and (eventually) an Android app, sells to customers in local currency, and is managed by country-scoped admins. This layer additionally introduces product surface Layer 2 never had at all: an AI business assistant/coach, a legal-document generator (ToS/Privacy/Refund policy per store), marketing tooling (flyers, WhatsApp templates, QR codes, social post generation), a referral/commission system, achievements/gamification, and a public status-lookup flow for applicants.

### Status
**28% complete by file count: 276 of 981 files contain real code, 705 are intentional empty placeholders.** This is not a small gap — it is the majority of the planned surface area. The empty files are not missing-by-accident; they represent a deliberately scaffolded file tree (folder structure + file names decided up front) that implementation is being filled into incrementally, feature by feature. Treat an empty file as "planned, not started," never as "broken" or "safe to delete."

### Subsystem completion table
All counts are file-level (`.ts`/`.tsx`), taken directly off the working tree.

| Subsystem | Path | Total | Empty | Non-empty | % done |
|---|---|---|---|---|---|
| **Routes — top-level `[countryCode]` folders** | | | | | |
| Storefront (existing) | `[countryCode]/(store)/` | 4 | 0 | 4 | 100% |
| Storefront (per-store) | `[countryCode]/[storeName]/` | 14 | 1 | 13 | 93% |
| Reseller application | `[countryCode]/apply/` | 5 | 0 | 5 | 100% |
| Sign-in | `[countryCode]/sign-in/` | 1 | 0 | 1 | 100% |
| Success page | `[countryCode]/success/` | 3 | 0 | 3 | 100% |
| Admin panel | `[countryCode]/admin/` | 76 | 76 | 0 | **0%** |
| Launch wizard | `[countryCode]/launch/` | 9 | 9 | 0 | **0%** |
| Onboarding | `[countryCode]/onboarding/` | 3 | 3 | 0 | **0%** |
| Applicant status lookup | `[countryCode]/status/` | 6 | 6 | 0 | **0%** |
| Document/KYC verify | `[countryCode]/verify/` | 4 | 4 | 0 | **0%** |
| **Reseller dashboard subfolders (`[countryCode]/dashboard/`)** | | | | | |
| Dashboard shell (root files) | `dashboard/*.tsx`, layout, page | 12 | 0 | 12 | 100% |
| Store settings | `dashboard/store/` | 10 | 0 | 10 | 100% |
| Wallet | `dashboard/wallet/` | 8 | 0 | 8 | 100% |
| General settings | `dashboard/settings/` | 8 | 0 | 8 | 100% |
| Plans | `dashboard/plans/` | 8 | 1 | 7 | 88% |
| Publishing (app build) | `dashboard/publishing/` | 10 | 3 | 7 | 70% |
| Orders | `dashboard/orders/` | 7 | 1 | 6 | 86% |
| Customers | `dashboard/customers/` | 7 | 1 | 6 | 86% |
| App / build config | `dashboard/app/` | 6 | 3 | 3 | 50% |
| Pending / rejected states | `dashboard/pending/`, `dashboard/rejected/` | 2 | 0 | 2 | 100% |
| Overview | `dashboard/overview/` | 2 | 2 | 0 | **0%** |
| Security | `dashboard/security/` | 7 | 7 | 0 | **0%** |
| Support | `dashboard/support/` | 6 | 6 | 0 | **0%** |
| Legal | `dashboard/legal/` | 9 | 9 | 0 | **0%** |
| Marketing | `dashboard/marketing/` | 10 | 10 | 0 | **0%** |
| Referrals | `dashboard/referrals/` | 5 | 5 | 0 | **0%** |
| Achievements | `dashboard/achievements/` | 5 | 5 | 0 | **0%** |
| Announcements | `dashboard/announcements/` | 6 | 6 | 0 | **0%** |
| Notifications (in-dashboard) | `dashboard/notifications/` | 5 | 5 | 0 | **0%** |
| Help center | `dashboard/help/` | 6 | 6 | 0 | **0%** |
| App lifecycle | `dashboard/app-lifecycle/` | 5 | 5 | 0 | **0%** |
| AI assistant (dashboard UI) | `dashboard/ai/` | 7 | 7 | 0 | **0%** |
| **API routes (country-scoped)** | | | | | |
| Admin API | `api/admin/[countryCode]/**` | 8 | 8 | 0 | **0%** |
| Notifications API | `api/notifications/[countryCode]/**` | 3 | 3 | 0 | **0%** |
| Upload API | `api/upload/[countryCode]/**` | 3 | 3 | 0 | **0%** |
| Reseller API | `api/reseller/[countryCode]/**` | 10 | 7 | 3 | 30% |
| Store API | `api/store/[countryCode]/**` | 4 | 4 | 0 | **0%** |
| Webhooks | `api/webhooks/[countryCode]/**` | 3 | 2 | 1 | 33% |
| **Server actions (`src/actions/reseller/`)** | | | | | |
| Dashboard stats | `actions/reseller/dashboard/` | 8 | 0 | 8 | 100% |
| Plans | `actions/reseller/plans/` | 11 | 2 | 9 | 82% |
| Wallet | `actions/reseller/wallet/` | 9 | 3 | 6 | 67% |
| Build | `actions/reseller/build/` | 8 | 2 | 6 | 75% |
| Customers | `actions/reseller/customers/` | 5 | 1 | 4 | 80% |
| Orders | `actions/reseller/orders/` | 6 | 2 | 4 | 67% |
| Settings | `actions/reseller/settings/` | 7 | 3 | 4 | 57% |
| Application | `actions/reseller/application/` | 12 | 6 | 6 | 50% |
| Store | `actions/reseller/store/` | 8 | 5 | 3 | 38% |
| Admin | `actions/reseller/admin/` | 17 | 17 | 0 | **0%** |
| AI | `actions/reseller/ai/` | 8 | 8 | 0 | **0%** |
| Country | `actions/reseller/country/` | 6 | 6 | 0 | **0%** |
| Launch | `actions/reseller/launch/` | 8 | 8 | 0 | **0%** |
| Marketing | `actions/reseller/marketing/` | 6 | 6 | 0 | **0%** |
| Notifications | `actions/reseller/notifications/` | 7 | 7 | 0 | **0%** |
| Publishing | `actions/reseller/publishing/` | 8 | 8 | 0 | **0%** |
| Referrals | `actions/reseller/referrals/` | 3 | 3 | 0 | **0%** |
| Security | `actions/reseller/security/` | 4 | 4 | 0 | **0%** |
| Support | `actions/reseller/support/` | 6 | 6 | 0 | **0%** |
| Verification | `actions/reseller/verification/` | 5 | 5 | 0 | **0%** |
| Achievements | `actions/reseller/achievements/` | 3 | 3 | 0 | **0%** |
| **Components (`src/components/reseller/`)** | | | | | |
| Country (landing) | `components/reseller/country/` | 11 | 3 | 8 | 73% |
| Application | `components/reseller/application/` | 12 | 5 | 7 | 58% |
| Dashboard | `components/reseller/dashboard/` | 11 | 6 | 5 | 45% |
| Modals | `components/reseller/modals/` | 8 | 4 | 4 | 50% |
| Layout | `components/reseller/layout/` | 9 | 6 | 3 | 33% |
| Achievements, admin, ai, announcements, command-palette, common, forms, launch, legal, marketing, publishing, referrals, security, store, verification | (15 folders) | 106 | 106 | 0 | **0%** |
| **Domain library code (`src/lib/`)** | | | | | |
| Pricing | `lib/pricing/` | 1 | 0 | 1 | 100% |
| Bonus | `lib/bonus/` | 1 | 0 | 1 | 100% |
| Auth helpers | `lib/auth/` | 1 | 0 | 1 | 100% |
| Utils | `lib/utils/` | 4 | 3 | 1 | 25% |
| Business generator (logo) | `lib/business-generator/logo/` | subset | — | 1 | partial |
| AI | `lib/ai/` | 12 | 12 | 0 | **0%** |
| Admin | `lib/admin/` | 3 | 3 | 0 | **0%** |
| Business generator (rest) | `lib/business-generator/` | 24 | 23 | 1 | 4% |
| Publishing | `lib/publishing/` | 6 | 6 | 0 | **0%** |
| Reseller domain rules | `lib/reseller/` | 7 | 7 | 0 | **0%** |
| Storage | `lib/storage/` | 3 | 3 | 0 | **0%** |
| Validation | `lib/validation/` | 3 | 3 | 0 | **0%** |
| Notifications (email/sms/push templates) | `lib/notifications/` | 10 | 10 | 0 | **0%** |
| **Supporting infrastructure** | | | | | |
| Hooks | `src/hooks/` | 26 | 23 | 3 | 12% |
| Config (countries/currencies/etc.) | `src/config/` | 43 | 18 | 25 | 58% |
| Types | `src/types/` | 35 | 27 | 8 | 23% |
| Providers (React context) | `src/providers/` | 6 | 4 | 2 | 33% |
| Middleware helpers | `src/middleware/` | 6 | 6 | 0 | **0%** (note: `src/proxy.ts` at project root is the ACTIVE middleware — see below) |
| Constants | `src/constants/{reseller,admin,notifications,store,countries}/` | 24 | 24 | 0 | **0%** |
| **Database** | | | | | |
| Migrations | `supabase/migrations/` | 13 | 13 | 0 | **0%** |
| RPC function definitions | `supabase/rpc/` | 53 | 53 | 0 | **0%** |

### The one piece of real, active routing infrastructure: `src/proxy.ts`
Despite `src/middleware/*` being 100% empty stubs, country routing is NOT unimplemented — it lives in `src/proxy.ts` at the project root (Next.js's actual middleware entry point for this project), which is fully implemented: it does IP-based country detection (via `ip-api.com`, with an in-memory 1-hour cache), validates against `SUPPORTED_COUNTRIES` from `src/constants/supportedcountries.ts`, and defaults to `ng` for unsupported/undetected countries. **Do not confuse the empty `src/middleware/country-detection.ts` / `country-redirect.ts` stub files for missing functionality — the real implementation is in `proxy.ts`.** The empty middleware files likely represent an intended future refactor to split proxy.ts's responsibilities (auth, rate-limiting, store-auth, admin-auth, reseller-auth) into separate composable middleware modules, none of which exist yet except country detection (done, just not in the "right" file per the scaffold).

### Country configuration — genuinely complete
All 24 `src/config/countries/*.ts` files are implemented (`COUNTRY_BF`, `COUNTRY_NG`, etc.), plus `src/config/countries/index.ts` which exports `SUPPORTED_COUNTRIES`, `COUNTRIES`, `getCountryConfig`, `getDefaultCountry`, `getSupportedCountries`, `getCountryByLanguage`, `getCountriesByRegion`, `getCountriesByCurrency`. This is one of the most complete subsystems in Layer 3 and should be treated as stable, load-bearing code.


### Appendix A — Every non-empty (implemented) file in Layer 3, verbatim

These 276 files are the entire real, working surface area of the multi-country platform as of this writing. Every one of them was verified non-zero-byte on disk.

- `388` (src/app/[countryCode]/(store)/layout.tsx bytes)
- `126021` (src/app/[countryCode]/(store)/old-storeName/StoreContent.tsx bytes)
- `1042` (src/app/[countryCode]/(store)/old-storeName/layout.tsx bytes)
- `4145` (src/app/[countryCode]/(store)/old-storeName/page.tsx bytes)
- `9302` (src/app/[countryCode]/[storeName]/StoreCart.tsx bytes)
- `17310` (src/app/[countryCode]/[storeName]/StoreCheckout.tsx bytes)
- `5728` (src/app/[countryCode]/[storeName]/StoreContent.tsx bytes)
- `877` (src/app/[countryCode]/[storeName]/StoreFooter.tsx bytes)
- `91176` (src/app/[countryCode]/[storeName]/StoreHeader.tsx bytes)
- `5959` (src/app/[countryCode]/[storeName]/StoreHero.tsx bytes)
- `3890` (src/app/[countryCode]/[storeName]/StoreLayoutClient.tsx bytes)
- `17731` (src/app/[countryCode]/[storeName]/StoreProducts.tsx bytes)
- `2401` (src/app/[countryCode]/[storeName]/error.tsx bytes)
- `6566` (src/app/[countryCode]/[storeName]/layout.tsx bytes)
- `848` (src/app/[countryCode]/[storeName]/loading.tsx bytes)
- `4678` (src/app/[countryCode]/[storeName]/not-found.tsx bytes)
- `5879` (src/app/[countryCode]/[storeName]/page.tsx bytes)
- `6019` (src/app/[countryCode]/[storeName]/store-theme.css bytes)
- `3085` (src/app/[countryCode]/apply/ApplicationClient.tsx bytes)
- `2379` (src/app/[countryCode]/apply/error.tsx bytes)
- `196` (src/app/[countryCode]/apply/layout.tsx bytes)
- `247` (src/app/[countryCode]/apply/loading.tsx bytes)
- `1231` (src/app/[countryCode]/apply/page.tsx bytes)
- `4290` (src/app/[countryCode]/dashboard/ActivityFeed.tsx bytes)
- `5206` (src/app/[countryCode]/dashboard/DashboardClient.tsx bytes)
- `4231` (src/app/[countryCode]/dashboard/QuickActions.tsx bytes)
- `5464` (src/app/[countryCode]/dashboard/RevenueChart.tsx bytes)
- `4616` (src/app/[countryCode]/dashboard/StatsCards.tsx bytes)
- `15974` (src/app/[countryCode]/dashboard/app/AppBuildClient.tsx bytes)
- `277` (src/app/[countryCode]/dashboard/app/layout.tsx bytes)
- `431` (src/app/[countryCode]/dashboard/app/page.tsx bytes)
- `13603` (src/app/[countryCode]/dashboard/customers/AddCustomerModal.tsx bytes)
- `14006` (src/app/[countryCode]/dashboard/customers/CustomerDetailsModal.tsx bytes)
- `15674` (src/app/[countryCode]/dashboard/customers/CustomerTable.tsx bytes)
- `13181` (src/app/[countryCode]/dashboard/customers/CustomersClient.tsx bytes)
- `301` (src/app/[countryCode]/dashboard/customers/layout.tsx bytes)
- `5027` (src/app/[countryCode]/dashboard/customers/page.tsx bytes)
- `6277` (src/app/[countryCode]/dashboard/dashboard-theme.css bytes)
- `880` (src/app/[countryCode]/dashboard/error.tsx bytes)
- `11618` (src/app/[countryCode]/dashboard/layout.tsx bytes)
- `3705` (src/app/[countryCode]/dashboard/loading.tsx bytes)
- `15202` (src/app/[countryCode]/dashboard/orders/OrderDetailsModal.tsx bytes)
- `15724` (src/app/[countryCode]/dashboard/orders/OrdersClient.tsx bytes)
- `14935` (src/app/[countryCode]/dashboard/orders/OrdersTable.tsx bytes)
- `9894` (src/app/[countryCode]/dashboard/orders/UpdateStatusModal.tsx bytes)
- `289` (src/app/[countryCode]/dashboard/orders/layout.tsx bytes)
- `5489` (src/app/[countryCode]/dashboard/orders/page.tsx bytes)
- `8217` (src/app/[countryCode]/dashboard/page.tsx bytes)
- `6209` (src/app/[countryCode]/dashboard/pending/page.tsx bytes)
- `17656` (src/app/[countryCode]/dashboard/plans/BulkPricingModal.tsx bytes)
- `13038` (src/app/[countryCode]/dashboard/plans/CreatePlanModal.tsx bytes)
- `14645` (src/app/[countryCode]/dashboard/plans/EditPlanModal.tsx bytes)
- `11420` (src/app/[countryCode]/dashboard/plans/PlanCard.tsx bytes)
- `77551` (src/app/[countryCode]/dashboard/plans/PlansClient.tsx bytes)
- `285` (src/app/[countryCode]/dashboard/plans/layout.tsx bytes)
- `2844` (src/app/[countryCode]/dashboard/plans/page.tsx bytes)
- `9494` (src/app/[countryCode]/dashboard/publishing/AppAssets.tsx bytes)
- `6202` (src/app/[countryCode]/dashboard/publishing/BuildHistory.tsx bytes)
- `8990` (src/app/[countryCode]/dashboard/publishing/BuildStatus.tsx bytes)
- `19392` (src/app/[countryCode]/dashboard/publishing/PublishingClient.tsx bytes)
- `43302` (src/app/[countryCode]/dashboard/publishing/PublishingPlans.tsx bytes)
- `185` (src/app/[countryCode]/dashboard/publishing/layout.tsx bytes)
- `5967` (src/app/[countryCode]/dashboard/publishing/page.tsx bytes)
- `6121` (src/app/[countryCode]/dashboard/rejected/page.tsx bytes)
- `9341` (src/app/[countryCode]/dashboard/settings/BusinessSettings.tsx bytes)
- `10913` (src/app/[countryCode]/dashboard/settings/NotificationSettings.tsx bytes)
- `8040` (src/app/[countryCode]/dashboard/settings/PreferencesSettings.tsx bytes)
- `10942` (src/app/[countryCode]/dashboard/settings/ProfileSettings.tsx bytes)
- `13901` (src/app/[countryCode]/dashboard/settings/SecuritySettings.tsx bytes)
- `5825` (src/app/[countryCode]/dashboard/settings/SettingsClient.tsx bytes)
- `297` (src/app/[countryCode]/dashboard/settings/layout.tsx bytes)
- `6586` (src/app/[countryCode]/dashboard/settings/page.tsx bytes)
- `17228` (src/app/[countryCode]/dashboard/store/BrandingSettings.tsx bytes)
- `8595` (src/app/[countryCode]/dashboard/store/BrandingUploader.tsx bytes)
- `7130` (src/app/[countryCode]/dashboard/store/StoreClient.tsx bytes)
- `10476` (src/app/[countryCode]/dashboard/store/StorePreview.tsx bytes)
- `12280` (src/app/[countryCode]/dashboard/store/StoreSettings.tsx bytes)
- `8655` (src/app/[countryCode]/dashboard/store/StoreUrlGenerator.tsx bytes)
- `11470` (src/app/[countryCode]/dashboard/store/ThemeSelector.tsx bytes)
- `10397` (src/app/[countryCode]/dashboard/store/ThemeSettings.tsx bytes)
- `285` (src/app/[countryCode]/dashboard/store/layout.tsx bytes)
- `7309` (src/app/[countryCode]/dashboard/store/page.tsx bytes)
- `13381` (src/app/[countryCode]/dashboard/wallet/FundWalletModal.tsx bytes)
- `9248` (src/app/[countryCode]/dashboard/wallet/TransactionHistory.tsx bytes)
- `18361` (src/app/[countryCode]/dashboard/wallet/VirtualAccount.tsx bytes)
- `22766` (src/app/[countryCode]/dashboard/wallet/WalletClient.tsx bytes)
- `4439` (src/app/[countryCode]/dashboard/wallet/WalletSummary.tsx bytes)
- `12684` (src/app/[countryCode]/dashboard/wallet/WithdrawModal.tsx bytes)
- `289` (src/app/[countryCode]/dashboard/wallet/layout.tsx bytes)
- `15683` (src/app/[countryCode]/dashboard/wallet/page.tsx bytes)
- `17540` (src/app/[countryCode]/generateIcon.ts bytes)
- `647` (src/app/[countryCode]/layout.tsx bytes)
- `275` (src/app/[countryCode]/loading.tsx bytes)
- `2126` (src/app/[countryCode]/page.tsx bytes)
- `8190` (src/app/[countryCode]/sign-in/page.tsx bytes)
- `12115` (src/app/[countryCode]/success/SuccessClient.tsx bytes)
- `200` (src/app/[countryCode]/success/layout.tsx bytes)
- `1362` (src/app/[countryCode]/success/page.tsx bytes)
- `4118` (src/app/api/reseller/[countryCode]/config/[configId]/route.ts bytes)
- `5881` (src/app/api/reseller/[countryCode]/wallet/fund/route.ts bytes)
- `2867` (src/app/api/reseller/[countryCode]/webhooks/build/route.ts bytes)
- `2911` (src/app/api/webhooks/[countryCode]/payment/route.ts bytes)
- `1715` (src/actions/reseller/application/checkStoreSlug.ts bytes)
- `1161` (src/actions/reseller/application/getApplicationDraft.ts bytes)
- `1539` (src/actions/reseller/application/getApplicationStatus.ts bytes)
- `278` (src/actions/reseller/application/index.ts bytes)
- `2248` (src/actions/reseller/application/saveApplicationDraft.ts bytes)
- `13057` (src/actions/reseller/application/submitApplication.ts bytes)
- `1438` (src/actions/reseller/build/completeBuild.ts bytes)
- `2716` (src/actions/reseller/build/getBuildContext.ts bytes)
- `5083` (src/actions/reseller/build/getBuildHistory.ts bytes)
- `3881` (src/actions/reseller/build/getBuildStatus.ts bytes)
- `485` (src/actions/reseller/build/index.ts bytes)
- `7336` (src/actions/reseller/build/triggerAppBuild.ts bytes)
- `2463` (src/actions/reseller/customers/createCustomer.ts bytes)
- `2748` (src/actions/reseller/customers/getCustomerDetails.ts bytes)
- `3483` (src/actions/reseller/customers/getCustomers.ts bytes)
- `2405` (src/actions/reseller/customers/updateCustomer.ts bytes)
- `1157` (src/actions/reseller/dashboard/getCustomerGrowth.ts bytes)
- `1823` (src/actions/reseller/dashboard/getDashboardStats.ts bytes)
- `3710` (src/actions/reseller/dashboard/getEarningsReport.ts bytes)
- `1345` (src/actions/reseller/dashboard/getPerformanceMetrics.ts bytes)
- `1268` (src/actions/reseller/dashboard/getRecentActivity.ts bytes)
- `1263` (src/actions/reseller/dashboard/getRevenueBreakdown.ts bytes)
- `1180` (src/actions/reseller/dashboard/getTopProducts.ts bytes)
- `926` (src/actions/reseller/dashboard/index.ts bytes)
- `2416` (src/actions/reseller/orders/createOrder.ts bytes)
- `2277` (src/actions/reseller/orders/getOrderDetails.ts bytes)
- `3052` (src/actions/reseller/orders/getOrders.ts bytes)
- `1512` (src/actions/reseller/orders/updateOrderStatus.ts bytes)
- `7984` (src/actions/reseller/plans/bulkUpdatePlans.ts bytes)
- `2087` (src/actions/reseller/plans/createPlan.ts bytes)
- `1341` (src/actions/reseller/plans/deletePlan.ts bytes)
- `3019` (src/actions/reseller/plans/getPlanStats.ts bytes)
- `24224` (src/actions/reseller/plans/getPlans.ts bytes)
- `453` (src/actions/reseller/plans/index.ts bytes)
- `6636` (src/actions/reseller/plans/togglePlan.ts bytes)
- `3144` (src/actions/reseller/plans/updatePlan.ts bytes)
- `3324` (src/actions/reseller/plans/updatePlanConfig.ts bytes)
- `1300` (src/actions/reseller/settings/changePassword.ts bytes)
- `1643` (src/actions/reseller/settings/changeTransactionPin.ts bytes)
- `2671` (src/actions/reseller/settings/updateNotificationSettings.ts bytes)
- `2945` (src/actions/reseller/settings/updateProfile.ts bytes)
- `2588` (src/actions/reseller/store/updateStoreSettings.ts bytes)
- `2341` (src/actions/reseller/store/updateStoreTheme.ts bytes)
- `2850` (src/actions/reseller/store/uploadLogo.ts bytes)
- `3356` (src/actions/reseller/wallet/createVirtualAccount.ts bytes)
- `4946` (src/actions/reseller/wallet/fundWallet.ts bytes)
- `1878` (src/actions/reseller/wallet/getTransactions.ts bytes)
- `5662` (src/actions/reseller/wallet/getWallet.ts bytes)
- `5569` (src/actions/reseller/wallet/handleSuccessfulDeposit.ts bytes)
- `13906` (src/actions/reseller/wallet/withdrawFunds.ts bytes)
- `10024` (src/components/reseller/ResellerBenefits.tsx bytes)
- `5791` (src/components/reseller/ResellerCTA.tsx bytes)
- `10105` (src/components/reseller/ResellerCommissionTiers.tsx bytes)
- `5520` (src/components/reseller/ResellerFAQ.tsx bytes)
- `1397` (src/components/reseller/ResellerFooter.tsx bytes)
- `8979` (src/components/reseller/ResellerHero.tsx bytes)
- `5380` (src/components/reseller/ResellerHowItWorks.tsx bytes)
- `11206` (src/components/reseller/ResellerNavbar.tsx bytes)
- `13126` (src/components/reseller/application/AccountInfoStep.tsx bytes)
- `4002` (src/components/reseller/application/ApplicationSkeleton.tsx bytes)
- `7366` (src/components/reseller/application/ApplicationWizard.tsx bytes)
- `9377` (src/components/reseller/application/ReviewStep.tsx bytes)
- `478` (src/components/reseller/application/StepContainer.tsx bytes)
- `2923` (src/components/reseller/application/StepIndicator.tsx bytes)
- `211372` (src/components/reseller/application/StoreConfigStep.tsx bytes)
- `12333` (src/components/reseller/country/CountryBenefits.tsx bytes)
- `6623` (src/components/reseller/country/CountryCTA.tsx bytes)
- `5917` (src/components/reseller/country/CountryFAQ.tsx bytes)
- `2077` (src/components/reseller/country/CountryFooter.tsx bytes)
- `10055` (src/components/reseller/country/CountryHero.tsx bytes)
- `6113` (src/components/reseller/country/CountryHowItWorks.tsx bytes)
- `10678` (src/components/reseller/country/CountryNavbar.tsx bytes)
- `12528` (src/components/reseller/country/CountryPricing.tsx bytes)
- `6805` (src/components/reseller/dashboard/ActivityFeed.tsx bytes)
- `2943` (src/components/reseller/dashboard/QuickActions.tsx bytes)
- `7118` (src/components/reseller/dashboard/RevenueChart.tsx bytes)
- `2688` (src/components/reseller/dashboard/StatsCard.tsx bytes)
- `544` (src/components/reseller/dashboard/index.ts bytes)
- `5312` (src/components/reseller/layout/DashboardHeader.tsx bytes)
- `6238` (src/components/reseller/layout/DashboardSidebar.tsx bytes)
- `2713` (src/components/reseller/layout/ThemeToggle.tsx bytes)
- `9997` (src/components/reseller/modals/CreateCustomerModal.tsx bytes)
- `12850` (src/components/reseller/modals/CreateOrderModal.tsx bytes)
- `6991` (src/components/reseller/modals/FundWalletModal.tsx bytes)
- `8720` (src/components/reseller/modals/WithdrawModal.tsx bytes)
- `1801` (src/lib/auth/email-lookup.ts bytes)
- `2698` (src/lib/bonus/first-deposit.ts bytes)
- `53954` (src/lib/business-generator/logo/generator.ts bytes)
- `1261` (src/lib/pricing/calculatePrice.ts bytes)
- `194` (src/hooks/common/useCountry.ts bytes)
- `1535` (src/hooks/common/useFavicon.ts bytes)
- `820` (src/hooks/useInView.ts bytes)
- `884` (src/constants/supportedcountries.ts bytes)
- `26712` (src/proxy.ts bytes)
- `6674` (src/types/index.ts bytes)
- `723` (src/types/reseller/customers.ts bytes)
- `1075` (src/types/reseller/orders.ts bytes)
- `3860` (src/types/reseller/plans.ts bytes)
- `1698` (src/types/reseller/publishing.ts bytes)
- `1371` (src/types/reseller/settings.ts bytes)
- `1186` (src/types/reseller/store.ts bytes)
- `1138` (src/types/reseller/storefront.ts bytes)
- `640` (src/providers/CountryProvider.tsx bytes)
- `3230` (src/providers/ThemeProvider.tsx bytes)
- `1321` (src/config/countries/bf.ts bytes)
- `1229` (src/config/countries/bj.ts bytes)
- `1341` (src/config/countries/cd.ts bytes)
- `1220` (src/config/countries/cf.ts bytes)
- `1175` (src/config/countries/cg.ts bytes)
- `1300` (src/config/countries/ci.ts bytes)
- `1297` (src/config/countries/cm.ts bytes)
- `1351` (src/config/countries/eg.ts bytes)
- `1177` (src/config/countries/ga.ts bytes)
- `1327` (src/config/countries/gh.ts bytes)
- `1292` (src/config/countries/gn.ts bytes)
- `1269` (src/config/countries/gq.ts bytes)
- `5038` (src/config/countries/index.ts bytes)
- `1344` (src/config/countries/ke.ts bytes)
- `1271` (src/config/countries/ma.ts bytes)
- `1296` (src/config/countries/ml.ts bytes)
- `1286` (src/config/countries/ne.ts bytes)
- `1463` (src/config/countries/ng.ts bytes)
- `1297` (src/config/countries/rw.ts bytes)
- `1287` (src/config/countries/sn.ts bytes)
- `1234` (src/config/countries/td.ts bytes)
- `1226` (src/config/countries/tg.ts bytes)
- `1355` (src/config/countries/ug.ts bytes)
- `1377` (src/config/countries/za.ts bytes)
- `1311` (src/config/countries/zm.ts bytes)
- `3442` (src/messages/ar/apply.json bytes)
- `2478` (src/messages/ar/customers.json bytes)
- `1635` (src/messages/ar/dashboard.json bytes)
- `8742` (src/messages/ar/landing.json bytes)
- `2375` (src/messages/ar/orders.json bytes)
- `1103` (src/messages/ar/plans.json bytes)
- `3825` (src/messages/ar/publishing.json bytes)
- `3888` (src/messages/ar/settings.json bytes)
- `3875` (src/messages/ar/store.json bytes)
- `2013` (src/messages/ar/storefront.json bytes)
- `1333` (src/messages/ar/success.json bytes)
- `2325` (src/messages/ar/wallet.json bytes)
- `2532` (src/messages/en/apply.json bytes)
- `1941` (src/messages/en/customers.json bytes)
- `1149` (src/messages/en/dashboard.json bytes)
- `6612` (src/messages/en/landing.json bytes)
- `1815` (src/messages/en/orders.json bytes)
- `908` (src/messages/en/plans.json bytes)
- `3052` (src/messages/en/publishing.json bytes)
- `2810` (src/messages/en/settings.json bytes)
- `2863` (src/messages/en/store.json bytes)
- `1527` (src/messages/en/storefront.json bytes)
- `970` (src/messages/en/success.json bytes)
- `1703` (src/messages/en/wallet.json bytes)
- `1322` (src/messages/es/dashboard.json bytes)
- `938` (src/messages/es/plans.json bytes)
- `3402` (src/messages/es/publishing.json bytes)
- `1968` (src/messages/es/wallet.json bytes)
- `2976` (src/messages/fr/apply.json bytes)
- `2143` (src/messages/fr/customers.json bytes)
- `1311` (src/messages/fr/dashboard.json bytes)
- `7842` (src/messages/fr/landing.json bytes)
- `2112` (src/messages/fr/orders.json bytes)
- `977` (src/messages/fr/plans.json bytes)
- `3572` (src/messages/fr/publishing.json bytes)
- `3306` (src/messages/fr/settings.json bytes)
- `3432` (src/messages/fr/store.json bytes)
- `1760` (src/messages/fr/storefront.json bytes)
- `1119` (src/messages/fr/success.json bytes)
- `2042` (src/messages/fr/wallet.json bytes)
- `1307` (src/messages/pt/dashboard.json bytes)
- `1990` (src/messages/pt/plans.json bytes)
- `3380` (src/messages/pt/publishing.json bytes)
- `1957` (src/messages/pt/wallet.json bytes)
- `3920` (src/lib/utils/helpers.ts bytes)

### Appendix B — Every empty (unimplemented placeholder) file in Layer 3, verbatim

These 705 files exist on disk as 0-byte placeholders. They are the scaffold of the intended final feature set. `blueprint.md` groups these into a feature checklist with priority; this appendix is the raw, complete, ground-truth list for verification and diffing purposes (e.g. to detect scope creep in the scaffold, or to check off files as they get implemented).

- `src/app/[countryCode]/[storeName]/StoreOrderConfirmation.tsx`
- `src/app/[countryCode]/admin/applications/ApplicationActions.tsx`
- `src/app/[countryCode]/admin/applications/ApplicationFilters.tsx`
- `src/app/[countryCode]/admin/applications/ApplicationQueue.tsx`
- `src/app/[countryCode]/admin/applications/ApplicationStats.tsx`
- `src/app/[countryCode]/admin/applications/ApplicationsClient.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/ApplicantProfile.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/ApplicationDetailsClient.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/ApplicationTimeline.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/ApprovalActions.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/DocumentReview.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/InternalNotes.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/RiskAssessment.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/layout.tsx`
- `src/app/[countryCode]/admin/applications/[applicationId]/page.tsx`
- `src/app/[countryCode]/admin/applications/layout.tsx`
- `src/app/[countryCode]/admin/applications/page.tsx`
- `src/app/[countryCode]/admin/compliance/AMLCompliance.tsx`
- `src/app/[countryCode]/admin/compliance/AuditLogs.tsx`
- `src/app/[countryCode]/admin/compliance/ComplianceClient.tsx`
- `src/app/[countryCode]/admin/compliance/KYCCompliance.tsx`
- `src/app/[countryCode]/admin/compliance/layout.tsx`
- `src/app/[countryCode]/admin/compliance/page.tsx`
- `src/app/[countryCode]/admin/dashboard/AdminActivityFeed.tsx`
- `src/app/[countryCode]/admin/dashboard/AdminCharts.tsx`
- `src/app/[countryCode]/admin/dashboard/AdminDashboardClient.tsx`
- `src/app/[countryCode]/admin/dashboard/AdminStats.tsx`
- `src/app/[countryCode]/admin/dashboard/layout.tsx`
- `src/app/[countryCode]/admin/dashboard/page.tsx`
- `src/app/[countryCode]/admin/error.tsx`
- `src/app/[countryCode]/admin/layout.tsx`
- `src/app/[countryCode]/admin/loading.tsx`
- `src/app/[countryCode]/admin/notifications/AdminNotificationsClient.tsx`
- `src/app/[countryCode]/admin/notifications/NotificationComposer.tsx`
- `src/app/[countryCode]/admin/notifications/NotificationTemplates.tsx`
- `src/app/[countryCode]/admin/notifications/layout.tsx`
- `src/app/[countryCode]/admin/notifications/page.tsx`
- `src/app/[countryCode]/admin/page.tsx`
- `src/app/[countryCode]/admin/reports/ApplicationReport.tsx`
- `src/app/[countryCode]/admin/reports/GrowthReport.tsx`
- `src/app/[countryCode]/admin/reports/ReportFilters.tsx`
- `src/app/[countryCode]/admin/reports/ReportsClient.tsx`
- `src/app/[countryCode]/admin/reports/RevenueReport.tsx`
- `src/app/[countryCode]/admin/reports/layout.tsx`
- `src/app/[countryCode]/admin/reports/page.tsx`
- `src/app/[countryCode]/admin/resellers/ResellerActions.tsx`
- `src/app/[countryCode]/admin/resellers/ResellerFilters.tsx`
- `src/app/[countryCode]/admin/resellers/ResellerStats.tsx`
- `src/app/[countryCode]/admin/resellers/ResellersClient.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/ResellerActions.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/ResellerCustomers.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/ResellerDetailsClient.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/ResellerPerformance.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/ResellerProfile.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/ResellerTransactions.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/layout.tsx`
- `src/app/[countryCode]/admin/resellers/[resellerId]/page.tsx`
- `src/app/[countryCode]/admin/resellers/layout.tsx`
- `src/app/[countryCode]/admin/resellers/page.tsx`
- `src/app/[countryCode]/admin/settings/AdminSettingsClient.tsx`
- `src/app/[countryCode]/admin/settings/CountrySettings.tsx`
- `src/app/[countryCode]/admin/settings/FeatureToggles.tsx`
- `src/app/[countryCode]/admin/settings/KYCRequirements.tsx`
- `src/app/[countryCode]/admin/settings/PricingSettings.tsx`
- `src/app/[countryCode]/admin/settings/layout.tsx`
- `src/app/[countryCode]/admin/settings/page.tsx`
- `src/app/[countryCode]/admin/verifications/VerificationActions.tsx`
- `src/app/[countryCode]/admin/verifications/VerificationQueue.tsx`
- `src/app/[countryCode]/admin/verifications/VerificationsClient.tsx`
- `src/app/[countryCode]/admin/verifications/[verificationId]/DocumentVerification.tsx`
- `src/app/[countryCode]/admin/verifications/[verificationId]/IdentityVerification.tsx`
- `src/app/[countryCode]/admin/verifications/[verificationId]/VerificationActions.tsx`
- `src/app/[countryCode]/admin/verifications/[verificationId]/VerificationDetailsClient.tsx`
- `src/app/[countryCode]/admin/verifications/[verificationId]/layout.tsx`
- `src/app/[countryCode]/admin/verifications/[verificationId]/page.tsx`
- `src/app/[countryCode]/admin/verifications/layout.tsx`
- `src/app/[countryCode]/admin/verifications/page.tsx`
- `src/app/[countryCode]/dashboard/Badge.tsx`
- `src/app/[countryCode]/dashboard/Card.tsx`
- `src/app/[countryCode]/dashboard/achievements/AchievementClient.tsx`
- `src/app/[countryCode]/dashboard/achievements/BadgeCollection.tsx`
- `src/app/[countryCode]/dashboard/achievements/Milestones.tsx`
- `src/app/[countryCode]/dashboard/achievements/layout.tsx`
- `src/app/[countryCode]/dashboard/achievements/page.tsx`
- `src/app/[countryCode]/dashboard/ai/AIChat.tsx`
- `src/app/[countryCode]/dashboard/ai/AIClient.tsx`
- `src/app/[countryCode]/dashboard/ai/AIInsights.tsx`
- `src/app/[countryCode]/dashboard/ai/BusinessCoach.tsx`
- `src/app/[countryCode]/dashboard/ai/QuickQuestions.tsx`
- `src/app/[countryCode]/dashboard/ai/layout.tsx`
- `src/app/[countryCode]/dashboard/ai/page.tsx`
- `src/app/[countryCode]/dashboard/announcements/AnnouncementClient.tsx`
- `src/app/[countryCode]/dashboard/announcements/Promotions.tsx`
- `src/app/[countryCode]/dashboard/announcements/SystemUpdates.tsx`
- `src/app/[countryCode]/dashboard/announcements/WhatsNew.tsx`
- `src/app/[countryCode]/dashboard/announcements/layout.tsx`
- `src/app/[countryCode]/dashboard/announcements/page.tsx`
- `src/app/[countryCode]/dashboard/app-lifecycle/AppLifecycleClient.tsx`
- `src/app/[countryCode]/dashboard/app-lifecycle/BuildStatus.tsx`
- `src/app/[countryCode]/dashboard/app-lifecycle/VersionHistory.tsx`
- `src/app/[countryCode]/dashboard/app-lifecycle/layout.tsx`
- `src/app/[countryCode]/dashboard/app-lifecycle/page.tsx`
- `src/app/[countryCode]/dashboard/app/AppBuildStatus.tsx`
- `src/app/[countryCode]/dashboard/app/AppConfigForm.tsx`
- `src/app/[countryCode]/dashboard/app/AppDownloadLinks.tsx`
- `src/app/[countryCode]/dashboard/customers/CustomerFilters.tsx`
- `src/app/[countryCode]/dashboard/help/HelpArticle.tsx`
- `src/app/[countryCode]/dashboard/help/HelpClient.tsx`
- `src/app/[countryCode]/dashboard/help/HelpSearch.tsx`
- `src/app/[countryCode]/dashboard/help/HelpSidebar.tsx`
- `src/app/[countryCode]/dashboard/help/layout.tsx`
- `src/app/[countryCode]/dashboard/help/page.tsx`
- `src/app/[countryCode]/dashboard/legal/AcceptableUse.tsx`
- `src/app/[countryCode]/dashboard/legal/ComplianceDashboard.tsx`
- `src/app/[countryCode]/dashboard/legal/LegalClient.tsx`
- `src/app/[countryCode]/dashboard/legal/PolicyGenerator.tsx`
- `src/app/[countryCode]/dashboard/legal/PrivacyPolicy.tsx`
- `src/app/[countryCode]/dashboard/legal/RefundPolicy.tsx`
- `src/app/[countryCode]/dashboard/legal/TermsOfService.tsx`
- `src/app/[countryCode]/dashboard/legal/layout.tsx`
- `src/app/[countryCode]/dashboard/legal/page.tsx`
- `src/app/[countryCode]/dashboard/marketing/BroadcastMessages.tsx`
- `src/app/[countryCode]/dashboard/marketing/FlyerGenerator.tsx`
- `src/app/[countryCode]/dashboard/marketing/MarketingClient.tsx`
- `src/app/[countryCode]/dashboard/marketing/QRCodeGenerator.tsx`
- `src/app/[countryCode]/dashboard/marketing/ReferralHub.tsx`
- `src/app/[countryCode]/dashboard/marketing/ShareStore.tsx`
- `src/app/[countryCode]/dashboard/marketing/SocialPosts.tsx`
- `src/app/[countryCode]/dashboard/marketing/WhatsAppTemplates.tsx`
- `src/app/[countryCode]/dashboard/marketing/layout.tsx`
- `src/app/[countryCode]/dashboard/marketing/page.tsx`
- `src/app/[countryCode]/dashboard/notifications/NotificationFilters.tsx`
- `src/app/[countryCode]/dashboard/notifications/NotificationItem.tsx`
- `src/app/[countryCode]/dashboard/notifications/NotificationsClient.tsx`
- `src/app/[countryCode]/dashboard/notifications/layout.tsx`
- `src/app/[countryCode]/dashboard/notifications/page.tsx`
- `src/app/[countryCode]/dashboard/orders/OrderFilters.tsx`
- `src/app/[countryCode]/dashboard/overview/OverviewClient.tsx`
- `src/app/[countryCode]/dashboard/overview/page.tsx`
- `src/app/[countryCode]/dashboard/plans/PlanPricingCalculator.tsx`
- `src/app/[countryCode]/dashboard/publishing/AppLifecycle.tsx`
- `src/app/[countryCode]/dashboard/publishing/DistributionSettings.tsx`
- `src/app/[countryCode]/dashboard/publishing/PublishingStatus.tsx`
- `src/app/[countryCode]/dashboard/referrals/ReferralClient.tsx`
- `src/app/[countryCode]/dashboard/referrals/ReferralLeaderboard.tsx`
- `src/app/[countryCode]/dashboard/referrals/ReferralStats.tsx`
- `src/app/[countryCode]/dashboard/referrals/layout.tsx`
- `src/app/[countryCode]/dashboard/referrals/page.tsx`
- `src/app/[countryCode]/dashboard/security/DeviceManagement.tsx`
- `src/app/[countryCode]/dashboard/security/LoginHistory.tsx`
- `src/app/[countryCode]/dashboard/security/SecurityClient.tsx`
- `src/app/[countryCode]/dashboard/security/SessionManagement.tsx`
- `src/app/[countryCode]/dashboard/security/TwoFactorAuth.tsx`
- `src/app/[countryCode]/dashboard/security/layout.tsx`
- `src/app/[countryCode]/dashboard/security/page.tsx`
- `src/app/[countryCode]/dashboard/support/CreateTicketModal.tsx`
- `src/app/[countryCode]/dashboard/support/SupportClient.tsx`
- `src/app/[countryCode]/dashboard/support/TicketDetails.tsx`
- `src/app/[countryCode]/dashboard/support/TicketList.tsx`
- `src/app/[countryCode]/dashboard/support/layout.tsx`
- `src/app/[countryCode]/dashboard/support/page.tsx`
- `src/app/[countryCode]/launch/AppSetup.tsx`
- `src/app/[countryCode]/launch/BrandingSetup.tsx`
- `src/app/[countryCode]/launch/BusinessSetup.tsx`
- `src/app/[countryCode]/launch/LaunchClient.tsx`
- `src/app/[countryCode]/launch/LaunchComplete.tsx`
- `src/app/[countryCode]/launch/LaunchWizard.tsx`
- `src/app/[countryCode]/launch/StoreSetup.tsx`
- `src/app/[countryCode]/launch/layout.tsx`
- `src/app/[countryCode]/launch/page.tsx`
- `src/app/[countryCode]/onboarding/OnboardingClient.tsx`
- `src/app/[countryCode]/onboarding/layout.tsx`
- `src/app/[countryCode]/onboarding/page.tsx`
- `src/app/[countryCode]/status/StatusLookupClient.tsx`
- `src/app/[countryCode]/status/[applicationId]/StatusClient.tsx`
- `src/app/[countryCode]/status/[applicationId]/layout.tsx`
- `src/app/[countryCode]/status/[applicationId]/page.tsx`
- `src/app/[countryCode]/status/layout.tsx`
- `src/app/[countryCode]/status/page.tsx`
- `src/app/[countryCode]/verify/[token]/VerifyClient.tsx`
- `src/app/[countryCode]/verify/[token]/page.tsx`
- `src/app/[countryCode]/verify/layout.tsx`
- `src/app/[countryCode]/verify/page.tsx`
- `src/app/api/admin/[countryCode]/applications/[applicationId]/route.ts`
- `src/app/api/admin/[countryCode]/applications/route.ts`
- `src/app/api/admin/[countryCode]/dashboard/route.ts`
- `src/app/api/admin/[countryCode]/reports/route.ts`
- `src/app/api/admin/[countryCode]/resellers/[resellerId]/route.ts`
- `src/app/api/admin/[countryCode]/resellers/route.ts`
- `src/app/api/admin/[countryCode]/settings/route.ts`
- `src/app/api/admin/[countryCode]/verifications/route.ts`
- `src/app/api/notifications/[countryCode]/preferences/route.ts`
- `src/app/api/notifications/[countryCode]/send/route.ts`
- `src/app/api/notifications/[countryCode]/templates/route.ts`
- `src/app/api/reseller/[countryCode]/apply/route.ts`
- `src/app/api/reseller/[countryCode]/countries/route.ts`
- `src/app/api/reseller/[countryCode]/dashboard/route.ts`
- `src/app/api/reseller/[countryCode]/status/[applicationId]/route.ts`
- `src/app/api/reseller/[countryCode]/store/[storeName]/route.ts`
- `src/app/api/reseller/[countryCode]/upload/route.ts`
- `src/app/api/reseller/[countryCode]/verify/[token]/route.ts`
- `src/app/api/reseller/[countryCode]/webhooks/notifications/route.ts`
- `src/app/api/reseller/[countryCode]/webhooks/payment/route.ts`
- `src/app/api/reseller/[countryCode]/webhooks/verification/route.ts`
- `src/app/api/store/[countryCode]/[storeName]/checkout/route.ts`
- `src/app/api/store/[countryCode]/[storeName]/favicon/route.ts`
- `src/app/api/store/[countryCode]/[storeName]/products/route.ts`
- `src/app/api/store/[countryCode]/[storeName]/webhook/route.ts`
- `src/app/api/upload/[countryCode]/document/route.ts`
- `src/app/api/upload/[countryCode]/image/route.ts`
- `src/app/api/upload/[countryCode]/logo/route.ts`
- `src/app/api/webhooks/[countryCode]/github/route.ts`
- `src/app/api/webhooks/[countryCode]/verification/route.ts`
- `src/actions/reseller/achievements/claimMilestone.ts`
- `src/actions/reseller/achievements/getAchievements.ts`
- `src/actions/reseller/achievements/getBadges.ts`
- `src/actions/reseller/admin/activateReseller.ts`
- `src/actions/reseller/admin/addInternalNote.ts`
- `src/actions/reseller/admin/approveApplication.ts`
- `src/actions/reseller/admin/assignApplicationToStaff.ts`
- `src/actions/reseller/admin/generateAdminReport.ts`
- `src/actions/reseller/admin/getAdminDashboardStats.ts`
- `src/actions/reseller/admin/getApplicationDetails.ts`
- `src/actions/reseller/admin/getApplicationQueue.ts`
- `src/actions/reseller/admin/getResellerDetails.ts`
- `src/actions/reseller/admin/getResellerList.ts`
- `src/actions/reseller/admin/getVerificationQueue.ts`
- `src/actions/reseller/admin/rejectApplication.ts`
- `src/actions/reseller/admin/rejectDocument.ts`
- `src/actions/reseller/admin/requestAdditionalDocs.ts`
- `src/actions/reseller/admin/suspendReseller.ts`
- `src/actions/reseller/admin/updateApplicationStatus.ts`
- `src/actions/reseller/admin/verifyDocument.ts`
- `src/actions/reseller/ai/analyzeBusinessHealth.ts`
- `src/actions/reseller/ai/askAI.ts`
- `src/actions/reseller/ai/detectAnomalies.ts`
- `src/actions/reseller/ai/generateMarketingCopy.ts`
- `src/actions/reseller/ai/getAIContext.ts`
- `src/actions/reseller/ai/getAIInsights.ts`
- `src/actions/reseller/ai/getAIRecommendations.ts`
- `src/actions/reseller/ai/getBusinessSummary.ts`
- `src/actions/reseller/application/deleteApplicationDraft.ts`
- `src/actions/reseller/application/getApplicationById.ts`
- `src/actions/reseller/application/getApplicationContext.ts`
- `src/actions/reseller/application/requestReview.ts`
- `src/actions/reseller/application/uploadDocument.ts`
- `src/actions/reseller/application/verifyIdentity.ts`
- `src/actions/reseller/build/cancelBuild.ts`
- `src/actions/reseller/build/updateBuildStatus.ts`
- `src/actions/reseller/country/detectUserCountry.ts`
- `src/actions/reseller/country/getCountryConfig.ts`
- `src/actions/reseller/country/getCountryKYCRequirements.ts`
- `src/actions/reseller/country/getCurrencyRates.ts`
- `src/actions/reseller/country/getLocalizedContent.ts`
- `src/actions/reseller/country/getSupportedCountries.ts`
- `src/actions/reseller/customers/getCustomerTransactions.ts`
- `src/actions/reseller/launch/createBusiness.ts`
- `src/actions/reseller/launch/generateApp.ts`
- `src/actions/reseller/launch/generateBrand.ts`
- `src/actions/reseller/launch/generateLegal.ts`
- `src/actions/reseller/launch/generateLogo.ts`
- `src/actions/reseller/launch/generateMarketing.ts`
- `src/actions/reseller/launch/generateStorefront.ts`
- `src/actions/reseller/launch/launchBusiness.ts`
- `src/actions/reseller/marketing/generateFlyer.ts`
- `src/actions/reseller/marketing/generateQRCode.ts`
- `src/actions/reseller/marketing/generateSocialPost.ts`
- `src/actions/reseller/marketing/generateWhatsAppTemplate.ts`
- `src/actions/reseller/marketing/getReferralStats.ts`
- `src/actions/reseller/marketing/sendBroadcast.ts`
- `src/actions/reseller/notifications/getNotificationSettings.ts`
- `src/actions/reseller/notifications/getUnreadCount.ts`
- `src/actions/reseller/notifications/markNotificationRead.ts`
- `src/actions/reseller/notifications/sendApplicationEmail.ts`
- `src/actions/reseller/notifications/sendPushNotification.ts`
- `src/actions/reseller/notifications/sendSMS.ts`
- `src/actions/reseller/notifications/updateNotificationSettings.ts`
- `src/actions/reseller/orders/getOrderHistory.ts`
- `src/actions/reseller/orders/purchasePlan.ts`
- `src/actions/reseller/plans/getPlanDetails.ts`
- `src/actions/reseller/plans/updatePlanPricing.ts`
- `src/actions/reseller/publishing/generateAppAssets.ts`
- `src/actions/reseller/publishing/getAppReadiness.ts`
- `src/actions/reseller/publishing/getBuildHistory.ts`
- `src/actions/reseller/publishing/getBuildStatus.ts`
- `src/actions/reseller/publishing/getPublishingPlans.ts`
- `src/actions/reseller/publishing/publishToPlayStore.ts`
- `src/actions/reseller/publishing/queueBuild.ts`
- `src/actions/reseller/publishing/upgradeDistribution.ts`
- `src/actions/reseller/referrals/generateReferralLink.ts`
- `src/actions/reseller/referrals/getReferralCommissions.ts`
- `src/actions/reseller/referrals/getReferralStats.ts`
- `src/actions/reseller/security/disable2FA.ts`
- `src/actions/reseller/security/enable2FA.ts`
- `src/actions/reseller/security/getDevices.ts`
- `src/actions/reseller/security/revokeSession.ts`
- `src/actions/reseller/settings/updatePreferences.ts`
- `src/actions/reseller/settings/updateSecuritySettings.ts`
- `src/actions/reseller/settings/updateSettings.ts`
- `src/actions/reseller/store/generateStoreUrl.ts`
- `src/actions/reseller/store/getStoreAnalytics.ts`
- `src/actions/reseller/store/getStoreBySlug.ts`
- `src/actions/reseller/store/getStorePlans.ts`
- `src/actions/reseller/store/updateStoreConfig.ts`
- `src/actions/reseller/support/closeTicket.ts`
- `src/actions/reseller/support/createSupportTicket.ts`
- `src/actions/reseller/support/getSupportCategories.ts`
- `src/actions/reseller/support/getSupportTickets.ts`
- `src/actions/reseller/support/getTicketDetails.ts`
- `src/actions/reseller/support/replyToTicket.ts`
- `src/actions/reseller/verification/getKYCRequirements.ts`
- `src/actions/reseller/verification/getVerificationStatus.ts`
- `src/actions/reseller/verification/initiateVerification.ts`
- `src/actions/reseller/verification/submitVerificationDocs.ts`
- `src/actions/reseller/verification/updateVerificationStatus.ts`
- `src/actions/reseller/wallet/customerVirtualAccount.ts`
- `src/actions/reseller/wallet/getVirtualAccount.ts`
- `src/actions/reseller/wallet/resellerCustomerWallet.ts`
- `src/components/reseller/achievements/AchievementProgress.tsx`
- `src/components/reseller/achievements/BadgeCard.tsx`
- `src/components/reseller/achievements/MilestoneTracker.tsx`
- `src/components/reseller/admin/AdminCharts.tsx`
- `src/components/reseller/admin/AdminStats.tsx`
- `src/components/reseller/admin/ApplicantActions.tsx`
- `src/components/reseller/admin/ApplicationDetails.tsx`
- `src/components/reseller/admin/ApplicationQueue.tsx`
- `src/components/reseller/admin/ApprovalWorkflow.tsx`
- `src/components/reseller/admin/AuditLog.tsx`
- `src/components/reseller/admin/DocumentReview.tsx`
- `src/components/reseller/admin/InternalNotes.tsx`
- `src/components/reseller/admin/ResellerDetails.tsx`
- `src/components/reseller/admin/ResellerList.tsx`
- `src/components/reseller/admin/RiskScore.tsx`
- `src/components/reseller/admin/VerificationQueue.tsx`
- `src/components/reseller/ai/AIAssistant.tsx`
- `src/components/reseller/ai/AIChatBubble.tsx`
- `src/components/reseller/ai/AIInsightCard.tsx`
- `src/components/reseller/ai/AIOnboarding.tsx`
- `src/components/reseller/ai/AIQuickActions.tsx`
- `src/components/reseller/ai/AISuggestion.tsx`
- `src/components/reseller/ai/BusinessHealthScore.tsx`
- `src/components/reseller/announcements/AnnouncementCard.tsx`
- `src/components/reseller/announcements/UpdateBanner.tsx`
- `src/components/reseller/application/BusinessInfoStep.tsx`
- `src/components/reseller/application/PaymentInfoStep.tsx`
- `src/components/reseller/application/RequirementsStep.tsx`
- `src/components/reseller/application/SuccessStep.tsx`
- `src/components/reseller/application/VerificationStep.tsx`
- `src/components/reseller/command-palette/CommandItem.tsx`
- `src/components/reseller/command-palette/CommandPalette.tsx`
- `src/components/reseller/command-palette/CommandSearch.tsx`
- `src/components/reseller/command-palette/QuickActions.tsx`
- `src/components/reseller/common/Breadcrumb.tsx`
- `src/components/reseller/common/ConfirmationModal.tsx`
- `src/components/reseller/common/CountrySelector.tsx`
- `src/components/reseller/common/CurrencyDisplay.tsx`
- `src/components/reseller/common/EmptyState.tsx`
- `src/components/reseller/common/FileUploadWithPreview.tsx`
- `src/components/reseller/common/LoadingSkeleton.tsx`
- `src/components/reseller/common/NotificationToast.tsx`
- `src/components/reseller/common/PhoneInput.tsx`
- `src/components/reseller/common/ProgressBar.tsx`
- `src/components/reseller/common/StatusBadge.tsx`
- `src/components/reseller/country/CountryStats.tsx`
- `src/components/reseller/country/CountryTestimonials.tsx`
- `src/components/reseller/country/CountryTrustBadges.tsx`
- `src/components/reseller/dashboard/CustomerTable.tsx`
- `src/components/reseller/dashboard/EarningsSummary.tsx`
- `src/components/reseller/dashboard/GrowthChart.tsx`
- `src/components/reseller/dashboard/OrdersTable.tsx`
- `src/components/reseller/dashboard/PerformanceMetrics.tsx`
- `src/components/reseller/dashboard/RecentOrders.tsx`
- `src/components/reseller/forms/ApplicationForm.tsx`
- `src/components/reseller/forms/PlanForm.tsx`
- `src/components/reseller/forms/ProfileForm.tsx`
- `src/components/reseller/forms/SecurityForm.tsx`
- `src/components/reseller/forms/StoreSettingsForm.tsx`
- `src/components/reseller/forms/SupportTicketForm.tsx`
- `src/components/reseller/launch/AppConfigStep.tsx`
- `src/components/reseller/launch/BrandingStep.tsx`
- `src/components/reseller/launch/BusinessInfoStep.tsx`
- `src/components/reseller/launch/LaunchComplete.tsx`
- `src/components/reseller/launch/LaunchWizard.tsx`
- `src/components/reseller/launch/LogoGenerator.tsx`
- `src/components/reseller/launch/PricingStep.tsx`
- `src/components/reseller/launch/StepIndicator.tsx`
- `src/components/reseller/launch/StoreConfigStep.tsx`
- `src/components/reseller/launch/ThemeSelector.tsx`
- `src/components/reseller/layout/AdminHeader.tsx`
- `src/components/reseller/layout/AdminSidebar.tsx`
- `src/components/reseller/layout/CountryFooter.tsx`
- `src/components/reseller/layout/CountryNavbar.tsx`
- `src/components/reseller/layout/StoreFooter.tsx`
- `src/components/reseller/layout/StoreHeader.tsx`
- `src/components/reseller/legal/ComplianceChecklist.tsx`
- `src/components/reseller/legal/ConsentManager.tsx`
- `src/components/reseller/legal/DocumentCenter.tsx`
- `src/components/reseller/legal/PolicyGeneratorWizard.tsx`
- `src/components/reseller/legal/PolicyPreview.tsx`
- `src/components/reseller/marketing/BroadcastForm.tsx`
- `src/components/reseller/marketing/CustomerSegments.tsx`
- `src/components/reseller/marketing/FlyerPreview.tsx`
- `src/components/reseller/marketing/QRCode.tsx`
- `src/components/reseller/marketing/ReferralStats.tsx`
- `src/components/reseller/marketing/ShareButtons.tsx`
- `src/components/reseller/marketing/SocialPostCard.tsx`
- `src/components/reseller/marketing/WhatsAppTemplate.tsx`
- `src/components/reseller/modals/CreatePlanModal.tsx`
- `src/components/reseller/modals/EditPlanModal.tsx`
- `src/components/reseller/modals/PurchaseModal.tsx`
- `src/components/reseller/modals/SupportTicketModal.tsx`
- `src/components/reseller/publishing/AppReadinessChecker.tsx`
- `src/components/reseller/publishing/AssetGenerator.tsx`
- `src/components/reseller/publishing/BuildProgress.tsx`
- `src/components/reseller/publishing/PaymentMethod.tsx`
- `src/components/reseller/publishing/PlanSelector.tsx`
- `src/components/reseller/publishing/PlayStoreStatus.tsx`
- `src/components/reseller/publishing/PublishWizard.tsx`
- `src/components/reseller/publishing/StoreListingPreview.tsx`
- `src/components/reseller/referrals/ReferralCard.tsx`
- `src/components/reseller/referrals/ReferralCommission.tsx`
- `src/components/reseller/referrals/ReferralLink.tsx`
- `src/components/reseller/security/DeviceCard.tsx`
- `src/components/reseller/security/LoginHistoryTable.tsx`
- `src/components/reseller/security/SessionList.tsx`
- `src/components/reseller/store/BrandingUploader.tsx`
- `src/components/reseller/store/CartDrawer.tsx`
- `src/components/reseller/store/CategoryFilter.tsx`
- `src/components/reseller/store/CheckoutForm.tsx`
- `src/components/reseller/store/OrderSuccess.tsx`
- `src/components/reseller/store/PlanCard.tsx`
- `src/components/reseller/store/SearchBar.tsx`
- `src/components/reseller/store/StoreBuilder.tsx`
- `src/components/reseller/store/StorePreview.tsx`
- `src/components/reseller/store/StoreSettings.tsx`
- `src/components/reseller/store/ThemeSelector.tsx`
- `src/components/reseller/verification/DocumentPreview.tsx`
- `src/components/reseller/verification/DocumentUploader.tsx`
- `src/components/reseller/verification/IdentityVerification.tsx`
- `src/components/reseller/verification/KYCRequirements.tsx`
- `src/components/reseller/verification/VerificationProgress.tsx`
- `src/components/reseller/verification/VerificationStatus.tsx`
- `src/lib/admin/audit-logger.ts`
- `src/lib/admin/permissions.ts`
- `src/lib/admin/report-generator.ts`
- `src/lib/ai/business-assistant.ts`
- `src/lib/ai/client.ts`
- `src/lib/ai/context-builder.ts`
- `src/lib/ai/index.ts`
- `src/lib/ai/intent-detection.ts`
- `src/lib/ai/prompt-templates.ts`
- `src/lib/ai/providers/gemini.ts`
- `src/lib/ai/providers/groq.ts`
- `src/lib/ai/providers/index.ts`
- `src/lib/ai/providers/nvidia.ts`
- `src/lib/ai/providers/openai.ts`
- `src/lib/ai/response-formatter.ts`
- `src/lib/business-generator/app/config.ts`
- `src/lib/business-generator/app/firebase.ts`
- `src/lib/business-generator/app/package.ts`
- `src/lib/business-generator/branding/colors.ts`
- `src/lib/business-generator/branding/fonts.ts`
- `src/lib/business-generator/branding/themes.ts`
- `src/lib/business-generator/descriptions/generator.ts`
- `src/lib/business-generator/index.ts`
- `src/lib/business-generator/launch/checklist.ts`
- `src/lib/business-generator/launch/wizard.ts`
- `src/lib/business-generator/legal/privacy.ts`
- `src/lib/business-generator/legal/refund.ts`
- `src/lib/business-generator/legal/terms.ts`
- `src/lib/business-generator/logo/validator.ts`
- `src/lib/business-generator/marketing/flyer.ts`
- `src/lib/business-generator/marketing/social.ts`
- `src/lib/business-generator/marketing/whatsapp.ts`
- `src/lib/business-generator/playstore/assets.ts`
- `src/lib/business-generator/playstore/categories.ts`
- `src/lib/business-generator/playstore/listing.ts`
- `src/lib/business-generator/screenshots/generator.ts`
- `src/lib/business-generator/storefront/sections.ts`
- `src/lib/business-generator/storefront/template.ts`
- `src/lib/notifications/email/sender.ts`
- `src/lib/notifications/email/templates/application-approved.ts`
- `src/lib/notifications/email/templates/application-received.ts`
- `src/lib/notifications/email/templates/application-rejected.ts`
- `src/lib/notifications/email/templates/build-complete.ts`
- `src/lib/notifications/email/templates/documents-requested.ts`
- `src/lib/notifications/email/templates/store-ready.ts`
- `src/lib/notifications/email/templates/welcome.ts`
- `src/lib/notifications/push/sender.ts`
- `src/lib/notifications/sms/sender.ts`
- `src/lib/publishing/app-readiness.ts`
- `src/lib/publishing/asset-generator.ts`
- `src/lib/publishing/build-queue.ts`
- `src/lib/publishing/index.ts`
- `src/lib/publishing/playstore-api.ts`
- `src/lib/publishing/version-manager.ts`
- `src/lib/reseller/commission-calculator.ts`
- `src/lib/reseller/country-config.ts`
- `src/lib/reseller/country-data.ts`
- `src/lib/reseller/currency-config.ts`
- `src/lib/reseller/pricing-rules.ts`
- `src/lib/reseller/validation-schemas.ts`
- `src/lib/reseller/verification-rules.ts`
- `src/lib/storage/document-storage.ts`
- `src/lib/storage/image-storage.ts`
- `src/lib/storage/upload.ts`
- `src/lib/validation/application-schema.ts`
- `src/lib/validation/store-schema.ts`
- `src/lib/validation/verification-schema.ts`
- `src/hooks/admin/useAdminStats.ts`
- `src/hooks/admin/useApplicationQueue.ts`
- `src/hooks/admin/useResellerManagement.ts`
- `src/hooks/admin/useVerificationQueue.ts`
- `src/hooks/common/useCountryDetection.ts`
- `src/hooks/common/useCurrencyConversion.ts`
- `src/hooks/common/useLocalization.ts`
- `src/hooks/reseller/useAI.ts`
- `src/hooks/reseller/useAIContext.ts`
- `src/hooks/reseller/useAnalytics.ts`
- `src/hooks/reseller/useApplicationForm.ts`
- `src/hooks/reseller/useApplicationStatus.ts`
- `src/hooks/reseller/useBusinessHealth.ts`
- `src/hooks/reseller/useCountryConfig.ts`
- `src/hooks/reseller/useDashboardData.ts`
- `src/hooks/reseller/useDocumentUpload.ts`
- `src/hooks/reseller/useNotifications.ts`
- `src/hooks/reseller/useStoreBuilder.ts`
- `src/hooks/reseller/useVerification.ts`
- `src/hooks/reseller/useWallet.ts`
- `src/hooks/store/useStoreCart.ts`
- `src/hooks/store/useStoreCheckout.ts`
- `src/hooks/store/useStoreProducts.ts`
- `src/constants/admin/permissions.ts`
- `src/constants/admin/roles.ts`
- `src/constants/admin/statuses.ts`
- `src/constants/countries/eg.ts`
- `src/constants/countries/gh.ts`
- `src/constants/countries/index.ts`
- `src/constants/countries/ke.ts`
- `src/constants/countries/ma.ts`
- `src/constants/countries/ng.ts`
- `src/constants/countries/template.ts`
- `src/constants/countries/types.ts`
- `src/constants/countries/zm.ts`
- `src/constants/notifications/emailTemplates.ts`
- `src/constants/notifications/pushTemplates.ts`
- `src/constants/notifications/smsTemplates.ts`
- `src/constants/reseller/KYCRequirements.ts`
- `src/constants/reseller/applicationSteps.ts`
- `src/constants/reseller/commissionTiers.ts`
- `src/constants/reseller/featureFlags.ts`
- `src/constants/reseller/pricingDefaults.ts`
- `src/constants/reseller/validationRules.ts`
- `src/constants/store/categories.ts`
- `src/constants/store/defaultSettings.ts`
- `src/constants/store/themes.ts`
- `src/middleware/admin-auth.ts`
- `src/middleware/country-detection.ts`
- `src/middleware/country-redirect.ts`
- `src/middleware/rate-limiter.ts`
- `src/middleware/reseller-auth.ts`
- `src/middleware/store-auth.ts`
- `src/types/admin/ai-config.ts`
- `src/types/admin/application-queue.ts`
- `src/types/admin/publishing-config.ts`
- `src/types/admin/reports.ts`
- `src/types/admin/reseller-management.ts`
- `src/types/admin/settings.ts`
- `src/types/admin/verification.ts`
- `src/types/api/requests.ts`
- `src/types/api/responses.ts`
- `src/types/common/auth.ts`
- `src/types/common/country.ts`
- `src/types/common/notifications.ts`
- `src/types/common/user.ts`
- `src/types/reseller/achievements.ts`
- `src/types/reseller/ai.ts`
- `src/types/reseller/application.ts`
- `src/types/reseller/business-health.ts`
- `src/types/reseller/country.ts`
- `src/types/reseller/dashboard.ts`
- `src/types/reseller/launch.ts`
- `src/types/reseller/legal.ts`
- `src/types/reseller/marketing.ts`
- `src/types/reseller/notifications.ts`
- `src/types/reseller/referrals.ts`
- `src/types/reseller/security.ts`
- `src/types/reseller/verification.ts`
- `src/types/reseller/wallet.ts`
- `src/providers/AIProvider.tsx`
- `src/providers/LanguageProvider.tsx`
- `src/providers/OnboardingProvider.tsx`
- `src/providers/PublishingProvider.tsx`
- `src/config/currencies/index.ts`
- `src/config/feature-flags/index.ts`
- `src/config/languages/ar.ts`
- `src/config/languages/en.ts`
- `src/config/languages/es.ts`
- `src/config/languages/fr.ts`
- `src/config/languages/index.ts`
- `src/config/languages/pt.ts`
- `src/config/payment-methods/index.ts`
- `src/config/regions/central-africa.ts`
- `src/config/regions/east-africa.ts`
- `src/config/regions/index.ts`
- `src/config/regions/north-africa.ts`
- `src/config/regions/southern-africa.ts`
- `src/config/regions/west-africa.ts`
- `src/config/telecoms/index.ts`
- `src/config/tenants/index.ts`
- `src/config/themes/index.ts`
- `src/messages/ar/ai.json`
- `src/messages/ar/common.json`
- `src/messages/ar/legal.json`
- `src/messages/ar/marketing.json`
- `src/messages/ar/onboarding.json`
- `src/messages/en/ai.json`
- `src/messages/en/common.json`
- `src/messages/en/legal.json`
- `src/messages/en/marketing.json`
- `src/messages/en/onboarding.json`
- `src/messages/es/ai.json`
- `src/messages/es/common.json`
- `src/messages/es/legal.json`
- `src/messages/es/marketing.json`
- `src/messages/es/onboarding.json`
- `src/messages/fr/ai.json`
- `src/messages/fr/common.json`
- `src/messages/fr/legal.json`
- `src/messages/fr/marketing.json`
- `src/messages/fr/onboarding.json`
- `src/messages/pt/ai.json`
- `src/messages/pt/common.json`
- `src/messages/pt/legal.json`
- `src/messages/pt/marketing.json`
- `src/messages/pt/onboarding.json`
- `supabase/migrations/20250101_create_country_configs.sql`
- `supabase/migrations/20250102_create_reseller_applications.sql`
- `supabase/migrations/20250103_create_reseller_stores.sql`
- `supabase/migrations/20250104_create_verification_documents.sql`
- `supabase/migrations/20250105_create_reseller_wallets.sql`
- `supabase/migrations/20250106_create_reseller_orders.sql`
- `supabase/migrations/20250107_create_reseller_customers.sql`
- `supabase/migrations/20250108_create_reseller_plans.sql`
- `supabase/migrations/20250109_create_admin_actions.sql`
- `supabase/migrations/20250110_create_notifications.sql`
- `supabase/migrations/20250111_create_audit_logs.sql`
- `supabase/migrations/20250112_create_builds.sql`
- `supabase/migrations/20250113_create_rpc_functions.sql`
- `supabase/rpc/admin/generate_admin_report.sql`
- `supabase/rpc/admin/get_admin_dashboard.sql`
- `supabase/rpc/admin/get_application_queue.sql`
- `supabase/rpc/ai/detect_anomalies.sql`
- `supabase/rpc/ai/get_ai_context.sql`
- `supabase/rpc/ai/get_business_insights.sql`
- `supabase/rpc/ai/get_business_summary.sql`
- `supabase/rpc/ai/get_health_score.sql`
- `supabase/rpc/application/approve_application.sql`
- `supabase/rpc/application/get_application_context.sql`
- `supabase/rpc/application/get_application_status.sql`
- `supabase/rpc/application/reject_application.sql`
- `supabase/rpc/application/request_additional_docs.sql`
- `supabase/rpc/application/submit_application.sql`
- `supabase/rpc/build/complete_build.sql`
- `supabase/rpc/build/get_build_context.sql`
- `supabase/rpc/build/queue_app_build.sql`
- `supabase/rpc/build/update_build_status.sql`
- `supabase/rpc/business/generate_brand_assets.sql`
- `supabase/rpc/business/get_app_readiness.sql`
- `supabase/rpc/business/get_dashboard_context.sql`
- `supabase/rpc/business/get_store_context.sql`
- `supabase/rpc/business/validate_store_name.sql`
- `supabase/rpc/dashboard/get_dashboard_summary.sql`
- `supabase/rpc/dashboard/get_earnings_report.sql`
- `supabase/rpc/dashboard/get_performance_metrics.sql`
- `supabase/rpc/dashboard/get_reseller_analytics.sql`
- `supabase/rpc/marketing/generate_qr_code.sql`
- `supabase/rpc/marketing/get_marketing_analytics.sql`
- `supabase/rpc/marketing/get_referral_stats.sql`
- `supabase/rpc/notifications/notify_application_status.sql`
- `supabase/rpc/notifications/notify_build_complete.sql`
- `supabase/rpc/notifications/notify_store_ready.sql`
- `supabase/rpc/publishing/complete_build.sql`
- `supabase/rpc/publishing/deploy_ota.sql`
- `supabase/rpc/publishing/get_build_context.sql`
- `supabase/rpc/publishing/get_build_history.sql`
- `supabase/rpc/publishing/get_next_build.sql`
- `supabase/rpc/publishing/get_publish_status.sql`
- `supabase/rpc/publishing/mark_build_complete.sql`
- `supabase/rpc/publishing/mark_build_running.sql`
- `supabase/rpc/publishing/publish_playstore.sql`
- `supabase/rpc/publishing/queue_app_build.sql`
- `supabase/rpc/publishing/update_build_status.sql`
- `supabase/rpc/security/get_devices.sql`
- `supabase/rpc/security/get_login_history.sql`
- `supabase/rpc/security/get_sessions.sql`
- `supabase/rpc/store/get_store_analytics.sql`
- `supabase/rpc/store/get_store_context.sql`
- `supabase/rpc/store/update_store_config.sql`
- `supabase/rpc/utils/check_kyc_compliance.sql`
- `supabase/rpc/utils/generate_brand_assets.sql`
- `supabase/rpc/utils/validate_store_name.sql`
- `src/lib/utils/constants.ts`
- `src/lib/utils/formatters.ts`
- `src/lib/utils/validators.ts`

---

## Shared Infrastructure (used by two or more layers)

| File/dir | Used by | Notes |
|---|---|---|
| `src/lib/supabase/{admin,client,server}.ts` | All 3 layers | The only Supabase client factories in the repo. `admin.ts` uses the service-role key for privileged writes (wallet credits, admin actions). |
| `src/lib/payments/{flutterwave,korapay,xixapay,fees,xixapayFees}.ts` | Layers 1 & 3 (Layer 2 has its own webhook consumers but calls into these same gateway wrapper files) | Gateway wrapper/verification logic. Layer 3's `api/webhooks/[countryCode]/payment/route.ts` (implemented, 2,911 bytes) reuses this. |
| `src/lib/providers/{zendit,accragh,lizzysub}.ts` | Layer 1 directly; Layer 3's plan/order fulfillment is expected to call these once `actions/reseller/orders` and `actions/reseller/plans` are fully wired — currently Layer 3's non-empty plan/order files reference pricing (`lib/pricing/calculatePrice.ts`) but the actual upstream-provider fulfillment call for a Layer-3 purchase has not been confirmed wired end-to-end; verify before assuming parity with Layer 1. |
| `src/constants/supportedcountries.ts`, `src/constants/flags.tsx` | Layers 1 & 3 | Country list and flag SVGs are shared rather than duplicated — do not create a second copy of either. |
| `src/lib/pricing/calculatePrice.ts` | Layer 3 (and equivalent logic re-derived in Layer 2's own action files) | `calculateResellerPrice`, `calculateProfit`, `formatNaira`, `calculateMarkupPercentage`, `calculateWithdrawalFee`, `calculateNetWithdrawal` — implemented and non-empty; this is Layer 3's real, working pricing engine. |
| `src/lib/utils/helpers.ts` | Layer 3 exclusively (confirmed via import grep) | `cn`, `formatCurrency`, `formatDate`, `formatTimeAgo`, `generateId`, `truncateText`, `debounce`, `isEmpty`, `getInitials`, `sleep`, `copyToClipboard`, `capitalize`, `formatPhoneNumber` |
| `src/proxy.ts` | Global (all layers, all requests) | Root middleware — country detection + routing. See Layer 3 section above. |

## Environment variables inventory (55 distinct, grepped from `process.env.*` across `src/`)

No `.env.example` exists in the repository. The following is the ground-truth list of every environment variable the code actually reads, grouped by concern:

**Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (⚠ a service-role key is read from a `NEXT_PUBLIC_` variable — see Known Irregularities), `NEXT_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL`, `APP2_SUPABASE_URL`, `APP2_SUPABASE_SECRET_KEY`, `APP3_SUPABASE_URL`, `APP3_SUPABASE_SECRET_KEY` (multiple Supabase projects/apps are wired in — purpose of APP2/APP3 not documented anywhere in code comments; confirm with the product owner before assuming they're dead config)

**Payments:** `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_ENCRYPTION_KEY`, `KORAPAY_SECRET_KEY`, `XIXAPAY_API_KEY`, `XIXAPAY_SECRET_KEY`, `XIXAPAY_BUSINESS_ID`, `NEXT_PUBLIC_XIXAPAY_API_KEY`, `NEXT_PUBLIC_XIXAPAY_SECRET_KEY`, `NEXT_PUBLIC_XIXAPAY_BUSINESS_ID`, `NEXT_PUBLIC_PAYVESSEL_API_KEY`, `NEXT_PUBLIC_PAYVESSEL_SECRET_KEY`, `NEXT_PUBLIC_PAYVESSEL_BUSINESS_ID`

**VTU/data upstream providers:** `ZENDIT_API_KEY`, `ZENDIT_BASE_URL`, `ZENDIT_SECRET_KEY`, `ACCRAGH_API_KEY`, `ACCRAGH_BASE_URL`, `ACCRAGH_SECRET_KEY`, `LIZZYSUB_API_KEY`, `LIZZYSUB_BASE_URL`, `LIZZYSUB_SECRET_KEY`

**Firebase (push notifications):** `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

**Email:** `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `EMAIL_FROM`, `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASS`

**GitHub build pipeline (Layer 2, reference for Layer 3's future publishing pipeline):** `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`

**Misc/App:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_STORE_URL`, `API_SECRET_KEY` (protects the `/api/v1/*` surface), `NODE_ENV`

**Action item:** a `.env.example` should be generated from this list and committed — this alone would materially de-risk onboarding a second engineer or a fresh environment. See `blueprint.md`.

## Known Irregularities (read before touching any of these)

1. **`src/app/actions/wallet.ts` vs `wallet-withxixicopy.ts`, and `src/components/WalletClient.tsx` vs `WalletClient-withxixicopy.tsx`** — these are parked duplicate/experimental variants (the `-withxixicopy` suffix suggests a branch exploring an alternate Xixapay integration path). A repo-wide grep for `wallet-withxixicopy` / `WalletClient-withxixicopy` under `src/app` returns **zero import references** — these two files are confirmed dead code as of this analysis (not imported anywhere). Safe to archive/delete once confirmed with the product owner; do not build new work on top of them.
2. **Two separate `actions/reseller` trees with the same name** — `src/app/actions/reseller/**` (Layer 2, alias `@/app/actions/reseller`) and `src/actions/reseller/**` (Layer 3, alias `@/actions/reseller`). Confirmed via import-graph, not naming convention — never assume which one a file belongs to from its path alone without checking the alias used to import it.
3. **Two separate `admin` concepts** — `src/app/(admin)/**` (Layer 1's small consumer-notification/email admin tool) is unrelated to `src/app/[countryCode]/admin/**` (Layer 3's fully-empty country-scoped reseller-management admin panel). Do not merge, redirect, or conflate these.
4. **`src/app/api/config/korapay/route.ts` (Layer 2) vs Korapay config used inside Layer 3's payment webhook** — two independent code paths read Korapay-related config; there is no shared `/api/config/[countryCode]/korapay` yet.
5. **`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`** — a service-role (privileged, bypasses Postgres RLS) Supabase key is read from a `NEXT_PUBLIC_`-prefixed env var name in exactly two places: `src/lib/supabase/admin.ts:8` and `src/lib/supabase/server.ts:13`. Both call sites are server-only files, which lowers the immediate risk (Next.js only inlines `NEXT_PUBLIC_*` vars into files that actually end up in a client bundle, and these two files are not themselves client components) — but the naming is still a live landmine: **any future developer who imports from `admin.ts`/`server.ts` into a client component, or who copies this env-var name into a genuinely client-side file, will leak the service-role key to every visitor's browser.** Rename this variable to drop the `NEXT_PUBLIC_` prefix (e.g. `SUPABASE_SERVICE_ROLE_KEY`, which — confusingly — is ALSO already a separate, differently-named variable read elsewhere in the codebase; consolidate to one name) as a priority fix. This is flagged here, in `blueprint.md`, and in `handover.md` because it is the single highest-severity finding in this audit and must not be lost between documents.
6. **`src/app/api/xixa-account/webhook/route.ts` is 53,922 bytes** — roughly 10-20x the size of any other route file in the repo. It is Layer 1's consumer virtual-account webhook handler and is functionally critical (do not delete/rewrite casually), but its size alone marks it as a maintainability risk and a strong refactor candidate whenever it's next touched.
7. **All 13 `supabase/migrations/*.sql` files are 0 bytes** — the actual Postgres schema this entire product runs on is NOT captured anywhere in version control. It exists only live in the Supabase project dashboard (or in `supabase/rpc/*.sql`, which are ALSO all 0 bytes). This is a standing risk independent of which layer you're working in: there is no way to stand up a fresh environment, review the schema in a PR, or recover the schema if the Supabase project were lost, purely from this repository.
8. **`src/middleware/*` (6 files, all empty) vs `src/proxy.ts` (implemented)** — do not "implement" the empty middleware files by moving logic out of `proxy.ts` without first confirming with the product owner whether that split is still the intended direction; `proxy.ts` working as a monolith is not itself a bug.


---

## Document relationships

- **`blueprint.md`** takes the Layer-3 subsystem table and Appendix A/B above and turns them into a prioritized, actionable feature checklist scoped exclusively to Layer 3 — read that document when deciding what to build next.
- **`handover.md`** is the source of truth for process, session continuity, and the current state of the git history/branches produced by this audit — read that document first, always, before this one or `blueprint.md`.

*End of architecture.md.*
