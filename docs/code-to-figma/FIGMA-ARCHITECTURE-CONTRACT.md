# Figma Architecture Contract

**File:** https://www.figma.com/design/ZTR7jwR1cvjYvs0N9kuHCX
**Written:** 2026-09-04, from a live audit of the document and the repository.
**Status:** binding. Where it disagrees with an earlier document, this wins.

Every claim below is tagged with what kind of claim it is:

| tag | meaning |
|---|---|
| **[SHIP]** | shipping truth — measured from the running product or its source |
| **[ARCH]** | intended product architecture |
| **[DSR]** | design-system rule this contract imposes |
| **[DEFECT]** | current implementation defect (product **or** this pipeline) |
| **[LIMIT]** | Figma or transport limitation |
| **[PROP]** | proposed improvement, never mixed into parity |
| **[OPEN]** | unresolved decision needing the owner |

---

## 0. Current state — audited, not reported

The tracking documents were behind and in two places **wrong**. The table below
is the audit **as it stood when this contract was written**; it is a record of
why the plan changed, not a current ledger. The current ledger is
`PAGE-POPULATION.md`, which is rewritten from a live read-back every round.

| Page | Direct children | Deep nodes | Instances |
|---|---|---|---|
| 00 — Cover & Usage | 0 | 0 | 0 |
| 01 — Foundations | 1 frame | 314 | 0 |
| 02 — Icons | 7 components | 16 | **0** |
| 03 — Components | 20 (15 sets + 5 components) | 340 | **0** |
| 04, 10–13, 90–99 | 0 except 10 | — | 0 |
| 10 — Setup | 1 frame (`35:2`, the capture) | 721 | 0 |

Variables: `BrandingOS` (31 colours, **Light + Dark** modes), `Shape & Space`
(15 floats, 1 mode). Styles: 4 text, 4 effect. Walker installed: 11,175 bytes.

### Three findings that change the plan

**[DEFECT — this pipeline] The document contains ZERO instances.** Nothing
consumes the system. Twenty component sets and seven icon components exist and
are used by nothing. This is precisely the "component zoo with no relationship to
product screens" failure. **The owner's hypothesis is correct and is adopted.**

**[DEFECT — this pipeline] Two artifacts I previously reported as verified are
gone.** The icons specimen board (7 connected instances, which I read back as
`allConnected: true`) and the 40 page-03 labels are both absent. I do not know
what removed them, and I will not guess. What this proves is a process failure of
mine: **I verified once and then reported the state as durable.** From now on the
page-population ledger is written only from a read-back taken in the same cycle
as the claim, and every generation cycle ends with an assertion pass.

**[DEFECT — this pipeline] My deduplication deleted semantic states.**
`visualFingerprint` collapsed `DsSwitch/DsCheckbox/DsRadio` `disabled` into
`enabled` because the CSS renders them identically. That is the owner's case 2 —
*a semantic state with no visual difference* — and it must never be collapsed
silently. The rule is corrected in §7. The underlying product issue is a real
accessibility defect and is recorded in §11, not fixed in the parity artifact.

---

## 1. Layer model

The owner proposed: Foundations → Icons → Components → Product Patterns → Final
Screens → State Specifications → Prototype Flows → QA.

**Adopted with one change.** [ARCH]

**"State Specifications" is not an architectural layer — it is a documentation
surface.** States are *owned* at three levels (§6), and each is already
represented where it lives: component states as variants, pattern states as
pattern variants or prototype reactions, screen states as sibling screen frames.
A separate layer would duplicate all three and immediately drift. Page
`90 — Component State Matrix` remains, as a **matrix that documents** what exists
elsewhere — never as the home of a state.

Everything else in the proposed model is confirmed by evidence and adopted.

---

## 2. What belongs where

### Foundations (page 01) [DSR]
Token-level truth only: colour variables with Light/Dark modes, numeric
variables, text styles, effect styles, stroke conventions, breakpoints with real
layout grids, accessibility measurements. **No product UI.** A thing belongs here
only if it is a *value* or a *measurement of values*.

### Icons (page 02) [DSR]
One component per glyph, authored at its native 24-unit viewBox. Never a variant
per icon — icons are swapped through an **instance-swap property**, not chosen
from a variant list. Icons are consumed by instance everywhere else.

### Components (page 03) [DSR]
A Figma component exists only when at least one is true:

- it maps to a reusable source component (`src/shared/ds/*`);
- it appears repeatedly across the scoped screens;
- it carries a stable semantic role;
- its visual behaviour is centrally maintained;
- it exposes meaningful states or properties;
- changing it centrally *should* update multiple uses.

