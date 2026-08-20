/**
 * Chapter 06 — Scale (paper).
 *
 * Three beats:
 *   · a brand that can scale past the people who created it —
 *     the identity's particle states (9 → 90 → 900) as the visual
 *   · one brand, or an entire portfolio
 *   · built for the people who make brands move
 */
import { motion } from 'framer-motion';
import { LogoMark } from '@/components/brand/LogoMark';
import { ChapterHead, reveal } from './shared';

/* ── 1 · Particle states — 9 / 90 / 900 ─────────────────────────── */

function DotField({ count }: { count: number }) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cell = 100 / cols;
  const r = Math.max(cell * 0.16, 0.8);
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill="currentColor" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const cx = (i % cols) * cell + cell / 2;
        const cy = Math.floor(i / cols) * cell + cell / 2 + ((rows * cell < 100 ? (100 - rows * cell) / 2 : 0));
        return <circle key={i} cx={cx} cy={cy} r={r} />;
      })}
    </svg>
  );
}

const STATES = [
  {
    n: 9,
    label: 'Day one',
    line: 'Three people. Five files. One designer. Everyone knows the brand.',
  },
  {
    n: 90,
    label: 'Growth',
    line: 'More people. More channels. More campaigns. More markets. More decisions.',
  },
  {
    n: 900,
    label: 'At scale',
    line: '“Everyone knows the brand” stops being a system. The system holds instead.',
  },
];

function ScaleBeat() {
  return (
    <div className="mt-16 md:mt-24">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STATES.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: [0.19, 1, 0.22, 1] }}
            className="card-soft flex flex-col p-7 md:p-8"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-sm font-bold">{s.n}</span>
              <span className="microlabel opacity-50">{s.label}</span>
            </div>
            <div className="mx-auto my-8 h-36 w-36 text-foreground md:h-40 md:w-40">
              <DotField count={s.n} />
            </div>
            <p className="mt-auto text-sm leading-relaxed text-muted-foreground">
              {s.line}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.p
        {...reveal}
        className="mt-16 max-w-3xl font-display text-2xl font-bold leading-snug md:mt-24 md:text-4xl"
      >
        The brand should survive growth{' '}
        <span className="serif-accent">without depending on memory.</span>
        <br />
        <span className="text-muted-foreground">
          That&rsquo;s what infrastructure is for.
        </span>
      </motion.p>
    </div>
  );
}

/* ── 2 · One brand, or a portfolio ──────────────────────────────── */

const PORTFOLIO = ['Companies', 'Product portfolios', 'Studios', 'Agencies', 'Teams at scale'];

function PortfolioBeat() {
  return (
    <div className="mt-[24vh]">
      <motion.h3 {...reveal} className="h-section max-w-3xl">
        One brand. Or an entire{' '}
        <span className="serif-accent">portfolio.</span>
      </motion.h3>

      <motion.p
        {...reveal}
        className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
      >
        Every brand has its own identity. Its own rules. Its own assets.
        Its own voice. Its own world. BrandingOS gives each one its own
        operating system — without turning the workspace into chaos.
      </motion.p>

      <motion.div {...reveal} className="mt-12 flex flex-wrap gap-3">
        {PORTFOLIO.map((p, i) => (
          <span
            key={p}
            className="card-soft inline-flex items-center gap-3 px-5 py-3.5"
          >
            <LogoMark className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold">{p}</span>
            <span className="font-mono text-[10px] opacity-30">
              0{i + 1}
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── 3 · The people who make brands move ────────────────────────── */

const PEOPLE = [
  {
    who: 'Founders',
    what: 'Go beyond having a logo. Build something the company can actually operate from.',
  },
  {
    who: 'Marketing teams',
    what: 'Create more without becoming the department that approves everything.',
  },
  {
    who: 'Designers',
    what: 'Spend less time reconstructing context. Spend more time making the brand better.',
  },
  {
    who: 'Agencies',
    what: 'Deliver systems clients can keep using — not folders they slowly destroy.',
  },
  {
    who: 'Brand teams',
    what: 'Give more people freedom without giving up control.',
  },
];

function PeopleBeat() {
  return (
    <div id="people" className="mt-[24vh]">
      <motion.h3 {...reveal} className="h-section max-w-3xl">
        Built for the people who make brands{' '}
        <span className="serif-accent">move.</span>
      </motion.h3>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
        {PEOPLE.map((p, i) => (
          <motion.div
            key={p.who}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: (i % 3) * 0.08, ease: [0.19, 1, 0.22, 1] }}
            className="card-soft flex min-h-[190px] flex-col justify-between p-7"
          >
            <span className="microlabel label-rule opacity-60">{p.who}</span>
            <p className="mt-6 text-base leading-relaxed text-foreground/85">
              {p.what}
            </p>
          </motion.div>
        ))}
        {/* the sixth cell — the invitation */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, delay: 0.16, ease: [0.19, 1, 0.22, 1] }}
          className="flex min-h-[190px] flex-col items-start justify-between rounded-[14px] border border-dashed border-foreground/25 p-7"
        >
          <span className="microlabel opacity-45">And you</span>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Anyone with a brand that deserves to{' '}
            <span className="serif-accent text-foreground">survive them.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Scale() {
  return (
    <section id="scale" className="bg-background text-foreground" aria-label="Scale">
      <div className="container-tight pb-32 pt-28 md:pb-44 md:pt-36">
        <ChapterHead label="07 · Scale" hint="9 → 90 → 900" />

        <motion.h2 {...reveal} className="h-section mt-10 max-w-4xl">
          A brand that can scale{' '}
          <span className="serif-accent">past the people</span> who created
          it.
        </motion.h2>

        <ScaleBeat />
        <PortfolioBeat />
        <PeopleBeat />
      </div>
    </section>
  );
}
