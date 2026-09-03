# Code → Figma: BrandingOS as a durable, regenerable Figma system

**Status:** specification, rewritten 2026-09-03 for the expanded durable scope.
**Branch:** `feat/code-to-figma` · worktree `/Users/home/Projects/brandingOS-figma`
**Production artifact:** https://www.figma.com/design/ZTR7jwR1cvjYvs0N9kuHCX

## 1. What this is

A Figma file that represents **BrandingOS itself** — its foundations, its shared
design system, its chrome, and four product surfaces — generated from the
shipping code, verified against the running product, and **regenerable**.

### This is not a one-time handoff

The previous version of this document specified a one-time export: build the best
starting file, hand it to a designer, let code and Figma diverge. **That
assumption is withdrawn.** The system is durable:

- Regeneration is **idempotent** — running it twice produces the same structure.
- Nodes carry **stable semantic IDs**, so regeneration updates in place rather
  than duplicating.
- **Designer-owned areas survive regeneration**; generated areas are replaced.
- The IR is **versioned with migrations**, so a stored plan from an older
  generator can still be read.

Consequences that follow, and which the old document got wrong: effort now goes
into the *durability* of the pipeline, not only the quality of one output; the
repository owns everything deterministic; and Figma is a render target, not a
destination.

### The priority order

Unchanged, and still the spine of every trade-off:

1. Correct component semantics
2. Correct instance / component relationships
3. Correct auto-layout and resize behaviour
4. Correct variables and styles
5. Clean, editable hierarchy
6. Visual fidelity

**A pixel-perfect file with a garbage hierarchy is a failed result.** Where a CSS
effect cannot be represented faithfully, preserve structure and editability
first, approximate second, record the loss explicitly.

## 2. Decisions of record

| # | Decision |
|---|---|
| 1 | The official Figma remote MCP is the primary autonomous execution and live-verification transport. |
| 2 | The **repository owns everything deterministic**: semantic manifest, browser extractor, versioned IR, renderer logic, structural assertions, visual-comparison logic, coverage reports, `LOSSES.md` generation, regeneration and idempotency. MCP is transport, never source of truth. |
| 3 | `figma-plugin/` is retained as a second transport and is **not** deleted. It is removed only if and when the shared deterministic path is proven and the owner says so. |
| 4 | One deterministic renderer, two interchangeable transports. The repository must never carry two rendering implementations. |
| 5 | The final design represents **BrandingOS**, from a capture-only fixture built out of real product evidence. Never Raqm, SKAM, Vector or any customer brand. Production data and seed brands are never modified. |
| 6 | Code Connect is **unavailable** on this account — recorded as an unavailable *optional* capability, not a blocker. No time is spent trying to enable it. |
| 7 | The library is **not published** until its final quality gate passes. |
| 8 | **SUPERSEDED.** Originally: target Personal Components, never Brand OS. See §3. |
| 8′ | The artifact lives in **Brand OS** (`team::1534211484687179053`, pro, Full seat). |

### Why decision 8 was superseded

Decision 8's own rationale was "where write access was proven". Two facts changed:

1. **The MCP quota is scoped to the file's owning plan, not the user.** Personal
   Components is starter — 20 tool calls per *month* — and a read against its
   file was refused with an upgrade URL naming that team, while calls against
   Brand OS succeeded.
2. Brand OS was upgraded to **pro** with a **Full** seat, satisfying the original
   rationale there.

The owner explicitly superseded decision 8. The Personal Components file
(`weFwq43BkXMD1xWwf3fVIJ`) is retained untouched as a fallback; see
`docs/code-to-figma/PROGRESS.md` for the full migration record.

## 3. Measured account constraints

Every row was hit in practice. Full detail in `docs/code-to-figma/CONSTRAINTS.md`.

| Constraint | Starter (old target) | Pro / Brand OS (current) |
|---|---|---|
| MCP tool calls | 20 per **month** | **200/day, 10/min** |
| Pages per file | 3 | **unlimited — 13-page structure restored** |
| Variable modes | 1 per collection | **multiple — real Light/Dark** |
| Library publishing | unavailable | available (deliberately unused until the gate) |
| Code Connect | unavailable | unavailable (needs Org/Enterprise) |

