import { useV2Reveal } from './hooks/useV2Reveal';
import { V2Navbar } from './components/V2Navbar';
import { V2Hero } from './components/V2Hero';
import { V2Marquee } from './components/V2Marquee';
import { V2PainPoints } from './components/V2PainPoints';
import { V2SystemMap } from './components/V2SystemMap';
import { V2Capabilities } from './components/V2Capabilities';
import { V2Workflow } from './components/V2Workflow';
import { V2Intelligence } from './components/V2Intelligence';
import { V2Audience } from './components/V2Audience';
import { V2Metrics } from './components/V2Metrics';
import { V2CTA } from './components/V2CTA';
import { V2Footer } from './components/V2Footer';
import './v2.css';

export default function DashboardV2() {
  const containerRef = useV2Reveal();

  return (
    <div ref={containerRef} className="v2-root min-h-screen">
      <V2Navbar />

      <main>
        {/* Cinematic hero with orbital system */}
        <V2Hero />

        {/* Scrolling marquee */}
        <V2Marquee />

        {/* Problem statement */}
        <V2PainPoints />

        {/* System architecture — core → outputs */}
        <div id="features">
          <V2SystemMap />
        </div>

        {/* Separator */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="v2-separator" />
        </div>

        {/* Detailed capabilities */}
        <V2Capabilities />

        {/* Workflow pipeline */}
        <div id="workflow">
          <V2Workflow />
        </div>

        {/* AI Intelligence */}
        <div id="intelligence">
          <V2Intelligence />
        </div>

        {/* Who it's for */}
        <V2Audience />

        {/* Metrics & social proof */}
        <V2Metrics />

        {/* Final CTA */}
        <V2CTA />
      </main>

      <V2Footer />
    </div>
  );
}
