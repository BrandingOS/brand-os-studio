import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/preview" element={<BrandPreviewPage />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/dashboard/brand/:brandId" element={<BrandHomePage />} />
          <Route path="/dashboard/brand/:brandId/brandkit" element={<BrandKitHubPage />} />
          <Route path="/dashboard/brand/:brandId/brandkit/:moduleId" element={<BrandKitModulePage />} />
          <Route path="/dashboard/brand/:brandId/guidelines" element={<GuidelinesEditor />} />
          <Route path="/settings/account" element={<AccountSettingsPage />} />
          <Route path="/brand/:id" element={<BrandDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
