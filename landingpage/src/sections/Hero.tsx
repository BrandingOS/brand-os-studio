/**
 * Hero — "One core. Infinite formations."
 *
 * A 340vh pinned sequence. The statement sits on paper with the 9-dot
 * logomark below it. Scrolling zooms INTO the mark: the outer eight
 * dots fly past the viewport edges while the core dot swallows the
 * screen — and the core IS the next chapter.
 *
 * The trick that keeps it perfectly in sync: the core dot is never a
 * painted circle. It is the ink-dark reveal layer, clipped to
 * `circle(r at centre)` where r = coreRadius × scale — the exact same
 * numbers that drive the outer dots' transform. One source of truth,
 * zero drift.
 *
 * Choreography (p = scroll progress of the wrapper):
 *   0.00–0.18  statement fades up and out, scroll cue dies
 *   0.04–0.24  mark glides from lower third to viewport centre
 *   0.16–0.90  the dive, two beats: steady approach to 6× (easeInOut),
 *              then the accelerating swallow to cover-the-diagonal
 *   0.56–0.74  inside-the-core copy fades in — and STAYS: it scrolls
 *              away naturally with the pin release, handing momentum
 *              straight to chapter 01 (no dead-black beat)
 *   0.84–0.91  outer dots (long offscreen) release
 */
import { useEffect, useRef, useState } from 'react';
import {
  easeInOut,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  CORE_DOT,
  CORE_R_FRAC,
  DOT_R,
  MARK_VIEW,
  OUTER_DOTS,
} from '@/components/brand/LogoMark';
import { OrbitStage } from '@/sections/Orbit';

/** Where the product app lives — the hero input hands the typed brand
 *  name to `/onboard-brand/create?name=…` there. Override per deploy
 *  with VITE_APP_URL. */
const APP_URL: string =
  (import.meta.env.VITE_APP_URL as string | undefined) ??
  'http://localhost:8080';

/* ── Core Burst intro (variant 02 from new-ui/logo-motion, verbatim):
   one heavy dot splits into the whole mark — the outer eight burst
   outward in paired waves while the (oversized) core sheds its extra
   mass. In this hero the "core" is the dark reveal circle itself. */
const CX = CORE_DOT.x;
const CY = CORE_DOT.y;
const GEO = OUTER_DOTS.map(({ x, y }) => ({
  x,
  y,
  a: Math.atan2(y - CY, x - CX),
}));
const RING_R = Math.hypot(GEO[0].x - CX, GEO[0].y - CY);
const RING = [...GEO.keys()].sort((i, j) => GEO[i].a - GEO[j].a);
const ORD: number[] = [];
RING.forEach((di, k) => {
  ORD[di] = k;
});

/* Timing (verbatim from variant 147): burst entrance, then a 12s
   episode loop — typing pulse at 1.7–6.1, infinity path at 7.6–end. */
const BURST = 1.3;
const LOOP = 12;
/* Combined track: 340vh dive + 300vh orbit = 640vh (orbit length per
   the lab's hero2 — keep in sync with the section's h-[640vh]). */
