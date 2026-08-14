# Feature Specification: Onboarding V3

**Feature Branch**: `v3-onboarding` (spec directory: `002-onboarding-v3`)

**Created**: 2026-08-13

**Status**: **Revision R1 in progress (2026-08-14)** — the Foundation and pipeline
described below shipped on 2026-08-14 and are KEPT. The user-facing flow is being
returned to the pre-V3 onboarding interface as its visual and interaction
foundation, and extended. See "Revision R1" below and the task-level record in
tasks.md.

**Input** *(original)*: "002 — Onboarding V3. Replace the two divergent onboarding
creation flows with one canonical onboarding system."

**Input** *(revision R1)*: "KEEP the new V3 Foundation/architecture, but return to
the OLD onboarding UI as the visual and interaction foundation. Old UI soul + V3
brain." Plus a full revised product flow — a dedicated brand-name screen, a brand
and business profile screen with a Build-with-AI helper, an improved
bring-what-you-have screen, a real processing moment built on the BrandingOS
9-dot symbol, and a significantly improved review built on the old "Review your
uploads" interface.

## Overview

Onboarding was two flows wearing one name. The upload path and the from-scratch
path had separate screens, separate submit implementations, and produced brands of
different shapes. Both wrote into the storage that feature 001 retired: uploaded
material went to the brand record's inline asset array, logos to an inline URL map
rather than logo-system references, every file embedded as a data URL sized to a
browser storage budget. Nothing reached the Brand Library, nothing carried
authority or provenance, and on the authenticated path the inline asset array was
never persisted at all — every photo, document and social link a signed-in user
supplied was discarded while the flow reported success.

Onboarding V3 replaced both paths with a single system writing through the
Foundation's authorities — Library for material, logo-system references for logos,
Core with authority and provenance, Business Info for business facts, Context for
what was learned. It is the first consumer of 001 built on 001's terms, and it
deliberately creates nothing beyond a brand: no Kit, no guidelines, no
deliverables.

**The brand exists from the moment it is named.** Naming the brand at the first
step creates the record; every step after writes to that real brand through the
Foundation's authorities. There is no second staging store for brand material and
no separate draft to reconcile, which is what keeps this flow inside Principle II.
The final step is not where the brand comes into being — it is where the user
confirms what the system understood, and that confirmation is what raises reviewed
values above suggestion.

### Revision R1 — old interface, V3 architecture

The V3 architecture is correct and is kept in full. The interface it shipped with
is not the one the product wants: the retired onboarding's interface — its card
stack, its brand bar, its dropzone, its logo slot board, its colour board, its
"Review your uploads" screen — is the visual and interaction foundation to return
to and improve, not to replace.

R1 therefore changes **what the user sees and is asked**, and changes the write
pipeline only where the revised experience genuinely demands it. Concretely:

- Naming the brand gets a screen of its own, and asks nothing else.
- A **brand and business profile** screen carries the large description surface
  from the old interface, plus a Build-with-AI helper that hands the user a prompt
  for their own AI tool and takes back plain, structured text.
- Understanding becomes **adaptive**: a pasted structured brief is parsed
  deterministically without an AI call; free-form prose is understood by
  BrandingOS; and whatever remains meaningfully missing is asked for
  progressively, in the review, as selections rather than a questionnaire.
- Categorical brand facts — industry, style, personality, tone, values — are drawn
  from **controlled vocabularies**, so they can drive filtering and
  recommendations later instead of being unusable free text.
- Understanding gets a **real processing moment** built on the BrandingOS 9-dot
  symbol, reporting only work that is actually happening.
- The review returns to the old "Review your uploads" layout, widened and
  significantly improved, with logo classification, source-priority colour and
  type resolution, and chips wherever a concept is categorical.

Nothing in the Foundation's write model changes. Authority and provenance,
Library-backed material, logo-system references, brand-first creation, resume and
the unfinished-brand state all survive R1 untouched.

Constitution alignment: Principles II (one canonical truth, one creation
pipeline), III (structured Core), IV (six concepts stay distinct), V (AI proposes,
the human disposes), VI (deep model, calm surface), VII (the user is never
trapped), IX (evolve, don't rewrite — R1 restores and improves a proven interface
rather than inventing a third one), X (Design System first), XI (brand isolation at
the data layer).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bring an existing brand and have it understood (Priority: P1)

Someone who already has a brand arrives with a folder: a logo or two, a font file,
a colour palette image, a PDF, a link to their site, and a paragraph describing
what the brand is. They name the brand, describe it, drop everything in, watch
BrandingOS assemble it, and are told what it thinks it received — which image is
the primary logo, which is the icon, what the palette is, what typeface they use,
what industry they are in, what the brand's mission and audience appear to be.

**Why this priority**: This is the flow most new users take and the one that
carries real material. If it works, the product has a brand worth using from
minute one.

