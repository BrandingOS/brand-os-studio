# BrandOS Architecture — Target State

> This document defines the new information architecture, navigation, page templates,
> and feature placement for BrandOS. Decisions are justified, not just stated.

---

## 1. Top-Level Information Architecture

BrandOS has **three scopes**. Every screen belongs to exactly one.

```
┌──────────────────────────────────────────────────────────────┐
│                         WORKSPACE                            │
│  Cross-brand: home, brand list, templates, learn, settings   │
│  ──────────────────────────────────────────────────────────  │
│                           BRAND                              │
│  Per-brand: identity, kit, guidelines, deliverables, share   │
│  ──────────────────────────────────────────────────────────  │
│                          EDITOR                              │
│  Focused canvas: design editor, guidelines canvas, logo lab  │
└──────────────────────────────────────────────────────────────┘
```

**The rule:** scope is determined by the URL prefix and visualized by which sidebar is mounted.

| Scope | URL prefix | Sidebar | Topbar |
|---|---|---|---|
| Workspace | `/` | `WorkspaceSidebar` | `WorkspaceTopBar` |
| Brand | `/b/:slug/*` | `BrandSidebar` | `BrandTopBar` (with brand switcher) |
| Editor | `/b/:slug/edit/:surface/:id` | `EditorRail` (icons only) | `EditorTopBar` (back/title/save) |

> URL change: The current `/dashboard/...` and `/dashboard/brand/:slug/...` prefixes are verbose
> and force users to think in implementation terms ("dashboard"). The new prefix is `/b/:slug/...`.
> *Migration is non-breaking via redirects in `App.tsx`; old links keep working.*

---

## 2. Workspace Scope

The workspace is "everything above a single brand". The sidebar:

```
─ Workspace ─
  ◇ Home              /
  ◇ Brands            /brands
  ◇ Templates         /templates
  ◇ Learn             /learn        (new — onboarding revisited, tutorials)
─────────────
  ◇ Settings          /settings
  ◇ Account           /account
```

**What changed:**
- ❌ "Logo Maker" removed from workspace sidebar. It is now a brand-scoped tool (see §6.2).
- ❌ "Activity" removed as a top-level item. Activity is folded into Home as a feed.
- ❌ Admin items are not in the persistent sidebar — they live at `/admin` behind a role gate, accessed from the user menu.
- ✅ "Learn" is added as a first-class entry — onboarding lessons, design tutorials, and best practices live here. Discoverability matters.

### 2.1 Workspace Home (`/`)

Sections in order:
1. **Continue** — last-edited brand, last-edited document. One-click resume.
2. **Your brands** — grid (max 6 visible) + "View all".
3. **Activity** — recent edits, exports, comments.
4. **Quick start** — start a new brand, browse templates, take the tour.

This replaces the current `/dashboard` page, which shows a dense, undifferentiated card grid.

### 2.2 Brands (`/brands`)

