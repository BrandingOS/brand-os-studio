import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { ThemeProvider, useTheme } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { PageSpinner } from "@/components/PageSpinner";
import { CommandPaletteProvider } from "@/shared/search/CommandPaletteProvider";
import { BrandAssistantProvider } from "@/features/ai/v5/BrandAssistantProvider";

// Eager: only pages needed on first paint or critical to routing
import IndexPage from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SettingsLayout } from "./shared/layouts/SettingsLayout";
import { BrandRouteLayout } from "./shared/layouts/BrandRouteLayout";
import { AdminLayout } from "./features/admin/components/AdminLayout";

// Lazy-loaded pages (split into separate chunks for faster initial load)
const OnboardingPage = lazy(() => import("./pages/onboarding"));
const OnboardingBrandPage = lazy(() => import("./pages/onboarding-brand"));
const BrandPreviewPage = lazy(() => import("./pages/onboarding/preview"));
const OnboardingV3Page = lazy(() => import("./pages/onboarding-v3"));
const OnboardingV3CreatePage = lazy(() => import("./pages/onboarding-v3/create"));
const OnboardingV3PreviewPage = lazy(() => import("./pages/onboarding-v3/preview"));
const OnboardingV4Page = lazy(() => import("./pages/onboarding-v4"));
const OnboardingV4CreatePage = lazy(() => import("./pages/onboarding-v4/create"));
// New canonical Cosmos onboarding + workspace routes. The onboarding screens
// are shared with /onboarding-v4 (the prior preview alias); the workspace
// pages (Setup / Brand Kit / Guideline / Design / Tools) live under a new
// top-center-nav shell, see src/shared/layouts/WorkspaceShell.tsx.
const OnboardBrandPage = lazy(() => import("./pages/onboard-brand"));
const OnboardBrandCreatePage = lazy(() => import("./pages/onboard-brand/create"));
const WorkspaceSetupPage = lazy(() => import("./pages/setup"));
const WorkspaceBrandKitPage = lazy(() => import("./pages/setup/brand-kit"));
const WorkspaceGuidelinePage = lazy(() => import("./pages/setup/guideline"));
const WorkspaceDesignPage = lazy(() => import("./pages/setup/design"));
const WorkspaceToolsPage = lazy(() => import("./pages/setup/tools"));
// v2 brand-scoped tabs — the 5 tabs always live inside a brand under /b/:slug/*.
// See docs/ux-v2/PLAN.md for the full restructure plan.
const BrandSetupPageV2 = lazy(() => import("./pages/b/[slug]/setup"));
const BrandBrandKitPageV2 = lazy(() => import("./pages/b/[slug]/brand-kit"));
const BrandGuidelinePageV2 = lazy(() => import("./pages/b/[slug]/guideline"));
const BrandDesignPageV2 = lazy(() => import("./pages/b/[slug]/design"));
const BrandToolsPageV2 = lazy(() => import("./pages/b/[slug]/tools"));
const BrandTemplatesStudioPage = lazy(() => import("./pages/b/[slug]/templates"));
// v2 workspace shell pages (outside a brand). Simpler shell, no tabs.
const WorkspaceHomePage = lazy(() => import("./pages/workspace/Home"));
const WorkspaceLearnPage = lazy(() => import("./pages/workspace/Learn"));
const WorkspaceSettingsPageV2 = lazy(() => import("./pages/workspace/Settings"));
const WorkspaceTemplatesPageV2 = lazy(() => import("./pages/workspace/Templates"));
// Dev-only all-features inventory page (self-gated on import.meta.env.DEV).
const DevFeaturesPage = lazy(() => import("./pages/_dev/features"));
const DevEditorPage = lazy(() => import("./pages/dev-editor"));
const EditorLauncherPage = lazy(() => import("./pages/editor-launcher"));
const DashboardRoute = lazy(() => import("./pages/dashboard"));
const BrandsPage = lazy(() => import("./pages/dashboard/brands"));
const ActivityPage = lazy(() => import("./pages/dashboard/activity"));
const TemplatesPage = lazy(() => import("./pages/dashboard/templates"));
const AdminBrandsPage = lazy(() => import("./pages/dashboard/admin/brands"));
const AdminAnalyticsPage = lazy(() => import("./pages/dashboard/admin/analytics"));
const BrandHomePage = lazy(() => import("./pages/dashboard/brand/[slug]"));
const BrandEditPage = lazy(() => import("./pages/dashboard/brand/[slug]/edit"));
const BrandKitModulePage = lazy(() => import("./pages/dashboard/brand/[slug]/brandkit/[moduleId]"));
const BrandGuidesPage = lazy(() => import("./pages/dashboard/brand/[slug]/brand-guides"));
const LogoPresentationPage = lazy(() => import("./pages/dashboard/brand/[slug]/logo-presentation"));
const PresentationsPage = lazy(() => import("./pages/dashboard/brand/[slug]/presentations"));
const CaseStudyPage = lazy(() => import("./features/case-study-deck/pages/CaseStudyPage"));
const CaseStudySlideEditorPage = lazy(() => import("./features/case-study-deck/pages/CaseStudySlideEditorPage"));
const PitchDeckPage = lazy(() => import("./features/pitch-deck/pages/PitchDeckPage"));
const DeckV2Page = lazy(() => import("./shared/presentation/v2/components/DeckV2Page"));
const SocialMediaPage = lazy(() => import("./pages/dashboard/brand/[slug]/social-media"));
const GuidelinesHubPage = lazy(() => import("./pages/dashboard/brand/[slug]/guidelines"));
const CanvasGuidelinesPage = lazy(() => import("./pages/dashboard/brand/[slug]/guidelines/canvas"));
const AccountSettingsPage = lazy(() => import("./pages/settings/account"));
const PlansPage = lazy(() => import("./pages/settings/plans"));
const WorkspaceSettingsPage = lazy(() => import("./pages/settings/workspace"));
const MembersPage = lazy(() => import("./pages/settings/members"));
const BrandDetailPage = lazy(() => import("./pages/brand/[slug]"));
const BrandShowcasePage = lazy(() => import("./pages/brand/[slug]/showcase"));
const ResetPasswordPage = lazy(() => import("./pages/auth/reset-password"));
const LoginPage = lazy(() => import("./pages/auth/login"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const AccountDeletionPage = lazy(() => import("./pages/legal/AccountDeletionPage"));

// Admin dashboard
const AdminOverview = lazy(() => import("./features/admin/pages/AdminOverview"));
const AdminEarlyAccessPage = lazy(() => import("./features/admin/pages/AdminEarlyAccess"));
const AdminUsersPage = lazy(() => import("./features/admin/pages/AdminUsers"));
const AdminTemplatesQueuePage = lazy(() => import("./pages/admin/TemplatesQueuePage"));
const AdminBrandsPage2 = lazy(() => import("./features/admin/pages/AdminBrands"));
const AdminWorkspacesPage = lazy(() => import("./features/admin/pages/AdminWorkspaces"));
const AdminSubscriptionsPage = lazy(() => import("./features/admin/pages/AdminSubscriptions"));
const AdminActivityPage2 = lazy(() => import("./features/admin/pages/AdminActivity"));
const AdminSettingsPage = lazy(() => import("./features/admin/pages/AdminSettings"));
const AdminUserDetailPage = lazy(() => import("./features/admin/pages/AdminUserDetail"));
const AdminReportsPage = lazy(() => import("./features/admin/pages/AdminReports"));
const AdminFeatureFlagsPage = lazy(() => import("./features/admin/pages/AdminFeatureFlags"));
const AdminAnnouncementsPage = lazy(() => import("./features/admin/pages/AdminAnnouncements"));

const LogoMakerPage = lazy(() => import("./pages/dashboard/logo-maker"));
// Public 6-screen Logo Maker flow (docs/logo-maker/LOGO_MAKER_SPEC.md).
// Coexists with /dashboard/logo-maker above until Phase 4 merges them.
import { logoMakerFlowRoutes } from "./features/logo-maker/flow";
const LogoToSvgPage = lazy(() => import("./features/tools/logo-to-svg/LogoToSvgPage"));
const LearnPage = lazy(() => import("./pages/learn"));
const IdentityPage = lazy(() => import("./pages/dashboard/brand/[slug]/identity"));
const SharePage = lazy(() => import("./pages/dashboard/brand/[slug]/share"));
const BrandTemplatesPage = lazy(() => import("./pages/dashboard/brand/[slug]/templates"));
const DesignLaunchpadPage = lazy(() => import("./pages/dashboard/brand/[slug]/design"));
// Production unified-editor route — minimum viable, scoped forward
// from Phase 4.5 to unblock the Step 9 brandkit migration. See the
// route file's header comment for what's intentionally deferred.
const BrandDesignEditorPage = lazy(
  () => import("./pages/dashboard/brand/[slug]/design/[designSlug]"),
);
const ContentHubPage = lazy(() => import("./pages/dashboard/brand/[slug]/content"));
const FeaturesIndexPage = lazy(() => import("./pages/dashboard/features"));
const BrandBentoPage = lazy(() => import("./pages/dashboard/brand/[slug]/bento"));
const StandaloneBentoPage = lazy(() => import("./pages/dashboard/tools/bento"));
const PublicBentoPage = lazy(() => import("./pages/brand/[slug]/bento/[bentoId]"));
const ConsistencyStudioPage = lazy(() => import("./pages/dashboard/brand/[slug]/studio"));
const BrandBoardPage = lazy(() => import("./features/brand-board/BrandBoardPage"));

const DesignEditorPage = lazy(() => import('./pages/editor/design'));
const StandaloneEditorPage = lazy(() => import('./pages/editor/index'));
// Tools platform — public + in-app routes for the Tools suite. Lazy-loaded
// because the variant-studio bundle pulls in jspdf/jszip and isn't needed
// on the main dashboard path.
const ToolsDirectoryPage = lazy(() => import('./pages/tools'));
const PublicVariantStudioPage = lazy(() => import('./pages/tools/logo-variant-generator'));
const ClaimPage = lazy(() => import('./pages/tools/claim'));
const VariantStudioInAppPage = lazy(() => import('./pages/dashboard/brand/[slug]/tools/variant-studio'));
const PublicUiColorSystemPage = lazy(() => import('./pages/tools/ui-color-system'));
const InAppUiColorSystemPage = lazy(() => import('./pages/dashboard/brand/[slug]/tools/ui-color-system'));
const PublicTypescalePage = lazy(() => import('./pages/tools/typescale'));
const InAppTypescalePage = lazy(() => import('./pages/dashboard/brand/[slug]/tools/typescale'));
const StandaloneMockupStudioPage = lazy(
  () => import('./features/mockup-studio/modes/standalone/StandaloneMockupStudioPage'),
);
const BrandMockupStudioPage = lazy(
  () => import('./features/mockup-studio/modes/brand-aware/BrandMockupStudioPage'),
);
const DashboardV2Page = lazy(() => import('./features/landing-v2/DashboardV2'));
const DamPage = lazy(() => import('./features/dam/DamPage'));
const TemplatesMarketplacePage = lazy(() => import('./features/templates/v5/TemplatesMarketplacePage'));
const TemplateBuilderPage = lazy(() => import('./features/templates/builder/TemplateBuilderPage'));
const BrandPortalV2Page = lazy(() => import('./features/brand-portal/v2/BrandPortalV2Page'));
const BlocksGuidelinesPage = lazy(() => import('./features/blocks/BlocksGuidelinesPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const MarketplacePage = lazy(() => import('./features/marketplace/MarketplacePage'));
const ApprovalsPage = lazy(() => import('./features/approvals/ApprovalsPage'));
const BrandKitV2Page = lazy(() => import('./features/brand-kit-alt/BrandKitPage'));
const BrandSettingsV2Page = lazy(() => import('./features/brand-kit-alt/BrandSettingsPage'));

/** /brandkit (no moduleId) → canonical brand-kit hub at /a/:slug/brand-kit. */
function BrandKitRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/a/${slug}/brand-kit`} replace />;
}

/** Legacy /dam URL → /folders. Phase A: target lives at /a. Preserves
 *  any ?category= filter on the URL. */
function DamRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  return <Navigate to={`/a/${slug}/folders${search}`} replace />;
}

/** /assets → /templates. The Assets deliverable catalog folded into
 *  Templates (see docs/ux-redesign/ARCHITECTURE.md §3 revised). Phase A:
 *  Templates is unmigrated, lives at /a/:slug/templates. */
function AssetsRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  return <Navigate to={`/a/${slug}/templates${search}`} replace />;
}

/**
 * Phase A v2 — Classic path harmonization helpers.
 *
 * The canonical path names match Studio's (`<ns>/:slug/setup`,
 * `<ns>/:slug/brand-kit`, `<ns>/:slug/guideline`). These three helpers
 * redirect the old Classic paths to the harmonized ones so that
 * bookmarks and inbound links keep working through the renames.
 *
 * Bare /a/:slug → /a/:slug/setup. Classic's "Overview" content (the
 * BrandHomePage with Recent/Search/Templates tabs) now lives at /setup.
 */
function ClassicIndexToSetupRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  return <Navigate to={`/a/${slug}/setup${search}`} replace />;
}
function ClassicKitToBrandKitRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  return <Navigate to={`/a/${slug}/brand-kit${search}`} replace />;
}
function ClassicGuidelinesToGuidelineRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  return <Navigate to={`/a/${slug}/guideline${search}`} replace />;
}

/**
 * Phase A graceful fallback: `/b/:slug/<unmigrated section>` → `/a/:slug/<same>`.
 *
 * Day-1 migrated Studio sections: setup, brand-kit, guideline, design, tools
 * (plus the unified-editor, fullscreen surfaces, and Studio launchpad). Any
 * other path under /b/:slug — e.g. /b/:slug/identity, /b/:slug/content — is
 * not yet ported to a Studio shell. Per Concern 1 decision (1b: graceful
 * redirect map), bounce to the Classic equivalent until Phase B ports it.
 *
 * The migrated sections are mounted as explicit Routes higher up the tree
 * and win React Router v6's specificity ranking, so they never reach this
 * fallback. Phase B removes the corresponding /a entries as features port.
 */
export function StudioToClassicFallback() {
  const { slug } = useParams<{ slug: string }>();
  const { pathname, search } = useLocation();
  const tail = slug ? pathname.replace(new RegExp(`^/b/${slug}/?`), '') : '';
  const target = tail ? `/a/${slug}/${tail}` : `/a/${slug}`;
  return <Navigate to={`${target}${search}`} replace />;
}

/**
 * Phase A legacy URL push: `/dashboard/brand/:slug/*` → `/b/:slug/*`.
 *
 * Existing bookmarks and external links land on Studio (canonical). If the
 * specific section isn't migrated yet, StudioToClassicFallback then bounces
 * to /a. Two-hop is acceptable for old deep-links (the user's settings
 * preference doesn't enter into legacy URLs since they predate the toggle).
 */
export function DashboardBrandToStudioRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { pathname, search } = useLocation();
  const tail = slug ? pathname.replace(new RegExp(`^/dashboard/brand/${slug}/?`), '') : '';
  const target = tail ? `/b/${slug}/${tail}` : `/b/${slug}`;
  return <Navigate to={`${target}${search}`} replace />;
}


const queryClient = new QueryClient();

// Bridges the global `brandos:toggle-theme` event (dispatched from the
// command palette / non-React callsites) into next-themes' setTheme so the
// provider's internal state stays in sync. Mutating documentElement
// directly causes the next render to flip the theme back.
function ThemeToggleBridge() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const onToggle = () => {
      const current = theme === 'system' ? resolvedTheme : theme;
      setTheme(current === 'dark' ? 'light' : 'dark');
    };
    window.addEventListener('brandos:toggle-theme', onToggle);
    return () => window.removeEventListener('brandos:toggle-theme', onToggle);
  }, [theme, resolvedTheme, setTheme]);
  return null;
}

