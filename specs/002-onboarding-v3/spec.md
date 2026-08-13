# Feature Specification: Onboarding V3

**Feature Branch**: `v3-onboarding` (spec directory: `002-onboarding-v3`)

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "002 — Onboarding V3. Replace the two divergent onboarding creation flows with one canonical onboarding system. A user can bring an existing brand or start a new one, let BrandingOS understand what they provide, review/correct that understanding, then create a properly structured Brand that continues into Setup V3."

## Overview

Onboarding today is two flows wearing one name. The upload path and the
from-scratch path have separate screens, separate submit implementations, and
produce brands of different shapes — one carries logos, assets and parsed
strategy, the other carries a colour palette and a font pairing and little else.
Whichever a user picks silently decides how complete their brand is.

Both write into the storage that feature 001 just retired. Uploaded photos,
documents and links go to the brand record's inline asset array; logos go to an
inline URL map rather than logo-system references; every file is embedded as a
data URL sized to fit a browser storage budget. Nothing reaches the Brand
Library. Nothing carries authority or provenance, so machine-classified logos and
AI-parsed strategy land as unattributed brand truth the moment the brand is
created. Business Info and Brand Context are never written at all.

One consequence is already a live defect: on the authenticated path the inline
asset array is never persisted, so every photo, document and social link a
signed-in user supplies is discarded at the end of onboarding while the flow
reports success.

Onboarding V3 replaces both paths with a single system: two entry branches that
converge on one pre-creation state, one creation pipeline, and writes that go
through the Foundation's authorities — Library for material, logo-system
references for logos, Core with authority and provenance, Business Info for
business facts, Context for what was learned. It is the first consumer of 001
built on 001's terms, and it deliberately creates nothing beyond a brand: no Kit,
no guidelines, no deliverables.

Constitution alignment: Principles II (one canonical truth, one creation
pipeline), III (structured Core), IV (six concepts stay distinct), V (AI proposes,
the human disposes), VI (deep model, calm surface), VII (the user is never
trapped), IX (evolve, don't rewrite — reuse the proven utilities, delete the
superseded paths against a stated criterion), X (Design System first), XI (brand
isolation at the data layer).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bring an existing brand and have it understood (Priority: P1)

Someone who already has a brand arrives with a folder: a logo or two, a font
file, a colour palette image, a PDF, a link to their site, and a paragraph
describing what the brand is. They give the brand a name, drop everything in,
and BrandingOS tells them what it thinks it received — which image is the primary
logo, which is the icon, what the palette is, what typeface they use, what the
brand's mission and audience appear to be.

**Why this priority**: This is the flow most new users take and the one that
carries real material. If it works, the product has a brand worth using from
minute one.

**Independent Test**: Complete the flow with a realistic set of files and a
description, and verify the review screen shows every item, placed sensibly,
before anything is created.

**Acceptance Scenarios**:

1. **Given** a user with a logo file, a font file, a palette image, a PDF and a
   website link, **When** they drop all of it into the flow, **Then** each item
   appears under the group the system believes it belongs to, and none is
   silently dropped.
2. **Given** a free-form brand description, **When** the user advances past the
   basics step, **Then** the system proposes structured strategy content
   (mission, audience, voice and similar) drawn only from what the user wrote.
3. **Given** an item the system cannot interpret, **When** the review is shown,
   **Then** that item appears as unplaced rather than being discarded.

---

### User Story 2 - Start a new brand from scratch (Priority: P1)

Someone with no material yet gives a name and a short description of what they
are building, is offered starting directions to react to, picks the ones that
feel right, and continues into exactly the same review as the user in Story 1.

**Why this priority**: The from-scratch path is half the product's audience, and
today it produces a materially thinner brand than the upload path. Convergence is
the whole point of this feature.

**Independent Test**: Complete the from-scratch branch and verify the resulting
brand populates the same concepts, through the same authorities, as a brand from
the upload branch.

**Acceptance Scenarios**:

1. **Given** a user who selects "starting new", **When** they pass the basics
   step, **Then** they are offered starting directions instead of an upload
   surface, and those directions feed the same pre-creation state.
2. **Given** a user who chose "starting new" and then realises they do have a
   logo, **When** they switch branches, **Then** everything they already entered
   is preserved.
3. **Given** two brands, one created from each branch, **When** their records are
   compared, **Then** they populate the same concepts through the same write
   authorities and differ only in values.