**`theme=light|dark` as a variant axis is withdrawn.** Themes are real variable
modes, which roughly halves every component set. The variant axis survives only
where a theme causes a genuine **structural** difference — a different node tree,
not a different colour. Any such case must be justified in the component's
manifest entry.

Two behaviours worth carrying forward because they shape the code:

- **`use_figma` is transactional.** A script that throws rolls back entirely. This
  is the foundation of partial-run recovery (§10) — a failed slice leaves no
  half-written nodes.
- **`figma.root.name` is not settable.** A file's name is fixed at creation, so a
  misnamed file must be recreated. `create_new_file` is quota-exempt, so this is
  cheap.

## 4. Validation status — honest

**The pipeline is NOT yet end-to-end validated.** Only Cycle 2's gate may confer
that status.

| Spike | Question | Status |
|---|---|---|
| 1 | CDP forced pseudo-states through Playwright | **PASS** — 8/8, values match the CSS exactly |
| 2 | Inline DS icon → editable Figma vector | **PASS** — VECTOR, round caps, unfilled, editable `vectorNetwork` |
| 3 | Real `COMPONENT_SET` with variant properties + connected instance | **PASS** |
| 5 | Auto-layout genuinely reflows on resize | **PASS** — hug held, fill absorbed the delta, padding unscaled |
| **4** | **Awkward component survives Browser → Extractor → IR → Figma** | **NOT RUN** — this is Cycle 2 |
| — | Autonomous native write/read via MCP | **PASS** — preflight, independently audited |

### Rules the spikes discovered

- **Measure the settled state.** `.ds-btn` transitions `transform`, `box-shadow`
  and `background` over 150ms, so forcing `:hover` and reading immediately
  returns the *old* shadow. The extractor disables all transitions and animations
  before measuring. Figma has no transitions; the destination is the only
  meaningful value. Spike 1 went 3/8 → 8/8 on this change alone.
- **Auto-layout before children.** Set `layoutMode` and sizing modes before
  appending, or the frame keeps its 100×100 birth size.
- **`prop=value, prop=value` is a contract.** Figma parses component names into
  variant properties on combine.
- **Assert the rendered value, not the authored one.** The arrow icon is authored
  `stroke-width="1.8"` in a 24-unit viewBox at 14px, so it paints at
  1.8 × 14/24 = **1.05px** in Chrome and Figma alike.

## 5. Architecture

```
Rendered BrandingOS React/CSS
        │
        ▼   harness route, DEV-gated
   Extractor  (Playwright + CDP)
        │
        ▼   versioned, migratable
       IR    ──────────────► structural assertions
        │                     visual comparison
        ▼                     coverage + LOSSES
  Renderer (repo-owned)
        │  emits a RENDER PLAN — pure data, no Figma calls
        ├──────────────┬──────────────┐
        ▼              ▼              │
   MCP transport   plugin transport   │
   (metered,       (unmetered,        │
    autonomous)     human-triggered)  │
        └──────────────┴──────────────┘
                       ▼
              Figma document
                       │
                       ▼  read back through MCP
              live structural verification
```

### The render plan is the answer to "one renderer, two transports"

The renderer is a **pure function** `IR → RenderPlan`. A `RenderPlan` is
serialisable data describing Plugin-API operations — create this node, set these
properties, bind this variable, combine these as variants. It contains no Figma
calls and no I/O.

A **transport** is a thin executor that walks a `RenderPlan` and performs the
Plugin API calls. Both transports execute the *same* Plugin API surface:

- **MCP transport** — serialises the plan into a `use_figma` script.
- **Plugin transport** — `figma-plugin/` reads the plan and walks it directly.

Because the plan is pure data, the two transports share 100% of rendering
decisions and differ only in how the operations are delivered. Swapping transport
is a configuration change, not a rewrite. This satisfies decision 4 and is why
`figma-plugin/` costs nothing to keep.

### Unit boundaries

| Unit | Location | Knows about | Never knows about |
|---|---|---|---|
| `harness/` | `src/pages/_dev/figma/` | React, the DS, the manifest | Figma, the extractor |
| `extract/` | `scripts/figma/extract/` | DOM, CSS, CDP, Playwright | Figma, React |
| `ir/` | `scripts/figma/ir/` | nothing | everything |
| `render/` | `scripts/figma/render/` | IR, RenderPlan | DOM, transports |
| `transport/` | `scripts/figma/transport/` | RenderPlan, Plugin API | DOM, CSS, React |
| `figma-plugin/` | `figma-plugin/` | RenderPlan, Plugin API | DOM, CSS, Playwright |

