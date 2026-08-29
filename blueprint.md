# BLUEPRINT.md — Multi-Country, Multi-Tenant Reseller Platform (Layer 3)

**Scope:** This document covers ONLY Layer 3 (the `[countryCode]` platform) as defined in `architecture.md`. Layer 1 (legacy consumer app) and Layer 2 (single-country reseller platform) are explicitly out of scope for new work — Layer 2 is reference material only. Every file path, count, and status claim below is sourced directly from `architecture.md`'s Appendix A (implemented files) and Appendix B (empty files); this document does not introduce new raw data, it organizes that data into a feature roadmap.

**Generated:** 2026-08-29, from commit `7603a82` on `reseller-gh` plus the current `codebase-analysis` branch state.

**How to use this document:** Each feature domain below has a status, a list of what's real, a list of what's missing, an explicit next-action list, and a priority. Priorities are P0 (blocks the core reseller lifecycle — nothing else matters until these work), P1 (needed for a usable v1 launch), P2 (differentiating features, needed for parity with the product vision but not launch-blocking), P3 (nice-to-have / can ship without). Work top-to-bottom within a priority tier; the ordering within each tier reflects dependency order (earlier items unblock later ones).

---

## The core reseller lifecycle — the spine everything else hangs off

This is the single most important thing to understand about Layer 3's current state: **a reseller can apply, but there is no way for anyone to review, verify, or approve that application, and once approved there is no wizard to actually launch their store.** The lifecycle is:

```
apply (DONE) → verify/KYC (NOT STARTED) → admin review/approve (NOT STARTED)
   → launch wizard (NOT STARTED) → onboarding (NOT STARTED) → live dashboard (MOSTLY DONE) → storefront (DONE)
```

Every feature domain below matters less than closing this loop. A fully-featured dashboard is useless if no reseller can legitimately get into it via the front door.

---

## P0 — Blocks the core reseller lifecycle

