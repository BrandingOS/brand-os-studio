# BrandingOS UI v2 — Planning Document

Internal planning source of truth for the UI rebuild. When handing off to Claude Design, use `BRIEF.md`. For the exhaustive old→new feature map, see `FEATURES.md`.

## Why v2

The current UI has three problems:

1. **Components aren't polished** — inconsistent spacing, weight, motion. Feels unfinished.
2. **Navigation is confusing** — two sidebars side by side (workspace rail + brand sidebar) create a maze.
3. **Visually generic** — no strong identity; reads as a stock dashboard.

`/setup` and `/onboard-brand` (live on `x.brandingos.ai`) are the first pages built in the new direction. They prove the pattern works. v2 extends that pattern across the entire app.

## Navigation model

### Workspace level (outside a brand)

Simpler shell. No tabs. Just:

- Top header: BrandingOS logo (left), profile menu (right)
- Main content: brand cards, settings, learn, templates library

Routes:

| Route | Page |
| --- | --- |
| `/` or `/dashboard` | Brands grid + recent activity |
| `/learn` | Tutorials / docs |
| `/settings` | Account, billing, team |
| `/templates` | Workspace template library (click → brand chooser) |

### Brand level (inside a brand)

Full v2 shell. Entered via a brand card click or direct slug URL.

**Top bar (floating):**

- Left: brand switcher pill (current brand name + dropdown)
- Center: 5-tab pill nav — `Setup · Brand Kit · Guideline · Design · Tools`
- Right: Publish button + theme toggle

**Left sidebar (floating, per-tab):** each tab owns its own sidebar content. See *Per-tab structure* below.

**Bottom-right (floating):** Brand Assistant pill (Cmd+J, AI chat).

**URL pattern:**

| Route | Tab |
| --- | --- |
| `/b/:slug/setup` | Setup (completion checklist) |
| `/b/:slug/brand-kit` | Brand Kit |
| `/b/:slug/guideline` | Guideline |
| `/b/:slug/design` | Design |
| `/b/:slug/tools` | Tools |

Legacy `/dashboard/brand/:slug/*` URLs redirect to the new tab equivalents.

## Per-tab structure

### 1. Setup — `/b/:slug/setup` ✅ built

Sidebar: completion checklist (Logo · Colors · Typography · Iconography · Photography · Website · About).
Content: section-by-section editors with live preview.
Status: reference implementation. Everything else extends this.

### 2. Brand Kit — `/b/:slug/brand-kit`

Sidebar: module list (Board, Logo, Color, Typography, Icons, Photography, Voice).
Content: viewable/editable presentation of the brand's assets.

### 3. Guideline — `/b/:slug/guideline`

Sidebar: slide/section outline.
Content: slide-based editor, one slide per guideline section.

### 4. Design — `/b/:slug/design`

Sidebar: projects list + templates picker (hidden in fullscreen canvas).
Content: launchpad (Blank · AI Design · Recent) → canvas editor.

### 5. Tools — `/b/:slug/tools`

Sidebar: tool categories.
Content: per-tool panels (exports, share, validation, DAM).

Full feature-to-tab mapping is in `FEATURES.md`.

## The All-Features dev page

A dev-only page at `/_dev/features` (NOT production-visible).

**Purpose:** flat inventory of every feature in the app, labeled with its current home (tab → section → route). Lets us see the full surface at a glance and move things around before the design system locks them.

**Shape:**

- Card grid, one card per feature
- Each card: feature name · current location · short description · link to live route · status (active / dead / planned)
- Filter by tab, by status
- Optional nice-to-have: drag to propose relocation, export as a reorg plan

**Gating:** `import.meta.env.DEV` or a `?dev=1` query param. Not linked from any user-facing nav. Kept out of production builds.

## Visual direction

Starting point: the current `/setup` direction. Let Claude Design *refine*, not reinvent.

- **Light:** cream background `#f7f5f3`, charcoal text `#141414`
- **Dark:** charcoal background `#141414`, warm-white text
- **Display:** Instrument Serif
- **Body / UI:** Inter
- **Motion:** `cubic-bezier(0.22, 1, 0.36, 1)` default
- **Feel:** editorial, calm, premium. Closer to Linear / Vercel / cosmos.so — softer and warmer than Material or iOS.

**Everything floats:**

- Sidebar = rounded panel, sticky top, soft shadow
- Top bar = sticky, pill nav slides between tabs
- Modals = scale + fade, backdrop blur
- No full-width hard bars, no sharp corners

## Migration plan

**Kill:**

- `src/shared/layouts/AppRail.tsx`
- `src/features/brand/components/BrandSidebar.tsx` (already dead)
- Dual-sidebar layouts in `DashboardLayout`, `BrandLayout`
- Standalone slim workspace rail

**Keep (logic stays, UI swaps):**

- Stores: `brandStore`, `sessionStore`
- Services: Supabase integration, brand validation engine, color engine
- `src/features/brandkit/*` renderers, templates, module definitions
- `src/features/guidelines/*` slide logic
- `EditorChrome` + `useAutoSave` primitives
- Canvas editor core (Fabric.js)

**Extend:**

- `CosmosWorkspaceShell.tsx` → universal brand shell (rename or leave as-is)
- Build a new, simpler workspace-level shell
- Build out the 4 remaining tab pages (Brand Kit / Guideline / Design / Tools) to `/setup`'s polish level
- Add `/_dev/features` inventory page

## Open questions

1. Brand switcher UX: dropdown pill in top bar, OR click brand name in sidebar → popover?
2. Workspace root: keep `/dashboard` or switch to `/`?
3. Legacy deep links (`/kit`, `/dashboard/brand/:slug/assets`): redirect or 404?
4. Brand Assistant scope: always available (brand-aware) or only inside a brand?
5. Dark mode default: follow system or manual toggle only?

## Status

- [x] Direction agreed
- [x] Planning docs drafted
- [ ] Claude Design brief finalized (`BRIEF.md`)
- [ ] Tokens returned from Claude Design
- [ ] Core components delivered
- [ ] Per-tab page templates delivered
- [ ] Brand Kit tab built
- [ ] Guideline tab built
- [ ] Design tab built
- [ ] Tools tab built
- [ ] Workspace shell built
- [ ] `/_dev/features` page built
- [ ] Legacy rails removed
