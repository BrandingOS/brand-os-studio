# Contracts: Onboarding V3

**Feature**: [../spec.md](../spec.md) · **Plan**: [../plan.md](../plan.md) · **Date**: 2026-08-13

Onboarding is an internal UI flow, so its contracts are the URL surface, the
module boundaries between its parts, and the guarantees the finish step makes.
It **exposes no new service interface** — every persistence contract it uses is
001's, referenced here rather than restated.

---

## 1. URL contract

| Route | Meaning | Guard |
|---|---|---|
| `/onboard-brand` | Start. Basics step, no brand yet. | Authenticated |
| `/onboard-brand/:slug?step=material` | Material step for an in-progress brand. | Authenticated · owns brand · onboarding unfinished |
| `/onboard-brand/:slug?step=review` | Review step. | Same |
| `/onboard-brand/create` | **Deleted.** 302 → `/onboard-brand`. | — |
| `/onboarding-brand` | Already a shim. 302 → `/onboard-brand`. | — |

Rules:

- `?then=<url>` is preserved verbatim across every step, branch switch and
  redirect, and is the destination on finish when present (FR-036, FR-032).
- `?step=` is advisory. The authority on where the user is, is the brand's
  onboarding marker; an out-of-range `?step=` redirects to the recorded step.
- A `:slug` whose brand has `completedAt` set redirects to `/b/:slug/setup` —
  onboarding is not a way to re-edit a finished brand.
- A `:slug` the user does not own resolves as not-found, decided at the data
  layer, not by hiding the route (FR-040).

---

## 2. Module contract

```text
steps/*            ──▶  understanding/interpret.ts   ──▶  Proposal[]
                                    │
                                    ▼
                   understanding/acceptance.ts   ──▶  canonical ops · promoteCoreValue
                                    │
                                    ▼
                   shared/onboarding/onboardingState.ts  ──▶  brandStore.update
```

Boundaries that must hold, each enforced by a test:

1. **`understanding/` never writes.** `interpret()` is pure: material and text in,
   proposals out. It has no import path to any service or store. This is what
   makes the mapping unit-testable without a database.
2. **`acceptance.ts` is the only module that promotes.** It is the single caller
   of `promoteCoreValue` in the feature, so the per-value rule (FR-025) has one
   place to be right.
3. **`features/onboarding/` has no import path to kit adoption or design storage**
   (FR-030). Same shape as 001's context-isolation test.
4. **`features/onboarding/` never writes `assets`, `brandAssets` or `logoAssets`**
   on a brand patch (FR-026).

---

## 3. Interpretation contract

```ts
function interpret(input: {
  description?: string;
  items: LibraryItemSummary[];   // already in the Library
  directions?: StyleDirection;   // new-brand branch
}): Promise<Proposal[]>;
```

Guarantees:

- **Pure and side-effect free.** No writes, no navigation, no toasts.
- **Never throws for want of the assisted tier.** When the proxy is unavailable,
  the deterministic parser supplies the same shape (FR-020). A caller cannot tell
  which tier produced a proposal except by its `provenance`.
- **Only closed paths.** Every emitted `corePath` is a `CoreFieldPath`; anything
  that does not map is not emitted, and its source item stays unplaced (FR-021).
- **No invention.** A proposal must trace to supplied material or supplied text
  via its `evidence`. Nothing is proposed from nothing.
- **Deterministic ordering** for a given input, so the review does not reshuffle
  between renders.

---

## 4. Acceptance contract

```ts
function acceptProposal(brandId: string, path: CoreFieldPath, actor: HumanActor): Promise<void>;
function acceptAll(brandId: string, paths: CoreFieldPath[], actor: HumanActor): Promise<void>;
function editValue(brandId: string, path: CoreFieldPath, value: unknown, actor: HumanActor): Promise<void>;
```

Guarantees:

- `acceptProposal` performs **exactly one** promotion, for exactly the path given.
- `acceptAll` is a loop over `acceptProposal`. It MUST produce byte-identical
  `IdentityMeta` to accepting each path individually, and it introduces no
  group-level record (FR-025c). A test asserts the two paths converge.
- `editValue` writes through the canonical op **and then promotes** — a human
  write alone records `provisional`, not `confirmed`, so the promotion is what
  satisfies "a user edit makes that value Confirmed" (FR-025).
- **Reading is never accepting.** No function in this module is called from a
  render path, an effect on mount, an intersection observer, or a scroll handler
  (FR-025a). A test asserts the review renders without any promotion occurring.
- **Never `official`.** The target authority is hard-coded to `'confirmed'`; the
  signature offers no way to ask for `official` (FR-025d).

---

## 5. Finish contract

`finish(brandId)` guarantees, in order:

1. Every accepted value is at `confirmed`; every untouched proposal is still
   below it.
2. No value is at `official`.
3. Business Info has been written if any business fact was gathered.
4. Context signals have been attempted — and a failure here is swallowed, never
   surfaced, never blocking (FR-029).
5. `onboarding.completedAt` is set, so the brand stops reading as unfinished.
6. The user is navigated to `?then=` or `/b/:slug/setup` (FR-032).

**Failure reporting** (FR-031): any step that does not complete is named to the
user. The flow never reports success for something it did not store. Because
material and Core values were written as they were produced, a failure here costs
only the step that failed — the brand and everything before it are already
durable.