**Independent Test**: Complete the flow with a realistic set of files and a
description, and verify the review shows every item, placed sensibly, before
anything is confirmed as brand truth.

**Acceptance Scenarios**:

1. **Given** a user with a logo file, a font file, a palette image, a PDF and a
   website link, **When** they drop all of it into the flow, **Then** each item
   appears under the section the system believes it belongs to, and none is
   silently dropped.
2. **Given** a free-form brand description, **When** the user advances past the
   profile step, **Then** the system proposes structured brand content — summary,
   industry, style, personality, tone, values, audience, positioning, mission —
   drawn only from what the user wrote.
3. **Given** an item the system cannot interpret, **When** the review is shown,
   **Then** that item appears under Files rather than being discarded.
4. **Given** several uploads of the same logo in different files, **When** the
   review is shown, **Then** exact duplicates are ignored and near-duplicate
   variants are grouped rather than listed as separate logos.

---

### User Story 2 - Arrive with little and still leave with a brand (Priority: P1)

Someone with no files, and only a rough idea, gives a name and describes the brand
in their own words — or uses the Build-with-AI helper to produce that description
in their own AI tool and pastes it back. They reach the same review as the user in
Story 1, where the sections that have no evidence behind them offer suggestions —
palette directions, typography pairings — and the questions that genuinely matter
are asked as selections.

**Why this priority**: Half the product's audience arrives with nothing, and the
retired flow produced a materially thinner brand for them. Convergence is the
point: there is one path, and how much you brought only changes how much of it was
already answered.

**Independent Test**: Complete the flow supplying only a name and a description,
and verify the resulting brand populates the same concepts, through the same
authorities, as a brand from Story 1.

**Acceptance Scenarios**:

1. **Given** a user who supplies a description but no files, **When** they reach
   the review, **Then** the colour and typography sections offer suggested
   directions, and every other section is populated from what they wrote.
2. **Given** a user who used the Build-with-AI helper and pasted its output,
   **When** understanding runs, **Then** the structure is recognised and parsed
   without a further AI call, and its categorical answers are normalised into the
   product's controlled vocabularies.
3. **Given** two brands, one created with material and one without, **When** their
   records are compared, **Then** they populate the same concepts through the same
   write authorities and differ only in values.
4. **Given** a value that is important and that nothing in the user's input
   determined, **When** the review is shown, **Then** the user is asked for it
   directly, as a selection, and never as part of a long form.

---

### User Story 3 - Review and correct before confirming (Priority: P1)

Before anything becomes brand truth, the user sees everything the system
understood and can disagree with any of it: move an image out of the primary logo
slot, delete a colour that came from a photo's background, change the typeface,
pick a different personality, rewrite a proposed mission.

**Why this priority**: This is the constitutional gate. Every proposal in this flow
is machine-derived; without a real review step the system would be promoting its
own guesses into brand truth.

**Independent Test**: Change at least one proposal in every section, finish the
flow, and verify the corrections — not the original proposals — are what the brand
carries, and at the right authority.

**Acceptance Scenarios**:

1. **Given** the system proposed an image as the primary logo, **When** the user
   moves a different image into that slot, **Then** the brand's primary logo is
   the user's choice.
2. **Given** a proposal the user only reads, opens or scrolls past, **When** the
   flow completes, **Then** it is still recorded as a system suggestion.
3. **Given** a proposal the user explicitly accepts, or edits, **When** the flow
   completes, **Then** that individual value is recorded as confirmed by that
   user, while still recording that it originated as a suggestion.
4. **Given** a user who uses a section's "Looks right" affordance, **When** the
   flow completes, **Then** each value in that section carries exactly the record
   it would have carried had the user accepted it individually.
5. **Given** any value at all, **When** onboarding completes, **Then** no value has
   reached official authority.
6. **Given** the review at any moment, **When** the user reads it, **Then** no
   authority or provenance vocabulary appears anywhere on screen.

---

### User Story 4 - The brand you land on is already correct (Priority: P2)

The user finishes onboarding and arrives at their Setup page. The logo they placed
is on the logo slot. The photos and documents they uploaded are in the Library.
Their website and social links are attached. Their business details are where
business details live. Nothing they supplied is missing, and nothing they didn't
ask for has been generated.

**Why this priority**: This is where the retired flow failed hardest and least
visibly. It is also the acceptance test for every storage requirement in this spec.

**Independent Test**: Complete onboarding with material in every category, then
inspect the brand in Setup and the Library and confirm a one-to-one match with the
review.

**Acceptance Scenarios**:

1. **Given** a completed onboarding with uploads in every category, **When** the
   user opens Setup and the Library, **Then** every item that was present in the
   review is present and resolvable, on both the local and the authenticated
   storage backends.
2. **Given** any part of a save could not be completed, **When** the step finishes,
   **Then** the user is told exactly what did not save — the flow never reports
   success for something it did not store.
