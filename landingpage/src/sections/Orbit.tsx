/**
 * OrbitStage (ink) — Hero Orbit II from new-ui/logo-motion/hero2,
 * verbatim physics.
 *
 * NOT a section of its own: the Hero mounts this inside its expanding
 * circle reveal and hands it a scroll-progress MotionValue that stays
 * at 0 for the whole dive, then runs 0→1 over the orbit stretch of the
 * combined track. One logo, one DOM — no still replica, no handoff.
 *
 * The progress drives:
 *   · the 9-dot mark: flat → lifts into a true 3D constellation and
 *     turns two full revolutions → locks flat again, slightly larger
 *   · 8 brand-artifact cards on a 3D elliptical orbit around the mark;
 *     they enter after the base form and leave before the final lock,
 *     so the mark alone owns both ends
 *   · mouse tilt on the whole world (mark + cards), brand.ai style
 * Clicking the mark cycles its formation (System → Orbit → Helix →
 * Lattice → Chaos) with a small spin kick — both scroll ends still
 * resolve to the canonical mark whatever was clicked in between.
 *
 * Everything is imperative on purpose (refs + one rAF): React renders
 * the DOM once and the loop mutates attrs/styles, exactly like the lab.
 * The loop only runs while the track intersects the viewport.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion, type MotionValue } from 'framer-motion';
import { CORE_DOT, DOT_R, OUTER_DOTS } from '@/components/brand/LogoMark';

/* ── geometry (logo-icon.svg, shared with the hero) ─────────────── */

const CX = CORE_DOT.x;
const CY = CORE_DOT.y;
const RD = DOT_R;
const GEO = OUTER_DOTS.map(({ x, y }) => ({ x, y, a: Math.atan2(y - CY, x - CX) }));
const RING = [...GEO.keys()].sort((i, j) => GEO[i].a - GEO[j].a);
/* depth targets per angular position — balanced ± so the lifted mark
   reads as a molecule, not a tilted plate */
const ZS = [26, -18, 22, -26, 18, -22, 24, -20];
const ZT: number[] = [];
RING.forEach((di, k) => {
  ZT[di] = ZS[k];
});

const TAU = Math.PI * 2;
const CAM = 240;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2; // inOutSine

/* ── formations (click the mark to cycle) ───────────────────────── */

type Pt = { x: number; y: number; z: number };
const byOrd = (f: (k: number) => Pt) => {
  const a: Pt[] = [];
  RING.forEach((di, k) => {
    a[di] = f(k);
  });
  return a;
};
const FORMS: Pt[][] = [
  /* System — the mark itself, molecule depth */
  [...GEO.map((d, i) => ({ x: d.x - CX, y: d.y - CY, z: ZT[i] })), { x: 0, y: 0, z: 0 }],
  /* Orbit — a flat halo ring around the core */
  [
    ...byOrd((k) => {
      const a = (k / 8) * TAU;
      return { x: Math.cos(a) * 58, y: k % 2 ? 7 : -7, z: Math.sin(a) * 58 };
    }),
    { x: 0, y: 0, z: 0 },
  ],
  /* Helix — two turns climbing past the core */
  [
    ...byOrd((k) => {
      const a = (k / 8) * TAU * 2;
      return { x: Math.cos(a) * 38, y: -54 + (108 * k) / 7, z: Math.sin(a) * 38 };
    }),
    { x: 0, y: 0, z: 0 },
  ],
  /* Lattice — cube corners */
  [
    ...byOrd((k) => ({ x: k & 1 ? 32 : -32, y: k & 2 ? 32 : -32, z: k & 4 ? 32 : -32 })),
    { x: 0, y: 0, z: 0 },
  ],
  /* Chaos — scattered but balanced */
  [
    ...byOrd(
      (k) =>
        [
          { x: 58, y: -10, z: 22 },
          { x: -40, y: -42, z: -26 },
          { x: 16, y: -56, z: 40 },
          { x: -60, y: 8, z: -6 },
          { x: 42, y: 36, z: -44 },
          { x: -14, y: 54, z: 18 },
          { x: -44, y: -16, z: 46 },
          { x: 12, y: 24, z: -54 },
        ][k],
    ),
    { x: 0, y: 0, z: 0 },
  ],
];

/* ── the orbit cards (decor — never intercept scroll) ───────────── */

function MiniMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 113.01 113.01" fill="currentColor" className={className} aria-hidden="true">
      {OUTER_DOTS.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={RD} />
      ))}
      <circle cx={CX} cy={CY} r={RD} />
    </svg>
  );
}

const TILE_SHADOW = '0 18px 50px rgba(14,14,12,.30)';
const INK_LINE = 'rgba(14,14,12,.08)';
/* The closing graph — scattered sources in (left), BrandingOS as the
   one structured source (centre), everything created from it (right).
   Labels only; geometry lives in the JSX viewBox. */
const OUTRO_IN = [
  'Strategy docs',
  'Logo folders',
  'Guideline PDFs',
  'Design files',
  'Tone of voice notes',
  "People's memory",
];
const OUTRO_OUT = [
  'Campaigns',
  'Social & content',
  'Templates',
  'Presentations',
  'AI output',
];

/* Start state: statement + mark are ONE group riding below the
   screen's middle (owner-tuned) — copy centre at 41vh (see COPY_POS),
   mark centre at 50 + LIFT_START_VH = 68vh. As the copy bows out the
   mark rises the short distance to its orbit seat at centre. */
const LIFT_START_VH = 21;
const LIFT_ORBIT_VH = -4;

/* The in-core statement lives inline in the JSX now — the word
   BrandingOS is the real wordmark (outlined master), not live text. */

export function FitLines({ lines, maxWidth }: { lines: string[]; maxWidth: number }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [fit, setFit] = useState<number[] | null>(null);
  const [vw, setVw] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    const run = () => {
      const els = lines.map((_, i) => refs.current[i]);
      if (els.some((el) => !el)) return;
      const target = Math.min(vw - 48, maxWidth);
      const range = document.createRange();
      // Range measures the glyphs themselves — a block span's own width
      // is stretched to the widest sibling, so scrollWidth lies here.
      const widthAt = (el: HTMLSpanElement, size: number) => {
        el.style.fontSize = `${size}px`;
        range.selectNodeContents(el);
        return range.getBoundingClientRect().width || 1;
      };
      const next = els.map((el) => {
        // Glyph advances don't scale perfectly linearly with font-size,
        // so refine once at the estimated size before settling.
        let f = (100 * target) / widthAt(el!, 100);
        f = (f * target) / widthAt(el!, f);
        // Applied directly — if the computed sizes are unchanged, React
        // skips the re-render and the probe size would otherwise stick.
        el!.style.fontSize = `${f}px`;
        return f;
      });
      setFit(next);
    };
    run();
    // The mount-time fit measures the fallback face — refit once the
    // real fonts are in, or the per-line widths drift a few percent.
    let stale = false;
    document.fonts?.ready.then(() => {
      if (!stale) run();
    });
    return () => {
      stale = true;
    };
  }, [vw, lines, maxWidth]);

  return (
    <p className="font-display font-medium" aria-label={lines.join(' ')}>
      {lines.map((line, i) => (
        <span
          key={line}
          ref={(el) => {
            refs.current[i] = el;
          }}
          aria-hidden="true"
          className="block whitespace-nowrap leading-[1.14]"
          style={{ fontSize: fit ? `${fit[i]}px` : undefined }}
        >
          {line}
        </span>
      ))}
    </p>
  );
}

/* One shared spin keeps the ring evenly spread; variety comes from
   radius, height band and a small independent bob. yOff bands sit
   clear of the mark and are pushed further out while a card crosses
   the front/back of the ring, so nothing slides across the mark. */
