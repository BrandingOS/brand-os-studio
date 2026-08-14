---

description: "Task list for 002 — Onboarding V3 (incl. revision R1)"
---

# Tasks: Onboarding V3

**Input**: Design documents from `/specs/002-onboarding-v3/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/onboarding.md](./contracts/onboarding.md) · [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. The repository's binding policy (CLAUDE.md, "Test coverage requirements") mandates all three layers — unit (jsdom), adapter integration (jsdom), browser E2E (Playwright) — for every non-trivial change.

---

## Status

| | Tasks | State |
|---|---|---|
| **Original list (T001–T083)** | 83 | 82 done · 1 blocked on an owner deploy (T081) |
| **Revision R1 (T084–T146)** | 63 | Not started — awaiting design approval |

**R1 reconciliation rule**: the Foundation touch, migration 022, the intake move,
the Library write path, `applyProposals`, `acceptance`, `createBrand`, `finish`,
the sentinel mechanism, resume, and the unfinished-brand state are **done and are
not re-done**. R1 rebuilds the four screens above that pipeline and adds the brief,
the vocabularies, the processing moment and the six-section review.

Original tasks superseded by R1 are marked **[SUPERSEDED]** in place rather than
deleted — the record of what shipped stays readable.

---

# Part A — Revision R1 (active)

## Phase 9: Shell + screen split

**Purpose**: Four screens, name alone on the first. Everything else lands on this.

- [ ] T084 Extend `ONBOARDING_STEPS` in `src/shared/onboarding/onboardingState.ts` to `['name','profile','material','review']`, keep the "unrecognised step degrades to the first" behaviour, and drop the `branch` field from `OnboardingState` (FR-002, FR-043)
- [ ] T085 [P] Update `src/shared/onboarding/__tests__/onboardingState.test.ts` for the new vocabulary, adding a case that a brand recorded at the retired `'basics'` step resumes at `'name'` rather than throwing
- [ ] T086 Create `src/features/onboarding/steps/NameStep.tsx` — brand name only, title plainly about setting up a brand, `DsInput` + primary action; creates the brand via the existing `buildCreateInput` path (FR-006, FR-007, FR-044)
- [ ] T087 Create `src/features/onboarding/steps/ProfileStep.tsx` — the large description surface on `DsTextArea` with FR-049 guiding placeholder, and a slot for the Build-with-AI helper (FR-011)
- [ ] T088 Rework the step machine in `src/features/onboarding/OnboardingFlow.tsx` for four steps, keeping brand-as-authority, `?step=` as advisory, the finished-brand guard, history-per-step, and `?then=` preservation (FR-034, FR-036, FR-043)
- [ ] T089 Move the description hand-off from `sessionStorage` to the brand — persist the raw text as `brand.onboarding.brief` (the JSONB the flow already owns) when leaving `ProfileStep`, so resume on another device still has it. It MUST NOT be written to `businessInfo.description`, which belongs to products/services (FR-035, Principle II)
- [ ] T090 Delete `src/features/onboarding/steps/BasicsStep.tsx` and every reference to it (FR-073)
- [ ] T091 [P] Browser E2E in `src/features/onboarding/__tests__/screenSplit.browser.test.tsx` — name screen asks only for a name; profile screen carries the description; back/forward across all four steps loses nothing

**Checkpoint**: four screens navigate, the brand is created at the name step, resume works on the new vocabulary.

---

## Phase 10: Controlled vocabularies

**Purpose**: Make categorical brand facts usable. Pure, no UI.

> **T092's style list depends on plan §9b.** If the union is not widened, this task
> ships the existing eight members and nothing else in R1 changes.

- [ ] T092 Create `src/features/onboarding/vocabulary/vocabularies.ts` — closed lists for industry, style, personality, tone and values, each member carrying a stable id and a human label (FR-047)
- [ ] T093 Create `src/features/onboarding/vocabulary/normalize.ts` — free text → vocabulary member, with `Other` preserving the user's exact wording when nothing fits (FR-054)
- [ ] T094 [P] Unit tests in `src/features/onboarding/vocabulary/__tests__/normalize.test.ts` — every member round-trips; case/plural/synonym near-misses map; a genuine miss becomes `Other` with wording intact; nothing is silently coerced
- [ ] T095 [P] Unit test in the same folder asserting `vocabulary/` imports no service, store or React (purity guard)
- [ ] T096 **[BLOCKED on plan §9b approval]** Widen `StyleDescriptor` in `src/domain/brand/identity.ts` and the matching `z.enum` in `src/domain/brand/invariants.ts` with the additional members. Additive only — no removal, no rename, no migration
- [ ] T097 [P] **[BLOCKED with T096]** Extend `src/domain/brand/__tests__/coreFieldPaths.test.ts`'s fixture and add a case asserting every vocabulary style member validates against the schema

---

## Phase 11: The brief

**Purpose**: The Build-with-AI path — prompt out, structured plain text back.

- [ ] T098 Create `src/features/onboarding/brief/prompt.ts` — builds the prompt from the brand name, embedding the vocabularies inline, demanding plain-text labelled lines, the lightweight-profile constraint, and the colours/fonts "existing, else three directions" rule (FR-046, FR-047, FR-048)
- [ ] T099 Create `src/features/onboarding/brief/parseBrief.ts` — `looksLikeBrief()` (≥3 recognised labels at line starts) and `parseBrief()`, deterministic, tolerant of label casing and of a partial brief (FR-052). **The Colors and Fonts answers are two-mode** (FR-048): concrete existing values rank `brief`, while offered *directions* rank `ai` and become suggestions — a direction MUST NEVER be parsed as the brand's actual palette or typeface (FR-056)
- [ ] T100 [P] Unit tests in `src/features/onboarding/brief/__tests__/parseBrief.test.ts` — a full brief; a partial brief; a prose paragraph that must NOT be detected; an out-of-vocabulary answer; a brief with sections in a different order; **a brief offering three palette directions, asserting they arrive ranked `ai` and none becomes `colors.primary`** (FR-048, SC-016)
- [ ] T101 [P] Unit test in the same folder asserting a prompt built by `prompt.ts` round-trips through `parseBrief` when answered in the documented shape (the two-way contract, SC-012)
- [ ] T102 Create `src/features/onboarding/brief/BuildWithAI.tsx` — copy prompt, open in ChatGPT, open in Claude, on `DsButton` + `DsMenu`, with a clipboard fallback for insecure contexts (FR-045)
- [ ] T103 [P] Unit test asserting `brief/prompt.ts` and `brief/parseBrief.ts` import no service, store or React (purity guard)
- [ ] T104 Wire `BuildWithAI` into `ProfileStep.tsx`

---

## Phase 12: Adaptive understanding + source priority

**Purpose**: Route by input shape, merge by source rank, ask only what is missing.

- [ ] T105 Create `src/features/onboarding/understanding/sources.ts` — the rank enum and the pure merge that keeps the highest-ranked candidate per Core path (FR-056)
- [ ] T106 [P] Unit tests in `src/features/onboarding/understanding/__tests__/sources.test.ts` — the full rank matrix, and re-running understanding never displaces a higher-ranked value (SC-016)
- [ ] T107 Extend `src/features/onboarding/understanding/interpret.ts` — route brief vs prose per FR-052/FR-053, normalise categorical answers through `vocabulary/normalize.ts`, and emit every candidate through `sources.ts` (FR-054)
- [ ] T108 Create `src/features/onboarding/understanding/questions.ts` — derive the open questions: only genuinely missing or ambiguous AND materially useful, ordered by importance, bounded, categorical ones carrying their vocabulary (FR-055)
- [ ] T109 [P] Unit tests in `src/features/onboarding/understanding/__tests__/questions.test.ts` — a fully-determined brand yields zero questions; a name-only brand yields a short ordered set; no question duplicates a value already determined
- [ ] T110 Extend `src/features/onboarding/understanding/proposals.ts` — the six review sections, their labels, and `sectionFor` covering the new paths (FR-064)
- [ ] T111 Extend `src/features/onboarding/understanding/hydrate.ts` for the six sections so resume rebuilds the new review
- [ ] T112 Route business facts — industry, slogan, products/services, audience summary — to `businessInfo` in `applyProposals.ts`, and confirm no Core mirror is written (FR-028, Principle II)
- [ ] T113 [P] Extend `src/features/onboarding/__tests__/boundaries.test.ts` — only `understanding/sources.ts` may construct a `Proposal`, and `brief/`+`vocabulary/` stay pure
- [ ] T114 [P] Adapter integration test in `src/features/onboarding/__tests__/vocabularyPersistence.test.ts` — categorical values persist as vocabulary members on BOTH adapters (SC-013)

---

## Phase 13: Material step

**Purpose**: The old dropzone, restored, with the new limits and the website field.

- [ ] T115 Rebuild `src/features/onboarding/steps/MaterialStep.tsx` on the retired `BrandDropzone` interaction — drag/drop, folder drop, click-to-pick, the item strip with per-item remove and clear-all — on `DsDropZone` (FR-012, FR-062)
- [ ] T116 Add the optional website field to `MaterialStep.tsx`, persisted to `businessInfo.contact.website` (FR-050)
- [ ] T117 Enforce FR-051 in `src/shared/upload/intake.ts` and `MaterialStep.tsx` — 10 files total, 5 MB per file, applied after folder/archive expansion, refusing per item with a reason and never aborting the batch (FR-016)
- [ ] T118 [P] Unit tests in `src/shared/upload/__tests__/limits.test.ts` — the 11th file is refused; an oversized file is refused; a folder drop that exceeds the total accepts what fits and names the rest
- [ ] T119 Delete `src/features/onboarding/understanding/directions.ts` and its branch affordance; move starting suggestions into the review's Colors and Fonts sections (FR-002, FR-073)

---

## Phase 14: Logo classification

- [ ] T120 Create `src/features/onboarding/understanding/logoClassify.ts` — exact-duplicate rejection by content hash, near-duplicate variant grouping via the existing `shared/upload/logoFamily` helpers, and evidence-only role assignment across primary, wordmark, mark, on-light, on-dark, horizontal and vertical (FR-065)
- [ ] T121 [P] Unit tests in `src/features/onboarding/understanding/__tests__/logoClassify.test.ts` — duplicates collapse to one; near-duplicates group; a role with no supporting evidence is left empty rather than guessed (SC-018)
- [ ] T122 Emit logo roles as proposals through `sources.ts`, so a user drag/swap outranks classification (FR-056)

---

## Phase 15: The processing moment

- [ ] T123 Create `src/features/onboarding/understanding/stages.ts` — the stage machine, where a stage exists only when the work it names is scheduled, each carrying its copy, its symbol node, and a `run` that may return a small real finding (FR-058, FR-059)
- [ ] T124 [P] Unit tests in `src/features/onboarding/understanding/__tests__/stages.test.ts` — a name-only brand constructs zero file stages so their copy is unrepresentable; a stage's finding reflects real output (SC-014)
- [ ] T125 **[Requires plan §11a approval]** Add an optional `activeNodes?: number[]` to `src/shared/ds/BrandMark.tsx`, leaving every existing call site byte-identical, with a case in `src/shared/ds/ds.test.tsx`
- [ ] T126 Create `src/features/onboarding/components/UnderstandingMark.tsx` — the centre-out activation, connections to the centre, and findings feeding in; subtle motion on the DS easing, honouring `prefers-reduced-motion` (FR-057, FR-060)
- [ ] T127 Create `src/features/onboarding/steps/UnderstandingStage.tsx` — the transition screen: the mark, the live stage copy, the findings, and the ~1.2s minimum beat applied as a floor on the screen after the work resolves (FR-061)
- [ ] T128 [P] Browser E2E in `src/features/onboarding/__tests__/processing.browser.test.tsx` — the moment renders for at least one full beat on a name-only brand, shows no percentage, and shows no copy for work that did not run (SC-014, SC-015)

---

## Phase 16: Review rebuild

- [ ] T129 Create `src/features/onboarding/review/ReviewCard.tsx` — the restored section anatomy (head · right-aligned count · body · foot) plus the section-level "Looks right", widened and with a more generous vertical rhythm (FR-062, FR-025c)
- [ ] T130 [P] Create `src/features/onboarding/review/BrandSummaryBar.tsx` — name, slogan, industry, style; slogan inline-editable as in the retired brand bar (FR-063)
- [ ] T131 Create `src/features/onboarding/review/LogosSection.tsx` — classified slots on `DsLogoTile`, drag/swap/add/remove, `planPrimarySwap` reused (FR-065)
- [ ] T132 [P] Create `src/features/onboarding/review/ColorsSection.tsx` — source-priority resolution, add colour, extract from logo, extract from image, suggest palettes when there is nothing to extract from (FR-066)
- [ ] T133 [P] Create `src/features/onboarding/review/FontsSection.tsx` — uploaded/known fonts first, suggested typography offered as **pairings** only, with rename per family (FR-023, FR-067)
- [ ] T134 Create `src/features/onboarding/review/ProfileSection.tsx` — `DsChip` selections for industry/style/personality/tone/values, concise text for summary/audience/positioning/mission, and the open questions rendered inline and progressively (FR-055, FR-068)
- [ ] T135 [P] Create `src/features/onboarding/review/OnlineSection.tsx` — website + social links with the retired platform detection restored, **and an add-a-link affordance** — and `review/FilesSection.tsx` — remaining Library material including anything unplaced, **with rename and remove per item** (FR-021, FR-023, FR-069)
- [ ] T136 Rewrite `src/features/onboarding/steps/ReviewStep.tsx` to compose the six sections, keep per-value acceptance exactly as shipped, remove every authority/provenance term from the interface, and label the final action "Open my brand" (FR-064, FR-070, FR-071)

---

## Phase 17: Restore, polish, retire

- [ ] T137 [P] Restore `data/{suggestedPalettes,popularPalettes,colorHuntPalettes,suggestedFonts}.ts` and `data/socialPlatforms.tsx` from `904801a^` into `src/features/onboarding/data/`, repointing imports; do NOT restore `styleCards.ts` (plan §6a)
- [ ] T138 [P] Extend `src/features/onboarding/onboarding.css` for the restored anatomy — `--ds-*` only, wider container, and the mobile bottom-padding allowance so the sticky CTA never covers the last row (FR-072, plan §11b)
- [ ] T139 [P] Responsive pass across the four screens — phone, tablet, desktop (FR-038)
- [ ] T140 [P] Accessibility pass — keyboard operation and assistive-technology labels on every new control, including the chip sets and the logo drag (FR-039)
- [ ] T141 [P] Browser E2E in `src/features/onboarding/__tests__/reviewInteraction.browser.test.tsx` — drag a logo between slots, extract colours from the logo, pick a font pairing, choose a personality chip, "Looks right" one section, finish
- [ ] T142 [P] Browser E2E asserting no authority or provenance vocabulary appears anywhere in the rendered flow — a DOM scan for the banned terms (SC-017)
- [ ] T143 Verify one implementation per screen and no dangling references: `rg -n "BasicsStep|directions\.ts|branch" src/features/onboarding/` returns nothing meaningful (FR-073)
- [ ] T144 Run the full gate — `npm run lint`, `npm run typecheck:ci`, `npm run test` — all green
- [ ] T145 Execute quickstart.md end to end on both storage backends, including the brief journey and the prose journey, and record the results
- [ ] T146 [P] Update `CLAUDE.md`'s onboarding section for the R1 flow and set the spec status

---

## R1 dependencies

```text
Phase 9  (shell)          ─┬─▶ Phase 13 (material)  ─┬─▶ Phase 14 (logos) ─┐
                           │                          │                     │