3. **Given** a completed onboarding, **When** the brand is inspected, **Then** no
   Brand Kit adoption, guideline, template or design output has been created.
4. **Given** categorical values chosen from the controlled vocabularies, **When**
   the brand is inspected, **Then** those values are stored as vocabulary members
   rather than as free text.

---

### User Story 5 - Never trapped (Priority: P2)

The user can skip anything except naming the brand, move backwards freely including
with the browser Back control, close the tab and come back later — on any device —
to find their brand exactly as they left it, and, when they arrived from somewhere
that needed a brand, be returned there instead of to Setup. A brand they abandoned
half-built is visible in their brand list and can be picked up or thrown away.

**Why this priority**: Constitutional requirement, and the difference between an
onboarding people finish and one they abandon.

**Independent Test**: Enter the flow from a brand-requiring destination, skip every
optional step, navigate backwards and forwards, close the tab, return from a
different session, finish, and verify the return destination.

**Acceptance Scenarios**:

1. **Given** a user who supplies only a brand name, **When** they finish, **Then** a
   valid brand exists and they reach Setup.
2. **Given** a user partway through, **When** they use the browser Back control,
   **Then** they return to the previous step with everything intact.
3. **Given** a user who closes the flow after uploading material, **When** they
   return in a later session, **Then** they resume at the step they left, with
   their material already in the Library.
4. **Given** a user who abandons onboarding entirely, **When** they open their brand
   list, **Then** the incomplete brand is visible, marked as unfinished, resumable,
   and deletable.
5. **Given** a user who entered with a return destination, **When** they finish,
   **Then** they are sent to that destination rather than to Setup.

### Edge Cases

- **Nothing supplied but a name** — a valid brand exists; no section is a gate.
- **Everything unrecognised** — all items land under Files; the flow still
  completes.
- **Assisted understanding unavailable** — deterministic interpretation produces
  the proposals instead; the flow never blocks on it, and the values are still
  recorded as suggestions.
- **A structured brief that is only partly in the expected shape** — the recognised
  parts parse deterministically; the remainder is treated as free-form prose.
- **A categorical answer outside the vocabulary** — recorded against the closest
  vocabulary member if one plainly fits, otherwise carried as "Other" with the
  user's wording preserved, and never silently coerced.
- **The same file supplied twice** (including renamed) — accepted once.
- **A file over the per-file limit, or one file too many** — refused at the point of
  upload with a clear reason, never accepted and then silently dropped later.
- **A folder or archive whose contents exceed the limits** — the files that fit are
  accepted, the rest are named and refused; the drop is never rejected wholesale.
- **A brand name already in use** — resolved at the naming step, visibly, without
  silently renaming behind the user's back.
- **Partial save failure** — the brand still exists and stays resumable, and the
  user is told by name what did not land.
- **Onboarding abandoned after naming** — an empty but valid brand exists; it must
  be visibly unfinished, resumable and deletable rather than silent clutter.
- **Re-entering onboarding while a brand is already in progress** — resumes that
  brand or explicitly starts another; never silently forks into a duplicate.
- **A return destination that is not valid** — falls back to the brand's Setup page
  rather than failing.
- **Repeated or double submission of any step** — one brand, never two.
- **Understanding finishing almost instantly** — the processing moment still plays
  one complete beat rather than flashing past.

## Requirements *(mandatory)*

### Functional Requirements

#### One flow, one pipeline

- **FR-001**: The product MUST expose exactly one onboarding entry point for
  creating a brand.
- **FR-002**: The flow MUST NOT ask the user to classify themselves — as having a
  brand or starting new, or into any equivalent up-front fork. There is one path;
  how much the user brought changes only how much of the review is already
  answered.
- **FR-003**: All input MUST converge on one state — the brand record under
  construction — with no parallel store of brand material or brand values beside
  it.
- **FR-004**: Brand creation MUST happen through exactly one pipeline, such that
  brands differ only in the values they carry, never in their shape or in which
  concepts were populated.
- **FR-005**: Repeated activation of any step — a rapid second click, a retry after
  a recoverable error, a re-entry into the flow — MUST NOT produce a second brand.
- **FR-043**: The flow MUST consist of exactly four screens — brand name, brand and
  business profile, bring what you have, review — with understanding presented as a
  transition between the third and fourth, never as a fifth screen or a step in the
  count.

#### Screen 1 — Brand name

- **FR-006**: The brand name MUST be the only required input in the entire flow.
- **FR-044**: The first screen MUST ask for the brand name and nothing else, and its
  title MUST plainly state that a brand is being set up. Ambiguous framing such as
  "What are we building?" is not acceptable.
- **FR-007**: Naming the brand MUST create the brand record, and every subsequent
  step MUST write to that record through the Foundation's authorities.
- **FR-008**: A brand created by this step MUST be valid and usable even if the user
  never returns — incomplete, but never malformed.
