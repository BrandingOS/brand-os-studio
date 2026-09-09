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

---

## Material swatches in the picker (2026-09-09)

The material dropdown listed names only. It now carries a **rendered sphere** per
material, on the closed control and on every option.

**Why rendered rather than a colour chip.** Polished chrome, brushed aluminium
and textured silver are all "a light grey metal" by their colour values; what
separates them is entirely how they reflect and how their grain runs. A chip
cannot show that, so a chip would have made the user open all three. The swatches
go through the same `Studio`, the same materials and the same environment as the
viewport, which also means a material can never look one way in the picker and
another on the model. All twenty-four are drawn in one pass on one offscreen
canvas and cached for the tab — it is the WebGL context that is worth being
careful with, and this takes exactly one and gives it straight back.

**`DsSelect` gained an optional `icon` per option.** A leading visual in a select
option is an ordinary select capability, not a product concept, so it belongs in
the DS rather than in a forked listbox — the alternative was rebuilding the
outside-click handling and keyboard behaviour around a private copy.

Three things this turned up:

- **Glass rendered as a blank circle.** Transmission refracts what is *behind*
  the surface, and behind it was a transparent background. Transmissive presets
  now get a high-contrast gradient card to bend; a gentle one close to the
  glass's own tone gave a featureless pale disc that could have been ceramic.
- **The swatch was a square wherever the editor was not also mounted**, because
  the circular crop lives in the feature stylesheet and the component was relying
  on a neighbour to import it. It imports its own styles now.
- **A flat chip still renders first**, derived from the material's parameters,
  and is replaced when the sphere arrives. On a machine without WebGL that chip
  is what stays — a picker that is less informative, rather than one that is
  blank.

Tests: `__tests__/materialSwatch.browser.test.tsx` (9), including that the three
grey metals produce three *different* pictures, that no swatch is blank, and that
gold reads warmer than copper is red.

### Two pre-existing browser failures, checked rather than assumed

The full browser suite has two failures. Both were verified against a worktree at
`876f7950` — the commit before any of this feature existed:

- `_dev/toolbar-editor.browser.test.tsx` → *"Unable to find a label with the text
  of: Expand chart"* — **fails at the baseline too**. `ChartToolbar` uses a raw
  `aria-label` and no DS select, so the `DsSelect` change cannot reach it.
- `brand-kit/renderers/presentations.export.browser.test.tsx` → a 15s timeout in
  the full parallel run; **passes in isolation**. A load flake in a heavy
  rasterisation test, not a regression.

Neither is caused by this work, and neither is fixed by it.

---

## High-quality render — path tracing (2026-09-09)

The owner's judgement was *"materials are very weak"*, with an explicit licence:
*"or you can make option for High Resolution even if this will be heavy."*

That licence matters, because the weakness is not tunable. The rasterized
preview has three hard limits, and all three show on a mark made of clustered
shapes:

- **Nothing reflects anything else.** A metal ball reflects the environment map
  and never its neighbour, so a cluster reads as separate objects rather than one
  piece of cast metal.
- **No occlusion.** Light reaches the inside of a neck as easily as the top of a
  ball, so the crevices that give a solid its weight are simply absent.
- **Glass refracts once.** `transmission` is a screen-space approximation: no
  caustics, no dispersion, nothing seen through two surfaces.

Those are what rasterization *is*. The answer is to trace paths — which is also
exactly what the PRD's §12 already specifies without naming it: progressive
refinement, a quality setting, sample progress, a time estimate, pause and
cancellation.

**`three-gpu-pathtracer`** (MIT, WebGL2, on-device) is now wired behind a
**Render: Preview · High quality** control, with sample count, traced resolution,
live progress and a coarse time estimate. It is lazy-loaded; a build check
confirms neither it, `three-mesh-bvh`, nor Three.js itself reaches the entry
chunk.

Evidence: `proof/traced-silver.png`, `proof/traced-chrome.png`,
`proof/traced-glass-black.png` — the same mark, same materials, same
environment, traced. The balls reflect each other, the necks darken, and the
glass carries light through several surfaces.

### Four things this turned up

1. **A path tracer is lit only by what is in the scene.** With no environment and
   no emissive geometry it renders *black*, correctly — the studio's directional
   lights do not exist to it. This is why `environment.ts` paints a real
   environment rather than relying on lights, and there is a test asserting the
   scene always carries one.