A wrapper stays a plain frame when it is unique page layout, a one-off
composition, purely structural grouping, or not independently meaningful.

### Patterns (page 04) [ARCH]
A **repeated composition of components** that carries product-level behaviour.
Promotion requires recorded evidence (§4). Patterns are derived from the screens,
never invented in advance.

### Final screens (pages 10–13) [ARCH]
A product screen is a **named top-level Frame** inside the right Figma page —
a Figma Page is an organisational container, not a screen. Screens are assembled
from component and pattern **instances** plus legitimate page-specific frames.

### QA surfaces (90, 91, 98, 99) [ARCH]
Documentation and evidence. 98 holds Code-to-Canvas **references**; 99 holds
losses, shipping defects and generation reports.

---

## 3. Component modelling rules [DSR]

Choose the **simplest model that preserves the design contract**.

| Situation | Model |
|---|---|
| No genuine variant axis | a single main COMPONENT |
| Meaningful structural/visual alternatives | variants |
| Optional element visibility | BOOLEAN property |
| Editable label or copy | TEXT property |
| Swappable icon or nested component | INSTANCE_SWAP property |
| Theme where only token *values* change | **variable modes, never a variant** |
| Theme where the node *tree* differs | a variant, justified in the manifest |

Learned the hard way, both now enforced by the walker and by assertions:

- **[LIMIT]** A `COMPONENT_SET` requires every variant to carry a `prop=value`
  name. One variant with no axes is not a set — it is a plain `COMPONENT`.
  Building it as a set yields "component set has existing errors" and every later
  property read throws.
- **[LIMIT]** A text-only or vector-only root must be wrapped in a component.
  `build()` otherwise returns a bare TEXT node, which looks correct on canvas and
  cannot be instanced.
- **[DSR]** No blind cartesian product. `DsButton` went 76 declared cells → 38
  (arrow became a BOOLEAN property) → 28 (measured dedup of *truly* redundant
  cells). Every collapse is recorded.

### 3a. What may be a component at all [DSR — added after the parity round]

- **A container whose CHILD COUNT is data is not a component; its repeated unit
  is.** Core Colors holds 2 swatches and Neutral Colors holds 32, and a
  component's children are fixed — so instancing the group painted the 32-step
  neutral ramp as a copy of Core's two. The swatch is the component; the row
  around it is layout. `pattern/colors-group` stays in the library as the Core
  row it was measured from, and the screen does not instance it.
- **Shared markup is not shared meaning.** The three `.type-col` columns share a
  base class and nothing else: the identity column sets its second line in the
  specimen face at 52px, the weight and example columns set theirs at 16. Built
  as one component the other two inherited the specimen's size and their text
  was drawn at 52px and clipped. Three columns, three variants — the class name
  was not evidence.

### 3b. CSS the converter must TRANSLATE, not copy [LIMIT]

Each of these cost a visibly wrong screen before it was found. They are properties
whose Figma meaning differs from their CSS meaning, so reading the value and
setting the same-named field produces something that looks plausible and is wrong.

| CSS | Figma | What went wrong without it |
|---|---|---|
| `flex-wrap: wrap` | `layoutWrap` | The board collapsed into one narrow overlapping column |
| `width:100%` inside a WRAP row | **FIXED**, not FILL | Several FILL children share a line in Figma, so the seven full-width sections came out 76px wide side by side |
| `flex: 1` on the PRIMARY axis of a hugging parent | leave it hugging | The rail's list said `height: fill` inside a hugging column and Figma squashed it to 356 instead of 483, clipping two rows |
| uniform negative `margin-left` between siblings | negative `itemSpacing` | The 32-step neutral ramp laid out 5,056px wide instead of overlapping into 1,044 |
| `position: absolute` child of a flex row | `layoutPositioning = 'ABSOLUTE'` | The nav's sliding pill joined the flow as a 63px empty box and pushed every tab along in front of it |
| `order` | sort the children | Website painted 6th instead of last |
| `text-transform` | `textCase` | Eyebrows lost their capitals |
| `color(srgb …)` | parse it | Unparsed it fell back to black and painted a black border |
| a form control's value | read `value \|\| placeholder` | Every input was empty |
- **[LIMIT]** An INSTANCE may override its own `fills` and its own SIZE without
  detaching, and some patterns need both: a colour swatch's colour and its width
  ARE the content. Those overrides are carried only where they DIFFER from the
  component's own measurement, so an ordinary instance still carries neither.
