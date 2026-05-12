# Brand Kit Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Brand Kit (`/b/:slug/brand-kit`) into the premium, export-ready client deliverable defined by `docs/superpowers/specs/brand-kit-premium.md` — wire Customize persistence, wire Editor handoff with auto-bind, integrate Templates as the alternate-design surface, ship PDF Brand Guide + ZIP bulk export, and add telemetry + error/offline + AI loading/cancel paths throughout.

**Architecture:** Four sub-projects executed A → B → (C ∥ D) with a manual checkpoint after each. A wires the canonical `brand.brandKitDesigns` schema and the Customize-overlay persistence. B adds the Editor handoff with a Choice modal for empty cards (Blank / AI / Templates) and auto-binding save-back. C wires the Templates page as the "Browse Other" surface via URL filters + a "Use as my X" action. D ships the export deliverable (PDF + ZIP via Web Worker, frozen snapshot table, error/offline UX). All sub-projects share a single `BindOrigin` enum split `ai-individual` / `ai-bulk` from day one for forward-compat with the deferred Sub-project E (Auto-fill).

**Tech Stack:** TypeScript 5.8 · React 18 · Zustand 5 · Supabase (PG + Storage + Edge Functions) · jsPDF · jsZip · Fabric.js 6 (canvas) · Vitest (unit + jsdom adapter integration + Playwright browser E2E)

---

## Critical context (read before any task)

### Spec corrections discovered during plan write

1. **Migration number is `010`, not `009`.** Spec says "Migration 009 (idempotent)" but the live `supabase/migrations/` already contains `20260504000000_009_templates_phase_4.sql`. The next available number is **010**. Filename convention is `YYYYMMDDhhmmss_NNN_<name>.sql`. Today (2026-05-12) → `20260512230000_010_brand_kit_premium.sql`. All references to "migration 009" in spec text refer to this 010 file in practice.

2. **`BrandKitCardEditor` lives at `src/features/brand-kit/components/BrandKitCardEditor.tsx:475`** (NOT at the top-level of `features/brand-kit/`). The `tech-debt-tag: brand-kit-overlay-v1` applies to this file. Mounted from `BrandKitCosmosPage.tsx:819`.

3. **`BrandKitCosmosPage.tsx` is 1407 LOC.** Every sub-project touches it. Per constraint #7, each sub-project groups its `BrandKitCosmosPage.tsx` edits into ONE task to minimize merge surface with parallel pipelines.

4. **Migration timestamp uses `230000` (11pm UTC) hour slot.** Migrations 001–009 used `000000`, `100000`, or `200000` (midnight, 10am, 8pm UTC). Parallel pipelines following the same convention would collide. Plan uses `20260512230000_010_brand_kit_premium.sql` to be safe even though no 010 file currently exists.

5. **`ai-proxy` Edge Function (referenced in spec) is actually `ai-apply-command`.** Live file: `supabase/functions/ai-apply-command/index.ts` — shipped in Phase 3.5 commit 4. The spec's "ai-proxy" naming is generic; the actual function name is `ai-apply-command`. All plan references use the actual name.

6. **`generateFromPrompt` AI routing is ALREADY SAFE for the path Sub-project B introduces.** Investigation: `generateFromPrompt → args.agent.applyCommand(...) → injected agent from useAiAgent → createEdgeFunctionAgent (src/features/editor/ai/applyCommand.ts) → ai-apply-command Edge Function`. Sub-project B does NOT introduce new inline-key usage. The broader Issue #2 concern (other features still use `VITE_ANTHROPIC_API_KEY`: `claudeProvider.ts:77,97`, `anthropicProvider.ts:17`) is a public-launch blocker but NOT a B-specific blocker. See **Task B.0** for the explicit Issue #2 ownership / status documentation step.

### Execution mode (mixed — per user mandate)

| Sub-project | Mode | Reason |
|-------------|------|--------|
| **A** | `superpowers:subagent-driven-development` | Schema + service layer + store helpers. **High blast radius** — wrong schema or store helper poisons every other sub-project. Fresh subagent per task + two-stage review prevents drift. |
| **B** | `superpowers:subagent-driven-development` | AI integration + editor save-back + overwrite-warning dialog. **High blast radius** — wrong AI routing or save-back logic corrupts user designs. Per-task review catches issues early. |
| **C** | `superpowers:executing-plans` | Templates UI integration + seed data + URL filter wiring. **Lower risk** — UI changes are recoverable; seed data adds are isolated. Inline execution with batch checkpoints is faster. |
| **D** | `superpowers:executing-plans` | UI components (cards, button, modal) + ports of existing helpers. **Lower risk** — most code is new + isolated; alt-fork promotion (D.1) is the one delicate task but is well-bounded. Inline execution with batch checkpoints is faster. |

When kicking off A/B subagents: one task = one fresh subagent invocation, two-stage review at completion (PR-style review + verification), then next subagent dispatched. When kicking off C/D inline: review in batches at logical commit boundaries (every 3–5 tasks) plus the mandatory checkpoint at sub-project end.

### Spec reference

Spec lives at `docs/superpowers/specs/brand-kit-premium.md` (1217 lines, commit `f080052`). When a task references a spec section, the spec text is the source of truth. If the plan and spec disagree about behavior, escalate — do not silently follow the plan over the spec.

---

## Out of scope (constraint #8) — explicit non-deliverables

This plan does NOT do any of the following. Future agents reading this plan must not assume otherwise:

| Item | Reason |
|------|--------|
| **Sub-project E (Auto-fill)** | Designed-around only in spec (`origin: 'ai-bulk'` + `userEdited` plumbed). The single Auto-fill action UI, concurrency caps, and progress UX are a separate spec. |
| **17 deferred cards' premium content** | Plan builds the full A/B/C/D flow only for the 8 MVP cards (Business Card, Letterhead, Social Post, Email Signature, Pitch Deck, Logo Guide, Color Guide, Typography Guide). Polish (11) get bindings working but no premium content build. Future (6) get "Coming soon" placeholders only. |
| **Animations (×4)** | `CardType`s defined in schema for forward-compat. No Open in Editor, Browse Other, or Customize wiring. Placeholder cards only. |
| **`brand-kit-alt/` full retirement** | Per CLAUDE.md, alternate is bug-fix only. D5 promotion (one task in D) updates `brand-kit-alt/` import statements only — no logic, UI, or test edits in alt. |
| **`BrandKitCardEditor.tsx` UI refactor** | Tagged `tech-debt/brand-kit-overlay-v1`. A wires its `onSave` to persist; no other changes. |
| **AI proxy migration completion** | Per Prerequisite P1, B's "Generate with AI" branch gates on `ai-proxy` Edge Function shipping. If P1 check (Task B.1) finds the inline key path is still active, B's AI tasks are paused until Issue #2 closes. The plan does NOT itself complete the AI proxy migration. |
| **Mockup engine for Web cards** | `BrandMockupRenderer` deferred. Website + Landing Page render `<ComingSoonCard>` placeholders. |
| **Web cards as bindable surfaces** | No "Open in Editor" handoff for Website / Landing Page / Animations even when their CardTypes exist in schema. |
| **Real telemetry transport** | Plan wires the events (call sites + payloads) but defaults transport to `console.info` if no analytics SDK is wired. Selecting/wiring PostHog or equivalent is a separate concern. |
| **Stripe, billing, share links, public showcase, anything not in the spec** | Out of scope. |

---

## High-contention files registry (constraint #7)

These files are touched by Brand Kit Premium AND potentially by other concurrent pipelines. To minimize merge surface, each is allocated as a single grouped task per sub-project. If a parallel pipeline modifies one of these files during this plan's execution, escalate to the user — DO NOT attempt to silent-merge.

| File | Sub-project | Task |
|------|-------------|------|
| `src/shared/types/brand.ts` | A only | A.3 |
| `src/core/types/services.ts` | A only | A.3 (same task — both type files together) |
| `src/shared/store/brandStore.ts` | A, B, C (one task each) | A.5, B.7, (C does NOT touch — calls A/B helpers) |
| `src/core/boot.ts` | A only (if new service registered) | A.4 |
| `src/features/brand-kit/BrandKitCosmosPage.tsx` | A, B, C, D (one grouped task each) | A.6, B.4, C.8, D.7 |
| `src/features/brand-kit/components/BrandKitCardEditor.tsx` | A only | A.6 (same task as BrandKitCosmosPage A.6) |
| `src/features/editor/shell/v2/panels/TemplatesPanel.tsx` | C only | C.5 + C.6 + C.7 grouped |
| `src/features/templates/seeds/categories.ts` | C only | C.3 |
| `src/features/editor/schema/index.ts` | B only | B.3 |
| `src/features/brand-kit-alt/brandGuidePdf.ts` | D only | D.1 (atomic move) |
| `src/features/brand-kit-alt/bulkExport.ts` | D only | D.1 (atomic move) |
| `src/App.tsx` | Not touched | n/a (no new routes) |

---

## Migration safety protocol (constraint #5)

Migration 010 lands in **3 separate tasks**, never a single one:

1. **Task A.1 — Write migration files.** `up.sql` + `down.sql` content authored. No application. No code that references the new schema lands yet.
2. **Task A.2 — Apply to staging + verify.** Run migration against the staging Supabase project. Verify schema with a SELECT query. Document the verification output in the commit message.
3. **Task A.3 onwards — Code lands.** Only after A.2 commit is green can TypeScript types, BrandsService updates, or any read/write paths land.

If A.2 reveals a schema bug, fix the migration file and re-apply (idempotent via `IF NOT EXISTS`). Roll forward; do not skip the verify step.

---

## Test gates (constraint #4)

Per `CLAUDE.md` § "Test coverage requirements", every sub-project lands tests at all three layers BEFORE its checkpoint:

| Layer | Tool | Where |
|-------|------|-------|
| **Unit (jsdom)** | Vitest + `vi.mock('fabric')` if needed | `*.test.ts(x)` next to source |
| **Adapter integration (jsdom)** | Vitest + mocked Supabase + faithful Fabric stand-in | `*.test.ts(x)` next to adapter |
| **Browser E2E (Chromium)** | Playwright via `*.browser.test.tsx` | Next to React component being tested |

No sub-project's checkpoint passes without at least one happy-path E2E test green.

---

## Ordering (constraint #1)

```
A (Customize persistence)  ──► CHECKPOINT A ──►
B (Editor handoff)         ──► CHECKPOINT B ──►
   ├─► C (Templates integration)  ──► CHECKPOINT C ──►
   └─► D (Premium polish + Export) ──► CHECKPOINT D ──►
              FINAL ACCEPTANCE
```

C and D run as **two parallel subagent pipelines** after Checkpoint B closes. Each track owns its own files (per the High-contention table above — no shared file edits between C and D).

---

# Sub-project A — Customize persistence

**Goal:** Wire the existing `BrandKitCardEditor` overlay's `onSave` to persist `brand.brandKitDesigns[cardType]` (customize-origin bindings) AND flush session-only overlays (`colorAddsOverride`, `iconsOverride`) to the brand. Land schema + types + adapter + tests.

**Touches:** Migration 010 · `brand.ts` · `services.ts` · `brandStore.ts` · `boot.ts` · `BrandsService` (Local + Supabase) · `BrandKitCardEditor.tsx` · `BrandKitCosmosPage.tsx`

**Estimated total:** ~28 hours across 12 tasks. Each task ≤ 4 hours.

---

### Task A.1: Write migration 010 SQL (up + down) — no apply

**Files:**
- Create: `supabase/migrations/20260512230000_010_brand_kit_premium.sql`
- Create: `supabase/migrations/down/010_brand_kit_premium.down.sql`

Estimated: 1 hour.

- [ ] **Step 1: Create the up migration file**

Write to `supabase/migrations/20260512230000_010_brand_kit_premium.sql`:

```sql
-- Migration 010: Brand Kit Premium
-- Adds brand_kit_designs JSONB column to brands + brand_kit_exports table
-- Idempotent per migrations 001–009 lessons; safe to re-run

-- 1. Add brand_kit_designs to brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_kit_designs JSONB NULL;

-- 2. Frozen export snapshots table
CREATE TABLE IF NOT EXISTS brand_kit_exports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_url           TEXT NULL,
  zip_url           TEXT NULL,
  bindings_snapshot JSONB NOT NULL,
  brand_snapshot    JSONB NOT NULL,
  doc_snapshots     JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS brand_kit_exports_brand_id_idx
  ON brand_kit_exports(brand_id, created_at DESC);

-- 3. RLS
ALTER TABLE brand_kit_exports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kit_exports'
      AND policyname = 'brand_owner_select_exports'
  ) THEN
    CREATE POLICY brand_owner_select_exports ON brand_kit_exports
      FOR SELECT USING (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kit_exports'
      AND policyname = 'brand_owner_insert_exports'
  ) THEN
    CREATE POLICY brand_owner_insert_exports ON brand_kit_exports
      FOR INSERT WITH CHECK (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;
END $$;
```

- [ ] **Step 2: Create the down migration file**

Write to `supabase/migrations/down/010_brand_kit_premium.down.sql`:

```sql
-- Down migration for 010 — drops everything 010 created
DROP POLICY IF EXISTS brand_owner_insert_exports ON brand_kit_exports;
DROP POLICY IF EXISTS brand_owner_select_exports ON brand_kit_exports;
DROP INDEX IF EXISTS brand_kit_exports_brand_id_idx;
DROP TABLE IF EXISTS brand_kit_exports;
ALTER TABLE brands DROP COLUMN IF EXISTS brand_kit_designs;
```

- [ ] **Step 3: Verify SQL syntax with psql dry-run (optional, recommended)**

