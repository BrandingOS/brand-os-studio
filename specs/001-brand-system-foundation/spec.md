# Feature Specification: Brand System Foundation MVP

**Feature Branch**: `v3-brand-system` (spec directory: `001-brand-system-foundation`)

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Brand System Foundation MVP — establish the smallest correct shared foundation that Onboarding, Setup, Brand Kit, Library, and Create can all use without creating competing sources of truth. An evolution of the existing product, not a rewrite."

## Overview

BrandingOS today holds brand truth in several parallel places that were each right
for their moment: multiple generations of the brand record coexist in one object,
three different asset stores accept uploads, the Brand Kit keeps its own approval
state locally, and each surface (Setup, Brand Kit, Editor) reads the brand through
its own adapter shape. It works, but every new feature must choose which truth to
believe, and the choices are starting to disagree.

This feature establishes the **Brand System Foundation**: one shared, structured
brand system with six distinct concepts — Brand Core DNA, Brand Context, Business
Info, Brand Library, Official Brand Kit, and Work/Outputs — that Onboarding, Setup,
Brand Kit, Library, and Create all read and write through the same authority. It is
a convergence of the existing codebase toward the canonical model that already
exists in embryo (the canonical brand identity model and its repository), not a
second system built beside it.

Constitution alignment: Principles II (one canonical truth), III (structured Core),
IV (six concepts distinct), V (AI proposes, human disposes), VII (never trapped /
creation never blocked), VIII (outputs match their nature), IX (evolve, don't
rewrite), XI (brand isolation at the data layer).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One brand truth across all surfaces (Priority: P1)

A brand owner edits their brand (for example, changes the primary color or swaps a
logo) in any one surface — Onboarding, Setup, Brand Kit, Library, or Create — and
every other surface immediately reflects the same value. There is no surface where
a stale or divergent copy of a Core value survives the edit.

**Why this priority**: This is the foundation's reason to exist. Every other story
depends on a single coherent brand record; without it, the product keeps growing
competing states.

**Independent Test**: Edit each Core subsystem (color, typography, logo, voice,
strategy) in Setup, then open Brand Kit, the Create editor, and the Library, and
verify each reads the new value. Repeat with an edit originating in the editor's
brand tools and verify Setup shows it.

**Acceptance Scenarios**:

1. **Given** a brand with a confirmed primary color, **When** the user changes the
   primary color in Setup and saves, **Then** Brand Kit previews, editor brand
   slots, and Library brand chips all render the new color without a refresh
   ritual or re-login.
2. **Given** a brand edited through the Create editor's brand tools (e.g. font
   change), **When** the user returns to Setup, **Then** Setup shows the same
   font as the current value.
3. **Given** any Core value, **When** it is written by two different surfaces in
   sequence, **Then** the last write wins consistently and no surface retains the
   intermediate value from its own private store.

---

### User Story 2 - Skip freely; creation is never blocked (Priority: P1)

A new user starts a brand, answers only what they feel like answering, skips the
rest, and immediately creates work. The system fills gaps with clearly-identified
Suggested/Provisional values (e.g. a proposed palette), uses them for creation,
and never nags. Later, the user confirms or replaces the provisional values at
their own pace.

**Why this priority**: Constitution Principles V and VII are the product's
signature behavior — delegation without silent truth-making. It must be designed
into the foundation, not retrofitted.

**Independent Test**: Create a brand providing only a name. Verify creation
surfaces work, that values in use are marked with a non-official status internally,
and that nothing the system proposed appears as Confirmed/Official without an
explicit user action.

**Acceptance Scenarios**:

1. **Given** a brand with no colors chosen, **When** the user opens Create, **Then**
   creation proceeds using system-filled Provisional colors and the user is not
   routed back to onboarding.
2. **Given** a Provisional value in use, **When** the user takes no action on it,
   **Then** its authority remains non-official indefinitely — time or usage never
   promotes it.
3. **Given** a Provisional value, **When** the user explicitly accepts it, **Then**
   its authority becomes Confirmed while its provenance still records how it
   originated (e.g. AI-suggested), and consuming surfaces can distinguish both
   dimensions.
4. **Given** an onboarding session abandoned midway, **When** the user returns,
   **Then** everything entered so far is present and the user resumes where they
   left off.

---

### User Story 3 - Promote work into the Official Brand Kit (Priority: P2)