- **FR-009**: A brand still in onboarding MUST be identifiable as unfinished, and
  MUST be visible, resumable and deletable from wherever the user's brands are
  listed.

#### Screen 2 — Brand and business profile

- **FR-011**: The flow MUST accept an optional free-form description of the brand,
  in a large writing surface, and MUST NOT require it.
- **FR-045**: The description surface MUST offer a Build-with-AI helper providing at
  least: copy the prompt, open it in ChatGPT, and open it in Claude, each carrying
  the brand's name.
- **FR-046**: The prompt the helper produces MUST instruct the AI to return **plain
  text only** — concise and structured, a lightweight brand and business profile
  and not a long strategy document — covering: brand summary, industry, products
  and services, audience, positioning, slogan where one is warranted, personality,
  tone, visual style, core values, colours and fonts.
- **FR-047**: For every categorical field, the prompt MUST supply the product's
  controlled options and require the AI to select from them, permitting "Other"
  only when nothing fits. The categorical fields are industry, visual style,
  personality, tone and values.
- **FR-048**: The prompt MUST ask for the brand's existing colours and fonts when
  they are known, and for three palette directions and three font-pairing
  directions when they are not.
- **FR-049**: When the user writes their own description instead of using the
  helper, the writing surface's guidance MUST lead them to include the same
  information naturally, and the system MUST parse whatever they provide into the
  same structured model.

#### Screen 3 — Bring what you have

- **FR-012**: The flow MUST accept brand material as files, folders and archives, by
  both drag-and-drop and an explicit picker.
- **FR-050**: The flow MUST accept an optional website address on this screen.
- **FR-051**: Material intake MUST enforce a maximum of **10 files in total** and
  **5 MB per file**. A folder or archive drop MUST be expanded and held to the same
  totals.
- **FR-013**: Supplied material MUST enter the Brand Library as it is supplied, not
  be held elsewhere and committed at the end.
- **FR-014**: The same material MUST NOT be accepted twice within one brand,
  identified by its content rather than its filename.
- **FR-016**: Material that cannot be accepted MUST be reported per item with a
  reason, and MUST NOT abort the handling of the rest.

#### Understanding — adaptive

- **FR-017**: The system MUST interpret supplied material and text into proposals
  across: logo role assignment, colour palette, typefaces, industry, visual style,
  personality, tone, values, summary, audience, positioning, mission, business
  facts and links.
- **FR-052**: Understanding MUST be adaptive. When the supplied text is recognisably
  the structured brief produced by the Build-with-AI prompt, it MUST be parsed
  deterministically and MUST NOT trigger a further assisted-understanding call.
- **FR-053**: When the supplied text is free-form prose, assisted understanding MUST
  be used to structure it, extracting as much as the text supports before anything
  is asked of the user.
- **FR-054**: Categorical answers from any source MUST be normalised into the
  product's controlled vocabularies before being proposed.
- **FR-055**: After extraction, the system MUST ask the user only for information
  that is genuinely missing or genuinely ambiguous AND materially useful. It MUST
  ask progressively rather than as a single long questionnaire, and MUST offer
  selections rather than free text wherever the concept is categorical.
- **FR-018**: Every proposal MUST be recorded with its provenance — distinguishing
  what the user supplied directly from what the system inferred.
- **FR-019**: No value produced by interpretation MAY be recorded at confirmed or
  official authority. Interpretation produces suggestions only.
- **FR-020**: Interpretation MUST degrade rather than fail: when assisted
  interpretation is unavailable, deterministic interpretation MUST still produce a
  usable proposal set.
- **FR-021**: Material the system could not interpret MUST surface under Files in
  the review, never be discarded.
- **FR-056**: Source priority MUST be enforced throughout: an explicit user choice
  or edit outranks direct uploaded evidence, which outranks the structured brief,
  which outranks an AI suggestion. A lower-priority source MUST NEVER overwrite a
  higher-priority one, including on re-run.

#### The processing moment

- **FR-057**: Understanding MUST be presented through the BrandingOS 9-dot symbol,
  beginning at the centre node with the outer nodes quiet, and progressively
  activating connections and outer nodes as information is understood.
- **FR-058**: Processing copy MUST describe work that is actually being performed at
  that moment. A message for work that is not happening MUST NOT be shown.
- **FR-059**: The moment MAY surface small real findings as they become available
  (for example the number of logo variations found, the industry identified, the
  number of colours extracted, the typeface identified), and those findings MAY
  feed visually into the symbol.
- **FR-060**: The moment MUST NOT show a percentage, fabricated step delays, a
  forced long wait, particles, sparkles or generic AI effects. Motion MUST be
  subtle and controlled.
- **FR-061**: The moment MUST play one complete minimum beat — approximately 1.2
  seconds — before advancing, so it never flashes past; and when the real work takes
  longer it MUST continue naturally, with the copy tracking the real processing
  state.

