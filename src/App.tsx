import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { ThemeProvider, useTheme } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import { repairStorageOnBoot } from "@/shared/utils/storageCompaction";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { PageSpinner } from "@/components/PageSpinner";
import { CommandPaletteProvider } from "@/shared/search/CommandPaletteProvider";
import { BrandAssistantProvider } from "@/features/ai/v5/BrandAssistantProvider";
import { BrandSettingsProvider } from "@/shared/brand-settings";

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
// Canonical pre-brand onboarding. The onboarding screens live in
// src/features/onboarding/ and are consumed here.
const OnboardBrandPage = lazy(() => import("./pages/onboard-brand"));
const OnboardBrandCreatePage = lazy(() => import("./pages/onboard-brand/create"));
// v2 brand-scoped tabs — the 5 tabs always live inside a brand under /b/:slug/*.
// See docs/ux-v2/PLAN.md for the full restructure plan.
const BrandSetupPageV2 = lazy(() => import("./pages/b/[slug]/setup"));
const BrandBrandKitPageV2 = lazy(() => import("./pages/b/[slug]/brand-kit"));
const BrandBrandKitNextPage = lazy(() => import("./pages/b/[slug]/brand-kit-next"));
const BrandGuidelinePageV2 = lazy(() => import("./pages/b/[slug]/guideline"));
const BrandDesignPageV2 = lazy(() => import("./pages/b/[slug]/design"));
const BrandToolsPageV2 = lazy(() => import("./pages/b/[slug]/tools"));
const BrandTemplatesStudioPage = lazy(() => import("./pages/b/[slug]/templates"));
// Phase B feature ports — Studio versions of the 5 legacy /a/:slug
// pages, wrapping the same components in WorkspaceShell. Legacy /a/:slug
// pages stay mounted untouched for Classic-preference users.
const StudioIdentityPage = lazy(() => import("./pages/b/[slug]/identity"));
const StudioContentPage = lazy(() => import("./pages/b/[slug]/content"));
const StudioFoldersPage = lazy(() => import("./pages/b/[slug]/folders"));
const StudioSharePage = lazy(() => import("./pages/b/[slug]/share"));
const StudioSettingsPage = lazy(() => import("./pages/b/[slug]/settings"));
// v2 workspace shell pages (outside a brand). Simpler shell, no tabs.
const WorkspaceHomePage = lazy(() => import("./pages/workspace/Home"));
const WorkspaceLearnPage = lazy(() => import("./pages/workspace/Learn"));
const WorkspaceSettingsPageV2 = lazy(() => import("./pages/workspace/Settings"));
const WorkspaceTemplatesPageV2 = lazy(() => import("./pages/workspace/Templates"));
// Dev-only all-features inventory page (self-gated on import.meta.env.DEV).
const DevFeaturesPage = lazy(() => import("./pages/_dev/features"));
// Product Surface Explorer — owner inventory/review of every surface (self-gated).
const DevProductMapPage = lazy(() => import("./pages/_dev/product-map"));
const DevEditorPage = lazy(() => import("./pages/dev-editor"));
// Code Navigator — engineering-facing route/component/file explorer.
//
// The `import.meta.env.DEV` ternary is load-bearing, not decorative: Vite
// substitutes `false` here for production builds, so the dynamic import sits in
// a dead branch and Rollup emits NO chunk for it at all. Guarding only the
// <Route> below would still leave this `import()` reachable and ship the page.
const DevArchitecturePage = import.meta.env.DEV
  ? lazy(() => import("./pages/__architecture"))
  : null;
const ChroniclePreviewPage = lazy(() => import("./pages/_dev/chronicle"));
// DS v1 component showcase (self-gated on import.meta.env.DEV or ?dev=1).
const DevDesignSystemPage = lazy(() => import("./pages/_dev/design-system"));
const EditorLauncherPage = lazy(() => import("./pages/editor-launcher"));
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
// Phase B Group 2 (i): /v2 route + features/landing-v2/ sunset.
// DashboardV2Page lazy import removed; folder deleted in same commit.
const DamPage = lazy(() => import('./features/dam/DamPage'));
const TemplatesMarketplacePage = lazy(() => import('./features/templates/v5/TemplatesMarketplacePage'));
const TemplateBuilderPage = lazy(() => import('./features/templates/builder/TemplateBuilderPage'));
const BrandPortalV2Page = lazy(() => import('./features/brand-portal/v2/BrandPortalV2Page'));
const PublicDesignPage = lazy(() => import('./pages/d/[brandSlug]/[designSlug]'));
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
/**
 * Reclaims localStorage once per boot. Brands saved before logos were stored
 * at tile size can fill the ~5 MB budget on their own, and a full quota makes
 * every later save fail — including creating a brand at all. Re-encoding the
 * stored artwork fixes that without the user losing anything.
 */
