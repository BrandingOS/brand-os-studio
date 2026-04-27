# PropertiesPanel — Phase 1 close-out spec

> **Status:** awaiting review. The current `EditorPropertiesPanel.tsx`
> implementation is incomplete (see §3 — Issue B feature gaps) and
> over-detailed (see §2 — Issue A density). This document specifies
> the layout that closes both gaps in one implementation pass.
>
> **Do not implement before review.** Approve, reject, or edit, then
> implement.

## 1. Mental model

The panel has three layers of disclosure:

1. **Header strip** — universal compact controls. Position / size /
   rotation / visibility / lock. One row, no labels, like Figma's
   property header. Always visible. ~28px tall.
2. **Primary controls** — the 3–5 most-used per-kind properties.
   Every layer kind has its own primary set. Always visible when a
   single layer is selected.
3. **Advanced** — everything else, behind a single
   `<details>`/accordion at the bottom labeled "More properties".
   Closed by default. Closes again when selection changes.

The mental model: most edits are
**color / size / position / text content**. Position and size are
faster to do by dragging the canvas, so the header strip's numeric
inputs exist but aren't featured. The primary section is what someone
clicks the panel for. Everything else lives behind a click.

## 2. Header strip (always shown, every layer kind)

Compact one-line row:

```
[X 80] [Y 360] [W 920] [H 240] [↻ 0]   👁 🔒
```

- `X / Y / W / H / ↻` — five tiny numeric inputs, no field labels
  except the single-character prefix. Editing any one updates the
  layer's transform.
- `👁` — visibility toggle. Filled icon when visible.
- `🔒` — lock toggle. Filled icon when locked.

Multi-select state: header is hidden, replace with the existing
"Select a layer to edit its properties." empty state.

## 3. Primary controls per layer kind

For each kind, list of always-visible primary controls (ordered top
to bottom). All ❗ items are NEW (currently missing from
`EditorPropertiesPanel.tsx` — closing Issue B).

### 3.1 Text layer

| # | Control | Type | Notes |
|---|---|---|---|
| 1 | Content | textarea | Already shipped. Resizable to 5 rows. |
| 2 | Font family ❗ | combobox | NEW. Phase 1: system-font shortlist. Phase 3: brand fonts via SlotRef. |
| 3 | Font size | number + slider | Already shipped (number). Add a slider companion for fast adjustment. |
| 4 | Color | ColorField | Already shipped. SlotRef handling redesigned — see §5. |
| 5 | Text align ❗ | toggle group | NEW. Left / center / right / justify. |

5 controls. The font family addition is the headline fix for
"no typography editing."

### 3.2 Shape — rectangle

| # | Control | Type | Notes |
|---|---|---|---|
| 1 | Fill | ColorField | Already shipped. |
| 2 | Stroke | ColorField | Already shipped. Compact next to Stroke width. |
| 3 | Stroke width | number | Already shipped. |
| 4 | Corner radius | number + slider | Already shipped (number). Add slider. |

4 controls.

### 3.3 Shape — ellipse / polygon

Same as rectangle minus corner radius.

### 3.4 Shape — line

| # | Control | Type | Notes |
|---|---|---|---|
| 1 | Stroke | ColorField | |
| 2 | Stroke width | number | |

2 controls. Lines have no fill, no corner radius.

### 3.5 Image layer

| # | Control | Type | Notes |
|---|---|---|---|
| 1 | Source ❗ | URL field + asset picker button | NEW. Phase 2 wires `AssetSourcePopover`. Phase 1 ships URL input + button stub. |
| 2 | Fit ❗ | toggle group | NEW. cover / contain / fill. |
| 3 | Replace ❗ | button | NEW. Opens picker, replaces the layer's `src`. |

3 controls. None exist today.

### 3.6 SVG layer

