/**
 * Chapter 01 — Why (ink).
 *
 * The problem, told in four beats straight from the manifesto:
 *   · the systems ledger — everything has infrastructure except brand
 *   · a PDF can describe your brand, it can't run it
 *   · creation scaled, brand infrastructure didn't
 *   · on-brand as a default, not an approval (old loop vs new line)
 */
import { motion } from 'framer-motion';
import { ChapterHead, Statement, reveal } from './shared';

/* ── 1 · The systems ledger ─────────────────────────────────────── */

const LEDGER: { thing: string; system: string }[] = [
  { thing: 'Code', system: 'Version control' },
  { thing: 'Customers', system: 'A CRM' },
  { thing: 'Money', system: 'A ledger' },
  { thing: 'Products', system: 'Roadmaps' },
  { thing: 'Projects', system: 'Operating systems' },
];

function Ledger() {
  return (
    <div className="mt-16 md:mt-24">
      {LEDGER.map((row, i) => (
        <motion.div
          key={row.thing}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: i * 0.05, ease: [0.19, 1, 0.22, 1] }}
          className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-4 border-t border-white/10 py-5 md:py-6"
        >
          <span className="font-display text-xl font-bold md:text-3xl">
            {row.thing}
          </span>
          <span className="microlabel opacity-40">has</span>
          <span className="text-right font-mono text-sm font-semibold uppercase tracking-[0.14em] opacity-70 md:text-base">
            {row.system}
          </span>
        </motion.div>
      ))}

      {/* the row with no system */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, delay: 0.28, ease: [0.19, 1, 0.22, 1] }}
        className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-4 border-y border-white/10 py-5 md:py-6"
      >
        <span className="font-display text-xl font-bold md:text-3xl">Brand</span>
        <span className="microlabel opacity-40">is still living in</span>
        <span className="serif-accent text-right text-base leading-snug opacity-60 md:text-xl">
          folders, PDFs, and people&rsquo;s heads
          <span className="ml-1 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current align-baseline" />
        </span>
      </motion.div>

      <motion.p {...reveal} className="display-chapter mt-[14vh] text-center">
        Until <span className="serif-accent">now.</span>
      </motion.p>
    </div>
  );
}

/* ── 2 · A PDF can't run it ─────────────────────────────────────── */

const FILES = [
  'A logo folder',
  'A color palette',
  'Font files',
  'A guidelines PDF',
  'A handful of templates',
];

const SOMEONE = [
  'remember the rules.',
  'explain them.',
  'check the output.',
  'correct what drifted.',
];

