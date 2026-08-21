/**
 * 02 · What's inside (paper) — the six modules as a bento grid.
 * Every card is self-contained: name, promise, and its own miniature
 * visual drawn in the identity's language (dots, hairlines, greeked
 * copy). No screenshots here — the product section owns those.
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SectionHeader } from './shared';

const cardReveal = (i: number) => ({
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' } as const,
  transition: { duration: 0.8, delay: (i % 3) * 0.08, ease: [0.19, 1, 0.22, 1] as const },
});

/* ── Miniature visuals ──────────────────────────────────────────── */

function MiniKit() {
  const rows = [
    ['Logos', '12 variations'],
    ['Colors', 'palette + roles'],
    ['Typography', '2 families'],
    ['Stationery', 'cards · letterhead'],
  ];
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-secondary">
      {rows.map(([name, meta], i) => (
        <div
          key={name}
          className={`flex items-center justify-between px-4 py-2.5 ${
            i > 0 ? 'border-t border-border' : ''
          }`}
        >
          <span className="text-[13px] font-semibold">{name}</span>
          <span className="flex items-center gap-2.5">
            <span className="hidden text-[11px] text-muted-foreground sm:block">{meta}</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
              <svg viewBox="0 0 10 8" className="h-1.5 w-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M1 4l2.6 2.6L9 1" />
              </svg>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniCanvas() {
  return (
    <div className="flex gap-2.5">
      {/* tool rail */}
      <div className="flex flex-col items-center gap-2 rounded-[8px] border border-border bg-secondary px-2 py-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-2 w-2 rounded-full bg-foreground ${i === 0 ? '' : 'opacity-25'}`} />
        ))}
      </div>
      {/* artboard */}
      <div className="relative flex-1 rounded-[8px] border border-border bg-card p-3">
        <div className="flex h-full flex-col justify-between rounded-[6px] border border-dashed border-foreground/25 p-3">
          <span className="h-2 w-2 rounded-full bg-foreground" />
          <div className="space-y-1.5">
            <i className="greek w-3/4" />
            <i className="greek w-1/2" />
          </div>
          <span className="inline-flex h-4 w-12 rounded-full bg-foreground" />
        </div>
        <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border border-border bg-card" />
      </div>
      {/* brand panel */}
      <div className="flex flex-col justify-between rounded-[8px] border border-border bg-secondary px-2.5 py-3">
        {['#111', '#888', '#ddd'].map((c) => (
          <span key={c} className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: c }} />
        ))}
        <span className="font-mono text-[8px] font-bold opacity-45">Aa</span>
      </div>
    </div>
  );
}

function MiniGuidelines() {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-secondary">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-semibold">Guidelines</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] opacity-50">Live</span>
        </span>
      </div>
      {['Logo', 'Color', 'Voice'].map((s) => (
        <div key={s} className="flex items-center justify-between border-b border-border px-4 py-2 last:border-b-0">
          <span className="text-[12px]">{s}</span>
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] opacity-40">Synced</span>
        </div>
      ))}
    </div>
  );
}

/** Three demo palettes — enough to say "brand-aware", tiny on purpose. */
const SWATCH_SETS = [
  { bg: '#F1EDE2', fg: '#2C2A20', dot: '#5F6F51', font: "'Fraunces', Georgia, serif" },
  { bg: '#101013', fg: '#F2F2EE', dot: '#D7FF3F', font: "'Unbounded', system-ui, sans-serif" },
  { bg: '#F3E7D8', fg: '#33241A', dot: '#7C3E24', font: "'Playfair Display', Georgia, serif" },
];

function MiniTemplates() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SWATCH_SETS.map((s, i) => (
        <div
          key={i}
          className="flex aspect-[4/5] flex-col justify-between rounded-[8px] p-2.5"
          style={{ background: s.bg, color: s.fg, border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
          <div className="space-y-1">
            <span style={{ fontFamily: s.font }} className="block text-[11px] leading-tight">
              Aa
            </span>
            <i className="greek w-full" />
          </div>
          <span className="h-3 w-8 rounded-full" style={{ background: s.dot }} />
        </div>
      ))}
    </div>
  );
}

function MiniPrompt() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-card py-2 pl-4 pr-2 shadow-soft">
        <span className="truncate text-[13px] font-medium">
          Spring drop announcement — three formats
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M2 6h8M7 3l3 3-3 3" />
          </svg>
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {['Voice', 'Palette', 'Type', 'Logos'].map((c) => (
          <span key={c} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold text-foreground/60">
            {c} ✓
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniExport() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {['SVG', 'PNG', 'PDF', 'ZIP', 'Guides', 'Fonts'].map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-secondary px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.08em]"
        >
          <svg viewBox="0 0 10 12" className="h-2.5 w-2 opacity-50" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <path d="M1 1h5l3 3v7H1z" />
          </svg>
          {f}
        </span>
      ))}
    </div>
  );
}

/* ── The grid ───────────────────────────────────────────────────── */

interface Cell {
  name: string;
  promise: string;
  visual: ReactNode;
  span?: string;
}

const CELLS: Cell[] = [
  {
    name: 'Brand Kit',
    promise: 'The current state of the brand — everything that officially belongs, structured and approved.',
    visual: <MiniKit />,
    span: 'lg:col-span-2',
  },
  {
    name: 'Guidelines',
    promise: 'Living rules that change when the brand does. One link, always current.',
    visual: <MiniGuidelines />,
  },
  {
    name: 'Design Studio',
    promise: 'A canvas where every element already speaks your system.',
    visual: <MiniCanvas />,
  },
  {
    name: 'Templates',
    promise: 'Brand-aware, not branded — switch the brand and the template follows.',
    visual: <MiniTemplates />,
  },
  {
    name: 'Export',
    promise: 'Real files, yours to take — the whole system, portable.',
    visual: <MiniExport />,
  },
  {
    name: 'AI, with context',
    promise: 'The brand brief is already attached. You prompt the idea — voice, palette, type and logos come standard.',
    visual: <MiniPrompt />,
    span: 'lg:col-span-3 sm:col-span-2',
  },
];

export function Features() {
  return (
    <section id="features" className="bg-background text-foreground" aria-label="What's inside">
      <div className="container-tight py-28 md:py-36">
        <SectionHeader
          eyebrow="02 · What's inside"
          hint="Six modules — one core"
          title={
            <>
              Everything your brand needs.
              <br />
              In <span className="serif-accent">one system.</span>
            </>
          }
        />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-20 lg:grid-cols-3">
          {CELLS.map((c, i) => (
            <motion.div
              key={c.name}
              {...cardReveal(i)}
              className={`card-soft flex flex-col justify-between gap-6 p-6 md:p-7 ${c.span ?? ''}`}
            >
              <div>
                <h3 className="font-display text-xl font-extrabold md:text-2xl">{c.name}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {c.promise}
                </p>
              </div>
              <div>{c.visual}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
