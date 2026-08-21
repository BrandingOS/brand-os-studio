/**
 * Closing (paper) — one ink panel, the ask, and the mark breathing
 * beside it. Rounded and contained, so the page ends on a card — the
 * inverse of the old full-bleed finale.
 */
import { motion } from 'framer-motion';
import { LogoMark } from '@/components/brand/LogoMark';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';
import { reveal } from './shared';

export function Cta() {
  const { open } = useEarlyAccess();

  return (
    <section className="bg-background text-foreground" aria-label="Get early access">
      <div className="container-tight pb-28 pt-4 md:pb-36">
        <motion.div
          {...reveal}
          className="relative overflow-hidden rounded-[24px] bg-panel px-8 py-16 text-panel-foreground shadow-glow md:px-16 md:py-24"
        >
          <div className="relative z-10 grid grid-cols-1 items-center gap-12 md:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="microlabel opacity-60">
                Early access — rolling out in waves
              </span>
              <h2 className="display-chapter mt-6">
                Start with your <span className="serif-accent">core.</span>
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-panel-foreground/55">
                Build once. Create from it. Grow without losing it. Five quick
                questions and your seat in the first wave is reserved.
              </p>
              <button type="button" onClick={open} className="btn-on-dark mt-9">
                Build your brand
                <span className="font-mono font-bold">↳</span>
              </button>
            </div>

            <div className="hidden justify-center md:flex">
              <LogoMark breathe className="w-44 text-panel-foreground lg:w-56" />
            </div>
          </div>

          {/* faint echo behind the panel corner */}
          <LogoMark className="pointer-events-none absolute -bottom-16 -right-16 w-72 text-panel-foreground opacity-[0.05]" />
        </motion.div>
      </div>
    </section>
  );
}
