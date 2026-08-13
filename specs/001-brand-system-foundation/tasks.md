---

description: "Implementation tasks — Brand System Foundation MVP"
---

# Tasks: Brand System Foundation MVP

**Input**: Design documents from `/specs/001-brand-system-foundation/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. The repo mandates three layers (unit jsdom / adapter integration / browser E2E) plus a separate psql RLS track. Per the approved plan, **tests and RLS checks live inside the task that creates the behavior** — there is no trailing "write the tests" phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: the user story served (US1–US6). Phase 0 tasks are foundational and carry no story label.
- Every task names exact file paths.

## Organization note

Phases follow the **plan's convergence order** (schema → canonical write paths → Library/Kit/Context convergence → retirement), as directed, because every user story in this feature shares one set of plumbing. Story traceability is preserved via the `[USn]` label on each task.

**Story map**: US1 one brand truth across surfaces · US2 skip freely, creation never blocked · US3 promote to Official Kit · US4 one Brand Library · US5 work persists in two families · US6 quiet context learning.

## Path conventions

Existing directories only (no new top-level layer): `src/domain/brand/`, `src/application/brand/`, `src/core/`, `src/features/`, `src/shared/`, `supabase/migrations/`, `supabase/tests/`.

## Standing rules for every task

1. **Preserve working behavior.** No task may change what an existing surface renders unless the task says so explicitly.
2. `npm run lint` → 0 errors; `npm run typecheck:ci` → no NEW errors (321 baselined).
3. Never edit generated files (`src/shared/ds/tokens.css`, `tokens.ts`, `src/integrations/supabase/types.ts` by hand).
4. A task is done when its own tests pass, not when it compiles.

---

## Phase 0: Schema & Contracts (Foundational — blocks everything)

**Purpose**: Land the schema and interfaces additively. **Zero behavior change** — nothing reads the new columns at the end of this phase.

**⚠️ CRITICAL**: No later phase may begin until Phase 0 is complete and deployed.

- [ ] T001 Create migration `supabase/migrations/20260813000000_016_brand_core_and_business_info.sql` adding `brands.identity_meta JSONB` and `brands.business_info JSONB` (`ADD COLUMN IF NOT EXISTS`), with the repo's multi-paragraph header convention (rationale, additive/non-destructive statement, requirement implemented, reversibility line). No RLS change, no backfill.
- [ ] T002 Create `supabase/migrations/down/016_brand_core_and_business_info.down.sql` dropping both columns.
- [ ] T003 Create migration `supabase/migrations/20260813010000_017_brand_library_kit_context.sql` per [contracts/persistence.md](./contracts/persistence.md) §017.1–017.4: 9 additive columns on `public.assets`, the two `NOT VALID` CHECKs, the three indexes, and tables `brand_folders` (incl. the partial unique index for root-folder names), `brand_kit_adoptions`, `brand_context_signals`. All `IF NOT EXISTS` / `DROP POLICY IF EXISTS` first.
- [ ] T004 Add RLS to all three new tables in the same migration file using the proven `is_brand_member()` policy set (viewer/editor/editor/admin), with `brand_kit_adoptions` INSERT additionally requiring `adopted_by = (SELECT auth.uid())`.
- [ ] T005 Create `supabase/migrations/down/017_brand_library_kit_context.down.sql` dropping the three tables, the added columns, constraints and indexes.
- [ ] T006 [P] Write RLS test `supabase/tests/016_core_meta_isolation.test.sql` in the house style (`BEGIN … ROLLBACK`, `pg_temp.act_as(uid)`, `RAISE EXCEPTION` on wrong outcome, final `ALL 016 RLS ASSERTIONS PASSED`): a non-member cannot read or write `identity_meta` / `business_info` on another user's brand.
- [ ] T007 [P] Write RLS test `supabase/tests/017_library_kit_context_isolation.test.sql`: for `brand_folders`, `brand_kit_adoptions`, `brand_context_signals` and the new `assets` columns — non-member SELECT returns zero rows and INSERT/UPDATE/DELETE are denied; an adoption cannot be attributed to another user; a storage write under another brand's path prefix is rejected.
- [ ] T008 Deploy migrations per the repo runbook: `supabase migration list --linked` → `supabase db push --linked` → `supabase migration list --linked` confirming 016 and 017 appear in BOTH columns. **If `db push` errors, do NOT force.** Record the outcome in `docs/phase-2/DEPLOY-016-017-runbook.md`.
- [ ] T009 [P] Add `KIT_ADOPTIONS` and `BRAND_CONTEXT` to `SERVICE_KEYS` in `src/core/types/services.ts`, and declare `IKitAdoptionService` in `src/core/services/IKitAdoptionService.ts` and `IBrandContextService` in `src/core/services/IBrandContextService.ts` per [contracts/services.md](./contracts/services.md) §3–4 (interfaces only, no implementations).
- [ ] T010 Register both new keys in **both** branches of `src/core/boot.ts` (`bootServices()` local defaults and the authenticated overrides in `reconfigureForAuth`) with no-op/local stub implementations, and extend the key list in `src/core/__tests__/boot.test.ts` so both modes are asserted.

**Checkpoint**: schema deployed, contracts declared, RLS proven. App behavior unchanged.

---

## Phase 1: Core DNA + authority/provenance (US2 foundation, US1 prerequisite)

**Goal**: The canonical model carries structured visual style, rules and positioning, plus an authority/provenance sidecar that AI cannot promote.

**Independent test**: quickstart Scenarios 2 and 3 — a name-only brand reaches creation on provisional values, and no system actor can produce Confirmed/Official.

- [ ] T011 [P] [US2] Create the closed `CoreFieldPath` registry in `src/domain/brand/coreFieldPaths.ts` (typed union + a runtime array), enumerating every addressable Core value per [data-model.md](./data-model.md) §1.2.
- [ ] T012 [P] [US2] Create `src/domain/brand/coreMeta.ts`: `Authority`, `Provenance`, `CoreValueMeta`, `Actor`, plus helpers `coreValueMeta(brand, path)` (INV-4 default), `isAtLeast(a, min)` (INV-5 ordering) and `coreCompleteness(brand)`.
- [ ] T013 [US2] Unit test `src/domain/brand/__tests__/coreFieldPaths.test.ts` asserting registry completeness — every `CoreFieldPath` resolves against the identity schema, and unknown keys are dropped on read (self-healing).
- [ ] T014 [US2] Unit test `src/domain/brand/__tests__/coreMeta.test.ts` covering the authority state machine: legal/illegal transitions, INV-2 (promotion preserves provenance), INV-4 default, INV-5 ordering.
- [ ] T015 [P] [US2] Extend `src/domain/brand/identity.ts` with `visualStyle`, `rules` and `positioning` (closed enumerations per data-model §1.1), plus `identityMeta` and `businessInfo` on `CanonicalBrand`. All fields optional.
- [ ] T016 [US2] Extend the zod schema in `src/domain/brand/invariants.ts` to validate the three new subsystems and the meta sidecar, keeping existing `.passthrough()` behavior so no current brand fails validation.
- [ ] T017 [US2] Extend `src/domain/brand/fromLegacy.ts` to hydrate `identityMeta` with INV-4 defaults (`provisional`/`imported`) for every existing value, map `brand.uiStyle` → `visualStyle.cornerStyle`/`density`, and map `Strategy.positioning`/`targetAudience` → `positioning`. **Read-through only — zero behavior change.**
- [ ] T018 [US2] Extend `src/domain/brand/toLegacy.ts` to persist `identityMeta`, `businessInfo`, `visualStyle`, `rules` and `positioning`, keeping the existing rule that it never writes `guidelines.*`.
- [ ] T019 [US2] Unit test `src/domain/brand/__tests__/coreRoundTrip.test.ts` — round-trip through all four legacy shapes (legacy scalars, v3 fields, identity blob, guidelines mirror) carrying meta and businessInfo with zero data loss. Model on the existing `canonicalBrand.test.ts` fixture-factory pattern.
- [ ] T020 [US2] Thread the `Actor` parameter through the existing ops in `src/application/brand/` (`changeBrandColor`, `changeBrandTypography`, `changeBrandVoice`, `changeBrandStrategy`), recording provenance on write and **throwing** when a `system` actor attempts `confirmed`/`official` (INV-3).
- [ ] T021 [P] [US2] Add `src/application/brand/changeBrandVisualStyle.ts` and `changeBrandRules.ts` following the existing op pattern (load via repo → mutate identity → validate → save).
- [ ] T022 [P] [US2] Add `src/application/brand/changeBrandPositioning.ts` and `changeBusinessInfo.ts` following the same pattern.
- [ ] T023 [US2] Implement `src/application/brand/promoteCoreValue.ts` (and `demoteCoreValue`) — the ONLY path to `confirmed`/`official`, with `actor` typed human-only so a system caller cannot compile. Adoption delegation is wired later in T053; leave a typed seam.
- [ ] T024 [US2] Unit test `src/application/brand/__tests__/promotion.test.ts` — system actor writing `confirmed`/`official` throws; `promoteCoreValue` rejects non-human actors (type-level + runtime); promotion never rewrites provenance; demote floors at `confirmed` for previously-confirmed values.
- [ ] T025 [US2] Implement `src/application/brand/buildCreationContext.ts` — pure assembly of Core (with authority + provenance), Business Info, references and preferences, defaulting to **include provisional values** so creation works on a name-only brand.
- [ ] T026 [US2] Unit test `src/application/brand/__tests__/buildCreationContext.test.ts` — provisional values included by default (FR-006); each Core value carries its authority and provenance; the module performs no writes and no network calls.
- [ ] T027 [P] [US2] Add an optional icon slot to `DsBadge` in `src/shared/ds/Feedback.tsx` (the only DS change in this feature) and extend `src/shared/ds/ds.test.tsx` to cover it.
- [ ] T028 [US2] Build the authority/provenance chip as a **feature-local product component** composing `DsBadge` (not a DS primitive), and surface it in Setup only where a value's status is genuinely relevant — no persistent labels, no clutter (FR-003).

**Checkpoint**: Core DNA is structured and status-aware; AI cannot promote. Existing surfaces render exactly as before.

---

## Phase 2: One canonical write path (US1)

**Goal**: Every Core write flows through `BrandRepository`; the competing paths are closed.

**Independent test**: quickstart Scenario 1 — an edit on any surface appears on all others, in both directions.

- [ ] T029 [US1] Narrow `src/shared/store/brandStore.ts`: `update()` detects Core-touching patches and routes them to the canonical op, rejecting them **loudly in dev and permissively in prod** for one release. Non-Core fields (name, publicUrl, flags) keep their current path.
- [ ] T030 [US1] Unit test `src/shared/store/__tests__/brandStoreWriteGuard.test.ts` — a Core patch is routed to the canonical op, a non-Core patch is not, and the dev/prod guard behaves per T029.
- [ ] T031 [US1] Collapse the Setup save path in `src/pages/b/[slug]/setup.tsx` from up to five sequential round-trips to one canonical write, removing the direct `useBrandStore.setState` persistence bypass at lines ~127-140.
- [ ] T032 [US1] Migrate `src/features/setup/data/mockBrandToPatch.ts` and `brandToMockBrand.ts` from persisted-shape translators to **read-side views** over the canonical record, keeping `MockBrand` as the Setup view model.
- [ ] T033 [P] [US1] Migrate the legacy registry singleton call sites (`src/features/tools/core/claim.ts`, `src/features/bento/BentoEditor.tsx`) off `services.brands` onto the container-resolved service.
- [ ] T034 [P] [US1] Migrate the direct brand-record writers listed in the plan's inspection (`src/features/brand-board/BrandBoardPage.tsx`, `panels/LogosPanel.tsx`, `src/shared/brand-settings/BrandSettingsDialog.tsx`, `src/shared/presentation/theme/useDeckTheme.ts`, `src/features/editor/tools/{FontTool,LogoTool}.tsx`) onto the canonical ops.
- [ ] T035 [US1] Add an import/lint guard test `src/shared/store/__tests__/noBypassWriters.test.ts` asserting no module outside `src/application/brand/` imports `toLegacyBrandPatch` or writes Core fields through `IBrandsService.update`.
- [ ] T036 [US1] Browser E2E `src/features/setup/__tests__/brandTruth.browser.test.tsx` — change a Core value in Setup and assert Brand Kit, editor brand slots and Library chips all reflect it; then change a value via editor brand tools and assert Setup reflects it (SC-001).

**Checkpoint**: one write authority for Core, proven in both directions. Legacy fields still readable; nothing deleted yet.

---

## Phase 3: Brand Library convergence (US4)

**Goal**: Three asset stores become one Library with folders, flags, archive and tombstone deletion.

**Independent test**: quickstart Scenarios 4 and 6 — uploads from three surfaces all land in the Library; deleting an item never corrupts saved work.

- [ ] T037 [P] [US4] Extend the `Asset` type and `IAssetsService` in `src/core/types/services.ts` with the Library surface from [contracts/services.md](./contracts/services.md) §2 (`listLibrary`, `setFlags`, `moveToFolder`, `archive`/`unarchive`, `softDelete`, folder methods, `LibraryQuery`, `LibraryFlags`, `DeleteOutcome`).
- [ ] T038 [US4] Implement the Library methods in `src/core/adapters/database/LocalAssetsService.ts`, adding the folders store at `brandos:library-folders:{brandId}`.
- [ ] T039 [US4] Adapter test `src/core/adapters/database/__tests__/LocalLibraryService.test.ts` (real localStorage, model on the existing `LocalAssetsService.test.ts`) — flags, folders, archive/unarchive, per-brand scoping, favorite/dislike mutual exclusion.
- [ ] T040 [US4] Implement the same methods in `src/core/adapters/database/SupabaseAssetsService.ts` using the house payload-bag write pattern and `any`-mapper read pattern, with `42703` missing-column tolerance so the app degrades if 017 is not yet deployed.
- [ ] T041 [US4] Adapter test `src/core/adapters/database/__tests__/SupabaseLibraryService.test.ts` using the Proxy-based chainable Supabase mock from `SupabaseDesignStorage.test.ts`.
- [ ] T042 [US4] Implement `softDelete` tombstone semantics in both services per data-model §3.3 — set `deleted_at`, clear `url`/`storage_path`, remove the storage object, keep `id`/`name`/`origin`, and return `{ok:false, reason:'adopted'|'referenced'}` with the blocking list instead of cascading.
- [ ] T043 [US4] Adapter test `src/core/adapters/database/__tests__/libraryDeletion.test.ts` — archiving does not affect the Kit or saved work; deletion returns the blocking references first; after deletion, saved work still resolves and lineage shows the inert record (INV-11).
- [ ] T044 [US4] Write the Library ingest routine in `src/domain/brand/migrateLibrary.ts`: copy `brand.assets[]` and `brand.brandAssets[]` into the Library preserving `legacy_ref_id`, idempotent and re-runnable (keyed on `legacy_ref_id`), with a **dry-run report mode** that lists what would move without writing.
- [ ] T045 [US4] Add `logoSystem` ref rewriting to the ingest (old brandAssets id → new Library id), with a read-through fallback resolving unrewritten refs via `legacy_ref_id`.
- [ ] T046 [US4] Unit test `src/domain/brand/__tests__/migrateLibrary.test.ts` — ingest is idempotent across re-runs, no asset is lost from any of the three sources, and every `logoSystem` slot still resolves after the rewrite (R1/R2 coverage).
- [ ] T047 [US4] Converge `src/shared/upload/useUpload.ts` to write through `IAssetsService` instead of `brand.assets[]`.
- [ ] T048 [US4] Converge `src/shared/assets/useAssetUpload.ts` and `assetOperations.ts` to write through `IAssetsService` instead of `brand.brandAssets[]`, keeping logo assignment behavior identical.
- [ ] T049 [US4] Give Setup's photos and icons a real home by routing their slots through the Library (closing the "never persist" gap in `mockBrandToPatch.ts`).
- [ ] T050 [US4] Run the ingest against all brands, then run `VALIDATE CONSTRAINT` on the two `NOT VALID` checks from 017 as a separate re-runnable statement (not part of the deploy).
- [ ] T051 [US4] Browser E2E `src/features/dam/__tests__/libraryConvergence.browser.test.tsx` — upload from the editor, from Setup and from the Library page; assert all three appear with correct `origin`, and that flags/folders persist across a reload (SC-004).

**Checkpoint**: one Library, all uploads converged, deletion safe. Legacy arrays still present but read-only.

---

## Phase 4: Official Brand Kit adoption (US3)

**Goal**: Adoption is an explicit, attributed reference — never a copy, never automatic.

**Independent test**: quickstart Scenario 5 — generate → absent from Kit; promote → present; unadopt → material remains.

- [ ] T052 [US3] Change `KitStateRepository` in `src/features/brand-kit/kit/repository.ts` from sync to async (`Promise<…>`) and update the two call sites in `src/features/brand-kit/kit/kitStore.ts` (lines ~82 and ~203). `LocalKitStateRepository` keeps its behavior behind resolved promises.
- [ ] T053 [US3] Implement `SupabaseKitStateRepository` and wire it via `setKitStateRepository(...)` inside `reconfigureForAuth` in `src/core/boot.ts`.
- [ ] T054 [US3] Adapter test `src/features/brand-kit/kit/__tests__/kitRepository.test.ts` — both implementations satisfy the same suite; kit hydration is unchanged after the async switch (R4 coverage).
- [ ] T055 [P] [US3] Implement `src/core/adapters/kit-adoptions/LocalKitAdoptionService.ts` (key `brandos:kit-adoptions:{brandId}`) per contracts §3.
- [ ] T056 [P] [US3] Implement `src/core/adapters/kit-adoptions/SupabaseKitAdoptionService.ts` against `brand_kit_adoptions`, and replace the Phase-0 stubs in `boot.ts` for both modes.
- [ ] T057 [US3] Adapter test `src/core/adapters/kit-adoptions/__tests__/kitAdoption.test.ts` — the stored row carries **no copy** of the adopted material (INV-6); `unadopt` leaves the item intact (INV-7); there is no automatic insert path (INV-9); a direct `adopt({targetKind:'core_value'})` is **rejected** (INV-8).
- [ ] T058 [US3] Wire the T023 seam: `promoteCoreValue(…, 'official')` delegates the adoption row to `IKitAdoptionService.adopt`, and the authority change is not applied if the delegated adoption fails.
- [ ] T059 [US3] Unit test `src/application/brand/__tests__/coreAdoption.test.ts` — promotion is the only route to an official Core value; failure of the delegated adoption rolls back the authority change; removing the adoption returns authority to `confirmed`, never lower.
- [ ] T060 [US3] Migrate existing kit `approved` items to adoption rows in `src/features/brand-kit/kit/migrateApprovals.ts`, attributed to the brand owner at the original approval time where known; idempotent.
- [ ] T061 [US3] Browser E2E `src/features/brand-kit/__tests__/adoption.browser.test.tsx` — a generated deliverable is absent from the Official Kit until explicitly promoted; after unadopt the Library material is still present and unchanged.

**Checkpoint**: Official Kit is adoption-by-reference with a single entry point per target kind.

---

## Phase 5: Business Info + Brand Context v1 (US6)

**Goal**: Reusable company facts have one home; the brand learns quietly without touching Core.

**Independent test**: quickstart Scenario for US6 — favorites/dislikes/references are recorded silently, Core is unchanged, and AI creation can read the context.

- [ ] T062 [P] [US6] Add the `BusinessInfo` zod schema to `src/domain/brand/invariants.ts` per data-model §2 (all fields optional).
- [ ] T063 [US6] Route the deliverable renderers that free-type company facts (business card, letterhead, email signature, invoice, under `src/features/brand-kit/`) to read from `BusinessInfo`, keeping per-deliverable overrides working as output-level customization.
- [ ] T064 [US6] Unit test `src/domain/brand/__tests__/businessInfo.test.ts` — round-trip, all-optional tolerance, and renderers falling back cleanly when a field is absent (never blocking).
- [ ] T065 [P] [US6] Implement `src/core/adapters/brand-context/LocalBrandContextService.ts` (key `brandos:brand-context:{brandId}`) with a **ring-buffer cap** for quota safety (R5).
- [ ] T066 [P] [US6] Implement `src/core/adapters/brand-context/SupabaseBrandContextService.ts` against `brand_context_signals`, and replace the Phase-0 stubs in `boot.ts` for both modes.
- [ ] T067 [US6] Adapter test `src/core/adapters/brand-context/__tests__/brandContext.test.ts` — append/list/remove; `record` never throws to the caller (INV-15); the local ring buffer caps correctly; signals are brand-scoped.
- [ ] T068 [US6] Dependency test `src/core/adapters/brand-context/__tests__/noCoreWrites.test.ts` asserting there is **no import path** from the context service to `BrandRepository` or the application ops (INV-13).
- [ ] T069 [US6] Emit context signals from existing user actions — Library favorite/dislike/use-as-reference (Phase 3) and Kit adoption (Phase 4) — as silent, non-blocking `record` calls with no new UI.
- [ ] T070 [US6] Convert `src/core/adapters/brand-memory/LocalBrandMemoryService.ts` to a **derived read** over context signals plus designs, removing its role as a parallel store while keeping `IBrandMemoryService` and its one consumer (`BrandMemoryColorsPanel`) working.
- [ ] T071 [US6] Wire `buildCreationContext` (T025) to the real `ContextSummary` and Library references so AI creation uses Core + context + references + Business Info.

**Checkpoint**: all six concepts live, distinct, and consumed. Context learns silently and cannot touch Core.

---

## Phase 6: Generative media provenance (US5)

**Goal**: Generated media are first-class Library assets carrying provenance and relationships.

**Independent test**: quickstart Scenario 8 — a constructive output reopens editable; a generated image carries complete provenance and stays one object when placed.

- [ ] T072 [US5] Write the `provenance` payload (data-model §5.2) on Library create for generated media, setting `origin='generated'` and making the payload immutable except for `relations`.
- [ ] T073 [US5] Accrue relationships on `provenance.relations` when generated media are placed into a design, keeping the Library item the single canonical object (INV-12).
- [ ] T074 [US5] Adapter test `src/core/adapters/database/__tests__/generativeProvenance.test.ts` — provenance is complete at creation and immutable (INV-10); relations accrue; deleted relationship targets resolve to tombstones rather than dangling (INV-11).

**Checkpoint**: both output families persist per their nature. **Feature-complete for the MVP.**

---

## Phase 7: Legacy retirement (gated — only after replacements are proven)

**⚠️ Each task below is BLOCKED until its deletion criterion from the plan is demonstrably met.** A criterion that is not met at feature completion is recorded as still-open, not force-closed.

- [ ] T075 Verify and record each deletion criterion from plan §Legacy retirement in `specs/001-brand-system-foundation/retirement-status.md` (met / not met, with the evidence command used). **Gate for T076–T082.**
- [ ] T076 [P] Delete the legacy scalar brand fields (`primaryColor`, `secondaryColor`, `accentColor`, `neutrals`, `fonts`, `tone`, `audience`, `logo`, `logoAssets`, string `strategy`) from `src/shared/types/brand.ts` and their resolution branches in `fromLegacy.ts` — **only if** no reader resolves them ahead of the canonical record.
- [ ] T077 [P] Delete `brand.assets[]` and `brand.brandAssets[]` plus the legacy copy-on-load in `src/features/dam/DamPage.tsx` (~lines 185-200) — **only if** ingest reports zero remaining entries and no writer touches them.
- [ ] T078 [P] Drop the `assets.legacy_ref_id` column in migration `018` (+ down file) — **only if** zero rows populate it and no reader uses the fallback.
- [ ] T079 [P] Delete `brand.uiStyle` and point Brand Board at `visualStyle` — **only if** no reader of `uiStyle` remains.
- [ ] T080 [P] Delete the duplicate service channels (`services.brands` in `src/shared/services/registry.ts`, the module singleton in `brands.local.ts:140`, remaining `setState` persistence bypasses) — **only if** T035's guard test reports zero call sites.
- [ ] T081 [P] Replace the `brandos:seed-brand-overrides` hidden write layer with proper per-user demo-brand handling — **only if** seed brands no longer require a parallel write store.
- [ ] T082 [P] Delete dead types (`SavedDesign` in `src/features/brandkit/types/index.ts`, the superseded flat `Asset` where the Library replaces it) — **only if** their last consumer is gone.
- [ ] T083 Demote `brand.guidelines.*` from writable truth to a render-only projection — **only if** all voice/strategy/logo/color readers use Core.

---

## Phase 8: Verification & handover

- [ ] T084 Run the full quickstart: all ten scenarios in [quickstart.md](./quickstart.md), including the local-mode/server parity pass (Scenario 10) and the sign-in reconciliation step.
- [ ] T085 Run the complete gate: `npm run test` (green except the documented pre-existing `recolorLogo.test.ts` failure), `npm run lint` (0 errors), `npm run typecheck:ci` (no new errors), and both psql RLS scripts.
- [ ] T086 Update `CLAUDE.md` with the six-concept model, the canonical write paths table, the new localStorage keys, and the still-open retirement criteria from T075.

---

## Dependencies

```
Phase 0 (T001–T010)  ──▶ blocks everything
        │
        ├──▶ Phase 1 Core DNA (T011–T028)
        │          │
        │          └──▶ Phase 2 write authority (T029–T036)   [needs T020–T023]
        │
        ├──▶ Phase 3 Library (T037–T051)        [independent of Phase 1/2]
        │          │
        │          ├──▶ Phase 4 Kit adoption (T052–T061)  [needs Library + promoteCoreValue]
        │          └──▶ Phase 6 provenance (T072–T074)
        │
        └──▶ Phase 5 Business Info + Context (T062–T071)  [Context signals need Phase 3/4 actions]
                   │
