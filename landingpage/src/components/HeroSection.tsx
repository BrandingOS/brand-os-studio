import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Aurora } from '@/components/fancy/Aurora';
import { EarlyAccessForm } from '@/components/EarlyAccessForm';

const heroImage =
  'https://i.pinimg.com/1200x/18/ec/a2/18eca28a85c40aa0b255742cbe3a0656.jpg';

/**
 * Hero — v4 fancy.
 *
 * Aurora mesh-gradient background, glassy "now in private preview" pill,
 * massive display headline with animated gradient on the second line,
 * subtitle, glowing email CTA, hero image floating below with a violet/
 * pink halo (`.glow-ring`). Everything fades up with framer-motion on
 * mount.
 */
export const HeroSection = () => {
  return (
    <section className="aurora-stage relative pt-20 md:pt-32 pb-24 md:pb-32 overflow-hidden">
      <Aurora />

      <div className="container-tight relative z-10">
        {/* Top: text block, centered */}
        <div className="max-w-4xl mx-auto text-center">
          {/* Glassy preview pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex"
          >
            <div className="surface-glass inline-flex items-center gap-2 rounded-full px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet" />
              <span className="text-xs font-medium tracking-wide text-foreground">
                Now in private preview
              </span>
            </div>
          </motion.div>

          {/* Massive headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="display-xl mt-8 text-foreground"
          >
            Build a brand once.
            <br />
            <span className="gradient-text">Use it everywhere.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 mx-auto max-w-2xl text-lg md:text-xl text-fg-muted leading-relaxed"
          >
            Create your brand system once — Brand OS syncs your logo, colors,
            type and voice across every asset. One source of truth, used
            everywhere.
          </motion.p>

          {/* Early access form */}
          <motion.div
            id="early-access"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 mx-auto max-w-md scroll-mt-32"
          >
            <EarlyAccessForm />
            <p className="mt-3 text-xs text-fg-dim">
              Be first in line. No spam — just one launch email.
            </p>
          </motion.div>

          {/* Secondary link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-10"
          >
            <a
              href="#setup"
              className="group inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-foreground transition-colors"
            >
              See how it works
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>

        {/* Floating hero mockup with glow halo */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 md:mt-32 mx-auto max-w-5xl"
        >
          <div className="surface glow-ring overflow-hidden">
            <img
              src={heroImage}
              alt="Brand OS preview"
              loading="eager"
              className="w-full aspect-[16/9] object-cover"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
