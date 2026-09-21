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

### Deploying an edge function

Edge functions are deployed through the **Supabase CLI**, not `psql` —
this needs a Supabase access token/login, separate from the DB
password above. As of this session, no sandbox has that access token
configured, so this is an **open item**, not a ready-to-run command
(mirrors the "no GitHub push access" gap for code patches). Whoever
picks this up next should:

1. Confirm whether the Supabase CLI is installed in the Ubuntu
   environment (`supabase --version`); if not,
   `npm install -g supabase` (Ubuntu has `npm` via `apt-get install
   -y nodejs npm` if needed).
1. Get a Supabase access token (dashboard → Account → Access Tokens) and
   run `supabase login` once, interactively, in the Ubuntu environment
   — **do not** put the token in a patch, a chat, or a committed file.
2. Link the project once: `supabase link --project-ref jjyyfaxcwanrmiipzkoj`
   (project ref taken from the DB user `postgres.jjyyfaxcwanrmiipzkoj`
   resolved in Task 1 below).
3. Deploy with `supabase functions deploy <function-name>` from
   `~/ubuntu-repos/Edges_LandingPage` (or wherever the function source
   lives in the repo).

Update this section with the actual working command once someone has
run it successfully, the same way Task 1's dump command below was
filled in after a real run confirmed it worked.

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

**Status: OPEN. Active pointer: `1.c.ii.zi.x`** (see below).

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

2. Multi-country adaptations (smaller than originally scoped — finding #7)
   a. Currency formatter using config.currency/currencySymbol —
      not yet decomposed, likely trivial
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

### Next atomic step — active pointer `1.c.ii.zi.x`

**File (new):** a `createGlobalCustomerVirtualAccount` action mirroring
legacy's `createCustomerVirtualAccount` (`src/app/actions/reseller/wallet/customerVirtualAccount.ts`,
function starting around line 108). Per finding #5 in the "Reality
check" section above, this is **xixapay-only in practice** — Nigeria
currently, via the BVN/waitlist mechanism — but don't hardcode a
country check into this action itself; let it fail naturally/return an
error if called for a reseller whose country doesn't use xixapay,
rather than special-casing "NG" as a literal string here.

Must resolve, as part of this same `x` (not deferred to `zo`): the
missing-`auth_user_id`-column issue flagged above. Recommended
approach — a two-step lookup (fetch `global_customers.auth_user_id`
for the resolved `customer_id`, then filter
`global_customer_virtual_accounts` by `customer_id` instead of
`auth_user_id` directly) rather than a follow-up migration, since it
avoids a second schema change for a single query's convenience — but
use judgment if that turns out awkward once actually writing it.

Once this `x` is done, advance the pointer to `1.c.ii.zo.x` (verify
against the live schema, same field-by-field cross-check practice as
`1.c.i.zo`) per the pointer-advancement order in the methodology
section above.

### Delivery for this task
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
