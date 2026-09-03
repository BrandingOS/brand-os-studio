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
| **6** | **`setSharedPluginData` survives rename, move, reparent, copy and component→instance** | **NOT RUN** — Cycle 2, and it gates §9 |
| **7** | **Reconciliation is idempotent** — run a plan twice, assert the second run creates 0, deletes 0, and changes no property | **NOT RUN** — Cycle 2, and it gates §11 |
| — | Autonomous native write/read via MCP | **PASS** — preflight, independently audited |

Spikes 6 and 7 exist because §1 states idempotency, `sid` survival and
reconciliation in the present tense as *properties of the system*, and nothing
had measured them. `setSharedPluginData` durability in particular is the
foundation the whole regeneration model rests on; asserting it from
documentation would repeat the mistake that produced the "free plan has no
variables" error earlier in this project.

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

### How the plan reaches each transport

Unstated, this is exactly where the two transports would diverge — someone
reimplements a walker inside the plugin sandbox and the single-renderer claim
quietly dies. So it is stated:

| | MCP transport | Plugin transport |
|---|---|---|
| Delivery | plan serialised into a `use_figma` script | plugin **UI iframe** fetches `http://127.0.0.1:5599/plan.json` |
| Server | — | `node scripts/figma/serve-plan.mjs` |
| Manifest | — | `networkAccess.allowedDomains: ["http://127.0.0.1:5599"]` |
| Walker | `scripts/figma/transport/walk.ts` | **the same module**, bundled into `code.js` |

The plugin sandbox has no filesystem, and its main thread has no network — but
its **UI iframe does**, which is why the plan is fetched there and passed to the
main thread by `postMessage`. `figma-plugin/code.js` therefore stops owning any
node-building logic (its current 257 lines are spike scaffolding) and becomes a
thin host around the shared walker. A test asserts the walker module is imported
by both transports and that neither contains node-construction code of its own.

### Merging themes into one plan

`meta.theme` is scalar — a capture never half-describes two themes — but the
output needs one component bound to `Light`/`Dark` variable modes. The join is an
explicit, pure step:

```
mergeThemes(irLight, irDark) → RenderPlan
```

matching nodes by `sid` and, per property:

- **Both sides carry the same `token`** → bind once to the variable; the variable
  holds both mode values. This is the overwhelmingly common case.
- **Values are identical and untokenised** → emit a literal; no mode needed.
- **Values differ and are untokenised** → the property is theme-varying but has
  no design token behind it. The renderer mints a variable in a
  `Generated / Unmapped` collection named after the `sid` and property, binds it,
  and records a `LOSSES.md` entry of kind `approximated` naming the CSS source.
  This is deliberately visible: an unmapped theme-varying colour is a gap in the
  token system, and the file should say so rather than hide it behind a literal.
- **A node exists in one theme only** → a genuine structural difference. This is
  the *only* case that may reintroduce a `theme` variant axis, and the manifest
  entry must justify it (§3).

`mergeThemes` is pure and unit-tested against fixture pairs, because it is the
one place a theme bug becomes invisible.

**Only theme merges. Viewport and direction do not.** §6 emits one `IRDoc` per
(theme × viewport × direction), and it would be a category error to fold all
three the same way:

| Axis | Join | Why |
|---|---|---|
| **theme** | merged into variable **modes** on one node | a theme changes values, not structure — that is exactly what modes are for |
| **viewport** | **separate frames** (`app/setup@1440`, `app/setup@390`) | a mobile layout has a different node tree; §Cycle 10 forbids scaling a desktop frame to imitate mobile |
| **direction** | **separate frames** on page `91`, and a `direction` variant axis *only* where geometry genuinely mirrors | duplicating a component per language when a text property suffices is waste; but a mirrored layout is a real structural difference |

So the pipeline is `mergeThemes` per (viewport × direction) cell, producing one
plan fragment each, concatenated in `sid` order into the run's single plan.

### Fonts

`--ds-font-mono` is `ui-monospace, SFMono-Regular, Menlo, monospace` — **none of
which are Figma fonts.** `loadFontAsync` would throw, and because `use_figma` is
transactional (§3) that failure discards the entire slice. So font resolution
happens **before** any transaction:

