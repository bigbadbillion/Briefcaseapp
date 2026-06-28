#!/usr/bin/env bash
# Task 3+4: restore Replit pg_dump into Supabase (schema + data).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="$ROOT/${DUMP_FILE:-briefcase_backup.dump}"
PG_RESTORE="${PG_RESTORE:-/opt/homebrew/opt/libpq/bin/pg_restore}"

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

if [[ ! -f "$DUMP" ]]; then
  echo "Missing $DUMP — export from Replit first (migration.md Task 1)." >&2
  exit 1
fi

if [[ ! -x "$PG_RESTORE" ]] && ! command -v pg_restore >/dev/null; then
  echo "pg_restore not found. Install: brew install libpq" >&2
  exit 1
fi

PG_RESTORE_BIN="$(command -v pg_restore || echo "$PG_RESTORE")"

echo "Restoring $DUMP → Supabase (direct connection)..."
"$PG_RESTORE_BIN" \
  --dbname="$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  "$DUMP"

echo "Restore complete."
