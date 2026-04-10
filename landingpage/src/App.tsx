import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { HeroSection } from '@/components/HeroSection';
import { MarqueeSection } from '@/components/MarqueeSection';
import { PainPointsSection } from '@/components/PainPointsSection';
import { SetupSection } from '@/components/SetupSection';
import { ProductModulesSection } from '@/components/ProductModulesSection';
import { StatisticsSection } from '@/components/StatisticsSection';
import { FinalCTASection } from '@/components/FinalCTASection';
import { EarlyAccessProvider } from '@/components/EarlyAccessProvider';
import { EarlyAccessDialog } from '@/components/EarlyAccessDialog';

function App() {
  return (
    <EarlyAccessProvider>
      {/* bg-dot-grid on the outer wrapper so the pattern starts from
          the very top of the page, running BEHIND the navbar — not
          just inside the hero section. */}
      <div className="min-h-screen bg-background bg-dot-grid animate-bg-pan text-foreground antialiased">
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

      {/* Single modal mounted at root — every "Get Early Access" button
          on the page opens this same instance via the provider context. */}
      <EarlyAccessDialog />
    </EarlyAccessProvider>
  );
}

export default App;