1. `listAvailableFontsAsync()` once per run, cached.
2. `resolveFont(cssFamilyStack, weight, style)` walks the CSS stack, maps each
   candidate through an explicit table (`Plus Jakarta Sans` → itself;
   `ui-monospace`/`SFMono-Regular`/`Menlo` → `Roboto Mono`; generic `sans-serif`
   → `Inter`), and returns the first available family plus the Figma style name.
3. Weight → style-name mapping is a table, not arithmetic —
   `600 → 'Semi Bold'` (with the space; `'SemiBold'` is the documented footgun).
4. Any substitution is a `LOSSES.md` entry of kind `approximated`.
5. If nothing resolves, the run **fails before writing**, naming the family. A
   missing font is a fixable input, never a half-written document.

### Images — by reference, never inlined

**`use_figma`'s `code` parameter is capped at 50,000 characters.** Base64 inflates
bytes by ~33%, so a single 40 KB PNG would consume the entire script budget and a
100 KB one cannot be sent at all. Inlining image bytes in the IR — as an earlier
draft assumed — is therefore impossible on the MCP transport, not merely
wasteful.

So the IR carries a **reference**, not bytes:

```ts
image?: { hash: string; mime: string; width: number; height: number;
          scaleMode: string }      // bytes live in the asset store, keyed by hash
```

`hash` is the content hash of the bytes, which also deduplicates: the same logo
used on twenty tiles is stored and uploaded once. Bytes live in
`scripts/figma/.assets/<hash>` and are served by the plan server.

| Transport | How bytes arrive |
|---|---|
| MCP | `upload_assets` (a dedicated tool, outside the 50 KB script budget); the returned handle is substituted into the plan before the script is built |
| Plugin | the UI iframe fetches `/{hash}` from the plan server and `postMessage`s the bytes to the main thread |

Both then call `figma.createImage(bytes)` inside the **same** walker, so the
divergence is confined to delivery, exactly as §5 requires.

Vectors are not images: inline SVG goes through `createNodeFromSvg` and stays
editable (spike 2). The BrandMark is SVG and is therefore always a vector, never
a raster — which is also why the fixture's identity survives at any zoom.

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

## 8b. Screen capture contract

§8 says the fixture is never written to a store. §12 requires capturing four real
routes. Those two are only compatible if there is a defined seam — the previous
draft had none, which would have blocked every screen cycle. This is that seam.

### How a route resolves the fixture

`src/shared/hooks/useBrandFromSlug.ts` resolves in this order, and the second
step is the seam:

1. `useBrandStore.current` when its slug matches.
2. **`getSeedBrandBySlug(slug)` — synchronous**, from `src/data/brands/index.ts`.
3. otherwise `undefined`.

So a fixture registered in the seed registry under a reserved slug resolves on
`/b/<slug>/setup`, `/brand-kit` and `/design` on **first render**, with no store
write, no localStorage, no Supabase, and no async wait.

### The rules that keep it out of production

- **Reserved slug `brandingos`.** Not a customer name, and reserved so it can
  never collide with a real brand.
- **DEV-gated at the registry.** `getSeedBrandBySlug` returns the fixture only
  under `import.meta.env.DEV`. `SEED_BRANDS` — the array `LocalBrandsService`
  merges into `list()` — **never** contains it, so it cannot appear in anyone's
  brand list, cannot be persisted by `patchSeedOverride`, and cannot reach a
  production build. A test asserts the production `SEED_BRANDS` array is
  unchanged (still exactly Raqm, SKAM, Vector, Uniex) and that a non-DEV
  `getSeedBrandBySlug('brandingos')` returns `undefined`.
- **Read-only by construction.** The fixture object is frozen. Any write path
  that would persist it (`update`, `patchSeedOverride`) is unreachable because it
  is not in `SEED_BRAND_IDS`.
- **Seed brands are untouched.** Raqm, SKAM, Vector and Uniex keep their
  definitions; the fixture is additive and DEV-only.

### Driving states the URL cannot express

Overlays, dirty/saving states and open menus are not addressable by URL. The
harness exposes them through a **capture directive** in the query string, read
only by a DEV-gated capture provider:

```
/b/brandingos/brand-kit?__fx=overlay:card-editor,tab:logos,state:dirty
```

`src/pages/_dev/figma/captureDirective.ts` parses it into a typed directive; a
DEV-only `CaptureProvider` mounted above the route applies it. Rules:

- **Every directive names a state the product genuinely has**, evidenced in the
  coverage matrices. A directive that cannot be traced to shipping code is
  rejected by a test — this is the "never invent a state" gate, enforced.
