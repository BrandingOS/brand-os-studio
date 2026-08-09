# 05 — Owner Decisions & Phase-1 Challenge

> READ / SYNTHESIZE / CHALLENGE only. No code changed. This document (a) adversarially
> challenges the Phase-1 architecture and revises it where it over-reached, then (b) extracts the
> decisions that genuinely need **product-owner or architecture-owner** approval before Phase 2.
> Decisions a senior engineer should own are marked **ENGINEERING DECISION — no owner input
> required** and decided here.
>
> Evidence tags: **VERIFIED / INFERRED / PROPOSAL / UNKNOWN / PRODUCT DECISION REQUIRED** (as in
> Phase 1). Citations point at `docs/codebase-intelligence/*` (Phase 0) and
> `docs/target-architecture/00–04` (Phase 1).

---

# Owner Answers — RESOLVED (2026-08-09)

All 8 owner decisions are resolved. Recorded verbatim-in-meaning below (owner text is authoritative;
do not reinterpret). The per-decision `### Owner answer` lines further down point here. Material
modifications have been folded into the design docs (01, 03) and the entry gates (06) re-evaluated.

**1. Brand Kit / Setup / Guidelines — APPROVED WITH CLARIFICATION.** Brand Kit is the single
operational home for the canonical brand system. Setup is a guided onboarding/configuration
experience (not a second editor or permanent surface) that writes into the *same* canonical Brand
data; after setup, the brand is managed in Brand Kit. Guidelines is a separate generated/editable
deliverable that references live canonical identity and supports authored content, but **never**
becomes an independent source of truth for logo/color/typography/identity. Mental model: *Setup →
creates/configures · Brand Kit → manages · Guidelines → communicates.* No duplicated editable
canonical identity state across these surfaces.

**2. Editor & Artifact Architecture — APPROVED WITH MODIFICATION.** One shared Editor Platform +
artifact adapters, where "one platform" means shared editing **infrastructure & UX principles** —
NOT one universal rendering engine and NOT one giant component. Centralize the genuinely universal
capabilities (shell, chrome, contextual property controls, selection where applicable, commands,
undo/redo, autosave, asset access, brand-system access, permissions, document lifecycle, export
coordination, shared interaction conventions). Adapters may use different rendering tech; at minimum
preserve the freeform/canvas vs structured/document-layout distinction. **Do not** permanently bless
today's Fabric/DOM/export implementations because they exist — engines survive only if they remain
the best technical choice after migration analysis. Presentations are an artifact/document type, not
a 4th product. Must support the long-term Canva/Figma-like contextual editing goal.

**3. Brand Domain Composition — APPROVED WITH MODIFICATION.** Brand is the aggregate/root, but
**not** a physically huge persistence object. Canonical brand-owned systems (Identity = Logo/Color/
Typography Systems; Strategy; Voice; other fundamental brand definitions) have one authoritative
domain representation under Brand, but **may be implemented as typed sub-entities/value objects and
persisted in appropriate normalized structures where needed**. Separate lifecycle entities (Assets,
Documents, Designs, Guidelines, Presentations, Templates, Publications, Activity/collaboration)
remain outside the aggregate and reference Brand. **"Inside Brand domain" ≠ one giant row or JSON
blob** — the goal is conceptual ownership + consistency, not database monolithism.

**4. Authenticated Persistence — APPROVED.** All durable authenticated user work is server-backed
and cross-device; local browser storage is never authoritative for durable signed-in data. Local/
IndexedDB is for cache, optimistic state, temporary editor state, offline, recovery drafts, and
performance. Server is canonical for brands, assets, designs/documents, user/workspace templates,
guidelines, presentations, uploads, published resources. High-frequency editor interactions are
locally buffered and persisted through an intentional save/autosave strategy.

**5. Anonymous Onboarding — APPROVED, IMPLEMENTATION MODIFIED.** Keep try-before-signup; a visitor
can build meaningful Brand progress before an account. **Do not** default to a permanent anonymous
server-side Brand record. Preferred model: guest onboarding → temporary local/session draft with
explicit schema/version → signup/login → **atomic claim/import** into the authenticated canonical
Brand → delete the guest draft **only after** successful server persistence → recovery/retry on
failure. Server-side guest persistence may be added later with secure temporary ownership/tokens.
**No destructive cleanup before successful claim/migration.** (Product = yes; mechanism = engineering.)

