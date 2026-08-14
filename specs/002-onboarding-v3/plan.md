# Implementation Plan: Onboarding V3

**Branch**: `v3-onboarding` (spec dir `002-onboarding-v3`) | **Created**: 2026-08-13 | **Revised**: 2026-08-14 (R1) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-onboarding-v3/spec.md`

**Companion artifacts**: [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/onboarding.md](./contracts/onboarding.md) · [quickstart.md](./quickstart.md)

---

## 1. Summary

One onboarding flow, brand-first, writing exclusively through the Foundation built
in 001.

The plan turned on a single realisation from the contract inspection: **onboarding
needs almost no new state.** The Foundation already models everything the flow was
going to invent.

- A *proposal* is a Core value whose authority is below `confirmed`. Authority is
  the proposal model — there is no parallel proposal store to build, and proposals
  survive a closed tab for free because they live on the brand.
- *Accepting* a proposal is `promoteCoreValue(..., 'confirmed', human)` — the op
  that already exists and already enforces, at the type level, that no machine can
  perform it.
- *Unplaced material* is a Library item with no logo reference — already modelled.
- *Material* is Library items via `IAssetsService.create` — already modelled, with
  RLS, storage and both adapters.

Brand-first is what makes this work. Because the brand exists from the naming step,
every later step is an ordinary Foundation write against a real brand id. There is
no staging store, no commit pass, and no "what if the final save fails" recovery
machinery.

**That architecture shipped on 2026-08-14 and is kept in full.**

### 1a. Revision R1 — what this revision changes

R1 changes the *experience*, not the architecture. The retired onboarding's
interface is restored as the visual and interaction foundation and significantly
improved; the V3 write pipeline underneath is untouched.

The work divides cleanly into five buckets:

| Bucket | Nature | Touches the write pipeline? |
|---|---|---|
| **A. Screen split + shell** — four screens, name alone on the first | Restructure | Step vocabulary only |
| **B. The brief** — description surface, Build-with-AI helper, prompt, reverse-parse | New | No — feeds `interpret` |
| **C. Vocabularies** — closed lists + normalisation for industry/style/personality/tone/values | New | Values only; same ops |
| **D. Processing moment** — 9-dot symbol, real stages, real findings, minimum beat | New | No — observes existing work |
| **E. Review rebuild** — six sections on the old layout, logo classification, source priority | Rebuild | No — same ops, richer surface |

Only **C** raises a Foundation question, and it is additive and unstarted — see
§9b. Everything else composes over what already exists.

The governing constraint is Principle IX: R1 restores a proven interface rather
than inventing a third one. Where the retired code was good it comes back; where it
was cramped or coupled to the retired store it is improved and rewired.

---

## 2. Technical Context

**Language/Version**: TypeScript 5.8, React 18, Vite 5 (SPA)

**Primary Dependencies**: Zustand 5, Supabase JS 2, zod 3, jszip. **No new runtime
dependency** — R1 adds none either.

**Storage**: Supabase Postgres + `brand-assets` bucket (authenticated); localStorage
(local / dev-bypass). Both satisfy the same service interfaces, and both are
first-class — a behaviour that works on only one is not done.

**Testing**: Vitest projects `unit` (jsdom) and `browser` (Playwright Chromium);
psql RLS track.

**Target Platform**: Modern browsers; Cloudflare Pages.

**Project Type**: Web SPA + BaaS. Layers `pages → features → core/shared → adapters`.

**Performance Goals**: Understanding of a 10-file drop completes without blocking
input. The processing moment reports real stage transitions; its minimum beat is a
floor on the *screen*, never a delay inserted into the work.

**Constraints**: No brand material inline on the brand record; no data-URL
persistence; no new generic UI control where a DS primitive exists; no new visual
language.

**Scale/Scope (R1)**: 4 screens, ~14 new files, ~6 files restored from git history,
~4 files deleted, 0 new migrations.

---

## 3. Constitution Check

*GATE: re-checked for R1 against the revised spec.*

| Principle | Gate | Verdict |
|---|---|---|
| I — MVP-first | No abstraction without a current consumer | **Pass.** The vocabularies have two consumers on day one (the prompt and the review). Filtering/recommendation is an explicit non-goal, so no filter infrastructure is built. |
| II — One canonical truth | No parallel state or second write path | **Pass.** R1 adds no store. The brief is an input, not a stored concept. Open questions are derived from Core, not held beside it. |
| III — Structured Core | Values structured, not prose | **Strengthened.** The vocabularies replace free text in exactly the places where free text was unusable, and FR-068 forbids converting meaningful prose into fake dropdowns. |
| IV — Six concepts distinct | No blurring | **Pass.** Industry and slogan go to Business Info, not Core; `positioning.category` stays a distinct Core concept. FR-030 still enforced by test. |
| V — AI proposes, human disposes | No silent promotion | **Pass.** Unchanged. Open questions are *asked*, never auto-answered; an answer is a user edit and confirms that value. |
| VI — Calm surface | Shallow navigation | **Pass.** Four screens, one job each. Progressive questions replace the questionnaire FR-055 forbids. |
| VII — Never trapped | Skip / leave / resume | **Pass.** Name is still the only required input. Every open question is skippable. |
| VIII — Outputs match their nature | Each output in its right form | **N/A.** Onboarding produces no output — FR-030 forbids every deliverable, and a test enforces it. Recorded rather than omitted. |
| IX — Evolve, don't rewrite | Reuse + stated deletion criterion | **Pass, and this is R1's core rationale.** §6a lists what is restored from git history rather than re-authored. FR-073 states the deletion criterion. |
| X — DS first | Pre-flight and ladder | **Pass.** Pre-flight re-run in §11. One new DS primitive is **proposed and justified** — see §11a. |
| XI — Brand isolation | Authorized at the data layer | **Pass.** No new persistence, so no new policy surface. |

No complexity-tracking entries.

---

## 4. Project Structure

### Source code after R1

```text
src/features/onboarding/
├── OnboardingFlow.tsx                # shell: 4-step machine, ?then=, resume, guards
├── steps/
│   ├── NameStep.tsx                  # NEW  screen 1 — name only, creates the brand
│   ├── ProfileStep.tsx               # NEW  screen 2 — description + Build-with-AI
│   ├── MaterialStep.tsx              # REBUILT screen 3 — dropzone + website, limits
│   ├── UnderstandingStage.tsx        # NEW  the processing moment (a transition)
│   └── ReviewStep.tsx                # REBUILT screen 4 — six sections
├── brief/
│   ├── prompt.ts                     # NEW  the Build-with-AI prompt builder
│   ├── BuildWithAI.tsx               # NEW  copy / open in ChatGPT / open in Claude
│   └── parseBrief.ts                 # NEW  detect + deterministically parse the brief
├── vocabulary/
│   ├── vocabularies.ts               # NEW  the closed lists
│   └── normalize.ts                  # NEW  free text → vocabulary member | Other
├── understanding/
│   ├── interpret.ts                  # EXTENDED adaptive routing, vocabularies
│   ├── proposals.ts                  # EXTENDED six sections, new labels
│   ├── questions.ts                  # NEW  derive the open questions
│   ├── logoClassify.ts               # NEW  roles, exact-dupe, variant grouping
│   ├── sources.ts                    # NEW  the source-priority rule
│   ├── stages.ts                     # NEW  the real processing stage machine
│   ├── applyProposals.ts             # kept
│   ├── acceptance.ts                 # kept — still the only promoter
│   ├── createBrand.ts · finish.ts    # kept
│   └── hydrate.ts                    # EXTENDED six sections
├── review/                           # NEW  the six section components
│   ├── BrandSummaryBar.tsx           # name · slogan · industry · style
│   ├── LogosSection.tsx · ColorsSection.tsx · FontsSection.tsx
│   ├── ProfileSection.tsx · OnlineSection.tsx · FilesSection.tsx
│   └── ReviewCard.tsx                # the shared section shell (head + count + foot)
├── data/                             # RESTORED from git history (see §6a)
│   ├── suggestedPalettes.ts · popularPalettes.ts · colorHuntPalettes.ts
│   ├── suggestedFonts.ts · socialPlatforms.tsx
├── components/  ValueRow · DiscardBrandDialog · UnderstandingMark (NEW)
├── state/onboardingStore.ts          # transient UI only
└── onboarding.css                    # EXTENDED — --ds-* only

