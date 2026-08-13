# Contract — Persistence & Isolation Surface

**Feature**: `001-brand-system-foundation`

Two migrations, both **additive and idempotent**, each shipping a `down/` file, each
following the repo's header-comment convention (rationale · additive/non-destructive ·
which requirement it implements · reversibility line). Next available sequence is
**016**; 009/010 remain outside the push path.

---

## Migration 016 — Brand Core extension + Business Info

```
supabase/migrations/20260813000000_016_brand_core_and_business_info.sql
supabase/migrations/down/016_brand_core_and_business_info.down.sql
```

```sql
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS identity_meta   JSONB;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS business_info   JSONB;
```

No RLS change: `brands` policies already cover these columns (the existing hybrid
owner-OR-member predicates). No backfill in SQL — backfill is performed by the
application-layer migration step so it can apply the same defaulting rules in local
mode (see `plan.md` §Migration sequence).

---

## Migration 017 — Library, folders, adoptions, context

```
supabase/migrations/20260813010000_017_brand_library_kit_context.sql
supabase/migrations/down/017_brand_library_kit_context.down.sql
```

### 017.1 Library columns on `public.assets` (additive)

```sql
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS origin           TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS folder_id        UUID,
  ADD COLUMN IF NOT EXISTS is_favorite      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_disliked      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS use_as_reference BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provenance       JSONB,
  ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legacy_ref_id    TEXT;

-- enumerations + exclusivity
ALTER TABLE public.assets ADD CONSTRAINT assets_origin_check
  CHECK (origin IN ('uploaded','generated','reference')) NOT VALID;
ALTER TABLE public.assets ADD CONSTRAINT assets_fav_dislike_exclusive
  CHECK (NOT (is_favorite AND is_disliked)) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_assets_brand_active
  ON public.assets (brand_id) WHERE deleted_at IS NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_legacy_ref ON public.assets (legacy_ref_id);
CREATE INDEX IF NOT EXISTS idx_assets_folder     ON public.assets (folder_id);
```

Constraints are added `NOT VALID` so the migration cannot fail on unexpected legacy
rows — matching the repo's "never force" deploy rule. They are enforced for all new and
updated rows immediately; **`VALIDATE CONSTRAINT` runs as its own step after the Library
ingest completes** (plan §Migration sequence step 4), when the row population is known
good. Validation is a separate, re-runnable statement, not part of the deploy.

### 017.2 `public.brand_folders`

```sql
CREATE TABLE IF NOT EXISTS public.brand_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES public.brand_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, parent_id, name)
);

-- Postgres treats NULLs as distinct in UNIQUE, so the constraint above does NOT
-- prevent two ROOT folders with the same name. Cover that case explicitly:
CREATE UNIQUE INDEX IF NOT EXISTS brand_folders_root_name_unique
  ON public.brand_folders (brand_id, name) WHERE parent_id IS NULL;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_folder_fk FOREIGN KEY (folder_id)
  REFERENCES public.brand_folders(id) ON DELETE SET NULL NOT VALID;
```

### 017.3 `public.brand_kit_adoptions`

```sql
CREATE TABLE IF NOT EXISTS public.brand_kit_adoptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('core_value','library_item','kit_deliverable')),
  target_ref  TEXT NOT NULL,
  adopted_by  UUID NOT NULL,
  adopted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  UNIQUE (brand_id, target_kind, target_ref)
);
```

**No trigger, no default-insert path** — INV-9 is structural.

### 017.4 `public.brand_context_signals`

```sql
CREATE TABLE IF NOT EXISTS public.brand_context_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('favorite','dislike','reference','approval','preference','usage')),
  target_kind TEXT CHECK (target_kind IN ('library_item','core_value','design')),
  target_ref  TEXT,
  value       JSONB,
  source      TEXT NOT NULL CHECK (source IN ('user-action','derived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_context_brand_created
  ON public.brand_context_signals (brand_id, created_at DESC);
```

---

## RLS — every new table is membership-aware

All three new tables follow the **proven `public.assets` pattern** (migration 001) —
no new authorization model, no owner-scoped shortcut:

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <table>_select ON public.<table> FOR SELECT
  USING (public.is_brand_member(brand_id, 'viewer'));
CREATE POLICY <table>_insert ON public.<table> FOR INSERT
  WITH CHECK (public.is_brand_member(brand_id, 'editor'));
CREATE POLICY <table>_update ON public.<table> FOR UPDATE
  USING (public.is_brand_member(brand_id, 'editor'));
CREATE POLICY <table>_delete ON public.<table> FOR DELETE
  USING (public.is_brand_member(brand_id, 'admin'));
```

Each `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS` (repo convention).

**Adoption tightening**: `brand_kit_adoptions` INSERT additionally requires
`adopted_by = (SELECT auth.uid())` in the `WITH CHECK`, so an adoption cannot be
attributed to another user.

**Isolation contract**:

| Concept | Table | Predicate |
|---|---|---|
| Core DNA + Business Info | `brands` | existing hybrid owner-OR-`is_workspace_member`/`is_brand_member` |
| Library items | `assets` | `is_brand_member` (existing) |
| Folders | `brand_folders` | `is_brand_member` (new) |
| Official Kit | `brand_kit_adoptions` | `is_brand_member` + self-attribution (new) |
| Context | `brand_context_signals` | `is_brand_member` (new) |
| Constructive outputs | `designs` | owner-scoped (unchanged — research D10) |
| Storage objects | `brand-assets` bucket | first path segment = `brand_id`, `is_brand_member` (existing) |

**Storage key rule (binding)**: every new object written to `brand-assets` MUST use
`{brand_id}/…` as its key. A non-UUID first segment raises a cast error in the policy,
not a clean denial.

---

## Local-mode parity contract

The same six concepts exist in local mode with identical behavior:

| Concept | Local key |
|---|---|
| Core DNA + meta + business info | inside `brandos:brands` (the brand record) |
| Library items | `brandos:assets:{brandId}` (existing) |
| Folders | `brandos:library-folders:{brandId}` (new) |
| Official Kit adoptions | `brandos:kit-adoptions:{brandId}` (new) |
| Context signals | `brandos:brand-context:{brandId}` (new, capped) |

**Contracts**:
- Local implementations satisfy the same interfaces and the same invariants — the
  authority/promotion rules are enforced in the **domain layer**, so they hold in both
  modes without duplication.
- Local context signals are **capped** (ring-buffer, newest N) — localStorage quota has
  already bitten this codebase once (font uploads). Server mode is uncapped.
- Signing in must not fork truth: the sign-in reconciliation step is part of the
  migration sequence in `plan.md`, not an implicit merge.

---

## Generated-types staleness

`src/integrations/supabase/types.ts` is stale (no `designs`, no `identity`,
`logo_system`, `brand_assets`). New tables and columns will also be absent until types
are regenerated.

**Contract**: new adapters follow the existing house workarounds — a typed payload bag
(`Record<string, unknown>`) for writes and a mapper taking `any` for reads, plus the
established `42P01`/`PGRST205` missing-table and `42703` missing-column tolerance so the
app degrades to local behavior when a migration is not yet deployed. Regenerating types
is a follow-up chore, not a blocker.
