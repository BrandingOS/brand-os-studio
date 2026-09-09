# Matching the supplied reference

**Reference:** `archive/logo-3d/` — `logo.jpeg` (the mark) plus nine finished
renders of it.
**Date:** 2026-09-09

The reference is a different mark from the nine-dot fixture the PRD supplied: a
connected organic shape, made of **fat balls joined by thin necks**, rendered in
textured silver and in clear glass. The PRD anticipated this — *"This SVG differs
from the connected organic shape shown in the visual references"* — but the
consequence for the geometry was not drawn out until now, and it is a large one.

---

## What the reference actually is

Reading the frames rather than describing them:

| frame | what it shows |
|---|---|
| `WcWfj2…` | the whole mark, textured silver, flat white, near-orthographic — **this is the one to match** |
| `p9T1hg…`, `vvbkuX…` | macro close-ups: cast/hammered silver, and the smooth flare where a neck meets a ball |
| `erc2PB…`, `jrBVsl…`, `t6zZad…` | clear glass on black, with **chromatic dispersion and internal caustics** |

Two separate demands, and they need separate answers.

## 1. The geometry — now matched

**The gap.** Inflate and Sphere raise a surface from the distance to the
boundary using **one reach per component**. That is right for a shape with a
single characteristic width and wrong the moment it has two: given a mark of fat
balls and thin necks, the reach is measured from the balls and the necks come out
as fat as the balls. No amount of tuning fixes it — it is what the model says.

**The construction the reference is made of** is the **union of maximal inscribed
balls**. A 2D shape *is* the union of the discs that fit inside it; rotate each
disc about the plane and the union of those spheres is the solid. With no special
cases it gives a circle → a sphere, a stroke → a capsule round along its whole
length, and a junction → the organic flare where the two meet.

With `d(q)` the distance from an interior point to the boundary,

```
h(p)² = max over interior q of ( d(q)² − |p − q|² )
```

and that maximum is not searched for point by point. Negated it becomes
`min over q of ( |p − q|² + (−d(q)²) )` — a **generalized squared distance
transform**, which Felzenszwalb and Huttenlocher's lower-envelope algorithm
evaluates for every point in O(n), one pass along the rows and one along the
columns. The same routine computes `d` itself. Two linear passes over a grid, and
**no marching cubes**: the solid is symmetric about the plane and single-valued in
z, so it is a height field and the existing mesher raises it.

`engine/geom/ballUnion.ts`. Sphere mode now uses it.

**Tested against exact answers, not appearances:** a circle's height at its
centre is its radius and follows `√(R²−d²)` all the way out; a stroke's is its
half-width, round in cross-section along its length; a hole pushes the surface to
nothing; the field scales with the artwork over 250×. And the one that matters:
**a mark of a 40-unit ball with a 9-unit neck comes out 40 and 9**, the join
flares monotonically with no step over 4 units, and the single-reach model is
shown getting the same case wrong by more than 1.8×.

## 2. Two rendering defects the reference exposed

**The starbursts were not the material.** A ball of textured silver came out with
a radial star across it. Three things were tried and only the third was the
cause:

- *The roughness map.* Rebuilt as multi-octave value noise plus a real normal
  map. Improved the grain; the star stayed.
- *The environment.* `RoomEnvironment`, which Three.js ships, is a box with hard
  rectangular emissive panels — a mirror shows you the room, and a sphere
  reflects those panels as sharp shapes converging at the pole. Replaced with a
  **procedurally painted equirectangular studio** (`render/environment.ts`): a
  broad overhead softbox, a gentle fill, a gradient to the floor, in half-float
  so the sources stay brighter than white. Still no HDRI downloaded. Improved the
  look; the star stayed.
- **The mesh.** Untextured satin black on the same geometry showed the same
  crown, under the same lights. A round surface is **vertical at its
  silhouette** — that is what the silhouette of a sphere *is* — and the rim rings
  were spaced evenly in distance, so the first ring took one enormous step in
  height and the rest took tiny ones. Spacing them as `k²` inverts the `√` and
  makes the *height* steps uniform, which puts vertices where the surface
  actually turns. Nine rings over a four-spacing band.

The texture fix is kept regardless, and is worth recording: the mesh's UVs are a
flat projection of the artwork, so on a dome they stretch without bound towards
the silhouette. The grain is now sampled **triplanar in object space**, which has
no UVs to stretch.

**Cost was watched.** Nine rim rings on a doubled contour is nine times the work
on twice the vertices, and it pushed an extrusion test past its timeout. Rim
packing is now a caller's decision: Sphere and a full Inflate ask for nine, a
bevel's gentle ramp asks for three.

## 3. What still does not match, and what it would take

**Clear glass with dispersion and caustics — not achievable by rasterization.**
`erc2PB…` shows rainbow fringing at the edges and light focused through the body
onto itself. Those are multi-bounce refraction with wavelength-dependent IOR.
`MeshPhysicalMaterial.transmission` is a single-bounce screen-space
approximation: it can look like glass, and it cannot do either of those.

The right tool is a **progressive path tracer**, and the PRD already describes
one without naming it — §12's final render is *"progressive refinement,
user-selectable quality, sample progress, time estimate, pause and cancellation,
tiled rendering"*, which is a path tracer's feature list exactly.
`three-gpu-pathtracer` (MIT, WebGL2, built on three.js) does dispersion, caustics
and true depth of field, runs entirely on the device, and shares the scene the
preview already builds. It belongs in **Phase 8**, as the "final local render"
that requirement already reserves — the interactive preview stays rasterized.

**Overlapping subpaths are not yet a closed solid.** When two subpaths of one
component overlap — a disc with a bar drawn straight through it — their outlines
cross, and the mesher leaves a ring of unmatched edges there. It renders
correctly and it is not watertight, so a GLB of it would not be either.
Non-overlapping subpaths, holes and separate components are all closed. Several
sampler-side filters were tried and each traded this hole for a worse one; the
real fix is to resolve overlapping subpaths into one outline with a **polygon
boolean union** before sampling, scheduled with Phase 4's import work where
stroke outlining needs the same machinery. Recorded as a failing-by-design test
rather than deleted.

**A faint trace of the rim crown remains** on a large sphere at moderate quality.
It converges with more rings; nine is where it stops being visible at the sizes
tested.

## Honest summary

- The **geometry** of the reference is matched, and matched exactly rather than
  approximately — the invariants are volumes and widths, not appearances.
- The **textured silver** is close: soft cast metal, fine grain, correct
  environment. Not pixel-identical to a path-traced frame, and it is the same
  material family.
- The **glass** is not matched and cannot be until the path tracer lands. That is
  a scheduled piece of work with a named library, not an unknown.

Evidence: `proof/ref-*.png`, rendered through the product at its own defaults.
