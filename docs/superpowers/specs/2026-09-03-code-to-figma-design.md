# Code → Figma: the shipping product as an editable design file

**Status:** specification, awaiting review. No implementation beyond the spike
scaffold at `figma-plugin/`.
**Date:** 2026-09-03
**Scope:** the Design System (`src/shared/ds/`) as a real Figma component
library, then the Studio screens. The marketing site (`landingpage/`) is out of
scope — it carries its own conflicting token set and would need a second file.

## 1. What this is for

A UI/UX designer needs to work on BrandingOS in Figma. Today there is no Figma
file at all. The output of this work is one file they can design in: real
component sets with real variants, bound to real tokens, with auto-layout that
survives being resized.

It is a **one-time handoff**. The designer owns the file afterwards; code and
Figma are allowed to diverge, and the redesign comes back as a spec to
implement. Nothing here is built to stay in sync forever, and no effort is spent
on a durable two-way pipeline.

### The priority order

This is the spine of every trade-off below, and it is deliberately not the order
a naive converter optimises for:

1. Correct component semantics
2. Correct instance / component relationships
3. Correct auto-layout and resize behaviour
4. Correct variables and styles
5. Clean, editable hierarchy
6. Visual fidelity

**A pixel-perfect file with a garbage hierarchy is a failed result.** Where a CSS
effect cannot be represented faithfully, preserve structure and editability
first, approximate the effect second, and record the loss explicitly.

## 2. Decisions taken

| # | Decision |
|---|---|
| 1 | **Figma Starter is the compatibility baseline.** Everything must work without a paid plan. |
| 2 | **Design tokens bind to local Figma variables.** Starter supports local variables; what it does not support is *multiple modes per collection*. |
| 3 | **`theme=light\|dark` is a component variant axis**, as the Starter-compatible substitute for a second variable mode. |
| 4 | **PoC routes:** `/b/raqm/brand-kit` at 1440px desktop, `/b/raqm/setup` at 390px mobile — the `raqm` seed brand, so captures are deterministic. |
| 5 | **Both themes are validated** across the component slice and both PoC screens. |
| 6 | Phase A (design system) is architected as **Phase 1 of Phase B** (screens), not as a disposable shortcut. Phase C (every screen state × 3 breakpoints) is explicitly not started. |

### Correcting an earlier claim

An earlier reading of Figma's pricing comparison led me to state that the free
plan has no variables. **That was wrong.** Starter supports local variables; the
restriction is one mode per collection. This spec binds tokens to variables on
every plan, and uses the `theme` variant axis only to work around the *mode*
limit. See §7.1 for the exact collection layout and the upgrade path.

## 3. Validation status — honest

**The pipeline is NOT yet validated end-to-end.** Spike 4, which is the only
spike that exercises the whole path, has not run. What is proven:

| Spike | Question | Status |
|---|---|---|
| 1 | CDP forced pseudo-states through Playwright | **PASS** — 8/8, values match the CSS exactly |
| 2 | Inline DS icon → editable Figma vector | **PASS** — 1 VECTOR, round caps, unfilled, 4 vertices, editable `vectorNetwork` |
| 3 | Real `COMPONENT_SET` with variant properties + connected instance | **PASS** — 2 axes parsed, 4 COMPONENT children, instance resolves to its main |
| 5 | Auto-layout genuinely reflows on resize | **PASS** — hug held, fill absorbed +320 of +320, padding unscaled, no scale transform |
| **4** | **Awkward component survives Browser → Extractor → IR → Figma** | **NOT RUN** — this is milestone M1 |

Spikes 1, 2, 3 and 5 are the validated *foundations*. They prove the primitives
exist and behave. They do not prove that a real component survives the full
conversion, which is precisely what spike 4 is for.

### Rules the spikes discovered

- **Measure the settled state.** `.ds-btn` transitions `transform`, `box-shadow`
  and `background` over 150ms, so forcing `:hover` and reading immediately
  returns the *old* shadow — `getComputedStyle` hands back an in-flight value.
  The extractor disables all transitions and animations before measuring. Figma
  has no transitions; the destination is the only meaningful value. Spike 1 went
  from 3/8 to 8/8 on this one change.
