# Code Navigator (`/__architecture`)

A developer-only orientation tool with three peer views over one generated data
source.

| View | URL | Answers |
|---|---|---|
| **Diagram** (default) | `/__architecture/diagram` | How does the system connect and flow? |
| **Tree** | `/__architecture/tree` | What exists? |
| **Search** | `/__architecture/search` | Where is X? |

`/__architecture` is the entry point and opens the Diagram.

**Diagram** — a real node-and-edge architecture map, laid out automatically by
ELK. It starts at Level 1 (the application and its product areas) and drills
down on demand:

```
L1  BrandingOS → Public · Authentication · Onboarding · Dashboard ·
                 Brand Workspace (Studio) · … · Development
L2  expand an area   → the pages inside it
L3  expand a page    → Route · Component · Source
L4  "Technical detail" → Components · State · Services (opt-in)
```

Edges are typed, not uniform, and independently filterable: **route hierarchy**,
**navigation**, **redirect**, **imports**. Focus mode reduces the graph to one
node's neighbourhood — its ancestors, what points at it, and what it points at —
which is how you answer "where does this come from and where does it go?"

**Tree** — browse the product top-down. Real route nesting is preserved, so the
35 Studio pages hang off one `/b/:slug` branch instead of appearing as unrelated
flat records:

```
BRAND WORKSPACE (STUDIO)  36
  /b/:slug  [LAYOUT] 35
    Setup            /b/:slug/setup
    Brand Kit        /b/:slug/brand-kit
    Design           /b/:slug/design
      Brand Design Editor   /b/:slug/design/:designSlug
    Tools  5
```

**Search** — type what you know, get the rest:

```
Setup
  URL               /b/:slug/setup
  Component         BrandSetupPageV2
  Source            src/pages/b/[slug]/setup.tsx
  Route definition  src/App.tsx:415
```

Open it with the dev server running: <http://localhost:8080/__architecture>.
It is not linked from any product navigation — reach it by URL.

## The three views cannot diverge

Neither the Tree nor the Diagram is a second scanner or a registry. `tree.ts` and
`graph.ts` are **pure functions over the same `RouteNode[]`** the Search view
renders, and the graph takes its hierarchy from the tree, so nesting cannot
disagree between views. Areas come from `groups.ts` (the one small explicit
layer, and only for top-level product areas); every label, badge, count, nesting
level and edge below that is derived from route paths, component names and
metadata the generator already produced.

`graph.ts` contains **no route path at all**, and a test enforces that. Another
test asserts no module in the feature names any individual page, which is the
precise thing a per-route registry would require.

The divergence guards, in `__tests__/tree.test.ts` and `__tests__/graph.test.ts`:

- Diagram, Tree and Search reach an identical route set;
- every route appears exactly once, and every subtree count equals the routes it
  contains;
- every hierarchy edge the Diagram draws mirrors real path nesting.

Consequence: adding `<Route path="/b/:slug/campaigns" …>` makes "Campaigns"
appear under Brand Workspace in all three views, with its component and source
file, on the next reload. Removing it makes it vanish, along with every edge that
touched it. Tests simulate both.

### Tree derivation rules

- **Structure** is a per-area URL trie. Prefixes that own no route and have one
  child are collapsed, so `b` → `:slug` becomes a single `/b/:slug` level.
- **Leaf labels** come from the route (`deriveName` already resolved dynamic
  tails via the component, giving "Brand Design Editor" for
  `/b/:slug/design/:designSlug`).
- **Branch labels** come from the URL segment the branch owns — "Design",
  "Tools", "Case Study" — falling back to the raw prefix when that segment is
  dynamic (`/b/:slug`), because there is no meaningful word to use.