2. **The tracer needs the raw equirectangular environment, not the PMREM one.**
   The rasterizer wants the prefiltered cube-UV texture with roughness baked into
   its mip chain; the tracer samples directions itself and, handed the
   prefiltered one, reads past the end of a lookup table and throws `Cannot read
   properties of undefined`. `Studio` now keeps both, and the tracer installs the
   raw one for the duration and puts it back.
3. **Cancelling deadlocked.** `cancel()` stopped the frame loop, and the promise
   was only ever settled from inside that loop — so the render stopped and the
   caller waited for ever. Found by a test that cancels after 300ms and requires
   the promise to settle within five seconds; the resolver is now held so
   `cancel` can settle it directly.
4. **Glass carries a `dispersion` value at all times.** The rasterizer ignores it
   and the tracer honours it, so one material description drives both and the
   rainbow fringing in the reference appears when — and only when — it can.

### The testing limitation, stated plainly

**These renders cannot be verified in CI.** Playwright's headless Chromium falls
back to SwiftShader, a software rasterizer: a sample takes **4.5 seconds** there
against **18 milliseconds** on the real GPU, so the same render is two hundred
times slower and a suite would never finish. Confirmed by asking the context —
headless reports `SwiftShader driver`, headed reports
`ANGLE Metal Renderer: Apple M1 Pro`.

So the suite is split honestly:

- **In CI** the traced cases skip, and what runs instead is the *refusal*:
  `pathTracingSupport` detects a software rasterizer and declines with a reason,
  because a render that would take hours is not a slow feature but a broken one.
  Two tests pass, five skip, in 1.2 seconds.
- **Headed**, on real hardware, all seven run and the screenshots above are the
  output:

  ```
  npx vitest run --project browser --browser.headless=false \
    src/features/tools/3d-logo-studio/__tests__/pathTraced.browser.test.tsx
  ```

Cancellation, progress monotonicity and the environment requirement are all
checked; only the *pictures* need hardware.

### Still not matched

The reference's glass close-ups show pronounced chromatic fringing that our
dispersion produces more subtly, and its silver has a photographed micro-texture
finer than the procedural grain. Both are tuning against the frames rather than
missing capability, and belong with Phase 7's material work.

---

## Automatic rotation (2026-09-09)

A **Motion** control: None · Turntable · Spin · Camera orbit · Float · Oscillate
· Pulse · Wobble, with speed, seconds-per-turn, axis and direction.

