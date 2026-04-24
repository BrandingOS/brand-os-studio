# BrandOS — Architecture Decision Log

Append-only record of tech-stack, pattern, and approach decisions. Newest at
the top. Each entry: **decision → reasoning → alternatives considered**.

For the live architecture overview (layers, services, stack), see
`CLAUDE.md`. This file is the *history of decisions*, not a duplicate of
that overview.

---

## 2026-04-24 — Typescale tool: preview-only with font-only persistence

**Decision.** The Typescale tool writes **only the font pair** (`brand.typography.primary/secondary/accent`) back to the brand. The structured `Typescale` object (surfaces, ratios, semantic map, steps) is **not persisted** — it's ephemeral editor state.

**Reasoning.** The tool started as "full dual-write brand.typescale + brand.typography" (spec decision #7 in `docs/superpowers/specs/2026-04-23-typescale-tool-design.md`). Mid-session the user pushed back: the typescale is an *exploration* surface — users tune a ratio to see what it looks like, not to commit a canonical scale. Fonts are the brand decision worth saving; the scale is not. Removing `brand.typescale` persistence simplified the mental model, eliminated "which is source of truth" confusion across Brand Board / presentation templates / exports, and removed the need for a schema migration path on a field no downstream reader consulted.

**Alternatives considered.**
- **Keep full dual-write** (original spec). Rejected: every downstream consumer reads the flat `brand.typography.scale` map, not the structured surfaces. The structured field was load-bearing for zero readers.
- **Persist scale but not surfaces.** Rejected: more complex, same confusion.
- **Persist nothing.** Rejected: users do pick a font pair and expect it to stick to the brand. That's the one piece worth writing.

---

## 2026-04-23 — Typescale tool architecture (tool-platform pattern)

**Decision.** The Typescale tool set the pattern for "tool features in BrandOS": pure-TS `engine/` + `export/` folders (no React, no DOM, no async); a composable root component with `variant: 'full' | 'compact'` so the same editor mounts in both a full page and an embedded dialog; a `materializer` registered via side-effect import to hook into the platform's claim-on-signup flow.

**Reasoning.** Codified the pattern by building against it. Pure-TS cores are unit-testable without a DOM harness and keep ratio / fluid-clamp / semantic-mapping math away from React re-render concerns. The `variant` prop collapses what would otherwise be two parallel component trees into one, avoiding drift. The side-effect-on-import materializer (copied from `variant-studio/materializer.ts`) makes adding a tool purely additive — `src/features/tools/core/claim.ts` knows nothing about specific slugs.

**Alternatives considered.**
- **Separate `full` and `compact` component trees.** Rejected: drift risk; the two views share 90% of behavior.
- **Explicit materializer registration at platform boot.** Rejected: couples the platform to the list of tools. Side-effect registration on tool import is the established repo pattern.
- **Zustand store for the draft.** Rejected: the draft is ephemeral per-editor; no other component reads it. Local `useState` + a debounced commit through `useTypescaleDraft` is the right scope.

---

## 2026-04-24 — Mockup Studio engine = PixiJS v8

**Decision.** The Mockup Studio render engine will be built on **PixiJS v8**,
not Three.js / Fabric / Konva / raw WebGL. No 3D models in V1 — every
template is a stack of pre-baked image layers
(`base.jpg` + `displacement.png` + `lighting.png` + `mask.png` +
optional tint/prop masks) driven by a `template.json` metadata file.

**Reasoning.**
- We need GPU-accelerated 2D compositing: displacement mapping, masks, blend
  modes, multiplied lighting. PixiJS v8 ships `DisplacementFilter` + masks +
  render textures out of the box.
- Strong React story (either `@pixi/react` or a thin vanilla-Pixi hook —
  Phase 0 of the Mockup Studio spec chooses which, based on our React
  version).
- MIT-licensed, active maintenance.

**Alternatives considered.**
- **Three.js** — overkill for V1 (no actual 3D geometry yet). Reserved for a
  possible V2.
- **Konva / Fabric** — no GPU shaders; displacement math in JS would be too
  slow at our canvas sizes.
- **Raw WebGL** — would amount to reinventing PixiJS, worse.

**Source.** `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §2.3.

---

## 2026-04-24 — Mockup Studio: one engine, three modes (adapter pattern)

**Decision.** The Mockup Studio will have three product modes — Standalone,
Brand-aware (auto-fill from Brand Kit), and Fully Custom — but **one render
engine** shared by all three. The differences live entirely in the data
layer and the UI layer. The engine consumes a single `MockupState` object
(see spec §2.5) and knows nothing about modes.

**Reasoning.**
- Brand-aware auto-fill is the competitive moat (no other tool does it
  because they don't own the brand). But if the engine knows about "modes"
  internally, half the code will need rewriting when we flip from Standalone
  MVP to Brand-aware.
- Treating Brand-aware as `applyBrandKit(template, brandKit) → MockupState`
  — a pure function in the data layer — keeps the renderer clean.

**Alternatives considered.**
- Three parallel editors sharing utility code — rejected; duplicated state
  management and drift over time.
- Mode-aware engine with conditional branches — rejected; couples
  rendering to product decisions.

**Source.** `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §0, §2.4, §4.2.

---

## 2026-04-24 — Mandatory Phase 0 audit before paste-from-spec builds

**Decision.** The Mockup Studio spec requires a written Phase 0 audit
(`MOCKUP_STUDIO_ADAPTATION_PLAN.md` at repo root) before any feature code is
written. The audit fills in stack/pattern/pre-existing-code checklists and
resolves every code snippet in the spec to BrandingOS conventions. This
pattern should be followed for any future large spec doc imported from
outside the codebase.

**Reasoning.**
- Paste-from-spec builds diverge in three predictable places: state
  management pattern, data-fetching pattern, folder/naming convention.
- The spec cannot know which pattern we use. Forcing a written audit first
  keeps the build idiomatic.

**Alternatives considered.**
- "Just start building and adapt as you go" — rejected; leads to v1-style
  and v2-style files living side by side.
- Audit as a verbal check-in — rejected; nothing to reference later.

**Source.** `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §5.

---

## Pre-existing (baseline) decisions

These are already reflected in the codebase and `CLAUDE.md`. Listed here as
anchors so future entries have context to refer back to.

- **Vite + React + TypeScript** over Next.js for the main app SPA.
- **Zustand** (persist + devtools) over Redux / Context for global state.
- **Supabase** (Postgres + Auth + Storage) with a localStorage fallback.
- **Fabric.js 6** for the design editor canvas (`EditorWorkspace`, tagged
  `stable/editable-export-v1` — off-limits to refactor through).
- **`strictNullChecks` OFF, `noImplicitAny` OFF** in tsconfig. Historical;
  be aware when writing new code — nullable values don't crash at compile
  time but still crash at runtime.
- **One shell per scope** (Workspace · Brand · Editor). Do not add a new
  layout unless the existing ones can't express the page.
- **AppRail is the live brand rail**; `BrandSidebar.tsx` is dead code kept
  for reference.
- **`dev` is the default branch**, not `main`. Work lands on `dev`; merge
  to `main` is a manual release step.
