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
converge on one state and one creation pipeline, writing through the Foundation's
authorities — Library for material, logo-system references for logos, Core with
authority and provenance, Business Info for business facts, Context for what was
learned. It is the first consumer of 001 built on 001's terms, and it
deliberately creates nothing beyond a brand: no Kit, no guidelines, no
deliverables.

**The brand exists from the moment it is named.** Naming the brand at the first
step creates the record; every step after writes to that real brand through the
Foundation's authorities. There is no second staging store for brand material and
no separate draft to reconcile, which is what keeps this flow inside Principle II.
The final step is not where the brand comes into being — it is where the user
confirms what the system understood, and that confirmation is what raises reviewed
values above suggestion.

Constitution alignment: Principles II (one canonical truth, one creation
pipeline), III (structured Core), IV (six concepts stay distinct), V (AI proposes,
the human disposes), VI (deep model, calm surface), VII (the user is never
trapped), IX (evolve, don't rewrite — reuse the proven utilities, delete the
superseded paths in this feature), X (Design System first), XI (brand isolation
at the data layer).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bring an existing brand and have it understood (Priority: P1)

Someone who already has a brand arrives with a folder: a logo or two, a font
file, a colour palette image, a PDF, a link to their site, and a paragraph
describing what the brand is. They name the brand, drop everything in, and
BrandingOS tells them what it thinks it received — which image is the primary
logo, which is the icon, what the palette is, what typeface they use, what the
brand's mission and audience appear to be.

**Why this priority**: This is the flow most new users take and the one that
carries real material. If it works, the product has a brand worth using from
minute one.

**Independent Test**: Complete the flow with a realistic set of files and a
description, and verify the review screen shows every item, placed sensibly,
before anything is confirmed as brand truth.

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
   surface, and those directions feed the same brand record.
2. **Given** a user who chose "starting new" and then realises they do have a
   logo, **When** they switch branches, **Then** everything already captured is
   preserved.
3. **Given** two brands, one created from each branch, **When** their records are
   compared, **Then** they populate the same concepts through the same write
   authorities and differ only in values.

---

### User Story 3 - Review and correct before confirming (Priority: P1)

Before anything becomes brand truth, the user sees everything the system
understood and can disagree with any of it: move an image out of the primary logo
slot, delete a colour that came from a photo's background, rename a typeface,
rewrite a proposed mission, mark something as not part of the brand.

**Why this priority**: This is the constitutional gate. Every proposal in this
flow is machine-derived; without a real review step the system would be promoting
its own guesses into brand truth.

**Independent Test**: Change at least one proposal in every group, finish the
flow, and verify the corrections — not the original proposals — are what the
brand carries, and at the right authority.

**Acceptance Scenarios**:

1. **Given** the system proposed an image as the primary logo, **When** the user
   moves a different image into that slot, **Then** the brand's primary logo is
   the user's choice.
2. **Given** a group of proposals the user never engages with, **When** the flow
   completes, **Then** those values remain system suggestions, not values the
   user confirmed.
3. **Given** a group the user explicitly accepts or edits, **When** the flow
   completes, **Then** those values are recorded as confirmed by that user, while
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
inspect the brand in Setup and the Library and confirm a one-to-one match with
the review screen.

**Acceptance Scenarios**:

1. **Given** a completed onboarding with uploads in every category, **When** the
   user opens Setup and the Library, **Then** every item that was present in the
   review is present and resolvable, on both the local and the authenticated
   storage backends.
2. **Given** any part of a save could not be completed, **When** the step
   finishes, **Then** the user is told exactly what did not save — the flow never
   reports success for something it did not store.
3. **Given** a completed onboarding, **When** the brand is inspected, **Then** no
   Brand Kit adoption, guideline, template or design output has been created.

---

### User Story 5 - Never trapped (Priority: P2)

The user can skip anything except naming the brand, move backwards freely
including with the browser Back control, close the tab and come back later — on
any device — to find their brand exactly as they left it, and, when they arrived
from somewhere that needed a brand, be returned there instead of to Setup. A
brand they abandoned half-built is visible in their brand list and can be picked
up or thrown away.

**Why this priority**: Constitutional requirement, and the difference between an
onboarding people finish and one they abandon. Lower than P1 only because the
core flow is demonstrable without resume.

