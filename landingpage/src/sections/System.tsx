/**
 * Chapter 04 — The system (paper).
 *
 * Five product beats as editorial rows on hairlines, each carrying a
 * CSS-built visual in the identity's language (no screenshots, no
 * pretending):
 *   · Brand Kit — knows what belongs
 *   · Guidelines — live with the brand
 *   · AI — stop prompting the brand
 *   · Create — where the brand already lives
 *   · Templates — brand-aware systems (fed by the Proof demo cores)
 */
import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BRANDS, type DemoBrand } from './Proof';
import { ChapterHead, reveal } from './shared';

/* ── Visual 1 · the kit that knows what belongs ─────────────────── */

const KIT_ROWS = [
  { name: 'Logos', meta: '12 approved variations' },
  { name: 'Colors', meta: 'Palette + surface roles' },
  { name: 'Typography', meta: '2 families · full scale' },
  { name: 'Stationery', meta: 'Cards · letterhead · invoice' },
  { name: 'Social', meta: 'Profiles · posts · stories' },
];

function KitVisual() {
  return (
    <div className="surface overflow-hidden shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="microlabel opacity-60">Brand Kit — current state</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] opacity-50">
            Live
          </span>
        </span>
      </div>
      <ul>
        {KIT_ROWS.map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between border-b border-border px-5 py-3"
          >
            <span className="text-sm font-semibold">{r.name}</span>
            <span className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:block">
                {r.meta}
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                <svg viewBox="0 0 10 8" className="h-2 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M1 4l2.6 2.6L9 1" />
                </svg>
              </span>
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between px-5 py-3 opacity-45">
          <span className="text-sm line-through">new-blue-final-v3.png</span>
          <span className="flex items-center gap-3">
            <span className="hidden text-xs sm:block">doesn&rsquo;t belong</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-foreground/40">
              <svg viewBox="0 0 8 8" className="h-2 w-2" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M1 1l6 6M7 1L1 7" />
              </svg>
            </span>
          </span>
        </li>
      </ul>
    </div>
  );
}

/* ── Visual 2 · living guidelines ───────────────────────────────── */

const GUIDE_SECTIONS = ['Logo', 'Color', 'Typography', 'Voice', 'Imagery'];

function GuidelinesVisual() {
  return (
    <div className="surface overflow-hidden shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="microlabel opacity-60">Guidelines</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] opacity-50">
            Always current
          </span>
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto]">
        <ul className="border-border sm:border-r">
          {GUIDE_SECTIONS.map((s, i) => (
            <li
              key={s}
              className={`flex items-center justify-between px-5 py-3 ${
                i < GUIDE_SECTIONS.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="text-sm font-semibold">{s}</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] opacity-40">
                Synced
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col justify-between gap-4 border-t border-border p-5 sm:w-[190px] sm:border-t-0">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Change the brand — the reference changes with it.
          </p>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-secondary px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.08em]">
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
              <path d="M4.5 7.5L10 2M10 2H6.5M10 2v3.5M5 2H2v8h8V7" />
            </svg>
            one link, for everyone
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Visual 3 · stop prompting the brand ────────────────────────── */

function PromptVisual() {
  return (
    <div className="flex flex-col gap-4">
      <div className="surface p-5 opacity-70">
        <span className="microlabel opacity-50">Everywhere else</span>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="line-through decoration-foreground/30">
            We&rsquo;re a skincare brand, warm but minimal, serif headlines,
            sage and terracotta palette, soft voice, never salesy, no
            emojis, our audience is…
          </span>{' '}
          <span className="text-foreground">
            and here&rsquo;s what I actually want —
          </span>
        </p>
      </div>

      <div className="surface p-5 shadow-elevated">
        <span className="microlabel opacity-50">In BrandingOS</span>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-border bg-secondary px-4 py-3">
          <span className="text-sm font-semibold">
            Spring drop announcement — three formats.
          </span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M2 6h8M7 3l3 3-3 3" />
            </svg>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-40">
            Already attached:
          </span>
          {['Voice', 'Palette', 'Type', 'Logos', 'Audience'].map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground/70"
            >
              {c} ✓
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Visual 4 · the verbs ───────────────────────────────────────── */

const STARTS = ['A prompt', 'A template', 'An existing design', 'A blank canvas', 'An idea'];
const VERBS = ['Generate', 'Explore', 'Customize', 'Edit', 'Adapt', 'Resize', 'Export'];

function CreateVisual() {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STARTS.map((s) => (
          <span
            key={s}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground/75"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="my-4 flex justify-center">
        <svg viewBox="0 0 12 20" className="h-5 w-3 text-foreground/40" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M6 1v14M1 11l5 5 5-5" />
        </svg>
      </div>
      <div className="flex flex-col">
        {VERBS.map((v, i) => (
          <motion.span
            key={v}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.19, 1, 0.22, 1] }}
            className="font-display border-t border-border py-2 text-2xl font-extrabold transition-opacity duration-300 hover:opacity-60 md:text-3xl"
          >
            {v}
            <span className="ml-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] opacity-30">
              0{i + 1}
            </span>
          </motion.span>
        ))}
        <span className="border-t border-border" />
      </div>
    </div>
  );
}

/* ── Visual 5 · brand-aware templates ───────────────────────────── */

/** The same template, once as slots, then rendered by three cores. */
function SlotFrame() {
  return (
    <div className="flex aspect-[4/5] flex-col justify-between rounded-[10px] border border-dashed border-foreground/30 p-3">
      <span className="inline-flex w-fit rounded-[4px] border border-dashed border-foreground/30 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] opacity-50">
        Logo
      </span>
      <div className="space-y-1.5">
        <span className="block w-full rounded-[4px] border border-dashed border-foreground/30 px-1.5 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.14em] opacity-50">
          Type
        </span>
        <span className="block w-3/4 rounded-[4px] border border-dashed border-foreground/30 px-1.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] opacity-50">
          Content
        </span>
      </div>
      <span className="inline-flex w-fit rounded-full border border-dashed border-foreground/30 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] opacity-50">
        Color
      </span>
    </div>
  );
}

function TemplateRender({ b }: { b: DemoBrand }) {
  return (
    <div
      className="flex aspect-[4/5] flex-col justify-between rounded-[10px] p-3"
      style={{ background: b.vars.bg, color: b.vars.text, border: `1px solid ${b.vars.line}` }}
    >
      <span className="inline-flex items-center gap-1" style={{ fontFamily: b.display }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.vars.primary }} />
        <span className="text-[10px] leading-none">{b.name}</span>
      </span>
      <div>
        <span style={{ fontFamily: b.display }} className="block text-sm leading-tight">
          {b.tagline}
        </span>
        <i className="greek mt-1.5 w-3/4" />
      </div>
      <span
        className="inline-flex w-fit rounded-full px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.16em]"
        style={{ background: b.vars.primary, color: b.vars.onPrimary }}
      >
        Shop
      </span>
    </div>
  );
}

function TemplatesVisual() {
  return (
    <div className="surface p-5 shadow-soft">
      <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-4">
        <SlotFrame />
        {BRANDS.map((b) => (
          <TemplateRender key={b.id} b={b} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-45">
        <span>One system</span>
        <span aria-hidden="true">→</span>
        <span>Many brand-correct outcomes</span>
      </div>
    </div>
  );
}

/* ── The five beats ─────────────────────────────────────────────── */

interface Beat {
  n: string;
  module: string;
  title: ReactNode;
  lines: string[];
  punch: ReactNode;
  visual: ReactNode;
}

const BEATS: Beat[] = [
  {
    n: '01',
    module: 'Brand Kit',
    title: (
      <>
        Your Brand Kit should know{' '}
        <span className="serif-accent">what belongs.</span>
      </>
    ),
    lines: [
      'Not just store files. BrandingOS gives the identity a structured home — logos, approved variations, colors, typography, stationery, social assets, business materials, digital deliverables.',
      'Everything that officially belongs to the brand.',
    ],
    punch: (
      <>
        Not a folder.{' '}
        <span className="serif-accent">The current state of the brand.</span>
      </>
    ),
    visual: <KitVisual />,
  },
  {
    n: '02',
    module: 'Guidelines',
    title: (
      <>
        Guidelines should <span className="serif-accent">live</span> with the
        brand.
      </>
    ),
    lines: [
      'Traditional guidelines begin ageing the moment they’re exported. BrandingOS turns them into a living expression of the system itself — change the brand, the reference changes with it.',
      'Share one place with your team, designers, partners, or clients. No outdated decks. No conflicting PDFs. No archaeology.',
    ],
    punch: (
      <>
        The guideline is no longer the source.{' '}
        <span className="serif-accent">The brand is.</span>
      </>
    ),
    visual: <GuidelinesVisual />,
  },
  {
    n: '03',
    module: 'AI',
    title: (
      <>
        AI shouldn&rsquo;t need{' '}
        <span className="serif-accent">another brand brief.</span>
      </>
    ),
    lines: [
      'Most AI starts from zero — so you explain yourself again. Who you are. How you sound. Which colors. What not to do. Then you repeat it tomorrow.',
      'BrandingOS changes the starting point: the brand context already exists, so your prompt can focus on what you want to make — not who you are.',
    ],
    punch: (
      <>
        Stop prompting the brand.{' '}
        <span className="serif-accent">Start prompting the idea.</span>
      </>
    ),
    visual: <PromptVisual />,
  },
  {
    n: '04',
    module: 'Create',
    title: (
      <>
        Create where the brand{' '}
        <span className="serif-accent">already lives.</span>
      </>
    ),
    lines: [
      'Start with a prompt, a template, an existing design, a blank canvas, an idea — then move from intention to output without leaving the brand behind.',
    ],
    punch: (
      <>
        The tools change. <span className="serif-accent">The brand doesn&rsquo;t.</span>
      </>
    ),
    visual: <CreateVisual />,
  },
  {
    n: '05',
    module: 'Templates',
    title: (
      <>
        Templates shouldn&rsquo;t be branded files. They should be{' '}
        <span className="serif-accent">brand-aware systems.</span>
      </>
    ),
    lines: [
      'A static template remembers one design. A brand-aware template understands which parts of that design belong to the identity using it — logo, color, typography, imagery, content, structure.',
      'Switch the brand — the template gets a new context.',
    ],
    punch: (
      <>
        One reusable system.{' '}
        <span className="serif-accent">Many brand-correct outcomes.</span>
      </>
    ),
    visual: <TemplatesVisual />,
  },
];

/* ── Section ────────────────────────────────────────────────────── */

export function System() {
  return (
    <section id="inside" className="bg-background text-foreground" aria-label="The system">
      <div className="container-tight pb-32 pt-28 md:pb-44 md:pt-36">
        <ChapterHead label="05 · The system" hint="Five beats — one brand" />

        <motion.h2 {...reveal} className="h-section mt-10 max-w-3xl">
          Everything speaks the same{' '}
          <span className="serif-accent">language.</span>
        </motion.h2>

        <div className="mt-20 md:mt-28">
          {BEATS.map((b, i) => (
            <motion.div
              key={b.n}
              {...reveal}
              className="hairline-t grid grid-cols-1 items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24"
            >
              <div className={i % 2 === 1 ? 'md:order-2' : undefined}>
                <span className="microlabel label-rule opacity-60">
                  {b.n} · {b.module}
                </span>
                <h3 className="font-display mt-6 text-3xl font-extrabold leading-[1.08] md:text-4xl">
                  {b.title}
                </h3>
                {b.lines.map((l, j) => (
                  <p
                    key={j}
                    className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground"
                  >
                    {l}
                  </p>
                ))}
                <p className="font-display mt-7 text-lg font-bold md:text-xl">
                  {b.punch}
                </p>
              </div>
              <div className={i % 2 === 1 ? 'md:order-1' : undefined}>
                {b.visual}
              </div>
            </motion.div>
          ))}
          <div className="hairline-t" />
        </div>
      </div>
    </section>
  );
}
