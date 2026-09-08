# 3D Logo Studio — requirement traceability checklist

Every requirement in `prd.md` mapped to the phase that delivers it and the test layer that
proves it. IDs are stable; cite them in commits (`feat(3d-logo): R-GEO-03 …`) and in phase
status notes.

**Status legend:** ☐ pending · ◐ active · ▣ blocked · ☑ complete
**Test layers** (per CLAUDE.md "Test coverage requirements"): `unit` (jsdom, pure logic) ·
`integration` (adapter + document mirror) · `browser` (`*.browser.test.tsx`, real DOM +
WebGL) · `manual` (owner visual review) · `doc` (recorded evidence, no automation possible).

---

## A. Platform & boundary — PRD §3, §16

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-PLT-01 | Feature lives at `src/features/tools/3d-logo-studio/` with the PRD §16 subfolders | 3 | unit (import-boundary test) | ☐ |
| R-PLT-02 | Route `/tools/3d-logo-studio` registered; works with no Brand and no auth | 3 | browser | ☐ |
| R-PLT-03 | Entry in `tools/core/toolRegistry.ts`; appears in the `/tools` directory | 12 | unit + browser | ☐ |
| R-PLT-04 | Entry in `dev-product-map/registry.ts` (its `registry.test.ts` fails without one) | 3 | unit (existing suite) | ☐ |
| R-PLT-05 | Uses the existing tool shell + canonical DS (`@/shared/ds`); no shadcn, no bare hex | 3 | unit (migration-style guard) + manual | ☐ |
| R-PLT-06 | Uses the shared undo/redo registry (`@/shared/history` `useUndoScope`) | 6 | unit + browser | ☐ |
| R-PLT-07 | Engine is pure TypeScript — no React, no DOM, no Zustand outside `render/` | 3 | unit (import-boundary test) | ☐ |
| R-PLT-08 | Three.js and encoders lazy-loaded; no other route pulls them | 3 | doc (built-bundle inspection) | ☐ |
| R-PLT-09 | Does not import `shared/services/export/vectorize/*`; does not touch `EditorWorkspace` | 3 | unit (import-boundary test) | ☐ |
| R-PLT-10 | Mount/unmount releases GPU, worker and event resources | 3, 12 | browser | ◐ Studio disposes contexts, proven to 24 cycles; the React surface is Phase 3 |
| R-PLT-11 | Multiple isolated editor instances supported | 3 | browser | ☐ |
| R-PLT-12 | No dependency on an active Brand; Brand mode arrives later via optional adapters | 3 | unit | ☐ |
| R-PLT-13 | All export filenames come from the `naming/` module | 11 | unit | ☐ |

## B. SVG import — PRD §4 (first release), §5

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-IMP-01 | Closed filled paths | 4 | unit | ☑ (P2) |
| R-IMP-02 | Multiple disconnected components | 4 | unit | ☑ (P2) |
| R-IMP-03 | Compound paths and holes | 4 | unit | ☑ (P2) |
| R-IMP-04 | Nested groups and transforms | 4 | unit | ☑ (P2) |
| R-IMP-05 | Solid colors preserved | 4 | unit | ☑ (P2) |
| R-IMP-06 | Common SVG shapes (`rect`/`circle`/`ellipse`/`line`/`polygon`/`polyline`) → paths | 4 | unit | ☑ (P2) |
| R-IMP-07 | Common strokes converted to outlines (joins, caps, self-intersection) | 4 | unit | ☐ |
| R-IMP-08 | Both fill rules (`nonzero`, `evenodd`) | 4 | unit | ☑ (P2) |
| R-IMP-09 | Diagnostic: live text not converted to paths | 4 | unit + browser | ☑ (P2) |
| R-IMP-10 | Diagnostic: embedded raster images | 4 | unit | ☑ (P2) |
| R-IMP-11 | Diagnostic: unsupported masks, filters, patterns, external assets | 4 | unit | ☑ (P2) |
| R-IMP-12 | Diagnostic: broken or self-intersecting paths | 4 | unit | ☑ (P2) |
| R-IMP-13 | Diagnostic: excessive detail, with a complexity limit and cancellation | 4 | unit + browser | ☑ (P2) |
| R-IMP-14 | Reject/strip unsafe scripts, event handlers, external references | 4 | unit (hostile-input fixtures) | ☑ (P2) |
| R-IMP-15 | Nothing unsupported is dropped silently — every one of the above surfaces to the user | 4 | browser | ◐ importer reports every case; no UI yet (Phase 4) |
| R-IMP-16 | Original source preserved for reset and comparison | 4 | unit + browser | ☑ (P2) |
| R-IMP-17 | Import preview with actionable diagnostics | 4 | browser | ◐ diagnostics exist; the preview is Phase 4 |
| R-IMP-18 | **`Logomark-3d.svg` yields exactly nine components**, positions and proportions kept | 4 | unit (fixture) | ☑ (P2) |
| R-IMP-19 | Components stay separate by default; nothing is auto-connected | 4, 5 | unit | ☑ (P2) |
| R-IMP-20 | Every component gets a stable identifier | 4 | unit | ☑ (P2) |
| R-IMP-21 | Full-viewBox background rects flagged (not silently skipped) — see reuse decision | 4 | unit | ☑ (P2) |

