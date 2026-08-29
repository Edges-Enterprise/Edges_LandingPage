# HANDOVER.md — READ THIS FILE FIRST, AND ONLY THIS FILE, AT THE START OF EVERY SESSION

**This is the source of truth for anyone (human or AI session) picking up work on this repository. Do not re-audit the codebase from scratch. Do not re-run a full `find`/`grep` sweep of `src/` to "understand the project" before reading this document — that work has already been done, is recorded here and in `architecture.md`/`blueprint.md`, and re-doing it wastes time and risks producing a second, drifted, contradictory picture of the codebase.**

This document exists specifically so the codebase audit performed on 2026-08-29 (branch `codebase-analysis`, cut from `reseller-gh` at commit `7603a82217898d4c2a30e4d5dbe055de3059193f`) never has to be repeated. Everything a new session needs — what was found, how it was found, where the output lives, and what rules to follow going forward — is here or one link away.

---

## 1. What exists and where

Three documents were produced by this audit, all committed to the repository root on the `codebase-analysis` branch:

- **`architecture.md`** — the exhaustive, file-level ground truth for ALL THREE architectural layers of the product (Layer 1: legacy single-tenant consumer app; Layer 2: multi-tenant single-country reseller platform, reference-only; Layer 3: multi-country multi-tenant platform, the active build target). Contains full route/action/component/lib/API inventories, exported-function names, empty-vs-implemented status for every relevant file, environment-variable inventory, shared-infrastructure map, and a "Known Irregularities" section documenting bugs/risks/naming traps discovered during the audit.
- **`blueprint.md`** — scoped exclusively to Layer 3 (the multi-country platform). Turns `architecture.md`'s raw file inventory into a prioritized (P0–P3) feature checklist: what's done, what's missing, what to build next and in what order, with explicit dependency reasoning between items.
- **`handover.md`** — this file.

A `.patch` file containing the commit that adds all three documents was generated via `git format-patch` and delivered outside the repository (see §5) so it can be applied with `git am` to any clone of the repo.

## 2. The rule for future sessions

1. Read this file.
2. If you need the detailed file-by-file picture (e.g. "is `src/actions/reseller/wallet/getVirtualAccount.ts` implemented?"), read `architecture.md` — do not re-derive it.
3. If you need to know what to build next in the multi-country platform, read `blueprint.md` — do not re-derive it.
4. **Before trusting either document, run the one-command staleness check in §4.** If it reports drift, follow the "if stale" procedure in §4 rather than starting a fresh audit from nothing — most drift can be reconciled with a targeted diff, not a full re-audit.
5. Layer 1 and Layer 2 are not build targets. Layer 2 in particular is explicitly reference-only, per the product owner's direct instruction recorded in this audit — open it to see how a working feature was implemented, never to route new users through it or to import its code into Layer 3.
6. All new work happens under `src/app/[countryCode]/**`, `src/actions/reseller/**` (the one aliased `@/actions/reseller`, NOT `@/app/actions/reseller`), `src/components/reseller/**`, and the Layer-3-owned `src/lib/` subdirectories listed in `architecture.md`.
7. When a file described as "empty" in `architecture.md`/`blueprint.md` turns out to now have content because someone implemented it since this audit, that is expected and good — it means progress happened. Do not treat a docs/reality mismatch as an error to fix in the code; treat it as a signal to update the docs (see §4).

## 3. The most important individual facts to carry forward (do not lose these in a future re-read)

- **Security finding:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is read (in `src/lib/supabase/admin.ts:8` and `src/lib/supabase/server.ts:13`) under a `NEXT_PUBLIC_`-prefixed name, which is the naming convention Next.js uses to decide whether to inline a variable into the client bundle. Both current call sites are server-only, so there is no confirmed active leak, but the variable must be renamed and both files audited before this becomes a real incident. This is `blueprint.md` item #11 / P1.
- **Schema gap:** all 13 `supabase/migrations/*.sql` files and all 53 `supabase/rpc/*.sql` files are 0 bytes. The live schema exists only in the Supabase project dashboard, not in this repository. This is `blueprint.md` item #5 / P0, and should be the very first thing any new session does, before any feature work.
- **Two identically-named-but-different `actions/reseller` trees exist:** `src/app/actions/reseller/**` (Layer 2, import alias `@/app/actions/reseller/...`) and `src/actions/reseller/**` (Layer 3, import alias `@/actions/reseller/...`). Confirmed via import-graph analysis, not filename pattern-matching. Never assume which layer a file belongs to from its path alone.
- **Dead code confirmed, safe to remove once product owner confirms:** `src/app/actions/wallet-withxixicopy.ts` and `src/components/WalletClient-withxixicopy.tsx` — zero import references found anywhere under `src/app`.
- **Likely duplicate/needs-reconciliation, do NOT build both out fully:** `src/actions/reseller/build/*` (75% implemented) and `src/actions/reseller/publishing/*` (0% implemented) appear to be two competing namespaces for the same "Android app build" feature. Resolve which one is canonical before continuing publishing-pipeline work — see `blueprint.md` item #7.
- **`src/app/[countryCode]/generateIcon.ts` and `src/lib/business-generator/logo/generator.ts` contain the same two exported functions (`generateIconPng`, `generateNotificationIcon`)** — likely copy-pasted rather than shared; reconcile into one module.
- **The empty `src/middleware/*.ts` files are NOT missing functionality** — country detection/routing is implemented and working in `src/proxy.ts` at the project root. Do not "fix" this by building the empty middleware files without first confirming with the product owner whether splitting `proxy.ts` apart is still wanted.

