# Phase 1 Data Model: Onboarding V3

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-08-13

Onboarding introduces **one persisted field** and **one in-memory type**.
Everything else it touches already exists in the Foundation and is referenced,
not redefined.

---

## 1. New persisted state — `brands.onboarding`

The only schema change in this feature.

```ts
interface OnboardingState {
  /** Where the user left off. */
  step: 'basics' | 'material' | 'review';
  /** Which entry branch produced this brand. */
  branch: 'existing' | 'new';
  /** ISO timestamp — when the brand was named. */
  startedAt: string;
  /** ISO timestamp, or null while onboarding is unfinished. */
  completedAt: string | null;
}
```

Stored as `jsonb` on `public.brands`, nullable.

| Value | Meaning |
|---|---|
| column absent (pre-migration) | Treated as finished. The flow degrades to non-resumable; saves never fail. |
| `null` | Brand was not created by onboarding — every pre-existing brand. Treated as finished. |
| `completedAt === null` | **Unfinished.** Surfaces in the brand list as resumable and deletable (FR-009). |
| `completedAt` set | Finished. Re-entering onboarding for this brand is not offered. |

**Validation**: `step` and `branch` are closed unions; an unrecognised value reads
as `basics` / `existing` rather than throwing, because a malformed marker must
never make a brand unopenable.

**Transitions**: `basics → material → review → complete`. Backwards moves are
allowed and rewrite `step`. `completedAt` is written once and never cleared —
finishing is not reversible, and a user wanting to change values uses Setup.

**Isolation**: inherits the `brands` row policy. No new policy; the RLS suite
gains a case proving cross-account read and write are both refused.

---

## 2. New in-memory type — `Proposal`

Never persisted. It is the hand-off between interpretation and the writes that
follow, and it dies once written.

```ts
interface Proposal {
  /** Closed registry — must be a CoreFieldPath. */
  corePath: CoreFieldPath;
  /** The proposed value, shaped for the canonical op that will write it. */
  value: unknown;
  /** 'ai-suggested' (assisted parse) or 'inferred' (derived from evidence). */
  provenance: Extract<Provenance, 'ai-suggested' | 'inferred'>;
  /** What the belief rests on — a Library item id, a filename, a text span. */
  evidence?: string;
}
```

Once written through a canonical op, the proposal *is* the Core value plus its
`CoreValueMeta`. There is no proposal record to keep in sync, and no reconciliation
step at finish.

---

## 3. Referenced Foundation entities (unchanged)

| Entity | Home | 002's use |
|---|---|---|
| `CanonicalBrand` / `BrandIdentity` | `src/domain/brand/identity.ts` | Written through the canonical ops |
| `IdentityMeta` / `CoreValueMeta` | `src/domain/brand/coreMeta.ts` | Carries the proposal/accepted distinction |
| `CoreFieldPath` | `src/domain/brand/coreFieldPaths.ts` | Closed registry every proposal targets |
| `Asset` (Library item) | `src/shared/types/brand.ts` | All uploaded material |
| `LogoSystemRefs` / `LogoRef` | `src/shared/types/brandAssets.ts` | Logo placements |
| `BusinessInfo` | `src/domain/brand/identity.ts` | Business facts |
| `ContextSignal` | `src/core/services/IBrandContextService.ts` | Learned signals |

None of these is extended by this feature.

---

## 4. Proposal → Core path map

What interpretation may propose, and which op writes it. Anything not in this
table is not a proposal — it is either Library material, Business Info, or
nothing.

| Source | `CoreFieldPath` | Written by | Provenance |
|---|---|---|---|
| Extracted / picked palette | `colors.primary`, `colors.secondary`, `colors.accent`, `colors.neutrals` | `changeBrandColors` | `inferred` (extracted) · `user-entered` (picked) |
| Font families grouped from uploads | `typography.primary`, `typography.secondary` | `changeBrandTypography` | `inferred` |
| Description → mission | `strategy.mission` | `changeBrandStrategy` | `ai-suggested` |
| Description → vision | `strategy.vision` | `changeBrandStrategy` | `ai-suggested` |
| Description → values | `strategy.values` | `changeBrandStrategy` | `ai-suggested` |
| Description → positioning | `strategy.positioning` | `changeBrandStrategy` | `ai-suggested` |
| Description → audience | `strategy.targetAudience` | `changeBrandStrategy` | `ai-suggested` |
| Description → voice | `voice.tone` | `changeBrandVoiceTone` | `ai-suggested` |
| Style direction (new-brand branch) | `visualStyle.descriptors` | `changeBrandStrategy`* | `user-entered` |
| Logo slot placement | `logos.*` | `stageLogoRef` → `brandStore.update` | n/a (unrouted key) |

\* `visualStyle` has no dedicated canonical op in 001. If the new-brand branch's
directions need to write it, that is a **new op**, not a new store — and it is out
of scope unless the direction picker proves it necessary at task time. The MVP
records the chosen direction as tone and typography, both of which have ops today.

### Non-Core destinations

| Source | Destination | Not Core because |
|---|---|---|
| Uploaded files, links, documents | Brand Library | Material, not truth |
| Website, social links, audience summary, industry | `businessInfo` | Business Data is a distinct concept |
| Rejected proposals, reference flags | Context signals | Never authoritative |
| The raw description | Preserved alongside strategy | Free text sits beside structure (Principle III) |

---

## 5. Authority lifecycle within onboarding

```text
        interpretation (system actor)
                 │
                 ▼
          ┌─────────────┐
          │  suggested  │◀── untouched at finish → stays here (FR-025b)
          └──────┬──────┘
                 │  user explicitly accepts, or edits the value
                 │  → promoteCoreValue(path, 'confirmed', humanActor)
                 ▼
          ┌─────────────┐
          │  confirmed  │   provenance UNCHANGED — still records the origin
          └─────────────┘

          ┌─────────────┐
          │  official   │   NEVER reached during onboarding (FR-025d)
          └─────────────┘   Kit adoption only, which this flow does not perform
```