## C. Geometry — PRD §6

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-GEO-01 | **Flat**: front/back visibility, orientation, face material, optional min thickness | 5 | unit + browser | ☑ (P2) |
| R-GEO-02 | **Extrude**: depth; front/center/back alignment | 5 | unit | ☑ (P2) |
| R-GEO-03 | **Extrude**: bevel size, depth, profile, segments | 5 | unit + manual | ☑ (P2) |
| R-GEO-04 | **Extrude**: curve quality, front/back caps, separate vs combined components | 5 | unit | ☑ (P2) |
| R-GEO-05 | **Inflate**: real geometry generation, not a large bevel | 2 (proof), 5 | unit + manual | ☑ (P2) |
| R-GEO-06 | **Inflate** controls: fullness, thickness, smoothness, front/back balance, outline preservation, edge softness, surface quality, separate/fused | 5 | unit | ☑ (P2) |
| R-GEO-07 | **Inflate** validated on: rounded, angular, narrow bridges, small gaps, compound paths, outlined wordmarks, multiple separated elements | 2, 5 | unit (fixture matrix) + manual | ◐ rounded, angular, narrow bridges, hairlines, holes, compound paths tested; outlined wordmarks await stroke support |
| R-GEO-08 | **Revolve**: profile/component selection, X/Y/Z/custom axis, pivot + axis offset | 5 | unit | ☑ (P2) |
| R-GEO-09 | **Revolve**: full/partial sweep angle, radial segments, start/end caps, profile preview | 5 | unit + browser | ☑ (P2) |
| R-GEO-10 | Revolve warns before applying that it may change the silhouette substantially | 5 | browser | ◐ warning is returned by the engine; the UI message is Phase 5 |
| R-GEO-11 | Grouping, mesh combination and true solid fusion are three distinct operations | 5 | unit | ◐ separate vs fused measured; true solid fusion is Phase 5 |
| R-GEO-12 | Surfaces, normals, intersections and holes validated per operation | 5 | unit | ☑ (P2) |
| R-GEO-13 | All four modes go through one engine contract and report unsupported combinations | 5 | unit | ◐ one contract; unsupported combinations reported for Revolve only |

## D. Modifiers — PRD §7

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-MOD-01 | Non-destructive, ordered stack; order is preserved in saved projects | 6 | unit | ☐ |
| R-MOD-02 | Bevel, surface smoothing, normal correction, component separate/combine | 6 | unit | ☐ |
| R-MOD-03 | **Twist**: angle°, X/Y/Z/custom axis, pivot, start/end, falloff, component-or-group scope | 6 | unit + browser | ☐ |
| R-MOD-04 | **Taper**: start/end scale, axis, pivot, interval, falloff, scope | 6 | unit + browser | ☐ |
| R-MOD-05 | Enable/disable, reorder, duplicate, remove, reset one, reset all | 6 | unit + browser | ☐ |
| R-MOD-06 | Valid modifier sequences defined; invalid ones reported | 6 | unit | ☐ |
| R-MOD-07 | A stale background computation can never overwrite a newer result | 6 | unit (versioned-result test) | ☐ |

