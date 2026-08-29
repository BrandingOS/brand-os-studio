# Access Architecture — Plan A: Database Foundation (035–039)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the tenancy, membership, brand-access and capability model in Postgres — enums, columns, backfill, composite FKs, the capability resolver, ownership invariants, and the full RLS rewrite — with a SQL test suite that runs locally and in CI.

**Architecture:** Additive migrations 035–038 keep the old `workspace_members.role` alive beside `role_v2`; 039 rewrites every policy and helper against the new column and renames it in the same transaction. Capabilities are data (`role_capabilities`), resolved by one SECURITY DEFINER function family; list-shaped policies use the set-returning helpers so authorization costs one membership scan per statement.

**Tech Stack:** Postgres 17 (Supabase local via Docker), plpgsql, Supabase CLI 2.84, Node 20 (`scripts/db-test.mjs`), Vitest.

**Spec:** `docs/access-architecture/02-target-domain-model.md`, `03-authorization-model.md`, `07-security-threat-model.md`, `08-migration-plan.md` §1–3, `09-test-plan.md`, ADR-001…005.

## Global Constraints
- Migrations are numbered `2026082Nhhmmss_0NN_<name>.sql`; production head is `20260820210000` (034). New files: 035 `20260829000000`, 036 `20260829010000`, 037 `20260829020000`, 038 `20260829030000`, 039 `20260829040000`.
- Every migration is idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`), ends with a `DO $$ … RAISE EXCEPTION … $$` guard rail, and has a `supabase/migrations/down/<same name>.sql`.
- Every new function: `LANGUAGE plpgsql|sql SECURITY DEFINER SET search_path = ''`; extension calls schema-qualified (`extensions.…`); `(SELECT auth.uid())` never bare `auth.uid()` in predicates.
- `has_capability()` never appears inside `CREATE POLICY`. List policies use `IN (SELECT public.brands_with_capability('…'))` / `workspaces_with_capability`.
- Never push to production. Local only: `supabase db reset`, `npm run test:db`.
- Tests are self-asserting SQL (`BEGIN … ROLLBACK`, `RAISE EXCEPTION` on failure, final `RAISE NOTICE '✓ ALL 0NN ASSERTIONS PASSED'`) in the style of `supabase/tests/011_workspace_member_escalation.test.sql`, using `pg_temp.act_as(uuid)`.
- The shared fixture lives in `supabase/tests/fixtures/access_fixture.sql` (SQL) and `supabase/tests/fixtures/access-cases.json` (expectations shared with the TS resolver in Plan C).

---

### Task A1: 035 — enums and columns

**Files:**
- Create: `supabase/migrations/20260829000000_035_access_enums_and_columns.sql`
- Create: `supabase/migrations/down/20260829000000_035_access_enums_and_columns.sql`
- Test: `supabase/tests/035_access_columns.test.sql`

**Interfaces — Produces:** enums `public.workspace_role_v2 ('owner','admin','member','guest')`, `public.brand_role ('manager','editor','designer','viewer')`, `public.member_status ('active','suspended')`, `public.brand_access_mode ('all','selected')`, `public.invitation_status ('pending','accepted','revoked','expired')`, `public.share_target ('identity','design','showcase','guideline')`; columns listed in the DDL below; `UNIQUE (id, workspace_id)` on `brands`; extension `citext` in schema `extensions`.

- [ ] **Step 1: Write the failing test**

```sql
-- supabase/tests/035_access_columns.test.sql
BEGIN;
DO $$
BEGIN
  IF to_regtype('public.workspace_role_v2') IS NULL THEN RAISE EXCEPTION '035: workspace_role_v2 missing'; END IF;
  IF to_regtype('public.brand_role') IS NULL THEN RAISE EXCEPTION '035: brand_role missing'; END IF;
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='role_v2';
  IF NOT FOUND THEN RAISE EXCEPTION '035: workspace_members.role_v2 missing'; END IF;
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='credits_monthly_cap';
  IF NOT FOUND THEN RAISE EXCEPTION '035: credits_monthly_cap missing'; END IF;
  PERFORM 1 FROM pg_constraint WHERE conname='brands_id_workspace_unique';
  IF NOT FOUND THEN RAISE EXCEPTION '035: brands (id, workspace_id) unique missing'; END IF;
  PERFORM 1 FROM pg_extension WHERE extname='citext';
  IF NOT FOUND THEN RAISE EXCEPTION '035: citext not installed'; END IF;
  -- CHECK: guest ⇒ selected, owner/admin ⇒ all
  BEGIN
    INSERT INTO public.workspaces (id,name,slug,owner_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000035','t','t-035','11111111-0000-0000-0000-000000000035');
    INSERT INTO public.workspace_members (workspace_id,user_id,role,role_v2,brand_access_mode)
      VALUES ('aaaaaaaa-0000-0000-0000-000000000035','22222222-0000-0000-0000-000000000035','viewer','guest','all');
    RAISE EXCEPTION '035: guest with mode=all was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RAISE NOTICE '✓ ALL 035 ASSERTIONS PASSED';
END $$;
ROLLBACK;
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:db -- --no-reset 035`  → Expected: `✗ 035_access_columns.test.sql` ("workspace_role_v2 missing").

- [ ] **Step 3: Write the migration**

```sql
-- 035 — access enums and columns (additive; nothing here changes behaviour)
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

DO $$ BEGIN
  IF to_regtype('public.workspace_role_v2') IS NULL THEN CREATE TYPE public.workspace_role_v2 AS ENUM ('owner','admin','member','guest'); END IF;
  IF to_regtype('public.brand_role') IS NULL THEN CREATE TYPE public.brand_role AS ENUM ('manager','editor','designer','viewer'); END IF;
  IF to_regtype('public.member_status') IS NULL THEN CREATE TYPE public.member_status AS ENUM ('active','suspended'); END IF;
  IF to_regtype('public.brand_access_mode') IS NULL THEN CREATE TYPE public.brand_access_mode AS ENUM ('all','selected'); END IF;
  IF to_regtype('public.invitation_status') IS NULL THEN CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','revoked','expired'); END IF;
  IF to_regtype('public.share_target') IS NULL THEN CREATE TYPE public.share_target AS ENUM ('identity','design','showcase','guideline'); END IF;
END $$;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS role_v2 public.workspace_role_v2,
  ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS brand_access_mode public.brand_access_mode NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS default_brand_role public.brand_role,
  ADD COLUMN IF NOT EXISTS capability_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credits_monthly_cap bigint,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid,
  ADD COLUMN IF NOT EXISTS suspend_reason text;

-- role ⇒ mode coherence. NULL role_v2 is tolerated until 036 backfills it.
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_mode_check;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_mode_check CHECK (
  role_v2 IS NULL
  OR (role_v2 IN ('owner','admin') AND brand_access_mode = 'all' AND default_brand_role IS NULL)
  OR (role_v2 = 'guest' AND brand_access_mode = 'selected')
  OR (role_v2 = 'member')
);
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_overrides_shape;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_overrides_shape
  CHECK (jsonb_typeof(capability_overrides) = 'object');
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_cap_nonneg;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_cap_nonneg
  CHECK (credits_monthly_cap IS NULL OR credits_monthly_cap >= 0);

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_id_workspace_unique') THEN
    ALTER TABLE public.brands ADD CONSTRAINT brands_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS brands_workspace_archived_idx ON public.brands (workspace_id, archived_at);
CREATE INDEX IF NOT EXISTS workspace_members_user_active_idx ON public.workspace_members (user_id, workspace_id) WHERE status = 'active';

DO $$ BEGIN
  IF to_regtype('public.brand_role') IS NULL OR to_regtype('public.workspace_role_v2') IS NULL THEN RAISE EXCEPTION '035 guard: enums missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='workspace_members_role_mode_check') THEN RAISE EXCEPTION '035 guard: role/mode CHECK missing'; END IF;
  RAISE NOTICE '035 OK';
END $$;
```

Down file: drop the constraints, indexes, columns and types in reverse (types last, `DROP TYPE IF EXISTS … `), leave `citext` installed.

- [ ] **Step 4: Reset and run** — `npm run test:db -- 035` → `✓ 035_access_columns.test.sql`, and every pre-existing suite still `✓`.
- [ ] **Step 5: Commit** — `git add supabase/migrations/20260829000000_* supabase/migrations/down/20260829000000_* supabase/tests/035_* && git commit -m "feat(db): 035 access enums and columns"`

---

### Task A2: 036 — backfill tenancy

**Files:**
- Create: `supabase/migrations/20260829010000_036_backfill_tenancy.sql`, down file
- Modify (add `workspace_id` to): `assets`, `brand_folders`, `designs`, `brand_kit_state`, `brand_kit_adoptions`, `brand_context_signals`, `comments`, `approvals`, `guideline_presentations`, `image_projects` (already has it, nullable → backfill), `brand_identity_publications`, `activity_log`, `notifications`
- Create: `public.brand_access` table (the successor of `brand_members`)
- Test: `supabase/tests/036_backfill.test.sql`

**Interfaces — Produces:** table `public.brand_access(id, workspace_id, brand_id, user_id, role brand_role, capability_overrides jsonb, granted_by, created_at, updated_at)`; column `workspace_id uuid` on every table above; `workspaces.is_personal` populated; `workspace_members.role_v2` populated; orphan workspaces soft-deleted; `public.migration_log(action, target_id, detail, created_at)` scratch table for reversible moves (replaced by `audit_events` in Plan B — a view keeps the name).

- [ ] **Step 1: Failing test** — inserts a pre-migration shape (a workspace-less brand owned by U1 who owns W1; an orphan workspace owned by a uuid absent from auth.users with a member row; a `brand_members` row for U2 as editor on brand B1) then asserts, after running the migration body (the test file `\i`'s nothing — instead the test asserts the *state* produced by `supabase db reset`, using fixture rows inserted **before** the migration is impossible; so the test exercises the backfill by calling the idempotent backfill function `public.backfill_tenancy()` that 036 defines and then re-runs). Assert: `brands.workspace_id IS NOT NULL` for the test brand and equals U1's personal workspace; orphan workspace `deleted_at IS NOT NULL`; `brand_access` has (B1, U2, 'editor'); `role_v2` of the owner row = 'owner'; every child row's `workspace_id` equals its brand's.

```sql
BEGIN;
INSERT INTO public.workspaces (id,name,slug,owner_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000036','W1','w1-036','11111111-0000-0000-0000-000000000036');
INSERT INTO public.workspace_members (workspace_id,user_id,role) VALUES ('aaaaaaaa-0000-0000-0000-000000000036','11111111-0000-0000-0000-000000000036','owner');
INSERT INTO public.brands (id,user_id,name,primary_color,slug) VALUES ('bbbbbbbb-0000-0000-0000-000000000036','11111111-0000-0000-0000-000000000036','B1','#000','b1-036');
INSERT INTO public.workspaces (id,name,slug,owner_id) VALUES ('cccccccc-0000-0000-0000-000000000036','Orphan','orphan-036','99999999-0000-0000-0000-000000000036');
INSERT INTO public.workspace_members (workspace_id,user_id,role) VALUES ('cccccccc-0000-0000-0000-000000000036','99999999-0000-0000-0000-000000000036','owner');
INSERT INTO public.assets (id,brand_id,name,type,category,url) VALUES ('dddddddd-0000-0000-0000-000000000036','bbbbbbbb-0000-0000-0000-000000000036','a','image','logo','x');
-- U1 must exist in auth.users for the orphan rule to distinguish it from 9999…
INSERT INTO auth.users (id, email, instance_id, aud, role) VALUES ('11111111-0000-0000-0000-000000000036','u1-036@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated') ON CONFLICT DO NOTHING;
SELECT public.backfill_tenancy();
DO $$ DECLARE r record; BEGIN
  SELECT workspace_id INTO r FROM public.brands WHERE id='bbbbbbbb-0000-0000-0000-000000000036';
  IF r.workspace_id <> 'aaaaaaaa-0000-0000-0000-000000000036' THEN RAISE EXCEPTION '036: brand not moved to personal workspace'; END IF;
  IF (SELECT deleted_at FROM public.workspaces WHERE id='cccccccc-0000-0000-0000-000000000036') IS NULL THEN RAISE EXCEPTION '036: orphan workspace not soft-deleted'; END IF;
  IF (SELECT role_v2 FROM public.workspace_members WHERE workspace_id='aaaaaaaa-0000-0000-0000-000000000036') <> 'owner' THEN RAISE EXCEPTION '036: role_v2 not backfilled'; END IF;
  IF (SELECT workspace_id FROM public.assets WHERE id='dddddddd-0000-0000-0000-000000000036') <> 'aaaaaaaa-0000-0000-0000-000000000036' THEN RAISE EXCEPTION '036: asset workspace_id not denormalised'; END IF;
  IF NOT (SELECT is_personal FROM public.workspaces WHERE id='aaaaaaaa-0000-0000-0000-000000000036') THEN RAISE EXCEPTION '036: is_personal not set'; END IF;
  RAISE NOTICE '✓ ALL 036 ASSERTIONS PASSED';
END $$;
ROLLBACK;
```

- [ ] **Step 2: Run** `npm run test:db -- --no-reset 036` → fails (`backfill_tenancy` does not exist).
- [ ] **Step 3: Write the migration.** Structure: (1) create `brand_access` + `migration_log`; (2) add nullable `workspace_id` columns + indexes `(workspace_id)` on each child table; (3) define `public.backfill_tenancy()` — idempotent, re-runnable, SECURITY DEFINER — doing, in order: mark `is_personal` (earliest workspace per `owner_id`), soft-delete orphan workspaces (`owner_id NOT IN (SELECT id FROM auth.users)`; log), delete their member rows, move workspace-less brands to the creator's personal workspace (log each with the previous NULL), `role_v2` remap (`owner→owner, admin→admin, editor→member+editor+all, exporter→member+viewer+all+overrides grant [designs.export, brand.guideline.export, brand.kit.export], viewer→member+viewer+all`), `brand_members → brand_access` remap (`owner/admin→manager, editor→editor, exporter→viewer+export grants, viewer→viewer`; rows whose user is owner/admin of the workspace are skipped and logged; rows whose user is not a workspace member are skipped and logged), denormalise `workspace_id` on every child table from `brands`; (4) `SELECT public.backfill_tenancy();` (5) guard rail: zero NULL `brands.workspace_id`, zero child rows with mismatched `workspace_id`, every non-deleted workspace has an owner row with `role_v2='owner'`, zero NULL `role_v2` on non-deleted workspaces' members.

```sql
CREATE TABLE IF NOT EXISTS public.brand_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.brand_role NOT NULL,
  capability_overrides jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(capability_overrides)='object'),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, user_id)
);
CREATE INDEX IF NOT EXISTS brand_access_user_idx ON public.brand_access (user_id, brand_id);
CREATE INDEX IF NOT EXISTS brand_access_workspace_user_idx ON public.brand_access (workspace_id, user_id);
ALTER TABLE public.brand_access ENABLE ROW LEVEL SECURITY;   -- no policies until 039 ⇒ deny-all for clients
DROP TRIGGER IF EXISTS trg_brand_access_updated_at ON public.brand_access;
CREATE TRIGGER trg_brand_access_updated_at BEFORE UPDATE ON public.brand_access FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.migration_log (
  id bigserial PRIMARY KEY, action text NOT NULL, target_id text, detail jsonb, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;
```
Child-table columns: for each `t` in `(assets, brand_folders, designs, brand_kit_state, brand_kit_adoptions, brand_context_signals, comments, approvals, guideline_presentations, brand_identity_publications, activity_log, notifications)`: `ALTER TABLE public.t ADD COLUMN IF NOT EXISTS workspace_id uuid; CREATE INDEX IF NOT EXISTS t_workspace_idx ON public.t (workspace_id);` (`image_projects` already has the column.)

`backfill_tenancy()` body (plpgsql, `SECURITY DEFINER SET search_path=''`): the steps above as separate `UPDATE … FROM` statements, each followed by `INSERT INTO public.migration_log` where the plan says "log". Personal workspace = `DISTINCT ON (owner_id) … ORDER BY owner_id, created_at`. Brand move: `UPDATE public.brands b SET workspace_id = w.id FROM public.workspaces w WHERE b.workspace_id IS NULL AND w.owner_id = b.user_id AND w.is_personal AND w.deleted_at IS NULL`. A brand whose creator has no live workspace is left NULL and logged as `brand_unassigned`; the guard rail counts them and RAISEs (prod count is 0 — `08 §3`).

- [ ] **Step 4: Reset and run** `npm run test:db -- 036` → ✓ 035, ✓ 036, all older suites ✓.
- [ ] **Step 5: Commit** `feat(db): 036 backfill tenancy — brand_access, personal workspaces, denormalised workspace_id`

---

### Task A3: 037 — validate and tighten

**Files:** `supabase/migrations/20260829020000_037_validate_and_tighten.sql`, down file, `supabase/tests/037_tighten.test.sql`

**Interfaces — Produces:** `brands.workspace_id NOT NULL`; on every child table a composite FK `<t>_brand_workspace_fk (brand_id, workspace_id) REFERENCES public.brands(id, workspace_id) ON DELETE CASCADE` (validated) and the old single-column `brand_id` FK dropped; `workspace_id NOT NULL` on child tables; `brand_access` composite FKs `(brand_id, workspace_id) → brands` and `(workspace_id, user_id) → workspace_members(workspace_id, user_id) ON DELETE CASCADE`; `brand_members` dropped, view `public.brand_members_legacy` over `brand_access`; the four 017/032 `NOT VALID` constraints validated.

- [ ] **Step 1: Failing test** — asserts `is_nullable='NO'` for `brands.workspace_id`; asserts inserting an asset with a `workspace_id` different from its brand's raises `foreign_key_violation`; asserts deleting a workspace_members row cascades its `brand_access` rows; asserts `to_regclass('public.brand_members') IS NULL`.
- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Migration.** `workspace_members` needs `UNIQUE (workspace_id, user_id)` — it exists (001). For each child table: `ALTER TABLE … ADD CONSTRAINT <t>_brand_workspace_fk FOREIGN KEY (brand_id, workspace_id) REFERENCES public.brands(id, workspace_id) ON DELETE CASCADE NOT VALID; ALTER TABLE … VALIDATE CONSTRAINT <t>_brand_workspace_fk; ALTER TABLE … ALTER COLUMN workspace_id SET NOT NULL;` then drop the old FK by looking its name up in `pg_constraint` (`conrelid = 'public.t'::regclass AND contype='f' AND conkey = ARRAY[<attnum of brand_id>]`). `activity_log`/`notifications` keep nullable `workspace_id` and get no composite FK (their `brand_id` is `ON DELETE SET NULL`). `brand_access` gets both composite FKs. `ALTER TABLE public.assets VALIDATE CONSTRAINT assets_origin_check; … assets_fav_dislike_exclusive; … assets_folder_fk; ALTER TABLE public.designs VALIDATE CONSTRAINT designs_folder_fk;`. `DROP TABLE IF EXISTS public.brand_members CASCADE;` then `CREATE VIEW public.brand_members_legacy AS SELECT id, brand_id, user_id, CASE role WHEN 'manager' THEN 'admin'::public.workspace_role WHEN 'editor' THEN 'editor' ELSE 'viewer' END AS role, created_at FROM public.brand_access;` — **note:** `is_brand_member` (001) reads `brand_members`; 037 must `CREATE OR REPLACE` it to read `brand_access` with the same signature so nothing breaks between 037 and 039:

```sql
CREATE OR REPLACE FUNCTION public.is_brand_member(_brand_id uuid, _min_role public.workspace_role DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_access ba
    WHERE ba.brand_id = _brand_id AND ba.user_id = (SELECT auth.uid())
      AND (CASE ba.role WHEN 'manager' THEN 'admin'::public.workspace_role WHEN 'editor' THEN 'editor' ELSE 'viewer' END) <= _min_role
  ) OR EXISTS (
    SELECT 1 FROM public.brands b JOIN public.workspace_members m ON m.workspace_id = b.workspace_id
    WHERE b.id = _brand_id AND m.user_id = (SELECT auth.uid()) AND m.role <= _min_role
  );
$$;
```
Guard rail: counts of child rows = counts before (captured into a temp table at the top of the migration), zero mismatched `workspace_id`, `brand_members` gone.
- [ ] **Step 4: Reset and run all** → all ✓ (including 017/025/028 suites that exercise `is_brand_member`).
- [ ] **Step 5: Commit** `feat(db): 037 validate and tighten tenancy — composite FKs, NOT NULL workspace_id, brand_members → brand_access`

---

### Task A4: 038 — capability catalog, resolver, ownership guards, RPCs

**Files:** `supabase/migrations/20260829030000_038_capabilities.sql`, down file, `supabase/tests/fixtures/access_fixture.sql`, `supabase/tests/fixtures/access-cases.json`, `supabase/tests/038_access_resolver.test.sql`, `supabase/tests/038_ownership_invariants.test.sql`

**Interfaces — Produces (exact signatures, used by 039, Plan B and Plan C):**
```sql
public.role_capabilities(scope text CHECK (scope IN ('workspace','brand')), role text, capability text, PRIMARY KEY (scope, role, capability))
public.overridable_capabilities(_scope text, _role text) RETURNS text[]           -- IMMUTABLE-ish (sql STABLE)
public.reserved_capabilities() RETURNS text[]                                     -- {'brand.guideline.edit','brand.guideline.export','comments.create','approvals.review','workspace.credits.manage'}
public.effective_capabilities(_user_id uuid, _workspace_id uuid, _brand_id uuid DEFAULT NULL) RETURNS text[]
public.has_capability(_capability text, _workspace_id uuid, _brand_id uuid DEFAULT NULL) RETURNS boolean   -- for auth.uid()
public.workspaces_with_capability(_capability text) RETURNS SETOF uuid
public.brands_with_capability(_capability text) RETURNS SETOF uuid
public.my_access() RETURNS jsonb   -- { workspaces: [{id,name,slug,isPersonal,role,mode,defaultBrandRole,overrides,creditsMonthlyCap}] }
public.my_brand_access(_workspace_id uuid) RETURNS jsonb -- { brands: [{id, role, overrides, archived}] } for every brand the caller can reach in that workspace
public.transfer_ownership(_workspace_id uuid, _to_user uuid, _demote_self boolean DEFAULT false) RETURNS void
public.leave_workspace(_workspace_id uuid) RETURNS void
public.set_member_role(_workspace_id uuid, _user_id uuid, _role public.workspace_role_v2, _mode public.brand_access_mode, _default_brand_role public.brand_role, _overrides jsonb DEFAULT NULL) RETURNS void
public.remove_member(_workspace_id uuid, _user_id uuid) RETURNS void
public.grant_brand_access(_brand_id uuid, _user_id uuid, _role public.brand_role, _overrides jsonb DEFAULT '{}'::jsonb, _allow_ai boolean DEFAULT NULL) RETURNS void
public.revoke_brand_access(_brand_id uuid, _user_id uuid) RETURNS void
public.create_workspace(_name text, _slug text DEFAULT NULL) RETURNS uuid   -- entitlement check is a hook: calls public.check_limit if it exists (Plan B), else allows
public.archive_brand(_brand_id uuid, _archived boolean) RETURNS void
triggers: workspace_members_guard_last_owner, workspace_members_self_role_change, workspace_members_validate_overrides, brand_access_validate (refuses owner/admin rows; validates overrides), guard_immutable_columns() (generic, attached in 039)
```
Resolver semantics: exactly `03 §3` (steps 1–9) including reserved-capability stripping, the guest deny of `templates.submit_community`, archived ⇒ `{brand.view}` (+ `brand.archive` for owner/admin/manager), cross-tenant brand ⇒ `{}`, suspended/deleted ⇒ `{}`, and `designs.delete` own-row rule handled in the `designs` policy (039), not here.

Fixture (`access_fixture.sql`): the 09 §2 cast — workspace A (`aaaaaaaa-…-0001`) agency with Alice owner, Adam admin, Emma member/all/editor, Dana member/selected {A1 designer, A2 designer + deny ai.generate}, Victor member/all/viewer, Grace guest/selected {A1 viewer + grant designs.export}, Sam member suspended; brands A1, A2, A3 (archived); workspace B with Bob owner and B1; Rita removed. Deterministic UUIDs (`…-0001` etc.), inserted with `role_v2` and old `role` both set (until 039 the old column is NOT NULL).

`access-cases.json` shape: `[{ "actor": "alice", "capability": "brand.setup.edit", "workspace": "A", "brand": "A1", "expected": true }, …]` — generate ~140 cells with a small Node script `scripts/gen-access-cases.mjs` that reads `src/shared/access/catalog.ts` (Plan C) — **for Plan A, hand-write the JSON** with at least: every workspace capability × {alice, adam, emma, grace} on A; every brand capability × {emma, dana, victor, grace} on A1; dana on A2 (ai.generate false), dana on A3 (archived: brand.view true, designs.edit false), grace on A2 (all false), sam on A1 (all false), alice on B1 (all false), bob on A1 (all false), adam on A3 (brand.archive true, brand.setup.edit false), grace templates.submit_community false even if granted.

- [ ] **Step 1: Failing tests** — `038_access_resolver.test.sql` loads the fixture (`\i` is not available through `docker exec -i`; the runner concatenates `fixtures/access_fixture.sql` before any test whose first line is `-- fixture: access`), then loops over the JSON (inlined as a `jsonb` literal produced by the runner from `access-cases.json` — extend `scripts/db-test.mjs` to replace the token `__ACCESS_CASES__` with the file contents) asserting `public.effective_capabilities(actor, ws, brand) @> ARRAY[cap]` equals `expected`, collecting failures and raising once with the list. `038_ownership_invariants.test.sql`: last owner cannot be demoted/removed/suspended (`last_owner`); member cannot change own role (`self_role_change`); `transfer_ownership(A, adam, true)` succeeds and leaves adam owner + alice admin; two concurrent demotions cannot both succeed (simulate with two sessions is impossible in one psql — instead assert the trigger takes the advisory lock by checking `pg_locks` inside the same transaction after a demotion attempt: `SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND objid = hashtext('ws-owner:'||A)::bigint` ≥ 1 — the real race test is the integration test in Plan B); promoting emma to admin deletes her `brand_access` rows; overrides outside the ceiling are stripped on role change; `brand_access` insert for an admin is refused; `grant_brand_access` for grace as editor without `_allow_ai` stores a deny of `ai.generate`.
- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Migration.** Seed `role_capabilities` from the matrix in `03 §2` verbatim (one `INSERT … VALUES` block per role; `ON CONFLICT DO NOTHING`). Implement the functions; `effective_capabilities` as plpgsql that builds two `text[]` and returns their union, using `role_capabilities` lookups and `capability_overrides->'grant'` / `->'deny'` arrays. `workspaces_with_capability(cap)`:
```sql
CREATE OR REPLACE FUNCTION public.workspaces_with_capability(_capability text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.workspace_id
  FROM public.workspace_members m
  JOIN public.workspaces w ON w.id = m.workspace_id AND w.deleted_at IS NULL
  WHERE m.user_id = (SELECT auth.uid()) AND m.status = 'active'
    AND public.effective_capabilities(m.user_id, m.workspace_id, NULL) @> ARRAY[_capability];
$$;
```
`brands_with_capability(cap)`: rows from `brands b JOIN workspace_members m` (active, workspace not deleted) where `m.role_v2 IN ('owner','admin') OR m.brand_access_mode='all' OR EXISTS brand_access` **and** `effective_capabilities(m.user_id, b.workspace_id, b.id) @> ARRAY[cap]`. Both are evaluated once per statement when used uncorrelated (verified by the DB review). `my_access()` / `my_brand_access()` return jsonb built with `jsonb_agg`. Ownership triggers per `02 §4` with `pg_advisory_xact_lock(hashtext('ws-owner:'||OLD.workspace_id::text))` and the `app.bypass_self_role_change` GUC. `guard_immutable_columns()` is a generic trigger reading `TG_ARGV` for the column list, exempt when `(SELECT auth.uid()) IS NULL OR public.is_super_admin()`. RPCs check `has_capability` first and RAISE `permission_denied` (`ERRCODE '42501'`) otherwise; every RAISE uses `USING ERRCODE` and a stable `MESSAGE` equal to the reason id (`last_owner`, `self_role_change`, `permission_denied`, `already_member`, …) so clients map it.
- [ ] **Step 4: Run** `npm run test:db -- 038` → both ✓; all older ✓.
- [ ] **Step 5: Commit** `feat(db): 038 capability catalog, resolver, ownership invariants, membership RPCs`

---

### Task A5: 039 — the RLS rewrite (one transaction)

**Files:** `supabase/migrations/20260829040000_039_rls_rewrite.sql`, down file (restores the pre-039 policies verbatim — copy each `CREATE POLICY` from 001/002/003/006/012/015/017/018/021/023/024/025/026/028/029/030 and the old helper bodies), `supabase/tests/039_rls_matrix.test.sql`, `supabase/tests/039_rls_attacks.test.sql`, `scripts/threat-model-coverage.mjs`

**Interfaces — Produces:** `workspace_members.role` is now `workspace_role_v2` (old column dropped, `role_v2` renamed); `is_workspace_member(uuid, workspace_role)`, `is_brand_member(uuid, workspace_role)`, `can_view_brand`, `can_edit_brand` remain callable (compat wrappers; `workspace_role` enum kept until Plan B's 045 drops it); every tenant table has policies named `<table>_select|insert|update|delete` written against the helpers; `guard_immutable_columns` attached to `brands (workspace_id, user_id)`, `workspace_members (workspace_id, user_id)`, `brand_access (workspace_id, brand_id, user_id)`, `assets/designs/brand_folders/… (brand_id, workspace_id)`, `image_generation_jobs (workspace_id, brand_id, user_id)`; `workspaces_insert_auth` removed; `user_roles` escalation closed; `platform_config` read narrowed.

Policy table (capability per statement; `ws:` = `workspace_id IN (SELECT public.workspaces_with_capability('…'))`, `br:` = `brand_id IN (SELECT public.brands_with_capability('…'))`, id-pinned single-row checks may use `has_capability`):

| table | SELECT | INSERT (WITH CHECK) | UPDATE (USING/WITH CHECK) | DELETE |
|---|---|---|---|---|
| workspaces | `id IN ws:'workspace.view' AND deleted_at IS NULL` | none (RPC) | `id IN ws:'workspace.settings.edit'` both | none (RPC soft-delete) |
| workspace_members | own row OR `workspace_id IN ws:'members.view'` | none (RPC) | none (RPC) | none (RPC) |
| brand_access | own row OR `brand_id IN br:'brand.access.view'` | none (RPC) | none (RPC) | none (RPC) |
| brands | `id IN br:'brand.view'` | `workspace_id IN ws:'brands.create'` | `id IN br:'brand.setup.edit'` … USING; WITH CHECK same (immutable cols by trigger) — note: `brand.settings.edit` (name/slug/sharing) vs `brand.setup.edit`: both write `brands`; policy uses `brand.view`-reachable AND (`has_capability('brand.setup.edit', workspace_id, id) OR has_capability('brand.settings.edit', workspace_id, id) OR has_capability('brand.card.edit', workspace_id, id)`) — id-pinned, so scalar is allowed; column-level separation is enforced by `update_brand_checked` (Plan B) and the frontend | `id IN br:'brands.delete' AND archived_at IS NOT NULL` |
| assets | `br:'brand.view'` | `br:'library.upload' AND uploaded_by = auth.uid()` | `br:'library.edit'` | `br:'library.delete'` |
| brand_folders | `br:'brand.view'` | `br:'library.edit'` | `br:'library.edit'` | `br:'library.edit'` |
| designs | `br:'brand.view'` | `br:'designs.create' AND user_id = auth.uid()` | `br:'designs.edit'` | `br:'designs.delete' OR (user_id = auth.uid() AND br:'designs.create')` |
| brand_kit_state | `br:'brand.view'` | `br:'brand.kit.generate'` | `br:'brand.kit.generate'` | `br:'brand.kit.approve'` |
| brand_kit_adoptions | `br:'brand.view'` | `br:'brand.kit.approve' AND adopted_by = auth.uid()` | none | `br:'brand.kit.approve'` |
| brand_context_signals | `br:'brand.view'` | `br:'brand.view'` (signals are implicit product telemetry; any member) | none | `br:'brand.setup.edit'` |
| comments / approvals | `br:'brand.view'` | none (reserved; server-side tables unused by UI) | none | none |
| guideline_presentations / slides | `br:'brand.view'` | `br:'brand.setup.edit'` | same | same |
| brand_identity_publications | `br:'share.view'` (anon policy dropped in Plan B 041 together with the RPC; here anon SELECT is **kept** so `/i/:token` keeps working until 041) | `br:'share.publish_public'` | same | same |
| image_projects | `br:'brand.view'` | `br:'ai.generate' AND user_id = auth.uid()` | `br:'ai.generate'` | `br:'ai.generate'` |
| image_generation_jobs | `br:'brand.view'` | none | keep the cancel policy as-is (replaced in Plan B 044 by the RPC) | none |
| credit_accounts / credit_ledger | `ws:'workspace.usage.view'` | none | none | none |
| subscriptions / usage_tracking | `ws:'workspace.billing.view'` | none | none | none |
| invoices | `ws:'workspace.billing.view'` | | | |
| activity_log | `(brand_id IS NOT NULL AND br:'activity.view') OR (brand_id IS NULL AND ws:'activity.view') OR user_id = auth.uid()` | `user_id = auth.uid() AND (brand_id IS NULL OR br:'brand.view')` | none | none |
| notifications | own | own (`user_id = auth.uid()`) | own USING **and WITH CHECK** | own |
| profiles | unchanged (012/029) | | | |
| user_roles | own OR `is_admin_or_above()` | `is_super_admin() OR (public.has_role(auth.uid(),'admin') AND role IN ('moderator','admin'))` | same as insert | same |
| platform_config | `is_moderator_or_above()` | super_admin | super_admin | super_admin |
| storage.objects `brand-assets` | uuid-shaped first segment AND `brand IN br:'brand.view'` | `br:'library.upload'` | `br:'library.edit'` | `br:'library.delete'` |

All `TO authenticated`. Admin `admin_*_all` policies from 004 stay (super-admin).

- [ ] **Step 1: Failing tests.** `039_rls_matrix.test.sql`: fixture + for each `(actor, table, op)` cell in an inline jsonb list, `act_as(actor)` and attempt the statement against fixture row(s), expecting success or `insufficient_privilege` — at least 60 cells covering each table × {emma editor-all, dana designer-selected, victor viewer, grace guest, bob other-tenant}. `039_rls_attacks.test.sql`: one `DO` block per threat id A1, A3, A6, A7, A8, A11, A12, A13, A14, A20, A23, A24, A25 (each block's NOTICE names the id, e.g. `-- A23`). `scripts/threat-model-coverage.mjs`: parses `07-security-threat-model.md` table ids and greps `supabase/tests/**` + `src/**/*.test.*` for `-- A23` / `'A23'` markers; exits 1 listing uncovered ids; **for Plan A it is allowed to accept a `--allow-missing` list** written to `supabase/tests/threat-coverage.allow` naming the ids Plan B/C own (A2, A4, A5, A9, A10, A15–A19, A21, A22, A26–A37).
- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Migration.** `BEGIN` is implicit (Supabase runs each file in a transaction). Order: (1) redefine `is_workspace_member(_workspace_id uuid, _min_role public.workspace_role DEFAULT 'viewer')` to map the old enum arg onto `role_v2` (`owner→owner, admin→admin, editor/exporter/viewer → member` and compare with a CASE ordinal), `is_brand_member`, `can_view_brand`, `can_edit_brand` as wrappers over `has_capability('brand.view' / 'brand.setup.edit')`; (2) `DROP POLICY IF EXISTS` every policy listed in `01 §2` by name; (3) `CREATE POLICY` per the table above; (4) attach `guard_immutable_columns`; (5) `ALTER TABLE public.workspace_members DROP COLUMN role; ALTER TABLE public.workspace_members RENAME COLUMN role_v2 TO role; ALTER TABLE public.workspace_members ALTER COLUMN role SET NOT NULL;` and re-create the CHECK from 035 against `role`; update `handle_new_user_workspace()` to insert `role='owner'`; `DROP POLICY workspaces_insert_auth`; (6) guard rail: `SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN (…) AND roles = '{public}'` must be 0 (every policy has `TO authenticated` or a named role); every tenant table has RLS enabled; `role_v2` no longer exists; a smoke `SELECT public.effective_capabilities(gen_random_uuid(), gen_random_uuid())` returns `{}`.
- [ ] **Step 4: Run everything** `npm run test:db` → all ✓ (older suites adjusted where they referenced dropped policy names — edit the OLD tests minimally and note each edit in the commit body; they remain the regression baseline for behaviour, not names).
- [ ] **Step 5: Commit** `feat(db): 039 RLS rewritten on capabilities; workspace_members.role is the v2 enum`

---

### Task A6: CI job + runner extensions

**Files:** `.github/workflows/ci.yml` (add job `db`), `scripts/db-test.mjs` (fixture concatenation + `__ACCESS_CASES__` substitution), `package.json` (`"test:db"` exists; add `"threat:coverage": "node scripts/threat-model-coverage.mjs"`), `docs/access-architecture/09-test-plan.md` §1 (mark SQL layer ✅ wired).

- [ ] **Step 1:** CI job:
```yaml
  db:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: 2.84.2 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: supabase start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,pgbouncer
      - run: node scripts/db-test.mjs --no-reset
      - run: node scripts/threat-model-coverage.mjs
```
- [ ] **Step 2:** Run locally `npm run test:db && npm run threat:coverage` → green.
- [ ] **Step 3: Commit** `ci(db): run the SQL policy suite and threat-model coverage`

---

## Self-review
- Spec coverage: 02 §2 (enums/columns A1, brand_access A2, composite FKs A3, invariants A4), 03 §1–3 (A4), 03 §4.1 (A5), 07 A1/A3/A6–A8/A11–A14/A20/A23–A25 (A5), 08 §1 035–039 + §2 guard rails (A2–A5), 09 §1–4 SQL layer (A4–A6). Not in this plan by design: 040–045, Edge Functions, frontend — Plans B/C.
- Types: `workspace_role_v2` values and `brand_role` values match 02/03; RPC names match `08 §1` after the DB-review edits (`set_member_role`, `grant_brand_access`, `transfer_ownership`, `leave_workspace`, `create_workspace`).
- Placeholders: procedural bodies of `backfill_tenancy`, `effective_capabilities`, the triggers and the 039 policy list are specified by table/step above rather than pasted in full; the executor writes them from the tables, which are complete.