A user generates or uploads material (a logo variant, a color exploration, a social
template) and — when satisfied — explicitly promotes it to the Official Brand Kit.
Until that action, nothing generated or uploaded is treated as officially adopted
by the brand.

**Why this priority**: The Official Kit is the product's trust boundary. It gives
"the brand officially owns this" a real meaning, and it is the target of the
Library's promote action.

**Independent Test**: Generate a deliverable, verify it is NOT in the Official Kit,
promote it explicitly, verify it IS, then verify demotion/removal is equally
explicit.

**Acceptance Scenarios**:

1. **Given** a newly generated deliverable, **When** generation completes, **Then**
   the item exists as a candidate/work item and is absent from the Official Kit.
2. **Given** a candidate item, **When** an authorized human explicitly promotes it,
   **Then** it appears in the Official Kit with a record of when and by whom it was
   adopted.
3. **Given** an Official Kit item, **When** the user removes or replaces it, **Then**
   the change is explicit and the underlying material remains in the Library
   (adoption is a status, not the storage location).

---

### User Story 4 - One Brand Library for all brand material (Priority: P2)

A user manages all brand-owned material — uploads, generated assets, and references
— in one Library: organize into folders, favorite/dislike, archive, delete, mark
items as references for AI, and promote items toward the Official Kit. An upload
made anywhere in the product (Setup logo slot, editor image placement, Library
itself) lands in the same Library.

**Why this priority**: Today three different stores accept uploads and only one is
visible in the DAM. Converging them removes the largest source of "where did my
file go" confusion and gives Create one place to look for brand material.

**Independent Test**: Upload an image via the editor, via Setup, and via the
Library page; verify all three appear in the Library. Exercise folder/favorite/
archive/delete/reference flags and verify they persist per brand.

**Acceptance Scenarios**:

1. **Given** an upload initiated from any surface, **When** it completes, **Then**
   the item is visible in the Brand Library with its origin recorded
   (uploaded/generated/reference).
2. **Given** a Library item, **When** the user favorites, dislikes, archives, or
   assigns it to a folder, **Then** that state persists across sessions and
   devices for that brand.
3. **Given** an archived item, **When** browsing the default Library view, **Then**
   it is hidden from the default view but recoverable; **When** deleted, **Then**
   it is gone from the Library (and any Official Kit adoption of it is surfaced
   to the user before deletion completes).
4. **Given** an item marked "use as reference", **When** AI creation runs for that
   brand, **Then** that item is eligible context for generation.

---

### User Story 5 - Created work persists with its brand relationship (Priority: P3)

Everything meaningful a user creates is saved and findable per brand, in two
families that behave according to their nature: constructive outputs (designs,
presentations, documents) reopen as editable structured artifacts; generative
media (images, video) exist as first-class media assets carrying provenance —
what prompt/context produced them and what they relate to.

**Why this priority**: Saved-work persistence largely exists already for designs;
this story extends it with the two-family distinction and generative-media
provenance so Create's outputs stop being second-class.

**Independent Test**: Create one constructive output and one generated image.
Verify both persist per brand, the design reopens editable, the image carries its
generation provenance, and both can be sent to the Library.

**Acceptance Scenarios**:

1. **Given** a saved constructive output, **When** the user reopens it, **Then**
   it opens as an editable artifact (not a flattened image) with its brand
   relationship intact.
2. **Given** a generated image accepted by the user, **When** it is saved, **Then**
   it records its provenance (generated, from what input/context, for which brand)
   and appears as a media asset — not forced into a document.
3. **Given** any saved work item, **When** the brand's Library is browsed with the
   appropriate filter, **Then** the work is discoverable from that brand's scope
   and never from another brand's scope.

---

### User Story 6 - The brand quietly learns preferences (Priority: P3)

As the user works — favoriting, disliking, choosing references, approving items —
the brand accumulates lightweight context: explicit references, likes/dislikes,
and useful soft preferences. AI creation uses this context. The system never
interrupts the user to ask for it and never converts learned context into Core
truth on its own.

**Why this priority**: Lightweight v1 only. It rides on signals the other stories
already produce (favorites, references, approvals) rather than introducing new
UX, so it is deliberately last.

**Independent Test**: Favorite and dislike several items, add references, then
inspect the brand's context store: signals recorded, Core unchanged, no prompt or
interruption occurred.

