<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0 — initial ratification
  (pre-ratification review incorporated: provisional Core values, constructive vs
  generative outputs, brand isolation principle, creation never blocked by
  incomplete Core, relaxed abstraction test)
- Modified principles: n/a (initial adoption)
- Added sections:
  - Core Principles I–XI
  - Data Model Doctrine (the six concepts)
  - Engineering Constraints
  - Development Workflow
  - Governance
- Removed sections: template placeholders
- Deferred items: none — no placeholder tokens remain
- Note: the constitution version is independent of the product version (V3).
-->

# BrandingOS Constitution

BrandingOS is a real operating system for building, understanding, managing, creating
with, and evolving a brand. It is not a DAM, not a template library, not a guidelines
tool, and not an AI generator — those are capabilities inside it, never its identity.

Two rules bind everything below:

> **Engineering:** Build concrete capabilities for current product needs. Create stable
> boundaries for future needs. Do not implement speculative systems.

> **UX:** Complex underneath. Calm on the surface.

## Core Principles

### I. MVP-First, Architecture-Aware

Every feature MUST be scoped to what the current product needs, implemented behind
clean boundaries that allow future expansion. Speculative generality is a defect:
no abstraction, config surface, plugin system, or schema field ships without a
current consumer. When a future need is known (teams, business objects, richer
memory, creation engines, documents, websites), the MVP MAY define the boundary —
an interface, a schema seam, a service contract — but MUST NOT implement the system
behind it.

**Test:** every new abstraction MUST be justified by a concrete current need or a
legitimate domain boundary with clean near-term value. Multiple consumers are strong
evidence, but artificial duplication is never required before a real domain boundary
can exist. What remains prohibited is speculation: an abstraction justified only by
"we might need it later" builds local and promotes later.

### II. One Canonical Source of Truth

Each brand has exactly one coherent canonical record. Every datum has exactly one
write authority. Parallel competing states — session overlays that never persist,
duplicate stores, shadow copies with their own edit paths — are constitutional
violations, not conveniences. Derived views (previews, caches, exports, AI context)
MAY exist anywhere, but they are read-only projections and MUST be reconstructible
from the canonical record.

### III. Structured Brand Core DNA

Brand Core DNA MUST be structured and machine-readable wherever possible: explicit
attributes, enumerated choices, rules, and tokens — not free-form prose. Free text
is permitted only where meaning genuinely resists structure (e.g. a brand story),
and even then it SHOULD sit beside structured attributes, not replace them. A datum
that a renderer, validator, or AI prompt needs to *interpret* out of a paragraph is
mis-modeled.

### IV. The Six Concepts Stay Distinct

Brand Core DNA, Brand Context/Memory, Business Data, Assets/References, Official
Brand Kit, and Work/Outputs are related but distinct concepts (defined in the Data
Model Doctrine below). Features MUST NOT blur them: a reference image is not Core
truth, a generated draft is not the official Kit, learned context is not DNA.
Cross-concept flows (e.g. "promote this output into the Kit") are explicit,
user-visible operations — never side effects.

### V. AI Proposes, the User Disposes

The system MAY create **Suggested**, **Inferred**, or **Provisional** Brand Core
values so users can skip decisions or delegate brand building — but AI MUST NEVER
silently promote such values to **Confirmed** or **Official**. Only an explicit
action by an authorized human can promote a value to Confirmed or Official. Status
must always be available to consuming systems and clearly surfaced to the user when
relevant, without requiring persistent UI labels or clutter. The system MAY
learn softly — from usage, edits, favorites, dislikes, references, approvals, and
repeated behavior — into Brand Context/Memory without interrupting the user, and
that learned context MAY inform suggestions, provisional values, and creation.
The boundary is promotion: AI can propose at any status below official; only an
explicit action by an authorized human crosses the line.

### VI. Deep Model, Calm Surface

Internal complexity MUST NOT become UI complexity. The data model may be deep; the
navigation stays shallow and calm. Progressive disclosure over configuration walls;
sensible defaults over required decisions; in-page tabs over expanding sidebars.
A screen that mirrors the schema instead of the user's task violates this principle.

### VII. The User Is Never Trapped

Every flow MUST let the user: skip a step, leave with work auto-saved, resume where
they left off, upload existing work instead of recreating it, accept assistance, or
delegate more of the work to BrandingOS. Blocking wizards, unsaved dead-ends, and
"complete this before continuing" gates are prohibited unless data integrity
genuinely requires them.

Incomplete onboarding or an incomplete Brand Core MUST NEVER unnecessarily block
creation. BrandingOS operates on confirmed data plus clearly identified provisional
context (Principle V), and asks the user only when missing information is genuinely
important to the task at hand.

### VIII. Outputs Match Their Nature

Create supports both constructive artifacts and generative media, and MUST NOT
force all output types into one representation:

- **Constructive outputs** (presentations, documents, canvas designs, websites,
  and similar) are structured, editable objects first; PNG, PDF, PPTX and similar
  are export formats of the object, never the primary artifact.
- **Generative media** (images, video) are first-class media assets carrying
  provenance, generation context, history, and relationships — not forced into a
  document model.

