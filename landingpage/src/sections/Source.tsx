/**
 * Chapter 02 — One source (paper).
 *
 * Three beats:
 *   · one source behind everything — Meaning / Identity / Rules /
 *     Creation arranged around the 9-dot core
 *   · the brand stops being a reference, it becomes an input
 *   · start with what you already have — three doors in, one system out
 */
import { motion } from 'framer-motion';
import { LogoMark, CORE_DOT, DOT_R, MARK_VIEW, OUTER_DOTS } from '@/components/brand/LogoMark';
import { ChapterHead, Statement, reveal } from './shared';

/* ── 1 · The four faces of the source ───────────────────────────── */

const FACETS: { name: string; items: string[] }[] = [
  {
    name: 'Meaning',
    items: ['Strategy', 'Audience', 'Positioning', 'Personality', 'Voice', 'Messaging'],
  },
  {
    name: 'Identity',
    items: ['Logos', 'Colors', 'Typography', 'Visual direction', 'Imagery', 'Assets'],
  },
  {
    name: 'Rules',
    items: ['What belongs', 'What doesn’t', 'What can change', 'What stays fixed'],
  },
  {
    name: 'Creation',
    items: ['AI', 'Templates', 'Design', 'Campaigns', 'Social', 'Presentations'],
  },
];

function SourceGrid() {
  return (
    <div className="relative mt-16 md:mt-24">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-24 lg:gap-32">
        {FACETS.map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.19, 1, 0.22, 1] }}
            className="card-soft p-7 md:p-8"
          >
            <div className="flex items-baseline justify-between">
              <span className="microlabel label-rule opacity-70">{f.name}</span>
              <span className="font-mono text-xs opacity-35">
                0{i + 1}
              </span>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
              {f.items.map((it) => (
                <li
                  key={it}
                  className="rounded-full border border-border bg-secondary px-3.5 py-1.5 text-sm text-foreground/75"
                >
                  {it}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* the core, seated at the cross point of the four (md+) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
        // centring lives in framer's x/y — a Tailwind -translate-* class
        // would be overwritten by the scale animation's transform
        style={{ x: '-50%', y: '-50%' }}
        className="pointer-events-none absolute left-1/2 top-1/2 hidden md:block"
        aria-hidden="true"
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card shadow-elevated lg:h-28 lg:w-28">
          <LogoMark breathe className="h-9 w-9 text-foreground lg:h-12 lg:w-12" />
        </span>
      </motion.div>

      <motion.p {...reveal} className="microlabel mt-10 text-center opacity-55">
        Everything points back to one brand.
      </motion.p>
    </div>
  );
}

/* ── 2 · Reference → input ──────────────────────────────────────── */

function InputBeat() {
  return (
    <div className="mt-[24vh]">
      <Statement text="The brand stops being a reference. It becomes an *input.*" />

      <div className="mt-14 grid max-w-4xl grid-cols-1 gap-8 md:mt-20 md:grid-cols-2 md:gap-14">
        <motion.div {...reveal} className="space-y-2 text-base leading-relaxed text-muted-foreground md:text-lg">
          <p>
            Today, you create something —{' '}
            <span className="text-foreground">then reference the brand.</span>
          </p>
          <p>With BrandingOS, the brand comes first.</p>
        </motion.div>
        <motion.div {...reveal} className="text-base leading-relaxed text-muted-foreground md:text-lg">
          <p>
            The system already knows the identity. The assets. The
            typography. The colors. The visual language. The voice. The
            context.{' '}
            <span className="font-semibold text-foreground">
              Creation starts there.
            </span>
          </p>
        </motion.div>
      </div>

      <motion.p
        {...reveal}
        className="mt-16 max-w-3xl font-display text-2xl font-bold leading-snug md:mt-24 md:text-4xl"
      >
        Your brand becomes something{' '}
        <span className="serif-accent">software can build from.</span>
      </motion.p>
    </div>
  );
}

/* ── 3 · Three doors in ─────────────────────────────────────────── */

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
      className="h-12 w-12 text-foreground"
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

const DOORS = [
  {
    dots: 9,
    have: 'A complete identity?',
    move: 'Bring it in.',
  },
  {
    dots: 2,
    have: 'A logo and nothing else?',
    move: 'Build from it.',
  },
  {
    dots: 1,
    have: 'Starting from zero?',
    move: 'Create the foundation inside BrandingOS.',
  },
];

function DoorsBeat() {
  return (
    <div className="mt-[24vh]">
      <motion.h3 {...reveal} className="h-section max-w-3xl">
        Start with what you{' '}
        <span className="serif-accent">already have.</span>
      </motion.h3>

      <div className="mt-14 grid grid-cols-1 gap-4 md:mt-20 md:grid-cols-3">
        {DOORS.map((d, i) => (
          <motion.div
            key={d.have}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.19, 1, 0.22, 1] }}
            className="card-soft flex min-h-[240px] flex-col justify-between p-7 md:p-8"
          >
            <EntryGlyph dots={d.dots} />
            <div>
              <p className="font-display text-xl font-bold md:text-2xl">
                {d.have}
              </p>
              <p className="mt-2 text-base text-muted-foreground">{d.move}</p>
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
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Source() {
  return (
    <section
      id="source"
      className="bg-background text-foreground"
      aria-label="One source behind everything"
    >
      <div className="container-tight pb-32 pt-28 md:pb-44 md:pt-36">
        <ChapterHead label="03 · One source" hint="Not the files — the decisions" />

        <motion.h2 {...reveal} className="h-section mt-10 max-w-3xl">
          One source behind{' '}
          <span className="serif-accent">everything.</span>
        </motion.h2>

        <motion.p
          {...reveal}
          className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          BrandingOS structures the brand itself. Not only the files — the
          decisions behind them.
        </motion.p>

        <SourceGrid />
        <InputBeat />
        <DoorsBeat />
      </div>
    </section>
  );
}