Phase 10 (vocabularies) ──┼─▶ Phase 11 (brief) ──────┼─▶ Phase 12 ─────────┼─▶ Phase 16 (review)
                           │                          │   (understanding)   │
                           └──────────────────────────┴─▶ Phase 15 ─────────┘
                                                          (processing)
                                                                            └─▶ Phase 17
```

- Phase 10 blocks 11 (the prompt embeds the vocabularies) and 12 (normalisation).
- Phase 12 blocks 16 (the review renders proposals and questions).
- Phases 14 and 15 are independent of each other and can run in parallel.
- T096/T097 are blocked on plan §9b; T125 on plan §11a. Neither blocks any other task.

## R1 parallel opportunities

- T092–T095 (vocabularies) alongside T098–T101 (prompt + parser) — different folders
- T131–T135 (the five section components) — different files, one shared card shell
- Every `[P]` test task within a phase

---

# Part B — Original task list (shipped 2026-08-14, retained as the record)

## Phase 1: Setup

- [X] T001 Create the feature skeleton `src/features/onboarding/` with `steps/`, `understanding/`, `state/`, `components/` and an `index.ts` barrel exporting only `OnboardingFlow`
- [X] T002 Add the `/onboard-brand/:slug` route beside the existing `/onboard-brand` entry in `src/App.tsx`, lazy-loaded like its sibling
- [X] T003 [P] Create `src/shared/upload/index.ts` as the destination barrel for the intake utilities moved in T014

## Phase 2: Foundational

### The approved Foundation touch (plan §9 — narrowly bounded)

- [X] T004 In `src/domain/brand/coreMeta.ts`, change `recordCoreWrite` so a **system** actor writing a path with **no existing metadata entry** records `suggested`
- [X] T005 [P] Add focused cases to `src/domain/brand/__tests__/coreMeta.test.ts` covering the five band cases

### Onboarding state persistence

- [X] T006 [P] Create `supabase/migrations/20260814000000_022_brand_onboarding_state.sql` — idempotent, no backfill
- [X] T007 [P] Create `supabase/migrations/down/022_brand_onboarding_state.down.sql`
- [X] T008 [P] Add the `onboarding?: OnboardingState` field to `Brand` in `src/shared/types/brand.ts`
- [X] T009 Create `src/shared/onboarding/onboardingState.ts` *(vocabulary revised by T084)*
- [X] T010 Persist `onboarding` in `src/shared/services/brands.supabase.ts` including `TOLERATED_COLS`
- [X] T011 [P] Verify `onboarding` round-trips through the localStorage snapshot
- [X] T012 [P] Create `supabase/tests/022_onboarding_state.test.sql`
- [X] T013 [P] Unit tests in `src/shared/onboarding/__tests__/onboardingState.test.ts` *(extended by T085)*

### Move the proven intake utilities

- [X] T014 Move `assetUpload.ts` → `src/shared/upload/intake.ts`
- [X] T015 [P] Move `{fontFamily,logoFamily}.ts` and their tests to `src/shared/upload/`
- [X] T016 Update every importer of the moved modules

### Flow shell

- [X] T017 Create `src/features/onboarding/OnboardingFlow.tsx` *(reworked by T088)*
- [X] T018 Create `src/features/onboarding/steps/BasicsStep.tsx` — **[SUPERSEDED by T086/T087/T090]**
- [X] T019 Add route guards in `OnboardingFlow.tsx`
- [X] T020 Create `src/features/onboarding/understanding/finish.ts`
- [X] T021 Add the synchronous re-entrancy guard
- [X] T022 [P] Create `StepHeader.tsx` from DS primitives
- [X] T023 [P] Create `src/features/onboarding/state/onboardingStore.ts` — transient UI state only

### Boundary guard tests

- [X] T024 [P] `boundaries.test.ts` — no import path to kit-adoption or design storage (FR-030)
- [X] T025 [P] No `assets`/`brandAssets`/`logoAssets` in a brand patch (FR-026)
- [X] T026 [P] `understanding/interpret.ts` imports no service or store

## Phase 3: US1 — Bring an existing brand

- [X] T027 [P] [US1] Unit tests in `understanding/__tests__/interpret.test.ts`
- [X] T028 [P] [US1] Adapter integration test — material becomes Library items on BOTH adapters
- [X] T029 [P] [US1] Browser E2E — basics → material → review with a realistic file set
- [X] T030 [P] [US1] Create `understanding/proposals.ts` *(extended by T110)*
- [X] T031 [US1] Create `understanding/interpret.ts` *(extended by T107)*
- [X] T032 [US1] Create `steps/MaterialStep.tsx` *(rebuilt by T115)*
- [X] T033 [US1] Create `components/LogoSlotBoard.tsx` *(rebuilt as `review/LogosSection.tsx` by T131)*
- [X] T034 [US1] Write logo placements as `logoSystem` references
- [X] T035 [P] [US1] Create `components/ColorBoard.tsx` *(rebuilt as `review/ColorsSection.tsx` by T132)*
- [X] T036 [P] [US1] Render fonts, documents and links with `DsAssetRow`
- [X] T037 [US1] Surface uninterpreted material as "unplaced" *(becomes the Files section, T135)*
- [X] T038 [US1] Create `understanding/applyProposals.ts`
- [X] T039 [US1] Add the understanding state *(becomes the processing moment, Phase 15)*
- [X] T040 [US1] Report per-item rejection with a reason

## Phase 4: US2 — Start a new brand from scratch — **[SUPERSEDED by R1's no-branch model]**

- [X] T041 [P] [US2] Browser E2E — the from-scratch journey — **[SUPERSEDED]**
- [X] T042 [P] [US2] Unit test — branch parity — **[SUPERSEDED; SC-007 now compares material vs no-material]**
- [X] T043 [US2] Branch selection in `BasicsStep.tsx` — **[SUPERSEDED by FR-002]**
- [X] T044 [US2] Create `components/DirectionPicker.tsx` — **[SUPERSEDED by T132/T133]**
- [X] T045 [US2] Branch `MaterialStep.tsx` on branch — **[SUPERSEDED by FR-002]**
- [X] T046 [US2] Map a chosen direction to proposals — **[SUPERSEDED]**
- [X] T047 [US2] Preserve captured data across a branch switch — **[SUPERSEDED; no branch exists]**

## Phase 5: US3 — Review and correct

- [X] T048 [P] [US3] `acceptProposal` performs exactly one promotion
- [X] T049 [P] [US3] `acceptAll` is byte-identical to individual acceptance
- [X] T050 [P] [US3] `editValue` writes through the canonical op AND promotes
- [X] T051 [P] [US3] Browser E2E — untouched values stay below `confirmed`, none `official`
- [X] T052 [US3] Create `understanding/acceptance.ts` — the only promoter
- [X] T053 [US3] Create `steps/ReviewStep.tsx` *(rewritten by T136)*
- [X] T054 [US3] Create `components/ProposalCard.tsx` *(shipped as `ValueRow.tsx`; absorbed by Phase 16)*
- [X] T055 [US3] Wire accept-all as a loop over `acceptProposal`
- [X] T056 [US3] Wire remove/reject with a Context signal
- [X] T057 [P] [US3] Rendering `ReviewStep` performs zero promotions

## Phase 6: US4 — The brand you land on is already correct

- [X] T058 [P] [US4] Adapter integration test — business facts persist on BOTH adapters
- [X] T059 [P] [US4] Browser E2E — every review item is resolvable in the brand
- [X] T060 [P] [US4] Zero kit adoptions, guidelines, templates or designs
- [X] T061 [US4] Write business facts to `businessInfo` *(extended by T112)*
- [X] T062 [US4] Record Context signals — fire-and-forget
- [X] T063 [US4] Per-slice failure reporting

## Phase 7: US5 — Never trapped

- [X] T064 [P] [US5] Browser E2E — name-only finish, Back, resume, `?then=`, double-submit
- [X] T065 [P] [US5] Adapter integration test — pre-migration column tolerance
- [X] T066 [US5] Backward navigation including the browser Back control
- [X] T067 [US5] Resume from `/onboard-brand/:slug`
- [X] T068 [US5] Surface unfinished brands in the brand list and the `AppRail` switcher
- [X] T069 [US5] `DsConfirmDialog` discard flow naming what will be lost
- [X] T070 [US5] Preserve `?then=` everywhere
- [X] T071 [US5] Every step skippable except the name

## Phase 8: Polish, then Retirement

- [X] T072 [P] Responsive pass
- [X] T073 [P] Accessibility pass
- [X] T074 [P] Zero hardcoded visual values — `--ds-*` only
- [X] T075 Delete `src/features/onboarding-v4/` in full, including `styles/cosmos.css`
- [X] T076 Delete `src/pages/onboard-brand/create.tsx` and its route entry
- [X] T077 Redirect `/onboard-brand/create` preserving the query string
- [X] T078 Update the dev product-map and features registries
- [X] T079 Verify no dangling references
- [X] T080 Run the full gate — all green
- [ ] T081 **BLOCKED on a production deploy** — migration 022 is not applied to `brandos-prod`, so the RLS suite cannot run (`42703: column "onboarding" does not exist`). This is expected: the code tolerates the column's absence by design. Run after deploying 022: `supabase db query --linked -f supabase/tests/022_onboarding_state.test.sql`
- [X] T082 Execute quickstart.md S1–S12 on both storage backends *(re-run by T145)*
- [X] T083 [P] Update `CLAUDE.md` and the spec status *(re-run by T146)*

---

## Notes

- **146 tasks total**: 83 original (82 done, 1 blocked) + 63 for R1.
- R1 re-does no backend or Foundation work. The only Foundation line it may touch is
  the additive `StyleDescriptor` widening (T096/T097), which is blocked on approval.
- Two tasks are gated on decisions surfaced with the design artifact: T096/T097
  (plan §9b) and T125 (plan §11a). Neither blocks any other task.
- Every task names a file path; `[P]` means a genuinely different file with no
  incomplete dependency.
- Both storage backends stay first-class throughout.