## E. Transforms & components — PRD §8, §9

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-TRF-01 | Position, rotation on X/Y/Z; uniform and per-axis scale | 6 | unit | ☐ |
| R-TRF-02 | Local and world axes; center / origin / custom pivots | 6 | unit | ☐ |
| R-TRF-03 | Numeric entry, sliders, viewport manipulation, snapping | 6 | browser | ☐ |
| R-TRF-04 | Fit to view; reset position / rotation / scale / all | 6 | browser | ☐ |
| R-TRF-05 | Camera movement and object rotation stay independent | 6, 8 | unit | ☐ |
| R-CMP-01 | Select one or many components; hide/show; lock | 6 | browser | ☐ |
| R-CMP-02 | Per-component material | 7 | browser | ☐ |
| R-CMP-03 | Per-component depth/modifiers where supported; per-component transform | 6 | unit + browser | ☐ |
| R-CMP-04 | Group / ungroup; restore original placement | 6 | unit + browser | ☐ |

## F. Materials — PRD §10

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-MAT-01 | Registry-based — a new material needs no editor change | 7 | unit | ☑ (P2) |
| R-MAT-02 | 24 presets across metals, glass, coatings, natural, effects (PRD §10 list) | 7 | unit (registry count + names) | ☑ (P2) |
| R-MAT-03 | Parameters: base color, metalness, roughness, transmission, IOR, thickness, tint/attenuation, clearcoat, emission, anisotropy, iridescence | 7 | unit | ☑ (P2) |
| R-MAT-04 | Texture scale, rotation, position, normal/bump strength | 7 | unit + manual (seams on curves) | ☐ |
| R-MAT-05 | Controls appear only when relevant to the selected material | 7 | browser | ☐ |
| R-MAT-06 | Search, filter, favorites, duplicate, save custom, reset to preset | 7 | browser | ☐ |
| R-MAT-07 | Assign to selected components | 7 | browser | ☐ |
| R-MAT-08 | Each material declares interactive / final-render / GLB-export behaviour | 7 | unit + doc | ☑ (P2) |
| R-MAT-09 | **Visual benchmark**: clear glass, textured silver, glossy black, satin black | 2 (proof), 7 | manual | ☑ (P2) |
| R-MAT-10 | Changing material preserves geometry and transforms | 7 | unit | ☑ (P2) |

## G. Lighting, camera, rendering — PRD §11, §12

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-LIT-01 | 6 lighting presets (white/black/neutral studio, soft product, dramatic rim, high-contrast) | 8 | browser + manual | ◐ six presets exist and render; controls are Phase 8 |
| R-LIT-02 | Environment rotation + intensity | 8 | browser | ☐ |
| R-LIT-03 | Key light position/size/color/intensity; fill; rim; ground shadow | 8 | browser | ☐ |
| R-LIT-04 | Background color, transparent background | 8 | browser | ☐ |
| R-LIT-05 | Reflection environment independent from the visible background | 8 | browser + manual | ◐ backdrop is independent of the environment; controls are Phase 8 |
| R-CAM-01 | Presets: front, three-quarter, side, top, macro, user-defined | 8 | browser | ☐ |
| R-CAM-02 | Orbit, pan, zoom, FOV, ortho/perspective, target, fit to object, save view | 8 | browser | ◐ fit-to-object works; orbit/pan/zoom are Phase 8 |
| R-RND-01 | Interactive preview: fast, adaptive quality, drops while moving, restores when idle | 8 | browser + manual | ☐ |
| R-RND-02 | Final render: progressive refinement, quality setting, sample progress | 8 | browser | ☐ |
| R-RND-03 | Time estimate after sufficient progress; pause and cancel | 8 | browser | ☐ |
| R-RND-04 | Tiled rendering for large outputs | 8, 11 | unit + browser | ☐ |
| R-RND-05 | Graphics-context-loss recovery, preserving user work | 8, 12 | browser | ☐ |
| R-RND-06 | Scene changes correctly restart progressive rendering | 8 | unit | ☐ |
| R-RND-07 | Glass reviewed on white and black backgrounds | 8 | manual | ◐ reviewed on white and black in the proof |
| R-RND-08 | **All processing and rendering stay on device — nothing is uploaded, ever** | 3, 12 | unit (no-network guard) + doc | ☐ |

