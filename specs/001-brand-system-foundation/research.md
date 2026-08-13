# Phase 0 — Research & Decisions: Brand System Foundation MVP

**Date**: 2026-08-13 · **Feature**: `001-brand-system-foundation`

All decisions below are grounded in a scoped inspection of the existing codebase
(brand domain + persistence, Setup adapters, Brand Kit state, asset stores, design
storage, RLS policies, service/store patterns, test infra, migrations, and the
Design System surface). No greenfield options were considered where an existing
capability could become the canonical implementation.

Decision order applied to every subsystem:
**Reuse existing → Adopt proven library/service → Extend or wrap → Build custom.**

---

## Part A — Architectural decisions (reuse-first)

### D1. Core DNA lives in the existing canonical identity model

**Decision**: Extend `BrandIdentity` (`src/domain/brand/identity.ts`) into Brand Core
DNA. Do NOT create a new V3 brand model, store, or table.

**Rationale**: The canonical model already exists and already covers 5 of the 7 Core
subsystems (colors, logos, typography, strategy, voice) with zod validation
(`invariants.ts`), a repository port (`repository.ts`), a legacy resolution boundary
(`fromLegacy.ts` / `toLegacy.ts`), application-layer write ops
(`src/application/brand/change*`), and a persisted home (`brands.identity` JSONB,
migration 013). It is the constitution's canonical record in embryo. Building beside
it would create exactly the second source of truth this feature exists to eliminate.

**What is added**: `visualStyle`, `positioning`/`audience` essentials, and `rules` —
the two Core subsystems the canonical model does not yet cover.

**Alternatives rejected**:
- *New `brand_core` table with normalized value rows* — would require rewriting every
  consumer of `colorSystem.primary.hex`-style access; large blast radius, no MVP
  benefit, and duplicates a working JSONB model.
- *Keep Core in the legacy `Brand` scalars* — the four coexisting generations are the
  problem being solved.

---

### D2. Authority + provenance as a path-keyed sidecar, not value wrappers

**Decision**: Store authority and provenance in a **sidecar metadata map** keyed by a
**closed, enumerated registry of Core field paths**:

```
identityMeta: Record<CoreFieldPath, { authority, provenance, setBy, setAt }>
```

Do NOT wrap each Core leaf value in `{ value, authority, provenance }`.

**Rationale**:
- **Additive and non-breaking.** Every existing reader (`colorSystem.primary.hex`,
  `typography.primary.family`, editor `SlotRef` resolution, renderers, exports) keeps
  working untouched. Wrapping leaves would break ~all of them at once — a rewrite in
  everything but name, and a direct violation of "evolve, don't rewrite".
- **One enforcement point.** "AI may write below Confirmed; only an authorized human
  promotes" is enforced in one place (the promotion op) rather than at every leaf.
- **Machine-readable and structured** (Principle III) *because* the path set is a
  closed registry validated by test — not free-form strings that can drift from the
  value tree.

**Trade-off accepted**: a sidecar can drift from the value tree. **Mitigation**: the
`CoreFieldPath` registry is a typed union with a unit test asserting every path
resolves against the identity schema, and metadata for unknown paths is dropped on
read (self-healing, no dangling keys).

**Alternatives rejected**:
- *Per-value wrapper objects* — breaking change across the whole app for no MVP gain.
- *Separate `brand_core_meta` table* — a per-brand row-per-field table is more moving
  parts than one JSONB column for data that is always read with its brand.
- *Single brand-level status* — cannot express "colors confirmed, voice still
  provisional", which is the entire point of skip-and-continue.

---

### D3. `BrandRepository` is the single write authority for Core

**Decision**: All Core writes route through `BRAND_REPOSITORY` + the application-layer
ops. `brandStore.update()` is narrowed: patches touching Core fields are rejected in
development (loud) and routed through the canonical op path; non-Core fields (name,
publicUrl, flags) continue through the service.

