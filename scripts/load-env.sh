#!/usr/bin/env bash
# Load .env.local and build DATABASE_URL from SUPABASE_DB_PASSWORD when needed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from migration.md Task 3." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Set SUPABASE_DB_PASSWORD in .env.local (Supabase → Settings → Database)." >&2
  exit 1
fi

if [[ "${DATABASE_URL:-}" == *"REPLACE_ME"* ]] || [[ "${DATABASE_URL:-}" == *"[YOUR-PASSWORD]"* ]] || [[ -z "${DATABASE_URL:-}" ]]; then
  # Session pooler (5432) — IPv4-friendly; use for restore, drizzle push, local dev
  export DATABASE_URL="postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
fi

if [[ "${DATABASE_URL_POOLER:-}" == *"REPLACE_ME"* ]] || [[ -z "${DATABASE_URL_POOLER:-}" ]]; then
  # Transaction pooler (6543) — production Express server
  export DATABASE_URL_POOLER="postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
fi
