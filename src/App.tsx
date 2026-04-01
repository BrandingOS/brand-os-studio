import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AuthProvider } from "@/features/auth/components/AuthProvider";

// Pages
import IndexPage from "./pages/Index";
import OnboardingPage from "./app/onboarding/page";
import BrandPreviewPage from "./pages/onboarding/preview";
import DashboardRoute from "./pages/dashboard";
import BrandHomePage from "./pages/dashboard/brand/[brandId]";
import BrandKitHubPage from "./pages/dashboard/brand/[brandId]/brandkit";
import BrandKitModulePage from "./pages/dashboard/brand/[brandId]/brandkit/[moduleId]";
import { GuidelinesEditor } from "./features/guidelines/components/GuidelinesEditor";
import AccountSettingsPage from "./pages/settings/account";
import BrandDetailPage from "./app/brand/[id]/page";
import ResetPasswordPage from "./pages/auth/reset-password";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/preview" element={<BrandPreviewPage />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/dashboard/brand/:brandId" element={
            <ProtectedRoute>
              <BrandHomePage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:brandId/brandkit" element={
            <ProtectedRoute>
              <BrandKitHubPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:brandId/brandkit/:moduleId" element={
            <ProtectedRoute>
              <BrandKitModulePage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/brand/:brandId/guidelines" element={
            <ProtectedRoute>
              <GuidelinesEditor />
            </ProtectedRoute>
          } />
          <Route path="/settings/account" element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/brand/:id" element={<BrandDetailPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
