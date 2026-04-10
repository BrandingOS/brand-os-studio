import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { HeroSection } from '@/domains/landing/components/HeroSection';
import { MarqueeSection } from '@/domains/landing/components/MarqueeSection';
import { PainPointsSection } from '@/domains/landing/components/PainPointsSection';
import { SetupSection } from '@/domains/landing/components/SetupSection';
import { ProductModulesSection } from '@/domains/landing/components/ProductModulesSection';
import { StatisticsSection } from '@/domains/landing/components/StatisticsSection';
import { FinalCTASection } from '@/domains/landing/components/FinalCTASection';
import { EarlyAccessProvider } from '@/domains/landing/components/EarlyAccessProvider';
import { EarlyAccessDialog } from '@/domains/landing/components/EarlyAccessDialog';
import { AuthModal } from '@/features/auth/components/AuthModal';

const Index = () => {
  const [searchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('auth') === 'required') {
      setShowAuthModal(true);
    }
  }, [searchParams]);

  return (
    <EarlyAccessProvider>
      <div className="min-h-screen bg-background bg-dot-grid animate-bg-pan text-foreground antialiased overflow-x-hidden">
        <Navbar />
        <main>
          <HeroSection />
          <MarqueeSection />
          <PainPointsSection />
          <SetupSection />
          <ProductModulesSection />
          <StatisticsSection />
          <FinalCTASection />
        </main>
        <Footer />
      </div>

      <EarlyAccessDialog />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </EarlyAccessProvider>
  );
};

export default Index;
