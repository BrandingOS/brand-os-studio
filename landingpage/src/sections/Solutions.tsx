/**
 * Chapter 03 — Solutions (ink).
 *
 * Three audiences, one system — told as editorial rows (owner killed
 * the boxes): hook line + situation, per audience. Copy is the
 * owner's, verbatim.
 */
import { motion } from 'framer-motion';
import { ChapterHead, reveal } from './shared';

const SOLUTIONS = [
  {
    who: 'For founders',
    hook: 'You are the brand team.',
    body: 'Right now it all lives in your head — and you repeat it to every new person. BrandingOS holds it instead of you.',
  },
  {
    who: 'For designers',
    hook: 'You built a system. They got a folder.',
    body: 'Six months later the font is wrong and the logo is stretched. Deliver something that stays intact after you leave.',
  },
  {
    who: 'For agencies',
    hook: 'Twelve clients. Twelve sets of rules.',
    body: 'The right blue is in a Slack thread from March. Give every brand its own system, and your team one place to work.',
  },
];

export function Solutions() {
  return (
    <section id="solutions" className="bg-panel text-panel-foreground" aria-label="Solutions">
      <div className="container-tight pb-[16vh] pt-[12vh]">
        <ChapterHead label="Solutions" hint="03" />

        <motion.h2
          {...reveal}
          className="font-display mt-10 max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl"
        >
          Three ways in. One system.
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 gap-10 border-t border-white/10 pt-10 md:mt-16 md:grid-cols-3 md:gap-0 md:pt-12">
          {SOLUTIONS.map((s, i) => (
            <motion.div
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.06 }}
              key={s.who}
              className={`${i > 0 ? 'md:border-l md:border-white/10 md:pl-10' : ''} ${
                i < SOLUTIONS.length - 1 ? 'md:pr-10' : ''
              }`}
            >
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-panel-foreground/60 md:text-sm">
                {s.who}
              </span>
              <h3 className="font-display mt-2.5 text-xl font-bold leading-snug md:text-2xl">
                {s.hook}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-panel-foreground/55 md:text-base">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