Phases 1–6 ────────┴──▶ Phase 7 retirement (T075–T083) ──▶ Phase 8 verification (T084–T086)
```

**Story dependencies**: US2 (Phase 1) and US4 (Phase 3) are independent and can run in parallel after Phase 0. US1 needs US2's ops. US3 needs US4's Library and US2's promotion op. US6's signal emission needs US4/US3 actions to exist. US5 needs US4.

## Parallel opportunities

- **Phase 0**: T006/T007 (RLS scripts) and T009 (interfaces) are parallel; T001–T005 are sequential file-by-file but independent of T009.
- **After Phase 0**: Phase 1 and Phase 3 are fully parallel tracks — different files, no shared state. This is the single biggest scheduling win.
- **Within Phase 1**: T011/T012 parallel; T015 parallel with them; T021/T022 parallel; T027 parallel with everything.
- **Within Phase 3**: T037 first, then the local (T038/T039) and Supabase (T040/T041) implementations are parallel.
- **Within Phase 4**: T055/T056 parallel.
- **Within Phase 5**: T062, T065, T066 parallel.
- **Phase 7**: T076–T083 are all parallel once T075 gates them.

## Implementation strategy

**Suggested MVP slice**: Phase 0 + Phase 1 + Phase 2. That delivers the constitution's two hardest guarantees — one canonical write path (US1) and AI-cannot-promote with skip-freely creation (US2) — and is independently shippable and demonstrable on its own.

**Then**: Phase 3 (Library, the largest data migration, isolated from Core so a failure never touches brand truth) → Phase 4 (Kit) → Phase 5 (Business Info + Context) → Phase 6 (provenance).

**Incremental delivery**: every phase ends at a checkpoint where the app is shippable and existing behavior is preserved. Legacy is retired only in Phase 7, gated on proof, so at every point before it a code revert restores prior behavior with data intact.