- **Badges** are all derived: `ROUTE` / `INDEX` / `LAYOUT` / `REDIRECT` from
  `kind`, `SPLAT` from a trailing `*`, `DEV` from the `import.meta.env.DEV`
  guard, `DYNAMIC` only when a route's **own** last segment is a parameter (or
  every route under `/b/:slug` would wear it and it would mean nothing), and
  `LEGACY` from two mechanical signals — the superseded `/dashboard/brand/*` URL
  space, and a source file under a `-alt/` folder. Classic (`/a/:slug`) is
  deliberately not badged legacy; it is a supported alternate UI and its area
  label already says so.

### Interaction model

Row click and chevron do different things, following VS Code:

- **Branch row** → expands/collapses, and selects if a route is mounted on it.
- **Leaf row** → selects only, opening the detail panel.
- **Leaf chevron** → opens the inline drill-down (Route / Component / Source /
  Defined in / Imports).

"Expanded" therefore means *children* on a branch and *technical detail* on a
leaf. Bulk operations only ever open structure — `branchNodeIds()` exists for
exactly this, and default expansion never includes a leaf. Getting this wrong
floods the tree with metadata rows and destroys the shape the view exists to
show; there is a test for it.

Imports are collapsed behind a disclosure in both the tree drill-down and the
detail panel. A page can pull in 20+ modules and the four facts above them are
what the tool is for.

**Search → Tree hand-off:** "Show in Tree" in the detail panel expands the
route's ancestors, switches view, scrolls to the row and tints it briefly.
Going the other way, "Search related" seeds a query from the page's name, which
surfaces its namespace twin and anything importing it.

## Not the same thing as `/_dev/product-map`

Two tools, deliberately separate, because they answer questions for different
people:

| | `/_dev/product-map` | `/__architecture` |
|---|---|---|
| Audience | Product owner | Engineer |
| Question | "What surfaces exist, and should this one still exist?" | "Where does this page live in the code?" |
| Data | Human-curated registry (descriptions, keep/remove decisions, duplicate groups) | 100% generated from the router AST |
| Covers | Routed pages **plus** tabs, modals, panels | Routed pages only |

They share no code. Instead, `__tests__/realRouter.test.ts` cross-checks the two
independent parsers against each other — see "How staleness is prevented" below.

## How it works

```
src/App.tsx ──parse AST──┐
                         ├──> route + component + source file ──> JSON ──> UI
{logoMakerFlowRoutes} ───┘
   (import followed)
```

1. **`generator/parseRouter.node.ts`** parses a router file with the TypeScript
   compiler API and extracts every `<Route>`: composed path, the component inside
   `element={…}` (unwrapping `ProtectedRoute` and any providers), the line number,
   `import.meta.env.DEV` guards, and `<Navigate>` targets.
2. It also collects **bindings** — `const X = lazy(() => import('./pages/y'))`,
   default imports, named imports — which is how a component name becomes a file
   path. This is the link the whole tool exists to provide.
3. **`generator/buildMap.node.ts`** resolves those specifiers to real files,
   follows imported route fragments (through barrel re-exports), derives human
   names and product groups, and returns an `ArchitectureMap`.
4. The **Vite plugin** in `vite.config.ts` (`architecture-map`) serves that at
   `GET /__architecture-map.json`, regenerated on every request.
5. **`ui/ArchitectureExplorer.tsx`** renders search + groups + detail.

### Why generate per request instead of committing a JSON file

A committed artifact is a second copy of the truth, and second copies drift. With
per-request generation there is nothing to regenerate and nothing to forget: edit
a route, reload the page, see the change.

## How staleness is prevented

The *data* can't go stale, but the *generator* could silently start missing
things. Four layers guard that, all in `__tests__/`:

1. **Cross-check against an independent parser.** `realRouter.test.ts` runs
   `features/dev-product-map/discovery.ts` — a text scanner written for the other
   tool, sharing no code with this one — and asserts both find exactly the same
   set of routes. Two unrelated implementations agreeing is much stronger evidence
   than either being self-consistent.
2. **Every `sourceFile` must exist on disk.** Catches a page that was moved or
   renamed without the router being updated.
3. **Every route must resolve** to a component and a source file, and every
   `routeLine` must be within its file. Catches a new routing pattern the parser
   doesn't understand — it fails loudly instead of dropping the route.