The extractor never imports the manifest. The harness renders manifest
declarations into `data-fx-*` attributes; the extractor reads only attributes.
That keeps the semantic channel one-directional and lets screens reuse the
converter unchanged — unrecognised nodes fall through to inferred structure.

## 6. The IR

```ts
type IRDoc = {
  irVersion: number;                 // bumped on breaking change; see migrations
  meta: { capturedAt, theme: 'light'|'dark', viewport, direction: 'ltr'|'rtl',
          appCommit, url, fixture: 'brandingos' };
  tokens: IRToken[];
  roots: IRNode[];
  losses: IRLoss[];                  // document-level rollup
};

type IRPaint = { value: string; token?: string };   // token = '--ds-surface'

type IRNode = {
  sid: string;                       // STABLE SEMANTIC ID — see §9
  name: string;
  kind: 'component'|'variant'|'instance'|'frame'|'text'|'vector'|'image';
  semantic?: { component?, variant?: Record<string,string>, role?, instanceOf? };
  layout: { mode:'auto', direction, gap, padding, primaryAlign, counterAlign, wrap }
        | { mode:'absolute' };
  sizing: { width:'hug'|'fill'|'fixed'; height:…; w:number; h:number;
            minW?, maxW?, minH?, maxH? };
  style: { fills: IRPaint[]; strokes: IRPaint[]; strokeWeight?;
           radii:[number,number,number,number]; effects: IREffect[];
           opacity: number; clip: boolean };
  text?: { characters, family, weight, size, lineHeight, letterSpacing,
           align, direction, color: IRPaint };
  vector?: { svg: string };
  image?: { bytes: string; scaleMode: string };
  children: IRNode[];
  losses: IRLoss[];
};
```

**One `IRDoc` per (theme × viewport × direction) capture.** `meta.theme` and
`meta.direction` are scalar on purpose — a capture can never half-describe two
themes.

### `sizing` carries intent, not pixels

A naive converter measures `width: 143px` and writes a fixed frame; the file
looks perfect and dies on first resize. The extractor **derives**
`hug | fill | fixed` from `flex-grow`, `flex-basis`, `align-self: stretch`,
`width: 100%`, explicit dimensions and wrapping behaviour. The measured pixel is
the fallback for `fixed` only. `minW`/`maxW` carry CSS `min-width`/`max-width`,
which Figma auto-layout supports natively (`DsMenu`'s `min-width: 200px` is
exactly this).

This puts priority #3 in the data model rather than hoping the renderer honours
it. Spike 5 proved Figma respects the distinction once expressed.

### `IRPaint.token` makes priority #4 free

The extractor builds a reverse map from resolved value → `--ds-*` name, per
theme, so every fill, stroke, radius, gap and shadow knows which token produced
it. Confirmed working in spike 1 (`rgb(239,238,232)` → `--ds-surface-hover`;
`rgba(17,17,19,0.16)` → `--ds-focus-ring`). Binding to variables is then
mechanical. A token that never matches anything is a reportable finding.

### IR versioning and migrations

`irVersion` is an integer. `scripts/figma/ir/migrations/` holds one pure function
per step (`v1_to_v2.ts`, …), applied in order by `migrate(doc)`. Rules:

- A migration is **pure** and total: every `IRDoc` at version N becomes a valid
  `IRDoc` at N+1, or throws with the reason.
- A field may be **added** freely. Removing or re-meaning a field requires a
  migration and a version bump.
- Golden fixtures for every version live in `scripts/figma/ir/__fixtures__/`, and
  a test migrates each to head and asserts validity — so an old plan is proven
  readable rather than assumed readable.

## 7. The manifest — semantics only

`src/shared/ds/figma.manifest.tsx`, consumed only by the harness.

```tsx
{
  key: 'DsButton',
  sid: 'ds/button',                  // stable semantic id root
  axes: { tone:  ['primary','secondary','tertiary','danger'],
          size:  ['md','sm'],
          state: ['default','hover','active','focus','disabled'] },
  // Returns TRUE to KEEP a cell. Named for what it achieves, not what it returns.
  sparse: (v) => !(v.tone === 'tertiary' && v.state === 'active'),
  render: (v) => <DsButton tone={v.tone} size={v.size} …>Button</DsButton>,
  pseudo: (v) => v.state,            // what the extractor forces via CDP
  roles:  { 'svg': 'icon' },
  flatten: [],
}
```