#### Review

- **FR-022**: The review MUST present everything the system understood, grouped, and
  MUST be reachable before any of it rises above suggestion.
- **FR-062**: The review MUST be built on the retired flow's "Review your uploads"
  interface as its visual and interaction base — improved, wider, cleaner and less
  vertically cramped — and MUST NOT be replaced by a different card model.
- **FR-063**: The review MUST open with a brand summary carrying the name, slogan,
  industry and style.
- **FR-064**: The review MUST be organised into exactly these sections: Logos,
  Colors, Fonts, Brand Profile, Online, Files.
- **FR-065**: Logos MUST be automatically classified into primary, wordmark, mark,
  on-light, on-dark, horizontal and vertical roles wherever the evidence supports
  it; exact duplicates MUST be ignored; near-duplicate variants MUST be grouped
  sensibly rather than listed separately; and the user MUST be able to drag, swap,
  add and remove.
- **FR-066**: Colours MUST resolve by source priority: existing or uploaded evidence
  first, and when a logo is present, extraction from the logo MUST be preferred over
  an AI guess. The review MUST retain add-a-colour, extract-from-logo and
  extract-from-image, and MUST offer suggested palettes when there is nothing to
  extract from.
- **FR-067**: Typefaces MUST resolve by source priority: uploaded or known fonts
  first. When there are none, the review MUST offer suggested typography as **font
  pairings**, never as unrelated individual fonts.
- **FR-068**: In Brand Profile, categorical concepts — industry, style, personality,
  tone, values — MUST be presented as selections from the controlled vocabularies,
  and concepts whose meaning lives in the wording — summary, audience, positioning,
  mission — MUST be presented as concise text. Meaningful prose MUST NOT be
  converted into artificial dropdowns.
- **FR-069**: Online MUST carry the website and relevant social links only, and the
  user MUST be able to add, edit and remove a link. Files MUST carry the remaining
  Library material — documents, decks, references, imagery.
- **FR-023**: The user MUST be able to accept, correct, re-place, rename or remove
  any proposal or item.
- **FR-024**: The review MUST make it apparent which values were proposed by the
  system and which came from the user, without permanent labelling clutter.
- **FR-025**: Confirmation MUST be per value. A value rises above suggestion only
  when the user explicitly accepts it or edits it; either act records that value as
  **Confirmed** by that user, while still recording that it originated as a
  suggestion.
- **FR-025a**: Viewing, opening, expanding or scrolling past a proposal MUST NOT
  change its authority. Attention is not acceptance.
- **FR-025b**: Any proposal the user does not explicitly accept or edit MUST remain
  **Suggested** when the flow completes.
- **FR-025c**: A section-level "Looks right" affordance MAY exist, but only as a
  bulk application of the same per-value acceptance — it MUST produce exactly the
  record that accepting each value individually would produce, and MUST NOT
  introduce a section-level authority.
- **FR-025d**: No value MAY reach **Official** authority during onboarding. Official
  is reached only through Official Brand Kit adoption, which this flow does not
  perform (FR-030).
- **FR-070**: The review MUST NOT expose authority or provenance vocabulary, or any
  other technical model language, anywhere in its interface.
- **FR-071**: The user MUST be able to continue without confirming every section,
  and the final action MUST read "Open my brand".

#### Finish

- **FR-026**: No brand material MAY be stored inline on the brand record, and no
  brand material MAY be persisted as an embedded data payload.
- **FR-027**: Logos MUST be recorded as logo-system references to Library items.
- **FR-028**: Business facts gathered during onboarding MUST be written to Business
  Info.
- **FR-029**: Durable observations about the brand and how it was described MAY be
  written to Brand Context. A Context write MUST NEVER be a precondition for
  finishing.
- **FR-030**: Onboarding MUST NOT create Official Brand Kit adoptions, brand
  guidelines, templates, deliverables, or any other Work/Output.
- **FR-031**: Any write that does not complete MUST be reported to the user by name.
  The flow MUST NOT report success for anything it did not store.
- **FR-032**: On completion the brand MUST no longer be marked unfinished, and the
  user MUST arrive at the brand's Setup page, or at the supplied return destination
  when there is one.

#### Continuity

- **FR-033**: Every step except naming the brand MUST be skippable, and a name-only
  brand MUST be finishable.
- **FR-034**: The user MUST be able to move backwards through steps, including with
  the browser Back control, without losing entered data.
- **FR-035**: The flow MUST record which step a brand reached, and returning to
  onboarding for that brand MUST resume there — in a later session and on another
  device.
- **FR-036**: A return destination supplied on entry MUST be preserved across every
  step and resumed session.

#### Interface

- **FR-037**: All interface elements MUST be built from the canonical Design System;
  no new generic control MAY be introduced where one already exists.
- **FR-038**: Every surface MUST be responsive across phone, tablet and desktop.
- **FR-039**: Every interactive control MUST be keyboard operable and labelled for
  assistive technology.
