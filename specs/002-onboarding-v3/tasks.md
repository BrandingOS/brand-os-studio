---

description: "Task list for 002 — Onboarding V3"
---

# Tasks: Onboarding V3

**Input**: Design documents from `/specs/002-onboarding-v3/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/onboarding.md](./contracts/onboarding.md) · [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. The repository's binding policy (CLAUDE.md, "Test coverage requirements") mandates all three layers — unit (jsdom), adapter integration (jsdom), browser E2E (Playwright) — for every non-trivial change. Test tasks below are not optional.

**Organization**: Grouped by user story so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete work)
- **[Story]**: US1–US5 from spec.md
- Every task names its exact file path

## Path Conventions

Web SPA, layers `pages → features → core/shared → adapters`. Feature code in
`src/features/onboarding/`, shared utilities in `src/shared/`, migrations in
`supabase/migrations/`, RLS tests in `supabase/tests/`.

---

## Phase 1: Setup

**Purpose**: Skeleton and routing, so later tasks have somewhere to land.

- [ ] T001 Create the feature skeleton `src/features/onboarding/` with `steps/`, `understanding/`, `state/`, `components/` and an `index.ts` barrel exporting only `OnboardingFlow`
- [ ] T002 Add the `/onboard-brand/:slug` route beside the existing `/onboard-brand` entry in `src/App.tsx`, lazy-loaded like its sibling
- [ ] T003 [P] Create `src/shared/upload/index.ts` as the destination barrel for the intake utilities moved in T014

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The approved Foundation touch, the persistence for resume, the moved
utilities, and the flow shell. Every user story depends on this phase.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

### The approved Foundation touch (plan §9 — narrowly bounded)

- [ ] T004 In `src/domain/brand/coreMeta.ts`, change `recordCoreWrite` so a **system** actor writing a path with **no existing metadata entry** records `suggested`. Touch nothing else: `coreValueMeta`'s read default stays `provisional`/`imported`, human writes still record `provisional`, a system write over a settled value still demotes to `provisional`, and `assertActorMayReach`/INV-3 is unchanged
- [ ] T005 [P] Add focused cases to `src/domain/brand/__tests__/coreMeta.test.ts`: (a) fresh system write → `suggested`; (b) fresh human write → still `provisional`; (c) system write over a confirmed value → still demotes to `provisional`; (d) absent entry still READS as `provisional`/`imported` via `coreValueMeta`; (e) INV-3 still throws for a system actor reaching `confirmed`/`official`. Retitle the existing "an AI write lands at provisional" case to match its assertion

### Onboarding state persistence

- [ ] T006 [P] Create `supabase/migrations/20260814000000_018_brand_onboarding_state.sql` adding `ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS onboarding jsonb;` — idempotent, no backfill
- [ ] T007 [P] Create `supabase/migrations/down/018_brand_onboarding_state.down.sql` dropping the column, with a data-loss note
- [ ] T008 [P] Add the `onboarding?: OnboardingState` field to `Brand` in `src/shared/types/brand.ts`, shaped per data-model.md §1
- [ ] T009 Create `src/shared/onboarding/onboardingState.ts`: `readOnboardingState(brand)`, `markStep(brandId, step)`, `markComplete(brandId)`, `isUnfinished(brand)`. Absent column and `null` both read as finished; unrecognised `step`/`branch` degrade to `basics`/`existing` rather than throwing
- [ ] T010 Persist `onboarding` in `src/shared/services/brands.supabase.ts` — map it in `update`, read it in `mapFromDatabase`, and add `onboarding` to the `TOLERATED_COLS` list so a pre-migration environment still saves everything else
- [ ] T011 [P] Verify and, if needed, extend `src/features/brand/services/brands.local.ts` so `onboarding` round-trips through the localStorage snapshot
- [ ] T012 [P] Create `supabase/tests/018_onboarding_state.test.sql` — self-asserting: another account can neither read nor write a brand's `onboarding` column
- [ ] T013 [P] Unit tests for the helper in `src/shared/onboarding/__tests__/onboardingState.test.ts` covering every row of data-model.md §1's meaning table

### Move the proven intake utilities

- [ ] T014 Move `src/features/onboarding-v4/utils/assetUpload.ts` to `src/shared/upload/intake.ts` with its exports unchanged (`collectDroppedFiles`, `filterFolderPick`, `enqueueFile`, `hashFile`, `isSupportedUploadFile`, `extractDominantColors`, `imageFileHasAlpha`, `imageAspectRatio`, `normalizeHex`, `svgFileToVariants`, `rasterFileToVariants`, `recolorSvgString`)
- [ ] T015 [P] Move `src/features/onboarding-v4/utils/{fontFamily,logoFamily}.ts` and their existing test files to `src/shared/upload/`, keeping the suites green without rewriting them
- [ ] T016 Update every importer of the moved modules to the new paths; `npm run typecheck:ci` is the completeness check

### Flow shell

- [ ] T017 Create `src/features/onboarding/OnboardingFlow.tsx` — the step machine (`basics → material → review`), reading the authoritative step from the brand's onboarding marker and treating `?step=` as advisory
- [ ] T018 Create `src/features/onboarding/steps/BasicsStep.tsx` — name, branch choice, optional description. Naming CREATES the brand via `createBrandResilient` and writes the onboarding marker (FR-007)
- [ ] T019 Add route guards in `OnboardingFlow.tsx`: unauthenticated → login; brand not owned → not-found decided at the data layer; `completedAt` set → redirect to `/b/:slug/setup`; out-of-range `?step=` → the recorded step
- [ ] T020 Create `src/features/onboarding/understanding/finish.ts` implementing the finish contract (contracts §5) — ordering, `markComplete`, navigation to `?then=` or Setup, and idempotence on a second call
- [ ] T021 Add the synchronous re-entrancy guard to `BasicsStep` and `finish.ts` so a same-tick double activation or a re-entry cannot produce a second brand (FR-005)
- [ ] T022 [P] Create `src/features/onboarding/components/StepHeader.tsx` from DS primitives (`DsEyebrow`, `DsProgress`) — no hardcoded visual values
- [ ] T023 [P] Create `src/features/onboarding/state/onboardingStore.ts` — transient UI state only (current branch, in-flight uploads, selection). No brand values, no material.

### Boundary guard tests

- [ ] T024 [P] Create `src/features/onboarding/__tests__/boundaries.test.ts` asserting `features/onboarding` has no import path to the kit-adoption service or design storage (FR-030), modelled on 001's context-isolation test
- [ ] T025 [P] Extend the same file to assert the feature never sends `assets`, `brandAssets` or `logoAssets` in a brand patch (FR-026)
- [ ] T026 [P] Assert in the same file that `understanding/interpret.ts` imports no service or store — it must stay pure (contracts §2 guard 1)

**Checkpoint**: the brand can be named and created, resume state persists, the shell navigates, and the boundaries are enforced.

---

## Phase 3: User Story 1 — Bring an existing brand and have it understood (P1) 🎯 MVP

**Goal**: A user drops real material and sees what BrandingOS understood, correctly grouped, before anything is confirmed.

**Independent Test**: complete the flow with a logo, a font file, a palette image, a PDF and a link; verify every item appears under the right group and nothing is dropped (quickstart S1).

### Tests for User Story 1

- [ ] T027 [P] [US1] Unit tests in `src/features/onboarding/understanding/__tests__/interpret.test.ts` — material and description map to the correct `CoreFieldPath` with the correct provenance per data-model.md §4; unmappable input emits nothing and leaves its item unplaced
- [ ] T028 [P] [US1] Adapter integration test in `src/features/onboarding/__tests__/materialToLibrary.test.ts` — uploaded material becomes Library items on BOTH adapters, with `contentHash` set and no `data:` URL on the brand record
- [ ] T029 [P] [US1] Browser E2E in `src/features/onboarding/__tests__/uploadJourney.browser.test.tsx` — basics → material → review with a realistic file set, asserting group placement and that nothing is lost

### Implementation for User Story 1

- [ ] T030 [P] [US1] Create `src/features/onboarding/understanding/proposals.ts` — the `Proposal` type and the source → `CoreFieldPath` → op map from data-model.md §4
- [ ] T031 [US1] Create `src/features/onboarding/understanding/interpret.ts` — pure, two-tier (assisted parse via the existing `parseDescription`, deterministic fallback), deterministic ordering, evidence on every proposal, never throws for want of the assisted tier
- [ ] T032 [US1] Create `src/features/onboarding/steps/MaterialStep.tsx` — `DsDropZone` intake wired to `src/shared/upload/intake.ts`, uploading each item to the Library through `IAssetsService.create` as it arrives (FR-013)
- [ ] T033 [US1] Create `src/features/onboarding/components/LogoSlotBoard.tsx` — the existing slot routing and swap/demote planning, rebuilt on `DsLogoTile` + `DsMenu`
- [ ] T034 [US1] Write logo placements as `logoSystem` references via `stageLogoRef` in `MaterialStep`, using the id the Library returned — never the staged content-hash id (research §R4)
- [ ] T035 [P] [US1] Create `src/features/onboarding/components/ColorBoard.tsx` on `DsSwatchRow` — extracted, suggested and manually added swatches, with lock and set-primary
- [ ] T036 [P] [US1] Render fonts, documents and links with `DsAssetRow` in `src/features/onboarding/components/MaterialGroups.tsx`
- [ ] T037 [US1] Surface uninterpreted material as an explicit "unplaced" group in `MaterialGroups.tsx` (FR-021) — never discard
- [ ] T038 [US1] Write proposals into Core as `suggested` values through the canonical ops with a `SystemActor` and the mapped provenance, in `src/features/onboarding/understanding/applyProposals.ts`
- [ ] T039 [US1] Add the understanding state to `OnboardingFlow.tsx` — `LoadingPill` (never a ring spinner), proposals rendered incrementally as they arrive, auto-advancing into Review
- [ ] T040 [US1] Report per-item rejection with a reason in `MaterialStep.tsx`, without aborting the rest of the batch (FR-016)

**Checkpoint**: US1 is demonstrable end to end — material in the Library, logos referenced, proposals visible.

---

## Phase 4: User Story 2 — Start a new brand from scratch (P1)

**Goal**: A user with no material converges into the same review and the same brand shape.

**Independent Test**: complete the from-scratch branch and compare the resulting brand with a US1 brand — same concepts, same write authorities, different values (quickstart S2).

### Tests for User Story 2

- [ ] T041 [P] [US2] Browser E2E in `src/features/onboarding/__tests__/fromScratchJourney.browser.test.tsx` — the from-scratch journey through to finish
- [ ] T042 [P] [US2] Unit test in `src/features/onboarding/__tests__/branchParity.test.ts` — brands from both branches populate the same concepts through the same write paths (SC-007)

### Implementation for User Story 2

- [ ] T043 [US2] Add branch selection to `src/features/onboarding/steps/BasicsStep.tsx` using `DsSegmented`, persisted to the onboarding marker
- [ ] T044 [US2] Create `src/features/onboarding/components/DirectionPicker.tsx` — colour and typographic directions from the existing `data/{suggestedPalettes,popularPalettes,styleCards,suggestedFonts}.ts`, with lock and shuffle
- [ ] T045 [US2] Branch `MaterialStep.tsx` to render `DirectionPicker` instead of the dropzone when the branch is `new`, feeding the same brand record
- [ ] T046 [US2] Map a chosen direction to proposals in `understanding/proposals.ts` — tone and typography only for the MVP, per data-model.md §4's note on `visualStyle`
- [ ] T047 [US2] Preserve everything already captured when the user switches branch, in `BasicsStep.tsx` (FR-010)

**Checkpoint**: both branches reach the same review with the same brand shape.

---

## Phase 5: User Story 3 — Review and correct before confirming (P1)

**Goal**: Per-value human acceptance is the only thing that raises a value above suggestion.

**Independent Test**: change a proposal in every group, finish, and verify the corrections — not the proposals — are what the brand carries, at the right authority (quickstart S3).

### Tests for User Story 3

- [ ] T048 [P] [US3] Unit test in `src/features/onboarding/understanding/__tests__/acceptance.test.ts` — `acceptProposal` performs exactly one promotion, for exactly the path given
- [ ] T049 [P] [US3] Unit test in the same file — `acceptAll` produces `IdentityMeta` byte-identical to accepting each path individually, with no group-level record (FR-025c)
- [ ] T050 [P] [US3] Unit test in the same file — `editValue` writes through the canonical op AND promotes, so a user edit lands at `confirmed` rather than `provisional` (FR-025)
- [ ] T051 [P] [US3] Browser E2E in `src/features/onboarding/__tests__/perValueAcceptance.browser.test.tsx` — open and scroll past proposals without accepting, finish, assert every untouched value is still below `confirmed` and none is `official` (FR-025a, FR-025b, FR-025d)

### Implementation for User Story 3

- [ ] T052 [US3] Create `src/features/onboarding/understanding/acceptance.ts` — `acceptProposal`, `acceptAll`, `editValue`; the ONLY module in the feature that calls `promoteCoreValue`, with the target authority hard-coded to `'confirmed'`
- [ ] T053 [US3] Create `src/features/onboarding/steps/ReviewStep.tsx` — renders the brand's Core values filtered by authority; a proposal is simply a value below `confirmed`
- [ ] T054 [US3] Create `src/features/onboarding/components/ProposalCard.tsx` — accept and edit affordances, and a settled-vs-pending treatment that needs no permanent badge (FR-024)
- [ ] T055 [US3] Wire accept-all in `ReviewStep.tsx` as a loop over `acceptProposal` — no separate code path, no group-level authority
- [ ] T056 [US3] Wire remove/reject in `ReviewStep.tsx` — the value is not promoted, and a Context signal is recorded (FR-023)
- [ ] T057 [P] [US3] Add a test to `acceptance.test.ts` asserting that rendering `ReviewStep` performs zero promotions — no acceptance may be triggered from a render path, mount effect, observer or scroll handler (FR-025a)

**Checkpoint**: acceptance semantics are exactly as locked — per value, explicit, never `official`.

---

## Phase 6: User Story 4 — The brand you land on is already correct (P2)

**Goal**: Everything supplied is where it belongs, nothing supplied is lost, nothing extra is generated.

**Independent Test**: complete with material in every category, then verify a one-to-one match between the review and the brand in Setup and the Library (quickstart S1 step 5, S5).

### Tests for User Story 4

- [ ] T058 [P] [US4] Adapter integration test in `src/features/onboarding/__tests__/businessInfo.test.ts` — business facts persist on BOTH adapters
- [ ] T059 [P] [US4] Browser E2E in `src/features/onboarding/__tests__/brandIsCorrect.browser.test.tsx` — every item in the review is present and resolvable in the created brand (SC-003)
- [ ] T060 [P] [US4] Test in `src/features/onboarding/__tests__/noDeliverables.test.ts` — a completed onboarding produces zero kit adoptions, guidelines, templates or designs (SC-005)

### Implementation for User Story 4

- [ ] T061 [US4] Write business facts to `businessInfo` in `src/features/onboarding/understanding/applyProposals.ts` — links, website, audience summary, description, industry only (research §R7)
- [ ] T062 [US4] Record Context signals in `src/features/onboarding/understanding/context.ts` — a `preference` signal on a rejected proposal, a `reference` signal on material flagged as reference. Fire-and-forget; a failure is swallowed and never blocks (FR-029)
- [ ] T063 [US4] Implement per-slice failure reporting in `finish.ts` and `MaterialStep.tsx` — anything not stored is named to the user, and success is never reported for an unstored write (FR-031)

**Checkpoint**: the storage guarantees hold on both backends, and the flow closes the authenticated asset-loss defect.

---

## Phase 7: User Story 5 — Never trapped (P2)

**Goal**: Skip, go back, leave, resume anywhere, and return to where you came from.

**Independent Test**: skip every optional step, navigate backwards, close and reopen from another session, finish, and land on the `?then=` destination (quickstart S6–S8, S12).

### Tests for User Story 5

- [ ] T064 [P] [US5] Browser E2E in `src/features/onboarding/__tests__/continuity.browser.test.tsx` — name-only finish, browser Back through steps, resume after reload, `?then=` return, and double-submit producing exactly one brand
- [ ] T065 [P] [US5] Adapter integration test in `src/features/onboarding/__tests__/preMigrationTolerance.test.ts` — with the `onboarding` column absent, every save still succeeds and only resume degrades (quickstart S9)

### Implementation for User Story 5

- [ ] T066 [US5] Implement backward navigation in `OnboardingFlow.tsx` including the browser Back control, via history entries per step, with no data loss (FR-034)
- [ ] T067 [US5] Implement resume in `OnboardingFlow.tsx` — `/onboard-brand/:slug` reads the marker and lands on the recorded step, in any session on any device (FR-035)
- [ ] T068 [US5] Surface unfinished brands in `src/pages/dashboard/brands` and the `AppRail` brand switcher — marked unfinished, resumable, and deletable (FR-009, SC-010)
- [ ] T069 [US5] Add a `DsConfirmDialog` discard flow for an unfinished brand, naming what will be lost, in `src/features/onboarding/components/DiscardBrandDialog.tsx`
- [ ] T070 [US5] Preserve `?then=` across every step, branch switch, redirect and resumed session in `OnboardingFlow.tsx` (FR-036)
- [ ] T071 [US5] Make every step skippable except the name in `OnboardingFlow.tsx`, so a name-only brand can finish (FR-033)

**Checkpoint**: all five stories independently functional.

---

## Phase 8: Polish, then Retirement

**Purpose**: Cross-cutting quality, then the deletion the feature is gated on.

### Polish

- [ ] T072 [P] Responsive pass across `src/features/onboarding/` — phone, tablet, desktop (FR-038)
- [ ] T073 [P] Accessibility pass across `src/features/onboarding/` — keyboard operation and assistive-technology labels on every interactive control (FR-039)
- [ ] T074 [P] Verify zero hardcoded visual values in `src/features/onboarding/` — `--ds-*` tokens only (plan §11)

### Retirement — gated on every acceptance criterion above passing (FR-041)

> **Do not start T075 until Phases 1–7 are complete and quickstart S1–S12 pass on both storage backends.**

- [ ] T075 Delete `src/features/onboarding-v4/` in full, including `styles/cosmos.css`
- [ ] T076 Delete `src/pages/onboard-brand/create.tsx` and its route entry in `src/App.tsx`
- [ ] T077 Redirect `/onboard-brand/create` to `/onboard-brand` preserving the query string, in `src/App.tsx`; confirm the existing `src/pages/onboarding-brand/index.tsx` shim still resolves (FR-042)
- [ ] T078 Update `src/features/dev-product-map/registry.ts` and `src/features/dev-features/features-registry.ts` to describe the single surviving flow
- [ ] T079 Verify no dangling references: `rg -n "onboarding-v4|cosmos\.css" src/` returns nothing
- [ ] T080 Run the full gate — `npm run lint`, `npm run typecheck:ci`, `npm run test` — all green
- [ ] T081 Run the RLS suite: `supabase db query --linked -f supabase/tests/018_onboarding_state.test.sql`
- [ ] T082 Execute quickstart.md S1–S12 on both storage backends and record the results
- [ ] T083 [P] Update `CLAUDE.md`'s onboarding section and `specs/002-onboarding-v3/spec.md` status to reflect the shipped flow

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies
- **Phase 2 (Foundational)**: depends on Phase 1 — **BLOCKS every user story**
- **Phase 3–7 (User Stories)**: all depend on Phase 2
- **Phase 8 (Polish + Retirement)**: retirement depends on Phases 3–7 complete AND validated

### User story dependencies

- **US1 (P1)**: after Phase 2. No dependency on other stories. **This is the MVP.**
- **US2 (P1)**: after Phase 2. Reuses US1's review but is independently testable via T041/T042.
- **US3 (P1)**: after Phase 2. Testable against proposals from either branch; US1 is the convenient source.
- **US4 (P2)**: after US1 (needs material flowing) — verifies the end state.
- **US5 (P2)**: after Phase 2. Independent of the others.

### Within each story

- Tests are written first and must fail before implementation
- Types and pure functions before the components that consume them
- `understanding/` before the steps that call it
- Story complete and checkpointed before moving on

### Parallel opportunities

- T005–T013 are largely independent (Foundation touch, migration, state helper, RLS test)
- T014–T016 (the utility move) can run alongside T017–T023 (the shell) — different files
- All tests within a story marked [P] can run together
- US2, US3 and US5 can be worked in parallel by different people once Phase 2 lands
- T072–T074 (polish) can run in parallel

---

## Parallel Example: Phase 2 Foundational

```bash
# The Foundation touch, the migration, and the type can all go at once:
Task: "T004 recordCoreWrite fresh system write → suggested in src/domain/brand/coreMeta.ts"
Task: "T006 migration 018 in supabase/migrations/"
Task: "T008 Brand.onboarding field in src/shared/types/brand.ts"