If the dev has a local Postgres, run:
```bash
psql -h localhost -U postgres -c "$(cat supabase/migrations/20260512230000_010_brand_kit_premium.sql)" --dry-run 2>&1 | head -20
```
Expected: no syntax errors. (psql dry-run isn't a real thing — use `EXPLAIN` against statements or just trust the migration applies in A.2.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260512230000_010_brand_kit_premium.sql supabase/migrations/down/010_brand_kit_premium.down.sql
git commit -m "feat(brandkit): add migration 010 — brand_kit_designs + brand_kit_exports

Adds brand_kit_designs JSONB column to brands (per-card binding pointers)
and brand_kit_exports table for frozen PDF/ZIP export snapshots. All
statements use IF NOT EXISTS guards; down.sql provided.

Note: spec says 'migration 009' but live 009 is templates_phase_4 — this
is 010 in practice. Refs spec docs/superpowers/specs/brand-kit-premium.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.2: Apply migration 010 to staging + verify schema

**Files:**
- Modify: none (manual staging apply)
- Create: `docs/superpowers/plans/runbook/A.2-migration-010-verification.md` (verification log)

Estimated: 1.5 hours (mostly waiting + sanity).

Dependencies: A.1.

- [ ] **Step 1: Apply via Supabase CLI**

Run from project root:
```bash
supabase db push --linked
```
Expected: "Applied migration 20260512230000_010_brand_kit_premium". If you don't have CLI access, use the Supabase dashboard SQL editor to paste `up.sql`.

- [ ] **Step 2: Verify `brand_kit_designs` column exists**

In Supabase SQL editor (staging project `ciojgoozobzbeglwdxcz`):
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'brands' AND column_name = 'brand_kit_designs';
```
Expected output: one row, `data_type = 'jsonb'`, `is_nullable = 'YES'`.

- [ ] **Step 3: Verify `brand_kit_exports` table + index + policies**

```sql
SELECT tablename FROM pg_tables WHERE tablename = 'brand_kit_exports';
SELECT indexname FROM pg_indexes WHERE tablename = 'brand_kit_exports';
SELECT policyname FROM pg_policies WHERE tablename = 'brand_kit_exports';
```
Expected: 1 row table, 1 row index (`brand_kit_exports_brand_id_idx`), 2 rows policies (`brand_owner_select_exports`, `brand_owner_insert_exports`).

- [ ] **Step 4: Verify idempotency — re-run migration**

Paste `up.sql` content into Supabase SQL editor a second time. Expected: completes without errors (every statement is a no-op the second time).

- [ ] **Step 5: Write verification log + commit**

Create `docs/superpowers/plans/runbook/A.2-migration-010-verification.md` with the actual query outputs from Steps 2-4 pasted in, plus the date/time of apply.

```bash
mkdir -p docs/superpowers/plans/runbook
git add docs/superpowers/plans/runbook/A.2-migration-010-verification.md
git commit -m "docs(brandkit): record migration 010 staging verification

Migration applied to staging (ciojgoozobzbeglwdxcz) 2026-05-12. Schema
checks confirm brand_kit_designs column + brand_kit_exports table + index
+ 2 RLS policies present. Idempotent re-run passed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.3: Add TypeScript types (Brand extension + binding + enums)

**Files:**
- Modify: `src/shared/types/brand.ts` (extend `Brand` interface, add new types)
- Modify: `src/core/types/services.ts` (no behavior change — add JSDoc note that `IBrandsService.update` accepts `brandKitDesigns`)

Estimated: 1.5 hours.

Dependencies: A.2 (must be applied before types reference the column).

- [ ] **Step 1: Add new types to `brand.ts`**

Append to `src/shared/types/brand.ts` (after existing exports):

```ts
/**
 * Brand Kit binding — points a card type to either a customize-only
 * template+overrides combo (origin: 'customize') or a saved design
 * (origin: 'editor' | 'template' | 'ai-individual' | 'ai-bulk').
 * Canonical source of truth for what each Brand Kit card shows.
 * See: docs/superpowers/specs/brand-kit-premium.md § "Schema additions"
 */
export type CardType =
  | 'business-card' | 'letterhead' | 'envelope' | 'invoice'
  | 'social-profile' | 'social-cover' | 'social-post' | 'social-story'
  | 'favicon' | 'website' | 'email-signature' | 'landing-page'
  | 'guide-logo' | 'guide-color' | 'guide-typography' | 'guide-voice' | 'guide-imagery'
  | 'pitch-deck' | 'business-plan' | 'proposal' | 'case-studies'
  | 'logo-reveal' | 'slide-in' | 'fade' | 'rotate';

export type BindOrigin =
  | 'customize'
  | 'editor'
  | 'template'
  | 'ai-individual'
  | 'ai-bulk';

export interface BrandKitBinding {
  cardType: CardType;
  version: number;
  boundAt: string; // ISO timestamp
  origin: BindOrigin;
  userEdited: boolean;
  designId?: string;          // present when origin ∈ {editor, template, ai-*}
  templateId?: string;        // present when origin = customize
  overrides?: Record<string, unknown>; // only with templateId
}
```

- [ ] **Step 2: Extend `Brand` interface**

Find the `Brand` interface in `src/shared/types/brand.ts` (currently around line 11). Add the optional field:

```ts
export interface Brand {
  // ... all existing fields preserved
  brandKitDesigns?: Partial<Record<CardType, BrandKitBinding>>;
}
```

- [ ] **Step 3: Add helper type for design metadata backreference**

The editor's `BrandOSDocument.metadata` is a free-form record (per spec § "Single source of truth"). Add a TYPE-ONLY helper for engineers to use when reading/writing this metadata:

```ts
// in brand.ts after BrandKitBinding
export interface BrandKitDesignMetadataHints {
  cardOriginType?: CardType;
  cardBindingBrandId?: string;
}
```

This is a hint shape; the actual `metadata` field on `BrandOSDocument` stays free-form. Editor code casts via `metadata as BrandKitDesignMetadataHints`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: 0 errors. (Adding optional fields doesn't break existing call sites.)

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/brand.ts
git commit -m "feat(brandkit): add Brand.brandKitDesigns + binding types

Adds CardType (25), BindOrigin (5, including ai-individual + ai-bulk
split for E forward-compat per spec), BrandKitBinding shape, and
optional brand.brandKitDesigns field. All additions are non-breaking.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.4: BrandsService — read + write brand_kit_designs (HIGH-CONTENTION)

**Files:**
- Modify: `src/core/adapters/local/LocalBrandsService.ts` (or whatever the canonical local impl path is — verify with `grep -l "class.*BrandsService"`)
- Modify: `src/core/adapters/supabase/SupabaseBrandsService.ts` (same — verify path)
- Test: co-located `*.test.ts` files

Estimated: 3 hours.

Dependencies: A.2 (schema present), A.3 (types defined).

⚠ **HIGH-CONTENTION TASK.** If a parallel pipeline is modifying either BrandsService implementation, escalate before proceeding.

- [ ] **Step 1: Locate the BrandsService implementations**

```bash
grep -lrn "class.*BrandsService\|implements IBrandsService" src/core/adapters
```
Expected: 2 files (Local + Supabase). Use the actual paths discovered as `<LOCAL_PATH>` and `<SUPABASE_PATH>` below.

- [ ] **Step 2: Write the failing read test (Local)**

In `<LOCAL_PATH>.test.ts`, add:

```ts
import { describe, it, expect } from 'vitest';
import { LocalBrandsService } from './LocalBrandsService';

describe('LocalBrandsService — brand_kit_designs', () => {
  it('reads brandKitDesigns as empty object when field is absent', async () => {
    const svc = new LocalBrandsService();
    // Seed a brand with no brandKitDesigns
    const brand = await svc.create({ name: 'TestBrand', slug: 'test-bkd-1' });
    const loaded = await svc.get(brand.id);
    expect(loaded?.brandKitDesigns).toEqual({});
  });

  it('persists brandKitDesigns through update + get round-trip', async () => {
    const svc = new LocalBrandsService();
    const brand = await svc.create({ name: 'TestBrand2', slug: 'test-bkd-2' });
    await svc.update(brand.id, {
      brandKitDesigns: {
        'business-card': {
          cardType: 'business-card',
          version: 1,
          boundAt: '2026-05-12T00:00:00Z',
          origin: 'customize',
          userEdited: false,
          templateId: 'tpl-1',
          overrides: { logoId: 'logo-1' },
        },
      },
    });
    const loaded = await svc.get(brand.id);
    expect(loaded?.brandKitDesigns?.['business-card']?.version).toBe(1);
    expect(loaded?.brandKitDesigns?.['business-card']?.origin).toBe('customize');
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (default returns undefined, update doesn't pass through)**

```bash
npx vitest run <LOCAL_PATH>.test.ts
```
Expected: 2 failures (either undefined returned or update doesn't accept the field).

- [ ] **Step 4: Implement in LocalBrandsService**

In the file's `get`/`list` methods, ensure when reading from localStorage, the returned brand object has `brandKitDesigns: storedValue ?? {}`. In `update`, accept `brandKitDesigns` in the patch shape and persist as JSON.

Concrete edit pattern:
```ts
// In get(id) — after parsing storage:
return {
  ...parsedBrand,
  brandKitDesigns: parsedBrand.brandKitDesigns ?? {},
};

// In update(id, patch) — no changes needed if patch is spread shallowly:
// existing code: { ...currentBrand, ...patch } already covers it.
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run <LOCAL_PATH>.test.ts
```
Expected: 2/2 pass.

- [ ] **Step 6: Repeat steps 2-5 for SupabaseBrandsService**

Same test shape against `<SUPABASE_PATH>.test.ts` (mock the Supabase client). Implementation maps `brand_kit_designs` snake_case ↔ `brandKitDesigns` camelCase in the row mapper.

- [ ] **Step 7: Commit**

```bash
git add <LOCAL_PATH>.ts <LOCAL_PATH>.test.ts <SUPABASE_PATH>.ts <SUPABASE_PATH>.test.ts
git commit -m "feat(brandkit): BrandsService reads/writes brand_kit_designs

Both LocalBrandsService and SupabaseBrandsService now persist
Brand.brandKitDesigns through the standard create/update/get/list flows.
Supabase maps snake_case brand_kit_designs ↔ camelCase brandKitDesigns
in the row mapper. Defaults to {} when absent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.5: brandStore.ts — binding write helper (HIGH-CONTENTION)

**Files:**
- Modify: `src/shared/store/brandStore.ts`
- Test: `src/shared/store/brandStore.test.ts` (create if absent)

Estimated: 2 hours.

Dependencies: A.4 (service writes work).

⚠ **HIGH-CONTENTION TASK.** Multiple pipelines may touch `brandStore`. Single grouped task for all A's `brandStore` changes.

- [ ] **Step 1: Write the failing test**

In `src/shared/store/brandStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useBrandStore } from './brandStore';
import type { BrandKitBinding } from '@/shared/types/brand';

describe('brandStore.upsertBrandKitBinding', () => {
  beforeEach(() => {
    useBrandStore.getState().clearAll?.();
  });

  it('writes a new binding to brandKitDesigns', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'B', slug: 'b-store-1' });
    const binding: BrandKitBinding = {
      cardType: 'business-card',
      version: 1,
      boundAt: '2026-05-12T00:00:00Z',
      origin: 'customize',
      userEdited: false,
      templateId: 'tpl-1',
    };
    await store.upsertBrandKitBinding(brand.id, binding);
    const updated = store.getById(brand.id);
    expect(updated?.brandKitDesigns?.['business-card']).toEqual(binding);
  });

  it('increments version when upserting an existing binding', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'B', slug: 'b-store-2' });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'letterhead', version: 1, boundAt: 't1',
      origin: 'customize', userEdited: false, templateId: 'tpl-1',
    });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'letterhead', version: 2, boundAt: 't2',
      origin: 'editor', userEdited: true, designId: 'd-1',
    });
    const updated = store.getById(brand.id);
    expect(updated?.brandKitDesigns?.['letterhead']?.version).toBe(2);
    expect(updated?.brandKitDesigns?.['letterhead']?.origin).toBe('editor');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (method missing)**

```bash
npx vitest run src/shared/store/brandStore.test.ts
```

- [ ] **Step 3: Implement `upsertBrandKitBinding` in brandStore**

Add to `brandStore.ts` actions object:

```ts
upsertBrandKitBinding: async (brandId: string, binding: BrandKitBinding) => {
  const current = get().getById(brandId);
  if (!current) throw new Error(`Brand not found: ${brandId}`);
  const next: Brand = {
    ...current,
    brandKitDesigns: {
      ...(current.brandKitDesigns ?? {}),
      [binding.cardType]: binding,
    },
  };
  await services.brands.update(brandId, { brandKitDesigns: next.brandKitDesigns });
  set((state) => ({
    brands: state.brands.map((b) => (b.id === brandId ? next : b)),
  }));
},
```

Also add a read helper:

```ts
getBrandKitBinding: (brandId: string, cardType: CardType): BrandKitBinding | undefined => {
  return get().getById(brandId)?.brandKitDesigns?.[cardType];
},
```

Update the store's TypeScript interface to include both new methods.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/shared/store/brandStore.ts src/shared/store/brandStore.test.ts
git commit -m "feat(brandkit): brandStore upsertBrandKitBinding + getBrandKitBinding

Single-source write helper for brand.brandKitDesigns[cardType]. Used by
Customize overlay save (A), editor save-back (B), and Templates 'Use as
my X' (C). Service layer persists via existing BrandsService.update path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.6: Wire `BrandKitCardEditor.onSave` to persist (HIGH-CONTENTION across 2 files)

**Files:**
- Modify: `src/features/brand-kit/components/BrandKitCardEditor.tsx` (around line 824 — `onSave` callback)
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` (the `onSave` prop passed to `BrandKitCardEditor`; flush session overlays)

Estimated: 3.5 hours.

Dependencies: A.5.

⚠ **HIGH-CONTENTION TASK.** Group ALL A's edits to `BrandKitCosmosPage.tsx` here. No other A task touches it.

Per spec § "Tech debt tags": `BrandKitCardEditor.tsx` ships UI unchanged. Only `onSave` wiring + read path additions.

- [ ] **Step 1: Read the current onSave callsite in BrandKitCosmosPage**

```bash
grep -n "onSave" src/features/brand-kit/BrandKitCosmosPage.tsx | head -10
```

Locate the `<BrandKitCardEditor` mount (around line 819 in the current file). The `onSave` prop currently toasts. We replace it with a real persistence call.

- [ ] **Step 2: Replace the onSave handler in BrandKitCosmosPage**

Inside `BrandKitCosmosPage`, find:
```tsx
<BrandKitCardEditor
  // ...
  onSave={() => toast.success('Saved')}
/>
```

Replace with:
```tsx
<BrandKitCardEditor
  // ...
  onSave={async (editorState) => {
    if (!editorState) return;
    const binding: BrandKitBinding = {
      cardType: editorState.cardType,
      version: (brand.brandKitDesigns?.[editorState.cardType]?.version ?? 0) + 1,
      boundAt: new Date().toISOString(),
      origin: 'customize',
      userEdited: false,
      templateId: editorState.templateId,
      overrides: editorState.overrides,
    };
    await useBrandStore.getState().upsertBrandKitBinding(brand.id, binding);
    // Telemetry stub (real wiring in A.7)
    telemetry?.('card_bound', {
      brandId: brand.id,
      cardType: binding.cardType,
      origin: 'customize',
      isInitialBind: binding.version === 1,
      version: binding.version,
    });
    toast.success('Saved to Brand Kit');
  }}
/>
```

Add the imports at the top of the file:
```tsx
import { useBrandStore } from '@/shared/store/brandStore';
import type { BrandKitBinding } from '@/shared/types/brand';
import { telemetry } from '@/shared/telemetry'; // created in A.7 — use optional chaining for now
```

- [ ] **Step 3: Flush session overlays to brand on save**

In `BrandKitCosmosPage`, find the session-only state `colorAddsOverride` + `iconsOverride` (around lines 232–249). Add a flush helper:

```tsx
const flushSessionOverlaysToBrand = useCallback(async () => {
  const patches: Partial<Brand> = {};
  if (colorAddsOverride && Object.keys(colorAddsOverride).length > 0) {
    patches.colors = {
      ...brand.colors,
      accent: [...(brand.colors?.accent ?? []), ...colorAddsOverride.accents ?? []],
    };
  }
  if (iconsOverride && iconsOverride.length > 0) {
    patches.icons = Array.from(new Set([...(brand.icons ?? []), ...iconsOverride]));
  }
  if (Object.keys(patches).length === 0) return;
  await useBrandStore.getState().update(brand.id, patches);
  setColorAddsOverride({}); // clear
  setIconsOverride([]);
}, [brand, colorAddsOverride, iconsOverride]);
```

Call `flushSessionOverlaysToBrand()` at the start of the `onSave` handler:
```tsx
onSave={async (editorState) => {
  await flushSessionOverlaysToBrand();
  // ... rest as Step 2
}}
```

- [ ] **Step 4: Update read path so Customize-origin bindings render**

`BrandKitCosmosPage`'s `effectiveBrand` (around lines 244–280) currently merges base brand + session overlays. Extend it to also read `brand.brandKitDesigns` and apply customize-origin overrides when rendering each template-based card. New logic:

```tsx
function resolveCardDisplayData(brand: Brand, cardType: CardType) {
  const binding = brand.brandKitDesigns?.[cardType];
  if (!binding) return { kind: 'default', templateId: defaultTemplateFor(cardType) };
  if (binding.origin === 'customize') {
    return { kind: 'customized', templateId: binding.templateId!, overrides: binding.overrides ?? {} };
  }
  return { kind: 'bound-design', designId: binding.designId! };
}
```

The renderer dispatch in the drilldown uses `resolveCardDisplayData(brand, cardType)` to pick render path. `'bound-design'` path is wired in B (currently renders a "Loading…" placeholder).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run typecheck
```

- [ ] **Step 6: Manual smoke test — Customize a card and reload**

```bash
npm run dev
```

Open `http://localhost:8080/b/test0/brand-kit` → click Business Card → Customize → change a value → Save. Reload the page. Verify the customization persists.

- [ ] **Step 7: Commit**

```bash
git add src/features/brand-kit/BrandKitCosmosPage.tsx src/features/brand-kit/components/BrandKitCardEditor.tsx
git commit -m "feat(brandkit): wire BrandKitCardEditor.onSave to persist bindings

A's HIGH-CONTENTION grouped edit. BrandKitCardEditor (1815 LOC, tagged
brand-kit-overlay-v1) untouched in UI; onSave callback in cosmos page
now writes a customize-origin binding via upsertBrandKitBinding +
flushes session-only color/icon overlays to brand. Read path resolves
binding by origin (customize → template + overrides; bound-design path
stubbed for B). Refs spec § Sub-project A.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.7: Telemetry events for A — card_bound + card_customized

**Files:**
- Create: `src/shared/telemetry/index.ts` (if absent) — central telemetry entry
- Create: `src/shared/telemetry/types.ts` — event type registry
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` (replace optional `telemetry?.()` with real call)

Estimated: 1.5 hours.

Dependencies: A.6.

- [ ] **Step 1: Check if a telemetry transport exists**

```bash
grep -rln "PostHog\|posthog\|amplitude\|mixpanel" src 2>/dev/null
ls src/shared/telemetry 2>/dev/null
```

If a transport exists, wire to it. If absent, ship the `console.info` default per spec.

- [ ] **Step 2: Create the event type registry**

Write `src/shared/telemetry/types.ts`:

```ts
import type { CardType, BindOrigin } from '@/shared/types/brand';

export type TelemetryEvent =
  // A
  | { type: 'card_bound'; brandId: string; cardType: CardType; origin: BindOrigin; isInitialBind: boolean; version: number }
  | { type: 'card_customized'; brandId: string; cardType: CardType; fieldsChanged: string[] }
  // B
  | { type: 'ai_generated_for_card'; brandId: string; cardType: CardType; origin: 'ai-individual' | 'ai-bulk'; promptVariant: 'default' | 'custom'; tokensUsed?: number; durationMs: number }
  | { type: 'ai_generation_failed'; brandId: string; cardType: CardType; origin: 'ai-individual' | 'ai-bulk'; reason: 'cancelled' | 'failed' | 'timeout'; errorCode?: string }
  // C
  | { type: 'card_template_applied'; brandId: string; cardType: CardType; templateId: string; templateCategory: string }
  // D
  | { type: 'brand_kit_export_started'; brandId: string; cardBindingsCount: number; mvpCardsBoundCount: number; polishCardsBoundCount: number }
  | { type: 'brand_kit_exported'; brandId: string; exportId: string; pdfBytes: number; zipBytes: number; durationMs: number; cardBindingsCount: number; mvpCardsBoundCount: number }
  | { type: 'brand_kit_export_failed'; brandId: string; stage: 'pdf' | 'zip' | 'upload' | 'db_insert'; errorCode: string; errorMessage: string; durationMs: number }
  | { type: 'brand_kit_export_downloaded'; brandId: string; exportId: string; kind: 'pdf' | 'zip' };
```

- [ ] **Step 3: Create the transport stub**

Write `src/shared/telemetry/index.ts`:

```ts
import type { TelemetryEvent } from './types';

export function telemetry<T extends TelemetryEvent>(event: T): void {
  // TODO(plan-author-open-question): wire to PostHog/Amplitude/Supabase Analytics
  // when chosen. Until then, console.info preserves the event shape contract.
  if (typeof console !== 'undefined') {
    console.info('[telemetry]', event);
  }
}

export type { TelemetryEvent } from './types';
```

- [ ] **Step 4: Replace optional telemetry call in A.6 with real call**

In `BrandKitCosmosPage.tsx`, change the import from `import { telemetry } from '@/shared/telemetry'` to the real one (drop the `?.()` optional invocation in the onSave handler). Verify the call:

```tsx
telemetry({
  type: 'card_bound',
  brandId: brand.id,
  cardType: binding.cardType,
  origin: 'customize',
  isInitialBind: binding.version === 1,
  version: binding.version,
});
```

Also add a `card_customized` event inside the BrandKitCardEditor when the user changes a field (not on save — on field change for change-level analytics). This goes in `BrandKitCardEditor.tsx` via a debounced effect (200ms) — only fires when `fieldsChanged.length > 0`.

- [ ] **Step 5: Verify TypeScript + lint pass**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/telemetry/ src/features/brand-kit/BrandKitCosmosPage.tsx src/features/brand-kit/components/BrandKitCardEditor.tsx
git commit -m "feat(telemetry): central event registry + A's card_bound + card_customized

Adds typed TelemetryEvent union (9 events total per spec) and a console.info
transport stub. Wires card_bound on every binding write and card_customized
on each Customize overlay field change. Future agents pick the real
transport (PostHog/etc) without changing call sites.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.8: Unit tests for binding logic

**Files:**
- Create: `src/shared/types/brand.test.ts`
- Modify: `src/shared/store/brandStore.test.ts` (extend from A.5)

Estimated: 2 hours.

Dependencies: A.5.

- [ ] **Step 1: Write binding-schema unit tests**

Write `src/shared/types/brand.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { BrandKitBinding, CardType, BindOrigin } from './brand';

describe('BrandKitBinding shape', () => {
  it('accepts customize-origin binding with templateId + overrides', () => {
    const b: BrandKitBinding = {
      cardType: 'business-card',
      version: 1,
      boundAt: '2026-05-12T00:00:00Z',
      origin: 'customize',
      userEdited: false,
      templateId: 'tpl-1',
      overrides: { logoId: 'l-1' },
    };
    expect(b.origin).toBe('customize');
  });

  it('accepts editor-origin binding with designId', () => {
    const b: BrandKitBinding = {
      cardType: 'letterhead',
      version: 2,
      boundAt: '2026-05-12T00:01:00Z',
      origin: 'editor',
      userEdited: true,
      designId: 'd-1',
    };
    expect(b.designId).toBe('d-1');
  });

  it('CardType union exhaustiveness — 25 members', () => {
    const all: CardType[] = [
      'business-card','letterhead','envelope','invoice',
      'social-profile','social-cover','social-post','social-story',
      'favicon','website','email-signature','landing-page',
      'guide-logo','guide-color','guide-typography','guide-voice','guide-imagery',
      'pitch-deck','business-plan','proposal','case-studies',
      'logo-reveal','slide-in','fade','rotate',
    ];
    expect(all.length).toBe(25);
  });

  it('BindOrigin includes ai-individual + ai-bulk split', () => {
    const origins: BindOrigin[] = ['customize','editor','template','ai-individual','ai-bulk'];
    expect(origins).toContain('ai-individual');
    expect(origins).toContain('ai-bulk');
  });
});
```

- [ ] **Step 2: Extend brandStore tests with edge cases**

Add to `brandStore.test.ts`:

```ts
describe('brandStore.upsertBrandKitBinding — edge cases', () => {
  it('throws when brand not found', async () => {
    const store = useBrandStore.getState();
    await expect(
      store.upsertBrandKitBinding('nonexistent-id', {
        cardType: 'business-card', version: 1, boundAt: 't',
        origin: 'customize', userEdited: false, templateId: 'tpl-1',
      })
    ).rejects.toThrow(/not found/i);
  });

  it('preserves bindings for other card types when upserting one', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'B', slug: 'b-store-edge-1' });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'business-card', version: 1, boundAt: 't1',
      origin: 'customize', userEdited: false, templateId: 'tpl-1',
    });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'letterhead', version: 1, boundAt: 't2',
      origin: 'customize', userEdited: false, templateId: 'tpl-2',
    });
    const updated = store.getById(brand.id);
    expect(updated?.brandKitDesigns?.['business-card']).toBeDefined();
    expect(updated?.brandKitDesigns?.['letterhead']).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests — all green**

```bash
npx vitest run src/shared/types/brand.test.ts src/shared/store/brandStore.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/brand.test.ts src/shared/store/brandStore.test.ts
git commit -m "test(brandkit): unit tests for binding schema + store edge cases

Asserts CardType enum has 25 members, BindOrigin has the ai-individual/
ai-bulk split, BrandKitBinding accepts both customize + editor shapes,
upsertBrandKitBinding preserves other card type bindings + throws on
unknown brandId.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.9: Adapter integration test — BrandKitCardEditor save → store

**Files:**
- Create: `src/features/brand-kit/components/BrandKitCardEditor.integration.test.tsx`

Estimated: 2.5 hours.

Dependencies: A.6.

- [ ] **Step 1: Write the integration test**

This test mounts BrandKitCardEditor in jsdom, simulates a Save click, and asserts the brandStore has the new binding.

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandKitCardEditor } from './BrandKitCardEditor';
import { useBrandStore } from '@/shared/store/brandStore';

vi.mock('fabric', () => ({
  Canvas: vi.fn(() => ({ dispose: vi.fn(), add: vi.fn() })),
  Object: vi.fn(),
}));

describe('BrandKitCardEditor — save persists binding', () => {
  beforeEach(() => {
    useBrandStore.getState().clearAll?.();
  });

  it('writes a customize-origin binding when Save is clicked', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'IntegBrand', slug: 'integ-1' });
    const onClose = vi.fn();

    render(
      <BrandKitCardEditor
        brand={brand}
        cardType="business-card"
        templateId="tpl-bc-1"
        initialOverrides={{}}
        onClose={onClose}
        onSave={async (editorState) => {
          // mimic BrandKitCosmosPage.onSave handler from A.6
          await store.upsertBrandKitBinding(brand.id, {
            cardType: editorState.cardType,
            version: 1,
            boundAt: new Date().toISOString(),
            origin: 'customize',
            userEdited: false,
            templateId: editorState.templateId,
            overrides: editorState.overrides,
          });
        }}
      />
    );

    // Trigger a field change first (so editorState has something)
    const nameInput = screen.getByLabelText(/display name/i);
    fireEvent.change(nameInput, { target: { value: 'Acme' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    // Wait microtask
    await new Promise((r) => setTimeout(r, 50));

    const updated = store.getById(brand.id);
    expect(updated?.brandKitDesigns?.['business-card']?.origin).toBe('customize');
    expect(updated?.brandKitDesigns?.['business-card']?.overrides).toMatchObject({
      displayName: 'Acme',
    });
  });
});
```

- [ ] **Step 2: Run test — expect pass**

```bash
npx vitest run src/features/brand-kit/components/BrandKitCardEditor.integration.test.tsx
```

If the test fails because the test setup needs services configured, add `import { configureLocalServices } from '@/core/boot';` and call it in `beforeEach`.

- [ ] **Step 3: Commit**

```bash
git add src/features/brand-kit/components/BrandKitCardEditor.integration.test.tsx
git commit -m "test(brandkit): adapter integration — onSave writes binding via store

Mounts BrandKitCardEditor under jsdom with fabric mocked, simulates a
field change + Save click, asserts brandStore.getById returns a brand
with the expected customize-origin binding for the touched cardType.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.10: Browser E2E — Customize → save → reload → preserved

**Files:**
- Create: `src/features/brand-kit/BrandKitCosmosPage.browser.test.tsx`

Estimated: 3 hours.

Dependencies: A.6, A.7.

- [ ] **Step 1: Write the E2E test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrandKitCosmosPage } from './BrandKitCosmosPage';
import { useBrandStore } from '@/shared/store/brandStore';
import { MemoryRouter } from 'react-router-dom';

