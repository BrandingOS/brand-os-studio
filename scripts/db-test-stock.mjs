#!/usr/bin/env node
// Run a SQL suite against STOCK Postgres instead of the Supabase image.
//
// Why this exists: `public.ecr.aws/supabase/postgres:17.6.1.104` SEGFAULTS whenever a
// "permission denied for function" is raised for a non-superuser role. Verified on both
// aarch64 and x86_64, and against stock `postgres:17`, which raises the error correctly —
// so it is a bug in the Supabase image, not in this schema, not in this machine, and CI
// would hit it too. `025_image_generation_isolation` provokes it deliberately (case C4).
//
//   node scripts/db-test-stock.mjs 025
//
// It dumps the migrated schema out of the running local Supabase, restores it into a
// throwaway stock container, and runs the suite there. Remove the container when done.
import { execSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const filter = process.argv[2];
const SRC = 'supabase_db_ciojgoozobzbeglwdxcz';
const DST = 'brandos-stock-pg';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

console.log('▸ dumping the migrated schema');
sh(`docker exec ${SRC} pg_dump -U postgres -d postgres --no-owner --schema=public --schema=auth --schema=extensions --schema=storage -f /tmp/stock-dump.sql`);
const dump = sh(`docker exec ${SRC} cat /tmp/stock-dump.sql`);

console.log('▸ starting stock postgres:17');
try { sh(`docker rm -f ${DST}`); } catch { /* not running */ }
sh(`docker run -d --name ${DST} -e POSTGRES_PASSWORD=postgres postgres:17`);
for (let i = 0; i < 40; i += 1) {
  try { sh(`docker exec ${DST} pg_isready -U postgres`); break; } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000); }
}

// The roles, schemas and extensions Supabase provides and a plain image does not.
const bootstrap = `
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE ROLE supabase_admin NOLOGIN; CREATE ROLE supabase_auth_admin NOLOGIN;
CREATE ROLE supabase_storage_admin NOLOGIN;
CREATE ROLE authenticator NOINHERIT LOGIN;
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA IF NOT EXISTS extensions; CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS storage;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
-- Supabase puts the extensions schema on the default search_path; a stock image does not,
-- so unqualified gen_salt()/citext comparisons would resolve differently here and report
-- failures that say nothing about the schema under test.
ALTER DATABASE postgres SET search_path TO public, extensions;
`;
const psql = (input, stop = '0') =>
  spawnSync('docker', ['exec', '-i', DST, 'psql', '-U', 'postgres', '-q', '-X', '-v', `ON_ERROR_STOP=${stop}`],
    { input, encoding: 'utf8' });

psql(bootstrap);
console.log('▸ restoring');
psql(dump);

const dir = join(root, 'supabase/tests');
const files = readdirSync(dir).filter((f) => f.endsWith('.test.sql') && (!filter || f.includes(filter))).sort();
// The same fixture/expectation injection db-test.mjs does, or every suite that opts in
// with `-- fixture: access` runs without its cast. A function replacer, not a string:
// `$$` is a replacement-pattern escape and would collapse the dollar-quoted blocks.
const fixture = readFileSync(join(dir, 'fixtures/access_fixture.sql'), 'utf8');
const cases = readFileSync(join(dir, 'fixtures/access-cases.json'), 'utf8');
let failed = 0;
for (const f of files) {
  let sql = readFileSync(join(dir, f), 'utf8');
  if (/^--\s*fixture:\s*access/m.test(sql.split('\n')[0] ?? '')) {
    sql = sql.replace(/^BEGIN;\s*$/m, () => `BEGIN;\n${fixture}\n`);
  }
  if (sql.includes('__ACCESS_CASES__')) {
    sql = sql.split('__ACCESS_CASES__').join(cases.replace(/'/g, "''"));
  }
  const r = psql(sql, '1');
  const ok = r.status === 0;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${f}`);
  if (!ok) console.log(r.stderr.trim().split('\n').slice(-12).join('\n'));
}
console.log(`\n${files.length - failed}/${files.length} passed on stock postgres:17`);
console.log(`(container left running as ${DST}; \`docker rm -f ${DST}\` to remove)`);
process.exit(failed ? 1 : 0);
