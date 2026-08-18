/**
 * Chapter 05 — The connection (ink).
 *
 * Three beats:
 *   · the most important feature isn't a feature — six tools that all
 *     exist elsewhere, and the one thing that doesn't: the connection
 *   · and the loop closes — output becomes input
 *   · nothing should drift by accident — the deliberate-change ladder
 */
import { motion } from 'framer-motion';
import { LogoMark } from '@/components/brand/LogoMark';
import { ChapterHead, Statement, reveal } from './shared';

/* ── 1 · The convergence ────────────────────────────────────────── */

const ELSEWHERE = [
  'AI generation',
  'Editors',
  'Templates',
  'Brand kits',
  'Guidelines',
  'Asset libraries',
];

/** Six satellites converging on the core — lines draw in on view. */
function Convergence() {
  const C = 200;
  const R = 158;
  const nodes = ELSEWHERE.map((_, i) => {
    const a = -Math.PI / 2 + (i / ELSEWHERE.length) * Math.PI * 2;
    return { x: C + Math.cos(a) * R, y: C + Math.sin(a) * R };
  });
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <svg viewBox="0 0 400 400" className="w-full" aria-hidden="true">
        {nodes.map((n, i) => (
          <motion.line
            key={i}
            x1={n.x}
            y1={n.y}
            x2={C}
            y2={C}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.25"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.1, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        {nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x}
            cy={n.y}
            r="7"
            fill="currentColor"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 0.55, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
        ))}
      </svg>
      {/* the core, seated over the SVG centre */}
      <motion.span
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        // centring lives in framer's x/y — a Tailwind -translate-* class
        // would be overwritten by the scale animation's transform
        style={{ x: '-50%', y: '-50%' }}
        className="absolute left-1/2 top-1/2 flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-panel"
        aria-hidden="true"
      >
        <LogoMark className="h-7 w-7 text-panel-foreground" />
      </motion.span>
    </div>
  );
}

function ConnectionBeat() {
  return (
    <div>
      <Statement text="The most important feature isn’t a feature. It’s the *connection.*" />

      <div className="mt-16 grid grid-cols-1 items-center gap-12 md:mt-24 md:grid-cols-2 md:gap-16">
        <motion.ul {...reveal} className="space-y-3">
          {ELSEWHERE.map((e, i) => (
            <li key={e} className="flex items-baseline gap-4 text-lg md:text-xl">
              <span className="font-mono text-xs opacity-35">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>
                <span className="font-semibold">{e}</span>{' '}
                <span className="opacity-45">
                  {e.endsWith('s') ? 'exist' : 'exists'} elsewhere.
                </span>
              </span>
            </li>
          ))}
        </motion.ul>

        <Convergence />
      </div>

      <motion.p
        {...reveal}
        className="mt-20 max-w-4xl font-display text-2xl font-bold leading-snug md:mt-28 md:text-4xl"
      >
        What doesn&rsquo;t exist in most workflows is the system connecting
        all of them back to the{' '}
        <span className="serif-accent">same brand.</span>
        <br />
        <span className="opacity-55">That&rsquo;s BrandingOS.</span>
      </motion.p>

      <motion.p {...reveal} className="mt-8 max-w-2xl text-base leading-relaxed text-panel-foreground/60 md:text-lg">
        The value isn&rsquo;t another place to make something. It&rsquo;s
        that everything knows what it is making <em className="not-italic text-panel-foreground">for</em>.
      </motion.p>
    </div>
  );
}

/* ── 2 · The loop closes ────────────────────────────────────────── */

const LEARNINGS = [
  'A new approved asset',
  'A new direction',
  'A deliberate exception',
  'A stronger rule',
  'A decision worth keeping',
];

