# HANDOVER — Master File

**This is the master handover file.** All work sessions across both repos
below should read this file first, log their status here, and add any
new task sections here. This repo is the source of truth; the mobile
repo carries a pointer file back to this one.

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
1. Pull branch `handover/supabase-dump` on `Edges_LandingPage`.
2. Get real connection details from Supabase dashboard → Project Settings →
   Database (host, port, db name, user, password). **Do not commit these.**

3. **Direct command — run this on the Termux/Ubuntu environment** (proot/chroot
   Ubuntu inside Termux, or any plain Ubuntu box). Setup + all three dumps
   combined into a single command (chained with `&&`, safe to paste as one
   block — if any step fails, the chain stops there):

   ```bash
   sudo apt-get update && sudo apt-get install -y postgresql-client && \
   export PGPASSWORD='<db-password-from-dashboard>' \
          DBHOST='db.<project-ref>.supabase.co' \
          DBPORT=5432 DBUSER='postgres' DBNAME='postgres' && \
   mkdir -p ~/supabase-dumps/$(date +%Y-%m-%d_%H%M%S) && cd $_ && \
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" --schema-only --no-owner --no-privileges --schema=public --schema=auth --schema=storage -f schema.sql && \
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" --data-only --schema=public --column-inserts -f data.sql && \
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" --format=custom --schema=public -f full.dump && \
   echo "Dump complete: $(pwd)"
   ```

   Fill in `PGPASSWORD` and `DBHOST` before running. Output lands in
   `~/supabase-dumps/<timestamp>/schema.sql`, `data.sql`, `full.dump`.

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
