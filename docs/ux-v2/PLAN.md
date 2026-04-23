# v2 Execution Plan — Restructure the app end-to-end

This is the master execution plan for rebuilding BrandOS's structure to match the v2 direction laid out in `README.md`. Phases run in dependency order. Within a phase, work that's independent runs in parallel via agents.

Design tools (Claude Design, Google Stitch) are not blocking. We ground the implementation in the existing `/setup` and `/onboard-brand` pages — they already embody the direction. We refine visuals later.

---

## Guiding principles

1. **Brand is a scope, not a page.** All brand-editing lives under `/b/:slug/*`. There are no top-level brand routes. `/setup` today is a temporary, mock-powered reference; it gets deleted once `/b/:slug/setup` is live.
2. **One shell per scope.** `BrandShell` wraps every brand-level tab. `WorkspaceShell` wraps everything outside a brand. No third shell is allowed without discussion.
3. **Logic stays, UI swaps.** Services, stores, engines (color, brand rules), editor core, slide logic — all intact. We only rewrite layouts, navigation, and per-tab presentation.
4. **No feature gets dropped.** Every old feature lands in one of the 5 tabs per `FEATURES.md`. If we can't place it, surface it.
5. **Ship on `dev`.** Work stays on the `dev` branch; commit early and often. No mirroring to `x` / `ui` / `v1` unless the user asks.
6. **Visual consistency anchor: `/setup`.** Any new surface is measured against `/setup`'s polish floor. Anything below that polish gets a follow-up pass.

---

## Phase 0 — Audit (parallel, ~15 min)

Read-only. Three Explore agents run in parallel, each with a narrow brief:

| Agent | Brief | Deliverable |
| --- | --- | --- |
| A. Routing & layouts | Map every route in `src/App.tsx`, every redirect, every layout file actively used, which routes use `AppRail` vs `CosmosWorkspaceShell`. | `docs/ux-v2/audit/routes.md` |
| B. Feature inventory | Walk `src/features/*` and `src/pages/*`. List every feature, its entry file, its current route, and how it connects to brand data. | `docs/ux-v2/audit/features.md` |
| C. Reference pages | Deep-dive `/setup` (how it reads brand, `mockBrand.ts` usage, sidebar/board structure) and `/onboard-brand` (stages, state, style scope). | `docs/ux-v2/audit/reference.md` |

Gate: I read all three, reconcile against `FEATURES.md`, update if needed. Commit `docs/ux-v2/audit/` to `dev`.

---

## Phase 1 — Foundation (sequential, ~60 min)

The part everything else depends on. Do this carefully.

### 1.1 Generalize the brand shell

Rename `CosmosWorkspaceShell` → `BrandShell` (or keep the filename, just extend). Change its API to accept:

```tsx
<BrandShell
  activeTab="setup" | "brand-kit" | "guideline" | "design" | "tools"
  sidebar={<SetupSidebar />}
  hideSidebar={false}
  brand={brand}
>
  <SetupBoard />
</BrandShell>
```

Behavior:
- Top-center pill nav always renders, with 5 tabs; active tab driven by `activeTab` prop or URL match
- Sidebar slot fills the left column when provided; when `hideSidebar` is true, main content spans full width (for Design canvas)
- Brand switcher pill lives in the top-left area (left of the tabs pill), showing current brand name + dropdown
- Theme toggle stays top-right
- Publish button stays top-right

**Files touched**:
- `src/shared/layouts/CosmosWorkspaceShell.tsx` → generalize (rename optional, internal)
- `src/shared/layouts/__tests__/BrandShell.test.tsx` → smoke test (new)

### 1.2 Brand state plumbing

Build / wire up `useBrand()` hook:

```tsx
const { brand, isLoading, error } = useBrand(); // resolves from URL slug
```

Resolution order:
1. URL slug → look up in `brandStore` → look up in Supabase
2. If no slug (top-level route), either (a) pick user's most-recently-edited brand and redirect, or (b) show brand chooser
3. In dev mode with no brand selected, fall back to `mockBrand.ts`

**Files touched**:
- `src/shared/hooks/useBrand.ts` (new)
- `src/shared/store/brandStore.ts` (may need a `getBySlug` selector)
- `src/core/adapters/BrandsService.ts` (if not already)