- **FR-072**: The interface MUST NOT introduce a new visual language. It restores
  and improves the retired flow's, expressed entirely in canonical Design System
  tokens.

#### Isolation

- **FR-040**: Every write MUST be authorized for the acting user and target brand at
  the service and data layer, not by interface filtering.

#### Retirement

- **FR-041**: The superseded onboarding routes, screens and state MUST be deleted
  within this feature. They MUST NOT be left disabled, unreachable or
  feature-switched. *(Discharged 2026-08-14: `features/onboarding-v4/` and
  `/onboard-brand/create` deleted.)*
- **FR-042**: Superseded onboarding URLs MUST resolve to the new entry point.
  *(Discharged 2026-08-14.)*
- **FR-073**: R1 MUST leave exactly one implementation of each screen. Interface
  code superseded by R1 — including the branch-based material step and the
  standalone starting-directions picker — MUST be deleted or absorbed, never left
  beside its replacement.

### Key Entities

- **Brand under construction**: The brand record itself, from the moment it is
  named. This is the converged state everything writes to; there is no separate
  draft. It carries a marker that onboarding is unfinished and how far it reached.
- **Brand brief**: The text the user supplies on screen 2, whether written by hand
  or produced by their own AI tool from the product's prompt. It is an input, not a
  stored concept — what survives is what understanding extracts from it.
- **Controlled vocabulary**: The closed set of allowed values for a categorical
  brand concept — industry, style, personality, tone, values. Members are stable
  and machine-comparable, which is what makes filtering and recommendation possible
  later.
- **Proposal**: One thing the system believes about the brand — a logo role, a
  colour, a typeface, a vocabulary member, a strategy statement, a business fact, a
  link. Carries what it proposes, where the belief came from, and whether a human
  has engaged with it.
- **Open question**: Something important that nothing the user supplied determined.
  Asked in the review, progressively, as a selection where the concept is
  categorical.
- **Supplied Item**: One piece of material the user brought, held as a Library item,
  with its content-derived identity, its interpreted kind, and its placement —
  including "unplaced".
- **Review Decision**: A human act on a proposal — accept, correct, re-place,
  remove. The record that authorises promotion above suggestion.
- **Onboarding Progress**: Which step the brand reached and whether onboarding is
  complete. The only genuinely new state this feature introduces, and it lives on
  the brand rather than beside it.

## Existing System Disposition *(mandatory for this feature)*

### 1. Exists and is preserved / reused

**From the retired onboarding interface** — restored as R1's foundation:

- The description surface and its guidance, and the Build-with-AI helper with its
  copy and open-in-tool actions.
- The dropzone: folder drop, paste-a-URL, the item strip and its clear-all.
- The logo slot board with its placement routing and swap/demote planning.
- The colour board: swatches, picker, set-primary, extract, suggested palettes.
- The review's card-stack layout, its brand bar with the inline-editable slogan,
  and its per-section head with a count on the right.
- The suggested-palette, popular-palette, font-pairing and social-platform data
  sets.

**From V3** — the whole architecture:

- Brand-first creation, the onboarding marker, resume, and the unfinished-brand
  state in the brand list.
- Library-backed material intake, logo-system references, and the content-hash
  duplicate rejection.
- The proposal model, `interpret`, `applyProposals`, and the per-value acceptance
  module.
- The sentinel mechanism that keeps a name-only brand from fabricating Core values.
- The finish contract and its per-slice failure reporting.
- The Brand System Foundation in its entirety. Onboarding consumes it; R1 extends
  it only where §4 records.

### 2. Exists and evolves / migrates

- The three-step machine becomes four steps; the recorded step vocabulary grows and
  an unrecognised recorded step degrades to the first step rather than throwing.
- The basics step splits: the name gets its own screen and the description moves to
  the profile screen.
- The review is rebuilt on the retired flow's layout and sections, replacing the
  five-section proposal list shipped on 2026-08-14.
- `interpret` gains brief detection, vocabulary normalisation, and open-question
  derivation.
- The understanding transition becomes the processing moment.

### 3. Legacy that disappears in this revision

- The starting-directions picker as a separate branch affordance — suggestions move
  into the review's Colors and Fonts sections, where they belong.
- Any remaining branch vocabulary in the onboarding marker and the flow shell.
- The five-section review shipped on 2026-08-14, superseded by the six-section one.

**Deletion criterion**: removed as R1's final step, once every acceptance scenario
and success criterion is demonstrated. No superseded onboarding interface survives
the revision's completion.

### 4. Genuinely new

- The controlled vocabularies and their normalisation.
- The Build-with-AI prompt and its deterministic reverse-parse.
- Adaptive understanding: structured brief versus prose, and the progressive open
  questions that follow.
