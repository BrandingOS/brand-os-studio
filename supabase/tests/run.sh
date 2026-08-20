#!/usr/bin/env bash
# Run the SQL tests against a throwaway local Postgres.
#
# These migrations touch a trigger on auth.users, so "it probably works" is not
# good enough — a mistake there costs people their signup, not their demo
# brand. This harness stubs the handful of Supabase-specific objects the
# migrations assume (_supabase_stub.sql) and then runs the REAL migration
# files in order, so what is tested is what ships.
#
#   brew install postgresql@16
#   supabase/tests/run.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
export PATH="$PG_BIN:$PATH"

# The socket directory must be short: Unix socket paths cap at ~103 bytes.
SOCK="${SOCK:-/tmp/bospg}"
DATA="$(mktemp -d)/pgdata"
PORT="${PORT:-55433}"

mkdir -p "$SOCK"
initdb -D "$DATA" -U postgres --locale=C -E UTF8 >/dev/null
pg_ctl -D "$DATA" -o "-p $PORT -k $SOCK" -l "$DATA/../pg.log" start >/dev/null
trap 'pg_ctl -D "$DATA" stop >/dev/null 2>&1 || true' EXIT
sleep 2

psql() { command psql -h "$SOCK" -p "$PORT" -U postgres -q -v ON_ERROR_STOP=0 "$@"; }
createdb -h "$SOCK" -p "$PORT" -U postgres bostest

psql -d bostest -f "$ROOT/supabase/tests/_supabase_stub.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  err="$(psql -d bostest -f "$f" 2>&1 | grep -i 'ERROR' | head -3 || true)"
  [ -n "$err" ] && { echo "### $(basename "$f")"; echo "$err"; }
done

fails=0
for t in "$ROOT"/supabase/tests/[0-9]*.sql; do
  out="$(psql -d bostest -f "$t" 2>&1)"
  echo "$out" | grep -E 'PASS|FAIL' | sed 's/^psql:[^ ]*//'
  n="$(echo "$out" | grep -c 'FAIL' || true)"
  fails=$((fails + n))
done

echo "── $fails failure(s) ──"
[ "$fails" -eq 0 ]
