# FULL-BLUEPRINT.md — Complete End-to-End Platform Architecture & Vision

**Scope:** Unlike `blueprint.md` (Layer 3 file-gap roadmap only), this document is the **complete product architecture** — every domain the platform needs to be a real, operable, defensible business, whether or not it was named in the original draft (`product-spec.md`'s source material) or already exists as a scaffolded folder. Where the draft or the existing codebase is silent on something a production fintech/telco-reselling platform genuinely needs (fraud detection, financial reconciliation, provider failover, observability, disaster recovery, security architecture, developer platform, analytics), this document specifies it as if designing the product from a blank page, in the same tone and to the same depth as the parts that were specified — because a real business needs these whether or not anyone thought to write them down first.

**This document does not replace the other three:**
- `architecture.md` — ground truth for what files exist today across all 3 layers.
- `product-spec.md` — the business-rule-level specification for the features named in the original draft, resolved through direct product-owner clarification.
- `blueprint.md` — the Layer-3-only, file-gap-driven build roadmap.
- **`full-blueprint.md` (this document)** — the complete architectural vision, including everything the above three don't yet cover, organized so the eventual phase/task breakdown (still deliberately deferred, per instruction) has a complete map to draw from rather than an incomplete one.

**Status:** vision + architecture only. No file/task breakdown yet — that remains the next explicit step once this is reviewed.

---

## 1. Vision statement

Edges Network is a **multi-country, multi-tenant reselling platform for telecom value** (airtime, data, cable, electricity, exam pins), where any individual can become a Reseller: apply, get verified, configure a branded storefront and (optionally) a published Android app, sell to their own Customers in the Customer's local currency regardless of which country's plans are being sold, keep the markup as profit, and withdraw earnings — all on top of a shared upstream cost base (Zendit/Accragh/Lizzysub) and shared platform infrastructure (Supabase, Firebase, the payment rails). The platform's job is to make the *hard parts* — multi-currency conversion, KYC/compliance, fraud prevention, app publishing, payouts, and telco integration — invisible to a Reseller who otherwise just wants to run a small telecom-resale business from their phone.

---

## 2. Complete actor model (all layers, unified)

| Actor | Definition | Primary layer |
|---|---|---|
| **Consumer** | Direct end-user of the original single-tenant app — buys for themselves, no reselling. | Layer 1 |
| **Reseller** | Applies, gets verified/approved, configures a storefront, sells to Customers, may publish an app, withdraws profit. | Layer 2 (reference) / Layer 3 (active) |
| **Customer** | Buys from a specific Reseller's storefront/app, in their own local currency. | Layer 2 / Layer 3 |
| **API Customer** | A Customer integrating programmatically via a Reseller-issued token. | Layer 3 |
| **Country Admin** | Reviews/approves Applications and Verifications, manages Resellers, configures country-level settings, within one country's scope. | Layer 3 (new) |
| **Platform Admin / Super Admin** (NEW — not named in the draft, but required) | Operates across all countries: manages Country Admins themselves, sets platform-wide policy (fee structures, supported countries, provider contracts), views cross-country financial/risk dashboards, handles escalations Country Admins can't resolve alone. Without this role, there is no one who can onboard a new country or a new Country Admin, and no single view of platform-wide financial exposure. |
| **Compliance Officer** (NEW) | A specialized read-mostly role over KYC/AML data, audit logs, and suspicious-activity flags — distinct from Country Admin's day-to-day approve/reject workflow, because compliance review and operational approval are different responsibilities with different audit requirements in most telecom/financial-services regulatory regimes. |
| **Support Agent** (NEW) | Handles Customer/Reseller support tickets (Section domain "Support"), scoped to read (not write) most financial/verification data, with escalation paths to Country Admin for anything requiring a business decision. |
| **Telco/Upstream Provider** | Zendit, Accragh, Lizzysub (and any future provider) — the actual source of airtime/data/electricity fulfillment and its true cost. Not a platform actor exactly, but modeled as one because provider health/availability materially affects every other actor's experience. |

---

## 3. High-level system architecture (layered view)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                        │
│  Web storefront (Next.js SSR) · Reseller Console (Next.js) ·         │
│  Country Admin panel (Next.js) · White-label Android apps (per       │
│  Reseller, built via CI pipeline) · Public API consumers             │
├─────────────────────────────────────────────────────────────────────┤
│  EDGE / ROUTING LAYER                                                 │
│  src/proxy.ts — country detection, locale/currency default routing   │
│  CDN / static asset delivery · rate limiting (NEW, see §6q)          │
├─────────────────────────────────────────────────────────────────────┤
│  APPLICATION LAYER (Next.js App Router: pages + Server Actions + API) │
│  Route groups per actor (storefront, dashboard, admin) ·              │
│  Server Actions as the primary mutation surface · REST API for        │
│  external/mobile/API-Customer consumption                            │
├─────────────────────────────────────────────────────────────────────┤
│  DOMAIN / BUSINESS-LOGIC LAYER (src/lib/, src/actions/)               │
│  Pricing engine · Wallet/ledger engine · Verification rules ·         │
│  Publishing pipeline · Notification templating · AI assistant ·      │
│  Fraud/risk scoring (NEW) · Provider abstraction (NEW)                │
├─────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                          │
│  Supabase Postgres (relational, RLS-enforced) · Supabase Storage      │
│  (documents/images) · Analytics warehouse (NEW, see §6o)              │
├─────────────────────────────────────────────────────────────────────┤
│  INTEGRATION LAYER                                                    │
│  Zendit/Accragh/Lizzysub (VTU fulfillment) · Flutterwave/Korapay/     │
│  Xixapay/Payvessel (payments) · Firebase (push) · Brevo/Resend        │
│  (email) · GitHub Actions/Octokit (Android build) · Google Play       │
│  Developer API (publishing) · FX-rate provider (NEW, see §6f)         │
├─────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER (NEW — largely unaddressed today, see §6r)      │
│  Environments (dev/staging/prod) · CI/CD · Secrets management ·       │
│  Monitoring/alerting · Backup/disaster-recovery · Scheduled jobs      │
└─────────────────────────────────────────────────────────────────────┘
```


---

## 4. The complete economic loop

```
Telco/Provider (true cost) → Platform (base price, currency-normalized)
   → Reseller (sets markup) → Customer (pays local-currency selling price)
   → Reseller's wallet credited profit → Reseller withdraws to bank
   ↑                                                              │
   └──── Platform's own margin (activation fees, publishing fees, ─┘
          maintenance fees, additional-country fees) never flows
          back out — this is the platform's own revenue layer.
