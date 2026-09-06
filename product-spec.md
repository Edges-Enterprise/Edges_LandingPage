# PRODUCT-SPEC.md — Layer 3 Full Feature Specification (Multi-Country Reseller Platform)

**Scope:** Layer 3 only (`[countryCode]` platform), as defined in `architecture.md` and prioritized in `blueprint.md`.
**Source material:** this document formalizes the raw feature draft "Telcos Govt — Full feature draft" (2026-04-09, transcribed) into a complete, implementation-grade specification, reconciled against the actual current state of the codebase.
**Status of this document:** specification only. Per instruction, this has NOT yet been broken into build phases or tasks — that is a deliberate next step, done separately in `handover.md` once this specification is agreed. Nothing in this document should be read as a sequencing/priority signal; `blueprint.md` already carries the P0–P3 sequencing for what's built vs not, and will be re-derived from this document afterward, not the reverse.

**How this document is organized:** each numbered section is one cohesive subsystem. Every section has four parts: **Business Rule** (the rule as sourced from the draft, disambiguated and formalized), **System Design** (actors, data model, state machine, edge cases the raw draft didn't specify but a working system requires), **Current Implementation Status** (cross-referenced directly to `architecture.md`'s file inventory and `blueprint.md`'s item numbers — what already exists, what's a placeholder, what's entirely new), and **Open Questions** (genuine ambiguities or internal inconsistencies found in the source draft that need a product-owner decision before this can be built — flagged rather than silently resolved).

---

## 0. Actor model

The draft uses "reseller," "owner," and "user" interchangeably for the same role. This document standardizes on one term per actor to keep the spec unambiguous:

| Standardized term | Draft's terms | Definition |
|---|---|---|
| **Reseller** | "reseller/owner/user" | The person who applies, pays the activation fee, configures a storefront, sells to Customers, and may publish an Android app. Exactly one Reseller owns one Storefront. |
| **Customer** | "customer" | An end-buyer who purchases data/airtime from a Reseller's Storefront (web or the Reseller's published Android app). A Customer belongs to exactly one Reseller relationship at a time per Storefront visited, but may transact with many different Resellers' storefronts across the platform. |
| **API Customer** | "customer" (API Access section) | A Customer who has been issued an API token by a specific Reseller. Functionally a Customer, but integrates programmatically instead of through the storefront UI, at that Reseller's prices/currency. |
| **Admin** | (implied by "Telcos Govt" framing, not named directly in the draft) | A country-scoped platform operator who reviews Applications, verifies KYC, approves/suspends Resellers. Fully specified already in `blueprint.md` item #2 — this document does not re-specify the Admin panel, only notes where the systems below hand off to it. |
| **Platform/Telco backend** | "telcos" | The upstream data/airtime cost source (Zendit/Accragh/Lizzysub per `architecture.md`) that every "base price" in this document ultimately derives from. |


---

## 1. End-to-end Reseller lifecycle (the spine this entire spec hangs off)

```
APPLICATION  →  ACTIVATION FEE PAYMENT  →  VERIFICATION (KYC)  →  ADMIN APPROVAL
   →  ONBOARDING (country/payment/plan setup)  →  STOREFRONT GENERATION (3h SLA)
   →  CONSOLE ACCESS (as Admin/Reseller/Owner)  →  LIVE STOREFRONT (selling begins)
   →  [optional] PUBLISH TO PLAY STORE  →  ONGOING: sales, payouts, maintenance billing
```

**Business Rule:** Application collects identity + the $5 / ₦5,000 activation fee only. The draft is explicit that **the storefront link must never appear at the Application stage** — it only exists after Onboarding is complete, and is delivered by email at that point. Country of sale, payment method setup, and network/plan selection happen at **Onboarding**, not Application. This is a strict two-stage split: Application = identity + money-in; Onboarding = business configuration.

**System Design:** This maps directly onto the already-scaffolded route structure: `[countryCode]/apply` (Application, ALREADY BUILT), `[countryCode]/verify` (Verification, NOT BUILT), country-scoped Admin review (NOT BUILT), `[countryCode]/onboarding` (NOT BUILT), storefront generation is a backend job (NOT BUILT — no job/queue infrastructure exists yet anywhere in the repo for this), `[countryCode]/launch` appears to be the UI wrapper around Onboarding + Storefront generation (NOT BUILT) and `[countryCode]/dashboard` is the Console (MOSTLY BUILT). The draft's "3 hours for storefront creation" is a hard SLA requirement on whatever generation job is built — this implies an asynchronous job queue (candidate: `src/lib/publishing/build-queue.ts`, currently empty, is the only scaffolded file that looks like it's meant for this, though its name suggests Android-build queuing specifically rather than storefront-record generation; these may need to be two separate queues — see Open Questions).

