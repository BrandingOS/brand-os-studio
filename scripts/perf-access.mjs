#!/usr/bin/env node
// ============================================================================
// What the access layer costs at agency scale.
//
// Every policy in 039 is written against `brands_with_capability(...)` /
// `workspaces_with_capability(...)`, which resolve capabilities per row. That is the right
// shape and it is also the thing that could quietly make a 500-brand workspace unusable,
// so it is measured rather than assumed.
//
// Timed as the USER, through RLS — `SET LOCAL ROLE authenticated` with a real
// `request.jwt.claims` — because timing these queries as superuser measures a database
// with the policies switched off, which is not the product.
//
// LOCAL ONLY and destructive: it seeds a large synthetic workspace. Refuses non-loopback.
//
//   npm run perf:access
// ============================================================================
import { execFileSync } from 'node:child_process';
import { ensureLocalGrants } from './lib/localGrants.mjs';

const URL_ = process.env.PERF_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const host = new URL(URL_.replace(/^postgres(ql)?:/, 'http:')).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Refusing to run the perf seed against a non-local database (${host}).`);
  process.exit(1);
}

const psql = (sql, args = []) =>
  execFileSync('psql', [URL_, '-v', 'ON_ERROR_STOP=1', '-q', '-X', '-tAc', sql, ...args], { encoding: 'utf8' });
const q = (sql) => psql(sql).trim();

const BRANDS = Number(process.env.PERF_BRANDS ?? 500);
const MEMBERS = Number(process.env.PERF_MEMBERS ?? 26);
const ASSETS_PER = Number(process.env.PERF_ASSETS_PER ?? 8);

const WS = 'f0000000-0000-4000-b000-000000000001';
const OWNER = 'f0000000-0000-4000-a000-000000000001';
const GUEST = 'f0000000-0000-4000-a000-000000000002';
/** A member with `selected` mode and a handful of grants — the expensive shape. */
const PICKY = 'f0000000-0000-4000-a000-000000000003';

ensureLocalGrants(URL_);
console.log(`▸ seeding ${BRANDS} brands, ${MEMBERS} members, ${BRANDS * ASSETS_PER} assets`);
psql(`
DELETE FROM public.workspaces WHERE id = '${WS}';
DELETE FROM auth.users WHERE email LIKE 'perf-%@local.test';

INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
SELECT ('f0000000-0000-4000-a000-' || lpad(g::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'perf-' || g || '@local.test', now(), now()
FROM generate_series(1, ${MEMBERS}) g;

INSERT INTO public.workspaces (id, name, slug, owner_id, is_personal)
VALUES ('${WS}', 'Perf Agency', 'perf-agency', '${OWNER}', false);

-- The plan comes FIRST: brand_limit_guard refuses the third brand on free (brands=2), and
-- the seat cap refuses the second member. Agency is brands=-1 (unlimited), seats=25,
-- guest_seats=50 — so ${MEMBERS} members needs one entitlement override too. Both guards
-- firing here is them working; this is how a real agency workspace is configured.
INSERT INTO public.subscriptions (workspace_id, plan, status, stripe_customer_id, stripe_subscription_id)
VALUES ('${WS}', 'agency', 'active', 'cus_perf', 'sub_perf');
INSERT INTO public.workspace_entitlement_overrides (workspace_id, key, value)
VALUES ('${WS}', 'seats', ${MEMBERS + 10}), ('${WS}', 'guest_seats', 100)
ON CONFLICT (workspace_id, key) DO UPDATE SET value = EXCLUDED.value;

-- owner, one guest, one picky selected-mode member, the rest all-mode editors
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, brand_access_mode, default_brand_role)
SELECT '${WS}', ('f0000000-0000-4000-a000-' || lpad(g::text, 12, '0'))::uuid,
       CASE WHEN g = 1 THEN 'owner' WHEN g = 2 THEN 'guest' ELSE 'member' END::public.workspace_role_v2,
       'active',
       CASE WHEN g = 1 THEN 'all' WHEN g IN (2, 3) THEN 'selected' ELSE 'all' END::public.brand_access_mode,
       CASE WHEN g = 1 THEN NULL WHEN g = 2 THEN 'viewer' ELSE 'editor' END::public.brand_role
FROM generate_series(1, ${MEMBERS}) g;

INSERT INTO public.brands (id, name, slug, workspace_id, user_id, primary_color)
SELECT ('f0000000-0000-4000-c000-' || lpad(g::text, 12, '0'))::uuid,
       'Perf Brand ' || g, 'perf-brand-' || g, '${WS}', '${OWNER}', '#334455'
FROM generate_series(1, ${BRANDS}) g;

INSERT INTO public.assets (brand_id, workspace_id, uploaded_by, name, type, category, source, url)
SELECT ('f0000000-0000-4000-c000-' || lpad(b::text, 12, '0'))::uuid, '${WS}', '${OWNER}',
       'a' || a || '.png', 'image', 'other', 'upload', 'https://example.test/a.png'
FROM generate_series(1, ${BRANDS}) b, generate_series(1, ${ASSETS_PER}) a;

-- the guest gets one brand; the picky member gets 25
INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides)
SELECT '${WS}', ('f0000000-0000-4000-c000-' || lpad(g::text, 12, '0'))::uuid, '${GUEST}', 'viewer', '{}'::jsonb
FROM generate_series(1, 1) g;
INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides)
SELECT '${WS}', ('f0000000-0000-4000-c000-' || lpad(g::text, 12, '0'))::uuid, '${PICKY}', 'designer', '{}'::jsonb
FROM generate_series(1, 25) g;

