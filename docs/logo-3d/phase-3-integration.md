# Phase 3 — Integration into BrandingOS

**Status:** complete
**Date:** 2026-09-09
**Covers:** phases.md Phase 3 steps 1–5

> **Complete when:** the editor opens without a Brand, follows BrandingOS
> styling, and can mount/unmount without resource leaks. Unrelated pages do not
> load its heavy graphics modules.
>
> All four hold, and each is pinned by a test rather than asserted.

---

## What shipped

| | |
|---|---|
| Route | `/tools/3d-logo-studio` — public, anonymous, no Brand, no auth |
| Page | `src/pages/tools/3d-logo-studio.tsx` — `WorkspaceShell` + the editor, the same shape as `/tools/typescale` |
| Registry | `TOOL_REGISTRY['3d-logo-studio']` with SEO metadata; `ToolSlug` and `ToolFeature` extended |
| Product map | `dev-product-map/registry.ts` entry (R-PLT-04 — its absence fails an existing suite, exactly as it did for `/_dev/website-import` in Phase 1) |
| Document model | `engine/document.ts` + `engine/buildMesh.ts` — pure, serializable, 22 tests |
| Editor | `components/Studio3dEditor.tsx`, `Viewport.tsx`, `PropertiesPanel.tsx`, `ImportPanel.tsx` |
| Styling | `studio3d.css` — `--ds-*` tokens only, scoped `[data-workspace]`, app shell above 1100px |

## The document model

One serializable value describing a whole project, and pure operators over it.
The shape encodes two rules:

- **The original source is never discarded.** `source.svg` holds the file as
  supplied, so changing the modelling method or resetting never asks the user to
  upload again — which the PRD requires in §2.
- **Every operator returns a new document**, so undo, autosave and "did anything
  change?" are identity comparisons rather than deep diffs, and an interrupted
  save cannot leave half a state. Operators that change nothing return the *same
  object*, which is what makes that check meaningful.

**All four modes keep their settings at once.** Switching Extrude → Inflate →
Extrude returns the extrusion the user had. Swapping a single settings object
out would make every experiment cost them their work.

The modifier stack is in the schema already, empty, because *order is part of
the result* and therefore part of what a saved project must preserve.
Retrofitting it later means migrating every stored document.

## Lazy loading — measured, not assumed

This is the requirement that was quietly broken and then fixed, and the numbers
are the point:

| chunk | before | after |
|---|---:|---:|
| `3d-logo-studio` (the page) | **598 KB** | **43 KB** |
| `three.module` | — | 536 KB, its own chunk |
| `Viewport` | 4 KB | 11 KB |
| `svgImport` | — | 4 KB |
| entry chunk | no three | no three |

The page chunk was carrying the whole of Three.js — **downloaded by anyone who
opened the tool, before they had chosen a file.** The cause was one import:
`PropertiesPanel` read `LIGHTING_PRESETS` from `render/studio.ts`, the module
that owns the WebGL scene.

The fix is a layering one, not a hack. Lighting presets are *data*, like the
material registry, so they moved to `materials/lighting.ts`, which may never
import Three.js — asserted. Diagnostic wording moved out of `render/` for the
same reason: a module of strings living there is enough to drag the renderer
into the empty state.

**The boundary test missed it, and that is the more important defect.** Its
module walker followed `import … from` but not `export … from` — which is what a
barrel file is made of — so it stopped at `index.ts`, reached nothing, and every
assertion after it passed vacuously. There is now a test asserting the walker
actually leaves the barrel before the assertions that depend on it run. A guard
that silently stops guarding is worse than no guard.

## Architectural boundaries, enforced

`__tests__/boundaries.test.ts` (18 tests) reads the source and asserts what
documentation alone decays into:

- The engine imports no `react`, `react-dom`, `zustand` or `three`, and touches
  no `document`, `window`, `DOMParser`, `HTMLCanvasElement` or `navigator` — so
  it stays Worker-safe and Node-testable. Comments and string bodies are
  stripped first: scanning raw text for `document` matched the *word* in every
  doc comment on `Studio3dDocument`.
- The engine imports nothing from outside the feature except `delaunator` and
  `earcut`, both leaf libraries.
