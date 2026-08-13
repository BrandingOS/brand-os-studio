# Implementation Plan: Onboarding V3

**Branch**: `v3-onboarding` (spec dir `002-onboarding-v3`) | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-onboarding-v3/spec.md`

**Companion artifacts**: [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/onboarding.md](./contracts/onboarding.md) · [quickstart.md](./quickstart.md)

---

## 1. Summary

One onboarding flow, brand-first, writing exclusively through the Foundation
built in 001. Two entry branches, one state, one pipeline.

The plan turns on a single realisation from the contract inspection: **onboarding
needs almost no new state.** The Foundation already models everything the flow
was going to invent.

- A *proposal* is a Core value whose authority is below `confirmed`. Authority is
  the proposal model — there is no parallel proposal store to build, and
  proposals survive a closed tab for free because they live on the brand.
- *Accepting* a proposal is `promoteCoreValue(..., 'confirmed', human)` — the op
  that already exists and already enforces, at the type level, that no machine
  can perform it.
- *Unplaced material* is a Library item with no logo reference — already modelled.
- *Material* is Library items via `IAssetsService.create` — already modelled, with
  RLS, storage and both adapters.

So the whole feature reduces to: a flow shell, an interpretation layer that emits
proposals, a review that promotes them one value at a time, and the deletion of
the superseded flow. New persistence is **one additive JSONB column** recording
which step the brand reached.

Brand-first is what makes this work. Because the brand exists from the naming
step, every later step is an ordinary Foundation write against a real brand id.
There is no staging store, no commit pass, and no "what if the final save fails"
recovery machinery — the ~180 lines of tiered create-then-patch fallback in the
current flow exist only because the old model deferred everything to one final
write, and they leave with it.

**One Foundation touch is required**, and it is the plan's only departure from
"consume 001 as-is": a system write to a Core path with no prior metadata
currently opens at `provisional`, not `suggested`, so "untouched AI proposals
remain Suggested" is not expressible today. See §9 — a minimal change with zero
existing callers, approved by the owner on 2026-08-13 and scoped to system writes
on paths with no metadata entry. The legacy/backfill read default is untouched.

---

## 2. Technical Context

**Language/Version**: TypeScript 5.8, React 18, Vite 5 (SPA)

**Primary Dependencies**: Zustand 5, Supabase JS 2, zod 3, jszip (already used by
the current upload path). **No new runtime dependency.**

**Storage**: Supabase Postgres + `brand-assets` bucket (authenticated); localStorage
(local / dev-bypass). Both satisfy the same service interfaces, and both are
first-class per FR — a behaviour that works on only one is not done.

**Testing**: Vitest projects `unit` (jsdom) and `browser` (Playwright Chromium);
psql RLS track for the new column's policy coverage.

**Target Platform**: Modern browsers; Cloudflare Pages.

**Project Type**: Web SPA + BaaS. Layers `pages → features → core/shared → adapters`.

**Performance Goals**: Interpretation of a 10-file drop completes without blocking
input; the review renders incrementally as proposals arrive rather than after all
of them.

**Constraints**: No brand material inline on the brand record; no data-URL
persistence; no new generic UI control where a DS primitive exists.

**Scale/Scope**: 1 flow, 3 steps, ~12 new files, 1 additive migration, ~13 files
deleted.

---

## 3. Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 design (§14).*

| Principle | Gate | Verdict |
|---|---|---|
| I — MVP-first | No abstraction without a current consumer | **Pass.** The only new persisted field is onboarding step/completion, consumed by resume and the brand list. No proposal store, no draft service, no new interface. |
| II — One canonical truth | No parallel state or second write path | **Pass.** Brand-first removes the draft entirely. Material → Library; Core → canonical ops; Business Info → brand record; Context → context service. Onboarding owns nothing but its own step marker. |
| III — Structured Core | Values structured, not prose | **Pass.** Interpretation emits typed proposals against `CoreFieldPath`; the free-text description is preserved alongside, not instead. |
| IV — Six concepts distinct | No blurring | **Pass.** Explicit non-goal: no Kit adoption, no deliverable, no Work/Output (FR-030). Enforced by test, not by intention (§10). |
| V — AI proposes, human disposes | No silent promotion | **Pass.** Promotion runs only through `promoteCoreValue`, which takes a `HumanActor` with no default. Per-value acceptance (FR-025). |
| VI — Calm surface | Shallow navigation | **Pass.** Three steps, one screen each, DS components. |
| VII — Never trapped | Skip / leave / resume | **Pass.** Name is the only required input; resume is cross-session and cross-device by construction; abandoned brands are visible and deletable. |
| IX — Evolve, don't rewrite | Reuse + stated deletion criterion | **Pass.** Every proven utility is carried over (§6); the superseded flow is deleted inside this feature (FR-041). |
| X — DS first | Pre-flight and ladder | **Pass.** Pre-flight in §11; no new DS primitive proposed. |
| XI — Brand isolation | Authorized at the data layer | **Pass.** Every write goes through services already carrying RLS. The new column inherits the `brands` row policy; RLS test added. |

No complexity-tracking entries. Nothing in this plan requires a justified
violation.

---

## 4. Project Structure

### Documentation (this feature)

```text
specs/002-onboarding-v3/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions and the one Foundation finding
├── data-model.md        # Phase 1 — proposal model, mappings, the new column
├── contracts/
│   └── onboarding.md    # Phase 1 — flow contract, proposal→Core map, finish contract
├── quickstart.md        # Phase 1 — runnable validation
├── spec.md
└── checklists/requirements.md
```

### Source code (existing directories — no new top-level layers)

```text
src/features/onboarding/                 # NEW — canonical, replaces onboarding-v4
├── OnboardingFlow.tsx                   # shell: step machine, ?then=, resume
├── steps/
│   ├── BasicsStep.tsx                   # name + branch + description → creates the brand
│   ├── MaterialStep.tsx                 # upload branch / directions branch
│   └── ReviewStep.tsx                   # proposals, per-value accept, finish
├── understanding/
│   ├── interpret.ts                     # material + description → Proposal[]
│   ├── proposals.ts                     # Proposal type + Core path mapping
│   └── acceptance.ts                    # accept/edit → promoteCoreValue
├── state/
│   └── onboardingStore.ts               # step, branch, transient UI only
└── components/                          # LogoSlotBoard, ColorBoard, ProposalCard, …

