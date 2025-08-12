import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Pricing from "@/components/sections/Pricing";
import { useScrollReveal } from "@/shared/hooks/useScrollReveal";
import { HeroSection } from "@/domains/landing/components/HeroSection";
import { MarqueeSection } from "@/domains/landing/components/MarqueeSection";
import { PainPointsSection } from "@/domains/landing/components/PainPointsSection";
import { SetupSection } from "@/domains/landing/components/SetupSection";
import { ProductModulesSection } from "@/domains/landing/components/ProductModulesSection";
import { StatisticsSection } from "@/domains/landing/components/StatisticsSection";
import { FinalCTASection } from "@/domains/landing/components/FinalCTASection";
import { useOnboardingStore } from '@/shared/store/onboardingStore';

const Index = () => {
  useScrollReveal();
  const navigate = useNavigate();
  const { setAnswer } = useOnboardingStore();
  const [brandName, setBrandName] = useState('');

  const handleStartOnboarding = () => {
    if (brandName.trim()) {
      setAnswer('brand-name', brandName.trim());
    }
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-background bg-dot-grid text-foreground animate-bg-pan">
      <Navbar />
      <main>
        <HeroSection 
          onBrandNameChange={setBrandName}
          onStartClick={handleStartOnboarding}
          brandName={brandName}
        />
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