- Nothing imports `shared/services/export/vectorize/*` or `EditorWorkspace` (the
  frozen export pipeline), `@/components/ui/*` (frozen shadcn), the frozen
  shared wrappers, or `@/shared/design-system/`.
- `index.ts` statically reaches neither `three`, `render/` nor `export/`.
- `studio3d.css` contains no bare hex, `rgb()` or `hsl()`, and every rule is
  scoped `[data-workspace]`.
- No component renders a raw `<button>` or `<select>` — a DS primitive would
  have been bypassed.

`import type` is excluded from all of this deliberately: it is erased at build
time, pulls nothing into a chunk, and counting it flagged the editor for
importing a *type* from the module it is careful to load dynamically.

## Two rendering bugs found by the tests

Both would have shipped as "the viewport is sometimes blank", with no error.

1. **The renderer was created after the effect that draws had already run.** The
   draw effect depended on `[doc, mesh, lighting]`; the renderer was created by a
   different effect once the stage had been measured. On the pass where the size
   arrived, a fresh `Studio` was built and nothing ever asked it to paint.
2. **The whole renderer was rebuilt on every resize** — a WebGL context and a
   prefiltered environment, several times a drag — and the new one started
   blank for the same reason. It is now built once and `resize()`d, and the draw
   effect depends on the renderer's existence.

The stage is also measured **synchronously before the first paint** as well as
observed after it. Waiting on the `ResizeObserver` alone left the canvas at the
HTML default of 300×150 for a frame.

## The test that was passing for the wrong reason

The browser suite waited for a `<canvas>` to exist. But the `<canvas>` is in the
markup from the first render, so that wait proved only that React had run — the
canvas sat at 300×150 with no context behind it and the assertions passed.

It now waits for `canvas[data-ready]` *with a real width*, and then reads the
framebuffer. `drewSomething()` samples a **centred** window: reading from the
origin gets the bottom-left corner, which is background in any correctly framed
render, so the first version of that helper reported "nothing drawn" for a
perfectly good picture.

The leak test asks the same question properly. `canvas.getContext('webgl')` on an
idle canvas simply *makes* a context and passes, so twenty mount/unmount cycles
are followed by asking whether the twenty-first renderer actually put pixels on
screen. A browser caps live contexts at about sixteen; past that the page draws
nothing, silently.

## Tests

| | |
|---|---|
| `engine/__tests__/document.test.ts` | 22 — operators are pure, settings survive mode switches, reset keeps the source |
| `__tests__/boundaries.test.ts` | 18 — the architecture, enforced |
| `__tests__/studio3dPage.browser.test.tsx` | 11 — real Chromium: no Brand, three real grid columns, DS tokens resolving, controls reaching the geometry, no leaks, two editors at once |
| Feature total | **152 unit + 28 browser** |

## Known limitations, carried forward

1. **The left rail is a placeholder.** It is a named `.panel` with no contents;
   component selection, hide/show and lock are Phase 6.
2. **Nothing persists.** Reloading loses the project. IndexedDB storage and
   autosave are Phase 9 — `engine/document.ts` is already the value it will
   write.
3. **No undo.** `@/shared/history`'s `useUndoScope` wants a document store
   behind it, which lands with the modifier stack in Phase 6 (R-PLT-06).
4. **No camera interaction.** Orbit, pan and zoom are Phase 8; the viewport
   frames the object and holds still.
5. **No export UI.** The GLB exporter works and is tested, but nothing in the
   interface calls it yet — Phase 11.
6. **Rebuilds are synchronous on the main thread**, scheduled a frame late so the
   control that moved paints first. A stale result can never overwrite a newer
   one (a monotonic version check, the same rule the PRD sets for the modifier
   stack). Moving generation into a Worker is Phase 8's adaptive-quality work —
   the engine is already free of React and the DOM precisely so that it can.
7. **The tool is not listed in the public `/tools` directory yet.** The registry
   entry exists; the directory listing goes live in Phase 12 with the rest of
   public qualification (R-PLT-03).

## Next

Phase 4 — reliable SVG import: stroke outlining (R-IMP-07, the one import
capability still missing), the import preview with actionable diagnostics in the
UI, cancellation, and the fixture collection for angular logos, outlined
wordmarks, holes and narrow bridges.
