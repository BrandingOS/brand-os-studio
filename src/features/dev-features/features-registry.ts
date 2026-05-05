/**
 * Feature inventory — single source of truth for the dev-only
 * `/_dev/features` page. Every routed surface (and a few cross-cutting
 * services) in BrandOS is listed here, tagged with the tab it belongs to
 * in the post-redesign 5-tab brand shell.
 *
 * This file is transcribed from `docs/ux-v2/audit/features.md`. When that
 * audit changes, update this registry — the dev page reads from it, not
 * from the markdown.
 *
 * The registry is intentionally static and string-based: no imports of
 * real feature components, so this file is cheap to load and safe to
 * ship even when it accidentally gets bundled in production (the page
 * itself is dev-gated).
 */

export type FeatureStatus = 'active' | 'dead' | 'planned';

export type FeatureTab =
  | 'setup'
  | 'brand-kit'
  | 'guideline'
  | 'design'
  | 'tools'
  | 'workspace'
  | 'dev'
  | 'admin'
  | 'public';

export interface FeatureEntry {
  /** Stable slug; used as React key and for URL hashes. */
  id: string;
  /** Display name for the card. */
  name: string;
  /** Tab this feature will live in (or already lives in). */
  tab: FeatureTab;
  /** Current route — `:slug` placeholder kept literal. */
  route: string;
  /** Absolute path of the entry component (repo-root relative is fine
   *  too — the page shows it verbatim). */
  entry: string;
  /** Whether the route is live, planned, or dead code. */
  status: FeatureStatus;
  /** One-sentence explainer shown in the card body. */
  description: string;
}

export const FEATURE_TAB_LABELS: Record<FeatureTab, string> = {
  setup: 'Setup',
  'brand-kit': 'Brand Kit',
  guideline: 'Guideline',
  design: 'Design',
  tools: 'Tools',
  workspace: 'Workspace',
  dev: 'Dev / Legacy',
  admin: 'Admin',
  public: 'Public',
};

export const FEATURE_TAB_ORDER: FeatureTab[] = [
  'setup',
  'brand-kit',
  'guideline',
  'design',
  'tools',
  'workspace',
  'public',
  'admin',
  'dev',
];