DELETED by R1: steps/BasicsStep.tsx, understanding/directions.ts,
                any remaining branch vocabulary
```

**Structure Decision**: `review/` becomes its own folder because the six sections
are substantial and share one card shell; keeping them in `components/` alongside
the flow-level pieces would obscure that. `brief/` and `vocabulary/` are separated
from `understanding/` because they are pure and independently testable — the brief
parser and the normaliser have no knowledge of Core paths.

---

## 5. Proposed architecture (R1)

### The flow

```text
/onboard-brand                        Name       brand name, nothing else
        │  naming CREATES the brand (FR-007)
        ▼
/onboard-brand/:slug?step=profile     Profile    description · Build with AI
        ▼
/onboard-brand/:slug?step=material    Material   files · folders · website
        │
        ├─ understanding runs ─▶  UnderstandingStage   (a transition, not a step)
        ▼
/onboard-brand/:slug?step=review      Review     six sections · Open my brand
        ▼
/b/:slug/setup   or   ?then= destination
```

`ONBOARDING_STEPS` becomes `['name', 'profile', 'material', 'review']`. An
unrecognised recorded step degrades to `'name'` — the helper already degrades
rather than throws, so this is a vocabulary change, not a behaviour change.

### Adaptive understanding

```text
                       description text
                              │
                    ┌─────────┴──────────┐
        looksLikeBrief(text)?       free-form prose
                    │                     │
          parseBrief(text)        parseDescription(text)   ← assisted, existing
          deterministic                   │                  with deterministic
          NO assisted call                │                  fallback
                    └─────────┬───────────┘
                              ▼
                     normalizeCategorical()      ← vocabulary members | Other
                              │
                              ▼
              merge with material evidence under SOURCE PRIORITY
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
              Proposal[]           OpenQuestion[]
           (written as suggested)  (asked in the review)