## 4. Staleness check — run this before trusting `architecture.md` / `blueprint.md`

The audit was performed against commit `7603a82217898d4c2a30e4d5dbe055de3059193f` on `reseller-gh` (2026-08-16), from the `codebase-analysis` branch. Run this before relying on the counts in either document:

```bash
cd /path/to/Edges_LandingPage
git log --oneline reseller-gh | wc -l              # was 902 at audit time
find src supabase -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.sql" \) -empty | wc -l   # was 705 empty .ts/.tsx in Layer 3 + 66 empty .sql (13 migrations + 53 rpc) = 771 total empty at audit time
```

**If the commit count on `reseller-gh` matches 902 and the empty-file count is still ~771:** the documents are current, proceed to use them directly.

**If the numbers differ:** work has happened since the audit. Do NOT re-run a full audit. Instead:
1. `git log --oneline reseller-gh | head -n <N>` where N = new_count minus 902, to see exactly what commits landed since the audit.
2. For each new/changed commit, `git show --stat <hash>` to see which files it touched.
3. Cross-reference those specific file paths against `architecture.md`'s Appendix A/B (implemented/empty lists) and update ONLY the affected lines/rows using targeted edits — flip files from Appendix B to Appendix A as they get implemented, update the relevant subsystem-completion-table row's empty/non-empty counts, and update the corresponding `blueprint.md` item's status.
4. This targeted-diff approach is dramatically cheaper than a full re-audit and keeps the documents' extensive detail intact rather than regenerating (and potentially thinning out) them from scratch.

## 5. Process documentation — exactly how this audit was produced (for reproducibility and audit-trail purposes; NOT an instruction to re-run it)

This section exists so that (a) the methodology can be trusted/verified by inspection, and (b) if a full re-audit is ever genuinely warranted (e.g. after a major refactor invalidates the targeted-diff approach in §4), it does not need to be reinvented.

**Step 1 — Establish the repository state.** Confirmed the working directory (`/home/claude/Edges_LandingPage`) was already cloned and on the correct branch (`reseller-gh`), then created a new working branch `codebase-analysis` off it with `git checkout -b codebase-analysis` (no branch name was specified by the user for this step, so a descriptive one was chosen).

**Step 2 — Establish layer boundaries by import-graph, not filename guessing.** For each ambiguous directory pair (e.g. the two `actions/reseller` trees), ran `grep -rhoE "from [\"'][^\"']*[\"']" <route-group>` against each of Layer 1's `(protected)`/`(auth)`/`(admin)` route groups, Layer 2's `(reseller-dashboard)` route group, and Layer 3's `[countryCode]` route tree, then filtered for `actions|lib|components` import paths. This produced a definitive map of which `actions`/`components`/`lib` subtree each route group actually depends on, which is what layer boundaries were drawn from — filenames alone (e.g. both trees being named "reseller") would have been misleading.

**Step 3 — Build a complete, categorized file manifest.** For each layer, ran targeted `find` commands scoped to the route/action/component/lib/api directories identified in Step 2, redirecting output to per-layer manifest text files (`layer1.txt`, `layer2.txt`, `layer3.txt`). Cross-checked completeness with:
```bash
find src supabase -type f | sort > all_files.txt
cat layer1_paths layer2_paths layer3_paths | sort -u > categorized.txt
comm -23 all_files.txt categorized.txt   # anything left uncategorized
```
This surfaced 5 initially-uncategorized files (`src/app/edges/page.tsx`, and the 4 files under `src/lib/utils/`), which were individually inspected (`head`, and `grep -rl` to find their importers) and assigned to the correct layer, then the process was re-verified to show zero uncategorized files remaining.

**Step 4 — Annotate every file with empty/non-empty status.** For each path in each layer manifest:
```bash
sz=$(stat -c%s "$f"); [ "$sz" -eq 0 ] && echo "EMPTY|$sz|$f" || echo "OK|$sz|$f"
```
producing `layer{1,2,3}_annotated.txt`, which is the direct source for every completion percentage and every Appendix A/B entry in `architecture.md`.

