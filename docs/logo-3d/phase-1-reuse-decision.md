# Phase 1 — Foundation: reuse decision & development baseline

**Status:** complete
**Date:** 2026-09-08
**Covers:** phases.md Phase 1 steps 1–5

---

## P1.2 — Evaluation of the GitHub candidate

**Repository:** [renatoworks/3dsvg](https://github.com/renatoworks/3dsvg)
**Pinned revision:** `424b26e8e9475936836581228d45f5aa1928e172` (2026-05-30, "Fix/feedback
request validation (#12)", 8 commits total)
**License:** MIT, at both the repo root and `packages/engine/` — compatible, attribution
only. Copyright Renato Costa.

### What it actually is

A monorepo publishing **`3dsvg`**, a ~1,600-line embeddable React widget
(`packages/engine/`) plus a Next.js marketing/demo site (`packages/web/`). Its public
API is a single component, `<SVG3D>`, configured entirely by flat props — `depth`,
`smoothness`, `material`, `rotationX/Y`, `animate`. It is an *embed*, not a studio.

| Engine file | LOC | What it holds |
|---|---:|---|
| `scene.tsx` | 654 | SVG parse, extrusion, lighting, animation loop — all inside React hooks |
| `controls.tsx` | 400 | pointer orbit / drag / zoom |
| `index.tsx` | 224 | the `<SVG3D>` component, lazy scene import, URL fetch |
| `types.ts` | 171 | the prop interface |
| `use-font.ts` | 119 | Google-font TTF fetch → opentype.js → SVG paths |
| `materials.ts` | 66 | 10 presets, 5 scalars each |

### Blocking findings

1. **It cannot run on BrandingOS's React.** `packages/engine/package.json` declares
   `peerDependencies: { react: ">=18", "@react-three/fiber": ">=9",
   "@react-three/drei": ">=10" }`. R3F 9 and drei 10 **require React 19**; the `react:
   ">=18"` range is wrong in the manifest but the transitive requirement is real. This
   repo is React `^18.3.1`. Adopting the package as published is not possible without
   downgrading it to R3F 8 / drei 9, which it does not support.
2. **There is no engine to reuse — only a component.** Every piece of geometry logic
   lives inside `useExtrudedGeometry`, a React hook in `scene.tsx`. The Tools platform's
   hard constraint (`src/features/tools/README.md`) is that engines are pure TypeScript
   with no React. Extracting the logic is a rewrite, not an adaptation.
3. **It does not have the geometry we are being asked for.** Measured against PRD §6–§9:

   | PRD requirement | In 3dsvg |
   |---|---|
   | Extrude | partial — depth only; bevel is auto-derived (`bevelScale = min(maxFlatDim*0.02, 1)`), so PRD's bevel size / depth / profile / segments are not exposed |
   | Flat | ✗ |
   | **Inflate** | ✗ — the hard problem, and the Phase 2 gate |
   | Revolve | ✗ |
   | Twist / Taper / modifier stack | ✗ |
   | Per-component selection, materials, transforms | ✗ — shapes are merged and share one material |
   | Full X/Y/Z transforms | ✗ — `rotationX`, `rotationY` only |
   | GLB export | ✗ |
   | Project document / persistence | ✗ |

4. **The materials are not a starting point of substance.** 10 presets × 5 scalars
   (`metalness`, `roughness`, `opacity`, `transparent`, `wireframe`), each one line. PRD
   §10 needs 24 presets over transmission, IOR, thickness, attenuation, clearcoat,
   anisotropy and iridescence. Copying `materialPresets` would save minutes and lock us
   into a shape that cannot express glass.
5. **Network behaviour conflicts with PRD §12** ("never silently upload… to an external
   service", all processing local). The audit found three egress points:
   - `use-font.ts` fetches TTFs from `fonts.gstatic.com` (text path only; the `svg` path
     does not touch it).
   - `index.tsx` will `fetch()` an SVG when `svg` is a URL.
   - `packages/web/src/lib/ffmpeg.ts` loads `@ffmpeg/core` from `cdn.jsdelivr.net`.

   None is malicious, and none is on the SVG→3D path itself, but all three would have to
   be removed or self-hosted. We already carry `@ffmpeg/ffmpeg` as a direct dependency,
   so the core can be served from our own origin.
6. **The stroke-to-outline routine is not production-grade.** `parseShapesFromSVG` offsets
   sampled points along the segment normal with no join handling, no caps, and no
   self-intersection resolution. PRD §4 promises "common strokes converted into
   outlines"; this would fail on any corner tighter than the stroke width.

### Not verified, and why

PRD §17 step 3 asks that its build and tests be run. **This was not done.** The repo ships
no test suite, and the React 19 peer requirement in finding 1 already forecloses adoption
of the package — a green build would not change the decision. Findings 1–6 were read
directly from the pinned source rather than inferred. Steps 5–9 of §17 (test the supplied
SVG, validate component preservation, video timing, GLB reimport, implement a modifier
through it) were likewise not attempted, because they are only meaningful for a candidate
we could adopt.

---

## P1.3 — Reuse decision

> **Do not adopt `3dsvg`. Build the BrandingOS engine on Three.js directly.**

This is exactly the fallback PRD §17 anticipates: *"If adaptation creates more complexity
than it saves, retain only useful algorithms and build the BrandingOS feature around
Three.js."* Adaptation cost here exceeds build cost, because the four things we would want
from it (inflate, revolve, the modifier stack, per-component editing) are the four things
it does not have, and the one thing it does have (extrude) is thirty lines of Three.js API.

### What we take — ideas, not files

No file is copied. Three observations are carried forward and re-implemented, credited
here:

1. **Skip full-viewBox background rectangles on import.** Illustrator and Figma exports
   routinely carry an artboard-sized `<rect>`; extruding it produces a slab with the logo
   embossed on it. `isViewBoxRect` compares the shape's bounding box against the viewBox
   within 1% tolerance. We adopt the *rule*, as an import diagnostic the user can override
   (PRD §4: "Unsupported features must never disappear silently") rather than a silent skip.
2. **`SVGLoader` + `SVGLoader.createShapes` is the right parse path** for fills, holes and
   fill rules. That is Three.js's own API, not their work; the finding is that it handles
   compound paths and `nonzero`/`evenodd` correctly enough to build on.
3. **Adaptive quality via a segment-count multiplier** driven by interaction state
   (`bevelSegments = round((3 + smoothness * 20) * qualityScale)`). The shape of that idea
   feeds PRD §12's interactive-preview requirement, though our version rebuilds at the
   modifier-stack level rather than per-geometry.

### Renderer decision: raw Three.js, **not** `@react-three/fiber`

Recorded here because it follows from the evaluation and constrains everything after it.

- R3F 9 needs React 19 (finding 1). R3F 8 would run on React 18, but pins us to a
  deprecated line for a tool we expect to maintain for years.
- R3F puts the scene graph inside React's reconciler. PRD §12 requires imperative frame
  control — adaptive quality during interaction, progressive refinement with pause and
  cancellation, tiled rendering, context-loss recovery. Those fight the reconciler.
- The Tools platform requires the engine to be React-free. Raw `three` has **no peer
  dependencies at all** (verified against npm: `three@0.185.1`), so it drops into React 18
  and into a Web Worker without argument.

`three` and `@types/three` are direct dependencies; everything under `render/` is
dynamically imported so no other route pays for them.

---

## P1.1 / P1.4 — Development baseline

Recorded so that anything failing later is attributable. Full output:
`scratchpad/baseline/baseline.txt`.

**Toolchain.** The machine's default `node` is v18.12.1 and cannot run the unit suite.
All commands for this feature use **Node 26.8.1 / npm 11.19.0** from
`/opt/homebrew/opt/node/bin`:

```bash
export PATH=/opt/homebrew/opt/node/bin:$PATH
```

| Check | Baseline result (before any 3D work) |
|---|---|
| `npm run typecheck:ci` | ✓ pass — 288 pre-existing errors against a 293 baseline, no new |
| `npm run lint` | ✓ 0 errors, 357 warnings (CLAUDE.md still says ~226 — the count has drifted; 0 errors is the gate) |
| `npx vitest run --project unit` | ✗ **1 failing** — 3961 passed / 1 failed / 1 skipped across 326 files |
| `npm run build` | ✓ built in 2.43s |

React `^18.3.1` · Vite `^5.4.19` · TypeScript `^5.8.3`.

### The one pre-existing failure, and what was done about it

`src/features/dev-product-map/__tests__/registry.test.ts` → *"every discovered route has
registry metadata"* failed on `/_dev/website-import`. That route landed in commit
`3a589b5a` (Website Brand Import, Gate 2) without its `dev-product-map/registry.ts` entry.
Unrelated to this feature — but it would have contaminated every later verification run, and
**it is the same trap `/tools/3d-logo-studio` will spring in Phase 3**, so it is recorded as
`R-PLT-04`.

One registry line was added (`dev-website-import`). The suite is green again; nothing else
was touched. Note that CLAUDE.md's "known clean-checkout failure"
(`recolorLogo.test.ts` → *keeps a curated brand palette intact*) now **passes** — that note
is stale.

### Compatibility probe (P1.4)

`three@0.185.1` + `@types/three@0.185.4` installed as a direct dependency / devDependency.
A throwaway probe (archived at `scratchpad/probes/svgloader.probe.test.ts`) ran in the
repo's own `unit` Vitest project and passed three assertions:

1. `SVGLoader` parses `Logomark-3d.svg` into **exactly nine shapes** — the R-IMP-18
   acceptance criterion, proven before a line of feature code exists.
2. Each shape's bounding box is 22.2 × 22.2 (the r=11.1 circle) with nine distinct centres,
   all inside the 113 × 113 viewBox — positions and proportions survive the parse.
3. `THREE.ExtrudeGeometry` turns a parsed shape into real geometry with the expected
   Z-extent (depth 4 + 2 × bevelThickness 1 = 6).

`typecheck:ci` and `build` both still pass with `three` installed. Nothing imports it yet, so
`dist/` is unchanged in size.

**Two findings from the probe that constrain later phases:**

- **`SVGLoader.createShapes()` is deprecated in three 0.185** — it warns on every call and
  points at `shapePath.toShapes()`. The reuse candidate uses the deprecated form. Our
  importer must use `toShapes()` (R-IMP-01).
- **`SVGLoader` needs a DOM** (`DOMParser` is `undefined` in Node 26; jsdom supplies it under
  Vitest). So SVG *parsing* cannot live in the pure `engine/` layer. The boundary is:
  `render/` (or an importer given a `Document`) turns SVG text into normalized path data;
  `engine/` consumes that data and never touches the DOM. This makes R-PLT-07 testable
  rather than aspirational.

---

## P1.5 — Fixture

The supplied import fixture is `archive/01-Logo/SVG/Logomark-3d.svg` — the BrandingOS
9-dot mark. Verified by reading it: **nine sibling `<path>` elements**, each a closed
circle of radius 11.1 drawn as cubic curves, inside a `113 × 113` viewBox, nested two
groups deep (`#Layer_1-2 > #Logomark`), no fill attribute (so they inherit black), no
strokes, no text, no raster, no masks or filters.

It exercises: multiple disconnected components (9), nested groups with no transforms,
implicit fill. It does **not** exercise holes, compound paths, strokes, transforms, or
live text — Phase 4 must add fixtures for those, per phases.md Phase 2 step 1.

The requirement traceability checklist is `requirements.md` in this folder.
