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
      <div className="min-h-screen bg-background text-foreground antialiased">
        <Navbar />
        <main>
          <HeroSection />
          {/* Small compact marquee right under the hero — instant social
              proof kicker before the user scrolls. The BIGGER marquee
              (MarqueeSection) is moved further down as a divider between
              the feature sections. */}
          <MarqueeSection />
          <PainPointsSection />
          <SetupSection />
          <MarqueeSection />
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