**Step 5 — Extract real signal from non-empty files, not just "it has bytes."** For every non-empty `.ts` action/lib file across all layers, and for API route files, ran:
```bash
grep -oE "export (async function|function|const) [A-Za-z0-9_]+" "$f" | awk '{print $NF}'
grep -oE "export async function (GET|POST|PUT|DELETE|PATCH)" "$f"   # for API routes specifically
```
to list actual exported action/handler names rather than only file paths — this is what allows `architecture.md` to say e.g. "`wallet.ts` → `createTransactionPinAction`, `verifyTransactionPinAction`, ..." instead of just "`wallet.ts` exists."

**Step 6 — Targeted verification of specific claims before writing them down as findings.** Every irregularity/risk claim in `architecture.md`'s "Known Irregularities" section and every cross-cutting item in `blueprint.md` was individually re-verified with a direct, narrow `grep`/`head` check immediately before being written into the document — for example, the dead-code claim about `wallet-withxixicopy.ts` was confirmed with `grep -rln "wallet-withxixicopy" src/app` returning zero results, and the service-role-key naming issue was confirmed with `grep -rn "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" src` to get the exact two call sites before describing severity. Do not carry forward a claim from this document into new work without it having been through this kind of direct verification — and when extending these documents in future, hold new claims to the same standard.

**Step 7 — Compose the three documents.** `architecture.md` was written first (raw ground truth + full appendices), `blueprint.md` second (derived from `architecture.md`'s data, reorganized by product feature and prioritized), `handover.md` third (this file, written last so it could accurately describe the finished state of the other two).

**Step 8 — Commit and package.** All three files were added to git on the `codebase-analysis` branch in a single commit, then packaged as a `.patch` file via `git format-patch` for delivery outside the sandboxed environment (see §6 for the exact commit this corresponds to).

## 6. Exact repository state as of this audit

- Branch: `codebase-analysis`
- Base branch: `reseller-gh`
- Base commit: `7603a82217898d4c2a30e4d5dbe055de3059193f` (2026-08-16, "refactor(PlansClient): remove unused imports and commented-out code for cleaner structure")
- Commit count on `reseller-gh` at audit time: 902
- This audit's own commit: adds `architecture.md`, `blueprint.md`, `handover.md` at the repository root, in one commit, on top of the base commit above.
- Delivered as: a `git format-patch`-generated `.patch` file, apply with `git am path/to/file.patch` against a checkout of `reseller-gh` at commit `7603a82217898d4c2a30e4d5dbe055de3059193f` (or any descendant — if applying against a newer commit, run the staleness check in §4 first and expect to reconcile drift per that procedure rather than expecting a clean apply if the same files have since diverged).

## 7. Delivery environment — standing rule for every future `.patch` file

The user works from **Termux on Android**, and their downloaded files (including any `.patch` file produced by a session) land in **`~/storage/downloads`** (the Termux shared-storage symlink to the device's `Download` folder, set up via `termux-setup-storage`). Their working clone of this repository lives somewhere under the Termux home directory (path varies by session — ask if unknown, don't assume).

**Standing rule: any time this project (or any session working on it) generates a `.patch` file for the user, the response MUST include the exact `git am` command to apply it, written for this Termux/`storage/downloads` environment — never assume the user will infer the command themselves.** The command shape is:

```bash
cd /path/to/Edges_LandingPage        # the user's actual local clone path
git am ~/storage/downloads/<exact-filename-of-the-.patch-file>
```

Notes to include alongside the command when relevant:
- If `git am` fails with an identity/committer error, the local git config needs `user.name`/`user.email` set (`git config user.name "..."` / `git config user.email "..."`) before retrying — this is a one-time local setup, not a problem with the patch itself.
- If `git am` reports a conflict or fails to apply cleanly (e.g. because the user's local branch has diverged from the commit the patch was generated against), the safe fallback is `git am --abort` followed by `git apply --stat <file>` / `git apply --check <file>` to inspect, or `git apply ~/storage/downloads/<file>` (which applies the diff without creating a commit, for manual review before committing).
- Always state which local branch/commit the patch was generated against (recorded in the patch-generating session's equivalent of this document's §6) so the user knows whether a clean apply is expected or whether they need to check out that base first.

## 8. What a new session should do differently from this one

This audit was read-only against the product code — no feature code was written or modified, only documentation was added. The natural next session should pick the top unchecked item from `blueprint.md`'s "Priority-ordered build sequence" (currently: database schema capture, then `.env.example`/service-role-key rename, then the verification/KYC flow) and begin implementation, updating `architecture.md`'s Appendix A/B and `blueprint.md`'s relevant status lines as files move from empty to implemented, per the targeted-diff procedure in §4 — rather than leaving documentation updates to accumulate into a future full re-audit.

*End of handover.md.*