describe('Brand Kit — Customize persistence (browser E2E)', () => {
  beforeEach(() => {
    useBrandStore.getState().clearAll?.();
  });

  it('Customize a business card → save → re-mount → customization persists', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'E2EBrand', slug: 'e2e-1' });

    const { unmount } = render(
      <MemoryRouter initialEntries={[`/b/${brand.slug}/brand-kit`]}>
        <BrandKitCosmosPage brand={brand} />
      </MemoryRouter>
    );

    // Open Business Card drilldown
    fireEvent.click(screen.getByText(/business card/i));

    // Open Customize overlay
    await waitFor(() => screen.getByRole('button', { name: /customize/i }));
    fireEvent.click(screen.getByRole('button', { name: /customize/i }));

    // Change a field
    await waitFor(() => screen.getByLabelText(/display name/i));
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Acme Holdings' },
    });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Wait for the toast
    await waitFor(() => screen.getByText(/saved to brand kit/i));

    // Unmount and re-mount
    unmount();

    const reloadedBrand = store.getById(brand.id)!;
    render(
      <MemoryRouter initialEntries={[`/b/${brand.slug}/brand-kit`]}>
        <BrandKitCosmosPage brand={reloadedBrand} />
      </MemoryRouter>
    );

    // The Business Card card should still show the customized display name
    fireEvent.click(screen.getByText(/business card/i));
    await waitFor(() =>
      expect(screen.getByText(/acme holdings/i)).toBeInTheDocument()
    );

    // Binding present in store
    expect(reloadedBrand.brandKitDesigns?.['business-card']?.origin).toBe('customize');
    expect(reloadedBrand.brandKitDesigns?.['business-card']?.overrides).toMatchObject({
      displayName: 'Acme Holdings',
    });
  });
});
```

- [ ] **Step 2: Run in browser project**

```bash
npx vitest run --project browser src/features/brand-kit/BrandKitCosmosPage.browser.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/brand-kit/BrandKitCosmosPage.browser.test.tsx
git commit -m "test(brandkit): browser E2E — Customize persistence happy path

Renders BrandKitCosmosPage in MemoryRouter, opens Business Card
drilldown, opens Customize overlay, changes display name, saves,
unmounts, re-mounts with the updated brand, asserts the customization
still shows on the card.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task A.11: Document rollback path for Sub-project A

**Files:**
- Create: `docs/superpowers/plans/runbook/A-rollback.md`

Estimated: 0.5 hours.

Dependencies: A.10.

- [ ] **Step 1: Write the rollback doc**

