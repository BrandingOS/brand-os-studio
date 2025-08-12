import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import LandingPage from "./app/landing/page";
import OnboardingPage from "./app/onboarding/page";
import BrandPreviewPage from "./app/brand/preview/page";
import DashboardPage from "./app/dashboard/page";
import BrandDetailPage from "./app/brand/[id]/page";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/brand/preview" element={<BrandPreviewPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/brand/:id" element={<BrandDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