**No theme axis.** Themes are variable modes now; the manifest declares the
axes that are genuinely structural.

### The semantics-only rule is a test

`figma.manifest.test.ts` reads the manifest module's own source and fails on any
colour literal, length literal, or font-family name. A rule nobody can break by
accident beats a rule in a document.

### `sparse` exists because the cartesian product lies

`.ds-btn--tertiary` has no `:active` rule, so that cell would ship a variant
byte-identical to another under a different name. `sparse` prunes cells known
meaningless *a priori*; §11 catches the rest by measurement.

## 8. The BrandingOS fixture — capture-only

`src/pages/_dev/figma/fixture/` builds a `MockBrand`-shaped BrandingOS identity
from **real repository evidence**, and is used only by the harness:

| Fixture field | Real source |
|---|---|
| Colours | `src/shared/ds/tokens.json` (`--ds-accent`, surfaces, semantic states) |
| Typography | `--ds-font` → Plus Jakarta Sans; `--ds-font-mono` |
| Logo | `BrandMark` from `src/shared/ds/BrandMark.tsx` — the 9-dot mark, **idle** mode |
| Spacing / radii / shadows / motion | `tokens.json` `global` |
| Icons | `src/shared/ds/icons.tsx` |
| Copy and naming | existing product strings; product name is **BrandingOS** |

Rules that bind:

- **It is never written to any store.** No `useBrandStore.update`, no Supabase, no
  localStorage key that production reads. The harness holds it in memory.
- **It never touches seed brands.** Raqm, SKAM, Uniex and Vector are untouched.
- **`BrandMark` is drawn in `idle` mode, never `loading`.** A mark permanently
  wearing the loader says the app is permanently busy. And never a letter "B".
- A test asserts the fixture's colours and fonts are *read from* `tokens.json`
  rather than duplicated, so a token change moves the fixture.

## 9. Stable semantic IDs — how regeneration finds what it made

Every generated node carries a **stable semantic id** (`sid`), derived from
meaning, never from position or Figma's node ids:

```
ds/button                              component set
ds/button[tone=primary,state=hover]    variant
ds/menu/item/icon                      child role inside a component
app/setup/section/logo                 a page section
foundations/color/ds-accent            a token swatch
```

The renderer writes each `sid` into the node's **`name`-independent** plugin
data channel — specifically `setSharedPluginData('brandingos', 'sid', …)`, chosen
because it survives rename, move, copy and library import, whereas layer names do
not (a designer renaming a layer must not orphan it).

Regeneration then works by **reconciliation**, not recreation:

1. Index every existing node in the generated area by `sid`.
2. For each planned node: `sid` present → update in place; absent → create.
3. Any indexed node whose `sid` is no longer in the plan → delete, **but only
   inside generated areas** (§10).

This is what makes regeneration idempotent: the second run finds every `sid`,
updates nothing materially, and creates and deletes nothing.

## 10. Generated vs designer-owned areas

The boundary is explicit, marked in the document, and enforced by the renderer.

| Area | Ownership | On regeneration |
|---|---|---|
| Pages `01`–`04`, `90`, `91`, `98`, `99` | **generated** | reconciled; stale `sid`s deleted |
| Pages `10`–`13` | **generated** | reconciled; stale `sid`s deleted |
| Page `00 — Cover & Usage` | **mixed** | generated blocks reconciled; everything else preserved |
| Any node tagged `brandingos:owner = designer` | **designer** | never touched, never deleted |
| Any node with **no** `sid` inside a generated page | **designer** | preserved, reported in the generation log |

Two rules make this safe:

- **The renderer never deletes a node it cannot prove it created.** Deletion
  requires a `sid` that the renderer itself wrote. An untagged node is somebody
  else's work by definition.
- **A designer can opt any subtree out** by setting `brandingos:owner=designer`
  on it, which the renderer honours even if the node also carries a `sid`.

The Cover & Usage page states all of this in the document itself, so the rules
are discoverable without reading this spec.

