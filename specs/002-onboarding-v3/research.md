# Phase 0 Research: Onboarding V3

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-08-13

Scoped to what 002 needs, per the constitution's "scoped verification, not full
audits". Every finding below was verified against the code on `v3-onboarding`.

---

## R1 — Proposals need no new store

**Decision**: represent a proposal as a Core value whose authority is below
`confirmed`, not as a separate record.

**Rationale**: 001 already models exactly this. `IdentityMeta` keys authority and
provenance per `CoreFieldPath`; `AUTHORITY_ORDER` ranks `suggested < provisional
< confirmed < official`; `promoteCoreValue` is the only door above the line and
takes a `HumanActor` with no default. A proposal store beside this would be a
second source of truth for brand values — precisely what Principle II forbids and
what brand-first was chosen to avoid.

Consequences that fall out for free: proposals survive a closed tab because they
live on the brand; the review screen is a filter over Core rather than a join
across two stores; and provenance still records "began as an AI suggestion" after
a human confirms it, which is the two-dimension guarantee working as designed.

**Alternatives considered**: an onboarding-owned proposal table (rejected —
second source of truth, and it would have to be reconciled into Core at the end,
reintroducing the commit pass brand-first removes); holding proposals in browser
state (rejected — breaks cross-device resume, which brand-first otherwise gives
for free).

---

## R2 — `suggested` is unreachable for a new value

**Finding**: no operation in the Foundation can record a fresh Core value at
`suggested`.

`recordCoreWrite` resolves a system write as:

```ts
authority = settled ? 'provisional'
          : current.authority === 'suggested' ? 'suggested'
          : 'provisional';
```

`current` comes from `coreValueMeta`, which falls back to
`DEFAULT_CORE_VALUE_META` — `provisional` / `imported` — when there is no entry.
So the first system write to an unset path lands at `provisional`, and the
`suggested` branch is reachable only for a value that is *already* `suggested`,
which nothing can make it. `recordCoreAuthorityChange` cannot help: it requires a
`HumanActor`, and `demoteCoreValue` floors at `provisional`.

This collides with the locked decision that untouched AI proposals remain
Suggested.

**Decision**: open a fresh system write at `suggested` — i.e. when there is no
existing metadata entry for the path, a system actor's write records `suggested`
rather than inheriting the legacy default.

**Rationale**: `DEFAULT_CORE_VALUE_META`'s own docblock scopes it to "data that
predates the sidecar… we have no record of the act, so claiming confirmation
would be inventing provenance". A brand-new AI proposal is the opposite case: we
know exactly who wrote it and that no human decided. Applying the legacy-backfill
default to it is a mis-fit, not a rule.

Evidence that the change is contained:

| Check | Result |
|---|---|
| System-actor callers in `src/` today | **None.** `SystemActor` appears only in its own type definition — the branch is unreachable in production. |
| Existing test on this path | `coreMeta.test.ts:103` asserts `isAtLeast(authority,'confirmed') === false`, not the exact band. Stays green; its title needs updating. |
| INV-3 (system cannot reach confirmed/official) | Untouched. |
| `promoteCoreValue` as the only door upward | Untouched. |
| Interface change | None. |

**Alternatives considered**: accept `provisional` as the proposal band —
constitutionally valid (Principle V permits Suggested, Inferred *or* Provisional
below the line) but contradicts the locked decision and erases the distinction
between "the machine guessed this" and "a human set it but hasn't confirmed";
hold proposals outside Core — rejected under R1.

**Status**: flagged for owner approval in plan §9. The rest of the plan is
unchanged either way.

---

## R3 — Material intake

**Decision**: upload to the Library through `IAssetsService.create` as each file
arrives, not in a batch at the end.

**Rationale**: brand-first means a brand id exists from the naming step, so
there is nothing to defer. Incremental upload also makes the "material too large"
edge case honest — the refusal happens at the point of upload rather than
silently at the end, which is the failure mode the current flow has.

The existing `hashFile` (SHA-256, with a name+size+mtime fallback in non-secure
contexts) serves twice: it is the in-flow duplicate check and the Library's
`contentHash`, which `useAssetUpload` already persists and dedupes on.

**Alternatives considered**: staging uploads and committing at finish (rejected —
that is the model brand-first replaces, and it is what makes the current flow's
tiered recovery machinery necessary).

