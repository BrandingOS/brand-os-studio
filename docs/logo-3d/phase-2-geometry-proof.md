# Phase 2 — Geometry and material proof

**Status:** complete
**Date:** 2026-09-08
**Covers:** phases.md Phase 2 steps 1–5
**Gate:** *"If inflation fails here, resolve it before building the complete interface."*

> **Inflation did not fail.** All four geometry modes generate correct, watertight
> geometry from the supplied fixture; the four benchmark materials render; and a GLB
> exported from that geometry reimports with all nine components intact.

Rendered evidence: `docs/logo-3d/proof/`. Automation:
`src/features/tools/3d-logo-studio/__tests__/geometryProof.browser.test.tsx` (17 tests, real
Chromium, real WebGL) and 110 unit tests beside the engine.

---

## What was built

The prototype is written as the real thing, in the real folder, because the shape it needed
was the shape the PRD specifies anyway. Nothing here is scaffolding to be thrown away.

```
src/features/tools/3d-logo-studio/
  engine/                      pure TypeScript — no React, no DOM, no Three.js
    types.ts                   Component (rings + fill rule), MeshData (typed arrays)
    geom/polygon.ts            area, winding, both fill rules, distance, resampling
    geom/segmentIndex.ts       uniform-grid accelerator for distance-to-boundary
    geom/surfaceSample.ts      the interior sampler Inflate and bevelled Extrude share
    geom/triangulate.ts        earcut caps, holes matched to their own outline
    geom/meshBuilder.ts        typed-array accumulation + area-weighted normals
    modes/inflate.ts           the hard one
    modes/extrude.ts           Extrude + Flat
    modes/revolve.ts           the lathe, with warnings
  render/                      needs a browser
    svgImport.ts               SVG → Component[] + diagnostics
    geometry.ts                MeshData → THREE.BufferGeometry, normalisation
    studio.ts                  scene, 6 lighting presets, backdrop, materials, framing
  materials/                   24 presets as data
  export/glb.ts                GLB, split per component, with declared fallbacks
  __fixtures__/logomark-3d.svg
```

## The inflation method, and why

The PRD insists inflation be *"real geometry generation, rather than a large extrusion
bevel"*. That is not a stylistic preference — a bevel is a fixed inward offset of the
outline, and the moment it exceeds half the width of any feature the offset curves cross
each other. Every logo with a hairline in it fails, and it fails as self-intersecting
garbage rather than as a mediocre result.

So height is a function of how far inside the shape a point is:

```
z(p) = thickness · profile( min(1, distance(p, boundary) / thickness) )
```

Well defined for any topology. A narrow bridge is close to the boundary on both sides so it
stays thin — which is what a real inflated object does. Holes push the surface down because
a hole *is* boundary, and they need no special case anywhere in the file. Disconnected
components never interact unless the user asks for `fused`.

**The distance is exact, not rasterized.** `SegmentIndex` buckets contour segments into a
uniform grid and searches outward in square rings, stopping when the next ring cannot beat
the best found. A unit test checks it against brute force at ~1,900 sample points and finds
zero disagreement past 1e-9, and it is measurably faster on a dense contour. Rasterizing
would have put the resolution of the silhouette at the mercy of a grid.

**The mesh triangulates the interior, not the outline.** Boundary points come from the
contours themselves so the silhouette is exact; interior points come from a hex packing;
Delaunay over the union is then clipped back to the shape. Front and back surfaces *share*
the rim vertices, so the solid is watertight by construction — pinned by a test that counts
how many edges are used by other than exactly two triangles, and requires zero.

Four things had to be got right, and each was a real defect first:

