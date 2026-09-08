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

## Two working environments, same repos (standing rule)

The user works across **two separate environments on the same Android
device**, and each maintains its **own independent clone** of both
repos — this is intentional, not a mistake to "fix" by consolidating:

| Environment | Purpose | Clone location |
|---|---|---|
| Termux (native) | Day-to-day coding, patch review, `git am` + `git push` per the standing handoff process above | `~/Edges_LandingPage`, `~/reseller-app` |
| Termux → Ubuntu (`proot-distro login ubuntu`) | DB migrations, Supabase edge functions, `pg_dump`/`pg_restore` — anything needing a full Ubuntu userland (e.g. `postgresql-client` isn't readily available in native Termux) | `~/ubuntu-repos/Edges_LandingPage`, `~/ubuntu-repos/reseller-app` |

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

**Status: OPEN — picked up by whichever session works this next.**

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
     password value ever gets pasted into a chat, treat it as
     compromised and rotate it in the dashboard immediately
     (Project Settings → Database → Reset database password) —
     don't just keep using a leaked password.

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

### Open questions for whoever picks this up
- Where should dump artifacts actually be stored long-term (S3/GCS bucket,
  encrypted volume, etc.)? Not decided yet — do not default to committing
  them to git.
- Do we need `auth` schema **data** (not just schema) dumped too, or is
  schema-only sufficient for auth? Current script dumps auth schema
  structure only, no auth data.
- Confirm whether pooler port (6543, pgbouncer) or direct port (5432)
  should be used — direct port is generally required for `pg_dump`.

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
