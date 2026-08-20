/**
 * Chapter — One source (ink; re-skinned from paper at owner request).
 *
 * Three beats:
 *   · one source behind everything — Meaning / Identity / Rules /
 *     Creation arranged around the 9-dot core
 *   · the brand stops being a reference, it becomes an input
 *   · start with what you already have — three doors in, one system out
 */
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CORE_DOT, DOT_R, OUTER_DOTS } from '@/components/brand/LogoMark';
import { ChapterHead, Statement, reveal } from './shared';

/* ── DNA Cycle (lab variant 159, verbatim) ────────────────────────
   The mark unwinds into the double helix, spins a while, then winds
   back — an endless cycle. Two strands + four rungs; the core never
   moves. Runs only while on screen. */

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
const CAM = 300;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const inQuad = (t: number) => t * t;
const frontness = (z: number) => clamp01((z / RING_R + 1) / 2);
function proj3d(x: number, y: number, z: number, ry: number, rx: number) {
  const cy1 = Math.cos(ry), sy1 = Math.sin(ry);
  const x1 = x * cy1 + z * sy1;
  const z1 = -x * sy1 + z * cy1;
  const cx1 = Math.cos(rx), sx1 = Math.sin(rx);
  const y1 = y * cx1 - z1 * sx1;
  const z2 = y * sx1 + z1 * cx1;
  const sc = CAM / (CAM - z2);
  return { x: CX + x1 * sc, y: CY + y1 * sc, s: sc, z: z2 };
}

function DnaCycleMark({ className }: { className?: string }) {
  const rootRef = useRef<SVGSVGElement | null>(null);
  const layerRef = useRef<SVGGElement | null>(null);
  const dotEls = useRef<(SVGCircleElement | null)[]>([]);
  const coreEl = useRef<SVGCircleElement | null>(null);
  const rungEls = useRef<(SVGLineElement | null)[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    let raf = 0;
    let running = false;
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const T = 9, tc = t % T;
      const items: { el: SVGCircleElement; z: number }[] = [];
      const pts: { x: number; y: number }[] = [];
      let mSum = 0;
      GEO.forEach((d, i) => {
        const el = dotEls.current[i];
        if (!el) return;
        const s0 = ORD[i] % 2, k = Math.floor(ORD[i] / 2);
        /* rest → unwind (ripple by ring order) → spin → wind back →
           rest; the helix phase runs on absolute t, so the spin never
           hiccups across morphs or loop wraps */
        const mIn = inOutSine(clamp01((tc - 0.9 - ORD[i] * 0.055) / 1.1));
        const mOut = inOutSine(clamp01((tc - 6.8 - ORD[i] * 0.055) / 1.1));
        const m = mIn * (1 - mOut);
        mSum += m;
        const ph = t * 1.3 + k * 0.9 + s0 * Math.PI;
        const pr = proj3d(Math.cos(ph) * 30, -36 + k * 24, Math.sin(ph) * 30, 0, 0.15);
        const x = lerp(d.x, pr.x, m), y = lerp(d.y, pr.y, m);
        el.setAttribute('cx', String(x));
        el.setAttribute('cy', String(y));
        el.setAttribute('r', String(RD * lerp(1 + 0.02 * Math.sin(t * 2 + i), 0.8 * pr.s, m)));
        el.setAttribute('opacity', String(lerp(1, 0.4 + 0.6 * frontness(pr.z), m)));
        items.push({ el, z: pr.z * m });
        pts[k * 2 + s0] = { x, y };
      });
      /* rungs only exist while the helix does */
      const rungOp = 0.15 * inQuad(clamp01((mSum / 8 - 0.5) / 0.5));
      [0, 1, 2, 3].forEach((k) => {
        const a = pts[k * 2], b = pts[k * 2 + 1];
        const rg = rungEls.current[k];
        if (!rg || !a || !b) return;
        rg.setAttribute('x1', String(a.x));
        rg.setAttribute('y1', String(a.y));
        rg.setAttribute('x2', String(b.x));
        rg.setAttribute('y2', String(b.y));
        rg.setAttribute('opacity', rungOp.toFixed(3));
      });
      const core = coreEl.current;
      if (core) {
        core.setAttribute('r', String(RD * (1 + 0.03 * Math.sin(t * 2))));
        items.push({ el: core, z: 0 });
      }
      const layer = layerRef.current;
      if (layer) {
        items.sort((a, b) => a.z - b.z).forEach((it) => layer.appendChild(it.el));
      }
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 113.01 113.01"
      className={`${className ?? ''} overflow-visible`}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* rungs live under the dots, as in the lab's `ctx.under` */}
      {[0, 1, 2, 3].map((k) => (
        <line
          key={k}
          ref={(el) => {
            rungEls.current[k] = el;
          }}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0"
        />
      ))}
      <g ref={layerRef}>
        {OUTER_DOTS.map((d, i) => (
          <circle
            key={i}
            ref={(el) => {
              dotEls.current[i] = el;
            }}
            cx={d.x}
            cy={d.y}
            r={DOT_R}
          />
        ))}
        <circle ref={coreEl} cx={CX} cy={CY} r={DOT_R} />
      </g>
    </svg>
  );
}