---

## R4 — Logos

**Decision**: a logo is a Library item plus a `logoSystem` reference, written
through the existing `stageLogoRef` → `brandStore.update` path.

**Rationale**: this is the path `useAssetUpload` already takes for role uploads,
including the correctness note that downstream must use the id the Library
returned rather than the staged content-hash id — a Supabase brand cannot honour
an app-minted id, and pointing `logoSystem` at one strands every logo in
production while working locally. Reusing the existing path inherits that fix
rather than re-deriving it.

`logoSystem` remains an unrouted Core key (no canonical op yet, by 001's own
accounting), so it travels the legacy service path to the `logo_system` column.
That is unchanged by this feature and is not reopened here.

---

## R5 — Onboarding progress

**Decision**: one additive `jsonb` column on `brands`, holding step, branch,
start and completion.

**Rationale**: FR-035 requires resume at the recorded step, cross-session and
cross-device, which rules out browser storage. It cannot be derived: Core
completeness cannot distinguish "still in onboarding" from "finished with a
name-only brand", and mis-reading the second as the first would drag a finished
user back into the flow.

Absent means "not created by onboarding", so every pre-existing brand reads as
finished and no backfill is needed. Column absence is tolerated on the
pre-migration path exactly as `business_info` is, so the code can ship ahead of
the migration and degrade to non-resumable rather than to a failed save.

**Alternatives considered**: a separate `brand_onboarding` table (rejected —
one-to-one with `brands`, no independent lifecycle, more RLS surface for nothing);
storing it inside `business_info` or `identity` (rejected — blurs concepts, and
Principle IV is explicit).

---

## R6 — Interpretation

**Decision**: keep the existing two-tier interpretation and remap its output to
proposals.

**Rationale**: `parseDescription.ts` already calls Claude through the
server-side proxy and falls back to a deterministic keyword parser on any
failure, which satisfies FR-020 without new work. The filename/alpha/aspect
heuristics already classify uploads, and the trained classifier stays opt-in
behind `VITE_CLASSIFIER_URL` — meaning deterministic interpretation is the
shipping behaviour and the classifier only sharpens it where enabled.

What changes is only the output shape: instead of writing plain values, both
tiers emit `Proposal` records carrying a `CoreFieldPath`, a value, and a
provenance of `ai-suggested` (assisted parse) or `inferred` (derived from
evidence such as pixel analysis or filename).

---

## R7 — Business Info and Context scope

**Decision**: Business Info takes only what the user actually supplied — links,
website, audience summary, description, industry where stated. Context takes two
signal kinds at most.

**Rationale**: Principle I. `BusinessInfo` has fields for legal name, founded
year, full postal address and more; populating them would mean asking questions
onboarding has no reason to ask. The `links` array maps directly onto what the
link intake already detects, and `audienceSummary` onto what interpretation
already produces.

For Context, `IBrandContextService.record` is explicitly fire-and-forget and
never authoritative. The MVP records a `preference` signal when a user rejects a
proposal (so later suggestions can avoid it) and a `reference` signal for
material flagged as reference. Nothing else — and never as a precondition for
finishing (FR-029).

---

## R8 — Retirement is safe to do inside the feature

**Decision**: delete the superseded flow as the final step, gated on acceptance.

**Rationale**: the superseded surface is well bounded — `features/onboarding-v4/`
(~12.4k LOC including a 3.4k-line stylesheet), `pages/onboard-brand/create.tsx`,
and the `pages/onboarding-brand` redirect shim. External importers are limited to
the two page wrappers, the dev registries, and links from `pages/workspace/Home.tsx`
and `BrandSwitcher.tsx` — all of which point at `/onboard-brand`, the path that
survives.

The tested utilities are moved rather than deleted, and their suites move with
them, so retirement does not lose coverage.

**Alternatives considered**: deletion in a follow-up feature or behind a switch —
both rejected by the owner's locked decision, and both would leave a second
onboarding implementation alive in the tree.

---

## R9 — No new runtime dependency

Verified: every capability this feature needs already has an implementation in
the repo — upload intake, hashing, image analysis, zip extraction (jszip, already
a dependency), the AI proxy client, the Library services, the canonical write ops,
the DS. Nothing is added to `package.json`.