```

Two money flows exist and must be modeled distinctly in the ledger (§6e): (1) **pass-through commerce flow** (Customer pays → Reseller earns markup → Reseller withdraws — the platform is a matching/settlement layer, not a party to this margin), and (2) **platform revenue flow** (activation fees, publishing tier fees, maintenance fees, additional-country fees — money the platform itself earns, distinct from anything a Reseller could withdraw). Conflating these two flows in one ledger schema is the single most likely source of future accounting bugs — they must be separate ledger "books," not just separate transaction types within one book.

## 5. Complete lifecycle map — every actor, including edge cases the draft never specified

### 5.1 Reseller lifecycle (happy path, per `product-spec.md` §1, resolved)
```
Apply → Activation fee paid → Verification (KYC) → Country Admin approval
   → Onboarding (country/payment/plans) → Storefront generated (3h SLA)
   → Console access → Live selling → [optional] Publish to Play Store
   → Ongoing: sales, payouts, maintenance billing, country expansion
```

### 5.2 Reseller lifecycle — edge cases (NOT in the original draft, but required for a real system)
- **Rejection & re-application:** an applicant rejected at Verification or Admin-approval must have a defined path — permanent ban, cooldown-then-retry, or immediate retry with corrected documents? (Ties to Section 2's Compliance Officer role — rejections for compliance reasons likely need a different re-application policy than rejections for incomplete documents.)
- **Suspension (post-launch):** a live Reseller found in violation (fraud signal, chargeback pattern, complaint volume, non-payment of maintenance fees per `product-spec.md` §20) must have their storefront and app suspended, not just flagged — this needs a defined state machine (`live → suspended → [reinstated | terminated]`), and suspension must cascade correctly through the app-distribution system (§6h) so a suspended Reseller's Android app actually stops functioning, not just shows a warning.
- **Voluntary offboarding/churn:** a Reseller who wants to close their store — what happens to their Customers' wallet balances, their own withdrawable wallet balance, and their published app? Needs an explicit offboarding action, not silent account deletion.
- **Country expansion beyond the initial 2 (`product-spec.md` §11):** already specified at the business-rule level; this document adds that the $3 additional-country fee purchase flow needs its own mini-lifecycle (request → pay → country unlocked → plans for that country appear in Onboarding-equivalent settings) rather than being a one-off toggle.
- **Reseller death/incapacitation/account-recovery:** no mechanism specified anywhere for transferring ownership of a storefront (e.g., a family member needing access after a Reseller becomes unreachable). Flagged as a real-world scenario a payments-adjacent business will eventually face, even if it's low-priority to build early.

### 5.3 Customer lifecycle
```
Anonymous browse → click Buy → sign-up/sign-in modal → transaction PIN setup
   → country-conditional payment method setup → purchase → [repeat]
   → [optional] request API token from Reseller