**Acceptance Scenarios**:

1. **Given** a user favoriting/disliking Library items, **When** the actions
   occur, **Then** they are recorded as brand context signals without any
   confirmation dialog or interruption.
2. **Given** accumulated context, **When** AI creation runs, **Then** relevant
   context (references, preferences) is available to it alongside Core and
   Business Info.
3. **Given** any context signal, **When** inspected, **Then** it has NOT modified
   any Brand Core value's content or status.

---

### Edge Cases

- A brand created before this feature (any of the coexisting legacy shapes) is
  opened: all surfaces must read correct values through the migration path with
  zero data loss and no user-visible "migrate now" step.
- The same Core value is edited nearly simultaneously from two open surfaces:
  last write wins; neither surface is left holding a phantom value.
- A user deletes a Library item that the Official Kit has adopted: the system
  surfaces the conflict before completing deletion.
- A user deletes a Library item that existing saved work depends on: the work
  still opens and renders (its resolved content is intact), and its lineage shows
  an inert record of the deleted item rather than a broken link.
- A user demotes/edits a Confirmed value: allowed (human action), status reflects
  the change; dependent surfaces re-read.
- Creation is attempted on a brand whose Core has zero confirmed values: creation
  proceeds on Suggested/Provisional values; export/publish surfaces may indicate
  provisional status where relevant but must not block.
- A seed/demo brand (not owned by a real user) is edited: edits persist in the
  demo scope without corrupting shared seed data for other users.
- Offline/unauthenticated (local mode) usage: the same concepts and statuses
  behave identically against local persistence; signing in later must not fork
  the truth.
- An asset upload fails midway: no partial Library item is left visible; the
  brand record is not left referencing a nonexistent asset.

## Requirements *(mandatory)*

### Functional Requirements

**Brand Core DNA**

- **FR-001**: The system MUST maintain, per brand, one canonical Brand Core DNA
  record covering: logo system, color system, typography, visual style attributes,
  voice/personality essentials, positioning/audience essentials, and core brand
  rules.
- **FR-002**: Core values MUST be structured and machine-readable (explicit
  attributes, enumerated choices, tokens); free text is reserved for genuinely
  narrative content (e.g. brand story) and never substitutes for a structured
  value a consumer must parse.
- **FR-003**: Every Core value MUST carry two independent dimensions:
  - **Authority** — how far the brand has adopted the value:
    `Suggested` (proposed, not yet in active use) → `Provisional` (in active use
    without human confirmation) → `Confirmed` (explicitly accepted by an
    authorized human) → `Official` (adopted as official brand truth).
  - **Provenance** — where the value came from: `user-entered`, `AI-suggested`,
    `inferred` (derived from evidence such as uploads, imports, or usage), or
    `imported/migrated`.
  Provenance describes origin and never changes with adoption; authority changes
  only through the lifecycle rules below. (The constitution's "Inferred" is a
  provenance, not an authority.) Both dimensions MUST always be available to
  consuming systems and clearly surfaced to the user when relevant, without
  requiring persistent UI labels.
- **FR-004**: The system (including AI) MAY create and update values at any
  authority below Confirmed (Suggested or Provisional), with any provenance.
  Promotion to Confirmed or Official MUST require an explicit action by an
  authorized human; no time-based, usage-based, or AI-driven promotion exists.
  Promotion never rewrites provenance — a Confirmed value still records that it
  was AI-suggested or inferred.
- **FR-005**: Users MUST be able to skip any Core decision and continue; skipped
  areas remain empty or system-filled at a non-official authority
  (Suggested/Provisional).
- **FR-006**: An incomplete Core MUST NOT block creation. Creation surfaces
  operate on confirmed values plus clearly identified provisional context and ask
  the user only when missing information is genuinely required for the task.

**Single write authority & isolation**

- **FR-007**: All reads and writes of Brand Core DNA by any surface (Onboarding,
  Setup, Brand Kit, Library, Create) MUST flow through one shared write authority;
  no surface may maintain its own persistent copy of Core truth or write brand
  truth through a side channel.
- **FR-008**: Derived projections of the Core (editor brand kits, kit previews,
  setup views, resolved document snapshots) remain permitted but MUST be read-only
  and reconstructible from the canonical record.
- **FR-009**: Every brand-scoped datum in all six concepts MUST be scoped and
  authorized to its brand/workspace at the service/data layer. UI filtering is
  never the enforcement mechanism.