const CARDS: {
  rMul: number;
  phase: number;
  yOff: number;
  enter: number;
  node: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}[] = [
  {
    rMul: 1.06, phase: 0.0, yOff: -210, enter: 0,
    className: 'flex h-[150px] w-[232px] items-end p-3.5',
    style: {
      background:
        'radial-gradient(120px 90px at 78% 18%, rgba(255,255,255,.28), transparent 60%),' +
        'radial-gradient(160px 120px at 12% 88%, rgba(20,60,28,.55), transparent 65%),' +
        'linear-gradient(135deg,#2E5A33,#54815A 55%,#3C6B42)',
    },
    node: (
      <span className="inline-flex items-center gap-[7px] rounded-full bg-white px-[13px] py-[7px] text-xs font-semibold text-[#0E0E0C] shadow-[0_4px_14px_rgba(14,14,12,.12)]">
        <span className="h-[7px] w-[7px] rounded-full bg-[#4C8A4F]" />
        Content Guidelines
      </span>
    ),
  },
  {
    rMul: 0.94, phase: 0.125, yOff: 250, enter: 1,
    className: 'grid h-[168px] w-[168px] place-items-center bg-[#101010]',
    node: <MiniMark className="h-16 w-16 text-[#F2F0EB]" />,
  },
  {
    rMul: 1.12, phase: 0.25, yOff: -255, enter: 2,
    className: 'flex w-[196px] items-center gap-[11px] !rounded-full bg-white px-4 py-3 text-[#0E0E0C]',
    node: (
      <>
        <span
          className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-xs font-semibold"
          style={{ border: `1.5px solid ${INK_LINE}` }}
        >
          7
        </span>
        <span className="text-[13px] font-semibold">Brand Voice</span>
      </>
    ),
  },
  {
    rMul: 1.0, phase: 0.375, yOff: 240, enter: 3,
    className: 'w-[196px] bg-white p-4 text-[#0E0E0C]',
    node: (
      <>
        <span className="mb-3 flex gap-2">
          {['#141413', '#F2F0EB', '#C96F4A', '#7A8B6F', '#9FB4C7'].map((c) => (
            <span
              key={c}
              className="h-[26px] w-[26px] rounded-full"
              style={{ background: c, border: '1px solid rgba(14,14,12,.08)' }}
            />
          ))}
        </span>
        <span className="text-xs font-semibold">
          Colors<span className="ml-1.5 font-normal text-[rgba(14,14,12,.45)]">· 5 roles</span>
        </span>
      </>
    ),
  },
  {
    rMul: 1.16, phase: 0.5, yOff: -200, enter: 4,
    className: 'flex w-[236px] items-start gap-2.5 !rounded-[14px] bg-white px-3.5 py-3 text-[#0E0E0C]',
    node: (
      <>
        <span
          className="h-[30px] w-[30px] flex-none rounded-full"
          style={{ background: 'conic-gradient(from 210deg,#C96F4A,#E5B98A,#7A8B6F,#C96F4A)' }}
        />
        <span>
          <span className="text-[11.5px] font-semibold">sara_m</span>
          <span className="mt-0.5 block text-[12.5px]">
            🔥 finally on-brand
            <i className="ml-1.5 text-[11px] not-italic text-[rgba(14,14,12,.45)]">2h</i>
          </span>
        </span>
      </>
    ),
  },
  {
    rMul: 0.9, phase: 0.625, yOff: 230, enter: 5,
    className: 'h-[152px] w-[244px] bg-white text-[#0E0E0C]',
    node: (
      <>
        <span
          className="flex h-6 items-center gap-[5px] px-2.5"
          style={{ borderBottom: `1px solid ${INK_LINE}` }}
        >
          {[0, 1, 2].map((i) => (
            <i key={i} className="block h-1.5 w-1.5 rounded-full" style={{ background: INK_LINE }} />
          ))}
        </span>
        <span className="flex gap-3 px-3.5 py-3">
          <MiniMark className="h-[34px] w-[34px] flex-none" />
          <span>
            {[120, 150, 96].map((w) => (
              <i
                key={w}
                className="mb-[7px] block h-[7px] rounded"
                style={{ width: w, background: 'rgba(14,14,12,.05)' }}
              />
            ))}
          </span>
        </span>
      </>
    ),
  },
  {
    rMul: 1.08, phase: 0.75, yOff: -240, enter: 6,
    className: 'flex h-[150px] w-[150px] flex-col justify-between bg-white px-4 py-3.5 text-[#0E0E0C]',
    node: (
      <>
        <span className="text-[56px] leading-none tracking-[-0.03em]">
          <em className="not-italic [font-family:Georgia,'Times_New_Roman',serif]">A</em>a
        </span>
        <span className="text-[11.5px] font-semibold text-[rgba(14,14,12,.45)]">Typography</span>
      </>
    ),
  },
  {
    rMul: 0.98, phase: 0.875, yOff: 200, enter: 7,
    className: 'flex h-[220px] w-[178px] items-end p-3',
    style: {
      background:
        'radial-gradient(130px 100px at 30% 20%, rgba(255,220,170,.75), transparent 60%),' +
        'radial-gradient(180px 140px at 75% 85%, rgba(90,40,30,.6), transparent 65%),' +
        'linear-gradient(160deg,#D9995F,#A65B3F 55%,#5C3230)',
    },
    node: (
      <span className="inline-flex items-center rounded-full bg-white px-[13px] py-[7px] text-xs font-semibold text-[#0E0E0C] shadow-[0_4px_14px_rgba(14,14,12,.12)]">
        Imagery
      </span>
    ),
  },
];

