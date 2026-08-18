/**
 * Chapter 04 — proof (paper). "The only colour here is yours."
 *
 * The page's identity owns no colour — so this section is where colour
 * finally appears, and every drop of it belongs to a brand core. Three
 * demo cores; a wall of nine live artifacts (A01–A09, nine — like the
 * nodes) built purely from CSS custom properties. Switching the core
 * swaps the variables and the whole wall glides into the new identity:
 * the product's promise, performed instead of claimed.
 *
 * Artifacts sit on neutral white "plots" like a spec sheet — the plots
 * never take colour, only the work does.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.9, ease: [0.19, 1, 0.22, 1] as const },
};

/* ── Demo brand cores ───────────────────────────────────────────── */

export interface DemoBrand {
  id: string;
  name: string;
  kind: string;
  tagline: string;
  display: string; // display font stack
  vars: {
    bg: string;
    surface: string;
    text: string;
    primary: string;
    onPrimary: string;
    accent: string;
    onAccent: string;
    line: string;
  };
}

export const BRANDS: DemoBrand[] = [
  {
    id: 'nama',
    name: 'Náma',
    kind: 'Botanical skincare',
    tagline: 'Skin, simplified.',
    display: "'Fraunces', Georgia, serif",
    vars: {
      bg: '#F1EDE2',
      surface: '#FBF9F3',
      text: '#2C2A20',
      primary: '#5F6F51',
      onPrimary: '#F5F3EA',
      accent: '#C46B45',
      onAccent: '#FFF6F0',
      line: 'rgba(44, 42, 32, 0.16)',
    },
  },
  {
    id: 'kilo',
    name: 'KILO',
    kind: 'Strength studio',
    tagline: 'Train loud.',
    display: "'Unbounded', system-ui, sans-serif",
    vars: {
      bg: '#101013',
      surface: '#1A1A1F',
      text: '#F2F2EE',
      primary: '#D7FF3F',
      onPrimary: '#14140A',
      accent: '#26262C',
      onAccent: '#F2F2EE',
      line: 'rgba(242, 242, 238, 0.16)',
    },
  },
  {
    id: 'marra',
    name: 'Marra',
    kind: 'Specialty coffee',
    tagline: 'Slow mornings.',
    display: "'Playfair Display', Georgia, serif",
    vars: {
      bg: '#F3E7D8',
      surface: '#FBF4EA',
      text: '#33241A',
      primary: '#7C3E24',
      onPrimary: '#F8EFE4',
      accent: '#35573C',
      onAccent: '#EFF5EE',
      line: 'rgba(51, 36, 26, 0.18)',
    },
  },
];

/* ── Shared artifact atoms ──────────────────────────────────────── */

function Logo({
  b,
  color = 'var(--b-text)',
  size = 11,
}: {
  b: DemoBrand;
  color?: string;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color }}>
      <span
        className="rounded-full"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          background: 'var(--b-primary)',
        }}
      />
      <span
        style={{ fontFamily: 'var(--b-display)', fontSize: size }}
        className="leading-none"
      >
        {b.name}
      </span>
    </span>
  );
}

function Plot({
  id,
  name,
  spec,
  className,
  children,
}: {
  id: string;
  name: string;
  spec: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure
      className={`relative flex items-center justify-center overflow-hidden rounded-[14px] border border-border bg-card p-4 pb-9 shadow-soft md:p-5 md:pb-10 ${className ?? ''}`}
    >
      {children}
      <figcaption className="absolute bottom-2.5 left-3 font-mono text-[9px] font-bold uppercase tracking-[0.18em] opacity-50 md:left-4">
        {id} · {name} — {spec}
      </figcaption>
    </figure>
  );
}

/* ── The nine artifacts ─────────────────────────────────────────── */