src/features/onboarding-v4/              # DELETED in the final task
src/pages/onboard-brand/create.tsx       # DELETED in the final task

src/shared/onboarding/onboardingState.ts # NEW — read/write the brand's onboarding marker
src/pages/onboard-brand/index.tsx        # entry, unchanged path
supabase/migrations/…_018_brand_onboarding_state.sql   # NEW — one additive column
```

**Structure Decision**: the canonical feature lives at `src/features/onboarding/`
per the repo's convention (canonical without suffix, alternates suffixed). The
`-v4` folder is not renamed in place — it is deleted, so no importer is left
pointing at a moved file.

---

## 5. Proposed architecture

### The flow

```text
/onboard-brand                    Basics    name · branch · description
        │  naming CREATES the brand (FR-007)
        ▼
/onboard-brand/:slug?step=material  Material  uploads  │  starting directions
        │  interpretation runs as material arrives
        ▼
/onboard-brand/:slug?step=review    Review    proposals · per-value accept · finish
        │
        ▼
/b/:slug/setup   or   ?then= destination
```

The brand's slug is in the URL from the moment it exists, which is what makes
resume work anywhere: returning to `/onboard-brand/:slug` reads the onboarding
marker off the brand and lands on the recorded step. "BrandingOS Understands" is
a visible processing state on the way into Review, not a fourth stop the user has
to leave.

### Proposals are authority, not a new store

```text
material + description
        │
        ▼
  interpret()  ──emits──▶  Proposal { corePath, value, provenance, evidence }
        │
        ▼
  canonical write op  (system actor, provenance ai-suggested|inferred)
        │
        ▼
  Core value at authority `suggested`   ◀── this IS the proposal
        │
        │  user explicitly accepts, or edits
        ▼
  promoteCoreValue(..., 'confirmed', humanActor)
        │
        ▼
  Core value at authority `confirmed`, provenance UNCHANGED