The brand library. Same as today's `/dashboard/brands`, but with:
- Standard `PageHeader` (title + create button)
- Filter/sort (cleaner than today's three-button row)
- Card hover reveals: open, duplicate, archive, share

### 2.3 Templates (`/templates`)

Cross-brand template library. Today's `/dashboard/templates`, lifted into the new shell.

### 2.4 Learn (`/learn`) — *new*

Tutorials, examples, "what is brand identity". The current onboarding flow is great content
trapped behind a one-shot wizard. We pull it out so users can revisit.

### 2.5 Settings (`/settings`) and Account (`/account`)

Workspace settings and personal account are split:
- `/settings` — workspace name, members, billing (one day), integrations (one day)
- `/account` — your profile, password, theme, language

Today's split between `/settings/account` and `/settings/plans` is renamed and lives here.
**`SettingsShell` is deleted** — the regular page shell handles this with a left-side settings nav slot.

---

## 3. Brand Scope

Inside a brand, the sidebar lists **five sections**. Not seven. Not nineteen. Five.

```
─ {Brand Name} ▼ ──   (← brand switcher dropdown lives in topbar; this is the section nav)
  ◇ Overview          /b/:slug
  ◇ Identity          /b/:slug/identity      (← merged: edit + brandkit identity bits)
  ◇ Assets            /b/:slug/assets        (← brandkit deliverables: cards, social, etc.)
  ◇ Guidelines        /b/:slug/guidelines    (← the published doc — was "Brand Guides" + "Guidelines Editor")
  ◇ Share             /b/:slug/share         (← exports, public showcase, links)
─────────────
  ◇ Brand settings    /b/:slug/settings
```

### 3.1 The five sections, justified

#### Overview (`/b/:slug`)
A glanceable home: brand at-a-glance card, completeness checklist, recent edits, "what's next".
Shows the user what state the brand is in and where to go next. Replaces the current overview which is mostly a feature menu.

#### Identity (`/b/:slug/identity`)
**This section absorbs:**
- Today's `/dashboard/brand/:slug/edit` (basic brand info, logo upload, colors, fonts)
- Today's `brandkit/typography`, `brandkit/color-system`, `brandkit/logo-files`, `brandkit/brand-strategy`, `brandkit/brand-voice` (the *meaning*-bearing modules, not the deliverables)
- Today's `brandkit/profile-icons` (logo variants are part of identity)

**Why merge:** "Edit Brand" and "Brand Kit > Color System" are the same thing today. Two doors to the same room. Identity is one tabbed page:

```
Identity
├── Logo            (uploads, variants, profile icons)
├── Colors          (palette, harmonies, neutrals)
├── Typography      (pairings, scales)
├── Voice           (tone, do/don't)
└── Strategy        (mission, values, positioning)
```

#### Assets (`/b/:slug/assets`)
**This section absorbs:**
- Today's brandkit deliverable modules: business cards, facebook covers, instagram posts/stories, presentations, animations, qr code, invoices, mockups, social media
- Today's `/dashboard/brand/:slug/social-media`

Assets are *generated outputs*, parameterized by Identity. They live in a single hub with categories:

```
Assets
├── Print          (cards, invoices)
├── Social         (FB covers, IG posts, IG stories, post templates)
├── Screen         (presentations, mockups, animations)
└── Utility        (QR, favicons)
```

#### Guidelines (`/b/:slug/guidelines`)
**This section absorbs:**
- Today's `/dashboard/brand/:slug/brand-guides`
- Today's `/dashboard/brand/:slug/guidelines` and `/dashboard/brand/:slug/guidelines/canvas`

Guidelines is *the published brand book* — the slide deck the user sends out. There's one editor (the canvas) and one viewer.

#### Share (`/b/:slug/share`)
**This section absorbs:**
- Today's public showcase route `/brand/:slug/showcase`
- Today's `/dashboard/brand/:slug/logo-presentation` (logo presentation deck = a *shareable artifact*, not a separate workspace section)
- Export-all flows, downloadable kits

This is where the user's brand becomes shareable. It's the "outbox".

### 3.2 What dies

These sidebar items are removed (their content moves into the new sections):

| Removed item | New home |
|---|---|
| Edit Brand | Identity |
| Brand Kit (top-level) | Split: meaning → Identity, deliverables → Assets |
| Brand Guides | Guidelines |
| Logo Presentation | Share |
| Guidelines Editor | Guidelines |
| Social Media | Assets > Social |
| brandkit submenu (19 items) | All routed into Identity / Assets |

### 3.3 Brand topbar

```
[← Workspace]  [BrandLogo Brand Name ▼]   [breadcrumb]   [Save state]   [Share ▾]   [User]
                  ↑                              ↑                          ↑
       brand switcher dropdown        section > subsection           opens Share section
```

The brand switcher in the topbar is the **only way to switch brands while in brand scope**.
Clicking "← Workspace" exits to `/`.

---

## 4. Editor Scope

When the user enters an editor (Identity > Logo > "Edit logo lab", Assets > "Edit business card",
Guidelines > "Edit canvas"), the entire shell collapses to the editor pattern:

```
┌────────────────────────────────────────────────────────────┐
│  ← Brand · Section · Document       [● Saved]   [Share]   │  ← EditorTopBar (h-12)
├──┬──────────────────────────────────────────────────┬─────┤
│  │                                                  │     │
│ E│                                                  │  P  │
│ R│                  CANVAS                          │  R  │
│ a│                                                  │  o  │
│ i│                                                  │  p  │
│ l│                                                  │     │
└──┴──────────────────────────────────────────────────┴─────┘
```

- **EditorRail (left, ~56px)** — icon-only navigation between editor *modes/tools* (e.g. Layers, Assets, Brand colors). Replaces the inconsistent toolbars of today.
- **PropertiesPanel (right, ~280px, collapsible)** — context-sensitive properties for the selected object. Shared across all editors.
- **Center** — the canvas. Could be Fabric.js, DOM slides, whatever — the **shell** is the same.

### 4.1 Editor unification plan

All current editors get rewritten to compose the editor shell:

| Today | Tomorrow |
|---|---|
| Design Editor (Fabric.js) | `editor/design` mounts in EditorShell |
| Guidelines Canvas (DOM slides) | `editor/guidelines` mounts in EditorShell |
| BrandKit module canvas (Fabric.js) | `editor/asset/:type` mounts in EditorShell |
| Logo Maker (custom SVG) | `editor/logo-lab` mounts in EditorShell |
| Brand Edit page (forms) | **Stops being an editor.** Becomes Identity tab pages with inline form editing — not the editor shell. |

**EditorContext** (`src/features/editor/core/EditorContext.tsx`) — which exists with zero consumers
today — becomes the actual shared store for editor state (selection, history, save state, dirty flag).

### 4.2 Save semantics — one model

Every editor uses the same save model:
- **Auto-save on change**, debounced 1.2s
- Save state visible in topbar (`● Saving…` / `● Saved` / `⚠ Save failed — retry`)
- Hard save on `⌘S`
- Conflict detection on hydration: if the server brand is newer than the local copy, prompt

This kills the current zoo: localStorage in Design Editor, immediate API in Brand Edit, Supabase API in Guidelines, none in Logo Maker.

---

## 5. Page Template System

There are exactly **four** page templates. Every page is one of these.

### 5.1 `AppPage` — listing/dashboard pages
```
[ AppShell · workspace or brand sidebar · topbar ]
  PageHeader       (title, subtitle, breadcrumb, actions)
  PageContent      (max-w-6xl, gap-y-8, sections)
```
**Used by:** workspace home, brands list, templates, brand overview, identity tabs, assets hub, guidelines list, share hub, all settings pages.

### 5.2 `EditorPage` — focused editing
```
[ EditorShell · EditorRail · EditorTopBar · canvas · PropertiesPanel ]
```
**Used by:** all 5 editor surfaces.

### 5.3 `FocusPage` — guided flows
```
[ FocusShell · centered max-w-3xl · sticky footer with primary action ]
```
**Used by:** onboarding, brand-creation wizard, first-run experiences.

### 5.4 `PublicPage` — unauthenticated views
```
[ PublicShell · minimal top nav · long-form content ]
```
**Used by:** `/b/:slug/showcase` (public brand link), auth pages.

> **Anything that isn't one of these four is a bug.** The bespoke `AppShellCanvaLayout` and the unused `SettingsShell` are deleted.

### 5.5 `PageHeader` — the universal page header

```tsx
<PageHeader
  breadcrumb={['Brand', 'Identity', 'Logo']}
  title="Logo"
  subtitle="Manage your logo variants and usage"
  actions={<Button>+ Add variant</Button>}
/>
```

Standard heights, standard spacing, standard typography. Replaces the per-page bespoke header
divs scattered across `src/pages/`.

---

## 6. Feature Placement Decision Log

The hard calls.

### 6.1 The brand-kit submenu (19 items)

**Decision:** Delete the submenu. Distribute its items into Identity and Assets per §3.

**Why:** The submenu (a) breaks every link except one because the routes don't exist; (b) is visually overwhelming; (c) duplicates concepts that exist elsewhere ("Brand Strategy" is in the brandkit submenu *and* in the brand-edit page).

**Migration path:** As we build out Identity tabs and Asset categories, each item lands in its real home. Until then, the submenu is replaced with a "Coming soon" hub on the existing `/dashboard/brand/:slug/brandkit` route.

### 6.2 Logo Maker placement & dead-end fix

**Decision:** Logo Maker is **brand-scoped**, lives at `/b/:slug/identity/logo/lab`, and on save writes to `Brand.logoAssets`.

**Why:**
1. Generating a logo without a brand is a sandbox exercise — fun, but creates orphan files. Forcing brand context means the output has a destination.
2. "I want to make a logo" is a *brand identity* task, not a workspace task. It belongs next to color and type.
3. The current `/dashboard/logo-maker` route confuses new users who don't yet have a brand.

**Migration path (this overhaul):**
- Keep `/dashboard/logo-maker` working as a redirect that *prompts the user to pick a brand first* (or creates a draft brand).
- Add a "Save to brand" action in Logo Maker that maps `LogoConfig` → `BrandLogoAssets.full + .icon` and routes back to `/b/:slug/identity/logo`.
- In the new shell, mount Logo Maker as the "Logo Lab" tab inside Identity > Logo.

### 6.3 Logo Presentation

**Decision:** Logo Presentation moves into **Share** as one of several share-formats. It uses the same presentation engine as Guidelines (one engine, two skins).

**Why:** Logo Presentation today has its own document store (`docsStore.ts`) that exists in parallel to the Guidelines slide store. They are 80% the same code with different aesthetics. Unify them.

**Engineering note:** The unification touches the export pipeline. **The editable export baseline tagged `stable/editable-export-v1` must be preserved** — `src/shared/services/export/vectorize/*` and its wiring are off-limits. The unification reuses the existing export path, doesn't rewrite it.

### 6.4 Design Editor

**Decision:** The general-purpose Design Editor stays, but is reframed as **the canvas inside Assets**. You enter it from Assets > [pick a deliverable] > Edit. The orphan `/editor/design/:slug` route becomes a redirect to Assets.

**Why:** "Design editor" as a top-level concept is confusing. It's a tool, not a destination. In practice, users always enter it to edit *some asset* — make that the model.

### 6.5 Guidelines Editor vs Brand Guides

**Decision:** Merged into one section, "Guidelines". One editor (canvas), one viewer (read-only with section nav), one export.

**Why:** They are the same artifact at different rendering stages.

### 6.6 Activity

**Decision:** Activity becomes a *feed component* used on the workspace Home and the brand Overview. It is not a top-level page.

**Why:** Standalone activity pages get visited once and then never. Embedding the feed in the place users actually land is more useful.

### 6.7 Admin

**Decision:** `/admin` (not `/dashboard/admin/...`). Behind role gate. Accessed from user menu only — not the persistent sidebar. Most users never see it.

---

## 7. Design System Unification

### 7.1 Tokens to enforce

These already exist in Tailwind config but are inconsistently used:
- `--container-tight` (max-w-6xl) — page content max width
- `--page-gutter` (px-4 sm:px-6 lg:px-8) — page horizontal padding
- `--page-vertical` (py-6 sm:py-8) — page vertical padding
- Topbar heights: `h-14` standard, `h-12` editor
- Section gap: `gap-y-8` between PageContent sections, `gap-y-4` within a section

The page templates **bake these in**. Pages stop redeclaring `max-w-5xl mx-auto px-...`.

### 7.2 Sidebar visual rules

All sidebars use the **same shadcn primitives** (`Sidebar`, `SidebarContent`, `SidebarMenu`).
The bespoke `CanvaSidebar` is deleted; its visual treatment becomes a `variant="rail"` of the shared sidebar (the editor mode).

Item heights, icon sizes, active state, collapsed behavior are defined once.

### 7.3 Shared editor primitives

`src/features/editor/core/` becomes the canonical home for:
- `EditorShell.tsx` — the layout
- `EditorContext.tsx` — the state (selection, history, dirty, save status)
- `EditorTopBar.tsx` — the top bar
- `EditorRail.tsx` — the icon left rail
- `EditorPropertiesPanel.tsx` — the right panel
- `useAutoSave.ts` — the save hook
- `useEditorHistory.ts` — undo/redo

Every editor consumes these. None roll their own.

---

## 8. Routing — Old → New

| Old | New | Status |
|---|---|---|
| `/dashboard` | `/` | Redirect old → new |
| `/dashboard/brands` | `/brands` | Redirect |
| `/dashboard/templates` | `/templates` | Redirect |
| `/dashboard/activity` | `/` (folded) | Redirect to home |
| `/dashboard/logo-maker` | `/b/:slug/identity/logo/lab` (after picking brand) | Interstitial picker |
| `/dashboard/admin/*` | `/admin/*` | Redirect |
| `/dashboard/brand/:slug` | `/b/:slug` | Redirect |
| `/dashboard/brand/:slug/edit` | `/b/:slug/identity` | Redirect |
| `/dashboard/brand/:slug/brandkit` | `/b/:slug/identity` *or* `/b/:slug/assets` | Hub redirect with chooser |
| `/dashboard/brand/:slug/brandkit/:moduleId` | `/b/:slug/identity/:moduleId` *or* `/b/:slug/assets/:moduleId` | Per-module redirect map |
| `/dashboard/brand/:slug/brand-guides` | `/b/:slug/guidelines` | Redirect |
| `/dashboard/brand/:slug/guidelines` | `/b/:slug/guidelines` | Same |
| `/dashboard/brand/:slug/guidelines/canvas` | `/b/:slug/guidelines/edit` | Redirect |
| `/dashboard/brand/:slug/logo-presentation` | `/b/:slug/share/logo` | Redirect |
| `/dashboard/brand/:slug/social-media` | `/b/:slug/assets/social` | Redirect |
| `/dashboard/brand/:slug/presentations` | `/b/:slug/assets/presentations` | Redirect |
| `/editor/design/:slug` | `/b/:slug/assets/design/:docId` | Redirect |
| `/settings/account` | `/account` | Redirect |
| `/settings/plans` | `/account/billing` | Redirect |

**Migration safety:** All old routes remain registered but render a `<Navigate to=... replace />`.
No bookmarks break.

---

## 9. Implementation order (high-level)

This document is the *target*. The roadmap to get there is in `EXECUTION.md`.

The high-leverage early moves (done in execution stages 1–4 of this sprint):

1. **Unify the page shell** — one shell, two layout wrappers (`DashboardLayout`, `BrandLayout`) collapse into the shell internally. Topbar height standardized. Padding fixed. Dead `SettingsShell` deleted.
2. **Cull the brand-kit submenu** — remove the 18 broken items, keep only what works.
3. **Standard PageHeader** — adopt across the top 5–6 pages.
4. **Logo Maker dead-end** — at minimum, add the "Save to Brand" action and route home.

These four moves don't yet rebuild the IA into the new sidebar — that's a bigger change that
needs careful migration of every page. They establish the **foundation** so the bigger move is
possible without fighting the codebase.