function StoryTile({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex h-full max-h-full flex-col items-center justify-between p-4"
      style={{
        aspectRatio: '9/16',
        background: 'var(--b-accent)',
        color: 'var(--b-onAccent)',
      }}
    >
      <Logo b={b} color="var(--b-onAccent)" size={10} />
      <span
        style={{ fontFamily: 'var(--b-display)' }}
        className="text-2xl leading-tight [writing-mode:vertical-rl]"
      >
        {b.tagline}
      </span>
      <span
        className="rounded-full border px-3 py-1 font-mono text-[8px] font-bold tracking-[0.2em]"
        style={{ borderColor: 'var(--b-onAccent)' }}
      >
        MORE
      </span>
    </div>
  );
}

function WebsiteHero({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex h-full max-w-full flex-col"
      style={{
        aspectRatio: '16/10',
        background: 'var(--b-surface)',
        border: '1px solid var(--b-line)',
        color: 'var(--b-text)',
      }}
    >
      {/* browser chrome */}
      <div
        className="flex items-center gap-1 px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--b-line)' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--b-text)', opacity: 0.25 }}
          />
        ))}
      </div>
      {/* nav */}
      <div className="flex items-center justify-between px-4 pt-3">
        <Logo b={b} size={11} />
        <div className="flex items-center gap-3">
          <i className="greek w-6" />
          <i className="greek w-6" />
          <span
            className="h-4 w-12 rounded-full"
            style={{ background: 'var(--b-primary)' }}
          />
        </div>
      </div>
      {/* hero */}
      <div className="flex flex-1 flex-col items-start justify-center gap-2.5 px-4">
        <span
          style={{ fontFamily: 'var(--b-display)' }}
          className="text-[26px] leading-none"
        >
          {b.tagline}
        </span>
        <i className="greek w-36" />
        <i className="greek w-24" />
        <span
          className="mt-1 flex h-6 items-center rounded-full px-3 font-mono text-[8px] font-bold tracking-[0.18em]"
          style={{ background: 'var(--b-primary)', color: 'var(--b-onPrimary)' }}
        >
          SHOP
        </span>
      </div>
    </div>
  );
}

function BusinessCard({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex h-full max-w-full flex-col justify-between p-3.5"
      style={{
        aspectRatio: '85/55',
        background: 'var(--b-surface)',
        border: '1px solid var(--b-line)',
        color: 'var(--b-text)',
      }}
    >
      <Logo b={b} size={12} />
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <i className="greek w-20" />
          <span
            className="font-mono text-[8px] font-bold tracking-[0.2em]"
            style={{ color: 'var(--b-primary)' }}
          >
            FOUNDER — CEO
          </span>
        </div>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--b-accent)' }}
        />
      </div>
    </div>
  );
}

function AppIcon({ b }: { b: DemoBrand }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className="flex h-[88px] w-[88px] items-center justify-center rounded-[22px]"
        style={{ background: 'var(--b-primary)', color: 'var(--b-onPrimary)' }}
      >
        <span style={{ fontFamily: 'var(--b-display)' }} className="text-4xl">
          {b.name.charAt(0)}
        </span>
      </div>
      <i className="greek w-10" style={{ color: 'var(--b-text, currentColor)' }} />
    </div>
  );
}

function Letterhead({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex h-full max-h-full max-w-full flex-col p-4"
      style={{
        aspectRatio: '210/297',
        background: 'var(--b-surface)',
        border: '1px solid var(--b-line)',
        color: 'var(--b-text)',
      }}
    >
      <div className="flex items-start justify-between">
        <Logo b={b} size={11} />
        <span
          className="text-right font-mono text-[7px] font-bold leading-[1.6] tracking-[0.14em] opacity-60"
        >
          NO 04 — FORM
          <br />
          BW-01 / 26
        </span>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <i className="greek w-24" style={{ opacity: 0.32 }} />
        <i className="greek w-full" />
        <i className="greek w-full" />
        <i className="greek w-4/5" />
        <i className="greek w-full" />
        <i className="greek w-3/5" />
      </div>
      <div
        className="mt-auto flex items-center justify-between pt-2"
        style={{ borderTop: '1px solid var(--b-line)' }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--b-primary)' }}
        />
        <i className="greek w-14" />
      </div>
    </div>
  );
}