4. **Zero generator warnings.** Anything the generator couldn't figure out is
   surfaced in the UI *and* fails the test run.

Plus `parseRouter.test.ts` covers each routing pattern in isolation, so a pattern
stays covered even if the real router stops using it.

## Production safety

The tool must add nothing to the production bundle. Three mechanisms, each
asserted in `__tests__/devOnly.test.ts`:

1. **The route is DEV-gated** in `App.tsx`, *including the `lazy()` call*:
   ```ts
   const DevArchitecturePage = import.meta.env.DEV
     ? lazy(() => import("./pages/__architecture"))
     : null;
   ```
   The ternary matters. Guarding only the `<Route>` leaves the dynamic import
   reachable and Rollup still emits a chunk — verified against a real build.
2. **The endpoint is `apply: 'serve'`**, so it cannot exist in a build or preview.
3. **No browser module imports the generator.** Node-only modules use a
   `.node.ts` suffix and a loud header. If one were imported from browser code it
   would pull the TypeScript compiler and router source text into the app.

Verified empirically after `npm run build`: no `__architecture` chunk is emitted,
and `ArchitectureExplorer` / `architecture-map` / `buildArchitectureMap` appear
nowhere in `dist/`.

> **Pre-existing, unrelated:** `/_dev/product-map` reads router source via
> `import.meta.glob('/src/App.tsx', { query: '?raw' })`. That is compile-time, so
> the full text of `App.tsx` — comments included — currently ships in the
> production bundle. Not introduced by this tool and out of scope for it, but
> worth fixing separately.

## Extending it

`types.ts` → `NodeAnalysis` is the extension slot. Today it carries one field,
`imports` (direct imports of the page file, bucketed by layer), produced by
`generator/scanImports.node.ts`.

To add a scanner — hooks, stores, services, API calls, Supabase tables, reverse
dependencies, impact analysis:

1. add a module beside `scanImports.node.ts`;
2. add **one optional field** to `NodeAnalysis`;
3. populate it in `buildMap.node.ts`;
4. render it in `ui/RouteDetail.tsx`.

Optional fields mean no existing consumer changes shape. Don't grow
`scanImports` into all of them, and don't make the level-1 import scan transitive
— a full dependency graph is a different tool with different performance and UI
needs.

### Relationship types, and what counts as evidence

| Kind | Derived from | Notes |
|---|---|---|
| `hierarchy` | Path nesting, via the tree | Always provable |
| `redirect` | The redirect component's own `<Navigate to=…>` | Template targets are reconstructed (`` `/a/${slug}/setup` `` → `/a/:slug/setup`); a computed target yields **no edge** |
| `navigation` | `<Link>` / `<NavLink>` / `<Navigate>` / `navigate()` in a page's own source | Resolved against the real route set; **exactly one** match required |
| `import` | Level-1 imports of the page file | Off by default |

**Route availability and user navigation are different things**, and the model
keeps them apart:

- Only literal strings and template literals are read. `navigate(next)` produces
  nothing rather than a guess.
- A target becomes an edge only when it resolves to **exactly one** route. Zero or
  ambiguous matches stay unresolved and are reported as such.
- Two routes existing is never evidence of a flow between them.
- A route whose component is declared *inside* `App.tsx` (the redirect helpers)
  does not inherit the router file's navigation. Scanning App.tsx as "its source"
  once attributed every `<Navigate>` in the file to every such route — an invented
  relationship, and the reason for the explicit guard in `buildMap.node.ts`.

Every navigation edge carries `evidence: 'static-source'`. That field is the seam
for adding **runtime-observed flows** (Playwright traces, analytics) later as a
second evidence source: the model, the graph and the UI already carry it through,
so a future source only has to populate `NavigationRef` and can be styled by
confidence.

### Evaluation: React Flow + elkjs — adopted, dev-only

Assessed as the requirement asked, and adopted.

