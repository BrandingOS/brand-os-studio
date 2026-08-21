/**
 * 04 · See it switch (subtle band) — the live re-brand demo, compact:
 * controls and copy on the left, a 2×2 wall of four deliverables on
 * the right. All artifact color flows from --b-* variables on the
 * wall wrapper; `.proof-wall` (index.css) supplies the glide.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SectionHeader, reveal } from './shared';

interface Core {
  id: string;
  name: string;
  kind: string;
  tagline: string;
  display: string;
  vars: Record<'bg' | 'surface' | 'text' | 'primary' | 'onPrimary' | 'line', string>;
}

const CORES: Core[] = [
  {
    id: 'nama',
    name: 'Náma',
    kind: 'Botanical skincare',
    tagline: 'Skin, simplified.',
    display: "'Fraunces', Georgia, serif",
    vars: {
      bg: '#F1EDE2', surface: '#FBF9F3', text: '#2C2A20',
      primary: '#5F6F51', onPrimary: '#F5F3EA', line: 'rgba(44,42,32,0.16)',
    },
  },
  {
    id: 'kilo',
    name: 'KILO',
    kind: 'Strength studio',
    tagline: 'Train loud.',
    display: "'Unbounded', system-ui, sans-serif",
    vars: {
      bg: '#101013', surface: '#1A1A1F', text: '#F2F2EE',
      primary: '#D7FF3F', onPrimary: '#14140A', line: 'rgba(242,242,238,0.16)',
    },
  },
  {
    id: 'marra',
    name: 'Marra',
    kind: 'Specialty coffee',
    tagline: 'Slow mornings.',
    display: "'Playfair Display', Georgia, serif",
    vars: {
      bg: '#F3E7D8', surface: '#FBF4EA', text: '#33241A',
      primary: '#7C3E24', onPrimary: '#F8EFE4', line: 'rgba(51,36,26,0.18)',
    },
  },
];

/* ── Four artifacts ─────────────────────────────────────────────── */

function Mark({ c, color, dot }: { c: Core; color?: string; dot?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: color ?? 'var(--b-text)' }}>
      {/* the dot must contrast its ground — primary-on-primary vanishes */}
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot ?? 'var(--b-primary)' }} />
      <span style={{ fontFamily: 'var(--b-display)', fontSize: 11 }} className="leading-none">
        {c.name}
      </span>
    </span>
  );
}

function ArtPost({ c }: { c: Core }) {
  return (
    <div
      className="flex aspect-square flex-col justify-between p-4"
      style={{ background: 'var(--b-primary)', color: 'var(--b-onPrimary)' }}
    >
      <Mark c={c} color="var(--b-onPrimary)" dot="var(--b-onPrimary)" />
      <span style={{ fontFamily: 'var(--b-display)' }} className="text-xl leading-tight">
        {c.tagline}
      </span>
      <span className="font-mono text-[8px] font-bold tracking-[0.2em] opacity-70">
        @{c.id.toUpperCase()}
      </span>
    </div>
  );
}

function ArtCard({ c }: { c: Core }) {
  return (
    <div
      className="flex aspect-square flex-col justify-between p-4"
      style={{ background: 'var(--b-surface)', color: 'var(--b-text)', border: '1px solid var(--b-line)' }}
    >
      <Mark c={c} />
      <div className="space-y-1.5">
        <i className="greek w-2/3" />
        <span className="block font-mono text-[8px] font-bold tracking-[0.2em]" style={{ color: 'var(--b-primary)' }}>
          FOUNDER — CEO
        </span>
      </div>
      <div className="flex items-center justify-between">
        <i className="greek w-14" />
        <span className="h-2 w-2 rounded-full" style={{ background: 'var(--b-primary)' }} />
      </div>
    </div>
  );
}

function ArtSite({ c }: { c: Core }) {
  return (
    <div
      className="flex aspect-square flex-col"
      style={{ background: 'var(--b-surface)', color: 'var(--b-text)', border: '1px solid var(--b-line)' }}
    >
      <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--b-line)' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1 w-1 rounded-full" style={{ background: 'var(--b-text)', opacity: 0.25 }} />
        ))}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 px-4">
        <Mark c={c} />
        <span style={{ fontFamily: 'var(--b-display)' }} className="text-lg leading-tight">
          {c.tagline}
        </span>
        <i className="greek w-3/4" />
        <span
          className="mt-1 inline-flex h-5 w-fit items-center rounded-full px-2.5 font-mono text-[7px] font-bold tracking-[0.18em]"
          style={{ background: 'var(--b-primary)', color: 'var(--b-onPrimary)' }}
        >
          SHOP
        </span>
      </div>
    </div>
  );
}