```markdown
# Sub-project A rollback runbook

If A's changes break production, roll back in this order. Every step is
reversible if needed.

## Symptoms that warrant rollback

- BrandKitCardEditor.onSave throws on every save (telemetry: 100% A.6 error)
- /b/:slug/brand-kit white-screens on load (likely TypeScript/runtime error in resolveCardDisplayData)
- Brands save endpoint returns 500 because of brand_kit_designs JSONB shape

## Rollback steps

1. **Code rollback (5 min).** Revert these commits in reverse order:
   - A.6 (onSave wiring) — most likely culprit
   - A.7 (telemetry — unlikely to break, but if console spammed)
   - A.5 (brandStore method — unlikely; pure addition)
   - A.4 (BrandsService — only if the row mapper broke)

   ```bash
   git revert <A.6-sha>
   git push origin <branch>
   ```

   Reverting A.6 restores the toast-only onSave. Existing bindings in
   `brand.brandKitDesigns` are left in the DB (harmless — column is read
   but no longer written; users just can't update via Customize anymore).

2. **Schema rollback (DO NOT do unless A.4 or A.5 is provably the cause).**
   ```bash
   psql <staging-conn> -f supabase/migrations/down/010_brand_kit_premium.down.sql
   ```
   This drops `brand_kit_designs` column + `brand_kit_exports` table.
   ⚠ Data loss — every customize-origin binding is destroyed. Only do
   this if the column itself is causing failures, not just the app code.

3. **Notify.** Post in Slack #engineering with the revert SHA + symptom
   summary + which sub-project is affected (downstream B/C/D should not
   proceed past their respective P1 checks).

## Re-shipping after rollback

After fixing the root cause:
- A.6 → re-apply with the fix
- Run A.10 browser E2E first to verify
- Push, monitor telemetry for 1 hour, then unblock B
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/runbook/A-rollback.md
git commit -m "docs(brandkit): rollback runbook for Sub-project A

Step-by-step revert order, schema rollback caveats (data-loss warning),
and re-shipping protocol.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Checkpoint A — manual review before B starts

**🛑 STOP. Do not auto-chain to B. Human review required.**

Verify before unblocking B:

- [ ] All 11 A tasks committed and pushed.
- [ ] `npm run typecheck && npm run lint && npm run test` all green.
- [ ] Manual smoke test: open `/b/test0/brand-kit`, customize a card, reload, customization persists.
- [ ] Migration 010 applied to staging + verified (A.2 log present).
- [ ] Rollback runbook reviewed and feels accurate (`docs/superpowers/plans/runbook/A-rollback.md`).
- [ ] No regressions in adjacent features (Logo Maker, Brand Board, Templates page all still load).

**If all checks pass:** ping the user with "Checkpoint A green — ready for B?" and wait for explicit go-ahead.

---

# Sub-project B — Editor handoff + save-back

**Goal:** Add an "Open in Editor" button on every template-based MVP card that opens the unified editor at `/b/:slug/design/:newDesignId` seeded with the card's context. Choice modal handles empty cards (Blank / AI / Templates). Save auto-binds back with overwrite warning when binding would be replaced.

**Touches:** `src/features/editor/schema/index.ts` (metadata fields) · `src/features/brandkit/ai/useGenerateForCard.ts` (new) · `BrandKitChoiceModal.tsx` (new) · `BrandKitCosmosPage.tsx` (grouped task) · editor's autosave hook (one task)

**Estimated total:** ~32 hours across 15 tasks (was 14 — B.0 added).

⚠ **Prerequisite P1.** Per plan-write investigation, the specific code path this sub-project introduces (`useGenerateForCard → generateFromPrompt → agent.applyCommand → ai-apply-command Edge Function`) is already safe. The broader Issue #2 concern — `VITE_ANTHROPIC_API_KEY` still embedded in the client bundle via OTHER providers (`claudeProvider.ts`, `anthropicProvider.ts`) — is a public-launch blocker that this plan does NOT address but MUST document. **Task B.0 documents Issue #2 ownership and status before B.1's narrower path-specific verification.**

---

### Task B.0: Issue #2 ownership + status documentation (hard prerequisite)

**Files:**
- Create: `docs/superpowers/plans/runbook/B.0-issue-2-status.md`

Estimated: 0.5 hours.

This task does NOT close Issue #2. It DOCUMENTS its current state, owner (or absence thereof), and the scope boundary between what Sub-project B does and does not address.

- [ ] **Step 1: Determine Issue #2 owner**

If `gh` CLI is available:
```bash
gh issue view 2
```

If not available, ask the user explicitly: "Who owns Issue #2 (AI proxy migration)?" Record the answer. If unowned → flag in the doc that this is a known unowned blocker for public launch.

- [ ] **Step 2: Write the status doc**

Write `docs/superpowers/plans/runbook/B.0-issue-2-status.md`:

```markdown
# Issue #2 — AI proxy migration status (gating context for B)

Date: 2026-05-12
Plan: docs/superpowers/plans/2026-05-12-brand-kit-premium.md

## Current state (verified from codebase, 2026-05-12)

- `ai-apply-command` Edge Function: **shipped** (Phase 3.5 commit 4) at
  `supabase/functions/ai-apply-command/index.ts`.
- `generateFromPrompt` (used by Sub-project B's "Generate with AI"
  branch) routes through this Edge Function via the injected `AIAgent`
  built by `useAiAgent → createEdgeFunctionAgent`. **Safe path.**
- `VITE_ANTHROPIC_API_KEY` STILL embedded in client bundle via:
  - `src/features/ai/v5/providers/claudeProvider.ts:77,97`
  - `src/features/brand-consistency/providers/anthropicProvider.ts:17`
    (direct fetch to `api.anthropic.com/v1/messages` from browser)

## What this means for Sub-project B

- B's AI branch (Choice modal "Generate with AI") IS safe to ship —
  it does NOT add a new inline-key code path.
- B does NOT close Issue #2.

## What this means for public launch

- **Public launch is still blocked** by the OTHER inline-key call sites
  (claudeProvider, anthropicProvider). Until they migrate to
  `ai-apply-command` (or a new Edge Function), the key is in the
  bundle.

## Owner

- Issue #2 owner: [FILL FROM gh CLI or USER]
- Last progress: commit 244465b (Step 1 — ai_rate_limits + shared
  edge function helpers), commit b0ec5ac (fix migration 008
  idempotency). Steps 2+ paused per CLAUDE.md.

## Decision

- [ ] **Sub-project B GO** — B's AI branch ships via the safe
      `ai-apply-command` path. Issue #2 remains open as a separate
      public-launch blocker.
- [ ] **Sub-project B AI branch HOLD** — User decides to block B's
      AI branch until Issue #2 closes entirely. Choice modal "Generate
      with AI" option renders as "Coming soon" placeholder. Blank +
      Templates branches still ship.

(Mark exactly one — based on user decision after reading.)
```

- [ ] **Step 3: Commit + WAIT for user decision before B.1**

```bash
git add docs/superpowers/plans/runbook/B.0-issue-2-status.md
git commit -m "docs(brandkit): B.0 — Issue #2 status + Sub-project B scope boundary

Documents that B's AI branch uses the safe ai-apply-command Edge
Function path. Issue #2 remains a separate public-launch blocker
owned by [pending]. User decides B's AI branch GO/HOLD.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

After committing, ping the user with the doc + ask for the GO/HOLD decision. Do NOT proceed to B.1 until user marks the decision.

---

### Task B.1: Re-verify generateFromPrompt routing at task-execution time

**Files:** read-only re-verification. No code changes.

Estimated: 0.5 hours.

Dependencies: B.0 (user marked GO).

This is a defensive re-check right before code lands. B.0's investigation captured state on 2026-05-12; if B.1 runs days/weeks later, branches may have moved. Re-confirm the agent chain still routes through `ai-apply-command`.

- [ ] **Step 1: Re-verify the agent chain at execution time**

```bash
grep -n "createEdgeFunctionAgent\|ai-apply-command" src/features/editor/ai/applyCommand.ts
grep -n "useAiAgent" src/features/editor/ai/useAiAgent.ts
grep -n "applyCommand" src/features/templates/generateFromPrompt.ts
```

Expected output (must match these three patterns, otherwise STOP and ping user):
- `applyCommand.ts` contains `createEdgeFunctionAgent` AND a reference to `ai-apply-command` (function name or endpoint).
- `useAiAgent.ts` imports `createEdgeFunctionAgent` from `./applyCommand`.
- `generateFromPrompt.ts` calls `args.agent.applyCommand(...)` (NOT directly hitting any Anthropic URL or VITE_ANTHROPIC_API_KEY).

- [ ] **Step 2: Re-verify no NEW inline-key call sites were added**

```bash
grep -rln "VITE_ANTHROPIC_API_KEY" src 2>/dev/null
```

Expected: only 2 known files — `src/features/ai/v5/providers/claudeProvider.ts` and `src/features/brand-consistency/providers/anthropicProvider.ts`. If a third file appeared, escalate — someone added a new inline-key path during the time between B.0 and B.1.

- [ ] **Step 3: Append result to the B.0 doc**

Edit `docs/superpowers/plans/runbook/B.0-issue-2-status.md` and append:

```markdown
## B.1 re-verification (execution time)

Re-checked on: <date>
Agent chain intact: YES / NO
New inline-key sites since B.0: 0 / N
Decision still valid: YES / NO
```

If NO on any line, STOP and ping user.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/runbook/B.0-issue-2-status.md
git commit -m "docs(brandkit): B.1 re-verify — agent chain intact, no new inline-key sites

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.2: Create useGenerateForCard hook

**Files:**
- Create: `src/features/brandkit/ai/useGenerateForCard.ts`
- Create: `src/features/brandkit/ai/useGenerateForCard.test.ts`

Estimated: 3 hours.

Dependencies: B.1 (P1 satisfied OR P1 blocked + this task ships hook with internal stub mode).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGenerateForCard } from './useGenerateForCard';
import * as generator from '@/features/templates/generateFromPrompt';

describe('useGenerateForCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { ok: true, designId, doc } on successful generation', async () => {
    vi.spyOn(generator, 'generateFromPrompt').mockResolvedValue({
      ok: true,
      doc: { metadata: {}, layers: [] } as any,
      message: 'ok',
    });
    const { result } = renderHook(() => useGenerateForCard());
    const r = await result.current({
      brand: { id: 'b1', name: 'B', slug: 's' } as any,
      cardType: 'business-card',
      origin: 'ai-individual',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.designId).toMatch(/^[a-f0-9-]{36}$/);
      expect(r.doc).toBeDefined();
    }
  });

  it('returns { ok: false, reason: "cancelled" } on AbortController abort', async () => {
    vi.spyOn(generator, 'generateFromPrompt').mockImplementation(() =>
      Promise.resolve({ ok: false, message: 'cancelled' })
    );
    const ac = new AbortController();
    const { result } = renderHook(() => useGenerateForCard());
    ac.abort();
    const r = await result.current({
      brand: { id: 'b1', name: 'B', slug: 's' } as any,
      cardType: 'business-card',
      origin: 'ai-individual',
      abortSignal: ac.signal,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('cancelled');
  });
});
```

- [ ] **Step 2: Implement the hook**

```ts
// src/features/brandkit/ai/useGenerateForCard.ts
import { useCallback } from 'react';
import { generateFromPrompt } from '@/features/templates/generateFromPrompt';
import { useService, SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import type { Brand, CardType, BrandKitBinding } from '@/shared/types/brand';
import { useBrandStore } from '@/shared/store/brandStore';
import { telemetry } from '@/shared/telemetry';

interface GenerateArgs {
  brand: Brand;
  cardType: CardType;
  prompt?: string;
  origin: 'ai-individual' | 'ai-bulk';
  abortSignal?: AbortSignal;
}

type GenerateResult =
  | { ok: true; designId: string; doc: any }
  | { ok: false; reason: 'cancelled' | 'failed'; message?: string };

export function useGenerateForCard() {
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);

  return useCallback(
    async ({ brand, cardType, prompt, origin, abortSignal }: GenerateArgs): Promise<GenerateResult> => {
      const startedAt = Date.now();
      const cardLabel = cardType.replace(/-/g, ' ');
      const finalPrompt = prompt ?? `Generate a ${cardLabel} for ${brand.name}`;
      const promptVariant = prompt ? 'custom' : 'default';

      const result = await generateFromPrompt({
        agent: undefined as any, // injected by Edge Function per P1
        brand,
        brandKit: null,
        prompt: finalPrompt,
        contentTypeId: cardType,
      });

      if (!result.ok) {
        const reason = result.message === 'cancelled' ? 'cancelled' : 'failed';
        telemetry({
          type: 'ai_generation_failed',
          brandId: brand.id, cardType, origin, reason,
        });
        return { ok: false, reason, message: result.message };
      }

      if (abortSignal?.aborted) {
        return { ok: false, reason: 'cancelled' };
      }

      const designId = crypto.randomUUID();
      const docWithMetadata = {
        ...result.doc,
        metadata: { ...(result.doc?.metadata ?? {}), cardOriginType: cardType, cardBindingBrandId: brand.id },
      };
      await designStorage.saveDesign(brand.id, designId, docWithMetadata, { contentType: cardType });

      const prev = brand.brandKitDesigns?.[cardType];
      const binding: BrandKitBinding = {
        cardType,
        version: (prev?.version ?? 0) + 1,
        boundAt: new Date().toISOString(),
        origin,
        userEdited: false,
        designId,
      };
      await useBrandStore.getState().upsertBrandKitBinding(brand.id, binding);

      telemetry({
        type: 'ai_generated_for_card',
        brandId: brand.id, cardType, origin, promptVariant,
        durationMs: Date.now() - startedAt,
      });

      return { ok: true, designId, doc: docWithMetadata };
    },
    [designStorage]
  );
}
```

- [ ] **Step 3: Run tests — expect pass**

```bash
npx vitest run src/features/brandkit/ai/useGenerateForCard.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/features/brandkit/ai/useGenerateForCard.ts src/features/brandkit/ai/useGenerateForCard.test.ts
git commit -m "feat(brandkit): useGenerateForCard hook — AI generation + bind

Thin wrapper over generateFromPrompt. Persists generated doc via
IDesignStorage, writes ai-individual or ai-bulk origin binding,
fires ai_generated_for_card or ai_generation_failed telemetry.
Future Sub-project E reuses with origin: 'ai-bulk'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.3: Add editor metadata fields (cardOriginType + cardBindingBrandId)

**Files:**
- Modify: `src/features/editor/schema/index.ts` (extend metadata documentation; no schema change needed — already free-form)

Estimated: 0.5 hours.

Dependencies: A.3 (types).

- [ ] **Step 1: Add documentation + type-only export**

In `src/features/editor/schema/index.ts`, find the `metadata: z.record(z.string(), z.unknown()).default({})` line (around line 259). Add a JSDoc comment above it referencing the BrandKitDesignMetadataHints type:

```ts
/**
 * Free-form metadata. Brand Kit Premium reads `cardOriginType` and
 * `cardBindingBrandId` from this object (see BrandKitDesignMetadataHints
 * in src/shared/types/brand.ts). Other consumers use their own keys.
 */
metadata: z.record(z.string(), z.unknown()).default({}),
```

No runtime change. Just documentation + clarity for future agents.

- [ ] **Step 2: Commit**

```bash
git add src/features/editor/schema/index.ts
git commit -m "docs(editor): annotate BrandOSDocument.metadata for Brand Kit binding hints

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.4: Add "Open in Editor" button to template-based cards (HIGH-CONTENTION grouped task for B)

**Files:**
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` (drilldown action bar — around line 940)

Estimated: 2 hours.

Dependencies: A.6.

⚠ **HIGH-CONTENTION TASK.** All B's `BrandKitCosmosPage` edits group here. After this task, no other B task touches the file.

- [ ] **Step 1: Locate the drilldown action bar**

