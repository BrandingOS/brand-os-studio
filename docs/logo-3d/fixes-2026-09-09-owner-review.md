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
