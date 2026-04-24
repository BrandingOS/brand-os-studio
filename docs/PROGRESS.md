# BrandOS — Session Progress Log

Newest entries at the top. One entry per working session. Keep entries concrete
(files touched, decisions made, blockers), not vague ("made progress on X").

---

## 2026-04-24 — Mockup Studio v2 spec + `/wrap-up` command

**Accomplished:**
- Wrote `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` (886 lines). Full implementation
  spec for a Placeit/Smartmockups-style Mockup Studio, organized in 8 phases
  with explicit acceptance criteria per phase.
- Locked the product shape as **three modes sharing one engine**: Standalone
  (anon-usable), Brand-aware (auto-fill every template from Brand Kit —
  "the killer feature / the moat"), and Fully Custom (nothing locked).
- Locked the `MockupState` schema in §2.5 as the single contract between the
  UI layer, the state layer, and the PixiJS engine layer. Any mode produces
  a `MockupState`; the engine consumes it and knows nothing about modes.
- Locked the `template.json` schema (§3) with `brand_kit_hints` on every zone,
  tintable region, and text slot — this is what makes Mode B non-guesswork.
- Added Phase 0 as a **mandatory codebase audit** that must output
  `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at repo root before any feature code is
  written. Goal: stop paste-from-spec divergence (§5).
- Registered the `/wrap-up` slash command at `.claude/commands/wrap-up.md`.

**Next step (start here next session):**
- Execute Phase 0 of the Mockup Studio spec. Fill in the §5.1 checklists for
  BrandingOS (stack, patterns, pre-existing canvas/pixi code) and produce
  `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at the repo root. Do NOT start Phase 1
  before that plan is written and reviewed.
- When doing the "pre-existing implementations" sweep, specifically check
  `src/features/brandkit/` and `EditorWorkspace` (Fabric.js) — the spec
  claims "no 3D in V1, PixiJS only" and we need to confirm Fabric isn't
  already covering half of this ground.

**Open questions / blockers:**
- React + `@pixi/react` v8 compatibility on React 18 is unresolved (spec
  flags this in §2.3). Phase 0 must decide: use `@pixi/react` or roll a
  custom `useMockupRenderer` hook around vanilla PixiJS.
- Bulk export (Mode B, "Export all 30 mockups") is spec'd as server-side.
  We don't yet have a mockup-render worker — needs a Cloudflare Worker or
  Supabase Edge Function. Phase 0 output should note where this lands.
- Where `brand_kit_version` is tracked for cache-busting (§4.4) — add as
  an incrementing integer on the brand record; not yet in schema.

**Decisions made + why:**
- **PixiJS v8** over Three.js / Konva / Fabric / raw WebGL for the render
  engine. Reason: we need GPU-accelerated `DisplacementFilter` + masks +
  blend modes out of the box; Konva/Fabric can't shader; Three.js is
  overkill for 2D; raw WebGL reinvents Pixi. (§2.3)
- **No 3D models in V1.** Every template is a stack of pre-baked image
  layers (`base.jpg`, `displacement.png`, `lighting.png`, `mask.png`,
  optional tint/prop masks) + a `template.json`. 3D is reserved for a
  possible V2. (§2.1)
- **Phase 0 is mandatory and non-negotiable** — it produces a written
  adaptation plan before feature code. Reason: the three places a
  paste-from-spec build goes wrong (state mgmt pattern, data-fetching
  pattern, folder convention) are all BrandingOS-specific and not
  knowable from the spec alone.
- **Brand Kit version tracking** via incrementing integer on the brand
  record. Reason: cache keys for bulk-rendered thumbnails and exports need
  to auto-invalidate when the brand changes. (§4.4)
