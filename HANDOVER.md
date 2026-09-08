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
3. The user applies each patch **from inside the target repo's working
   directory**, pointing `git am` at the file's path under
   `~/storage/downloads/`, then pushes:

   ```bash
   # Edges_LandingPage
   cd Edges_LandingPage
   git checkout reseller-gh && git pull
   git checkout -b handover/supabase-dump   # or the branch named in the task below
   git am ~/storage/downloads/<edges-landingpage-patch-file>.patch
   git push -u origin handover/supabase-dump
   ```

   ```bash
   # reseller-app
   cd reseller-app
   git checkout main && git pull
   git checkout -b handover/supabase-dump   # or the branch named in the task below
   git am ~/storage/downloads/<reseller-app-patch-file>.patch
   git push -u origin handover/supabase-dump
   ```

   Run `git am` from **inside the repo directory**, not from
   `~/storage/downloads` — only the path to the patch file points there.
4. If `git am` fails with a "does not apply" / missing-base error, the
   local `reseller-gh` / `main` branch is out of date relative to what
   the patch was built against — `git pull` the base branch first, then
   retry. If a patch series has multiple files (`0001-...`, `0002-...`),
   pass them to `git am` together in order, or apply one at a time.

**Every session that builds a patch for these repos should re-use this
process as-is and just fill in the actual patch filename(s) and branch
name for its task — do not reinvent the handoff mechanism per task.**

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
   Ubuntu inside Termux, or any plain Ubuntu box). This is the literal
   command, no script required, one line per dump type:

   ```bash
   # one-time setup on the Termux Ubuntu environment
   sudo apt-get update && sudo apt-get install -y postgresql-client

   # set connection details (fill in from Supabase dashboard)
   export PGPASSWORD='<db-password-from-dashboard>'
   export DBHOST='db.<project-ref>.supabase.co'
   export DBPORT=5432
   export DBUSER='postgres'
   export DBNAME='postgres'

   # make an output folder for this run
   mkdir -p ~/supabase-dumps/$(date +%Y-%m-%d_%H%M%S) && cd $_

   # 1) schema only (public + auth + storage) — safe to review/version
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" \
     --schema-only --no-owner --no-privileges \
     --schema=public --schema=auth --schema=storage \
     -f schema.sql

   # 2) data only (public schema) — contains real data, keep private
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" \
     --data-only --schema=public --column-inserts \
     -f data.sql

   # 3) full custom-format dump (for pg_restore) — contains real data, keep private
   pg_dump -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" \
     --format=custom --schema=public \
     -f full.dump
   ```

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

Uses the standing handoff process at the top of this file. Patch
filenames for Task 1's setup commit:

- `edges-landingpage_0001-add-handover-master-file-and-dump-script.patch`
- `reseller-app_0001-add-handover-pointer-file.patch`

Applied as:
```bash
cd Edges_LandingPage
git am ~/storage/downloads/edges-landingpage_0001-add-handover-master-file-and-dump-script.patch
```
```bash
cd reseller-app
git am ~/storage/downloads/reseller-app_0001-add-handover-pointer-file.patch
```

## Log

| Date | Session | Notes |
|---|---|---|
| 2026-09-08 | Setup session | Created both branches, wrote `scripts/supabase_dump.sh` + the direct `pg_dump` command block above, verified pg_dump installs on Ubuntu, wrote this handover file and the standing Termux handoff process. Delivered as `.patch` files, applied via `git am` from `~/storage/downloads/`. Did not run the actual dump (no live credentials in this sandbox). |
