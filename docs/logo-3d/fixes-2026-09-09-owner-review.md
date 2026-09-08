# Owner review, 2026-09-09 — four defects, and what they say about the tests

The owner opened `/tools/3d-logo-studio` and reported four things. All four were
real, all four are fixed, and each is now pinned by a test that would have caught
it.

---

## 1. Extrude produced an open shell, not a solid

**What was seen:** the discs looked hollowed out — caps missing, a curl of wall,
and you could see straight through into the inside.

**Cause.** The caps and the wall each decided their winding *independently*, and
each guessed it from the source file. `earcut` emits triangles wound the same way
as the ring it is given, so the caps' orientation was whatever direction the
artist's vector editor happened to draw in; the wall, meanwhile, branched on
`ringArea(ring) > 0`. On this fixture the two disagreed, so the solid's faces
pointed inward. With `THREE.FrontSide` culling that is exactly "the caps have
vanished".

**Fix.** Orientation is now *canonical* rather than guessed:
`canonicalRings()` re-orients outer rings counter-clockwise and holes clockwise
before anything is built, and both the caps and the wall read that. A second bug
surfaced immediately and is worth recording, because it is the same mistake one
level down: with rings canonically oriented, walking them with one formula
*already* gives outlines an outward wall and holes an inward one — so the
surviving `if (isHole)` branch flipped a second time and cancelled out. A holed
extrusion enclosed 18,666 units where it should have enclosed 16,000.

**The test that was missing.** The old suite checked positions, depths, group
counts and hole placement — every one of which a mesh with inside-out walls
passes. `engine/__tests__/solidity.test.ts` now applies the divergence theorem:
for a closed surface `Σ a·(b×c)/6` is the enclosed volume, signed by the winding.
One number answers three questions at once — is it closed, is it consistently
wound, and is it the right size — and it is checked against the analytic volume
for discs, squares, annuli, every alignment, bevels, and nine components at once,
**for both a clockwise and a counter-clockwise source file**, so it cannot pass
by luck.

It also fixed the engine's convention in writing: engine space is the artwork's
own Y-down frame, so a correct solid has a *negative* signed volume, and the
renderer flips Y and the winding together. Extrude and Inflate had silently
disagreed about that.

## 2. It opened at an angle, and the logo looked stretched

**What was seen:** a three-quarter opening view; the outer discs read as
ellipses.

**Cause.** `DEFAULT_CAMERA` was `[1.1, 1.0, 3.2]` at a 35° field of view — a
conventional 3D-scene default, and wrong for this. A logo is flat artwork, and
the first thing anyone wants is to see that it still reads as itself. A wide lens
on an object filling the frame also throws the outer parts into real perspective
distortion, which the eye reads as stretching rather than as depth.

**Fix.** Front-on at 28°, plus a **View** control (Front · 3/4 · Side · Top).
`setCameraView` keeps the current distance and lens, and `currentCameraView`
reports which preset is active so the control reflects reality.

Pinned two ways: a unit test that the default is front and the lens is ≤ 30°, and
a browser test that measures the drawn object's bounding box in the framebuffer
and requires it to be as wide as it is tall to within 7% — the nine-dot mark is a
ring of identical discs, so anything else is distortion.

## 3. Nine identical warning banners

**What was seen:** the same sentence nine times, pushing the artwork off screen.

**Cause.** Warnings were mapped one-to-one from components. A warning is about a
*setting*, not about a shape.

**Fix.** `summariseWarnings` collapses one message per kind and names how many
parts it affects ("9 parts of this logo cross the axis…"). It also says what to
change, not only what went wrong.

## 4. Revolve behaved badly

**Cause, and it was the same cause as the banner spam.** The axis was measured
against each component's own bounding box, so a nine-part mark revolved into nine
unrelated tori — and the default pivot of 0.5 put the axis through the middle of
every one of them, which is why every component reported a crossing.

**Fix.** One axis for the whole logo, measured across the overall bounds, so the
parts stay in relation to each other and the result is a single coherent lathe.
The default pivot is now `0` — at the edge, where nothing straddles it, so the
default greets the user with no warnings at all. The perpendicular was also
flipped so that `pivot` grows left-to-right: the two directions are
geometrically equivalent, but the old one made pivot 0 mean the *far* edge, which
is not what a slider labelled "Pivot" should do.

---

## What changed in how this is tested

The through-line in all four is that the tests checked *properties of the output*
without ever checking that the output was **correct as a solid** or **correct as a
picture**. Three habits came out of it:

1. **Assert an invariant, not a symptom.** Signed volume against the analytic
   answer catches a whole class of winding, closure and scale bugs at once.