- The processing moment on the 9-dot symbol.
- Logo duplicate rejection and variant grouping in the review.
- The explicit source-priority rule as an enforced pipeline property.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user bringing existing material (a logo, a palette, a typeface, a
  description, a link) completes onboarding and reaches their brand in under 5
  minutes.
- **SC-002**: A user who supplies only a brand name reaches their brand in under 30
  seconds.
- **SC-003**: 100% of the material present in the review at the moment of completion
  is present and resolvable in the brand, on every supported storage backend. Silent
  loss is zero.
- **SC-004**: 0 brand values reach confirmed status without an explicit per-value
  acceptance or edit recorded during the flow, and 0 values reach official status at
  all.
- **SC-005**: 0 Brand Kit adoptions, guidelines, templates or design outputs are
  produced by onboarding.
- **SC-006**: Completing the flow produces exactly 1 brand, including under repeated
  submission, retry after a recoverable error, and re-entry into the flow.
- **SC-007**: Brands created with material and without it populate the same concepts
  through the same write authorities in 100% of comparisons.
- **SC-008**: A brand created by onboarding contains 0 inline brand-material
  payloads and 0 entries in the superseded inline asset stores.
- **SC-009**: A user who leaves onboarding at any step and returns in a later
  session, on any device, resumes at that step with 100% of their material and
  entries intact.
- **SC-010**: 100% of brands abandoned during onboarding are visible as unfinished
  in the user's brand list, and can be resumed or deleted from there.
- **SC-011**: Exactly 1 onboarding entry path exists in the product, 0 superseded
  onboarding screens remain in the codebase, and 100% of superseded onboarding URLs
  resolve to the surviving path.
- **SC-012**: A profile produced by the Build-with-AI prompt parses with 0 assisted
  calls, and 100% of its categorical answers resolve to controlled-vocabulary
  members or an explicit "Other".
- **SC-013**: 100% of categorical brand values written by onboarding are
  vocabulary members or an explicit "Other" — 0 are uncontrolled free text.
- **SC-014**: 0 processing messages are shown for work that is not being performed,
  and 0 percentages or fabricated step delays appear in the processing moment.
- **SC-015**: The processing moment is visible for at least one complete beat in
  100% of runs, including a name-only brand.
- **SC-016**: A lower-priority source overwrites a higher-priority one in 0 cases,
  including on re-run of understanding.
- **SC-017**: 0 occurrences of authority or provenance vocabulary appear in the
  onboarding interface.
- **SC-018**: Exact-duplicate logo uploads produce exactly 1 entry, and 0
  near-duplicate variants appear as separate logos.

## Explicit Non-Goals

- Setup V3 itself. Onboarding hands off to the brand's Setup page; the contract
  between them is the brand, not shared screens.
- Generating any deliverable: Brand Kit items, guidelines, templates, decks, social
  assets, designs.
- Editing a finished brand. Onboarding creates and completes; Setup edits.
- Fetching and analysing the supplied website's content. The address is captured;
  crawling it is a separate decision.
- A new classification service. Interpretation uses what exists.
- Importing from external design or storage platforms.
- Team, workspace or multi-user onboarding.
- Changes to the Library's own interface.
- Using the controlled vocabularies for filtering or recommendation. R1 makes the
  values usable; the surfaces that use them are separate features.
- Retroactive recovery of material lost by the superseded flow — on the
  authenticated path it was never stored, so there is nothing to recover.
- Automatic cleanup of abandoned brands. They are surfaced and deletable by their
  owner; timed reaping is a separate decision.

## Migration & Compatibility Expectations

- Brands created by the superseded flows keep working untouched. This feature
  performs no data migration, and pre-existing brands are treated as finished.
- Brands mid-onboarding under the three-step vocabulary resume at the first step
  rather than failing. The window is development-only; no production brand carries
  the old vocabulary.
- Superseded onboarding URLs redirect to the new entry point rather than 404.
- The return-destination contract used by the brand chooser is unchanged, so callers
  need no update.
- Both the local and the authenticated storage backends are first-class. A behaviour
  that only works on one is not done.

## Assumptions

- Onboarding requires an authenticated user; the local backend serves development
  and the authentication bypass.
- The brand's Setup page remains at its current address and remains the default
  destination after onboarding.
- Assisted understanding runs server-side through the existing proxy; no credential
  reaches the browser.
- The Build-with-AI helper runs in the user's own AI tool. The product supplies the
  prompt and parses the answer; it does not call that tool.
- The trained image classifier stays opt-in and disabled by default; deterministic
  interpretation is the shipping behaviour.
- Brand material size limits are those stated in FR-051, which are stricter than the
  Library's own.
- "Business details" at onboarding means only what the user actually supplies — what
  the business offers, who it serves, its industry, and its public links.
- Context capture at onboarding is limited to durable observations that improve
  later suggestions; it is additive and never user-blocking.

## Resolved Decisions