export const FEATURE_REGISTRY: FeatureEntry[] = [
  // ────────────────────────────────────────────────────────────────
  // Setup tab
  // ────────────────────────────────────────────────────────────────
  {
    id: 'setup-reference',
    name: 'Setup (new-direction reference)',
    tab: 'setup',
    route: '/setup',
    entry: 'src/features/setup/SetupPage.tsx',
    status: 'active',
    description:
      'Presentational Setup surface — logo, colors, fonts, icons, photos, websites, voice. Seeded from mockBrand today; wires to useBrand() in Phase 1.',
  },
  {
    id: 'setup-brand-scoped',
    name: 'Setup (brand-scoped)',
    tab: 'setup',
    route: '/b/:slug/setup',
    entry: 'src/pages/b/[slug]/setup.tsx',
    status: 'active',
    description:
      'Brand-scoped Setup wrapper. Maps a real Brand → MockBrand and passes it into SetupPage.',
  },
  {
    id: 'onboarding-canonical',
    name: 'Onboarding (canonical)',
    tab: 'setup',
    route: '/onboard-brand',
    entry: 'src/features/onboarding-brand/OnboardingBrand.tsx',
    status: 'active',
    description:
      'Canonical pre-brand onboarding flow. Lives outside the brand shell — runs before a brand exists.',
  },
  {
    id: 'onboarding-create',
    name: 'Onboarding — Create flow',
    tab: 'setup',
    route: '/onboard-brand/create',
    entry: 'src/features/onboarding-brand/OnboardingBrand.tsx',
    status: 'active',
    description: 'Sub-route of the canonical onboarding used by explicit "create new brand" CTAs.',
  },
  {
    id: 'brand-editor-metadata',
    name: 'Brand Editor (metadata)',
    tab: 'setup',
    route: '/b/:slug/edit',
    entry: 'src/features/brand/components/BrandEditor.tsx',
    status: 'active',
    description:
      'Legacy brand metadata editor. Candidate for merging into Setup\'s About section once the new shell takes over.',
  },
  {
    id: 'brand-identity-legacy',
    name: 'Brand Identity (legacy)',
    tab: 'setup',
    route: '/b/:slug/identity',
    entry: 'src/pages/dashboard/brand/[slug]/identity',
    status: 'active',
    description: 'Legacy Identity page (Logo · Colors · Typography · Voice · Strategy). Merges into Setup.',
  },

  // ────────────────────────────────────────────────────────────────
  // Brand Kit tab
  // ────────────────────────────────────────────────────────────────
  {
    id: 'brand-kit-v2',
    name: 'Brand Kit v2 hub',
    tab: 'brand-kit',
    route: '/b/:slug/brand-kit',
    entry: 'src/features/brand-kit-alt/BrandKitPage.tsx',
    status: 'active',
    description: 'Primary landing for the Brand Kit tab — module hub for brand assets and tokens.',
  },
  {
    id: 'brand-kit-module-deeplink',
    name: 'Brand Kit module deep-link',
    tab: 'brand-kit',
    route: '/b/:slug/brand-kit?module=:moduleId',
    entry: 'src/features/brand-kit-alt/BrandKitPage.tsx',
    status: 'planned',
    description: 'Deep-link into a specific module. Converting from `/kit/:moduleId` sub-route to query param.',
  },
  {
    id: 'brand-templates-legacy',
    name: 'Brand Templates',
    tab: 'brand-kit',
    route: '/b/:slug/templates',
    entry: 'src/pages/dashboard/brand/[slug]/templates',
    status: 'active',
    description: 'Templates index for a brand. Being absorbed into Brand Kit as ?section=templates.',
  },
  {
    id: 'brand-board',
    name: 'Brand Board',
    tab: 'brand-kit',
    route: '/b/:slug/brand-board',
    entry: 'src/features/brand-board/BrandBoardPage.tsx',
    status: 'active',
    description: 'Interactive brand-identity poster editor. See docs/brand-board/ for control spec.',
  },
  {
    id: 'logo-presentation',
    name: 'Logo Presentation',
    tab: 'brand-kit',
    route: '/b/:slug/logo-presentation',
    entry: 'src/pages/dashboard/brand/[slug]/logo-presentation',
    status: 'active',
    description: 'Showcase page for logo variants (full/stacked/mono/icon) in context.',
  },
  {
    id: 'brand-portal-v2',
    name: 'Brand Portal v2 (public)',
    tab: 'brand-kit',
    route: '/p/:slug',
    entry: 'src/features/brand-portal/v2/BrandPortalV2Page.tsx',
    status: 'active',
    description:
      'Public-facing brand portal. Lives in Tools → Share section at the IA level; listed here until routing moves.',
  },

  // ────────────────────────────────────────────────────────────────
  // Guideline tab
  // ────────────────────────────────────────────────────────────────
  {
    id: 'guidelines-hub',
    name: 'Guidelines Hub',
    tab: 'guideline',
    route: '/b/:slug/guidelines',
    entry: 'src/features/guidelines/components/BrandGuidelinePage.tsx',
    status: 'active',
    description: 'Canonical slide-based brand guideline editor. Renaming to /guideline (singular).',
  },
  {
    id: 'guidelines-canvas',
    name: 'Guidelines Canvas',
    tab: 'guideline',
    route: '/b/:slug/guidelines/canvas',
    entry: 'src/features/guidelines/components/CanvasGuidelinesEditor.tsx',
    status: 'active',
    description: 'Fullscreen canvas editor sub-route for guidelines (hideSidebar).',
  },
  {
    id: 'guidelines-blocks',
    name: 'Guidelines Blocks',
    tab: 'guideline',
    route: '/b/:slug/guidelines/blocks',
    entry: 'src/features/blocks/BlocksGuidelinesPage.tsx',
    status: 'active',
    description: 'Component block library used to compose guideline slides.',
  },
  {
    id: 'brand-guides-legacy',
    name: 'Brand Guides (legacy)',
    tab: 'guideline',
    route: '/b/:slug/brand-guides',
    entry: 'src/pages/dashboard/brand/[slug]/brand-guides',
    status: 'dead',
    description: 'Legacy guides page. Merging into Guidelines — candidate for removal in Phase 6.',
  },

  // ────────────────────────────────────────────────────────────────
  // Design tab
  // ────────────────────────────────────────────────────────────────
  {
    id: 'design-launchpad',
    name: 'Design Launchpad',
    tab: 'design',
    route: '/b/:slug/design',
    entry: 'src/pages/dashboard/brand/[slug]/design',
    status: 'active',
    description: 'Primary Design landing — Blank Canvas · AI Design · Recent.',
  },
  {
    id: 'ai-design-fullscreen',
    name: 'AI Design (fullscreen)',
    tab: 'design',
    route: '/b/:slug/ai-design',
    entry: 'src/pages/dashboard/brand/[slug]/ai-design',
    status: 'active',
    description: 'Fullscreen AI-driven design surface (hideSidebar).',
  },
  {
    id: 'design-ai',
    name: 'Design with AI',
    tab: 'design',
    route: '/b/:slug/design-ai',
    entry: 'src/pages/dashboard/brand/[slug]/design-ai',
    status: 'active',
    description: 'Alternate AI design workflow, fullscreen (hideSidebar).',
  },
  {
    id: 'design-canvas-editor',
    name: 'Design Canvas Editor',
    tab: 'design',
    route: '/editor/design/:slug',
    entry: 'src/features/editor/components/DesignEditor.tsx',
    status: 'active',
    description: 'Core Fabric.js canvas editor. Tagged stable/editable-export-v1 — off-limits for refactors.',
  },
  {
    id: 'presentations',
    name: 'Presentations',
    tab: 'design',
    route: '/b/:slug/presentations',
    entry: 'src/pages/dashboard/brand/[slug]/presentations',
    status: 'active',
    description: 'Presentation-style design sub-tool inside Design.',
  },
  {
    id: 'social-media',
    name: 'Social Media editor',
    tab: 'design',
    route: '/b/:slug/social-media',
    entry: 'src/features/social-media/',
    status: 'active',
    description: 'Direct-open social format editor. Replaced the old dark modal picker.',
  },
  {
    id: 'content-hub',
    name: 'Content Hub',
    tab: 'design',
    route: '/b/:slug/content',
    entry: 'src/pages/dashboard/brand/[slug]/content',
    status: 'active',
    description: 'Content calendar + posts + drafts. Moving into Design as ?section=content.',
  },
  {
    id: 'bento',
    name: 'Bento Grid',
    tab: 'design',
    route: '/b/:slug/bento',
    entry: 'src/pages/dashboard/brand/[slug]/bento',
    status: 'active',
    description: 'Fullscreen bento grid editor for brand showcases.',
  },

  // ────────────────────────────────────────────────────────────────
  // Tools tab
  // ────────────────────────────────────────────────────────────────
  {
    id: 'folders-dam',
    name: 'Folders (DAM)',
    tab: 'tools',
    route: '/b/:slug/folders',
    entry: 'src/features/dam/DamPage.tsx',
    status: 'active',
    description: 'Digital Asset Manager — assets + saved designs. Moves to Tools ?section=assets.',
  },
  {
    id: 'consistency-studio',
    name: 'Brand Consistency Studio',
    tab: 'tools',
    route: '/b/:slug/studio',
    entry: 'src/features/brand-consistency/ui/ConsistencyStudioPage.tsx',
    status: 'active',
    description: 'AI validator that scores designs against brand rules. Moves to Tools ?section=validation.',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    tab: 'tools',
    route: '/b/:slug/analytics',
    entry: 'src/features/analytics/AnalyticsPage.tsx',
    status: 'active',
    description: 'Per-brand analytics dashboard. Moves to Tools ?section=analytics.',
  },
  {
    id: 'approvals',
    name: 'Approvals',
    tab: 'tools',
    route: '/b/:slug/approvals',
    entry: 'src/features/approvals/ApprovalsPage.tsx',
    status: 'active',
    description: 'Per-brand design approvals inbox. Moves to Tools ?section=approvals.',
  },
  {
    id: 'share',
    name: 'Share',
    tab: 'tools',
    route: '/b/:slug/share',
    entry: 'src/pages/dashboard/brand/[slug]/share',
    status: 'active',
    description: 'Exports and public sharing links. Moves to Tools ?section=share.',
  },
  {
    id: 'variant-studio',
    name: 'Variant Studio',
    tab: 'tools',
    route: '/b/:slug/tools/variant-studio',
    entry: 'src/pages/dashboard/brand/[slug]/tools/variant-studio',
    status: 'active',
    description: 'Already lives under tools/* — logo variant generation for a brand.',
  },
  {
    id: 'ui-color-system',
    name: 'UI Color System',
    tab: 'tools',
    route: '/b/:slug/tools/ui-color-system',
    entry: 'src/pages/dashboard/brand/[slug]/tools/ui-color-system',
    status: 'active',
    description: 'In-app UI color system editor. Already under tools/*.',
  },
  {
    id: 'logo-maker-brand-scoped',
    name: 'Logo Maker (brand-scoped)',
    tab: 'tools',
    route: '/dashboard/logo-maker',
    entry: 'src/features/logo-maker/components/LogoMaker.tsx',
    status: 'active',
    description: 'Logo Maker — brand-scoped via LogoExportPanel\'s "Save to Brand". Moves to /b/:slug/tools/logo-maker.',
  },
  {
    id: 'brand-settings-v2',
    name: 'Brand Settings v2',
    tab: 'tools',
    route: '/b/:slug/settings',
    entry: 'src/features/brand-kit-alt/BrandSettingsPage.tsx',
    status: 'active',
    description: 'Brand-scoped settings (infrastructure-config separation). Moves to Tools ?section=settings.',
  },
  {
    id: 'mockup-studio',
    name: 'Mockup Studio',
    tab: 'tools',
    route: '/b/:slug/tools/mockup-studio',
    entry: 'src/features/mockup-studio/modes/brand-aware/BrandMockupStudioPage.tsx',
    status: 'active',
    description: 'Place designs on products (t-shirt, mug, card). Brand-aware auto-fill.',
  },

  // ────────────────────────────────────────────────────────────────
  // Workspace (outside brand shell)
  // ────────────────────────────────────────────────────────────────
  {
    id: 'brands-grid',
    name: 'Brands grid',
    tab: 'workspace',
    route: '/dashboard',
    entry: 'src/features/dashboard/components/DashboardMain.tsx',
    status: 'active',
    description: 'Workspace homepage — grid of brands the user owns or collaborates on.',
  },
  {
    id: 'activity',
    name: 'Activity',
    tab: 'workspace',
    route: '/dashboard/activity',
    entry: 'src/pages/dashboard/activity',
    status: 'active',
    description: 'Workspace-level activity feed.',
  },
  {
    id: 'templates-marketplace',
    name: 'Templates Marketplace',
    tab: 'workspace',
    route: '/templates',
    entry: 'src/features/templates/v5/TemplatesMarketplacePage.tsx',
    status: 'active',
    description: 'Browse templates; clicking one forces a brand-chooser before entering the editor.',
  },
  {
    id: 'template-builder',
    name: 'Template Builder',
    tab: 'workspace',
    route: '/templates/builder/:templateId',
    entry: 'src/features/templates/builder/TemplateBuilderPage.tsx',
    status: 'active',
    description: 'Full canvas where authors build templates for everyone. Stays at workspace level.',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    tab: 'workspace',
    route: '/marketplace',
    entry: 'src/features/marketplace/MarketplacePage.tsx',
    status: 'active',
    description: 'Workspace marketplace (plugins/assets/etc.).',
  },
  {
    id: 'learn',
    name: 'Learn',
    tab: 'workspace',
    route: '/learn',
    entry: 'src/pages/learn',
    status: 'active',
    description: 'Workspace-level learning resources.',
  },
  {
    id: 'settings',
    name: 'Settings (account / workspace / members / plans)',
    tab: 'workspace',
    route: '/settings/*',
    entry: 'src/pages/settings/*',
    status: 'active',
    description: 'SettingsLayout rendered on WorkspaceShell — account, workspace, members, plans tabs.',
  },
  {
    id: 'tools-directory',
    name: 'Tools Directory (public)',
    tab: 'workspace',
    route: '/tools',
    entry: 'src/pages/tools/index',
    status: 'active',
    description: 'Public landing for free standalone tools.',
  },

  // ────────────────────────────────────────────────────────────────
  // Public (unauthenticated)
  // ────────────────────────────────────────────────────────────────
  {
    id: 'public-brand-showcase',
    name: 'Public brand showcase',
    tab: 'public',
    route: '/brand/:slug',
    entry: 'src/pages/brand/[slug]/*',
    status: 'active',
    description: 'Unauthenticated public brand page. Untouched by this redesign.',
  },
  {
    id: 'public-brand-showcase-sub',
    name: 'Public showcase (sub-routes)',
    tab: 'public',
    route: '/brand/:slug/showcase',
    entry: 'src/pages/brand/[slug]/*',
    status: 'active',
    description: 'Public showcase view for a brand.',
  },
  {
    id: 'public-brand-bento',
    name: 'Public brand bento',
    tab: 'public',
    route: '/brand/:slug/bento/:bentoId',
    entry: 'src/pages/brand/[slug]/*',
    status: 'active',
    description: 'Public deep-link to a specific bento-grid view.',
  },
  {
    id: 'public-tool-logo-variant',
    name: 'Public tool — Logo Variant Generator',
    tab: 'public',
    route: '/tools/logo-variant-generator',
    entry: 'src/features/tools/',
    status: 'active',
    description: 'Unauthenticated free tool. Untouched by redesign.',
  },
  {
    id: 'public-tool-logo-to-svg',
    name: 'Public tool — Logo → SVG',
    tab: 'public',
    route: '/tools/logo-to-svg',
    entry: 'src/features/tools/',
    status: 'active',
    description: 'Unauthenticated raster-to-vector tool.',
  },
  {
    id: 'public-tool-ui-color-system',
    name: 'Public tool — UI Color System',
    tab: 'public',
    route: '/tools/ui-color-system',
    entry: 'src/features/tools/',
    status: 'active',
    description: 'Unauthenticated UI color system playground.',
  },

  // ────────────────────────────────────────────────────────────────
  // Admin (out of scope for redesign)
  // ────────────────────────────────────────────────────────────────
  {
    id: 'admin',
    name: 'Admin (all sub-routes)',
    tab: 'admin',
    route: '/admin/*',
    entry: 'src/pages/admin/*',
    status: 'active',
    description: 'AdminLayout plus 12 nested routes. Untouched by the brand-shell redesign.',
  },

  // ────────────────────────────────────────────────────────────────
  // Cross-cutting services (no route — global providers)
  // ────────────────────────────────────────────────────────────────
  {
    id: 'ai-brand-assistant',
    name: 'AI Brand Assistant',
    tab: 'dev',
    route: '—  (floating, Cmd+J)',
    entry: 'src/features/ai/v5/BrandAssistantProvider.tsx',
    status: 'active',
    description: 'Global floating pill assistant. No dedicated route.',
  },
  {
    id: 'collaboration-engine',
    name: 'Collaboration engine',
    tab: 'dev',
    route: '—  (global)',
    entry: 'src/features/collaboration/',
    status: 'active',
    description: 'Real-time collaboration service. Surfaces in Design + status pill in the top bar.',
  },
  {
    id: 'comments',
    name: 'Comments',
    tab: 'dev',
    route: '—  (inline on designs)',
    entry: 'src/features/comments/',
    status: 'active',
    description: 'Inline comments on designs. Global provider.',
  },
  {
    id: 'brand-rules-engine',
    name: 'Brand rules / validation',
    tab: 'dev',
    route: '—  (engine)',
    entry: 'src/features/brandkit/engine/brandRules.ts',
    status: 'active',
    description: 'Contrast / logo-variant / scoring engine. Used by Tools → Validation.',
  },
  {
    id: 'color-engine',
    name: 'Color engine',
    tab: 'dev',
    route: '—  (engine)',
    entry: 'src/features/brandkit/engine/colorEngine.ts',
    status: 'active',
    description: 'HSL/RGB/Hex + harmony + shade primitives. Used by Brand Kit + Tools.',
  },
  {
    id: 'editor-chrome',
    name: 'EditorChrome / useAutoSave',
    tab: 'dev',
    route: '—  (primitive)',
    entry: 'src/features/editor/core',
    status: 'active',
    description: 'Canonical editor topbar + debounced autosave. Used by every editor.',
  },

  // ────────────────────────────────────────────────────────────────
  // Dev-only / legacy (candidates for deletion in Phase 6)
  // ────────────────────────────────────────────────────────────────
  {
    id: 'onboarding-legacy',
    name: 'Onboarding (legacy)',
    tab: 'dev',
    route: '/onboarding',
    entry: 'src/pages/onboarding',
    status: 'dead',
    description: 'Legacy onboarding. Redirect to /onboard-brand; delete in Phase 6.',
  },
  {
    id: 'onboarding-v3',
    name: 'Onboarding v3',
    tab: 'dev',
    route: '/onboarding-v3',
    entry: 'src/pages/onboarding-v3',
    status: 'dead',
    description: 'Experimental onboarding. Redirect to /onboard-brand; delete in Phase 6.',
  },
  {
    id: 'onboarding-v4',
    name: 'Onboarding v4',
    tab: 'dev',
    route: '/onboarding-v4',
    entry: 'src/pages/onboarding-v4',
    status: 'dead',
    description: 'Experimental onboarding. Redirect to /onboard-brand; delete in Phase 6.',
  },
  {
    id: 'dashboard-shell-dead',
    name: 'DashboardShell (dead)',
    tab: 'dev',
    route: '—  (not mounted)',
    entry: 'src/shared/layouts/DashboardShell.tsx',
    status: 'dead',
    description: 'Dead layout. Remove in Phase 6.',
  },
  {
    id: 'onboarding-shell-dead',
    name: 'OnboardingShell (dead)',
    tab: 'dev',
    route: '—  (not mounted)',
    entry: 'src/shared/layouts/OnboardingShell.tsx',
    status: 'dead',
    description: 'Dead layout. Remove in Phase 6.',
  },
  {
    id: 'editor-shell-dead',
    name: 'EditorShell (dead)',
    tab: 'dev',
    route: '—  (not mounted)',
    entry: 'src/shared/layouts/EditorShell.tsx',
    status: 'dead',
    description: 'Dead layout. Remove in Phase 6.',
  },
  {
    id: 'landing-v2',
    name: 'Landing v2 (experimental)',
    tab: 'dev',
    route: '/v2',
    entry: 'src/features/landing-v2/DashboardV2.tsx',
    status: 'dead',
    description: 'Unused experimental landing. Delete candidate.',
  },
];

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  active: 'Active',
  planned: 'Planned',
  dead: 'Dead',
};
