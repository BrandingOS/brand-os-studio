# Setup — Semantic Composition Map

**Route:** `/b/:slug/setup` · **Capture:** `http://localhost:8082/b/brandingos/setup`
1440 × 3020, light, BrandingOS fixture.
**Evidence:** `scripts/figma/.captures/outline-setup.json` — 509 nodes carrying a
semantic class, 96 distinct signatures, produced by
`scripts/figma/analyze/outline.mjs`. Every count below is measured, not read
off the source.

---

## 0. The finding that reshapes the pilot

The plan was to assemble Setup from the twenty components on page 03. **Measured
against the rendered screen, that plan fails.** Only two DS signatures appear:

| DS signature | occurrences | where |
|---|---|---|
| `ds-eyebrow` | 8 | section headers + the rail heading |
| `ds-btn` | 2 | inside `upload-modal-foot`, a **closed** modal |

So the visible Setup screen contains **eight** DS instances and no DS buttons at
all. The other 92 signatures are the Studio's own vocabulary.

Grepping for where that vocabulary is *defined* settles what it is:

| signature | defined in |
|---|---|
| `panel-item` | **`src/shared/styles/workspace.css`** (+ brand-kit, guideline) |
| `about-card` | **`src/shared/styles/workspace.css`** (+ onboarding-v4) |
| `brand-field` | **`src/shared/styles/workspace.css`** |
| `logo-tile` | **`src/shared/styles/workspace.css`** |
| `icon-tile` | **`src/shared/styles/workspace.css`** |
| `section-header` | **`src/shared/styles/workspace.css`** (+ brand-kit) |

Not one of them is Setup-local. `workspace.css` is 4,655 lines and ~782 rules of
**shared Studio chrome**, consumed by Setup, Brand Kit and Guideline alike.

**[ARCH] The product has two shared layers, and the Figma file must have two
too.** This is not an invention — CLAUDE.md already states it (DESIGN SYSTEM →
PRODUCT SYSTEM → FEATURE COMPONENTS) and already records the convergence plan in
`docs/ds-token-convergence.md`:

| Figma page | source of truth | what it holds |
|---|---|---|
| **03 — Components** | `src/shared/ds/*` | token-level primitives |
| **04 — Product Patterns** | `src/shared/styles/workspace.css` | Studio chrome vocabulary |

A Figma file that modelled only page 03 would describe about 8 of the 509 nodes
on this screen — roughly 1.6% — and every screen built on it would be raw
frames. **That is exactly the "component zoo with no relationship to product
screens" failure, arrived at from the opposite direction.**

---

## 1. Screen skeleton (measured)

```
Setup — Desktop 1440 — Light            1440 × 3020
│
├── pattern/workspace-topbar                        ← WorkspaceShell, 42 consumers
│   ├── skip-to-content            120 × 37   (a11y, visible on focus)
│   ├── brand-switcher             160 × 38
│   │   └── brand-switcher-trigger → mark + name
│   ├── pattern/segmented-nav      376 × 43
│   │   ├── segmented-nav-pill      63 × 33   (the sliding indicator)
│   │   └── segmented-nav-item ×5   60–84 × 33
│   ├── pill-btn ×2                146/137 × 38
│   └── theme-toggle                38 × 38
│
└── shell                          1440 × 3020
    ├── pattern/section-rail        256 × 483        ← SetupSidebar
    │   ├── panel-top → ds-eyebrow + panel-heading   222 × 44
    │   └── panel-list
    │       └── pattern/rail-row ×7                  234 × 52 (last 234 × 34)
    │           └── panel-item-body
    │               ├── panel-item-thumb  (×6 — one row has none)
    │               └── panel-item-meta → panel-item-name + panel-item-sub
    │                   └── status-chip → chip-default + chip-hover
    │
    └── board-wrap                 1124 × 3000
        ├── board-head             1044 × 34         ← raw, one-off
        │   └── board-meta → board-live-dot + label
        └── pattern/setup-section ×7
            ├── section-header  → ds-eyebrow + section-spec + section-actions
            └── section-body    → per-section content (§3)
```

Two overlays are **mounted but closed** at 1440 × 1200 and are not part of the
default state: `upload-modal-backdrop` and `preview-backdrop`. They become
separate screen frames (§5), which is also why `ds-btn` shows up in a screen
with no visible buttons.

---

## 2. Promotion decisions

Ranked by measured repetition. `sizes` is the count of distinct rendered boxes —
one distinct size across many occurrences is strong evidence of a fixed-size
component; many sizes means the thing hugs or fills and must be modelled that way.

| # | signature | n | sizes | verdict | reason |
|---|---|---|---|---|---|
| 1 | `icon-tile` | **60** | **1** | **component** `pattern/icon-tile` | 60 identical 24 × 24 boxes; contains `fi` glyph |
| 2 | `swatch` | **34** | 2 | **component** `pattern/color-swatch` | the palette unit; name + hex + copy affordance |
| 3 | `about-card` | 7 | **1** | **component** `pattern/about-card` | Brand Strategy answer; shared with onboarding-v4 |
| 4 | `panel-item` | 7 | 2 | **component** `pattern/rail-row` | house chrome, shared with Brand Kit + Guideline |
| 5 | `section` | 7 | **7** | **pattern** `pattern/setup-section` | seven distinct heights ⇒ **hug**, never fixed |
| 6 | `type-col` | 6 | 3 | **component** `pattern/type-specimen-col` | one per typeface role |
| 7 | `segmented-nav-item` | 5 | 5 | **component** inside the topbar | width hugs the label |
| 8 | `section-add` | 12 | 2 | **component** `pattern/section-add` | the `+` affordance, once per section + inline |
| 9 | `logo-tile` | 3 | 1 | **component** `pattern/logo-tile` | see the divergence in §6 |
| 10 | `preview-card` | 3 | 2 | **component** `pattern/preview-card` | |
| 11 | `brand-field` | 2 | 1 | **component** `pattern/brand-field` | label + input + optional hint |
| 12 | `colors-group` | 2 | 2 | **pattern** `pattern/colors-group` | title + wrapping swatch row |
| 13 | `pill-btn` | 2 | 2 | **component** inside the topbar | |
| 14 | `type-row` | 2 | 2 | **pattern** `pattern/type-specimen-row` | |

