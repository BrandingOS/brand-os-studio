# Setup pilot — quality gate

**Screen:** `10 — Setup` → `Setup — Desktop 1440 — Light`, node `101:2`, 1440 × 3093.
**Verified:** 2026-09-04, by read-back and screenshot in the same session.

Every "pass" below is a measurement, not an intention. Where the pilot does not
pass, it says so and says why.

| # | Gate item | Result | Evidence |
|---|---|---|---|
| 1 | REFERENCE and FINAL are separate and labelled | **PASS** | `35:2` renamed `REFERENCE — Code Capture — Not Final — Setup 1440 Light`, moved to page 98 with a plugin-data note. FINAL is `101:2` on page 10. |
| 2 | FINAL is not the capture tree | **PASS** | Built from the pattern layer; shares no node with `35:2`. |
| 3 | A semantic composition map exists | **PASS** | `SETUP-COMPOSITION-MAP.md`, written from 509 measured nodes. |
| 4 | Known reusable occurrences are instances | **PASS** | 105 instances across 12 components; every promotion in the map §2 that appears on the screen is an instance. |
| 5 | Zero detached instances | **PASS** | `detached: 0`. |
| 6 | Zero unresolved references | **PASS** | `missingInstances: 0`. |
| 7 | Every raw subtree justified | **PASS** | 185 own nodes: shell, board, board head, 7 section containers and their bodies — single-use structural grouping, listed in map §2. |
| 8 | Screen is a FRAME, not a component | **PASS** | `type: FRAME`. |
| 9 | Tokens resolve through variables | **PARTIAL** | 176 fills bound, 133 literal. The literals are alpha-composited values and shadow colours that no `--ds-*` token defines. |
| 10 | Light and Dark through variable modes | **PASS (structure)** | The collection carries both modes; a Dark screen frame is not built yet. |
| 11 | Auto-layout resizes correctly | **PARTIAL** | The board wraps and the sections stack. Two Figma/CSS mismatches were found and fixed (§Rules). Colour swatch rows and the typography example column still overflow their section. |
| 12 | Interactions are honest | **NOT STARTED** | No prototype reactions added; none are claimed. |
| 13 | Desktop and mobile are not scaled copies | **NOT STARTED** | Only 1440 exists. A 390 frame is a separate capture, not a resize. |
| 14 | Shipping defects documented, not fixed | **PASS** | Contract §11 lists five; none were repaired in the parity artifact. |
| 15 | Visual differences explained | **PASS** | §Known differences below. |
| 16 | Regeneration preserves designer work | **PASS (by construction)** | Deletion requires a sid this generator stamped; untagged nodes are never touched — exercised when page 04 was cleared and rebuilt. |
| 17 | Tracking documents match a same-cycle read-back | **PASS** | `PAGE-POPULATION.md` and `PROGRESS.md` rewritten from the read-back above. |
| 18 | Structural composition report from read-back | **PASS** | This table plus the counts below. |

**Verdict: 13 pass, 3 partial, 2 not started.** The architecture is proved: a
product screen can be assembled from the pattern layer with every reusable
occurrence connected and nothing detached. What remains is coverage (dark,
mobile, prototypes) and fidelity, not structure.

---

## Composition, read back

```
Setup — Desktop 1440 — Light   FRAME 1440 x 3093   613 nodes
  FRAME 263 · TEXT 118 · INSTANCE 105 · VECTOR 124 · GROUP 3

  instances       105   detached 0   unresolved 0
    workspace-topbar   1      colors-group        2
    segmented-nav      1      color-swatch        4
    section-rail       1      type-specimen-col   6
    rail-row           7      icon-tile          60
    brand-field        2      about-card          7
    section-add       11
    logo-tile          3

  own nodes       185   (57 frames, 18 text)
  fills bound     176   literal 133
```

## Rules the pilot forced out

1. **`flex-wrap` was captured and then ignored.** Setup's board is a wrapping row
   of full-width sections; without WRAP they were laid side by side and the
   screen collapsed into a narrow overlapping column.
2. **FILL means something different inside a WRAP container.** CSS `width: 100%`
   gives a child its own line; Figma's FILL children *share* a line and divide
   it — the seven sections came out 76px wide. A child that occupies a whole
   line is FIXED at its measured width.
3. **A variant override cannot be applied during the build phase.** The
   component is still loose components then; the SET carries the property and
   does not exist until combine.
4. **Never patch page state incrementally after a model change.** Doing so
   produced an inconsistent rail that had to be rebuilt from the plan.

## Known differences from the product

| # | Difference | Cause | Class |
|---|---|---|---|
| 1 | Icon tiles are empty | The product draws them with an icon FONT — no geometry to capture | limitation |
| 2 | Every rail row shows the same thumbnail | Needs an INSTANCE_SWAP property; a text override cannot carry artwork | modelling gap |
| 3 | Colour swatch rows overflow their section | The swatch row is authored wider than the section and clipped in CSS; Figma does not clip it | fidelity |
| 4 | The typography example column overflows | Same cause | fidelity |
| 5 | Section borders paint black | `color(srgb …)` is a modern CSS colour function the walker cannot parse | pipeline defect |
| 6 | No modal states | Deliberate — the closed modals are excluded; they are sibling state frames | scope |

## Not yet built

Dark screen frame · Mobile 390 frame · the four other screen states · prototype
reactions · pages 11, 12, 13, 90, 91, 99 · instances on pages 01–03.