## 11. Idempotent regeneration, deduplication, partial-run recovery

### Idempotency

Two consecutive full runs must produce the same generated structure. The gate is
mechanical: run, snapshot every generated `sid` with a content hash, run again,
diff. Any difference is a bug in the renderer, not an acceptable variance.

Sources of non-determinism that are explicitly eliminated: iteration order (all
plans are sorted by `sid`), timestamps (only in the Cover page's metadata block,
which is excluded from the idempotency hash), and measured geometry drift (the
extractor disables animations and waits for fonts).

### Measured-state deduplication

`sparse` prunes what is meaningless in advance; deduplication catches the rest
after measurement:

1. Each generated cell reduces to a **visual fingerprint** — a stable hash over
   the IR subtree with `sid`, `semantic.variant` and node ids excluded, so it
   captures only how the cell looks and lays out.
2. Cells sharing a fingerprint collapse. The survivor keeps the axis values that
   genuinely differ.
3. If collapsing leaves an axis with one value across a set, the axis is dropped.

Deduplication is **reported, never silent** — every collapse lands in
`LOSSES.md`, so a designer can distinguish "this state does not differ" from
"this state was forgotten".

### Partial-run recovery

`use_figma` is transactional per script, so a failed slice leaves no half-written
nodes. On top of that, the runner keeps a **generation journal**
(`docs/code-to-figma/.generation-journal.json`): one entry per slice with its
plan hash and outcome. On restart the runner skips slices whose plan hash is
unchanged and already `ok`, and re-runs everything else. An interrupted run
therefore resumes rather than restarting, and a changed slice is never skipped.

## 12. Scope — exact routes, from router evidence

All line numbers are `src/App.tsx`.

### Included

| Route | Line | Cycle | Why |
|---|---|---|---|
| `/b/:slug/setup` | 498 | 6 | Named in the mission |
| `/b/:slug/brand-kit` | 501 | 7 | Named in the mission |
| *(overlay)* `BrandKitCardEditor` | — | 8 | Editors are an overlay on `brand-kit`, not a route |
| `/b/:slug/design` | 522 | 9 | Design launchpad |
| `/b/:slug/design/:designSlug` | 574 | 9 | The canonical editor shell reached from the launchpad |
| *(chrome)* `WorkspaceShell` + top/segmented nav + brand switcher + page headers | — | 5 | The shell these four surfaces share |

### Excluded, with reasons

| Route | Line | Why excluded |
|---|---|---|
| `/b/:slug/brand-kit-next` | 506 | Experimental lifecycle fork; owner froze it at direct-URL-only |
| `/b/:slug/identity`, `/guideline`, `/tools`, `/templates`, `/content`, `/folders`, `/share`, `/settings` | 511–555 | Not in the mission's four surfaces |
| `/b/:slug/guidelines/canvas`, `/guidelines/blocks` | 602–605 | Frozen and unlinked |
| `/b/:slug/social-media`, `/presentations`, `/case-study`, `/pitch-deck`, `/deck-v2`, `/logo-presentation`, `/brand-board`, `/bento`, `/analytics`, `/approvals` | 577–617 | Separate feature families |
| `/b/:slug/tools/*` | 620–629 | Tool surfaces, not in scope |
| `/editor/design/:slug` | 652 | Legacy `OptimizedDesignEditor`; a documented carve-out coupled to the frozen export pipeline. **Not silently absorbed.** |
| `/a/:slug/*` | 721+ | Classic UI, bug-fix only |
| `/dashboard/brand/:slug/*` | 779 | Legacy redirect shim |
| `landingpage/` | — | Own conflicting token set; would need a second file |

Redirect-only routes (`/b/:slug/guideline/:templateId` → 521,
`/b/:slug/brand-guides` → 598) are excluded: they render no UI.

## 13. Verification — autonomous, no human in Figma

Human-operated validation is **withdrawn**. The preflight proved autonomous
write, read-back and structural inspection through MCP, independently audited.
Every gate below runs without anyone opening Figma.

### Structural assertions (repo-owned, executed via transport)

Run against the **live** document and returned as data:

