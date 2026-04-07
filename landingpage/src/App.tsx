import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { HeroSection } from '@/components/HeroSection';
import { MarqueeSection } from '@/components/MarqueeSection';
import { PainPointsSection } from '@/components/PainPointsSection';
import { SetupSection } from '@/components/SetupSection';
import { ProductModulesSection } from '@/components/ProductModulesSection';
import { StatisticsSection } from '@/components/StatisticsSection';
import { FinalCTASection } from '@/components/FinalCTASection';
import { useScrollReveal } from '@/hooks/useScrollReveal';

function App() {
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
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