**Independent Test**: Enter the flow from a brand-requiring destination, skip
every optional step, navigate backwards and forwards, close the tab, return from
a different session, finish, and verify the return destination.

**Acceptance Scenarios**:

1. **Given** a user who supplies only a brand name, **When** they finish,
   **Then** a valid brand exists and they reach Setup.
2. **Given** a user partway through, **When** they use the browser Back control,
   **Then** they return to the previous step with everything intact.
3. **Given** a user who closes the flow after uploading material, **When** they
   return in a later session, **Then** they resume at the step they left, with
   their material already in the Library.
4. **Given** a user who abandons onboarding entirely, **When** they open their
   brand list, **Then** the incomplete brand is visible, marked as unfinished,
   resumable, and deletable.
5. **Given** a user who entered with a return destination, **When** they finish,
   **Then** they are sent to that destination rather than to Setup.

### Edge Cases

- **Nothing supplied but a name** — a valid brand exists; no group is a gate.
- **Everything unrecognised** — all items land as unplaced; the flow still
  completes.
- **Assisted understanding unavailable** — deterministic interpretation produces
  the proposals instead; the flow never blocks on it, and the values are still
  recorded as suggestions.
- **The same file supplied twice** (including renamed) — accepted once.
- **A file too large to store** — refused at the point of upload with a clear
  reason, never accepted and then silently dropped later.
- **A brand name already in use** — resolved at the naming step, visibly, without
  silently renaming behind the user's back.
- **Partial save failure** — the brand still exists and stays resumable, and the
  user is told by name what did not land.
- **Onboarding abandoned after naming** — an empty but valid brand exists; it must
  be visibly unfinished, resumable and deletable rather than silent clutter.
- **Re-entering onboarding while a brand is already in progress** — resumes that
  brand or explicitly starts another; never silently forks into a duplicate.
- **A return destination that is not valid** — falls back to the brand's Setup
  page rather than failing.
- **Repeated or double submission of any step** — one brand, never two.

## Requirements *(mandatory)*

### Functional Requirements

#### One flow, one pipeline

- **FR-001**: The product MUST expose exactly one onboarding entry point for
  creating a brand.
- **FR-002**: "I have a brand" and "I'm starting new" MUST be branches within
  that flow, not separate flows with separate creation logic.
- **FR-003**: Both branches MUST converge on one state — the brand record under
  construction — with no parallel store of brand material or brand values beside
  it.
- **FR-004**: Brand creation MUST happen through exactly one pipeline, such that
  brands from either branch differ only in the values they carry, never in their
  shape or in which concepts were populated.
- **FR-005**: Repeated activation of any step — a rapid second click, a retry
  after a recoverable error, a re-entry into the flow — MUST NOT produce a second
  brand.

#### Brand Basics

- **FR-006**: The flow MUST collect a brand name, and the name MUST be the only
  required input in the entire flow.
- **FR-007**: Naming the brand MUST create the brand record, and every subsequent
  step MUST write to that record through the Foundation's authorities.
- **FR-008**: A brand created by this step MUST be valid and usable even if the
  user never returns — incomplete, but never malformed.
- **FR-009**: A brand still in onboarding MUST be identifiable as unfinished, and
  MUST be visible, resumable and deletable from wherever the user's brands are
  listed.
- **FR-010**: The user MUST be able to declare which branch they want and to
  change that choice later without losing anything already captured.
- **FR-011**: The flow MUST accept an optional free-form description of the
  brand.

#### Bring what you have

- **FR-012**: The flow MUST accept brand material as files, folders, archives and
  links, by both drag-and-drop and an explicit picker.
- **FR-013**: Supplied material MUST enter the Brand Library as it is supplied,
  not be held elsewhere and committed at the end.
- **FR-014**: The same material MUST NOT be accepted twice within one brand,
  identified by its content rather than its filename.
- **FR-015**: The new-brand branch MUST offer generated starting directions
  (colour and typographic) in place of uploads, and those directions MUST feed
  the same brand record.
- **FR-016**: Material that cannot be accepted MUST be reported per item with a
  reason, and MUST NOT abort the handling of the rest.

#### BrandingOS Understands

- **FR-017**: The system MUST interpret supplied material into proposals across:
  logo role assignment, colour palette, typefaces, strategy and voice content,
  business facts, and links.