Recorded because each shaped the requirements above and should not be relitigated
at plan time without an explicit amendment.

### Decided 2026-08-13 (original)

- **When the brand record comes into existence** — *brand-first*. Created at the
  naming step; every subsequent step writes to it through the Foundation's
  authorities. Chosen over a local draft because a draft would mean a second staging
  store for brand material, which Principle II forbids, and because resume then
  works across sessions and devices for free. The cost — abandoned empty brands — is
  accepted and paid for by FR-009 and SC-010.
- **The grain of confirmation** — *per value*. An explicit accept or a user edit
  confirms that one value; viewing it does not; anything untouched stays Suggested;
  a bulk affordance is permitted only as a loop over the same per-value act; nothing
  reaches Official during onboarding. Recorded as FR-025 and FR-025a–d.
- **Constitution vocabulary stays as written** in the specification — Brand Library,
  logo-system references, Core authority and provenance, Business Info and Context.
  FR-070 governs the *interface*, not this document.
- **The authenticated asset-loss defect stays folded into this feature** — closed by
  FR-026 and FR-031.

### Decided 2026-08-14 (during implementation)

- **No undo on a confirmation.** `demoteCoreValue` floors at `confirmed` by 001's
  design — un-adopting is not un-deciding — so a confirmation cannot be walked back
  through the canonical ops. Rather than ship a control that silently does nothing,
  changing your mind is an edit. Carried into R1 unchanged.
- **Persistence sentinels.** A name-only brand cannot persist an absent primary
  colour or font family, because the column is NOT NULL and the canonical schema
  requires a valid hex and a non-empty family. It receives a documented neutral
  recorded below the canonical projection, excluded from every AI prompt, never
  rendered as a chosen value, and retired permanently by the first real write.
  Carried into R1 unchanged.

### Decided 2026-08-14 (revision R1)

- **Old interface, V3 architecture.** The retired flow's interface is R1's visual
  and interaction foundation; the V3 write pipeline is kept in full. Chosen over
  continuing with the interface shipped on 2026-08-14 because that interface, while
  constitutionally correct, is not the experience the product wants, and over a
  third from-scratch design because Principle IX prefers evolving a proven surface.
  Recorded as FR-062 and FR-072.
- **No up-front self-classification.** The user is never asked whether they have a
  brand or are starting new. Recorded as FR-002. This retires the branch model from
  the original spec's FR-002, FR-010 and FR-015, and moves starting suggestions into
  the review's Colors and Fonts sections where the absence of evidence is already
  visible.
- **Adaptive understanding.** A recognisable structured brief is parsed
  deterministically with no assisted call; free-form prose is structured by assisted
  understanding; whatever is still meaningfully missing is asked progressively in
  the review, as selections for categorical concepts. Chosen over always calling
  assisted understanding (wasteful and slower on the path the product actively
  promotes) and over never calling it (which would make a freely-typed paragraph
  yield markedly less than the same content pasted from an AI tool). Recorded as
  FR-052 through FR-055.
- **Controlled vocabularies for categorical brand facts.** Industry, style,
  personality, tone and values are drawn from closed lists so they can drive
  filtering and recommendation later; "Other" is permitted only when nothing fits,
  and preserves the user's wording. Recorded as FR-047, FR-054, FR-068 and SC-013.
- **The processing moment is real work, with a floor.** Always shown, always on the
  9-dot symbol, always describing work actually happening, with one minimum beat of
  approximately 1.2 seconds so it never flashes past, and no percentage, no
  fabricated delays, no generic AI effects. Recorded as FR-057 through FR-061.
- **Source priority is a pipeline property, not a UI convention.** User choice >
  uploaded evidence > structured brief > AI suggestion, enforced on every write and
  on re-run. Recorded as FR-056 and SC-016.
- **Industry and slogan live in Business Info, not Core.** They are facts about the
  business rather than Brand Core DNA, so they carry no authority sidecar: an edit
  saves them and there is nothing to confirm. The review does not explain this,
  because FR-070 forbids exposing the model. `positioning.category` remains a
  distinct Core concept — the market category a brand competes in — and is not a
  second home for industry.

## Open Decision — requires owner approval before implementation

- **The visual-style vocabulary.** The requested style options include Modern,
  Classic, Editorial, Brutalist and Futuristic. The Foundation's `StyleDescriptor`
  is a closed union of eight members — minimal, bold, elegant, playful, technical,
  organic, luxury, retro — so five of the requested options cannot currently be
  stored. The change needed is additive only: new members on one type and one zod
  enum. `visualStyle.descriptors` has **no product consumers today** (the type, the
  schema, the Core path registry and one test fixture are its only references), so
  the blast radius is nil and no migration is implied. The alternative is to
  constrain onboarding's style list to the existing eight, which would drop five
  options the revision explicitly asked for. **Recommendation: widen the union.**
  This is the only Foundation change R1 requires, and it is not started without
  approval.
