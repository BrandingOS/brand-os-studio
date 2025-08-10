import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Pricing from "@/components/sections/Pricing";
import { useScrollReveal } from "@/shared/hooks/useScrollReveal";
import { HeroSection } from "@/features/hero/HeroSection";
import { MarqueeSection } from "@/features/marketing/MarqueeSection";
import { PainPointsSection } from "@/features/marketing/PainPointsSection";
import { SetupSection } from "@/features/marketing/SetupSection";
import { ProductModulesSection } from "@/features/products/ProductModulesSection";
import { StatisticsSection } from "@/features/marketing/StatisticsSection";
import { FinalCTASection } from "@/features/marketing/FinalCTASection";

const Index = () => {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background bg-dot-grid text-foreground animate-bg-pan">
      <Navbar />

      <main>
        <HeroSection />
        <MarqueeSection />
        <PainPointsSection />
        <SetupSection />
        <ProductModulesSection />
        <StatisticsSection />
        <Pricing />
        <FinalCTASection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
