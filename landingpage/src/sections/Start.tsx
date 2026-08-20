/**
 * Start with what you already have (ink) — its own section, split out
 * of Source at owner request. Three doors in, one system out.
 */
import { motion } from 'framer-motion';
import { CORE_DOT, DOT_R, MARK_VIEW, OUTER_DOTS } from '@/components/brand/LogoMark';
import { ChapterHead, reveal } from './shared';

/** Entry glyphs speak the dot grammar: how much of the mark you
 *  arrive with — all nine, just the core + one, or the core alone. */
function EntryGlyph({ dots }: { dots: number }) {
  const shown =
    dots >= 9
      ? OUTER_DOTS
      : dots === 2
        ? [OUTER_DOTS[0]]
        : [];
  return (
    <svg
      viewBox={`0 0 ${MARK_VIEW} ${MARK_VIEW}`}
      className="h-12 w-12 text-panel-foreground"
      fill="currentColor"
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      {OUTER_DOTS.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={DOT_R}
          opacity={shown.includes(d) ? 1 : 0.12}
        />
      ))}
      <circle cx={CORE_DOT.x} cy={CORE_DOT.y} r={DOT_R} />
    </svg>
  );
}

/* zero → logo → complete: the mark fills in left to right */
const DOORS = [
  {
    dots: 1,
    have: 'Starting from zero?',
    move: 'Create the foundation inside BrandingOS.',
  },
  {
    dots: 2,
    have: 'A logo and nothing else?',
    move: 'Build from it.',
  },
  {
    dots: 9,
    have: 'A complete identity?',
    move: 'Bring it in.',
  },
];

export function Start() {
  return (
    <section
      id="start"
      className="bg-panel text-panel-foreground"
      aria-label="Start with what you already have"
    >
      <div className="container-tight pb-[16vh] pt-[12vh]">
        <ChapterHead label="Start with what you already have" hint="04" />

        <div className="mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-3">
          {DOORS.map((d, i) => (
            <motion.div
              key={d.have}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.19, 1, 0.22, 1] }}
              className="flex min-h-[240px] flex-col justify-between rounded-[18px] border border-white/12 bg-white/[0.03] p-7 md:p-8"
            >
              <EntryGlyph dots={d.dots} />
              <div>
                <p className="font-display text-xl font-bold md:text-2xl">
                  {d.have}
                </p>
                <p className="mt-2 text-base text-panel-foreground/55">{d.move}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          {...reveal}
          className="mt-16 text-center font-display text-2xl font-bold leading-snug md:mt-24 md:text-4xl"
        >
          However the brand enters —{' '}
          <span className="serif-accent">it leaves as a system.</span>
        </motion.p>
      </div>
    </section>
  );
}
