/**
 * Chapter 07 — What we believe (ink).
 *
 * The manifesto's closing argument:
 *   · five beliefs, numbered editorial rows
 *   · today they guess — tomorrow they query (the console)
 *   · the future isn't more brand files
 */
import { motion } from 'framer-motion';
import { ChapterHead, Statement, reveal } from './shared';

/* ── 1 · Five beliefs ───────────────────────────────────────────── */

const BELIEFS = [
  {
    head: 'Brand consistency is becoming a systems problem.',
    sub: 'Design defines the identity. Systems keep it intact at scale.',
  },
  {
    head: 'Guidelines will become executable.',
    sub: 'A rule that software cannot understand still depends on somebody remembering it.',
  },
  {
    head: 'AI makes brand infrastructure more important, not less.',
    sub: 'When everyone can generate — identity becomes the scarce thing.',
  },
  {
    head: 'The AI model is not the brand.',
    sub: 'Models will change. Your accumulated brand context should not.',
  },
  {
    head: 'Brands will become machine-readable.',
    sub: 'People will create with your brand. Software will too. Both need a reliable source to ask: what is true here?',
  },
];

function BeliefRows() {
  return (
    <div className="mt-16 md:mt-24">
      {BELIEFS.map((b, i) => (
        <motion.div
          key={b.head}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-70px' }}
          transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          className="grid grid-cols-1 gap-4 border-t border-white/10 py-10 md:grid-cols-[90px_1fr_minmax(0,340px)] md:gap-10 md:py-14"
        >
          <span className="font-mono text-xl font-semibold opacity-30 md:text-2xl">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="font-display max-w-2xl text-2xl font-extrabold leading-[1.1] md:text-4xl">
            {b.head}
          </h3>
          <p className="text-sm leading-relaxed text-panel-foreground/50 md:pt-2 md:text-base">
            {b.sub}
          </p>
        </motion.div>
      ))}
      <div className="border-t border-white/10" />
    </div>
  );
}

/* ── 2 · Tomorrow, they query ───────────────────────────────────── */

const QUERIES = [
  { q: 'which logo, on a dark ground?', a: 'primary-inverse.svg' },
  { q: 'which typography for headlines?', a: 'display / 700 / −3%' },
  { q: 'which tone for a launch?', a: 'confident — never loud' },
  { q: 'which imagery?', a: 'warm, natural light, no stock' },
  { q: 'what is true here?', a: 'one source. always current.' },
];

function QueryBeat() {
  return (
    <div className="mt-[26vh]">
      <Statement text="The next generation of companies won’t brief every tool on their brand. Their tools will *already* *know.*" />

      <motion.p {...reveal} className="mt-10 max-w-2xl text-base leading-relaxed text-panel-foreground/60 md:text-lg">
        Creation is moving beyond design software — into assistants, agents,
        automation, marketing systems, content engines, products we
        haven&rsquo;t seen yet. Every one of them will eventually need the
        same information.
      </motion.p>

      <div className="mt-14 grid grid-cols-1 items-center gap-10 md:mt-20 md:grid-cols-[auto_1fr] md:gap-16">
        <motion.div {...reveal} className="font-display text-3xl font-extrabold leading-tight md:text-5xl">
          <span className="opacity-35 line-through decoration-2">
            Today, they guess.
          </span>
          <br />
          Tomorrow, they <span className="serif-accent">query.</span>
        </motion.div>

        <motion.div
          {...reveal}
          className="overflow-hidden rounded-[18px] border border-white/12 bg-white/[0.03]"
        >
          <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-white/15" />
            ))}
            <span className="microlabel ml-3 opacity-40">brand — query</span>
          </div>
          <div className="space-y-3 p-5 font-mono text-xs md:p-6 md:text-sm">
            {QUERIES.map((r, i) => (
              <motion.div
                key={r.q}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.18 }}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
              >
                <span className="text-panel-foreground/45">
                  <span className="mr-2 opacity-60">›</span>
                  {r.q}
                </span>
                <span className="font-semibold">{r.a}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.p {...reveal} className="microlabel mt-10 opacity-50">
        BrandingOS is building what answers.
      </motion.p>
    </div>
  );
}

/* ── 3 · The future isn't more brand files ──────────────────────── */

const NOTS = [
  'Not another folder.',
  'Not another PDF.',
  'Not another prompt library.',
  'Not another brand kit copied into another tool.',
];

const KNOWS = [
  'what the brand means',
  'what it looks like',
  'what belongs',
  'how it should create',
];

function FutureBeat() {
  return (
    <div className="mt-[26vh]">
      <motion.div {...reveal} className="space-y-1.5">
        {NOTS.map((n) => (
          <p
            key={n}
            className="font-display text-xl font-bold text-panel-foreground/35 line-through decoration-1 md:text-2xl"
          >
            {n}
          </p>
        ))}
      </motion.div>

      <div className="mt-14 md:mt-20">
        <Statement text="The future is a *living* *system* behind the brand." />
      </div>

      <motion.div {...reveal} className="mt-12 flex flex-wrap gap-2.5">
        {KNOWS.map((k) => (
          <span
            key={k}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-panel-foreground/70"
          >
            knows {k}
          </span>
        ))}
        <span className="rounded-full border border-panel-foreground bg-panel-foreground px-4 py-2 text-sm font-semibold text-panel">
          and carries it wherever the brand goes
        </span>
      </motion.div>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Beliefs() {
  return (
    <section
      id="beliefs"
      className="bg-panel text-panel-foreground"
      aria-label="What we believe"
    >
      <div className="container-tight py-[18vh]">
        <ChapterHead label="08 · What we believe" hint="Branding is changing" />

        <motion.h2 {...reveal} className="h-section mt-10 max-w-3xl">
          We believe branding is{' '}
          <span className="serif-accent">changing.</span>
        </motion.h2>

        <BeliefRows />
        <QueryBeat />
        <FutureBeat />
      </div>
    </section>
  );
}