**Rejected — single-use structural frames (43 of the 92).** `shell`,
`board-wrap`, `board-head`, `about-grid`, `colors-stack`, `brand-fields`,
`type-grid`, `icons-marquee`, `icons-track`, `previews`, `logos`. Each appears
once, groups other things, and carries no independent meaning. **These stay raw
frames on the final screen and that is correct** — §8 of the contract.

**Deferred to the topbar pattern rather than promoted separately:**
`brand-switcher`, `brand-switcher-trigger`, `brand-switcher-mark`,
`brand-switcher-name`, `theme-toggle`, `segmented-nav-pill`. They exist only
inside `pattern/workspace-topbar` and are its internal structure.

---

## 3. Section-by-section body composition (measured)

| # | section | body | composed of |
|---|---|---|---|
| 1 | **Brand** — *Name · Slogan* | `brand-fields` | `pattern/brand-field` ×2 + `brand-field-hint` |
| 2 | **Logo** — *Primary · Variants* | `logos` | `pattern/logo-tile` ×3 (`logo-svg`, `logo-tile-name`, `logo-tile-actions` → `logo-tile-action` ×4) |
| 3 | **Color** — *Core · Accent · Grey* | `colors-stack` | `pattern/colors-group` ×2 → `colors-row` → `pattern/color-swatch` ×34, plus `cp-expand` ×2 and a `cp-popover` |
| 4 | **Typography** — *2 / 4* | `type-grid` | `pattern/type-specimen-row` ×2 → `type-col` ×6 (`type-name`, `type-glyphs` → `type-glyph` ×6, `type-list` ×4) |
| 5 | **Iconography** — *24 × 24px* | `icons-marquee` → `icons-track` | `pattern/icon-tile` ×60 → `fi` glyph |
| 6 | **Website** — *Add a reference link* | `section-collapsed-drop` | collapsed drop target; **514 wide — the board wraps** |
| 7 | **Brand Strategy** — *6 of 11 answered* | `about-grid` | `pattern/about-card` ×7 (`about-card-title` + `about-card-body`) |

Section 6 rendering at 514 px while its siblings render at 1044 px is the board's
own wrapping behaviour, not a mistake. In Figma it is a `WRAP` auto-layout with
the narrow section set to a fixed basis — modelled explicitly, because Figma wrap
does not reproduce a CSS grid's placement rules.

---

## 4. What each screen node resolves to

| class of node | count | resolves to |
|---|---|---|
| DS component instance | 8 | `ds/eyebrow` |
| Pattern instance | ~130 | the 14 promotions in §2 |
| Justified raw frame | 43 signatures | single-use structural containers (§2) |
| Leaf text / vector | balance | screen content — never a component |

**Zero** detached instances is the requirement. Anything in §2 that appears on
the screen as a raw frame is a gate failure, not a stylistic preference.

---

## 5. Setup's screen states

States belong to the screen, so each is a **sibling frame** on page 10, never a
variant of one giant component (contract §6).

| frame | evidence |
|---|---|
| `Setup — Desktop 1440 — Light` | the capture above; **the pilot** |
| `Setup — Desktop 1440 — Dark` | same tree, variable modes only |
| `Setup — Mobile 390` | separate capture; the board stops wrapping |
| `Setup — Upload modal open` | `upload-modal-backdrop` is already mounted |
| `Setup — Preview modal open` | `preview-backdrop` is already mounted |
| `Setup — Empty brand` | nudge visible; sections report nothing set |

The pilot ships the first frame and the structures the rest reuse. The remaining
frames are cheap once the patterns exist — which is the whole argument for
proving the architecture on one screen first.

---

## 6. Findings raised by this map

| # | finding | class |
|---|---|---|
| 1 | Setup uses `.logo-tile` from `workspace.css` while the DS ships `DsLogoTile` (`.ds-logo-tile`). Two implementations of one idea. | **[DEFECT — product]** record on page 99; model what ships |
| 2 | `.section-header` and `.panel-item` are defined in **both** `workspace.css` and `brand-kit.css`. Divergence risk between two screens that must look identical. | **[DEFECT — product]** |
| 3 | `status-chip` renders **both** `chip-default` and `chip-hover` simultaneously (7 of each) and cross-fades. In Figma this is one component with a `state` variant, not two stacked children. | **[LIMIT]** modelling note |
| 4 | `DsModal` and `DsTabBar` are consumed by Setup but are absent from the manifest and from Figma. | **justified component gap** — add |
| 5 | Setup imports 7 `DsButton` yet the default screen renders none; all live in closed modals. | **[SHIP]** — informs the modal state frames |

---

## 7. Build order for the pilot

1. `pattern/workspace-topbar` — highest leverage, 42 consumers, unblocks every later screen.
2. `pattern/section-rail` + `pattern/rail-row`.
3. `pattern/setup-section` + `pattern/section-add`.
4. Content patterns: `brand-field`, `logo-tile`, `colors-group` + `color-swatch`, `type-specimen-row` + `type-specimen-col`, `icon-tile`, `about-card`, `preview-card`.
5. Assemble `Setup — Desktop 1440 — Light` on page 10 from instances.
6. Read back and assert composition, then run the 18-item gate.