**Rationale**: The pattern already exists and is already used by Setup and
`setTypescale`. Six competing write paths exist today; convergence is a matter of
narrowing the store and migrating call sites, not building new machinery.

**Alternatives rejected**: *A new `BrandSystemService` facade* — would become a
seventh write path during the transition and duplicate `BrandRepository`'s job.

---

### D4. `public.assets` + `IAssetsService` is the Brand Library

**Decision**: The existing assets table and service become the one Brand Library.
Extend with: `origin`, `folder_id`, `is_favorite`, `is_disliked`, `archived_at`,
`use_as_reference`, `legacy_ref_id`, plus a new `brand_folders` table. Migrate
`brand.assets[]` and `brand.brandAssets[]` into it.

**Rationale**: Reuse wins on every axis — the table exists with **membership-aware
RLS via `is_brand_member()`**, the storage bucket exists with brand-id-path-scoped
policies, the service pair (local + Supabase) exists, and DamPage already performs a
one-way legacy copy. Columns are additive; RLS is inherited.

**The `logoSystem` ref problem**: `logoSystem` slots are `AssetRef { assetId }` into
`brand.brandAssets[]`, whose ids are app-generated strings while `assets.id` is a
uuid. Migration therefore: (1) inserts Library rows carrying `legacy_ref_id` = the old
brandAssets id, (2) rewrites the brand's `logoSystem` refs to the new Library ids, and
(3) leaves a read-through fallback on `legacy_ref_id` for any ref not yet rewritten.
`legacy_ref_id` is dropped when zero rows populate it and no reader uses it.

**Alternatives rejected**:
- *Adopt a hosted DAM (Cloudinary / Filestack / Uploadcare)* — evaluated and rejected:
  vendor lock-in for the product's most brand-sensitive data, a second auth/tenancy
  model to reconcile with `is_brand_member()`, per-asset egress cost, and loss of UX
  control over the Library surface. Supabase Storage already provides private buckets,
  RLS, and CDN delivery, and is already paid for.
- *New `library_items` table* — a rename of an existing correct table plus a data
  migration and a dead twin. Rejected on Principle II.

---

### D5. Official Kit = adoption records, never copies

**Decision**: New `brand_kit_adoptions` table holding
`(brand_id, target_kind, target_ref, adopted_by, adopted_at, note)` where
`target_kind ∈ {core_value, library_item, kit_deliverable}`. The row is a **reference
plus adoption metadata** — it never contains a copy of the adopted object.

**Rationale**: Directly implements FR-022/024. Three enumerated kinds is not a generic
entity platform; it is the exact set of things the product can adopt today.

**Alternatives rejected**:
- *An `is_official` boolean on each source table* — cannot record adopter/time,
  scatters the Kit across three tables, and makes "show me the Official Kit" a
  three-way union query.
- *Copying adopted material into a kit table* — the duplication the spec forbids.

---

### D6. Kit state gets a server-backed repository through the existing seam

**Decision**: Implement `SupabaseKitStateRepository` behind the existing
`KitStateRepository` seam (`src/features/brand-kit/kit/repository.ts`), wired in
`boot.ts`'s `reconfigureForAuth`. **The interface must first change from synchronous
to async** (`load`/`save` → `Promise`), touching its two call sites in `kitStore.ts`.

**Rationale**: The swap seam already exists and has zero current callers of
`setKitStateRepository` — it was built for exactly this. The sync signature is the
only real obstacle and is a 2-call-site change.

**Alternatives rejected**: *Local cache fronting a background sync* — invents a
write-behind cache (speculative infrastructure) to avoid a two-line signature change.

---

### D7. Context v1 = one signals table + Library flags

**Decision**: New `brand_context_signals` table
`(id, brand_id, kind, target_kind, target_ref, value, source, created_at)`, plus
"explicit references" expressed as the Library's `use_as_reference` flag (no duplicate
storage). `LocalBrandMemoryService`'s ranked color/font usage becomes a **derived
read** over this table plus designs — not a second store.

