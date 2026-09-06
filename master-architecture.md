# MASTER-ARCHITECTURE.md — Integrated Complete Platform Architecture (v2)

**Status of this document:** This is the authoritative, integrated architecture for the entire platform going forward. It merges three prior documents into one coherent whole:
- `full-blueprint.md` (this session's own invented full-cycle vision, built from repo analysis)
- The externally-provided "Telcos Platform" production-grade architecture document (2026-08-29 upload) — adopted as the structural backbone below because it is more technically complete (concrete data-model schemas, ledger accounting design, API surface, admin console modules, RBAC role list, event catalog) than this session's own first pass.
- `product-spec.md` (the original draft's business rules, resolved through direct product-owner clarification — those resolutions are carried forward here as final, not re-opened).

**This document does not delete the others** — `architecture.md` remains the file-level ground truth, `blueprint.md` remains the original Layer-3 file-gap roadmap, `product-spec.md` and `full-blueprint.md` remain as historical working documents. This document is what a new session should read for the *complete, current* architecture. `handover.md` is what a new session should read for *what to actually do next* — this document is the map, `handover.md` is the compass.

**How ticks work below:** Every item is marked ✅ **DONE** (real, working code confirmed via `architecture.md`'s file-level audit), ⚠️ **PARTIAL** (some real code exists, meaningful gap remains), or ❌ **NOT STARTED** (zero real implementation, scaffold empty or absent). These marks are the single source of truth for what's left — `handover.md`'s task board is built by taking every ⚠️/❌ item below and only those.

---

## 1. Vision & Platform Identity

The platform is a white-label, multi-tenant, multi-country, multi-currency digital-services commerce infrastructure. Independent Resellers apply, get verified, configure a branded storefront and (optionally) a published Android app, and sell airtime/data/cable/electricity to their own Customers in the Customer's local currency — regardless of which country's plans are being sold — keeping the markup as withdrawable profit on top of a shared upstream cost base (Zendit/Accragh/Lizzysub) and shared platform infrastructure (Supabase, Firebase, the existing payment rails). This is not a website — it is fintech-grade commerce infrastructure, and every domain below is held to that bar.

### 1.1 Actor / Role model (adopts the uploaded document's full RBAC list)

| Role | Definition | Status |
|---|---|---|
| `SUPER_ADMIN` / `PLATFORM_ADMIN` | Cross-country platform operator: onboards countries, sets platform-wide policy, manages Country Admins, views cross-country dashboards. | ❌ NOT STARTED — no role model exists at all yet (single flat "admin" concept only) |
| `COMPLIANCE_OFFICER` | Read-mostly KYC/AML/audit-log review, distinct from operational approval. | ❌ NOT STARTED |
| `FINANCE_ADMIN` | Ledger reconciliation, payout approval, chargeback handling. | ❌ NOT STARTED |
| `SUPPORT_AGENT` | Ticket handling, scoped read access, escalation path. | ❌ NOT STARTED |
| `MERCHANT_OWNER` (Reseller/Owner/User) | Applies, verified, configures storefront, sells, withdraws, may publish app. | ✅ Application done; ⚠️ everything after Verification is partial-to-none (see §4) |
| `MERCHANT_STAFF` | Sub-accounts under a Reseller with scoped console permissions. | ❌ NOT STARTED — not represented anywhere in the current codebase or prior drafts; net-new role this integration surfaces |
| `CUSTOMER` | Buys from a Reseller's storefront/app in local currency. | ⚠️ storefront UI exists; buy-triggered auth flow not confirmed built |
| `API_CLIENT` (API Customer) | Programmatic access via a Reseller-issued token. | ❌ NOT STARTED (Layer 3); ✅ working pattern exists as Layer 2 reference (`/api/v1/*`) |
| `Telco/Upstream Provider` | Zendit, Accragh, Lizzysub — actual fulfillment + true cost. | ✅ DONE (Layer 1, shared infra) |


---

## 2. The 18 Major Products — status ticked against the real repo

This adopts the uploaded document's product breakdown exactly, with each item ticked against `architecture.md`'s file-level audit.

| # | Product | Status | Evidence / gap |
|---|---|---|---|
| 1 | Merchant Application & Onboarding | ⚠️ PARTIAL | Application ✅ done (`[countryCode]/apply`, `actions/reseller/application/*` ~50-100%). Verification/KYC ❌ 0/4 files. Onboarding ❌ 0/3 files. Device binding ❌ not started. |
| 2 | Storefront Creation Engine | ⚠️ PARTIAL | Storefront UI shells ✅ 93-100% file-complete. The actual 3-hour provisioning job/state-machine ❌ has no representation anywhere in the scaffold under any name — genuinely missing, not just empty files. |
| 3 | Merchant Console / Dashboard | ⚠️ PARTIAL | Core (dashboard shell, store settings, wallet UI, general settings) ✅ ~100%. Plans ⚠️ 88%, Publishing ⚠️ 70%, Orders/Customers ⚠️ 86%. Security, Support, Legal, Marketing, Referrals, Achievements, Announcements, Notifications, Help, AI, Overview all ❌ 0%. |
| 4 | Customer Storefront | ⚠️ PARTIAL | UI shells ✅ done. Role-aware currency-conversion logic (Customer-view vs Reseller-view, §9.2 below) — file-complete but **logic not confirmed present**; requires direct code read, flagged since first analysis and still unresolved. |
| 5 | Wallet and Ledger System | ⚠️ PARTIAL | Two-balance (bonus/wallet) model ⚠️ 67% real actions. Double-entry bookkeeping, hold/settlement modes, reconciliation ❌ none of this exists — current system is at best a simple debit/credit log, not the accounting-grade ledger this integration specifies in §6. |
| 6 | Bonus and Promotion Engine | ⚠️ PARTIAL | `lib/bonus/calculateBonus.ts`(-equivalent) ✅ exists per `architecture.md`. First-deposit-bonus banner, bonus-abuse fraud controls ❌ not started. |
| 7 | Data Plan Catalog and Pricing Engine | ✅ MOSTLY DONE | `lib/pricing/calculatePrice.ts` ✅ fully implemented (`calculateResellerPrice`, `calculateProfit`, floor-price logic). Plans actions ⚠️ 82% real. This is the single best-built domain in the entire Layer-3 scaffold. |
| 8 | Multi-Country and Multi-Currency Engine | ⚠️ PARTIAL | Static country config ✅ 24 countries fully implemented (`src/config/countries/*`). FX conversion service ❌ not started/not confirmed. Per-Reseller country-access limits (default+2 free, $3 extra) ❌ 0/6 files (`actions/reseller/country/*`). |
| 9 | Payment and Settlement Infrastructure | ⚠️ PARTIAL | Gateway wrappers (Flutterwave/Korapay/Xixapay/Payvessel) ✅ done, shared from Layer 1. Reseller-side fund/withdraw ⚠️ 67%. Settlement/reconciliation against gateway reports ❌ not started. |
| 10 | Telco Fulfillment Engine | ⚠️ PARTIAL | Provider SDKs (Zendit/Accragh/Lizzysub) ✅ done (Layer 1). Routing/health-monitoring/failover abstraction across providers ❌ not started — confirmed no evidence anywhere. |
| 11 | API Platform | ❌ NOT STARTED (Layer 3) | Layer 2's `/api/v1/*` ✅ fully working as a **reference-only** pattern. Layer 3's country-scoped equivalent ⚠️ 30% (3/10 files), no token-issuance-for-Customers capability anywhere. |
| 12 | Android App Builder | ⚠️ PARTIAL | Build-trigger actions ⚠️ 75% real. White-label templating-as-an-artifact, versioning/OTA strategy ❌ not started/not decided. |
| 13 | Play Store Publishing and Maintenance | ⚠️ PARTIAL | Publishing dashboard UI ⚠️ 70%. Tiered fee logic ($22/$28/$35), maintenance billing cron, suspension-on-nonpayment cascade ❌ not started anywhere. |
| 14 | Notification and Campaign Engine | ❌ NOT STARTED | 0% across dashboard UI, actions, lib, constants. Layer 1 has separate working push infra (FCM) reusable for delivery mechanics only. |
| 15 | Gamification and Reward Engine | ❌ NOT STARTED | `dashboard/achievements/*` 0/5. Weekly-challenge/reward-price-override mechanic has zero representation. |
| 16 | Fraud, Risk, and Compliance Engine | ❌ NOT STARTED | No device-fingerprinting, no risk-scoring, no KYC-tiering, no AML monitoring anywhere in the codebase. Single highest-severity gap given the wallet/bonus system is a direct fraud target. |
| 17 | Platform Admin Console | ❌ NOT STARTED | 76/76 files empty — the single largest completely-unstarted block in the entire repository. |
| 18 | Analytics and Reporting Infrastructure | ❌ NOT STARTED | No event-tracking layer, no warehouse, admin `reports/*` are empty stubs with nothing underneath them. |

**Summary: of 18 major products, 0 are fully ✅ DONE end-to-end, 1 (#7 Pricing Engine) is effectively done, 11 are ⚠️ PARTIAL, and 6 are ❌ entirely NOT STARTED.** This is the honest state of the platform as of this integration, and it is what `handover.md`'s task board is built to close.


---

## 3. Wallet, Ledger & Treasury — integrated design (supersedes `product-spec.md` §10 and `full-blueprint.md` §6e)

**Balance types** (unchanged from `product-spec.md`, resolved): Wallet Balance (withdrawable: direct deposits, profit from sales), Bonus Balance (non-withdrawable: activation-fee credit, one-time first-app-deposit bonus in local-currency equivalent — per the product-owner's resolution), Available Balance = Wallet + Bonus (funds cost-of-goods, deducted bonus-first). **This entire bonus/wallet split, and the `withdrawals` table below, apply to Reseller wallets only.** A Customer wallet is a single spendable balance with no withdrawal path at all (resolved 2026-09-06, `product-spec.md` §10) — enforce this as a hard authorization check (`owner_type = reseller` required for any withdraw action/endpoint), not a UI-only restriction.

**Ledger accounts per owner** (adopted from the uploaded document, more rigorous than the original two-column model): `WALLET`, `BONUS`, `HOLD`, `SUSPENSE`, plus this integration's own additions `FEE` (platform-fee account, per `full-blueprint.md`'s pass-through-vs-platform-revenue split) and `FX_CONVERSION`.

**Ledger entry types:** `DEPOSIT`, `WITHDRAWAL`, `ACTIVATION_CREDIT`, `DEPOSIT_BONUS`, `PROMO_BONUS`, `SALE_REVENUE`, `SALE_COST`, `PLATFORM_FEE`, `REFUND`, `REVERSAL`, `FX_CONVERSION`, `PUBLISHING_FEE`, `MAINTENANCE_FEE`, `COUNTRY_UNLOCK_FEE`, `API_FEE`, `REWARD_CREDIT`. Every entry carries `idempotency_key` — no payment, wallet, or telco-fulfillment operation may be processed without one, to prevent duplicate charges/credits on retry.

**Ledger is append-only and immutable.** No entry is ever deleted; corrections are `REVERSAL` entries referencing the original.

**Sale authorization flow (adopted, replaces the looser description in `product-spec.md` §10):**
```
1. Check Reseller available balance
2. Place a HOLD for the base cost (bonus-first, per product-spec.md §10's resolved deduction order)
3. Process Customer payment
4. Fulfill via Telco Provider (§10 below)
5. On success: settle profit to WALLET, release HOLD
6. On failure: reverse the HOLD, refund Customer automatically (product-spec.md §15/full-blueprint.md §6d's checkout-failure case)
```

**Settlement mode — OPEN DECISION carried forward, not resolved by this integration:** the uploaded document proposes two configurable modes — **Mode A (Reimbursement):** Customer payment reimburses the cost portion, only profit becomes withdrawable-relevant; **Mode B (Bonus Consumption):** bonus is consumed as cost-of-sale, profit credited to wallet (this is what `product-spec.md` §10's resolved worked example actually describes and assumes). **This integration adopts Mode B as the specified behavior**, since it matches the product owner's own worked example precisely (bonus depletes first, wallet+profit is what's ultimately withdrawable) — Mode A is recorded here only as an alternative the platform could later expose as a configurable policy, not as active scope.

**Status:** ⚠️ PARTIAL. Two-balance model exists in some form (67% of wallet actions real). Double-entry, HOLD/SUSPENSE accounts, reconciliation, and the FEE/FX_CONVERSION split — all ❌ NOT STARTED.

---

## 4. Consolidated data model (integrates `product-spec.md` §24, `full-blueprint.md` §7, and the uploaded document's field-level schemas — this is now the authoritative schema reference until real migrations exist)

Core identity & merchant tables (uploaded doc's naming adopted where more precise than prior drafts' — `merchants`/`stores` replacing the looser `resellers` table description):

```
users            — id, email, password_hash, pin_hash, first_name, last_name, role, country_code, status, email_verified, phone_verified, created_at, updated_at
devices          — id, user_id, device_fingerprint, device_type, ip_address, country_code, risk_score, last_seen_at, blocked
merchants        — id, owner_user_id, business_name, country_code, default_currency, application_ip, status, activation_completed_at, onboarding_completed_at, created_at
stores           — id, merchant_id, store_name, subdomain, custom_domain, logo, theme, status, storefront_url, settings_json, created_at
store_countries  — id, store_id, country_code, enabled, unlocked_by_payment, fee_paid, created_at
countries        — code, name, currency_code, phone_code, active
currencies       — code, name, symbol, decimal_places, active
networks         — id, country_code, name, short_code, active
```

Catalog & pricing:
```
platform_plans   — id, network_id, name, data_amount, validity, base_price_minor, currency_code, provider_plan_id, status, floor_price_minor, created_at
merchant_plans   — id, merchant_id, platform_plan_id, enabled, markup_type, markup_value_minor, selling_price_minor, override_price_minor, updated_at
```

Wallet & ledger (per §3 above):
```
wallets          — id, owner_type, owner_id, currency_code, wallet_type[WALLET|BONUS|HOLD|SUSPENSE], balance_minor, status, created_at
ledger_entries   — id, wallet_id, amount_minor, direction, entry_type, reference_type, reference_id, balance_after_minor, idempotency_key, metadata, created_at
deposits         — id, user_id, wallet_id, amount_minor, currency_code, payment_method, status, bonus_eligible, bonus_amount_minor, created_at
withdrawals      — id, user_id, wallet_id, amount_minor, currency_code, method, status, approved_by, created_at, processed_at   [RESELLER-ONLY — a Customer's owner_type must be rejected at the authorization layer, not just absent from the UI]
```

Commerce:
```
orders           — id, customer_id, merchant_id, platform_plan_id, country_code, network_id, recipient_phone, quantity, customer_currency, customer_price_minor, merchant_currency, base_cost_minor, status, created_at, updated_at
payments         — id, order_id, user_id, amount_minor, currency_code, payment_provider, status, gateway_reference, created_at
settlements      — id, order_id, merchant_id, gross_amount_minor, fee_amount_minor, net_amount_minor, currency_code, fx_rate, status, created_at
```

API, App, Publishing:
```
api_tokens              — id, merchant_id, customer_id, name, token_hash, scopes, rate_limit, status, last_used_at, expires_at, created_at
app_builds              — id, merchant_id, app_name, package_name, icon_url, splash_url, theme_json, status, version_code, created_at
play_publications       — id, app_build_id, merchant_id, tier, countries_json, publishing_fee_minor, maintenance_plan, status, play_store_url, published_at
maintenance_subscriptions — id, play_publication_id, billing_cycle, amount_minor, currency_code, next_due_date, status, last_paid_at
```

Growth & Ops:
```
notifications    — id, user_id, channel, template_code, payload_json, status, sent_at
campaigns        — id, name, user_segment, trigger_type, content_json, start_date, end_date, active
challenges       — id, merchant_id, challenge_type, target_value, current_value, period_start, period_end, reward_type, reward_value, status
```

New from `full-blueprint.md`'s domain analysis, retained because nothing above covers them: `roles`/`permissions`/`sessions` (§1.1's RBAC), `storefront_provisioning_jobs` (§2's provisioning engine gap), `reconciliation_runs`/`reconciliation_discrepancies`/`withdrawal_holds`/`platform_revenue_ledger` (§3's treasury gap), `fx_rates` (§8's FX gap), `provider_networks`/`provider_health_checks`/`provider_cost_sync_log` (§10's provider-abstraction gap), `risk_flags`/`fraud_rules_config` (§16's fraud gap), `platform_events` (§18's analytics gap).

**Status:** ❌ NOT STARTED as version-controlled migrations — every `supabase/migrations/*.sql` file is 0 bytes (`architecture.md` Known Irregularity, `blueprint.md` P0 #5). This entire schema section is this integration's best current guess at what the live (uncaptured) schema likely resembles, reconciled with what the working code implies exists — **the very first task in `handover.md`'s task board is capturing the real schema and reconciling it against this document**, not building new tables on top of an unverified guess.


---

## 5. API Design (adopted from the uploaded document's endpoint catalog, reconciled against what exists today)

```
Auth:
POST /auth/signup · /auth/login · /auth/logout · /auth/forgot-password
POST /auth/reset-password · /auth/verify-email · /auth/verify-phone · /auth/pin/validate

Merchant Application:
POST /merchant/application · /merchant/activation/pay
GET  /merchant/application/status
POST /merchant/onboarding/{countries,payments,plans,complete}

Storefront:
GET  /storefront/{store_id} · /storefront/{store_id}/plans · /storefront/{store_id}/countries
POST /storefront/order

Merchant Console:
GET/PATCH /console/{dashboard,plans,orders,customers,api-users,wallet}
POST /console/plans/toggle(-all) · /console/api-tokens · /console/wallet/withdraw

Wallet:
GET  /wallet/balance · /wallet/transactions
POST /wallet/deposit/{initiate,complete} · /wallet/withdraw

App Publishing:
POST /app/build · /app/publish · /app/publish/pay · /app/maintenance/pay
GET  /app/build/{id} · /app/publication/{id} · /app/maintenance/status

Public Reseller API (v1-equivalent, country-scoped):
GET  /v1/catalog · /v1/plans · /v1/balance · /v1/orders/{id}
POST /v1/orders · /v1/webhooks
```

**Status cross-reference:** Auth ✅ mostly exists (Layer 1 patterns, reusable). Merchant Application ✅ done. Merchant Onboarding ❌ not started. Storefront read endpoints ⚠️ — Server Actions may already cover this without needing separate REST routes (open question from `blueprint.md` P1 #9, unresolved). Console APIs — largely N/A, Server Actions are the actual mutation surface today, REST duplication only needed if external consumption is required. Wallet ⚠️ 67%. App Publishing ⚠️ partial. **Public Reseller API for Layer 3 ❌ NOT STARTED** — this is the single biggest concrete gap in this section; Layer 2's `/api/v1/*` is the complete, working reference pattern to port.

## 6. Platform Admin Console — modules (adopted from the uploaded document, integrated with `blueprint.md` P0 #2's file-level detail)

| Module | Status |
|---|---|
| 1. User Management (search, freeze, device review, audit) | ❌ NOT STARTED |
| 2. Merchant Management (approve, review onboarding, suspend/activate) | ❌ NOT STARTED — this is `blueprint.md` P0 #2's core |
| 3. Catalog Management (countries/networks/plans/base-prices) | ❌ NOT STARTED as an admin UI (the underlying `src/config/countries/*` data exists, but no admin UI manages it — today it's static code, not admin-editable) |
| 4. Payment Management (deposits/withdrawals/reconciliation/chargebacks) | ❌ NOT STARTED |
| 5. Ledger Management (view entries, reconciliation, reversals) | ❌ NOT STARTED |
| 6. App Publishing Management (review builds, monitor maintenance) | ❌ NOT STARTED |
| 7. Risk Management (fraud alerts, device blocks, bonus abuse) | ❌ NOT STARTED |
| 8. Campaign Management | ❌ NOT STARTED |
| 9. Gamification Management | ❌ NOT STARTED |
| 10. Notifications Management (templates, broadcasts) | ❌ NOT STARTED |

**All 10 admin modules are unstarted** — this is consistent with `blueprint.md` P0 #2's finding that 76/76 admin-panel files are empty, and confirms the admin console is not merely incomplete but entirely absent as working software.

## 7. Security Architecture — RBAC roles (adopted, see §1.1 for status) & controls

**Authentication:** email/password (✅ exists, Layer 1 pattern) + transaction PIN (✅ exists, Layer 1: `createTransactionPinAction`/`verifyTransactionPinAction`) + optional 2FA/biometric (❌ not started) + device binding (❌ not started) + login-anomaly detection (❌ not started, part of §16 Fraud domain).

**Authorization:** role-based access control + tenant isolation. Every tenant-scoped record should carry `merchant_id`/`store_id` and be enforced via Postgres row-level security, not just application-layer checks — **this is a concrete, checkable requirement for whoever eventually captures the real schema (handover task 1, per below): confirm RLS policies exist on every tenant-scoped table, not just that the column exists.**

**Encryption:** TLS in transit (✅ platform-level, Next.js/Vercel-equivalent default), AES-256 at rest for KYC documents specifically (❌ NOT CONFIRMED — Supabase Storage bucket privacy/signed-URL policy needs direct verification, flagged already in `full-blueprint.md` §6q), secret management (❌ plain env vars today, no rotation/vault confirmed), PIN/token hashing (✅ PIN hashing exists per Layer 1; API token hashing ❌ not started since tokens themselves don't exist yet).

**The one confirmed, named security defect carried forward from `architecture.md`:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — read in `lib/supabase/admin.ts`/`server.ts`, server-only today but named unsafely. Still unresolved as of this integration.

**Audit logging:** ❌ NOT STARTED. No immutable audit log exists anywhere for login, password/PIN changes, withdrawals, admin actions, ledger corrections, or plan-price changes — this is a hard requirement for §6's admin console (module 1's "audit" function has nothing to read from) and for §16 Fraud/Compliance.


---

## 8. Technical architecture reconciliation — vision vs. what actually exists

The uploaded document recommends a generic, scale-ready stack (Node/NestJS or FastAPI or Go, Kafka/RabbitMQ, ClickHouse/BigQuery, Kubernetes, Terraform). **This integration explicitly does NOT adopt that stack wholesale** — the platform is already built on Next.js (App Router, Server Actions) + Supabase (Postgres/Auth/Storage) + Firebase + the existing payment/provider integrations, per `architecture.md`, and is functionally working today on that stack for everything in Layers 1 and 2. Replacing the stack is not in scope. What IS adopted from the uploaded document's technical section, translated to the real stack:

- **Event-driven design** (§18 Analytics, §3 Ledger idempotency) — implementable within Supabase via a `platform_events` table + Postgres triggers/Edge Functions, rather than standing up Kafka. A message queue (SQS-equivalent or Supabase's own `pg_cron`/queue extensions) is the pragmatic equivalent of the uploaded document's Kafka/RabbitMQ recommendation, deferred until actual scale requires more than Postgres-native scheduling can handle.
- **Idempotency keys** — directly adoptable today, no infrastructure change needed; every wallet/payment/telco Server Action should accept and check one.
- **Modular monolith** — the uploaded document's own recommendation to "start with a modular monolith, design as if service-oriented" is **already exactly what this Next.js App Router + Server Actions codebase is** — no architectural migration needed, just discipline in keeping domain logic (`src/lib/`) decoupled from route handlers as new domains get built.
- **Scheduled jobs** (maintenance billing, reconciliation, cost-sync, fraud monitoring) — Supabase Edge Functions + `pg_cron`, or Vercel Cron if deployed there, rather than a separate job-orchestration platform. This is `full-blueprint.md` §6r's flagged infrastructure gap — a decision, not a build, and this integration resolves it in favor of staying within the existing Supabase-centric stack rather than introducing new infrastructure.

**Status:** the stack itself is ✅ sound and proven (Layers 1 & 2 work on it in production). What's missing is not stack replacement but the specific NEW infrastructure pieces named throughout this document (scheduled jobs, event log, RLS audit, secrets management) built ON this stack.

## 9. Event catalog (adopted, for whichever event-tracking mechanism §8 lands on)

```
merchant.application.created · merchant.activation.paid
storefront.provisioning.{started,completed}
onboarding.completed
wallet.deposit.completed · wallet.withdrawal.requested
order.{created,paid} · order.fulfillment.{started,succeeded,failed}
app.build.{started,completed} · app.publish.requested
app.maintenance.{due,paid,failed}
campaign.banner.triggered · gamification.challenge.completed
api.token.created
```
**Status:** ❌ NOT STARTED — no event emission exists anywhere; this is the prerequisite for §18's Analytics domain and should be built into every new Server Action as it's written (per §8), not retrofitted later.

## 10. Operational rules — the complete, resolved reference table

This consolidates every numeric/policy rule across all prior documents into one place, with resolution status. Where `product-spec.md` recorded a product-owner resolution, that resolution is final and shown here; where the uploaded document flagged an open decision not yet resolved by the product owner, it's shown as OPEN.

| Rule | Value | Status |
|---|---|---|
| Storefront creation time | 3 hours (SLA, manual-vs-automated still OPEN per `product-spec.md` §1) | OPEN |
| Activation fee | $5 / ₦5,000, credited non-withdrawable | RESOLVED |
| First app-deposit bonus | One-time, first app-channel deposit only, local-currency equivalent of $10 | RESOLVED (`product-spec.md` clarification) |
| Bonus deduction order | Bonus first, then wallet | RESOLVED |
| Profit treatment | Always credited to withdrawable wallet | RESOLVED |
| Plans per page | 10 | RESOLVED |
| Markup type | Fixed or percentage, Reseller's choice | RESOLVED |
| Base price floor | Selling price can never go below platform base price | RESOLVED |
| Default country access | Home country + 2 free selections | RESOLVED |
| Extra country fee | $3 (one-time vs. recurring — OPEN, per `product-spec.md` §11) | PARTIALLY OPEN |
| Play Store publishing tiers | $22 country / $28 region / $35 worldwide | RESOLVED (values) |
| Maintenance fee | Internally inconsistent as drafted ($20/yr vs $3/mo vs $15/6mo don't reconcile) — **still OPEN, needs product-owner correction**, per `product-spec.md` §20 | OPEN — HIGH PRIORITY |
| Maintenance funding source | Wallet balance only, never bonus | RESOLVED |
| Device binding | One account per device, hard block (vs. soft-flag — OPEN per `product-spec.md` §13) | PARTIALLY OPEN |
| Reseller self-purchase | Base price, strikethrough UI | RESOLVED |
| Withdrawal eligibility | Resellers only — Customers can deposit/spend but never withdraw, enforced at the authorization layer | RESOLVED (2026-09-06) |
| Customer currency display | Always local/customer currency | RESOLVED |
| Reseller currency display | Always native/provider-country currency | RESOLVED |
| Password reset | Standard email-link flow (Layer 1 pattern), NO PIN step | RESOLVED (`product-spec.md` clarification — supersedes both the original draft's PIN idea and the uploaded document's OTP suggestion) |
| API access | Reseller-issued tokens to Customers, priced at Reseller's own rates | RESOLVED |
| Campaign banner timing | 3rd app use (session vs. distinct-day — OPEN) | PARTIALLY OPEN |
| Gamification period | Weekly; exact reset day (Mon vs Sun) OPEN | PARTIALLY OPEN |
| Gamification reward duration | Not specified anywhere — OPEN | OPEN |
| Settlement mode | Mode B (Bonus Consumption) — adopted in §3 above | RESOLVED (by this integration) |

---

## Document relationships

- **`architecture.md`** — file-level ground truth, all 3 layers. Still authoritative for "does this specific file exist."
- **`product-spec.md`** — original draft's business rules, product-owner-resolved. Still authoritative for the reasoning behind each resolution.
- **`blueprint.md`** — original Layer-3-only file-gap roadmap. Superseded in scope by this document but retained for its file-level next-actions detail.
- **`full-blueprint.md`** — this session's first full-platform vision pass. Superseded by this document's tighter integration with the uploaded architecture, retained for its edge-case lifecycle analysis (§5 of that document) which this document does not repeat.
- **`master-architecture.md` (this document)** — the current, complete, integrated architecture. Read this first for "what is the whole system supposed to be and what's actually built."
- **`handover.md`** — the task board and session-continuity protocol built FROM every ⚠️/❌ item in this document. Read this second, for "what do I actually do right now."

*End of master-architecture.md.*
