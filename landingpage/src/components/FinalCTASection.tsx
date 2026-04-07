import { motion } from 'framer-motion';
import { Aurora } from '@/components/fancy/Aurora';
import { EarlyAccessForm } from '@/components/EarlyAccessForm';

/**
 * Final CTA — full aurora panel with massive headline and stacked email form.
 * The form IS the CTA — no separate buttons.
 */
export const FinalCTASection = () => {
  return (
    <section className="section">
      <div className="container-tight">
        <div className="aurora-stage relative overflow-hidden surface px-8 md:px-16 py-24 md:py-32 text-center border-beam">
          <Aurora />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="eyebrow">Get early access</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="display mt-8 text-foreground"
            >
              Brand once.
              <br />
              <span className="gradient-text">Use forever.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-6 text-lg text-fg-muted max-w-xl mx-auto leading-relaxed"
            >
              Join the early access list — be first when Brand OS launches.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-10 max-w-md mx-auto"
            >
              <EarlyAccessForm
                variant="stacked"
                buttonLabel="Request Early Access"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
