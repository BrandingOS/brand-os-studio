# BrandingOS UX Redesign — Planning & Execution Hub

> Started 2026-04-07. This folder is the source of truth for the BrandingOS structural overhaul:
> diagnosis, principles, target architecture, user flows, and the rolling execution log.

## Documents

| File | Purpose |
|---|---|
| `README.md` (this file) | Diagnosis, principles, multi-agent setup, success criteria |
| `ARCHITECTURE.md` | New IA, navigation system, page templates, feature placement decisions |
| `USER-FLOWS.md` | Personas, user stories, end-to-end flows |
| `EXECUTION.md` | Staged roadmap and append-only execution log |

---

## 1. The Brief

BrandingOS today is **a collection of features wired into routes, not a coherent product**. The
codebase has grown by addition: each feature (logo maker, logo presentation, brandkit, guidelines,
design editor, brand edit) was built as its own island, with its own layout, its own toolbar
language, its own save semantics, and its own relationship to the Brand object. The user lands in
a different visual world every time they click a sidebar item.

This document set is the plan to fix that — not by skinning, but by **restructuring information
architecture, unifying the page shell, collapsing duplicated systems, and making the editors
behave like one product**.

---

## 2. Multi-Agent Setup Used For This Plan

The planning was produced by orchestrating focused subagents in parallel against the real codebase
(not theory). Each agent had a narrow brief and reported with file paths and line numbers.

- **Navigation & Shell Audit Agent** — inventoried every layout, sidebar, topbar, and page-shell pattern in `src/`
- **Logo Tangle Agent** — traced the relationship between `logo-maker`, `logo-presentation`, and brand-level logo storage
- **Editor Fragmentation Agent** — mapped every "editor" surface and how/why they diverge
- *(In execution mode, additional agents are spawned per stage as needed: Execution Agent, Validation Agent, Doc Agent.)*

The findings below are **derived from the real code**, not assumed.

---

## 3. Diagnosis — What's Actually Broken

### 3.1 Shell & layout chaos

There are **7 different layout/shell components** in active use, doing nearly the same job:

- `AppShell` (`src/shared/layouts/AppShell.tsx`) — the supposed primitive
- `DashboardShell` (`src/shared/layouts/DashboardShell.tsx`) — wraps AppShell + DashboardSidebar
- `DashboardLayout` (`src/features/dashboard/components/DashboardLayout.tsx`) — **a parallel implementation** that bypasses AppShell entirely and reaches for SidebarProvider directly
- `BrandLayout` (`src/features/brand/components/BrandLayout.tsx`) — same thing for brand routes
- `AppShellCanvaLayout` (`src/features/brand/components/AppShellCanvaLayout.tsx`) — bespoke, hardcoded `padding: '56px 16px 0 16px'`, used only by guidelines canvas
- `EditorShell` (`src/features/editor/components/EditorShell.tsx`) — a data loader masquerading as a layout
- `OnboardingShell` (`src/shared/layouts/OnboardingShell.tsx`) — fine, but it's a 4th pattern
- `SettingsShell` (`src/shared/layouts/SettingsShell.tsx`) — **dead code**, declares routes that don't exist (`/settings/team`, `/settings/integrations`, `/settings/notifications`, `/settings/security`)

**Real consequences:**
- Topbar height is `h-16` in DashboardNavbar, `h-14` in BrandNavbar and CanvaTopBar — the page literally jumps when you cross from `/dashboard` to `/dashboard/brand/:slug`.
- `BrandLayout` applies `container-tight py-6`, then individual brand pages add `max-w-5xl mx-auto px-4 sm:px-6 py-8` *on top* — double-wrapped containers, double padding, inconsistent widths page-to-page.
- Five different padding patterns across six representative pages (dashboard home, brands list, brand overview, brandkit hub, guidelines canvas, design editor).

### 3.2 Sidebar inventory

Three sidebars, three completely different visual languages:

| Sidebar | Used by | Items | Behavior |
|---|---|---|---|
| `DashboardSidebar` | dashboard-level pages | Home, My Brands, Logo Maker, Templates, Activity, Admin | shadcn collapsible |
| `BrandSidebar` | brand-scoped pages | Overview, Edit, Brand Kit, Social Media, Brand Guides, Logo Presentation, Guidelines Editor + a 19-item conditional submenu | shadcn collapsible, conditional submenu |
| `CanvaSidebar` | guidelines canvas only | 5 icon-only items, no labels, custom impl | tooltip-only, no shadcn |

**The brand-kit submenu is the worst offender.** It declares 19 sub-items. The routes *do* resolve
(via the parameterized `/brandkit/:moduleId` route handled by `BrandKitModuleView`), but **18
items in a sidebar submenu is information overload**, not a navigation system. The "Download
Fonts" item was disabled with a lock icon, signalling a feature gate that doesn't exist. The
submenu is the main reason brand-scope navigation feels overwhelming.

### 3.3 The logo tangle

Three feature folders deal with logos and **none of them talk to each other**:

| Folder | What it does | How it persists |
|---|---|---|
| `src/features/logo-maker/` | Designs a logo from scratch (icon + text + color, canvas) | **Browser download only.** No path back to a Brand. |
| `src/features/logo-presentation/` | Builds a slide-deck presenting 3–5 logo *concepts* (uploaded images) | Its **own** document store (`docsStore.ts`), separate from Brand |
| `src/features/brand/components/LogoUploader.tsx` | Multi-slot uploader (primary, wordmark, icon, dark, light…) | UI-only state; doesn't write `Brand.logoAssets` reliably |

Meanwhile `Brand.logoAssets` (`src/shared/types/brand.ts`) defines the canonical schema (full,
icon, wordmark, alternate, dark, light), but the **only consumer** in the codebase is
`src/features/brandkit/components/renderers/BrandLogo.tsx`. Everything writes to different places.

**User-visible failure:** "I made a logo in Logo Maker. Now what?" → nothing. There is no button,
no flow, no destination.

### 3.4 Editor fragmentation

Six editor surfaces, each reinvented:

| Editor | Tech | Save | Undo | Toolbar | Brand load |
|---|---|---|---|---|---|
| Design Editor (`src/features/editor/`) | Fabric.js | localStorage debounce | Custom 50-state array | Top bar | `services.brands.getBySlug()` |
| Guidelines Canvas (`src/features/guidelines/`) | React DOM | Supabase API | None | Left sidebar | `useBrandStore.loadAll()` |
| Brand Edit Page (`src/pages/dashboard/brand/[slug]/edit.tsx`) | Form fields | Immediate per-change | None | Sticky header | `useBrandStore.loadBySlug()` |
| BrandKit Module Editor (`src/features/brandkit/components/editor/`) | Fabric.js | None found | None | Left column | Prop |
| Logo Maker | Custom SVG/canvas | None | None | Tabbed left | N/A |
| Logo Presentation | React DOM slides | Own doc store | None | None | Slug match |

**`EditorContext` and `EditorTopToolbar` exist in `src/features/editor/core/` and are
imported by zero consumers.** Someone tried to start unifying and stopped.

### 3.5 Routing & dead routes

- `/editor/design/:slug` is reachable but **lives in no sidebar**. Orphan.
- `/dashboard/brand/:slug/presentations` is registered in App.tsx but **lives in no sidebar** and is unreachable through normal navigation.
- The `SettingsShell` declares 4 routes that don't exist.
- The brand-kit submenu declares 19 routes, **only 1 of which exists** (`brandkit/:moduleId` covers them generically through `BrandKitModuleView`, but the routes shown in the sidebar are *literal* paths that don't match the parameterized route).

### 3.6 Naming & mental model breaks

- "Brand Kit", "Brand Guides", "Guidelines Editor", "Logo Presentation", "Presentations", "Design Tool" — six top-level brand items, several of which are subsets of each other.
- "Edit Brand" sits next to "Brand Kit" in the sidebar, but Brand Kit *also* edits the brand. A user has no way to know which one they need.
- "Logo Presentation" (slide deck of concepts) is named almost identically to "Presentations" (general decks). They are different things.

---

## 4. UX Principles for BrandingOS

These are the rules everything below follows.

1. **One shell, three modes.** There is exactly one page-shell primitive. It has three modes: `app` (sidebar + topbar + padded content), `editor` (sidebar + topbar + edge-to-edge canvas), `focus` (no chrome — onboarding, public showcase). All pages must use it.
2. **Sidebar = scope switcher, not feature dump.** The sidebar tells you *where you are* (workspace vs. brand) and lets you move between scopes. It does not list every tool. Tools live inside scope homes.
3. **Brand workspace has its own home.** Inside a brand, the sidebar shows ~5 sections, not 7+19. Anything more lives inside a section's hub page.
4. **Editors share a chrome.** Top bar (back / title / save / actions), left rail (navigation/inspector), center (canvas), right rail (properties). If a tool is "an editor", it uses the editor shell. Period.
5. **Every tool has a destination.** No feature ships without answering: where does its output go, and what's the next action? Logo Maker without a "Save to Brand" path is a bug, not a feature.
6. **No dead links.** A sidebar item exists only if its route exists and works.
7. **Naming is hierarchical and unambiguous.** "Brand Identity" contains logo, colors, type. "Brand Assets" contains generated deliverables. "Brand Guidelines" is the published doc. These are not synonyms.
8. **Breadcrumb beats back-button.** Every page above the leaf shows a breadcrumb. The Back button only appears in modal-style flows.
9. **Progressive disclosure.** New users see 3 things, not 17. Power features unlock contextually.
10. **Premium by restraint.** Whitespace, restrained color, one accent. The product earns trust by *not* being busy.

---

## 5. Success Criteria

The redesign is successful when:

- A new user can create their first brand in **under 3 minutes** without reading anything.
- The phrase "where do I find…" never refers to two different places.
- Every editor uses the same toolbar layout and the same save semantics.
- There are zero dead sidebar links.
- A returning user lands directly on what they were last working on.
- Switching between two brands is one click and preserves context.
- The codebase has **one** page-shell primitive, **one** editor shell, **one** brand-data loading pattern.

---

## 6. Where To Read Next

- For the new structure → `ARCHITECTURE.md`
- For who we're designing for → `USER-FLOWS.md`
- For what's being built and what's done → `EXECUTION.md`
