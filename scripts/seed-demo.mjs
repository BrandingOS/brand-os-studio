#!/usr/bin/env node
// Applies scripts/seed-demo-workspace.sql to the LOCAL Supabase only.
//
// The guard is the point: the script writes auth.users rows with a known password, so
// pointing it at anything but a loopback database has to be impossible by construction
// rather than by remembering.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sql = join(here, 'seed-demo-workspace.sql');
const url = process.env.SEED_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const host = new URL(url.replace(/^postgres(ql)?:/, 'http:')).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Refusing to seed demo users into a non-local database (${host}).`);
  process.exit(1);
}

try {
  execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-q', '-f', sql], { stdio: 'inherit' });
  console.log('\n  alice@demo.test  Owner');
  console.log('  emma@demo.test   Member · all brands · Editor');
  console.log('  dana@demo.test   Member · 2 brands · Designer · AI on Client B only');
  console.log('  grace@demo.test  Guest · 1 brand · Viewer + exports');
  console.log('  password: demo12345\n');
} catch {
  process.exit(1);
}
