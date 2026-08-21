/**
 * 03 · How it works (white band) — three moves, three cards.
 * Each card carries a small dot-diagram: attract → expand → align.
 */
import { motion } from 'framer-motion';
import { SectionHeader } from './shared';

function GlyphAttract() {
  const inputs = [
    [14, 20], [90, 12], [20, 80], [96, 72], [54, 8],
  ];
  return (
    <svg viewBox="0 0 108 92" className="h-full w-full" aria-hidden="true">
      {inputs.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={54} y2={56} stroke="currentColor" strokeWidth="1" opacity="0.2" />
          <circle cx={x} cy={y} r="4" fill="currentColor" opacity="0.45" />
        </g>
      ))}
      <circle cx="54" cy="56" r="9" fill="currentColor" />
    </svg>
  );
}

function GlyphExpand() {
  const ring = Array.from({ length: 8 }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI / 8 + (i / 8) * Math.PI * 2;
    return [54 + Math.cos(a) * 36, 46 + Math.sin(a) * 36];
  });
  return (
    <svg viewBox="0 0 108 92" className="h-full w-full" aria-hidden="true">
      <circle cx="54" cy="46" r="36" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      {ring.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="currentColor" opacity="0.8" />
      ))}
      <circle cx="54" cy="46" r="9" fill="currentColor" />
    </svg>
  );
}

function GlyphAlign() {
  return (
    <svg viewBox="0 0 108 92" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const x = 24 + (i % 4) * 20;
        const y = 26 + Math.floor(i / 4) * 20;
        const isCore = i === 5;
        return (
          <circle key={i} cx={x} cy={y} r={isCore ? 7 : 4} fill="currentColor" opacity={isCore ? 1 : 0.4} />
        );
      })}
    </svg>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Feed the core',
    body: 'Bring whatever exists — a complete identity, a logo and nothing else, or just a name. The system reads it and structures it.',
    tag: 'Input — attract',
    glyph: <GlyphAttract />,
  },
  {
    n: '02',
    title: 'Watch it take form',
    body: 'Logos, colors, type, voice — a complete kit generated around your core. You review, refine, approve. It’s yours.',
    tag: 'Generate — expand',
    glyph: <GlyphExpand />,
  },
  {
    n: '03',
    title: 'Run everything on it',
    body: 'Cards, decks, posts, guidelines — everything you create starts from the brand, so nothing drifts.',
    tag: 'Ship — align',
    glyph: <GlyphAlign />,
  },
];

export function Steps() {
  return (
    <section
      id="how"
      className="hairline-t hairline-b bg-card text-foreground"
      aria-label="How it works"
    >
      <div className="container-tight py-28 md:py-36">
        <SectionHeader
          eyebrow="03 · How it works"
          hint="Three moves"
          title={
            <>
              From a name to a{' '}
              <span className="serif-accent">running</span> brand.
            </>
          }
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:mt-20 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.19, 1, 0.22, 1] }}
              className="flex flex-col rounded-[14px] border border-border bg-background p-7 md:p-8"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-2xl font-semibold">{s.n}</span>
                <div className="h-20 w-24 text-foreground/80">{s.glyph}</div>
              </div>
              <h3 className="font-display mt-6 text-2xl font-extrabold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                {s.body}
              </p>
              <span className="microlabel mt-6 opacity-50">{s.tag}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