**Brand Context (lightweight v1)**

- **FR-010**: The system MUST record, per brand: explicit references (items marked
  "use as reference"), likes/dislikes, and a small set of soft preferences and
  working-memory signals derived from brand activity (e.g. favorites, approvals,
  repeated choices).
- **FR-011**: Context capture MUST be silent — no interruptions, confirmations, or
  prompts are required to record a signal.
- **FR-012**: Context MUST never modify Brand Core content or status. It may only
  inform suggestions and creation.
- **FR-013**: Context v1 is bounded: no embedding/semantic memory engine, no
  cross-brand learning, no conversational memory. The store MUST be inspectable
  (a user can see what the brand has learned) and correctable (signals can be
  removed).

**Business Info**

- **FR-014**: The system MUST maintain, per brand, reusable company information
  needed by current creation surfaces: company name/legal name, description,
  industry/category, audience summary, contact details (email, phone, address),
  and web/social links.
- **FR-015**: The Business Info model MUST be extensible toward future entities
  (People, Products, Services, Locations, Clients) without implementing them now
  — extension is a modeling boundary, not shipped functionality.
- **FR-016**: Creation surfaces that render company facts (business cards,
  letterheads, email signatures, invoices) MUST source them from Business Info
  rather than free-typed per-deliverable copies (per-deliverable overrides remain
  possible as output-level customization).

**Brand Library**

- **FR-017**: The system MUST provide one per-brand Library containing uploaded
  assets, generated assets, and references, with recorded origin for each item.
- **FR-018**: All upload paths in the product MUST land material in this Library;
  no surface writes uploads into a private or parallel store.
- **FR-019**: Users MUST be able to: organize items into folders, favorite,
  dislike, archive, delete, and mark items "use as reference".
- **FR-020**: Archived items are hidden from default views and recoverable;
  archiving MUST have no effect on the Official Kit or on any Work/Output that
  uses the item. Deletion is permanent for the Library item; if the item is
  adopted by the Official Kit or referenced by saved work, the user MUST be
  informed before deletion completes. Deletion MUST NOT corrupt existing
  Work/Outputs: previously saved work remains openable and renderable (work
  retains its resolved content), and the deleted item's place in any lineage is
  preserved as a minimal inert record (identity + name + origin) so provenance
  chains never dangle. This is a tombstone note, not a versioning system.
- **FR-021**: Library state (folders, flags, favorites) MUST persist per brand
  across sessions and devices for authenticated users, and locally in local mode.

**Official Brand Kit**

- **FR-022**: The system MUST represent, per brand, the set of officially adopted
  brand material (the Official Brand Kit) as explicit adoption records that
  REFERENCE Core values and Library/work items. Adoption never copies or
  duplicates the underlying object: the Library item (or Core value) remains the
  single canonical object, and the Kit entry is a reference plus adoption
  metadata.
- **FR-023**: Nothing enters the Official Kit automatically: not uploads, not
  generations, not approvals implied by usage. Adoption MUST be an explicit action
  by an authorized human and MUST record when it happened and by whom.
- **FR-024**: Removing or replacing an Official Kit entry MUST be equally explicit,
  removes only the adoption record (the reference), and MUST NOT delete or alter
  the underlying Library/work item.
- **FR-025**: The existing Brand Kit deliverable lifecycle (candidate → review →
  approved) MUST converge onto this model: "approved" deliverables become
  Official Kit adoptions rather than a private approval state.

**Work / Outputs**

- **FR-026**: The system MUST persist meaningful created work per brand, in two
  families that are never forced into one representation:
  constructive outputs (editable structured artifacts: designs, presentations,
  documents, future websites) and generative media (image/video assets).
- **FR-027**: Constructive outputs MUST reopen as editable artifacts; flat formats
  (PNG, PDF, PPTX) are exports of the artifact.
- **FR-028**: Generative media MUST carry provenance: that it was generated, from
  what input/context, for which brand, and its relationships (e.g. placed into
  which design; promoted to which Library item). Provenance and relationships
  MUST survive the deletion of a related item via the minimal lineage record of
  FR-020 — a work's history never silently loses a link.
- **FR-029**: Work items MUST be relatable to the brand's Library (e.g. a
  generated image saved into the Library) without duplicating the datum's truth:
  saving work into the Library, like Kit adoption, is a reference/registration of
  the one canonical object, never a copy with its own divergent state.

