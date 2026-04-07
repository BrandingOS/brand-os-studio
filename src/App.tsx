import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
import BrandKitHubPage from "./pages/dashboard/brand/[slug]/brandkit";
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

const DesignEditorPage = lazy(() => import('./pages/editor/design'));
const DashboardV2Page = lazy(() => import('./features/landing-v2/DashboardV2'));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
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
          <Route path="/dashboard/brand/:slug" element={
            <ProtectedRoute>
              <BrandHomePage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/edit" element={
            <ProtectedRoute>
              <BrandEditPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/identity" element={
            <ProtectedRoute>
              <IdentityPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/assets" element={
            <ProtectedRoute>
              <AssetsPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/share" element={
            <ProtectedRoute>
              <SharePage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/brandkit" element={
            <ProtectedRoute>
              <BrandKitHubPage />
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
          <Route path="/dashboard/brand/:slug/guidelines" element={
            <ProtectedRoute>
              <GuidelinesHubPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:slug/guidelines/canvas" element={
            <ProtectedRoute>
              <CanvasGuidelinesPage />
            </ProtectedRoute>
          } />
          <Route path="/editor/design/:slug" element={<DesignEditorPage />} />
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
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