### 1.3 Slug-based route restructure

Update `src/App.tsx`:

```
Before:
  /setup → SetupPage (uses mockBrand)
  /brand-kit → placeholder
  /guideline → placeholder
  /design-workspace → placeholder
  /tools-workspace → placeholder
  /onboard-brand → OnboardingBrand
  /dashboard/brand/:slug/* → legacy brand routes
  /b/:slug/* → short-form brand routes

After:
  /                         → WorkspaceHome (brands grid)
  /dashboard                → redirect to /
  /learn                    → WorkspaceShell + LearnPage
  /settings                 → WorkspaceShell + SettingsPage
  /templates                → WorkspaceShell + TemplatesPage
  /onboard-brand            → OnboardingBrand (keeps its own shell)
  /b/:slug/setup            → BrandShell + SetupPage (active brand resolved)
  /b/:slug/brand-kit        → BrandShell + BrandKitPage
  /b/:slug/guideline        → BrandShell + GuidelinePage
  /b/:slug/design           → BrandShell + DesignPage (hideSidebar when canvas active)
  /b/:slug/tools            → BrandShell + ToolsPage
  /_dev/features            → AllFeaturesPage (DEV only)

Redirects (preserve old bookmarks):
  /setup                               → /b/:firstBrand/setup
  /brand-kit                           → /b/:firstBrand/brand-kit
  /guideline                           → /b/:firstBrand/guideline
  /design-workspace                    → /b/:firstBrand/design
  /tools-workspace                     → /b/:firstBrand/tools
  /dashboard/brand/:slug               → /b/:slug/setup
  /dashboard/brand/:slug/identity      → /b/:slug/setup
  /dashboard/brand/:slug/templates     → /b/:slug/brand-kit
  /dashboard/brand/:slug/design        → /b/:slug/design
  /dashboard/brand/:slug/content       → /b/:slug/design (content calendar lives in Design)
  /dashboard/brand/:slug/folders       → /b/:slug/tools (assets live in Tools)
  /dashboard/brand/:slug/share         → /b/:slug/tools (exports + share live in Tools)
  /kit                                 → /b/:firstBrand/brand-kit
```

**Files touched**:
- `src/App.tsx` (restructure all routes)
- `src/shared/routing/redirects.ts` (new, centralized redirect map)
- Any `<Navigate>` components needed

### 1.4 Scaffold the 4 empty tab pages

Each is a thin page component that uses `BrandShell` + a stub `*Sidebar` + a stub `*Board`. Looks polished but shows "Coming soon — features will land here" placeholders in the main content. The sidebar already lists the real modules; clicking a module is a no-op until Phase 3.

| Tab | Page | Sidebar | Board |
| --- | --- | --- | --- |
| Brand Kit | `src/features/brand-kit/BrandKitPage.tsx` | `BrandKitSidebar` | `BrandKitBoard` |
| Guideline | `src/features/guideline/GuidelinePage.tsx` | `GuidelineSidebar` | `GuidelineBoard` |
| Design | `src/features/design/DesignPage.tsx` | `DesignSidebar` | `DesignBoard` |
| Tools | `src/features/tools/ToolsPage.tsx` | `ToolsSidebar` | `ToolsBoard` |

**Note:** feature folders `src/features/brandkit/` (existing, without hyphen) and `src/features/guidelines/` (existing, plural) keep their logic. The new page files live either in the same folder or in a new folder that imports from them.

### 1.5 Brand switcher pill

