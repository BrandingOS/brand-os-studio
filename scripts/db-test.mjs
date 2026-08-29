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

if (!noReset) {
  console.log('▸ supabase db reset');
  execSync('supabase db reset', { cwd: root, stdio: 'inherit' });
}

const dir = join(root, 'supabase/tests');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.test.sql') && (!filter || f.includes(filter)))
  .sort();

let failed = 0;
for (const f of files) {
  const sql = readFileSync(join(dir, f));
  const r = spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-X'],
    { input: sql, encoding: 'utf8' },
  );
  const ok = r.status === 0;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${f}`);
  if (!ok) {
    console.log(r.stderr.trim().split('\n').slice(-25).join('\n'));
  }
}
console.log(`\n${files.length - failed}/${files.length} SQL suites passed`);
process.exit(failed ? 1 : 0);