1. Every component is a `COMPONENT_SET`, not loose frames.
2. Variant properties parsed; axis names and options match the manifest.
3. No two variants share a visual fingerprint.
4. Every instance resolves to a main component inside its set.
5. `layoutMode` set wherever the IR says `layout.mode === 'auto'`.
6. `hug`/`fill`/`fixed` honoured; a resize probe reflows correctly.
7. **Every colour and bindable numeric is bound to a variable or a style.** A raw
   value fails unless it appears in `LOSSES.md` with a reason — *unexplained raw
   values are rejected*.
8. Composite effects and type use effect/text styles.
9. Zero single-child unstyled wrapper frames.
10. Both `Light` and `Dark` modes resolve.
11. Every generated node carries a `sid`; no duplicate `sid`s.

### Visual comparison

Browser screenshot and Figma render of the same slice, at the same viewport,
compared per-region: geometry, spacing, colour, type, wrapping, effects, icons,
visibility.

**No global similarity percentage.** A single number hides individual errors
behind an average — the same mistake as averaging logo ink in
`shared/brand/logoInk.ts`. Every material difference is fixed or recorded as a
justified loss.

### Quota discipline

Pro allows 200/day and 10/min, which is ample but not free. Rules, adopted after
the starter ceiling was hit mid-Cycle-0:

- **Reviewer subagents receive captured evidence, never live MCP access.** The
  preflight reviewer's read-only audit consumed roughly a third of a month's
  starter quota. On a metered transport, verification competes with production.
- Batch writes per slice; never read back what the write already returned.
- `whoami`, `create_new_file`, `add_code_connect_map` are exempt and free.

## 14. `LOSSES.md`

Generated by the extractor and renderer at `docs/code-to-figma/LOSSES.md`, never
hand-written. Every entry carries node `sid`, property, CSS value, reason, note.

- **unsupported-in-figma** — no faithful equivalent (`backdrop-filter`, some
  gradient interpolation, blend-mode gaps).
- **intentional-normalization** — representable, deliberately not represented.
  Two known already: `.ds-btn--primary:hover`'s `translateY(-1px)` (a motion
  affordance; baking it in reproduces an animation as geometry) and `DsMenu`'s
  `animation: ds-fade-in`.
- **approximated** — represented, but not exactly.

Deduplication collapses are recorded here too.

A measured finding worth keeping visible: `.ds-btn:focus-visible` **replaces**
the resting elevation shadow rather than composing with it. Non-obvious, and
correct for free because we measure rather than assume — a hand-authored manifest
would very likely have stacked them.

## 15. Coverage matrices

Tracked in `docs/code-to-figma/`, regenerated each cycle, and gated: every
planned component and state must point at shipping-code or runtime evidence.
**States are never invented to fill a matrix.**

| File | Shape |
|---|---|
| `COVERAGE-components.md` | component → props → states → themes → breakpoints → Figma representation → tests |
| `COVERAGE-pages.md` | page/surface → sections → interactive states → overlays → responsive forms → status |
| `COVERAGE-states.md` | the audited state vocabulary, each with its source evidence |
| `COVERAGE-rtl.md` | wrapping, fixed widths, logical direction, directional icons, glyph coverage, mobile structural changes |

## 16. Cycles and gates

Cycle definitions and gates are the owner's, recorded in `PROGRESS.md` and
tracked there. The one that binds hardest: **only after Cycle 2's gate may the
pipeline be called end-to-end validated.**

## 17. Risks

| Risk | Mitigation |
|---|---|
| Cycle 2 fails — a real component does not survive the path | It is early precisely so this is found before 30 components depend on it. Failure re-opens the design; it is not worked around. |
| DOM→auto-layout inference wrong for non-flex layouts | `layout.mode: 'absolute'` is an honest, visible fallback. CSS grid is a known gap; if a target surface depends on it materially, that is a design re-open and is recorded. |
| MCP quota exhaustion mid-cycle | Journal-based recovery (§11) means a run resumes. Plugin transport is the unmetered escape hatch. |
| Peer sessions moving the shared checkout | This work is isolated in its own worktree; the shared checkout is never written. |
| Arabic glyph coverage in Plus Jakarta Sans | Tested explicitly in Cycle 10 rather than assumed; a fallback family is recorded if it fails. |

## 18. Non-goals

- The marketing site (`landingpage/`).
- Two-way sync, or any Figma → code path.
- Code Connect (unavailable; optional).
- Publishing the library before its final gate.
- Absorbing legacy editors not named in §12.