---

### User Story 3 - Review and correct before committing (Priority: P1)

Before any brand exists, the user sees everything the system understood and can
disagree with any of it: move an image out of the primary logo slot, delete a
colour that came from a photo's background, rename a typeface, rewrite a
proposed mission, mark something as not part of the brand.

**Why this priority**: This is the constitutional gate. Every proposal in this
flow is machine-derived; without a real review step the system would be promoting
its own guesses into brand truth.

**Independent Test**: Change at least one proposal in every group, create the
brand, and verify the corrections — not the original proposals — are what the
brand carries.

**Acceptance Scenarios**:

1. **Given** the system proposed an image as the primary logo, **When** the user
   moves a different image into that slot, **Then** the created brand's primary
   logo is the user's choice.
2. **Given** a group of proposals the user never touches, **When** the brand is
   created, **Then** those values are recorded as system suggestions, not as
   values the user confirmed.
3. **Given** a group the user explicitly accepts or edits, **When** the brand is
   created, **Then** those values are recorded as confirmed by that user, while
   still recording that they originated as a suggestion.

---

### User Story 4 - The brand you land on is already correct (Priority: P2)

The user finishes onboarding and arrives at their Setup page. The logo they
placed is on the logo slot. The photos and documents they uploaded are in the
Library. Their website and social links are attached. Their business details are
where business details live. Nothing they supplied is missing, and nothing they
didn't ask for has been generated.

**Why this priority**: This is where today's flow fails hardest and least
visibly. It is also the acceptance test for every storage requirement in this
spec.

**Independent Test**: Complete onboarding with material in every category, then
inspect the created brand in Setup and the Library and confirm a one-to-one match
with the review screen.

**Acceptance Scenarios**:

1. **Given** a completed onboarding with uploads in every category, **When** the
   user opens Setup and the Library, **Then** every item that was present in the
   review is present and resolvable, on both the local and the authenticated
   storage backends.
2. **Given** any part of the save could not be completed, **When** the flow
   finishes, **Then** the user is told exactly what did not save — the flow never
   reports success for something it did not store.
3. **Given** a completed onboarding, **When** the brand is inspected, **Then** no
   Brand Kit adoption, guideline, template or design output has been created.

---

### User Story 5 - Never trapped (Priority: P2)

The user can skip anything except naming the brand, move backwards freely
including with the browser Back control, leave the flow and come back to their
work, and — when they arrived from somewhere that needed a brand — be returned
there instead of to Setup.

**Why this priority**: Constitutional requirement, and the difference between an
onboarding people finish and one they abandon. Lower than P1 only because the
flow is usable without resume.

**Independent Test**: Enter the flow from a brand-requiring destination, skip
every optional step, navigate backwards and forwards, leave and return, and
verify the flow behaves and returns to the original destination.

**Acceptance Scenarios**:

1. **Given** a user who supplies only a brand name, **When** they create,
   **Then** a valid brand is created and they reach Setup.
2. **Given** a user partway through, **When** they use the browser Back control,
   **Then** they return to the previous step with their entries intact.
3. **Given** a user who entered with a return destination, **When** they finish,
   **Then** they are sent to that destination rather than to Setup.
4. **Given** a user who leaves the flow mid-way, **When** they return,
   **Then** their work is still there. *(Scope depends on Q1 below.)*

### Edge Cases

- **Nothing supplied but a name** — a valid brand is created; no group is a gate.
- **Everything unrecognised** — all items land as unplaced; the flow still
  completes.
- **Assisted understanding unavailable** — deterministic interpretation produces
  the proposals instead; the flow never blocks on it, and the values are still
  recorded as suggestions.
- **The same file supplied twice** (including renamed) — accepted once.
- **A file too large to store** — refused at the point of upload with a clear
  reason, never accepted and then silently dropped at creation.
- **A brand name already in use** — resolved without losing the user's work or
  silently renaming without telling them.
- **Partial save failure** — the brand still exists, and the user is told by name
  what did not land.
- **The user abandons after material is uploaded** — no orphaned material is left
  charged to a brand that does not exist. *(Interacts with Q1.)*
- **A return destination that is not valid** — falls back to the brand's Setup
  page rather than failing.
- **Repeated or double submission** — one brand, never two.

## Requirements *(mandatory)*

### Functional Requirements