**Rationale**: Satisfies FR-010–013 with one table and no engine. Signals are plain
rows; there is no embedding, retrieval, ranking service, or scheduler.

**Alternatives rejected**:
- *Adopt an analytics/event pipeline (PostHog, Segment)* — evaluated and rejected:
  this is first-party product data that must be read back per brand under RLS,
  inspectable and correctable by the user (FR-013). Analytics vendors are write-mostly,
  externally hosted, and would put brand-identifying signals off-platform.
- *Event sourcing the brand* — explicitly out of scope.

---

### D8. Business Info = one additive JSONB column on `brands`

**Decision**: `brands.business_info JSONB`, validated by zod, written through
`BrandRepository`.

**Rationale**: One row per brand, no relations, no queries across it in the MVP. A
column is the smallest correct thing. The **future boundary** is preserved by keeping
it a discrete namespace: future People/Products/Services/Locations become their own
`brand_id`-scoped tables referencing the brand, with zero change to this column.

**Alternatives rejected**: *A `business_entities` table with a `kind` discriminator* —
the generic entity platform the spec forbids.

---

### D9. Work/Outputs — reuse both existing homes, add provenance

**Decision**:
- **Constructive outputs** stay in `public.designs` / `IDesignStorage`
  (`BrandOSDocument`). Unchanged.
- **Generative media** are **Library items** with `origin='generated'` and a
  `provenance JSONB` payload (prompt/context/model/inputs/relationships).

**Rationale**: Avoids a third work store entirely. It also makes FR-029 structurally
true — a generated image saved to the Library *is* the Library item, so it cannot
fork. The two families stay distinct because they live in the representation that
suits them (document vs media asset), per Principle VIII.

**Alternatives rejected**: *A unified `work_items` table over both families* —
forces documents and media into one shape, which the spec explicitly forbids.

---

### D10. `designs` RLS stays owner-scoped in the MVP

**Decision**: Do not widen `public.designs` to membership-aware RLS in this feature.
New tables use `is_brand_member()`.

**Rationale**: Owner-scoped IS enforced isolation (Principle XI is satisfied). Migration
015 already documents sharing as a deliberate follow-on, and no MVP consumer needs a
second user to read a design. Widening now would be speculative.

**Flagged**: this is the one place where the six concepts differ in sharing model; the
follow-on is recorded, not silently ignored.

---

## Part B — Build-vs-adopt checks (substantial capabilities only)

Trivial components were not researched. Four capabilities warranted a check.

### BA1. Asset storage & delivery — **REUSE** (Supabase Storage)

| Axis | Supabase Storage (reuse) | Cloudinary / Filestack (adopt) |
|---|---|---|
| Architecture fit | Already integrated; bucket policies already keyed to `brand_id` path | Second tenancy model to reconcile with RLS |
| Maintenance | Zero new surface | New SDK, keys, webhooks |
| License/cost | Included | Per-asset + egress |
| Security | RLS + `is_brand_member()` already proven | Brand-sensitive data off-platform |
| Lock-in / replaceability | Already a core dependency | High; asset URLs become vendor URLs |

**Verdict**: Reuse. No new dependency.

### BA2. Image derivatives (thumbnails, downscale) — **ADOPT the platform feature**

No client-side compression library exists in `package.json` today.

**Decision**: Use **Supabase Storage image transformations** (server-side, on-demand)
for thumbnails in authenticated mode; use a small canvas downscale for local mode.
Do **not** add `browser-image-compression`, `pica`, or `sharp`.

**Rationale**: Zero bundle cost, no new license, no new maintenance, and it is a
feature of a dependency already core to the product. Replaceability is high (URLs
carry transform params; swapping to another CDN is a URL-builder change).

### BA3. List virtualization — **DEFER (conditional adopt)**

No virtualization dependency exists. A brand Library can plausibly reach hundreds of
items, but the MVP has no measurement.

