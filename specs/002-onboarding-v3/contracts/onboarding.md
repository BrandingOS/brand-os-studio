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