| Problem | Fix |
|---|---|
| Delaunay spans concavities, holes and the gaps between components | a triangle survives only if its centroid is inside the shape **and** it has no absurdly long edge — the centroid test alone lets a sliver hug a concave boundary, the edge test alone lets a flat triangle bridge a hole |
| A feature thinner than the sample spacing gets no interior at all, so it is a flat sheet | spacing halves until an interior appears. A 0.6-unit hairline in a 60-unit shape now inflates, watertight |
| Triangles made only of boundary vertices lie flat on the rim; front and back copies are coincident, giving doubled coplanar faces and edges used four times | graded inset rings hugging the contour, so essentially every triangle has an interior vertex to lift |
| One ring was not enough: fullness makes the surface climb towards half its height in the first fraction of a unit, and one step across that rise is a **visible scallop around every dome** | three rings at 0.45 / 1.05 / 1.85 × spacing — dense where the curvature is, sparse where the surface is nearly flat |

The last two were found by *looking at the render*, not by a failing assertion, which is the
argument for this phase existing at all. Both are now pinned by unit tests
(`leaves no flat facets on the rim`, `gives the rim a proper strip of geometry`).

**Height is absolute, not normalised per component.** An early version divided by each
component's own deepest point, so every piece peaked at full thickness however narrow it
was — a 3-unit bar and a 40-unit slab came out equally thick, and a wordmark's hairlines
would have inflated into tubes fatter than they are wide. Tying the profile's reach to
`thickness` makes the control mean something absolute and the result physical.

**The profile is two closed forms blended.** A superellipse `(1-(1-t)ⁿ)^(1/n)` runs from a
cone at n=1 through a true circular dome at n=2 to a taut pillow above — that is *fullness*.
Smoothstep has zero slope at both ends, so blending towards it rolls the rim under instead
of standing it up — that is *edge softness*. Blending rather than special-casing the rim
keeps the function monotonic and C¹, which matters because its derivative becomes the
surface normal. Both properties are tested across the whole parameter space.

## The other three modes

- **Extrude / Flat** — caps, wall, alignment (front/center/back), curve quality, optional
  caps. Hole walls flip with the winding so the inside of a counter shades correctly instead
  of going black. Wall vertices are deliberately *not* shared with the caps: sharing would
  average the two normals together and round off the very edge the user asked to be crisp.
- **The bevel is a height field over the cap**, driven by the same distance function, which
  is why it shares Inflate's sampler. A bevel wider than a thin stroke therefore rounds that
  stroke over completely instead of tearing it — tested with a 6-unit bevel on a 4-unit bar,
  which an inward offset cannot survive.
- **Revolve** — axis, pivot, offset, partial sweep with caps, segments. It returns
  `warnings`, not just a mesh: a profile straddling the axis folds through itself when swept,
  which the user may well want, so it is built *and* reported. An axis perpendicular to the
  artwork is genuinely undefined rather than merely ugly — every profile point sweeps within
  the plane it already lies in — so the axis is a 2D line and that case is documented rather
  than silently returning a flat annulus.

## SVG import

The fixture yields **exactly nine components** with zero diagnostics, each 22.2 units across
at nine distinct centres inside the 113×113 viewBox, with stable ids across re-imports.

Hole classification does **not** use Three.js's shape resolution — it goes through the
engine's own `classifyRings`, so the fill rule the file declares is what decides, and one
model of "what is solid" holds from import to export. `SVGLoader` is used only as a parser.

Diagnostics implemented and tested: live text · raster images · masks / filters / patterns /
clip paths by kind · external references (reported, never fetched) · scripts and event
handlers (stripped, and said so) · un-outlined strokes · full-artboard background rectangles
· degenerate paths · a complexity ceiling · unparseable files. Nothing is dropped silently.

Two bugs the tests caught: `xmlns="http://www.w3.org/2000/svg"` was being reported as an
external reference — i.e. *every SVG ever written* looked like it phoned home — and closed
sub-paths can arrive with the start point repeated more than once, leaving zero-length edges
that poison both vertex normals and the distance field.

## Materials and rendering

All 24 PRD presets exist as data and every one builds a usable material. The four the PRD
names as benchmarks were tuned against real renders:

| | Result |
|---|---|
| **Clear glass** | refracts, with legible caustics at the rim. Reviewed on white **and** black as required, and the two frames differ by more than 20 mean luma — if they matched, transmission would not be working |
| **Textured silver** | reads as real metal with a speckled micro-roughness |
| **Glossy black lacquer** | clean specular, correct rim light, no tessellation artefacts |
| **Satin black** | soft sheen, holds the bevel's shape |

Two things had to be fixed for glass:

1. **`thickness` is in world units, and geometry is normalised to 2 units across.** Presets
   were carrying logo-space values, so every glass was three times thicker than the whole
   object — which attenuates to flat opaque white. This is exactly why the first glass render
   came out looking like plastic. Every distance in the registry is now documented as being
   in the renderer's normalised space.
2. **Transmission refracts what is behind the surface**, and a flat background colour
   refracts to that same flat colour. Clear glass over plain white *is* white blobs. The
   studio grew a gradient cyclorama, which is what a real product studio puts behind glass
   and is independent of the reflected environment — which the PRD requires to be separately
   controllable.

The environment is Three.js's procedural `RoomEnvironment`, so metals and glass have
something to reflect **without downloading an HDRI**. Roughness textures are generated in a
canvas rather than shipped. Nothing in the render path touches the network.

## GLB export

Exports split by component, so a recipient opens **nine named, selectable objects** rather
than one merged blob, and vertices are re-indexed per component so the file is not nine
copies of the whole buffer. Verified by reimporting through `GLTFLoader`: correct magic and
version, nine meshes, nine distinct names, real positions, indices divisible by three,
normals present — and then *rendered*, because a well-formed file that draws nothing is not
a passing export.

`KHR_materials_transmission` is an extension, and a viewer without it shows an opaque white
blob where the glass was. Each preset declares its own `glbFallback`, and asking for
compatibility returns notes naming what was downgraded, so the UI can say it rather than the
user discovering it in another application.

## Resource release

A browser caps live WebGL contexts at about 16; without `forceContextLoss` on dispose the
17th canvas silently renders nothing. A test creates and disposes 24 studios and then proves
a 25th still draws.

## Measured

| | |
|---|---|
| Unit tests | 110, all green |
| Browser tests | 17, all green, real WebGL |
| Fixture → 9 components | ~5 ms |
| Inflate, 9 components, quality 0.6 | ~250 ms |
| Extrude with bevel, 9 components | ~800 ms |
| GLB export + reimport | < 500 ms |

## Known limitations, carried forward

1. **Strokes are not outlined yet.** `fill="none" stroke="…"` is reported, not converted.
   Proper stroke outlining needs joins, caps and self-intersection resolution — R-IMP-07,
   Phase 4.
2. **Revolve about the artwork normal is unsupported**, by design. Phase 5 owes it a UI
   message rather than a silent absence.
3. **`fused` mode measures against neighbours but does not weld them.** True solid fusion is
   a distinct operation (R-GEO-11, Phase 5); marching-cubes blobs remain deferred.
4. **The bevelled cap costs about 3× a flat one**, because it goes through the sampler.
   Acceptable at edit time; Phase 8's adaptive preview should drop `curveQuality` while the
   user is dragging.
5. **`inflateProfile`'s `smoothness` relaxation is uniform.** It cannot yet be scoped to a
   component or a region, which Phase 6's modifier stack will want.
6. **Rim normals are averaged across the seam.** Correct for a soft pillow, slightly soft for
   a crisp sticker edge. Splitting the normals there is a Phase 5 option, not a defect.

## Next

Phase 3 — mount it in BrandingOS: the feature boundary and its import-boundary test, the
`/tools/3d-logo-studio` route, the tool registry entry, the `dev-product-map` entry
(R-PLT-04 — its absence fails an existing suite), the DS-native shell, lazy loading proven
against a real build, and mount/unmount with no leaks.
