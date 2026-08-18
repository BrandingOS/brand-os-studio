import { useEffect } from 'react';
import Lenis from 'lenis';
import { Nav } from '@/components/Nav';
import { Hero } from '@/sections/Hero';
import { WhatIs } from '@/sections/WhatIs';
import { Why } from '@/sections/Why';
import { Source } from '@/sections/Source';
import { Proof } from '@/sections/Proof';
import { System } from '@/sections/System';
import { Connection } from '@/sections/Connection';
import { Scale } from '@/sections/Scale';
import { Beliefs } from '@/sections/Beliefs';
import { CTA } from '@/sections/CTA';
import { FooterNext } from '@/components/FooterNext';
import { EarlyAccessProvider } from '@/components/EarlyAccessProvider';
import { EarlyAccessDialog } from '@/components/EarlyAccessDialog';

/** Smooth inertial scrolling — the zoom sequence depends on it feeling
 *  continuous rather than notched. Lenis animates the real scroll
 *  position, so framer-motion's useScroll stays in sync for free. */
function useLenis() {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({ lerp: 0.09, anchors: true });
    // Exposed so chrome pieces (the navbar logo's go-home gesture) can
    // drive a smooth scroll without threading the instance around.
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      lenis.destroy();
    };
  }, []);
}

/**
 * The page follows the definitive manifesto copy, chapter by chapter:
 *   Hero       — your brand, now executable (dive into the core)
 *   InsideCore — the product reveal, real screens (ink)
 *   Why        — everything has a system; brand doesn't (ink)
 *   Source     — one source behind everything (paper)
 *   Proof      — one change, everywhere it matters (live wall)
 *   System     — kit · guidelines · AI · create · templates (paper)
 *   Connection — the connection, the loop, deliberate change (ink)
 *   Scale      — 9 → 90 → 900, portfolios, the people (paper)
 *   Beliefs    — branding is changing; tomorrow they query (ink)
 *   CTA        — every brand will need an operating system
 */
function App() {
  useLenis();

  return (
    <EarlyAccessProvider>
      <div className="min-h-screen bg-background text-foreground antialiased">
        <Nav />
        <main>
          <Hero />
          <WhatIs />
          <Why />
          <Source />
          <Proof />
          <System />
          <Connection />
          <Scale />
          <Beliefs />
          <CTA />
        </main>
        <FooterNext />
      </div>

      {/* Single early-access modal — every CTA opens this instance */}
      <EarlyAccessDialog />
    </EarlyAccessProvider>
  );
}

export default App;
