# HANDOVER — Master File

**This is the master handover file.** All work sessions across both repos
below should read this file first, log their status here, and add any
new task sections here. This repo is the source of truth; the mobile
repo carries a pointer file back to this one.

## Session bootstrap (do this before anything else)

Every new session working with this repo — whether it's cloning fresh or
already has a local copy — should always land on the **latest commit of
the most recently updated branch**, not just `main`. Concretely:

1. On clone (or if already cloned), fetch all branches:
   ```bash
   git fetch --all
   ```
2. Find the most recently updated branch:
   ```bash
   git for-each-ref --sort=-committerdate refs/remotes --format='%(committerdate:iso8601) %(refname:short) %(objectname:short)'
   ```
   The top line is the branch to work from.
3. Check it out at its latest commit:
   ```bash
   git checkout -B <branch-name> origin/<branch-name>
   ```
4. Re-read this `HANDOVER.md` **from that checked-out branch** (not from
   whatever branch you happened to land on first) — the file itself can
   change between branches, and the copy on the latest branch is the
   one that reflects current status.

This applies every session, not just the first one: branches here move
fast (see the log table below), so `main` being stale is expected and
is not a sign anything is wrong — always prefer the latest branch over
`main` when picking up work here.

## Task decomposition & session-pointer methodology (priority rule — applies to every task from here on)

This is a **priority rule**, meaning it overrides other instinct about
"just pick up whatever seems most useful" — every session should follow
this exact structure when a task is (or should be) broken down, not a
looser approximation of it.

### The splitting formula

Before any session starts executing, the **full architecture of the
task** — everything currently known to be in scope — gets laid out and
split into this exact five-level hierarchy:

```
1, 2, 3, 4, 5        <- Level 1: top-level task groups (the full architecture, split into up to 5 pieces)
  a, b, c, d         <- Level 2: each top-level task splits into up to 4 sub-groups
    i, ii, iii       <- Level 3: each sub-group splits into up to 3 units
      zi, zo         <- Level 4: each unit splits into exactly 2 children
        x            <- Level 5: each zi/zo splits into one final, atomic leaf — the actual unit of work
```

A fully-addressed leaf task looks like `1.a.i.zi.x` or `3.c.ii.zo.x` —
five levels deep, ending in `x` every time. `x` is not a label choice;
it is always the name of the deepest, smallest, actually-executable
unit of work at the bottom of whichever branch you're in.

### The pointer rule

At any given time there is exactly **one active pointer**, always
written as a full path ending in `x` (e.g. `2.b.iii.zi.x`), recorded at
the top of the relevant task's section. **A session's job is to
complete that one `x` and nothing else** — not to also start the next
one "while it's fresh," not to jump ahead to a different branch that
looks more urgent, not to redo the decomposition. If the current `x`
turns out to need further splitting once a session actually looks at
it, that's a sign it wasn't actually atomic — split it into its own
`zi`/`zo`/`x` and update the pointer to the new, smaller `x`, then stop
and hand off; don't push through original and new work in one session.

### Advancing the pointer once `x` is done

"Once x is completed, previous sub-numbering before it becomes the next
x" — concretely, the pointer advances **depth-first, left to right**,
one level at a time:

1. Finish current `x` (child of `zi`, say).
2. If its sibling `zo` isn't done yet, `zo`'s `x` becomes the new
   active pointer.
3. Once both `zi.x` and `zo.x` under a given `i`/`ii`/`iii` are done,
   move to the next of `i → ii → iii`, and its `zi.x` becomes the new
   pointer.
4. Once all of `i, ii, iii` are done under a sub-group, move to the
   next of `a → b → c → d`.
5. Once all sub-groups under a top-level task are done, move to the
   next of `1 → 2 → 3 → 4 → 5`.

The pointer only ever names one `x` at a time. Whoever finishes a
session's `x` updates the pointer to the next one (per the order above)
and logs it, so the next session — sandbox or otherwise — doesn't have
to re-derive where things stand; it just reads the pointer and starts.

### What this does *not* replace

This governs **how work gets sequenced and handed between sessions**,
not the mechanics of delivering it — the Standing handoff process
below (patches + `git am` + `git push`, or the direct-push exception
for schema snapshots and DB migrations) still applies exactly as
written to however the `x` in question gets delivered. A `1.a.i.zi.x`
might itself produce a `.patch` file, a direct Ubuntu commit, or a
`psql` migration command, depending on what kind of work it is — the
numbering scheme doesn't change which of those applies.

### Applying this to a new task

When a new task is opened in this file, before any session starts
executing it: lay out its full known scope as `1–5`, split each into
`a–d`, each of those into `i–iii`, each of those into `zi`/`zo`, and
each of those into a single `x`. Not every branch needs to be filled
in immediately if the full scope isn't known yet — but the active
pointer must always resolve to a real, atomic `x` before a session
starts work, and any branch left unspecified should say so explicitly
(e.g. "3.b — not yet decomposed, scope unclear") rather than being
silently absent.

## Standing policy — empty/broken scaffold routes get "Option A" (placeholder), not full builds, unless the current task needs them

This codebase has a recurring pattern, found and confirmed twice now
(`supabase/rpc/**` in Task 1; 89 empty Next.js special route files plus
an entire `src/components/reseller/modals/` directory of orphaned,
broken components in the 2026-09-17 Vercel-build-fix session): large
amounts of scaffolding — folders, route files, components — were
created early on but never actually filled in or wired up. This isn't
a one-off; assume more of it exists elsewhere in the tree until proven
otherwise.

**The standing rule, set explicitly by the user:** when a session hits
one of these (an empty required file breaking a build, an orphaned
component with a stale/broken API call, etc.) that isn't itself the
thing the *current task* is about, the default is **Option A** — get
it to a valid, honestly-labeled, non-broken state (a "coming soon"
placeholder, a 501 stub, a `.tsx.disabled` rename with an explanatory
note) and move on. Do **not** default to actually building out the
real feature that file was meant to hold — that's Option B, and it
only happens when a task is specifically opened for that route/feature
and scoped deliberately, the same way Task 2 was opened specifically
for the Android App toggle rather than trying to fix everything
`StoreConfigStep.tsx` touches.

This flips only when the task at hand *is* that route: if a future
task explicitly needs to build out, say, `/[countryCode]/admin/reports`,
then that page's stub gets replaced with a real implementation as part
of that task — Option A was never meant to be permanent for a route
someone is actively working on, only for everything currently
untouched by the task in front of a session.

Practical guidance for applying Option A:
- **Empty `page.tsx`/`layout.tsx`**: minimal valid component, clearly
  commented as a placeholder, honest "coming soon" UI — not empty, not
  fake-functional.
- **Empty `route.ts`**: valid exported handler(s) returning a 501 "Not
  implemented yet" — never a fabricated success response.
- **A non-empty but broken/orphaned component** (confirmed unused via
  a repo-wide import search first — don't assume, check): if the fix
  is purely mechanical (a type annotation, a stale but unambiguous
  calling convention), just fix it. If the fix requires a real
  business-logic judgment call (which price field, what a required
  param should be) that isn't yours to guess at, rename `.tsx` to
  `.tsx.disabled` (drops out of the TypeScript build glob without
  touching shared config) with an in-file comment explaining exactly
  what's broken and what re-enabling it would require. A directory
  with more than one such file gets a `README.md` instead of repeating
  the same note per file.
- Always confirm a component is actually unused (grep for its import
  path across the repo) before disabling it — disabling something
  that's live and load-bearing would be a real regression, not a
  cleanup.

## Standing handoff process (read this first — applies to every task, not just Task 1)

Sandbox sessions building work for these repos do **not** have GitHub
push access. The standing handoff mechanism, for every task in this
file, is:

1. The sandbox session builds its changes as a git commit and exports it
   with `git format-patch`, producing one `.patch` file per repo.
2. Those `.patch` files are handed to the user, who is working in
   **Termux on Android**. The user saves/downloads them into Termux's
   shared storage, which lands at `~/storage/downloads/`.
3. The user applies both repos' patches **in a single combined command**
   — no manual `cd`-ing back and forth between repos. Each repo's steps
   run inside their own subshell `(...)`, so the working directory
   never actually changes for the user.

   **Steady-state command (use this — the branch already exists and is
   already checked out on both repos from initial setup):**

   ```bash
   (cd ~/Edges_LandingPage && \
    git am ~/storage/downloads/<edges-landingpage-patch-file>.patch && \
    git push) \
   && \
   (cd ~/reseller-app && \
    git am ~/storage/downloads/<reseller-app-patch-file>.patch && \
    git push)
   ```

   No `git checkout`/`git checkout -b` needed here — do that only once,
   the first time a repo's handover branch is created (see step 3a
   below). Every session after that just downloads its patch(es) and
   runs the command above from whatever branch is already checked out.

   **One-time setup command (only the very first time, when the
   handover branch doesn't exist yet on a repo):**

   ```bash
   (cd ~/Edges_LandingPage && \
    git checkout reseller-gh && git pull && \
    git checkout -b handover/supabase-dump && \
    git am ~/storage/downloads/<edges-landingpage-patch-file>.patch && \
    git push -u origin handover/supabase-dump) \
   && \
   (cd ~/reseller-app && \
    git checkout main && git pull && \
    git checkout -b handover/supabase-dump && \
    git am ~/storage/downloads/<reseller-app-patch-file>.patch && \
    git push -u origin handover/supabase-dump)
   ```

   This assumes the two repos sit side by side under the home directory
   (`~/Edges_LandingPage` and `~/reseller-app`, matching the Termux
   prompts seen so far). If they live elsewhere, adjust both `cd` paths.

   The `&&` chaining between and inside each subshell means: if the
   first repo's steps fail partway (e.g. patch doesn't apply), the
   command stops there and the second repo's subshell never runs, so a
   half-applied first repo can't silently mask a skipped second repo.
   Check the terminal output for which subshell got furthest.

4. If `git am` fails with a "does not apply" / missing-base error, the
   local branch is out of date relative to what the patch was built
   against — `git pull` first, then retry. If a patch series has
   multiple files (`0001-...`, `0002-...`), list them in order in the
   same `git am file1.patch file2.patch` call.

**Every session that builds a patch for these repos should re-use this
combined-command process as-is and just fill in the actual patch
filename(s) and branch name for its task — do not reinvent the handoff
mechanism per task, and do not go back to two separate commands the
user has to run one after another.**

## Schema snapshots — committed directly, not via patch (standing rule)

`supabase/schema.sql` is a tracked, schema-only snapshot of the live DB
(tables, policies, functions, grants — **no row data**). It exists so
any session (sandbox or otherwise) can `git pull`/`git fetch` this repo
and read the current live schema without needing a fresh `pg_dump` or a
copy-pasted chat dump every time.

**This file is committed directly from the Ubuntu environment, not
through the sandbox patch/`git am` process above.** The patch process
exists because sandbox sessions lack push credentials; whoever has the
live `pg_dump` output already has full git push access on their own
machine, so routing it through a sandbox round-trip first would be
pure overhead. After running the Task 1 dump command:

```bash
cd ~/ubuntu-repos/Edges_LandingPage
cp ~/supabase-dumps/<timestamp>/schema.sql supabase/schema.sql
git add supabase/schema.sql
git commit -m "chore(db): snapshot current live schema for drift tracking"
git push
```

**Absolute rule: never commit `data.sql` or `full.dump` (or any other
row-data export) to either repo, ever.** Those contain real user
records (emails, transactions, wallet balances). Once something lands
in git history it's effectively permanent — deleting the file in a
later commit does not remove it from history, and a bad-faith actor
with clone access could still reconstruct it. `supabase/dumps/` stays
`.gitignore`d for exactly this reason; `supabase/schema.sql` is the one
deliberate, structure-only exception.

A sandbox session that needs to check schema drift against
`supabase/rpc/**` should `git fetch`/`git pull` this repo and read
`supabase/schema.sql` directly, rather than asking the user to paste
dump output into chat.

## Edge functions manifest — `supabase/edge-functions.json` (reference only, not a build artifact)

`supabase/edge-functions.json` is a checked-in snapshot of the Supabase
Management API's function-list response for the live project
(`jjyyfaxcwanrmiipzkoj`): slug, version, `verify_jwt`, timestamps, and
(where present) a content sha256 per deployed edge function. It exists
for the same reason `supabase/schema.sql` does — so a session doesn't
have to ask the user to paste a fresh API dump every time it needs to
know what's actually deployed.

**What it is not:** it is not function source code, not a secret, and
not a `pg_dump`-derived artifact. It comes from the Management API via
a personal access token, so — unlike `schema.sql` — producing it does
not require live DB/Ubuntu access, and updating it follows the
**normal patch/`git am` handoff process**, not the direct-push
schema-snapshot exception.

**Freshness:** this file is a point-in-time snapshot and goes stale the
moment a function is deployed, renamed, or removed without a session
remembering to refresh it. Use `updated_at` per function plus the
top-level `fetched_at` as the only real signal of how current it is.
For anything beyond "does a function with this slug/version exist,"
read the function's live source directly rather than trusting this
file. The `entrypoint_path` values are whatever local machine last
deployed that function (several are `/Users/user/...`, `/Users/USER/...`,
or dashboard-editor `/tmp/user_fn_...` paths) — informational only, they
don't resolve in this repo or on any other machine.

**Update process:** re-fetch the function list (Management API or
`supabase functions list` with the project linked), replace the
`functions` array and `fetched_at`, commit, and hand off via the
standard patch process like any other repo file.

**Resolved (2026-09-24, follow-up session): `purchase-airtime`/
`purchase-data` are a separate system, unrelated to `1.d`'s scope.**
The flag above was raised before `1.d.i.zi.x` was actually closed
(that RPC work — commits `95c4111`/`be329ea` — happened independently
and already predates this flag; no reconciliation was needed there).
Traced every caller of these two functions in both repos afterward, as
a pure follow-up. Function source itself isn't committed anywhere (no
`supabase/functions/` dir in either repo, and the manifest's
`entrypoint_path`s are local-machine/dashboard paths), so this is
caller-side inference only:

- `Edges_LandingPage/src/app/actions/reseller/orders/purchasePlan.ts`
  (the legacy reseller storefront action `1.d` replaces) calls
  `lizzysub-proxy`/`airtime_proxy` directly. It does **not** call
  `purchase-airtime`/`purchase-data`. Confirmed unrelated to the code
  path `1.d` rebuilds.
- `Edges_LandingPage/src/app/api/v1/purchase/{airtime,data}/route.ts` —
  a separate public developer API (API-key auth via `apiMiddleware`,
  not session auth) — calls them, reading `reseller_base_plans` and
  reading/writing an `api_users.*` schema (`wallets`, `transactions`,
  `webhooks`, a `deduct_api_user_wallet` RPC, etc.). **`api_users` does
  not exist anywhere in `supabase/schema.sql`** — the dump only defines
  `auth`, `public`, and `storage` schemas; zero matches for `api_users`
  case-insensitively. Either that schema lives outside what gets
  dumped (unconfirmed) or this whole v1 API surface is non-functional
  against the live DB. Hardcoded to ₦, no country param regardless.
- `reseller-app/hooks/usePurchaseVTU.ts` — the mobile app's own
  storefront-customer purchase flow — also calls them, via
  `EXPO_PUBLIC_BIMBO_SUPABASE_URL` (same project: `delete-account`,
  which the mobile app also calls through this URL, is confirmed in the
  manifest as living in `jjyyfaxcwanrmiipzkoj`). Its payload
  (`storeSlug`, `planId`/`network`, `phoneNumber`, `transactionPin`,
  `userId`) has zero overlap with the v1 API's payload
  (`userId`, `userType: "api_user"`, `requestId`, no `storeSlug`/PIN) —
  same two edge functions, two structurally different, unrelated
  callers; whatever's inside them branches on payload shape. The mobile
  app has zero multi-country awareness (no `countryCode`, no
  `zendit`/`lizzysub` anywhere in that repo) — single-tenant-per-build,
  Nigeria-only, store identity baked in via `storeSlug`/
  `reseller-config.json` at build time.

**Net:** not `1.d`'s problem, doesn't block or inform `1.d.ii`'s
provider-dispatch work. `usePurchaseVTU.ts` is a live, working example
of a reseller-storefront *customer* purchase flow (wallet debit + PIN +
provider call) and may be worth a skim for shape/patterns despite being
Nigeria-only and hitting functions this task won't use. The `api_users`
schema gap is unrelated to Task 4 and is flagged here only so it isn't
rediscovered from scratch — not this pointer's problem to fix unless a
future task explicitly touches the v1 developer API.

## Handoff process for DB migrations & edge functions (Ubuntu environment)

This is a **separate handoff process** from the code-patch one above —
migrations and edge functions change live infrastructure (the Supabase
Postgres DB, deployed edge functions), not just repo files, so `git am`
alone isn't enough for them. A session producing a migration or edge
function should hand off **two things**:

