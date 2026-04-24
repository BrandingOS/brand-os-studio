# BrandOS — Architecture Decision Log

Append-only record of tech-stack, pattern, and approach decisions. Newest at
the top. Each entry: **decision → reasoning → alternatives considered**.

For the live architecture overview (layers, services, stack), see
`CLAUDE.md`. This file is the *history of decisions*, not a duplicate of
that overview.

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
