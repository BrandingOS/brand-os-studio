# Page population — read back from Figma

**File:** https://www.figma.com/design/ZTR7jwR1cvjYvs0N9kuHCX
**Read back:** 2026-09-04, after the parity round, in the same session as the
work it describes.

> This document is written ONLY from a live read-back, never from what a build
> reported. Two artifacts were once recorded here as verified and later found to
> be absent, so "the run said it created it" is not evidence that it is there.

| Page | Direct | Deep | Instances | Detached | State |
|---|---|---|---|---|---|
| 00 — Cover & Usage | 0 | — | — | — | empty |
| 01 — Foundations | 1 | 314 | 0 | — | tokens board |
| 02 — Icons | 8 | 65 | 7 | 0 | 7 icon components |
| 03 — Components | 60 | 380 | 0 | — | 15 sets + 5 components + 40 labels |
| **04 — Patterns & Navigation** | **14** | **387** | **10** | **0** | **complete** |
| **10 — Setup** | **1** | **876** | **133** | **0** | **the pilot screen, built** |
| 11 — Brand Kit | 0 | — | — | — | not started |
| 12 — Brand Kit Editors | 0 | — | — | — | not started |
| 13 — Design | 0 | — | — | — | not started |
| 90 — Component State Matrix | 0 | — | — | — | not started |
| 91 — Responsive & RTL Tests | 0 | — | — | — | not started |
| 98 — Visual Parity | 1 | 721 | — | — | the labelled reference capture |
| 99 — QA, Losses & Generation Report | 0 | — | — | — | not started |

**Variables:** `BrandingOS` — Light + Dark, 31 colour variables ·
`Shape & Space` — 1 mode, 15 floats.
**Styles:** 4 text, 4 effect, 0 paint.
**Installed walker:** 21,576 bytes, matching `scripts/figma/.plans/_walker.meta.json`.

---

## Page 04 — the product pattern layer

14 patterns: **9 plain components + 5 component sets** carrying real variant
properties. 387 nodes. **10 instances, 0 detached, 0 unresolved.**

| Pattern | Type | Size | Variant properties |
|---|---|---|---|
| `pattern/workspace-topbar` | COMPONENT | 1440 × 73 | — |
| `pattern/segmented-nav` | COMPONENT | 376 × 41 | — |
| `pattern/section-rail` | COMPONENT | 256 × 472 | — |
| `pattern/rail-row` | COMPONENT_SET | 1400 × 131 | `state` |
| `pattern/setup-section` | COMPONENT_SET | 1400 × 466 | `width` |
| `pattern/section-add` | COMPONENT | 30 × 30 | — |
| `pattern/brand-field` | COMPONENT | 510 × 63 | — |
| `pattern/logo-tile` | COMPONENT_SET | 1400 × 210 | `state` |
| `pattern/color-swatch` | COMPONENT_SET | 1400 × 479 | `role`, `state` |
| `pattern/colors-group` | COMPONENT | 1044 × 193 | — *(library only — see below)* |
| `pattern/type-specimen-col` | COMPONENT_SET | 1400 × 236 | `role` |
| `pattern/icon-tile` | COMPONENT | 86 × 86 | — |
| `pattern/about-card` | COMPONENT | 514 × 76 | — |
| `pattern/preview-card` | COMPONENT | 56 × 64 | — |

### Composition, verified

| Container | Instances of | Count |
|---|---|---|
| `pattern/section-rail` | `pattern/rail-row` | 7 |
| `pattern/colors-group` | `pattern/color-swatch` | 2 |
| `pattern/workspace-topbar` | `pattern/segmented-nav` | 1 |

Each of the seven rail rows carries its own variant and its own words —
Brand · Logo · Color · Typography · Iconography · Brand Strategy (all
`state=filled`) and Website (`state=empty`) — rather than seven copies of the
component's default.

**Token binding:** 65 fills bound to variables, 88 literal. The literals are
alpha-composited values (`rgba(255,255,255,0.96)` over the brand colour, shadow
colours) that no `--ds-*` token defines. That ratio is a fact to improve, not a
target to hit by binding things to the wrong token.