#### One flow, one pipeline

- **FR-001**: The product MUST expose exactly one onboarding entry point for
  creating a brand.
- **FR-002**: "I have a brand" and "I'm starting new" MUST be branches within
  that flow, not separate flows with separate creation logic.
- **FR-003**: Both branches MUST converge on a single pre-creation state holding
  everything gathered, regardless of which branch produced it.
- **FR-004**: Brand creation MUST happen through exactly one pipeline, such that
  brands from either branch differ only in the values they carry, never in their
  shape or in which concepts were populated.
- **FR-005**: Repeated submission — a rapid second activation, or a retry after a
  recoverable error — MUST NOT produce more than one brand.

#### Brand Basics

- **FR-006**: The flow MUST collect a brand name, and the name MUST be the only
  required input in the entire flow.
- **FR-007**: The user MUST be able to declare which branch they want and to
  change that choice later without losing anything already entered.
- **FR-008**: The flow MUST accept an optional free-form description of the
  brand.

#### Bring what you have

- **FR-009**: The flow MUST accept brand material as files, folders, archives and
  links, by both drag-and-drop and an explicit picker.
- **FR-010**: The same material MUST NOT be accepted twice within one flow,
  identified by its content rather than its filename.
- **FR-011**: The new-brand branch MUST offer generated starting directions
  (colour and typographic) in place of uploads, and those directions MUST enter
  the same pre-creation state as uploaded material.
- **FR-012**: Material that cannot be accepted MUST be reported per item with a
  reason, and MUST NOT abort the handling of the rest.

#### BrandingOS Understands

- **FR-013**: The system MUST interpret supplied material into proposals across:
  logo role assignment, colour palette, typefaces, strategy and voice content,
  business facts, and links.
- **FR-014**: Every proposal MUST be recorded with its provenance — distinguishing
  what the user supplied directly from what the system inferred.
- **FR-015**: No value produced by interpretation MAY be recorded at confirmed or
  official authority. Interpretation produces suggestions only.
- **FR-016**: Interpretation MUST degrade rather than fail: when assisted
  interpretation is unavailable, deterministic interpretation MUST still produce
  a usable proposal set.
- **FR-017**: Material the system could not interpret MUST surface as unplaced in
  the review, never be discarded.

#### Review

- **FR-018**: The review MUST present everything the system understood, grouped,
  and MUST be reachable before any of it becomes brand truth.
- **FR-019**: The user MUST be able to accept, correct, re-place, rename or remove
  any proposal or item.
- **FR-020**: The review MUST make it apparent which values were proposed by the
  system and which came from the user, without permanent labelling clutter.
- **FR-021**: A value MUST only rise above suggestion through an explicit human
  acceptance — per value or per group. Completing the flow without engaging with
  a group MUST leave that group's values as suggestions.

#### Create Brand

- **FR-022**: All uploaded material MUST become Brand Library items. No brand
  material MAY be stored inline on the brand record.
- **FR-023**: Logos MUST be recorded as logo-system references to Library items.
- **FR-024**: No brand material MAY be persisted as an embedded data payload.
- **FR-025**: Business facts gathered during onboarding MUST be written to
  Business Info.
- **FR-026**: Durable observations about the brand and how it was described MAY be
  written to Brand Context. A Context write MUST NEVER be a precondition for
  creating the brand.
- **FR-027**: Onboarding MUST NOT create Official Brand Kit adoptions, brand
  guidelines, templates, deliverables, or any other Work/Output.
- **FR-028**: Any part of the save that does not complete MUST be reported to the
  user by name. The flow MUST NOT report success for anything it did not store.
- **FR-029**: On completion the user MUST arrive at the brand's Setup page, or at
  the supplied return destination when there is one.

#### Continuity

- **FR-030**: Every step except naming the brand MUST be skippable, and a
  name-only brand MUST be creatable.
- **FR-031**: The user MUST be able to move backwards through steps, including
  with the browser Back control, without losing entered data.
- **FR-032**: The user MUST be able to leave the flow and return to their work.
  [NEEDS CLARIFICATION: Q1 — see Open Questions. What persists, where, and for how
  long depends on when the brand record comes into existence.]
- **FR-033**: A return destination supplied on entry MUST be preserved across
  every step and branch switch.

#### Interface

- **FR-034**: All interface elements MUST be built from the canonical Design
  System; no new generic control MAY be introduced where one already exists.