```
**Edge cases:** a Customer's *dispute/refund* path is entirely unspecified in the draft — if a Customer's data/airtime purchase fails after payment is deducted (upstream provider timeout/failure), there must be an automatic reversal-to-wallet mechanism, not a manual support ticket as the only recourse (though Support, §6l, is also a valid escalation path for anything the automatic reversal can't resolve). A Customer switching which Reseller's storefront they habitually use — does their wallet balance, transaction PIN, and payment-method setup carry over (since these are Customer-owned, not Reseller-owned, per the actor model in Section 2), or does each Reseller relationship require fresh Customer onboarding? This document assumes **Customer identity and wallet are platform-owned and portable across any Reseller's storefront** (a Customer signs up once, can then buy from any Reseller they visit) rather than re-onboarding per store — confirm this assumption explicitly, since the alternative (per-store Customer accounts) is a materially different, far more fragmented data model.

### 5.4 Admin/governance lifecycle (Country Admin, Compliance Officer, Platform Admin — all from Section 2)
```
Platform Admin onboards a new country → configures country settings (currency,
   supported networks, KYC requirements, pricing floors) → invites/creates
   Country Admin(s) for that country → Country Admins review the Application
   queue → approve/reject → ongoing reseller management, reporting, escalation
   to Platform Admin for anything cross-country or policy-level