```

The review screen renders the brand's Core values filtered by authority. An
untouched proposal is a value below `confirmed`; an accepted one is at
`confirmed`; provenance still records that it began as a machine suggestion. This
is the two-dimension guarantee 001 built, used as intended — and it is why
FR-025's per-value grain costs nothing to implement.

### Material goes straight to the Library

`MaterialStep` uploads through `IAssetsService.create` as each file lands, not at
the end. Logos additionally get a `logoSystem` reference via the existing
`stageLogoRef`, so a logo is a Library item plus a reference — never an inline
URL. Uploads are content-hashed on arrival (the existing `hashFile`), which is
both the duplicate check and the Library's `contentHash`.

---

## 6. Existing-system reuse / migration map

| Capability | Today | In V3 |
|---|---|---|
| Folder drop, zip extract, type filter | `onboarding-v4/utils/assetUpload.ts` | **Move** to `shared/upload/`, unchanged logic |
| Content hashing / duplicate rejection | same file | **Move**, and the hash becomes the Library `contentHash` |
| Alpha detection, aspect ratio, colour extraction | same file | **Move** |
| B&W logo variant generation | same file | **Move** |
| Logo slot board + placement router | `panels/LogoSlots.tsx` | **Rebuild** on DS, same routing logic, emits `logoSystem` refs |
| Font family grouping | `utils/fontFamily.ts` (tested) | **Reuse in place** |
| Description → sections | `services/parseDescription.ts` | **Reuse**, output remapped to `Proposal[]` |
| Duplicate-name resolution | `services/createBrand.ts` | **Reuse**, now at the naming step |
| Brand Vision classifier | `services/brandVision.ts` | **Reuse in place**, still opt-in |
| Palette / style card data | `data/*.ts` | **Reuse** as the new-brand branch's directions |
| Tiered create-then-patch recovery | `SetUpScreen.submit()` ~180 LOC | **Delete** — brand-first removes the need |
| Data-URL compression for storage | `SetUpScreen.submit()` | **Delete** — Library owns storage |
| `cosmos.css` | 3385 lines | **Delete** — DS tokens |
| From-scratch screen | `CreateScreen.tsx` | **Delete** — converged |

Everything in the "move" rows keeps its existing unit tests, which move with it.

---

## 7. Canonical write paths

Every write onboarding performs, and who owns it. Onboarding creates **no new
write authority**.

| What | Written through | Authority recorded |
|---|---|---|
| Brand record (name, slug) | `IBrandsService.create` via `brandStore` | n/a |
| Colours | `changeBrandColors` | `suggested` → `confirmed` on accept |
| Typography | `changeBrandTypography` | `suggested` → `confirmed` on accept |
| Voice / tone | `changeBrandVoiceTone` | `suggested` → `confirmed` on accept |
| Strategy | `changeBrandStrategy` | `suggested` → `confirmed` on accept |
| Logo references | `stageLogoRef` → `brandStore.update` | unrouted Core key, as today |
| Uploaded material | `IAssetsService.create` | n/a (Library) |
| Business facts | `brandStore.update({ businessInfo })` | n/a (not Core) |
| Learned signals | `IBrandContextService.record` | n/a (never authoritative) |
| Onboarding step | `onboardingState.ts` → `brandStore.update` | n/a |
| **Official Kit** | **never** | — |
| **Deliverables / Work** | **never** | — |

The last two rows are enforced by a test that asserts the onboarding feature has
no import path to the kit-adoption or design-storage services, in the same shape
as 001's context-isolation test.

---

## 8. Persistence changes

One additive migration, `018_brand_onboarding_state`:

```sql
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS onboarding jsonb;
```

Shape: `{ step, branch, startedAt, completedAt }`. Absent means "not created by
onboarding" — every pre-existing brand reads as finished, so no backfill.
`completedAt` non-null means finished. RLS is inherited from the `brands` row
policy; the RLS suite gains a case proving another account cannot read or write
it. Tolerated as a missing column on the pre-migration path exactly as
`business_info` is, so the code can ship ahead of the migration.

No other schema change. The Library, `identity_meta`, `business_info` and
`brand_context_signals` all already exist from 001.

---

## 9. The one Foundation touch — APPROVED 2026-08-13

`recordCoreWrite` (`src/domain/brand/coreMeta.ts`) resolves a system write like
this:

```ts
authority = settled ? 'provisional'
          : current.authority === 'suggested' ? 'suggested'
          : 'provisional';
```

A Core path with no metadata entry resolves through `DEFAULT_CORE_VALUE_META`,
which is `provisional`/`imported`. So the *first* system write to a fresh path
lands at **`provisional`**, and `suggested` is unreachable for a new value — no
op in the Foundation can produce it.

That collides with the decision you locked: *untouched AI proposals remain
Suggested*.

**Approved (2026-08-13).** Open a fresh system write at `suggested`, and
nothing else. The scope the owner set:

- A **system/AI write** to a Core path with **no existing metadata entry** records
  `suggested`.
- The **legacy/backfill default is preserved**: `coreValueMeta()` still resolves an
  absent entry to `provisional`/`imported` on READ, so pre-sidecar data behaves
  exactly as before. Only the write branch changes.
- **No broadening.** Human writes, settled values, INV-3, promotion and demotion
  are all untouched.

Rationale: The default's own
docblock says it exists for "data that predates the sidecar" — a brand-new AI
proposal is the opposite of that, so applying the legacy default to it is a
mis-fit rather than a deliberate rule.

Why this is safe:

- **Zero existing callers.** `SystemActor` appears nowhere in `src/` outside its
  own type definition. 002 is the first system-actor writer in the product, so
  the branch being changed is unreachable today.
- **The existing test stays green.** `coreMeta.test.ts:103` asserts only
  `isAtLeast(authority, 'confirmed') === false`, not the exact band. Its title
  needs updating; its assertion does not.
- **No invariant moves.** INV-3 (a system actor cannot reach confirmed/official)
  is untouched, and `promoteCoreValue` remains the only door upward.

Alternatives, both worse: accept `provisional` as the proposal band (matches the
constitution, contradicts your lock, and loses the distinction between "the
machine guessed" and "a human set this but hasn't confirmed it"); or hold
proposals outside Core in onboarding-owned storage (a second source of truth for
brand values, which Principle II forbids and brand-first exists to avoid).

**Covered by focused tests**: a fresh system write lands `suggested`; a fresh
human write still lands `provisional`; a system write over a settled value still
demotes to `provisional`; an absent entry still READS as `provisional`/`imported`;
INV-3 still throws for a system actor reaching `confirmed`/`official`.

---

## 10. Testing strategy

All three layers, per the repo's binding policy.

**Unit** — `interpret()` mapping (material + description → proposals with correct
paths and provenance); the proposal→Core path table; acceptance producing exactly
one promotion per value; onboarding-state read/write; the moved upload utilities
keep their existing suites.

**Adapter integration** — material lands in the Library on both adapters; logo
references resolve after creation; `businessInfo` persists on both; the
onboarding column tolerates being absent; the brand list surfaces unfinished
brands.

**Browser E2E** — the two journeys end to end: upload branch and from-scratch
branch, each through basics → material → review → finish, asserting the brand's
Core, Library and logo references afterwards. Plus: per-value acceptance (view a
proposal, don't accept it, finish, assert it is still below `confirmed`); accept
all equals accepting individually; resume after a reload lands on the recorded
step; `?then=` returns to the origin; double-submit produces one brand.

**RLS (psql)** — the new column is not readable or writable cross-account.

**Guard tests** — no import path from `features/onboarding` to kit-adoption or
design storage (FR-030); no inline `assets[]`/`logoAssets` write from the feature
(FR-026).

---

## 11. UI & Design System plan

### COMPONENT / DS PRE-FLIGHT

- **Existing components searched**: `src/shared/ds` (full export surface),
  `shared/ui`, `shared/components`, `shared/upload`, `shared/brand`,
  `features/onboarding-v4`, `features/setup`.
- **DS primitives inspected**: `DsButton`, `DsInput`/`DsTextArea`/`DsDropZone`,
  `DsSelect`, `DsSegmented`, `DsModal`/`DsConfirmDialog`, `DsMenu`, `DsProgress`,
  `DsSkeleton`, `DsBadge`/`DsBanner`/`DsToast`, `DsChip`, `DsEmptyState`,
  `DsAssetRow`, `DsSwatchRow`, `DsLogoTile`, `BrandMark`/`LoadingPill`,
  `DsEyebrow`.
- **Canonical components reused**: `DsDropZone` (material intake), `DsLogoTile`
  (slot board tiles), `DsSwatchRow` (palette review), `DsAssetRow` (fonts,
  documents, links), `DsProgress` (upload + interpretation), `LoadingPill` (the
  understanding state — never a generic spinner), `DsConfirmDialog` (discard an
  unfinished brand), `AboutEditorModal` from `features/setup` (already reused by
  today's About group).
- **Components composed**: the logo slot board composes `DsLogoTile` + `DsMenu`;
  the proposal list composes `DsAssetRow`/`DsSwatchRow` with an accept affordance.
- **Components extended**: none.
- **New feature-local components**: `ProposalCard` (a proposal with its accept
  and edit affordances), `LogoSlotBoard`, `ColorBoard`, `StepHeader`,
  `DirectionPicker` (new-brand branch).
- **Why each stays local**: every one encodes onboarding-specific semantics —
  proposal acceptance, slot routing, direction shuffling. None is a generic
  visual primitive, and none has a second consumer. Per the ladder, local is the
  right rung; promote later only if real reuse appears.
- **New shared product components**: none.
- **New DS primitives**: none. The DS already covers every generic control this
  flow needs.
- **Legacy/duplicate components encountered**: `cosmos.css` and the `-v4` panels —
  superseded and deleted by this feature, not imported.
- **Hardcoded visual values introduced**: none; `--ds-*` only.
- **Legacy generic UI imports introduced**: none.

### Experience notes

Acceptance must read as a decision, not as decoration — a proposal the user has
accepted looks settled, one they haven't looks pending, and neither needs a
permanent badge (FR-024). The understanding state uses the 9-dot `BrandMark`
loader, per the DS rule against generic ring spinners.

---

## 12. Phased implementation order

1. **Migration 018 + onboarding state** — the column, its tolerance path, the
   read/write helper, RLS test.
2. **Foundation touch** (§9, approved) — `recordCoreWrite` opens a fresh
   system write at `suggested`; test title updated; new test pinning the band.
3. **Flow shell** — routes, step machine, resume, `?then=`, brand creation at
   Basics, unfinished state in the brand list.
4. **Material step** — move the upload utilities to `shared/upload`, wire intake
   to the Library, logo slot board on DS.
5. **Understanding** — `interpret()` emitting proposals; canonical writes at
   `suggested`; degraded deterministic path.
6. **Review** — proposal rendering, per-value acceptance, accept-all as bulk
   per-value, edit-as-acceptance, finish.
7. **Business Info + Context** — business facts written; minimal signal capture.
8. **Retirement** — delete `onboarding-v4`, `create.tsx`, `cosmos.css`; redirect
   superseded URLs; verify no dangling importers.

Steps 3–6 are each independently demonstrable, matching the spec's P1 stories.
Step 8 is gated on every acceptance criterion passing (FR-041).

---

## 13. Risks & rollback

| Risk | Mitigation |
|---|---|
| Abandoned empty brands accumulate | Accepted and specified: visible, marked, resumable, deletable (FR-009). Timed reaping is an explicit non-goal. |
| Naming creates a brand the user didn't mean to create | Discard is one action from the brand list and from the flow itself; the confirm dialog names what will be lost. |
| Interpretation is slower than the user | Proposals render as they arrive; the review is reachable before interpretation finishes, and late proposals appear in place. |
| Big-bang deletion in step 8 breaks an unnoticed importer | Deletion is the last step, after acceptance; a full typecheck + test run is its gate. Rollback is a revert of one commit. |
| Migration 018 not yet deployed | Column absence is tolerated exactly as `business_info` is — the flow degrades to non-resumable, never to a failed save. |

---

## 14. Post-design constitution re-check

Re-run after Phase 1, against the artifacts rather than the intent.

| Principle | Re-check against the design | Verdict |
|---|---|---|
| I | data-model.md adds exactly one persisted field and one in-memory type; §6 of that file lists what was deliberately not modelled | **Pass** |
| II | contracts §2 enforces that `understanding/` never writes and `acceptance.ts` is the sole promoter; no proposal store exists to diverge | **Pass** |
| III | Every proposal targets a closed `CoreFieldPath`; free text is preserved beside structure, not instead of it | **Pass** |
| IV | data-model.md §4 routes each datum to exactly one concept; contracts §2 guard 3 forbids a kit/design import path | **Pass** |
| V | contracts §4: acceptance is per value, hard-coded to `confirmed`, never called from a render path, and `official` is unreachable by signature | **Pass** (§9 approved) |
| VI | Three steps; understanding is a transient state, not a fourth stop | **Pass** |
| VII | Name-only finish (quickstart S6), resume (S7), abandonment visible (S8) | **Pass** |
| IX | §6 moves every tested utility with its suite; retirement verification in quickstart is executable | **Pass** |
| X | §11 pre-flight completed: no new DS primitive, no new shared product component, five feature-local components each with a stated reason | **Pass** |
| XI | New column inherits the `brands` policy; quickstart S10 verifies cross-account refusal by query, not by route | **Pass** |

No violations. Complexity tracking remains empty.

---

## 15. Ready for `/speckit-tasks`

Phase 0 and Phase 1 artifacts are complete. One decision is open and is called
out in §9, is approved and scoped, so `/speckit-tasks` proceeds with it
included as one narrowly-bounded task.
