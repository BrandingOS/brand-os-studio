import { useEffect } from 'react';
import Lenis from 'lenis';
import { Nav } from '@/components/Nav';
import { Hero } from '@/sections/Hero';
import { PoweredBy } from '@/sections/PoweredBy';
import { WhatIs, Features } from '@/sections/WhatIs';
import { Solutions } from '@/sections/Solutions';
import { Start } from '@/sections/Start';
import { AssetsMarquee } from '@/sections/AssetsMarquee';
import { Source } from '@/sections/Source';
import { CTA } from '@/sections/CTA';
import { FooterNext } from '@/components/FooterNext';
import { EarlyAccessProvider } from '@/components/EarlyAccessProvider';
import { EarlyAccessDialog } from '@/components/EarlyAccessDialog';
import { ArchivePage } from '@/ArchivePage';

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
 * The page, chapter by chapter:
 *   Hero        — the dive + the orbit stage, one track (ink reveal)
 *   PoweredBy   — the tech-stack logo marquee
 *   Flow        — video + steps, then the folder→system graph
 *   Features    — the four product pillars
 *   Solutions   — three ways in, one system
 *   Start       — start with what you already have
 *   AssetsMarquee — formats in, kits out
 *   Source      — one source behind everything (quadrant + DNA cycle)
 *   CTA         — every brand will need an operating system
 *
 * Everything that was cut lives ON at /archive (ArchivePage) so ideas
 * can be pulled back later.
 */
function App() {
  useLenis();

  const isArchive =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === '/archive';

  return (
    <EarlyAccessProvider>
      {isArchive ? (
        <ArchivePage />
      ) : (
        <div className="min-h-screen bg-background text-foreground antialiased">
          <Nav />
          <main>
            {/* Hero carries the dive AND the orbit stage on one track */}
            <Hero />
            <PoweredBy />
            <WhatIs />
            {/* Features — under the diagram, iterating from the opener copy */}
            <Features />
            <Solutions />
            <Start />
            <AssetsMarquee />
            <Source />
            <CTA />
          </main>
          <FooterNext />
        </div>
      )}

      {/* Single early-access modal — every CTA opens this instance */}
      <EarlyAccessDialog />
    </EarlyAccessProvider>
  );
}

export default App;