**Idempotence**: calling `finish` twice is safe. Promotion of an already-confirmed
value is a no-op, and `completedAt` is written once (FR-005).

---

## 6. Referenced Foundation contracts (unchanged)

Restated nowhere; see 001.

| Contract | Location |
|---|---|
| `IAssetsService` — Library create/list/flags/folders | [001 contracts/services.md](../../001-brand-system-foundation/contracts/services.md) |
| `IBrandContextService` — record/list/remove/summarize | same |
| `IKitAdoptionService` — **not used by this feature** | same |
| Canonical Core write ops + `CoreWriteOptions` | `src/application/brand/` |
| `promoteCoreValue` / `demoteCoreValue` | `src/application/brand/promoteCoreValue.ts` |
| Library and identity persistence, RLS | [001 contracts/persistence.md](../../001-brand-system-foundation/contracts/persistence.md) |

---

## 7. The one contract this feature changes

`recordCoreWrite` (`src/domain/brand/coreMeta.ts`) — a system write to a path with
**no existing metadata entry** records `suggested` instead of inheriting
`DEFAULT_CORE_VALUE_META`'s `provisional`. **Approved 2026-08-13**, scoped to that
one branch.

Explicitly preserved: `coreValueMeta()`'s READ default stays `provisional` /
`imported`, so pre-sidecar data behaves exactly as it does today. A human write to
a fresh path still records `provisional`. A system write over a settled value still
demotes to `provisional`.

Unchanged by this: the function's signature, INV-3 (a system actor cannot reach
`confirmed` or `official`), promotion never rewriting provenance, and
`promoteCoreValue` remaining the only door upward.

See [research.md §R2](../research.md) for the evidence that the branch has no
existing callers.

---

# Addendum — Revision R1 (2026-08-14)

## 8. Source-priority contract *(new — the one pipeline property R1 adds)*

```ts
// understanding/sources.ts — pure, no imports beyond types
export const RANK = { ai: 0, brief: 1, uploaded: 2, user: 3 } as const;

export function mergeCandidates(candidates: Candidate[]): Proposal[];
```

**Guarantees:**

1. For any Core path, the surviving candidate is the one with the highest rank.
2. Ties are broken by order of arrival, deterministically.
3. Re-running interpretation is idempotent with respect to rank: a rank-0
   suggestion can never displace a rank-3 user value, on any run (SC-016).
4. **`mergeCandidates` is the only function in the feature that constructs a
   `Proposal`.** Enforced by the boundary test, which is what makes guarantee 1 a
   property of the system rather than of each call site.

## 9. Brief contract *(new — two-way)*

```ts
// brief/prompt.ts
export function buildBriefPrompt(brandName: string): string;

// brief/parseBrief.ts   — pure, deterministic, no network
export function looksLikeBrief(text: string): boolean;
export function parseBrief(text: string): ParsedBrief;
```

**Guarantees:**

1. `looksLikeBrief` returns true only when at least three of the prompt's declared
   labels appear at line starts. Ordinary prose must not trigger it.
2. `parseBrief` never throws. Unrecognised lines are returned as residual prose.
3. A brief answered in the documented shape round-trips: every label
   `buildBriefPrompt` emits is a label `parseBrief` recognises. Pinned by test.
4. When `looksLikeBrief` is true, **no assisted-understanding call is made**
   (FR-052, SC-012).
5. `buildBriefPrompt` embeds the current vocabularies, so the prompt and the
   normaliser can never disagree about the allowed options.

## 10. Vocabulary contract *(new)*

```ts
// vocabulary/normalize.ts — pure
export function normalize(text: string, vocab: VocabularyMember[]): Normalized;
```

**Guarantees:**

1. Every member's own label normalises back to that member.
2. A miss returns `{ kind: 'other', text }` with the user's wording **verbatim** —
   never truncated, cased or coerced to a member (FR-054).
3. `normalize` is total: it returns for any input, including empty.

## 11. Processing-stage contract *(new)*

```ts
// understanding/stages.ts
export function planStages(input: UnderstandingInput): Stage[];
```

**Guarantees:**

1. A stage is present only when the work it names is scheduled for this run. Copy
   for work that will not happen is therefore unrepresentable, not merely unused
   (FR-058, SC-014).
2. `run()` returns a real finding or `null`; the moment never invents one.
3. `planStages` performs no I/O and no timing. The minimum beat (FR-061) is applied
   by `UnderstandingStage` as a floor on the screen after the work resolves, and is
   never a delay inserted between stages.

## 12. Revised URL contract

§1's step vocabulary is renamed; the count stays three:

```text
/onboard-brand                       → name      (split layout)
/onboard-brand/:slug?step=profile    → profile   (describe + upload + website)
                                                 (understanding runs on leaving)
/onboard-brand/:slug?step=review     → review    (the retired review page)
```

Unchanged: the brand is the authority and `?step=` is advisory; an out-of-range
value is corrected to the recorded step; a finished brand redirects to
`/b/:slug/setup`; `?then=` survives every step and every resumed session.

## 13. Contracts explicitly NOT changed by R1

`§4` (acceptance) and `§5` (finish) are untouched. `acceptance.ts` remains the only
module that calls `promoteCoreValue`, the target stays hard-coded to `'confirmed'`,
and no acceptance may be triggered from a render path. The processing moment, the
brief and the vocabularies all sit *upstream* of these contracts and none of them
promotes anything.