const App = () => (
  // ThemeProvider config notes:
  // - enableSystem={false}: ignore the OS preference and stick to the
  //   explicit user choice. With enableSystem=true the provider listens to
  //   prefers-color-scheme and can flip the theme out from under us if the
  //   OS reports a transition (e.g. macOS auto dark/light at sundown).
  // - disableTransitionOnChange: when the theme DOES change, snap instead of
  //   running CSS transitions on every color. Without this, every component
  //   with `transition-colors` slow-fades on theme change which looks like
  //   the whole page is "breathing" between dark and light.
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    disableTransitionOnChange
  >
  <ThemeToggleBridge />
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <CommandPaletteProvider>
          <BrandAssistantProvider>
          <Toaster />
          <ErrorBoundary>
          <Suspense fallback={<PageSpinner />}>
          <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/account-deletion" element={<AccountDeletionPage />} />
          <Route path="/v2" element={<DashboardV2Page />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding-brand" element={<OnboardingBrandPage />} />
          {logoMakerFlowRoutes}
          <Route path="/onboarding/preview" element={<BrandPreviewPage />} />
          <Route path="/onboarding-v3" element={<OnboardingV3Page />} />
          <Route path="/onboarding-v3/create" element={<OnboardingV3CreatePage />} />
          <Route path="/onboarding-v3/preview" element={<OnboardingV3PreviewPage />} />
          <Route path="/onboarding-v4" element={<OnboardingV4Page />} />
          <Route path="/onboarding-v4/create" element={<OnboardingV4CreatePage />} />
          {/*
            ─── New Cosmos UI direction ───────────────────────────────
            Onboarding:  /onboard-brand (+ /onboard-brand/create)
            Workspace:   /setup · /brand-kit · /guideline
                         /design-workspace · /tools-workspace
            The workspace tabs share the WorkspaceShell — a top-
            center segmented nav with Setup · Brand Kit · Guideline ·
            Design · Tools. Setup replaces the legacy "Sitemap" concept
            as the first and primary tab.
            `/design-workspace` + `/tools-workspace` are name-spaced so
            they don't collide with the existing public `/tools` tools
            directory or brand-scoped `/b/:slug/design`.
            ─────────────────────────────────────────────────────────── */}
          <Route path="/onboard-brand" element={<OnboardBrandPage />} />
          <Route path="/onboard-brand/create" element={<OnboardBrandCreatePage />} />
          <Route path="/setup" element={<WorkspaceSetupPage />} />
          <Route path="/brand-kit" element={<WorkspaceBrandKitPage />} />
          <Route path="/guideline" element={<WorkspaceGuidelinePage />} />
          <Route path="/design-workspace" element={<WorkspaceDesignPage />} />
          <Route path="/tools-workspace" element={<WorkspaceToolsPage />} />
          {/* v2 workspace home — new WorkspaceShell (no tabs). Old DashboardRoute
              stays lazy-imported but unused; Phase 6 removes it. */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <WorkspaceHomePage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brands" element={
            <ProtectedRoute>
              <BrandsPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/activity" element={
            <ProtectedRoute>
              <ActivityPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/logo-maker" element={
            <ProtectedRoute>
              <LogoMakerPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/templates" element={
            <ProtectedRoute>
              <TemplatesPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/features" element={
            <ProtectedRoute>
              <FeaturesIndexPage />
            </ProtectedRoute>
          } />
          {/* v2 workspace: Learn now lives in WorkspaceShell. */}
          <Route path="/learn" element={
            <ProtectedRoute>
              <WorkspaceLearnPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin/brands" element={
            <ProtectedRoute>
              <AdminBrandsPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin/analytics" element={
            <ProtectedRoute>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          } />
          {/*
            ═══════════════════════════════════════════════════════════════
            Phase A namespace split — Studio (/b/:slug) + Classic (/a/:slug)

            /b/:slug/*  Studio (canonical). Five Cosmos sections (Setup,
                        Brand Kit, Guideline, Design, Tools), Studio
                        launchpad, fullscreen surfaces, unified editor.
                        Anything else under /b/:slug → StudioToClassicFallback.
            /a/:slug/*  Classic (alternate). Full legacy 7-section IA.
                        Sticky — rail items stay in /a so users don't
                        bounce between experiences mid-click.
            /dashboard/brand/:slug/*  legacy URLs → /b/:slug catch-all
                        push to canonical Studio first; if the section
                        isn't migrated yet StudioToClassicFallback bounces
                        to Classic in a second hop.
            ═══════════════════════════════════════════════════════════════
          */}

          {/* ─── Studio (/b/:slug/*) ─────────────────────────────────── */}

          {/* Studio launchpad uses BrandRouteLayout (AppRail). Other
              Cosmos sections render their own WorkspaceShell so
              they live as flat sibling routes below. */}
          <Route path="/b/:slug" element={
            <ProtectedRoute>
              <BrandRouteLayout />
            </ProtectedRoute>
          }>
            {/* Studio doesn't have an Overview page yet — bare /b/:slug
                falls back to Classic Overview at /a/:slug. */}
            <Route index element={<StudioToClassicFallback />} />
            <Route path="design" element={<DesignLaunchpadPage />} />
          </Route>

          {/* Studio Cosmos sections — own shell internally. */}
          <Route path="/b/:slug/setup" element={
            <ProtectedRoute><BrandSetupPageV2 /></ProtectedRoute>
          } />
          <Route path="/b/:slug/brand-kit" element={
            <ProtectedRoute><BrandBrandKitPageV2 /></ProtectedRoute>
          } />
          <Route path="/b/:slug/guideline" element={
            <ProtectedRoute><BrandGuidelinePageV2 /></ProtectedRoute>
          } />
          <Route path="/b/:slug/tools" element={
            <ProtectedRoute><BrandToolsPageV2 /></ProtectedRoute>
          } />
          {/* Phase B Templates port — Studio Templates page wraps
              WorkspaceShell + TemplatesPanel in browser mode. Mounted
              ABOVE the /b/:slug/* StudioToClassicFallback so React Router
              v6's specificity ranking selects this route over the
              catch-all that would otherwise redirect /b/:slug/templates
              to /a/:slug/templates. /a/:slug/templates stays untouched
              (legacy BrandTemplatesPage) for Classic-preference users. */}
          <Route path="/b/:slug/templates" element={
            <ProtectedRoute><BrandTemplatesStudioPage /></ProtectedRoute>
          } />

          {/* Studio fullscreen surfaces — no shell, namespace-orthogonal.
              Reachable from either Studio or Classic via these canonical
              /b/:slug/<surface> URLs. */}
          <Route path="/b/:slug/editor" element={
            <ProtectedRoute><EditorLauncherPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/design/:designSlug" element={
            <ProtectedRoute><BrandDesignEditorPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/social-media" element={
            <ProtectedRoute><SocialMediaPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/presentations" element={
            <ProtectedRoute><PresentationsPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/case-study" element={
            <ProtectedRoute><CaseStudyPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/case-study/edit/:idx" element={
            <ProtectedRoute><CaseStudySlideEditorPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/pitch-deck" element={
            <ProtectedRoute><PitchDeckPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/deck-v2" element={
            <ProtectedRoute><DeckV2Page /></ProtectedRoute>
          } />
          <Route path="/b/:slug/brand-guides" element={
            <ProtectedRoute><BrandGuidesPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/logo-presentation" element={
            <ProtectedRoute><LogoPresentationPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/guidelines/canvas" element={
            <ProtectedRoute><CanvasGuidelinesPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/guidelines/blocks" element={
            <ProtectedRoute><BlocksGuidelinesPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/brand-board" element={
            <ProtectedRoute><BrandBoardPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/bento" element={
            <ProtectedRoute><BrandBentoPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/analytics" element={
            <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/approvals" element={
            <ProtectedRoute><ApprovalsPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/tools/variant-studio" element={
            <ProtectedRoute><VariantStudioInAppPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/tools/ui-color-system" element={
            <ProtectedRoute><InAppUiColorSystemPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/tools/typescale" element={
            <ProtectedRoute><InAppTypescalePage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/tools/mockup-studio" element={
            <ProtectedRoute><BrandMockupStudioPage /></ProtectedRoute>
          } />

          {/* Studio fallback — Identity / Templates / Content / Folders /
              Share / Settings / Kit / Brandkit / etc. are unmigrated.
              302 to the Classic equivalent. Phase B removes /a entries
              one-by-one as features port to a Studio shell. */}
          <Route path="/b/:slug/*" element={
            <ProtectedRoute><StudioToClassicFallback /></ProtectedRoute>
          } />
          {/* Phase 5 — `/editor` now launches the unified editor with
              an auto-created "Untitled design" persisted into My
              Designs. Replaces the previous mount of the legacy
              StandaloneEditorPage (OptimizedDesignEditor). The legacy
              editor still lives at `/editor/design/:slug` because it
              remains a documented carve-out (transitively coupled to
              stable/editable-export-v1). */}
          <Route path="/editor" element={
            <ProtectedRoute>
              <EditorLauncherPage />
            </ProtectedRoute>
          } />
          <Route path="/editor/design/:slug" element={
            <ProtectedRoute>
              <DesignEditorPage />
            </ProtectedRoute>
          } />

          {/*
            ─────────────────────────────────────────────────────────────
            Tools platform routes.
            See `src/features/tools/README.md` for the architecture.

            - `/tools` — public directory of free tools (SEO hub).
            - `/tools/<slug>` — public landing + studio for a single tool.
            - `/claim` — the after-signup landing that materializes any
              anonymous tool session into a real brand.
            - `/b/:slug/tools/<slug>` — in-app entry into the studio
              inside an existing brand. Mounted in the Studio block above
              with `h-12` editor chrome instead of the brand shell.
            ─────────────────────────────────────────────────────────────
          */}
          <Route path="/tools" element={<ToolsDirectoryPage />} />
          <Route path="/tools/logo-variant-generator" element={<PublicVariantStudioPage />} />
          <Route path="/tools/logo-to-svg" element={<LogoToSvgPage />} />
          <Route path="/tools/ui-color-system" element={<PublicUiColorSystemPage />} />
          <Route path="/tools/typescale" element={<PublicTypescalePage />} />
          <Route path="/tools/mockup-studio" element={<StandaloneMockupStudioPage />} />
          <Route path="/claim" element={<ClaimPage />} />

          {/* In-app variants of the public Tools above are mounted in
              the Studio block (and reachable from Classic via the same
              canonical /b/:slug/tools/<slug> URLs). */}

          {/* BrandOS v5 — DAM, Templates marketplace, Brand Portal v2 */}
          {/* v2 workspace: Templates marketplace now lives in WorkspaceShell. */}
          <Route path="/templates" element={
            <ProtectedRoute>
              <WorkspaceTemplatesPageV2 />
            </ProtectedRoute>
          } />
          <Route path="/templates/builder" element={
            <ProtectedRoute>
              <TemplateBuilderPage />
            </ProtectedRoute>
          } />
          <Route path="/templates/builder/:templateId" element={
            <ProtectedRoute>
              <TemplateBuilderPage />
            </ProtectedRoute>
          } />
          <Route path="/marketplace" element={
            <ProtectedRoute>
              <MarketplacePage />
            </ProtectedRoute>
          } />
          {/* Bento Grid — standalone (no brand required). */}
          <Route path="/tools/bento" element={
            <ProtectedRoute>
              <StandaloneBentoPage />
            </ProtectedRoute>
          } />
          {/* Public Bento — unauthenticated read-only view. */}
          <Route path="/brand/:slug/bento/:bentoId" element={<PublicBentoPage />} />

          {/* ─── Classic (/a/:slug/*) ────────────────────────────────── */}

          {/* Legacy 7-section IA in BrandRouteLayout (AppRail + InnerNav).
              Sticky — when the rail is rendered at /a/:slug/<X> its items
              all link within /a so users stay in Classic until they
              switch via Settings. */}
          <Route path="/a/:slug" element={
            <ProtectedRoute>
              <BrandRouteLayout />
            </ProtectedRoute>
          }>
            {/* Phase A v2 — bare /a/:slug redirects to canonical Classic
                entry at /a/:slug/setup. The shell (BrandRouteLayout)
                stays mounted across the redirect so there's no flash. */}
            <Route index element={<ClassicIndexToSetupRedirect />} />
            <Route path="setup" element={<BrandHomePage />} />
            <Route path="edit" element={<BrandEditPage />} />
            <Route path="identity" element={<IdentityPage />} />
            <Route path="content" element={<ContentHubPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="templates" element={<BrandTemplatesPage />} />
            {/* Renamed: kit → brand-kit (matches Studio canonical path).
                Old /a/:slug/kit redirects to /a/:slug/brand-kit. */}
            <Route path="brand-kit" element={<BrandKitV2Page />} />
            <Route path="kit" element={<ClassicKitToBrandKitRedirect />} />
            <Route path="brandkit/:moduleId" element={<BrandKitModulePage />} />
            <Route path="folders" element={<DamPage />} />
            <Route path="studio" element={<ConsistencyStudioPage />} />
            {/* Absorbed: Assets deliverable catalog lives inside Templates. */}
            <Route path="assets" element={<AssetsRedirect />} />
            {/* Renamed: guidelines → guideline (singular, matches Studio).
                Old /a/:slug/guidelines redirects to /a/:slug/guideline. */}
            <Route path="guideline" element={<GuidelinesHubPage />} />
            <Route path="guidelines" element={<ClassicGuidelinesToGuidelineRedirect />} />
            {/* Legacy /dam path → /folders. */}
            <Route path="dam" element={<DamRedirect />} />
          </Route>

          {/* Classic flat routes — own shell or special: design uses
              WorkspaceShell (can't nest), settings has its own
              shell, brandkit (no moduleId) is a redirect to /kit. */}
          <Route path="/a/:slug/design" element={
            <ProtectedRoute><BrandDesignPageV2 /></ProtectedRoute>
          } />
          <Route path="/a/:slug/settings" element={
            <ProtectedRoute><BrandSettingsV2Page /></ProtectedRoute>
          } />
          <Route path="/a/:slug/brandkit" element={
            <ProtectedRoute><BrandKitRedirect /></ProtectedRoute>
          } />

          {/* ─── Legacy URLs (/dashboard/brand/:slug/*) ─────────────── */}

          {/* Single catch-all: 302 every legacy URL to its /b/:slug
              canonical equivalent. StudioToClassicFallback then bounces
              unmigrated sections onward to /a in a second hop. */}
          <Route path="/dashboard/brand/:slug/*" element={
            <ProtectedRoute><DashboardBrandToStudioRedirect /></ProtectedRoute>
          } />
          {/* Dev-only all-features inventory. Self-gated on import.meta.env.DEV
              or ?dev=1. Not linked from any user nav. */}
          <Route path="/_dev/features" element={<DevFeaturesPage />} />
          {/* Phase 1 unified editor demo — fixture social-post + localStorage save. */}
          <Route path="/_dev/editor" element={<DevEditorPage />} />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/settings/account" replace />} />
            <Route path="account" element={<AccountSettingsPage />} />
            <Route path="workspace" element={<WorkspaceSettingsPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="plans" element={<PlansPage />} />
          </Route>
          <Route path="/brand/:slug" element={<BrandDetailPage />} />
          <Route path="/brand/:slug/showcase" element={<BrandShowcasePage />} />
          <Route path="/p/:slug" element={<BrandPortalV2Page />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          {/* ─── Admin Dashboard ─────────────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminOverview />} />
            <Route path="early-access" element={<AdminEarlyAccessPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:userId" element={<AdminUserDetailPage />} />
            <Route path="brands" element={<AdminBrandsPage2 />} />
            <Route path="workspaces" element={<AdminWorkspacesPage />} />
            <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="feature-flags" element={<AdminFeatureFlagsPage />} />
            <Route path="activity" element={<AdminActivityPage2 />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            {/* Phase 4.4 — community templates approval queue. */}
            <Route path="templates/queue" element={<AdminTemplatesQueuePage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
          </BrandAssistantProvider>
          </CommandPaletteProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