2. **Test both windings, both fill rules.** Anything that reads a property of the
   input file has to be tested with that property inverted, or it passes by luck
   on one fixture.
3. **Look at the render.** The proof images are now taken at the product's own
   default camera rather than a flattering angle, and there are three-quarter
   views for the modes whose depth does not read front-on.

Evidence: `docs/logo-3d/proof/`. New tests: `engine/__tests__/solidity.test.ts`
(15), `components/__tests__/warnings.test.ts` (5), plus camera-view and
"what the user sees first" cases in the existing suites.

---

# Second pass — what I found by looking rather than asking

The owner reported "still issues". Rather than ask them to enumerate, I rendered
a **visual sweep**: every mode, across its settings range, front / three-quarter
/ side, at the product's own defaults
(`__tests__/visualSweep.browser.test.tsx`, screenshots in `proof/sweep-*.png`).
Two defects fell straight out of it, and one of them was in every single frame.

## 5. Perspective was distorting the mark — in every mode

**What the sweep showed.** In the three-quarter views of both Inflate and
Extrude, the right-hand discs rendered **visibly larger** than the left-hand
ones, and each disc was seen at its own slightly different angle. The nine dots
of the mark are identical by construction; nothing about the render should make
them differ.

**Cause.** A perspective camera framed to fill the viewport sits close: at a 28°
field of view the camera ends up about 5 units from a 2-unit object, so the near
edge is ~48% larger than the far edge. That is textbook perspective and
completely wrong for this job. A logo is a flat document, and every design tool
displays a document orthographically for exactly this reason.

It is also the real content of the original "looks stretched, not 3D" report —
fixing the default *angle* helped, but the distortion was the projection, not
the angle.

**Fix.** `Studio` now supports both cameras, and **orthographic is the default**.
`frame()` handles both: for orthographic the frustum does the framing and the
distance only has to clear the object. Perspective stays one click away under a
**Projection** control (Normal · Perspective), and when chosen it uses a 20°
lens — a short telephoto — so that picking it flatters the object instead of
bending it.

**The test that encodes it.** `blobAreas()` flood-fills the framebuffer and
returns the area of every separate drawn shape. Nine identical dots must occupy
nine identical areas: the suite requires `max/min < 1.06`. Perspective moved it
by nearly fifty percent, so this is not a threshold tuned to today's output — it
is the difference between "the logo reads as itself" and not.

## 6. Every default was in absolute artwork units

**Found while checking the side profiles**, not reported — but it would have
been the very next thing to go wrong.

`DEFAULT_INFLATE.thickness` was `6`. The supplied fixture has a 113-unit
viewBox, so that is 5% of the logo and looks right. The same logo exported from
Illustrator at 1024 units would have opened at 0.6% — visually flat — and the
reasonable conclusion would have been that the tool was broken, not that a
slider needed hunting for. Extrude's depth, and every slider *range* in the
panel, had the same problem: a depth slider topping out at 60 crosses half a
113-unit logo and is a rounding error on a 4096-unit one.

**Fix.** `defaultGeometryFor(components)` resolves thickness and depth as a
fraction of the logo's longest side, once, at document creation — so the stored
values stay real numbers in the artwork's own units and remain editable as such.
The panel derives its slider ranges and steps the same way. Both round through
`toPrecision(2)`, because `39 * 0.1` is `3.9000000000000004` and a slider whose
step is that is a slider that shows it.

Pinned by a test that scales the fixture ten times and requires the resulting
geometry to be **proportionally identical** — same relief-to-width ratio at any
scale.

## Two of my own tests were measuring the wrong thing

Both surfaced once the projection changed, and both were mine:

- *"extrude produces a solid with a visible wall"* counted distinct colours in a
  front-on orthographic view of a cylinder — which shows only its flat cap, and
  is legitimately one flat colour. It proves the wall now by looking at it from
  three-quarters.
- *"clear glass on white and on black"* used the same colour-bucket count on a
  near-black scene, where 5-bit quantisation collapses it. It uses luma *range*
  now, which survives quantisation. The assertion that actually matters — that
  the two frames differ by more than 20 mean luma, i.e. that transmission is
  working — was passing throughout.

## Where this leaves the tool

Verified: 186 unit + 50 browser tests in the feature; full suite **4148
passing**, typecheck clean, lint 0 errors, build green.

Still missing, and still owed to later phases: stroke outlining (Phase 4),
per-component selection and materials (Phase 6), camera orbit and progressive
rendering (Phase 8), persistence and undo (Phase 9), animation (Phase 10), and
the export UI (Phase 11 — the GLB exporter works and is tested, but nothing in
the interface calls it).