/* ── 1 · The four faces of the source ───────────────────────────── */

const FACETS: { name: string; items: string[] }[] = [
  {
    name: 'Meaning',
    items: ['Strategy', 'Audience', 'Positioning', 'Personality', 'Voice', 'Messaging'],
  },
  {
    name: 'Identity',
    items: ['Logos', 'Colors', 'Typography', 'Visual direction', 'Imagery', 'Assets'],
  },
  {
    name: 'Rules',
    items: ['What belongs', 'What doesn’t', 'What can change', 'What stays fixed'],
  },
  {
    name: 'Creation',
    items: ['AI', 'Templates', 'Design', 'Campaigns', 'Social', 'Presentations'],
  },
];

function SourceGrid() {
  return (
    <div className="mt-16 md:mt-24">
      {/* relative on the GRID itself, so the mark centres on the four
          cards — not on grid+caption (that read as sitting low) */}
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-24 lg:gap-32">
        {FACETS.map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.19, 1, 0.22, 1] }}
            className="rounded-[18px] border border-white/12 bg-white/[0.03] p-7 md:p-8"
          >
            <div className="flex items-baseline justify-between">
              <span className="microlabel label-rule opacity-70">{f.name}</span>
              <span className="font-mono text-xs opacity-35">
                0{i + 1}
              </span>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
              {f.items.map((it) => (
                <li
                  key={it}
                  className="rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-sm text-panel-foreground/75"
                >
                  {it}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        {/* the core, seated at the cross point of the four (md+) —
            inside the relative grid so it centres on the cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
          // centring lives in framer's x/y — a Tailwind -translate-* class
          // would be overwritten by the scale animation's transform
          style={{ x: '-50%', y: '-50%' }}
          className="pointer-events-none absolute left-1/2 top-1/2 hidden md:block"
          aria-hidden="true"
        >
          <DnaCycleMark className="h-16 w-16 text-panel-foreground lg:h-20 lg:w-20" />
        </motion.div>
      </div>

      <motion.p {...reveal} className="microlabel mt-10 text-center opacity-55">
        Everything points back to one system.
      </motion.p>
    </div>
  );
}

/* ── 2 · Reference → input ──────────────────────────────────────── */

export function InputBeat() {
  return (
    <div className="mt-[24vh]">
      <Statement text="The brand stops being a reference. It becomes an *input.*" />

      <div className="mt-14 grid max-w-4xl grid-cols-1 gap-8 md:mt-20 md:grid-cols-2 md:gap-14">
        <motion.div {...reveal} className="space-y-2 text-base leading-relaxed text-panel-foreground/55 md:text-lg">
          <p>
            Today, you create something —{' '}
            <span className="text-panel-foreground">then reference the brand.</span>
          </p>
          <p>With BrandingOS, the brand comes first.</p>
        </motion.div>
        <motion.div {...reveal} className="text-base leading-relaxed text-panel-foreground/55 md:text-lg">
          <p>
            The system already knows the identity. The assets. The
            typography. The colors. The visual language. The voice. The
            context.{' '}
            <span className="font-semibold text-panel-foreground">
              Creation starts there.
            </span>
          </p>
        </motion.div>
      </div>

      <motion.p
        {...reveal}
        className="mt-16 max-w-3xl font-display text-2xl font-bold leading-snug md:mt-24 md:text-4xl"
      >
        Your brand becomes something{' '}
        <span className="serif-accent">software can build from.</span>
      </motion.p>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Source() {
  return (
    <section
      id="source"
      className="bg-panel text-panel-foreground"
      aria-label="One source behind everything"
    >
      <div className="container-tight pb-32 pt-28 md:pb-44 md:pt-36">
        <ChapterHead label="03 · One source" hint="Not the files — the decisions" />

        <motion.h2 {...reveal} className="h-section mt-10 max-w-3xl">
          One source behind{' '}
          <span className="serif-accent">everything.</span>
        </motion.h2>

        <motion.p
          {...reveal}
          className="mt-6 max-w-xl text-base leading-relaxed text-panel-foreground/55 md:text-lg"
        >
          BrandingOS structures the brand itself. Not only the files — the
          decisions behind them.
        </motion.p>

        <SourceGrid />
      </div>
    </section>
  );
}