function ArtSlide({ c }: { c: Core }) {
  return (
    <div
      className="flex aspect-square flex-col justify-between p-4"
      style={{ background: 'var(--b-text)', color: 'var(--b-bg, #fff)' }}
    >
      <span className="font-mono text-[8px] font-bold tracking-[0.22em]" style={{ color: 'var(--b-primary)' }}>
        BRAND SYSTEM — 2026
      </span>
      <span style={{ fontFamily: 'var(--b-display)' }} className="text-lg leading-tight">
        The {c.name} system.
      </span>
      <span className="font-mono text-[8px] font-bold tracking-[0.2em] opacity-60">01 / 12</span>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Switcher() {
  const [idx, setIdx] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();
  const c = CORES[idx];

  useEffect(() => {
    if (interacted || !inView || reduced) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % CORES.length), 4200);
    return () => clearInterval(id);
  }, [interacted, inView, reduced]);

  const wallVars = {
    '--b-bg': c.vars.bg,
    '--b-surface': c.vars.surface,
    '--b-text': c.vars.text,
    '--b-primary': c.vars.primary,
    '--b-onPrimary': c.vars.onPrimary,
    '--b-line': c.vars.line,
    '--b-display': c.display,
  } as CSSProperties;

  return (
    <section id="demo" className="bg-secondary text-foreground" aria-label="Live demo">
      <div className="container-tight py-28 md:py-36">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          {/* Controls + copy */}
          <div>
            <SectionHeader
              eyebrow="04 · Live"
              title={
                <>
                  Pick a core.
                  <br />
                  Watch it <span className="serif-accent">re-brand.</span>
                </>
              }
              sub="One change at the source reaches every deliverable. Four live artifacts, three demo cores — try it."
            />

            <motion.div
              {...reveal}
              onViewportEnter={() => setInView(true)}
              onViewportLeave={() => setInView(false)}
              className="mt-10 flex flex-col gap-2.5"
            >
              {CORES.map((core, i) => (
                <button
                  key={core.id}
                  type="button"
                  onClick={() => {
                    setInteracted(true);
                    setIdx(i);
                  }}
                  aria-pressed={i === idx}
                  className={`flex items-center justify-between rounded-[12px] border px-5 py-3.5 text-left transition-all duration-300 ease-out-expo ${
                    i === idx
                      ? 'border-foreground bg-foreground text-background shadow-elevated'
                      : 'border-border bg-card hover:border-foreground/40'
                  }`}
                >
                  <span className="flex items-baseline gap-3">
                    <span style={{ fontFamily: core.display }} className="text-base">
                      {core.name}
                    </span>
                    <span className={`text-xs ${i === idx ? 'opacity-60' : 'text-muted-foreground'}`}>
                      {core.kind}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {[core.vars.primary, core.vars.bg].map((col, j) => (
                      <span
                        key={j}
                        className="h-3 w-3 rounded-full"
                        style={{ background: col, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}
                      />
                    ))}
                  </span>
                </button>
              ))}
              <span className="microlabel mt-3 opacity-50">
                Core: {c.name} — {c.vars.primary}
              </span>
            </motion.div>
          </div>

          {/* The wall — 2×2, one core */}
          <motion.div
            {...reveal}
            className="proof-wall grid grid-cols-2 gap-3 md:gap-4"
            style={wallVars}
          >
            {[
              { id: 'B01', name: 'Post', el: <ArtPost c={c} /> },
              { id: 'B02', name: 'Business card', el: <ArtCard c={c} /> },
              { id: 'B03', name: 'Website', el: <ArtSite c={c} /> },
              { id: 'B04', name: 'Deck', el: <ArtSlide c={c} /> },
            ].map((a) => (
              <figure
                key={a.id}
                className="overflow-hidden rounded-[14px] border border-border bg-card p-3 shadow-soft"
              >
                {a.el}
                <figcaption className="mt-2.5 px-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] opacity-50">
                  {a.id} · {a.name}
                </figcaption>
              </figure>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
