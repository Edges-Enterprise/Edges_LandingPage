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
