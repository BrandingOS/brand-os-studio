# Code Navigator (`/__architecture`)

A developer-only orientation tool. You know one thing about a page — its name in
the product, its URL, its component, or a file path from a grep — and it gives
you the other three.

```
Setup
  URL               /b/:slug/setup
  Component         BrandSetupPageV2
  Source            src/pages/b/[slug]/setup.tsx
  Route definition  src/App.tsx:415
```

Open it with the dev server running: <http://localhost:8080/__architecture>.
It is not linked from any product navigation — reach it by URL.

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
| `useArchitectureMap.ts` | Fetches the generated map |
| `generator/parseRouter.node.ts` | TypeScript-AST route extraction |
| `generator/resolveModule.node.ts` | Import specifier → file path |
| `generator/scanImports.node.ts` | Level-1 dependency scan |
| `generator/buildMap.node.ts` | Orchestrator |
| `ui/ArchitectureExplorer.tsx` | Search + list |
| `ui/RouteDetail.tsx` | Detail panel |
| `ui/openInEditor.ts` | Vite `/__open-in-editor` bridge |
| `src/pages/__architecture.tsx` | Route page (DEV-only) |
