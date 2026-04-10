import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/**
 * Final CTA — second "strong block" of the page.
 *
 * Massive editorial display headline on a dark surface with subtle inner
 * grid. Single big primary CTA that opens the early access modal. No
 * other links, no other buttons.
 */
export const FinalCTASection = () => {
  const { open } = useEarlyAccess();

  return (
    <section className="section bg-dot-grid">
      <div className="container-tight">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="strong-block px-6 sm:px-12 md:px-16 py-24 md:py-36 text-center"
        >
          <div aria-hidden className="absolute inset-0 panel-grid opacity-50 pointer-events-none" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 80% at 50% 0%, hsl(0 0% 100% / 0.06) 0%, transparent 60%)',
            }}
          />

          <div className="relative">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="eyebrow-light inline-flex"
            >
              Get early access
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="display mt-8 text-[hsl(var(--panel-foreground))]"
            >
              Brand once.
              <br />
              Use forever.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 text-lg md:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed"
            >
              Be first in line when Brand OS launches. Three quick questions
              and we'll save your spot.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12"
            >
              <button
                type="button"
                onClick={open}
                className="btn-on-dark group"
              >
                Request Early Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