```bash
grep -n "Edit weight\|customize\|action.*bar\|drilldown.*header" src/features/brand-kit/BrandKitCosmosPage.tsx | head -10
```

Identify where the Customize / Download buttons live (around line 940-980).

- [ ] **Step 2: Add the Open in Editor button**

Inside the drilldown header for template-based cards (Stationery, Social, Web, Guides, Decks, Animations), add:

```tsx
{isTemplateBasedCard(cardType) && (
  <Button
    variant="outline"
    onClick={() => handleOpenInEditor(cardType)}
  >
    <Pencil className="mr-2 h-4 w-4" />
    Open in Editor
  </Button>
)}
```

Add the helper at the top of the component:

```tsx
const TEMPLATE_BASED_CARD_TYPES = new Set<CardType>([
  'business-card', 'letterhead', 'envelope', 'invoice',
  'social-profile', 'social-cover', 'social-post', 'social-story',
  'favicon', 'email-signature',
  'guide-logo', 'guide-color', 'guide-typography', 'guide-voice', 'guide-imagery',
  'pitch-deck', 'business-plan', 'proposal', 'case-studies',
  // Future-scope cards NOT in this set: website, landing-page, logo-reveal, slide-in, fade, rotate
]);

function isTemplateBasedCard(cardType: string): cardType is CardType {
  return TEMPLATE_BASED_CARD_TYPES.has(cardType as CardType);
}
```

Inside the component, define `handleOpenInEditor`:

```tsx
const handleOpenInEditor = useCallback((cardType: CardType) => {
  const binding = brand.brandKitDesigns?.[cardType];
  if (binding?.designId) {
    // Existing binding → navigate directly to the bound design
    navigate(`/b/${brand.slug}/design/${binding.designId}`);
  } else {
    // Empty card → open Choice modal (built in B.5)
    setChoiceModalCardType(cardType);
  }
}, [brand, navigate]);

const [choiceModalCardType, setChoiceModalCardType] = useState<CardType | null>(null);
```

Mount the (still-to-be-built) modal:

```tsx
{choiceModalCardType && (
  <BrandKitChoiceModal
    brand={brand}
    cardType={choiceModalCardType}
    onClose={() => setChoiceModalCardType(null)}
  />
)}
```

- [ ] **Step 3: Verify TypeScript + dev server**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/features/brand-kit/BrandKitCosmosPage.tsx
git commit -m "feat(brandkit): Open in Editor button on template-based cards (B HIGH-CONTENTION)

Grouped B edit to BrandKitCosmosPage. Adds Open in Editor button to the
drilldown action bar for template-based cards (skips Web/Animations
Future-scope cards). Empty card → BrandKitChoiceModal (built next task);
bound card → direct navigate to /b/:slug/design/:designId.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.5: Build BrandKitChoiceModal (Initial state — 3 options)

**Files:**
- Create: `src/features/brand-kit/components/BrandKitChoiceModal.tsx`
- Create: `src/features/brand-kit/components/BrandKitChoiceModal.test.tsx`

Estimated: 3 hours.

Dependencies: B.4.

- [ ] **Step 1: Write the failing test (Initial state renders 3 options)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandKitChoiceModal } from './BrandKitChoiceModal';