## H. Animation — PRD §13

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-ANI-01 | Presets: spin, float, oscillation, camera orbit, turntable, pulse, wobble, static | 10 | unit | ☐ |
| R-ANI-02 | Duration, fps, resolution, direction, speed, loop, start/end rotation, axis, ease, background, quality | 10 | unit + browser | ☐ |
| R-ANI-03 | **Evaluated at explicit timeline timestamps** — export speed cannot affect timing | 10 | unit | ☐ |
| R-ANI-04 | Animation transforms kept separate from the user's base transforms | 10 | unit | ☐ |
| R-ANI-05 | Loop boundaries, pause, resume, reset, procedural-texture stability | 10 | unit + browser | ☐ |
| R-ANI-06 | Preview and export evaluate the same scene at the same timestamps | 10 | unit | ☐ |
| R-ANI-07 | Initial target: 1080p / 30fps / 5s | 11 | doc (measured) | ☐ |

## I. Exports — PRD §14

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-EXP-01 | PNG, transparent PNG, JPEG | 11 | browser (reopen the file) | ☐ |
| R-EXP-02 | 1:1, 4:5, 16:9, custom ratios; custom pixel dimensions | 11 | unit + browser | ☐ |
| R-EXP-03 | Max long edge ~4096px, subject to browser capability | 11 | unit + doc | ☐ |
| R-EXP-04 | MP4 where supported; WebM fallback; PNG sequence fallback; transparent PNG sequence | 11 | browser + manual (play it) | ☐ |
| R-EXP-05 | Transparent MP4 is **not** promised — the UI says so | 11 | browser | ☐ |
| R-EXP-06 | GLB preserving geometry, separate components, materials, textures, transforms, animation channels | 11 | unit + doc (external validator reimport) | ☑ (P2) |
| R-EXP-07 | GLB material fallbacks documented | 11 | doc | ☑ (P2) |
| R-EXP-08 | Export progress, cancellation, bounded memory, useful errors | 11 | browser | ☐ |
| R-EXP-09 | No stale or blank frames; correct dimensions, framing, duration | 11 | browser + manual | ☐ |
| R-EXP-10 | Glass/transparent-PNG limitation explained (refraction depends on surroundings) | 11 | browser | ☐ |
| R-PRJ-01 | Versioned project archive: source SVG, normalized vectors, components, method, ordered modifiers, materials + textures, lighting, camera, animation, export settings, engine + schema versions | 11 | unit (round-trip) | ☐ |
| R-PRJ-02 | The internal archive is clearly distinct from any external editable 3D format | 9, 11 | browser (wording) + doc | ☐ |

## J. Persistence — PRD §15

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-STO-01 | Large project data in IndexedDB; only small settings/session identity in localStorage | 9 | unit + browser | ☐ |
| R-STO-02 | Autosave; restore after refresh | 9 | browser | ☐ |
| R-STO-03 | Rename, duplicate, delete project | 9 | browser | ☐ |
| R-STO-04 | Display storage usage; handle storage limits | 9 | browser | ☐ |
| R-STO-05 | Download a backup; import a backup | 9, 11 | browser | ☐ |
| R-STO-06 | Deleting a local project never deletes downloaded exports | 9 | unit | ☐ |
| R-STO-07 | Versioned internal schema with migrations | 9 | unit | ☐ |
| R-STO-08 | The signup-and-claim flow (which creates a Brand) is **not** wired to this tool | 9 | unit | ☐ |