**6. Brand Vision — MODIFIED (capability approved; microservice decision rejected for now).** The
*capability* is approved: BrandingOS should intelligently understand uploaded brand files/assets and
assist with classification, grouping, extraction, and automatic placement where it materially
improves onboarding/management. **Deployment architecture is an engineering decision** — evaluate
integrating into the main backend/AI layer, a worker/job, an Edge/backend function, or a separate
service only if runtime/dependency/scaling genuinely justify the boundary. Do not promote the Python
prototype to a permanent microservice by default. **The localhost dependency must disappear.**
Fallback/manual classification remains available when AI fails.

**7. Product Scope — MODIFIED.** Phase-1's list is not the permanent feature set. **CORE / KEEP
NOW:** brand onboarding/setup, Brand Kit, Guidelines, asset management, design editor, templates,
brand-aware tools/generation, Brand Board (if a distinct useful deliverable), mockups, public Brand
Portal/shareable brand experience. **DEFER FROM CURRENT MIGRATION** (remain architecturally
possible; must NOT drive current DB/domain complexity): advanced collaboration/comments/approvals,
analytics, marketplace. **BENTO:** determine its actual capability — if it's just another Brand
Board/visual-showcase implementation, MERGE/DELETE; if genuinely distinct, classify independently.
DEFER ≠ permanent DELETE — leave clean extension points, no speculative infrastructure.

**8. AI Provider / Model / Cost — APPROVED WITH CLARIFICATION.** All production AI goes through a
server-side AI layer/gateway; client code contains no provider secrets. The app depends on
**task-level AI capabilities** (`generateImage()`, `analyzeBrandAsset()`, `generateCopy()`,
`extractBrandInformation()`), not vendor/model names spread through feature code. The layer supports
provider adapters, centrally configured models, fallback policies, timeout/retry, usage metering,
per-plan quotas/rate limits, cost visibility, privacy/data-handling policy, and structured-output/
schema validation. **Do not overbuild a universal AI platform before use cases require it.**
Provider/model selection is configuration, not architecture — **no permanent provider/model/spend
decision is required to unblock architecture design**; selectable/changeable operationally later.

---

# Phase-1 Architecture Challenges

The Phase-1 target is directionally right (one source of truth, boundaries, editor platform) but,
read adversarially, it over-builds in several places for a small team. The goal is **the simplest
architecture that gives strong consistency, modularity, safety, scalability, and
maintainability** — not maximal sophistication. Ten challenges; four force a revision.

### C1 — A mandatory `application/` use-case class per action
- **Current proposal:** `02-TARGET-ARCHITECTURE §2` puts a use-case for every action
  (`ChangeBrandColor`, `AddLogo`, …) between features and domain.
- **Concern:** ceremony. For CRUD with no orchestration, a use-case class is a pass-through that
  adds a file and indirection without value.
- **Evidence:** the repo already has a DI container + service registry (04); most brand mutations
  are single-step. A team this size pays for every extra layer in velocity (09 notes the state/DI
  sprawl already outweighs benefit).
- **CHANGE.** Use-cases exist **only where real orchestration/transaction/invariant-spanning
  logic exists** (onboarding, save-document, invite-member, brand-SoT writes). Simple reads/CRUD
  go feature-hook → repository directly. Keep the *rule* (only `platform/` touches infra); drop
  the *mandate* of a use-case wrapper everywhere.

### C2 — The editor-platform contract designed up front
- **Current proposal:** a full adapter contract (`describeSelection`, `capabilities`, shared
  selection model, command bus) for Design/Guideline/Presentation/Social/Mockup (§6, Batch 4).
- **Concern:** premature generality. A Fabric canvas and a Chronicle DOM document differ so much
  that a shared *selection/command* model designed before two real adapters exist risks a wrong
  abstraction that everything then fights.
