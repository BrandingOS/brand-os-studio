# Audit: Routes & Layouts (Phase 0, Agent A)

Generated 2026-04-23. Source of truth: `src/App.tsx` + `grep -rn` on imports.

## TL;DR — what matters for the restructure

1. **Dual brand URL schemes exist today**: both `/dashboard/brand/:slug/*` (legacy long form) and `/b/:slug/*` (short form) render the same `BrandRouteLayout + BrandLayout + AppRail` stack with identical nested children. Migrating to `/b/:slug/*` only means removing the long form + redirecting.
2. **Flat workspace tab routes are a temporary state**: `/setup`, `/brand-kit`, `/guideline`, `/design-workspace`, `/tools-workspace` are the ONLY routes currently using `CosmosWorkspaceShell`. They must become `/b/:slug/{setup,brand-kit,guideline,design,tools}` and shed the placeholder pattern.
3. **Three dead layout files** in `src/shared/layouts/`: `DashboardShell.tsx`, `OnboardingShell.tsx`, `EditorShell.tsx` — nothing imports them. Safe to delete in Phase 6.
4. **`BrandSidebar.tsx`** is exported from `src/features/brand/index.ts:5` but not imported anywhere. Dead code. Delete in Phase 6.
5. **Four stale onboarding versions** coexist: `/onboarding` (v1), `/onboarding-v3`, `/onboarding-v4`, `/onboard-brand` (canonical new direction). In Phase 4 we decide: keep `/onboard-brand` only, redirect the rest.

## Route inventory (summary)

- **Total routes**: ~90 (public + protected + nested)
- **Brand-scoped nested**: 13 children × 2 URL schemes (26 active brand routes) + ~10 flat siblings per scheme
- **Workspace-flat routes**: `/dashboard`, `/dashboard/brands`, `/dashboard/activity`, `/dashboard/logo-maker`, `/dashboard/templates`, `/dashboard/features`, `/learn`, `/templates`, `/marketplace`, `/v2`
- **Admin routes**: 12 under `/admin/*` (AdminLayout, not touched by this redesign)
- **Settings routes**: 4 under `/settings/*` (SettingsLayout wraps DashboardLayout)
- **Public / unauthenticated**: ~15 routes (landing, tools marketing, public brand showcase, legal pages) — untouched by this redesign

## Active layouts (6)

| Layout | Path | Used by | Keep? |
| --- | --- | --- | --- |
| `BrandRouteLayout` | `src/shared/layouts/BrandRouteLayout.tsx` | All `/dashboard/brand/:slug/*` + `/b/:slug/*` parents | Extend — becomes the gateway that resolves brand from slug and injects the new `BrandShell` |
| `BrandLayout` | `src/features/brand/components/BrandLayout.tsx` | Mounted by `BrandRouteLayout` | **Replace** with new `BrandShell` that uses the Cosmos top-nav pattern. This is the biggest UI change. |
| `AppRail` | `src/shared/layouts/AppRail.tsx` | `BrandLayout`, `DashboardLayout`, `DashboardShell`, `BrandBoardPage` (fullscreen override) | **Kill** (Phase 6). The 88px slim rail + dual-sidebar is gone. |
| `CosmosWorkspaceShell` | `src/shared/layouts/CosmosWorkspaceShell.tsx` | `/setup`, `/brand-kit`, `/guideline`, `/design-workspace`, `/tools-workspace`, `/onboard-brand`, `/onboard-brand/create`, `ColorSystemGenerator` | **Generalize** into the universal `BrandShell`. Already has top-nav infrastructure. |
| `DashboardLayout` | `src/features/dashboard/components/DashboardLayout.tsx` | All workspace pages (`/dashboard/*`, `/learn`, `/settings/*` via SettingsLayout) | **Replace** with new `WorkspaceShell` (simpler, no sidebar rail). |
| `AdminLayout` | `src/features/admin/components/AdminLayout.tsx` | All `/admin/*` | Keep — out of scope for this redesign. |
| `SettingsLayout` | `src/shared/layouts/SettingsLayout.tsx` | `/settings/*` | Rebuild on top of new WorkspaceShell. |

## Dead layouts / components (safe to delete Phase 6)

- `src/shared/layouts/DashboardShell.tsx`
- `src/shared/layouts/OnboardingShell.tsx`
- `src/shared/layouts/EditorShell.tsx`
- `src/features/brand/components/BrandSidebar.tsx` (export exists in `src/features/brand/index.ts:5` but no importer)

## The 13 nested brand children (both URL schemes)

These must map to the new 5 tabs:

| Current nested path | Page | New tab |
| --- | --- | --- |
| index (`/b/:slug`) | `BrandHomePage` | → redirect to `/b/:slug/setup` (or keep overview?) |
| `edit` | `BrandEditPage` | → Setup (or delete if redundant with setup editor) |
| `identity` | `IdentityPage` | → Setup |
| `design` | `DesignLaunchpadPage` | → Design |
| `content` | `ContentHubPage` | → Design (content calendar sub-section) |
| `share` | `SharePage` | → Tools (exports + share) |
| `templates` | `BrandTemplatesPage` | → Brand Kit (templates are brand-kit assets) |
| `kit` | `BrandKitV2Page` | → Brand Kit |
| `brandkit/:moduleId` | `BrandKitModulePage` | → Brand Kit (module deep-link) |
| `folders` | `DamPage` | → Tools (DAM) |
| `studio` | `ConsistencyStudioPage` | → Tools (validation) |
| `assets` | redirect to `/templates` | → kill this redirect, point to `/b/:slug/tools?section=assets` |
| `guidelines` | `GuidelinesHubPage` | → Guideline |
| `dam` | redirect to `/folders` | → delete, update to `/b/:slug/tools?section=assets` |

## Fullscreen brand siblings (no BrandLayout)

Need to decide per-route whether they live under BrandShell with `hideSidebar` or stay fullscreen:

| Route | Page | Recommended |
| --- | --- | --- |
| `ai-design` | `AiDesignPage` | BrandShell, hideSidebar (Design tab canvas) |
| `design-ai` | `DesignWithAiPage` | BrandShell, hideSidebar |
| `brand-guides` | `BrandGuidesPage` | → `/b/:slug/guideline` (merge) |
| `logo-presentation` | `LogoPresentationPage` | BrandShell under Brand Kit |
| `presentations` | `PresentationsPage` | BrandShell under Design |
| `social-media` | `SocialMediaPage` | BrandShell, hideSidebar (Design sub-editor) |
| `guidelines/canvas` | `CanvasGuidelinesPage` | BrandShell, hideSidebar |
| `brand-board` | `BrandBoardPage` | BrandShell under Brand Kit |
| `bento` | `BrandBentoPage` | BrandShell under Design |
| `settings` | `BrandSettingsV2Page` | BrandShell (new: brand-scoped settings) |
| `tools/variant-studio` | `VariantStudioInAppPage` | BrandShell under Tools |
| `tools/ui-color-system` | `InAppUiColorSystemPage` | BrandShell under Tools |
| `guidelines/blocks` | `BlocksGuidelinesPage` | BrandShell under Guideline |
| `analytics` | `AnalyticsPage` | BrandShell under Tools |
| `approvals` | `ApprovalsPage` | BrandShell under Tools |

## Onboarding versions (decide what survives)

| Route | Page | Verdict |
| --- | --- | --- |
| `/onboarding` | `OnboardingPage` (v1) | Delete |
| `/onboarding-brand` | `OnboardingBrandPage` (v1 alias) | Delete |
| `/onboarding/preview` | `BrandPreviewPage` | Delete |
| `/onboarding-v3`, `/onboarding-v3/create`, `/onboarding-v3/preview` | v3 pages | Delete |
| `/onboarding-v4`, `/onboarding-v4/create` | v4 pages | Delete |
| `/onboard-brand`, `/onboard-brand/create` | `OnboardBrandPage`, `OnboardBrandCreatePage` | **Keep — canonical** |

All stale versions redirect to `/onboard-brand` in Phase 6.

## Brand state resolution today

- URL slug via `useParams<{ slug: string }>()`
- `useBrandStore` (Zustand) holds the current brand
- `useBrandPageConfigStore` lets child pages publish layout config to parent (innerNav, maxWidth, brand name)
- `BrandRouteLayout` wraps brand routes; it resolves the brand once and passes it down

## Redirects registered today

| Source | Destination |
| --- | --- |
| `/dashboard/brand/:slug/brandkit` | `/b/:slug/kit` |
| `/dashboard/brand/:slug/dam` | `/b/:slug/folders?...` |
| `/dashboard/brand/:slug/assets` | `/b/:slug/templates?...` |
| `/b/:slug/brandkit` | `/b/:slug/kit` |
| `/settings` | `/settings/account` |

## Files that reference `AppRail` (kill-list targets)

- `src/features/brand/components/BrandLayout.tsx:29`
- `src/features/dashboard/components/DashboardLayout.tsx:12`
- `src/shared/layouts/DashboardShell.tsx:11` (dead)
- `src/features/brand-board/BrandBoardPage.tsx:8`

## Files that reference `CosmosWorkspaceShell` (extend/reuse)

- `src/features/setup/SetupPage.tsx:3`
- `src/features/setup/components/WorkspacePlaceholder.tsx:2`
- `src/features/tools/ui-color-system/components/ColorSystemGenerator.tsx:11`

Plus onboarding pages that import it.