- **Auto-layout before children.** Set `layoutMode` and the sizing modes on a
  frame *before* appending, or it keeps its 100×100 birth size.
- **`prop=value, prop=value` is a contract.** Figma parses component names into
  variant properties on combine. Get the naming wrong and you get loose frames.
- **Spike 2's stroke weight is correct at 1.05px, not 1.8px.** The icon is
  authored `stroke-width="1.8"` in a `0 0 24 24` viewBox and rendered at 14px,
  so it paints at **1.8 × 14/24 = 1.05**. Figma reproduces the *rendered* weight.
  The original assertion tested the authored number and was itself the bug.

## 4. Architecture

```
Rendered React/CSS  →   Extractor    →   IR   →   Figma renderer
   (harness route)      (Playwright      (pure)      (plugin)
                         + CDP)
```

Four units. Dependency arrows only ever point at `ir/`.

| Unit | Location | Knows about | Never knows about |
|---|---|---|---|
| `harness/` | `src/pages/_dev/figma/` | React, the DS, the manifest | Figma, the extractor |
| `extract/` | `scripts/figma/` | DOM, CSS, CDP, Playwright | Figma, React |
| `ir/` | `scripts/figma/ir/` + mirrored type in plugin | nothing | everything |
| `figma-plugin/` | `figma-plugin/` | Figma plugin API, IR | DOM, CSS, Playwright |

**The extractor never imports the manifest.** The harness renders the manifest's
declarations into `data-fx-*` attributes; the extractor reads only attributes.
This keeps the semantic channel one-directional and is what lets Phase B reuse
the converter unchanged — screens simply carry fewer `data-fx-*` attributes, and
unrecognised nodes fall through to inferred structure.

**The IR is a first-class boundary.** It is the contract, it is versioned, and it
is serialised to JSON on disk between the two halves. Either side can be
rewritten without touching the other.

### The division of labour

| owner | owns |
|---|---|
| **The manifest** | component identity, variant axes, the state matrix, meaningful child roles, Figma naming and nesting, which DOM nodes are intentionally flattened, component→instance relationships |
| **The extractor** | every value: colour, spacing, typography, dimension, radius, shadow, geometry, sizing intent, token provenance |

The manifest declares **semantics only**. It may not contain a single hex, `px`
value or font name — anything obtainable from the rendered product must come
from measurement, or we create two sources of truth and lose the entire
advantage of the approach.

## 5. The IR

```ts
// ONE IRDoc PER (theme x viewport) CAPTURE. The extractor emits N documents,
// not one document containing every theme — `meta.theme` is scalar on purpose,
// so a capture can never half-describe two themes at once.
type IRDoc = {
  irVersion: number;
  meta: { capturedAt: string; theme: 'light' | 'dark'; viewport: {w:number;h:number};
          appCommit: string; url: string };
  tokens: IRToken[];          // name, value, kind: 'color'|'number'|'shadow'|'type'|'motion'
  roots: IRNode[];
  losses: IRLoss[];   // document-level rollup: every node's losses, plus losses
                      // that belong to no single node (motion tokens, dedup)
};

type IRPaint = { value: string; token?: string };   // token = '--ds-surface'

type IRNode = {
  id: string;
  name: string;                        // Figma layer name
  kind: 'component' | 'variant' | 'instance' | 'frame' | 'text' | 'vector' | 'image';
  semantic?: {
    component?: string;                // 'DsButton'
    variant?: Record<string, string>;  // { tone:'primary', state:'hover', theme:'light' }
    role?: string;                     // 'label' | 'icon' | 'kbd' | 'divider'
    instanceOf?: string;               // resolves to a component key (Phase B)
  };
  layout:
    | { mode: 'auto'; direction: 'row'|'column'; gap: number;
        padding: [number,number,number,number];
        primaryAlign: string; counterAlign: string; wrap: boolean }
    | { mode: 'absolute' };            // honest fallback, never the default
  sizing: {
    width:  'hug' | 'fill' | 'fixed';
    height: 'hug' | 'fill' | 'fixed';
    w: number; h: number;              // fallback values, used only for 'fixed'
    minW?: number; maxW?: number; minH?: number; maxH?: number;
  };
  style: {
    fills: IRPaint[]; strokes: IRPaint[]; strokeWeight?: number;
    radii: [number,number,number,number];
    effects: IREffect[];               // composite-aware: one entry per shadow layer
    opacity: number; clip: boolean;
  };
  text?: { characters: string; family: string; weight: number; size: number;
           lineHeight: number|'auto'; letterSpacing: number;
           align: string; color: IRPaint };
  vector?: { svg: string };            // currentColor already resolved
  image?: { bytes: string; scaleMode: string };
  children: IRNode[];
  losses: IRLoss[];
};

type IRLoss = {
  nodeId: string; property: string; cssValue: string;
  reason: 'unsupported-in-figma' | 'intentional-normalization' | 'approximated';
  note: string;
};
```