- The provider is `import.meta.env.DEV`-only and is tree-shaken from builds, the
  same structural gating `/__architecture` already uses.
- No directive mutates persistent state.

### Theme and direction

`data-theme` on the workspace element and `dir` on `<html>` are set by the
extractor before measuring, not by a directive — they are capture axes, not
product states. Each combination is its own `IRDoc` (§6).

## 9. Stable semantic IDs — how regeneration finds what it made

Every generated node carries a **stable semantic id** (`sid`), derived from
meaning, never from position or Figma's node ids:

```
ds/button                              component set
ds/button[size=md,state=hover,tone=primary]   variant — axes SORTED
ds/menu/item#2/icon                    repeated sibling — ordinal required
app/setup/section/logo                 a page section
foundations/color/ds-accent            a token swatch
```

Three grammar rules, each fixing a way the naive form collides:

- **Axis values are sorted by key** before serialising, so `tone` then `state`
  and `state` then `tone` produce the same `sid`. Iteration order is not identity.
- **Repeated siblings take an ordinal** (`#2`, `#3`) assigned by document order
  within the parent. Without it `ds/menu/item/icon` collides three times over by
  construction, and reconciliation would fold three nodes into one.
- **A `sid` embeds only DECLARED axes** — those in the manifest — never the axes
  that survive deduplication. This is load-bearing; see "churn" below.

The renderer writes each `sid` via
`setSharedPluginData('brandingos', 'sid', …)`, plus a `gen` stamp holding the
generation run id. Plugin data was chosen over layer names because a designer
renaming a layer must not orphan it.

### Duplicate `sid`s are expected, not a failure

`setSharedPluginData` is copied along with a node, so **a designer duplicating a
generated node produces two nodes with the same `sid`**. Treating that as an
integrity failure — as an earlier draft did — would make an ordinary design act
break the gate. Instead:

- The renderer stamps `gen` on every node it writes. On reconciliation, when
  several nodes share a `sid`, the **canonical** one is the node whose `gen`
  matches the most recent run that touched it; the others are copies.
- **Copies are reclassified as designer-owned** — the reconciler clears their
  `sid`, tags them `owner=designer`, and reports the reclassification. They are
  never updated and never deleted.
- Assertion 11 (§13) is therefore *"no duplicate `sid` among renderer-owned
  nodes"*, which is checkable, rather than "no duplicate `sid`", which is not.

### `sid` churn, and why deduplication must not cause it

Deduplication (§11) drops axes. If `sid`s embedded surviving axes, dropping one
would rewrite every `sid` in the set — a mass delete-and-create that discards
designer overrides and, worse, makes the output depend on a *measurement*. That
is a genuine non-determinism loop, and it is closed by construction:

- `sid`s are built from the **manifest's declared axes**, which change only when
  a human edits the manifest.
- Deduplication produces an **alias table** — several declared `sid`s mapping to
  one surviving node — recorded in the plan and in `LOSSES.md`. Collapsing
  changes which node a `sid` resolves to, never the `sid` itself.
- Adding an axis to the manifest *does* change every `sid` in that set. That is a
  deliberate, human-initiated migration, and the renderer reports it as such
  rather than silently re-creating: the run refuses and asks for
  `--accept-sid-migration` unless the flag is passed.

### Reconciliation

1. Index every renderer-owned node in generated areas by `sid` (canonical only).
2. Planned `sid` present → update in place; absent → create.
3. Indexed `sid` no longer in the plan → delete, **only** inside generated areas
   and **only** if the node still carries a renderer `gen` stamp (§10).

The second run therefore finds every `sid`, changes nothing material, and creates
and deletes nothing — which is the idempotency gate in §11.

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
- **Overwrites are reported, never silent.** A generated node *is* replaced on
  regeneration — that is the contract — but the reconciler diffs each node before
  writing and records every property it changed in the generation log, with the
  `sid` and the before/after value. A designer who edited a generated node
  without tagging it can therefore see exactly what was reverted and re-apply it
  or tag it. Silent destruction is the failure mode this prevents; the opt-out
  being manual is acceptable only because the loss is visible.

The Cover & Usage page states all of this in the document itself, so the rules
are discoverable without reading this spec.

## 11. Idempotent regeneration, deduplication, partial-run recovery