New component `src/features/brand/components/BrandSwitcher.tsx`:
- Pill displaying current brand's name (Instrument Serif) + small chevron
- Click opens a dropdown listing all the user's brands, with a "+ New brand" entry at the bottom
- Selecting a brand navigates to `/b/:newSlug/:sameTab` (preserves which tab they're on)

Wired into `BrandShell` top-left.

---

## Phase 2 — Workspace shell (parallel-safe with Phase 1.4 after 1.1–1.3 land, ~40 min)

### 2.1 WorkspaceShell

New shell at `src/shared/layouts/WorkspaceShell.tsx`:
- Top bar: BrandOS logo left, profile menu right, "+ New brand" CTA right
- No tabs, no sidebar
- Same visual tokens as `BrandShell` (cream light / charcoal dark, soft floating feel)

### 2.2 Rebuild workspace pages

| Route | Page | Content |
| --- | --- | --- |
| `/` | `src/pages/workspace/Home.tsx` | Brands grid (new card style). Each card: top half = brand primary color, bottom half = cream surface with brand name + descriptor + "Open →". Hover lifts. |
| `/learn` | `src/pages/workspace/Learn.tsx` | Tutorials / docs list |
| `/settings` | `src/pages/workspace/Settings.tsx` | Account, billing, team |
| `/templates` | `src/pages/workspace/Templates.tsx` | Workspace template library. Click → `BrandChooserDialog` |

### 2.3 Brand chooser dialog

Review `src/features/brand/components/BrandChooserDialog.tsx` against the new visual language. Polish if needed.

---

## Phase 3 — Per-tab feature migration (parallel, ~120 min)

Once Phase 1 lands, each tab's migration is independent. Four parallel agents, one per tab.

### 3.1 Brand Kit tab

Wire up inside `BrandKitPage`:
- **Brand Board** — port from `src/features/brand-board/` / current brand board route
- **Logo Maker** — port from old Identity → Logo Maker
- **Color palette viewer** — core/accent/grey display
- **Typography system viewer** — display/body/UI scales
- **Icon system viewer**
- **Photography mood board**
- **Logo deck** (export-ready sheet)
- **Brand validation badge** (sidebar)
- **Download-all zip** button

Sidebar: module list. Click a module → scrolls/switches the main content to that module.

### 3.2 Guideline tab

Wire up inside `GuidelinePage`:
- **Slide-based editor** — port from `src/features/guidelines/`
- **Strategy / Voice / Logo usage / Color usage / Typography rules** — each a slide
- **Public share link**
- **PDF export**
- **Showcase link** (optional — can live in Tools instead)

Sidebar: outline of slides, drag-to-reorder.

### 3.3 Design tab

Wire up inside `DesignPage`:
- **Launchpad** — Blank Canvas · AI Design · Recent
- **Canvas editor** — at `/b/:slug/design/canvas/:id`, `hideSidebar={true}` on the shell, reuse existing `EditorChrome` + `useAutoSave`
- **Template picker** — Bento · Social · Print · Screen · Utility
- **Social media editor** — at `/b/:slug/design/social?platform=X&format=Y`, direct-open (no dark modal)
- **Content Calendar** — sub-section of Design
- **Posts list, Drafts list**
- **Saved Designs library**

Sidebar: projects list + templates picker. Collapses when canvas is fullscreen.

### 3.4 Tools tab

Wire up inside `ToolsPage`:
- **DAM / Asset library** — uses `AssetSourcePopover` logic
- **Batch export hub**
- **Public share link**
- **Brand showcase page** (public)
- **Brand validation audit panel**
- **Contrast checker**
- **Standalone Logo Maker** (non-saving mode)
- **Integrations / API keys** (stub, Planned)

Sidebar: tool categories (Export · Share · Validation · Assets · Integrations).

---

## Phase 4 — Onboarding polish (~30 min)

### 4.1 Review `/onboard-brand`

Open the page, compare against the `/setup` polish floor. Note gaps.

### 4.2 Apply fixes

Likely wins:
- Ensure the prompt input uses the same soft textarea style as the rest of the UI
- Ensure stage transitions use the same `cubic-bezier(0.22, 1, 0.36, 1)` motion
- Match shadow / radius / spacing tokens
- Ensure floating bottom-right assistant pill is present or explicitly absent (decide)

### 4.3 Confirm the return flow

After onboarding completes, user lands on `/b/:newSlug/setup` (not `/dashboard`). The `?then=` param already hints this works — verify end-to-end.

---

## Phase 5 — `/_dev/features` page (~45 min)

### 5.1 Page

New route `/_dev/features`, gated behind `import.meta.env.DEV || searchParams.get('dev') === '1'`. Not linked from any user-facing nav.

### 5.2 Data

Static registry at `src/features/dev/features-registry.ts`:

```ts
export const FEATURE_REGISTRY = [
  { id: 'logo-setup',        name: 'Logo setup',          tab: 'setup',      route: '/b/:slug/setup#logo',     status: 'active',  description: 'Logo upload + variants' },
  { id: 'brand-board',       name: 'Brand Board',         tab: 'brand-kit',  route: '/b/:slug/brand-kit#board', status: 'active', description: 'Interactive brand poster' },
  // ... all 60+ features from FEATURES.md
];
```

### 5.3 UI

- Grid of feature cards, grouped by tab (collapsible sections)
- Each card: name, current route, status badge (active / dead / planned), open-in-new button
- Filter bar: search by name, filter by tab, filter by status
- Optional nice-to-have (v2 of this page): drag-to-propose-reorg + export as diff

---

## Phase 6 — Cleanup & verification (~30 min)

### 6.1 Kill legacy code

Delete these files once no route imports them:
- `src/shared/layouts/AppRail.tsx`
- `src/features/brand/components/BrandSidebar.tsx`
- Any `DashboardLayout` / `BrandLayout` that wrap `AppRail`
- Legacy redirects in `src/App.tsx` that target dead routes (after confirming redirects to new routes cover them)

Scan for dead imports:
```bash
npx depcheck
grep -rn "AppRail" src/
grep -rn "BrandSidebar" src/
```

### 6.2 Verification

```bash
npm run typecheck     # must pass
npm run lint          # must pass
npm run test          # must pass (existing tests)
npm run dev           # start server, walk every route
```

Routes to walk:
- `/` → brands grid
- `/learn`, `/settings`, `/templates`
- `/onboard-brand`
- `/b/<slug>/setup`, `/brand-kit`, `/guideline`, `/design`, `/tools` for at least 2 brands
- `/b/<slug>/design/canvas/<id>` — canvas fullscreen
- `/_dev/features`

Check for:
- No blank pages
- No duplicate sidebars (both old and new showing at once)
- No console errors
- Dark mode works on every screen
- Tab switching preserves `:slug`
- Brand switcher jumps to same tab on new brand

### 6.3 Docs refresh

Update `docs/ux-v2/README.md` status checklist. Commit.

---

## Execution order (timeline)

```
T+0:00  Write PLAN.md (this doc) + commit to dev
T+0:05  Phase 0 — spawn 3 Explore agents in parallel
T+0:20  Phase 0 done — reconcile audit, commit
T+0:25  Phase 1 — sequential (generalize shell → useBrand → routes → scaffolds → brand switcher)
T+1:25  Phase 1 done — commit, checkpoint with user
T+1:30  Phase 2 — workspace shell (parallel agent starts Brand Kit migration)
T+2:10  Phase 2 done
T+2:15  Phase 3 — four parallel agents, one per tab
T+4:15  Phase 3 done — commit each tab separately
T+4:20  Phase 4 — onboarding polish
T+4:50  Phase 5 — /_dev/features page
T+5:35  Phase 6 — cleanup + verification
T+6:05  Done. Final commit + push. App is fully restructured.
```

Realistic total: ~6 hours of aggressive parallel execution. If time runs out, the priority order is: Phase 0 → Phase 1 (foundation) → Phase 3.1 (Brand Kit) → Phase 3.3 (Design) → Phase 2 (Workspace) → Phase 3.2 (Guideline) → Phase 3.4 (Tools) → Phase 4 → Phase 5 → Phase 6.

Phase 1 is the indispensable one. If only one phase lands, it must be that one — the rest can be iterated.

---

## Rollback plan

Everything happens on `dev`. If a phase lands badly:
```bash
git log --oneline dev
git revert <bad-commit-sha>   # or
git reset --hard <good-sha>   # if not pushed yet
```

Nothing is being pushed to `main`, `ui`, `x`, or `v1` during this work. Production (`main` → brandingos.ai) is untouched until the user chooses to ship.

---

## What I need from the user

Nothing, until Phase 1 lands. Then quick yes/no on:
1. Brand switcher pill style (dropdown vs popover)
2. Workspace root URL (`/` vs `/dashboard`)
3. Proceed with Phase 3 as planned, or re-prioritize tabs

After Phase 6 lands, we discuss visual polish and any Claude Design / Stitch outputs you want to incorporate.
