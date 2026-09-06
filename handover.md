# HANDOVER.md — READ THIS FILE FIRST, AND ONLY THIS FILE, AT THE START OF EVERY SESSION

**This is the single source of truth for what to do right now.** For the complete architecture (what the system is, what's done, what's left, why), read `master-architecture.md`. This file exists so no session has to re-derive that picture — it converts `master-architecture.md`'s ⚠️/❌ items into a concrete, ordered task board, and tells you exactly where to pick up.

---

## TOP ORIENTATION — READ THIS BLOCK FIRST, EVERY TIME

```
CURRENT POSITION: STEP 0 — 0.1, 0.2, and 0.3 all done. Ready to start Task 1a.i.x.
NEXT ACTION: Read supabase/migrations/20260906000000_baseline_live_schema.sql
  and schema.sql (repo root, same content) as ground truth for the data model —
  they supersede any table/column assumptions in architecture.md's earlier
  "guess reconciled from working code" data model. Then start Task 1a.i.x.
```
**A session updates the line above as its very last action before ending**, so the next session's first read tells it exactly where to resume. If you are reading this and `CURRENT POSITION` says a task is already in progress or done, trust it — do not re-verify by re-auditing the repo; the session that updated it already did that verification and logged it in the Session Log (§ at the bottom of this file).

**If a session cannot finish an `x` task in one sitting**, it must still update `CURRENT POSITION` before ending — either to the same `x` with a note on what remains, or to wherever it actually got to. Never leave `CURRENT POSITION` pointing somewhere already completed.

---

## Step 0 — one-time prerequisite actions (do before Task 1, not part of the 1-2-3-4 task board)

These are cheap, high-risk-reduction, no-design-decision-required actions flagged repeatedly across every prior document (`architecture.md`, `blueprint.md`, `master-architecture.md` §10). They are gated to run once, first, by whichever session picks this up first.

- [x] **0.1 — Database schema capture.** DONE 2026-09-06 — captured via direct `pg_dump --schema-only --no-owner --no-privileges -n public -n api_users` against the live pooler connection, **not** `supabase db pull`/`db dump` (both require a local Docker daemon for their shadow-database diff, which this Termux/proot-Ubuntu environment cannot run). Committed as `schema.sql` (repo root) and identically as `supabase/migrations/20260906000000_baseline_live_schema.sql` (a single baseline migration, since no real migration history existed to diff against). **Important finding surfaced by this capture:** the live schema has **81 tables** (`public` + `api_users`), 162 RLS policies, 63 functions, 41 triggers — confirming `master-architecture.md` §4's data model was indeed a guess. The 13 pre-existing empty migration stubs (now at `supabase/migrations_old_empty/`, renamed from `supabase/migrations/` in a prior session) guessed at table names (`country_configs`, `verification_documents`, `admin_actions`, etc.) that **do not match the real schema** — most don't exist under those names at all. They were left in place, untouched, rather than force-populated or deleted, since reinterpreting them risks misrepresenting history; a product-owner call is needed on whether to delete them. **Any session doing schema/data-model work must treat `schema.sql`/the baseline migration as ground truth over `architecture.md`'s earlier table descriptions where the two disagree.**
- [x] **0.2 — `.env.example`.** DONE 2026-09-06 — generated from the 55-variable inventory in `architecture.md`, committed at repo root, `.gitignore` updated with `!.env.example` since the existing `.env*` rule would otherwise have swallowed it too.
- [x] **0.3 — Fix `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` naming.** DONE 2026-09-06 — both call sites (`src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`) renamed to the already-correctly-named `SUPABASE_SERVICE_ROLE_KEY` (which was already in use elsewhere, in `api/xixa-account/webhook/route.ts` — the rename consolidates onto the name that was already right rather than introducing a third variant). **This surfaced a bigger, still-OPEN finding, recorded in `architecture.md` Known Irregularity #9: `server.ts`'s cookie-based `createServerClient` (imported in 122 files) runs on the service-role key, not the anon key, meaning it bypasses Postgres RLS entirely regardless of whose session cookie is attached. This was NOT changed as part of this fix — only the naming was. Whether to switch this to the anon key (standard pattern) needs an explicit product-owner/engineering decision first, since 122 files' worth of behavior could change.**