| # | Control | Type | Notes |
|---|---|---|---|
| 1 | Source ❗ | URL field + asset picker button | NEW. Same as Image layer. |
| 2 | Fill overrides ❗ | per-path color list | NEW. Empty in Phase 1; Phase 2 adds path-id detection from the SVG. |

2 controls, mostly Phase 2 wiring.

### 3.7 Logo layer

| # | Control | Type | Notes |
|---|---|---|---|
| 1 | Variant ❗ | combobox | NEW. `auto` / `primary` / `secondary` / `wordmark` / `iconmark` / `mono.black` / `mono.white`. |
| 2 | Auto-pick info ❗ | read-only badge | NEW. When variant=`auto`, shows "auto-picked: mono.white" once Phase 3 resolves; in Phase 1, says "auto-pick wired in Phase 3". |

2 controls.

### 3.8 Group layer

| # | Control | Type | Notes |
|---|---|---|---|
| 1 | Children count | text | Read-only. "3 layers". |
| 2 | Edit children | hint | "Select an inner layer to edit." |

No primary controls — groups are containers, edits happen on
children.

## 4. Advanced section (collapsed accordion)

Always-present at the bottom for every layer kind. Single
`<details>` accordion. Closed by default. Closes when selection
changes.

Contents differ per kind. Pattern: anything *not* in the primary
list above goes here.

### 4.1 Text — advanced

- Font weight (number)
- Line height (number) ❗
- Letter spacing (number) ❗
- Direction (toggle group: auto / ltr / rtl) ❗
- Numeric position / size / rotation (when the user wants pixel-perfect)
- Opacity (slider)
- Brand-managed toggle
- Layer name field
- Lock-individual-axes (lockMovementX / Y separately) — defer to
  Phase 2

### 4.2 Shape — advanced

- Numeric position / size / rotation
- Opacity
- Brand-managed
- Layer name
- (For polygon: edit points — defer to Phase 2)

### 4.3 Image — advanced

- Numeric position / size / rotation
- Opacity
- Brand-managed
- Layer name
- (Crop / mask — defer to Phase 2)

### 4.4 SVG — advanced

- Numeric position / size / rotation
- Opacity
- Brand-managed
- Layer name

### 4.5 Logo — advanced

- Numeric position / size / rotation
- Opacity
- Brand-managed (default ON for logo layers)
- Layer name

### 4.6 Group — advanced

- Numeric position / size / rotation
- Opacity
- Layer name

## 5. ColorField redesign (closes Issue B color gap)

Today `ColorField` renders a read-only chip when the value is a
SlotRef. With the fixture's text layers all using SlotRef colors,
that means the user sees no editable color anywhere.

New behavior:

```
┌─ Color ─────────────────────────────┐
│ [■■] brand.color.neutral [Override] │  ← when SlotRef
│ [■■] #111111            [⌫]         │  ← when literal
└─────────────────────────────────────┘
```

- **SlotRef state**:
  - Color swatch shows the *resolved* color when Phase 3 resolution
    is wired; for Phase 1, shows a deterministic placeholder
    (HSL hash of the slot type so different slots get visually
    different stand-ins).
  - Slot label is human-readable: "Brand neutral" not
    `brand.color.neutral`.
  - **Override** button replaces the SlotRef with the
    currently-displayed hex. After override, the field is in literal
    state. Phase 1 caveat: the placeholder hex is what gets
    overridden into; once Phase 3 lands, the resolver runs first
    and override takes the resolved color. Document this in the
    button tooltip: "Save the current resolved value as a one-off."
  - Tooltip on the slot label: "This color is managed by the brand
    kit. Click Override to detach this layer from the brand."

- **Literal state**:
  - Color picker + hex input as today.
  - The trash-icon `⌫` (or "Brand again" affordance if the layer's
    `brandLocked` was true) reverts to the layer kind's default
    SlotRef. Defer this to Phase 3 — Phase 1 just shows the picker
    and the hex.

- **Brand-locked**:
  - When `layer.brandLocked === true`, the SlotRef state is shown
    but the **Override** button is disabled with tooltip "This
    layer is brand-locked — toggle Brand-managed off in advanced
    properties to override."

