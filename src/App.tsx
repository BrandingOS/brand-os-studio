import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { lazy, Suspense } from "react";

// Pages
import IndexPage from "./pages/Index";
import OnboardingPage from "./app/onboarding/page";
import BrandPreviewPage from "./pages/onboarding/preview";
import DashboardRoute from "./pages/dashboard";
import BrandsPage from "./pages/dashboard/brands";
import ActivityPage from "./pages/dashboard/activity";
import TemplatesPage from "./pages/dashboard/templates";
import AdminBrandsPage from "./pages/dashboard/admin/brands";
import AdminAnalyticsPage from "./pages/dashboard/admin/analytics";
import BrandHomePage from "./pages/dashboard/brand/[slug]";
import BrandKitHubPage from "./pages/dashboard/brand/[slug]/brandkit";
import BrandKitModulePage from "./pages/dashboard/brand/[slug]/brandkit/[moduleId]";
import GuidelinesHubPage from "./pages/dashboard/brand/[slug]/guidelines";
import AccountSettingsPage from "./pages/settings/account";
import BrandDetailPage from "./app/brand/[slug]/page";
import ResetPasswordPage from "./pages/auth/reset-password";
import NotFound from "./pages/NotFound";

const DesignEditorPage = lazy(() => import('./pages/editor/design'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <Routes>
          <Route path="/" element={<IndexPage />} />
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
          <Route path="/dashboard/templates" element={
            <ProtectedRoute>
              <TemplatesPage />
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
          <Route path="/dashboard/brand/:slug/guidelines" element={
            <ProtectedRoute>
              <GuidelinesHubPage />
            </ProtectedRoute>
          } />
          <Route path="/editor/design/:slug" element={<DesignEditorPage />} />
          <Route path="/settings/account" element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/brand/:slug" element={<BrandDetailPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