**When all three are checked, update `CURRENT POSITION` to `Task 1a.i.x` and move to the task board below.**

---

## THE TASK BOARD

**Structure (fixed, do not deviate):** 4 top-level Tasks → each splits into 3 subtasks (a/b/c) → each splits into 2 sub-subtasks (i/ii) → each has exactly one atomic unit of work, `x`, which is what a single session actually executes. **A session performs exactly one `x` per sitting** (or picks up an unfinished one, per the Top Orientation rule above). Work top-to-bottom, task-to-task, in the order below — the order already encodes dependency (Task 1 unblocks Task 2's Reseller-facing work, etc.) and priority (`master-architecture.md`'s P0/P1/P2/P3 tiers map onto Tasks 1/2/3/4 respectively, loosely).

**Every `x` line below is a checkbox.** Mark `[x]` when done, in the same edit where you write the Session Log entry (§ bottom) describing what you actually built/decided — the checkbox alone is not enough; the log entry is what saves the next session from rediscovery.

**CLEANUP RULE — read this before starting any task:** When every `x` under a top-level Task (all of 1a.i, 1a.ii, 1b.i, 1b.ii, 1c.i, 1c.ii for Task 1, for example) is checked, **the next session's first job — before touching any new `x` — is to delete that entire Task's block from this file** (every line from `### TASK N` down to its last `x`), and replace it with a single line in the "Completed Tasks Archive" section at the bottom: `Task N — <name> — completed <date>, see master-architecture.md for final architecture.` This keeps this file from growing forever and keeps it always reflecting only remaining work. Do the cleanup, commit it, THEN start the next task's first `x` in the same or a later session.