/* ── the shared first-frame composition ─────────────────────────── */

const MARK_W = 'w-[min(40vh,300px)] md:w-[min(56vh,520px)]';
/* outer wrapper owns the group seat; the fading inner block owns its
   own transform, so the two never fight over one transform slot */
const COPY_POS = 'absolute left-0 right-0 top-[41vh] -translate-y-1/2';
const COPY_INNER = 'flex flex-col items-center px-6 text-center';

/* ── the stage ──────────────────────────────────────────────────── */

export function OrbitStage({ progress }: { progress: MotionValue<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const circleEls = useRef<(SVGCircleElement | null)[]>([]);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();

  /* formation morph state — clicking retargets from wherever the dots
     ARE, so rapid clicks never snap */
  const morph = useRef({
    toIdx: 0,
    morphT: 1,
    kickV: 0,
    idleA: 0,
    liftNow: 0,
    fromPts: FORMS[0].map((q) => ({ ...q })),
    curPts: FORMS[0].map((q) => ({ ...q })),
  });
  const cycleForm = () => {
    const st = morph.current;
    if (st.liftNow < 0.05) return; // at rest the mark is untouchable
    st.fromPts = st.curPts.map((q) => ({ ...q }));
    st.toIdx = (st.toIdx + 1) % FORMS.length;
    st.morphT = 0;
    st.kickV = 1.1; // a little spin kick on every switch
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;

    let pS = 0;
    let lastT: number | null = null;
    let mx = 0, my = 0, mxS = 0, myS = 0; // mouse tilt, smoothed
    let raf = 0;
    let running = false;

    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / innerWidth) * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMouse);

    const render = (p: number, t: number, dt: number) => {
      /* phase map — the mark alone owns both ends:
         0.00–0.06 base form · 0.06–0.16 lift (cards enter) ·
         0.05–0.90 spin (two revolutions) · 0.80–0.92 lift out ·
         0.90–1.00 final form, locked, scaled up a touch */
      const st = morph.current;
      const lift = ease(clamp01((p - 0.06) / 0.1)) * (1 - ease(clamp01((p - 0.8) / 0.12)));
      const sp = ease(clamp01((p - 0.05) / 0.85));

      /* the whole scene is the click target while the mark is lifted —
         hit-testing a small square inside a tilting 3D world misses */
      st.liftNow = lift;
      sceneRef.current?.classList.toggle('cursor-pointer', lift > 0.05);
      /* at rest the mark is ALWAYS the base form: any chosen formation
         resets (invisible — everything is blended out at lift 0), so
         the next lift starts canonical */
      if (lift < 0.02 && st.toIdx !== 0) {
        st.toIdx = 0;
        st.morphT = 1;
        st.fromPts = FORMS[0].map((q) => ({ ...q }));
        FORMS[0].forEach((q, i) => {
          st.curPts[i] = { ...q };
        });
      }

      /* the idle turn (+ click kicks) is an accumulator: whenever the
         mark is descending toward EITHER rest (settle = 1 − lift, so it
         covers coming back up too — a residual angle at the top skews
         the flat mark: ring turned, core looking off-centre) it GLIDES
         to the nearest half-turn (the mark is π-symmetric, so that
         reads locked) — max 90° of gentle correction, never a fast
         self-righting spin */
      const settle = 1 - lift;
      st.idleA += dt * (0.18 + st.kickV) * lift * (1 - settle);
      st.kickV *= Math.exp(-dt * 2.4); // click spin kick, decaying
      const near = Math.round(st.idleA / Math.PI) * Math.PI;
      st.idleA += (near - st.idleA) * Math.min(1, dt * 4 * settle);
      if (settle > 0.999 && Math.abs(near - st.idleA) < 0.01) st.idleA = near;
      const rotY = sp * TAU * 2 + st.idleA;
      const rotX = (0.22 * Math.sin(sp * TAU) - 0.1) * lift;

      /* v4: cards don't fade into nothing — they dive INTO the mark,
         one after another, and the mark takes a tiny gulp as each one
         lands */
      let gulp = 0;
      const exs = CARDS.map((cd) => {
        const ex = ease(clamp01((p - (0.55 + cd.enter * 0.018)) / 0.32));
        gulp += Math.exp(-(((ex - 0.88) / 0.06) ** 2));
        return ex;
      });
      const markScale =
        1 + 0.13 * ease(clamp01((p - 0.88) / 0.12)) + 0.022 * gulp;

      /* mark — rotate the 9 dots in 3D, perspective-project, z-sort */
      const sinY = Math.sin(rotY), cosY = Math.cos(rotY);
      const sinX = Math.sin(rotX), cosX = Math.cos(rotX);
      st.morphT = Math.min(1, st.morphT + dt / 0.8);
      const mE = ease(st.morphT);
      const form = FORMS[st.toIdx];
      const pts: { i: number; x: number; y: number; z: number }[] = [];
      for (let i = 0; i < 9; i++) {
        const cur = {
          x: lerp(st.fromPts[i].x, form[i].x, mE),
          y: lerp(st.fromPts[i].y, form[i].y, mE),
          z: lerp(st.fromPts[i].z, form[i].z, mE),
        };
        st.curPts[i] = cur;
        const fx = i < 8 ? GEO[i].x - CX : 0;
        const fy = i < 8 ? GEO[i].y - CY : 0;
        pts.push({
          i,
          x: CX + lerp(fx, cur.x, lift),
          y: CY + lerp(fy, cur.y, lift),
          z: cur.z * lift,
        });
      }
      const proj = pts.map((pt) => {
        const dx = pt.x - CX, dy = pt.y - CY;
        const xr = dx * cosY + pt.z * sinY;
        let zr = -dx * sinY + pt.z * cosY;
        const yr = dy * cosX - zr * sinX;
        zr = dy * sinX + zr * cosX;
        const s = CAM / (CAM - zr);
        return {
          px: CX + xr * s * markScale,
          py: CY + yr * s * markScale,
          r: RD * s * markScale,
          z: zr,
          o: 0.5 + 0.5 * clamp01((zr / 30 + 1) / 2),
        };
      });
      proj.sort((a, b) => a.z - b.z);
      proj.forEach((q, k) => {
        const c = circleEls.current[k];
        if (!c) return;
        c.setAttribute('cx', String(q.px));
        c.setAttribute('cy', String(q.py));
        c.setAttribute('r', String(Math.max(0, q.r)));
        c.setAttribute('opacity', String(lerp(1, q.o, lift)));
      });

      /* world tilt toward the cursor (mark + cards together). The mark
         starts below the centred statement and rises to its orbit seat
         while the copy bows out — one logo, no handoff. */
      const intro = ease(clamp01((p - 0.03) / 0.09));
      if (worldRef.current) {
        // The final lock rides a little higher so the closing block
        // below gets clear air off the mark.
        const endUp = 4 * ease(clamp01((p - 0.86) / 0.12));
        const liftVh =
          LIFT_START_VH + (LIFT_ORBIT_VH - LIFT_START_VH) * intro - endUp;
        worldRef.current.style.transform = `translateY(${liftVh.toFixed(2)}vh) rotateX(${(-myS * 6).toFixed(2)}deg) rotateY(${(mxS * 7).toFixed(2)}deg)`;
      }

      /* cards — one shared orbit; the ring is elliptical (wide in x,
         shallower in z) so side cards frame the mark */
      const Rx = Math.min(innerWidth * 0.38, 620);
      const Rz = Math.min(innerWidth * 0.24, 340);
      CARDS.forEach((cd, ci) => {
        const el = cardEls.current[ci];
        if (!el) return;
        const en = ease(clamp01((p - (0.1 + cd.enter * 0.018)) / 0.09));
        const ex = exs[ci];
        if (en <= 0.001 || ex >= 0.999) {
          el.style.visibility = 'hidden';
          return;
        }
        el.style.visibility = 'visible';
        const a = cd.phase * TAU + sp * TAU + t * 0.05;
        const sA = Math.sin(a), cA = Math.cos(a);
        /* absorption: an accelerating pull off the orbit into the
           centre — the card shrinks as it dives and only fades on the
           last stretch, as it slips inside the mark */
        const suck = ex * ex;
        const x = cA * Rx * cd.rMul * (1 - suck);
        const z = sA * Rz * cd.rMul * (1 - suck);
        /* push the vertical band outward while crossing front/back */
        const y =
          (cd.yOff * (innerHeight / 900) * (0.55 + 0.55 * Math.abs(sA)) +
            Math.sin(t * 0.8 + cd.enter * 1.7) * 7) *
          (1 - suck);
        const front = clamp01((z / (Rz * cd.rMul) + 1) / 2);
        /* fully opaque unless genuinely behind the mark */
        const dim = 0.38 + 0.62 * ease(clamp01(front / 0.55));
        const fade = 1 - ease(clamp01((ex - 0.72) / 0.28));
        el.style.transform =
          `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px)` +
          ` rotate(${(Math.sin(t * 0.5 + cd.enter) * 1.6).toFixed(2)}deg)` +
          ` scale(${((0.72 + 0.28 * en) * (1 - 0.9 * suck)).toFixed(3)})`;
        el.style.opacity = (en * Math.min(1, dim) * fade).toFixed(3);
      });

      /* the statement bows out as the orbit takes over */
      if (copyRef.current) {
        copyRef.current.style.opacity = String(1 - intro);
        copyRef.current.style.transform = `translateY(${(-18 * intro).toFixed(1)}px)`;
      }
      /* the closing line */
      if (outroRef.current) outroRef.current.style.opacity = String(ease(clamp01((p - 0.93) / 0.07)));
    };

    const frame = (now: number) => {
      const dt = lastT != null ? Math.min(0.1, (now - lastT) / 1000) : 1 / 60;
      lastT = now;
      // Progress arrives from the Hero's combined track: pinned at 0
      // through the whole dive, 0→1 across the orbit stretch.
      const raw = clamp01(progress.get());
      pS += (raw - pS) * Math.min(1, dt * 8); // buttery scrub
      mxS += (mx - mxS) * Math.min(1, dt * 6);
      myS += (my - myS) * Math.min(1, dt * 6);
      render(pS, now / 1000, dt);
      raf = requestAnimationFrame(frame);
    };

    // Only burn frames while the stage is actually on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        lastT = null;
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
      window.removeEventListener('mousemove', onMouse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden">
      {/* scene — perspective container; the whole scene is the morph
          click target while the mark is lifted (class toggled per-frame) */}
      <div
        ref={sceneRef}
        onClick={reduced ? undefined : cycleForm}
        className="relative grid h-full w-full place-items-center [perspective:1100px]"
      >
            <div
              ref={worldRef}
              style={{ transform: `translateY(${LIFT_START_VH}vh)` }}
              className="relative grid h-full w-full place-items-center [transform-style:preserve-3d] [transition:transform_.22s_ease-out]"
            >
              {/* the live mark — 9 circles driven per-frame */}
              <div className={`${MARK_W} [transform:translateZ(0)]`} aria-hidden="true">
                <svg
                  viewBox="-56.5 -56.5 226.01 226.01"
                  className="block w-full overflow-visible text-panel-foreground"
                  fill="currentColor"
                >
                  {Array.from({ length: 9 }, (_, k) => (
                    <circle
                      key={k}
                      ref={(el) => {
                        circleEls.current[k] = el;
                      }}
                      cx={k < 8 ? GEO[k].x : CX}
                      cy={k < 8 ? GEO[k].y : CY}
                      r={RD}
                    />
                  ))}
                </svg>
              </div>

              {/* orbit cards (hidden until they enter) */}
              {!reduced &&
                CARDS.map((cd, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      cardEls.current[i] = el;
                    }}
                    aria-hidden="true"
                    className={`pointer-events-none invisible absolute left-1/2 top-1/2 overflow-hidden rounded-[16px] will-change-[transform,opacity] ${cd.className ?? ''}`}
                    style={{ boxShadow: TILE_SHADOW, ...cd.style }}
                  >
                    {cd.node}
                  </div>
                ))}
            </div>

            {/* the statement — dead centre, the mark below it. One flat
                size for all lines (owner call — no width-matching). */}
            <div className={COPY_POS}>
              <div ref={copyRef} className={COPY_INNER}>
                <span className="microlabel opacity-60">Inside the core</span>
                <p className="font-display mt-5 text-xl font-medium leading-snug md:text-4xl">
                  <span className="block md:whitespace-nowrap">
                    Most brands live in files.{' '}
                    {/* live text in the logotype's own face */}
                    <span className="font-bold [font-family:'Funnel_Display',sans-serif]">
                      BrandingOS
                    </span>{' '}
                    turns yours into a system,
                  </span>
                  <span className="block md:whitespace-nowrap">
                    so everything you make comes out right the first time.
                  </span>
                </p>
              </div>
            </div>

            {/* the closing statement — centred under the locked mark */}
            <div
              ref={outroRef}
              className="absolute bottom-[15vh] left-0 right-0 mx-auto max-w-4xl px-6 text-center opacity-0"
            >
              <p className="font-display text-2xl font-semibold leading-tight md:text-4xl">
                Not a folder your brand sits in. A system it runs on.
              </p>
              <p className="mx-auto mt-5 max-w-[820px] font-display text-base font-medium leading-relaxed text-panel-foreground/70 md:text-lg">
                Strategy, identity, rules, and assets connected in one place,
                so every person, template, and tool creating for your brand
                starts from the same truth, without being told what it is.
              </p>
            </div>
      </div>
    </div>
  );
}