const DIVE_VH = 340;
const ORBIT_VH = 300;
const DIVE_FRAC = DIVE_VH / (DIVE_VH + ORBIT_VH);
const CORE_SWELL = 1.55; // the heavy dot's starting mass
const TAU = Math.PI * 2;
const CAM = 300;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const stag = (p: number, i: number, n: number, w: number) => {
  const start = n > 1 ? (i * (1 - w)) / (n - 1) : 0;
  return clamp01((p - start) / w);
};
const outBackHard = (t: number) => {
  const c = 2.6;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const outBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const inOutQuint = (t: number) =>
  t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;

function proj3d(x: number, y: number, z: number, ry: number, rx: number) {
  const cy1 = Math.cos(ry), sy1 = Math.sin(ry);
  const x1 = x * cy1 + z * sy1;
  const z1 = -x * sy1 + z * cy1;
  const cx1 = Math.cos(rx), sx1 = Math.sin(rx);
  const y1 = y * cx1 - z1 * sx1;
  const z2 = y * sx1 + z1 * cx1;
  const s = CAM / (CAM - z2);
  return { x: CX + x1 * s, y: CY + y1 * s, s, z: z2 };
}
const frontness = (z: number) => clamp01((z / RING_R + 1) / 2);

/* Typing-pulse clusters: nine nodes (core included) in 3 groups of 3,
   grouped by resting x. */
const CLUSTER_ALL = [...GEO.map((d, i) => ({ i, x: d.x })), { i: 8, x: CX }];
CLUSTER_ALL.sort((a, b) => a.x - b.x);
const CLUSTER: number[] = [];
CLUSTER_ALL.forEach((o, k) => {
  CLUSTER[o.i] = Math.floor(k / 3);
});
const CPOS: [number, number][] = [[CX - 24, CY], [CX, CY], [CX + 24, CY]];


function useViewport() {
  const [size, setSize] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1440,
    vh: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));
  useEffect(() => {
    const onResize = () =>
      setSize({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

export function Hero() {
  const wrapRef = useRef<HTMLElement>(null);
  const [brandName, setBrandName] = useState('');
  const reduced = useReducedMotion();
  const { vw, vh } = useViewport();

  const { scrollYProgress: p } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  });

  /* ── One combined track, two phases ─────────────────────────────
     The first DIVE_FRAC of the 860vh track is the dive (same 340vh of
     scroll as before); the rest drives the orbit stage that lives
     INSIDE the reveal — one DOM, so the composition can never appear
     twice. pHero saturates at 1 for the orbit stretch; pOrbit stays 0
     for the dive. */
  const pHero = useTransform(p, (v) => Math.min(1, v / DIVE_FRAC));
  const pOrbit = useTransform(p, (v) =>
    clamp01((v - DIVE_FRAC) / (1 - DIVE_FRAC)),
  );

  /* ── Geometry ─────────────────────────────────────────────────── */
  // Mark width: capped by viewport width AND height so the idle
  // composition (statement above, mark below) never collides.
  // Generous mark — the episodes travel past its box (overflow-visible
  // everywhere), and the cap keeps it clear of the input above and the
  // viewport edge below.
  const logoW = Math.max(140, Math.min(vw * 0.17, 260, vh * 0.28));
  const coreR0 = logoW * CORE_R_FRAC; // core dot radius at scale 1
  const coverR = Math.hypot(vw, vh) / 2 + 60; // radius that swallows the screen
  // By the time the dive starts, Sequence II has absorbed the ring and
  // grown the core to 3× (conserved area of all nine dots) — so the
  // container only needs to carry THAT dot to cover. Reduced motion
  // skips the acts, so the core stays at 1×.
  const sMax = coverR / (coreR0 * (reduced ? 1 : 3));

  const yStart = vh * 0.77; // mark centre — lower third, under the statement
  const yMid = vh * 0.5; // mark centre — dead centre for the dive

  /* ── Hero Sequence state (variant 147) ────────────────────────── */
  const dotEls = useRef<(SVGCircleElement | null)[]>([]);
  const dotLayer = useRef<SVGGElement | null>(null);
  // A PAINTED core inside the same svg as the outer dots: it rides the
  // exact same transform pipeline, so it can never lag its siblings.
  // The dark clip circle sits on top with identical geometry — any
  // one-frame clip-path lag hides behind this element.
  const coreEl = useRef<SVGCircleElement | null>(null);
  const seqT = useRef(0); // survives resize re-mounts of the effect
  // The dark reveal circle plays the core: the sequence drives its
  // radius ratio and its offset (the core joins the typing episode).
  const coreR = useMotionValue(reduced ? 1 : CORE_SWELL);
  const coreDx = useMotionValue(0); // px
  const coreDy = useMotionValue(0); // px

  /* ── Scroll-driven values (all on the dive phase) ─────────────── */
  const copyOpacity = useTransform(pHero, [0.04, 0.18], [1, 0]);
  const copyY = useTransform(pHero, [0, 0.22], [0, -vh * 0.14]);

  const markY = useTransform(pHero, [0.04, 0.24], [yStart, yMid], {
    ease: easeInOut,
  });
  // Exponential dive — scale = sMax^t reads as a CONSTANT zoom rate
  // (a camera dolly). It starts only after Sequence II's absorb act
  // has pulled the ring inside and the core is growing — the zoom
  // compounds seamlessly with the core's own 1.6×→3× growth.
  const zoomT = useTransform(pHero, [0.4, 0.9], [0, 1], { ease: easeInOut });
  const scale = useTransform(zoomT, (t) => Math.pow(sMax, t));

  // Before the dive the clip circle is a small window riding the core —
  // the stage behind it must read as solid ink, or its paper-coloured
  // mark shows through as a white hole. Fade the stage in only once the
  // circle is genuinely opening (it's still ~100px radius at 0.6, so
  // no content area is uncovered mid-fade).
  const stageOpacity = useTransform(pHero, [0.45, 0.6], [0, 1]);

  const dotsY = useTransform(markY, (y) => y - logoW / 2);
  // The ring is fully absorbed (opacity 0 via the sequence) by p≈0.37 —
  // drop the layer shortly after so no huge composited layer lingers.
  const dotsVisibility = useTransform(pHero, (v) =>
    v > 0.5 ? 'hidden' : 'visible',
  );

  // Once the circle has swallowed the viewport (p≈0.9), drop the clip
  // entirely — an unclipped opaque block paints in the normal flow, so
  // fast inertial scrolling over the seam can't checkerboard-flash the
  // paper behind the (otherwise huge, composited) clipped layer.
  const clipPath = useTransform(
    [pHero, scale, markY, coreR, coreDx, coreDy] as const,
    ([pv, s, y, cr, dx, dy]: number[]) =>
      pv >= 0.94
        ? 'none'
        : `circle(${coreR0 * s * cr}px at calc(50% + ${dx}px) ${y + dy}px)`,
  );

  /* ── The sequence loop (variant 147, verbatim physics) ────────────
     Core Burst entrance → idle breathing → typing-pulse episode →
     infinity-path episode → repeat. `calm` (from scroll progress)
     settles everything to rest before the dive takes over. */
  useEffect(() => {
    const k = logoW / MARK_VIEW; // viewBox units → px, for the clip core
    if (reduced) {
      GEO.forEach((d, i) => {
        const c = dotEls.current[i];
        if (c) {
          c.setAttribute('cx', String(d.x));
          c.setAttribute('cy', String(d.y));
          c.setAttribute('r', String(DOT_R));
          c.setAttribute('opacity', '1');
        }
      });
      coreEl.current?.setAttribute('r', String(DOT_R));
      coreR.set(1);
      coreDx.set(0);
      coreDy.set(0);
      return;
    }

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      seqT.current += dt;
      const t = seqT.current;
      const cyc = t < BURST ? -1 : (t - BURST) % LOOP;
      /* Sequence II scroll acts, mapped to the pin's first 55%:
         act I settles the episodes, act II rides Core Bloom's arc in
         reverse (the ring returns INTO the core), act III grows the
         core to 3× — then the dive carries that one dot to cover. */
      const seqP = clamp01(pHero.get() / 0.55);
      const calm = inOutSine(clamp01(seqP / 0.25));
      const absorb = inOutSine(clamp01((seqP - 0.28) / 0.4));
      const eb = 1 - absorb;
      const grow = inOutSine(clamp01((seqP - 0.72) / 0.28));
      const coreRatio =
        lerp(1.6 - 0.6 * eb, 3, grow) * (1 + 0.04 * grow * Math.sin(t * 2));

      const posFor = (i: number, hx: number, hy: number, isCore: boolean) => {
        /* rIdle is the SINGLE source of truth for the resting radius;
           every episode starts from it and eases back to it, so the
           motion is continuous across episode boundaries — one
           unbroken take, no cuts. */
        const rIdle = DOT_R * (1 + 0.03 * Math.sin(t * 1.5 + i));
        let x = hx;
        let y = hy;
        let r = rIdle;
        let o = 1;
        let z = 0;
        if (t < BURST) {
          const q = t / BURST;
          const settle = inOutSine(clamp01((t - 0.85) / 0.45));
          if (isCore) {
            const shed =
              DOT_R * (CORE_SWELL - 0.55 * outCubic(clamp01(q * 1.6)));
            r = lerp(shed, rIdle, settle);
          } else {
            const l = stag(q, ORD[i] % 4, 4, 0.85); // paired burst waves
            const e = outBackHard(l);
            const a = GEO[i].a - (1 - e) * 0.8;
            const rad = RING_R * e;
            x = CX + Math.cos(a) * rad;
            y = CY + Math.sin(a) * rad;
            r = lerp(DOT_R, rIdle, settle);
          }
        } else if (cyc >= 1.7 && cyc < 6.1) {
          // typing pulse — three clusters of three, bouncing in phase
          const tm = cyc - 1.7;
          const cl = CLUSTER[isCore ? 8 : i];
          const [cx2, cy2] = CPOS[cl];
          if (tm < 0.7) {
            const e = inOutQuint(tm / 0.7);
            x = lerp(hx, cx2, e);
            y = lerp(hy, cy2, e);
            r = lerp(rIdle, 8.2, e);
          } else if (tm < 2.7) {
            const ph = Math.sin(((tm - 0.7) * TAU) / 1.0 - cl * 0.85);
            x = cx2;
            y = cy2 - 10 * Math.pow(Math.max(0, ph), 2);
            r = 8.2;
          } else if (tm < 3.4) {
            const e = outBack((tm - 2.7) / 0.7);
            x = lerp(cx2, hx, e);
            y = lerp(cy2, hy, e);
            r = lerp(8.2, rIdle, e);
          }
        } else if (cyc >= 7.6) {
          // infinity path — a 3D lemniscate with depth shading
          const tm = cyc - 7.6;
          let m: number;
          if (tm < 0.6) m = inOutSine(tm / 0.6);
          else if (tm < 3.6) m = 1;
          else m = 1 - inOutSine((tm - 3.6) / 0.8);
          if (!isCore) {
            const th = TAU * (tm * 0.45 + ORD[i] / 8);
            const pr = proj3d(
              48 * Math.sin(th),
              20 * Math.sin(2 * th),
              32 * Math.cos(th),
              0,
              0.2,
            );
            x = lerp(hx, pr.x, m);
            y = lerp(hy, pr.y, m);
            r = lerp(rIdle, DOT_R * 0.8 * pr.s, m);
            o = lerp(1, 0.4 + 0.6 * frontness(pr.z), m);
            z = pr.z * m;
          } else {
            r = rIdle * (1 + 0.06 * m * Math.sin(tm * 3));
          }
        }
        return { x, y, r, o, z };
      };

      const items: { el: SVGCircleElement; z: number }[] = [];
      let anyDepth = false;
      GEO.forEach((d, i) => {
        const c = posFor(i, d.x, d.y, false);
        const el = dotEls.current[i];
        if (!el) return;
        const z = c.z * (1 - calm);
        let x = lerp(c.x, d.x, calm);
        let y = lerp(c.y, d.y, calm);
        let r = lerp(c.r, DOT_R, calm);
        let o = lerp(c.o, 1, calm);
        // act II: the ring rides Core Bloom's 1.2-rad arc back into the
        // centre — shrinking to half, fading over the last stretch
        if (absorb > 0) {
          const a = GEO[i].a - (1 - eb) * 1.2;
          const rad = RING_R * eb;
          x = CX + Math.cos(a) * rad;
          y = CY + Math.sin(a) * rad;
          r = DOT_R * (0.5 + 0.5 * eb);
          o = Math.min(1, eb * 4);
        }
        el.setAttribute('cx', String(x));
        el.setAttribute('cy', String(y));
        el.setAttribute('r', String(Math.max(0, r)));
        el.setAttribute('opacity', String(clamp01(o)));
        items.push({ el, z });
        if (z !== 0) anyDepth = true;
      });
      // depth order only matters while the infinity episode runs
      if (anyDepth && dotLayer.current) {
        const layer = dotLayer.current;
        items.sort((a, b) => a.z - b.z).forEach((it) => layer.appendChild(it.el));
      }

      // the core: one set of numbers drives BOTH the painted circle
      // (transform-synced with its siblings) and the dark clip circle
      const cc = posFor(8, CX, CY, true);
      const ccx = lerp(cc.x, CX, calm);
      const ccy = lerp(cc.y, CY, calm);
      // the core's rest target is act-driven: 1× at idle, swelling to
      // 1.6× as it absorbs the ring, then 3× before the dive
      const ccr = lerp(cc.r, DOT_R * coreRatio, calm);
      if (coreEl.current) {
        coreEl.current.setAttribute('cx', String(ccx));
        coreEl.current.setAttribute('cy', String(ccy));
        coreEl.current.setAttribute('r', String(ccr));
      }
      coreR.set(ccr / DOT_R);
      coreDx.set((ccx - CX) * k);
      coreDy.set((ccy - CY) * k);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, logoW]);

  return (
    <section ref={wrapRef} className="relative h-[640vh]" aria-label="Intro">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* ── Layer 1 · the statement ─────────────────────────────── */}
        <motion.div
          style={{ opacity: copyOpacity, y: copyY }}
          className="hero-copy absolute inset-x-0 top-[15vh] z-10 flex flex-col items-center px-6 text-center md:top-[17vh]"
        >
          {/* Focus reveal — the identity's campaign device: the frame
              starts out of focus and resolves sharp. One tight beat,
              not a stagger train. */}
          <motion.span
            initial={{ opacity: 0, filter: 'blur(10px)', y: 8 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.9, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="microlabel opacity-55"
          >
            Your Brand Operating System
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, filter: 'blur(16px)', scale: 1.04, y: 12 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="display-hero mt-4"
          >
            Your brand, now <span className="serif-accent">executable.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.9, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-xl text-base leading-snug text-muted-foreground md:text-lg"
          >
            Build your brand once. Then let everything you create — people,
            templates, tools, and AI — start from the same identity.
          </motion.p>

          {/* Brand-name input — typing a name drops the visitor into
              the app's onboarding PAST the name step (?name= handoff,
              handled in CreateScreen). */}
          <motion.form
            initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.985, y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex h-14 w-full max-w-[420px] items-center rounded-[12px] border border-input bg-card p-1.5 pl-5 shadow-soft transition-shadow duration-300 focus-within:shadow-elevated"
            onSubmit={(e) => {
              e.preventDefault();
              const n = brandName.trim();
              if (!n) return;
              window.location.href = `${APP_URL}/onboard-brand?step=details&name=${encodeURIComponent(n)}`;
            }}
          >
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Your brand name"
              aria-label="Your brand name"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:shadow-none"
            />
            <button
              type="submit"
              className="inline-flex h-full shrink-0 items-center gap-2 rounded-[8px] bg-foreground px-6 text-sm font-semibold text-background transition-transform duration-150 ease-out-expo hover:-translate-y-px"
            >
              Build
            </button>
          </motion.form>
        </motion.div>

        {/* ── Layer 2 · the outer eight dots ──────────────────────── */}
        <motion.div
          style={{
            width: logoW,
            height: logoW,
            x: '-50%',
            y: dotsY,
            scale,
            visibility: dotsVisibility,
            willChange: 'transform',
          }}
          className="absolute left-1/2 top-0 z-20"
        >
          <svg
            viewBox={`0 0 ${MARK_VIEW} ${MARK_VIEW}`}
            className="h-full w-full overflow-visible text-foreground"
            fill="currentColor"
            aria-hidden="true"
          >
            <g ref={dotLayer}>
              {OUTER_DOTS.map((d, i) => (
                <circle
                  key={i}
                  ref={(el) => {
                    dotEls.current[i] = el;
                  }}
                  cx={reduced ? d.x : CX}
                  cy={reduced ? d.y : CY}
                  r={DOT_R}
                />
              ))}
            </g>
            <circle
              ref={coreEl}
              cx={CX}
              cy={CY}
              r={reduced ? DOT_R : DOT_R * CORE_SWELL}
            />
          </svg>
        </motion.div>

        {/* ── Layer 3 · the core = the reveal ──────────────────────
            The opening circle uncovers the LIVE orbit stage — the
            centred statement with the mark waiting under it. The same
            DOM then rides pOrbit through the whole orbit: one logo,
            nothing rendered twice. */}
        <motion.div
          style={{ clipPath }}
          className="absolute inset-0 z-30 bg-panel text-panel-foreground"
        >
          <motion.div style={{ opacity: stageOpacity }} className="h-full w-full">
            <OrbitStage progress={pOrbit} />
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