AI creation MUST draw on the relevant Brand Core, Context/Memory, Assets/
References, and Business Data — a generation that ignores the brand it belongs to
is a bug, not a style choice.

### IX. Evolve, Don't Rewrite — and Don't Be Ruled by Legacy

Proven existing capabilities are preserved and evolved incrementally; blind rewrites
are prohibited. Equally, legacy architecture MUST NOT dictate the future product
model: when the V3 model supersedes a legacy structure, the legacy path is migrated
and then removed — it does not linger as a second source of truth (see Principle II).
Deprecation is a planned step with a deletion criterion, not an indefinite freeze.

### X. Design System First, Responsive by Default

UI work consumes the canonical Design System (`src/shared/ds`, `--ds-*` tokens) and
existing shared components before creating anything page-specific. The established
pre-flight and decision ladder (reuse → compose → extend → local → promote) is
binding. Responsive behavior is a default requirement of every surface, not an
enhancement pass.

### XI. Brand Isolation Is Non-Negotiable

Every brand-scoped datum MUST be securely scoped and authorized at the service/data
layer. UI-level filtering is presentation, never protection: a route guard, hidden
button, or client-side filter does not satisfy this principle. Any query, mutation,
or AI context assembly that touches brand-scoped data MUST enforce brand/workspace
authorization where the data is accessed.

## Data Model Doctrine

The six concepts, so no spec has to re-derive them:

| Concept | What it is | Who writes it |
|---|---|---|
| **Brand Core DNA** | The canonical, structured truth of the brand: attributes, choices, rules, tokens — each value carries a status (suggested/inferred/provisional vs confirmed/official) | AI may write provisional values; only an explicit action by an authorized human confirms |
| **Brand Context/Memory** | What the system has learned about the brand and how it's used: preferences, patterns, signals | The system, softly; user can inspect/correct |
| **Business Data** | Facts about the business behind the brand: offerings, audience, market, operations | The user; imports |
| **Assets/References** | Raw material: uploads, inspiration, references, source files | The user; ingestion |
| **Official Brand Kit** | The approved, publishable expression of the brand: final logos, palettes, official deliverables | The user, via explicit approval |
| **Work/Outputs** | Everything made with the brand: drafts, designs, generations, documents | Creation surfaces; freely mutable |

Promotion between concepts (Output → Kit, suggestion → Core, reference → asset of
record) is always an explicit, user-visible act.

## Engineering Constraints

- **Boundaries over implementations.** Future operations (teams, richer memory,
  creation engines, template systems, documents, websites) are supported by stable
  interfaces and schema seams, not by shipped speculative code.
- **One write authority per datum** — enforced at the service layer, not by
  convention alone. New stores/services MUST declare which concept they own.
- **Incremental migration.** Changes to existing capabilities land as evolutions of
  the current codebase. A rewrite requires an explicit, owner-approved decision
  recording what is preserved, what is superseded, and the deletion criterion for
  the superseded path.
- **Existing binding policies remain in force:** the UI reuse pre-flight, page-shell
  rules, token rules, dependency direction, and the three-layer test requirement
  (unit / adapter integration / browser E2E) defined in the repository's
  engineering docs. This constitution sits above them; it does not replace them.

## Development Workflow

- **Scoped verification, not full audits.** Before planning a feature, verify only
  the existing implementation relevant to that feature (its routes, services,
  stores, components). A full-system audit is never a per-feature prerequisite.
- **Spec before build.** Features flow through specify → plan → tasks → implement.
  Specs MUST state which of the six concepts they touch and which write authorities
  they use or create.
- **Constitution check at plan time.** Every plan verifies: no speculative system,
  no second source of truth, no silent AI promotion to official Core, brand
  isolation enforced at the service/data layer, DS-first UI, responsive, user never
  trapped, creation not blocked by incomplete Core. Violations require either a
  redesign or an explicit, justified complexity entry.
- **Done means verified.** A feature is complete when its relevant tests pass at
  every applicable layer and its spec's acceptance criteria are demonstrated —
  not when the code compiles.

## Governance

- This constitution supersedes conflicting practice everywhere in the repository.
  Where repository docs (CLAUDE.md, feature READMEs) give more specific operational
  rules that are consistent with these principles, the more specific rule applies.
- **Versioning:** the constitution is versioned independently of the product
  (this is Constitution v1.0.0 for the BrandingOS V3 evolution).
- **Amendments:** proposed as a change to this file with a Sync Impact Report,
  approved by the product owner, versioned semantically — MAJOR for removed or
  redefined principles, MINOR for new principles or materially expanded guidance,
  PATCH for clarifications.
- **Compliance:** every plan and code review checks against the Core Principles;
  the Constitution Check in plans cites principles by number. Justified exceptions
  are recorded in the plan's complexity tracking, never left implicit.
- **Enforceability over aspiration:** any principle that proves untestable in
  review MUST be amended into a testable form or removed.

**Version**: 1.0.0 | **Ratified**: 2026-08-13 | **Last Amended**: 2026-08-13