**Shared foundation & migration**

- **FR-030**: Onboarding, Setup, Brand Kit, Library, and Create MUST consume the
  shared brand system through the same contracts; surface-specific adapter shapes
  may exist as read-side conveniences only, never as separate persisted models.
- **FR-031**: Existing brands (all coexisting legacy shapes) MUST continue to work:
  reads resolve through a defined migration path with zero data loss, and
  legacy-shape data is progressively converged to the canonical model on write.
- **FR-032**: Superseded legacy stores and write paths MUST have a named
  replacement and a deletion criterion; they are removed once their consumers are
  migrated (per Constitution Principle IX), not kept as fallback truth
  indefinitely.
- **FR-033**: Local (unauthenticated/dev) mode and authenticated mode MUST expose
  identical concepts and behavior over their respective persistence, and signing
  in MUST NOT fork brand truth.

### Key Entities

- **Brand**: The root aggregate; owns exactly one of each concept below. Carries
  identity (id, slug, name) and workspace/ownership scope.
- **Brand Core DNA**: The canonical structured truth — logo system, color system,
  typography, visual style attributes, voice/personality, positioning/audience,
  core rules. Composed of **Core Values**, each carrying two independent
  dimensions: **Authority** (Suggested | Provisional | Confirmed | Official) and
  **Provenance** (user-entered | AI-suggested | inferred | imported/migrated,
  plus who/what set it and when). Authority evolves through explicit human
  action; provenance is a permanent record of origin.
- **Brand Context Entry**: A lightweight signal — reference mark, like/dislike,
  soft preference, working-memory note — with source event and timestamp.
  Inspectable, deletable, never authoritative over Core.
- **Business Info**: Reusable company facts (names, description, industry,
  audience, contacts, links), modeled to admit future related entities without
  implementing them.
- **Library Item**: A brand-owned piece of material with origin
  (uploaded | generated | reference), format(s), folder membership, flags
  (favorite, disliked, archived, use-as-reference), and lifecycle timestamps.
- **Folder**: A per-brand organizational grouping of Library Items.
- **Official Kit Entry**: An explicit adoption record REFERENCING a Core value or
  Library/work item as "officially ours", with adopter and adoption time. It
  never contains a copy of the adopted object; the referenced item remains the
  canonical object wherever it lives.
- **Work Item**: A saved creation belonging to a brand. Two families:
  **Constructive Output** (structured editable artifact with type, pages/content,
  brand bindings) and **Generative Media** (image/video asset with generation
  provenance and relationships).

## Existing System Disposition *(mandatory for this feature)*

Grounded in the scoped inspection of the current codebase (brand models, services,
setup adapters, kit state, asset stores, design storage, migrations). Four
categories; the goal is convergence, not a parallel V3 architecture.

### 1. Exists and is preserved / reused

- **Canonical brand identity model + validation** (`src/domain/brand/` —
  CanonicalBrand, BrandIdentity, zod invariants, fromLegacy/toLegacy boundary):
  this IS the seed of Brand Core DNA; the foundation extends it (status, visual
  style, rules) rather than replacing it.
- **Canonical write ops + repository port** (`src/application/brand/change*`,
  BrandRepository): the pattern for the single write authority already exists and
  is kept as the write path all surfaces converge onto.
- **Service container & contracts** (`src/core/boot.ts`, IBrandsService,
  IAssetsService, IDesignStorage, local/Supabase pairs): preserved; the foundation
  works through these seams.
- **Editor document model** (BrandOSDocument, SlotRefs, applyBrandToDocument,
  the editor BrandKit anti-corruption layer): preserved as the constructive-output
  representation and the read-side projection pattern.
- **Design persistence** (IDesignStorage, `public.designs` table with summary
  projection): preserved as the constructive-output store.
- **Assets table + storage bucket** (`public.assets`, `brand-assets` bucket,
  IAssetsService): preserved as the Library's storage substrate.
- **Design System** (`src/shared/ds`) and existing shells: all future foundation
  UI consumes them (no UI is built in this feature).
- **Brand Kit deliverable registry & generation** (registry, deterministic
  generator, renderers): preserved as the generation capability; only its
  approval state converges (see below).

### 2. Exists and evolves / migrates

