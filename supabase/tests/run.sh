#!/usr/bin/env bash
# Run ONE SQL test against a throwaway local Postgres, with no Docker.
#
#   supabase/tests/run.sh                  # 033_demo_brand.test.sql
#   supabase/tests/run.sh 033_demo_brand   # the same, explicitly
#
# The house runner for this directory is `supabase db reset` plus psql against
# the local Supabase stack — see the header of any *.test.sql. This is an
# alternative for a machine with no Docker: it stubs the handful of Supabase
# objects the migrations assume (_supabase_stub.sql) and then runs the REAL
# migration files in order, so what is tested is what ships.
#
# It deliberately runs ONE NAMED TEST rather than the whole directory. The other
# tests here were written against the real stack (auth internals, storage
# policies, role grants) and the stub does not claim to satisfy them; sweeping
# them up here would report failures that mean nothing.
#
#   brew install postgresql@16
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
export PATH="$PG_BIN:$PATH"

TEST="${1:-033_demo_brand}"
FILE="$ROOT/supabase/tests/${TEST}.test.sql"
[ -f "$FILE" ] || { echo "no such test: $FILE" >&2; exit 1; }

# The socket directory must be short — Unix socket paths cap at ~103 bytes.
SOCK="${SOCK:-/tmp/bospg}"
PORT="${PORT:-55433}"
DATA="$(mktemp -d)/pgdata"

mkdir -p "$SOCK"
initdb -D "$DATA" -U postgres --locale=C -E UTF8 >/dev/null 2>&1
pg_ctl -D "$DATA" -o "-p $PORT -k $SOCK" -l "$DATA/../pg.log" start >/dev/null
trap 'pg_ctl -D "$DATA" stop >/dev/null 2>&1 || true' EXIT
sleep 2

run() { psql -h "$SOCK" -p "$PORT" -U postgres -q -v ON_ERROR_STOP=0 "$@"; }
createdb -h "$SOCK" -p "$PORT" -U postgres bostest

run -d bostest -f "$ROOT/supabase/tests/_supabase_stub.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  err="$(run -d bostest -f "$f" 2>&1 | grep -i 'ERROR' | head -3 || true)"
  [ -n "$err" ] && { echo "### $(basename "$f")"; echo "$err"; }
done

out="$(run -d bostest -f "$FILE" 2>&1)"
echo "$out" | sed 's/^psql:[^ ]*//' | grep -E '  ok  |FAILED|ASSERTIONS PASSED|ERROR' || true

# The test RAISEs on a wrong outcome and prints its banner only if it reached
# the end, so the banner IS the pass condition.
echo "$out" | grep -q 'ALL .* ASSERTIONS PASSED'