ANALYZE public.brands; ANALYZE public.assets;
ANALYZE public.workspace_members; ANALYZE public.brand_access;
SELECT 'seeded';
`);

/**
 * Best of N runs, as the given user, through RLS.
 *
 * Timed inside the database, not around the psql process: process startup is ~20ms and
 * would swamp a 4ms query. `\timing` cannot be used because it is a psql meta-command and
 * these run through `-c`. The helper is created BEFORE the role switch (a temp function
 * needs privileges the `authenticated` role does not have) and is SECURITY INVOKER, so the
 * statement it EXECUTEs is subject to exactly the policies the real user faces.
 */
function timeAs(user, sql, runs = 5) {
  const out = psql(`
CREATE FUNCTION pg_temp.timeit(_sql text, _runs int) RETURNS numeric
LANGUAGE plpgsql AS $f$
DECLARE t timestamptz; best numeric; e numeric; i int;
BEGIN
  FOR i IN 1.._runs LOOP
    t := clock_timestamp();
    EXECUTE _sql;
    e := extract(epoch from (clock_timestamp() - t)) * 1000;
    IF best IS NULL OR e < best THEN best := e; END IF;
  END LOOP;
  RETURN round(best, 2);
END $f$;
BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims', '{"sub":"${user}","role":"authenticated"}', true);
  SELECT pg_temp.timeit($q$${sql}$q$, ${runs});
COMMIT;`);
  const lines = out.trim().split('\n').filter(Boolean);
  return Number(lines[lines.length - 1]);
}

const CASES = [
  ['owner · brand list',        OWNER, `SELECT count(*) FROM public.brands WHERE workspace_id = '${WS}'`],
  ['owner · my_brand_access',   OWNER, `SELECT jsonb_array_length(public.my_brand_access('${WS}')->'brands')`],
  ['owner · my_access',         OWNER, `SELECT public.my_access() IS NOT NULL`],
  ['guest · brand list',        GUEST, `SELECT count(*) FROM public.brands WHERE workspace_id = '${WS}'`],
  ['guest · my_brand_access',   GUEST, `SELECT jsonb_array_length(public.my_brand_access('${WS}')->'brands')`],
  ['picky · brand list',        PICKY, `SELECT count(*) FROM public.brands WHERE workspace_id = '${WS}'`],
  ['picky · my_brand_access',   PICKY, `SELECT jsonb_array_length(public.my_brand_access('${WS}')->'brands')`],
  ['owner · one brand assets',  OWNER,
    `SELECT count(*) FROM public.assets WHERE brand_id = 'f0000000-0000-4000-c000-000000000001'`],
  ['owner · brand_people',      OWNER,
    `SELECT jsonb_array_length(public.brand_people('f0000000-0000-4000-c000-000000000001')->'people')`],
];

console.log(`\n  ${'query'.padEnd(28)} median\n  ${'-'.repeat(40)}`);
let worst = 0; let worstName = '';
for (const [name, user, sql] of CASES) {
  let ms;
  try { ms = timeAs(user, sql); } catch (e) { console.log(`  ${name.padEnd(28)} FAILED`); continue; }
  if (ms > worst) { worst = ms; worstName = name; }
  console.log(`  ${name.padEnd(28)} ${ms.toFixed(1)} ms`);
}

console.log(`\n  slowest: ${worstName} at ${worst.toFixed(1)} ms`);
console.log('  (timed inside the database, through RLS as the user, best of 5, warm cache)');

if (process.env.PERF_KEEP !== '1') {
  psql(`DELETE FROM public.workspaces WHERE id = '${WS}';
        DELETE FROM auth.users WHERE email LIKE 'perf-%@local.test'; SELECT 'cleaned';`);
  console.log('  synthetic workspace removed (PERF_KEEP=1 to keep it)\n');
}