describe('BrandKitChoiceModal — Initial state', () => {
  it('renders 3 option buttons: Blank, AI, Browse templates', () => {
    render(
      <BrandKitChoiceModal
        brand={{ id: 'b', slug: 's', name: 'N' } as any}
        cardType="business-card"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /blank canvas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate with ai/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse templates/i })).toBeInTheDocument();
  });

  it('title interpolates the card type human label', () => {
    render(
      <BrandKitChoiceModal
        brand={{ id: 'b', slug: 's', name: 'N' } as any}
        cardType="business-card"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/business card/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement the Initial-state component**

```tsx
// src/features/brand-kit/components/BrandKitChoiceModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, Sparkles, Library } from 'lucide-react';
import type { Brand, CardType } from '@/shared/types/brand';

interface Props {
  brand: Brand;
  cardType: CardType;
  onClose: () => void;
}

type ModalState =
  | { phase: 'initial' }
  | { phase: 'generating'; startedAt: number }
  | { phase: 'slow'; startedAt: number }
  | { phase: 'failed'; message: string }
  | { phase: 'success' };

const CARD_LABELS: Record<CardType, string> = {
  'business-card': 'Business Card',
  'letterhead': 'Letterhead',
  'envelope': 'Envelope',
  'invoice': 'Invoice',
  'social-profile': 'Profile Picture',
  'social-cover': 'Cover Banner',
  'social-post': 'Social Post',
  'social-story': 'Story',
  'favicon': 'Favicon',
  'website': 'Website',
  'email-signature': 'Email Signature',
  'landing-page': 'Landing Page',
  'guide-logo': 'Logo Guide',
  'guide-color': 'Color Guide',
  'guide-typography': 'Typography Guide',
  'guide-voice': 'Voice Guide',
  'guide-imagery': 'Imagery Guide',
  'pitch-deck': 'Pitch Deck',
  'business-plan': 'Business Plan',
  'proposal': 'Proposal',
  'case-studies': 'Case Studies',
  'logo-reveal': 'Logo Reveal',
  'slide-in': 'Slide In',
  'fade': 'Fade',
  'rotate': 'Rotate',
};

function cardLabel(t: CardType): string {
  return CARD_LABELS[t] ?? t.replace(/-/g, ' ');
}

export function BrandKitChoiceModal({ brand, cardType, onClose }: Props) {
  const [state, setState] = useState<ModalState>({ phase: 'initial' });
  const navigate = useNavigate();

  const handleBlank = async () => {
    // Implemented in B.7 — for now, just navigate to blank
    navigate(`/b/${brand.slug}/design/new?cardType=${cardType}`);
    onClose();
  };

  const handleAi = async () => {
    // Implemented in B.6 (loading + cancel states)
    setState({ phase: 'generating', startedAt: Date.now() });
  };

  const handleBrowse = () => {
    // C wires this. For B, just navigate.
    navigate(`/b/${brand.slug}/templates?category=${cardType}&returnTo=brand-kit/${cardType}`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open {cardLabel(cardType)} editor</DialogTitle>
        </DialogHeader>
        {state.phase === 'initial' && (
          <div className="grid grid-cols-3 gap-3 py-4">
            <Button variant="outline" className="h-24 flex-col" onClick={handleBlank}>
              <FileText className="mb-2 h-6 w-6" />
              Blank canvas
            </Button>
            <Button variant="outline" className="h-24 flex-col" onClick={handleAi}>
              <Sparkles className="mb-2 h-6 w-6" />
              Generate with AI
            </Button>
            <Button variant="outline" className="h-24 flex-col" onClick={handleBrowse}>
              <Library className="mb-2 h-6 w-6" />
              Browse templates
            </Button>
          </div>
        )}
        {/* Generating/Slow/Failed/Success states added in B.6 */}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Run test — expect pass**

- [ ] **Step 4: Commit**

```bash
git add src/features/brand-kit/components/BrandKitChoiceModal.tsx src/features/brand-kit/components/BrandKitChoiceModal.test.tsx
git commit -m "feat(brandkit): BrandKitChoiceModal (Initial state — 3 options)

Three-option Choice modal for empty cards. Blank → editor with cardType
query param. AI → enters Generating state (wired next task). Browse →
templates page filtered by category + returnTo param.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.6: Add Generating + Slow + Failed + Success states to Choice modal

**Files:**
- Modify: `src/features/brand-kit/components/BrandKitChoiceModal.tsx`
- Modify: `src/features/brand-kit/components/BrandKitChoiceModal.test.tsx`

Estimated: 3.5 hours.

Dependencies: B.2 (hook), B.5 (Initial state).

- [ ] **Step 1: Write failing tests for the new states**

```tsx
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

it('clicking Generate with AI transitions to Generating state', async () => {
  // Mock useGenerateForCard to never resolve so we can observe Generating
  vi.mock('@/features/brandkit/ai/useGenerateForCard', () => ({
    useGenerateForCard: () => () => new Promise(() => {}), // never resolves
  }));
  const onClose = vi.fn();
  render(<BrandKitChoiceModal brand={{ id: 'b', slug: 's', name: 'N' } as any} cardType="business-card" onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: /generate with ai/i }));
  await waitFor(() => screen.getByText(/generating/i));
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
});

it('Cancel button aborts and returns to Initial state', async () => {
  let abortReceived = false;
  vi.mock('@/features/brandkit/ai/useGenerateForCard', () => ({
    useGenerateForCard: () => async ({ abortSignal }: any) => {
      abortSignal?.addEventListener('abort', () => { abortReceived = true; });
      return new Promise(() => {});
    },
  }));
  render(<BrandKitChoiceModal brand={{ id: 'b', slug: 's', name: 'N' } as any} cardType="business-card" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /generate with ai/i }));
  await waitFor(() => screen.getByRole('button', { name: /cancel/i }));
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
  await waitFor(() => screen.getByRole('button', { name: /blank canvas/i }));
  expect(abortReceived).toBe(true);
});

it('Failed state shows Retry button on generation failure', async () => {
  vi.mock('@/features/brandkit/ai/useGenerateForCard', () => ({
    useGenerateForCard: () => async () => ({ ok: false, reason: 'failed', message: 'API error' }),
  }));
  render(<BrandKitChoiceModal brand={{ id: 'b', slug: 's', name: 'N' } as any} cardType="business-card" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /generate with ai/i }));
  await waitFor(() => screen.getByText(/couldn.t generate/i));
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement the state machine**

Extend the component from B.5:

```tsx
import { useGenerateForCard } from '@/features/brandkit/ai/useGenerateForCard';
import { useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';

// inside BrandKitChoiceModal:
const generate = useGenerateForCard();
const abortRef = useRef<AbortController | null>(null);

const handleAi = async () => {
  const ac = new AbortController();
  abortRef.current = ac;
  setState({ phase: 'generating', startedAt: Date.now() });

  const r = await generate({
    brand,
    cardType,
    origin: 'ai-individual',
    abortSignal: ac.signal,
  });

  if (r.ok) {
    setState({ phase: 'success' });
    navigate(`/b/${brand.slug}/design/${r.designId}`);
    onClose();
  } else if (r.reason === 'cancelled') {
    setState({ phase: 'initial' });
  } else {
    setState({ phase: 'failed', message: r.message ?? 'Unknown error' });
  }
};

const handleCancel = () => {
  abortRef.current?.abort();
};

// 60s slow watcher
useEffect(() => {
  if (state.phase !== 'generating') return;
  const t = setTimeout(() => {
    if (state.phase === 'generating') {
      setState({ phase: 'slow', startedAt: state.startedAt });
    }
  }, 60_000);
  return () => clearTimeout(t);
}, [state]);

// In render:
{(state.phase === 'generating' || state.phase === 'slow') && (
  <div className="py-6 text-center">
    <h3 className="font-medium">Generating your {cardLabel(cardType)}…</h3>
    <p className="text-sm text-muted-foreground mt-1">
      {state.phase === 'slow'
        ? 'Taking longer than usual — keep waiting or cancel and try again.'
        : 'This usually takes 10–30 seconds.'}
    </p>
    <Progress className="mt-4" value={undefined /* indeterminate */} />
    <Button variant={state.phase === 'slow' ? 'default' : 'ghost'} className="mt-4" onClick={handleCancel}>
      Cancel
    </Button>
  </div>
)}
{state.phase === 'failed' && (
  <div className="py-6 text-center">
    <h3 className="font-medium text-destructive">Couldn't generate your {cardLabel(cardType)}</h3>
    <p className="text-sm text-muted-foreground mt-1">{state.message}</p>
    <div className="mt-4 flex justify-center gap-2">
      <Button variant="outline" onClick={() => setState({ phase: 'initial' })}>Cancel</Button>
      <Button onClick={handleAi}>Retry</Button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Run tests — expect pass**

- [ ] **Step 4: Commit**

```bash
git add src/features/brand-kit/components/BrandKitChoiceModal.tsx src/features/brand-kit/components/BrandKitChoiceModal.test.tsx
git commit -m "feat(brandkit): Choice modal generating/slow/failed/success states + cancel

Wires useGenerateForCard, AbortController, 60s slow-state timeout,
indeterminate progress, Retry on failure. Modal never closes until
success or explicit user cancel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.7: Wire save-back binding write on editor save (HIGH-CONTENTION: brandStore touched)

**Files:**
- Modify: editor autosave hook (find via `grep -rn "useAutoSave" src/features/editor/core`)
- Modify: `src/shared/store/brandStore.ts` (if a new helper needed; otherwise calls existing A.5 helper)

Estimated: 3 hours.

Dependencies: A.5, B.3.

- [ ] **Step 1: Locate the editor autosave hook**

```bash
grep -rn "useAutoSave\|export.*autoSave" src/features/editor/core | head -5
```

- [ ] **Step 2: Extend onSave logic to write the binding**

Inside the autosave hook (or wherever `saveDesign` is called after a user edit), add:

```tsx
import { useBrandStore } from '@/shared/store/brandStore';
import type { BrandKitBinding, BrandKitDesignMetadataHints } from '@/shared/types/brand';

// after successful saveDesign:
const hints = doc.metadata as BrandKitDesignMetadataHints;
if (hints.cardOriginType && hints.cardBindingBrandId) {
  const brand = useBrandStore.getState().getById(hints.cardBindingBrandId);
  if (!brand) return;

  const existing = brand.brandKitDesigns?.[hints.cardOriginType];

  // Overwrite warning if existing binding points to a DIFFERENT designId
  if (existing?.designId && existing.designId !== designId) {
    const confirmed = await confirmOverwriteDialog(hints.cardOriginType);
    if (!confirmed) return; // Save as new — skip binding write
  }

  const binding: BrandKitBinding = {
    cardType: hints.cardOriginType,
    version: (existing?.version ?? 0) + 1,
    boundAt: new Date().toISOString(),
    origin: existing?.origin === 'customize' ? 'editor' : (existing?.origin ?? 'editor'),
    userEdited: true,
    designId,
  };
  await useBrandStore.getState().upsertBrandKitBinding(brand.id, binding);
}
```

`confirmOverwriteDialog` is a small helper that returns a Promise<boolean> for the warning dialog (built next task).

- [ ] **Step 3: Verify TypeScript + tests**

```bash
npm run typecheck && npx vitest run src/features/editor/core
```

- [ ] **Step 4: Commit**

```bash
git add <autosave file path>
git commit -m "feat(brandkit): editor autosave wires binding write on save

When saved doc has metadata.cardOriginType + cardBindingBrandId, save
also upserts brand.brandKitDesigns[cardOriginType]. userEdited flips
to true on every editor save (forward-compat for Sub-project E
Auto-fill skip logic).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.8: Implement overwrite warning dialog

**Files:**
- Create: `src/features/brandkit/dialogs/confirmOverwriteDialog.tsx`
- Create: `src/features/brandkit/dialogs/confirmOverwriteDialog.test.tsx`

Estimated: 2 hours.

Dependencies: B.7.

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { confirmOverwriteDialog } from './confirmOverwriteDialog';

describe('confirmOverwriteDialog', () => {
  it('resolves true when user clicks "Continue"', async () => {
    const promise = confirmOverwriteDialog('business-card');
    await waitFor(() => screen.getByText(/replace your current/i));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await promise).toBe(true);
  });

  it('resolves false when user clicks "Save as new"', async () => {
    const promise = confirmOverwriteDialog('business-card');
    await waitFor(() => screen.getByRole('button', { name: /save as new/i }));
    fireEvent.click(screen.getByRole('button', { name: /save as new/i }));
    expect(await promise).toBe(false);
  });
});
```

- [ ] **Step 2: Implement using a portal-based imperative dialog**

```tsx
// src/features/brandkit/dialogs/confirmOverwriteDialog.tsx
import { createRoot } from 'react-dom/client';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CardType } from '@/shared/types/brand';

export function confirmOverwriteDialog(cardType: CardType): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = (result: boolean) => {
      root.unmount();
      container.remove();
      resolve(result);
    };

    root.render(
      <Dialog open onOpenChange={(open) => !open && cleanup(false)}>
        <DialogContent>
          <DialogTitle>Replace existing {cardType.replace(/-/g, ' ')}?</DialogTitle>
          <DialogDescription>
            This will replace your current {cardType.replace(/-/g, ' ')} design in Brand Kit.
            The current version stays available in My Designs.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => cleanup(false)}>Save as new</Button>
            <Button onClick={() => cleanup(true)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  });
}
```

- [ ] **Step 3: Run test + commit**

```bash
npx vitest run src/features/brandkit/dialogs/confirmOverwriteDialog.test.tsx
git add src/features/brandkit/dialogs/confirmOverwriteDialog.tsx src/features/brandkit/dialogs/confirmOverwriteDialog.test.tsx
git commit -m "feat(brandkit): confirmOverwriteDialog imperative API

Promise<boolean> returning helper for the 'replace your current X in
Brand Kit' warning. Continue → resolves true (binding writes); Save as
new → resolves false (binding skipped, design still saved standalone).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.9: Telemetry for B — already wired in B.2, verify

**Files:** verification only.

Estimated: 0.5 hours.

- [ ] **Step 1: Grep for telemetry calls**

```bash
grep -n "telemetry(" src/features/brandkit/ai/useGenerateForCard.ts src/features/brand-kit/components/BrandKitChoiceModal.tsx
```

Expected: `ai_generated_for_card` + `ai_generation_failed` in `useGenerateForCard`. Verify the `card_bound` event fires too when binding writes — that should come through `upsertBrandKitBinding`'s call site OR an explicit telemetry call inside the hook.

- [ ] **Step 2: If `card_bound` is missing, add it to `upsertBrandKitBinding`**

In `src/shared/store/brandStore.ts`, the `upsertBrandKitBinding` action: add a telemetry call inside:

```ts
telemetry({
  type: 'card_bound',
  brandId, cardType: binding.cardType, origin: binding.origin,
  isInitialBind: !current.brandKitDesigns?.[binding.cardType],
  version: binding.version,
});
```

- [ ] **Step 3: Commit if changes**

```bash
git add src/shared/store/brandStore.ts
git commit -m "feat(telemetry): card_bound fires from upsertBrandKitBinding

Single source of truth for binding telemetry — every binding write,
regardless of origin (customize/editor/template/ai-*), fires the event.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.10: Unit tests for B logic (save-back + overwrite resolution)

**Files:**
- Create: `src/features/editor/core/binding-save-back.test.ts` (or co-locate with the autosave hook)

Estimated: 2 hours.

Dependencies: B.7, B.8.

- [ ] **Step 1: Write unit tests for the save-back logic**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBrandStore } from '@/shared/store/brandStore';
import * as overwriteModule from '@/features/brandkit/dialogs/confirmOverwriteDialog';

describe('save-back binding logic', () => {
  beforeEach(() => {
    useBrandStore.getState().clearAll?.();
  });

  it('writes new binding when doc has no prior binding for the card', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'B', slug: 'b-sb-1' });
    // simulate editor save calling upsertBrandKitBinding
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'business-card', version: 1, boundAt: 't',
      origin: 'editor', userEdited: true, designId: 'd-1',
    });
    expect(store.getById(brand.id)?.brandKitDesigns?.['business-card']?.designId).toBe('d-1');
  });

  it('bumps version when same designId saves again', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'B', slug: 'b-sb-2' });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'business-card', version: 1, boundAt: 't1',
      origin: 'editor', userEdited: true, designId: 'd-1',
    });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'business-card', version: 2, boundAt: 't2',
      origin: 'editor', userEdited: true, designId: 'd-1',
    });
    expect(store.getById(brand.id)?.brandKitDesigns?.['business-card']?.version).toBe(2);
  });

  it('userEdited stays true once flipped', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'B', slug: 'b-sb-3' });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'business-card', version: 1, boundAt: 't1',
      origin: 'editor', userEdited: true, designId: 'd-1',
    });
    expect(store.getById(brand.id)?.brandKitDesigns?.['business-card']?.userEdited).toBe(true);
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npx vitest run src/features/editor/core/binding-save-back.test.ts
git add src/features/editor/core/binding-save-back.test.ts
git commit -m "test(brandkit): unit tests for editor save-back binding logic

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.11: Adapter integration test — full Choice modal flow

**Files:**
- Create: `src/features/brand-kit/components/BrandKitChoiceModal.integration.test.tsx`

Estimated: 2.5 hours.

Dependencies: B.6.

- [ ] **Step 1: Write integration tests for each branch**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrandKitChoiceModal } from './BrandKitChoiceModal';
import { useBrandStore } from '@/shared/store/brandStore';
import { MemoryRouter } from 'react-router-dom';

vi.mock('fabric', () => ({ Canvas: vi.fn(), Object: vi.fn() }));

describe('BrandKitChoiceModal — integration', () => {
  beforeEach(() => useBrandStore.getState().clearAll?.());

  it('Blank branch navigates to /b/:slug/design/new', async () => {
    // ... (concrete test using window.location or react-router test utils)
  });

  it('AI branch (mocked) writes binding + navigates to /b/:slug/design/:designId', async () => {
    vi.mock('@/features/brandkit/ai/useGenerateForCard', () => ({
      useGenerateForCard: () => async () => ({ ok: true, designId: 'd-ai-1', doc: { metadata: {}, layers: [] } }),
    }));
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'B', slug: 'b-ai-1' });
    render(
      <MemoryRouter>
        <BrandKitChoiceModal brand={brand} cardType="business-card" onClose={vi.fn()} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /generate with ai/i }));
    await waitFor(() => {
      const updated = store.getById(brand.id);
      expect(updated?.brandKitDesigns?.['business-card']?.origin).toBe('ai-individual');
    });
  });

  it('Browse branch navigates to templates with category + returnTo', async () => {
    // ... assert MemoryRouter location pushed
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npx vitest run src/features/brand-kit/components/BrandKitChoiceModal.integration.test.tsx
git add src/features/brand-kit/components/BrandKitChoiceModal.integration.test.tsx
git commit -m "test(brandkit): integration — Choice modal 3 branches end-to-end

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.12: Browser E2E — Open in Editor full flows

**Files:**
- Create: `src/features/brand-kit/B-editor-handoff.browser.test.tsx`

Estimated: 4 hours.

Dependencies: B.6, B.7.

- [ ] **Step 1: Write E2E tests covering 3 scenarios**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BrandKitCosmosPage } from './BrandKitCosmosPage';
import { useBrandStore } from '@/shared/store/brandStore';

describe('B — Editor handoff (browser E2E)', () => {
  beforeEach(() => useBrandStore.getState().clearAll?.());

  it('Empty card → Blank → blank canvas opens', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'E', slug: 'e-b-1' });
    render(
      <MemoryRouter initialEntries={[`/b/${brand.slug}/brand-kit`]}>
        <BrandKitCosmosPage brand={brand} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(/business card/i));
    await waitFor(() => screen.getByRole('button', { name: /open in editor/i }));
    fireEvent.click(screen.getByRole('button', { name: /open in editor/i }));
    await waitFor(() => screen.getByRole('button', { name: /blank canvas/i }));
    fireEvent.click(screen.getByRole('button', { name: /blank canvas/i }));
    // Navigation assertions via memory router state...
  });

  it('Bound card → Open in Editor → directly opens bound design (no modal)', async () => {
    const store = useBrandStore.getState();
    const brand = await store.create({ name: 'E', slug: 'e-b-2' });
    await store.upsertBrandKitBinding(brand.id, {
      cardType: 'business-card', version: 1, boundAt: 't',
      origin: 'editor', userEdited: true, designId: 'd-existing',
    });
    render(
      <MemoryRouter initialEntries={[`/b/${brand.slug}/brand-kit`]}>
        <BrandKitCosmosPage brand={brand} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(/business card/i));
    await waitFor(() => screen.getByRole('button', { name: /open in editor/i }));
    fireEvent.click(screen.getByRole('button', { name: /open in editor/i }));
    // Choice modal should NOT appear
    expect(screen.queryByRole('button', { name: /blank canvas/i })).toBeNull();
  });

  it('Existing binding → edit → save → version bumps', async () => {
    // Setup binding v=1, simulate editor save through autosave hook, assert v=2
  });
});
```

- [ ] **Step 2: Run browser tests + commit**

```bash
npx vitest run --project browser src/features/brand-kit/B-editor-handoff.browser.test.tsx
git add src/features/brand-kit/B-editor-handoff.browser.test.tsx
git commit -m "test(brandkit): browser E2E — B editor handoff (3 scenarios)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task B.13: Document rollback path for Sub-project B

**Files:**
- Create: `docs/superpowers/plans/runbook/B-rollback.md`

Estimated: 0.5 hours.

- [ ] **Step 1: Write rollback doc**

Following the template from A.11, document:
- Symptoms: editor save crashes; binding writes broken; Choice modal renders blank
- Rollback order: B.7 (autosave wiring) → B.6 (states) → B.5 (modal) → B.4 (button)
- Schema rollback: NOT needed for B (schema landed in A)
- Re-shipping checklist

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/runbook/B-rollback.md
git commit -m "docs(brandkit): rollback runbook for Sub-project B

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Checkpoint B — manual review before C ∥ D start

**🛑 STOP. After B closes, C and D launch in parallel.**

Verify before unblocking:

- [ ] All 13 B tasks committed and pushed.
- [ ] `npm run typecheck && npm run lint && npm run test` all green.
- [ ] Manual smoke test (3 paths): Empty card → Blank → editor opens. Empty card → AI (if P1 satisfied) → generates → binds. Bound card → edit → save → binding version bumps.
- [ ] B's E2E test passes (`B-editor-handoff.browser.test.tsx`).
- [ ] P1 check log (`B.1-p1-check.md`) decision documented.
- [ ] Rollback runbook reviewed (`B-rollback.md`).

**If all checks pass:** ping the user "Checkpoint B green — kick off C and D in parallel?" and wait for explicit go-ahead. C and D run as separate subagent pipelines from this point.

---

# Sub-project C — Templates integration (parallel with D)

**Goal:** Wire the existing Templates page (`/b/:slug/templates`) as the "Browse Other" destination from any Brand Kit template card. Add `?category=X` + `?returnTo=X` URL filters. Add "Use as my [card type]" action that auto-binds the picked template back to Brand Kit.

**Touches:** `TemplatesPanel.tsx` · `categories.ts` (seeds) · template metadata (subType field) · `BrandKitCosmosPage.tsx` (grouped task for "Browse other" button).

**Estimated total:** ~22 hours across 13 tasks.

---

### Task C.1: Add `subType` field to template metadata schema

**Files:**
- Modify: Template seed shape definition (find via `grep -rn "interface.*Template\|type.*Template" src/features/templates/seeds`)

Estimated: 1 hour.

- [ ] **Step 1: Locate template type definition**

```bash
grep -rn "interface Template\|type Template " src/features/templates | head
```

- [ ] **Step 2: Add `subType?: string` field**

In the template type, add:
```ts
export interface TemplateSeed {
  // existing fields
  subType?: string; // distinguishes Pitch Deck / Business Plan / Proposal / Case Studies within 'presentation' category
}
```

- [ ] **Step 3: Verify TypeScript + commit**

```bash
npm run typecheck
git add <type file>
git commit -m "feat(templates): add optional subType field for category sub-filtering

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.2: Backfill subType for existing presentation + brand-guideline templates

**Files:**
- Modify: existing seed template files in `src/features/templates/seeds/`

Estimated: 1 hour.

- [ ] **Step 1: Audit existing presentation + brand-guideline templates**

```bash
grep -rln "contentTypeId.*presentation\|contentTypeId.*brand-guideline" src/features/templates/seeds
```

- [ ] **Step 2: Assign subType to each based on the template's intent**

For each `presentation` template, assign one of: `pitch-deck`, `business-plan`, `proposal`, `case-studies`. For each `brand-guideline-slide`, assign: `logo`, `color`, `typography`, `voice`, `imagery`. Templates without an obvious subType remain unfiltered (no `subType` property).

- [ ] **Step 3: Commit**

```bash
git add src/features/templates/seeds/
git commit -m "feat(templates): backfill subType for presentation + brand-guideline seeds

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.3: Add 4 new categories (envelopes / profiles / covers / stories)

**Files:**
- Modify: `src/features/templates/seeds/categories.ts`

Estimated: 0.5 hours.

- [ ] **Step 1: Append the 4 categories**

```ts
// in categories.ts, append:
{ id: 'cat-envelopes',       contentTypeId: 'envelope',       name: 'Envelopes', /* ... existing fields */ },
{ id: 'cat-social-profiles', contentTypeId: 'social-profile', name: 'Profile pictures', /* ... */ },
{ id: 'cat-social-covers',   contentTypeId: 'social-cover',   name: 'Cover banners', /* canonical: LinkedIn 1584×396 */ },
{ id: 'cat-social-stories',  contentTypeId: 'social-story',   name: 'Stories', /* 1080×1920 */ },
```

Match the existing 11 categories' field shape exactly. Include any required `icon`, `description`, `displayOrder` fields.

- [ ] **Step 2: Commit**

```bash
git add src/features/templates/seeds/categories.ts
git commit -m "feat(templates): add 4 new categories for Brand Kit Polish cards

envelopes, social-profiles (1080x1080), social-covers (1584x396 LinkedIn),
social-stories (1080x1920). Required by Sub-project C's Browse Other flow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.4: Seed templates for each new category (8 total — 2 per category)

**Files:**
- Create: `src/features/templates/seeds/templates/envelopes/` (2 files)
- Create: `src/features/templates/seeds/templates/social-profiles/` (2 files)
- Create: `src/features/templates/seeds/templates/social-covers/` (2 files)
- Create: `src/features/templates/seeds/templates/social-stories/` (2 files)

Estimated: 3 hours.

- [ ] **Step 1: For each category, create 2 minimal seed templates**

Example for envelopes:
```ts
// src/features/templates/seeds/templates/envelopes/envelope-classic.ts
import type { TemplateSeed } from '@/features/templates/seeds/types';

export const envelopeClassic: TemplateSeed = {
  id: 'tpl-envelope-classic',
  name: 'Classic envelope',
  categoryId: 'cat-envelopes',
  contentTypeId: 'envelope',
  width: 612, height: 297, // DL envelope size
  // Apply brand colors + logo placement via slot refs
  doc: {
    metadata: { contentType: 'envelope' },
    layers: [/* minimal brand-bound layers */],
  },
};
```

Repeat 7 more times across the 4 new categories.

- [ ] **Step 2: Wire seeds into the registry**

```bash
grep -n "registerTemplate\|allTemplates" src/features/templates/seeds/index.ts
```
Add the 8 new templates to the registry export.

- [ ] **Step 3: Commit**

```bash
git add src/features/templates/seeds/templates/envelopes src/features/templates/seeds/templates/social-profiles src/features/templates/seeds/templates/social-covers src/features/templates/seeds/templates/social-stories src/features/templates/seeds/index.ts
git commit -m "feat(templates): 8 seed templates for new Brand Kit Polish categories

Two each for envelopes, social-profiles, social-covers, social-stories.
Templates are brand-bound (slot refs) and immediately usable via
'Use as my X' from Brand Kit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.5: Wire `?category=X` URL filter in TemplatesPanel

**Files:**
- Modify: `src/features/editor/shell/v2/panels/TemplatesPanel.tsx` (around line 115 — activeCategoryId state)

Estimated: 1.5 hours.

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TemplatesPanel } from './TemplatesPanel';

it('initializes activeCategoryId from ?category= URL param', () => {
  render(
    <MemoryRouter initialEntries={['/b/test/templates?category=business-card']}>
      <TemplatesPanel mode="browser" />
    </MemoryRouter>
  );
  // Assert business-card category chip is active (e.g. has data-active attribute)
  expect(screen.getByRole('button', { name: /business card/i })).toHaveAttribute('data-active', 'true');
});
```

- [ ] **Step 2: Implement**

In `TemplatesPanel.tsx`, replace the existing `activeCategoryId` useState:

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const [activeCategoryId, setActiveCategoryIdInternal] = useState<string | null>(
  searchParams.get('category') ?? null
);

const setActiveCategoryId = useCallback((id: string | null) => {
  setActiveCategoryIdInternal(id);
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (id) next.set('category', id);
    else next.delete('category');
    return next;
  }, { replace: true });
}, [setSearchParams]);