function DeckSlide({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex h-full max-w-full flex-col justify-between p-4"
      style={{
        aspectRatio: '16/9',
        background: 'var(--b-text)',
        color: 'var(--b-bg)',
      }}
    >
      <span
        className="font-mono text-[8px] font-bold tracking-[0.22em]"
        style={{ color: 'var(--b-primary)' }}
      >
        BRAND SYSTEM — 2026
      </span>
      <span
        style={{ fontFamily: 'var(--b-display)' }}
        className="text-[22px] leading-tight"
      >
        The {b.name} system.
      </span>
      <div className="flex items-center justify-between font-mono text-[8px] font-bold tracking-[0.2em] opacity-60">
        <span>{b.name.toUpperCase()}</span>
        <span>01 / 12</span>
      </div>
    </div>
  );
}

function BadgeTag({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex h-full max-h-full max-w-full flex-col items-center p-3.5"
      style={{
        aspectRatio: '10/14',
        background: 'var(--b-surface)',
        border: '1px solid var(--b-line)',
        color: 'var(--b-text)',
      }}
    >
      <span
        className="h-2 w-6 rounded-full"
        style={{ background: 'var(--b-line)' }}
      />
      <div className="my-auto flex flex-col items-center gap-2.5">
        <Logo b={b} size={12} />
        <i className="greek w-16" />
        <span
          className="font-mono text-[8px] font-bold tracking-[0.2em]"
          style={{ color: 'var(--b-primary)' }}
        >
          STAFF — 001
        </span>
      </div>
      <span
        className="-mx-3.5 -mb-3.5 h-2 w-[calc(100%+28px)] self-stretch"
        style={{ background: 'var(--b-accent)' }}
      />
    </div>
  );
}