function PdfBeat() {
  return (
    <div className="mt-[26vh]">
      <Statement text="A PDF can describe your brand. It can’t *run* it." />

      <div className="mt-16 grid grid-cols-1 gap-10 md:mt-24 md:grid-cols-2 md:gap-14">
        <motion.div {...reveal}>
          <span className="microlabel opacity-50">
            Traditional branding gives you files
          </span>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {FILES.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-panel-foreground/70"
              >
                <svg viewBox="0 0 10 12" className="h-3 w-2.5 opacity-50" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                  <path d="M1 1h5l3 3v7H1z" />
                </svg>
                {f}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div {...reveal}>
          <span className="microlabel opacity-50">
            Then the real work begins
          </span>
          <ul className="mt-6 space-y-3">
            {SOMEONE.map((s, i) => (
              <li key={s} className="flex items-baseline gap-3 text-base md:text-lg">
                <span className="font-mono text-xs opacity-40">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="opacity-55">Someone has to</span> {s}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-baseline gap-3 font-display text-lg font-bold md:text-xl">
            {['Again.', 'And again.', 'And again.'].map((a, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 - i * 0.32 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.35, duration: 0.6 }}
              >
                {a}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.p
        {...reveal}
        className="mt-20 max-w-3xl font-display text-2xl font-bold leading-snug md:mt-28 md:text-4xl"
      >
        The problem isn&rsquo;t that companies can&rsquo;t create.
        <br />
        <span className="opacity-55">
          It&rsquo;s that the brand doesn&rsquo;t{' '}
          <span className="serif-accent opacity-100">travel</span> with the
          creation.
        </span>
      </motion.p>
    </div>
  );
}

/* ── 3 · Creation scaled ────────────────────────────────────────── */

function ScaledBeat() {
  return (
    <div className="mt-[26vh]">
      <Statement text="Creation scaled. Brand infrastructure *didn’t.*" />

      <div className="mt-16 grid grid-cols-1 items-start gap-10 md:mt-24 md:grid-cols-[1fr_1.15fr] md:gap-14">
        <motion.div {...reveal} className="space-y-2 text-base leading-relaxed text-panel-foreground/60 md:text-lg">
          <p>AI made creation abundant.</p>
          <p>More people can create. More teams can publish.</p>
          <p>More content. More variations.</p>
          <p className="pt-4 text-panel-foreground">
            But every new tool, freelancer, employee, agency, and AI still
            starts with the same question:
          </p>
        </motion.div>

        <motion.div
          {...reveal}
          className="rounded-[18px] border border-white/12 bg-white/[0.03] p-8 md:p-10"
        >
          <span className="microlabel opacity-45">The question</span>
          <p className="font-display mt-5 text-2xl font-bold leading-snug md:text-3xl">
            &ldquo;What does this brand actually{' '}
            <span className="serif-accent">look</span> and{' '}
            <span className="serif-accent">sound</span> like?&rdquo;
          </p>
          <div className="mt-8 space-y-2.5 border-t border-white/10 pt-6 text-sm md:text-base">
            <p className="text-panel-foreground/50">
              Today, humans answer that question manually.
            </p>
            <p className="font-semibold">
              BrandingOS makes the system answer it.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── 4 · The default, not the approval ──────────────────────────── */

function Pipe({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span
      className={`inline-flex h-10 items-center rounded-full border px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] md:h-11 md:px-5 ${
        dim
          ? 'border-white/12 text-panel-foreground/40'
          : 'border-panel-foreground bg-panel-foreground text-panel'
      }`}
    >
      {label}
    </span>
  );
}

function Arrow() {
  return <span className="font-mono text-sm opacity-35">→</span>;
}

function DefaultBeat() {
  return (
    <div className="mt-[26vh]">
      <Statement text="On-brand should not be an approval. It should be the *default.*" />

      <div className="mt-16 space-y-10 md:mt-24">
        <motion.div {...reveal}>
          <span className="microlabel opacity-45">The old model</span>
          <div className="mt-5 flex flex-wrap items-center gap-2.5 opacity-80 md:gap-3">
            <Pipe label="Create" dim />
            <Arrow />
            <Pipe label="Review" dim />
            <Arrow />
            <Pipe label="Correct" dim />
            <span className="font-mono text-sm opacity-35" aria-hidden="true">
              ↺
            </span>
            <Pipe label="Review" dim />
            <Arrow />
            <Pipe label="Publish" dim />
          </div>
        </motion.div>

        <motion.div {...reveal}>
          <span className="microlabel opacity-45">With BrandingOS</span>
          <div className="mt-5 flex flex-wrap items-center gap-2.5 md:gap-3">
            <Pipe label="Brand" />
            <Arrow />
            <Pipe label="Create" />
            <Arrow />
            <Pipe label="Publish" />
          </div>
        </motion.div>

        <motion.p {...reveal} className="max-w-3xl pt-4 text-base leading-relaxed text-panel-foreground/60 md:text-lg">
          Instead of checking whether something follows the brand after it
          exists — create <em className="not-italic text-panel-foreground">from</em> the
          brand before it exists.
        </motion.p>
      </div>

      <motion.p
        {...reveal}
        className="mt-24 font-display text-2xl font-bold leading-snug md:mt-32 md:text-4xl"
      >
        Build the brand once.
        <br />
        <span className="opacity-55">
          Everything after <span className="serif-accent opacity-100">starts</span>{' '}
          from it.
        </span>
      </motion.p>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Why() {
  return (
    <section
      id="why"
      className="bg-panel text-panel-foreground"
      aria-label="Why BrandingOS"
    >
      {/* the in-core copy scrolls straight into this chapter — keep the
          gap tight so momentum carries through the seam */}
      <div className="container-tight pt-[14vh] pb-[12vh]">
        <ChapterHead label="02 · Why" hint="Everything has a system" />

        <div className="mt-16 md:mt-24">
          <Statement text="Your company has systems for *everything.*" />
        </div>

        <Ledger />
        <PdfBeat />
        <ScaledBeat />
        <DefaultBeat />
      </div>
    </section>
  );
}
