# Page population — read back from Figma

**File:** https://www.figma.com/design/ZTR7jwR1cvjYvs0N9kuHCX
**Read back:** 2026-09-04, in the same session as the work it describes.

> This document is written ONLY from a live read-back, never from what a build
> reported. Two artifacts were once recorded here as verified and later found to
> be absent, so "the run said it created it" is not evidence that it is there.

| Page | Direct | Deep | Instances | Detached | State |
|---|---|---|---|---|---|
| 00 — Cover & Usage | 0 | — | — | — | empty |
| 01 — Foundations | 1 | 314 | 0 | — | tokens board |
| 02 — Icons | 7 | 16 | 0 | — | 7 icon components |
| 03 — Components | 20 | 340 | 0 | — | 15 sets + 5 components |
| **04 — Patterns & Navigation** | **14** | **324** | **10** | **0** | **complete** |
| **10 — Setup** | **1** | **613** | **105** | **0** | **the pilot screen, built** |
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
**Installed walker:** 17,402 bytes, matching `scripts/figma/.plans/_walker.meta.json`.

---

## Page 04 — the product pattern layer

14 patterns: **11 plain components + 3 component sets** carrying real variant
properties. 324 nodes. **10 instances, 0 detached, 0 unresolved.**

| Pattern | Type | Size | Variant properties |
|---|---|---|---|
| `pattern/workspace-topbar` | COMPONENT | 1440 × 73 | — |
| `pattern/segmented-nav` | COMPONENT | 376 × 41 | — |
| `pattern/section-rail` | COMPONENT | 256 × 356 | — |
| `pattern/rail-row` | COMPONENT_SET | 1400 × 131 | `state` |
| `pattern/setup-section` | COMPONENT_SET | 1400 × 466 | `width` |
| `pattern/section-add` | COMPONENT | 30 × 30 | — |
| `pattern/brand-field` | COMPONENT | 510 × 65 | — |
| `pattern/logo-tile` | COMPONENT | 130 × 130 | — |
| `pattern/color-swatch` | COMPONENT_SET | 1400 × 479 | `role`, `state` |
| `pattern/colors-group` | COMPONENT | 1044 × 193 | — |
| `pattern/type-specimen-col` | COMPONENT | 408 × 133 | — |
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
| 2 | `pattern/setup-section[width=narrow]`'s border is `color(srgb …)`, a modern CSS colour function the walker cannot parse, so it paints black. | pipeline defect |
| 3 | `pattern/preview-card/img` loses its `max-width`: Figma allows min/max size only inside an auto-layout context. Recorded, non-fatal. | Figma limitation |
| 4 | `pattern/icon-tile` renders an empty tile — the product draws its glyph with an icon FONT, which has no geometry to capture. | known limitation |
| 5 | `setup-section` embeds `brand-field` inline rather than instancing it; the containment is not declared yet. | modelling gap |

---

## Page 10 — the Setup pilot

`Setup — Desktop 1440 — Light`, node `101:2`, a 1440 × 3093 FRAME. 613 nodes,
**105 instances, 0 detached, 0 unresolved**, 176 fills bound to variables.

| Component | Instances |
|---|---|
| `pattern/icon-tile` | 60 |
| `pattern/section-add` | 11 |
| `pattern/rail-row` | 7 |
| `pattern/about-card` | 7 |
| `pattern/type-specimen-col` | 6 |
| `pattern/color-swatch` | 4 |
| `pattern/logo-tile` | 3 |
| `pattern/brand-field` | 2 |
| `pattern/colors-group` | 2 |
| `pattern/workspace-topbar` · `pattern/segmented-nav` · `pattern/section-rail` | 1 each |

185 nodes are the screen's own — the shell, the board, the board head and the
seven section containers. Each is single-use structural grouping with no
independent meaning, which is what the composition map §2 says should stay a
raw frame.

The full 18-item gate result is in `SETUP-PILOT-GATE.md`: 13 pass, 3 partial,
2 not started.
