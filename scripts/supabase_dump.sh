#!/usr/bin/env bash
#
# supabase_dump.sh
#
# Direct Postgres dump of the shared Supabase backend used by both:
#   - Edges_LandingPage (web, branch: handover/supabase-dump)
#   - reseller-app      (mobile, branch: handover/supabase-dump)
#
# See /HANDOVER.md (this repo) for full task context. This script is the
# "patch" referenced there — copy it into whichever environment runs the
# dump (Ubuntu box / CI runner) and fill in the connection env vars.
#
# Requires: postgresql-client (pg_dump/psql). On Ubuntu:
#   sudo apt-get update && sudo apt-get install -y postgresql-client
#
# Usage:
#   export SUPABASE_DB_HOST=db.<project-ref>.supabase.co
#   export SUPABASE_DB_PORT=5432          # 5432 direct, 6543 via pooler
#   export SUPABASE_DB_NAME=postgres
#   export SUPABASE_DB_USER=postgres
#   export SUPABASE_DB_PASSWORD=********  # from Supabase dashboard > Project Settings > Database
#   ./scripts/supabase_dump.sh [output_dir]
#
# Never commit the populated env vars / .pgpass / dump output containing
# real data to git. This script and HANDOVER.md are safe to commit;
# credentials and dump artifacts are not (see .gitignore note at bottom).

set -euo pipefail

OUT_DIR="${1:-./supabase/dumps/$(date +%Y-%m-%d_%H%M%S)}"
mkdir -p "$OUT_DIR"

: "${SUPABASE_DB_HOST:?Set SUPABASE_DB_HOST}"
: "${SUPABASE_DB_PORT:=5432}"
: "${SUPABASE_DB_NAME:=postgres}"
: "${SUPABASE_DB_USER:=postgres}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD}"

export PGPASSWORD="$SUPABASE_DB_PASSWORD"

CONN=(-h "$SUPABASE_DB_HOST" -p "$SUPABASE_DB_PORT" -U "$SUPABASE_DB_USER" -d "$SUPABASE_DB_NAME")

echo "==> Dumping schema (roles, tables, RLS policies, functions/RPCs, triggers) ..."
pg_dump "${CONN[@]}" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=auth \
  --schema=storage \
  -f "$OUT_DIR/schema.sql"

echo "==> Dumping data (public schema only, excludes auth/storage internals) ..."
pg_dump "${CONN[@]}" \
  --data-only \
  --schema=public \
  --column-inserts \
  -f "$OUT_DIR/data.sql"

echo "==> Dumping full cluster-compatible custom format (for pg_restore) ..."
pg_dump "${CONN[@]}" \
  --format=custom \
  --schema=public \
  -f "$OUT_DIR/full.dump"

echo "==> Dumping roles (optional, needs superuser) ..."
pg_dumpall -h "$SUPABASE_DB_HOST" -p "$SUPABASE_DB_PORT" -U "$SUPABASE_DB_USER" \
  --roles-only \
  -f "$OUT_DIR/roles.sql" || echo "    (skipped: insufficient privilege, common on hosted Supabase)"

echo "==> Done. Output in: $OUT_DIR"
echo "    schema.sql  - DDL only, safe to diff/review, safe to commit"
echo "    data.sql    - row data, DO NOT COMMIT (contains real user/business data)"
echo "    full.dump   - pg_restore-ready binary, DO NOT COMMIT"
echo "    roles.sql   - role defs if permitted, DO NOT COMMIT if it contains hashes"

# Reminder: add to .gitignore in both repos:
#   supabase/dumps/
