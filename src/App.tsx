import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPaletteProvider } from "@/shared/search/CommandPaletteProvider";
import { BrandAssistantProvider } from "@/features/ai/v5/BrandAssistantProvider";

// Pages
import IndexPage from "./pages/Index";
import OnboardingPage from "./pages/onboarding";
import BrandPreviewPage from "./pages/onboarding/preview";
import DashboardRoute from "./pages/dashboard";
import BrandsPage from "./pages/dashboard/brands";
import ActivityPage from "./pages/dashboard/activity";
import TemplatesPage from "./pages/dashboard/templates";
import AdminBrandsPage from "./pages/dashboard/admin/brands";
import AdminAnalyticsPage from "./pages/dashboard/admin/analytics";
import BrandHomePage from "./pages/dashboard/brand/[slug]";
import BrandEditPage from "./pages/dashboard/brand/[slug]/edit";
import BrandKitModulePage from "./pages/dashboard/brand/[slug]/brandkit/[moduleId]";
import BrandGuidesPage from "./pages/dashboard/brand/[slug]/brand-guides";
import LogoPresentationPage from "./pages/dashboard/brand/[slug]/logo-presentation";
import PresentationsPage from "./pages/dashboard/brand/[slug]/presentations";
import SocialMediaPage from "./pages/dashboard/brand/[slug]/social-media";
import GuidelinesHubPage from "./pages/dashboard/brand/[slug]/guidelines";
import CanvasGuidelinesPage from "./pages/dashboard/brand/[slug]/guidelines/canvas";
import AccountSettingsPage from "./pages/settings/account";
import PlansPage from "./pages/settings/plans";
import BrandDetailPage from "./pages/brand/[slug]";
import BrandShowcasePage from "./pages/brand/[slug]/showcase";
import ResetPasswordPage from "./pages/auth/reset-password";
import NotFound from "./pages/NotFound";
import LogoMakerPage from "./pages/dashboard/logo-maker";
import LearnPage from "./pages/learn";
import IdentityPage from "./pages/dashboard/brand/[slug]/identity";
import AssetsPage from "./pages/dashboard/brand/[slug]/assets";
import SharePage from "./pages/dashboard/brand/[slug]/share";
import BrandTemplatesPage from "./pages/dashboard/brand/[slug]/templates";
import FeaturesIndexPage from "./pages/dashboard/features";
import { BrandRouteLayout } from "./shared/layouts/BrandRouteLayout";

const DesignEditorPage = lazy(() => import('./pages/editor/design'));
const DashboardV2Page = lazy(() => import('./features/landing-v2/DashboardV2'));
const DamPage = lazy(() => import('./features/dam/DamPage'));
const TemplatesMarketplacePage = lazy(() => import('./features/templates/v5/TemplatesMarketplacePage'));
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
  return <Navigate to={`/dashboard/brand/${slug}/folders${search}`} replace />;
}

const queryClient = new QueryClient();

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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <CommandPaletteProvider>
          <BrandAssistantProvider>
          <Toaster />
          <ErrorBoundary>
          <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <Routes>
          <Route path="/" element={<IndexPage />} />
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
            {/* Legacy /dam path — child redirect into the new /folders home,
                so old bookmarks keep working without breaking the shell. */}
            <Route path="dam" element={<DamRedirect />} />
          </Route>
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
          <Route path="/editor/design/:slug" element={<DesignEditorPage />} />

          {/* BrandOS v5 — DAM, Templates marketplace, Brand Portal v2 */}
          {/* /dashboard/brand/:slug/kit and /dam are nested under BrandRouteLayout above.
              The /b/:slug short-form aliases are nested under their own BrandRouteLayout below. */}
          <Route path="/templates" element={
            <ProtectedRoute>
              <TemplatesMarketplacePage />
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
            <Route path="kit" element={<BrandKitV2Page />} />
            <Route path="folders" element={<DamPage />} />
            {/* Legacy /dam path — child redirect into the new /folders home,
                so old bookmarks keep working without breaking the shell. */}
            <Route path="dam" element={<DamRedirect />} />
          </Route>
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
          <Route path="/settings/account" element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/settings/plans" element={
            <ProtectedRoute>
              <PlansPage />
            </ProtectedRoute>
          } />
          <Route path="/brand/:slug" element={<BrandDetailPage />} />
          <Route path="/brand/:slug/showcase" element={<BrandShowcasePage />} />
          <Route path="/p/:slug" element={<BrandPortalV2Page />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
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
