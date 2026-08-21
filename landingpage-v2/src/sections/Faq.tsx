/**
 * 06 · Questions (paper) — five answers, one accordion on hairlines.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';
import { SectionHeader, reveal } from './shared';

const QA: { q: string; a: string }[] = [
  {
    q: 'What is BrandingOS?',
    a: 'The operating system behind your brand. It structures strategy, identity, assets, rules and creation into one connected system — so everything you make starts from the same source instead of referencing scattered files.',
  },
  {
    q: 'I only have a logo. Is that enough?',
    a: 'Yes. Bring a complete identity, a logo and nothing else, or start from zero — however the brand enters, it leaves as a system. The platform reads what you have and builds the rest around it.',
  },
  {
    q: 'What do I actually get?',
    a: 'A structured Brand Kit (logos and approved variations, colors, typography, stationery, social and digital deliverables), living guidelines you share as one link, brand-aware templates, a design studio, and real exports — SVG, PNG, PDF, ZIP.',
  },
  {
    q: 'Can AI really use my brand?',
    a: 'That’s the point. Your brand context is structured and attached to every prompt — voice, palette, type, logos, audience — so you prompt the idea, not the brand. And AI suggests; you decide. Nothing becomes official without you.',
  },
  {
    q: 'When do I get access?',
    a: 'Early access is rolling out in waves. Leave your email and we’ll reserve your seat in the next one.',
  },
];

function Row({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="hairline-t">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-6 text-left md:py-7"
      >
        <span className="font-display text-lg font-bold md:text-xl">{q}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border transition-transform duration-300 ease-out-expo ${
            open ? 'rotate-45' : ''
          }`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M6 1v10M1 6h10" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-7 text-base leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState(0);
  const { open: openDialog } = useEarlyAccess();

  return (
    <section id="faq" className="bg-background text-foreground" aria-label="Questions">
      <div className="container-tight py-28 md:py-36">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <SectionHeader
              eyebrow="06 · Questions"
              title={
                <>
                  Answers,{' '}
                  <span className="serif-accent">briefly.</span>
                </>
              }
              sub="The five things people ask before they hand us their brand."
            />
            <motion.button
              {...reveal}
              type="button"
              onClick={openDialog}
              className="btn-ghost mt-8"
            >
              Still curious? Ask us directly
              <span aria-hidden="true">→</span>
            </motion.button>
          </div>

          <motion.div {...reveal}>
            {QA.map((item, i) => (
              <Row
                key={item.q}
                q={item.q}
                a={item.a}
                open={open === i}
                onToggle={() => setOpen(open === i ? -1 : i)}
              />
            ))}
            <div className="hairline-t" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