- **FR-035**: Every surface MUST be responsive across phone, tablet and desktop.
- **FR-036**: Every interactive control MUST be keyboard operable and labelled for
  assistive technology.

#### Isolation

- **FR-037**: Every write MUST be authorized for the acting user and target brand
  at the service and data layer, not by interface filtering.

#### Retirement

- **FR-038**: Once the retirement criterion is met, the superseded onboarding
  routes, screens and state MUST be deleted, not disabled or left unreachable.
  [NEEDS CLARIFICATION: Q2 — see Open Questions. What counts as "proven", and
  whether removal is in scope for this feature.]
- **FR-039**: Superseded onboarding URLs MUST resolve to the new entry point.

### Key Entities

- **Onboarding Draft**: The single converged pre-creation state. Holds the brand
  name, the chosen branch, the description, supplied material, and the user's
  review decisions. Both branches write to it; the creation pipeline is its only
  reader.
- **Proposal**: One thing the system believes about the brand — a logo role, a
  colour, a typeface, a strategy statement, a business fact, a link. Carries what
  it proposes, where the belief came from, and whether a human has engaged with it.
- **Supplied Item**: One piece of material the user brought, with its identity
  (content-derived), its interpreted kind, and its placement — including
  "unplaced".
- **Review Decision**: A human act on a proposal or item — accept, correct,
  re-place, remove. The record that authorises promotion above suggestion.
- **Created Brand**: The result. Its Core values, Library items, logo-system
  references, Business Info and Context entries are written through the existing
  Foundation authorities; onboarding introduces no new write authority.

## Existing System Disposition *(mandatory for this feature)*

### 1. Exists and is preserved / reused

- Upload intake: folder-drop walking, archive extraction, content hashing and
  duplicate rejection, supported-type filtering.
- Image analysis: transparency detection, aspect-ratio probing, dominant-colour
  extraction, hex normalisation.
- Logo handling: the slot board and its placement router, and generation of
  black/white variants from vector and raster sources.
- Typeface handling: grouping uploaded weights into families so one typeface in
  five weights is one typeface.
- Description interpretation: the assisted parse with its deterministic
  fallback — repointed to produce suggestions with provenance rather than plain
  values.
- Creation resilience: duplicate-name resolution on create.
- The return-destination contract with the brand chooser.
- The Brand System Foundation in its entirety: Library, logo-system references,
  Core authority and provenance, Business Info, Context. Onboarding consumes
  these; it does not extend them.

### 2. Exists and evolves / migrates

- The two onboarding screens become one flow with branches.
- The onboarding state store becomes the single Onboarding Draft.
- The review panel is rebuilt against the Design System and against proposals
  that carry provenance, rather than against raw asset records.
- Material intake stops producing embedded payloads and starts producing Library
  items.

### 3. Legacy that should eventually disappear

- The from-scratch screen and its separate creation logic — superseded by the
  converged pipeline.
- The layered create-then-patch recovery machinery, which exists only to survive
  the browser-storage budget that Library-backed material removes.
- Embedded-payload storage of logos, photos, documents and fonts.
- The inline brand asset array and inline logo URL map as onboarding outputs.
- The onboarding-specific stylesheet, superseded by Design System tokens.
- The superseded onboarding routes and their redirect shims.

Deletion criterion: [NEEDS CLARIFICATION: Q2 — see Open Questions.]

### 4. Genuinely new

- The Onboarding Draft as one converged state with a single reader.
- The proposal model: an understanding that is reviewable and provenance-carrying
  before it becomes brand truth.
- The explicit review-to-authority step that turns human acceptance into
  confirmed Core values.
- Business Info and Context capture during onboarding.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user bringing existing material (a logo, a palette, a typeface, a
  description, a link) completes onboarding and reaches their brand in under 5
  minutes.
- **SC-002**: A user who supplies only a brand name reaches their brand in under
  30 seconds.
- **SC-003**: 100% of the material present in the review at the moment of
  creation is present and resolvable in the created brand, on every supported
  storage backend. Silent loss is zero.
- **SC-004**: 0 brand values reach confirmed or official status without an
  explicit human acceptance recorded during the flow.
- **SC-005**: 0 Brand Kit adoptions, guidelines, templates or design outputs are
  produced by onboarding.
- **SC-006**: Completing the flow produces exactly 1 brand, including under
  repeated submission and retry after a recoverable error.