### Verified visually
- The top bar reads correctly end to end: brand switcher, five-item nav with the
  sliding pill, "Rebrand with AI", "Brand Identity →", theme toggle.
- The rail reads correctly: eyebrow, brand name in Instrument Serif, the
  completion meter at 6/7, and seven distinct rows with their check marks.

---

## Known gaps on page 04

| # | Gap | Kind |
|---|---|---|
| 1 | Every rail row shows the SAME thumbnail (the typography "Aa" glyph). The product draws a different icon per section. Needs an INSTANCE_SWAP property; text overrides cannot carry artwork. | modelling gap |
| 2 | `pattern/preview-card/img` loses its `max-width`: Figma allows min/max size only inside an auto-layout context. Recorded, non-fatal. | Figma limitation |
| 3 | `pattern/icon-tile` renders an empty tile — the product draws its glyph with an icon FONT, which has no geometry to capture. | known limitation |
| 4 | `setup-section` embeds `brand-field` inline rather than instancing it; the containment is not declared yet. | modelling gap |
| 5 | `pattern/colors-group` is in the library but the Setup screen does NOT instance it, because Core holds 2 swatches and Neutral 32 and a component cannot vary its child count. Deliberate — see the contract. | intended architecture |

Closed this round: the `color(srgb …)` border that painted black (the parser
now handles the function), and the missing per-row variants (see below).

---

## Page 10 — the Setup pilot

`Setup — Desktop 1440 — Light`, node `130:2`, a 1440 × 3093 FRAME — the SAME
height as the product at the same width. 876 nodes, **133 instances,
0 detached, 0 unresolved.**

| Component | Variant | Instances |
|---|---|---|
| `pattern/icon-tile` | — | 60 |
| `pattern/color-swatch` | `role=plain, state=default` | 33 |
| `pattern/color-swatch` | `role=primary, state=default` | 1 |
| `pattern/section-add` | — | 11 |
| `pattern/about-card` | — | 7 |
| `pattern/rail-row` | `state=filled` | 6 |
| `pattern/rail-row` | `state=empty` | 1 |
| `pattern/type-specimen-col` | `role=identity` / `weights` / `examples` | 2 each |
| `pattern/logo-tile` | `state=primary` / `dark` / `empty` | 1 each |
| `pattern/brand-field` | — | 2 |
| `pattern/workspace-topbar` · `pattern/segmented-nav` · `pattern/section-rail` | — | 1 each |

The screen's own nodes are the shell, the board, the board head and the seven
section containers. Each is single-use structural grouping with no independent
meaning, which is what the composition map §2 says should stay a raw frame.

### Verified against the running product

Section order and width match exactly: Brand · Logo · Color · Typography ·
Iconography · Brand Strategy at 1044, Website at 514. Screenshots compared at
1440 (`scripts/figma/analyze/shot.mjs` writes the reference).

What now reads correctly and did not before:

- **Colour.** 34 swatches, each its own colour and its own width — the primary
  at 626 against a ramp step's 158 — overlapping by the negative item spacing
  the product draws with negative margins.
- **Typography.** Three distinct columns per row: the 52px specimen, the weight
  ladder and the example lines, all at their own sizes. Previously all three
  were one component and the weight and example columns inherited the
  specimen's 52px, clipping "The professional standard".
- **The nav pill** sits behind the active tab instead of in front of it as an
  empty 63px box that pushed every tab along.
- **The rail** is 256 × 472 with six filled rows and one empty, each carrying
  its own words.

### What still differs, honestly

| Difference | Why |
|---|---|
| Icon tiles are empty | The product draws each glyph with an icon FONT (`<i class="fi fi-rr-palette">`). A font glyph has no DOM geometry to capture. Needs the icon set imported as components. |
| Every rail row shows the same "Aa" thumbnail | Needs an INSTANCE_SWAP property with six icon components. |
| The "Add logo variant" tile has no dashed outline | Drawn by CSS on an `<svg class="logo-tile-dash"><rect></rect></svg>` that carries no geometry of its own. |

The full 18-item gate result is in `SETUP-PILOT-GATE.md`.
