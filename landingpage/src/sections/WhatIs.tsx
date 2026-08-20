/**
 * Chapter 01 — What BrandingOS is (ink).
 *
 * The argument is performed, not written. A rhythmic ledger sets up the
 * gap; then one pinned scene does the work: the brand-as-folder — nine
 * scattered dots buried under file chips — assembles, on scroll, into
 * the mark with its four connections (what it means / looks like /
 * belongs to it / how it's created). Chaos → System, the identity's
 * own signature, as the product explanation.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'framer-motion';
import { ChapterHead, reveal } from './shared';
import { CORE_DOT, DOT_R, LogoMark, OUTER_DOTS } from '@/components/brand/LogoMark';

/* ── test-1 (owner's custom scatter from the lab builder) ─────────
   Exact positions / sizes / opacities as dragged in the lab; index 8
   is the core's scatter seat. Style: Gather & Bloom — staggered
   suction condenses the mess into the core, then the mark bursts out. */

const CX = CORE_DOT.x;
const CY = CORE_DOT.y;
const RD = DOT_R;
const GEO = OUTER_DOTS.map(({ x, y }) => ({ x, y, a: Math.atan2(y - CY, x - CX) }));
const RING_R = Math.hypot(GEO[0].x - CX, GEO[0].y - CY);
const RING = [...GEO.keys()].sort((i, j) => GEO[i].a - GEO[j].a);
const ORD: number[] = [];
RING.forEach((di, k) => {
  ORD[di] = k;
});