### `sizing` carries intent, not pixels — the most important decision here

A naive DOM converter measures `width: 143px` and writes a fixed 143px frame.
The file looks perfect and dies the instant anyone resizes it. So the extractor
**derives** `hug | fill | fixed` from `flex-grow`, `flex-basis`,
`align-self: stretch`, `width: 100%`, explicit dimensions and text-wrapping
behaviour. The measured pixel value is retained only as the fallback for
`fixed`, and `minW`/`maxW` carry CSS `min-width`/`max-width` (which Figma
auto-layout supports natively — `DsMenu`'s `min-width: 200px` is exactly this
case).

This puts priority #3 in the *data model* rather than hoping the renderer gets
it right. Spike 5 proved Figma honours the distinction once it is expressed.

### `IRPaint.token` is what makes priority #4 fall out for free

The extractor builds a reverse map from resolved value → `--ds-*` name, per
theme, so every fill, stroke, radius, gap and shadow knows which token produced
it. Spike 1 confirmed this resolves in practice (`rgb(239,238,232)` →
`--ds-surface-hover`; `rgba(17,17,19,0.16)` → `--ds-focus-ring`). Binding to
variables then becomes mechanical rather than a later manual chore. A token that
never matches anything is itself a reportable finding.

## 6. The manifest

Lives at `src/shared/ds/figma.manifest.tsx`. Consumed only by the harness.

```tsx
{
  key: 'DsButton',
  axes: {
    tone:  ['primary', 'secondary', 'tertiary', 'danger'],
    size:  ['md', 'sm'],
    state: ['default', 'hover', 'active', 'focus', 'disabled'],
    theme: ['light', 'dark'],
  },
  // Returns TRUE to KEEP a cell. Named for what it achieves, not what it returns.
  sparse: (v) => !(v.tone === 'tertiary' && v.state === 'active'),
  render: (v) => <DsButton tone={v.tone} size={v.size} disabled={v.state === 'disabled'}>Button</DsButton>,
  pseudo: (v) => v.state,          // which pseudo-state the extractor forces via CDP
  roles:  { 'svg': 'icon' },       // child role by selector
  flatten: [],                     // selectors whose node is structural noise
}
```

### The semantics-only rule is a test, not a convention

`figma.manifest.test.ts` reads the manifest module's own source text and fails on
any colour literal, length literal (`px`/`rem`/`em`/`%` on a numeric), or
font-family name. A rule nobody can break by accident beats a rule written in a
document.

### `sparse` exists because the cartesian product lies

`.ds-btn--tertiary` has no `:active` rule, so generating that cell ships a
variant that is byte-identical to another wearing a different name. That is the
"duplicated hacks" failure mode. `sparse` prunes cells known *a priori* to be
meaningless; §8 catches the rest by measurement.

## 7. The Figma renderer

### 7.1 Variables and styles

Tokens bind to **local Figma variables** wherever the property is bindable, and
to **styles** where the value is composite:

| Token kind | Vehicle | Why |
|---|---|---|
| Colour (35 per theme) | `COLOR` variable | Bindable to fills and strokes |
| Radii, spacing (14) | `FLOAT` variable | Bindable to `cornerRadius`, padding, `itemSpacing`, `strokeWeight` |
| Shadows (4) | **Effect style** | `--ds-shadow-float` is *two* shadow layers; a variable cannot express a composite effect |
| Type ramp | **Text style** | Family + weight + size + line-height + letter-spacing is composite |
| Motion (`--ds-ease`, 3 durations) | *not emitted* | Figma has no equivalent on a static node; recorded in `LOSSES.md` |

**Collection layout, Starter-compatible:**

- `Shape & Space` — one collection, one mode. Radii and spacing are
  theme-independent, so the mode limit costs nothing here.
- `Color / Light` and `Color / Dark` — **two collections**, one mode each. This
  is the workaround for Starter's single-mode limit: a `theme=light` variant
  binds to the Light collection, `theme=dark` to the Dark collection.

**Upgrade path.** On Professional, the two colour collections merge into one with
two modes and the `theme` axis can be dropped, without restructuring any
component. The variant axis is a compatibility shim, not an architectural
commitment. This is recorded so a future maintainer does not mistake it for a
design preference.

### 7.2 Component sets

One `COMPONENT_SET` per DS component, variants named
`axis=value, axis=value, …` — the naming contract spike 3 validated. Icons
become one component per glyph, instanced at usage sites rather than duplicated.

### 7.3 Two measured findings become recorded normalizations

- `.ds-btn--primary:hover` adds `transform: translateY(-1px)`. That is a motion
  affordance; baking it in as a 1px geometric offset would reproduce an
  *animation* as *geometry*. Dropped, recorded as
  `intentional-normalization`.
- `.ds-btn:focus-visible` **replaces** the resting elevation shadow rather than
  composing with it. Non-obvious, and correct for free because we measure rather
  than assume — a hand-authored manifest would very likely have stacked them.
  This is the approach paying for itself.

## 8. Measured-state deduplication

`sparse` prunes cells known in advance to be meaningless. Deduplication catches
the rest, *after* measurement:

1. Every generated cell is reduced to a **visual fingerprint** — a stable hash
   over the IR subtree with `semantic.variant` and node ids excluded, so it
   captures only what the cell *looks and lays out like*.
2. Cells sharing a fingerprint are collapsed. The surviving variant keeps the
   axis values that actually differ; the collapsed combinations are recorded.
3. If collapsing would leave an axis with a single value across the whole set,
   that axis is dropped from the set entirely.

Worked example: `tertiary` has no `:hover`, no `:active` and no distinct
`:focus-visible` fill, so `tone=tertiary` collapses from 5 state cells to 2
(`default`, `disabled`). Without this the set ships three variants that are
pixel-identical under different names — exactly what the quality gate rejects.

Deduplication is **reported, never silent**: `LOSSES.md` lists every collapsed
combination so a designer can tell "this state does not differ" from "this state
was forgotten".

## 9. Worst-case benchmark — a gate, not a footnote

An earlier draft asserted that an 80-variant button set is "comfortable" for
Figma. **That was an unmeasured claim and it is withdrawn.** Before generating
the full library, M2 benchmarks the worst-case set — `DsButton` at
4 tones × 2 sizes × 5 states × 2 themes = 80 cells before sparse/dedup.

Measured, and recorded in the spec's results section:

| Metric | How | Threshold |
|---|---|---|
| Generation time | plugin timestamps around the set build | < 30s for one set |
| Node count | recursive count of the set's subtree | < 4,000 nodes |
| File impact | `.fig` size delta before/after, and memory reported by Figma | no more than +8MB for one set |
| Instance usability | time to open the variant picker and switch a property; whether the picker degrades into an unusable list | switching a property must feel immediate; picker must remain navigable |

**If any threshold fails**, the fallback is declared in advance rather than
improvised: split `theme` into two sibling component sets (`DsButton / Light`,
`DsButton / Dark`), halving each set. If it still fails, split on `size` too.
Splitting costs the designer one extra picker step and costs nothing
structurally — every other property of the design survives.

No full-library generation happens until this benchmark has run and its numbers
are in this document.

## 10. The quality gate

Run by the plugin against the **live Figma API** after building, and reported to
the clipboard as machine-readable text. A screenshot cannot tell you whether a
node is a real `COMPONENT_SET` or four frames that merely look like one.

