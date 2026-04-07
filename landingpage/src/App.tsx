import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { HeroSection } from '@/components/HeroSection';
import { MarqueeSection } from '@/components/MarqueeSection';
import { PainPointsSection } from '@/components/PainPointsSection';
import { SetupSection } from '@/components/SetupSection';
import { ProductModulesSection } from '@/components/ProductModulesSection';
import { StatisticsSection } from '@/components/StatisticsSection';
import { FinalCTASection } from '@/components/FinalCTASection';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
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