const SCATTER = [
  { x: -31.1, y: 57.9, r: 6.5, o: 0.85 },
  { x: -22, y: 106.1, r: 7.34, o: 0.75 },
  { x: -13.4, y: -4.3, r: 6, o: 0.4 },
  { x: 124.5, y: -2.3, r: 8.7, o: 0.48 },
  { x: 140.3, y: 39.9, r: 6.5, o: 0.76 },
  { x: 92.2, y: 100.5, r: 6.88, o: 0.48 },
  { x: 26.7, y: 75.5, r: 6.87, o: 0.5 },
  { x: 86.6, y: 32.1, r: 5, o: 0.65 },
  { x: 56.7, y: 56.6, r: 4, o: 0.94 },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const stag = (p: number, i: number, n: number, w: number) => {
  const start = n > 1 ? (i * (1 - w)) / (n - 1) : 0;
  return clamp01((p - start) / w);
};
const inQuad = (t: number) => t * t;
const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const outBackHard = (t: number) => {
  const c = 2.6;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/* ── The folder's contents (phase A chips) ──────────────────────── */

/* offsets are PIXELS from the mark's centre (percentages would
   resolve against the chip's own box and pile everything up) */
/* Chip seats come from the owner's test-2 custom too — dragged in the
   lab builder alongside the dots. Lab stores them in viewBox units;
   here they're converted to px offsets from the mark centre at the md
   render scale (280/113.01). Rotations are the lab's, verbatim. */
const CHIPS: { label: string; x: number; y: number; r: number; soft?: boolean }[] = [
  { label: 'Untitled.png', x: -230, y: -155, r: -12 },
  { label: 'Final-final.pdf', x: 35, y: -73, r: -15 },
  { label: 'Hgbfnjk.jpg', x: -176, y: -18, r: 10 },
  { label: 'Logo-v5', x: 213, y: -144, r: 22 },
  { label: 'Artboard 1 copy 5', x: -279, y: 145, r: -12 },
  { label: 'Screenshot 2026-08-18 at 10.43.02 PM', x: 226, y: 120, r: 12 },
];

/* ── The left column (scroll phase) ──────────────────────────────
   Nothing vanishes: each chip travels to a compact left column IN
   LOCKSTEP with its own dot's suction (same stagger, same scroll
   window), straightened, at its original size. Chip k rides the
   suction driver of dot CHIP_DOT[k]. */
const CHIP_DOT = [2, 7, 0, 3, 1, 5];

/* Then the graph reads left→right: lines flow from the files INTO the
   core, and out the other side into the STRUCTURED column — the real
   things a brand is made of. */
const RIGHT_LABELS = [
  'Brand identity',
  'Brand guideline',
  'Typography',
  'Voice & tone',
  'Photography',
  'Brand assets',
];

/* ── The pinned scene ───────────────────────────────────────────── */

function FolderToSystem() {
  const ref = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const markBoxRef = useRef<HTMLDivElement>(null);
  const dotEls = useRef<(SVGCircleElement | null)[]>([]);
  const coreEl = useRef<SVGCircleElement | null>(null);
  const itemEls = useRef<(HTMLSpanElement | null)[]>([]);
  const rightEls = useRef<(HTMLSpanElement | null)[]>([]);
  const leftPathEls = useRef<(SVGPathElement | null)[]>([]);
  const rightPathEls = useRef<(SVGPathElement | null)[]>([]);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  /* Measured geometry: the mark's centre (chip rest seats hang off it)
     and the compact left column — all in sticky-viewport coordinates.
     A ref, not state: frame() consumes it imperatively per scroll tick. */
  const geomRef = useRef<{
    markX: number;
    markY: number;
    xLeft: number;
    yMid: number;
    step: number;
    sizes: { w: number; h: number }[];
    leftLen: number[];
    rightLen: number[];
  } | null>(null);

  /* Gather & Bloom, verbatim from the lab — pure function of scroll
     progress: gather over p 0→.5 (staggered suction into the core,
     which keeps the swallowed area), bloom over p .5→1 (Core Bloom
     burst into the canonical mark). */
  const frame = (p: number) => {
    const g = inOutSine(clamp01(p * 2));
    const b = clamp01(p * 2 - 1);
    let fed = 0;
    const setC = (
      el: SVGCircleElement | null,
      x: number,
      y: number,
      r: number,
      o: number,
    ) => {
      if (!el) return;
      el.setAttribute('cx', String(x));
      el.setAttribute('cy', String(y));
      el.setAttribute('r', String(Math.max(0, r)));
      el.setAttribute('opacity', String(clamp01(o)));
    };
    const gis: number[] = [];
    GEO.forEach((d, i) => {
      const s = SCATTER[i];
      const gi = inQuad(stag(g, ORD[i], 8, 0.6)); // staggered suction
      gis[i] = gi;
      fed += gi;
      if (b <= 0) {
        setC(
          dotEls.current[i],
          lerp(s.x, CX, gi),
          lerp(s.y, CY, gi),
          lerp(s.r, RD * 0.4, gi),
          lerp(s.o, 1, gi) * (1 - 0.95 * inQuad(clamp01((gi - 0.7) / 0.3))),
        );
      } else {
        const l = stag(b, ORD[i] % 4, 4, 0.85);
        const e = outBackHard(l);
        const a = d.a - (1 - e) * 0.8;
        const rad = RING_R * e;
        setC(
          dotEls.current[i],
          CX + Math.cos(a) * rad,
          CY + Math.sin(a) * rad,
          RD,
          Math.min(1, l * 3),
        );
      }
    });
    const s8 = SCATTER[8];
    const cg = inOutSine(clamp01(g / 0.4)); // the core heads home first
    const rCore =
      b <= 0
        ? lerp(s8.r, RD, cg) * Math.sqrt(1 + fed) // area in = area kept
        : RD * (3 - 2 * outCubic(clamp01(b * 1.4))); // shed it all back out
    setC(coreEl.current, lerp(s8.x, CX, cg), lerp(s8.y, CY, cg), rCore, lerp(s8.o, 1, cg));

    /* chips ride their dots: chip k leaves for its column seat with the
       exact suction driver of dot CHIP_DOT[k] — same stagger, same
       scroll window, straightening as it travels */
    const geo = geomRef.current;
    if (geo) {
      CHIPS.forEach((chip, k) => {
        const el = itemEls.current[k];
        if (!el) return;
        const size = geo.sizes[k] ?? { w: 0, h: 0 };
        const e = inOutSine(gis[CHIP_DOT[k]]);
        const restX = geo.markX + chip.x - size.w / 2;
        const restY = geo.markY + chip.y - size.h / 2;
        const colX = geo.xLeft;
        const colY = geo.yMid + k * geo.step - size.h / 2;
        el.style.transform = `translate(${lerp(restX, colX, e).toFixed(1)}px, ${lerp(restY, colY, e).toFixed(1)}px) rotate(${lerp(chip.r, 0, e).toFixed(2)}deg)`;
        el.style.opacity = '1';
      });

      /* the graph: once the chips are seated, lines draw from the files
         into the core (as the mark forms), then out the other side into
         the structured column — file k, line k, output k, in order */
      const drawL = clamp01((p - 0.55) / 0.25);
      const drawR = clamp01((p - 0.72) / 0.23);
      CHIPS.forEach((_, k) => {
        const eL = inOutSine(stag(drawL, k, CHIPS.length, 0.7));
        const lp = leftPathEls.current[k];
        if (lp && geo.leftLen[k]) {
          lp.style.strokeDashoffset = String(geo.leftLen[k] * (1 - eL));
        }
        const eR = inOutSine(stag(drawR, k, CHIPS.length, 0.7));
        const rp = rightPathEls.current[k];
        if (rp && geo.rightLen[k]) {
          rp.style.strokeDashoffset = String(geo.rightLen[k] * (1 - eR));
        }
        const rc = rightEls.current[k];
        if (rc) rc.style.opacity = String(eR);
      });
    }
  };

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduced) return;
    frame(v);
  });

  useLayoutEffect(() => {
    const measure = () => {
      const st = stickyRef.current;
      const mk = markBoxRef.current;
      if (!st || !mk) return;
      const sr = st.getBoundingClientRect();
      const mr = mk.getBoundingClientRect();
      const markX = mr.left - sr.left + mr.width / 2;
      const markY = mr.top - sr.top + mr.height / 2;
      // taller spread — first row higher, last row lower, even steps
      const step = sr.height * 0.128;
      // the columns centre on the MARK, not the viewport — the whole
      // diagram moves as one group when the mark moves
      const yMid = Math.max(
        128,
        markY - ((CHIPS.length - 1) * step) / 2,
      );
      // columns pushed outward toward the edges (owner-tuned)
      const xLeft = Math.max(48, (sr.width - 1440) / 2 + 120);
      const sizes = CHIPS.map((_, i) => {
        const el = itemEls.current[i];
        return el ? { w: el.offsetWidth, h: el.offsetHeight } : { w: 0, h: 0 };
      });

      /* the structured column mirrors the files column: right edges on
         the mirrored margin, same rows. Seated once — only its lines
         and opacity are scroll-driven. */
      const leftLen: number[] = [];
      const rightLen: number[] = [];
      CHIPS.forEach((_, k) => {
        const yRow = yMid + k * step;
        const size = sizes[k];
        const rEl = rightEls.current[k];
        const rw = rEl?.offsetWidth ?? 0;
        const rh = rEl?.offsetHeight ?? 0;
        const rx = sr.width - xLeft - rw;
        if (rEl) rEl.style.transform = `translate(${rx}px, ${yRow - rh / 2}px)`;

        // files → core
        const sx = xLeft + size.w;
        const lp = leftPathEls.current[k];
        if (lp) {
          lp.setAttribute(
            'd',
            `M ${sx} ${yRow} C ${sx + 70} ${yRow}, ${markX - 150} ${markY}, ${markX} ${markY}`,
          );
          const len = lp.getTotalLength();
          leftLen[k] = len;
          lp.style.strokeDasharray = String(len);
          lp.style.strokeDashoffset = String(len);
        }
        // core → structure
        const rp = rightPathEls.current[k];
        if (rp) {
          rp.setAttribute(
            'd',
            `M ${markX} ${markY} C ${markX + 150} ${markY}, ${rx - 70} ${yRow}, ${rx} ${yRow}`,
          );
          const len = rp.getTotalLength();
          rightLen[k] = len;
          rp.style.strokeDasharray = String(len);
          rp.style.strokeDashoffset = String(len);
        }
      });

      geomRef.current = { markX, markY, xLeft, yMid, step, sizes, leftLen, rightLen };
      // reposition everything for the current scroll state
      frame(reduced ? 1 : scrollYProgress.get());
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <div ref={ref} className="relative h-[220vh]">
      {/* pt lowers the whole diagram group (mark + columns + wiring) */}
      <div
        ref={stickyRef}
        className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-6 pt-[10vh]"
      >
        {/* the wiring — files → core → structure, drawn under the mark */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-panel-foreground"
          aria-hidden="true"
        >
          {CHIPS.map((_, k) => (
            <path
              key={`l${k}`}
              ref={(el) => {
                leftPathEls.current[k] = el;
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.3"
            />
          ))}
          {RIGHT_LABELS.map((_, k) => (
            <path
              key={`r${k}`}
              ref={(el) => {
                rightPathEls.current[k] = el;
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.3"
            />
          ))}
        </svg>

        {/* the mark — the owner's test-2 scatter, then Gather & Bloom
            plays it home */}
        <div ref={markBoxRef} className="relative">
          <svg
            viewBox="0 0 113.01 113.01"
            className="h-[210px] w-[210px] overflow-visible text-panel-foreground md:h-[280px] md:w-[280px]"
            fill="currentColor"
            aria-hidden="true"
          >
            {GEO.map((_, i) => (
              <circle
                key={i}
                ref={(el) => {
                  dotEls.current[i] = el;
                }}
                cx={SCATTER[i].x}
                cy={SCATTER[i].y}
                r={SCATTER[i].r}
                opacity={SCATTER[i].o}
              />
            ))}
            <circle
              ref={coreEl}
              cx={SCATTER[8].x}
              cy={SCATTER[8].y}
              r={SCATTER[8].r}
              opacity={SCATTER[8].o}
            />
          </svg>
        </div>

        {/* the chips — positioned per scroll tick by frame(), riding
            their dots' suction into the compact left column */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {CHIPS.map((chip, i) => (
            <span
              key={chip.label}
              ref={(el) => {
                itemEls.current[i] = el;
              }}
              className="absolute left-0 top-0 opacity-0"
            >
              <span className="block whitespace-nowrap rounded-[10px] border border-white/15 bg-[#1d1c1a] px-3.5 py-1.5 font-mono text-[11px] tracking-wide text-panel-foreground/80 md:text-xs">
                {chip.label}
              </span>
            </span>
          ))}

          {/* the structured column — what comes OUT of the core */}
          {RIGHT_LABELS.map((label, i) => (
            <span
              key={label}
              ref={(el) => {
                rightEls.current[i] = el;
              }}
              className="absolute left-0 top-0 opacity-0"
            >
              <span className="flex items-center gap-2 whitespace-nowrap rounded-[10px] border border-white/15 bg-[#1d1c1a] px-3.5 py-1.5 font-mono text-[11px] tracking-wide text-panel-foreground/80 md:text-xs">
                <svg
                  viewBox="0 0 10 12"
                  className="h-3 w-2.5 shrink-0 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  aria-hidden="true"
                >
                  <path d="M1 1h5l3 3v7H1z" />
                </svg>
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── The flow, shown for real ───────────────────────────────────
   App-flow steps on the right; the active step's screen recording
   plays on the left. Steps without a video yet show a quiet
   placeholder — each one gets its own capture as it lands. */

const FLOW_STEPS: { title: string; desc: string; video?: string }[] = [
  {
    title: 'Start with a name',
    desc: 'Type your brand name and drop in what you have. Files, links, or nothing at all.',
    video: '/videos/onboarding.mp4',
  },
  {
    title: 'It understands your brand',
    desc: 'Logos, colors, voice, and strategy get read and structured automatically.',
  },
  {
    title: 'Review and approve',
    desc: 'You confirm what is right, and the system keeps it as the single truth.',
  },
  {
    title: 'Create from it',
    desc: 'Templates, posts, decks, and AI output all start from your brand.',
  },
];

function FlowShowcase({ steps = FLOW_STEPS }: { steps?: typeof FLOW_STEPS }) {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <div className="container-tight mt-[7vh]">
      <div className="grid items-center gap-10 md:grid-cols-[1.35fr_1fr] md:gap-14">
        {/* the screen — one video slot, swapped per step */}
        <motion.div
          {...reveal}
          className="overflow-hidden rounded-[18px] border border-white/12 bg-white/[0.03]"
        >
          {step.video ? (
            <video
              key={step.video}
              src={step.video}
              autoPlay
              muted
              loop
              playsInline
              className="block h-auto w-full"
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center">
              <div className="flex flex-col items-center gap-5">
                <LogoMark className="h-10 w-10 opacity-40" breathe />
                <span className="microlabel opacity-45">Demo coming soon</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* the steps */}
        <motion.div {...reveal}>
          {steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`block w-full border-t border-white/10 py-5 text-left transition-opacity duration-300 ${
                i === active ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            >
              <span className="flex items-baseline gap-4">
                <span className="font-mono text-xs opacity-50">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="font-display block text-lg font-bold md:text-xl">
                    {s.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-panel-foreground/60">
                    {s.desc}
                  </span>
                </span>
              </span>
            </button>
          ))}
          <div className="border-t border-white/10" />
        </motion.div>
      </div>
    </div>
  );
}

/* ── The rhythmic ledger ────────────────────────────────────────── */

const LEDGER = [
  ['Code', 'version control.'],
  ['Customers', 'a CRM.'],
  ['Money', 'a ledger.'],
  ['Products', 'roadmaps.'],
];

/* ── Section ────────────────────────────────────────────────────── */

export function WhatIs() {
  return (
    <section id="flow" className="bg-panel text-panel-foreground" aria-label="Flow">
      <div className="container-tight pt-[12vh]">
        <ChapterHead label="Flow" hint="01" />
      </div>

      {/* the flow, for real — video left, steps right. Opens the section. */}
      <FlowShowcase />

      {/* the folder becomes the system — alone, right after the flow */}
      <FolderToSystem />
    </section>
  );
}

/** Features — the second chapter, born as a copy of the "Flow" opener
 *  (chapter head + flow showcase), mounted BELOW the diagram scene. */

const FEATURES_STEPS: typeof FLOW_STEPS = [
  {
    title: 'Brand identity',
    desc: 'Logos, colors, typography, and voice, structured into one living identity.',
  },
  {
    title: 'Brand kit',
    desc: 'Every asset and variant, generated and organized, ready to use anywhere.',
  },
  {
    title: 'Guideline',
    desc: 'Living brand guidelines that stay current as your brand evolves.',
  },
  {
    title: 'AI design',
    desc: 'Generate on-brand designs from a prompt, with your identity applied automatically.',
  },
];

export function Features() {
  return (
    <section id="features" className="bg-panel text-panel-foreground" aria-label="Features">
      <div className="container-tight pt-[12vh]">
        <ChapterHead label="Features" hint="02" />
      </div>
      <FlowShowcase steps={FEATURES_STEPS} />
      <div className="pb-[16vh]" />
    </section>
  );
}

/* ── Parked: the systems-ledger chapter (owner: reuse later) ──────
   The h2 + ledger + closing that used to frame this section. Not
   mounted anywhere — remount as one block when it finds its home. */
export function WhatIsStoryBlock() {
  return (
    <>
      <div className="container-tight pt-[14vh]">
        <motion.h2 {...reveal} className="display-chapter mt-10 max-w-4xl">
          Your company has a system for everything.
          <br />
          <span className="opacity-50">
            Except the thing everything depends on.
          </span>
        </motion.h2>

        {/* the rhythmic ledger */}
        <div className="mt-16 max-w-3xl md:mt-24">
          {LEDGER.map(([thing, system], i) => (
            <motion.p
              key={thing}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.19, 1, 0.22, 1] }}
              className="border-t border-white/10 py-4 font-display text-xl font-bold md:py-5 md:text-2xl"
            >
              {thing} <span className="font-normal opacity-45">has</span>{' '}
              {system}
            </motion.p>
          ))}
          <motion.p
            {...reveal}
            className="border-y border-white/10 py-5 font-display text-2xl font-extrabold md:py-6 md:text-4xl"
          >
            Brand <span className="font-normal opacity-45">has</span>{' '}
            <span className="serif-accent">a folder.</span>
          </motion.p>
        </div>
      </div>

      {/* closing */}
      <div className="container-tight pb-[14vh] pt-[6vh] text-center">
        <motion.p {...reveal} className="display-chapter">
          <span className="opacity-45">Not a folder your brand lives in.</span>
          <br />
          The system your brand <span className="serif-accent">runs on.</span>
        </motion.p>

        <motion.a
          {...reveal}
          href="#why"
          className="btn-ghost mt-12 inline-flex text-panel-foreground/70 hover:text-panel-foreground"
        >
          See how it works
          <span aria-hidden="true">→</span>
        </motion.a>
      </div>
    </>
  );
}
