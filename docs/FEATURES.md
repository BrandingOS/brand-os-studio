# BrandOS — Feature Inventory

Tracks the status of user-facing features. One row per feature.

Status values:
- **active** — shipped, working, in production use
- **in-progress** — actively being built
- **planned** — spec'd, not yet started
- **broken** — shipped but known-broken; must be fixed or retired
- **deprecated** — was shipped, now retired

Keep the table terse — one line per feature. For deep context, link to a
doc under `docs/`.

---

## Workspace scope

| Feature | Status | Notes / Doc |
|---|---|---|
| Workspace Home | active | `src/pages/dashboard/WorkspaceHome.tsx`. |
| Brands list | active | `src/features/dashboard/` — CRUD over local + Supabase. |
| Templates marketplace | active | Click → `BrandChooserDialog` forces brand pick. |
| Learn | active | Docs/tutorials surface. |
| Settings | active | Account / workspace settings. |

## Brand scope (7 sections, per `docs/ux-redesign/ARCHITECTURE.md` §3)

| Section | Status | Notes |
|---|---|---|
| Overview | active | `/b/:slug/overview`. |
| Identity | active | Logo · Colors · Typography · Voice · Strategy tabs. |
| Identity — Typescale tool | active | Preview-only tool; persists fonts only. `src/features/tools/typescale/`. |
| Templates | active | Tabs: All · Brand Board · Guidelines · Bento · Social · Print · Screen · Utility. |
| Brand Board editor | active | `/b/:slug/brand-board`. CSS custom properties only — see `docs/brand-board/README.md`. |
| Design launchpad | active | Blank Canvas · AI Design · Recent. |
| Content | active | Calendar · Posts · Drafts. Social picker goes straight to editor. |
| Folders (DAM + saved canvas designs) | active | Assets · Designs tabs. |
| Share (public link, logo deck, guidelines export) | active | Guidelines · Showcase · Exports. |
| Brand Kit v2 card editor modal | active | Image/color/logo/font picker, shipped 2026-04. |
| Case-study deck (Behance-style) | active | `src/features/case-study-deck/`. Adaptive per brand. |

## Tools (brand-scoped)

| Tool | Status | Notes |
|---|---|---|
| Typescale | active | See above. |
| Logo Maker | active | Brand-scoped; save-to-brand via LogoExportPanel. |
| UI Color System / Showcase exporter | active | Vector walker for editable PDF/SVG. |
| **Mockup Studio v2** | **planned** | Spec: `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` (2026-04-24). 3 modes (standalone / brand-aware / custom), PixiJS v8 engine, 8 phases. Phase 0 audit pending. |

## Public / marketing

| Feature | Status | Notes |
|---|---|---|
| Landing page | active | `landingpage/` separate Vite project. |
| Early-access form | active | Anon INSERT into Supabase `early_access`; RLS blocks SELECT. |

## Cross-cutting

| Concern | Status | Notes |
|---|---|---|
| Auth flow (modal + Supabase + sessionStore) | active | See `CLAUDE.md` "Auth flow gotchas". |
| Brand switcher (preserves subpath) | active | `BrandSwitcher.tsx`. |
| `VITE_ANTHROPIC_API_KEY` in client bundle | broken | Must move behind server proxy before public main-app deploy. Tracked in `CLAUDE.md`. |