`provisional` does not appear in the onboarding lifecycle. A value the *user*
types directly at the Basics step (the name is not Core; the description is not
Core) does not enter this diagram at all.

Reaching `suggested` for a fresh value relies on the approved Foundation touch in
[research.md §R2](./research.md) / plan §9: a system write to a path with no
metadata entry opens at `suggested`. Reads of pre-sidecar data still default to
`provisional`/`imported`, unchanged.

---

## 6. What onboarding deliberately does not model

Named so a later reader does not assume an omission:

- **No proposal history.** A rejected proposal leaves a Context signal, not a
  record of the rejection on the brand.
- **No draft.** Brand-first removes it.
- **No review-decision store.** Acceptance is the authority change itself.
- **No Kit adoption, deliverable, template or design record** (FR-030), enforced
  by an import-path guard test.
- **No timed cleanup of abandoned brands.** Explicit non-goal.

---

# Addendum — Revision R1 (2026-08-14)

> Naming note: research.md numbers its *findings* R1–R9. "Revision R1" here and in
> spec.md / plan.md / tasks.md means the 2026-08-14 revision, not research finding R1.

## 7. Persisted state — unchanged

R1 adds **no migration and no persisted field**. `brands.onboarding` (§1) carries
the revision entirely:

| Field | Change |
|---|---|
| `step` | vocabulary becomes `'name' \| 'profile' \| 'review'` — three screens (FR-043) |
| `branch` | **removed** — FR-002 retires self-classification |
| `brief` | **added** — the raw profile text, so resume on another device still has it |
| `startedAt` · `completedAt` · `placeholders` | unchanged |

`brief` is onboarding's own transient input, not a brand concept. It lives on the
marker rather than in `businessInfo.description`, which belongs to products and
services — two writers on one field would mean the review showed the raw brief as
the product list.

An unrecognised `step` still degrades to the first step rather than throwing, so a
brand recorded at the retired `'basics'` resumes at `'name'`.

## 8. New in-memory types

```ts
/** A closed vocabulary member. `id` is what persists; `label` is what is shown. */
interface VocabularyMember { id: string; label: string }

/** The result of normalising free text against a vocabulary. */
type Normalized =
  | { kind: 'member'; member: VocabularyMember }
  | { kind: 'other';  text: string };   // the user's wording, verbatim

/** Where a candidate value came from. Higher wins; see contracts §8. */
type SourceRank = 0 | 1 | 2 | 3;   // ai < brief < uploaded < user

/** Something important that nothing the user supplied determined. */
/** The Business Info fields onboarding may ask about. Closed, like CoreFieldPath. */
type BusinessInfoPath = 'industry' | 'tagline' | 'description' | 'audienceSummary';

interface OpenQuestion {
  target:
    | { concept: 'core';     path: CoreFieldPath }
    | { concept: 'business'; path: BusinessInfoPath };
  prompt: string;                       // in the user's words
  vocabulary?: VocabularyMember[];      // present ⇒ answer as a selection
  importance: number;                   // ordering only; never a progress metric
}

/** One unit of real work the processing moment may narrate. */
interface Stage {
  id: string;
  label: string;                        // e.g. "Extracting your colours"
  node: number;                         // which of the 8 outer dots lights
  run(): Promise<Finding | null>;
}
interface Finding { label: string; value: string }   // "Typeface" · "Inter"
```

None of these is persisted. `OpenQuestion` is *derived* from the brand's Core on
each render of the review — it is not stored, which is what keeps Principle II
intact and what makes an answered question simply a user edit.

## 9. Controlled vocabularies → storage targets

| Concept | Target | Stored as | Carries authority? |
|---|---|---|---|
| Industry | `businessInfo.industry` | member id | no — a business fact |
| Slogan | `businessInfo.tagline` | free text | no |
| Products / services | `businessInfo.description` | free text | no |
| Style | `identity.visualStyle.descriptors` | member id[] | yes |
| Personality | `identity.strategy.personality` | member id[] | yes |
| Tone | `identity.voice.tone` | member id — at most one | yes |
| Values | `identity.strategy.values` | member id[] | yes |
| Summary | `identity.strategy.mission` | prose | yes |
| Audience | `identity.strategy.targetAudience` | prose | yes |
| Positioning | `identity.strategy.positioning` | prose | yes |

Every target except `visualStyle.descriptors` is already `string` or `string[]`, so
the vocabularies are enforced at the boundary rather than in the schema.
`visualStyle.descriptors` is a closed union — see plan §9b.

**Industry is not mirrored into Core.** `positioning.category` remains a distinct
concept (the market category a brand competes in) and is never written from the
industry answer.

## 10. Review sections — revised

§4's five proposal sections are superseded by the retired page's own composition:

The retired page's composition and order are kept (FR-064):

| Section | Carries | Confirmable |
|---|---|---|
| *(brand bar)* | name, slogan, industry, style | slogan/industry/style save on edit |
| Logos | `logos.*` references | placement, not a Core statement |
| Colors | `colors.*` | yes |
| Fonts | `typography.*` | yes |
| Links | `businessInfo.contact.website`, `businessInfo.links` | no |
| About | `strategy.*`, `voice.*`, `visualStyle.*`, the retired free-form sections, plus Business Info facts | Core values yes; business facts save on edit |
| Brand Assets | Library items with no other placement | no |

A section mixing confirmable and non-confirmable values is not exposed as such:
FR-070 forbids the interface from explaining the model. "Looks right" simply
confirms the Core values present; the business facts were already saved.