- **Evidence:** only `EditorChrome` + `useAutoSave` are proven-shared today (VERIFIED, 07);
  everything else in the contract is speculative. The audit's own lesson (08: `stable/editable-
  export-v1` is off-limits) shows rendering internals resist unification.
- **CHANGE.** Extract the platform **incrementally from two concrete adapters** (Design on Fabric,
  Guideline on DOM). Start with the *proven* shared surface (chrome, autosave, asset picker, brand-
  token layer, export). Let selection/command/contextual-props crystallize from real duplication,
  not a whiteboard. The **contract is an outcome of consolidation, not a precondition.**

### C3 — Guideline as a pure derived read-model with "no table" ⚠ important correction
- **Current proposal:** `01 §7` / `03 §0` — Guideline is projected from identity, **no stored
  state**.
- **Concern:** wrong. Guidelines carry **authored content** that is not derivable from identity —
  custom page order, extra pages, prose, layout choices. Modeling it as pure derivation would lose
  real user work.
- **Evidence:** Chronicle is a multi-page editor with its own document model, slide navigator, and
  customizer (VERIFIED, 03 — ~52 files / 10k LOC).
- **CHANGE.** Guideline = **a `Document` (artifact_type = guideline) whose brand pages *reference*
  the identity, plus an authored overlay** (annotations, page order, extra sections). Brand
  colors/logos/type on those pages are still live-derived (no mirror), but the guideline is a
  stored artifact, not zero-storage. Revise `01 §7` and `03 §2` accordingly. **This is the one
  Phase-1 factual error the challenge found.**

### C4 — `brand_members` (per-brand permission overrides) built now
- **Current proposal:** `03` includes `brand_members` + `is_brand_member` brand-first resolution.
- **Concern:** YAGNI. There is no current product need for per-brand roles; it adds an authz axis
  and RLS surface (and 12 already flagged a `bm_update` WITH-CHECK gap).
- **Evidence:** the table exists today but is effectively unused; `is_brand_member` already falls
  back to workspace membership (VERIFIED, 06).
- **CHANGE (defer, don't delete the concept).** Keep `is_brand_member` as the resolver (so brand-
  scoped policies read consistently) but **do not build brand-override flows/UI** until a product
  need appears. Authorization is workspace-role-based day one. (Surfaced as an owner sub-question
  in D-Perms.)

### C5 — `application/` ports as a new abstraction vs the existing DI
- **Current proposal:** define ports (`BrandRepository`, `AiGateway`, …).
- **Concern:** reinventing the DI/service-contract system the repo already has.
- **Evidence:** `SERVICE_KEYS` + service contracts exist (04); the problem was leaking feature
  types into them and unconsumed registrations, not the pattern.
- **REMAIN, reframed.** "Ports" = the **existing service contracts, cleaned up** (no feature-type
  leakage, no orphan registrations) — not a second DI mechanism. No new machinery.

### C6 — CodeMap as a 10-manifest system + dashboard
- **Current proposal:** `02 §8` — 10 manifests, drill-down dashboard.
- **Concern:** over-investment in meta-tooling that can itself rot.
- **REMAIN, scoped down.** Ship **three CI-gating manifests first** (`dependencies.json`,
  `architecture-violations.json`, `services.json`) with `codemap:check`. Defer the other manifests
  and the dashboard until they earn their keep. (Reflected in D-CodeMap = ENGINEERING.)

### C7 — The KEEP list preserves features by inertia
- **Current proposal:** `00 §3` marks mockup-studio, brand-board, bento, analytics, marketplace,
  brand-portal, brand-consistency as KEEP.
- **Concern:** several are frozen since April 2026 and may be kept only because code exists — the
  exact anti-pattern Phase 0 warned against.
- **Evidence:** frozen dates (00-REPOSITORY-TRUTH §6; 03 status column).
- **CHANGE the framing:** their honest status is **KEEP-CANDIDATE pending owner cut**, not KEEP.
  Rolled into owner decision **D7 (product scope)**. Do not carry them into Phase-2 target scope
  without an explicit keep.

### C8 — Automatic identity→document token propagation ⚠ coupling
- **Current proposal:** `01 §6` — an identity change propagates to open documents via the token
  layer (reactive re-bind).
- **Concern:** accidental Brand↔document coupling and *surprising bulk mutation* — changing a brand
  color silently rewrites many saved documents; hard to reason about, hard to undo.
- **Evidence:** documents are meant to be stable deliverables; auto-rewriting them on identity edits
  is a footgun (and expensive to implement correctly).
- **CHANGE.** Documents hold brand tokens by `SlotRef`, but re-binding is **explicit/opt-in** (a
  "refresh brand styles" action per document), **not** automatic reactive propagation. Preserves the
  benefit (docs *can* adopt new identity) without the coupling/surprise. Revise `01 §6`.

### C9 — One big `identity` JSONB reproduces the opacity that hurt us
- **Current proposal:** `03` stores identity as one versioned JSONB.
- **Concern:** JSONB is unqueryable and, in a 324-type-error codebase, hard to keep truly typed —
  the very opacity that enabled the `guidelines`-blob drift.
- **Evidence:** the 05/11 failure was a JSONB blob.
- **REMAIN, with guardrails.** The 05 failure was **duplication**, not JSONB. One `identity` JSONB
  is correct for a cohesive value object read/written whole — **iff** (a) it is the only copy,
  (b) versioned, (c) **validated by a schema at the repository boundary** (one zod schema, the
  single parse point), (d) never queried inside. Mandate (c) explicitly. (Feeds D-Domain.)

### C10 — Five "scopes" as artificial bounded contexts
- **Current proposal:** Workspace/Brand/Editor/Public/Admin scopes (00 §2).
- **Concern:** are these artificial DDD contexts fragmenting one domain?
- **REMAIN.** They are **UI/navigation scopes** mapping to real user mental models, **not** domain
  bounded contexts — one `Brand` aggregate spans them. No artificial boundary is imposed on the
  domain. No change.

**Net effect of the challenge:** four revisions (C3 guideline-is-a-stored-artifact; C8 explicit
re-bind; C1 use-cases only where orchestration exists; C2 editor platform extracted incrementally),
two scope-downs (C4 defer brand overrides; C6 lean CodeMap), one reframing (C7 KEEP→KEEP-CANDIDATE).
The decisions below assume these revisions.

---

# Owner Decisions

Eight decisions genuinely need owner sign-off. Everything else is in **Engineering Decisions** at
the end.

## Decision: D1 — Product IA & the Setup / Brand Kit / Guidelines responsibility split

### Why this decision exists
Phase 0 found overlapping surfaces (Setup vs Brand Kit vs Identity vs Guidelines) with drifting
data (05) and a load-bearing legacy fork (`brand-kit-alt` inside Studio settings — 03). The
product must state *which surface owns what* before code is merged.

### Current reality
Setup edits identity via `mockBrand` conversion; Brand Kit is a read-only session-overlay
showcase; Identity (Classic tabs) is a separate editor; Guidelines exists in four stacks (03).
Same data, four+ faces, no owner. (VERIFIED, 03/05.)

### Recommended decision
**One Brand identity home ("Brand Kit") that both shows and edits the canonical identity; "Setup"
is its guided first-run mode; "Guidelines" is the derived + authored *output* document.** Brand Kit
is the operational source-management surface; Guidelines is the presentation/documentation output.

### Why
It matches the domain (identity is one source; guideline is a projection + overlay — C3). It
collapses the four faces to one editable source and one output, killing the drift class (05) and
the alt-fork split (03). It is the framing that makes "change once, reflect everywhere" true.

### Alternatives considered
- **Keep Setup and Brand Kit as separate surfaces.** Benefit: less immediate refactor. Downside:
  perpetuates dual write paths + drift. Migration cost: low now, high forever. Long-term: bad —
  entrenches the 05 problem.
- **Guidelines as the source of truth (edit brand *in* the guideline).** Benefit: one surface.
  Downside: conflates authored document with canonical data; reintroduces the mirror. Migration:
  medium. Long-term: bad — the exact anti-pattern we're removing.

### What changes if approved
Product: Brand Kit becomes edit+view; Setup is a mode of it. Domain: unchanged (already one
identity). DB: unchanged. Routes: Identity tabs + `brand-kit-alt` settings fold into one Brand Kit
surface. Editor: Guideline becomes an artifact (C3). Migration: Stage 7 (feature merge) scope set.

### What remains unchanged
Workspace/Editor/Public/Admin scopes; the identity domain model; the guideline *content* capability.

### Confidence
HIGH

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

## Decision: D2 — Editor & artifact architecture (platform + adapters; deck as an artifact; surviving engines)

### Why this decision exists
~14 editors + 4 frozen deck engines with no winner (00 §H/§I, 03). Consolidation is expensive and
directional; it needs architecture-owner sign-off. Combines items 7, 8, 9.

### Current reality
Unified `features/editor` (Fabric) is the active frontier; `shared/editor` deck engine is frozen
but load-bearing for social/logo-presentation/blocks; 4 deck engines frozen since 2026-05-19;
legacy OptimizedDesignEditor + `vectorize` export are an off-limits carve-out (VERIFIED, 03/08).

### Recommended decision
**One editor platform + artifact adapters, extracted incrementally (per C2). Decks become a
Presentation artifact adapter, not a separate engine. Conceptually surviving rendering engines:
(1) a canvas engine (Fabric today) for Design/Social/Presentation/Mockup, (2) a DOM engine for
Guideline/Chronicle, (3) the existing vectorize export kept behind an adapter.** Retire the other
three deck engines after the Presentation adapter covers their artifact type.

### Why
The ~14 editors are a missing platform, not 14 products (00 §I). Choosing engines by *capability*
(canvas vs DOM vs vector-export) rather than by "what exists" avoids preserving code by inertia.
Incremental extraction (C2) avoids the premature-abstraction risk.

### Alternatives considered
- **Pick one existing deck engine, leave editors separate.** Benefit: least disruption. Downside:
  keeps sprawl + duplicated chrome/save/export. Migration: low. Long-term: poor — sprawl persists.
- **One mega-editor component for all artifacts.** Benefit: apparent simplicity. Downside: forces
  DOM and canvas artifacts into one renderer — technically harmful (00 warns against this).
  Migration: high. Long-term: bad.
- **Rebuild the editor from scratch.** Benefit: clean. Downside: throws away the working unified
  editor + off-limits export. Migration: very high/risky. Long-term: unjustified.

### What changes if approved
Product: one editing experience, contextual controls. Domain: `Document.artifact_type` selects the
adapter. DB: `documents.scene_graph` + `artifact_type` (already in 03). Routes: editor routes
converge. Editor: platform extracted from Design+Guideline first (C2). Migration: Stage 8 scope,
gated on this decision + deck choice.

### What remains unchanged
The Brand domain; the off-limits `vectorize` export (kept behind an adapter, not rewritten).

### Confidence
MEDIUM-HIGH (HIGH on "platform+adapters"; MEDIUM on the exact deck folding vs choosing an engine —
depends on inspecting the four engines' capability, an eng task once approved).

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

## Decision: D3 — Brand aggregate composition (what lives inside the Brand)

### Why this decision exists
Whether Strategy/Voice/Identity/Guidelines are inside the Brand aggregate or separate entities is a
directional domain/architecture choice affecting every downstream module (item 12).

### Current reality
Everything is smeared across `brands` scalar columns + `guidelines` JSONB with no clear aggregate
(05). No explicit boundaries exist today.

### Recommended decision
**Identity (LogoSystem, ColorSystem, TypographySystem, Voice, Strategy) lives *inside* the Brand
aggregate as value objects. Assets, Documents, Guidelines, Publications are *separate aggregates*
that reference the Brand.** (Guideline is a Document per C3.)

### Why
Identity is always read/written with the brand and has cross-field invariants → one aggregate,
strong consistency (fixes 05). Assets/Documents have independent lifecycles, their own permissions,
and high cardinality → separate aggregates to avoid a giant hot object. This is the minimal
boundary set that gives consistency without artificial contexts (C10).

### Alternatives considered
- **Everything (assets, documents) inside Brand.** Benefit: one object. Downside: a huge,
  contended aggregate; can't scale documents/assets independently. Migration: n/a. Long-term: bad.
- **Identity as separate entities (Voice, Strategy standalone).** Benefit: modular. Downside:
  loses cross-field invariants; reintroduces multi-source drift. Migration: higher. Long-term: poor.

### What changes if approved
Domain: aggregate boundaries fixed. DB: `brands.identity` JSONB (validated — C9); assets/documents
separate tables (already in 03). Product/Routes/Editor: unaffected directly. Migration: Stage 2/4.

### What remains unchanged
Product surfaces; persistence tech choices.

### Confidence
HIGH

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

## Decision: D4 — Authenticated persistence policy (must all durable user work be server-backed?)

### Why this decision exists
Today authenticated designs/templates/uploads/decks persist to **localStorage**, breaking cross-
device use and public shares (VERIFIED, 04/11). Fixing this has cost implications (storage, egress)
so it is an owner-level policy, not just an engineering fix.

### Current reality
Only brands + workspaces round-trip to Supabase when authed; everything else is device-local; the
brands adapter even drops fields (04/05/11).

### Recommended decision
**Yes — all durable authenticated user work (brands, identity, assets, documents, templates) is
server-backed and cross-device. Local storage is a cache/offline buffer only, never the source of
truth.**

### Why
It is core to a "brand operating system": users expect their brand + designs on any device and
shareable links to work. The current behavior is a latent data-loss/￼trust bug, not a feature.

### Alternatives considered
- **Keep local-first, sync opportunistically.** Benefit: offline, cheaper storage. Downside:
  conflict resolution complexity; shares stay broken until synced; the exact current failure.
  Migration: medium. Long-term: high complexity for a small team.
- **Hybrid (brands server, designs local).** Benefit: less storage. Downside: `/d/` shares stay
  broken; inconsistent mental model. Long-term: poor.

### What changes if approved
Product: cross-device + working shares. Domain: unchanged. DB: `documents`/`assets`/`templates`
tables become the real backing (03). Routes: `/d/…`, portal become functional. Migration: Stages
3–5. Cost: storage/egress budget (owner should note plan limits).

### What remains unchanged
The identity model; local cache for editor responsiveness.

### Confidence
HIGH

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

## Decision: D5 — Anonymous onboarding behavior

### Why this decision exists
Anonymous onboarding currently creates a brand that is **destroyed on first sign-in** (the wipe
bug, VERIFIED 04/06/11) and exits into a login wall; `/claim` covers only tool sessions. Whether to
support it end-to-end is a product/business call (marketing funnel vs complexity).

### Current reality
Guest can run onboarding, but the result is lost at login; no ownership-transfer/claim path for
onboarding brands (VERIFIED, 04).

### Recommended decision
**Support it end-to-end: guest creates a brand → persists to a guest/session bucket → on sign-in,
migrate-then-wipe (fix ordering) and transfer ownership to the new user.** If the funnel value is
unproven, the fallback is to **gate onboarding behind auth** (simpler, no data-loss surface).

### Why
The active frontier is onboarding-v4 (00-REPOSITORY-TRUTH §6) and anonymous try-before-signup is a
common growth lever; but the *minimum* acceptable outcome is "no silent data loss," which the gate
also satisfies. Recommending support, with the gate as an explicit cheaper fallback.

### Alternatives considered
- **Gate behind auth (no anonymous creation).** Benefit: eliminates the wipe bug + claim
  complexity. Downside: loses the try-first funnel. Migration: low. Long-term: simple.
- **Leave as-is.** Not viable — it is an active data-loss bug.

### What changes if approved
Product: funnel behavior. Domain: ownership transfer semantics on Membership. DB: guest bucket +
claim/transfer flow. Routes: `/onboard-brand` auth handling. Migration: Stage 6 (+ the wipe fix).

### What remains unchanged
The onboarding UI itself; the identity model.

### Confidence
MEDIUM (support vs gate depends on business/funnel data the owner has).

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

## Decision: D6 — Brand Vision Python service disposition

### Why this decision exists
Live onboarding depends on a **local** Python service at `localhost:8300` with silent fallback and
no production deployment story (VERIFIED, 03/04). It is the second-most-active area of the last 60
days (00-REPOSITORY-TRUTH §6). Its fate is a product/ops investment decision.

### Current reality
`brand-vision/` (FastAPI classifier) is called only from onboarding-v4 with a circuit-breaker
fallback; it works on a dev machine, not in prod (VERIFIED).

### Recommended decision
**Make it a first-class deployed backend service *if* the AI auto-placement it powers is a
committed product capability; otherwise remove the dependency and rely on the fallback heuristic.**
Do not ship onboarding to production depending on an undeployed localhost service.

### Why
Either it is product-critical (then deploy + own it) or it is an experiment (then don't let it be a
hidden prod dependency). The current middle state is a launch risk.

### Alternatives considered
- **Fold into an Edge Function / hosted inference.** Benefit: no separate service to run. Downside:
  Python ML in an edge runtime is awkward; may need a container host. Migration: medium.
- **Abandon, keep heuristic fallback.** Benefit: simplest. Downside: loses AI auto-placement
  quality. Long-term: fine if the feature isn't core.

### What changes if approved
Product: onboarding quality/behavior. DB/domain: none. Ops: a deployed service or its removal.
Migration: Stage 6 dependency resolution.

### What remains unchanged
The onboarding UI; the rest of the AI stack.

### Confidence
MEDIUM (depends on how core AI auto-placement is to the product).

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

## Decision: D7 — Product scope: collaboration, analytics, marketplace, and the frozen KEEP-candidates

### Why this decision exists
Several capabilities are frozen since April 2026 and preserved by inertia (C7): comments/approvals/
collaboration (localStorage, unconsumed backends — 04/06), analytics (local compute, no events
pipeline), marketplace (orphan page — 08), plus mockup-studio/brand-board/bento/brand-portal. Which
survive into Phase-2 scope is a product cut only the owner can make.

### Current reality
All present in code; most frozen; collaboration/analytics have unfinished or absent backends
(VERIFIED, 03/04/06/08).

### Recommended decision
**Cut to the core for Phase 2: KEEP brand-board, mockup-studio, brand-portal (they extend the brand
deliverable set). DEFER (build later, don't design DB for now) collaboration, analytics, and
marketplace. REMOVE bento only if it duplicates brand-board (eng to confirm).** Owner to confirm
each.

### Why
Collaboration/analytics/marketplace each need real backends that don't exist; building their tables
now (03) is speculative. Cutting them from Phase-2 scope keeps the migration small and honest;
they can be added as first-class features later without rework because the architecture is modular.

### Alternatives considered
- **Keep everything.** Benefit: no capability loss. Downside: builds speculative tables/flows;
  slows migration; violates "don't preserve by inertia." Long-term: bloat.
- **Remove all frozen features.** Benefit: smallest. Downside: may cut things users value (mockups,
  brand-board). Risk of over-cutting.

### What changes if approved
Product scope. DB: collaboration/analytics/marketplace tables *not* built in Stage 3 (03 already
gates them on this). Migration: Stage 3/9 scope. Routes: cut features' routes removed in Stage 9.

### What remains unchanged
Core brand/editor/asset capabilities.

### Confidence
MEDIUM (per-feature owner judgment on value).

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

## Decision: D8 — AI provider / model / cost policy (server-proxy is mandated; provider & model are owner)

### Why this decision exists
The *architecture* choice — move all model calls to a server proxy (no browser keys) — is a
security mandate, not an owner choice (see Engineering Decisions). But **which provider(s), which
default models, and the cost/rate-limit posture** materially affect product quality and spend, and
have contractual/privacy implications only the owner can set. Item 18.

### Current reality
6 browser call sites embed `VITE_ANTHROPIC_API_KEY`; multiple hard-coded model IDs; image gen uses
openai→fal→pollinations fallback; brand-vision is separate (VERIFIED, 07/10/11).

### Recommended decision
**Adopt a provider-abstracted `AiGateway` (server-side) with a small, owner-approved model policy:
one default text model and one default image model, with an explicit fallback chain and per-
workspace rate limits tied to plan.** Owner picks the providers/models and the spend ceiling.

### Why
Provider abstraction future-proofs against model churn (07 found 3 hard-coded IDs already); a set
policy controls cost and privacy (user brand data sent to third parties is an owner/legal concern).

### Alternatives considered
- **Single provider, hard-coded model.** Benefit: simplest. Downside: churn + lock-in; the current
  pain. Long-term: brittle.
- **Per-feature provider choices.** Benefit: flexibility. Downside: cost sprawl, inconsistent
  privacy posture. Long-term: hard to govern.

### What changes if approved
Product: AI quality/limits. Domain: none. DB: rate-limit/usage tracking (ties to plan). Editor/
onboarding: call the gateway. Migration: Stage 2 (AiGateway) + Stage 1 (kill browser keys). Cost:
owner-set ceiling.

### What remains unchanged
That browser keys are removed (non-negotiable, engineering).

### Confidence
HIGH on the abstraction; owner-dependent on provider/model/spend.

### Owner answer
**RESOLVED (2026-08-09)** — see "Owner Answers — RESOLVED" at the top of this document for the
authoritative owner text and any clarification/modification.

---

# Engineering Decisions — no owner input required

These have a clearly superior answer given the evidence; decided here with reasoning. Owner may
override, but Phase 2 can proceed on these defaults.

- **Asset taxonomy (item 4).** ENGINEERING. **One `Asset` entity with a `kind` discriminator:
  `logo | image | font | export`.** `Design` and `Template` are **not** asset kinds — they are
  `Document`/`Template` aggregates (they have scene-graphs, not bytes). "Generated output" is an
  `Asset` of `kind=image` (or an export) with provenance metadata. Rationale: one storage/dedup/
  permission path (01/03); avoids the current multi-pipeline mess (07).

- **Folders vs view (item 5).** ENGINEERING. **Folders are a persistent *organizational view* over
  asset metadata (a `folder`/`tags` field + optional `collections`), not a separate filesystem
  hierarchy.** Assets belong to a brand; folders/tags group them. Rationale: avoids a parallel tree
  to keep in sync; matches how DAM is actually used. (Residual owner sub-question: do users need
  *nested* folders? Default: flat folders + tags; escalate only if the owner wants nesting.)

- **Document/artifact taxonomy (item 6).** ENGINEERING. `artifact_type ∈ { design, social,
  presentation, mockup, guideline }`, extensible. Each maps to one editor adapter (D2). Rationale:
  a discriminator on `documents` (03) is the minimal model; new types are additive.

- **Color model (item 10).** ENGINEERING. **Both: canonical *roles* (primary/secondary/accent/
  neutrals) as the source, and *derived semantic surface tokens* (`brandPalette`) computed from
  them.** Never store the tokens. Rationale: 01 §Color; matches the mandatory `buildBrandPalette`
  helper (VERIFIED). The **color-engine library** consolidation (07's 3 engines) is also
  engineering: **one engine behind one domain module**; prefer the APCA-capable implementation as
  the math core, exposed through a single interface (contrast/palette). No owner input.

- **Typography model (item 11).** ENGINEERING. Families (heading/body) + numeric weights + a role→
  size typescale + font files as `Asset` refs. Coerce weights to numbers once at ingestion (fixes
  the string-weight drift, 05/11). Rationale: 01 §Typography.

- **Workspace roles & brand overrides (item 15).** ENGINEERING (with the C4 deferral). Keep the
  5-role enum `owner>admin>editor>exporter>viewer`; **defer brand-level overrides** (build
  `is_brand_member` resolver, no override UI) until a product need exists. Owner override only if
  per-brand roles are a near-term product requirement.

- **Public sharing / publications (item 16).** ENGINEERING. A dedicated `publications` table is the
  publish mechanism; anon reads only via `public_slug`; no internal ids leak to anon (closes the
  12 escalation input). Rationale: 03 §Publications.

- **Admin unification (item 17).** ENGINEERING. **One `platform_roles` system.** The dual
  `user_roles` vs `profiles.is_admin` (05/06) collapses to one. *Residual owner/data sub-question*:
  which existing flag is authoritative when migrating current admins (a one-time data mapping) —
  trivial, surface to owner only as an FYI.

- **Template architecture (item 20).** ENGINEERING. **Both via derivation:** a `Template` is a
  brand-agnostic source (SlotRef body, effectively immutable once published); instantiating creates
  an editable `Document`; "save as template" derives a Template back from a Document
  (`convertToTemplate`). Rationale: 01 §Template — this is already the intended model.

- **Demo/seed brands (item 21).** ENGINEERING. **Seed brands are dev/test fixtures and optional
  example *templates* — not real user-owned `Brand` records in production.** Rationale: 05 flagged
  seed edits are localStorage-only and pollute reasoning; keep them out of the prod data model.
  (Residual owner sub-question: should curated example brands be shown to new users as inspiration?
  If yes, they are read-only templates, not editable brands.)

- **Legacy compatibility policy (item 22).** ENGINEERING (team discipline). **Each compatibility
  bridge (dual-write/dual-read/shim) lives at most 2 releases and is tracked in
  `migration-progress.json` with an explicit removal stage.** Rationale: bridges that outlive their
  purpose become permanent debt (the repo's whole history). Owner may set a different window.

- **CodeMap scope (item 23).** ENGINEERING. **Start as generated dev tooling + a CI gate (3
  manifests, per C6); defer the governance dashboard.** Rationale: enforcement value first, meta-
  tooling later.

- **AI transport (item 18, the non-owner half).** ENGINEERING/SECURITY MANDATE. **All model calls
  go through a server proxy; no secret keys in the browser.** Non-negotiable (10/11). Only the
  provider/model/cost *policy* is the owner half (D8).

---

## Summary — what actually needs the owner

**8 owner decisions:** D1 (IA/responsibilities), D2 (editor & artifact architecture), D3 (aggregate
composition), D4 (server-backed persistence), D5 (anonymous onboarding), D6 (brand-vision), D7
(product scope cut), D8 (AI provider/model/cost). **Blocking for Phase 2:** all eight, plus the
non-decision gate of confirming live prod migration state (06 doc / 11 §11) and the color-engine
library pick is engineering (decided above). Everything else is engineering, decided here.
