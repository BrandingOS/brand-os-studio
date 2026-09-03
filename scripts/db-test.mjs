#!/usr/bin/env node
// Runs the SQL policy/invariant suite in supabase/tests/*.test.sql against the LOCAL
// Supabase stack (docker), each file in its own psql session with ON_ERROR_STOP.
//
//   npm run test:db            — reset the local db, then run every *.test.sql
//   npm run test:db -- --no-reset   — skip the reset (faster while iterating)
//   npm run test:db -- 038     — only files whose name contains "038"
//
// psql is not installed on the dev machine, so every file is piped through
// `docker exec <db container> psql`. The container name is derived from the linked
// project id in supabase/config.toml, which is what `supabase start` uses.
import { execSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureLocalGrants } from './lib/localGrants.mjs';

const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const noReset = args.includes('--no-reset');
const filter = args.find((a) => !a.startsWith('--'));

const projectId = /project_id\s*=\s*"([^"]+)"/.exec(readFileSync(join(root, 'supabase/config.toml'), 'utf8'))?.[1];
if (!projectId) throw new Error('supabase/config.toml has no project_id');
const container = `supabase_db_${projectId}`;

const up = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', container], { encoding: 'utf8' });
if (up.status !== 0 || up.stdout.trim() !== 'true') {
  console.error(`Local Supabase is not running (${container}). Start it with: supabase start`);
  process.exit(2);
}

// The local stack's default privileges are wrong on every reset; scripts/lib/localGrants.mjs
// carries the diagnosis and the repair (and why it is not a migration).
if (!noReset) {
  console.log('▸ supabase db reset');
  execSync('supabase db reset', { cwd: root, stdio: 'inherit' });
}
try {
  ensureLocalGrants('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
} catch (e) {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(2);
}

const dir = join(root, 'supabase/tests');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.test.sql') && (!filter || f.includes(filter)))
  .sort();

function waitForDb(maxMs = 30_000) {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    const r = spawnSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', 'select 1'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim() === '1') return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  return false;
}

let failed = 0;
let crashed = 0;
const fixture = readFileSync(join(dir, 'fixtures/access_fixture.sql'), 'utf8');
const cases = readFileSync(join(dir, 'fixtures/access-cases.json'), 'utf8');

for (const f of files) {
  if (!waitForDb()) { console.error('database did not come back within 30s'); process.exit(2); }
  let sql = readFileSync(join(dir, f), 'utf8');
  // A test opting in with `-- fixture: access` on its first line gets the shared cast
  // inserted right after its BEGIN, and `__ACCESS_CASES__` replaced by the expectation
  // table, so the SQL and TS resolvers are driven by one file.
  if (/^--\s*fixture:\s*access/m.test(sql.split('\n')[0] ?? '')) {
    // A function replacer, not a string: `$$` in SQL is a replacement-pattern escape and
    // would silently collapse to `$`, breaking every dollar-quoted block in the fixture.
    sql = sql.replace(/^BEGIN;\s*$/m, () => `BEGIN;\n${fixture}\n`);
  }
  if (sql.includes('__ACCESS_CASES__')) {
    sql = sql.split('__ACCESS_CASES__').join(cases.replace(/'/g, "''"));
  }
  const r = spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-X'],
    { input: sql, encoding: 'utf8' },
  );
  const ok = r.status === 0;
  // A backend crash (signal 11 in the postgres log) shows up here as a lost connection.
  // It is reported separately from an assertion failure so nobody reads it as a policy bug.
  const crash = !ok && /connection to server was lost|server closed the connection/.test(r.stderr);
  if (!ok) failed += 1;
  if (crash) crashed += 1;
  console.log(`${ok ? '✓' : '✗'} ${f}${crash ? '   (SERVER CRASHED — see docker logs; not an assertion failure)' : ''}`);
  if (!ok) {
    console.log(r.stderr.trim().split('\n').slice(-25).join('\n'));
  }
}
console.log(`\n${files.length - failed}/${files.length} SQL suites passed${crashed ? ` · ${crashed} crashed the server` : ''}`);
process.exit(failed ? 1 : 0);
