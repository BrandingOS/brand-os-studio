/**
 * Closing chapter (ink) — the ask, plus the mark rising half-cropped
 * from the bottom edge as the page's final echo.
 */
import { motion } from 'framer-motion';
import { LogoMark } from '@/components/brand/LogoMark';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.9, ease: [0.19, 1, 0.22, 1] as const },
};

export function CTA() {
  const { open } = useEarlyAccess();

  return (
    <section
      className="relative overflow-hidden bg-panel text-panel-foreground"
      aria-label="Get early access"
    >
      <div className="container-tight relative z-10 flex min-h-[92vh] flex-col items-center justify-center py-32 text-center">
        <motion.span {...reveal} className="microlabel opacity-60">
          BrandingOS — The Brand Operating System
        </motion.span>

        <motion.h2 {...reveal} className="display-chapter mt-8 max-w-4xl">
          Every brand will need an operating system.
          <br />
          <span className="serif-accent">We built it.</span>
        </motion.h2>

        <motion.p
          {...reveal}
          className="mt-7 max-w-md text-base leading-relaxed text-panel-foreground/55"
        >
          Build once. Create from it. Grow without losing it.
        </motion.p>

        <motion.div {...reveal} className="mt-10">
          <button type="button" onClick={open} className="btn-on-dark">
            Build your brand
            <span className="font-mono font-bold">↳</span>
          </button>
        </motion.div>

        <motion.span {...reveal} className="microlabel mt-6 opacity-40">
          Early access — rolling out in waves
        </motion.span>
      </div>

      {/* Final echo — the mark, half-buried in the page edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
        <LogoMark className="w-[min(70vw,560px)] translate-y-[58%] text-panel-foreground opacity-[0.06]" />
      </div>
    </section>
  );
}