**The evaluator is a pure function of the timestamp, and that is the design.**
Nothing accumulates — there is no "advance by delta", no stored angle, no
dependence on how often it is called. It is what the PRD asks for twice
(*"evaluate animation at explicit timeline timestamps"*, *"preview and export
evaluate the same scene at the same timestamps, regardless of rendering speed"*),
and it is the only way a rendered video cannot drift from what the user watched:
a preview at sixty frames a second and an export writing one frame every four
seconds ask the same question and get the same answer. `animationTimeline()`
already returns the exact frame times an export will use, so Phase 10 has its
foundation rather than a spinning viewport to reverse-engineer.

**The pose is a delta, never written into the project.** Spinning a logo the user
has deliberately tilted keeps the tilt, and stopping leaves it exactly where they
put it — pinned by a browser test that fingerprints the resting frame, spins,
stops, and requires the pixels back. Persisting the rotation would also restart
the path tracer sixty times a second.

Details worth keeping:

- **A spin is deliberately un-eased.** Easing the phase of something that never
  returns to rest makes it speed up and slow down once per turn, which reads as a
  stutter. `ease` shapes the presets that *do* come back, and is applied to the
  phase rather than the output so the motion passes through the same poses and
  only the timing changes.
- **Turntable ignores the axis control** and is always upright. That is the
  difference between it and Spin, and the reason both exist.
- **Negative time wraps correctly.** `%` returns a negative remainder, which
  would put a discontinuity at every cycle boundary of a *reversed* animation —
  tested by walking six seconds of a reversed float and requiring no jump.
- **Camera orbit moves the viewer, not the object**, and is measured from the
  resting camera each frame rather than compounded, so stopping restores the view.
- **It holds still under `prefers-reduced-motion`**, which the PRD requires
  ("no mandatory automatic rotation"), and **while a high-quality render runs** —
  a path trace accumulates samples of one fixed frame, so a moving subject
  averages to a smear and every frame would restart the render.

Tests: `engine/__tests__/animation.test.ts` (29 — determinism, periodicity, loop
continuity, speed scaling, amplitude bounds, timeline exactness) and
`__tests__/motion.browser.test.tsx` (7 — it moves, speed changes how far,
stopping restores the frame, and it yields to a traced render).

One test bug found and worth recording: the first version captured its "at rest"
frame the moment the canvas was ready, which is *before* the geometry has been
built and drawn — so it compared an empty background against a rendered logo and
reported a failure of everything. It now waits for the picture to settle.

---

## "High quality does nothing" — it didn't (2026-09-09)

The owner was right, and the cause is worth recording because it is the same
mistake three times over.

**The path-trace effect was never in the committed `Viewport.tsx`** — not even in
`cb12ab14`, the commit whose message describes wiring it in. The patch that added
it matched anchors from an older version of the file, which had been rewritten in
the meantime by the concurrent camera-navigation work, and `str.replace` fails
*silently* when its anchor is absent. Type-checking passed, because the code
being added was self-contained and nothing referenced it. And the path-tracing
tests called `startPathTrace` **directly** rather than through the editor, so they
passed over a hole where the feature should have been.

Three habits come out of it, and they are now practice rather than intention:

1. **Verify every patch landed.** `grep -c` for the thing just inserted, in the
   same command that inserts it.
2. **Test the wiring, not only the unit.** `highQualityLive.browser.test.tsx`
   mounts the real editor, clicks the real control, and reads the canvas.
3. **A silent no-op is a failure.** An anchored replace that matches nothing has
   to be an error, not a shrug.

### And a second bug it was hiding

With the effect restored, High quality *still* would have looked broken:
`controls.addEventListener('change', draw)` calls `studio.render()` — the
**rasterized** frame — on every frame of an orbit or a zoom, painting straight
over the accumulated picture. Both renderers write to the same canvas, and the
raster was winning.

The fix is also the answer to *"I need it high quality even with zooming"*: while
the camera is moving, the trace is cancelled and the fast rasterized frame is
shown; when the gesture ends, tracing restarts from the new view. That is
precisely the PRD's *"reduced quality while the camera is moving, automatic
restoration when interaction stops"*. Navigation does not write to the document
until the gesture ends, so the restart is driven by an explicit epoch rather than
by a document change that may never come.

## Controlling the light (2026-09-09)

Four controls — **Direction**, **Height**, **Softness**, **Brightness** — plus a
Reset that hands the light back to the preset.

**They move the light in both renderers, and that is the whole design.** A traced
render is lit *only* by the environment; the rasterizer's directional lights do
not exist to it. A control wired to the light alone would have appeared to do
nothing the moment the user switched to high quality — the exact bug just fixed.
So the softbox in the environment map and the `DirectionalLight` are both derived
from the same four numbers.

### Which found that the environment map was upside down

Writing the test that the two agree turned up something worse than a disagreement.
Three samples an equirectangular map as

```
u = atan2(dir.z, dir.x) / 2π + 0.5     →  +Z, the camera's side, is u = 0.75
v = asin(dir.y) / π + 0.5              →  v = 1 is UP
```

The painter put the sky at **v = 0**. So every environment since it was written
has been vertically inverted — the bright sky under the object and the dark floor
above it — and the azimuth was ninety degrees out on top of that. Measured on a
glossy sphere, moving the light slid the highlight one way in the preview and the
*other* way in a traced render. After the fix the same measurement moves 0.40 →
0.65 rasterized and 0.50 → 0.67 traced: same direction, and an order of magnitude
larger.

`render/__tests__/environmentMapping.test.ts` reproduces `equirectUv` from
Three.js's own shader and asserts the sky is above the floor, that a light placed
overhead really is overhead, and that the brightest point of the map is where
`lightDirection` says the light is — for four azimuths. If Three.js ever changes
that mapping, these fail rather than the pictures quietly going wrong.

The proof images were re-rendered afterwards; the difference in `traced-silver.png`
is the whole point.