**Decision**: Do not add virtualization now. **Trigger for adoption**:
`@tanstack/react-virtual` (MIT, headless, ~3 kB, same vendor as the already-installed
`@tanstack/react-query`) is adopted only when a real brand Library exceeds a measured
render-cost threshold. Recorded here so the choice is pre-made, not pre-built.

**Rationale**: Adding it now would be speculative (Principle I). Naming the trigger and
the winner is the "stable boundary" half of the rule.

### BA4. Data-fetching layer for the Library — **REUSE the house pattern (zustand)**

`@tanstack/react-query@^5.83.0` is installed but used **only** as a provider shell in
`App.tsx`; zero features use it. The Library (list + optimistic favorite/archive) is
exactly the surface that would benefit.

**Decision**: Stay on the zustand + service pattern for MVP consistency. Adopting
react-query here would introduce a **second data-access pattern** to a codebase where
every store follows one shape — a coherence cost larger than the caching benefit at
MVP scale.

**Recorded as a separate future decision** with its own trigger (Library pagination or
cross-surface cache invalidation becoming a real problem), not folded into this
feature.

**Also considered and rejected as trivial**: `react-dropzone` is already installed and
is reused for uploads (no research needed); `zod` is already the validation standard;
Supabase CLI migrations are already the schema tool.

---

## Part C — UI & Design System research

Ran the repository's mandatory UI/DS pre-flight. Findings that shape the plan:

- **The DS covers most of what this feature needs**: `DsBadge`, `DsStatusDot`,
  `DsChip`, `DsEmptyState`, `DsSkeleton`, `DsProgress`, `DsToast`, `DsBanner`,
  `DsModal`, `DsConfirmDialog`, `DsAssetRow`, `DsSwatchRow`, `DsLogoTile`,
  `BrandMark`/`LoadingPill`, `DsTabBar`, `DsRail`, `DsSegmented`.
- **Three UI layers coexist**: DS (`src/shared/ds`, 18 consumers), shadcn
  (`src/components/ui`, 51 components — the DAM/Library page is here), and a
  Tailwind `cn()` shared layer (`src/shared/ui`). Any new surface needs an explicit
  layer decision; new Studio work is DS-only per repo policy.
- **Genuine gaps relevant to this feature**: no icon slot on `DsBadge` (needed to
  express authority/provenance compactly); `DsDropZone` is presentational only (no
  drag events); the save-state vocabulary (`idle/saving/saved/error`) lives inside
  `features/editor/core` and cannot be reused by Setup/Library/Kit; no
  card/panel container primitive (Setup and Brand Kit each rolled their own
  `Section`).

**Decisions** (full pre-flight report in `plan.md` §UI):
1. **Extend `DsBadge` with an optional icon slot** — generic, ~10 lines, needed by the
   authority chip in P1. **The only DS change in this feature.**
2. **Authority/provenance chip is a PRODUCT component, not a DS primitive** — it
   composes `DsBadge`; product concepts never enter the DS.
3. **Deferred to the Library surface feature** (trimmed during final review — the
   surfaces that need them are not built here, so building them now would be an
   unnecessary DS refactor):
   - `DsDropZone` drag events + `onFiles` — `features/dam/AssetUploadZone` already
     covers the existing surface.
   - Promoting the save-state indicator to `DsSaveState` + moving `useAutoSave` to
     `shared/hooks` — real duplication, but with the Library UI deferred the honest
     consumer count is 1 (the editor, which already has it).
   - A `DsCard`/`DsSection` container — real observed duplication (Setup's `Section`,
     Brand Kit's `KitSection`), promote with the surface work.
   - Full DAM (shadcn) → DS port.

---

## Open questions carried into the plan

None blocking. Two decisions are deliberately deferred with named triggers
(virtualization BA3, react-query BA4) and one is deliberately scoped out with a
recorded follow-on (`designs` sharing, D10).
