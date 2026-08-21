/**
 * 05 · Who it's for (ink) — five audiences behind a tab row. The
 * active pill glides between tabs; each panel is self-contained:
 * one promise line, one supporting line, three concrete outcomes.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SectionHeader } from './shared';

interface Audience {
  id: string;
  tab: string;
  headline: string;
  line: string;
  outcomes: string[];
}

const AUDIENCES: Audience[] = [
  {
    id: 'founders',
    tab: 'Founders',
    headline: 'Go beyond having a logo.',
    line: 'Build something the company can actually operate from — before the first hire, before the first deck.',
    outcomes: ['A complete kit in an evening', 'Investor-ready decks and one-pagers', 'A system that survives your growth'],
  },
  {
    id: 'marketing',
    tab: 'Marketing teams',
    headline: 'Create more without becoming the approval department.',
    line: 'When creation starts from the brand, review stops being the bottleneck.',
    outcomes: ['On-brand by default, not by review', 'Campaign assets in every format', 'One truth for every channel'],
  },
  {
    id: 'designers',
    tab: 'Designers',
    headline: 'Spend less time reconstructing context.',
    line: 'The brand’s decisions travel with the work — so you spend your hours making it better, not explaining it.',
    outcomes: ['Hand over systems, not folders', 'Brand-aware templates that hold up', 'Guidelines that never age'],
  },
  {
    id: 'agencies',
    tab: 'Agencies',
    headline: 'Deliver systems clients can keep using.',
    line: 'Not folders they slowly destroy. Every client brand gets its own operating system.',
    outcomes: ['A portfolio of brands, one workspace', 'Client handoff that actually holds', 'Repeatable delivery, brand-correct'],
  },
  {
    id: 'brand',
    tab: 'Brand teams',
    headline: 'Give more people freedom without giving up control.',
    line: 'Deliberate change instead of accidental drift — local, campaign, proposed, official.',
    outcomes: ['Nothing drifts by accident', 'One source, every team', 'Change is a decision, tracked'],
  },
];

export function ForWho() {
  const [active, setActive] = useState(0);
  const a = AUDIENCES[active];

  return (
    <section id="for" className="bg-panel text-panel-foreground" aria-label="Who it's for">
      <div className="container-tight py-28 md:py-36">
        <SectionHeader
          eyebrow="05 · Who it's for"
          hint="Five seats, one system"
          title={
            <>
              Built for the people who make brands{' '}
              <span className="serif-accent">move.</span>
            </>
          }
        />

        {/* Tab row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          className="mt-12 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Audience"
        >
          {AUDIENCES.map((aud, i) => (
            <button
              key={aud.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`relative rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                i === active
                  ? 'text-panel'
                  : 'text-panel-foreground/55 hover:text-panel-foreground'
              }`}
            >
              {i === active && (
                <motion.span
                  layoutId="forwho-pill"
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-panel-foreground"
                />
              )}
              <span className="relative">{aud.tab}</span>
            </button>
          ))}
        </motion.div>

        {/* Panel */}
        <div className="mt-8 overflow-hidden rounded-[18px] border border-white/12 bg-white/[0.03]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:gap-14 md:p-12"
              role="tabpanel"
            >
              <div>
                <h3 className="font-display text-2xl font-extrabold leading-tight md:text-4xl">
                  {a.headline}
                </h3>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-panel-foreground/55 md:text-lg">
                  {a.line}
                </p>
              </div>
              <ul className="flex flex-col justify-center gap-3">
                {a.outcomes.map((o, i) => (
                  <li key={o} className="flex items-baseline gap-3 border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                    <span className="font-mono text-xs opacity-40">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-base">{o}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