- **The Brand record's four coexisting value generations** (legacy scalars, v3
  fields, `identity` blob, `guidelines` mirror): converge to the canonical Core as
  the one truth; the others become read-compatibility inputs during migration.
- **Three asset write paths** (`brand.assets[]` via useUpload,
  `brand.brandAssets[]` via assetOperations, `public.assets` via IAssetsService):
  converge to one Library write path; existing data migrates in.
- **Setup's MockBrand adapters** (brandToMockBrand / mockBrandToPatch): evolve
  from a persisted-shape translator into a read-side view over the shared Core;
  Setup's multi-round-trip save consolidates onto the single write authority.
  Setup's currently unpersisted photos/icons gain a real home (Library).
- **Brand Kit local state** (`brandos:brand-kit:state`, customizations):
  "approved" evolves into Official Kit adoption records; kit state gains a
  server-backed home per the existing repository seam (`kit/repository.ts`).
- **Brand memory service** (LocalBrandMemoryService usage ranking): evolves into
  (or is superseded by) Brand Context v1 signals.
- **Multiple brand write paths** (brandStore.update, repository ops, registry
  singleton, module singleton, direct setState): consolidate to the shared
  authority; the extra paths are retired as their callers migrate.
- **Templates store** (localStorage-only library): unchanged in behavior for MVP
  but its brand-facing reads go through the shared contracts; server backing is a
  known open item, not part of this feature.

### 3. Legacy that should eventually disappear (with replacement + deletion criterion)

- **Legacy scalar brand fields** (`primaryColor`, `secondaryColor`, `fonts`,
  `tone`, `audience`, `logo`, `logoAssets`, string `strategy`): replaced by Core
  DNA; deletable when no reader resolves them ahead of the canonical record.
- **`brand.guidelines.*` as writable truth**: becomes a generated artifact/read
  projection; deletable as truth once voice/strategy/logo/color readers use Core.
- **Inline `brand.assets[]` and `brand.brandAssets[]` arrays**: replaced by the
  Library; deletable when uploads and reads all flow through the Library service
  and existing data is migrated.
- **`brandos:seed-brand-overrides` as a hidden write layer for authenticated
  users**: replaced by proper per-user demo-brand handling; deletable when seed
  brands no longer require a parallel write store.
- **Duplicate service access channels** (legacy `services.brands` registry
  singleton, module-level `brandsService`, direct `useBrandStore.setState`
  persistence bypasses): replaced by the single authority; deletable when their
  call sites are migrated.
- **Dead parallel types** (unused `SavedDesign`, old flat `Asset` where the
  Library supersedes it): deleted with their last consumer.

### 4. Genuinely new

- **Authority & provenance layer** on Core values (authority: Suggested/
  Provisional/Confirmed/Official; provenance: user-entered/AI-suggested/
  inferred/imported + who/when) — nothing like it exists today.
- **Brand Context store v1** (references, likes/dislikes, soft preferences,
  activity signals) as a first-class per-brand concept.
- **Business Info** as a distinct structured concept (today only scattered
  fragments: `audience` string, about sections, per-deliverable typed content).
- **Brand Library semantics** (folders, favorite/dislike, archive,
  use-as-reference, origin tracking) — the DAM shows assets but has none of
  these; folders/favorites/archive exist nowhere today.
- **Official Kit adoption records** (explicit, attributed adoption as a concept
  distinct from kit-local "approved" status).
- **Generative-media work family** with provenance (today generated images are
  mock-only and have no persistence model).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Core value edited on any one of the five surfaces is reflected on
  the other four in 100% of tested edit paths (colors, typography, logos, voice,
  strategy) without manual refresh workarounds.
- **SC-002**: A user who provides only a brand name can reach a creation surface
  and produce a saved output with zero blocking prompts.
- **SC-003**: Zero instances where an AI-originated value appears with Confirmed
  or Official status without a recorded explicit human action (verifiable from
  status provenance).
- **SC-004**: 100% of uploads initiated from any product surface appear in the
  brand's Library with correct origin labeling.
- **SC-005**: Pre-existing brands (across all legacy shapes, including seed
  brands) open and render correctly on all five surfaces with zero data loss
  after the foundation lands.
- **SC-006**: Every brand-scoped read/write in the six concepts is rejected at
  the service/data layer when attempted against a brand the user is not
  authorized for (verified by authorization tests, not UI checks).