```

`looksLikeBrief` keys off the prompt's own labelled-line contract (§7a), so
detection is a property of a format the product itself defines — not a guess about
arbitrary text.

### Source priority as a merge rule

R1's one genuinely new pipeline property. Every candidate value carries its source
rank, and the merge keeps the highest:

```text
rank 3  user choice / edit      ← never overwritten by anything
rank 2  uploaded evidence       ← a colour extracted from the logo
rank 1  structured brief        ← "Colors: #1B4D3E, #E8DCC8"
rank 0  AI suggestion           ← a palette direction we proposed
```

Implemented as one pure function in `understanding/sources.ts` and applied at the
single point where candidates become proposals. Enforcing it *there* rather than at
each call site is what makes SC-016 testable: one function, exhaustively unit
tested, and a guard test asserting no other module constructs a proposal.

Re-running understanding is therefore safe by construction — a rank-0 suggestion
cannot displace the rank-3 value the user just typed.

### Where the vocabularies land

| Concept | Written to | Shape |
|---|---|---|
| Industry | `businessInfo.industry` | vocabulary member (string) |
| Slogan | `businessInfo.tagline` | free text |
| Products / services | `businessInfo.description` | free text |
| Style | `identity.visualStyle.descriptors` | member[] — **see §9b** |
| Personality | `identity.strategy.personality` | member[] |
| Tone | `identity.voice.tone` | member — at most one |
| Values | `identity.strategy.values` | member[] |
| Summary · Audience · Positioning · Mission | `identity.strategy.*` | prose |

Only `visualStyle.descriptors` has a closed type that the requested vocabulary
exceeds. Every other target is already `string` or `string[]`, so the vocabularies
are a *product* constraint enforced at the boundary, not a schema change.

---

## 6. Existing-system reuse / migration map

### 6a. Restored from git history (`904801a^`) rather than re-authored

Deleted with the retired flow, still correct, and cheaper to restore than rewrite.
Each comes back into `features/onboarding/data/` with its imports repointed.

| File | Why it comes back |
|---|---|
| `data/suggestedPalettes.ts` | brand-text-ranked palette directions — FR-066's "suggest palettes" |
| `data/popularPalettes.ts` + `data/colorHuntPalettes.ts` | the shuffle deck behind the palette suggester |
| `data/suggestedFonts.ts` | font **pairings**, which is exactly what FR-067 requires |
| `data/socialPlatforms.tsx` | platform detection + icons for the Online section |

The retired `styleCards.ts` does **not** come back: its style list is superseded by
the controlled style vocabulary (§9b).

### 6b. Restored as interaction patterns, rebuilt on the DS

| Retired component | R1 destination |
|---|---|
| `components/CopyPromptHint.tsx` | `brief/BuildWithAI.tsx` — same three actions, `DsMenu` instead of a raw Radix popover, prompt from `brief/prompt.ts` |
| `components/AITextarea.tsx` | `ProfileStep` — `DsTextArea`; the rotating typed placeholder becomes a static guiding placeholder per FR-049 |
| `components/BrandDropzone.tsx` | `steps/MaterialStep.tsx` — `DsDropZone`, folder drop kept, limits per FR-051 |
| `components/FileTile.tsx` | `review/FilesSection.tsx` + the material strip |
| `panels/LogoSlots.tsx` | `review/LogosSection.tsx` — slot routing and `planPrimarySwap` kept, tiles on `DsLogoTile` |
| `ColorsBoard` (in `UploadsReviewPanel`) | `review/ColorsSection.tsx` — swatch, picker, set-primary, extract, suggest |
| `UploadsReviewPanel` shell + `review-group` CSS | `review/ReviewCard.tsx` — the head/count/foot anatomy, widened per FR-062 |
| `panels/AboutGroup.tsx` | `review/ProfileSection.tsx` — chips for categorical, text for prose |

### 6c. Kept from the shipped V3, untouched

`understanding/{applyProposals,acceptance,createBrand,finish}.ts`,
`shared/onboarding/onboardingState.ts` (vocabulary only),
`shared/upload/*`, the sentinel mechanism, migration 022, the unfinished-brand
state in the brand list, `DiscardBrandDialog`.

### 6d. Deleted by R1

`steps/BasicsStep.tsx` (split into `NameStep` + `ProfileStep`),
`understanding/directions.ts` and its branch affordance (suggestions move into the
review), and any remaining `branch` vocabulary in the marker.

---

## 7. New contracts introduced by R1

### 7a. The brief format — a two-way contract

The prompt asks for **plain text, labelled lines**. That single choice is what lets
`parseBrief` be deterministic and lets `looksLikeBrief` be a recognition rather than
a guess:

```text
Brand summary: <1–2 sentences>
Industry: <one of: …>
Products / Services: <comma-separated>
Audience: <1 sentence>
Positioning: <1 sentence>
Slogan: <short, or omit>
Personality: <2–4 of: …>
Tone: <1–2 of: …>
Visual style: <2–3 of: …>
Core values: <3–5 of: …>
Colors: <hex list, or 3 palette directions>
Fonts: <family pairs, or 3 pairing directions>
```

Detection threshold: at least three recognised labels at line starts. Below that the
text is treated as prose (FR-052's fall-through), and a *partly* recognised brief
parses what it recognises and passes the remainder to prose handling — the edge case
the spec calls out.

The prompt embeds the vocabularies inline so the user's AI selects from them, and
explicitly forbids a long strategy document (FR-046).

### 7b. Processing stages — declared by real work

`understanding/stages.ts` exposes a stage machine the moment *observes*. A stage
exists only when the work it names is scheduled, which is how FR-058 and SC-014 are
satisfied structurally rather than by discipline:

```ts
type Stage = { id, label, node, run: () => Promise<Finding|null> }
```

`node` is which of the eight outer dots lights up. `run` returns the small real
finding the moment may display ("3 logo variations found"). A brand with no files
never constructs the file stages, so their copy can never appear.

The minimum beat is a floor on the **screen**, applied after the work resolves —
never a `sleep` inserted between stages.

### 7c. Logo classification

`understanding/logoClassify.ts`, pure:

1. **Exact duplicates** — drop by content hash (already computed at intake).
2. **Near-duplicate variants** — group using the existing `logoFamily` helpers and
   the `visuallyClose` distance idea proven in `brand-kit/data/recolorLogo.ts`.
3. **Role assignment** — evidence only: aspect ratio → horizontal/vertical/mark,
   alpha + luminance → on-light/on-dark, text density → wordmark. A role with no
   evidence is left empty rather than guessed into.

Everything it returns is a proposal, so the user's drag/swap outranks it by
source priority.

---

## 8. Persistence changes

**None.** R1 introduces no migration. The step vocabulary lives inside the existing
`brands.onboarding` JSONB column added by migration 022; the vocabularies are
values in columns that already exist.

Migration 022 remains undeployed to production — see §13.

---

## 9. The Foundation touch — APPROVED and DISCHARGED 2026-08-13

`recordCoreWrite` (`src/domain/brand/coreMeta.ts`): a system write to a Core path
with **no existing metadata entry** now records `suggested` rather than
`provisional`, so "untouched AI proposals remain Suggested" is expressible. The
read default in `coreValueMeta` was left untouched, human writes still record
`provisional`, a system write over a settled value still demotes, and INV-3 is
unchanged. Shipped with five focused tests. **No further action.**

## 9b. The one Foundation question R1 raises — NOT APPROVED, NOT STARTED

`identity.ts` declares:

```ts
export type StyleDescriptor =
  | 'minimal' | 'bold' | 'elegant' | 'playful'
  | 'technical' | 'organic' | 'luxury' | 'retro';
```

The requested style vocabulary adds **Modern, Classic, Editorial, Brutalist,
Futuristic**. Five of those cannot be stored today.

Evidence gathered before proposing anything:

- `visualStyle.descriptors` has **no product consumers**. Its only references in
  `src/` are the type itself, the zod enum in `invariants.ts`, the entry in
  `coreFieldPaths.ts`, and one test fixture. (`brand-consistency` uses an unrelated
  `voice.descriptors`.)
- The change is **additive to a closed union** — no removal, no rename, no
  migration, no default change, nothing to backfill. Existing values stay valid.
- Exactly two files change: `identity.ts` and `invariants.ts`.

**Options:**

| | Effect |
|---|---|
| **A. Widen the union** *(recommended)* | The vocabulary the revision asked for, stored as typed members. Two-file additive change. |
| **B. Constrain to the existing eight** | Zero Foundation change; drops Modern, Classic, Editorial, Brutalist and Futuristic from the product's style language. |

Recommendation **A**, on the grounds that a closed vocabulary that cannot express
the product's own style language is a defect in the vocabulary rather than a
constraint to design around, and that this is the smallest possible shape of
change. **Blocked pending owner approval; no task starts it.**

If **B** is chosen instead, only `vocabulary/vocabularies.ts` changes and the
review's style chips shrink to eight — nothing else in R1 moves.

---

## 10. Testing strategy

All three layers, per the repo's binding policy. R1's additions:

**Unit**
- `parseBrief` — a full brief, a partial brief, a prose paragraph (must not
  false-positive), a brief with an out-of-vocabulary answer.
- `normalize` — every vocabulary member round-trips; a near-miss maps; a genuine
  miss becomes `Other` **with the user's wording preserved**.
- `sources` — the full 4×4 rank matrix, and re-run idempotence (SC-016).
- `logoClassify` — exact duplicates collapse; near-duplicates group; a role with no
  evidence stays empty (SC-018).
- `stages` — a name-only brand constructs zero file stages, so their copy cannot
  appear (SC-014).
- `questions` — a fully-determined brand yields zero open questions; a name-only
  brand yields a short, ordered, bounded set.

**Adapter integration**
- Categorical values persist as vocabulary members on both adapters (SC-013).
- `businessInfo.industry` and `.tagline` round-trip on both.

**Browser E2E**
- The brief journey: paste a generated brief → assert zero assisted calls →
  vocabularies resolved (SC-012).
- The prose journey: type a paragraph → assisted parse → open questions asked
  progressively.
- Review interaction: drag a logo between slots; extract colours from the logo;
  pick a font pairing; choose a personality chip; "Looks right" on one section.
- The processing moment renders for at least one beat on a name-only brand
  (SC-015).
- No authority/provenance vocabulary anywhere in the rendered flow (SC-017) — a DOM
  scan for the banned terms.

**Guard tests (extended)**
- `brief/` and `vocabulary/` import no service, store or React — pure.
- Only `understanding/sources.ts` constructs a proposal (the source-priority
  guarantee).
- The existing FR-026 / FR-030 boundary guards continue to pass.

---

## 11. UI & Design System plan

### COMPONENT / DS PRE-FLIGHT

- **Existing components searched**: `src/shared/ds` (full export surface),
  `shared/ui`, `shared/components`, `shared/upload`, `shared/brand`,
  `features/setup`, and the retired `onboarding-v4` tree read out of git history.
- **DS primitives inspected**: `DsButton`, `DsInput`/`DsTextArea`/`DsDropZone`,
  `DsSelect`, `DsSegmented`/`DsCheckbox`/`DsRadio`, `DsModal`/`DsConfirmDialog`,
  `DsMenu`, `DsProgress`, `DsSkeleton`, `DsBadge`/`DsBanner`/`DsToast`, `DsChip`,
  `DsEmptyState`, `DsAssetRow`, `DsSwatchRow`, `DsLogoTile`, `BrandMark`/
  `LoadingPill`, `DsEyebrow`, `DsTabBar`, `DsRail`.
- **Canonical components reused**: `DsDropZone`, `DsLogoTile`, `DsSwatchRow`,
  `DsAssetRow`, `DsChip` (every categorical selection — this is the vocabulary UI),
  `DsMenu` (Build-with-AI actions, logo slot actions), `DsTextArea` (the brief),
  `DsInput` (name, website, slogan), `DsProgress` (upload), `DsConfirmDialog`
  (discard), `BrandMark` (the processing symbol's base geometry), `DsEmptyState`.
- **Components composed**: `ReviewCard` composes head + count + "Looks right" +
  foot; `ProfileSection` composes `DsChip` sets with `ValueRow`; `BuildWithAI`
  composes `DsButton` + `DsMenu`.
- **Components extended**: none.
- **New feature-local components**: `NameStep`, `ProfileStep`,
  `UnderstandingStage`, `BuildWithAI`, `ReviewCard`, `BrandSummaryBar`, the six
  section components, `UnderstandingMark`.
- **Why each stays local**: every one encodes onboarding-specific semantics — the
  brief contract, slot routing, source-priority display, the stage machine. None is
  a generic visual primitive and none has a second consumer. Per the ladder, local
  is the right rung.
- **New shared product components**: none.
- **New DS primitives**: **one proposed** — see §11a.
- **Legacy/duplicate components encountered**: the retired `-v4` panels (read for
  reference from git, never imported) and `cosmos.css` (already deleted; its
  `--ds-*`-based rules are the reference for the restored look).
- **Hardcoded visual values introduced**: none; `--ds-*` only.
- **Legacy generic UI imports introduced**: none. Note the retired
  `CopyPromptHint` used the shadcn `Popover` directly; `BuildWithAI` uses `DsMenu`
  instead, so R1 removes a frozen-layer import rather than adding one.

### 11a. The one proposed DS change — `BrandMark` gains a per-node activation mode

The processing moment needs the nine dots individually addressable: the centre
steady from the start, each outer node lighting as its stage completes, with
connections drawn to the centre.

`BrandMark` already owns the exact `Logomark.svg` geometry — the same nine path
strings, in the same viewBox. Three options were weighed:

| | Verdict |
|---|---|
| Copy the paths into a feature-local component | **Rejected.** Two copies of the brand mark's geometry in one codebase; they drift. |
| Add an `activeNodes` prop to `BrandMark` | **Proposed.** Generic ("light a subset of the mark's nodes"), product-agnostic, and the mark is already the DS's loader. |
| Build the whole moment inside the DS | **Rejected.** `DsOnboardingProcessing` would be a feature-named component in the DS — explicitly forbidden. |

**Proposal**: extend `BrandMark` with an optional `activeNodes?: number[]` (and the
existing `loading` unchanged), keeping every current call site byte-identical. The
onboarding-specific composition — stage copy, findings, connections, the beat —
stays in the feature-local `UnderstandingMark`. This is rung **C** of the ladder
(extend, because the missing capability genuinely belongs to that abstraction),
not rung D.

Stated here rather than added silently, per §8 of the UI reuse policy.

### 11b. Restored visual anatomy

The retired stylesheet had already converged onto `--ds-*` tokens, so the look
comes back without reintroducing hardcoded values. The anatomy R1 restores and
widens:

```text
review card        --ds-surface · 1px --ds-border · radius 14 · column, gap 8
section head       uppercase 13px / .04em / --ds-text-secondary   ·   count right
brand bar          plain text, no card — name (20px/550) – slogan (editable)
footer CTA         sticky, single primary action
```

R1's improvements to it: a wider container, more generous vertical rhythm, and a
mobile bottom-padding allowance so the sticky CTA never covers the last row — the
bug the smoke pass caught on 2026-08-14.

---

## 12. Phased implementation order

Each phase is independently demonstrable, and nothing later depends on a decision
from §9b except the style chips.

1. **Shell + screen split** — four-step vocabulary, `NameStep`, `ProfileStep`,
   guards, resume, `?then=`. Delete `BasicsStep`.
2. **Vocabularies + normalisation** — pure, fully unit tested. *(Style list depends
   on §9b; every other list is unblocked.)*
3. **The brief** — `prompt.ts`, `BuildWithAI`, `parseBrief`, detection.
4. **Adaptive understanding** — routing, `sources.ts`, vocabulary normalisation
   into proposals, `questions.ts`.
5. **Material step** — dropzone restored, website field, FR-051 limits.
6. **Logo classification** — dedupe, variant grouping, evidence-only roles.
7. **The processing moment** — `stages.ts`, `UnderstandingMark`, the beat.
8. **Review rebuild** — `ReviewCard`, the six sections, brand summary bar, open
   questions inline, "Open my brand".
9. **Retirement** — delete `directions.ts` and the branch remnants; verify one
   implementation per screen (FR-073); full gate.

---

## 13. Risks & rollback

| Risk | Mitigation |
|---|---|
| The brief parser false-positives on ordinary prose | Detection requires ≥3 labelled lines at line starts; unit tested against prose fixtures. A false positive degrades to a partial parse, not a failure. |
| Vocabulary normalisation silently mangles a user's wording | `Other` preserves the original text verbatim; never coerced. Asserted by test. |
| The processing moment becomes theatre | Stages are constructed only from scheduled work, so unheld copy is unrepresentable. SC-014 tests it. |
| The minimum beat reads as a fake delay | 1.2s is a floor applied after the work resolves, and only when the work was faster. Never additive to real work. |
| §9b is declined late, after style chips are built | Phase 2 is ordered before the review; if B is chosen only the list constant changes. |
| The review rebuild reintroduces the mobile sticky-CTA overlap | The bottom-padding allowance is carried forward explicitly (§11b) and covered by the existing mobile smoke step. |
| Migration 022 still undeployed | Unchanged from the shipped design: absence is tolerated, resume degrades, no save fails. T081 stays blocked on the owner's deploy. |

---

## 14. Post-design constitution re-check

| Principle | Re-check against R1's design | Verdict |
|---|---|---|
| I | R1 adds zero persisted fields and zero migrations; vocabularies have two live consumers | **Pass** |
| II | The brief is an input, not a store; open questions derive from Core; source priority is one function | **Pass** |
| III | Categorical concepts become closed vocabularies; FR-068 protects prose from fake dropdowns | **Pass (strengthened)** |
| IV | Industry/slogan → Business Info; `positioning.category` stays distinct; FR-030 guard unchanged | **Pass** |
| V | Acceptance module untouched; an answered question is a user edit, which confirms | **Pass** |
| VI | Four screens; questions are progressive, never a questionnaire | **Pass** |
| VII | Name still the only required input; every question skippable; "Open my brand" always enabled | **Pass** |
| IX | §6a restores six proven files from git rather than re-authoring; §6d states what dies | **Pass** |
| X | §11 pre-flight complete; one DS extension proposed openly (§11a), no new DS component | **Pass** |
| XI | No new persistence, so no new policy surface | **Pass** |

No violations. Complexity tracking remains empty.

---

## 15. Ready for `/speckit-tasks`

Phase 0 and Phase 1 artifacts are current. Two decisions are open, both stated, and
neither blocks task generation:

- **§9b** — the style vocabulary. Affects one constant and two Foundation lines.
- **§11a** — the `BrandMark` extension. Affects one DS component additively.

Both are surfaced for approval alongside the design artifact.
