# Code → Figma — progress

**Branch:** `feat/code-to-figma` · **File:** `ZTR7jwR1cvjYvs0N9kuHCX`
**Last verified against a live read-back:** 2026-09-04.

Read `FIGMA-ARCHITECTURE-CONTRACT.md` first — it defines what belongs where and
what each claim below is a claim *about*. `PAGE-POPULATION.md` is the read-back;
this file is what has been built and what is known to be wrong.

---

## Where this stands

| Layer | State |
|---|---|
| Pipeline (manifest → capture → IR → plan → walker → Figma) | working, 83 unit tests |
| **01 Foundations** — tokens as variables + styles | built (31 colour variables, Light/Dark; 15 floats; 4 text, 4 effect styles) |
| **02 Icons** | 7 components built; **no specimen board** |
| **03 Components** — `src/shared/ds/*` | 20 built (15 sets + 5 components); **0 instances anywhere** |
| **04 Product Patterns** — `workspace.css` vocabulary | **complete: 14 patterns, 10 connected instances, 0 detached** |
| **10 Setup** — the pilot screen | **empty. This is the next deliverable.** |
| 98 Visual Parity | the Code-to-Canvas capture, relabelled `REFERENCE — Code Capture — Not Final` |
| 11–13, 90, 91, 99 | not started |

## The finding that reshaped the plan

The plan was to assemble Setup from the twenty components on page 03. Measured
against the rendered screen that fails: of 509 semantically-classed nodes, **8
are DS components**, plus 2 more inside a closed modal. The other 92 signatures
are all defined in `src/shared/styles/workspace.css` and shared with Brand Kit
and Guideline.

So the file has **two shared layers**, matching what the product actually has
and what CLAUDE.md already states: page 03 from `src/shared/ds/*`, page 04 from
`workspace.css`. A file modelling only page 03 would describe ~1.6% of the
screen and leave the rest as raw frames — the component-zoo failure reached from
the opposite direction. Evidence: `SETUP-COMPOSITION-MAP.md`.

---

## Defects found and fixed in this pass

Each was found by reading back or looking at what was produced, not by
inspecting the code that produced it.

| # | Defect | Why it mattered |
|---|---|---|
| 1 | `dedupeVariants` deleted `disabled` from the toggles | The product paints a disabled toggle like an enabled one — an a11y defect the pipeline then HID by removing the state. Nothing is deleted now; identical measurements are reported. |
| 2 | Every chunk after the first bound NO variables | `varByName` came only from `plan.collections`, which only chunk 1 carries. Components looked right and were silently disconnected from the token system. |
| 3 | Compaction dropped every instance `ref` | Composed patterns became hollow frames with no error anywhere. An invariant now compares the reference count before and after. |
| 4 | The logo was a rect around a dropped `<image>` | `createNodeFromSvg` does not resolve a nested image, so the 9-dot mark was a solid block. |
| 5 | An absolute container had no size, and its children no place | Eleven patterns were Figma's 100×100 default with every child stacked at the origin. |
| 6 | A measured width meant nothing to a frame that hugs | `section-add` hugged its 15px icon instead of being the 30px square it ships as. |
| 7 | Text was given a fixed width | "BrandingOS" clipped to "Brandin"; "Rebrand with AI" wrapped and lost a line. A label hugs unless the source actually wrapped. |
| 8 | A transparent border painted opaque black | CSS reserves border space with a transparent colour; every rail row was ringed in a border the product does not draw. |
| 9 | Instances carried no overrides | The rail read "Website" seven times — structurally correct, and a picture of something the product never shows. |
| 10 | Overrides were written into the ARTWORK | `createNodeFromSvg` makes real TEXT nodes from `<text>` glyphs, and they come first in document order. |
| 11 | The installed walker went stale twice | Every chunk reads it from plugin data, so an old copy applies old rules and the canvas still looks plausible. Each chunk now asserts its byte count. |

## Rules the runs proved

- **A variant override cannot be applied during the build phase.** The component
  is still loose components then; the SET carries the property and does not
  exist until combine. Text overrides have no such constraint.
- **A container must be built after what it instances.** `orderByDependency` is
  a topological sort; sorting on sid satisfied every current dependency by luck.
- **A newly built component must be registered as it is created**, or a
  container in the same chunk cannot instance it.
- **Never patch page state incrementally after a model change.** Doing so
  produced an inconsistent rail that had to be rebuilt from the plan. Change the
  plan, clear what this generator stamped, rebuild.

---

## Known open items

1. **Page 10 is empty** — the Setup screen, the pilot's actual deliverable.
2. **Pages 01–03 have zero instances.** Page 04 fixed this for the pattern
   layer; the DS layer is still a set of components nothing consumes.
3. **A per-row icon needs an INSTANCE_SWAP property** — text overrides cannot
   carry artwork, so every rail row currently shows the same thumbnail.
4. `color(srgb …)` is unparsed and paints black.
5. `DsModal` and `DsTabBar` are used by Setup and are in neither the manifest
   nor the file.
6. The icon-tile glyph is an icon FONT with no geometry to capture.
7. Raster `imageHash` capture is still unproven — every image so far has been an
   SVG data URI.