# Then the tests and the RLS suite together:
Task: "T005 focused coreMeta cases"
Task: "T012 RLS test in supabase/tests/018_onboarding_state.test.sql"
Task: "T013 onboardingState helper unit tests"
```

## Parallel Example: User Story 1

```bash
# All three test layers first:
Task: "T027 interpret() unit tests"
Task: "T028 material→Library adapter integration test"
Task: "T029 upload journey browser E2E"

# Then the independent components:
Task: "T035 ColorBoard"
Task: "T036 MaterialGroups rows"
```

---

## Implementation Strategy

### MVP (Phases 1–3)

1. Phase 1 Setup
2. Phase 2 Foundational — includes the approved Foundation touch and the migration
3. Phase 3 US1 — bring an existing brand and see it understood
4. **STOP and VALIDATE**: quickstart S1 on both backends

At this point a user can bring a brand and get a real, Library-backed, correctly
referenced brand out of it. Values sit at `suggested` until Phase 5 adds
acceptance, which is honest rather than broken — nothing has been promoted that a
human did not decide.

### Incremental delivery

1. Phases 1–2 → foundation ready
2. + US1 → MVP, validate, demo
3. + US2 → both branches converge
4. + US3 → acceptance semantics complete; the flow is constitutionally whole
5. + US4 → storage guarantees verified end to end
6. + US5 → continuity
7. + Phase 8 → polish, then delete the superseded flow

### Retirement discipline

Phase 8's deletion block is the feature's completion criterion (FR-041), not
housekeeping. It runs last, after validation, and it is a single revertible
commit — that is the whole rollback plan.

---

## Notes

- 83 tasks: 3 setup, 23 foundational, 14 US1, 7 US2, 10 US3, 6 US4, 8 US5, 12 polish/retirement
- The Foundation touch is exactly two tasks (T004, T005) and changes one branch of one function. Anything beyond that is out of scope
- Every task names a file path; [P] means a genuinely different file with no incomplete dependency
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own
- Both storage backends are first-class throughout — a behaviour that works on only one is not done