### TASK 1 — Reseller Lifecycle & Governance Foundation
*(closes `master-architecture.md` §2 products #1, #2, #17; the P0 "core lifecycle is broken" finding)*

**1a. Identity & Access foundation**
- [ ] 1a.i.x — Build the RBAC model: `roles`/`permissions` tables, the full role list from `master-architecture.md` §1.1 (`SUPER_ADMIN`, `PLATFORM_ADMIN`, `COMPLIANCE_OFFICER`, `FINANCE_ADMIN`, `SUPPORT_AGENT`, `MERCHANT_OWNER`, `MERCHANT_STAFF`, `CUSTOMER`, `API_CLIENT`), and `src/middleware/admin-auth.ts` (currently empty) enforcing role-scoped route access.
- [ ] 1a.ii.x — Build device fingerprinting at Application time (`devices` table, fingerprint capture per `product-spec.md` §13's field list) plus the `risk_flags`/`fraud_rules_config` tables as an empty-but-ready foundation for Task 4b to write into later — do not build fraud *logic* yet, just the schema and the Application-stage hard block.

**1b. Verification/KYC**
- [ ] 1b.i.x — Build document-upload infrastructure: `src/lib/storage/document-storage.ts`, `api/upload/[countryCode]/{document,image,logo}` routes, `DocumentUploader`/`DocumentPreview` components, backed by a private Supabase Storage bucket with signed-URL access (confirm bucket privacy as part of this task, per `master-architecture.md` §7's flagged gap).
- [ ] 1b.ii.x — Build the Verification flow end-to-end: `[countryCode]/verify/[token]`, `actions/reseller/verification/*` (all 5 files), per-country `KYCRequirements`, and `verification-rules.ts`.

**1c. Admin Panel & Storefront Provisioning**
- [ ] 1c.i.x — Build the Country Admin application/verification review queue: `[countryCode]/admin/{applications,verifications}/*`, `actions/reseller/admin/{getApplicationQueue,getApplicationDetails,approveApplication,rejectApplication,getVerificationQueue,verifyDocument,rejectDocument}`, and the matching `components/reseller/admin/*` (ApplicationQueue, ApplicationDetails, DocumentReview, VerificationQueue, ApprovalWorkflow). This is the single item that actually closes the "resellers can apply but nothing can approve them" gap.
- [ ] 1c.ii.x — Build the storefront-provisioning job (`storefront_provisioning_jobs` table + state machine `queued→generating→ready→failed`) and the Onboarding/Launch wizard (`[countryCode]/onboarding`, `[countryCode]/launch`, the `components/reseller/launch/*` step components) that walks an approved Reseller through country/payment/plan setup per `product-spec.md` §7/§8. Include `[countryCode]/status` (public application-status lookup — cheap, since `getApplicationStatus` action already exists).

### TASK 2 — Commerce & Financial Core
*(closes `master-architecture.md` §2 products #4, #5, #6, #8, #9; the wallet/ledger/pricing gaps)*

**2a. Wallet, Ledger & Bonus completion**
- [ ] 2a.i.x — Audit and fix `src/actions/reseller/wallet/withdrawFunds.ts` (resolve the duplicated-export finding from `blueprint.md` #8), then build the empty `resellerCustomerWallet.ts`/`customerVirtualAccount.ts` using Layer 2's equivalents as the direct reference. Confirm the bonus-first/wallet-second deduction order (`product-spec.md` §10) is actually enforced in code, not just assumed. **Also confirm/enforce that no withdraw action or endpoint is reachable for `owner_type = customer` (resolved 2026-09-06 — Resellers only can withdraw; Customer wallets are deposit-and-spend only, no bonus/wallet split needed for Customers) — this is an authorization check to add, not just a UI omission to leave alone.**
- [ ] 2a.ii.x — Build the first-app-deposit bonus flow exactly as resolved in `product-spec.md` §9 (one-time, app-channel-only, local-currency equivalent of $10, `first_app_deposit_bonus_claimed_at` timestamp) plus a minimal reconciliation baseline (`reconciliation_runs` table + one scheduled job comparing ledger totals against one payment gateway's settlement report, as a proof of concept before expanding to all gateways).

**2b. Pricing, FX & Multi-Country selling rules**
- [ ] 2b.i.x — Build the FX-rate service (`fx_rates` table, a scheduled refresh job, and the conversion function) — resolve the static-vs-live-rate open question from `product-spec.md` §15 with the product owner before building; default to admin-configurable static rates if no answer is available, since that's the cheaper/safer default per that section's own reasoning.
- [ ] 2b.ii.x — Build per-Reseller country-access limits: `reseller_countries` table, `actions/reseller/country/*` (all 6 files) enforcing default+2-free then $3-per-additional-country, per `product-spec.md` §11.

**2c. Storefront Commerce & Customer Auth**
- [ ] 2c.i.x — Implement the role-aware currency-display engine inside the already-file-complete storefront pages (Customer sees everything converted to their currency; Reseller sees each plan in its native provider-country currency) per `product-spec.md` §15, plus phone-prefix-based network-carrier auto-detection. Read the existing storefront components fully before writing anything — confirm exactly how much of this logic (if any) already exists, since file-completeness never confirmed the business logic itself.
- [ ] 2c.ii.x — Build the Customer buy-triggered sign-up/auth modal (transaction PIN + country-conditional payment-method setup, per `product-spec.md` §16) and the Reseller-self-purchase-at-base-price rule with strikethrough UI (`product-spec.md` §17) inside the actual purchase-execution action.

### TASK 3 — Platform, Provider & Distribution
*(closes `master-architecture.md` §2 products #10, #11, #12, #13, #14)*

**3a. Provider Integration Layer**
- [ ] 3a.i.x — Build `provider_networks` (which provider serves which network/country) and `provider_health_checks` with a basic circuit-breaker wrapper around the existing Zendit/Accragh/Lizzysub calls, so a provider outage degrades gracefully instead of surfacing a raw error to Customers.
- [ ] 3a.ii.x — Build `provider_cost_sync_log` and a scheduled cost-sync job that updates `platform_plans.base_price_minor` on a cadence, respecting the floor-price rule for every already-configured `merchant_plans` row (resolve the fixed-markup-vs-percentage-markup repricing question from `full-blueprint.md` §6f before this ships).

**3b. Android Publishing & Maintenance**
- [ ] 3b.i.x — Reconcile the `actions/reseller/build/*` vs `actions/reseller/publishing/*` namespace duplication (`blueprint.md` #7) into one canonical namespace, then build the tiered publishing-fee logic ($22/$28/$35 per `product-spec.md` §20) — **first get the product owner to resolve the maintenance-fee inconsistency flagged in `master-architecture.md` §10 before building the maintenance side of this.**
- [ ] 3b.ii.x — Build the maintenance-billing scheduled job (`maintenance_subscriptions` table, due-date reminders, auto-debit from wallet only, suspension-on-nonpayment cascading into the Android app actually stopping) and the `dashboard/app-lifecycle/*` UI showing this status.

**3c. API Platform & Notifications**
- [ ] 3c.i.x — Build `api_tokens` (Reseller-issued Customer tokens), the token-issuance UI/action, and a token-authenticated purchase endpoint under `api/reseller/[countryCode]/*`, using Layer 2's fully-working `/api/v1/*` as the direct reference pattern (`product-spec.md` §19).
- [ ] 3c.ii.x — Build the notification system end-to-end: `lib/notifications/*` (templates, localized across the 5 existing languages per `master-architecture.md` §"Internationalization"), `actions/reseller/notifications/*`, `dashboard/notifications/*` UI, with the API-Customer-vs-normal-Customer segmentation from `product-spec.md` §21. Reuse Layer 1's FCM push plumbing for delivery mechanics.

### TASK 4 — Growth, Risk & Operations
*(closes `master-architecture.md` §2 products #7-remainder, #15, #16, #18, plus infra/security)*

**4a. Marketing, Gamification & Legal**
- [ ] 4a.i.x — Build the campaign-banner system (3rd-app-use trigger, Customer-vs-Reseller copy per `product-spec.md` §22) and the weekly gamification challenge (`product-spec.md` §23 — get the reward-duration and week-start-day open questions resolved by the product owner first).
- [ ] 4a.ii.x — Build Legal document generation (ToS/Privacy/Refund per store, `blueprint.md` #14 — **check with the product owner/legal counsel whether this needs to be reclassified higher-priority for regulatory reasons before or during this task, per that item's own flag**) and the basic marketing tools (flyer/QR/WhatsApp templates).

**4b. Fraud/Risk/Compliance & Analytics**
- [ ] 4b.i.x — Build fraud/risk monitoring on top of the `risk_flags` table from 1a.ii: velocity/anomaly checks, bonus-abuse detection, and a Compliance Officer review UI reading from it.
- [ ] 4b.ii.x — Build the `platform_events` event-tracking layer and wire at least the Admin `reports/*` and dashboard `stats` screens to read from it instead of ad-hoc live queries.

**4c. Security, Infra & Support**
- [ ] 4c.i.x — Stand up automated testing (currently zero test files exist anywhere in the repo — pick a framework, write tests for the wallet/ledger logic first since it's the highest-risk code), and document/verify a backup and disaster-recovery policy for the Supabase project.
- [ ] 4c.ii.x — Build the Support/ticketing system (`dashboard/support/*`, `actions/reseller/support/*`) with the Support Agent RBAC scope (read-only on transactions, no KYC/withdrawal access) defined in 1a.i.

---

## Completed Tasks Archive

*(empty — no task fully closed yet as of this integration)*

---

## Standing rules carried forward from prior sessions (unchanged, still in force)

**Patch delivery (Termux, `~/storage/downloads`):** any `.patch` file produced for this user must be accompanied by the exact `git am` command. For a NEW branch: `git checkout <base-branch>` → `git checkout -b <new-branch>` → `git am ~/storage/downloads/<file>` → `git push -u origin <new-branch>`. For a follow-up patch onto an already-pushed branch: `git checkout <branch>` → `git am ~/storage/downloads/<file>` → `git push origin <branch>` (no `-u`, no recreate). Always state explicitly which case applies.

**Layer boundaries (still absolute):** Layer 1 (legacy consumer app) and Layer 2 (single-country reseller platform) are not build targets. Layer 2 is reference-only — mine it for working patterns (explicitly pointed to throughout the task board above) but never import its code into Layer 3 or route users through it. All new work happens under `[countryCode]`, `src/actions/reseller/**` (aliased `@/actions/reseller`, not `@/app/actions/reseller`), `src/components/reseller/**`, and Layer-3-owned `src/lib/` subdirectories.

**Known irregularities still unresolved (do not rediscover these — act on them where the task board above references them, or flag if you find they've changed):** the `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` naming issue (Step 0.3), the 53 RPC files under `supabase/rpc/**` are still empty (0 bytes) — Step 0.1's schema capture did not populate these, since `pg_dump --schema-only` was scoped to `public`/`api_users` tables/policies/functions actually present in the live DB, and these RPC files describe functions that may not exist there yet or exist under different names — needs a follow-up audit against the 63 real functions in the baseline migration, `wallet-withxixicopy.ts`/`WalletClient-withxixicopy.tsx` confirmed dead code (safe to delete once product owner confirms), the `build/` vs `publishing/` action-namespace duplication (Task 3b.i), the `generateIcon.ts`/`logo/generator.ts` duplicate pair (fold into whichever task touches app branding), the 13 empty migration stubs at `supabase/migrations_old_empty/` guess at table names that don't match the real 81-table schema (see Step 0.1) — needs product-owner decision on deletion.

---

## Session Log

*(Each session appends one entry here before ending. Format: date, which `x` was worked, what was actually built/decided, any new findings or open questions surfaced. This is what lets the next session skip rediscovery — read the last 2-3 entries here in addition to the Top Orientation block if `CURRENT POSITION` alone doesn't give enough context.)*

- **2026-08-29** — Integration session. Merged `full-blueprint.md` (this session's own full-platform vision) with an externally-provided "Telcos Platform" production-grade architecture document into `master-architecture.md`, cross-referenced every item against `architecture.md`'s real file-completion data, and rebuilt this file from scratch around a 4×3×2×1 task-board structure (24 atomic `x` units across 4 top-level Tasks) plus Step 0's three prerequisite actions. No code was changed. `CURRENT POSITION` set to Step 0.
- **2026-09-06** — Ran the staleness check before starting work: `reseller-gh` unchanged at commit `7603a82` (902 commits) — no drift, prior audit still fully accurate, no re-audit performed. Applied a product-owner clarification: **Customer wallets have no withdrawal capability at all — only Resellers can withdraw.** Updated `product-spec.md` §10 and `master-architecture.md` (§3, §4's `withdrawals` table, §10's operational rules table) and Task 2a.i above to record this as an authorization rule, not a UI omission. Completed Step 0.2 (`.env.example` created, `.gitignore` fixed) and Step 0.3 (renamed `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY` in `src/lib/supabase/{admin,server}.ts`, consolidating onto the name already correctly used in `api/xixa-account/webhook/route.ts`). **Step 0.3 surfaced a new, higher-severity finding, recorded as `architecture.md` Known Irregularity #9: `server.ts`'s cookie-based `createServerClient` (imported in 122 files) runs on the service-role key instead of the anon key, meaning it bypasses Postgres RLS entirely. Only the naming was fixed — the key-choice itself was deliberately left unchanged pending an explicit product-owner/engineering decision, given the 122-file blast radius of getting that decision wrong.** Step 0.1 (schema capture) is BLOCKED — this environment has no live Supabase credentials; needs someone with project access, or an explicit decision to proceed without it. `CURRENT POSITION` updated accordingly — next session should resolve 0.1's blocker (or get an explicit go-ahead to skip it) and/or get a decision on the server.ts RLS finding, then begin Task 1a.i.x.
- **2026-09-06 (later same day)** — Step 0.1 unblocked and closed: product owner ran `pg_dump --schema-only` directly against the live pooler connection (Termux/proot-Ubuntu couldn't run `supabase db pull`/`db dump` — both need a local Docker daemon this environment doesn't have). Captured schema committed as `schema.sql` (repo root) and as a single baseline migration `supabase/migrations/20260906000000_baseline_live_schema.sql` (81 tables across `public`+`api_users`, 162 RLS policies, 63 functions, 41 triggers). **Finding:** the 13 old empty migration stubs' guessed table names don't match the real schema — left untouched at `supabase/migrations_old_empty/` pending a product-owner deletion decision, rather than force-populated (see Step 0.1 and Known Irregularities above for detail). All three Step 0 items now done. `CURRENT POSITION` moved to Task 1a.i.x. Next session should start there, using `schema.sql`/the baseline migration as ground truth over `architecture.md`'s earlier data-model guesses wherever they disagree.

*End of handover.md.*
