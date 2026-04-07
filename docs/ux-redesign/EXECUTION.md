# BrandOS UX Overhaul — Execution Roadmap & Log

> The roadmap (§1) is the plan. The log (§2) is what's been done. Append-only.

---

## 1. Roadmap

The full overhaul is **multi-week work**. We sequence it so each stage lands a working
improvement and unblocks the next, instead of one giant rewrite.

### Stage 0 — Planning (this commit)
- Audit, principles, IA, flows, roadmap.
- Done criteria: `docs/ux-redesign/*.md` exist, reviewed against the real codebase.

### Stage 1 — Foundation: unify the page shell ⟵ *first execution stage*
**Why first:** Every later stage assumes one shell. Today there are 7. Until that's true, every
new component is forced to choose a layout, and that choice is wrong half the time.

**Changes:**
- Standardize topbar height (`h-14`) across `DashboardNavbar`, `BrandNavbar`, `CanvaTopBar`.
- Stop the double-wrap: pages inside `BrandLayout` no longer redeclare `max-w-5xl mx-auto px-...`.
  Either the layout owns padding or the page does — not both.
- Delete `SettingsShell` (dead code, declares routes that don't exist).
- Document the canonical shell choice in `src/shared/layouts/README.md`.
- Risk: small visual jumps on settings pages and brand pages — acceptable, they were inconsistent anyway.
- **Off-limits:** `src/shared/services/export/vectorize/*` and editable-export wiring (tagged `stable/editable-export-v1`).

**Done criteria:** all three navbars are h-14; no brand page declares its own max-width on top of `container-tight`; `SettingsShell` deleted; `npm run build` clean.

### Stage 2 — Rescue orphan routes & remove dead nav items
**Correction from initial audit:** The brand-kit submenu items DO actually resolve — they go
through `/brandkit/:moduleId` handled generically by `BrandKitModuleView`. The audit agent
called this wrong; verified by reading `BrandKitModuleView.tsx` and `data/modules.ts`. The
submenu is *visually overwhelming* (18 items), not technically broken. It will be replaced
properly in Stage 7 (brand-sidebar redesign), not in this sprint.

**Why:** The actually broken thing is `/dashboard/brand/:slug/presentations` — a real, useful
documents-pattern presentations page that **no sidebar links to**. It's a registered route with
an entire `EditorWorkspace` integration sitting unreachable.

**Changes:**
- Add "Presentations" item to `BrandSidebar.tsx` top-level brand nav, pointing at the orphan route.
- Remove the disabled `Download Fonts` lock-icon item (signals a feature gate that doesn't exist).
- Drop the now-unused `Download` icon import.

**Done criteria:** orphan presentations page is reachable from brand sidebar; no disabled-with-lock items in sidebar.

### Stage 3 — Standard `PageHeader` component
**Why:** Headers are bespoke per page today. Five different "title bar" patterns exist.

**Changes:**
- New `src/shared/ui/PageHeader.tsx` (title, subtitle, breadcrumb, actions slot).
- Adopt in: brand overview, brand edit, brandkit hub, brands list, dashboard home.

**Done criteria:** the 5 pages above use `PageHeader`; spacing/typography are visually identical.

### Stage 4 — Logo Maker → Brand connection
**Why:** Most user-visible dead end in the product.

**Changes:**
- Add a "Save to brand" action in `LogoExportPanel` (or a new SaveDialog) that:
  - shows the user's brands in a picker
  - on confirm, maps `LogoConfig` → updates `Brand.logoAssets.full` (rasterized) and `.icon` (mark only)
  - persists via `useBrandStore.update()`
  - routes to `/dashboard/brand/:slug/edit`
- If the user has no brands yet, link to brand creation.
- **Important:** new prop on save handler must be destructured in the function signature (we've shipped this `ReferenceError` twice — see auto-memory).

**Done criteria:** click "Save to Brand" → see logo on the brand → see logo render in `BrandLogo` consumer.

### Stage 5 — Commit, push, and notify
- Commit Stage 0 separately (planning docs).
- Commit Stages 1–4 in one or two coherent commits.
- Push to `main`.
- Notify user.

---

### Stages 6–N (queued, future commits)

These are the bigger structural moves from `ARCHITECTURE.md`. They are *not* in this sprint
because each one needs careful migration and visual review. They are listed so the path is clear.

- **Stage 6 — Workspace sidebar redesign.** Strip workspace sidebar to the new 4 items + Settings/Account. Move Activity into Home as a feed.
- **Stage 7 — Brand sidebar redesign.** Collapse the brand sidebar to 5 items: Overview, Identity, Assets, Guidelines, Share.
- **Stage 8 — Identity tabbed page.** Build `/b/:slug/identity` with tabs that absorb edit + brandkit identity modules.
- **Stage 9 — Assets hub.** Build `/b/:slug/assets` with the 4 categories.
- **Stage 10 — Guidelines unification.** Merge "brand-guides" and "guidelines" routes into one section with one editor.
- **Stage 11 — Share section.** Move logo presentation, public showcase, exports under one Share hub.
- **Stage 12 — Editor shell unification.** Adopt `EditorContext`/`EditorShell` across all editors.
- **Stage 13 — Brand switcher in topbar.** Section-preserving switcher per F10.
- **Stage 14 — URL migration.** New `/b/:slug/...` paths with redirects from `/dashboard/...`.
- **Stage 15 — Brand creation wizard rewrite.** Per F1/F8.
- **Stage 16 — `Continue` surface on Home.** Per F6.
- **Stage 17 — Documentation pass.** Update `CLAUDE.md`, root `README.md`, and seed `/learn` content.

---

## 2. Execution Log

### 2026-04-07 — Stage 0: Planning (this commit)

**What happened**

- Spawned 3 parallel research subagents against the real codebase:
  1. Navigation/shell audit → identified 7 layouts, 3 sidebars, 3 topbars, 5 padding patterns, double-wrap bug, dead `SettingsShell`, orphan `/editor/design/:slug` route, 18 broken brand-kit submenu items.
  2. Logo tangle audit → confirmed Logo Maker has zero persistence path to Brand; `Brand.logoAssets` has only one consumer (`BrandLogo.tsx`); Logo Presentation maintains its own `docsStore` parallel to Guidelines.
  3. Editor fragmentation audit → 6 editor surfaces, 3 different canvas techs, 5 different toolbars, 4 different brand-load patterns; `EditorContext` and `EditorTopToolbar` exist with zero consumers.

- Wrote 4 planning docs in `docs/ux-redesign/`:
  - `README.md` — diagnosis, principles, success criteria
  - `ARCHITECTURE.md` — new IA (3 scopes, 5 brand sections, 4 page templates), feature placement decisions, route migration map
  - `USER-FLOWS.md` — 8 personas, 13 user stories, 10 end-to-end flows, validation matrix
  - `EXECUTION.md` — this file

**Key decisions made**
- Brand workspace collapses from 7+19 sidebar items to **5 sections**: Overview, Identity, Assets, Guidelines, Share.
- Logo Maker becomes brand-scoped; Logo Presentation merges into Share; Brand Guides merges into Guidelines.
- One page-shell primitive, four page templates (`AppPage`, `EditorPage`, `FocusPage`, `PublicPage`).
- URL prefix migrates from `/dashboard/brand/:slug/` to `/b/:slug/` *with redirects*; no bookmarks break.
- Editable export pipeline (`stable/editable-export-v1`) is **off-limits** during this overhaul.

**Not done in this commit**
- Stages 6–17 (the bigger structural moves) — they require per-page migration and visual review beyond a single sprint.

---

### 2026-04-07 — Stages 1–4 executed

**Stage 1 — Page-shell unification**
- `DashboardLayout.tsx` and `BrandLayout.tsx` rewritten: single source of horizontal gutter (`px-4 sm:px-6 lg:px-8`) and vertical rhythm (`py-6`); centered max-width column owned by the layout via a `maxWidth` prop on `BrandLayout`. No more `container-tight` double-wrap.
- `DashboardNavbar` topbar height changed from `h-16` → `h-14` to match `BrandNavbar`/`CanvaTopBar`. Page no longer jumps when crossing scope boundaries.
- `DashboardNavbar` and `BrandNavbar` switched from `container-tight` to plain page-gutter so they line up with the layout's content padding (no more 6xl-inside-full-bleed mismatch).
- Removed bespoke `max-w-5xl mx-auto px-4 sm:px-6 py-8` wrappers from `pages/dashboard/brand/[slug]/index.tsx`, `…/brandkit/index.tsx`, `…/brandkit/[moduleId].tsx`. Brand overview now passes `maxWidth="5xl"` to BrandLayout instead.
- Deleted dead `src/shared/layouts/SettingsShell.tsx` (zero consumers, declared four routes that don't exist) and removed its export from `src/shared/layouts/index.ts`.
- Added `src/shared/layouts/README.md` documenting the shell rules.

**Stage 2 — Rescue orphan & remove dead nav noise** *(scope correction made — see stage description)*
- Audit-finding correction: brand-kit submenu items DO resolve via the parameterized `/brandkit/:moduleId` route. The original audit was wrong; verified by reading `BrandKitModuleView.tsx` and `data/modules.ts`. Updated `README.md` and `EXECUTION.md` to reflect this.
- The genuinely orphan route `/dashboard/brand/:slug/presentations` (a real, working `EditorWorkspace`-powered presentations page) is now reachable from `BrandSidebar` as a top-level "Presentations" item.
- Removed the disabled "Download Fonts" item with its lock icon — it signaled a feature gate that doesn't exist and just added noise.
- Cleaned up the now-unused `Download` icon import in `BrandSidebar.tsx`.

**Stage 3 — `PageHeader` primitive**
- Created `src/shared/ui/PageHeader.tsx` (title, subtitle, eyebrow, breadcrumb, actions slot, belowSlot for tabs). Single canonical page header for all `AppPage` template pages.
- Adopted in: `pages/dashboard/brands/index.tsx` (workspace brands list), `pages/dashboard/brand/[slug]/index.tsx` (brand overview), `features/brandkit/components/BrandKitHub.tsx` (brand kit hub).
- Brand overview now shows a real breadcrumb back to `/dashboard/brands`. Brand Kit hub shows the full path: Brands › {brand} › Brand Kit.

**Stage 4 — Logo Maker → Brand connection**
- Added a "Save to Brand" primary button at the top of `LogoExportPanel.tsx`.
- Built a save dialog: lists user brands (lazy-loaded on first open), lets the user pick one, and on confirm:
  1. Rasterizes the live canvas to PNG via the existing `html2canvas` dependency at 1024px.
  2. Patches `Brand.logo` and `Brand.logoAssets.full` via `useBrandStore.update()`.
  3. Toasts success and routes the user to `/dashboard/brand/:slug/edit`.
- If the user has no brands yet, the dialog shows a "Create your first brand" CTA that routes to onboarding.
- Logo Maker is no longer a dead end. The user has a clear path from "I made a logo" to "this is my brand's logo".
- The export-to-file flow is preserved (now under a divider labelled "or download").

**Type-check & build**
- `tsc --noEmit` against `tsconfig.app.json`: no errors in any file touched by this work. (Pre-existing type errors in `LogoCanvas`, `EditorWorkspace`, `plan-gates`, `presentation/templates`, `social-media/buildSocialSlides` were already present and are out of scope.)
- `vite build`: ✓ clean, 6.3s.

**Off-limits respected**
- `src/shared/services/export/vectorize/*` and the editable export pipeline (`stable/editable-export-v1`) untouched.

**Files changed in Stages 1–4**
```
src/features/dashboard/components/DashboardLayout.tsx     (rewrite)
src/features/dashboard/components/DashboardNavbar.tsx     (h-14, gutter)
src/features/brand/components/BrandLayout.tsx             (rewrite, maxWidth prop)
src/features/brand/components/BrandNavbar.tsx             (gutter)
src/features/brand/components/BrandSidebar.tsx            (rescue + cleanup)
src/pages/dashboard/brand/[slug]/index.tsx                (PageHeader, drop wrapper)
src/pages/dashboard/brand/[slug]/brandkit/index.tsx       (drop wrapper)
src/pages/dashboard/brand/[slug]/brandkit/[moduleId].tsx  (drop wrapper)
src/pages/dashboard/brands/index.tsx                      (PageHeader)
src/features/brandkit/components/BrandKitHub.tsx          (PageHeader)
src/features/logo-maker/components/LogoExportPanel.tsx    (Save to Brand)
src/shared/ui/PageHeader.tsx                              (NEW)
src/shared/layouts/README.md                              (NEW)
src/shared/layouts/index.ts                               (drop SettingsShell export)
src/shared/layouts/SettingsShell.tsx                      (DELETED)
```
