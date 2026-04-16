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
const BrandPreviewPage = lazy(() => import("./pages/onboarding/preview"));
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
const LogoToSvgPage = lazy(() => import("./features/tools/logo-to-svg/LogoToSvgPage"));
const LearnPage = lazy(() => import("./pages/learn"));
const IdentityPage = lazy(() => import("./pages/dashboard/brand/[slug]/identity"));
const AssetsPage = lazy(() => import("./pages/dashboard/brand/[slug]/assets"));
const SharePage = lazy(() => import("./pages/dashboard/brand/[slug]/share"));
const BrandTemplatesPage = lazy(() => import("./pages/dashboard/brand/[slug]/templates"));
const FeaturesIndexPage = lazy(() => import("./pages/dashboard/features"));
const AiDesignPage = lazy(() => import("./pages/dashboard/brand/[slug]/ai-design"));
const DesignWithAiPage = lazy(() => import("./pages/dashboard/brand/[slug]/design-ai"));
const BrandBentoPage = lazy(() => import("./pages/dashboard/brand/[slug]/bento"));
const StandaloneBentoPage = lazy(() => import("./pages/dashboard/tools/bento"));
const PublicBentoPage = lazy(() => import("./pages/brand/[slug]/bento/[bentoId]"));
const ConsistencyStudioPage = lazy(() => import("./pages/dashboard/brand/[slug]/studio"));