**Current Implementation Status:** Application = DONE (`blueprint.md` confirms `[countryCode]/apply` and `src/actions/reseller/application/*` are ~50-100% real). Verification = NOT STARTED (`blueprint.md` P0 #1). Admin approval = NOT STARTED (`blueprint.md` P0 #2). Onboarding = NOT STARTED (`blueprint.md` P0 #4, 0/3 files). Storefront generation job = NOT STARTED, no equivalent file exists anywhere in the current scaffold under any name — **this is a net-new requirement this draft surfaces that isn't represented anywhere in the existing file tree and needs to be added to the scaffold**, most naturally as `src/lib/reseller/storefront-generator.ts` (currently `src/lib/reseller/*` is 0/7 files, so this can be added to that empty directory without restructuring). Console/Dashboard = MOSTLY DONE per `architecture.md`'s subsystem table.

**Open Questions:**
- Is storefront generation actually a 3-hour *manual* SLA (someone/some process provisions it and it just needs to happen within 3 hours) or a genuine automated job that takes up to 3 hours to run (DNS propagation, subdomain provisioning, etc.)? This changes the engineering approach entirely (a queue+worker vs. a support-team SLA metric).

**RESOLVED (product-owner decision, 2026-08-29):** The "sign up with email/password" line does NOT describe an alternate Reseller entry point. The currently-built `[countryCode]/apply` flow is confirmed as the one and only Reseller/Owner front door — no rework, no reconsideration, no invited-list/pre-seeded-DB-record flow for Resellers. The "sign up with email and password" pattern described in the raw draft is a Customer-facing mechanic — it belongs to Customers of a Reseller's storefront, not to Reseller onboarding. See Section 6 (rewritten below) and Section 16, which is now the sole owner of this mechanic.


---

## 2. Geolocation & country detection

**Business Rule:** The system must know a user's country from their IP, for both routing (which storefront/plans to show) and defaults (a Reseller's country-of-residence is captured "from the time of application" and never silently changes; a Customer's default country is their current IP but they can switch).

**System Design:** Two distinct uses of geolocation exist and must not be conflated: (a) **Reseller geolocation-at-application** — captured once, persisted, and used forever after as "home country" for currency display of that Reseller's own plans, regardless of where the Reseller physically is later; (b) **Customer geolocation-per-visit** — used live, every visit, purely as the default selected country in the storefront's country switcher, fully overridable per session.

**Current Implementation Status:** DONE, and one of the most solid subsystems in the repo. `src/proxy.ts` (per `architecture.md`) already does live IP-based country detection via `ip-api.com` with a 1-hour cache, validated against `SUPPORTED_COUNTRIES`. This directly satisfies (b). For (a), `src/actions/reseller/application/*` needs to persist whatever `proxy.ts` resolved at the moment of application submission onto the Reseller record permanently — confirm this persistence actually happens (not confirmed in the file-level audit; verify by reading the specific application-submission action before assuming it's covered).

**Open Questions:** None — this is the best-specified, best-built part of the whole draft.

---

## 3. Android app toggle

**Business Rule:** "Include android App toggle always on except user turns it off" — every Reseller gets an Android app provisioned/tracked by default; there is an explicit opt-out toggle, not an opt-in.

**System Design:** A boolean flag on the Reseller record (`android_app_enabled`, default `true`), settable from the Console. Note this is distinct from *publishing* the app to the Play Store (Section 12) — this toggle appears to govern whether an app build exists/is tracked at all in the background (e.g. for the "get your own app" campaign banner logic in Section 14, and for whatever "3 hours" storefront-creation email mentions "status of app if the App is being built" — implying the app build kicks off automatically alongside storefront creation, not only on-demand when the Reseller later chooses to publish).

**Current Implementation Status:** PARTIALLY BUILT. `src/actions/reseller/build/*` (per `architecture.md`, 75% real) already has `triggerAppBuild`, `getBuildStatus`, `getBuildHistory`, `completeBuild` — but nothing currently models an always-on-by-default toggle with an explicit opt-out; the existing build actions appear to assume an on-demand, Reseller-initiated trigger (matching Layer 2's reference pattern, which is fully manual/on-demand). This is a **behavioral change from the existing implementation**, not a net-new feature — flag directly to whoever owns `build/*` before changing its trigger semantics.

**Open Questions:** Does "always on" mean a real Android build kicks off automatically at storefront creation (consuming CI/build-pipeline resources for every single Reseller, even ones who never intend to publish), or does it just mean the *toggle's default state* is on, with the actual build only triggered later at Publish time (Section 12)? These have very different infrastructure-cost implications and must be confirmed before building either the toggle or the automatic-build trigger.


---

## 4. Image upload (custom & pre-built)

**Business Rule:** Resellers can upload a custom logo/branding image, or choose from a pre-built set, during storefront setup.

**System Design:** Two asset sources feeding the same slot: (a) user-uploaded file → `src/lib/storage/document-storage.ts`-equivalent for images (currently the storage lib is 0/3 files per `architecture.md`, all empty — this needs an `image-storage.ts` or a shared storage module handling both KYC documents (Section on Verification, `blueprint.md` P0 #1) and branding images) → Supabase Storage bucket; (b) a curated pre-built gallery, which needs its own asset catalog (not represented anywhere in the current scaffold — net new: a `src/config/logo-templates/` or similar catalog, plus the `api/upload/[countryCode]/logo` route, currently empty per `architecture.md`'s API inventory, and the already-partially-implemented `src/lib/business-generator/logo/generator.ts` / `src/app/[countryCode]/generateIcon.ts` duplicate pair noted as a Known Irregularity — reconciling that duplicate is a prerequisite here, not optional cleanup).

**Current Implementation Status:** NOT STARTED for the storage/upload plumbing (`blueprint.md` P1 #9 flags `api/upload/[countryCode]/*` as a real, non-deferrable P0/P1 dependency already). The icon-*generation* logic (distinct from user *upload*) is the only piece with real code today.

**Open Questions:** Is the pre-built gallery meant to be simple static images, or does it tie into the AI business-generator subsystem (`src/lib/business-generator/*`, `blueprint.md` P2 #12/#13 territory) for on-the-fly branded logo generation? The draft's phrasing ("custom & pre built available") reads as simple asset-picker, not AI-generated, but this should be confirmed given the business-generator scaffold already exists for adjacent purposes.


---

## 5. Storefront-creation status email

**Business Rule:** "Email 1 will be sent after the storefront creation then include in email status of app if the App is being built." One email, sent once storefront creation completes, whose body includes a status line about Android app build progress (tying back to Section 3's always-on toggle).

**System Design:** This is a transactional email, not a marketing one — belongs in the notifications-email pipeline (`src/lib/notifications/*`, per `architecture.md` 0/10 files, entirely unstarted) rather than the campaign-banner system (Section 21). Depends on Section 1's storefront-generation job and Section 3's app-build-trigger both existing, since the email's content is a join of both systems' state at send-time.

**Current Implementation Status:** NOT STARTED. Cross-reference `blueprint.md` P1 #10 (Notifications domain, 0% across UI/actions/lib/constants) — this specific email is one concrete, well-specified instance of that otherwise-abstract gap, and can be used as the first concrete acceptance test once the notifications lib is built.

**Open Questions:** None beyond what Section 1 already raises about the generation job itself.

---

## 6. Sign-up / authentication flow — RESOLVED, split by actor

**Business Rule (as clarified by the product owner, 2026-08-29):** There are two entirely separate sign-up mechanics in this platform, one per actor, and they must not be merged or conflated:

- **Reseller/Owner/User entry point:** the currently-built `[countryCode]/apply` flow, exactly as it exists today. No rework. No invited-list/pre-seeded-email variant. This is confirmed as the one and only way a Reseller enters the platform, and Section 1's lifecycle diagram stands as originally specified (Application → Activation Fee → Verification → Admin Approval → Onboarding → Storefront Live).
- **Customer entry point:** the "sign up with email and password, confirm the new password" mechanic described in the raw draft belongs here, not to Resellers. A Customer visiting a Reseller's storefront, on first purchase attempt, is presented a modal to sign up (email + password, confirmed) or sign in — this is the same mechanic already specified in full in Section 16 (Customer onboarding & authentication), which is now the sole owner of this flow. This section is retained only to record the resolution and point elsewhere; no new design content lives here.

**System Design:** See Section 16 for the full Customer sign-up/sign-in design (buy-triggered modal, transaction PIN setup, country-conditional payment-method setup). See Section 1 for the unchanged Reseller lifecycle. Nothing about `src/app/[countryCode]/sign-in` (Reseller-side, already built per `architecture.md`) needs to change as a result of this clarification — it was never the flow this section originally worried about.

**Current Implementation Status:** Reseller entry (`/apply`) = DONE, no action needed. Customer sign-up/sign-in modal = NOT STARTED — tracked under Section 16 and `blueprint.md`'s Customer-onboarding gap, not as a separate item.

**Open Questions:** None — resolved.


---

## 7. Application stage vs. Onboarding stage — the fee/setup split

**Business Rule:** "Activate Account fee should be in the application stage. set up country of sales, set up payment, set network plan should be in onboarding stage." Restated formally: Application = pay $5/₦5,000 activation fee, nothing else business-configuration-related. Onboarding = (a) choose country/countries of sale, (b) set up payment method(s), (c) select and price network plans.

**System Design:** Two backend-distinct stages with a hard gate between them — a Reseller record should carry an explicit `lifecycle_stage` enum (`applied` → `activation_paid` → `verifying` → `approved` → `onboarding` → `live`) so the UI and any backend job can always answer "is this Reseller allowed into Onboarding yet" without inferring it from scattered flags. This state machine is the backbone every other section (Console banner, storefront generation, publishing eligibility) should read from rather than re-deriving.

**Current Implementation Status:** PARTIALLY DESIGNED. `[countryCode]/apply` (done), `[countryCode]/pending` and `[countryCode]/rejected` (done, per `architecture.md`'s dashboard-adjacent completion table) suggest *some* state machine already exists, but Verification and Admin-approval (both NOT STARTED, `blueprint.md` P0 #1/#2) sit in the middle of this chain and are currently missing entirely — meaning the state machine as currently built likely jumps straight from `applied`/`pending` to a live dashboard with no verification/approval gate enforced yet. Confirm this gap directly in the `pending`/`rejected` page logic before assuming today's "pending" state already accounts for verification.

**Open Questions:** None — the entry-flow ambiguity this used to reference is resolved (see Section 6).

---

## 8. Onboarding stage — detailed tasks

**Business Rule:** Three concrete Onboarding tasks: country-of-sale selection, payment method setup, network/plan setup (with markup). Each is specified in more depth elsewhere in the draft (Sections 11–13 of this document cover country-selection limits and pricing in full) — this section is the checklist/ordering only.

**System Design:** A 3-step (or more, if payment setup has sub-steps per country — see Section 11) wizard. Given `blueprint.md`'s note that the Launch-wizard component library (`src/components/reseller/launch/*`) already scaffolds `BusinessInfoStep`, `StoreConfigStep`, `PricingStep`, `AppConfigStep`, `BrandingStep` as named (but empty) components, **Onboarding and the Launch wizard may be the same feature under two different names in the draft vs. the codebase** — this needs explicit reconciliation before building either, to avoid building two wizards that do the same job.

**Current Implementation Status:** NOT STARTED (`blueprint.md` P0 #4, 0/3 files for `[countryCode]/onboarding`; P0 #3, 0/9 files for `[countryCode]/launch`).

**Open Questions:** Is "Onboarding" (the draft's term) the same feature as "Launch" (the codebase's scaffolded term), or genuinely two distinct steps in sequence (e.g. Onboarding = the 3 tasks above, Launch = a subsequent branding/marketing-asset-generation pass)? Resolve this naming collision explicitly before writing any code against either folder.


---

## 9. First-deposit bonus banner ($10 signup bonus) — RESOLVED

**Business Rule (as clarified by the product owner, 2026-08-29):** The Console/Dashboard shows an interval-based banner prompting new Resellers to deposit from the Android app. The bonus is granted **exactly once per Reseller** — specifically on that Reseller's **first-ever deposit made via the app** (not the first deposit by any channel — a web deposit does not trigger or consume this bonus; only an app-channel deposit does, and only the first one). The credited amount is the **local-currency equivalent of $10**, converted at the time of that first deposit into whatever currency the Reseller's own account operates in (per Section 2's Reseller-currency rule) — not a flat $10 credited identically to every Reseller regardless of country.

**System Design:** Requires: (a) a `first_app_deposit_bonus_claimed_at` (nullable timestamp, not just a boolean — makes "was this already claimed" and "when" both queryable in one column) on the Reseller/Wallet record, set exactly once and never reset; (b) a channel marker (`web` vs `app`) on every deposit transaction, so eligibility can be checked as "is this the first deposit row for this Reseller where channel = app," rather than "is this the first deposit of any kind" — the two are different queries and only the app-scoped one is correct per this clarification; (c) a currency-conversion step at the moment of credit: look up the $10 USD equivalent in the Reseller's local currency (using whichever FX-rate source Section 15 ultimately settles on — this bonus-crediting step and Section 15's storefront currency-display step should share one FX-rate source, not maintain two independently, to avoid the bonus amount and displayed prices drifting against two different rate tables); (d) banner-display logic in the Console reading an interval/dismissal state (distinct system from, but structurally similar to, the storefront-side campaign banners in Section 21 — do not merge their implementations just because both are "banners"; one is a wallet-funnel nudge shown only to unconverted new Resellers, the other is a general awareness ad shown to established Customers/Resellers on a usage-count trigger).

**Current Implementation Status:** NOT STARTED. No banner/prompt component exists in `src/components/reseller/dashboard/*` per `architecture.md`'s inventory (that folder's non-empty files are `StatsCards`, `RevenueChart`, `ActivityFeed`, `QuickActions`— none of which are this). The deposit-channel-marker requirement (web vs app) has no representation anywhere in the current wallet action files (`src/actions/reseller/wallet/*`) and should be added to whatever transaction/ledger schema Section 10 below settles on, rather than bolted on separately later.

**Open Questions:** None — resolved. Scope is confirmed Reseller-only (not Customers), one-time-per-Reseller, app-channel-only, credited at the local-currency equivalent of $10.

---

## 10. Wallet & balance architecture — the financial core of the entire platform

**Business Rule (as stated, verbatim structure):** Every Reseller (and every Customer) has a wallet composed of two distinct ledgers:
- **Bonus balance** — non-withdrawable. Funded by: (a) the activation fee itself ($5/₦5,000, credited back to the user as bonus balance rather than being a pure cost), (b) the first-deposit signup bonus ($10, Section 9).
- **Wallet balance** — withdrawable. Funded by: (a) direct deposits the Reseller makes themselves, (b) profit earned on every sale (the markup portion, specifically — never the base-cost portion).
- **Available balance** = bonus balance + wallet balance. This combined figure is what funds the cost-of-goods (base price) side of every sale a Reseller's store makes.
- **Deduction order on a sale:** bonus balance is drawn down first; only once bonus balance is exhausted does wallet balance get drawn down for the base-cost side of a transaction.
- **Profit credit on a sale:** always lands in wallet balance (withdrawable), regardless of which balance (bonus or wallet) funded that sale's base cost.
- **Withdrawal:** only ever draws from wallet balance. Bonus balance can never be withdrawn, only spent down as cost-of-goods funding.

**Worked example from the draft, formalized:** Reseller has bonus=3000, wallet=1000 → available=4000. They fund ₦400 of base-cost sales (draws from bonus first: bonus 3000→2600, wallet untouched). Profit from those sales credits to wallet balance (wallet 1000→1000+profit). Withdrawable amount = wallet balance only = 1000 + accumulated profit — the 2600 remaining bonus is available balance to keep selling with, but is never withdrawable no matter how large it grows relative to wallet.

**System Design — ledger model:** Two numeric balance columns are insufficient on their own; a **wallet_ledger** (append-only transaction log) is required so every credit/debit is individually attributable and auditable, feeding the two live balance columns as derived/cached totals. Minimum ledger entry types: `activation_fee_credit` (→bonus), `signup_bonus_credit` (→bonus; one row ever per Reseller, amount = local-currency equivalent of $10 at time of that Reseller's first app-channel deposit — see Section 9), `direct_deposit` (→wallet), `sale_debit_bonus` (bonus↓), `sale_debit_wallet` (wallet↓, only fires once bonus is exhausted for that sale), `sale_profit_credit` (→wallet), `withdrawal` (wallet↓), `publishing_fee_debit` (wallet↓, per Section 19 — explicitly NOT bonus, per the draft's own instruction that maintenance is "deducted from the user balance not the bonus balance"), `maintenance_fee_debit` (wallet↓), `additional_country_fee_debit` (wallet↓, per Section 11). A single sale that partially draws from both bonus and wallet must write TWO debit ledger rows (a `sale_debit_bonus` for the portion covered by remaining bonus, and a `sale_debit_wallet` for the remainder) so the ledger stays a true, splittable record rather than one ambiguous "sale_debit" row — this is a design decision this document is making that the draft doesn't specify, flagged here rather than silently assumed in code with no comment.

**Current Implementation Status:** PARTIALLY BUILT, but the split described above is NOT confirmed to exist. `architecture.md` records `src/actions/reseller/wallet/*` as 67% real (`fundWallet`, `getWallet`, `getTransactions`, `withdrawFunds`, `handleSuccessfulDeposit`, `createVirtualAccount` all exist) and `blueprint.md` item #8 already flags `withdrawFunds.ts`'s exported-function list as suspiciously duplicated (`withdrawFunds,withdrawFunds,withdrawFunds`) warranting direct review — **that review must now also specifically check whether a bonus/wallet split exists at all in the current schema/code, or whether today's implementation only has a single undifferentiated balance.** Given `supabase/migrations/*` are entirely empty (per `architecture.md` Known Irregularities), there is currently no version-controlled record of whether a `bonus_balance` column even exists — this needs to be checked directly against the live Supabase schema (per `blueprint.md` P0 #5, database-schema capture) before any of this section can be confirmed as already-built vs. needing to be added.

**Open Questions:**
- Is the activation fee "deposited into the user's balance" literally the same $5/₦5,000 that was just paid (i.e., a wash — the fee funds its own bonus credit, meaning the "fee" is really a mandatory bonus-only top-up rather than a true cost to the platform), or does the platform additionally keep a separate real fee on top? The wording implies the former (self-funding bonus) but this has real revenue-model implications and should be confirmed explicitly, not inferred.

**RESOLVED (product-owner decision, 2026-08-29):** The bonus/wallet split described in this section is confirmed Reseller-only. The $10 first-app-deposit bonus (Section 9) does not extend to Customers — Customer wallets are a separate, simpler concern (funding a purchase, no bonus mechanic) unless a future clarification says otherwise.

**RESOLVED (product-owner decision, 2026-09-06) — Customer wallets have no withdrawal capability at all:** Only Resellers can withdraw. A Customer's wallet is deposit-and-spend only — they can fund it (Section 15/16's deposit flow) and spend it on purchases, but there is no withdraw action, no withdraw UI, and no withdrawal-eligible balance concept for a Customer at all, not even for a Customer's own unused deposited funds. This simplifies the Customer wallet data model relative to the Reseller wallet: a Customer needs exactly one balance (funds available to spend), not a bonus/wallet split, and not a `withdrawals` table relationship — the `withdrawals` table (per `master-architecture.md` §4) is Reseller-only. This also means the three-tier money flow is now fully asymmetric and directional: Customer money moves in one direction only (deposit → spend, funding a Reseller's sale), while Reseller money can flow back out to the Reseller's bank account. Any UI/API surface for "withdraw" must check `owner_type = reseller` and reject outright for `owner_type = customer`, not merely hide the button — this is an authorization rule, not a display preference.


---

## 11. Multi-country selling permissions & additional-country fee

**Business Rule:** Every Reseller can sell their default (home/application) country's plans plus up to 2 other countries of their choosing, for free. Selling in additional countries beyond that costs $3 (per additional country — see Open Questions on recurrence).

**System Design:** A `reseller_countries` join table (reseller_id, country_code, is_default bool, unlocked_via_fee bool, unlocked_at). Enforcement: default country is auto-granted at Onboarding (Section 8); the next 2 country selections are free; any selection beyond 3 total triggers a $3 charge (debited from wallet balance per the same rule as publishing fees in Section 10 — cost-of-doing-business fees come from wallet, not bonus, though the draft doesn't explicitly say this for the country fee specifically; this document is extending that inferred pattern here, flagged as an inference not a stated rule).

**Current Implementation Status:** NOT STARTED as a distinct enforcement layer. `src/config/countries/*` (per `architecture.md`, fully implemented, all 24 countries) provides the *catalog* of what countries exist and their config, but nothing in the current scaffold represents a *per-Reseller* country-access grant/limit — this is a genuinely new data model requirement, most naturally living in `src/actions/reseller/country/*` (currently 0/6 files, entirely empty per `architecture.md`, which fits this purpose exactly by name).

**Open Questions:** Is the $3 additional-country fee a one-time unlock fee or a recurring (monthly/annual) fee like the publishing maintenance fee in Section 19? The draft's phrasing ("you can apply for more countries by paying $3") reads as one-time, but this is exactly the kind of ambiguity that has large revenue-model consequences and should be confirmed explicitly rather than assumed.

---

## 12. Pricing & markup engine

**Business Rule:** For every network plan a Reseller enables, three values exist: **base price** (the telco/platform cost, in that plan's own country currency), **markup** (Reseller-set, either a fixed amount or a percentage — Reseller's choice of structure), **profit** (the derived markup amount in currency terms). A Reseller can edit the base price shown to their own customers **upward only** — never below the original platform-provided base price. This rule applies identically for every country a Reseller sells in (i.e., there is no special-casing per country; the floor-price rule is universal).

**System Design:** `reseller_plan_settings` (reseller_id, plan_id, enabled bool, markup_type enum[`fixed`,`percentage`], markup_value numeric, computed_effective_price numeric — kept as a derived/cached column recalculated on every write for fast storefront reads rather than computed at read-time on every storefront page load). The floor-price constraint (`computed_effective_price >= plan.base_price`) should be enforced at the database layer (a CHECK constraint or a trigger) in addition to the UI/action layer, given how much money moves through this number — UI-only validation is not sufficient for a constraint this financially load-bearing.

**Current Implementation Status:** MOSTLY BUILT. `src/lib/pricing/calculatePrice.ts` (per `architecture.md`, fully implemented) already exports `calculateResellerPrice`, `calculateProfit`, `calculateMarkupPercentage`, `formatNaira`, `calculateWithdrawalFee`, `calculateNetWithdrawal` — this is very likely already the engine described here. `src/actions/reseller/plans/*` is 82% real (9/11 files) per `architecture.md`. What needs direct verification (not confirmed at the file-inventory level of this audit) is specifically whether the floor-price constraint (never below original base price) is actually enforced anywhere in the existing `updatePlan`/`bulkUpdateAllPlans`-equivalent action code, and whether it's enforced at the database level or only in application code.

**Open Questions:** None beyond the direct-verification item above — this is one of the best-specified and apparently best-built sections in the whole draft.

---

## 13. Device fingerprinting — one account per device

**Business Rule:** "User device was used to create the account, so the user cannot use the same device to create another account." A hard 1:1 device→account constraint at Application time, for fraud/abuse prevention (almost certainly aimed at preventing repeat-claiming of the $5/₦5,000-activation-fee bonus credit or the $10 signup bonus described in Sections 9–10).

**System Design:** Requires a device-fingerprinting library (browser/device fingerprint hash, not just IP — IP alone is insufficient given how commonly it changes/is shared) captured at the Application form and checked against a `devices` table (device_fingerprint, first_seen_application_id, first_seen_at) before allowing a new Application to proceed. This must fail closed (block the application) rather than open, given its stated fraud-prevention purpose.

**Current Implementation Status:** NOT STARTED. No fingerprinting library, dependency, or `devices` table equivalent exists anywhere in the current scaffold or `package.json` dependency list per `architecture.md`'s stack inventory — this is entirely net-new, including the choice of fingerprinting library/technique itself.

**Open Questions:** What should happen when a device is reused — a hard block on the Application form (best fraud prevention, worst false-positive risk for shared/family devices or reset phones), or a soft flag that routes the Application into extra Admin scrutiny rather than an outright block? The draft states it as an absolute rule ("cannot"), which this document takes at face value as a hard block, but the false-positive risk (shared devices, factory-reset phones reusing a fingerprint) should be explicitly acknowledged and accepted by the product owner before implementing a hard block, given it will reject legitimate applicants some percentage of the time.


---

## 14. Data-plan management UI (Reseller side)

**Business Rule:** Plans are paginated 10-per-page. A Reseller can enable all plans at once via a single toggle, or one at a time. Only enabled plans can have a markup set. Each network displays at country cost with markup shown in that country's currency (reiterating Section 12's per-country independence).

**System Design:** Standard paginated list UI backed by `src/actions/reseller/plans/*` (already mostly built per Section 12) with a bulk-toggle action distinct from per-row toggles — `bulkUpdateAllPlans` is already listed as an existing export in `architecture.md`'s Layer-2-reference table for the equivalent Layer-2 feature (`src/app/actions/reseller/plans/updatePlan.ts` → `updateResellerPlan`, `bulkUpdateAllPlans`), and Layer 3's own `src/actions/reseller/plans/*` should be checked for an equivalent before assuming it needs to be built new — given the subsystem is 82% complete already, this specific UI behavior may already exist.

**Current Implementation Status:** LIKELY MOSTLY BUILT — see above. Direct verification needed on: pagination page-size (confirm 10, not a different default), and whether the enable/markup dependency (can't set markup on a disabled plan) is enforced.

**Open Questions:** None — this is a refinement/verification task against already-built code, not new design.

---

## 15. Currency display engine & storefront purchase flow (Customer-facing)

**Business Rule (the most detailed worked example in the entire draft):** A Customer always sees prices in *their own* local currency, computed from whatever the Reseller configured in Section 12 — never in the Reseller's currency. Concretely: a Nigerria-based Reseller sets NG/GH/TG plans at ₦100/1 cedi/TG5 respectively (each in that plan's *own* country's currency, per Section 12); a Nigerian Customer visiting that store sees ALL THREE plans converted into naira (e.g. ₦100, ₦500, ₦300) — even the GH and TG plans, which the Reseller priced in cedis/TG currency, must be shown to a Naira-default Customer in naira. A Ghanaian Customer visiting the exact same store instead sees all three plans in cedis. The Customer selects a target country for the data plan itself (e.g. buying a Nigerian plan while browsing as a Ghanaian Customer), enters a recipient phone number, the system auto-detects the network carrier from that number's country/prefix, and payment is deducted from the Customer's own wallet in the Customer's own currency — a currency conversion happens at the exact moment of display and at the exact moment of payment, not just for display.

Symmetrically, when the person viewing the store IS a Reseller (viewing their own or possibly another store, for reference), they see every plan in that plan's *own* country's native currency (GH plans in cedis, NG plans in naira, etc.) — no conversion applied for a Reseller's own view, only for a Customer's view. This is a genuinely different display mode gated on viewer role, not just a default/override toggle.

**System Design:** Requires: (a) a live (or periodically-refreshed) currency-conversion rate table/service — nothing resembling this exists anywhere in the current scaffold; `src/lib/currency/currency.ts` (Layer 1, shared) should be read directly to check whether it already does FX conversion or only currency *symbol/formatting* (the far more common and far simpler thing to build, and what its name suggests without deeper inspection) — do not assume FX-rate conversion exists just because a "currency" lib file exists; (b) network-carrier auto-detection from a phone number's country prefix (a lookup table/library keyed on international dialing codes → country → known carriers for that country, likely combinable with the already-existing per-country network/plan catalog rather than needing a wholly separate library); (c) a role-aware pricing-display function that branches on viewer role (Customer → convert to viewer's currency; Reseller → show each plan's native currency, no conversion) — this is a new, specific requirement on top of whatever `calculatePrice.ts` (Section 12) already does, since that engine's job (computing markup/profit) is a different concern from this one (display-currency conversion for a *given* viewer).

**Current Implementation Status:** LARGELY NOT STARTED. The storefront pages themselves (`[countryCode]/(store)/*`, `[countryCode]/[storeName]/*`) are 93-100% file-complete per `architecture.md`, meaning the UI shells exist — but whether the specific currency-conversion-by-viewer-role logic described here is implemented inside them was not (and could not be) confirmed by a file-presence audit; this needs direct code reading of those storefront pages/components as the very next step, since this is the single most complex and highest-value piece of business logic in the entire draft, and the file-complete status of the storefront route does NOT by itself confirm this logic exists.

**Open Questions:**
- Confirm whether real-time FX rates are needed (implying an ongoing FX-rate-provider integration and its own cost/reliability considerations — no such provider appears anywhere in the current environment-variable inventory in `architecture.md`, which is a strong signal this has NOT been built) or whether the platform uses admin-configured static/periodically-updated rates (simpler, cheaper, matches "the app deposit bonus... in his own local currency" language elsewhere in the draft, which reads more like fixed platform-set exchange values than live market rates).
- Network-carrier auto-detection from phone number: is this based purely on the international dialing prefix (simple, but multiple carriers per country means this alone can't fully resolve the actual specific carrier — e.g., MTN vs Airtel vs Glo all being Nigerian, all sharing the same +234 prefix), or does actual carrier lookup (HLR lookup / a provider API) already exist and just wasn't visible at the file-inventory level? This is worth checking against `src/lib/providers/*` (Zendit/Accragh/Lizzysub) directly, since carrier-detection-from-number is a very standard capability of VTU upstream providers and may already be available through those integrations rather than needing to be built separately.


---

## 16. Customer onboarding & authentication

**Business Rule:** A first-time Customer can browse plans without an account. Clicking "buy" triggers a sign-in/sign-up modal. On first successful auth, the Customer is walked through: (1) setting a transaction PIN, (2) creating whatever payment-method record their country requires (wallet / mobile money / virtual account / "any other relevant payment system for the related customer based on their country" — i.e. this is country-conditional, not one universal payment-setup step). Only after both are complete can they actually purchase. Resellers also have a transaction PIN, same as Customers.

**System Design:** A modal-based, buy-triggered auth flow (not a separate standalone sign-up page for Customers, notably different from the Reseller sign-up flow in Section 6) — this needs its own component distinct from whatever exists for Reseller auth. Country-conditional payment-method setup implies a per-country configuration of "which payment method types are available/required here" — a natural extension of the already-implemented `src/config/countries/*` and `src/config/payment-methods/*` (per `architecture.md`'s config-folder inventory, `src/config/` is 58% real, though `payment-methods` specifically wasn't individually confirmed as one of the implemented files vs. empty ones — verify directly).

**Current Implementation Status:** NOT STARTED as a distinct flow. The transaction-PIN mechanic itself already exists in Layer 1 (`src/app/actions/wallet.ts` → `createTransactionPinAction`, `verifyTransactionPinAction`) and should be referenced/reused rather than reinvented for Layer 3, but the buy-triggered-modal UX and the country-conditional payment-method-setup step are both net new — no equivalent exists in the current Layer 3 scaffold under any folder name found in this audit.

**Open Questions:** None beyond the config-file verification noted above.

---

## 17. Reseller purchasing from their own store (base-price self-purchase)

**Business Rule:** If a Reseller buys from their own store, they pay the base price (platform cost), not their own marked-up selling price — a Reseller cannot profit by "selling to themselves." The storefront UI shows this by displaying the Reseller's normal selling price with a strikethrough, revealing the (lower) base price, specifically at the moment the Reseller-as-buyer clicks "buy."

**System Design:** Requires the purchase-flow code to check "is the current authenticated buyer the same identity as this store's owning Reseller" and branch pricing accordingly — a narrow but easy-to-miss conditional that must live in the actual charge/debit logic (not just the display layer), since a display-only strikethrough with no corresponding change to the amount actually charged would be a real bug, not a cosmetic one.

**Current Implementation Status:** NOT STARTED / NOT CONFIRMED. No mention of self-purchase detection exists in any file described in `architecture.md`'s Appendix A for the orders/plans/wallet action sets — this needs to be added explicitly to whichever action ultimately executes a purchase (likely `src/actions/reseller/orders/*`, currently 67% real at the file level, but this specific business rule was not something a file-presence audit could confirm either way).

**Open Questions:** None — the rule itself is unambiguous; only the implementation location needs deciding (most naturally, inside the same purchase-execution action Customers use, with a role check, rather than a separate parallel code path — a parallel path risks the two diverging over time and one silently missing a future pricing-logic fix).

---

## 18. Forgot-password flow — RESOLVED, PIN-based variant dropped

**Business Rule (as clarified by the product owner, 2026-08-29):** The raw draft's PIN-based reset ("email → set new password → confirm via transaction PIN") is **not being built**. Layer 3 uses the existing, already-built, standard email-link reset flow instead — no PIN step, no departure from what's already working. This applies to both Resellers and Customers alike: whichever reset mechanism Layer 1 already implements (`forgotPasswordAction` / `resetPasswordAction`, `src/app/actions/auth.ts`) is the one to extend/reuse for Layer 3's Customer- and Reseller-facing reset flows, not to replace.

**System Design:** No new design needed for the reset flow itself — reuse Layer 1's Supabase link-based `forgotPasswordAction`/`resetPasswordAction` pattern directly. The only Layer-3-specific work is making sure the reset-link's post-click destination is context-aware (a Reseller resetting their password should land back in their Console; a Customer resetting theirs should land back in the specific storefront they came from) — a routing/redirect detail, not a new auth mechanism.

**Current Implementation Status:** The underlying mechanism already exists (Layer 1). What Layer 3 needs is only the redirect-destination wiring described above, tracked wherever Section 16's Customer-auth work and the Reseller dashboard's auth wiring land — no separate ledger/PIN-verification work is needed as a result of this resolution.

**Open Questions:** None — resolved. No PIN-based reset will be built.


---

## 19. API access (Reseller-issued tokens for Customers)

**Business Rule:** A Reseller can issue API tokens to their own Customers (via a "generate API token" button the Customer presses inside the Reseller's storefront/app). A token grants that Customer programmatic access to buy at exactly the Reseller's configured prices/currency for every plan the Reseller has enabled — functionally a programmatic mirror of the storefront, scoped per-Reseller. Support/issues for an API Customer route back to that specific Reseller, not to the platform.

**System Design:** An `api_tokens` table (reseller_id, customer_id, token_hash, created_at, revoked_at, last_used_at) plus an authenticated REST surface that resolves a token → its owning Reseller → that Reseller's `reseller_plan_settings` (Section 12) for pricing. This is directly analogous to Layer 2's already fully-built `/api/v1/*` surface (OpenAPI-documented, API-key auth, plans/purchase/wallet/webhooks endpoints — per `architecture.md`), which should be read in full as the concrete reference implementation before building Layer 3's country-scoped equivalent, rather than designing this from scratch.

**Current Implementation Status:** BARELY STARTED. `src/app/api/reseller/[countryCode]/*` is only 30% real (3/10 files, per `architecture.md`) with no token-issuance or token-authenticated purchase endpoint among the 3 implemented files (`config/[configId]`, `wallet/fund`, `webhooks/build`) — meaning this entire capability needs to be built, using Layer 2's `/api/v1/*` as the direct pattern reference per `blueprint.md` item #9's own note that the REST-vs-Server-Action question should be resolved first.

**Open Questions:** Does issuing an API token cost the Customer or Reseller anything (the draft doesn't mention a fee, implying free), and is there a cap on how many API tokens a single Reseller can issue, or how many active tokens a single Customer can hold across different Resellers? Not specified in the draft — likely fine to leave uncapped for a v1, but worth a conscious decision rather than an oversight.

---

## 20. Publish to Play Store

**Business Rule:** A Reseller can request to publish their Android app to the Play Store. Publishing has three distribution-scope tiers, each with its own fee: **Country** ($22), **Region** ($28), **Worldwide** ($35). A flat **$3/month maintenance fee applies to all tiers** regardless of which one was chosen. Maintenance billing starts immediately upon paying the publishing fee, is deducted from wallet balance specifically (never bonus balance — the draft is explicit on this point), and reminder emails are sent. Non-payment stops the app from functioning and removes it from Play Store visibility. Publishing requires accepting an extra Terms-of-Service specific to the maintenance-fee/wallet-deduction arrangement. The purchase flow is: click Publish → see app details/icon → click Continue → pay from wallet. Status updates are emailed to the Reseller using Google Play Store's own notification content, relayed through the platform's own email template.

**System Design:** `publishing_subscriptions` (reseller_id, tier enum[`country`,`region`,`worldwide`], tier_fee_paid_at, maintenance_billing_cycle, maintenance_next_due_at, status enum[`active`,`suspended_nonpayment`]) plus a scheduled job checking `maintenance_next_due_at` and (a) attempting auto-debit from wallet balance, (b) sending reminder emails ahead of due dates, (c) flipping status to `suspended_nonpayment` (which must cascade into actually disabling the live Android app / delisting it) on failure to collect. This scheduled-billing job has no equivalent anywhere in the current scaffold under any name and is a genuinely new piece of infrastructure (a cron/scheduled-function capability doesn't appear to exist yet in the stack per `architecture.md`'s inventory — confirm whether Supabase Edge Functions with `pg_cron`, or a separate scheduler, is the intended mechanism, since this affects where the code should live).

**Current Implementation Status:** PARTIALLY BUILT for the mechanical build/publish-trigger piece (`src/actions/reseller/build/*`, 75% real; `dashboard/publishing/*`, 70% real per `architecture.md`), reference-implementable from Layer 2's fully-working `triggerAppBuild.ts` + `/api/build-config`/`/api/build-webhook`/`/api/trigger-build`/`/api/generate-icon` (per `architecture.md`'s Layer-2 section) — **but the tiered pricing ($22/$28/$35), the maintenance-fee billing cycle, and the auto-suspension-on-nonpayment logic described here have no equivalent in Layer 2 at all** (Layer 2's reference implementation is a simpler, single fixed-fee build trigger with no tiers and no recurring maintenance billing) — this is where Layer 3 must genuinely exceed its Layer-2 reference, not just port it. `blueprint.md` item #7 already flagged the `build/*` vs `publishing/*` namespace duplication as needing reconciliation — this section's tiered-fee/maintenance-billing requirements should be built into whichever namespace that reconciliation lands on, not into both.

**Open Questions:**
- The maintenance-fee numbers as stated are internally inconsistent: "$20 yearly OR $3 monthly OR $15 biannually" — $3×12 months = $36/year (not $20), and $15 for six months (biannual) annualizes to $30/year, which is MORE than the stated $20/year rate, meaning the longer commitment (yearly) is priced cheaper than the medium one (biannual), an unusual (though not impossible, e.g. as a promotional yearly-only discount) pricing structure. **This must be confirmed/corrected by the product owner before implementation** — do not silently normalize these numbers into a "sensible" pattern; get the actual intended figures.
- Is the "$3 maintenance fee applies to all" line (stated once, near the tier prices) the true flat monthly rate, superseding the earlier "$20 yearly / $3 monthly / $15 biannually" figures (i.e., only the $3/month cadence is real and the yearly/biannual figures were an earlier draft of a promotional-discount idea that wasn't updated), or are all four figures meant to coexist as selectable billing cadences? Resolve alongside the point above.
- Do the publishing tiers (country/region/worldwide app-distribution scope) interact with the country-of-sale limits in Section 11 (which countries' data plans a Reseller can sell) at all, or are they entirely independent axes (an app could plausibly be published "worldwide" for discoverability while the Reseller is still only licensed to actually sell in 3 countries)? The draft doesn't connect these two systems explicitly, and this document is treating them as independent unless told otherwise.


---

## 21. Notifications (push & in-app)

**Business Rule:** Push and in-app notifications go to both Resellers and Customers. Additionally, a Reseller's own notification view should distinguish between their API Customers (Section 19) and their normal storefront Customers.

**System Design:** A `notifications` table scoped by recipient type/id, with a `source_channel` or `customer_type` marker (api vs storefront) on Customer-related notification rows so a Reseller's notification center can filter/segment by that dimension specifically — this segmentation requirement is additive on top of whatever generic notification-center UI gets built and should be designed in from the start rather than retrofitted, since it's a stated, specific requirement, not a nice-to-have.

**Current Implementation Status:** NOT STARTED. `dashboard/notifications/*` (0/5), `src/actions/reseller/notifications/*` (0/7), `src/lib/notifications/*` (0/10), `src/constants/notifications/*` (0/3) — entirely unstarted per `architecture.md`/`blueprint.md` P1 #10. Layer 1's existing FCM push setup (`src/lib/fcm/firebase.ts`) and notification actions (`src/app/actions/notifications.ts` → `saveFCMTokenAction`, `sendWebPushAction`, etc.) are directly reusable infrastructure for the push-delivery mechanics — reuse that plumbing rather than rebuilding Firebase integration from scratch; only the data model, UI, and the API-vs-normal-Customer segmentation described here are genuinely new for Layer 3.

**Open Questions:** None beyond what `blueprint.md` P1 #10 already carries — this section adds the specific API/normal-Customer segmentation requirement on top of that already-known gap.

---

## 22. Campaign banners ("Get your own app" advert)

**Business Rule:** An in-app announcement banner shows specifically on a user's 3rd app use (not 1st, not every time). Copy varies by user type: a Customer sees "get your own app today with…" (a conversion-to-Reseller pitch); a Reseller sees "sell up to 100 transactions today and get bonus up to 1000" (an engagement/activity pitch).

**System Design:** Requires a per-user `app_open_count` (or equivalent session-count tracker) checked against exactly `== 3` (or `>= 3` with a dismiss-then-never-again flag — the draft says "at the 3rd time," read literally as a single one-time trigger, not a recurring one) plus role-conditional copy selection. This is a distinct system from Section 9's deposit-bonus banner (interval-based, wallet-funnel-specific, Reseller-only) — the two should not share one banner-component implementation just because both are "banners," given their triggers and audiences differ entirely.

**Current Implementation Status:** NOT STARTED. No app-open-counting mechanism or banner-display component matching this description exists anywhere in the current scaffold.

**Open Questions:** Does "3rd time the user uses the app" mean 3rd app *session* (any open), or 3rd *distinct day* of use? These produce very different trigger timing for a user who opens the app multiple times in one sitting. Confirm before implementing the counter.

---

## 23. Gamification — weekly transaction challenge

**Business Rule:** The system displays how many transactions a Reseller has made in the current week; if below target, shows a "sad face" and a challenge: hit 1,000 transactions in a single day, and the base price of 1GB of data drops to ₦200 (a wholesale-cost reduction from the platform/telco itself, not a discount the Reseller gives their own Customers). Cadence: weekly, resetting on Monday or Sunday (exact day not finalized in the draft itself).

**System Design:** `gamification_weekly_stats` (reseller_id, week_start_date, transaction_count, target_met bool, reward_applied bool) plus a scheduled recompute (daily, at minimum) checking whether any given day within the current week crossed the 1,000-transactions-in-a-day threshold, and if so, applying a temporary base-price override for that Reseller specifically for 1GB plans for some stated reward period (duration not specified in the draft — see Open Questions). This reward mechanic interacts directly with Section 12's pricing engine (a temporary base-price override sitting "below" the normal telco-provided base price specifically as a reward, which is a different code path from the normal floor-price-enforcement direction that engine currently protects against) — this needs to be designed as an explicit, time-bounded override table/flag on top of the pricing engine, not a mutation of the base price itself (mutating the real base price would be both wrong, once the reward period ends, and dangerous, since Section 12's floor-price rule for every Reseller's own markup depends on the true base price never moving arbitrarily).

**Current Implementation Status:** NOT STARTED. `dashboard/achievements/*` (0/5, per `blueprint.md` P3 #17) is the closest existing scaffolded folder by theme, but that folder's named files (badges/milestones/progress-bar pattern, per its component names in `architecture.md`) suggest a generic gamification-polish feature, not specifically this weekly-transaction-challenge-with-a-real-pricing-reward mechanic — this may need its own dedicated implementation rather than living inside the generic `achievements` scaffold, given it has real financial/pricing consequences the generic achievements system likely wasn't designed to carry.

**Open Questions:**
- How long does the ₦200-per-GB reward price last once earned — one day, the rest of that week, permanently for that Reseller? Not stated.
- Does the 1,000-transactions-in-a-day target reward apply per-Reseller individually, or is it a platform-wide/country-wide collective target? The phrasing ("tell them that they should make 1000 transactions in 1 day") reads as per-Reseller, but this should be confirmed given how differently it would need to be computed and how differently it affects the platform's actual wholesale-cost exposure if many Resellers hit it simultaneously.
- Is Monday or Sunday the actual week-start day? Explicitly left open in the source draft itself ("maybe on Monday or Sunday") — needs a real decision, not a guess, since it affects every weekly aggregate this feature computes.


---

## 24. Consolidated data model (every new table/column this specification implies)

This is the union of every "System Design" data-model note above, gathered in one place for whoever eventually writes the actual migrations (recall from `architecture.md`'s Known Irregularities and `blueprint.md` P0 #5: **no migration currently captures any live schema at all** — this consolidated list should be reconciled against a real schema dump, not written as if starting from an empty database):

| Table | Purpose | Source section |
|---|---|---|
| `applications` | Application-stage record: identity, activation-fee-paid flag, device fingerprint, detected IP country | §1, §7, §13 |
| `devices` | Device fingerprint → first-application link, for one-account-per-device enforcement | §13 |
| `resellers` | Core Reseller record: lifecycle_stage enum, home/application country, storefront slug, android_app_enabled toggle, first_deposit_bonus_claimed | §1, §2, §3, §7, §9 |
| `reseller_countries` | Per-Reseller country-of-sale grants: is_default, unlocked_via_fee | §11 |
| `reseller_plan_settings` | Per-Reseller per-plan markup config: markup_type, markup_value, computed_effective_price (floor-constrained) | §12, §14 |
| `wallets` | Live balance cache: owner_type (reseller/customer), bonus_balance, wallet_balance | §9, §10 |
| `wallet_ledger` | Append-only transaction log: type enum (see §10's full list), amount, resulting balance touched | §10, §11, §19, §20 |
| `api_tokens` | Reseller-issued Customer API tokens: token_hash, revoked_at, last_used_at | §19 |
| `publishing_subscriptions` | Per-Reseller Play Store publishing: tier enum, fee_paid_at, maintenance_billing_cycle, next_due_at, status | §20 |
| `campaign_banner_impressions` | Per-user app-open counter + banner-shown/dismissed state | §22 |
| `gamification_weekly_stats` | Per-Reseller weekly transaction count + reward-earned/applied flags | §23 |
| `transactions` (extends existing) | Must carry: funded_from split (bonus/wallet amounts individually), buyer role (self-purchase flag per §17), recipient country/network (auto-detected) | §15, §17 |

## 25. Cross-reference summary — draft feature → current build status → blueprint item

| Draft feature (this document's section) | Build status | `blueprint.md` cross-ref |
|---|---|---|
| Geolocation (§2) | DONE | n/a — already complete |
| Android app toggle (§3) | Partially built, semantics need reconciling | P1 #7 |
| Image upload custom/prebuilt (§4) | Not started | P1 #9 (upload API), P0 #3 (launch) |
| Storefront generation + status email (§1, §5) | Not started — net-new job | P0 #3 |
| Sign-up/auth, resolved by actor (§6) | Reseller side (`/apply`) done; Customer side not started | Customer sign-up tracked under §16, not a separate item |
| Application/Onboarding split (§7, §8) | Application done; onboarding not started | P0 #4 |
| Deposit bonus banner, resolved scope (§9) | Not started | New — not yet in blueprint.md |
| Wallet bonus/wallet split (§10) | Partially built, split unconfirmed | P1 #8 |
| Multi-country selling limits (§11) | Not started | New — not yet in blueprint.md |
| Pricing/markup engine (§12) | Mostly built | Confirmed strong in P1 #14/architecture |
| Data-plan pagination/toggle UI (§14) | Likely mostly built | Same as §12 |
| Device fingerprinting (§13) | Not started | New — not yet in blueprint.md |
| Currency display + storefront purchase (§15) | Storefront shell done, core logic unconfirmed | Needs direct code read, not yet in blueprint.md |
| Customer onboarding/auth (§16) | Not started as distinct flow | New — not yet in blueprint.md |
| Self-purchase at base price (§17) | Not started/unconfirmed | New — not yet in blueprint.md |
| Forgot password, resolved (§18) | Reused from Layer 1, redirect-wiring only | Minor item, foldable into §16's Customer-auth work |
| API access/tokens (§19) | Barely started | P1 #9 |
| Publish to Play Store, tiers+maintenance (§20) | Build mechanics partial; billing/tiers not started | P1 #7 |
| Notifications incl. API/normal segmentation (§21) | Not started | P1 #10 |
| Campaign banners (§22) | Not started | New — not yet in blueprint.md |
| Gamification weekly challenge (§23) | Not started | P3 #17 (partial overlap only) |

**Net effect on `blueprint.md`:** several features in this specification (marked "New — not yet in blueprint.md" above) surface real product requirements with no current line item at all — the deposit-bonus banner (§9), multi-country selling limits (§11), device fingerprinting (§13), customer onboarding/auth (§16), self-purchase pricing (§17), and campaign banners (§22) chief among them. These will need new entries in `blueprint.md` once this specification is finalized and the phase/task breakdown (explicitly deferred per this session's instructions) is done.

---

## Document relationships

- **`architecture.md`** — the file-level ground truth this document cross-references throughout.
- **`blueprint.md`** — the current prioritized build sequence; this document identifies where that sequence is incomplete relative to the full business specification, without yet re-sequencing it.
- **`handover.md`** — process/session-continuity source of truth; will be updated once this specification is finalized and broken into phases/tasks, per the explicit next step the product owner has deferred.

*End of product-spec.md.*