- **FR-018**: Every proposal MUST be recorded with its provenance — distinguishing
  what the user supplied directly from what the system inferred.
- **FR-019**: No value produced by interpretation MAY be recorded at confirmed or
  official authority. Interpretation produces suggestions only.
- **FR-020**: Interpretation MUST degrade rather than fail: when assisted
  interpretation is unavailable, deterministic interpretation MUST still produce
  a usable proposal set.
- **FR-021**: Material the system could not interpret MUST surface as unplaced in
  the review, never be discarded.

#### Review

- **FR-022**: The review MUST present everything the system understood, grouped,
  and MUST be reachable before any of it rises above suggestion.
- **FR-023**: The user MUST be able to accept, correct, re-place, rename or remove
  any proposal or item.
- **FR-024**: The review MUST make it apparent which values were proposed by the
  system and which came from the user, without permanent labelling clutter.
- **FR-025**: A value MUST only rise above suggestion through an explicit human
  acceptance — per value or per group. Finishing the flow without engaging with a
  group MUST leave that group's values as suggestions.

#### Finish

- **FR-026**: No brand material MAY be stored inline on the brand record, and no
  brand material MAY be persisted as an embedded data payload.
- **FR-027**: Logos MUST be recorded as logo-system references to Library items.
- **FR-028**: Business facts gathered during onboarding MUST be written to
  Business Info.
- **FR-029**: Durable observations about the brand and how it was described MAY be
  written to Brand Context. A Context write MUST NEVER be a precondition for
  finishing.
- **FR-030**: Onboarding MUST NOT create Official Brand Kit adoptions, brand
  guidelines, templates, deliverables, or any other Work/Output.
- **FR-031**: Any write that does not complete MUST be reported to the user by
  name. The flow MUST NOT report success for anything it did not store.
- **FR-032**: On completion the brand MUST no longer be marked unfinished, and the
  user MUST arrive at the brand's Setup page, or at the supplied return
  destination when there is one.

#### Continuity

- **FR-033**: Every step except naming the brand MUST be skippable, and a
  name-only brand MUST be finishable.
- **FR-034**: The user MUST be able to move backwards through steps, including
  with the browser Back control, without losing entered data.
- **FR-035**: The flow MUST record which step a brand reached, and returning to
  onboarding for that brand MUST resume there — in a later session and on another
  device.
- **FR-036**: A return destination supplied on entry MUST be preserved across
  every step, branch switch, and resumed session.

#### Interface

- **FR-037**: All interface elements MUST be built from the canonical Design
  System; no new generic control MAY be introduced where one already exists.
- **FR-038**: Every surface MUST be responsive across phone, tablet and desktop.
- **FR-039**: Every interactive control MUST be keyboard operable and labelled for
  assistive technology.

#### Isolation

- **FR-040**: Every write MUST be authorized for the acting user and target brand
  at the service and data layer, not by interface filtering.

#### Retirement

- **FR-041**: The superseded onboarding routes, screens and state MUST be deleted
  within this feature, as its final step, once every acceptance criterion above is
  demonstrated. They MUST NOT be left disabled, unreachable or feature-switched.
- **FR-042**: Superseded onboarding URLs MUST resolve to the new entry point.

### Key Entities

- **Brand under construction**: The brand record itself, from the moment it is
  named. This is the converged state both branches write to; there is no separate
  draft. It carries a marker that onboarding is unfinished and how far it reached.
- **Proposal**: One thing the system believes about the brand — a logo role, a
  colour, a typeface, a strategy statement, a business fact, a link. Carries what
  it proposes, where the belief came from, and whether a human has engaged with it.
- **Supplied Item**: One piece of material the user brought, held as a Library
  item, with its content-derived identity, its interpreted kind, and its placement
  — including "unplaced".
- **Review Decision**: A human act on a proposal — accept, correct, re-place,
  remove. The record that authorises promotion above suggestion.
- **Onboarding Progress**: Which step the brand reached and whether onboarding is
  complete. The only genuinely new state this feature introduces, and it lives on
  the brand rather than beside it.

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
- Creation resilience: duplicate-name resolution, now applied at the naming step.
- The return-destination contract with the brand chooser.
- The Brand System Foundation in its entirety: Library, logo-system references,
  Core authority and provenance, Business Info, Context. Onboarding consumes
  these; it does not extend them.

### 2. Exists and evolves / migrates