### Idempotency

Two consecutive full runs must produce the same generated structure. The gate is
mechanical: run, snapshot every generated `sid` with a content hash, run again,
diff. Any difference is a bug in the renderer, not an acceptable variance.

Sources of non-determinism that are explicitly eliminated:

| Source | How it is closed |
|---|---|
| Iteration order | every plan is sorted by `sid`; axis values sorted by key (§9) |
| Timestamps | confined to the Cover page metadata block, excluded from the idempotency hash |
| Measured geometry drift | extractor disables transitions and animations, and waits for fonts before measuring |
| **Deduplication feeding back into `sid`s** | `sid`s embed *declared* axes only; dedup emits an alias table and never rewrites a `sid` (§9). This is the loop that actually threatened idempotency — dedup is measurement-driven, so had `sid`s depended on its output, a one-pixel measurement change could have re-keyed an entire component set. |
| Font substitution | resolved once per run from a cached `listAvailableFontsAsync`, through a fixed table (§5) |

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

**Atomicity is a property of the transport, not of the system**, and the two
differ. Stating it unconditionally would be wrong:

| Transport | Atomicity | Consequence |
|---|---|---|
| MCP | `use_figma` is transactional per script — a throw rolls the whole script back (measured in Cycle 0) | a failed slice leaves nothing behind |
| Plugin | **no ambient transaction**; the walker mutates the document as it goes | a mid-slice failure *can* leave half-written nodes |

The plugin transport therefore implements its own compensating rollback: the
walker records every node id it creates and every property it overwrites, and on
failure removes the created nodes and restores the overwritten values before
rethrowing. This is weaker than a real transaction — a crashed plugin host cannot
compensate at all — so the plugin walker additionally stamps each slice
`gen=<run>:pending` on entry and clears it on success. A `pending` stamp found at
the start of a later run marks that slice dirty, and it is regenerated from
scratch rather than reconciled.

On top of whichever guarantee the transport provides, the runner keeps a
**generation journal**
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
| `/b/:slug/identity` | 511, 543 | Not in the mission's four surfaces |
| `/b/:slug/guideline` | 514 | Not in the mission's four surfaces |
| `/b/:slug/tools` | 525 | Not in the mission's four surfaces |
| `/b/:slug/templates` | 535 | Not in the mission's four surfaces |
| `/b/:slug/content` | 546 | Not in the mission's four surfaces |
| `/b/:slug/folders` | 549 | Not in the mission's four surfaces |
| `/b/:slug/share` | 552 | Not in the mission's four surfaces |
| `/b/:slug/settings` | 555 | Not in the mission's four surfaces |
| `/b/:slug/editor` | 571 | Bare editor entry, superseded by `design/:designSlug` |
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
6. `hug`/`fill`/`fixed` honoured. **Oracle:** for each auto-layout frame, widen
   it by +200px and assert `layoutSizingHorizontal==='HUG'` children keep their
   width to the pixel, `'FILL'` children absorb the whole delta, padding is
   unchanged, and no child's `x` shifts by a scale factor. Then restore. This is
   spike 5, generalised.
7. **Every colour and every *bindable* numeric resolves to a variable or style.**
   The bindable set is enumerated, not implied: fills, strokes, `strokeWeight`,
   `cornerRadius` (each corner), `itemSpacing`, the four paddings, `opacity`,
   `width`/`height` where fixed. Properties Figma cannot bind — effect geometry,
   `letterSpacing`, `lineHeight` — are **out of scope for this assertion** and are
   covered by assertion 8 instead. A raw value in the bindable set fails unless it
   appears in `LOSSES.md` with a reason. *Unexplained raw values are rejected*;
   unbindable ones are not silently counted as failures.
8. Composite effects and type use effect/text styles.
9. Zero unnecessary wrapper frames. **Oracle:** a FRAME fails if it has exactly
   one child AND no visible fill, stroke or effect AND `cornerRadius === 0` AND
   all four paddings are 0 AND it is not a `COMPONENT_SET`, not a component root,
   and not the only clipping ancestor of its child.
10. Both `Light` and `Dark` modes resolve on every bound variable, and no
    variable has a mode whose value is unset.
11. Every renderer-owned node carries a `sid` and a `gen` stamp, and **no two
    renderer-owned nodes share a `sid`** (§9 — designer copies are reclassified
    rather than counted as violations).

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