- **[LIMIT]** A variant override cannot be applied during the build phase — the
  variants are still loose components with no variant properties, so
  `setProperties` throws and the instance silently keeps whichever variant was
  indexed first (alphabetically). The variant sid is derivable, so the right
  component is resolved directly and `setProperties` runs only once the set
  exists. Before this fix the section rail was seven copies of the EMPTY row.

---

## 4. Pattern inventory — derived, with evidence

Promotion evidence gathered 2026-09-04:

| Candidate | Evidence | Verdict |
|---|---|---|
| **WorkspaceShell** | **42 source consumers**, including all four scoped screens (setup, brand-kit, design, guideline). Top nav, segmented nav, brand switcher, theme control, right actions. | **PROMOTE** [SHIP] |
| **SetupSidebar** | One consumer today, but it is a completion-tracking nav rail with 8 rows ×状态, repeated *within* the screen, and `BrandKitSidebar` is structurally the same idea. | **PROMOTE as `pattern/section-rail`**, shape confirmed against Brand Kit before reuse [ARCH] |
| **Section board card** (`section-header` + `section-body` + `section-actions` + `section-add`) | Repeats once per Setup section — **8 occurrences on one screen** | **PROMOTE** [SHIP] |
| **about-card** | 7 Brand Strategy cards on Setup | **PROMOTE** [SHIP] |
| **brand-field** (label + input + hint) | Repeats in Brand section; wraps `DsInput` | **PROMOTE** [SHIP] |
| Modal shell | `DsModal` is already a DS component with 6 Setup consumers | **Component, not Pattern** — it is a DS primitive |
| Generic "card", "list", "toolbar" | No evidence | **REJECT — do not create** |

**[ARCH] The naive assumption was wrong, and this is the most important finding
of the audit.** Setup is *not* mostly built from `src/shared/ds`. It imports only
`DsButton`(7) `DsModal`(6) `DsTextArea`(5) `DsInput`(3) `DsEyebrow`(2)
`BrandMark`(2) `DsTabBar` `DsSkeleton` `DsProgress` `DsBadge`. The **majority**
of Setup's surface is its own vocabulary — `about-card`, `brand-field`,
`board-head`, `section-*`. A plan that assembled Setup purely from the 20 DS
components would have failed. The Pattern layer is where Setup actually lives.

---

## 5. Code-to-Canvas contract [ARCH]

**Is:** visual truth, content and wrapping reference, route/state capture, a
source for discovering repeated compositions and missing components, and the
baseline for visual comparison.

**Is never:** a design-system component, a connected instance, a Pattern, a final
screen, or a valid semantic hierarchy.

Every capture is labelled **`REFERENCE — Code Capture — Not Final`** and lives on
page 98. A capture is deleted only after its FINAL replacement is verified.

**[DEFECT — mine] I previously called capture repair "mechanical".** It is not.
Font rebinding and mark restoration are mechanical; *semantic mapping is not* and
must be proven per subtree. Nearest-neighbour visual replacement is forbidden — a
subtree becomes an instance only on semantic evidence.

---

## 6. Where a state lives [ARCH]

| Level | States | Represented as |
|---|---|---|
| **Component** | default, hover, pressed, focus-visible, disabled, selected/checked, validation error | variants on the component |
| **Pattern** | trigger closed/open, rail expanded/collapsed, drawer open, editor clean/dirty/saving, tab selection | pattern variants, or prototype reactions |
| **Screen** | empty, populated, loading, error, success, permission-restricted, first-run, partial completion | **sibling screen frames**, never one giant set |

**[DSR]** A `DsMenu` correctly has no `closed` variant — closed means *not
rendered*. But the **trigger + menu Pattern** must still carry closed/open,
because the product exposes that behaviour. The same reasoning governs rails,
drawers, popovers and dialogs.

---

## 7. Semantic states must survive [DSR — corrects a defect of mine]

Visual identity does **not** prove semantic identity. For every apparent
duplicate, classify:

1. **truly redundant** — may be collapsed silently;
2. **semantic state with no visual difference** — **keep the variant**, record the
   missing visual distinction as a product defect;
3. **implementation defect** — keep, record;
4. **state that belongs at another level** — move it, do not delete it.

Only case 1 collapses. `dedupeVariants` is corrected to take a
`semanticStates: string[]` allow-list from the manifest; any axis value in that
list is never collapsed, only *reported* as visually identical.

**Concretely:** `disabled` returns to `DsSwitch`, `DsCheckbox`, `DsRadio`.