- **SC-007**: Brands created from the two branches populate the same concepts
  through the same write authorities in 100% of comparisons.
- **SC-008**: A brand created by onboarding contains 0 inline brand-material
  payloads and 0 entries in the superseded inline asset stores.
- **SC-009**: A user who leaves the flow and returns finds their entries intact.
  *(Measurable target depends on Q1.)*
- **SC-010**: After retirement, exactly 1 onboarding entry path exists in the
  product, and 100% of superseded onboarding URLs resolve to it.

## Explicit Non-Goals

- Setup V3 itself. Onboarding hands off to the brand's Setup page; the contract
  between them is the created brand, not shared screens.
- Generating any deliverable: Brand Kit items, guidelines, templates, decks,
  social assets, designs.
- Editing an existing brand. Onboarding creates; Setup edits.
- A new classification service. Interpretation uses what exists.
- Importing from external design or storage platforms.
- Team, workspace or multi-user onboarding.
- Changes to the Library's own interface.
- Retroactive recovery of material lost by the superseded flow — on the
  authenticated path it was never stored, so there is nothing to recover.

## Migration & Compatibility Expectations

- Brands created by the superseded flows keep working untouched. This feature
  performs no data migration.
- Superseded onboarding URLs redirect to the new entry point rather than 404.
- The return-destination contract used by the brand chooser is unchanged, so
  callers need no update.
- Both the local and the authenticated storage backends are first-class. A
  behaviour that only works on one is not done.

## Assumptions

- Onboarding requires an authenticated user, as it effectively does today; the
  local backend serves development and the authentication bypass.
- The brand's Setup page remains at its current address and remains the default
  destination after onboarding.
- Assisted interpretation runs server-side through the existing proxy; no
  credential reaches the browser.
- The trained classifier stays opt-in and disabled by default; deterministic
  interpretation is the shipping behaviour, and the classifier improves proposals
  where enabled.
- "Business details" at onboarding means only what the user actually supplies —
  what the business offers, who it serves, where it operates, and its public
  links — not a full business profile.
- Context capture at onboarding is limited to durable observations that improve
  later suggestions; it is additive and never user-blocking.
- Brand material size limits are those of the Library, not of browser storage.
- Both branches share the review step; the new-brand branch differs only in that
  its proposals come from generated directions rather than uploads.

## Open Questions

Two decisions materially change scope and cannot be defaulted safely.

### Q1 — When does the brand record come into existence?

Constitution VII requires that a user can leave with work saved and resume. That
rules out today's behaviour, where abandoning the flow loses everything. What
replaces it depends on when the brand exists, which also decides where uploaded
material lives before creation.

| Option | Model | Implications |
|--------|-------|--------------|
| A | **Draft-first, local.** Nothing is created until the final step. The draft and its material are held in the browser and restored on return. | No half-built brands. Resume is same-device only. Material must be held outside the Library until creation, then committed in one pass — a second staging area, which sits uneasily with Principle II. |
| B | **Brand-first.** The brand record is created at the basics step with just a name. Everything after writes directly to the real brand through the Foundation authorities; "Create Brand" becomes a finish-and-confirm step. | One write path, no staging, resume works anywhere, material goes straight to the Library. Abandonment leaves a named, empty brand that the user must be able to see and discard. |
| C | **Hybrid.** Draft held locally, but material uploads to the Library as soon as a brand exists, and the brand is created at the first upload rather than at the basics step. | Splits the difference; adds a third state transition to reason about and test. |

### Q2 — What proves V3, and is removal in scope?

Principle IX requires a deprecation to carry a deletion criterion, and "once V3
is proven" is not yet testable.

| Option | Criterion | Implications |
|--------|-----------|--------------|
| A | **Same feature.** The superseded paths are deleted in this feature's final task, once its acceptance criteria pass. | Cleanest end state, no lingering second source of truth. All risk lands in one release. |
| B | **Next feature.** V3 ships as the only entry point with the old screens unreachable but present; a follow-up deletes them after a stated period or usage threshold. | Rollback is cheap for one release. Costs a documented follow-up and a temporary second implementation in the tree. |
| C | **Behind a switch.** Both flows ship, V3 default, with a way back; removal follows once the switch has not been used for a stated period. | Safest for users, most expensive to build and test — two flows must both stay correct. |