## K. Browser support & resilience — PRD §18

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-BRW-01 | Current + previous stable Chrome, Edge, Firefox, Safari; current mobile Safari and Android Chrome | 12 | manual | ☐ |
| R-BRW-02 | Capability detection before expensive work | 3, 12 | unit + browser | ☐ |
| R-BRW-03 | Output fallbacks offered per capability | 11, 12 | unit | ☐ |
| R-BRW-04 | Lower preview quality on weaker devices | 8, 12 | browser | ☐ |
| R-BRW-05 | Unsupported configurations explained | 12 | browser | ☐ |
| R-BRW-06 | User work preserved after recoverable failures | 9, 12 | browser | ☐ |
| R-BRW-07 | **Never display an empty successful result** | 11, 12 | unit + browser | ☐ |
| R-BRW-08 | Low memory, missing encoder, storage exhaustion, tab backgrounding, context loss all exercised | 12 | browser + doc | ☐ |

## L. Accessibility — PRD §19

| ID | Requirement | Phase | Verified by | Status |
|---|---|---|---|---|
| R-A11Y-01 | Every control keyboard-accessible | 9, 12 | browser | ☐ |
| R-A11Y-02 | Visible focus indicators (DS: 3px charcoal ring) | 9 | browser | ☐ |
| R-A11Y-03 | Labeled sliders and inputs | 9 | browser | ☐ |
| R-A11Y-04 | Numeric alternative to every drag control | 9 | browser | ☐ |
| R-A11Y-05 | Adequate contrast | 9, 12 | manual | ☐ |
| R-A11Y-06 | Reduced-motion honoured; no mandatory auto-rotation | 9, 10 | browser | ☐ |
| R-A11Y-07 | Touch-accessible viewport controls | 9, 12 | browser | ☐ |
| R-A11Y-08 | Status announcements for loading, rendering, failure | 9 | browser | ☐ |

## M. Deferred — PRD §20 (recorded, not built)

Extension points must exist in the foundation; the interfaces and algorithms do not.

| ID | Deferred item | Notes |
|---|---|---|
| R-FUT-01 | Marching cubes / blobs (`numBlobs`, `resolution`, `isolation`, corner + line strengths) | needs a field-evaluation stage in the geometry pipeline |
| R-FUT-02 | Structural build controls (`distance`, `tetraHeight`, `tetraRadius`, `linePadding1`, segment rotations) | formulas unconfirmed |
| R-FUT-03 | Behaviors (`followMouse`, `mouseSensitivity`, `ease`, `drift*`) | must work with touch, reduced motion, and deterministic export |
| R-FUT-04 | Commands: Collapse | meaning unconfirmed. Reset and Spin ship in v1 (R-MOD-05, R-ANI-01) |
| R-FUT-05 | Raster (PNG/JPG) tracing with crop, threshold, color count, compare, approve | PRD §4 future |
| R-FUT-06 | Brand-linked mode via optional adapters | must not require an engine rewrite |
| R-FUT-07 | External editable 3D format | blocked on choosing the target application |
| R-FUT-08 | Topology-changing blob animation may need baked frames, not GLB | recorded limitation |

---

## Open questions carried from PRD §23 (non-blocking)

1. The target external 3D application, and therefore its native editable project format.
2. The future BrandingOS Brand storage contract.
3. Exact formulas for Collapse, blob strengths, and the structural controls.

## Phase status

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation: reuse decision + baseline | ☑ complete — `phase-1-reuse-decision.md` |
| 2 | Geometry & material proof (inflation gate) | ☑ complete — `phase-2-geometry-proof.md`, evidence in `proof/` |
| 3 | BrandingOS integration | ◐ active |
| 4 | Reliable SVG import | ☐ |
| 5 | All geometry modes | ☐ |
| 6 | Modifiers, selection, transforms | ☐ |
| 7 | Material library | ☐ |
| 8 | Lighting, cameras, local rendering | ☐ |
| 9 | Editing workflow + local recovery | ☐ |
| 10 | Deterministic animation | ☐ |
| 11 | Exports | ☐ |
| 12 | Public qualification & release | ☐ |