/* ── Parked: the scattered→system graph (owner: reuse in a later
   section). Self-contained presentational block — mount anywhere. ── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ScatteredToSystemBlock({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* the question — title, left-aligned */}
      <div className="text-left">
        <p className="text-sm font-medium leading-snug text-panel-foreground/60 md:text-base">
          Every new hire, freelancer, template, and AI tool starts with the
          same question:
        </p>
        <p className="font-display mt-1.5 text-lg font-semibold leading-snug md:text-2xl">
          what does this brand actually look and sound like?
        </p>
      </div>

      {/* scattered sources in → one structured source → created from it */}
      <svg
        viewBox="0 0 900 340"
        aria-hidden="true"
        className="font-display mx-auto mt-5 w-full max-w-[660px] overflow-visible"
      >
                <defs>
                  <marker
                    id="outro-arrow"
                    viewBox="0 0 8 8"
                    refX="7" refY="4"
                    markerWidth="7" markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 8 4 L 0 8" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
                  </marker>
                </defs>

                {/* column headers */}
                <text
                  x="110" y="16" textAnchor="middle"
                  fontSize="10.5" fontWeight="600" letterSpacing="2"
                  fill="currentColor" opacity="0.5"
                >
                  SCATTERED TODAY
                </text>
                <text
                  x="790" y="16" textAnchor="middle"
                  fontSize="10.5" fontWeight="600" letterSpacing="2"
                  fill="currentColor" opacity="0.5"
                >
                  CREATED FROM IT
                </text>

                {OUTRO_IN.map((label, i) => {
                  const yc = 48 + i * 50;
                  return (
                    <g key={label}>
                      <path
                        d={`M 200 ${yc} C 280 ${yc} 300 173 363 173`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        opacity="0.28"
                      />
                      <rect
                        x="20" y={yc - 18} width="180" height="36" rx="10"
                        fill="none" stroke="currentColor" strokeWidth="1.2"
                        opacity="0.5"
                      />
                      <text
                        x="110" y={yc + 4.5} textAnchor="middle"
                        fontSize="13" fontWeight="600"
                        fill="currentColor"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {OUTRO_OUT.map((label, i) => {
                  const yc = 73 + i * 50;
                  return (
                    <g key={label}>
                      <path
                        d={`M 537 173 C 600 173 620 ${yc} 696 ${yc}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        opacity="0.28"
                        markerEnd="url(#outro-arrow)"
                      />
                      <rect
                        x="700" y={yc - 18} width="180" height="36" rx="10"
                        fill="none" stroke="currentColor" strokeWidth="1.2"
                        opacity="0.5"
                      />
                      <text
                        x="790" y={yc + 4.5} textAnchor="middle"
                        fontSize="13" fontWeight="600"
                        fill="currentColor"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* the hub — the one filled node, the answer itself */}
                <rect
                  x="365" y="145" width="170" height="56" rx="14"
                  fill="currentColor"
                />
                <text
                  x="450" y="169" textAnchor="middle"
                  fontSize="15" fontWeight="700"
                  style={{ fill: 'hsl(var(--panel))' }}
                >
                  BrandingOS
                </text>
                <text
                  x="450" y="187" textAnchor="middle"
                  fontSize="10" fontWeight="600" letterSpacing="0.4"
                  style={{ fill: 'hsl(var(--panel))' }}
                  opacity="0.65"
                >
                  One structured source
                </text>
              </svg>

      {/* the resolution */}
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-panel-foreground/55 md:text-base">
        Everything created after that starts from it, instead of guessing at
        it.
      </p>
    </div>
  );
}