### 1. Verification / KYC flow — `[countryCode]/verify/*` — **0% (4/4 files empty)**
**What exists:** Nothing. `src/app/[countryCode]/verify/page.tsx`, `layout.tsx`, `[token]/page.tsx`, `[token]/VerifyClient.tsx` are all 0 bytes.
**What it needs to do:** Let an applicant (reached via an emailed/SMS'd verification token link, matching the `[token]` dynamic segment already scaffolded) upload KYC documents (ID, proof of address, business registration where applicable) and complete identity verification per-country rules.
**Related empty action files that must be built alongside this:** `src/actions/reseller/verification/*` (all 5 empty: `getVerificationStatus.ts`, `getKYCRequirements.ts`, `updateVerificationStatus.ts`, `initiateVerification.ts`, `submitVerificationDocs.ts`), `src/components/reseller/verification/*` (all 6 empty: `VerificationStatus.tsx`, `IdentityVerification.tsx`, `VerificationProgress.tsx`, `KYCRequirements.tsx`, `DocumentUploader.tsx`, `DocumentPreview.tsx`), `src/lib/validation/verification-schema.ts` (empty), `src/lib/storage/document-storage.ts` (empty — needed to actually persist uploaded ID documents), `src/lib/reseller/verification-rules.ts` (empty — per-country KYC requirement rules), `src/constants/reseller/KYCRequirements.ts` (empty).
**API surface needed:** `src/app/api/webhooks/[countryCode]/verification/route.ts` (empty — for third-party ID-verification-provider callbacks, if one is used), `src/app/api/upload/[countryCode]/document/route.ts` (empty).
**Also references (already real, done, do not rebuild):** `src/actions/reseller/application/*` non-empty files already handle the pre-verification application draft/submit flow — verification picks up after `submitApplication.ts`.
**Next actions:** (1) decide whether KYC documents are reviewed manually by admins or via a third-party ID-verification API — this decision gates everything else here; (2) build `document-storage.ts` on top of Supabase Storage; (3) build the upload UI + `submitVerificationDocs` action; (4) build per-country `KYCRequirements`.

### 2. Country-scoped admin panel — `[countryCode]/admin/*` — **0% (76/76 files empty)**
**What exists:** Nothing at all — not even a shell layout. This is the single largest completely-unstarted block of work in the repository.
**What it needs to do:** Let a country-scoped admin (a) review the application queue, (b) review submitted KYC documents, (c) approve/reject applications, (d) manage active resellers (suspend/activate), (e) view compliance (AML/KYC) status across all resellers, (f) generate reports (revenue/growth/applications), (g) configure per-country settings (pricing, KYC requirements, feature toggles).
**Full empty file inventory for this domain (76 files):** `admin/applications/*` (queue, filters, stats, `[applicationId]` detail with timeline/risk-assessment/approval-actions/document-review/applicant-profile/internal-notes), `admin/verifications/*` (queue + `[verificationId]` detail with identity/document verification and actions), `admin/compliance/*` (AML, KYC, audit logs), `admin/resellers/*` (list, filters, stats + `[resellerId]` detail with performance/transactions/customers/actions), `admin/reports/*` (application/revenue/growth reports + filters), `admin/notifications/*` (composer + templates), `admin/settings/*` (pricing, KYC requirements, feature toggles, country settings), plus `admin/dashboard/*`, `admin/layout.tsx`, `admin/page.tsx`, `admin/error.tsx`, `admin/loading.tsx`.
**Backing actions (all empty, 17 files):** `src/actions/reseller/admin/*` — `getApplicationQueue`, `getApplicationDetails`, `approveApplication`, `rejectApplication`, `requestAdditionalDocs`, `assignApplicationToStaff`, `addInternalNote`, `getVerificationQueue`, `verifyDocument`, `rejectDocument`, `getResellerList`, `getResellerDetails`, `activateReseller`, `suspendReseller`, `getAdminDashboardStats`, `generateAdminReport`.
**Backing components (all empty, 13 files):** `src/components/reseller/admin/*` — `ApplicationQueue`, `ApplicationDetails`, `ApplicantActions`, `DocumentReview`, `VerificationQueue`, `ResellerList`, `ResellerDetails`, `ApprovalWorkflow`, `RiskScore`, `AuditLog`, `AdminStats`, `AdminCharts`, `InternalNotes`.
**Backing API (all empty, 8 files):** `src/app/api/admin/[countryCode]/{applications,applications/[applicationId],dashboard,reports,resellers,resellers/[resellerId],settings,verifications}/route.ts`.
**Backing infra:** `src/lib/admin/{audit-logger,permissions,report-generator}.ts` (all 3 empty), `src/constants/admin/{roles,statuses,permissions}.ts` (all 3 empty), `src/middleware/admin-auth.ts` (empty — admin-panel route protection).
**Reference:** Layer 1's `(admin)` panel (`admin-notifications`, `panel`, `send-mail`) is a much smaller, single-tenant admin tool and is only loosely relevant here — it does not have an application/verification review workflow to crib from. This is genuinely new product surface. `supabase/rpc/admin/*.sql` (3 files: `generate_admin_report.sql`, `get_application_queue.sql`, `get_admin_dashboard.sql`) are already scaffolded as intended RPC function names — implement the SQL to match these names so the action-layer code has a stable contract to call into.
**Next actions:** (1) build `admin-auth.ts` middleware + `permissions.ts` role model first — nothing else here is safe to build without access control; (2) build the applications queue + approve/reject flow (this is what unblocks resellers actually getting in); (3) build the verification queue next (depends on #1 above being built first since it produces the documents this reviews); (4) reseller management, reports, and settings can follow in any order after that.

### 3. Launch wizard — `[countryCode]/launch/*` — **0% (9/9 files empty)**
**What exists:** Nothing. `LaunchClient.tsx`, `LaunchWizard.tsx`, `BusinessSetup.tsx`, `AppSetup.tsx`, `StoreSetup.tsx`, `BrandingSetup.tsx`, `LaunchComplete.tsx`, `page.tsx`, `layout.tsx` are all empty.
**What it needs to do:** Once approved, walk a reseller through: naming their business, configuring their store (theme, categories, plans to sell), branding (logo/colors — note `src/lib/business-generator/logo/generator.ts` and `logo/validator.ts` already have some real code, see below), and initial app configuration.
**Overlap warning:** There is a parallel, differently-named component set under `src/components/reseller/launch/*` (10 files, all empty: `LogoGenerator`, `LaunchWizard`, `AppConfigStep`, `ThemeSelector`, `BrandingStep`, `StepIndicator`, `BusinessInfoStep`, `StoreConfigStep`, `LaunchComplete`, `PricingStep`) that appears to be the intended shared component library the `[countryCode]/launch/*` page-level files should compose from — build the components first, then wire the page-level wizard around them, not the reverse.
**Backing actions (all empty, 8 files):** `src/actions/reseller/launch/*` — `generateLegal`, `launchBusiness`, `generateStorefront`, `generateBrand`, `createBusiness`, `generateApp`, `generateMarketing`, `generateLogo`.
**Backing lib (partially real — 1 of 24 files):** `src/lib/business-generator/logo/generator.ts` is IMPLEMENTED (`generateIconPng`, `generateNotificationIcon` — also duplicated verbatim at `src/app/[countryCode]/generateIcon.ts`, which is also implemented; **these two files should be reconciled into one shared module, see Known Irregularities in architecture.md-style findings below**). Everything else in `business-generator/` (branding, descriptions, storefront, marketing, screenshots, playstore, legal, app config subfolders — 23 files) is empty.
**Next actions:** (1) reconcile the duplicate icon-generation code; (2) build `createBusiness`/`launchBusiness` actions against real Supabase tables (note: the underlying `reseller_stores` table schema itself is only defined in an empty migration file — see P0 item 5 below, this is a blocking dependency); (3) build the wizard step components; (4) legal-doc auto-generation (`generateLegal`) can be deferred to the Legal domain (P2) and launch wizard can link out to a manual/placeholder ToS in the meantime.

### 4. Onboarding & Status lookup — `[countryCode]/onboarding/*` (0/3) and `[countryCode]/status/*` (0/6) — **0%**
**What exists:** Nothing in either folder.
**What onboarding needs to do:** Post-launch first-run experience — a short tour/checklist pointing a brand-new reseller at their storefront URL, their first plan setup, and their wallet funding.
**What status lookup needs to do:** A public, unauthenticated page where a pending applicant can check their application status without logging in (`status/page.tsx`, `StatusLookupClient.tsx`, `status/[applicationId]/{page.tsx,StatusClient.tsx,layout.tsx}`). This depends on `src/actions/reseller/application/getApplicationStatus.ts`, which **is already implemented** — this is purely a UI-layer gap, the data layer is ready.
**Priority note:** `status` is cheaper to build than `onboarding` (one action already exists) and directly improves applicant experience while the admin-review flow (P0.2) is being built — consider building it in parallel as quick a win.

### 5. Database schema — `supabase/migrations/*` (0/13) and `supabase/rpc/*` (0/53) — **0%, but the live schema is NOT actually missing, only its version-controlled record is**
**What exists on disk:** Nothing — every migration and every RPC `.sql` file is a 0-byte placeholder with only its filename indicating intent (e.g. `20250103_create_reseller_stores.sql`, `supabase/rpc/admin/get_admin_dashboard.sql`).
**What almost certainly exists in reality:** A live schema in the Supabase project dashboard — the application clearly runs today (wallet funding, plan purchases, order creation are all working per Appendix A), which is only possible if real tables back `src/actions/reseller/wallet/*`, `orders/*`, `plans/*`, `customers/*`, `dashboard/*`. **This is a documentation/version-control gap, not necessarily a functionality gap** — but it is the most dangerous single item in this entire audit because every other P0/P1 item above depends on a schema that exists only in one non-versioned place.
**Next actions:** (1) run `supabase db dump --schema public -f supabase/migrations/00000000_baseline.sql` (or the equivalent `supabase db pull` workflow) against the live project to capture ground truth immediately; (2) once captured, retroactively file the 13 already-named migrations against the real schema (rename/split the baseline dump to match the intended `20250101_create_country_configs.sql` .. `20250113_create_rpc_functions.sql` sequence if that history matters, or simply supersede them with the baseline dump and delete the placeholders); (3) write the actual RPC function bodies for the 53 scaffolded `supabase/rpc/*.sql` names as each corresponding action file gets implemented — treat each RPC filename as the andled contract its matching `src/actions/reseller/**` file expects.


---

## P1 — Needed for a usable v1 launch (once P0 is closed)

### 6. Dashboard overview page — `dashboard/overview/*` — **0% (2/2 empty)**
`page.tsx` and `OverviewClient.tsx` are empty, yet the dashboard root (`dashboard/page.tsx`, `DashboardClient.tsx`, `StatsCards.tsx`, `RevenueChart.tsx`, `ActivityFeed.tsx`, `QuickActions.tsx`) is already fully implemented. Clarify with the product owner whether `dashboard/overview` is meant to be a distinct page from the dashboard root, or a leftover from an earlier information-architecture pass that got superseded by the now-working root dashboard — this could be a 2-file quick win (redirect `overview` → root) or a real second page, depending on intent.

### 7. Publishing / Android app build pipeline — `dashboard/publishing/*` (70% done, 3/10 empty), `dashboard/app-lifecycle/*` (0/5), `dashboard/app/*` (50%, 3/6 empty) — **partial, real gaps remain**
**What's real:** `PublishingClient.tsx`, `PublishingPlans.tsx` exist (with `TODO(wallet)` markers noted below), `AppBuildClient.tsx` exists (with `TODO: Get from context` markers on 5 fields — `applicationId`, `buildId`, `storeName`, `storeSlug`, `brandColor` are all hardcoded to empty strings, meaning the build-trigger UI is not actually wired to real application/store context yet). Backing actions `src/actions/reseller/build/*` are 75% done (6/8 real: `completeBuild`, `getBuildContext`, `getBuildHistory`, `getBuildStatus`, `triggerAppBuild`, plus `index.ts`; empty: `cancelBuild.ts`, `updateBuildStatus.ts`).
**What's missing:** `dashboard/app-lifecycle/*` (version history, build status display, the lifecycle-tracking UI) is 100% empty. `src/actions/reseller/publishing/*` (8 files: `getBuildStatus`, `publishToPlayStore`, `upgradeDistribution`, `generateAppAssets`, `getPublishingPlans`, `getBuildHistory`, `getAppReadiness`, `queueBuild`) is 100% empty — this is a separate, more complete-feeling action namespace than `build/*` that appears to be the intended real home for this feature; **`build/*` and `publishing/*` likely need to be reconciled/merged, not both fully built out separately** (see Known Irregularity below). `src/lib/publishing/*` (6 files: `index.ts`, `app-readiness.ts`, `version-manager.ts`, `build-queue.ts`, `playstore-api.ts`, `asset-generator.ts`) is 100% empty — this is the actual domain logic layer neither `build/*` nor `publishing/*` action files can function without.
**Reference:** Layer 2's `triggerAppBuild.ts` + `/api/build-config`, `/api/build-webhook`, `/api/trigger-build`, `/api/generate-icon` is a complete, working, single-country version of this exact feature — read it before building any of this.
**Next actions:** (1) resolve the `build/` vs `publishing/` action-namespace duplication with the product owner/original author; (2) fix the 5 hardcoded-empty-string TODOs in `AppBuildClient.tsx` by wiring real application/store context; (3) build `lib/publishing/*` domain logic against the Layer-2 reference pattern; (4) build `app-lifecycle` UI last, once build status data is real.

### 8. Wallet — `dashboard/wallet/*` is 100% done, but the payout half is not
**What's real:** The dashboard wallet UI is fully built (8/8 files), and `src/actions/reseller/wallet/*` is 67% real (6/9: `createVirtualAccount`, `fundWallet`, `getTransactions`, `getWallet`, `handleSuccessfulDeposit`, `withdrawFunds` all exist — note `withdrawFunds.ts` has a `TODO(wallet): replace this with the real wallet deduction` marker in `PublishingPlans.tsx`, meaning the withdrawal/deduction logic is present but not yet fully trusted/wired everywhere it's called from). Empty: `resellerCustomerWallet.ts`, `customerVirtualAccount.ts`, `getVirtualAccount.ts` (this last one is a duplicate-looking file — a `getWallet.ts` already exists and is implemented; clarify whether `getVirtualAccount.ts` is meant to be a distinct virtual-account-specific query or dead scaffold).
**What it needs to do next (the specific product-owner-named gap: "payout to resellers"):** the withdrawal-to-bank flow exists in code (`withdrawFunds.ts`) but its 3 exported functions were counted as duplicated in the export grep (`withdrawFunds,withdrawFunds,withdrawFunds`), suggesting either overloaded exports or copy-paste — worth a direct code review pass. Layer 2's `withdrawFunds.ts` (`getBanks`, `verifyBankAccount`, `withdrawFunds`) is the complete working reference for the bank-verification step, which Layer 3's version should be checked against for feature parity.
**Next actions:** (1) audit `src/actions/reseller/wallet/withdrawFunds.ts` directly for the export duplication and confirm bank-verification parity with Layer 2; (2) resolve the `TODO(wallet)` markers in `PublishingPlans.tsx`/`PublishingClient.tsx` by wiring real wallet balance instead of the placeholder; (3) build `resellerCustomerWallet.ts` (customer-side wallet under a reseller's store, the multi-country equivalent of Layer 2's working `resellerCustomerWallet.ts`) and `customerVirtualAccount.ts` next, using Layer 2's versions of the same filenames as the direct reference.

### 9. Reseller/store/notification/upload API surfaces — mostly empty
- `src/app/api/reseller/[countryCode]/*` — 30% done (3/10). Real: `config/[configId]/route.ts`, `wallet/fund/route.ts`, `webhooks/build/route.ts`. Empty: `apply`, `countries`, `dashboard`, `status/[applicationId]`, `store/[storeName]`, `upload`, `webhooks/notifications`, `webhooks/payment`, `webhooks/verify/[token]` route handlers — 7 files. Given `src/actions/reseller/application/*` (server actions) already cover apply/status/upload-equivalent functionality, confirm whether these empty REST routes are meant for external/mobile-app consumption (i.e., a public API mirroring Layer 2's `/api/v1/*`) before building them — if so, this is really "P2: public multi-country API," not a P1 gap, since the dashboard itself doesn't need REST routes when Server Actions already work.
- `src/app/api/store/[countryCode]/*` — 0% (0/4): `checkout`, `favicon`, `products`, `webhook`. The storefront pages themselves (`[countryCode]/[storeName]/*`) are 93% done and presumably call Server Actions directly rather than these REST routes — same "confirm intended consumer" caveat as above applies.
- `src/app/api/notifications/[countryCode]/*` — 0% (0/3): `preferences`, `send`, `templates`.
- `src/app/api/upload/[countryCode]/*` — 0% (0/3): `document`, `image`, `logo`. This one IS a real P0/P1 dependency — the verification flow (P0.1) and the launch/branding flow (P0.3) both need file upload, and no upload endpoint of any kind exists yet under `[countryCode]`. Build this one regardless of the REST-vs-Server-Action question above.

### 10. Notifications domain — `dashboard/notifications/*` (0/5), `src/actions/reseller/notifications/*` (0/7), `src/lib/notifications/*` (0/10), `src/constants/notifications/*` (0/3)
Nothing implemented anywhere in this vertical — not the in-dashboard notification center UI, not the send/mark-read/settings actions, not the actual email/SMS/push template rendering and sending library, not the templates themselves. This is a fully self-contained, fully unstarted feature. Note Layer 1 already has a working, separate notification system (`src/app/actions/notifications.ts`, FCM setup in `src/lib/fcm/firebase.ts`) that Layer 3 can crib the push-sending mechanics from, even though the UI and data model need to be new (multi-tenant, per-country, per-reseller-store notification preferences rather than Layer 1's single-tenant model).

### 11. Security review action items (cross-cutting, not tied to one folder)
- Fix the `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` naming issue documented in `architecture.md` Known Irregularities #5 — rename the env var, audit both call sites (`lib/supabase/admin.ts`, `lib/supabase/server.ts`), confirm neither is ever imported into a client component.
- Generate and commit a `.env.example` from the 55-variable inventory in `architecture.md` — currently a genuinely blank spot with no in-repo record of what's needed to run the project.
- `dashboard/security/*` (0/7: `LoginHistoryTable`(actually this one exists per components list, double check), `DeviceCard`, `SessionList` under components are partial — but the `dashboard/security/` route-level files themselves — `DeviceManagement.tsx`, `LoginHistory.tsx`, `page.tsx`, `SecurityClient.tsx`, `SessionManagement.tsx`, `TwoFactorAuth.tsx`, `layout.tsx` — are 100% empty) plus `src/actions/reseller/security/*` (0/4: `revokeSession`, `disable2FA`, `getDevices`, `enable2FA`) is entirely unbuilt. This is where a reseller would manage 2FA, active sessions, and device history for their own dashboard account — genuinely new, not present in Layer 1 or 2 in this form.


---

## P2 — Differentiating features (needed for full product vision, not launch-blocking)

### 12. AI business assistant — `dashboard/ai/*` (0/7), `src/actions/reseller/ai/*` (0/8), `src/lib/ai/*` (0/12), `src/components/reseller/ai/*` (0/7)
**Completely unstarted across every layer of this feature** — UI, actions, and the AI provider abstraction itself. `src/lib/ai/providers/{openai,groq,gemini,nvidia}.ts` are all empty — meaning not even the choice of which AI provider to call has been implemented, only scaffolded as 4 provider-file placeholders plus `client.ts`, `index.ts`, `intent-detection.ts`, `context-builder.ts`, `prompt-templates.ts`, `response-formatter.ts`, `business-assistant.ts`. Intended features per the scaffold's component names: a chat interface (`AIChat.tsx`, `AIAssistant.tsx`, `AIChatBubble.tsx`), proactive insight cards (`AIInsightCard.tsx`, `AISuggestion.tsx`), a "business health score" (`BusinessHealthScore.tsx`, backed by `src/types/reseller/business-health.ts`, also empty), quick-actions (`AIQuickActions.tsx`), and an AI-driven onboarding assist (`AIOnboarding.tsx`). Backing RPC scaffolds already named: `supabase/rpc/ai/{get_ai_context,get_business_summary,get_business_insights,detect_anomalies,get_health_score}.sql` — all empty.
**Recommendation:** this is the single largest ground-up-new subsystem in the entire blueprint (no Layer 1/2 precedent to reference at all). Do not start this until P0/P1 are closed — an AI assistant that recommends actions inside a dashboard that itself still has broken payout/publishing flows will actively mislead resellers.

### 13. Marketing tools — `dashboard/marketing/*` (0/10), `src/actions/reseller/marketing/*` (0/6), `src/components/reseller/marketing/*` (0/8), `src/lib/business-generator/marketing/*` (0/3)
Fully unstarted: flyer generation, WhatsApp message templates, QR code generation for store links, social post generation, broadcast messaging to a reseller's own customer list, and a "referral hub" tying into the referrals domain below. `supabase/rpc/marketing/{generate_qr_code,get_referral_stats,get_marketing_analytics}.sql` scaffolded, empty.

### 14. Legal / compliance document generation — `dashboard/legal/*` (0/9), `src/lib/business-generator/legal/{terms,refund,privacy}.ts` (0/3)
Fully unstarted: an auto-generated Terms of Service / Privacy Policy / Refund Policy / Acceptable Use policy per reseller store, plus a compliance dashboard and policy-generator wizard. **Caveat on priority:** while this is filed under P2 because it isn't required for the core transactional loop to function, most jurisdictions legally require a published privacy policy and terms of service before a commercial storefront collecting payment/personal data goes live — flag this explicitly to the product owner as a possible P0/P1 reclassification depending on the launch countries' regulatory requirements, rather than assuming P2 is correct without confirmation.

### 15. Referrals & commissions — `dashboard/referrals/*` (0/5), `src/actions/reseller/referrals/*` (0/3), `src/components/reseller/referrals/*` (0/3)
Fully unstarted: referral link generation, a leaderboard, commission tracking/stats. `supabase/rpc/marketing/get_referral_stats.sql` already scaffolded (empty) suggests this may originally have been planned as part of the marketing RPC namespace rather than its own — worth reconciling naming before building.

### 16. Support / ticketing — `dashboard/support/*` (0/6), `src/actions/reseller/support/*` (0/6)
Fully unstarted: ticket creation, ticket list/detail, categories, replies, closing tickets. No live-chat or third-party helpdesk integration is referenced anywhere in the codebase or env-var inventory — this would need to be built from scratch as an in-app system, or the decision made to integrate a third-party helpdesk instead (cheaper, faster, but not reflected in current scaffolding).


---

## P3 — Nice-to-have / can ship without

### 17. Achievements & gamification — `dashboard/achievements/*` (0/5), `src/actions/reseller/achievements/*` (0/3), `src/components/reseller/achievements/*` (0/3)
Milestone tracking, badges, progress bars. Zero business-logic dependency from anything else in the platform — genuinely deferrable.

### 18. Announcements — `dashboard/announcements/*` (0/6)
"What's new," promotions, system updates feed. Could plausibly be replaced with a simple static changelog page rather than a full built feature for an initial launch.

### 19. Help center — `dashboard/help/*` (0/6)
Searchable help articles, sidebar navigation. Can be replaced with a link to external documentation for launch.

### 20. Command palette — `src/components/reseller/command-palette/*` (0/4)
`CommandPalette.tsx`, `CommandSearch.tsx`, `CommandItem.tsx`, `QuickActions.tsx` — a power-user Cmd+K style navigation shortcut. Pure UX polish, zero product-logic dependency.

### 21. Remaining shared UI atoms — `src/components/reseller/common/*` (0/11), `src/components/reseller/forms/*` (0/6)
`ProgressBar`, `LoadingSkeleton`, `PhoneInput`, `CountrySelector`, `CurrencyDisplay`, `ConfirmationModal`, `FileUploadWithPreview`, `Breadcrumb`, `EmptyState`, `NotificationToast`, `StatusBadge`, plus generic `ProfileForm`, `PlanForm`, `SecurityForm`, `ApplicationForm`, `StoreSettingsForm`, `SupportTicketForm`. **Important:** several P0/P1 items above (verification document upload, admin review UI, security settings) will need some of these atoms (`FileUploadWithPreview`, `CountrySelector`, `PhoneInput`, `ConfirmationModal` especially) as real prerequisites, not deferred polish — when a P0 item needs one of these, build that specific atom then, rather than waiting for a dedicated "P3 common components" pass. This section is listed at P3 only for the atoms that aren't yet a hard blocker for anything above.

---

## Priority-ordered build sequence (condensed, cross-referenced to numbered items above)

1. Database schema capture (#5) — do this literally first, today, independent of everything else; it is pure risk-reduction with no design decisions required.
2. `.env.example` + service-role key rename (#11) — same category: pure risk-reduction, no design decisions, do immediately.
3. Verification/KYC flow (#1)
4. Admin panel — access control + application/verification review (#2)
5. Upload API (#9, the `[countryCode]/upload/*` subset only)
6. Launch wizard (#3)
7. Onboarding + status lookup (#4)
8. Wallet payout audit + completion (#8)
9. Publishing/build pipeline reconciliation (#7)
10. Dashboard overview resolution (#6)
11. Notifications domain (#10)
12. Security settings (#11, the `dashboard/security/*` build-out)
13. Remaining reseller/store API routes, once the REST-vs-Server-Action question is answered (#9, remainder)
14. Legal/compliance (#14) — re-check priority against regulatory requirements before deferring
15. Marketing (#13)
16. Referrals (#15)
17. Support (#16)
18. AI assistant (#12)
19. Achievements, announcements, help center, command palette (#17–20)


---

## Document relationships

- **`architecture.md`** is the raw ground truth this document was built from — every file count, every export list, every empty-file appendix. If a claim in this document ever seems to disagree with the live repository, re-verify against `architecture.md`'s methodology (and if `architecture.md` itself is stale, see `handover.md`'s staleness-check procedure before trusting either document).
- **`handover.md`** is the source of truth for process and session continuity — read that document first, always.

*End of blueprint.md.*