// Also sync FROM URL changes:
useEffect(() => {
  const fromUrl = searchParams.get('category');
  if (fromUrl !== activeCategoryId) setActiveCategoryIdInternal(fromUrl ?? null);
}, [searchParams]);
```

- [ ] **Step 3: Run test + commit**

```bash
npx vitest run src/features/editor/shell/v2/panels/TemplatesPanel.test.tsx
git add src/features/editor/shell/v2/panels/TemplatesPanel.tsx
git commit -m "feat(templates): wire ?category= URL filter bidirectionally

Reads on mount, writes on chip click. Enables Brand Kit's Browse Other
deep link to land filtered.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.6: Wire `?returnTo=` URL handling in TemplatesPanel

**Files:**
- Modify: `src/features/editor/shell/v2/panels/TemplatesPanel.tsx`

Estimated: 1 hour.

- [ ] **Step 1: Read returnTo + expose to template card action**

```tsx
const returnTo = searchParams.get('returnTo');

// Pass returnTo to the template card component so it knows to show
// "Use as my X" action AND where to navigate after.
```

- [ ] **Step 2: Commit**

```bash
git add src/features/editor/shell/v2/panels/TemplatesPanel.tsx
git commit -m "feat(templates): expose ?returnTo= to template card actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.7: Add "Use as my [card type]" action on template cards

**Files:**
- Modify: template card component (likely under `TemplatesPanel` — find via grep)
- Create: `src/features/templates/useAsMyCard.ts` (the apply-and-bind helper)
- Test: `src/features/templates/useAsMyCard.test.ts`

Estimated: 3 hours.

- [ ] **Step 1: Write the helper test**

```ts
describe('useAsMyCard', () => {
  it('applies brand to template, saves design, writes binding, navigates to returnTo', async () => {
    // setup, exercise, assert binding present + designId in store
  });
});
```

- [ ] **Step 2: Implement `useAsMyCard`**

```ts
// src/features/templates/useAsMyCard.ts
import { applyBrandToDocument } from '@/features/templates/applyBrand'; // existing helper
import { useService, SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand, CardType, BrandKitBinding } from '@/shared/types/brand';
import type { TemplateSeed } from '@/features/templates/seeds/types';
import { useNavigate } from 'react-router-dom';
import { telemetry } from '@/shared/telemetry';

export function useUseAsMyCard() {
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const navigate = useNavigate();

  return async (template: TemplateSeed, brand: Brand, cardType: CardType, returnTo?: string) => {
    const doc = applyBrandToDocument(template.doc, brand);
    const designId = crypto.randomUUID();
    await designStorage.saveDesign(brand.id, designId, doc, { contentType: cardType });

    const prev = brand.brandKitDesigns?.[cardType];
    const binding: BrandKitBinding = {
      cardType,
      version: (prev?.version ?? 0) + 1,
      boundAt: new Date().toISOString(),
      origin: 'template',
      userEdited: false,
      designId,
    };
    await useBrandStore.getState().upsertBrandKitBinding(brand.id, binding);

    telemetry({
      type: 'card_template_applied',
      brandId: brand.id, cardType, templateId: template.id, templateCategory: template.categoryId,
    });

    if (returnTo) {
      navigate(`/b/${brand.slug}/${returnTo}`);
    } else {
      navigate(`/b/${brand.slug}/design/${designId}`);
    }
  };
}
```

- [ ] **Step 3: Add the "Use as my X" button to template cards**

In the template card component (inside TemplatesPanel), conditionally render:
```tsx
{returnTo?.startsWith('brand-kit/') && (
  <Button onClick={() => useAsMyCard(template, brand, cardType, returnTo)}>
    Use as my {cardLabel(cardType)}
  </Button>
)}
```

- [ ] **Step 4: Run tests + commit**

```bash
npx vitest run src/features/templates/useAsMyCard.test.ts
git add src/features/templates/useAsMyCard.ts src/features/templates/useAsMyCard.test.ts src/features/editor/shell/v2/panels/
git commit -m "feat(templates): 'Use as my X' action + useAsMyCard helper

When user is in templates page from Brand Kit (returnTo=brand-kit/X),
each template card shows a Use as my [card type] button. Click applies
brand + saves design + writes template-origin binding + fires
card_template_applied telemetry + navigates back to Brand Kit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.8: Add "Browse other" button on Brand Kit template cards (HIGH-CONTENTION grouped task for C)

