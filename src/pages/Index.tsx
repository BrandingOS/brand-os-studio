import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * `/` is the marketing landing, and the landing is a document of its own
 * (landingpage/, built into dist/index.html by scripts/build-landing.mjs).
 * A visitor typing the address never reaches React Router at all.
 *
 * React Router only lands here on an IN-APP navigation to `/` — a logo
 * click, a dismissed login modal. The honest answer to that is a full
 * document load: ask the server for `/` and it hands back the landing.
 *
 * `bounced` is the loop guard. If a deploy has no landing at `/` the
 * server answers with the SPA again; the marker is already set, so the
 * legacy page below renders instead of reloading for ever.
 */
const BOUNCE_MARKER = 'brandos:landing-bounced';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Redirect authenticated users to dashboard unless they explicitly hit ?auth=required
  useEffect(() => {
    if (searchParams.get('auth') === 'required') {
      setShowAuthModal(true);
      return;
    }
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, isAuthenticated, navigate]);

  // Hand `/` back to the landing document. Guests only — a signed-in
  // visitor is already on their way to the dashboard above, and the
  // ?auth=required entry point wants the modal, not a reload. Waiting
  // for the session to resolve matters: `isAuthenticated` is false while
  // it is still loading, and bouncing then would throw a signed-in user
  // out to the landing on a full page load.
  useEffect(() => {
    if (isLoading || isAuthenticated || searchParams.get('auth') === 'required') return;
    if (!import.meta.env.PROD) return;
    let bounced = false;
    try {
      bounced = sessionStorage.getItem(BOUNCE_MARKER) === '1';
      sessionStorage.setItem(BOUNCE_MARKER, '1');
    } catch {
      // Private mode with storage disabled: never risk a reload loop.
      bounced = true;
    }
    if (!bounced) window.location.replace('/');
  }, [isLoading, isAuthenticated, searchParams]);

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