function StorageRepair() {
  useEffect(() => {
    void repairStorageOnBoot().then((result) => {
      if (result?.ranCompaction && result.freedKB > 200) {
        toast.success(`Freed ${result.freedKB} KB of browser storage`, {
          description: `${result.imagesShrunk} stored logos were re-saved at display size. Nothing was deleted.`,
        });
      }
    });
  }, []);
  return null;
}

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
  <StorageRepair />
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
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding-brand" element={<OnboardingBrandPage />} />
          {logoMakerFlowRoutes}
          <Route path="/onboarding/preview" element={<BrandPreviewPage />} />
          {/* Onboarding — the original two-path flow, restored from the
              `pre-brand-system-evolution` tag. `/onboard-brand` is the upload
              path ("Set up your Brand"); `/onboard-brand/create` is the
              from-scratch path. */}
          <Route path="/onboard-brand" element={
            <ProtectedRoute>
              <OnboardBrandPage />
            </ProtectedRoute>
          } />
          <Route path="/onboard-brand/create" element={
            <ProtectedRoute>
              <OnboardBrandCreatePage />
            </ProtectedRoute>
          } />
          {/* v2 workspace home — new WorkspaceShell (no tabs). */}
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
          </Route>

          {/* Studio Cosmos sections — own shell internally. */}
          <Route path="/b/:slug/setup" element={
            <ProtectedRoute><BrandSetupPageV2 /></ProtectedRoute>
          } />
          <Route path="/b/:slug/brand-kit" element={
            <ProtectedRoute><BrandBrandKitPageV2 /></ProtectedRoute>
          } />
          {/* Redesigned generate/review/approve kit — separate page
              while it's iterated on (owner decision 2026-08-10). */}
          <Route path="/b/:slug/brand-kit-next" element={
            <ProtectedRoute><BrandBrandKitNextPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/guideline" element={
            <ProtectedRoute><BrandGuidelinePageV2 /></ProtectedRoute>
          } />
          <Route path="/b/:slug/design" element={
            <ProtectedRoute><BrandDesignPageV2 /></ProtectedRoute>
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
          {/* Phase B feature ports — Studio versions of the 5 legacy
              brand-scoped pages. Each is a thin WorkspaceShell wrapper
              over the same legacy component used at /a/:slug/<X>. The
              legacy /a routes stay mounted untouched. Settings reuses
              BrandSettingsV2Page directly since it has its own shell. */}
          <Route path="/b/:slug/identity" element={
            <ProtectedRoute><StudioIdentityPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/content" element={
            <ProtectedRoute><StudioContentPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/folders" element={
            <ProtectedRoute><StudioFoldersPage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/share" element={
            <ProtectedRoute><StudioSharePage /></ProtectedRoute>
          } />
          <Route path="/b/:slug/settings" element={
            <ProtectedRoute><StudioSettingsPage /></ProtectedRoute>
          } />
          {/* Phase B Overview decision: NOT porting BrandHomePage to /b/.
              Studio's canonical brand entry is /b/:slug/setup (cosmos
              setup editor — reads/writes brand data). The legacy
              BrandHomePage at /a/:slug/setup serves a different role
              (Recent designs / Search / Featured templates). Studio
              users get equivalent functionality via /b/:slug/templates
              (My Designs tab + curated browse), the unified editor's
              "My Designs" tab, and the global command palette for
              search. No /b/:slug/overview route created. */}

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
            <Route path="design" element={<DesignLaunchpadPage />} />
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

          {/* Classic flat routes — settings has its own shell,
              brandkit (no moduleId) is a redirect to /kit. */}
          {/* Phase B Group 2 (l) — wrap legacy /a/:slug/settings in
              BrandSettingsProvider. The legacy BrandSettingsV2Page mounts
              BrandLayout (legacy chrome) but never had the provider; the
              BrandSettingsHub it renders calls useBrandSettings and
              throws "must be used within a <BrandSettingsProvider>".
              This was a latent pre-Phase-B bug — fix is namespace-
              orthogonal (provider only, no chrome change). */}
          <Route path="/a/:slug/settings" element={
            <ProtectedRoute>
              <BrandSettingsProvider>
                <BrandSettingsV2Page />
              </BrandSettingsProvider>
            </ProtectedRoute>
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
          {/* Product Surface Explorer — self-gated (DEV or ?dev=1), never in nav. */}
          <Route path="/_dev/product-map" element={<DevProductMapPage />} />
          {/* Dev-only editor/chronicle previews — registered ONLY in dev builds so
              they never resolve in production (were previously ungated). */}
          {import.meta.env.DEV && (
            <Route path="/_dev/editor" element={<DevEditorPage />} />
          )}
          {import.meta.env.DEV && (
            <Route path="/_dev/chronicle" element={<ChroniclePreviewPage />} />
          )}
          {/* Code Navigator / Architecture Explorer. DEV-only on purpose: it
              reads a dev-server endpoint and must add nothing to the production
              bundle. Engineering-facing counterpart to /_dev/product-map.
              `/__architecture` is the entry point; `/__architecture/tree` and
              `/__architecture/search` address the two views directly. */}
          {import.meta.env.DEV && (
            <Route path="/__architecture" element={<DevArchitecturePage />} />
          )}
          {import.meta.env.DEV && (
            <Route path="/__architecture/:view" element={<DevArchitecturePage />} />
          )}
          {/* DS v1 showcase — self-gated (DEV or ?dev=1), never in nav. */}
          <Route path="/_dev/design-system" element={<DevDesignSystemPage />} />
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
          <Route path="/d/:brandSlug/:designSlug" element={<PublicDesignPage />} />
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
