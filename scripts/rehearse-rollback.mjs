#!/usr/bin/env node
// ============================================================================
// UP → DOWN → UP, against a real database, with real rows in it.
//
// A `down/` file that has never been run is a promise, not a rollback. This rehearses the
// whole ladder — every migration from 035 up, then every down file in reverse, then up
// again — and checks after each direction that a seeded brand, its asset and its workspace
// are still there with their values intact.
//
// That last part is the point. A rollback that drops the tables is trivially "successful";
// what has to be true is that reversing the migration does not cost anyone their work.
//
// LOCAL ONLY, and destructive: it resets the local database. It refuses any host but
// loopback, and never speaks to a linked project.
//
//   npm run rehearse:rollback
// ============================================================================
import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ensureLocalGrants } from './lib/localGrants.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const UP_DIR = join(root, 'supabase', 'migrations');
const DOWN_DIR = join(UP_DIR, 'down');
const URL_ = process.env.REHEARSE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const host = new URL(URL_.replace(/^postgres(ql)?:/, 'http:')).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Refusing to rehearse against a non-local database (${host}).`);
  process.exit(1);
}

/** Migrations this initiative owns. Everything before them is the pre-existing schema. */
const FIRST = '20260829000000';
const ups = readdirSync(UP_DIR).filter((f) => f.endsWith('.sql') && f >= FIRST).sort();
const downs = readdirSync(DOWN_DIR).filter((f) => f.endsWith('.sql') && f >= FIRST).sort().reverse();

const psql = (args, opts = {}) =>
  execFileSync('psql', [URL_, '-v', 'ON_ERROR_STOP=1', '-q', '-X', ...args], { encoding: 'utf8', ...opts });
const q = (sql) => psql(['-tAc', sql]).trim();

const step = (s) => console.log(`\n▸ ${s}`);
const ok = (s) => console.log(`  ✓ ${s}`);
const die = (s) => { console.error(`  ✗ ${s}`); process.exit(1); };


// ── the rows whose survival is the whole test ───────────────────────────────
const WS = 'e0000000-0000-4000-b000-000000000001';
const BRAND = 'e0000000-0000-4000-c000-000000000001';
const ASSET = 'e0000000-0000-4000-d000-000000000001';
const USER = 'e0000000-0000-4000-a000-000000000001';

const SEED = `
INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES ('${USER}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'rehearsal@local.test', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.workspaces (id, name, slug, owner_id, is_personal)
VALUES ('${WS}', 'Rehearsal Co', 'rehearsal-co', '${USER}', false)
ON CONFLICT (id) DO NOTHING;
-- The owner MEMBERSHIP, not just workspaces.owner_id. A workspace without one is a shape
-- the product never produces — the signup trigger and 036's own backfill both create it —
-- and 036's guard rail rightly refuses to run against one. Seeding without it made the
-- re-apply fail with "036 guard: 1 live workspaces have no owner row", which is the guard
-- working, not a rollback defect.
INSERT INTO public.workspace_members
  (workspace_id, user_id, role, status, brand_access_mode, default_brand_role)
VALUES ('${WS}', '${USER}', 'owner', 'active', 'all', NULL)
ON CONFLICT DO NOTHING;
INSERT INTO public.brands (id, name, slug, workspace_id, user_id, primary_color)
VALUES ('${BRAND}', 'Rehearsal Brand', 'rehearsal-brand', '${WS}', '${USER}', '#123456')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.assets (id, brand_id, workspace_id, uploaded_by, name, type, category, source, url)
VALUES ('${ASSET}', '${BRAND}', '${WS}', '${USER}', 'rehearsal.png', 'image', 'other', 'upload',
        'https://example.test/r.png')
ON CONFLICT (id) DO NOTHING;
`;

/** What must be true before and after every direction. */
function checkDataSurvives(when) {
  const brand = q(`SELECT name || '|' || primary_color FROM public.brands WHERE id = '${BRAND}'`);
  if (brand !== 'Rehearsal Brand|#123456') die(`${when}: the brand is gone or changed (got "${brand}")`);
  const asset = q(`SELECT name FROM public.assets WHERE id = '${ASSET}'`);
  if (asset !== 'rehearsal.png') die(`${when}: the asset is gone (got "${asset}")`);
  const ws = q(`SELECT name FROM public.workspaces WHERE id = '${WS}'`);
  if (ws !== 'Rehearsal Co') die(`${when}: the workspace is gone (got "${ws}")`);
  // The membership is the row that says someone can still get IN. 039 renames the role
  // column and down/039 renames it back, so this is the one most likely to be lost.
  const mem = q(`SELECT count(*) FROM public.workspace_members
                  WHERE workspace_id = '${WS}' AND user_id = '${USER}'`);
  if (mem !== '1') die(`${when}: the owner membership is gone (got ${mem})`);
  ok(`${when}: brand, asset, workspace and owner membership intact`);
}

// ── 1. a clean database at the full height ──────────────────────────────────
step('supabase db reset (all migrations, 035–046 included)');
execSync('supabase db reset', { cwd: root, stdio: 'ignore' });
// A reset restores the local stack's wrong default privileges; put them back.
ensureLocalGrants(URL_, (m) => console.log(`  ${m}`));
ok(`${ups.length} initiative migrations applied`);

step('seeding rows that must survive the round trip');
psql(['-c', SEED]);
checkDataSurvives('after UP');

const head = q(`SELECT max(version) FROM supabase_migrations.schema_migrations`);
ok(`head is ${head}`);
if (q(`SELECT to_regprocedure('public.brand_people(uuid)') IS NOT NULL`) !== 't') {
  die('brand_people is missing at full height');
}

// ── 2. down, in reverse ─────────────────────────────────────────────────────
step(`applying ${downs.length} down files in reverse`);
for (const f of downs) {
  try {
    psql(['-f', join(DOWN_DIR, f)], { stdio: ['ignore', 'ignore', 'pipe'] });
    ok(f);
  } catch (e) {
    die(`${f} failed:\n${e.stderr ?? e.message}`);
  }
}
checkDataSurvives('after DOWN');

if (q(`SELECT to_regprocedure('public.brand_people(uuid)') IS NULL`) !== 't') {
  die('brand_people survived the rollback');
}
if (q(`SELECT to_regclass('public.workspace_invitations') IS NULL`) !== 't') {
  die('workspace_invitations survived the rollback');
}
ok('the new surface is gone');

// ── 3. up again ─────────────────────────────────────────────────────────────
step(`re-applying ${ups.length} migrations`);
for (const f of ups) {
  try {
    psql(['-f', join(UP_DIR, f)], { stdio: ['ignore', 'ignore', 'pipe'] });
    ok(f);
  } catch (e) {
    die(`${f} failed on re-apply:\n${e.stderr ?? e.message}`);
  }
}
checkDataSurvives('after UP again');

if (q(`SELECT to_regprocedure('public.brand_people(uuid)') IS NOT NULL`) !== 't') {
  die('brand_people did not come back');
}
const policies = q(
  `SELECT count(*) FROM pg_policies WHERE schemaname='public'
     AND (qual LIKE '%_with_capability%' OR with_check LIKE '%_with_capability%')`);
if (Number(policies) < 30) die(`only ${policies} capability policies after re-apply`);
ok(`${policies} capability-based policies in place`);

console.log(`\n✓ UP → DOWN → UP rehearsed. ${ups.length} up, ${downs.length} down, data preserved throughout.`);
console.log('  The local database is now at full height with rehearsal rows in it.');
console.log('  Run `npm run seed:demo` to restore the demo agency.\n');