```
This entire flow — a new country being onboarded onto the platform at all — has **no owner anywhere in the current scaffold or draft**. `src/config/countries/*` (24 countries, fully implemented per `architecture.md`) covers the *static configuration* of a country once it exists, but nothing models the *process* of adding country #25, or the permission model for who's allowed to do that. This is a genuine, previously-unspecified gap this document is surfacing.

### 5.5 Provider/telco lifecycle (NEW)
```
Provider integrated (Zendit/Accragh/Lizzysub) → cost catalog synced → provider
   health monitored → [on outage/degradation] automatic failover to a healthy
   provider for affected networks → cost changes propagate to base prices →
   base-price change respects the floor-price rule (product-spec.md §12) for
   every Reseller's already-configured markup
```
Nothing in the current codebase or draft addresses what happens when an upstream provider's cost changes, or goes down entirely — this is Section 6g below.


---

## 6. Domain-by-domain architecture

Each domain below states: **purpose**, **subsystems**, **data owned**, **integration points**, and **status** (existing/scaffolded vs. genuinely new — cross-referenced to `blueprint.md`/`product-spec.md` item numbers where one exists).

### 6a. Identity & Access
**Purpose:** Authenticate and authorize every actor in Section 2, across every surface.
**Subsystems:** Reseller auth (`/apply` + sign-in, unchanged per `product-spec.md` §6), Customer auth (buy-triggered modal, `product-spec.md` §16), Admin auth (Country Admin, Compliance Officer, Support Agent, Platform Admin — all NEW, no equivalent anywhere today), API token auth (`product-spec.md` §19), session management, device trust (`product-spec.md` §13's fingerprinting, reframed here as a general Identity concern rather than only an Application-stage check — a device fingerprint is also useful for detecting session hijacking on every login, not just blocking duplicate Applications).
**Data owned:** `users` (or however Supabase Auth's own table is extended), `roles`/`permissions` (NEW — a real RBAC table is required the moment more than one Admin role exists; `src/lib/admin/permissions.ts`, currently empty per `architecture.md`, is the right home but its scope needs to expand from "Reseller vs Country-Admin" to the full role set in Section 2), `devices`, `sessions`.
**Integration points:** Supabase Auth (existing), FCM device tokens (existing, Layer 1).
**Status:** Reseller/Customer auth = mostly specified (`product-spec.md`). Admin RBAC beyond a single flat "admin" role = entirely NEW, not represented in `blueprint.md`'s P0 #2 admin-panel item, which currently only implies one undifferentiated admin type.

### 6b. Application, Verification & Admin Governance
**Purpose:** Already fully specified in `blueprint.md` P0 #1/#2 and `product-spec.md` §1/§7/§8. This entry exists only to note the extension: Country Admin vs. Compliance Officer vs. Platform Admin (Section 2) means the single "admin panel" scaffolded today needs a **role-scoped view model**, not one undifferentiated admin UI — e.g. a Compliance Officer sees KYC documents and audit logs but not a country's pricing-floor settings; a Platform Admin sees cross-country dashboards a Country Admin never should.
**Status:** See `blueprint.md` P0 #2 for the file-level detail; this domain entry's only addition is the RBAC extension from 6a.

### 6c. Onboarding & Storefront Provisioning
**Purpose:** Already specified in `product-spec.md` §1/§7/§8. New addition here: the storefront-generation job (flagged in `product-spec.md` §1 as having no representation anywhere in the current scaffold) needs an explicit **provisioning state machine** — `queued → generating(dns|assets|records) → ready → failed(with retry)` — surfaced to the Reseller as real-time status (ties into 6j Notifications and 6o Observability, since a failed provisioning job that no one is alerted to is a silent Reseller-facing failure).
**Data owned:** `storefront_provisioning_jobs` (NEW table — status, started_at, completed_at, failure_reason, retry_count).
**Status:** NEW infrastructure requirement, not currently represented in `blueprint.md`.

### 6d. Storefront & Commerce
**Purpose:** Already specified in `product-spec.md` §14/§15/§17 (plan display, currency conversion, self-purchase). New addition: a **cart/checkout abstraction** — the draft describes single-item purchases ("select plan, enter number, buy") throughout, but a real storefront should support at minimum a confirmation step showing final converted price before payment fires (partially implied by the existing `PurchaseModal.tsx` pattern in Layer 1, reusable here), and should define what happens on a **partial failure** (payment succeeds, upstream fulfillment fails — see 5.3's Customer dispute edge case, which is really owned by this domain's checkout logic plus 6g's provider abstraction, not Support alone).
**Status:** Storefront UI shells exist (`architecture.md`: 93-100% file-complete); checkout-failure-reversal logic is NEW and unconfirmed to exist.

### 6e. Wallet, Ledger & Treasury — the financial core, expanded
**Purpose:** `product-spec.md` §10 fully specifies the bonus/wallet balance split and deduction order. This domain expands that into what a real financial system needs beyond the two-balance model:
- **Double-entry bookkeeping**, not just a debit/credit log — every ledger entry should have a matching offsetting entry (e.g., a sale's cost-of-goods debit from a Reseller's balance should have an offsetting credit somewhere representing the platform's or provider's receivable), so the books are always self-balancing and auditable by a real accountant, not just internally consistent from the app's point of view.
- **Reconciliation** (NEW, entirely unaddressed anywhere): a scheduled job comparing the platform's internal ledger totals against (a) actual payment-gateway settlement reports (Flutterwave/Korapay/Xixapay/Payvessel) and (b) actual upstream-provider invoicing (Zendit/Accragh/Lizzysub), flagging discrepancies. Without this, the platform has no way to detect a payment-gateway webhook that silently failed, or a provider that under/over-charged relative to what was actually fulfilled.
- **Treasury / multi-currency exposure:** the platform itself holds funds across many currencies (every Customer payment, every Reseller balance) — someone needs to model the platform's own FX exposure and settlement currency, distinct from the per-Reseller/per-Customer local-currency display logic in `product-spec.md` §15.
- **Payout compliance:** withdrawal-to-bank (`product-spec.md`'s reference to Layer 2's `withdrawFunds.ts`) at scale needs AML transaction-monitoring thresholds (e.g., flag/hold unusually large or frequent withdrawals for Compliance Officer review) — not just a bank-account-verification step.
**Data owned:** `wallets`, `wallet_ledger` (per `product-spec.md` §24), plus NEW: `reconciliation_runs`, `reconciliation_discrepancies`, `withdrawal_holds` (AML flags), `platform_revenue_ledger` (the separate "book" from Section 4's economic-loop split).
**Status:** Two-balance model = specified, partially built (`blueprint.md` P1 #8). Reconciliation, treasury modeling, AML withdrawal monitoring = entirely NEW.


### 6f. Pricing & Markup Engine
**Purpose:** Fully specified in `product-spec.md` §12 (mostly built already, `src/lib/pricing/calculatePrice.ts`). One addition: an **FX-rate service** is implied but never made concrete anywhere in the draft or existing code — `product-spec.md` §15 and §9 both depend on one existing, and this document treats it as its own subsystem rather than an assumption buried in two other sections: a rates table (`fx_rates`: from_currency, to_currency, rate, source, effective_at), refreshed on a schedule from either a paid FX-rate API or admin-configured static rates (product-owner decision flagged already in `product-spec.md` §15's Open Questions — unresolved as of this writing), consumed identically by the storefront's display-conversion logic, the deposit-bonus crediting logic, and (new, see 6e) treasury exposure reporting — one source of truth, three consumers.
**Status:** Markup engine = built. FX-rate service = NEW, currently a gap silently assumed away in two different sections of `product-spec.md`.

### 6g. Telco/Provider Integration Layer (NEW)
**Purpose:** Zendit, Accragh, and Lizzysub (`src/lib/providers/*`, Layer 1, fully implemented) are each called directly today wherever fulfillment happens. At multi-country, multi-provider scale, this needs to become a genuine abstraction layer, not three independently-called SDKs:
- **Provider routing:** which provider fulfills which network/country combination, and what happens when more than one provider *could* fulfill the same request (redundancy) — currently there's no evidence this routing logic exists at all; the current three providers may simply each own a disjoint set of networks with no overlap, in which case routing is trivial, but this must be confirmed rather than assumed.
- **Health monitoring & automatic failover:** if a provider's API starts failing/timing out, purchases against that provider's networks should either queue-and-retry or fail gracefully with a clear Customer-facing message — not surface a raw upstream error. Requires a lightweight circuit-breaker pattern per provider.
- **Cost-catalog sync:** providers change their own costs; the platform's "base price" (the floor Resellers can never markup-below, per `product-spec.md` §12) must stay in sync with actual provider cost, on some cadence, with a defined process for what happens to already-configured Reseller markups when a base price moves (does markup as a fixed amount stay fixed while the effective price shifts, or does percentage-based markup reprice automatically while fixed-amount markup needs manual Reseller re-confirmation? — genuinely unspecified, flagged here as a real decision needed before this subsystem can be built).
**Data owned:** `provider_networks` (which provider serves which network/country), `provider_health_checks`, `provider_cost_sync_log`.
**Status:** Entirely NEW as an abstraction layer — the three provider SDKs exist and work today (Layer 1), but nothing routes/monitors/fails-over between them at the level described here, and nothing has been confirmed to sync costs automatically vs. manually.

### 6h. Publishing & Mobile App Distribution
**Purpose:** `product-spec.md` §20 and `blueprint.md` P1 #7 already specify the tiered Play Store publishing model (fees, maintenance billing, suspension-on-nonpayment) and flag the `build/` vs `publishing/` namespace duplication needing reconciliation. This domain adds the operational infrastructure around that:
- **White-label build templating:** every Reseller's Android app is presumably the same codebase with per-Reseller branding/config injected at build time (name, icon, colors, storefront API endpoint) — this "app template" itself isn't described anywhere as a distinct artifact; it should be, since every future Android-app feature (push notifications, deep links, in-app purchase flows) has to be built once into this shared template, not per-Reseller.
- **Versioning & OTA updates:** when the shared app template gets a new feature/bugfix, do all previously-published Reseller apps need a full rebuild-and-republish (slow, per-Reseller Play Store review cycles), or does the architecture support some form of over-the-air update for at least the JS/config layer (e.g., a React Native or Capacitor-style shell where business logic loads remotely)? This is a foundational technology decision this document flags but does not make — it determines whether "publish an update" is a per-Reseller manual action or a platform-wide push, with very different operational cost at scale (hundreds of Resellers × Play Store review times if it's the former).
- **Build-pipeline capacity & queueing:** at scale, many Resellers requesting builds/publishes simultaneously need a real queue with capacity limits, not the naive one-at-a-time trigger pattern Layer 2's reference implementation uses.
**Data owned:** `app_builds` (existing, per `blueprint.md`), NEW: `app_template_versions`, `app_ota_deployments` (if OTA is chosen).
**Status:** Trigger/build mechanics = partially built. Templating-as-a-first-class-artifact, versioning/OTA strategy, and build-queue capacity planning = entirely NEW, and the OTA-vs-full-rebuild decision is architecturally significant enough to resolve early rather than let default implementation choices decide it implicitly.


### 6i. API & Developer Platform
**Purpose:** `product-spec.md` §19 specifies Reseller-issued Customer API tokens. This domain broadens that into a proper developer platform, since Layer 2's already-working `/api/v1/*` (OpenAPI-documented, per `architecture.md`) proves the pattern is viable and worth generalizing rather than re-limiting to only the narrow Customer-token use case: rate limiting per token (protects both the platform and other tenants from one runaway integration), webhook delivery with retry/backoff and a signing-secret verification scheme (partially present in Layer 2's `/api/v1/webhooks/*`), and a versioning policy for the API itself (what happens when `/api/v2` is eventually needed — Layer 2's `v1` naming already implies this was anticipated once, just never revisited).
**Data owned:** `api_tokens` (per `product-spec.md` §24), NEW: `api_rate_limits`, `webhook_delivery_log`.
**Status:** Barely started per `blueprint.md` P1 #9. Rate limiting and webhook reliability are NEW considerations beyond what `product-spec.md` §19 specified.

### 6j. Notifications & Messaging
**Purpose:** `product-spec.md` §21 and `blueprint.md` P1 #10 already specify push/in-app notifications with API-vs-normal-Customer segmentation. This domain adds: a **template/localization system** (every notification needs copy in at minimum the languages `src/messages/*` already scaffolds — 5 languages per `architecture.md` — meaning notification templates can't be hardcoded English strings, they need the same i18n treatment as the rest of the UI, which is a real added scope beyond "build the notification actions"), and a **delivery-channel fallback policy** (if push fails/is disabled, does the platform fall back to email or SMS for anything time-sensitive, e.g. a maintenance-fee-due warning per `product-spec.md` §20? Not specified anywhere, worth deciding given the direct revenue consequence of a Reseller never finding out their app is about to be suspended).
**Status:** Core notification system = NOT STARTED (`blueprint.md` P1 #10). Localization-of-templates and channel-fallback policy = NEW considerations layered on top of that same gap, not separate work, but should inform how it's built rather than being retrofitted after.

### 6k. Marketing, Growth & Gamification
**Purpose:** Fully specified in `product-spec.md` §22/§23 (campaign banners, weekly transaction challenge) and `blueprint.md` P2 #13/P3 #17 (marketing tools, achievements). No architectural additions beyond what those documents already cover, other than noting: the gamification reward mechanic (§23's temporary base-price override) is really a **Pricing Engine (6f) feature with a Marketing-domain trigger**, not a self-contained Marketing subsystem — its implementation should live where base-price overrides are already modeled (6f/6g), with Marketing only owning the trigger-detection and UI.

### 6l. Support & Ticketing
**Purpose:** Fully specified as a gap in `blueprint.md` P2 #16. This domain adds: a **Support Agent role** (Section 2, NEW) needs read access scoped correctly (a Support Agent resolving a Customer's failed-purchase dispute needs to see that Customer's transaction history but should not need — and per most compliance postures, should NOT have — access to a Reseller's KYC documents or bank withdrawal details), and an **escalation path** from Support Agent → Country Admin → Platform Admin for anything a Support Agent can't resolve at their permission tier (ties directly to 6a's RBAC model).
**Status:** NOT STARTED, same as `blueprint.md` already records; RBAC-scoping requirement is this document's addition.

### 6m. Legal & Compliance
**Purpose:** `blueprint.md` P2 #14 already flags auto-generated ToS/Privacy/Refund policies and questions whether this should be P0/P1 given regulatory requirements. This domain adds the broader compliance surface a multi-country financial-adjacent platform needs regardless of the document-generation feature's own priority: **AML/KYC policy varies by country** (already implied by `product-spec.md`'s per-country `KYCRequirements`, `blueprint.md` P0 #1), **data-protection/privacy-law variance by country** (GDPR-equivalent regimes exist or are emerging in several of the 24 configured countries — Nigeria's NDPR, for instance — and a platform handling ID documents and financial data across two dozen jurisdictions needs a compliance owner for this, not just a generated Privacy Policy document per storefront), and **telecom-regulator licensing** (in many countries, reselling airtime/data at scale may itself require a license or registration with the telecom regulator, independent of anything this platform's own KYC does for its Resellers) — this last point is a business/legal question, not an engineering one, but it belongs in this architecture document because it may gate which countries can legally launch at all, regardless of how ready the software is.
**Status:** Document-generation = NOT STARTED (`blueprint.md` P2 #14). Broader per-country regulatory-compliance ownership = NEW, and partially outside engineering's remit entirely — flagged for the product owner/legal counsel, not a code gap.


### 6n. Fraud & Risk (entirely NEW — no equivalent anywhere in the draft, `architecture.md`, or `blueprint.md`)
**Purpose:** `product-spec.md` §13 specifies one fraud control (device fingerprinting at Application) as a business rule, but a platform moving real money through wallets, bonuses, and payouts needs a broader risk posture than one rule:
- **Velocity/anomaly checks:** unusual patterns (a single device applying repeatedly despite §13's block — attempted evasion via device-fingerprint spoofing is a real and common attack, not a hypothetical; a Reseller's sudden spike in withdrawal requests; a Customer's rapid-fire failed-then-succeeded purchases suggesting card-testing fraud on the payment-gateway side) should raise flags for Compliance Officer review (6a/6m), not be silently allowed or silently blocked without a record.
- **Bonus-abuse detection:** the entire bonus-balance system (`product-spec.md` §9/§10 — activation-fee credit, first-deposit bonus) is a direct financial incentive for exactly the kind of multi-accounting fraud §13's device-fingerprint rule exists to prevent — this domain should treat bonus-abuse detection as an ongoing monitoring concern, not a one-time gate at Application, since fingerprint-spoofing techniques evolve.
- **Chargeback/dispute handling:** when a Customer disputes a card payment with their bank (as opposed to a platform-side refund per 6d's checkout-failure case), the platform needs a defined process — which is a payment-gateway-level concern (Flutterwave/Korapay/etc. all have chargeback webhooks) that nothing in the current codebase appears to consume yet (`architecture.md`'s webhook inventory shows payment-success/deposit webhooks, not chargeback/dispute webhooks specifically — confirm directly with each gateway's webhook event catalog before assuming coverage).
**Data owned:** `risk_flags` (subject_type, subject_id, flag_type, severity, raised_at, resolved_at, resolution), `fraud_rules_config`.
**Status:** Entirely NEW. This is arguably the highest-severity gap in the entire platform vision given how much of the business model (bonuses, wallets, payouts) is a direct fraud target, and it currently has zero representation in any prior document.

### 6o. Data & Analytics (NEW)
**Purpose:** Every Admin-facing "stats"/"reports" feature already scaffolded (`blueprint.md` P0 #2's `admin/reports/*`, `dashboard`'s `StatsCards`/`RevenueChart`) implies an analytics data layer underneath, but nothing describes where that data actually comes from at scale — querying the live transactional Postgres tables directly for every dashboard chart works at small scale and degrades badly as transaction volume grows across 24 countries and many Resellers. This domain specifies: an **event-tracking layer** (structured events — application_submitted, purchase_completed, withdrawal_requested, app_published, etc. — emitted from the actions layer, not inferred after the fact from raw tables), and eventually a **read-optimized analytics store** (a warehouse or at minimum well-indexed materialized views) separate from the operational database, so heavy reporting queries (Platform Admin's cross-country dashboards especially) don't contend with live transactional load.
**Data owned:** `platform_events` (append-only event log), materialized reporting views/warehouse tables (specific shape TBD, but the event log is the prerequisite either way).
**Status:** Entirely NEW. Every "reports"/"stats" scaffold folder across Admin and Dashboard implicitly depends on this existing; none of the prior documents named it as its own subsystem.

### 6p. Internationalization & Localization
**Purpose:** `src/messages/*` (5 languages, per `architecture.md`) and `src/config/countries/*` (24 countries) already provide the mechanical i18n foundation. This domain notes the scope this foundation implies but that isn't yet reflected in any feature-level spec: every new domain above (Notifications' templates, Legal's generated documents, Support's ticket categories, the AI assistant's prompts) needs to route through the same localization system rather than being built English-first and translated later — translation-as-an-afterthought is the most common way i18n scope gets silently dropped from a roadmap, and this document flags it explicitly so it isn't rediscovered late.
**Status:** Foundation exists and is strong (`architecture.md`). Consistent application of it across every new feature domain above is a process discipline, not a missing file — flagged as a cross-cutting concern for whoever eventually reviews each domain's phase/task breakdown.

### 6q. Security Architecture (NEW)
**Purpose:** Beyond the one specific finding already flagged (`architecture.md` Known Irregularities #5, the `NEXT_PUBLIC_`-prefixed service-role key), a platform handling KYC documents, financial data, and bank details across 24 countries needs an explicit security posture: **secrets management** (are provider/payment API keys rotated on a schedule, and where are they stored beyond plain environment variables — worth a real secrets manager rather than `.env` files once a `.env.example` exists per `blueprint.md`'s already-flagged gap), **encryption at rest for KYC documents** specifically (uploaded ID documents in Supabase Storage — is the bucket private with signed-URL access only, or is anything publicly readable by URL guessing?), **rate limiting** at the API/edge layer (referenced already in 6i for the developer platform specifically, but this applies equally to the Application form itself — an unthrottled `/apply` endpoint is an easy target for automated bulk-application abuse, compounding the fraud concern in 6n), and a **periodic security review/penetration-testing cadence** once the platform handles real payout volume.
**Status:** Entirely NEW as a named discipline, though the one concrete finding under it (the service-role key naming issue) is already tracked in `architecture.md`/`blueprint.md`.

### 6r. Infrastructure & DevOps (NEW)
**Purpose:** Nothing in any prior document describes environments, deployment, or operational tooling — `architecture.md`'s methodology audited the *application code*, not the *infrastructure it runs on*. This domain names what's missing: **environment strategy** (is there a staging environment distinct from production, and does it have its own Supabase project/payment-gateway sandbox credentials, given the `APP2_SUPABASE_*`/`APP3_SUPABASE_*` env vars `architecture.md` flagged as unexplained — these may already BE a staging/multi-environment setup, and should be confirmed as such rather than left as an open question indefinitely), **CI/CD** (beyond the Android-app build pipeline already covered in 6h, is there any automated testing/deployment pipeline for the Next.js application itself — no test files of any kind were found anywhere in the `architecture.md` file audit, meaning **there is currently no automated test coverage for any part of this platform**, which is a severe gap for a payments-adjacent system regardless of how any individual feature domain above gets prioritized), **scheduled-job infrastructure** (referenced as a dependency by 6e's reconciliation job, 6h's maintenance-fee billing job, 6n's ongoing fraud monitoring, and `product-spec.md` §20's maintenance-billing cron — currently no scheduled-job mechanism of any kind is confirmed to exist in the stack), and **backup/disaster-recovery** (given `blueprint.md` P0 #5 already establishes that the database schema itself isn't even version-controlled, the natural next question — is the *data* backed up on any schedule, and has restoration ever been tested — is equally unanswered and arguably more urgent).
**Status:** Entirely NEW, and this document's own assessment is that **the complete absence of automated tests and the complete absence of a documented backup/DR policy are, together with `architecture.md`'s already-flagged schema-versioning gap and this document's own fraud/risk gap (6n), the four highest-severity findings across the whole platform vision** — none of them block any single feature from being built, but all four compound the risk of every other feature being built on an increasingly fragile foundation.


---

## 7. Consolidated data model (full platform, superseding `product-spec.md` §24's Layer-3-only list)

| Table | Domain | New in this document? |
|---|---|---|
| `applications`, `devices`, `resellers`, `reseller_countries`, `reseller_plan_settings`, `wallets`, `wallet_ledger`, `api_tokens`, `publishing_subscriptions`, `campaign_banner_impressions`, `gamification_weekly_stats`, `transactions` | Core (per `product-spec.md` §24) | No — carried over |
| `roles`, `permissions`, `sessions` | Identity & Access (6a) | Yes |
| `storefront_provisioning_jobs` | Onboarding (6c) | Yes |
| `reconciliation_runs`, `reconciliation_discrepancies`, `withdrawal_holds`, `platform_revenue_ledger` | Wallet/Ledger/Treasury (6e) | Yes |
| `fx_rates` | Pricing (6f) | Yes |
| `provider_networks`, `provider_health_checks`, `provider_cost_sync_log` | Provider Integration (6g) | Yes |
| `app_template_versions`, `app_ota_deployments` | Publishing (6h) | Yes |
| `api_rate_limits`, `webhook_delivery_log` | API Platform (6i) | Yes |
| `risk_flags`, `fraud_rules_config` | Fraud & Risk (6n) | Yes |
| `platform_events` | Data & Analytics (6o) | Yes |

## 8. Full priority roadmap — integrating `blueprint.md`'s Layer-3 file-gaps with this document's platform-wide domains

This is NOT a task breakdown (still deliberately deferred) — it is priority-tier placement only, at the same P0–P3 granularity `blueprint.md` already uses, so the two documents share one consistent priority language.

**P0 — foundation risk, do before/alongside any feature work:**
- Database schema capture (`blueprint.md` #5) — unchanged, still first.
- Automated testing infrastructure (6r) — NEW P0. Building any of the financial features below (wallet split, reconciliation, payouts) with zero test coverage compounds risk with every subsequent feature.
- Backup/disaster-recovery policy (6r) — NEW P0, pairs directly with the schema-capture item.
- Fraud & Risk baseline — at minimum device-fingerprint enforcement (`product-spec.md` §13, already P0-adjacent) plus a `risk_flags` table ready to receive flags from every other domain as they're built (6n) — NEW P0, because retrofitting fraud-flagging into an already-built wallet/bonus system is harder than building the table now and wiring flags in as each feature lands.
- Identity & Access RBAC model (6a) — NEW P0, since `blueprint.md` P0 #2's admin panel and this document's Country Admin/Compliance Officer/Platform Admin/Support Agent split (Section 2) both depend on it existing first.
- Verification/KYC, Admin panel, Launch wizard, Onboarding+status, `.env.example`/security-key fix — unchanged from `blueprint.md` #1–#4, #11.

**P1 — usable v1 launch:**
- Everything already in `blueprint.md` P1 (#6–#11), unchanged.
- Provider Integration Layer, at minimum health-monitoring + graceful failure messaging (6g) — NEW P1; launching without this means any single provider outage is a raw, unhandled failure for every Reseller selling that provider's networks.
- FX-rate service (6f) — NEW P1, since `product-spec.md` §9 and §15 both silently depend on it and neither can ship correctly without it existing first.
- Wallet reconciliation baseline (6e) — NEW P1; a wallet system handling real payouts without any reconciliation check is a live risk from day one of launch, not a later hardening pass.

**P2 — differentiating features, matches `blueprint.md` P2 (#12–#16) plus:**
- Data & Analytics event-tracking layer (6o) — NEW P2; every P0/P1 admin "stats"/"reports" screen is easier and more correct to build against a real event log from the start rather than retrofitting one under live reporting screens later, so this should land early within P2 even though it isn't launch-blocking.
- Security architecture hardening — secrets management, KYC-document encryption/access audit (6q) — NEW P2, elevated from what might otherwise be considered P3 "polish" given the KYC-document sensitivity established in P0's Verification work.
- Legal & Compliance document generation (`blueprint.md` P2 #14) — unchanged priority marker, but this document reiterates the flag that per-country regulatory licensing (6m) is a business/legal question that should be resolved in parallel, independent of engineering priority.

**P3 — nice-to-have, matches `blueprint.md` P3 (#17–#21) plus:**
- Mobile app OTA-update strategy (6h) — NEW P3 as a strategic decision to make explicitly (even if implementation is deferred), since building many Reseller apps against the wrong distribution model (manual-rebuild-only) before deciding this could mean redoing publishing-pipeline work later.
- Developer-platform rate limiting/webhook reliability hardening (6i) — NEW P3, reasonable to defer until API usage volume justifies it.

## Document relationships

- **`architecture.md`** — ground truth file inventory, all 3 layers.
- **`product-spec.md`** — business-rule specification for the originally-drafted Layer-3 features, product-owner-resolved.
- **`blueprint.md`** — Layer-3 file-gap roadmap, P0–P3.
- **`full-blueprint.md` (this document)** — the complete platform vision across every domain, including everything the other three don't cover; supersedes none of them, but should be read alongside `blueprint.md` before any phase/task breakdown is done, since several P0/P1 items above don't yet exist in `blueprint.md` at all.
- **`handover.md`** — process/session-continuity source of truth; will need a new entry once phases/tasks are actually broken out, cross-referencing all four documents above.

*End of full-blueprint.md.*