const DesignEditorPage = lazy(() => import('./pages/editor/design'));
const StandaloneEditorPage = lazy(() => import('./pages/editor/index'));
// Tools platform — public + in-app routes for the Tools suite. Lazy-loaded
// because the variant-studio bundle pulls in jspdf/jszip and isn't needed
// on the main dashboard path.
const ToolsDirectoryPage = lazy(() => import('./pages/tools'));
const PublicVariantStudioPage = lazy(() => import('./pages/tools/logo-variant-generator'));
const ClaimPage = lazy(() => import('./pages/tools/claim'));
const VariantStudioInAppPage = lazy(() => import('./pages/dashboard/brand/[slug]/tools/variant-studio'));
const DashboardV2Page = lazy(() => import('./features/landing-v2/DashboardV2'));
const DamPage = lazy(() => import('./features/dam/DamPage'));
const TemplatesMarketplacePage = lazy(() => import('./features/templates/v5/TemplatesMarketplacePage'));
const TemplateBuilderPage = lazy(() => import('./features/templates/builder/TemplateBuilderPage'));
const BrandPortalV2Page = lazy(() => import('./features/brand-portal/v2/BrandPortalV2Page'));
const BlocksGuidelinesPage = lazy(() => import('./features/blocks/BlocksGuidelinesPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const MarketplacePage = lazy(() => import('./features/marketplace/MarketplacePage'));
const ApprovalsPage = lazy(() => import('./features/approvals/ApprovalsPage'));
const BrandKitV2Page = lazy(() => import('./features/brandkit-v2/BrandKitPage'));
const BrandSettingsV2Page = lazy(() => import('./features/brandkit-v2/BrandSettingsPage'));

/** Tiny helper that redirects the legacy `/brandkit` (no moduleId) URL
 * to the merged Brand Kit v2 page at `/kit`. Preserves the slug. */
function BrandKitRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/b/${slug}/kit`} replace />;
}

/** Legacy /dam URL → new /folders home. Lives as a child of the brand
 *  shell so the redirect happens inside the persistent layout (no flash
 *  of unmount). Preserves any ?category= filter the user had on the URL. */
function DamRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  return <Navigate to={`/b/${slug}/folders${search}`} replace />;
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
          <Route path="/onboarding/preview" element={<BrandPreviewPage />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
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
          <Route path="/learn" element={
            <ProtectedRoute>
              <LearnPage />
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
            ─────────────────────────────────────────────────────────────
            Brand scope — nested under BrandRouteLayout.

            BrandRouteLayout mounts BrandLayout EXACTLY ONCE for all of
            these child routes. As the user navigates between Overview,
            Setup, Guidelines, etc., AppRail / BrandNavbar / InnerNavRail
            stay mounted; only the Outlet (the page contents) swaps. No
            flicker, no scroll loss, no re-running of the brand-list lazy
            load. Pages publish their config (innerNav, maxWidth, brandName)
            via `useBrandPageConfig` so the parent layout knows what to
            render.

            Fullscreen / standalone surfaces under the same prefix
            (brand-guides editor, guidelines/canvas, etc.) stay as flat
            sibling routes below — they intentionally bypass this shell.
            ─────────────────────────────────────────────────────────────
          */}
          <Route path="/dashboard/brand/:slug" element={
            <ProtectedRoute>
              <BrandRouteLayout />
            </ProtectedRoute>
          }>
            <Route index element={<BrandHomePage />} />
            <Route path="edit" element={<BrandEditPage />} />
            <Route path="identity" element={<IdentityPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="templates" element={<BrandTemplatesPage />} />
            <Route path="guidelines" element={<GuidelinesHubPage />} />
            <Route path="kit" element={<BrandKitV2Page />} />
            <Route path="folders" element={<DamPage />} />
            <Route path="studio" element={<ConsistencyStudioPage />} />
            {/* Legacy /dam path — child redirect into the new /folders home,
                so old bookmarks keep working without breaking the shell. */}
            <Route path="dam" element={<DamRedirect />} />
          </Route>
          {/* AI Design is fullscreen (Lovart/Luma-style) — flat route, no brand shell. */}
          <Route path="/dashboard/brand/:slug/ai-design" element={
            <ProtectedRoute>
              <AiDesignPage />
            </ProtectedRoute>
          } />
          {/* Design with AI — canvas-first design surface (fullscreen, no brand shell). */}
          <Route path="/dashboard/brand/:slug/design-ai" element={
            <ProtectedRoute>
              <DesignWithAiPage />
            </ProtectedRoute>
          } />
          {/* Legacy brandkit hub merged into Brand Kit v2 — redirect to /kit */}
          <Route path="/dashboard/brand/:slug/brandkit" element={
            <ProtectedRoute>
              <BrandKitRedirect />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/brandkit/:moduleId" element={
            <ProtectedRoute>
              <BrandKitModulePage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/brand-guides" element={
            <ProtectedRoute>
              <BrandGuidesPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/logo-presentation" element={
            <ProtectedRoute>
              <LogoPresentationPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/presentations" element={
            <ProtectedRoute>
              <PresentationsPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/social-media" element={
            <ProtectedRoute>
              <SocialMediaPage />
            </ProtectedRoute>
          } />
          {/* /dashboard/brand/:slug/guidelines is now nested under BrandRouteLayout above. */}
          <Route path="/dashboard/brand/:slug/guidelines/canvas" element={
            <ProtectedRoute>
              <CanvasGuidelinesPage />
            </ProtectedRoute>
          } />
          <Route path="/editor" element={
            <ProtectedRoute>
              <StandaloneEditorPage />
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
            - `/dashboard/brand/:slug/tools/variant-studio` and the short
              form `/b/:slug/tools/variant-studio` — in-app entry into
              the studio inside an existing brand. These intentionally
              live as flat sibling routes so they get the `h-12` editor
              chrome instead of the brand shell.
            ─────────────────────────────────────────────────────────────
          */}
          <Route path="/tools" element={<ToolsDirectoryPage />} />
          <Route path="/tools/logo-variant-generator" element={<PublicVariantStudioPage />} />
          <Route path="/tools/logo-to-svg" element={<LogoToSvgPage />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/dashboard/brand/:slug/tools/variant-studio" element={
            <ProtectedRoute>
              <VariantStudioInAppPage />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/tools/variant-studio" element={
            <ProtectedRoute>
              <VariantStudioInAppPage />
            </ProtectedRoute>
          } />

          {/* BrandOS v5 — DAM, Templates marketplace, Brand Portal v2 */}
          {/* /dashboard/brand/:slug/kit and /dam are nested under BrandRouteLayout above.
              The /b/:slug short-form aliases are nested under their own BrandRouteLayout below. */}
          <Route path="/templates" element={
            <ProtectedRoute>
              <TemplatesMarketplacePage />
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
          <Route path="/b/:slug/guidelines/blocks" element={
            <ProtectedRoute>
              <BlocksGuidelinesPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/guidelines/blocks" element={
            <ProtectedRoute>
              <BlocksGuidelinesPage />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/approvals" element={
            <ProtectedRoute>
              <ApprovalsPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/approvals" element={
            <ProtectedRoute>
              <ApprovalsPage />
            </ProtectedRoute>
          } />

          {/*
            Stage 14 — Short-form `/b/:slug/...` aliases.
            See docs/ux-redesign/ARCHITECTURE.md §8 for the full migration map.
            These render the SAME components as the legacy `/dashboard/brand/...`
            routes; old URLs still work, new URLs are now bookmarkable. The
            full migration of internal links to the short form is deferred and
            documented in docs/ux-redesign/EXECUTION.md.
          */}
          {/* Short-form /b/:slug aliases — same nested-shell pattern. */}
          <Route path="/b/:slug" element={
            <ProtectedRoute>
              <BrandRouteLayout />
            </ProtectedRoute>
          }>
            <Route index element={<BrandHomePage />} />
            <Route path="edit" element={<BrandEditPage />} />
            <Route path="identity" element={<IdentityPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="guidelines" element={<GuidelinesHubPage />} />
            <Route path="templates" element={<BrandTemplatesPage />} />
            <Route path="kit" element={<BrandKitV2Page />} />
            <Route path="folders" element={<DamPage />} />
            <Route path="studio" element={<ConsistencyStudioPage />} />
            {/* Legacy /dam path — child redirect into the new /folders home,
                so old bookmarks keep working without breaking the shell. */}
            <Route path="dam" element={<DamRedirect />} />
          </Route>
          {/* AI Design fullscreen — short form. */}
          <Route path="/b/:slug/ai-design" element={
            <ProtectedRoute>
              <AiDesignPage />
            </ProtectedRoute>
          } />
          {/* Design with AI — short form. */}
          <Route path="/b/:slug/design-ai" element={
            <ProtectedRoute>
              <DesignWithAiPage />
            </ProtectedRoute>
          } />
          {/* Short-form aliases for brand-scoped fullscreen pages
              (social-media, presentations, brand-guides, logo-presentation).
              These were only reachable via the long-form /dashboard/brand/:slug/... URLs. */}
          <Route path="/b/:slug/social-media" element={
            <ProtectedRoute>
              <SocialMediaPage />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/presentations" element={
            <ProtectedRoute>
              <PresentationsPage />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/brand-guides" element={
            <ProtectedRoute>
              <BrandGuidesPage />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/logo-presentation" element={
            <ProtectedRoute>
              <LogoPresentationPage />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/guidelines/canvas" element={
            <ProtectedRoute>
              <CanvasGuidelinesPage />
            </ProtectedRoute>
          } />
          {/* Bento Grid — brand-scoped, fullscreen. */}
          <Route path="/b/:slug/bento" element={
            <ProtectedRoute>
              <BrandBentoPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/bento" element={
            <ProtectedRoute>
              <BrandBentoPage />
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
          <Route path="/b/:slug/brandkit" element={
            <ProtectedRoute>
              <BrandKitRedirect />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/settings" element={
            <ProtectedRoute>
              <BrandSettingsV2Page />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/settings" element={
            <ProtectedRoute>
              <BrandSettingsV2Page />
            </ProtectedRoute>
          } />
          <Route path="/b/:slug/brandkit/:moduleId" element={
            <ProtectedRoute>
              <BrandKitModulePage />
            </ProtectedRoute>
          } />
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