| # | Assertion |
|---|---|
| 1 | Every component is a `COMPONENT_SET`, not loose frames |
| 2 | Variant properties parsed; axis names and options match the manifest |
| 3 | No two variants share a visual fingerprint (§8) |
| 4 | Every instance resolves to a main component inside its set |
| 5 | `layoutMode` set on every node whose IR says `layout.mode === 'auto'` |
| 6 | `hug` / `fill` / `fixed` honoured; a resize probe reflows correctly |
| 7 | **Every colour and bindable numeric is bound to a variable or a style.** A raw value fails the gate unless it appears in `LOSSES.md` with a reason — *unexplained raw values are rejected* |
| 8 | Composite effects and type use effect/text styles, not inlined values |
| 9 | Zero single-child unstyled wrapper frames |
| 10 | Both `theme=light` and `theme=dark` render and pass 1–9 |

Assertion 7 is the one that keeps the file honest. It is why token provenance
lives in the IR rather than being reconstructed at render time.

## 11. `LOSSES.md`

Generated by the extractor and renderer, never hand-written, at
`figma-plugin/LOSSES.md`. Every entry carries node, property, CSS value, reason
and note. Three categories:

- **unsupported-in-figma** — the CSS has no faithful Figma equivalent
  (`backdrop-filter`, some gradient interpolation, `mix-blend-mode` gaps).
- **intentional-normalization** — we *could* represent it and chose not to,
  because doing so would be wrong (the `translateY` hover, `animation:
  ds-fade-in` on `DsMenu`, transition timing).
- **approximated** — represented, but not exactly.

Deduplication decisions (§8) are recorded here too.

## 12. Milestones

| # | Deliverable | Gate |
|---|---|---|
| **M1** | **Spike 4** — vertical slice: harness → extractor → IR → Figma for `DsButton` and an **open `DsMenu`**, both themes. `DsMenu` is chosen because it is genuinely awkward: composite two-layer `--ds-shadow-float`, `min-width: 200px` sizing intent, a CSS `animation`, nested icon + label + kbd child roles, and a divider. | The slice renders, the quality gate passes on it, and losses are recorded. **Only after this may the pipeline be called end-to-end validated.** |
| M2 | Worst-case benchmark (§9), then all ~30 components, both themes, full state matrix, variables + styles, icon components | Benchmark thresholds met or the declared fallback applied |
| M3 | Quality-gate report + `LOSSES.md` | **Owner review** |
| M4 | PoC screens: `/b/raqm/brand-kit` @1440 desktop and `/b/raqm/setup` @390 mobile, both themes | **Owner go/no-go into Phase B** |

Screens need no login: `brandos:dev-bypass=1` is seeded into `localStorage`
before navigation, and the `raqm` seed brand makes every capture deterministic.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **Spike 4 fails** — a real component does not survive the path | It is M1 precisely so this is discovered before 30 components are built on the assumption. Failure re-opens the design, it does not get worked around. |
| DOM→auto-layout inference is wrong for non-flex layouts (CSS grid, absolute) | `layout.mode: 'absolute'` is an honest, visible fallback rather than a silent bad guess. Grid is a known gap; if the DS or the PoC screens rely on it materially, that is a design re-open, and it is recorded. |
| Verification depends on a human running the plugin | There is no headless Figma. Mitigated by making the plugin self-assert against the live API and emit a machine-readable report, so review is evidence rather than opinion. |
| Starter turns out to restrict something else unforeseen | Starter is the baseline for every milestone, so a restriction surfaces at M1, not at M4. |
| Font availability | The plugin already probes and reports; Plus Jakarta Sans confirmed present on the owner's machine. |

## 14. Non-goals

- The marketing site (`landingpage/`).
- Phase C: every screen state × 3 breakpoints (150–250 frames). Explicitly not
  started until the core system and conversion quality are proven.
- Two-way sync, or any Figma → code path.
- A durable, re-runnable generator with stable component keys. This is a one-time
  handoff; nothing depends on regenerating in place.
- Publishing a shared Figma library (Starter cannot, and one file does not need it).