**Files:**
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` (drilldown action bar — add Browse Other button)

Estimated: 1.5 hours.

⚠ **HIGH-CONTENTION TASK.** Single grouped C edit to `BrandKitCosmosPage`.

- [ ] **Step 1: Add Browse Other button**

In the drilldown action bar (alongside Customize / Open in Editor / Download), add:

```tsx
{isTemplateBasedCard(cardType) && (
  <Button
    variant="outline"
    onClick={() => navigate(`/b/${brand.slug}/templates?category=${cardType}&returnTo=brand-kit/${cardType}`)}
  >
    <Library className="mr-2 h-4 w-4" />
    Browse other {cardLabel(cardType).toLowerCase()}
  </Button>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/brand-kit/BrandKitCosmosPage.tsx
git commit -m "feat(brandkit): Browse other button on template-based cards (C HIGH-CONTENTION)

Navigates to /b/:slug/templates?category=X&returnTo=brand-kit/X. Sub-project
C's grouped BrandKitCosmosPage edit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task C.9: Telemetry for C — already wired in C.7, verify

Estimated: 0.25 hours.

- [ ] **Step 1: Verify card_template_applied fires from useAsMyCard**

```bash
grep -n "card_template_applied" src/features/templates/useAsMyCard.ts
```

No code change needed if already wired. Skip the commit if so.

---

### Task C.10: Unit tests for C — subType filter + URL sync

**Files:**
- Create: `src/features/editor/shell/v2/panels/TemplatesPanel.urlsync.test.ts`

Estimated: 1.5 hours.

- [ ] **Step 1: Write tests**

Cover: URL param → state sync; chip click → URL update; subType filter narrows the result list.

- [ ] **Step 2: Run + commit**

---

### Task C.11: Adapter integration test — Use as my X writes binding

**Files:**
- Create: `src/features/templates/useAsMyCard.integration.test.tsx`

Estimated: 2 hours.

- [ ] **Step 1: Write integration test**

Mount a template card with returnTo=brand-kit/business-card, click Use as my X, assert binding written with `origin: 'template'`.

- [ ] **Step 2: Run + commit**

---

### Task C.12: Browser E2E — Browse Other → pick → return loop

**Files:**
- Create: `src/features/brand-kit/C-browse-other.browser.test.tsx`

Estimated: 3 hours.

- [ ] **Step 1: Write E2E**

From Brand Kit business-card drilldown → click Browse Other → land in templates filtered by business-card → click Use as my Business Card on a template → return to Brand Kit → assert the picked template is now bound.

- [ ] **Step 2: Run + commit**

---

### Task C.13: Document rollback path for Sub-project C

**Files:**
- Create: `docs/superpowers/plans/runbook/C-rollback.md`

Estimated: 0.5 hours.

- [ ] **Step 1: Write rollback doc**

Symptoms: Templates page crashes on `?category=`; Use as my X button missing; binding not written after pick. Rollback order: C.8 (button) → C.7 (action) → C.6 (returnTo) → C.5 (category URL).

- [ ] **Step 2: Commit**

---

### Checkpoint C — manual review

**🛑 STOP.** Verify:
- [ ] All 13 C tasks committed and pushed.
- [ ] `npm run typecheck && npm run lint && npm run test` all green.
- [ ] Manual smoke: from Brand Kit business-card drilldown, Browse Other → pick template → returns to Brand Kit with the picked template bound.
- [ ] C's browser E2E green.
- [ ] Rollback runbook present.

Ping the user "Checkpoint C green" and wait.

---

# Sub-project D — Premium polish + Export (parallel with C)

**Goal:** Ship the export deliverable — PDF Brand Guide + ZIP bulk export via Web Worker, frozen snapshot table, Export button in PageHeader with 3-state machine + brand-completeness gate, MVP card content build (Photos, About, Email Signature, Favicon), Future-scope placeholders.

**Touches:** D5 promotion (alt-fork imports updated) · `exportWorker.ts` (new) · `isBrandReadyForExport.ts` (new) · `useOnlineStatus.ts` (new or verify) · `BrandKitCosmosPage.tsx` (grouped task) · `brand_kit_exports` table writes.

**Estimated total:** ~46 hours across 20 tasks.

---

### Task D.1: D5 promotion atomic commit (PDF + ZIP move to canonical)

**Files:**
- Create: `src/features/brandkit/export/brandGuidePdf.ts` (moved content of alt's brandGuidePdf.ts)
- Create: `src/features/brandkit/export/bulkExport.ts` (moved content)
- Create: `src/features/brandkit/export/brandGuidePdf.test.ts` (moved if test existed)
- Modify: `src/features/brand-kit-alt/brandGuidePdf.ts` (REPLACE with `export { ... } from '@/features/brandkit/export/brandGuidePdf';` — ≤3 line diff)
- Modify: `src/features/brand-kit-alt/bulkExport.ts` (REPLACE with re-export shim if other code still imports it; otherwise update its single internal import line)
- Modify: `src/features/brand-kit-alt/BrandKitPage.tsx` (line 46 — change import to canonical path)
- Delete: old test files in `brand-kit-alt/` (move, not duplicate)

Estimated: 3 hours.

⚠ **SINGLE ATOMIC COMMIT.** All file moves + import updates + test moves land in ONE commit. Do NOT split.

- [ ] **Step 1: Audit external importers of alt's helpers**

```bash
grep -rln "from.*brand-kit-alt/brandGuidePdf\|from.*brand-kit-alt/bulkExport" src
```

If only internal `brand-kit-alt/` files import them, no shim needed. If external code imports too, add shim.

- [ ] **Step 2: Copy files to canonical location (do not commit yet)**

```bash
mkdir -p src/features/brandkit/export
cp src/features/brand-kit-alt/brandGuidePdf.ts src/features/brandkit/export/
cp src/features/brand-kit-alt/bulkExport.ts src/features/brandkit/export/
# move tests if present
[ -f src/features/brand-kit-alt/brandGuidePdf.test.ts ] && \
  mv src/features/brand-kit-alt/brandGuidePdf.test.ts src/features/brandkit/export/
```

- [ ] **Step 3: Update alt-fork imports — ≤3 line diff per file**

`brand-kit-alt/brandGuidePdf.ts` becomes a one-line re-export:
```ts
export * from '@/features/brandkit/export/brandGuidePdf';
```

`brand-kit-alt/bulkExport.ts` same. `brand-kit-alt/BrandKitPage.tsx:46` updates its import path.

- [ ] **Step 4: Update internal references within the copied canonical files**

If `bulkExport.ts` internally imports `./brandGuidePdf`, that still works (relative import resolves to same dir). Otherwise update.

- [ ] **Step 5: Run all tests to verify nothing broke**

```bash
npm run test
```

- [ ] **Step 6: Atomic single commit with the tag marker**

```bash
git add src/features/brandkit/export/ src/features/brand-kit-alt/
git commit -m "refactor(brandkit): promote brandGuidePdf + bulkExport to shared domain layer

Canonical helpers move to src/features/brandkit/export/. brand-kit-alt/
imports updated to re-export from canonical location (≤3 line diff per
file). Test files moved (no duplicates).

refactor/brand-kit-export-promoted

This is the single atomic D5 commit. Future agents searching
git log --grep=brand-kit-export-promoted find this boundary.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task D.2: Create isBrandReadyForExport helper

**Files:**
- Create: `src/features/brandkit/export/isBrandReadyForExport.ts`
- Create: `src/features/brandkit/export/isBrandReadyForExport.test.ts`

Estimated: 1 hour.

- [ ] **Step 1: Write test**

```ts
describe('isBrandReadyForExport', () => {
  it('returns ready: false + missing: [name, logo, primaryColor] for empty brand', () => {
    expect(isBrandReadyForExport({} as Brand)).toEqual({
      ready: false,
      missing: ['name', 'logo', 'primaryColor'],
    });
  });

  it('returns ready: true when name + logoSystem + primary color set', () => {
    const brand = {
      name: 'B', logoSystem: { primary: { svg: '<svg/>' } } as any,
      colorSystem: { primary: { hex: '#f00' } } as any,
    } as Brand;
    expect(isBrandReadyForExport(brand)).toEqual({ ready: true, missing: [] });
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { Brand } from '@/shared/types/brand';

export interface ReadinessResult {
  ready: boolean;
  missing: string[];
}

export function isBrandReadyForExport(brand: Brand): ReadinessResult {
  const missing: string[] = [];
  if (!brand.name?.trim()) missing.push('name');
  const hasLogo = !!(brand.logoSystem || brand.logo);
  if (!hasLogo) missing.push('logo');
  const hasPrimaryColor = !!(brand.colorSystem?.primary?.hex || brand.primaryColor);
  if (!hasPrimaryColor) missing.push('primaryColor');
  return { ready: missing.length === 0, missing };
}
```

- [ ] **Step 3: Run + commit**

---

### Task D.3: Create useOnlineStatus hook (verify if exists)

**Files:**
- Check first: `grep -rn "useOnlineStatus\|navigator.onLine" src/shared/hooks`
- If absent, create: `src/shared/hooks/useOnlineStatus.ts`

Estimated: 0.5 hours.

- [ ] **Step 1: Audit**

```bash
grep -rln "useOnlineStatus" src
```

- [ ] **Step 2: Implement if absent**

```ts
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
```

- [ ] **Step 3: Commit**

---

### Task D.4: Scaffold exportWorker.ts (Web Worker entry)

**Files:**
- Create: `src/features/brandkit/export/exportWorker.ts`
- Create: `src/features/brandkit/export/exportWorker.types.ts` (postMessage shapes)

Estimated: 2.5 hours.

- [ ] **Step 1: Define message types**

```ts
// exportWorker.types.ts
import type { Brand, BrandKitBinding } from '@/shared/types/brand';

export type ExportWorkerRequest = {
  kind: 'export';
  brand: Brand;
  bindings: BrandKitBinding[];
  docs: Record<string, unknown>; // designId → BrandOSDocument
};

export type ExportWorkerResponse =
  | { kind: 'progress'; stage: 'pdf' | 'zip'; percent: number }
  | { kind: 'done'; pdfBlob: Blob; zipBlob: Blob }
  | { kind: 'error'; stage: 'pdf' | 'zip'; code: string; message: string; missingAssets?: string[] };
```

- [ ] **Step 2: Worker entry**

```ts
// exportWorker.ts
/// <reference lib="webworker" />
import { generateBrandGuidePdf } from './brandGuidePdf';
import { exportBrandKitZip } from './bulkExport';
import type { ExportWorkerRequest, ExportWorkerResponse } from './exportWorker.types';

self.addEventListener('message', async (e: MessageEvent<ExportWorkerRequest>) => {
  const { brand, bindings, docs } = e.data;

  try {
    self.postMessage({ kind: 'progress', stage: 'pdf', percent: 0 } as ExportWorkerResponse);
    const pdfBlob = await generateBrandGuidePdf(brand, { bindings, docs, onProgress: (p) =>
      self.postMessage({ kind: 'progress', stage: 'pdf', percent: p } as ExportWorkerResponse)
    });

    self.postMessage({ kind: 'progress', stage: 'zip', percent: 0 } as ExportWorkerResponse);
    const zipBlob = await exportBrandKitZip(brand, { bindings, docs, pdf: pdfBlob, onProgress: (p) =>
      self.postMessage({ kind: 'progress', stage: 'zip', percent: p } as ExportWorkerResponse)
    });

    self.postMessage({ kind: 'done', pdfBlob, zipBlob } as ExportWorkerResponse);
  } catch (err: any) {
    self.postMessage({
      kind: 'error',
      stage: err.stage ?? 'zip',
      code: err.code ?? 'unknown',
      message: err.message ?? String(err),
      missingAssets: err.missingAssets,
    } as ExportWorkerResponse);
  }
});
```

- [ ] **Step 3: Commit (worker scaffold; PDF/ZIP refinement in D.5/D.6)**

---

### Task D.5: Refine PDF brand guide to read brandKitDesigns

**Files:**
- Modify: `src/features/brandkit/export/brandGuidePdf.ts`

Estimated: 4 hours.

- [ ] **Step 1: Extend the function signature**

```ts
export async function generateBrandGuidePdf(brand: Brand, opts?: {
  bindings?: BrandKitBinding[];
  docs?: Record<string, unknown>;
  onProgress?: (percent: number) => void;
}): Promise<Blob>;
```

- [ ] **Step 2: Use bindings + docs to render showcase pages**

For Stationery / Social / Web / Decks showcase pages, render the bound design's preview using the doc JSON. Each MVP card type contributes a page; Polish cards contribute if bound; Future cards skipped.

- [ ] **Step 3: Verify output against staging brand**

Run locally:
```bash
npm run dev
# In console: import + call generateBrandGuidePdf and download the Blob
```

- [ ] **Step 4: Commit**

---

### Task D.6: Refine ZIP bulk export to read brandKitDesigns

**Files:**
- Modify: `src/features/brandkit/export/bulkExport.ts`

Estimated: 4 hours.

Follow same pattern as D.5. Folder structure per spec § D3.

---

### Task D.7: Export button in PageHeader + 3 states + completeness gate + past exports (HIGH-CONTENTION grouped task for D)

**Files:**
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx`
- Create: `src/features/brand-kit/components/ExportBrandKitButton.tsx`
- Create: `src/features/brand-kit/components/PastExportsSection.tsx`

Estimated: 4 hours.

⚠ **HIGH-CONTENTION TASK.** All D's `BrandKitCosmosPage` edits group here.

- [ ] **Step 1: Build ExportBrandKitButton component**

State machine: idle / generating / ready-to-download. Renders into PageHeader's `actions` slot.

```tsx
type ExportState =
  | { phase: 'idle' }
  | { phase: 'generating'; percent: number }
  | { phase: 'ready'; pdfBlob: Blob; zipBlob: Blob; exportId: string };

// ... implementation with Web Worker spawn + uploads + brand_kit_exports row insert
```

Disabled when `isBrandReadyForExport(brand).ready === false`. Tooltip lists missing items. Also disabled when offline (useOnlineStatus).

- [ ] **Step 2: Build PastExportsSection (inline list of last 3)**

Query Supabase `brand_kit_exports WHERE brand_id = ? ORDER BY created_at DESC LIMIT 3`. Render with Download PDF / Download ZIP links.

- [ ] **Step 3: Mount in BrandKitCosmosPage's PageHeader**

```tsx
<PageHeader
  title="Brand Kit"
  actions={<ExportBrandKitButton brand={brand} />}
/>
<PastExportsSection brandId={brand.id} />
{/* existing sections list */}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/brand-kit/BrandKitCosmosPage.tsx src/features/brand-kit/components/ExportBrandKitButton.tsx src/features/brand-kit/components/PastExportsSection.tsx
git commit -m "feat(brandkit): Export Brand Kit button + PastExports section (D HIGH-CONTENTION)

3-state button (idle/generating/ready), brand-completeness gate with
tooltip listing missing items, offline gating via useOnlineStatus, past
exports inline list (last 3 + show all).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task D.8: Export snapshot persistence (brand_kit_exports row write)

**Files:**
- Modify: `src/features/brand-kit/components/ExportBrandKitButton.tsx`

Estimated: 2 hours.

- [ ] **Step 1: Upload blobs + insert row**

After Worker returns `{ kind: 'done', pdfBlob, zipBlob }`:

```ts
const exportId = crypto.randomUUID();
const pdfPath = `brand-kit-exports/${brand.id}/${exportId}/brand-guide.pdf`;
const zipPath = `brand-kit-exports/${brand.id}/${exportId}/brand-kit.zip`;

const { error: pdfErr } = await supabase.storage.from('brand-kit-exports').upload(pdfPath, pdfBlob);
const { error: zipErr } = await supabase.storage.from('brand-kit-exports').upload(zipPath, zipBlob);
if (pdfErr || zipErr) throw new Error('Upload failed');

const { data: pdfUrl } = supabase.storage.from('brand-kit-exports').getPublicUrl(pdfPath);
const { data: zipUrl } = supabase.storage.from('brand-kit-exports').getPublicUrl(zipPath);

await supabase.from('brand_kit_exports').insert({
  id: exportId,
  brand_id: brand.id,
  pdf_url: pdfUrl.publicUrl,
  zip_url: zipUrl.publicUrl,
  bindings_snapshot: brand.brandKitDesigns ?? {},
  brand_snapshot: brand,
  doc_snapshots: docs,
});

telemetry({
  type: 'brand_kit_exported',
  brandId: brand.id, exportId,
  pdfBytes: pdfBlob.size, zipBytes: zipBlob.size,
  durationMs: Date.now() - startedAt,
  cardBindingsCount: Object.keys(brand.brandKitDesigns ?? {}).length,
  mvpCardsBoundCount: countMvpBindings(brand),
});
```

- [ ] **Step 2: Commit**

---

### Task D.9: Error states (PDF/ZIP/upload/db_insert) consolidated

**Files:**
- Modify: `src/features/brand-kit/components/ExportBrandKitButton.tsx`

Estimated: 2.5 hours.

Wire each error stage to the right UI (toast vs modal) per spec § "Error + offline states". Fire `brand_kit_export_failed` with the stage.

---

### Task D.10: Offline state handling

**Files:**
- Modify: `src/features/brand-kit/components/ExportBrandKitButton.tsx`

Estimated: 0.5 hours.

Combine `isBrandReadyForExport(brand)` + `useOnlineStatus()` for the disabled state. Tooltip prefers "Connect to the internet to export" when offline, else lists missing brand items.

---

### Task D.11: Photos card build (Brand Asset MVP)

**Files:**
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` Photos renderer (placeholder → real gallery)

Estimated: 3 hours.

⚠ **HIGH-CONTENTION TASK.** This + D.12, D.13, D.14, D.15 SHOULD be grouped into one BrandKitCosmosPage edit. Combine into the D.7 commit if convenient, OR commit these as a single follow-up commit.

Build gallery using `AssetSourcePopover` for uploads. Store on `Brand.photos[]`.

---

### Task D.12: About card build (Brand Asset MVP)

**Files:**
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` About renderer

Estimated: 2 hours.

Form: name / tagline / description / mission / vision / values. Saves to `Brand.about[]`.

---

### Task D.13: Email Signature card build (HTML template + preview + download)

**Files:**
- Create: `src/features/brandkit/templates/emailSignature.html.ts`
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` Email Sig renderer
- Test: `src/features/brandkit/templates/emailSignature.html.test.ts`

Estimated: 3 hours.

- [ ] **Step 1: emailSignatureHtml function**

```ts
export function emailSignatureHtml(brand: Brand, opts?: { variant?: 'standard' }): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;max-width:600px;">
  <tr>
    <td style="padding:0 16px 0 0;">
      ${brand.logoSystem?.primary?.svg ?? ''}
    </td>
    <td style="border-left:2px solid ${brand.colorSystem?.primary?.hex ?? '#000'};padding:0 0 0 16px;color:#222;">
      <div style="font-weight:bold;font-size:16px;">${brand.name}</div>
      <div style="font-size:13px;color:#666;">${brand.tagline ?? ''}</div>
    </td>
  </tr>
</table>`.trim();
}
```

- [ ] **Step 2: Renderer + Download button**

In Email Sig card, render the HTML in a sandboxed iframe (`srcdoc`) for preview. Download button outputs `.htm` file via Blob URL.

- [ ] **Step 3: Tests + commit**

---

### Task D.14: Favicon card build (auto-derived)

**Files:**
- Create: `src/features/brandkit/export/generateFavicon.ts`
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` Favicon renderer

Estimated: 2 hours.

Auto-derive from `brand.logoSystem.primary` — render to canvas at 16/32/180px, output PNG + .ico via canvas.toBlob.

---

### Task D.15: Future-scope placeholder cards (Website + Landing Page + Animations)

**Files:**
- Create: `src/features/brand-kit/components/ComingSoonCard.tsx`
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx` Future-scope renderers

Estimated: 1.5 hours.

```tsx
export function ComingSoonCard({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      <div className="font-medium">{label}</div>
      <div className="text-xs mt-1">Coming soon</div>
    </div>
  );
}
```

Use for: Website · Landing Page · Logo Reveal · Slide In · Fade · Rotate.

---

### Task D.16: Telemetry — wire export funnel events

**Files:**
- Modify: `src/features/brand-kit/components/ExportBrandKitButton.tsx`

Estimated: 0.5 hours.

Confirm these fire in the right places:
- `brand_kit_export_started` on click (state idle → generating)
- `brand_kit_exported` on success (state generating → ready)
- `brand_kit_export_failed` per error stage (D.9 should have wired this)
- `brand_kit_export_downloaded` on PDF/ZIP download click

---

### Task D.17: Unit tests for D

**Files:**
- Create: tests for `isBrandReadyForExport`, `emailSignatureHtml`, `generateFavicon`, `ExportBrandKitButton` state machine

Estimated: 3 hours.

---

### Task D.18: Adapter integration test for D

**Files:**
- Create: `src/features/brand-kit/components/ExportBrandKitButton.integration.test.tsx`

Estimated: 2 hours.

Mock Worker + Supabase. Click Export → assert progress events → ready state → row inserted in brand_kit_exports (mocked).

---

### Task D.19: Browser E2E for D — happy export path

**Files:**
- Create: `src/features/brand-kit/D-export.browser.test.tsx`

Estimated: 4 hours.

Full path: complete brand → click Export → mock Worker returns blobs → assert state ready → click Download PDF → blob URL opens.

---

### Task D.20: Document rollback path for Sub-project D

**Files:**
- Create: `docs/superpowers/plans/runbook/D-rollback.md`

Estimated: 0.5 hours.

Symptoms: Export button crashes; Worker fails; uploads fail; row insert fails. Rollback order: D.8 (snapshot persistence) → D.7 (button) → D.5/D.6 (PDF/ZIP refinements) → D.4 (Worker) → D.1 (promotion — risky to revert because alt now points at new location; ESCALATE before reverting D.1).

---

### Checkpoint D — manual review

**🛑 STOP.** Verify:
- [ ] All 20 D tasks committed and pushed.
- [ ] `npm run typecheck && npm run lint && npm run test` all green.
- [ ] Manual smoke: complete a brand → click Export → wait for ready state → download PDF + ZIP → verify both files contain brand content.
- [ ] D's browser E2E green.
- [ ] Rollback runbook present.
- [ ] D.1's atomic commit tagged with `refactor/brand-kit-export-promoted` in body.

Ping the user "Checkpoint D green" and wait.

---

# Final acceptance gate (after both C and D close)

Manual verification across ALL 4 sub-projects together:

- [ ] Open `/b/test0/brand-kit` on a fresh brand. Brand Kit loads.
- [ ] Customize a Business Card. Save. Reload. Customization persists. (A)
- [ ] Open Editor on empty Letterhead. Choice modal shows. Pick Blank → editor opens. (B Blank)
- [ ] (If P1 satisfied) Open Editor on empty Social Post. Choice modal → AI → generates → opens. (B AI)
- [ ] Open Editor on bound Pitch Deck. Editor opens with the bound design. (B existing)
- [ ] From bound Business Card drilldown → Browse Other → templates filtered → Use as my Business Card → returns to Brand Kit with new template bound. (C)
- [ ] Click Export Brand Kit at top of Brand Kit page. Wait. Download PDF + ZIP. Verify content. (D)
- [ ] Verify telemetry events fire (check console.info OR transport if wired). All 9 event types observed end-to-end.
- [ ] Run full test suite once more: `npm run test`. All green.
- [ ] Run `npm run lint && npm run typecheck`. Clean.

---

## Plan summary stats

> **Note on estimates.** Per user mandate, the total estimate is NOT
> a commitment. The value of this plan is the **ordering**, the
> **4 checkpoints**, and the **high-contention groupings**.
> Re-estimate at each checkpoint based on learnings.

| Sub-project | Tasks | High-contention groups | Execution mode |
|-------------|-------|------------------------|----------------|
| A | 11 (A.1–A.11) + Checkpoint A | 2 (types+services, BrandKitCosmosPage+BrandKitCardEditor) | subagent-driven-development |
| B | 14 (B.0–B.13) + Checkpoint B | 1 (BrandKitCosmosPage) | subagent-driven-development |
| C | 13 (C.1–C.13) + Checkpoint C | 1 (BrandKitCosmosPage) | executing-plans |
| D | 20 (D.1–D.20) + Checkpoint D | 1 (BrandKitCosmosPage + new components) | executing-plans |
| **Total** | **58 tasks** + 4 checkpoints | 5 high-contention groups | mixed |

---
