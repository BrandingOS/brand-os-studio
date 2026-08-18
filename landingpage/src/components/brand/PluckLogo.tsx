/**
 * PluckLogo — the navbar mark, static at rest; clicking it plays ONE
 * cycle of "Pluck Wave" (variant 47 from new-ui/logo-motion/motion.js,
 * physics ported verbatim): one dot gets plucked, the disturbance
 * travels the ring with exponential decay, the core wobbles late.
 *
 * The click is the go-home gesture — the wave plays while the page
 * glides back to the top (swap the scroll for a route navigation once
 * real routing exists).
 */
import { useEffect, useRef } from 'react';
import {
  CORE_DOT,
  DOT_R,
  MARK_VIEW,
  OUTER_DOTS,
} from '@/components/brand/LogoMark';

/* Geometry derived exactly like the motion lab */
const CX = CORE_DOT.x;
const CY = CORE_DOT.y;
const D = OUTER_DOTS.map(({ x, y }) => ({
  x,
  y,
  a: Math.atan2(y - CY, x - CX),
}));
const R = Math.hypot(D[0].x - CX, D[0].y - CY); // ≈ 50.35, shared
const RING = [...D.keys()].sort((i, j) => D[i].a - D[j].a);
const ORD: number[] = [];
RING.forEach((di, k) => {
  ORD[di] = k;
});

const CYCLE = 2.6; // seconds — one full pluck + settle

export function PluckLogo({
  className,
  onActivate,
}: {
  className?: string;
  /** Called on click alongside the wave (e.g. scroll home / navigate). */
  onActivate?: () => void;
}) {
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const coreRef = useRef<SVGCircleElement | null>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const rest = () => {
    D.forEach((d, i) => {
      const c = dotRefs.current[i];
      if (c) {
        c.setAttribute('cx', String(d.x));
        c.setAttribute('cy', String(d.y));
      }
    });
    coreRef.current?.setAttribute('r', String(DOT_R));
  };

  const play = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const pluck = 0; // one-shot: always pluck the same node

    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      if (t >= CYCLE) {
        rest();
        return;
      }
      // — verbatim Pluck Wave physics —
      D.forEach((d, i) => {
        const raw = Math.abs(ORD[i] - pluck);
        const dist = Math.min(raw, 8 - raw);
        const s = t - 0.05 - dist * 0.1;
        const disp =
          s > 0
            ? 13 * Math.pow(0.55, dist) * Math.exp(-s * 3) * Math.sin(s * 13)
            : 0;
        const c = dotRefs.current[i];
        if (c) {
          c.setAttribute('cx', String(CX + Math.cos(d.a) * (R + disp)));
          c.setAttribute('cy', String(CY + Math.sin(d.a) * (R + disp)));
        }
      });
      const sc = t - 0.45;
      const wobble = sc > 0 ? 0.1 * Math.exp(-sc * 3) * Math.sin(sc * 13) : 0;
      coreRef.current?.setAttribute('r', String(DOT_R * (1 + wobble)));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  return (
    <a
      href="/"
      aria-label="BrandingOS — home"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        play();
        onActivate?.();
      }}
    >
      {/* overflow-visible: the wave displaces dots ~9 units past the
          viewBox — never let the svg clip them (the bar has plenty of
          room around the mark). */}
      <svg
        viewBox={`0 0 ${MARK_VIEW} ${MARK_VIEW}`}
        className="h-full w-full overflow-visible"
        fill="currentColor"
        aria-hidden="true"
      >
        {D.map((d, i) => (
          <circle
            key={i}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            cx={d.x}
            cy={d.y}
            r={DOT_R}
          />
        ))}
        <circle ref={coreRef} cx={CX} cy={CY} r={DOT_R} />
      </svg>
    </a>
  );
}