function LoopBeat() {
  return (
    <div className="mt-[26vh]">
      <Statement text="And the loop *closes.*" />

      <div className="mt-16 grid grid-cols-1 items-center gap-12 md:mt-24 md:grid-cols-[auto_1fr] md:gap-20">
        {/* the loop — brand → create → output → back */}
        <motion.div {...reveal} className="relative mx-auto h-[260px] w-[260px] md:h-[300px] md:w-[300px]">
          <motion.svg
            viewBox="0 0 200 200"
            className="h-full w-full"
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 36, ease: 'linear' }}
          >
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 7"
              opacity="0.35"
            />
            {[0, 1, 2].map((i) => {
              const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
              return (
                <circle
                  key={i}
                  cx={100 + Math.cos(a) * 86}
                  cy={100 + Math.sin(a) * 86}
                  r="6"
                  fill="currentColor"
                />
              );
            })}
          </motion.svg>
          <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
            <LogoMark className="h-9 w-9 text-panel-foreground" />
            <span className="microlabel opacity-50">The brand</span>
          </span>
          {['Create', 'Learn', 'Return'].map((l, i) => {
            const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
            return (
              <span
                key={l}
                className="microlabel absolute opacity-60"
                style={{
                  left: `${50 + Math.cos(a) * 58}%`,
                  top: `${50 + Math.sin(a) * 58}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {l}
              </span>
            );
          })}
        </motion.div>

        <div>
          <motion.p {...reveal} className="max-w-xl text-base leading-relaxed text-panel-foreground/60 md:text-lg">
            Most creative tools end at export. A file leaves. A decision
            disappears. Knowledge gets lost. BrandingOS is built around a
            different idea:{' '}
            <span className="font-semibold text-panel-foreground">
              what the brand learns should become part of the brand.
            </span>
          </motion.p>
          <motion.ul {...reveal} className="mt-8 flex flex-wrap gap-2.5">
            {LEARNINGS.map((l) => (
              <li
                key={l}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-panel-foreground/70"
              >
                {l}
              </li>
            ))}
          </motion.ul>
          <motion.p
            {...reveal}
            className="font-display mt-10 text-2xl font-bold leading-snug md:text-3xl"
          >
            Output becomes <span className="serif-accent">input.</span>
            <br />
            <span className="opacity-55">
              And the brand evolves without losing itself.
            </span>
          </motion.p>
        </div>
      </div>
    </div>
  );
}

/* ── 3 · Nothing drifts by accident ─────────────────────────────── */

const DRIFTS = [
  'One new blue.',
  'One substitute font.',
  'One unofficial logo.',
  'One template adjustment.',
  'One “temporary” change that becomes permanent.',
];

const LADDER = [
  { step: 'Use it locally', scope: 'just this file' },
  { step: 'Apply it to a campaign', scope: 'a bounded world' },
  { step: 'Propose it to the system', scope: 'a decision, pending' },
  { step: 'Make it official', scope: 'part of the brand' },
];

function DriftBeat() {
  return (
    <div className="mt-[26vh]">
      <Statement text="Nothing should drift by *accident.*" />

      <div className="mt-16 grid grid-cols-1 gap-12 md:mt-24 md:grid-cols-2 md:gap-16">
        <motion.div {...reveal}>
          <span className="microlabel opacity-45">How brands actually break</span>
          <ul className="mt-6 space-y-3">
            {DRIFTS.map((d, i) => (
              <motion.li
                key={d}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.19, 1, 0.22, 1] }}
                className="text-lg text-panel-foreground/70 md:text-xl"
                style={{ marginLeft: `${i * 10}px` }}
              >
                {d}
              </motion.li>
            ))}
          </ul>
          <p className="mt-8 max-w-md text-base leading-relaxed text-panel-foreground/55">
            Brands rarely break because someone deliberately destroys them.
            They drift.
          </p>
        </motion.div>

        <motion.div {...reveal}>
          <span className="microlabel opacity-45">Deliberate change</span>
          <ol className="mt-6">
            {LADDER.map((l, i) => (
              <li
                key={l.step}
                className="flex items-center justify-between gap-4 border-t border-white/10 py-4 last:border-b"
              >
                <span className="flex items-center gap-4">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    {Array.from({ length: i + 1 }, (_, j) => (
                      <span
                        key={j}
                        className="h-1.5 w-1.5 rounded-full bg-panel-foreground"
                        style={{ opacity: 0.4 + (j / 4) * 0.6 }}
                      />
                    ))}
                  </span>
                  <span className="text-base font-semibold md:text-lg">{l.step}</span>
                </span>
                <span className="microlabel hidden opacity-40 sm:block">{l.scope}</span>
              </li>
            ))}
          </ol>
          <p className="font-display mt-10 text-2xl font-bold leading-snug md:text-3xl">
            Change should be a decision.
            <br />
            <span className="opacity-55">
              Not an <span className="serif-accent opacity-100">accident.</span>
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Connection() {
  return (
    <section
      id="connection"
      className="bg-panel text-panel-foreground"
      aria-label="The connection"
    >
      <div className="container-tight py-[18vh]">
        <ChapterHead label="06 · The connection" hint="Everything, back to one brand" />
        <div className="mt-16 md:mt-24">
          <ConnectionBeat />
          <LoopBeat />
          <DriftBeat />
        </div>
      </div>
    </section>
  );
}
