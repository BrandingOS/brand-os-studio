# Audit: Feature Inventory (Phase 0, Agent B)

Generated 2026-04-23. Every user-facing feature grouped by the new tab it belongs in. Zero silent drops.

## Setup tab

| Feature | Entry | Route | Notes |
| --- | --- | --- | --- |
| Setup (new-direction reference) | `src/features/setup/SetupPage.tsx` | `/setup` → will become `/b/:slug/setup` | Uses `mockBrand.ts` today; wire to `useBrand()` in Phase 1 |
| Onboarding (canonical) | `src/features/onboarding-brand/OnboardingBrand.tsx` | `/onboard-brand`, `/onboard-brand/create` | Stays outside brand shell — pre-brand state |
| Brand Editor (metadata) | `src/features/brand/components/BrandEditor.tsx` | `/b/:slug/edit` | Legacy; may merge into Setup's About section |
| Brand Identity | `src/pages/dashboard/brand/[slug]/identity` | `/b/:slug/identity` | Legacy; merges into Setup |

## Brand Kit tab

| Feature | Entry | Route | Notes |
| --- | --- | --- | --- |
| Brand Kit v2 hub | `src/features/brandkit-v2/BrandKitPage.tsx` | `/b/:slug/kit` → `/b/:slug/brand-kit` | Primary landing for tab |
| Brand Kit module deep-link | `src/features/brandkit-v2/BrandKitPage.tsx` | `/b/:slug/kit/:moduleId` → `/b/:slug/brand-kit?module=X` | Convert to query param or sub-route |
| Brand Templates | `src/pages/dashboard/brand/[slug]/templates` | `/b/:slug/templates` → `/b/:slug/brand-kit?section=templates` | Absorb into Brand Kit |
| Brand Board | `src/features/brand-board/BrandBoardPage.tsx` | `/b/:slug/brand-board` | Brand poster editor, see `docs/brand-board/` |
| Logo Presentation | `src/pages/dashboard/brand/[slug]/logo-presentation` | `/b/:slug/logo-presentation` | Showcase logo variants |
| Brand Portal v2 | `src/features/brand-portal/v2/BrandPortalV2Page.tsx` | `/p/:slug` (public) | Lives in Tools → Share side, not Brand Kit. Update placement. |

## Guideline tab

| Feature | Entry | Route | Notes |
| --- | --- | --- | --- |
| Guidelines Hub | `src/features/guidelines/components/BrandGuidelinePage.tsx` | `/b/:slug/guidelines` → `/b/:slug/guideline` | Canonical slide-based editor |
| Guidelines Canvas | `src/features/guidelines/components/CanvasGuidelinesEditor.tsx` | `/b/:slug/guidelines/canvas` | Fullscreen sub-route (hideSidebar) |
| Guidelines Blocks | `src/features/blocks/BlocksGuidelinesPage.tsx` | `/b/:slug/guidelines/blocks` | Component block library |
| Brand Guides (legacy) | `src/pages/dashboard/brand/[slug]/brand-guides` | `/b/:slug/brand-guides` | Merge into Guidelines |

## Design tab

| Feature | Entry | Route | Notes |
| --- | --- | --- | --- |
| Design Launchpad | `src/pages/dashboard/brand/[slug]/design` | `/b/:slug/design` | Primary landing |
| AI Design (fullscreen) | `src/pages/dashboard/brand/[slug]/ai-design` | `/b/:slug/ai-design` | hideSidebar |
| Design with AI | `src/pages/dashboard/brand/[slug]/design-ai` | `/b/:slug/design-ai` | hideSidebar |
| Design Canvas Editor | `src/features/editor/components/DesignEditor.tsx` | `/editor/design/:slug` → `/b/:slug/design/canvas/:id` | Core canvas; off-limits per CLAUDE.md |
| Presentations | `src/pages/dashboard/brand/[slug]/presentations` | `/b/:slug/presentations` | Sub-tool in Design |
| Social Media editor | `src/features/social-media/` | `/b/:slug/social-media` | Direct-open, no dark modal |
| Content Hub | `src/pages/dashboard/brand/[slug]/content` | `/b/:slug/content` → `/b/:slug/design?section=content` | Content calendar + drafts |
| Bento Grid | `src/pages/dashboard/brand/[slug]/bento` | `/b/:slug/bento` | Fullscreen |

## Tools tab