---

## 8. Screen composition [DSR]

The target is **not** "every layer is an instance". It is:

- 100% of *known reusable* occurrences resolve to the right component or Pattern;
- **zero** detached instances of known reusable UI;
- zero unjustified duplicated reusable structures;
- every legitimate raw subtree classified and justified;
- every unresolved reusable mapping visible, and **blocking** that screen.

Raw frames and text are correct and expected for top-level screen frames, page
layout, section containers, unique content, and documented tool limitations.

---

## 9. Responsive, theme, direction [ARCH]

- **Theme:** Light/Dark through **variable modes**. A variant only where the tree
  or asset genuinely differs.
- **Responsive:** separate screen frames at evidenced viewports. **[SHIP]** The
  product's real breakpoints are hand-written CSS — 480/520/560/640/680/720/860/
  880/900/1024/1080/1100/1180 — *not* Tailwind's defaults (the config overrides
  only the container's `2xl`). Capture at 1440 and 390; Cycle 10 adds 1100/900/
  720. **Never scale a desktop frame to imitate mobile.**
- **[LIMIT]** Figma Auto Layout does not reproduce CSS breakpoints. Structural
  breakpoint changes are captured and modelled explicitly.
- **[SHIP] The product has NO RTL implementation.** 14 physical directional
  declarations, zero logical properties, zero `dir=rtl` anywhere in `src/`. So
  page 91 holds **RTL readiness tests**, explicitly constructed, never presented
  as captured parity. Arabic glyph coverage is measured, not assumed.

---

## 10. Generated vs designer-owned [ARCH]

- Generated nodes carry `brandingos:sid` + `gen` in shared plugin data.
- **The renderer never deletes a node it cannot prove it created.** Deletion
  requires a `sid` this renderer wrote.
- A designer may opt any subtree out with `brandingos:owner = designer`.
- Overwrites are diffed and reported, never silent.
- Untagged nodes inside generated pages are preserved and reported.

---

## 11. Parity vs improvement [ARCH]

Two tracks, never mixed. The parity screen represents **what ships today**.

Shipping defects found so far, recorded — **not** fixed in parity:

| # | Defect | Evidence | Kind |
|---|---|---|---|
| 1 | `disabled` toggles are visually identical to enabled | `Toggle.tsx` sets the attribute; **no CSS styles it** | [DEFECT — product, a11y] |
| 2 | Muted text on card = **3.59:1** | computed from Light-mode variables, WCAG formula | [DEFECT — product, a11y] |
| 3 | Warning message = **4.49:1**, misses AA by 0.01 | same | [DEFECT — product, a11y] |
| 4 | Primary button shadows are hardcoded, not tokenised | 6 unbound literals in the plan | [DEFECT — product] |
| 5 | `DsToast` has 2 tones, `DsBanner` has 4 | differing prop unions | [OPEN] — deliberate or drift? |

---

## 12. Honest prototypes [DSR]

Prototype reactions may represent navigation, overlays, menus, drawers, dialogs
and deterministic transitions. They may **never** be claimed to reproduce network
behaviour, application state, arbitrary user data, backend permissions, full
responsive browser behaviour, or editor logic. Those are documented as state
frames and flows.

---

## 13. Where I disagree with the instruction

| Instruction | Contradictory evidence | My interpretation | Impact |
|---|---|---|---|
| "State Specifications" as a layer | States are owned at three levels (§6) and already live there; page 90 exists | Keep 90 as a documentation matrix, not a layer | None material |
| "Place the reference on 98 *or* leave it if moving disrupts node IDs" | Figma node ids are document-scoped and **survive a cross-page move** — verified before acting | Move it to 98; no id churn | Cleaner separation |
| Implicit: Setup assembles from the DS components | Setup imports only 10 DS symbols; most of its surface is feature-local | Setup assembles from **Patterns** built from its own repeated compositions, plus DS instances where genuinely used | Large — changes the whole pilot |

---

## 14. Definition of done for a screen

A screen is done when: REFERENCE and FINAL are separate and labelled; FINAL is
not the capture tree; a semantic composition map exists; every known reusable
occurrence is an instance; zero detached instances; every raw subtree justified;
properties are usable without deep overrides; variants are semantic; no semantic
state was deleted; Light/Dark resolve through variables; auto-layout resizes
correctly; interactions are honest; desktop/mobile are not scaled; shipping
defects are documented not fixed; visual differences are explained; regeneration
preserves designer work; and the tracking documents agree with a **same-cycle**
read-back.