- **SC-007**: The number of distinct persistent stores holding Brand Core truth
  is exactly one per deployment mode (one local, one server); all other brand
  representations are demonstrably derived and reconstructible.
- **SC-008**: Constructive outputs reopen editable in 100% of save/reopen tests;
  generative media items carry complete provenance (source, context, brand) in
  100% of accepted generations.

## Explicit Non-Goals

- No CRM, and no People/Products/Services/Locations/Clients systems — Business
  Info only models the boundary for them.
- No Brand Graph engine, and no advanced AI Memory engine (no embeddings,
  semantic retrieval, or cross-brand learning) — Context v1 is plain recorded
  signals.
- No universal creation platform work — existing creation surfaces are consumers
  of the foundation, not rebuilt by it.
- No new end-user UI surfaces or redesigns in this feature (surfaces adopt the
  foundation; UI evolution is separate work). No UI design is part of this spec.
- No enterprise workflow complexity: no roles/approval chains beyond the existing
  authorization model (the "authorized human" seam accommodates future roles
  without building them).
- No template-library server migration, no guideline-editor rebuild, no realtime
  multi-user editing.
- No graph engine, no event sourcing, and no advanced versioning/history system —
  lineage in the MVP is plain recorded references plus the minimal inert record
  for deleted items (FR-020), nothing more.
- No speculative generality anywhere: each boundary named here exists to serve a
  current consumer listed in this spec.

## Migration & Compatibility Expectations

- **Zero data loss, no user ceremony**: existing brands (legacy scalars, v3
  fields, identity blob, guidelines mirror, all three asset stores, kit state,
  saved designs) keep working throughout; convergence happens via read-through
  resolution and write-time normalization, never a blocking "upgrade your brand"
  step.
- **Convergence order is consumer-driven**: a legacy store is retired only after
  its last consumer reads/writes the shared foundation; until then it remains
  read-compatible input. Each retirement has a named deletion criterion (see
  Disposition §3).
- **Status backfill**: values that exist today are backfilled at authority
  Confirmed with provenance `user-entered` or `imported/migrated` (they were
  explicitly set or accepted by the user in the current product). Values the
  system derives during migration without user provenance get provenance
  `inferred` and authority Provisional — never Confirmed or Official. Existing
  kit "approved" items backfill as Official Kit adoptions attributed to the brand
  owner at their original approval time where known.
- **Local and server modes migrate identically**: the same resolution and
  normalization apply to localStorage-backed and Supabase-backed brands; signing
  in after local work must reconcile without forking truth.
- **Seed/demo brands** remain always-available and editable without corrupting
  shared seed data; their override mechanism is contained and scheduled for
  replacement (Disposition §3).
- **Existing tests and proven behavior are the safety net**: the storage
  round-trip rules already documented (e.g. date coercion at the legacy boundary,
  uuid guards for local ids against server columns) remain binding during
  migration.

## Assumptions

- The five consuming surfaces for the MVP are exactly: Onboarding, Setup, Brand
  Kit, Library (the current Folders/DAM surface), and Create (the unified
  editor + generation entry points). Classic (`/a/:slug`) surfaces are bug-fix
  frozen and are not converged in this feature; they must simply not break.
- "Authorized human" in the MVP means the brand owner (current single-user
  authorization model). The wording deliberately admits future roles/teams; no
  role system is built now.
- The existing brand-kit deliverable lifecycle maps onto the foundation as:
  candidate/review → Work/Library material; approved → Official Kit adoption.
  The kit's generation UX itself does not change in this feature.
- Business Info's MVP field set is what current deliverables actually render
  (company identity, description, industry, audience, contacts, links); anything
  further waits for a real consumer.
- Visual style attributes and core brand rules in the MVP are structured but
  minimal: the attribute set the current product can already act on (e.g. style
  descriptors, spacing/radius tendencies, logo usage rules, do/don't rules) —
  not an open-ended rules engine.
- Generative video is modeled (family, provenance) but no video generation
  capability exists yet; images are the first real occupant of the generative
  media family.
- Persistence specifics (tables, keys, sync) are the plan's concern; this spec
  constrains only behavior: one truth per datum, per-mode parity, and data-layer
  authorization.
- Work item ↔ Library relationships reference a single stored datum (no duplicate
  truth); which store physically holds each family is a plan decision.