function EmailSig({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex max-h-full w-full max-w-[420px] items-center gap-4 p-4"
      style={{
        background: 'var(--b-surface)',
        border: '1px solid var(--b-line)',
        color: 'var(--b-text)',
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
        style={{
          background: 'var(--b-primary)',
          color: 'var(--b-onPrimary)',
          fontFamily: 'var(--b-display)',
        }}
      >
        {b.name.charAt(0)}
      </span>
      <div className="flex flex-col gap-1.5">
        <i className="greek w-24" />
        <span
          className="font-mono text-[8px] font-bold tracking-[0.2em]"
          style={{ color: 'var(--b-primary)' }}
        >
          {b.kind.toUpperCase()}
        </span>
      </div>
      <span
        className="ml-auto h-8 w-px"
        style={{ background: 'var(--b-line)' }}
      />
      <Logo b={b} size={10} />
    </div>
  );
}

function SocialPost({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex aspect-square h-full max-w-full flex-col justify-between p-3.5"
      style={{ background: 'var(--b-primary)', color: 'var(--b-onPrimary)' }}
    >
      <Logo b={b} color="var(--b-onPrimary)" size={10} />
      <span
        style={{ fontFamily: 'var(--b-display)' }}
        className="text-xl leading-tight"
      >
        {b.tagline}
      </span>
      <span className="font-mono text-[8px] font-bold tracking-[0.2em] opacity-70">
        @{b.id.toUpperCase()} — 01
      </span>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Proof() {
  const [idx, setIdx] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();

  const b = BRANDS[idx];

  // Auto-rotate the core until the visitor takes the wheel.
  useEffect(() => {
    if (interacted || !inView || reduced) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % BRANDS.length);
    }, 4200);
    return () => clearInterval(id);
  }, [interacted, inView, reduced]);

  const pick = (i: number) => {
    setInteracted(true);
    setIdx(i);
  };

  const wallVars = {
    '--b-bg': b.vars.bg,
    '--b-surface': b.vars.surface,
    '--b-text': b.vars.text,
    '--b-primary': b.vars.primary,
    '--b-onPrimary': b.vars.onPrimary,
    '--b-accent': b.vars.accent,
    '--b-onAccent': b.vars.onAccent,
    '--b-line': b.vars.line,
    '--b-display': b.display,
  } as CSSProperties;

  return (
    <section id="proof" className="bg-background text-foreground" aria-label="Proof">
      <div className="container-tight pb-28 pt-28 md:pb-40 md:pt-36">
        <motion.div {...reveal} className="microlabel flex items-center justify-between">
          <span className="label-rule opacity-70">04 · One change</span>
          <span className="hidden opacity-45 sm:block">Live — switch the core</span>
        </motion.div>

        <motion.h2 {...reveal} className="h-section mt-10 max-w-3xl">
          One change.
          <br />
          Everywhere it <span className="serif-accent">matters.</span>
        </motion.h2>

        <motion.p
          {...reveal}
          className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          Switch a core — watch nine live deliverables re-form.
        </motion.p>

        {/* Core switcher */}
        <motion.div
          {...reveal}
          onViewportEnter={() => setInView(true)}
          onViewportLeave={() => setInView(false)}
          className="mt-12 flex flex-wrap items-center gap-3"
        >
          {BRANDS.map((brand, i) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === idx}
              className={`flex h-11 items-center gap-3 rounded-full border px-5 transition-all duration-300 ease-out-expo ${
                i === idx
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card hover:border-foreground/40'
              }`}
            >
              <span style={{ fontFamily: brand.display }} className="text-sm">
                {brand.name}
              </span>
              <span className="flex items-center gap-1">
                {[brand.vars.primary, brand.vars.accent, brand.vars.bg].map(
                  (c, j) => (
                    <span
                      key={j}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: c,
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                      }}
                    />
                  ),
                )}
              </span>
            </button>
          ))}

          <span className="microlabel ml-2 hidden opacity-50 lg:block">
            Core: {b.name} — {b.vars.primary}
          </span>
        </motion.div>

        {/* The wall — nine artifacts, one core */}
        <motion.div
          {...reveal}
          className="proof-wall mt-8 grid grid-flow-dense grid-cols-2 gap-3 [grid-auto-rows:150px] md:gap-4 md:[grid-auto-rows:168px] lg:grid-cols-4"
          style={wallVars}
        >
          <Plot id="A01" name="Story" spec="1080×1920" className="row-span-2">
            <StoryTile b={b} />
          </Plot>
          <Plot id="A02" name="Website" spec="1440×900" className="col-span-2 row-span-2">
            <WebsiteHero b={b} />
          </Plot>
          <Plot id="A03" name="Business card" spec="85×55">
            <BusinessCard b={b} />
          </Plot>
          <Plot id="A04" name="App icon" spec="1024">
            <AppIcon b={b} />
          </Plot>
          <Plot id="A05" name="Letterhead" spec="A4" className="row-span-2">
            <Letterhead b={b} />
          </Plot>
          <Plot id="A06" name="Deck" spec="16:9" className="col-span-2">
            <DeckSlide b={b} />
          </Plot>
          <Plot id="A07" name="Badge" spec="100×140">
            <BadgeTag b={b} />
          </Plot>
          <Plot id="A08" name="Email signature" spec="600×140" className="col-span-2">
            <EmailSig b={b} />
          </Plot>
          <Plot id="A09" name="Post" spec="1080×1080">
            <SocialPost b={b} />
          </Plot>
        </motion.div>

        <motion.p
          {...reveal}
          className="mt-16 text-center font-display text-2xl font-bold leading-snug md:mt-24 md:text-4xl"
        >
          There is one brand.
          <br />
          <span className="text-muted-foreground">
            Everything else is a{' '}
            <span className="serif-accent text-foreground">view</span> of it.
          </span>
        </motion.p>
      </div>
    </section>
  );
}