- **React Flow (`@xyflow/react`)** gives pan/zoom, a minimap, custom node
  rendering and edge markers for free, and its custom-node API means our nodes are
  plain React with `--ds-*` tokens rather than canvas drawing.
- **elkjs** (`elk.layered`, a Sugiyama-style layered algorithm) assigns nodes to
  layers by edge direction and then minimizes crossings. That is exactly the
  hierarchy-plus-cross-links shape here, and it is the reason **no node position is
  ever written by hand** — add a route and the diagram reorganizes itself.
- **Cost is the usual objection, and it doesn't apply.** elkjs is a large
  GWT-compiled bundle. Both libraries are **devDependencies**, the route and its
  chunk are behind `import.meta.env.DEV`, and elkjs is imported dynamically inside
  the view. A production install without dev dependencies would fail loudly if
  product code ever imported them, rather than quietly shipping a layout engine.
  Verified against a real build: no React Flow, no elkjs, no diagram code and no
  React Flow CSS anywhere in `dist/`.

Layout is tuned for readability over compactness: `LAYER_SWEEP` crossing
minimization, `NETWORK_SIMPLEX` placement, orthogonal edge routing, generous layer
spacing. Left→Right is the default direction because a hierarchy fans out wide and
a landscape viewport has height to spare — eleven areas side by side force a ~0.35
zoom, the same eleven stacked read at full size.

### Evaluation: `dependency-cruiser` — not adopted (for now)

Assessed as the requirement asked. **Recommendation: don't add it yet.**

- **What we needed, it doesn't do.** The core job was route → component → *source
  file*, which lives in the router's own binding declarations.
  `dependency-cruiser` maps module-to-module edges; it has no concept of a
  `<Route>`, so it could not have produced the primary data at all.
- **What it does well, we don't need yet.** Its strengths are transitive graphs,
  cycle detection, and architectural rule enforcement (`forbidden` rules). Cycles
  are already covered by `npm run deps:cycles` (madge, via `npx`, no dependency),
  and the layering rules in CLAUDE.md are currently enforced by review.
- **Cost.** A dependency, a config file, and a second module-resolution model to
  keep in sync with Vite's aliases — for capability we aren't shipping.

**Revisit when** we actually want reverse dependencies ("what else imports this
page?") or impact analysis ("what breaks if I change this?") — those genuinely
need a whole-project graph, and that's the point to compare `dependency-cruiser`
against extending `scanImports.node.ts`. The `NodeAnalysis` slot means adopting
it later changes no consumer.

## Files

| Path | Role |
|---|---|
| `types.ts` | Data contract (browser-safe) |
| `groups.ts` | URL → product area rules |
| `naming.ts` | URL/component → human name |
| `search.ts` | Search + ranking |
| `tree.ts` | Pure tree derivation + badge rules |
| `graph.ts` | Pure graph projection: nodes, typed edges, disclosure levels, focus |
| `views.ts` | The three views and their URLs |
| `useArchitectureMap.ts` | Fetches the generated map |
| `generator/parseRouter.node.ts` | TypeScript-AST route extraction |
| `generator/resolveModule.node.ts` | Import specifier → file path |
| `generator/scanImports.node.ts` | Level-1 dependency scan (shared page parse) |
| `generator/scanNavigation.node.ts` | Navigation targets + route resolution |
| `generator/buildMap.node.ts` | Orchestrator |
| `ui/ArchitectureExplorer.tsx` | Shell: view switch, selection, detail panel |
| `ui/ArchitectureDiagram.tsx` | Diagram view (React Flow) |
| `ui/elkLayout.ts` | ELK auto-layout (dynamic import) |
| `ui/relationStyle.ts` | Edge styling shared with the legend |
| `ui/ArchitectureTree.tsx` | Tree view |
| `ui/SearchView.tsx` | Search view |
| `ui/RouteDetail.tsx` | Detail panel (shared by both views) |
| `ui/openInEditor.ts` | Vite `/__open-in-editor` bridge |
| `src/pages/__architecture.tsx` | Route page (DEV-only) |