- The two onboarding screens become one flow with branches.
- The onboarding state store shrinks to onboarding progress and review decisions;
  brand values and material move to the brand record and the Library.
- The review panel is rebuilt against the Design System and against proposals
  that carry provenance, rather than against raw asset records.
- Material intake stops producing embedded payloads and starts producing Library
  items at the moment of upload.
- The brand list gains the unfinished-brand state and its resume and discard
  affordances.

### 3. Legacy that disappears in this feature

- The from-scratch screen and its separate creation logic — superseded by the
  converged pipeline.
- The layered create-then-patch recovery machinery, which exists only to survive
  the browser-storage budget that Library-backed material removes.
- Embedded-payload storage of logos, photos, documents and fonts.
- The inline brand asset array and inline logo URL map as onboarding outputs.
- The onboarding-specific stylesheet, superseded by Design System tokens.
- The superseded onboarding routes and their redirect shims.

**Deletion criterion**: all of the above is removed as the final step of this
feature, once every acceptance scenario and success criterion in this spec is
demonstrated. No superseded onboarding code survives the feature's completion.

### 4. Genuinely new

- Brand-first onboarding: the brand record exists from naming, and every step
  writes to it through the Foundation's authorities.
- Onboarding progress on the brand, and the unfinished-brand state in the brand
  list, with resume and discard.
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
  completion is present and resolvable in the brand, on every supported storage
  backend. Silent loss is zero.
- **SC-004**: 0 brand values reach confirmed or official status without an
  explicit human acceptance recorded during the flow.
- **SC-005**: 0 Brand Kit adoptions, guidelines, templates or design outputs are
  produced by onboarding.
- **SC-006**: Completing the flow produces exactly 1 brand, including under
  repeated submission, retry after a recoverable error, and re-entry into the
  flow.
- **SC-007**: Brands created from the two branches populate the same concepts
  through the same write authorities in 100% of comparisons.
- **SC-008**: A brand created by onboarding contains 0 inline brand-material
  payloads and 0 entries in the superseded inline asset stores.
- **SC-009**: A user who leaves onboarding at any step and returns in a later
  session, on any device, resumes at that step with 100% of their material and
  entries intact.
- **SC-010**: 100% of brands abandoned during onboarding are visible as
  unfinished in the user's brand list, and can be resumed or deleted from there.
- **SC-011**: On feature completion, exactly 1 onboarding entry path exists in the
  product, 0 superseded onboarding screens remain in the codebase, and 100% of
  superseded onboarding URLs resolve to the surviving path.

## Explicit Non-Goals

- Setup V3 itself. Onboarding hands off to the brand's Setup page; the contract
  between them is the brand, not shared screens.
- Generating any deliverable: Brand Kit items, guidelines, templates, decks,
  social assets, designs.
- Editing a finished brand. Onboarding creates and completes; Setup edits.
- A new classification service. Interpretation uses what exists.
- Importing from external design or storage platforms.
- Team, workspace or multi-user onboarding.
- Changes to the Library's own interface.
- Retroactive recovery of material lost by the superseded flow — on the
  authenticated path it was never stored, so there is nothing to recover.
- Automatic cleanup of abandoned brands. They are surfaced and deletable by their
  owner; timed reaping is a separate decision.

## Migration & Compatibility Expectations

- Brands created by the superseded flows keep working untouched. This feature
  performs no data migration, and pre-existing brands are treated as finished.
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

## Resolved Decisions

Recorded here because both shaped the requirements above and should not be
relitigated at plan time without an explicit amendment.

- **When the brand record comes into existence** — *brand-first*. The brand is
  created at the naming step and every subsequent step writes to it through the
  Foundation's authorities. Chosen over a local draft because a draft would mean a
  second staging store for brand material, which Principle II forbids, and because
  resume then works across sessions and devices for free. The cost — abandoned
  empty brands — is accepted and paid for by FR-009, SC-010 and the unfinished
  state in the brand list. *(Decided 2026-08-13.)*
- **What proves V3, and when the superseded paths are deleted** — *within this
  feature*. Removal is the final step, gated on every acceptance criterion in this
  spec being demonstrated. Chosen over a follow-up deletion or a feature switch
  because either leaves a second onboarding implementation alive in the tree,
  which is the condition Principles II and IX exist to prevent. *(Decided
  2026-08-13.)*