## 6. Slot-aware Typography (matches §5 pattern)

Font family currently has no editing UI. New behavior:

```
┌─ Font ──────────────────────────────┐
│ [Brand heading ▼] [Override]        │  ← when SlotRef
│ [Inter ▼]            [⌫]            │  ← when literal
└─────────────────────────────────────┘
```

- SlotRef state: dropdown shows "Brand heading" / "Brand body" /
  the slot type label. Disabled (you can't pick a different brand
  font from this dropdown — that's the brand editor's job).
  Override button converts to literal.
- Literal state: dropdown lists a Phase 1 system font shortlist
  (System UI, Inter, Helvetica, Georgia, Times, Roboto, Arial,
  Courier). Phase 3 adds brand fonts and any uploaded font from
  `brand.brandAssets[]`.

## 7. Visual layout

```
┌─ HEADER STRIP ───────────────────────────────┐
│ [X][Y][W][H][↻]                       👁 🔒  │
└──────────────────────────────────────────────┘
┌─ PRIMARY (kind-specific) ────────────────────┐
│  Content / Font / Size / Color / Align       │
│  (or Fill/Stroke/StrokeW/Radius for shape)   │
│  …                                           │
└──────────────────────────────────────────────┘
┌─ ▼ More properties ──────────────────────────┐
│  (closed by default; one click to expand)    │
└──────────────────────────────────────────────┘
```

Total visible without expanding: header strip (28px) + ~5 fields
of primary content (~150px) ≈ 180px. Down from the current
~600px+ tower.

## 8. Implementation notes (for the implementer, post-approval)

- Component split: `<HeaderStrip />`, `<PrimaryControls />`,
  `<AdvancedSection />`. Per-kind primary components:
  `<TextPrimary />`, `<ShapePrimary />`, etc. Per-kind advanced
  components share a common `<TransformAdvanced />` for the
  numeric position/size/rotation block.
- The accordion uses Radix's Collapsible (already a dep via
  `@radix-ui/react-collapsible`). Closes on selection change via
  a `useEffect` keyed to `selection.layerIds[0]`.
- `ColorField` and `FontField` get the SlotRef redesign in §5/§6.
  Both gain an `onOverride` prop the implementer wires to a
  resolver hook (Phase 1 stub, Phase 3 real).
- Multi-select still shows the empty state — multi-edit is a
  Phase 2 concern.
- All controls use shadcn primitives; no new dependencies.

## 9. Out of scope

Explicitly not in this implementation pass — these go to a later
phase:

- Multi-layer edits (changing the fill of 5 selected shapes at once).
- Per-path color editing for SVG layers (needs SVG parsing — Phase 2).
- Logo "auto-picked" indicator filled with a real value (needs
  `pickLogoOnBackground` resolution — Phase 3).
- Crop / mask UI on Image layers.
- Polygon point-editing.
- Lock-individual-axes (lockMovementX / Y separately).

## 10. Acceptance criteria

After implementation, automated tests cover:

- Selecting a text layer with SlotRef color shows the slot label
  and the Override button, NOT a frozen chip.
- Override on a SlotRef field swaps the value to a literal hex
  and the picker becomes editable.
- Selecting a layer of any kind shows the header strip with
  position/size/rotation/visibility/lock toggles working.
- The "More properties" accordion is closed on first render, opens
  to reveal advanced controls, and closes when selection changes.
- Each layer kind's primary set matches §3 (test by selecting
  each kind from a fixture and asserting the rendered control
  count + control labels).
- Total panel height with the accordion closed is < 300px for
  every layer kind (visual regression — Storybook or a
  screenshot test).

Manual eyes (after tests pass):
- Spacing / typography of the header strip looks like Figma's, not
  cramped or labeled.
- Override button copy is unambiguous.
- Accordion animation is smooth, not janky.
