import { useEffect } from 'react';
import Lenis from 'lenis';
import { Nav } from '@/components/Nav';
import { Hero } from '@/sections/Hero';
import { Product } from '@/sections/Product';
import { Features } from '@/sections/Features';
import { Steps } from '@/sections/Steps';
import { Switcher } from '@/sections/Switcher';
import { ForWho } from '@/sections/ForWho';
import { Faq } from '@/sections/Faq';
import { Cta } from '@/sections/Cta';
import { FooterNext } from '@/components/FooterNext';
import { EarlyAccessProvider } from '@/components/EarlyAccessProvider';
import { EarlyAccessDialog } from '@/components/EarlyAccessDialog';

/** Smooth inertial scrolling — the hero's zoom sequence depends on it
 *  feeling continuous rather than notched. Lenis animates the real
 *  scroll position, so framer-motion's useScroll stays in sync. */
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
 * Landing v2 — same hero, then a conventional, clearly-sectioned
 * product page (each section self-contained):
 *   Hero     — your brand, now executable (dive into the core)
 *   Product  — this is BrandingOS: one real screen + the numbers (ink)
 *   Features — six modules as a bento grid (paper)
 *   Steps    — how it works, three moves (white band)
 *   Switcher — pick a core, watch it re-brand (subtle band)
 *   ForWho   — five audiences behind tabs (ink)
 *   Faq      — five answers on hairlines (paper)
 *   Cta      — one ink panel, the ask
 */
function App() {
  useLenis();

  return (
    <EarlyAccessProvider>
      <div className="min-h-screen bg-background text-foreground antialiased">
        <Nav />
        <main>
          <Hero />
          <Product />
          <Features />
          <Steps />
          <Switcher />
          <ForWho />
          <Faq />
          <Cta />
        </main>
        <FooterNext />
      </div>

      {/* Single early-access modal — every CTA opens this instance */}
      <EarlyAccessDialog />
    </EarlyAccessProvider>
  );
}

export default App;
