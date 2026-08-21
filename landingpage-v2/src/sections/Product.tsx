/**
 * 01 · The product (ink) — you dove into the core, and inside it is
 * the real thing: one clean screenshot, three numbers, no theatre.
 */
import { motion } from 'framer-motion';
import { BrowserFrame } from '@/components/BrowserFrame';
import kitRaqm from '@/assets/product/prod-brandkit.png';
import { SectionHeader, reveal } from './shared';

const STATS = [
  { n: '7', label: 'Brand sections', line: 'Assets · stationery · social · web · guides · decks · motion' },
  { n: '93', label: 'Generated assets', line: 'Every one drawn from the same core — none hand-painted' },
  { n: '1', label: 'Source of truth', line: 'Change it once and every deliverable already knows' },
];

export function Product() {
  return (
    <section id="product" className="bg-panel text-panel-foreground" aria-label="The product">
      <div className="container-tight pb-28 pt-[12vh] md:pb-36">
        <SectionHeader
          align="center"
          eyebrow="01 · The product"
          title="This is BrandingOS."
          sub="The operating system behind your brand — here, running a real one. Real screens, no mockups."
        />

        <motion.div
          initial={{ opacity: 0, y: 44 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-14 w-full md:mt-20 lg:w-[88%]"
        >
          <BrowserFrame
            dark
            src={kitRaqm}
            alt="A generated brand kit in BrandingOS — logos, colors, fonts, stationery"
            url="brandingos.app/b/raqm/brand-kit"
          />
        </motion.div>

        {/* the numbers — one hairline row, three facts */}
        <motion.div
          {...reveal}
          className="mx-auto mt-14 grid grid-cols-1 divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:w-[88%]"
        >
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-2 px-6 py-7">
              <span className="font-display text-4xl font-extrabold md:text-5xl">
                {s.n}
              </span>
              <span className="microlabel opacity-60">{s.label}</span>
              <span className="text-sm leading-relaxed text-panel-foreground/45">
                {s.line}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