1. **A normal `.patch` file** (built and applied exactly per the
   Standing handoff process above) that adds the migration's `.sql`
   file to `supabase/migrations/` (or the edge function's source) in
   the repo — so the change is version-controlled like everything else.
2. **A direct command block**, run separately by the user **inside the
   Ubuntu environment** (`proot-distro login ubuntu`, then
   `~/ubuntu-repos/Edges_LandingPage`), that actually applies the
   change to the live DB or deploys the function. This step is *not*
   part of `git am`/`git push` — it talks to Supabase directly.

### Pushing a migration directly to the DB

Run from `~/ubuntu-repos/Edges_LandingPage`, after that repo's patch
(step 1 above) has been applied so the migration file is in the
checked-out tree:

```bash
export PGPASSWORD='<current-db-password-from-dashboard>' \
       DBHOST='aws-0-eu-central-1.pooler.supabase.com' \
       DBPORT=5432 DBUSER='postgres.jjyyfaxcwanrmiipzkoj' DBNAME='postgres' && \
psql -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" \
     -v ON_ERROR_STOP=1 \
     -f supabase/migrations/<migration-file>.sql && \
echo "Migration applied: <migration-file>.sql"
```

- `-v ON_ERROR_STOP=1` makes `psql` abort on the first SQL error instead
  of plowing through the rest of the file — always include this for
  migrations.
- For a series of migrations that must run in order, chain them with
  `&&` in a single block (same pattern as the dump command), one
  `psql -f` per file, in filename order — don't rely on wildcard
  expansion (`-f *.sql`) since ordering isn't guaranteed that way.
- Same password rule as the dump process: get the current password from
  the Supabase dashboard each time, type it directly into the Ubuntu
  terminal, never paste it into a chat session or commit it anywhere.
- If `psql` isn't installed yet in this Ubuntu environment, it comes
  from the same package as the dump tooling:
  `apt-get update && apt-get install -y postgresql-client` (no `sudo`
  needed — the Ubuntu proot shell is already root).
- There's no automatic rollback — for anything non-trivial, take a
  fresh `pg_dump` (per the Task 1 process) immediately before applying
  a migration, so there's a known-good restore point if it goes wrong.

### Deploying an edge function — CONFIRMED WORKING (2026-10-04)

Edge functions are deployed through the **Supabase CLI**, not `psql` —
needs a Supabase access token, separate from the DB password above.
Interactive `supabase login` opens a browser flow that doesn't work
well in the headless Ubuntu/proot shell — **use the token-env-var method
instead**, confirmed working:

```bash
npm install -g supabase          # one-time; ~4 min, installs to a global npm prefix
supabase --version               # sanity check

# Get a token from the dashboard (Account → Access Tokens → Generate
# new token) and export it directly in the terminal — never put the
# token in a patch, a chat, or a committed file.
export SUPABASE_ACCESS_TOKEN='<your-access-token>'

supabase projects list           # confirms the token works; lists both
                                  # Edges projects (cenhzollmgcbipxfkljr
                                  # = "Edges", jjyyfaxcwanrmiipzkoj =
                                  # "Edges_network" — the one every
                                  # other part of this doc targets)

cd ~/ubuntu-repos/Edges_LandingPage
supabase link --project-ref jjyyfaxcwanrmiipzkoj
                                  # did NOT prompt for the DB password
                                  # this run, unlike psql — don't assume
                                  # it never will

supabase functions deploy <function-name>
                                  # repeat per function; automatically
                                  # bundles anything the function
                                  # imports from supabase/functions/_shared/
```

A `WARNING: Docker is not running` line is expected and harmless — the
CLI falls back to remote bundling. The `Deployed Functions on project
<ref>: <name>` line is the actual success confirmation; check for that,
not the absence of errors.

**Functions called by an external service (webhooks) must be deployed
with `--no-verify-jwt`** — e.g. `supabase functions deploy accragh-webhook
--no-verify-jwt` — because the sender has no Supabase JWT; such a
function must authenticate the request itself (HMAC signature). The
app-called purchase functions keep the default JWT check.

**Setting a new secret** (edge function env var, e.g. a new provider's
API key) is a separate command, same auth:

```bash
supabase secrets set SOME_KEY='<real-value>' --project-ref jjyyfaxcwanrmiipzkoj
supabase secrets list --project-ref jjyyfaxcwanrmiipzkoj   # confirm by
                                  # name — lists digests, never the real
                                  # values, safe to paste that output
                                  # anywhere including chat
```

First real use of all of this: deploying `global-purchase-data`/
`global-purchase-airtime` and setting `ACCRAGH_API_KEY`/`ZENDIT_API_KEY`
for Task 4's `1.d.iii` (see below) — both succeeded first try with the
sequence above.

## Two working environments, same repos (standing rule)

The user works across **two separate environments on the same Android
device**, and each maintains its **own independent clone** of both
repos — this is intentional, not a mistake to "fix" by consolidating:

| Environment | Purpose | Clone location |
|---|---|---|
| Termux (native) | Day-to-day coding, patch review, `git am` + `git push` per the standing handoff process above | `~/Edges_LandingPage`, `~/reseller-app` |
| Termux → Ubuntu (`proot-distro login ubuntu`) | DB migrations, Supabase edge functions, `pg_dump`/`pg_restore` — anything needing a full Ubuntu userland (e.g. `postgresql-client` isn't readily available in native Termux) | `~/ubuntu-repos/Edges_LandingPage`, `~/ubuntu-repos/reseller-app` |

Migrations and edge functions have their own handoff process (see
**"Handoff process for DB migrations & edge functions"** above) since
they involve a direct-to-Ubuntu command in addition to the usual patch
— don't route those through the plain code-patch process alone.

Do not try to symlink or share the working tree between the two — they
are deliberately separate git clones of the same GitHub repos. Any
session working inside Ubuntu should:

1. Log in: `proot-distro login ubuntu` (adjust if a different
   proot/chroot method was used to set up Ubuntu).
2. If cloning for the first time in this environment:
   ```bash
   mkdir -p ~/ubuntu-repos && cd ~/ubuntu-repos
   git clone https://github.com/Edges-Enterprise/Edges_LandingPage
   git clone https://github.com/Erudite885/reseller-app
   ```
3. Either way (fresh clone or existing one), follow the **Session
   bootstrap** steps above in *each* repo under `~/ubuntu-repos/` to
   land on the latest commit of the latest branch — the bootstrap rule
   applies per-environment, independently, since Termux-native and
   Termux-Ubuntu are unrelated working copies that can drift out of
   sync with each other.
4. Install anything Ubuntu-specific once per environment, e.g.:
   ```bash
   apt-get update && apt-get install -y postgresql-client
   ```
   (No `sudo` needed inside this proot Ubuntu — the shell is already
   root.)

## Repos in scope

| Repo | Role | Branch | Path (this sandbox) |
|---|---|---|---|
| [Edges_LandingPage](https://github.com/Edges-Enterprise/Edges_LandingPage) | Web app (Next.js) — **master handover lives here** | `handover/supabase-dump` | `/home/claude/Edges_LandingPage` |
| [reseller-app](https://github.com/Erudite885/reseller-app) | Mobile app (Expo/React Native) for the same product | `handover/supabase-dump` | `/home/claude/reseller-app` |

Both repos talk to the **same Supabase backend** (one project, two clients):

- Web env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
  (`src/lib/supabase/client.ts`, `server.ts`, `admin.ts`)
- Mobile env vars: `EXPO_PUBLIC_BIMBO_SUPABASE_URL`, `EXPO_PUBLIC_BIMBO_SUPABASE_PUBLISHABLE_KEY`
  (`lib/supabase.ts`)
- Same underlying Postgres project — different naming per client, same host/project ref.

Cross-reference: the mobile repo's handover pointer is at `HANDOVER.md` in
`reseller-app` on branch `handover/supabase-dump`. It links back here.

---

## Task 1 — Supabase direct DB dump (both repos, shared backend)

**Status: RESOLVED, one deliberately-deferred item remains (as of
2026-09-09).** Dump pipeline built and verified, `.gitignore` fixed,
`schema.sql` committed, drift check run (result: non-overlap, see
below), long-term storage decided (Ubuntu-side, see Open questions),
and `supabase/rpc/**` scaffold removed as dead. The only thing not
"done" is password rotation — that's an explicit decision to defer
until project completion, not an oversight; see the connection-details
note below before touching it.

**Chained reminder — surface this right after the password-rotation
one, not before, not instead of it.** Once the DB password has
actually been rotated, also raise Task 2's deliberately-unaddressed
follow-up: `getApplicationDraft.ts` / `saveApplicationDraft.ts`
reference a `reseller_applications` table/columns that don't exist in
the live schema (see Task 2's "Unrelated finding" section below).
It's inert today — only reachable from commented-out dead code in
`ApplicationWizard.tsx` — so there's no urgency forcing it ahead of
the password item; it's just parked here so it surfaces at the same
natural checkpoint (project wrap-up) rather than getting lost. Same
resolution options as when it was first found: fix the table/columns
to actually implement draft-saving, or delete the dead code — a
product/priority call, not decided here.

### Context
Since both apps share one Supabase Postgres backend, we only need **one**
dump pipeline, not one per repo. We're doing this via a direct Ubuntu
`pg_dump`/`pg_restore` flow rather than the Supabase CLI, so it can run
on any plain Ubuntu box/CI runner without a Supabase CLI install/login.

### What's already done in this session
- Created branch `handover/supabase-dump` in both repos (local to this
  sandbox — not yet pushed to GitHub; pushing needs a session with git
  push credentials for both repos).
- Verified `postgresql-client` (pg_dump v16) installs cleanly on Ubuntu
  via `apt-get install postgresql-client` (uses `archive.ubuntu.com` /
  `security.ubuntu.com`, both reachable).
- Wrote the dump script (the "patch" for this task):
  **`scripts/supabase_dump.sh`** (this repo, same branch).
  It produces, per run, in a timestamped folder under `supabase/dumps/`:
  - `schema.sql` — DDL only (public/auth/storage schemas), safe to review/commit
  - `data.sql` — row data (public schema), plain SQL inserts
  - `full.dump` — `pg_restore`-ready custom-format dump
  - `roles.sql` — role defs, best-effort (hosted Supabase often blocks this)

### Status update — dump run confirmed (2026-09-08)

Ran successfully inside the Ubuntu environment at
`~/supabase-dumps/2026-09-08_033557/`:

| File | Size |
|---|---|
| `schema.sql` | 318,536 bytes |
| `data.sql` | 10,926,262 bytes (~10.4 MB) |
| `full.dump` | 1,673,152 bytes (~1.6 MB) |

All three files are non-trivial in size, consistent with a real dump
rather than an empty/failed one. Connection used the resolved pooler
details above (host/port/db/user as documented; password supplied
directly in the Ubuntu terminal, not committed anywhere).

**`.gitignore` step done (2026-09-08):** `Edges_LandingPage`'s
`.gitignore` had a bug — `sz*.json` and `supabase/dumps/` were
concatenated onto a single line with no newline between them
(`sz*.jsonsupabase/dumps/`), so the `supabase/dumps/` pattern was never
actually active. Fixed and verified with a test file.
`reseller-app`'s `.gitignore` already had `supabase/dumps/` correctly
on its own line — no fix needed there.

**Still outstanding from the numbered steps below:** confirm the
password used for this run has been rotated (it was exposed in a chat
session earlier in this task), diff `schema.sql` against
`supabase/rpc/**` for drift, and decide on long-term dump storage (not
git) before this task can move from OPEN to closed.

**Update (2026-09-08, re-verification session): the drift diff is now
unblocked.** `supabase/schema.sql` is committed directly to this repo
(see "Schema snapshots" section above) and was re-verified as a real,
non-placeholder dump (318,536 bytes / 10,462 lines, valid `pg_dump`
header) on a fresh clone of `handover/supabase-dump`. Any session can
now just `git fetch`/`git pull` this repo and read
`supabase/schema.sql` directly to run the diff — no more need to `cat`
the file from the Ubuntu machine or paste dump output into chat. The
diff itself still hasn't been run by anyone yet; that's the next
concrete step. Also re-confirmed on this same clone: `data.sql` and
`full.dump` are correctly absent from git (per the absolute rule
below), and both repos' `.gitignore` entries for `supabase/dumps/` are
correct and were re-tested live (create a file under
`supabase/dumps/`, run `git check-ignore -v` on it, confirm it matches
before removing the test file).

To unblock the drift check, run this in the Ubuntu environment and
share the output with whichever session is doing the diff:

```bash
cat ~/supabase-dumps/<timestamp>/schema.sql
```

(Or, for a shorter/more targeted check instead of the full schema
dump, list just function definitions so they're easier to compare
against `supabase/rpc/**`:

```bash
export PGPASSWORD='<current-db-password-from-dashboard>' \
       DBHOST='aws-0-eu-central-1.pooler.supabase.com' \
       DBPORT=5432 DBUSER='postgres.jjyyfaxcwanrmiipzkoj' DBNAME='postgres' && \
psql -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" \
     -c "\df+ public.*" -P pager=off
```
)

### What the next session needs to do
1. Pull branch `handover/supabase-dump` on `Edges_LandingPage` — inside
   the **Ubuntu environment**, not native Termux (see "Two working
   environments" section above). `pg_dump` runs from
   `~/ubuntu-repos/Edges_LandingPage`.
2. Get real connection details from Supabase dashboard → Project Settings →
   Database. **Resolved as of the 2026-09-08 dump run (safe to reuse —
   these are not secrets on their own):**
   - Host: `aws-0-eu-central-1.pooler.supabase.com` (session-mode
     pooler — port 5432, not the 6543 transaction-mode pooler; session
     mode is required for `pg_dump` to work correctly)
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres.jjyyfaxcwanrmiipzkoj`
   - Password: **not stored here — get current value from Supabase
     dashboard each time, or from whoever last ran the dump.** If a
     password value ever gets pasted into a chat, the general rule is
     to treat it as compromised and rotate it immediately (Project
     Settings → Database → Reset database password).

     **Exception — explicit decision (2026-09-09):** for this project,
     the currently-exposed password is being kept in use deliberately
     until the project is completed, at which point it will be
     rotated. This is a known, accepted risk (not an oversight) —
     don't re-flag it as an open item or rotate it unprompted. See the
     log entry below for context.

3. **Direct command — run this inside the Ubuntu environment**
   (`~/ubuntu-repos/Edges_LandingPage`, after `proot-distro login ubuntu`).
   Setup + all three dumps combined into a single command (chained with
   `&&`, safe to paste as one block — if any step fails, the chain stops
   there):

   ```bash
   apt-get update && apt-get install -y postgresql-client && \
   export PGPASSWORD='<current-db-password-from-dashboard>' \
          DBHOST='aws-0-eu-central-1.pooler.supabase.com' \
          DBPORT=5432 DBUSER='postgres.jjyyfaxcwanrmiipzkoj' DBNAME='postgres' && \
   mkdir -p ~/supabase-dumps/$(date +%Y-%m-%d_%H%M%S) && cd $_ && \
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" --schema-only --no-owner --no-privileges --schema=public --schema=auth --schema=storage -f schema.sql && \
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" --data-only --schema=public --column-inserts -f data.sql && \
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" --format=custom --schema=public -f full.dump && \
   echo "Dump complete: $(pwd)"
   ```

   No `sudo` — the Ubuntu proot shell is already root. Fill in
   `PGPASSWORD` directly in the terminal, never in a chat session or a
   committed file. Output lands in
   `~/supabase-dumps/<timestamp>/schema.sql`, `data.sql`, `full.dump`.
   After running, verify with `ls -la ~/supabase-dumps/*/` — the
   multi-line pasted block can scroll past its own output, so confirm
   the three files exist (and check sizes look non-trivial) rather than
   assuming success from a clean-looking prompt return.

   `scripts/supabase_dump.sh` in this repo wraps the exact same three
   commands (plus a best-effort `pg_dumpall --roles-only`) if a
   reusable script is preferred over pasting the block above — both are
   equivalent, use whichever fits the session.

4. Confirm `schema.sql` matches what's under `supabase/rpc/**` in this repo
   (those are the hand-maintained RPC source files; the dump is the
   ground-truth snapshot for diffing/drift-checking against them).
5. Add `supabase/dumps/` to `.gitignore` in **both** repos before
   committing anything else on this branch (data dumps must never be
   committed as-is — see script's inline warnings).
6. Update this section with: date run, project ref used (no secrets),
   where the dump artifact was stored (e.g. private bucket / local only),
   and any schema drift found vs. `supabase/rpc/**`.
7. Mirror a short status note in `reseller-app`'s `HANDOVER.md` pointer
   file (it should just say "see master handover, Task 1" + current
   status, not duplicate the whole task).

### Schema-drift check against `supabase/rpc/**` — RUN (2026-09-08)

**Result: not "drift" — total non-overlap. Read this before touching
either the RPC scaffolding or the live functions.**

Method: extracted every `CREATE FUNCTION`/`CREATE OR REPLACE FUNCTION`
name from `supabase/schema.sql` (79 total: 61 in `public`, 4 in `auth`,
14 in `storage`), and compared against the expected function name for
each of the 51 files under `supabase/rpc/**` (filename minus `.sql`,
per the directory's own naming convention, e.g.
`rpc/dashboard/get_dashboard_summary.sql` → expects a function named
`get_dashboard_summary`).

**Finding 1 — every `supabase/rpc/**` file is empty (0 bytes).**
Checked all 51 files; every single one is 0 bytes. Git history
confirms they were created empty from the start (single commit
`7a2675b`, "terminal method of files creation" — i.e. `touch`-created
placeholders) and have never had content added since. These are not
"hand-maintained RPC source files" in the sense the earlier note in
this doc implied — they're an empty scaffold of intended filenames,
nothing more.

**Finding 2 — zero of the 51 expected function names exist in the live
DB.** Grepped `schema.sql` for each of the 51 names
(`generate_admin_report`, `get_admin_dashboard`,
`get_application_queue`, `detect_anomalies`, `approve_application`,
`get_dashboard_summary`, `get_earnings_report`, `deploy_ota`,
`publish_playstore`, `get_devices`, `check_kyc_compliance`, etc.) —
**none** appear anywhere in `schema.sql`, not even as a near-miss
naming variant. This isn't schema drift (an older version of a
function that changed); it's that these functions have never been
created in this database at all, per the current live schema.

**Finding 3 — the live DB's actual `public` functions are a different,
unrelated set**, centered on wallet/purchase/notification plumbing:
`create_purchase_order`, `deduct_reseller_cost`,
`process_airtime_purchase`, `process_data_purchase`,
`recalculate_reseller_wallet`, `update_wallet_after_sale`,
`get_global_reseller_dashboard_context`, `get_global_reseller_*`
(build status / customer growth / dashboard stats / performance
metrics / recent activity / revenue breakdown / top products),
`get_reseller_dashboard`, `get_reseller_balance`, plus a set of
`notify_*`/`handle_*`/`trigger_*` triggers. A couple are conceptually
adjacent to scaffolded names (`get_reseller_dashboard` vs.
`get_dashboard_summary`; `get_global_reseller_dashboard_context` vs.
`get_dashboard_context`) but are **not** the same function under a
different snapshot — different signatures, different bodies, no
renaming relationship visible in git history.

**Finding 4 — 7 filenames are duplicated across two `rpc/` subfolders**,
independent of the DB comparison: `complete_build.sql` (`build/` and
`publishing/`), `get_build_context.sql` (`build/` and `publishing/`),
`queue_app_build.sql` (`build/` and `publishing/`),
`update_build_status.sql` (`build/` and `publishing/`),
`get_store_context.sql` (`business/` and `store/`),
`generate_brand_assets.sql` (`business/` and `utils/`),
`validate_store_name.sql` (`business/` and `utils/`). Since both
files in each pair are empty, this isn't causing a conflict today, but
whoever eventually populates these should pick one canonical location
per function rather than filling in both copies.

**Resolved (2026-09-09): `supabase/rpc/**` was dead scaffolding, now
removed.** Product decision: the live Supabase DB is the only real
surface for this project — the 51-file scaffold under `supabase/rpc/**`
was never going to be built out. The entire `supabase/rpc/` directory
has been deleted in this session's commit (all 51 files, all empty,
confirmed via git history to have never held content — see Findings
1-4 above for the full record of what was removed and why, kept here
for future reference even though the directory itself is gone). This
also resolves Finding 4's duplicate-filename issue, since there's
nothing left to deduplicate.

### Open questions — status
- **Long-term dump storage: RESOLVED (2026-09-09).** Decision:
  `data.sql`/`full.dump` stay where they already land — on the Ubuntu
  side of the project (`~/supabase-dumps/<timestamp>/`), accessed
  there if/when needed. No S3/GCS bucket or separate encrypted volume
  is being set up. This is a deliberate choice, not a placeholder —
  don't re-flag it as undecided or migrate the dumps elsewhere without
  a new explicit decision. The absolute rule from the "Schema
  snapshots" section still applies unchanged: `data.sql`/`full.dump`
  never get committed to git, regardless of where they live on disk.
- Do we need `auth` schema **data** (not just schema) dumped too, or is
  schema-only sufficient for auth? Current script dumps auth schema
  structure only, no auth data. Still open — not addressed by either
  decision above.
- Confirm whether pooler port (6543, pgbouncer) or direct port (5432)
  should be used — direct port is generally required for `pg_dump`.
  Already answered in practice: session-mode pooler on port 5432 is
  what the 2026-09-08 dump run used successfully (see connection
  details above) — this line is stale and can be deleted next time
  someone edits this section.

---

## Delivery for this task

Already applied and pushed (both branches live on GitHub as of the log
entry below). Left here for reference — patch filenames for Task 1's
original setup commit were:

- `edges-landingpage_0001-add-handover-master-file-and-dump-script.patch`
- `reseller-app_0001-add-handover-pointer-file.patch`

Applied using the combined single-command form from the standing
handoff process at the top of this file.

## Task 2 — Android App toggle should default ON, not OFF (`[countryCode]` application flow)

**Status: RESOLVED.** No active pointer — Task 2 is closed. See
"Resolution summary" at the end of this section.

### Context
When a user applies for a storefront/app via `/[countryCode]/apply`,
the application wizard has an "Android App" toggle. Today it defaults
to **off** — the applicant has to explicitly turn it on. The desired
behavior is the opposite: **default ON**, and only off if the user
explicitly toggles it off themselves. Scope for this task is
**everything under the `[countryCode]` folder tree** (web repo) — the
older, separate onboarding path at `src/app/reseller/ResellerFormClient.tsx`
+ `src/app/actions/reseller/createReseller.ts` is a **different, legacy
flow** and is explicitly **out of scope** unless a later branch of this
task says otherwise.

### Full architecture (as currently understood)

```
1. Client-side application wizard (in scope, [countryCode]/apply)
   a. Initial form-state default (StoreConfigStep.tsx)
      i.  Confirm current behavior — DONE, see findings below
      ii. Implement the default-ON fix — DONE (2026-09-15)
          zi. Apply the one-line code fix — DONE, see findings below
          zo. Verify no other local re-init reintroduces `|| false`
              after the zi fix — DONE, see findings below (no fix
              needed; every re-init path spreads existing state)
      iii. Confirm draft load/save path preserves an explicit `false`
           from a previously-saved draft — DONE (2026-09-15). See
           findings below: **moot in practice** — the draft feature is
           dead code (commented out in `ApplicationWizard.tsx`), not
           currently reachable from the live wizard.
           zi. Inspect `getApplicationDraft.ts` (read path) — DONE
           zo. Inspect `saveApplicationDraft.ts` (write path) — DONE
   b. Submit-time serialization default (ApplicationWizard.tsx line 127:
      `String(formData.androidApp || false)`)
      i.  Confirm current behavior — DONE, see findings below (same
          `||`-can't-distinguish-unset bug pattern as `1.a`, one layer
          up in the submit handler)
      ii. Implement the default-ON fix — DONE (2026-09-16)
          zi. Apply the one-line code fix — DONE, see findings below
          zo. Verify no other spot re-derives `formData.androidApp`
              with its own `|| false` between wizard state and this
              submit line — DONE, see findings below (no fix needed;
              the only other reference is a plain truthy guard, not a
              re-derivation)
      iii. Confirm the resulting `"true"`/`"false"` string this line
           sends is read correctly by `submitApplication.ts` (branch 2
           below) with no further defaulting mismatch — DONE
           (2026-09-16), see findings below
           zi. Read `submitApplication.ts` line 40 and confirm its
               parsing logic against what `1.b` now always sends —
               DONE, no fix needed
           zo. Check for any other caller of `submitApplication`
               (besides `ApplicationWizard.tsx`) that might not send
               an explicit `androidApp` field at all — DONE, no other
               caller exists (only a re-export barrel references it)
   c. Reserved for UI copy (toggle label/hint) update — DONE
      (2026-09-16), see findings below: **no change made**, closed as
      not needed rather than force a cosmetic edit with no clear ask
   d. Reserved, nothing surfaced during 1.a-1.c — closing empty

1 is now fully closed (a, b, c, d all done or explicitly closed empty).

2. Server-side submission parsing default
   (submitApplication.ts line 40: `formData.get("androidApp") === "true"`)
   — DONE, resolved as part of `1.b.iii` above (same file/line,
   confirmed no fix needed since `1.b` guarantees a real boolean
   reaches this parse). Not duplicating the work — see `1.b.iii`
   findings.

3. Database column defaults
   a. Write & apply a migration setting `DEFAULT true` on both columns
      i.   Confirm current defaults — DONE (see Task 2's original
           findings above): both `public.global_reseller_applications.android_app`
           and `public.resellers.android_app` are `DEFAULT false`
      ii.  Write the migration file
           zi. Draft `supabase/migrations/20260916_default_android_app_true.sql`
               — DONE (2026-09-16)
           zo. Apply the migration to the live DB, refresh
               `supabase/schema.sql` — DONE (2026-09-17). Migration
               applied cleanly (`ALTER TABLE` x2, no errors). Fresh
               dump taken and committed directly (`fce05f6`) per the
               schema-snapshot direct-push rule.
      iii. Confirm no backfill happened — DONE (2026-09-17). Diffed
           `supabase/schema.sql` before (`c099f24`) vs. after
           (`fce05f6`) this session's changes. Outside Supabase's own
           managed `auth`/`storage` schemas (unrelated platform
           updates — new MFA/SCIM tables, nothing to do with this
           task), the *only* two `public.*` hunks in the entire diff
           are exactly `global_reseller_applications.android_app` and
           `resellers.android_app`, each `DEFAULT false` → `DEFAULT true`.
           Nothing else changed. Since this is a schema-only dump (no
           row data), there's no mechanism by which existing rows could
           have been altered by an `ALTER COLUMN ... SET DEFAULT` —
           confirmed by the diff being clean, not just by the SQL
           file's contents having no `UPDATE`.
   b. Not needed — a/i/ii/iii above already cover both columns found;
      no second migration required
   c. Not needed
   d. Not needed

3 is now fully closed.

4. Downstream consumers — DONE (2026-09-17), verification-only, no
   code changes anywhere:
   a. `PublishingPlans.tsx`: gates via
      `if (!application.android_app) return <disabled message>;` —
      reads the persisted DB value directly, no default logic of its
      own to worry about. New applications will now see the publishing
      UI by default instead of the disabled message, exactly as
      intended; existing `false` rows are untouched and still see the
      message, exactly as intended by `3.a.iii`'s guardrail.
   b. `ReviewStep.tsx`: plain read-only display —
      `data.androidApp ? "✅ Yes" : "❌ No"` — no default logic.

4 is now fully closed.

5. Closed — nothing turned up during 1-4 beyond the "Unrelated
   finding" below, which stays a separate, unaddressed item rather
   than expanding this task's scope.
```

### Unrelated finding — not part of Task 2, flagging so it isn't lost

While checking `1.a.iii`, found that `getApplicationDraft.ts` and
`saveApplicationDraft.ts` both query/write a table `reseller_applications`
with columns `application_data`, `current_step`, `draft_saved_at` —
**none of which exist in the live schema** (`supabase/schema.sql` only
has `global_reseller_applications`, with none of those columns). Every
call to either function would fail and be silently swallowed by their
own `catch` blocks. In practice this isn't live-affecting right now
because the only call sites, in `ApplicationWizard.tsx`, are entirely
**commented out** (lines 44–89) — the real, active `updateFormData` is
a plain in-memory merge with no persistence at all. So: dead code
pointing at a table that doesn't exist, currently harmless, but a
trap for whoever uncomments it later expecting it to work. Worth its
own task (fix the table/columns, or delete the dead code — a product/
priority call, not decided here) — not folded into Task 2 since it's
unrelated to the toggle default and would blur this task's scope.

### Findings from this session (1.a.i — DONE)

- `src/components/reseller/application/StoreConfigStep.tsx` line 115:
  ```ts
  androidApp: data.androidApp || false,
  ```
  This is the actual bug: `||` can't distinguish "never set" from
  "explicitly set to false" — both collapse to `false`. The fix is
  `??` (nullish coalescing), not a different boolean literal:
  ```ts
  androidApp: data.androidApp ?? true,
  ```
  This preserves an explicit `false` from a loaded draft while
  defaulting genuinely-unset values to `true`.
- Confirmed the toggle UI itself (`handleToggleAndroidApp`, the visual
  switch around line 1058) needs **no change** — it already just flips
  whatever the current value is; the bug is purely in the default, not
  the toggle mechanism.
- Confirmed `PublishingPlans.tsx`'s gating message ("Android App is not
  enabled...") is a read-only consumer of this flag, not a second
  default — no change needed there, just worth re-confirming after 1-3
  ship.
- Confirmed the legacy `src/app/reseller/` flow (`ResellerFormClient.tsx`
  / `createReseller.ts`) has the identical bug pattern
  (`formData.get("androidApp") === "true"`, no explicit default logic)
  but is **out of scope** per the task's stated `[countryCode]` boundary
  — noting it here so it isn't silently forgotten, not so it gets fixed
  as part of this task.

### Findings from this session (1.a.ii.zi and 1.a.ii.zo — DONE, 2026-09-15)

- Applied the fix at `1.a.ii.zi`: `StoreConfigStep.tsx` line 115 now
  reads `androidApp: data.androidApp ?? true,`. Verified the diff is
  exactly this one line (the file has a large amount of dead,
  commented-out historical code with the same string in it — confirmed
  only the live line 115 changed, via `git diff` and line-targeted
  `sed`, not a text-match `str_replace` which would have hit multiple
  occurrences).
- Checked `1.a.ii.zo` (no other local re-init undoes the fix) by
  reading every `setFormData`/`onChange` call site in
  `StoreConfigStep.tsx`:
  - The three `onChange(...)` calls (proceed-to-next-step handler) all
    spread `...formData` first, so `androidApp` always flows to the
    parent intact regardless of whether the user touched the toggle.
  - `removeLogo`'s `setFormData` spreads `...formData`, doesn't touch
    `androidApp`.
  - `handleToggleAndroidApp` spreads current state — normal toggle,
    unaffected by the fix.
  - No `key` prop forces an unexpected remount; even on a normal
    step-navigation remount, the component re-initializes from parent
    `data`, which by then already holds the correctly-synced value.
  - **Conclusion: no code change needed for `zo`.** Verification-only.

### Findings from this session (1.a.iii.zi and 1.a.iii.zo — DONE, 2026-09-15)

- `getApplicationDraft.ts` (`zi`) queries table `reseller_applications`,
  columns `application_data, current_step` — none of which exist in
  `supabase/schema.sql` (only `global_reseller_applications` exists,
  with none of those column names). The query would error and the
  function's own `catch` returns `null`.
- `saveApplicationDraft.ts` (`zo`) writes to the same nonexistent
  `reseller_applications` table with `application_data`, `current_step`,
  `draft_saved_at` — same story, errors caught and swallowed.
- **But this is moot for Task 2**: the only call sites for both
  functions are in `ApplicationWizard.tsx` lines 44–89, and that entire
  block is commented out. The real, active `updateFormData` (line 93)
  is `setFormData((prev) => ({ ...prev, ...stepData }))` — no
  persistence, no draft table involved, at all. So there is no live
  path today where a saved-draft `androidApp: false` could be
  reloaded and re-defaulted — the whole draft mechanism is inert.
- Logged as an **unrelated finding** (see above, not folded into this
  task): dead code referencing a nonexistent table is still worth
  fixing or removing at some point, just not as part of the toggle-
  default fix.

### Findings from this session (1.b.ii.zi and 1.b.ii.zo — DONE, 2026-09-16)

- Applied the fix at `1.b.ii.zi`: `ApplicationWizard.tsx` line 127 now
  reads `String(formData.androidApp ?? true)` (commit `a02ca8f`).
  Confirmed via `grep` that this exact string was unique in the file
  before editing — no commented-out duplicates to worry about here,
  unlike `StoreConfigStep.tsx`.
- Checked `1.b.ii.zo` (no other spot re-derives `formData.androidApp`
  with its own `|| false`) by finding every reference to
  `formData.androidApp` in the file: only one other hit, line 141 —
  `if (formData.androidApp && formData.notificationIconFile
  instanceof File)`, a plain truthy guard gating whether to attach the
  notification icon file. It's a *consumer* of the value, not a
  re-derivation with its own default. **Conclusion: no code change
  needed for `zo`.** Verification-only.

### Findings from this session (1.b.iii, 1.c, 2 — DONE, 2026-09-16)

- `1.b.iii.zi`: read `submitApplication.ts` line 40
  (`formData.get("androidApp") === "true"`). Traced the type: since
  `1.b.ii`'s fix guarantees `ApplicationWizard.tsx` always calls
  `.append("androidApp", String(...))` with a real boolean, the value
  reaching this line is always the literal string `"true"` or
  `"false"` — never `null`, never a `File`. `=== "true"` correctly
  parses both cases. **No fix needed.**
- `1.b.iii.zo`: searched for every reference to `submitApplication`
  in the repo — only `ApplicationWizard.tsx` (the caller) and
  `src/actions/reseller/application/index.ts` (a plain re-export
  barrel, `export { submitApplication } from "./submitApplication"`).
  No other caller exists. **No fix needed.**
- `1.c` (UI copy): read the toggle's label/hint —
  `t?.store?.androidApp || "Android App"` and
  `t?.store?.androidAppHint || "Get a branded APK in 3–5 business days"`.
  Neither string references "off by default" or an opt-in framing —
  the hint is purely about turnaround time. **Closed with no change**:
  updating copy with no specific product ask would be a judgment call
  outside this task's scope, not a bug fix.
- Branch **2** (server parsing default) resolves to the exact same
  file/line as `1.b.iii` — not duplicating the investigation; see
  above. **No fix needed.**
- `1` is now fully closed (`a`, `b`, `c`, `d`). Branch **2** is closed.
  Moved to branch **3** (DB column defaults) as the next real
  actionable item.

### Next atomic step — active pointer `3.a.ii.zo.x`

**Delivered:**
`supabase/migrations/20260916_default_android_app_true.sql`:
```sql
ALTER TABLE public.global_reseller_applications
    ALTER COLUMN android_app SET DEFAULT true;

ALTER TABLE public.resellers
    ALTER COLUMN android_app SET DEFAULT true;
```
Applied to the live DB (2026-09-17, `ALTER TABLE` x2, no errors).
Schema snapshot refreshed and committed (`fce05f6`). Diffed old vs.
new `schema.sql`: only these two `DEFAULT` values changed in the
entire `public` schema — no backfill, no unrelated drift.

### Resolution summary

Every branch of the full architecture (`1`-`5`) is closed:

| Branch | What | Result |
|---|---|---|
| `1.a` | `StoreConfigStep.tsx` initial state | Fixed: `?? true` |
| `1.b` | `ApplicationWizard.tsx` submit serialization | Fixed: `?? true` |
| `1.c` | Toggle UI copy | No change needed |
| `1.d` | (reserved) | Nothing surfaced |
| `2` | `submitApplication.ts` parsing | No change needed (already correct given `1.b`'s fix) |
| `3.a` | DB column defaults (both tables) | Fixed: migration applied, schema snapshot refreshed |
| `4` | Downstream consumers (`PublishingPlans.tsx`, `ReviewStep.tsx`) | No change needed, both already read the persisted value correctly |
| `5` | Catch-all | Nothing beyond the logged unrelated finding |

**Net effect:** a new application to `/[countryCode]/apply` now
defaults the Android App toggle to **on**; a user who explicitly
toggles it off still gets `false`, correctly, at every layer (client
state, submit serialization, and — for direct inserts bypassing the
app entirely — the DB column default). Existing resellers' data is
untouched.

**Known follow-up, deliberately not folded into this task:** the
dead-code/phantom-table finding in `getApplicationDraft.ts` /
`saveApplicationDraft.ts` (see "Unrelated finding" above) — still
open, needs its own task if/when someone wants to either fix or
delete the draft-save feature.

### Delivery for this task
- `1.a.ii.zi.x` — the one-line fix (commit `b04ae78`). Delivered via
  the normal Standing handoff process (patch + `git am` + `git push`).
- `1.a.ii.zo.x` — verification-only, no delivery needed.
- `1.a.iii.zi.x` / `1.a.iii.zo.x` — verification-only, no delivery
  needed (the "unrelated finding" is logged, not fixed, as part of
  this task).
- `1.b.ii.zi.x` — the one-line fix (commit `a02ca8f`). Delivered via
  the normal Standing handoff process.
- `1.b.ii.zo.x` — verification-only, no delivery needed.
- `1.b.iii.zi.x` / `1.b.iii.zo.x` — verification-only, no delivery
  needed.
- `1.c` / `1.d` / branch `2` — closed, no delivery needed (no code
  change made).
- `3.a.ii.zi.x` — the migration file (commit `c099f24`). Delivered via
  the normal Standing handoff process.
- `3.a.ii.zo.x` — applied directly by the user in the Ubuntu
  environment (not a patch — a live DB operation); schema snapshot
  refreshed and pushed directly (`fce05f6`) per the schema-snapshot
  direct-push rule.
- `3.a.iii` / branch `4` — verification-only, no delivery needed.

---

## Task 3 — Vercel build broken: empty admin/error.tsx, plus a much bigger scaffold problem (2026-09-17)

**Status: RESOLVED.** This was reactive incident response (a broken
production deploy), not a pre-scoped task run through the pointer
methodology — logged here in full for continuity, same as any other
task, but it didn't start with a `1-5/a-d/i-iii/zi-zo/x` breakdown
since the user pasted a live build failure needing an immediate fix,
not a planned piece of work.

### Context
User pasted a Vercel build log. The proximate crash:
`src/app/[countryCode]/admin/error.tsx` must be a Client Component.
Investigating revealed this was one symptom of a much larger, systemic
issue — see the new "Standing policy — empty/broken scaffold routes"
section above, which this task's findings directly produced.

### What was found and fixed (in the order encountered)
1. **`admin/error.tsx` was 0 bytes** — the real root cause. Written
   with real, working content matching the existing
   `dashboard/error.tsx` pattern.
2. **89 more empty Next.js special route files** (`page.tsx` x30,
   `layout.tsx` x28, `loading.tsx` x1, `route.ts` x30) across
   `admin/`, `dashboard/`, and `api/` — each would break the build in
   turn as Turbopack's type-checker reached them one at a time.
   Reproduced the full build locally (worked around this sandbox's
   lack of network access to `fonts.googleapis.com` with a temporary,
   fully-reverted local font stub + dummy `.env.local`, neither ever
   committed) to catalog every failure at once instead of one slow
   Vercel deploy per file. Per the user's explicit **Option A**
   decision: stubbed all 89 with honest "coming soon" placeholders
   (pages/layouts) or 501 "Not implemented yet" (API routes).
3. **4 real route handlers** using the pre-Next-15 synchronous
   `params` pattern — fixed mechanically:
   `config/[configId]/route.ts`, `wallet/fund/route.ts`,
   `webhooks/build/route.ts`, `webhooks/[countryCode]/payment/route.ts`.
4. **1 orphaned duplicate route**: `api/store/storeName/favicon/route.ts`
   — a literal `storeName` folder (missing brackets), so it never
   matched any real request URL; its own header comment even said it
   belonged at the bracketed path. Deleted — the correctly-bracketed
   version already exists among the 89 stubs.
5. **1 genuine type mismatch**: `payment/route.ts` passed a plain
   `string` where `PaymentGatewayType` was expected. Fixed using the
   exact type-assertion idiom already used elsewhere in the same
   module (`getPaymentGatewayByCountry`).
6. **`src/components/reseller/modals/` — an entire directory of
   orphaned dead scaffold**, confirmed via repo-wide import search
   (none of the 8 files are used anywhere): `CreateOrderModal.tsx`,
   `FundWalletModal.tsx`, `CreateCustomerModal.tsx`, `CreatePlanModal.tsx`,
   `EditPlanModal.tsx`, `PurchaseModal.tsx`, `SupportTicketModal.tsx`,
   `WithdrawModal.tsx`. Same pattern as `supabase/rpc/**` from Task 1.
   Two reviewed in real depth (`CreateOrderModal.tsx`: unresolved
   `plan.price` vs. `base_price`/`config.selling_price` ambiguity —
   a real-money field, not guessed at; `FundWalletModal.tsx`: calls
   `fundWallet(amount, paymentMethod)` positionally against a real
   action requiring `countryCode` and using `mobileMoney`, not
   `paymentMethod` — not a mechanical fix). The other 6 disabled on
   sight given the confirmed directory-wide pattern, flagged as
   "not yet reviewed in detail" rather than pretending they were
   checked as thoroughly as the first two. Renamed `.tsx` →
   `.tsx.disabled` (drops out of the TypeScript build glob without
   touching shared `tsconfig.json`), with a `README.md` in the
   directory explaining the pattern and the real re-enable process.
7. **Dead `config` export removed** from
   `src/app/api/webhooks/xixapay/route.ts` — a Pages-Router-style
   `export const config = { api: { bodyParser... } }` that App Router
   never reads at all; pure no-op that only produced a build warning.
   Confirmed App Router route handlers have no equivalent per-route
   body-size config (it's a platform/hosting-level concern instead).

### Verification
Full local `next build`, from the actual committed source (temporary
font/env stubs applied only for testing, then fully reverted — checked
via `git diff` afterward to confirm the real Google Font imports and
no `.env.local` are back in their original state before committing):
**0 errors, 0 warnings, all 72 static/dynamic pages generated.**

### One process note for future sessions
Partway through, an earlier revert of the temporary font stubs (used
to work around the sandbox's network restriction) didn't fully take —
a second round of stubbing was applied without reverting immediately
after, and `git status` caught it before anything was committed. Fixed
via `git checkout -- <files>` against `HEAD` rather than manual
reconstruction, then re-verified with a clean build from that exact
state. Lesson for next time: after any temporary local-only stub,
immediately verify with `git diff` (not just visual memory of having
reverted it) before treating the working tree as clean, especially
across multiple build iterations in the same session.

### Delivery for this task
Delivered as two patches, applied and pushed by the user
(`c21232f` — the fix; `8351a70` — this documentation). **Vercel deploy
on `handover/supabase-dump` confirmed green** by the user after push —
this task is fully closed, not just locally verified.

---

## Task 4 — Rebuild `[countryCode]/[storeName]` into a wallet/PIN/login customer storefront (replaces cart/checkout)

**Status: OPEN. Active pointer: `2.a.i.zo.x`** (`2.a` decomposed 2026-10-09 — see "Findings from this session (2.a decomposition)" below).

### Context

Full brief: `TASK-CUSTOMER-STOREFRONT-BRIEF.md` (attached by the user,
not committed to the repo — treat this HANDOVER.md section as the
authoritative, code-verified version of that brief going forward).
Summary: `[countryCode]/[storeName]` is currently a cart+checkout flow
(add items, fill a contact form, write a `pending` order — no auth, no
payment, no wallet). It needs to become a wallet/PIN/login storefront
matching `old-storeName` (the Nigeria-only legacy reference) exactly in
UI/behavior, but working correctly across every supported country.
Cart/checkout is removed entirely, not kept alongside.

**Locked-in scope decisions (do not re-litigate):**
- Cart/checkout removed entirely.
- Multi-country required: currency, providers/networks, phone
  validation, WhatsApp dial code must be country-driven.
- Customer storefront stays **data/airtime only** — no
  electricity/cable, even though `global_plans`/the reseller dashboard
  already support both.
- Translations needed for `en`/`fr`/`ar`/`es` (not `pt` — no configured
  country uses it yet).
- Funding model (confirmed by the user, see "Reality check" below):
  xixapay (currently NG only) uses virtual accounts; every other
  country uses mobile money via korapay, with flutterwave as the
  fallback for countries korapay doesn't cover.

### Reality check — what direct code inspection found vs. the brief's assumptions

The brief's own architecture sketch (§9) was explicitly a draft. Full
inspection of `old-storeName/StoreContent.tsx` (3920 lines, read in
full), the current `[storeName]/*` files, `supabase/schema.sql`, and
every server action the legacy flow touches surfaced several things
worth correcting or adding before locking in an architecture:

1. **`store_slug` uniqueness — resolved, not just "confirm this":**
   `global_reseller_applications_store_slug_key` is a plain
   `UNIQUE (store_slug)` constraint — **globally** unique, not scoped
   per country. The synthetic-email lookup can key on `store_slug`
   alone (matching legacy's `storeName`-only scoping), no compound
   `countryCode + storeName` key needed.

2. **A real, pre-existing bug in the current `[storeName]/page.tsx`:**
   it derives the network filter via `products.map(p => p.network)` —
   but `global_plans` has **no `network` column at all**; the actual
   column is `provider` (confirmed via the dashboard's
   `CreatePlanModal.tsx`, which stores network names like "MTN" into
   `provider`). This filter has always silently returned nothing. Not
   a bug to fix in isolation — this whole file is being replaced — but
   don't repeat the mistake in the rebuild.

3. **`global_reseller_stores` is dead schema.** A second table exists
   alongside `global_reseller_applications` (`application_id`,
   `reseller_id`, `store_name`, `store_slug` with its own separate
   `UNIQUE` constraint, `logo_url`, `brand_color`, `theme`,
   `is_active`) — but **zero code anywhere references it.** The real,
   live source of store identity is `global_reseller_applications`
   (confirmed by the current `page.tsx` actually querying it). Don't
   build against `global_reseller_stores`; flag it as unused schema if
   it comes up again, same pattern as `supabase/rpc/**` from Task 1.

4. **`global_customers` confirmed bare, exactly as the brief said** —
   `reseller_id, first_name, last_name, email, phone, address, city,
   state, country, status`. No `auth_user_id`, `auth_email`,
   `transaction_pin`. **Additionally found:** no `UNIQUE` constraint on
   `(reseller_id, email)` either — only a plain (non-unique) index on
   `email` and the PK on `id`. The migration needs to add this
   constraint (or enforce it at the application layer) for the
   multi-store-same-email model to actually prevent duplicate customer
   rows per store, not just add the auth columns.

5. **Virtual-account funding is real, but its true scope is narrower
   than "multi-country" suggests, and the user has confirmed the
   intended design:** only `xixapay` (currently: Nigeria only)
   implements `createVirtualAccount`, and it's built on Nigeria's BVN
   system (pulls a pre-verified BVN from a `waitlist` table — see
   `src/lib/payments/xixapay.ts` lines ~460-520). `korapay` and
   `flutterwave` have **no virtual-account method** — `korapay.ts` has
   never had one, `flutterwave.ts` only has it as dead, commented-out
   code. **This is by design, not a gap to fill**: per-country funding
   already branches correctly today for the *reseller's own* wallet in
   `src/app/[countryCode]/dashboard/wallet/FundWalletModal.tsx` — a
   real, working, multi-gateway component:
   - `isXixapay` → returns `null` (a different, virtual-account-style
     modal handles this case — for the reseller side that's presumably
     a separate legacy-style display, not this component; for the
     customer side we need the equivalent split).
   - `isKorapay`/`isFlutterwave` → collects a mobile money number (for
     Flutterwave and Korapay's "Direct API" mode) or nothing (Korapay's
     default checkout-redirect mode), hits
     `/api/reseller/${countryCode}/wallet/fund`, then either shows an
     STK-prompt message (Korapay Direct API) or redirects to a hosted
     checkout page (`window.location.href = data.data.redirectUrl`).
   - Backing action `src/actions/reseller/wallet/fundWallet.ts` already
     calls `getPaymentGatewayByCountry(countryCode)` generically and
     delegates to whichever gateway's `initiatePayment` — this pattern
     is the direct template for the customer-side equivalent.
   - `korapay.ts`'s `initiatePayment` already builds a hosted-checkout
     payload with `channels: ["mobile_money"]` / `default_channel:
     "mobile_money"` — confirms mobile money is already the real,
     working funding path for korapay countries, not something to
     build from scratch.
   **Practical implication:** the customer "Fund Wallet" modal is
   *not* a literal port of legacy's virtual-account-only modal — it
   needs the same `isXixapay` / `isKorapay` / `isFlutterwave` branch,
   reusing this exact pattern, customer-scoped instead of
   reseller-scoped.

6. **The purchase/fulfillment layer needs real new backend work, not
   just a wire-up — confirmed by reading `purchasePlan.ts` in full:**
   - `src/actions/reseller/orders/purchasePlan.ts` (the path under the
     *new* `src/actions/` tree) is **empty (0 bytes)** — no
     multi-country purchase action exists at all today.
   - The real, working implementation legacy actually uses is
     `src/app/actions/reseller/orders/purchasePlan.ts` (568 lines,
     `src/app/actions/` tree) — and it is deeply Nigeria/Lizzysub-
     specific: a hardcoded `NETWORK_MAP` (`MTN: 1, AIRTEL: 2, GLO: 3,
     "9MOBILE": 4`), a direct call to a Supabase Edge Function named
     literally `lizzysub-proxy` / `airtime_proxy`, and queries against
     **legacy tables** (`reseller_customers`, `reseller_customer_wallets`,
     `reseller_base_plans`, `reseller_plan_configs`,
     `reseller_transactions`, `reseller_customer_transactions`) — none
     of which are the `global_*` equivalents.
   - The RPCs it calls (`get_reseller_balance`, `deduct_reseller_cost`,
     `process_purchase_deductions`, `create_purchase_order`) are
     **confirmed legacy-table-bound**, not generic — e.g.
     `create_purchase_order`'s body does a plain
     `INSERT INTO reseller_orders (...)`, not `global_orders`. These
     are **not reusable as-is** for the multi-country flow; new
     parallel RPCs (matching the `global_*` naming convention
     established elsewhere, e.g. `deduct_global_reseller_cost`,
     `process_global_purchase_deductions`, `create_global_purchase_order`,
     `get_global_reseller_balance`) need to be written, mirroring the
     legacy ones' logic against `global_wallets`, `global_customer_wallets`
     (new), `global_orders`, `global_transactions`.
   - Fulfillment must also dispatch to the right upstream provider per
     country (`config.providers.data` / `.providers.airtime` — e.g.
     `lizzysub` for Nigeria, `zendit` for Senegal per
     `src/config/countries/sn.ts`), not hardcode a single provider.
     Confirm each configured provider's actual API shape before
     assuming they all take the same payload shape as Lizzysub's.

7. **`CountryConfig` already has more than the brief assumed**, which
   shrinks branch 2 (multi-country adaptations) considerably:
   - `phoneCode` (e.g. `"+234"`) already exists per country — WhatsApp
     dial-code prefixing is a direct config read, not a lookup to
     build.
   - `currency` / `currencySymbol` already exist per country — a
     generic formatter (symbol + `Intl.NumberFormat` or simple
     concatenation) replaces `formatNaira` directly, no new per-country
     data needed.
   - `paymentGateway.methods` (e.g. `["virtual_account", "card"]` for
     NG) already declares funding methods per country at the config
     level.
   - **Still genuinely missing:** any phone-number length/format
     validation field — `CountryConfig` has no such field today, only
     `phoneCode`. Legacy hardcodes an 11-digit check. A lightweight
     per-country min/max-length field (not a full regex library) is
     probably the right scope here — confirm this is sufficient rather
     than over-building it.
   - **Also missing:** a canonical *networks* list per country.
     Legacy hardcodes `["MTN", "AIRTEL", "GLO", "9MOBILE"]`; the
     multi-country version should derive the network/provider tab list
     from the reseller's actual `global_plans.provider` values (fixing
     the bug in finding #2), not a static per-country array — plans
     already carry this data, no new config needed.

8. **Two more orphaned/empty files found in this area, unrelated to
   the above but worth fixing/removing as part of general hygiene
   while working in this directory:**
   - `src/app/[countryCode]/[storeName]/StoreOrderConfirmation.tsx` —
     0 bytes, not imported anywhere. Will be moot once cart/checkout
     is removed (branch 4 below); no separate fix needed.
   - `src/actions/reseller/wallet/customerVirtualAccount.ts` (the
     `src/actions/` tree path) — 0 bytes, not imported anywhere; the
     real, working legacy version lives at
     `src/app/actions/reseller/wallet/customerVirtualAccount.ts`. The
     new multi-country customer wallet actions this task builds should
     probably land in the empty `src/actions/` path (matching where
     `fundWallet.ts`/`createVirtualAccount.ts`/`getPaymentGatewayByCountry`
     already live for the reseller side), not the legacy `src/app/actions/`
     tree.

### Full architecture

```
1. Backend infrastructure
   a. Schema migration
      i.   Add auth_user_id, auth_email, transaction_pin to
           global_customers; add a UNIQUE (reseller_id, email)
           constraint (finding #4) — DONE, see findings below
      ii.  Create global_customer_wallets (reseller_id, customer_id,
           balance, currency, total_spent) and
           global_customer_virtual_accounts (reseller_id, customer_id,
           account_number, bank_name, account_name, provider, status —
           mirroring global_virtual_accounts's shape, finding #5)
           zi. Draft the migration file covering i + ii together —
               DONE, see findings below
           zo. Apply to live DB (direct psql command per the
               migrations handoff process), refresh schema.sql
               snapshot — DONE, see findings below
      iii. Confirm no existing multi-country code path assumes
           global_customers' current bare shape in a way this
           migration would break — DONE, see findings below

   1.a is now fully closed (i, ii, iii all done).

   b. Auth actions — synthetic-email-per-store pattern from the
      legacy `registerCustomerToReseller`/`getCustomerAuthEmail`
      (confirmed exact mechanism above), adapted to global_customers,
      scoped by store_slug alone (finding #1)
      i.   registerCustomerToGlobalReseller (mirrors
           registerCustomerToReseller) — DONE, see findings below
           zi. Write the action — DONE
           zo. Verify field/table names against the live schema
               (post-migration) via a full project type-check — DONE
      ii.  getGlobalCustomerAuthEmail (mirrors getCustomerAuthEmail)
           zi. Write the action — DONE, see findings below
           zo. Verify against the live schema, same as 1.b.i.zo —
               DONE (same full-project type-check covered both)

   1.b.i and 1.b.ii are both fully closed.

      iii. Sign-up/sign-in handler wiring (mirrors handleAuth from
           old-storeName/StoreContent.tsx)
           zi. Write the client-side handler (calls
               registerCustomerToGlobalReseller /
               getGlobalCustomerAuthEmail + Supabase Auth
               signUp/signInWithPassword, mirroring handleAuth's
               control flow exactly) — DONE, see findings below
           zo. Verify against the new StoreContent.tsx's actual
               auth-state shape once that exists (branch 3.a) —
               DEFERRED, not blocking: this can't be meaningfully
               checked until 3.a exists, so it's flagged here rather
               than treated as the pointer. Whoever picks up 3.a
               should circle back and close this out as part of
               wiring useCustomerAuth in, not skip it entirely.

   1.b is now fully closed for pointer-advancement purposes (i, ii,
   iii.zi all done; iii.zo explicitly deferred to branch 3.a, tracked
   above so it isn't silently forgotten).

   c. Wallet & virtual-account/funding actions for customers
      i.   Customer wallet read/create (mirrors
           getCustomerWalletWithAccounts)
           zi. Write the action — DONE, see findings below
           zo. Verify against the live schema — DONE, see findings
               below

   1.c.i is fully closed.

      ii.  Customer virtual-account creation, xixapay-only (mirrors
           createCustomerVirtualAccount, BVN flow included —
           finding #5). Note flagged in 1.c.i's findings: legacy
           checks for an existing account via `auth_user_id` directly
           on the virtual-accounts table — `global_customer_virtual_accounts`
           has no such column (only `customer_id`) — resolve via a
           two-step lookup through `global_customers.auth_user_id`,
           or a follow-up migration, whichever turns out cleaner once
           actually writing this
           zi. Not yet decomposed — write the action
               x. <ACTIVE POINTER — see "Next atomic step" below>
           zo. Not yet decomposed — verify against the live schema
      iii. Not yet decomposed — customer mobile-money funding via
           fundWallet-equivalent + getPaymentGatewayByCountry, for
           korapay/flutterwave countries (mirrors the dashboard
           FundWalletModal.tsx pattern exactly — finding #5)
   d. Purchase action — new global RPCs + provider-dispatching
      purchase action (finding #6 — this is real new backend work,
      not a wire-up)
      i.   Not yet decomposed — write global_* RPC equivalents
           (deduct_global_reseller_cost, process_global_purchase_deductions,
           create_global_purchase_order, get_global_reseller_balance)
      ii.  Not yet decomposed — provider-dispatch layer (lizzysub,
           zendit, others per config.providers.data/.airtime — confirm
           each provider's actual API shape first)
      iii. Not yet decomposed — the purchase action itself (mirrors
           purchasePlan.ts's PIN-check/deduct/fulfill/record sequence)
           — DONE as edge functions, see findings below
      iv.  Webhook completion of PENDING async-provider orders (added
           after 1.d.iii found accragh/zendit are asynchronous)
           zi. AccraGH (NetFillGh) webhook handler — code DONE
               2026-10-05, see findings below; its manual deploy
               steps are listed there and are NOT yet confirmed done
           zo. Zendit webhook handler — code DONE 2026-10-06, see
               findings below; its manual deploy/console steps are
               listed there and are NOT yet confirmed done

2. Multi-country adaptations (smaller than originally scoped — finding #7)
   a. Currency formatter using config.currency/currencySymbol —
      DECOMPOSED 2026-10-09 (see findings below)
      i.   Shared storefront price formatter
           zi. Write src/lib/currency/formatStorePrice.ts — a pure
               function (amount, {currencySymbol, locale}) -> string
               x. DONE 2026-10-09
           zo. Verify: full-project tsc, plus a throwaway Node
               script comparing output against legacy formatNaira
               for NG and sample outputs for other countries
               x. <ACTIVE POINTER — see "Next atomic step" below>
      ii.  Adopt it in the [storeName] files that survive branch 4
           zi. StoreProducts.tsx — replace `{currencySymbol}` +
               `product.price.toLocaleString()` (lines ~598-599) and
               drop the `|| "₦"` fallback (line 50)
               x. Not yet started
           zo. StoreHero.tsx — same change (lines ~152-153, fallback
               at line 21)
               x. Not yet started
      iii. Closed by design, no work: StoreCart.tsx / StoreCheckout.tsx
           keep their own `|| "₦"` + `toLocaleString()` until branch
           4.a deletes them; the legacy `formatNaira` in
           src/lib/pricing/calculatePrice.ts stays (see findings)
   b. Network/provider tab list derived from global_plans.provider
      (fixes finding #2's bug) — not yet decomposed
   c. Phone validation — needs a new lightweight per-country field
      (min/max length), not yet decomposed
   d. WhatsApp dial-code prefixing using config.phoneCode directly —
      not yet decomposed, likely trivial

3. Frontend replacement
   a. StoreContent.tsx: drop cart/checkout state, add auth/wallet/PIN
      state (mirrors old-storeName's state shape, confirmed above)
   b. StoreHeader.tsx: legacy-style header behavior — note the
      *current* StoreHeader.tsx (2640 lines) already has auth-state
      checking, store-owner detection, install-banner logic, and a
      dark/light theme toggle + mobile hamburger menu **not in the
      legacy spec at all**. Confirm with a fresh look whether to
      extend this file or start clean before assuming which — it's
      wired in and live (imported by the current StoreContent.tsx),
      not orphaned, so this isn't a disable-on-sight case
   c. New modal components: sign-in/up (tabbed), fund wallet
      (branches by gateway per finding #5), create virtual account
      (xixapay only), support (WhatsApp deep link), purchase (+
      PIN-creation sub-flow with info tooltip)
   d. StoreFooter.tsx: legacy-style footer (current one is 44 lines,
      minimal — confirm scope needed)

4. Cleanup
   a. Retire StoreCart.tsx / StoreCheckout.tsx / cart-related types;
      remove the now-moot empty StoreOrderConfirmation.tsx (finding #8)
   b. Update page.tsx/layout.tsx data-fetching for the new actions;
      fix the network-derivation bug from finding #2 as part of this
   c. Remove now-dead category/translation-filter plumbing (confirm
      nothing else depends on it first)
   d. Reconcile store-theme.css against whatever the final visual
      approach is — brief's guidance: reuse the existing scaffolding,
      legacy file is a behavioral/layout reference, not a literal
      styling port

5. Verification & handoff
   a. Manual pass against old-storeName for behavioral parity, per
      country (including RTL for Egypt — legacy hardcodes
      left/right positioning throughout, e.g. pagination arrows at
      `left: -12`/`right: -12` — confirmed via direct inspection)
   b. Confirm no regressions to dashboard-side reseller flows sharing
      the same tables/actions (global_wallets, global_virtual_accounts,
      global_plans, the payment gateway layer)
   c. es storefront.json translation file needs creating (en/fr/ar
      exist at ~50 lines each; es is missing entirely; pt deferred)
   d. Update HANDOVER.md, produce patch(es) per the standing handoff
      process
```

### Findings from this session (1.a.ii.zi, 1.a.iii — DONE, 2026-09-19)

- **`1.a.ii.zi`**: drafted
  `supabase/migrations/20260919_customer_auth_wallet_schema.sql`
  (commit `cbe9f9e`). Covers `1.a.i` + `1.a.ii` together as one
  reviewable schema change: the three new `global_customers` columns,
  the new `UNIQUE (reseller_id, email)` constraint (with a pre-flight
  `DO` block that checks for existing duplicate pairs and raises a
  clear, named exception if any exist, rather than a cryptic
  constraint-violation error), and the two new tables — each mirroring
  `global_wallets`/`global_virtual_accounts`'s exact column shapes
  (verified via direct schema inspection) plus `customer_id`, with
  matching FK-cascade and indexing conventions.
- **`1.a.iii`**: checked every current reader/writer of
  `global_customers` (`createOrder.ts`, `getOrderDetails.ts`,
  `getCustomers.ts`, `createCustomer.ts`, `getCustomerDetails.ts`,
  `updateCustomer.ts`, plus the dashboard customer-management UI) —
  all reseller-dashboard-side "manually add a customer contact" flows,
  unrelated to the storefront rebuild. The only `INSERT` path
  (`createCustomer.ts`) already checks for and rejects a duplicate
  email before inserting, so the new `UNIQUE (reseller_id, email)`
  constraint matches existing behavior rather than introducing a new
  restriction. **Confirmed safe to apply.**
- Also noted, not fixed (out of scope for this pointer): the 13
  pre-existing "historical" migration files
  (`20250101_create_country_configs.sql` through
  `20250113_create_rpc_functions.sql`) are **all 0 bytes** — same
  scaffolded-but-never-filled-in pattern as everything else in this
  project. Doesn't block anything (migrations aren't Next.js route
  files, so they don't break builds), just noting it since it was
  found directly adjacent to this work.

### Findings from this session (1.a.ii.zo, 1.b.i, 1.b.ii — DONE, 2026-09-20)

- **`1.a.ii.zo`**: user applied the migration in Ubuntu (`ALTER TABLE`
  x2 / `CREATE TABLE` x2, no errors, pre-flight duplicate check passed
  silently — meaning zero existing `(reseller_id, email)` collisions).
  Pushed a refreshed `schema.sql` directly (`b13940f`). Diffed
  `schema.sql` before (`b25548e`) vs. after (`b13940f`): confirmed the
  *only* changes are the two new tables (with all their constraints
  and indexes) and the three new `global_customers` columns plus its
  new unique constraint — no other drift.
- **`1.b.i`**: wrote
  `src/actions/reseller/customers/registerCustomerToGlobalReseller.ts`
  (commit `dda6686`), mirroring legacy's `registerCustomerToReseller`
  logic against `global_*` tables. Two deliberate, documented
  deviations from a literal port: `global_customers.last_name` is
  `NOT NULL` (legacy's isn't) — uses an empty string rather than
  fabricating a surname; and the new customer wallet's `currency` is
  resolved via `getCountryConfig(reseller.country_code)` rather than
  left to the column's `USD` default, so a Nigerian customer's wallet
  doesn't silently show as USD.
- **`1.b.ii`**: wrote
  `src/actions/reseller/customers/getGlobalCustomerAuthEmail.ts`
  (commit `6ad1b85`), mirroring legacy's `getCustomerAuthEmail`. Uses
  `.maybeSingle()` instead of legacy's `.single()` for the
  might-not-exist customer lookup — more correct than relying on how
  `supabase-js` happens to behave when `.single()` finds no row and
  the caller doesn't check the error.
- Both new files verified via a full project `npx tsc --noEmit -p
  tsconfig.json` (not just an isolated single-file check, which can't
  resolve the `@/*` path aliases and would false-positive) — **0
  errors across the entire project**, both times.

### Findings from this session (1.b.iii.zi, 1.c.i — DONE, 2026-09-21)

- **`1.b.iii.zi`**: wrote `src/hooks/customer/useCustomerAuth.ts`
  (commit `e805e41`) — a standalone hook rather than inline in
  `StoreContent.tsx`, since branch `3.a` hadn't started yet at the
  time of writing (confirmed: still the untouched 208-line
  cart-based version). Preserves two legacy behaviors exactly: the
  synthetic-email-per-store signup pattern (now embedding `storeSlug`)
  and — easy to miss on a rebuild — **the store's own public
  customer-login form doubling as an owner-login shortcut**. Legacy
  checks `user_metadata?.store_name === storeName`; confirmed via
  `submitApplication.ts` that multi-country resellers' Supabase Auth
  accounts carry `store_slug` (not just `store_name`) in
  `user_metadata`, so the new hook checks `store_slug` instead —
  matching the scoping convention used everywhere else in this task —
  and redirects to `/${countryCode}/dashboard` instead of legacy's
  flat `/dashboard`. One deliberate interface deviation: legacy closes
  its login modal inline via component-local state; this hook takes an
  `onAuthSuccess()` callback instead, since it doesn't own modal state
  itself — whoever wires this into the new `StoreContent.tsx` should
  use that callback to close the modal, not assume the hook does it.
  `1.b.iii.zo` (verify against `StoreContent.tsx`'s actual auth-state
  shape) is **explicitly deferred, not done** — can't be meaningfully
  checked until branch `3.a` exists; flagged in the tree above so
  whoever picks up `3.a` circles back to it rather than it being
  silently dropped.
- **`1.c.i`**: wrote
  `src/actions/reseller/customers/getGlobalCustomerWallet.ts` (commit
  `d2a5f4d`) — a direct table-name mirror of legacy's
  `getCustomerWalletWithAccounts`, no country-specific adaptation
  needed (caller already resolves `customerId`/`resellerId`). Verified
  `1.c.i.zo` **properly** this time — not just a `tsc` pass (which
  doesn't validate Supabase column names against the live schema at
  all, since this codebase doesn't use strictly-typed generated
  Supabase types on `.from()` calls) but an explicit field-by-field
  cross-check against `schema.sql`'s actual `CREATE TABLE` column
  lists for both `global_customer_wallets` and
  `global_customer_virtual_accounts`. Every field the action selects
  matches exactly.
- **Found while writing `1.c.i`, not yet solved — flagged for
  `1.c.ii`**: legacy's `createCustomerVirtualAccount` checks for an
  existing account via `.eq("auth_user_id", user.id)` directly on the
  virtual-accounts table. `global_customer_virtual_accounts` has no
  `auth_user_id` column (only `customer_id`) — whoever picks up
  `1.c.ii` needs to either add that column via a follow-up migration
  or do a two-step lookup through `global_customers.auth_user_id`
  first. Noted now so it isn't rediscovered from scratch later.
- **Both new files verified via a full-project `tsc --noEmit`** (0
  errors both times) — same standing practice as the rest of this
  task, not an isolated single-file check.

### Findings from this session (1.c.ii.zi, 1.c.ii.zo — DONE, 2026-09-21)

- **`1.c.ii.zi`**: wrote
  `src/actions/reseller/customers/createGlobalCustomerVirtualAccount.ts`,
  mirroring legacy's `createCustomerVirtualAccount` (BVN/waitlist
  assignment, xixapay `createVirtualAccount` call, account + wallet
  persistence). Resolved the missing-`auth_user_id`-column issue
  flagged in the previous session's findings by **reordering** rather
  than adding a second query: legacy checks for an existing virtual
  account first (by `auth_user_id`) and resolves the customer record
  second; this version resolves the customer record first (by
  `auth_user_id` + `reseller_id`, which `global_customers` does have)
  and then checks for an existing account by the resulting
  `customer_id` — same two lookups legacy does, just swapped order, no
  extra query and no follow-up migration needed.
- Two more deliberate deviations from a literal port, both because the
  new tables are slimmer than legacy's:
  - `global_customers` has no `bvn` column (legacy's
    `reseller_customers.bvn` does), so this version always draws a
    fresh waitlist entry rather than checking for a previously-assigned
    BVN first. Confirmed safe: the existing-active-account check above
    already prevents a second call once an account exists, so legacy's
    "customer already has a BVN but no account" branch has no live
    trigger path here.
  - `global_customer_virtual_accounts` has no `customer_email`/
    `customer_name`/`customer_phone`/`customer_bvn`/`customer_nin`
    columns (legacy's `reseller_customer_virtual_accounts` has all
    five) — only `bank_name`/`account_number`/`account_name`/
    `bank_code`/`account_type`/`tracking_reference`/`provider`/`status`
    are stored. Not proposing a migration for this within this atomic
    step; flagging here in case support/lookup tooling later needs to
    see which BVN/waitlist identity backs a given account.
- Also switched to the server-only `XIXAPAY_API_KEY`/
  `XIXAPAY_SECRET_KEY`/`XIXAPAY_BUSINESS_ID` env vars (matching
  `src/lib/payments/xixapay.ts`'s convention) instead of legacy's
  `NEXT_PUBLIC_XIXAPAY_*` names, which unnecessarily expose these to
  the client bundle for a value only ever read inside a `"use server"`
  action. Not fixing legacy's version (out of scope for this task) —
  just not repeating it here. **Needs confirming these non-public env
  vars are actually set in the deployment environment** — they already
  are for `src/lib/payments/xixapay.ts` to work at all today, so this
  should be a non-issue, but wasn't independently re-verified this
  session.
- **`1.c.ii.zo`**: verified via a full-project `npx tsc --noEmit -p
  tsconfig.json` (0 errors) **and** a manual field-by-field cross-check
  of every column referenced against `schema.sql`'s actual `CREATE
  TABLE` definitions for `global_customers`,
  `global_customer_virtual_accounts`, `waitlist`,
  `global_reseller_applications`, and `global_customer_wallets` — same
  standing practice as `1.c.i.zo`. All fields match; the `waitlist`
  `status`/`assigned_to_type` values used (`"pending"`/`"used"`,
  `"customer"`) match that table's `CHECK` constraints exactly.

1.c.ii is now fully closed (zi and zo both done).

### Findings from this session (1.c.iii.zi — DONE, 2026-09-21)

- **Confirmed the open question from the previous session**:
  `global_transactions` has **no `customer_id` column at all** (only
  `reseller_id`, `wallet_id`) — it's reseller-only, not something a
  customer-scoped row can be squeezed into. Checked legacy for the
  actual precedent rather than guessing: legacy doesn't share
  `reseller_transactions` between resellers and customers either — it
  has a **dedicated** `reseller_customer_transactions` table. Followed
  that precedent: drafted
  `supabase/migrations/20260921_customer_transactions_schema.sql`
  adding a new `global_customer_transactions` table, mirroring
  `reseller_customer_transactions`'s shape (type/fee/net_amount/
  previous_balance/new_balance/reference/order_id/plan_id/status/
  metadata/description), `text` instead of `character varying` to
  match this task's other new tables. No separate currency column,
  matching both legacy's table and `global_transactions` — the owning
  wallet is the source of truth for currency.
- **Unrelated to this step, but flagged while re-reading the `1.a`
  migration for reference — worth knowing before branch `1.d`
  (purchase action) is built**:
  `global_customer_virtual_accounts` has a
  `UNIQUE (reseller_id, customer_id)` constraint, meaning a customer
  can only ever have **one** virtual account per store. Legacy's
  `reseller_customer_virtual_accounts` has no such constraint and its
  UI (`old-storeName`'s Fund modal) explicitly loops over an array of
  accounts, because `createCustomerVirtualAccount`'s
  xixapay call can return multiple `bankAccounts` in one response.
  Not a live bug today — `createGlobalCustomerVirtualAccount.ts`
  (`1.c.ii`) only ever requests one bank code (`["20867"]`, PalmPay),
  so only one row is ever inserted per customer — but the constraint
  would need loosening (drop the uniqueness, key the "existing active
  account" check off `status` instead, same as legacy already does) if
  this ever expands to request more than one bank per customer.
  Documenting now so it isn't rediscovered from scratch; not fixing it
  as part of this session since it isn't blocking anything today.

### Findings from this session (1.c.iii.zo — DONE; 1.c.iv.zi — DONE, 2026-09-21)

- **`1.c.iii.zo`**: user applied the migration directly in Ubuntu and
  pushed a refreshed `schema.sql` (`f14d676`). Diffed before/after:
  confirmed only the intended `global_customer_transactions`
  table/indexes/FKs landed. `1.c.iii` is now fully closed.
- **`1.c.iv.zi`**: wrote
  `src/actions/reseller/customers/fundGlobalCustomerWallet.ts`,
  mirroring `fundWallet.ts`'s `getPaymentGatewayByCountry(countryCode)`
  pattern, customer-scoped. Scoped deliberately to **mobile-money
  countries only** (korapay/flutterwave) — xixapay-gateway resellers
  get an explicit early error telling the caller to use the virtual
  account flow (`1.c.ii`) instead, since that's how customer funding
  already works for those countries (a persistent account to transfer
  into, not an initiate-payment call). This is a
  `config.paymentGateway.provider` branch, not a hardcoded country
  check.
- **Real pre-existing bug found and deliberately not repeated**: the
  reseller-side `handleSuccessfulDeposit.ts` calls
  `.update({ status: "completed", completed_at: ..., provider_reference: ... })`
  on `global_transactions` — but that table has **neither a
  `completed_at` nor a `provider_reference` column**. Confirmed against
  `schema.sql` directly. This means that update almost certainly fails
  at runtime today (PostgREST rejects unknown columns), so **reseller
  wallet deposits via Flutterwave may never actually get marked
  completed** — worth someone independently confirming and filing as
  its own bug outside this task, since fixing legacy reseller code is
  out of scope here. For the new customer version, `metadata` (jsonb)
  is used to store the equivalent data instead of repeating the same
  mistake, since `global_customer_transactions` (mirroring
  `reseller_customer_transactions`) also has no dedicated columns for
  either value.
- Verified `1.c.iv.zi` with a full-project `tsc --noEmit -p
  tsconfig.json` (0 errors); every table/column referenced
  (`global_customers`, `global_customer_wallets`,
  `global_customer_transactions`) cross-checked against `schema.sql`
  directly since this table was only added this session and hasn't
  been exercised by any other code yet.
- **Important gap, not yet addressed**: this action only *initiates* a
  deposit — nothing currently marks a `global_customer_transactions`
  row `completed` or credits `global_customer_wallets` on a successful
  webhook callback. The reseller-side equivalent
  (`handleSuccessfulDeposit.ts`) is only wired into
  `src/app/api/webhooks/flutterwave/route.ts`, not korapay's or
  xixapay's routes either, and none of the three webhook routes have
  any concept of "this might be a customer transaction, not a
  reseller one" yet. Until this is built, customer wallet funding via
  this action will initiate a payment but the wallet balance will
  never actually update. This is real, necessary follow-up work, not
  an optional polish item — flagged as the very next pointer below,
  not deferred indefinitely.

### Findings from this session (1.c.v.zi — DONE, partial scope; 2026-09-21)

Reading all four webhook routes before writing anything (per the
previous session's own instruction) surfaced a much messier picture
than the architecture outline assumed:

- **Four different, mutually-inconsistent completion implementations
  exist**, not one shared function to extend:
  - `korapay/route.ts` — fully inline, own fee calc via
    `getFeeBreakdown`.
  - `flutterwave/route.ts` — fully inline, own flat-2.5%-fee calc.
    **Imports `handleSuccessfulDeposit` but never calls it** — dead
    import.
  - `xixapay/route.ts` — fully inline, different shape entirely (no
    pre-existing pending-transaction model — matches by `reference`
    with a fallback to `metadata->>provider_reference`, includes a
    first-deposit-bonus branch).
  - `[countryCode]/payment/route.ts` — a fourth, distinct
    implementation calling an `update_wallet_after_deposit(uuid,
    numeric)` RPC. Its internal file-header comment still says
    `src/app/api/reseller/[countryCode]/webhooks/payment/route.ts`
    (a different path than where it actually lives), and that RPC is
    otherwise only used by the **legacy** `src/app/actions/reseller/wallet/`
    tree, not the new `src/lib/payments/` gateway system. Confirmed
    via `korapay.ts`/`flutterwave.ts` that their `notification_url`/
    `callback_url` point at `/api/webhooks/korapay` and
    `/api/webhooks/flutterwave` respectively, **not** this
    country-scoped route — so this route is likely a stale/orphaned
    holdover, not something live traffic hits today. Not touched this
    session; flagging for someone to confirm and probably delete
    rather than assuming.
  - `src/actions/reseller/wallet/handleSuccessfulDeposit.ts` itself is
    **confirmed dead code** — nothing calls it. Removed the unused
    import referencing it from `flutterwave/route.ts` while already
    editing that file (trivial dead-code removal, not a behavior
    change — did not touch the actual completion logic there).
- **Real, likely-live bug, separate from anything Task 4 introduced**:
  `korapay/route.ts`, `flutterwave/route.ts`, and
  `[countryCode]/payment/route.ts` **all three** update
  `completed_at`/`provider_reference` columns that don't exist on
  `global_transactions` (same issue previously flagged only for
  `handleSuccessfulDeposit.ts` — it's actually in three more places).
  This means **reseller wallet deposits via any of these three paths
  may never actually get marked `completed` today.** Confirmed by
  reading `schema.sql` directly, not just this file. Out of Task 4's
  scope to fix (it's reseller-side, pre-existing, unrelated to the
  customer storefront) — flagging clearly here so it doesn't get
  missed, since it's a real production-money issue, not a documentation
  nitpick.
- **Scope-splitting decision for this atomic step**: the
  korapay/flutterwave completion path (what `fundGlobalCustomerWallet.ts`,
  1.c.iv, actually produces — an `initiate` call followed by a webhook
  matching a pending row by `reference`) is architecturally
  straightforward to extend. The **xixapay virtual-account path is
  not** — a customer transfer into their persistent VA (`1.c.ii`) has
  **no pre-existing pending transaction row to match against at all**;
  `createGlobalCustomerVirtualAccount.ts` never creates one when the
  account itself is created. Attribution would need to key off the
  **receiving account number** against `global_customer_virtual_accounts`
  instead, which is a different lookup shape, not a small addition to
  what's built here. Splitting this out rather than trying to also
  handle it in the same step, per the same judgment already used for
  `1.c.iii`.
- **Delivered this session**: `handleSuccessfulCustomerDeposit.ts`
  (shared completion action), wired into `korapay/route.ts` and
  `flutterwave/route.ts` — each route now tries `global_transactions`
  first (existing reseller behavior, untouched), and falls back to
  `global_customer_transactions` before returning 404, branching to
  the new customer completion path with the same per-gateway fee
  calculation each route already does for resellers. Deliberately does
  **not** repeat the `completed_at`/`provider_reference` bug — stores
  the equivalent values inside `metadata` instead, since
  `global_customer_transactions` has no dedicated columns for either
  (same reasoning as `1.c.iv`'s findings).
- Verified with a full-project `tsc --noEmit -p tsconfig.json` (0
  errors) and a manual field-by-field cross-check of every table/column
  referenced in the new handler and both edited routes against
  `schema.sql`.

### Findings from this session (1.c.vi.zi, 1.c.vi.zo — DONE, 2026-09-21)

- **Product decision confirmed** (from the user, not inferred): the
  first-deposit bonus is reseller-only, and only for app-initiated
  deposits even then. Customers never get one.
- Implemented the xixapay customer virtual-account attribution branch
  in `xixapay/route.ts`: when no pending row is found in
  `global_transactions` by reference or `provider_reference` (the
  reseller top-up path, via `fundWallet.ts`'s `initiatePayment` call —
  confirmed this is the only thing that creates a pending row for
  xixapay), falls back to matching the webhook's
  `metadata.receiver.account_number` against
  `global_customer_virtual_accounts.account_number`, then **inserts**
  a new completed `global_customer_transactions` row directly (there's
  nothing pending to update, unlike every other branch in this file).
  Confirmed the `receiver.account_number` field name by finding it
  already used elsewhere in `xixapay.ts` (line 368) rather than
  guessing at xixapay's payload shape.
- **Idempotency added deliberately**: since there's no pre-existing
  pending row for this path to guard against a webhook retry the way
  `transaction.status === "completed"` does for the reseller path, this
  branch checks `global_customer_transactions` by `reference` first
  and returns early if a row already exists, before crediting anything.
- **Also fixed, while already editing this file**: the existing
  reseller-side first-deposit bonus check had **no source gating at
  all** — it fired for any deposit, not just app-initiated ones, unlike
  the equivalent check in `[countryCode]/payment/route.ts` (`if (source
  === "app")`). Added the same gate here, using
  `transaction.metadata?.source`, per the product decision above. Not
  a customer-side change — this only affects the pre-existing
  reseller top-up path, and only makes the bonus fire *less* often
  than before (a real, direct behavior change, delivered because it
  was explicitly requested, not left silently as a guess).
- Verified with a full-project `tsc --noEmit -p tsconfig.json` (0
  errors) plus a manual field-by-field cross-check of every table/
  column referenced (`global_customer_virtual_accounts`,
  `global_customer_wallets`, `global_customer_transactions`) against
  `schema.sql`.

**Branch `1.c` (wallet & virtual account actions) is now fully
closed** — `i` through `vi` all done and verified.

### Findings from this session (1.d.i.zi — DONE, 2026-09-22)

Re-read `src/app/actions/reseller/orders/purchasePlan.ts` in full (fresh,
not from summary) and all four RPC bodies directly in `schema.sql`
(`get_reseller_balance`, `deduct_reseller_cost`,
`process_purchase_deductions`, `create_purchase_order`) to confirm their
actual behavior before drafting anything, per the pickup brief.
Delivered `supabase/migrations/20260922_global_purchase_rpcs.sql` — the
four `global_*` equivalents
(`get_global_reseller_balance`/`deduct_global_reseller_cost`/
`process_global_purchase_deductions`/`create_global_purchase_order`).

Two real deviations from a literal mirror, both resolved by reading the
actual `global_*` schema rather than assumed, so the migration didn't need
splitting further:

1. `global_wallets` has no `total_sales`/`total_profit` columns (unlike
   `reseller_wallets`). Checked whether that's a gap or intentional:
   `get_global_reseller_dashboard_stats` already computes those live via
   `SUM(global_orders.amount)`/`SUM(profit) WHERE status = 'completed'`
   instead of maintaining denormalized counters — so
   `process_global_purchase_deductions` only touches `balance` on both
   wallets, matching what actually exists. (No change needed for
   `deduct_global_reseller_cost` either way — legacy's
   `deduct_reseller_cost` also only ever touched `balance`.)
2. `global_orders` requires `customer_id`, `customer_name`, and
   `plan_name` (`customer_name`/`plan_name` are `NOT NULL`) — a wider
   shape than `reseller_orders`, which only stores `customer_email`.
   `create_global_purchase_order`'s signature is correspondingly wider
   than `create_purchase_order`'s: `customer_id` is nullable (for
   reseller self-purchase), `customer_name`/`plan_name` are required
   caller inputs, and `payment_method`/`transaction_reference` are
   optional extras the legacy table never had. Whoever writes the
   purchase action (`1.d.iii`) needs to supply all of these — for a
   reseller self-purchase, `customer_id` is `NULL` and `customer_name`
   needs some placeholder value (store name, or similar) since it's
   `NOT NULL`; that's a business-logic call for `1.d.iii`, not this RPC.

**Real finding flagged, not fixed, out of scope for `1.d.i` (relevant to
`1.d.ii`, the provider-dispatch layer, whenever that's picked up):**
`src/lib/providers/` (`index.ts`, `lizzysub.ts`, `accragh.ts`, `zendit.ts`,
`provider.types.ts`) already exists — a generic `ServiceProvider`
interface with `getServiceProviderByCountry()` keyed off each country
config's `serviceProvider` field. A repo-wide import search found **zero**
callers anywhere outside that folder — it's unused scaffold, same pattern
as `global_reseller_stores` (finding #3) and the empty route files from
Task 3. More importantly, its `lizzysub.ts` implementation does **not**
match the real, live Lizzysub integration: it POSTs to
`${LIZZYSUB_BASE_URL}/api/v1/purchase` using env vars
(`LIZZYSUB_BASE_URL`/`LIZZYSUB_API_KEY`/`LIZZYSUB_SECRET_KEY`) that don't
appear anywhere else in the codebase, whereas the actual live path
(confirmed again this session in `purchasePlan.ts`) calls Supabase Edge
Functions `lizzysub-proxy`/`airtime_proxy` with a numeric `NETWORK_MAP`
(1-4) and a `data_plan`/`request-id` payload — a completely different
shape. **Do not build `1.d.ii` on top of this abstraction as-is** — it
looks like a real dispatch layer but its Nigeria implementation alone is
enough to prove it was never wired to anything real. `zendit.ts` and
`accragh.ts` haven't been checked against their real upstream APIs yet
either; assume the same risk until confirmed. Verified with a full-project
`npx tsc --noEmit -p tsconfig.json` (0 errors — expected, this session's
change is SQL-only) plus a manual field-by-field cross-check of every
column referenced in the new migration against `schema.sql`'s actual
`global_wallets`/`global_customer_wallets`/`global_orders` column lists.

Advanced the pointer to `1.d.i.zo.x` — applying this migration to the live
DB is a separate direct-command step for the user, not part of this patch
(same pattern as `1.a.ii.zo.x`/`1.c.iii.zo.x`).

### `1.d.i.zo.x` — DONE, 2026-09-23

Migration applied directly in Ubuntu via `psql` (all four `CREATE
FUNCTION` statements succeeded). Fresh `pg_dump` taken afterward
(`~/supabase-dumps/2026-09-23_135321/`, not the stale 2026-09-20 one that
predated the migration — flagged and avoided at the time), confirmed via
grep to contain all four new function names before copying it over
`supabase/schema.sql`. Pushed directly (not via patch), per the schema
snapshot exception. Re-confirmed in this repo post-push:
`get_global_reseller_balance`, `deduct_global_reseller_cost`,
`process_global_purchase_deductions`, and `create_global_purchase_order`
are all present in the committed `schema.sql` with the exact signatures
from the migration. `1.d.i` is now fully closed.

(One false alarm from the handoff session worth recording so it isn't
re-flagged: after the Ubuntu `git pull` before `git am`, the incoming
fast-forward included `fundGlobalCustomerWallet.ts`,
`handleSuccessfulCustomerDeposit.ts`, and the korapay/flutterwave/xixapay
webhook changes, which looked at a glance like a concurrent session had
pushed to this branch in parallel. Checked commit timestamps directly:
all of those commits predate `394539e` — the exact commit this session's
own bootstrap step had already checked out as HEAD before any work
started. Not concurrent; the Ubuntu clone was simply behind the remote on
already-existing history. No reconciliation was needed.)

### Findings from this session (1.d.ii investigation — DONE, 2026-09-27)

Read the actual source of all four candidate edge functions
(`lizzysub-proxy`, `airtime_proxy`, `purchase-data`, `purchase-airtime`)
via the Management API's function-body endpoint (the listing endpoint
used for `edge-functions.json` doesn't include source — this needed a
separate call per function, returned as a Deno `eszip` binary bundle
with the real TypeScript embedded in its sourcemap). This resolved
several things at once:

- **`lizzysub-proxy`/`airtime_proxy` are exactly as thin as
  `purchasePlan.ts` implied**: bare pass-through proxies to
  `https://lizzysub.com/api/data` and `/api/topup`, no DB access at
  all, just CORS + auth-token injection.
- **Security issue, found in passing, not this task's to fix but worth
  flagging loudly**: both hardcode the live Lizzysub API token as a
  plaintext string literal in the deployed source (`const
  LIZZYSUB_TOKEN = "..."`), rather than reading it from an environment
  variable. Not reproducing the value here — treat it as compromised
  simply by virtue of having been readable via the Management API by
  anyone with a read-only Edge Functions token, and rotate it with
  Lizzysub plus move it to `Deno.env.get("LIZZYSUB_TOKEN")` the same
  way `purchase-data`/`purchase-airtime` (below) already correctly do
  it. Unrelated to Task 4's scope — flagged so it isn't lost, not
  actioned here.
- **`purchase-data`/`purchase-airtime` are a real, live, working
  reference implementation of almost exactly what `1.d` needs to
  build** — confirmed (per the previous session's trace) they're
  called by `reseller-app`'s `usePurchaseVTU.ts`, i.e. this is the
  actual mobile customer-purchase flow running in production today,
  just against the **legacy** schema (`resellers`/`reseller_customers`/
  `reseller_customer_wallets`/`reseller_base_plans`/
  `reseller_plan_configs`), not `global_*`. Full flow, in order:
  1. Resolve caller identity: check `resellers` by `auth_user_id` first
     (reseller self-purchase), fall back to `reseller_customers`
     (customer purchase).
  2. Resolve the numeric `planId` sent by the client against
     `reseller_base_plans.plan_id` (a numeric field, distinct from the
     row's own uuid `id`) + `is_active`.
  3. Resolve `reseller_plan_configs` (`markup_type`/`markup_value`/
     `enabled`) by `reseller_id` + the base plan's uuid `id`.
  4. Compute `finalPrice` (percentage or flat markup over the base
     plan's `amount`, which is the wholesale cost).
  5. Check the **reseller's own balance** covers the wholesale cost via
     `get_reseller_balance` RPC — this happens even for a customer
     purchase, because the reseller's balance is what actually funds
     the wholesale cost; the customer's wallet only covers the
     marked-up retail price on top of that.
  6. If a customer is buying: also check `reseller_customer_wallets`
     covers the marked-up `finalPrice`.
  7. Verify the transaction PIN — from `resellers.transaction_pin` if
     the caller is the reseller, from `reseller_customers.transaction_pin`
     if a customer. This is the exact same per-identity-type PIN
     branching already flagged as a legacy behavior to preserve in the
     Task 4 storefront-rebuild brief — now confirmed live in the
     mobile purchase path too, not just the web storefront's design.
  8. Map the plan's network name to Lizzysub's numeric ID
     (`NETWORK_MAP`: MTN=1, AIRTEL=2, GLO=3, 9MOBILE=4) and call the
     matching Lizzysub endpoint directly (not through
     `lizzysub-proxy`/`airtime_proxy` — this function inlines its own
     fetch call with the token from `Deno.env.get`).
  9. On provider failure: log a `failed` order via `create_purchase_order`
     RPC, return the error (with one specific user-facing message
     substitution for an "Insufficient Account/Wallet" Lizzysub error,
     presumably because that's Lizzysub's own upstream balance running
     low, not the customer's).
  10. On success: **two different deduction paths** depending on who's
      buying — `process_purchase_deductions` RPC (customer purchase:
      atomically debits the customer wallet by `finalPrice` *and* the
      reseller wallet by the wholesale cost) vs. `deduct_reseller_cost`
      RPC (reseller self-purchase: only the reseller's own wallet moves,
      by the wholesale cost, zero profit recorded).
  11. Create the completed order via `create_purchase_order`, then
      write a `reseller_customer_transactions` row (customer case only)
      and a `reseller_transactions` row (always), both with a `metadata`
      blob carrying the full Lizzysub response for auditability.
  12. `purchase-airtime` is the same shape with `p_plan_id: null` and a
      raw amount instead of a specific plan — no other structural
      difference worth calling out separately.
- **Directly validates `1.d.i`'s already-delivered RPCs** — compared
  the RPC names this reference calls against
  `20260922_global_purchase_rpcs.sql` (the previous session's `1.d.i`
  migration) and they match one-to-one: `get_reseller_balance` →
  `get_global_reseller_balance`, `deduct_reseller_cost` →
  `deduct_global_reseller_cost`, `process_purchase_deductions` →
  `process_global_purchase_deductions`, `create_purchase_order` →
  `create_global_purchase_order`. That session built this shape
  independently, without having read this edge function — strong
  confirmation `1.d.i` doesn't need revisiting.
- **Confirms and sharpens the `1.d.ii` blocker already flagged**:
  `src/lib/providers/lizzysub.ts` needs a real rewrite before it's
  usable — it currently calls a fictional generic REST endpoint instead
  of the two real Lizzysub endpoints (`/api/data`, `/api/topup`) with
  the real numeric `NETWORK_MAP`. `accragh.ts`/`zendit.ts` remain
  entirely unverified either way — per the person's own instruction,
  new edge functions for those two are being built separately, so
  those two provider files should probably be rewritten (or newly
  written) once that work exists to confirm against, not guessed at now.

### Plan changed — direction from the person (2026-10-03)

Rather than fixing `src/lib/providers/lizzysub.ts` for a Next.js-side
purchase action to call, the person directed building **dedicated
Supabase edge functions** instead — `global-purchase-data` and
`global-purchase-airtime` — mirroring `purchase-data`/`purchase-airtime`'s
proven architecture directly, with real API documentation supplied for
all three providers (Lizzysub, AccraGH/NetFillGh, Zendit). This
supersedes the `lizzysub.ts`-rewrite plan above.
**`src/lib/providers/*.ts` remains untouched, unused, unverified dead
code** — it is not what the live purchase path uses, now or going
forward. Don't build anything else on top of it without re-confirming
this is still true.

### Findings + delivery from this session (1.d.iii — PARTIAL, 2026-10-03)

**Tooling note**: edge functions are Deno, not Node — `tsc` can't check
them, and adding Deno-flavored files under `supabase/functions/` would
otherwise get swept into the main Next.js `tsc` run (its `include` is
unscoped `**/*.ts`) and break the build, the same class of bug Task 3
already had to fix once. Added `"supabase/functions"` to `tsconfig.json`'s
`exclude` as a prerequisite. Verified every new file with `deno check`
instead (installed via `npm install deno` — works fine on this sandbox
unlike the Supabase CLI's arm64 binary issue from earlier sessions;
`deno check` resolves `npm:` specifiers like `@supabase/supabase-js`
straight from the repo's own already-installed `node_modules`, no
separate Deno-specific install needed).

**Critical finding from reading the provider docs carefully**: the
three providers are **not equivalent in timing model**, and treating
them as if they were would risk debiting a wallet for an order that
later fails.
- **Lizzysub**: synchronous — the purchase response is the final
  result, exactly like the proven legacy pattern.
- **AccraGH (NetFillGh)**: asynchronous — orders go
  `pending → processing → completed/failed`, and per NetFillGh's own
  docs, the wallet charge on *their* side only happens at
  `processing`, not at the initial accepted response. A `success`
  response from the purchase call is acceptance, not confirmation.
- **Zendit**: also asynchronous — the purchase call returns a
  `transactionId` to poll or receive a webhook for, not a final
  result. **No webhook signature-verification scheme is documented
  anywhere in Zendit's own API docs** — flagged as an open question for
  whoever builds the Zendit webhook handler, not resolved this session.

Built `_shared/providers.ts` with this distinction as a first-class
`result.final: boolean` field callers must respect — `final: false`
means "accepted, not yet confirmed," and the orchestrator below
deliberately does **not** deduct any wallet balance in that case, only
records a `pending` order + `pending` ledger entries.

**Schema gaps found and closed, both additive**
(`supabase/migrations/20261003_purchase_schema_additions.sql`):
- `global_reseller_applications` had no `transaction_pin` column at
  all (unlike legacy's `resellers.transaction_pin`), which would have
  made reseller self-purchase impossible to mirror faithfully. Added,
  nullable, same as legacy.
- `global_transactions`'s `type` check only allowed `credit`/`debit`;
  legacy's `reseller_transactions.type` includes `purchase`, used for
  every sale's reseller-side ledger entry. Widened additively to add
  `purchase`/`refund` — existing rows/consumers keyed on
  `credit`/`debit` are unaffected. (`global_customer_transactions`
  already allowed `purchase` from `1.c.iii`'s migration — no change
  needed there.)

**Delivered** (full field-by-field schema cross-check done against
`schema.sql` for every table referenced, same standard as every prior
session — all match):
- `supabase/functions/_shared/providers.ts` — the three real provider
  integrations (Lizzysub's two endpoints + numeric `NETWORK_MAP`
  confirmed against the live edge functions; AccraGH's single `/buy`
  endpoint including its documented 409-duplicate-`request_id` handling;
  Zendit's `/topups/purchases`, FIXED-offer-only — `value` is omitted,
  which Zendit's docs say is only valid for FIXED offers, matching
  `global_base_plans`' single `base_price` column rather than a
  min/max range; flagged if a RANGE-type offer is ever catalogued).
- `supabase/functions/_shared/countryDialCodes.ts` — a duplicated
  `phoneCode` map mirroring `src/config/countries/*.ts`, needed because
  edge functions (Deno) can't import the Next.js app's path-aliased TS
  config directly. **No automated sync between the two** — a country
  added/changed in `src/config/countries` needs updating here too,
  manually.
- `supabase/functions/_shared/purchaseOrchestrator.ts` — the full
  `global_*` equivalent of the proven 12-step flow traced in the
  previous session's findings: identity resolution, base-plan +
  reseller-markup-config lookup, dual balance checks, per-identity-type
  PIN verification, provider dispatch, then branches on
  `providerResult.final` — confirmed completion (deduct for real, same
  RPCs as `1.d.i`: `process_global_purchase_deductions`/
  `deduct_global_reseller_cost`/`create_global_purchase_order`) vs.
  pending acceptance (record pending order + pending
  `global_customer_transactions` row, no wallet movement).
- `supabase/functions/global-purchase-data/index.ts` and
  `supabase/functions/global-purchase-airtime/index.ts` — thin
  entrypoints calling the shared orchestrator with `category: "data"`/
  `"airtime"`.

**Follow-up manual steps — DONE, 2026-10-04**: migration
(`20261003_purchase_schema_additions.sql`) applied directly via `psql`,
fresh `pg_dump` taken and `schema.sql` re-synced/pushed (commit
`4214155`); both edge functions deployed (`supabase functions deploy
global-purchase-data` / `global-purchase-airtime`, confirmed via the
"Deployed Functions on project jjyyfaxcwanrmiipzkoj" line for each);
`ACCRAGH_API_KEY`/`ZENDIT_API_KEY` set via `supabase secrets set` and
confirmed present in `supabase secrets list` output. First real use of
the Supabase CLI from any sandbox session — see "Deploying an edge
function" above, now filled in with the proven working command sequence
(token-env-var method, not interactive `supabase login`, since the
latter doesn't work well headless).

**Still not delivered, explicitly incomplete** — don't mistake "the
other three items are done" for "this branch is done":
- **No webhook handler exists for AccraGH or Zendit.** A `pending`
  order created by these two functions today will sit pending
  indefinitely — there is nothing yet that completes it, credits/debits
  anything, or notifies the customer. This is real, necessary follow-up
  work, not optional polish, same framing as `1.c.v`'s original
  deposit-completion gap. This is the active pointer, `1.d.iv.zi.x`.

### Findings + delivery from this session (1.d.iv.zi — AccraGH webhook, code DONE 2026-10-05)

Worked from NetFillGh's own API docs (section 7, "Webhooks", supplied by
the person). Split `1.d.iv` as `zi` = AccraGH, `zo` = Zendit, done one
after the other at the person's request, not together.

**Design.** The pending order written by `purchaseOrchestrator.ts`
(step 11) stores the provider's `order_ref` in
`global_orders.transaction_reference` with `payment_method = 'accragh'`,
so that pair is the webhook's lookup key. Money movement lives in ONE
SQL function, not in TypeScript, because the debit, the order flip and
the ledger rows must be all-or-nothing and a webhook can be redelivered
or arrive concurrently with itself:
- `supabase/migrations/20261005_settle_pending_purchase.sql` —
  `settle_global_pending_purchase(ref, payment_method, outcome,
  provider_payload)`. Locks the order row `FOR UPDATE` and re-checks
  status under the lock. `completed`: debits via the existing `1.d.i`
  RPCs (`process_global_purchase_deductions` for a customer buyer,
  `deduct_global_reseller_cost` for a reseller self-purchase; cost
  price is `amount - profit`, which holds for both because the
  orchestrator stores `amount = cost, profit = 0` for self-purchase),
  flips the order and the pending `global_customer_transactions` row to
  `completed` with real before/after balances, and inserts the
  reseller-side `global_transactions` ledger row. `failed`: closes the
  order and customer row as `failed`, no wallet movement (none ever
  happened). Returns a `code`: `SETTLED`, `ALREADY_SETTLED`,
  `INVALID_STATE`, `ORDER_NOT_FOUND`, `AMBIGUOUS_REFERENCE`,
  `DEDUCTION_FAILED`, `INVALID_OUTCOME`. Also adds an index on
  `global_orders.transaction_reference`. `EXECUTE` is revoked from
  `PUBLIC`/`anon`/`authenticated` and granted to `service_role` only.
- `supabase/functions/_shared/accraghWebhook.ts` — signature check per
  NetFillGh's docs: header `X-NetFillGh-Signature` = `sha256=` +
  hex(HMAC-SHA256(secret, `"<X-NetFillGh-Timestamp>.<raw body>"`)),
  reject if the timestamp is more than 300 s off. Constant-time compare
  via `crypto.subtle.verify`. **The secret is the per-account webhook
  signing secret from netfillgh.com/api_settings — not the API key.**
- `supabase/functions/accragh-webhook/index.ts` — verifies, then maps
  status: `pending`/`processing` are acknowledged and ignored (we only
  move our wallets on a final result); `completed`/`failed` call the
  SQL function. HTTP codes are chosen so NetFillGh (which retries twice
  on non-2xx) retries only when a retry can help: 200 for
  `SETTLED`/`ALREADY_SETTLED`/`INVALID_STATE`/`AMBIGUOUS_REFERENCE`;
  503 for `ORDER_NOT_FOUND` (race with order creation, or an order
  placed on that account by something else); 500 for `DEDUCTION_FAILED`
  and unexpected errors; 401 bad signature; fails closed with 500 if the
  secret is unset.
- Comments in `providers.ts` / `purchaseOrchestrator.ts` that said no
  webhook handler existed were corrected (comment-only change).

**Verification actually run** (not just `tsc`): `npx tsc --noEmit -p
tsconfig.json` — 0 errors. `deno check` on the new function and both
existing purchase functions — clean. `deno test` on the signature
verifier — 6/6 (valid, tampered body, wrong secret, swapped timestamp,
±300 s window edges, malformed headers; expected signatures generated
independently with Node `crypto`). The handler was run for real and the
non-DB paths exercised (405, 401 x3, 200 ignore x2, 400 x2, 500
fail-closed). The SQL was run on a local Postgres 16 built from the
**real** `CREATE TABLE` definitions in `schema.sql` plus the real `1.d.i`
migration (this replaces the manual column cross-check and is stronger:
a wrong or NOT NULL column fails outright): customer sale
(2000/5200 balances, ledger row, real before/after on the customer
row), redelivery is a no-op, `failed` moves no money and a later
`completed` returns `INVALID_STATE`, reseller self-purchase,
customer-can't-afford and reseller-can't-afford (the RAISE is caught)
both leave the order `pending` and change nothing, unknown reference,
wrong provider, ambiguous reference, bad outcome, privileges (anon and
authenticated cannot execute; service_role can), and a real concurrent
double-delivery (second session blocks on the row lock, returns
`ALREADY_SETTLED`, wallets debited exactly once).

**Follow-up manual steps — status as of 2026-10-06** (steps 1–5 DONE and
verified; step 6, the live smoke test, is OPEN):
1. DONE — code patches pushed: remote `handover/supabase-dump` has `6de89e3`
   (code + migration) and `0ce4b6f` (HANDOVER), byte-identical to the tested
   versions (SHAs differ from the originals only because `git am` rebased).
2. DONE — migration applied in Ubuntu via `psql` (output: `CREATE INDEX`,
   `CREATE FUNCTION`, `REVOKE`, `GRANT`). `proacl` for
   `settle_global_pending_purchase` is `{postgres=X/postgres,service_role=X/postgres}`
   — i.e. anon/authenticated/PUBLIC cannot execute it. Fresh `pg_dump`
   pushed as `f083a6f`; in the `public` schema its only additions are the new
   function and `idx_global_orders_transaction_reference` (the remaining
   diff is Supabase's own `storage`-schema function updates).
3. DONE — `accragh-webhook` deployed with `--no-verify-jwt`
   (`supabase functions list`: ACTIVE, version 3, updated 2026-10-05 13:32 UTC).
4. DONE 2026-10-06 (after a correction) — webhook URL at
   netfillgh.com/api_settings is now
   `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/accragh-webhook`.
   **Correction:** the earlier version of this step wrongly recorded the URL as
   already pointing at the function. It had actually been registered as
   `telcos.govt.hu/webhooks/netfillgh` (the Next.js site), which nothing in
   `main` or `handover/supabase-dump` handles — NetFillGh's webhooks were going
   to a non-existent route and would never have reached the function. The person
   re-registered the function URL; saving it did NOT change the signing secret
   (person-verified against the stored digest), so no secret update was needed.
   Design note: the webhook deliberately does not depend on the Next.js site, the
   merge to `main`, or multi-country support — `telcos.govt.hu` is still NG-only
   because this branch is a work in progress and is not yet merged to `main`,
   where the page deployment lives. Do not route NetFillGh webhooks through the
   site (a forwarding route would add a hop, tie this to the merge, and must
   preserve the raw body and headers exactly or the HMAC breaks). Caveat: the
   NetFillGh webhook is account-wide, so if any other system of the person's
   uses the same NetFillGh account, switching the URL affects it (none exists in
   either repo).
5. DONE — `ACCRAGH_WEBHOOK_SECRET` set and present in `supabase secrets list`;
   its digest was checked against the value the person typed (match, so no
   stray whitespace/quotes). The secret value is deliberately NOT recorded here.
   Live endpoint check, 2026-10-06 03:56 UTC: `GET` → 405
   `Method not allowed`; unsigned `POST` → 401 `Invalid signature` — proves the
   function is reachable, JWT verification is off, and the runtime sees the secret
   (an unset secret would have returned 500).
6. **OPEN — live smoke test not yet run** (person could not do it on
   2026-10-06). NOTE: it cannot go through the storefront yet — nothing in the
   app on `main` or the branch calls `global-purchase-data`/`-airtime`; that
   wiring (branch `3.a`, `StoreContent.tsx`) is separate later work, and the
   branch is 283 commits ahead of `main` (clean fast-forward, whole global
   platform), unmerged. Until then the realistic option is a simulated test:
   sign a fake `order.status_changed` with the real secret and POST it to the
   live function against a throwaway test reseller/customer and a hand-made
   `pending` order (proves deployment/secret/DB/idempotency, not NetFillGh's
   real payload format). A live NetFillGh purchase costs real money (cheapest
   bundle ~GH₵4.20) and is the only test of their real webhook format. Cheapest bundle to a number the person controls, via the
   store flow; expect order `pending` → `completed`, wallets/ledger moved
   exactly once, no `rejected` lines in the function logs. Until this passes,
   the settlement logic is verified only against a local Postgres built from
   `schema.sql` plus the handler's non-DB paths — never against a real NetFillGh
   webhook. If an order stays `pending`, first suspect: `rejected (signature
   mismatch)` in the logs (secret differs from NetFillGh's), then
   `ORDER_NOT_FOUND`.
7. OPEN (low priority) — `supabase/edge-functions.json` is a point-in-time
   manifest and has no `accragh-webhook` entry; refresh per its own section.

**Flagged, not fixed (outside this atomic step):**
- **Real bug in the already-deployed `1.d.iii` orchestrator.**
  `global_transactions.description` is `NOT NULL` with no default, and
  `purchaseOrchestrator.ts` inserts into `global_transactions` (step 15,
  the reseller ledger row on every Lizzysub sale, and the
  deduction-failed marker in step 12) without a `description`. Those
  inserts violate the constraint, and their results are never checked,
  so they fail silently: Lizzysub sales complete and debit wallets but
  likely leave no reseller ledger row. The `1.d.iii` "all fields match"
  cross-check missed it because it checked column names, not NOT NULL.
  Fix is small (add `description`, check the insert error) but belongs
  in its own step. The new SQL function does not have this problem
  (tested against the real definitions).
- **CONFIRMED 2026-10-06 — the `1.d.i` money RPCs are executable by
  `anon` and `authenticated`.** `proacl` for `create_global_purchase_order`,
  `deduct_global_reseller_cost`, `get_global_reseller_balance` and
  `process_global_purchase_deductions` is
  `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`
  (`schema.sql` is dumped `--no-privileges`, so this was only visible by
  querying `pg_proc`). All four are `SECURITY DEFINER`. Anyone holding the
  public anon key can call them via `/rest/v1/rpc/...`. From reading the code
  (NOT tested against live data): `process_global_purchase_deductions`
  trusts caller-supplied amounts, so a caller who knows a customer wallet id
  and a reseller id could credit a reseller wallet without paying;
  `deduct_global_reseller_cost` can drain a known reseller's wallet;
  `create_global_purchase_order` can insert fake orders;
  `get_global_reseller_balance` leaks balances. **Safe to revoke:** the only
  callers in either repo are the edge functions in `purchaseOrchestrator.ts`
  (service-role key); nothing in app code calls them as anon/authenticated,
  and `settle_global_pending_purchase` calls them internally as the function
  owner, so it is unaffected. **NOT FIXED — deferred by the person on 2026-10-06 to the project-completion stage (see that section below); originally recommended as a step before Zendit.**
  Recommended as its own atomic step BEFORE Zendit: revoke migration
  (`REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO
  service_role;` on those four), tested on the local Postgres, then applied
  via `psql`, then re-check `proacl`. Also run the same `proacl` query for
  the older legacy money RPCs (`deduct_reseller_cost`,
  `process_purchase_deductions`, `create_purchase_order` and similar) — not
  investigated; they back the live app, so changing them is a separate,
  riskier decision.
- **Stuck-order reconciliation is manual.** If NetFillGh says delivered
  but a wallet no longer covers the debit (`DEDUCTION_FAILED`), nothing
  is changed and the order stays `pending` (logged via `console.error`).
  Find stragglers with:
  `SELECT id, reseller_id, customer_id, amount, transaction_reference, created_at FROM global_orders WHERE payment_method='accragh' AND status='pending' AND created_at < now() - interval '1 hour' ORDER BY created_at;`
  and check each `order_ref` with NetFillGh's `status` endpoint. An
  automated poller using that endpoint is a possible future step, not built.
- **The webhook is account-wide.** Every order on the NetFillGh account
  triggers it, including ones not placed through this system; those get
  503 until NetFillGh stops retrying. Harmless, but expect some
  `no order yet` warnings in the function logs.
- **Rotate the NetFillGh API key.** The docs page pasted into the
  session displayed a live API key. It was not written to any file, but
  treat it as exposed: regenerate at netfillgh.com/api_settings and
  re-set `ACCRAGH_API_KEY` via `supabase secrets set`. (Status 2026-10-06:
  not yet confirmed rotated.) The `ACCRAGH_WEBHOOK_SECRET` value was also
  pasted into the chat session once; it can be rotated by re-setting the
  Supabase secret and the NetFillGh-side secret together — a mismatch
  window makes webhooks 401, so afterwards run the stuck-order query below.
- **Secrets-list observations (2026-10-06, not investigated).** (a)
  `EXPO_PUBLIC_PAYSTACK_SECRET_KEY` has the same digest as
  `PAYSTACK_SECRET_KEY`, and `EXPO_PUBLIC_LIZZYSUB_API_KEY` matches
  `LIZZYSUB_API_KEY`/`LIZZYSUB_TOKEN`. Expo inlines `EXPO_PUBLIC_*` values
  into the shipped app bundle, so if the mobile app reads those names the
  Paystack secret key and Lizzysub credentials are extractable from the
  app. Neither repo here references those names, so check the mobile app's
  `.env`/source; if bundled, rotate and move the calls server-side. (b) A
  secret exists literally named `edgesenterprise@outlook.com` — probably a
  mistyped `secrets set`; remove with `supabase secrets unset`.

### Findings + delivery from this session (1.d.iv.zo — Zendit webhook, code DONE 2026-10-06)

Worked from Zendit's own docs, supplied by the person:
developers.zendit.io/zendit-university/webhooks/,
.../transaction-processing/, and the API reference (Mobile Top Up
webhook, Transaction Status, Reports).

**What the docs actually say (this resolves the open question carried
from `1.d.iii`).**
- There is **no payload signature** (no HMAC). Authentication is a
  header whose **name and value we choose in the Zendit console** when
  saving the webhook, plus an IP allow-list on our side. Zendit's own
  best-practice advice: a long random value (not the API key), rotated
  about every 90 days.
- A webhook must answer **HEAD** (the console's "verify" step) and POST;
  their sample also answers GET. Delivery expects a 2xx within 10 s,
  else it retries on a ladder of 1 s, 10 s, 1 m, 10 m, 30 m, 1 h, 3 h,
  6 h, 12 h (~22 h in total).
- Separate webhooks are registered **per product type (Topup / Voucher /
  eSIM) and per environment (Production / Sandbox)**. We only buy
  topups (data and airtime), so only the Topup type is needed.
- The POST body has the same shape as `GET /v1/topups/purchases/{id}`.
  Statuses: PENDING, ACCEPTED, AUTHORIZED, IN_PROGRESS (in flight),
  DONE, FAILED (final). The prose guide says "FAIL"; the API enum says
  "FAILED"; the code accepts both.
- **`transactionId` is supplied by us**, not generated by Zendit — it is
  the orchestrator's `requestId` (`GRC_<CATEGORY>_<ts>_<rand>`), echoed
  back and already stored as `global_orders.transaction_reference` with
  `payment_method = 'zendit'`. So the webhook matches on that pair and
  **no SQL change was needed**: `settle_global_pending_purchase` is
  provider-agnostic.
- On failure Zendit returns the reserved funds to our Zendit wallet and,
  with Queue & Retry on, retries a recoverable failure every 15 minutes
  for up to 24 h before failing — in-flight webhooks arrive meanwhile.

**Design.** Because a static header is weaker than a signature, the
handler never trusts the webhook body for anything that moves money:
1. Requires the secret header (`X-Webhook-Token`) against
   `ZENDIT_WEBHOOK_SECRET`, constant-time; also accepts an optional
   `ZENDIT_WEBHOOK_SECRET_PREVIOUS` so a rotation can overlap with no
   gap. Fails closed (500) if the secret is not configured.
1a. Source-IP allow-list in front of that, **observe-only by default**:
   Zendit's five webhook IPs (18.209.125.75, 3.217.45.95, 54.243.153.139,
   216.53.69.2, 216.53.104.2 — copied from the Zendit console's webhook
   dialog ("Copy these IP Addresses ... Zendit Webhooks will arrive from the
   IP addresses listed above"), relayed by the person on 2026-10-09 and
   compared character for character with the list in the code: identical;
   the public docs page itself lists none) are compared with `cf-connecting-ip` (set by the Cloudflare layer that
   fronts Supabase; `x-forwarded-for` is deliberately ignored because its
   first entry is client-controlled). A sender outside the list is
   logged ("NOT in the allow-list") but still processed, because a stale
   list or an unexpected header would otherwise 403 real webhooks and
   leave paid orders pending for up to ~22 h of Zendit retries. Setting
   the secret `ZENDIT_WEBHOOK_ENFORCE_IPS=true` makes such senders get
   403. If `cf-connecting-ip` is absent it logs a warning and carries on.
   HEAD/GET (the console's verify step) are never IP-gated. The list can
   be changed without a redeploy via `ZENDIT_WEBHOOK_ALLOWED_IPS`
   (comma-separated, or `*` to switch the check off). This is
   defence-in-depth only: the secret header and the API confirmation
   (step 3) are what protect settlement.
2. In-flight statuses are acknowledged (200) and ignored.
3. For DONE/FAILED it re-fetches the transaction from Zendit's API with
   OUR `ZENDIT_API_KEY` (`GET /v1/topups/purchases/{id}`) and settles on
   what the **API** says. API says still in flight → 503 (Zendit
   retries); API 404 → acknowledged and ignored (not our transaction);
   API unreachable/401/403/bad JSON → 500, never settles on an
   unverified claim.
4. Calls `settle_global_pending_purchase(…, 'zendit', outcome, payload)`
   and maps results exactly like the AccraGH function: 200
   SETTLED/ALREADY_SETTLED/INVALID_STATE/AMBIGUOUS_REFERENCE; 503
   ORDER_NOT_FOUND (the order row is written just after Zendit accepts
   the purchase, and Zendit's first retry is 1 s later, which covers
   that race); 500 DEDUCTION_FAILED and unexpected errors.
Files: `supabase/functions/_shared/zenditWebhook.ts` (all logic,
dependency-injected), `supabase/functions/zendit-webhook/index.ts` (thin
entry point, lazy Supabase client), `_shared/zenditWebhook.test.ts`.
Comment-only updates in `providers.ts` / `purchaseOrchestrator.ts`.

**Verification actually run.** `npx tsc --noEmit -p tsconfig.json` — 0
errors. `deno check` on the new function and the three existing
webhook/purchase functions — clean (it caught one real typing mismatch,
fixed: Supabase `rpc()` returns a thenable builder, not a Promise).
`deno test` — 21/21 across both webhook modules (15 new: status
normalisation, constant-time compare, HEAD/GET/405, fail-closed config,
wrong/missing/previous secret, bad bodies, in-flight acks, DONE/FAILED/
FAIL, API-overrides-webhook, API still in flight, 404, API 500/401/403/
non-JSON/network/no key, every settlement code, URL encoding). Then the
real handler was run end-to-end against the **real SQL function** on a
local Postgres 16 built from `schema.sql`, with Zendit's API mocked:
customer sale (customer 2000, reseller 5200, ledger row, real balances
on the customer row), redelivery is a no-op, IN_PROGRESS then FAILED
moves no money and a late DONE (API still says FAILED) is a no-op, the
webhook-before-order race (503, then 200 after the order exists),
forgery attempts (right secret + claims DONE while API says IN_PROGRESS,
wrong secret, no secret) all change nothing, an AccraGH order cannot be
settled through the Zendit endpoint, and a reseller self-purchase debits
the reseller. NOT done: a call against Zendit's real API or a real
webhook (see smoke test).

**Follow-up manual steps — status as of 2026-10-08** (1–5 DONE with
evidence; 6 and 9 OPEN; 7, 8, 10 standing/optional):
1. DONE, verified 2026-10-08 — patches pushed. Remote
   `handover/supabase-dump` has `a96657e` (code) and `03081fe` (HANDOVER);
   the six files they touch are byte-identical to the delivered versions
   (git blob hashes compared). No migration, no schema-snapshot change.
2. DONE (person-run output, 2026-10-08) — `ZENDIT_WEBHOOK_SECRET` is set
   (`supabase secrets list` shows it). The value is deliberately not
   recorded. Generated with `openssl rand -hex 32`.
3. DONE (person-run output, 2026-10-08) — `supabase functions list` shows
   `zendit-webhook` ACTIVE, version 1, updated 2026-10-07 06:04:19 UTC.
   Deployed with `--no-verify-jwt` (required: Zendit sends no Supabase
   JWT). The flag itself is not visible in that listing, but Zendit's
   Verify step (an unauthenticated HEAD) passed, which a JWT-protected
   function would have refused.
4. DONE (per the person's answer, 2026-10-08) — the webhook environment is
   **Production**. Recorded as the environment of `ZENDIT_API_KEY` on the
   person's word, not independently verified; a mismatch would show as
   webhooks never arriving or as 401/404 from Zendit's API in the logs.
5. DONE (person-reported, 2026-10-08) — Zendit console (API Settings →
   Webhooks): environment Production; type Topup; address
   `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/zendit-webhook`;
   header key `X-Webhook-Token`, value = the secret; Verify passed and the
   webhook was Confirmed. NOTE: Verify only sends HEAD, which is never
   auth-gated, so the header VALUE matching `ZENDIT_WEBHOOK_SECRET` is NOT
   yet proven; the first real webhook will show it (a mismatch logs
   `rejected (missing or wrong auth header)` and Zendit retries).
6. DONE by evidence, 2026-10-09 — the **IP Whitelist** for the API key does
   not block calls from Supabase edge functions. (Had it been enabled, calls
   from Supabase edge functions would get 403 and the function would log
   "Zendit API refused our key … IP allow-list".) Evidence: live check 3
   below made the deployed function call Zendit's real API
   `GET /v1/topups/purchases/{id}` with `ZENDIT_API_KEY`; the response was a
   clean 404 (function answered `ignored: unknown transaction`), which is only
   reachable if the API accepted our key from Supabase. The console page itself
   was not inspected.

   **Live checks run by the person on 2026-10-09** (secret typed with
   `read -rs`, never recorded; transaction id `GRC_TEST_NONEXISTENT`, no money
   moved, no database row touched): (1) right token + IN_PROGRESS → 200
   `acted:false`; (2) wrong token → 401 `Unauthorized`; (3) right token + DONE
   for a transaction Zendit does not know → 200 `ignored: unknown
   transaction`. These prove, against the DEPLOYED function: the function is
   reachable, the secret stored in Supabase equals the value the person typed,
   wrong tokens are refused, and the production API key works from Supabase.
   They do NOT prove which code version ran (see step 9), and they do not prove
   that the value saved in the Zendit console equals the secret (still only
   shown by the first real webhook).
7. Put a ~90-day reminder on the webhook secret. To rotate with no gap:
   set the old value as `ZENDIT_WEBHOOK_SECRET_PREVIOUS`, set the new
   `ZENDIT_WEBHOOK_SECRET`, change the header value in the Zendit
   console, then unset `…_PREVIOUS`.
8. Smoke test — deferred to the project-completion stage (item 6 there).
   Caution: the configured key is PRODUCTION, so a purchase through it is
   real money. Zendit's test mode simulates transactions and spends no
   real money (API reference, "Environments"), but using it means a
   separate sandbox API key and a Sandbox webhook; do not point a sandbox
   webhook at this production function or mix the two.
9. DONE, verified 2026-10-09 — source-IP allow-list redeployed. Person ran
   `git pull --rebase` and `supabase functions deploy zendit-webhook
   --no-verify-jwt` from Ubuntu (the first attempt, in Termux, failed: no
   Supabase CLI there); `supabase functions list` then showed
   `zendit-webhook` ACTIVE **version 2, 2026-10-09 05:00:40 UTC**. The files
   deployed are byte-identical (git blob hashes) to the tested versions on the
   remote. Function logs prove the new code is live: a request at 05:03:09 UTC
   logged `source <ip> is NOT in the allow-list (observe-only; …)`, a line that
   exists only in version 2, and it carried a real client address in
   `cf-connecting-ip` (the person's own address; deliberately not recorded
   here). The three live checks of the same day (see step 6) were confirmed by
   the logs to have run on **version 1** (their log lines have no allow-list
   entry); that does not weaken them, since the auth and verification code they
   exercise is unchanged in version 2. The IN_PROGRESS path logs nothing in
   version 1, which is why only checks 2 and 3 left traces.
10. Optional, after the first real Zendit webhook has been seen: check the
   function logs for `POST from allow-listed source <ip>`. Status 2026-10-09:
   `cf-connecting-ip` is PROVEN to reach the function (step 9) and the IP list
   is now first-party (it matches Zendit's own console), so the remaining
   unknown is only that a real webhook really arrives from one of them (e.g. no
   unlisted IPv6 or relay address). A real webhook showing the allow-listed
   line proves that. The person may choose to enforce earlier, accepting that
   an unexpected sender address would leave orders pending until fixed (Zendit
   retries for ~22 h and the list can be changed without a redeploy via
   `ZENDIT_WEBHOOK_ALLOWED_IPS`); the assistant's recommendation is still to
   wait for that first line, and then consider
   `supabase secrets set ZENDIT_WEBHOOK_ENFORCE_IPS=true`. A line saying
   `NOT in the allow-list` means the list is incomplete or the header is
   not what we assumed — fix the list first.

**Flagged, not built.**
- The header secret is a bearer token, not a signature. The API
  re-confirmation is what makes it acceptable; do not remove that step.
- Zendit's **ShieldWall** (a separate webhook where Zendit asks us to
  approve a transaction before processing, 200 = recognised / 404 =
  block) is an optional extra control, not implemented.
- Voucher (gift card / utility) and eSIM webhooks are not implemented
  because nothing here buys those products.
- The amount Zendit charged (`cost` / `costCurrency`) is stored in the
  order's `provider_settlement` metadata but is not cross-checked against
  our expected cost.
- Stuck-order reconciliation for Zendit is the same manual query as
  AccraGH with `payment_method='zendit'`, checking each reference with
  `GET /v1/transactions/{id}`; Zendit also lets us poll
  `GET /v1/topups/purchases?status=…`. An automated poller is not built.

### Findings from this session (2.a decomposition — DONE, 2026-10-09)

Decomposition only, no application code changed. Read the price-formatting
sites and the country config before splitting, per the pointer rule.

- **The storefront is half-done already.** All four current
  `[storeName]` files that format money (`StoreProducts.tsx`,
  `StoreHero.tsx`, `StoreCart.tsx`, `StoreCheckout.tsx`) already read
  `config.currencySymbol` instead of hardcoding naira. What is wrong
  with them: (1) each has a `|| "₦"` fallback, a Nigeria default that
  can never fire in practice because `getCountryConfig` already falls
  back to the `ng` config for an unknown code; (2) each renders the
  number with `.toLocaleString()` and **no locale**, so a client
  component rendered on the server and then hydrated can format
  differently on each side (Node's default locale vs. the visitor's
  browser locale; likely, not reproduced); (3) the same
  symbol-plus-number snippet is copied into every file instead of
  living in one helper. So `2.a` is a consolidation and a locale fix,
  not a rewrite.
- **The legacy reference is the only real hardcode.**
  `old-storeName/StoreContent.tsx` calls `formatNaira` seven times
  (lines 2040, 2479, 2480, 2839, 3091, 3847, 3862). `formatNaira`
  (`src/lib/pricing/calculatePrice.ts`) is
  `` `₦${amount.toLocaleString('en-NG')}` ``. That file is the
  behavioral reference, not something being edited, so it is not
  touched. `formatNaira` has other callers (reseller dashboard
  pages, `ResellerBenefits.tsx`) that are out of Task 4's scope.
- **Why a new helper instead of reusing an existing one.** Two
  already exist and neither fits: `formatPrice(amount, currencyCode)`
  in `src/lib/currency/currency.ts` puts a space after the symbol,
  uses no explicit locale, falls back to the ISO code, and is used by
  the dashboard's `PlansClient.tsx` (changing it would change dashboard
  output); `formatCurrency` in `src/lib/utils/helpers.ts` forces two
  decimals via `Intl` currency style, which would turn `₦1,500` into
  `NGN 1,500.00`. The new helper matches `formatNaira`'s look (symbol
  directly before the number, no forced decimals).
- **No new config needed.** `CountryConfig` already has
  `currencySymbol` and `locale` (e.g. `en-NG`, `ar-EG`). Prices have
  no per-plan currency: `global_plans` has `price numeric(10,2)` and
  no currency column, so the store's currency is always its country's
  `config.currency`. `locale` is already there, so the helper can take
  `Pick<CountryConfig, "currencySymbol" | "locale">`.
- **Planned behavior for the helper:** symbol directly before the
  number, no space, matching `formatNaira`; `Intl.NumberFormat(locale,
  { minimumFractionDigits: 0, maximumFractionDigits: 2 })` (prices are
  `numeric(10,2)`; whole-number currencies print without decimals, and a
  value like `10.5` prints as `10.5`); `null`/`undefined`/`NaN` formats as
  `0`, like `formatPriceSafe`.
- **RESOLVED 2026-10-09 — the person said to leave Egypt's digits as
  is: use `config.locale` unchanged (Arabic-Indic digits for `ar-EG`).**
  Original question: `config.locale` for Egypt is `ar-EG`,
  which renders digits as Arabic-Indic (`١٬٥٠٠`). Using `config.locale`
  gives that for every Egyptian price. If Western digits are wanted
  there, the helper should pin the numbering system instead
  (`ar-EG-u-nu-latn`). Every other configured locale is expected to
  print Western digits, but this was not checked per country. Default
  if no answer is given: use `config.locale` as-is and say so in the
  commit message. Symbol side/position for RTL is a separate layout
  question and belongs to `5.a`, not here.
- **No test runner exists in the repo** (`package.json` has no
  jest/vitest/test script), so `2.a.i.zo` verifies with a throwaway
  Node script run against the compiled helper, not a committed test
  file. A committed test would mean adding tooling, which is outside
  this step.
- **Stale pickup brief fixed.** `TASK-4-PICKUP-BRIEF.md` section 3 still
  named `1.d.i.zi.x` as the active pointer (flagged in the 2026-10-05
  log entry and left alone since). It now carries a note pointing at
  this file as the source of truth for the pointer.

### `2.a.i.zi.x` — DONE, 2026-10-09

Wrote `src/lib/currency/formatStorePrice.ts`: `formatStorePrice(amount,
{currencySymbol, locale})` — symbol directly before the number, explicit
`Intl.NumberFormat(locale)` with 0–2 fraction digits, null/NaN/Infinity
format as 0. Egypt decision applied as given (`config.locale` as-is).
Nothing imports it yet. Full-project `npx tsc --noEmit -p tsconfig.json`:
0 errors. Not DB-touching, so no schema cross-check applies.

### Next atomic step — active pointer `2.a.i.zo.x`

Verify the helper: a throwaway Node script (not committed; the repo has
no test runner) that compares `formatStorePrice(n, ng config)` with the
legacy `formatNaira(n)` for several values (0, 500, 1500, 1234567, 10.5),
and prints sample output for a few other countries' real
`currencySymbol`/`locale` pairs (read from `src/config/countries/*.ts`,
check every configured locale, which also settles whether any besides
`ar-EG` prints non-Western digits). Plus the full-project tsc.

### Previous pointer (superseded, kept for reference) — was `2.a`

Branch 1 (provider integration) is code-complete: `1.a`–`1.d` including
both async-provider webhooks, with the manual steps and smoke tests
tracked above and in the Project-completion section. The next unit in
the Task 4 tree is **branch `2.a` — currency formatter using
`config.currency` / `config.currencySymbol`** ("not yet decomposed,
likely trivial"). Per the methodology, decompose it before executing:
read where prices are currently formatted (the Naira-hardcoded sites are
listed in Task 4's "Reality check" findings) and `getCountryConfig`,
then write the atomic steps ending in `x`. The person may instead choose
branch `3.a` (storefront wiring), which is also what unblocks any live
purchase test, but it is much larger and is the person's call.

### Next atomic step (superseded, kept for reference) — was `1.d.i.zi.x`

Branch `1.d` (purchase action) per the architecture outline above.
Read `purchasePlan.ts` (legacy) and whatever RPCs it calls
(`deduct_reseller_cost`, `process_data_purchase`,
`process_airtime_purchase` — per Task 4's original "Reality check"
finding #6, these are confirmed live DB functions bound to legacy
tables, not stubs) before assuming anything about what a `global_*`
equivalent needs to look like. This is purchase/fulfillment — real
money movement plus a live provisioning call to whatever upstream data/
airtime provider the legacy flow uses — treat it with at least as much
care as the wallet-funding work in `1.c`, and expect it not to fit a
single atomic `x` either.

### Delivery for this task
- `2.a.i.zi.x` — `src/lib/currency/formatStorePrice.ts` (new, unused
  until `2.a.ii`). Normal patch process; no migration/deploy.
- `2.a` decomposition (2026-10-09) — documentation only (this file and
  `TASK-4-PICKUP-BRIEF.md`). Normal patch process; no migration, no
  schema snapshot, no deploy step.
- `1.a.ii.zi.x` — the migration file (commit `cbe9f9e`). Delivered via
  the normal Standing handoff process.
- `1.a.iii` — verification-only, no delivery needed.
- `1.a.ii.zo.x` — applied directly by the user in Ubuntu; schema
  snapshot refreshed and pushed directly (`b13940f`) per the
  schema-snapshot direct-push rule.
- `1.b.i.zi.x` — `registerCustomerToGlobalReseller.ts` (commit
  `dda6686`). Delivered via the normal Standing handoff process.
- `1.b.i.zo.x` — verification-only (full-project type-check), no
  delivery needed beyond the code itself.
- `1.b.ii.zi.x` — `getGlobalCustomerAuthEmail.ts` (commit `6ad1b85`).
  Delivered via the normal Standing handoff process.
- `1.b.ii.zo.x` — verification-only, no delivery needed.
- `1.b.iii.zi.x` — `useCustomerAuth.ts` (commit `e805e41`). Delivered
  via the normal Standing handoff process.
- `1.b.iii.zo.x` — deferred, not delivered (see findings above — not
  a gap in this session's delivery, a genuine blocked-until-3.a item).
- `1.c.i.zi.x` — `getGlobalCustomerWallet.ts` (commit `d2a5f4d`).
  Delivered via the normal Standing handoff process.
- `1.c.i.zo.x` — verification-only (schema cross-check), no delivery
  needed beyond the code itself.
- `1.c.ii.zi.x` — `createGlobalCustomerVirtualAccount.ts` (this
  session's commit, see Log below). Delivered via the normal Standing
  handoff process.
- `1.c.ii.zo.x` — verification-only (full-project type-check + schema
  cross-check), no delivery needed beyond the code itself.
- `1.c.iii.zi.x` — `supabase/migrations/20260921_customer_transactions_schema.sql`
  (this session's commit, see Log below). Delivered via the normal
  Standing handoff process, **plus** a direct `psql` command block for
  the user to run in Ubuntu (same pattern as `1.a.ii.zi.x`) — see
  below.
- `1.c.iii.zo.x` — applied directly by the user in Ubuntu;
  `schema.sql` refreshed and pushed directly (`f14d676`), not via
  patch.
- `1.c.iv.zi.x` — `fundGlobalCustomerWallet.ts` (this session's commit,
  see Log below). Delivered via the normal Standing handoff process.
- `1.c.iv.zo.x` — verification-only (full-project type-check + schema
  cross-check), no delivery needed beyond the code itself.
- `1.c.v.zi.x` — `handleSuccessfulCustomerDeposit.ts` plus edits to
  `korapay/route.ts` and `flutterwave/route.ts` (this session's
  commit, see Log below). Delivered via the normal Standing handoff
  process. Scoped to korapay/flutterwave only — xixapay virtual-account
  attribution is `1.c.vi`, not yet started.
- `1.c.v.zo.x` — verification-only (full-project type-check + schema
  cross-check), no delivery needed beyond the code itself.
- `1.c.vi.zi.x` — edits to `xixapay/route.ts` (customer virtual-account
  attribution branch, plus the reseller bonus source-gate fix; this
  session's commit, see Log below). Delivered via the normal Standing
  handoff process.
- `1.c.vi.zo.x` — verification-only (full-project type-check + schema
  cross-check), no delivery needed beyond the code itself.
- `1.d.i.zi.x` — `supabase/migrations/20260922_global_purchase_rpcs.sql`
  (this session's commit, see Log below). Delivered via the normal
  Standing handoff process, **plus** a direct `psql` command block for
  the user to run in Ubuntu (same pattern as `1.a.ii.zi.x`) — see below.
- `1.d.iv.zi.x` — `supabase/migrations/20261005_settle_pending_purchase.sql`,
  `supabase/functions/_shared/accraghWebhook.ts` (+ `.test.ts`) and
  `supabase/functions/accragh-webhook/index.ts` (this session's commits,
  see Log below). Delivered via the normal Standing handoff process,
  **plus** the direct `psql` migration, `supabase functions deploy
  --no-verify-jwt`, webhook-URL registration and secret steps listed
  under "Follow-up manual steps — status as of 2026-10-06" above
  (steps 1–5 done; the live smoke test, step 6, is open).
- `1.d.iv.zo.x` — `supabase/functions/_shared/zenditWebhook.ts` (+
  `.test.ts`) and `supabase/functions/zendit-webhook/index.ts`, plus
  comment-only edits in `providers.ts` / `purchaseOrchestrator.ts`
  (2026-10-06 commits). Normal patch delivery only — no migration, no
  schema-snapshot change — **plus** the manual steps listed under
  "Follow-up manual steps — NOT YET DONE" in the `1.d.iv.zo` findings
  (secret, `--no-verify-jwt` deploy, Zendit console registration, IP
  allow-list check).

---

## Project-completion stage — deferred items (decided by the person)

These are deliberately NOT being worked now; the person's decision
(2026-10-06) is that they get done **when the project is completed**,
the same convention as the database-password rotation. Surface this
whole section at project wrap-up, or whenever the person asks. Do not
action any of it unprompted mid-task. Do mention an item if the task
in hand directly depends on it or would touch the same code. Each
entry's full detail lives where the finding was recorded (Task 4,
`1.d.iv.zi` findings), referenced below.

**Already deferred earlier (text stays in Task 1 / Task 2 — listed here
only so this section is the single wrap-up checklist):**
- Rotate the Supabase database password (decision of 2026-09-09; do not
  re-flag or rotate unprompted before then).
- Chained straight after it: Task 2's `reseller_applications`
  table/columns that don't exist (`getApplicationDraft.ts` /
  `saveApplicationDraft.ts`; dead code) — implement or delete.

**Added 2026-10-06 (from the `1.d.iv.zi` session):**
1. **Revoke migration for the four open `1.d.i` money RPCs**
   (`create_global_purchase_order`, `deduct_global_reseller_cost`,
   `get_global_reseller_balance`, `process_global_purchase_deductions`):
   `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO
   service_role;`, tested locally first, applied via `psql`, `proacl`
   re-checked, schema snapshot refreshed. Confirmed safe: only the edge
   functions in `purchaseOrchestrator.ts` call them (service-role key).
   Also run the same read-only `proacl` query against the older legacy
   money RPCs (not investigated; changing those is a separate, riskier
   decision). **Known accepted risk until then:** the four functions are
   callable with the public anon key (see the CONFIRMED finding in the
   `1.d.iv.zi` findings). Assistant's note, not the person's decision:
   this should be closed before real customer money flows through the
   global platform — i.e. no later than storefront wiring (branch `3.a`)
   going live — whatever the person's completion date is.
2. **Fix the `purchaseOrchestrator.ts` ledger inserts:**
   `global_transactions.description` is `NOT NULL`; steps 12 and 15 omit
   it and never check the insert error, so Lizzysub sales likely leave no
   reseller ledger row. Add `description` and check/log the error.
   (Currently not triggered in practice: nothing in the app calls the
   `global-purchase-*` functions yet.)
3. **Rotate the NetFillGh API key** (it appeared in docs pasted into a
   chat) and re-set `ACCRAGH_API_KEY`; optionally rotate
   `ACCRAGH_WEBHOOK_SECRET` too (also pasted once) — change both sides
   together, then run the stuck-order query.
4. **Secrets hygiene:** check whether the mobile app reads
   `EXPO_PUBLIC_PAYSTACK_SECRET_KEY` / `EXPO_PUBLIC_LIZZYSUB_*` /
   `EXPO_PUBLIC_EBENK_TOKEN` / `EXPO_PUBLIC_UJAYDATA_API_KEY` (Expo
   inlines `EXPO_PUBLIC_*` into the shipped bundle; several have the same
   digest as their server-side twins) — if so rotate and move server-side.
   Remove the stray secret literally named `edgesenterprise@outlook.com`
   (`supabase secrets unset`). The hardcoded Lizzysub token in
   `lizzysub-proxy` / `airtime_proxy` (Task 4 `1.d` findings) belongs in
   the same pass.
5. **Refresh `supabase/edge-functions.json`** (no `accragh-webhook` entry).
6. **Smoke tests: AccraGH and Zendit.** AccraGH: a live purchase (real
   money, cheapest bundle) or the simulated signed-webhook test against
   a throwaway reseller/customer. Zendit: the configured key is
   PRODUCTION (person-stated), so a live run spends real money; a free
   test-mode run needs a separate sandbox key and Sandbox webhook;
   alternatively a simulated webhook with the secret header plus a
   mocked/real status lookup. Live runs need the storefront wiring (branch `3.a`)
   and the merge to `main`; simulated runs can be done any time.

**Not scheduled, mentioned for completeness:** an automated poller for
stuck pending orders using NetFillGh's `status` endpoint (manual query
documented in the `1.d.iv.zi` findings); the Zendit handler
(`1.d.iv.zo.x`) is NOT part of this section — it remains the active
pointer, blocked on Zendit's docs.

---

## Log

| Date | Session | Notes |
|---|---|---|
| 2026-09-08 | Setup session | Created both branches, wrote `scripts/supabase_dump.sh` + the direct `pg_dump` command block above, verified pg_dump installs on Ubuntu, wrote this handover file and the standing Termux handoff process. Delivered as `.patch` files, applied via `git am` from `~/storage/downloads/`. Did not run the actual dump (no live credentials in this sandbox). |
| 2026-09-08 | Setup session | User confirmed both patches applied cleanly and `handover/supabase-dump` was pushed to `origin` on both repos (PR links returned by GitHub for each). Updated the standing handoff process above to a single combined command (subshells per repo) so the user doesn't have to run two separate command blocks or manually `cd` back and forth. |
| 2026-09-08 | Setup session | User pointed out the branch already exists/is checked out, so `git checkout -b` shouldn't run on every handoff. Split the process into a one-time setup command (branch creation, run once) and a steady-state command (just `git am` + `git push` per repo) for every session after that. |
| 2026-09-08 | Setup session | Added "Session bootstrap" section: every session (either environment) fetches all branches and checks out the latest commit on the most recently updated branch rather than assuming `main`, then re-reads this file from there. |
| 2026-09-08 | Dump session | Documented the two-environment standing rule: native Termux clones for coding, separate Termux-Ubuntu (`proot-distro`) clones under `~/ubuntu-repos/` for DB/edge-function work needing a full Ubuntu userland. Resolved and recorded the pooler connection details (host/port/db/user, no password) for Task 1. User ran the dump command inside Ubuntu; **result not yet confirmed in this file** — whoever verifies `~/supabase-dumps/<timestamp>/` should update this row (or add a new one) with file sizes and pass/fail, and note here once the leaked password from this session has been rotated. |
| 2026-09-08 | Dump session | Dump run confirmed: `~/supabase-dumps/2026-09-08_033557/` has all three files at non-trivial sizes (schema.sql 318KB, data.sql 10.4MB, full.dump 1.6MB). Task 1 still OPEN — remaining steps (password rotation confirmation, `.gitignore` entry, schema-drift diff, long-term storage decision) not yet done. |
| 2026-09-08 | Migrations session | Added a dedicated handoff process for DB migrations and edge functions, distinct from the plain code-patch process: a normal `.patch` adds the migration `.sql`/function source to the repo, plus a separate direct `psql -f` command (run in the Ubuntu environment) actually applies it to the live DB. Edge function deploy via Supabase CLI documented as an **open item** — no access token configured in any sandbox session yet, so `supabase login`/`link`/`deploy` steps are written but unverified. |
| 2026-09-08 | Verification session | Checked whether the standing-rule patches had landed (confirmed, up to `180f86c`) and whether the DB dump is reflected in the repo. Found and fixed a real bug: `Edges_LandingPage`'s `.gitignore` had `sz*.json` and `supabase/dumps/` merged onto one line with no newline, so `supabase/dumps/` was never actually being ignored — fixed and verified with a test file. `reseller-app`'s `.gitignore` was already correct. Schema-drift check against `supabase/rpc/**` is still blocked: the actual `schema.sql` contents only exist on the user's Ubuntu machine and haven't been shared into a session yet — command to do so added above. |
| 2026-09-08 | Re-verification session | Fresh clone of both repos, landed on `handover/supabase-dump` (latest branch, confirmed via bootstrap steps: `Edges_LandingPage` @ `30e9133`, `reseller-app` @ `467a680`). Re-confirmed both prior findings hold on this clone: (1) `Edges_LandingPage`'s `.gitignore` has `sz*.json` and `supabase/dumps/` correctly on separate lines (line 53) — re-tested live by creating `supabase/dumps/test.txt` and running `git check-ignore -v`, which correctly matched it against `.gitignore:53:supabase/dumps/`; test file removed after. `reseller-app`'s `.gitignore` also confirmed correct (line 54), no fix needed. (2) `supabase/schema.sql` **is** committed in `Edges_LandingPage` and is a genuine dump, not a placeholder: 318,536 bytes, 10,462 lines, valid `pg_dump` header (source DB Postgres 15.8, dumped with pg_dump 18.6/Ubuntu 26.04). Confirmed `data.sql`/`full.dump` are correctly **absent** from both repos (per the absolute rule) — they only exist locally on the user's Ubuntu machine under `~/supabase-dumps/<timestamp>/`. **Task 1 remains OPEN** — still outstanding: (a) confirm the dump-session password was rotated in the Supabase dashboard, (b) run the schema-drift diff of `supabase/schema.sql` against `supabase/rpc/**` (unblocked now — `schema.sql` is committed and readable directly from the repo, no need to paste dump output into chat anymore), (c) decide long-term storage for `data.sql`/`full.dump`. Next session picking this up should start with the drift diff since it's now trivially unblocked. |
| 2026-09-08 | Drift-check session | Ran the schema-drift check against `supabase/rpc/**` (see "Schema-drift check — RUN" section above for full detail). **Result: not drift, total non-overlap.** All 51 files under `supabase/rpc/**` are 0 bytes (empty since the commit that created them — confirmed via git history, not just current state) and **none** of the 51 expected function names (derived from filenames) appear anywhere in `supabase/schema.sql`'s 61 live `public`-schema functions. The live DB's actual functions are an unrelated set centered on wallet/purchase/notification logic (`process_airtime_purchase`, `update_wallet_after_sale`, `get_global_reseller_dashboard_context`, etc.) with no renaming relationship to the scaffolded names. Also found 7 filenames duplicated across two `rpc/` subfolders each (e.g. `complete_build.sql` in both `build/` and `publishing/`) — harmless today since both copies are empty, but worth resolving before anyone populates them. This changes the shape of the remaining work: it's not a diff/merge task, it's a scope question (is `supabase/rpc/**` a dead scaffold to remove, or a real to-build list?) for whoever owns product direction here. Task 1's other two items (password rotation confirmation, long-term dump storage decision) are still open and unaffected by this finding. |
| 2026-09-09 | Status-check session | Picked up Task 1's password-rotation item. User made an explicit decision: keep using the currently-exposed password until the project is completed, then rotate it — a deliberate, accepted risk rather than an oversight, flagged to the user as a real exposure window (live wallet/purchase/user data) before confirming. Updated the connection-details section above with an explicit exception noting this so future sessions don't re-flag or rotate unprompted. Task 1's remaining open items are now just: long-term dump storage decision, and the `supabase/rpc/**` scope question (both still need the user/product owner, not a sandbox session). |
| 2026-09-09 | Status-check session (cont.) | Both remaining Task 1 items resolved by user decision in the same session: (1) long-term dump storage stays Ubuntu-side (`~/supabase-dumps/<timestamp>/`), no bucket/volume being set up; (2) `supabase/rpc/**` confirmed dead scaffolding — the live Supabase DB is the only real surface for this project — so the entire directory (51 empty files) was deleted in this commit. Task 1 moved from OPEN to RESOLVED-with-one-deferred-item (password rotation, deliberately deferred per the prior log entry, not blocking). No open Task 1 items remain that need another sandbox session; next session should check this doc for any new task added after this one before assuming there's nothing to do. |
| 2026-09-09 | Methodology session | Added the "Task decomposition & session-pointer methodology" section as a standing priority rule for all future tasks: full scope splits into a fixed 5-level hierarchy (`1-5` → `a-d` → `i-iii` → `zi/zo` → `x`), with exactly one active pointer (a full path ending in `x`) at any time. A session's job is to complete only that one `x`, then advance the pointer depth-first/left-to-right per the documented order. Does not replace the Standing handoff process (patches/direct-push/migrations) — governs sequencing of work, not delivery mechanics. Not applied retroactively to the now-closed Task 1; applies from the next task opened onward. |
| 2026-09-13 | Task-opening session | Opened Task 2 (Android App toggle should default ON, scoped to `[countryCode]` application flow) as the first task run through the new pointer methodology. Investigated the codebase to lay out the full known architecture (client default, submit-time serialization, DB column defaults, downstream consumers) across the `1-5/a-d/i-iii/zi-zo/x` tree; not every branch is decomposed yet, only what's needed to reach a real first `x`. Root cause found: `StoreConfigStep.tsx`'s `data.androidApp || false` can't distinguish "unset" from "explicitly false" — fix is `??`, not a literal flip. Confirmed the identical bug exists in the separate legacy `src/app/reseller/` flow but is explicitly out of scope per the task's stated boundary. Active pointer set to `1.a.ii.zi.x` — the single-line fix in `StoreConfigStep.tsx` line 115. No patch produced yet; next session should deliver that one line via the normal patch process, then advance the pointer per the methodology. |
| 2026-09-15 | Pointer-execution session | Delivered `1.a.ii.zi.x`: changed `StoreConfigStep.tsx` line 115 to `data.androidApp ?? true` (commit `b04ae78`). Verified via `git diff` that only the live line changed, not any of the file's commented-out historical duplicates of the same string. Completed `1.a.ii.zo.x` as a verification-only step (no code change needed) — traced every `setFormData`/`onChange` call site in the file and confirmed all of them preserve `androidApp` via spreading existing state rather than re-initializing it. Advanced the pointer to `1.a.iii.zi.x`: read `getApplicationDraft.ts` and confirm it doesn't apply its own defaulting to this field. Patch for the `1.a.ii.zi.x` code fix produced and handed off in this session — see patch filename below. |
| 2026-09-15 | Pointer-execution session (cont.) | Completed `1.a.iii.zi.x` and `1.a.iii.zo.x` (verification-only): both `getApplicationDraft.ts` and `saveApplicationDraft.ts` reference a table/columns (`reseller_applications`, `application_data`, `current_step`, `draft_saved_at`) that don't exist in the live schema, but both are only called from code that's entirely commented out in `ApplicationWizard.tsx` — no live path exists for this task's concern to matter. Logged the dead-code/phantom-table issue as a separate, unaddressed finding rather than fixing it (out of scope for Task 2). Advanced the pointer to `1.b.ii.zi.x`: the mirror `|| false` bug in `ApplicationWizard.tsx` line 127's submit-time serialization. No patch produced this round — pure investigation/documentation turn, no code changed. |
| 2026-09-16 | Pointer-execution session | Delivered `1.b.ii.zi.x`: changed `ApplicationWizard.tsx` line 127 to `String(formData.androidApp ?? true)` (commit `a02ca8f`) — same bug pattern as `1.a.ii`, one layer up. Completed `1.b.ii.zo.x` (verification-only): the only other reference to `formData.androidApp` in the file is a plain truthy guard (notification-icon attach condition), not a re-derivation — no fix needed. Advanced the pointer to `1.b.iii.zi.x`: confirm `submitApplication.ts` line 40's `=== "true"` parsing is still correct given what `1.b` now always sends. |
| 2026-09-16 | Pointer-execution session (cont.) | Closed `1.b.iii` (both `zi`/`zo` — no fix needed, only caller confirmed), `1.c` (UI copy — closed with no change, no product ask to update it), `1.d` (nothing surfaced, closed empty), and branch `2` (same file/line as `1.b.iii`, already resolved). `1` and `2` are now fully done. Moved to branch `3` (DB column defaults): drafted `supabase/migrations/20260916_default_android_app_true.sql` setting `DEFAULT true` on both `global_reseller_applications.android_app` and `resellers.android_app`, explicitly with no `UPDATE` statement (existing rows must not be backfilled). Advanced pointer to `3.a.ii.zo.x` — applying this migration to the live DB is a separate direct-command step for the user, not part of this patch. |
| 2026-09-17 | Task-closing session | User applied the migration in Ubuntu (`ALTER TABLE` x2, no errors) and pushed a refreshed `schema.sql` snapshot directly (`fce05f6`) per the schema-snapshot rule. Diffed `schema.sql` before (`c099f24`) vs. after (`fce05f6`): confirmed the *only* `public.*` schema changes are the two intended `DEFAULT false` → `DEFAULT true` flips — no backfill, no other drift (the rest of the diff is Supabase's own managed `auth` schema picking up unrelated platform features between dumps). Completed branch `4` (downstream consumers) as verification-only: `PublishingPlans.tsx` and `ReviewStep.tsx` both already read the persisted value correctly, no code changes needed. Closed branch `5` (nothing surfaced). **Task 2 is now RESOLVED** — every branch of the `1-5` architecture is closed; see the "Resolution summary" table in the task section above. One known follow-up deliberately left open, not folded into this task: the dead-code/phantom-table finding in `getApplicationDraft.ts`/`saveApplicationDraft.ts`. |
| 2026-09-17 | Follow-up sequencing session | User asked to leave Task 2's phantom-table/dead-code follow-up alone for now, but to chain it right after the Task 1 password-rotation reminder rather than let it get lost. Added a "Chained reminder" note in Task 1's status block: once the DB password is actually rotated (project wrap-up), also raise the `getApplicationDraft.ts`/`saveApplicationDraft.ts` issue at that same checkpoint. No urgency forcing it earlier — it's inert dead code today. |
| 2026-09-17 | Build-fix session (Task 3) | User pasted a live Vercel build failure (`admin/error.tsx` must be a Client Component). Traced to the file being 0 bytes, then discovered 89 more empty Next.js special route files that would each break the build in turn, plus an entire orphaned `src/components/reseller/modals/` directory (8 files) with stale/broken API calls, plus several unrelated real bugs (async-params migration gaps, an orphaned duplicate route, a type mismatch, a dead no-op config export). User chose **Option A** (honest placeholders, not real feature builds) as the standing policy for scaffold routes going forward, unless a task specifically targets that route. Added the new "Standing policy" section codifying this. Fixed everything, verified with a full local `next build` (0 errors, 0 warnings, 72 pages) using temporary, fully-reverted local-only stubs to work around this sandbox's lack of network access to Google Fonts. Committed locally as `104bef2`; patch generation and push command follow this log entry. |
| 2026-09-19 | Deploy-confirmation session | User applied and pushed both Task 3 patches (`c21232f`, `8351a70`) and confirmed the resulting Vercel deploy on `handover/supabase-dump` is green. **Task 3 is fully closed** — matches the local verification from the prior session, now confirmed against the real Vercel build environment rather than just this sandbox's approximation of it. |
| 2026-09-19 | Task-opening session | Opened Task 4 (rebuild `[countryCode]/[storeName]` into a wallet/PIN/login customer storefront, replacing cart/checkout entirely) from the attached `TASK-CUSTOMER-STOREFRONT-BRIEF.md`. Read `old-storeName/StoreContent.tsx` in full (3920 lines) and verified every specific behavioral claim in the brief against the actual code. Corrected/added eight findings beyond the brief's own draft architecture — most significantly: `global_reseller_stores` is dead unused schema (don't build against it); the purchase/fulfillment RPCs (`create_purchase_order` etc.) are confirmed legacy-table-bound (`INSERT INTO reseller_orders`, not `global_orders`) and need new `global_*` equivalents, not reuse; `CountryConfig` already has `phoneCode`/`currency`/`currencySymbol`/`paymentGateway.methods`, shrinking the "multi-country adaptations" branch considerably; and a real bug in the current `page.tsx` (`p.network` should be `p.provider` — `global_plans` has no `network` column). User confirmed the funding-model split (xixapay/virtual-account for NG only, mobile money via korapay with flutterwave as korapay's fallback everywhere else) — verified this is already correctly implemented for the reseller's own wallet (`FundWalletModal.tsx` + `fundWallet.ts` + `getPaymentGatewayByCountry`), giving a direct template to reuse for the customer side. Laid out the full `1-5/a-d/i-iii/zi-zo/x` architecture; set the active pointer to `1.a.ii.zi.x` — drafting the schema migration (auth columns + unique constraint on `global_customers`, plus two new customer wallet/virtual-account tables). No patch produced yet. |
| 2026-09-19 | Pointer-execution session | Delivered `1.a.ii.zi.x`: drafted `supabase/migrations/20260919_customer_auth_wallet_schema.sql` (commit `cbe9f9e`) — three new `global_customers` columns, a `UNIQUE (reseller_id, email)` constraint with a pre-flight duplicate-check `DO` block, and two new tables (`global_customer_wallets`, `global_customer_virtual_accounts`) mirroring the reseller-side equivalents' exact shapes. Completed `1.a.iii` (verification-only): checked every current reader/writer of `global_customers` and confirmed the new unique constraint matches existing application-layer duplicate-email rejection in `createCustomer.ts` — safe to apply. Also noted (not fixed, out of scope) that 13 pre-existing "historical" migration files are all 0 bytes, same scaffolded-but-never-filled-in pattern found elsewhere in this project. Advanced the pointer to `1.a.ii.zo.x` — applying the migration to the live DB is a separate direct-command step for the user, not part of this patch. |
| 2026-09-20 | Pointer-execution session | User applied the migration in Ubuntu and pushed a refreshed `schema.sql` directly (`b13940f`). Diffed before/after: confirmed only the intended additions landed. `1.a` is now fully closed. Wrote and delivered `registerCustomerToGlobalReseller.ts` (`1.b.i`, commit `dda6686`) and `getGlobalCustomerAuthEmail.ts` (`1.b.ii`, commit `6ad1b85`), both mirroring their legacy equivalents against `global_*` tables, each with a documented, deliberate deviation (NOT NULL `last_name` handling; country-resolved wallet currency; `.maybeSingle()` over `.single()`). Verified both with a full-project `tsc --noEmit` (0 errors), not just isolated single-file checks. `1.b.i` and `1.b.ii` are now fully closed. Advanced the pointer to `1.b.iii.zi.x` — the client-side auth handler mirroring legacy's `handleAuth`; flagged that its exact file location depends on how far `StoreContent.tsx`'s rebuild (branch `3.a`) has progressed by the time that session starts, rather than assuming a location now. |
| 2026-09-21 | Pointer-execution session | Confirmed `StoreContent.tsx` (branch `3.a`) still untouched (208 lines, old cart version) — wrote `useCustomerAuth.ts` (`1.b.iii.zi`, commit `e805e41`) as a standalone hook rather than inline. Caught and preserved an easy-to-miss legacy behavior: the storefront's own login form doubles as an owner-login shortcut, now checking `user_metadata.store_slug` (confirmed present on reseller accounts via `submitApplication.ts`) instead of legacy's `store_name`, redirecting to the country-prefixed dashboard route. Explicitly deferred `1.b.iii.zo` (can't verify against `StoreContent.tsx`'s auth-state shape until `3.a` exists) rather than treating it as done or as the pointer. Moved to branch `1.c`: wrote `getGlobalCustomerWallet.ts` (`1.c.i`, commit `d2a5f4d`), and this time verified `zo` properly with an explicit field-by-field cross-check against `schema.sql`'s actual column lists, not just a `tsc` pass (which doesn't validate Supabase column names at all in this codebase). Flagged a real gap for `1.c.ii`: legacy's virtual-account-creation existing-check needs an `auth_user_id` column that `global_customer_virtual_accounts` doesn't have. `1.b` and `1.c.i` are now fully closed. Advanced the pointer to `1.c.ii.zi.x` — the virtual-account creation action, which must resolve the flagged column gap as part of the same step, not defer it further. |
| 2026-09-21 | Pointer-execution session | Confirmed both `createGlobalCustomerVirtualAccount.ts` patches from the prior session applied cleanly (`c860fc9`, `3400740`). Started `1.c.iii`: confirmed `global_transactions` genuinely has no `customer_id` column and, following legacy's actual precedent (a dedicated `reseller_customer_transactions` table, not a shared one), drafted `supabase/migrations/20260921_customer_transactions_schema.sql` adding `global_customer_transactions`. Separately flagged (not fixed, not blocking today) that `global_customer_virtual_accounts`'s `UNIQUE (reseller_id, customer_id)` constraint would need loosening before a customer could ever hold more than one virtual account — a real divergence from legacy's array-based design, currently masked because only one bank code is ever requested. Renumbered the remaining `1.c` work: `iii` is now the schema step just delivered, the actual funding action moves to `1.c.iv`. Advanced the pointer to `1.c.iii.zo.x` — applying this migration directly in Ubuntu, same pattern as `1.a.ii.zo.x`. |
| 2026-09-21 | Pointer-execution session | User applied the `global_customer_transactions` migration in Ubuntu and pushed a refreshed `schema.sql` directly (`f14d676`). Diffed before/after: confirmed only the intended table/indexes/FKs landed. `1.c.iii` is now fully closed. Wrote and delivered `fundGlobalCustomerWallet.ts` (`1.c.iv.zi`), mirroring `fundWallet.ts`'s korapay/flutterwave pattern, deliberately erroring out for xixapay-gateway resellers (config-driven, not hardcoded) since those countries already fund via the persistent virtual account instead. Found and deliberately did not repeat a real pre-existing bug: `handleSuccessfulDeposit.ts` updates two columns (`completed_at`, `provider_reference`) that don't exist on `global_transactions` at all — almost certainly means reseller Flutterwave deposits silently fail to ever be marked completed; flagged as an independent bug outside this task's scope, not fixed here. Verified `1.c.iv.zi` with a full-project `tsc --noEmit` (0 errors) plus a schema cross-check. Flagged the real remaining gap plainly rather than calling `1.c` done: nothing yet marks a customer deposit `completed` or credits `global_customer_wallets` on webhook callback — none of the three gateway webhook routes have any concept of a customer-scoped transaction yet. Advanced the pointer to `1.c.v.zi.x` — the customer deposit completion handler plus webhook-route wiring, explicitly called out as likely needing its own further split once someone is actually in those four route files. |
| 2026-09-24 (follow-up) | Status-check / reference session | Pulled latest before doing anything else — confirmed the prior same-day patch (`ed9b84f`) had landed, and that it already sits on top of independent `1.d.i.zi.x` RPC work (`95c4111`/`be329ea`) and the pointer advance to `1.d.ii` (`63b0fab`), none of which conflicts with this session's docs-only change. Resolved the `purchase-airtime`/`purchase-data` flag left by the prior entry: traced both functions through every caller in both repos (legacy `purchasePlan.ts` doesn't call them at all; a separate public v1 developer API does, against an `api_users` schema confirmed absent from `schema.sql`; the mobile `reseller-app`'s own customer purchase hook also calls them, with a non-overlapping payload shape, implying internal branching). Full trace with citations replaces the earlier flag in the "Edge functions manifest" section above. Net conclusion: unrelated to `1.d`'s scope, doesn't block `1.d.ii`. No application code written; active pointer unchanged (`1.d.ii`).
| 2026-09-24 | Status-check / reference session | Reconfirmed project standing per the session bootstrap rule (both repos re-cloned, latest branch `handover/supabase-dump` confirmed on both — no drift from the last log entry). User pasted a Management-API function-list dump (fetched via PAT, not from this session). Added `supabase/edge-functions.json` as a new checked-in reference manifest (metadata only — no source, no secrets) and documented it in a new "Edge functions manifest" section above, including its update process (normal patch handoff, not the schema.sql direct-push exception, since it doesn't require live DB access to produce). **Flagged, not yet investigated**: the manifest surfaced `purchase-airtime` (v22) and `purchase-data` (v24), functions absent from Task 4's existing "Reality check" (finding #6), predating both Task 4's opening and this manifest. Left as an open flag for the `1.d.i.zi.x` session to check before drafting new RPCs — did not read either function's source or draw conclusions about what they do. Active pointer unchanged (`1.d.i.zi.x`); no code written this session.
| 2026-09-21 | Pointer-execution session | Read all four webhook routes before writing anything, per the previous session's own instruction — found a much messier picture than assumed: four mutually-inconsistent completion implementations (korapay inline, flutterwave inline with a dead `handleSuccessfulDeposit` import, xixapay inline with a different no-pending-row model, and a fourth `[countryCode]/payment/route.ts` calling a legacy RPC that's likely orphaned/not live). Confirmed `handleSuccessfulDeposit.ts` is genuinely dead code (imported, never called) and removed the dead import while already editing that file. Found a real, likely-live bug separate from Task 4: three of the four routes update `completed_at`/`provider_reference` columns that don't exist on `global_transactions` at all — reseller deposits via any of them may never actually get marked completed; flagged clearly, not fixed (out of scope, pre-existing, reseller-side). Scoped this atomic step to the korapay/flutterwave completion path only, since that's what `fundGlobalCustomerWallet.ts` (1.c.iv) actually produces (an initiate-then-webhook-matches-by-reference model) — xixapay virtual-account transfers have no pre-existing pending row to match at all and need a different lookup (by receiving account number), split out as `1.c.vi` rather than bolted on here. Delivered `handleSuccessfulCustomerDeposit.ts` plus wiring into `korapay/route.ts` and `flutterwave/route.ts` (each now falls back to `global_customer_transactions` before 404ing), deliberately not repeating the `completed_at`/`provider_reference` bug. Verified with a full-project `tsc --noEmit` (0 errors) plus a schema cross-check. Advanced the pointer to `1.c.vi.zi.x` — xixapay customer virtual-account webhook attribution. |
| 2026-09-21 | Pointer-execution session | User clarified the first-deposit bonus product rule directly: reseller-only, app-initiated only, never for customers. Implemented the xixapay customer virtual-account attribution branch in `xixapay/route.ts`: falls back to matching the webhook's receiving account number against `global_customer_virtual_accounts` when no pending row exists in `global_transactions` (confirmed via `fundWallet.ts` that a pending row for xixapay only ever exists for reseller-initiated top-ups, never for a raw transfer into any persistent virtual account), inserting a new completed `global_customer_transactions` row directly with its own idempotency check by reference (no pre-existing pending row to guard duplicates with here, unlike every other branch in this file). Confirmed the `receiver.account_number` field name by finding it already used elsewhere in the same file rather than guessing at xixapay's payload shape. Also fixed the existing reseller-side first-deposit bonus check, which had no source gating at all, to require `source === "app"`, per the user's stated rule — a real, direct behavior change on existing reseller code, made because it was explicitly requested. Verified with a full-project `tsc --noEmit` (0 errors) plus a schema cross-check. Branch `1.c` (wallet & virtual account actions) is now fully closed. Advanced the pointer to `1.d.i.zi.x` — branch `1.d`, the purchase action, flagged as likely to need the same careful multi-step treatment as `1.c` rather than fitting one atomic step. |
| 2026-09-22 | Pointer-execution session | Re-read `purchasePlan.ts` and all four legacy RPC bodies directly in `schema.sql` before writing anything, per the pickup brief. Delivered `supabase/migrations/20260922_global_purchase_rpcs.sql` — `get_global_reseller_balance`/`deduct_global_reseller_cost`/`process_global_purchase_deductions`/`create_global_purchase_order`, mirroring legacy logic against `global_wallets`/`global_customer_wallets`/`global_orders`. Resolved two real schema deviations directly rather than guessing: `global_wallets` has no `total_sales`/`total_profit` (confirmed `get_global_reseller_dashboard_stats` computes those live from `global_orders` instead, so the new deduction RPC only touches `balance`); `global_orders` requires `customer_id`/`customer_name`/`plan_name` that `reseller_orders` never had, so `create_global_purchase_order`'s signature is correspondingly wider — flagged as something `1.d.iii` (the purchase action itself) needs to supply, especially the reseller-self-purchase placeholder for `customer_name`. Also found and flagged (not fixed, out of scope for `1.d.i`): `src/lib/providers/` (a `ServiceProvider` abstraction with `lizzysub`/`accragh`/`zendit` implementations) already exists but has zero callers anywhere in the repo, and its `lizzysub.ts` calls a fictional REST endpoint that doesn't match the real, live Lizzysub integration (Supabase Edge Functions, numeric `NETWORK_MAP`) — flagged so `1.d.ii` doesn't get built on top of it without first confirming `zendit`/`accragh` against their real upstream APIs too. Verified with a full-project `tsc --noEmit` (0 errors, SQL-only change) plus a manual field-by-field cross-check against `schema.sql`. Advanced the pointer to `1.d.i.zo.x` — applying this migration directly in Ubuntu, same pattern as `1.a.ii.zo.x`/`1.c.iii.zo.x`. |
| 2026-09-23 | Pointer-execution session (cont.) | User applied `20260922_global_purchase_rpcs.sql` directly via `psql` in Ubuntu — all four `CREATE FUNCTION` statements succeeded. Caught a real issue before the schema snapshot: the most recent existing dump (`~/supabase-dumps/2026-09-20_060331/`) predated the migration by three days, so it was flagged as stale and not used — a fresh `pg_dump` was taken instead (`~/supabase-dumps/2026-09-23_135321/`), grep-confirmed to contain all four new function names before copying over `supabase/schema.sql` and pushing directly (schema snapshot exception, not a patch). Re-confirmed post-push that the committed `schema.sql` has all four functions with the exact signatures from the migration. Separately, corrected a false alarm raised earlier in the same session: commits that appeared in the `git pull` before `git am` (`fundGlobalCustomerWallet.ts`, webhook wiring, xixapay fix) looked like a concurrent session at a glance, but all predate `394539e`, the commit this session's own bootstrap had already checked out as HEAD before starting — not concurrent, just a stale local Ubuntu clone catching up on already-existing history. No reconciliation needed. Branch `1.d.i` (global purchase RPCs) is now fully closed. Advanced the pointer to `1.d.ii` — provider-dispatch layer — with the `src/lib/providers/` finding from the prior entry carried forward as the first thing to check before writing anything there. |
| 2026-09-27 | Pointer-execution session | Read the actual source of `lizzysub-proxy`, `airtime_proxy`, `purchase-data`, and `purchase-airtime` via the Management API's function-body endpoint (Deno eszip binary, source recoverable from its embedded sourcemap). Confirmed `purchase-data`/`purchase-airtime` are a real, live, working reference implementation of the exact wallet+PIN+markup+fulfillment flow `1.d` needs, just on legacy tables - fully traced and documented as a 12-step flow. Cross-checked the previous session's `1.d.i` RPCs (`20260922_global_purchase_rpcs.sql`) against the RPC names this reference calls and confirmed a one-to-one match, validating that work without needing to revisit it. Found and flagged (not fixed, unrelated to Task 4) a real security issue: `lizzysub-proxy`/`airtime_proxy` hardcode the live Lizzysub API token in plaintext, unlike `purchase-data`/`purchase-airtime`, which correctly read it from an environment variable - did not reproduce the exposed token value anywhere in this repo. Sharpened the `1.d.ii` blocker: `src/lib/providers/lizzysub.ts` needs rewriting to match the two real endpoints and the real numeric `NETWORK_MAP` confirmed above, rather than the fictional generic REST shape it currently has. Per the person's explicit instruction, left `accragh.ts`/`zendit.ts` untouched - new edge functions for those are being built separately and those provider files should be confirmed against that work once it exists, not guessed at now. Advanced the pointer to `1.d.ii.zi.x`: rewrite `lizzysub.ts` only. |
| 2026-10-03 | Pointer-execution session | Person directed a change in approach: build dedicated `global-purchase-data`/`global-purchase-airtime` edge functions mirroring `purchase-data`/`purchase-airtime`'s proven architecture directly, rather than fixing `src/lib/providers/lizzysub.ts` for Next.js-side use - `src/lib/providers/*.ts` remains untouched, unused dead code. Read real API documentation supplied for all three providers. Found a critical timing-model mismatch: Lizzysub is synchronous, AccraGH and Zendit are both asynchronous (AccraGH's own docs confirm the wallet charge happens at a later `processing` stage, not the initial accepted response; Zendit returns only a `transactionId` to poll/await a webhook for). Built `_shared/providers.ts` with an explicit `final: boolean` result field so the orchestrator never deducts a wallet for an order that isn't actually confirmed yet. Closed two schema gaps additively (reseller `transaction_pin`, widened `global_transactions.type` to include `purchase`/`refund`). Delivered the full shared orchestrator (`_shared/purchaseOrchestrator.ts`) plus both thin entrypoints, verified with `deno check` (installed via npm, works cleanly on this sandbox) and a full schema cross-check - all fields match. Added `supabase/functions` to `tsconfig.json`'s exclude first, since the main Next.js `tsc` run would otherwise try to check Deno-flavored files and break. Explicitly left two things undone and flagged clearly: no webhook handler exists yet for AccraGH or Zendit, so a `pending` order from either provider will sit pending indefinitely until one is built; and these are edge functions, not part of the Next.js app, so this patch landing does not deploy them - that needs a separate `supabase functions deploy` step, plus `ACCRAGH_API_KEY`/`ZENDIT_API_KEY` env vars confirmed set. Advanced the pointer to `1.d.iv.zi.x`: the two webhook handlers, flagging that Zendit's webhook has no documented signature-verification scheme at all - don't assume it's safe to skip verification just because it wasn't found in the docs provided. |
| 2026-10-04 | Pointer-execution session (manual-steps handoff) | Applied the three manual follow-up steps flagged incomplete in the 2026-10-03 entry, all confirmed working on the first try: (1) `20261003_purchase_schema_additions.sql` applied directly via `psql`; fresh `pg_dump` taken (`~/supabase-dumps/2026-10-04_063726/`), grep-confirmed both changes present (`transaction_pin`, widened `global_transactions_type_check`) before copying over `schema.sql` and pushing (commit `4214155`). (2) Supabase CLI installed and used for the first time from any sandbox/Ubuntu session — authenticated via `SUPABASE_ACCESS_TOKEN` env var rather than interactive `supabase login`, which doesn't suit a headless proot shell; `supabase link --project-ref jjyyfaxcwanrmiipzkoj` then `supabase functions deploy` for both `global-purchase-data` and `global-purchase-airtime`, each confirmed via the "Deployed Functions on project..." success line (the "Docker is not running" warning alongside it is expected/harmless — CLI falls back to remote bundling). (3) `ACCRAGH_API_KEY`/`ZENDIT_API_KEY` set via `supabase secrets set`, confirmed present via `supabase secrets list` (digest-only output, safe to review — also surfaced, in passing, that `LIZZYSUB_API_KEY` and `LIZZYSUB_TOKEN` carry the same digest, i.e. the same value under two names; not actioned, not this task's concern). Filled in the previously-unverified "Deploying an edge function" section in this doc with the actual proven command sequence, since it had been an open item since 2026-09-08. All three of `1.d.iii`'s outstanding manual-deployment items are now done — the webhook-handler gap (`1.d.iv.zi.x`) remains the only thing left open on this branch, unchanged from the prior entry. |
| 2026-10-05 | Pointer-execution session | Bootstrapped both repos (latest branch `handover/supabase-dump`: `Edges_LandingPage` @ `85b9063`, `reseller-app` @ `467a680`). Found `TASK-4-PICKUP-BRIEF.md` stale (it still names `1.d.i.zi.x`; HANDOVER.md's `1.d.iv.zi.x` is correct — brief left untouched, flagged). At the person's request did `1.d.iv` one provider at a time: AccraGH first, Zendit next. Built the AccraGH webhook from NetFillGh's own docs: atomic `settle_global_pending_purchase` SQL function (row-locked, idempotent, `service_role`-only), HMAC signature verifier, and the `accragh-webhook` edge function. Tested beyond `tsc`: SQL run on a local Postgres 16 built from the real `schema.sql` table definitions (9 scenarios incl. a real concurrent double-delivery), 6 verifier unit tests, `deno check`, and the live handler for every non-DB path. Found and flagged, not fixed: `global_transactions.description` NOT NULL violated (silently) by the deployed orchestrator's ledger inserts; unverified `EXECUTE` grants on the `1.d.i` money RPCs; manual stuck-order reconciliation; webhook is account-wide; NetFillGh API key was exposed in pasted docs (not written to any file). Manual deploy steps handed off and recorded as NOT YET DONE. Advanced the pointer to `1.d.iv.zo.x` (Zendit), blocked on Zendit's webhook/status docs. |
| 2026-10-06 | Pointer-execution session (continued) | Confirmed `1.d.iv.zi` manual steps with evidence: both patches and the `f083a6f` schema snapshot landed on `handover/supabase-dump` (content identical to tested versions; `public` schema diff = the new function + index only); migration applied; `settle_global_pending_purchase` `proacl` is `postgres`+`service_role` only; `accragh-webhook` ACTIVE v3 with JWT verification off; URL registered at NetFillGh; `ACCRAGH_WEBHOOK_SECRET` set (digest verified against the typed value); live endpoint check GET 405 / unsigned POST 401. **Live smoke test NOT run** (person unavailable) — recorded as open item 6. `proacl` query CONFIRMED the four `1.d.i` money RPCs are executable by `anon`/`authenticated` (recorded above, fix proposed, not yet approved/applied). Also recorded secrets-list observations (`EXPO_PUBLIC_*` duplicates of secret keys; stray secret named like an email). Pointer unchanged: `1.d.iv.zo.x` (Zendit, blocked on docs); the grants-revoke step is proposed ahead of it pending the person's decision. |
| 2026-10-06 | Pointer-execution session (correction) | Found the NetFillGh webhook URL had been registered as `telcos.govt.hu/webhooks/netfillgh` (the NG-only Next.js site; no route for it on `main` or the branch), not the edge function — the earlier log entry and step 4 wrongly recorded it as the function URL (assumed, not verified). Person re-registered `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/accragh-webhook`; the signing secret did not change, so `ACCRAGH_WEBHOOK_SECRET` stays valid. Corrected step 4 above. Also recorded: nothing in the app calls the new purchase functions yet, and the branch (283 commits ahead of `main`, clean fast-forward) is unmerged, so the smoke test cannot run via the storefront; simulated-webhook alternative noted. Pointer unchanged (`1.d.iv.zo.x`); revoke-grants step still awaiting the person's go-ahead. |
| 2026-10-06 | Status-check / planning session | Person reviewed all deferred items across Tasks 1–4 and directed that this session's open items be deferred to the project-completion stage, to be done when the project is completed (same convention as the DB-password rotation). Added the new "Project-completion stage — deferred items" section above as the single wrap-up checklist (revoke migration for the four open money RPCs, orchestrator `description` fix, NetFillGh key rotation, secrets hygiene incl. `EXPO_PUBLIC_*` and the plaintext Lizzysub token, `edge-functions.json` refresh, AccraGH smoke test), and updated the revoke finding to say deferred. The assistant's own note that item 1 should be closed before real customer money flows through the global platform is recorded as a note, not a decision. Pointer unchanged: `1.d.iv.zo.x` (Zendit), blocked on docs. |
| 2026-10-06 | Pointer-execution session (1.d.iv.zo) | Read Zendit's webhook, transaction-processing and API docs. Found: no payload signature; authentication is a console-configured secret header + IP allow-list; HEAD required; separate webhooks per product type and environment; `transactionId` is client-supplied (our `requestId`, already stored as `transaction_reference`). Built `zendit-webhook`: secret-header auth (constant-time, rotation overlap via `ZENDIT_WEBHOOK_SECRET_PREVIOUS`), then confirms every final status against Zendit's API with our own key before calling the existing provider-agnostic `settle_global_pending_purchase` (no SQL change). Verified: `tsc` 0 errors, `deno check` clean (fixed one real typing error), 21/21 Deno tests, and the real handler end-to-end against the real SQL function on local Postgres (7 scenarios incl. the webhook-before-order race, forgery attempts, provider isolation). NOT done and recorded as open: the manual steps (secret, deploy with `--no-verify-jwt`, Zendit console registration, IP allow-list check) and the smoke test (deferred to project completion). Pointer advanced to `2.a` (branch 2, not yet decomposed). |
| 2026-10-08 | Pointer-execution session (1.d.iv.zo follow-up) | Person reported the Zendit console step done (Production environment, Topup type, address = the `zendit-webhook` URL, header `X-Webhook-Token`, Verify passed and Confirmed), showed `supabase functions list` (zendit-webhook ACTIVE v1, 2026-10-07 06:04 UTC) and `supabase secrets list` (ZENDIT_WEBHOOK_SECRET present), and supplied Zendit's five webhook sender IPs. Production environment recorded as person-stated. The remote's six touched files were compared blob-for-blob with the delivered commit (identical), so manual steps 1–5 are recorded DONE with that evidence; the header value matching the secret is still unproven because Verify only sends HEAD. Added a source-IP allow-list to `zendit-webhook`, **observe-only by default** (`ZENDIT_WEBHOOK_ENFORCE_IPS=true` to block), because the IP list is unverified against Zendit's docs and a wrong list would 403 real webhooks. Provenance note: the sandbox repo contained an unpushed assistant-authored draft commit (`061e710`, enforce-by-default) with no record in the conversation; it was reviewed, its code adopted, its default changed to observe-only, and its verification claims re-run rather than trusted. Verified: `tsc` 0 errors, `deno check` clean, 26/26 Deno tests (5 new for the allow-list), and the real handler end-to-end against the real SQL function on local Postgres (7 scenarios, requests carrying a Zendit source IP) with the same balances as before. Corrected the smoke-test notes: with a production key a Zendit live test spends real money. Re-run again by the reviewing session this date: 26/26 Deno tests, `deno check` clean, `tsc` 0 errors, e2e identical. Still open: step 6 (check the Zendit API IP whitelist), step 9 (apply the allow-list patch and redeploy), confirming the header secret on the first real webhook, and the deferred smoke test. |
| 2026-10-09 | Pointer-execution session (1.d.iv.zo live checks) | Person ran three live checks against the deployed `zendit-webhook` (right token + IN_PROGRESS → 200 `acted:false`; wrong token → 401; right token + DONE for a nonexistent transaction → 200 `ignored: unknown transaction`). Together they show the function is reachable, the stored secret equals the typed value, wrong tokens are refused, and the production Zendit API key works from Supabase (so no API IP whitelist is blocking edge functions — step 6 recorded DONE by evidence). Verified the allow-list commit `e310fdb` is on the remote and its code equals the local clone; re-ran 26/26 Deno tests and `deno check` (clean). Re-read Zendit's webhooks page: it tells integrators to whitelist "the IP addresses from our service" but lists none, so the five IPs remain person-supplied and unverified — observe-only stands. NOT proven: which code version those checks hit (no deploy output was shown; step 9 stays OPEN with a log-line test to settle it), and that the header value in the Zendit console equals the secret. Pointer unchanged (`2.a`). |
| 2026-10-09 | Pointer-execution session (1.d.iv.zo allow-list live) | Person redeployed `zendit-webhook` from Ubuntu (version 2, 2026-10-09 05:00:40 UTC); deployed files byte-identical to the tested versions on the remote. Person-supplied function logs show the new code live (`source <ip> is NOT in the allow-list (observe-only …)` at 05:03:09 UTC) and that `cf-connecting-ip` reaches the function with the real client address, so the header assumption behind the allow-list is now proven; the person's own IP is intentionally not recorded. The logs also show the earlier three live checks ran on version 1 (an earlier session had correctly refused to assume otherwise). Step 9 recorded DONE; enforcement stays OFF (`ZENDIT_WEBHOOK_ENFORCE_IPS` unset) until a real Zendit webhook shows `POST from allow-listed source`, because whether the five IPs match Zendit's real senders is still unproven. Still open for Zendit: the header value saved in the Zendit console equalling the secret (shown only by the first real webhook), and the deferred smoke test. Pointer unchanged (`2.a`). |
| 2026-10-09 | Pointer-execution session (1.d.iv.zo IP list confirmed) | Person pasted the text from the Zendit console's webhook dialog: five sender IPs plus "Zendit Webhooks will arrive from the IP addresses listed above" and "To verify the authenticity of a webhook call, you may check the transaction status through the Gateway API". The five addresses are identical, character for character and in order, to `ZENDIT_WEBHOOK_IPS` in the code, so the allow-list is now first-party-sourced rather than person-supplied and unverified; Zendit's own advice to confirm authenticity through the API is exactly the re-confirmation step the handler already does. Updated the code comment and the HANDOVER paragraph accordingly (comment-only: no behaviour change, no redeploy required). Enforcement stays OFF; the assistant's recommendation is to enable it after the first real webhook shows `POST from allow-listed source`, the person's call. Pointer unchanged (`2.a`). |
| 2026-10-09 | Pointer-execution session (2.a decomposition) | Bootstrapped both repos (latest branch `handover/supabase-dump`: `Edges_LandingPage` @ `ec0b12b`, `reseller-app` @ `467a680`) and read this file in full plus the pickup brief. Brief's section 3 was stale (named `1.d.i.zi.x`); this file's pointer `2.a` was correct, so the brief got a pointer-to-HANDOVER note. `2.a` was not atomic, so per the pointer rule this session decomposed it and stopped. Read all four `[storeName]` money-formatting sites, the legacy `formatNaira` (7 call sites), both existing currency helpers, `CountryConfig` and the `global_plans` columns. Finding: the storefront already reads `config.currencySymbol`; what's wrong is a dead `|| "₦"` fallback, locale-less `.toLocaleString()` (possible server/client hydration mismatch), and copy-pasted formatting, not a Naira hardcode. Existing `formatPrice`/`formatCurrency` do not fit (spacing, forced decimals, dashboard dependency), so a new `formatStorePrice` helper is planned. New tree under `2.a` (i helper, ii adopt in `StoreProducts`/`StoreHero`, iii closed by design). Open question for the person: Egypt's `ar-EG` locale renders Arabic-Indic digits. No application code changed; full-project `npx tsc --noEmit -p tsconfig.json` still 0 errors (run anyway, as a baseline for `2.a.i.zi.x`). Pointer advanced to `2.a.i.zi.x`. |
| 2026-10-09 | Pointer-execution session (2.a.i.zi) | Confirmed the decomposition patch landed (`410b847`). Person answered the open question: leave Egypt's digits as is (`config.locale` unchanged). Wrote `formatStorePrice.ts` (new file, no callers yet); full-project tsc 0 errors. Pointer advanced to `2.a.i.zo.x` (verify against legacy `formatNaira` and every configured locale). |