| Feature | Entry | Route | Notes |
| --- | --- | --- | --- |
| Folders (DAM) | `src/features/dam/DamPage.tsx` | `/b/:slug/folders` → `/b/:slug/tools?section=assets` | Asset library |
| Brand Consistency Studio | `src/features/brand-consistency/ui/ConsistencyStudioPage.tsx` | `/b/:slug/studio` → `/b/:slug/tools?section=validation` | AI validator |
| Analytics | `src/features/analytics/AnalyticsPage.tsx` | `/b/:slug/analytics` → `/b/:slug/tools?section=analytics` | |
| Approvals | `src/features/approvals/ApprovalsPage.tsx` | `/b/:slug/approvals` → `/b/:slug/tools?section=approvals` | |
| Share | `src/pages/dashboard/brand/[slug]/share` | `/b/:slug/share` → `/b/:slug/tools?section=share` | Exports + public links |
| Variant Studio (in-app) | `src/pages/dashboard/brand/[slug]/tools/variant-studio` | `/b/:slug/tools/variant-studio` | Already under tools/* |
| UI Color System (in-app) | `src/pages/dashboard/brand/[slug]/tools/ui-color-system` | `/b/:slug/tools/ui-color-system` | Already under tools/* |
| Logo Maker (brand-scoped) | `src/features/logo-maker/components/LogoMaker.tsx` | `/dashboard/logo-maker` (today) | Move to `/b/:slug/tools/logo-maker` |
| Brand Settings v2 | `src/features/brandkit-v2/BrandSettingsPage.tsx` | `/b/:slug/settings` → `/b/:slug/tools?section=settings` | Brand-scoped settings |

## Workspace (outside brand shell)

| Feature | Entry | Route | Notes |
| --- | --- | --- | --- |
| Brands grid | `src/features/dashboard/components/DashboardMain.tsx` | `/dashboard`, `/dashboard/brands` → `/` | Homepage |
| Activity | `src/pages/dashboard/activity` | `/dashboard/activity` → `/activity` | |
| Templates Marketplace | `src/features/templates/v5/TemplatesMarketplacePage.tsx` | `/templates`, `/dashboard/templates` → `/templates` | |
| Template Builder | `src/features/templates/builder/TemplateBuilderPage.tsx` | `/templates/builder/:templateId` | Full canvas — consider keeping outside shell |
| Marketplace | `src/features/marketplace/MarketplacePage.tsx` | `/marketplace` | |
| Learn | `src/pages/learn` | `/learn` | |
| Settings (account/workspace/members/plans) | `src/pages/settings/*` | `/settings/*` | SettingsLayout on WorkspaceShell |
| Tools Directory (public) | `src/pages/tools/index` | `/tools` | Public landing for free tools |
| Public brand showcase | `src/pages/brand/[slug]/*` | `/brand/:slug`, `/brand/:slug/showcase`, `/brand/:slug/bento/:bentoId` | Unauthenticated; untouched by redesign |
| Public tools | `src/features/tools/*` | `/tools/logo-variant-generator`, `/tools/logo-to-svg`, `/tools/ui-color-system` | Unauthenticated; untouched |
| Landing v2 (experimental) | `src/features/landing-v2/DashboardV2.tsx` | `/v2` | Delete if unused |

## Admin (out of scope)

AdminLayout + 12 nested routes at `/admin/*` — untouched by this redesign.

## Cross-cutting services (global providers, no route)

| Service | Location | Notes |
| --- | --- | --- |
| AI Brand Assistant | `src/features/ai/v5/BrandAssistantProvider.tsx` | Floating pill, Cmd+J |
| Collaboration engine | `src/features/collaboration/` | Real-time; no dedicated page |
| Comments | `src/features/comments/` | Inline on designs |
| Brand rules / validation | `src/features/brandkit/engine/brandRules.ts` | Used by Tools → Validation |
| Color engine | `src/features/brandkit/engine/colorEngine.ts` | Used by Brand Kit + Tools |
| EditorChrome / useAutoSave | `src/features/editor/core` | Shared primitives |

## Dev-only / legacy (candidates for deletion in Phase 6)

- `/onboarding`, `/onboarding-v3`, `/onboarding-v4` → redirect to `/onboard-brand`
- `BrandSidebar.tsx` (exported, not imported)
- `DashboardShell.tsx`, `OnboardingShell.tsx`, `EditorShell.tsx` (all dead)
- `/dashboard/logo-maker` — move under `/b/:slug/tools/logo-maker` if brand-scoped is the right mode
- `/v2` landing page (unused experimental)

## Open placement questions (decide in Phase 1)

1. **Brand Board** — Brand Kit (current plan) or Design (if treated as a canvas)? → Brand Kit. It's a presentation of brand assets, not a design deliverable.
2. **Brand Portal v2** (`/p/:slug`) — public showcase, lives in Tools → Share section.
3. **Collaboration + Comments** — global providers; surface in Design (where they matter most) + status pill in top bar.
4. **Brand Settings v2** — Tools → Settings (or Setup? leaning Tools for infra-config separation).
5. **Template Builder** — workspace or brand? Today workspace. Keep workspace (builder authors templates for everyone).

## Feature count

~55 distinct routed surfaces + ~6 cross-cutting providers. Everything is accounted for.
