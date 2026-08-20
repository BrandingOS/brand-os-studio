/**
 * Radar Pulse — lab variant 15 from new-ui/logo-motion, verbatim.
 *
 * Two wavefronts expand from the core on a 2.2s period; each one makes
 * the outer ring shiver as it passes through, and the core kicks as a
 * new front is born. Ambient LOOP — runs only while `active` (the hero
 * mounts it inside the clipped reveal layer, so it would otherwise burn
 * rAF frames while invisible).
 */
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CORE_DOT, DOT_R, MARK_VIEW, OUTER_DOTS } from './LogoMark';

const CX = CORE_DOT.x;
const CY = CORE_DOT.y;
const RING_R = Math.hypot(OUTER_DOTS[0].x - CX, OUTER_DOTS[0].y - CY);

/* Lab timing: wavefront period (s) and max radius — fronts fade out
   past the mark's edge, so the svg must never clip (overflow visible). */
const P = 2.2;
const FRONT_MAX = 118;

interface RadarPulseMarkProps {
  className?: string;
  /** Drive the loop only while the mark is actually on screen. */
  active?: boolean;
}

export function RadarPulseMark({ className, active = true }: RadarPulseMarkProps) {
  const ringEls = useRef<(SVGCircleElement | null)[]>([]);
  const dotEls = useRef<(SVGCircleElement | null)[]>([]);
  const coreEl = useRef<SVGCircleElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active || reduced) return;

    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = (now - t0) / 1000;

      const radii = [0, 1].map((k) => {
        const q = ((t + (k * P) / 2) % P) / P;
        const rad = q * FRONT_MAX;
        const ring = ringEls.current[k];
        if (ring) {
          ring.setAttribute('r', String(Math.max(0.01, rad)));
          ring.setAttribute('opacity', String(q < 0.04 ? 0 : (1 - q) * 0.35));
        }
        return rad;
      });

      // All outer dots share one orbit radius, so the shiver is shared too.
      const bump = Math.max(
        ...radii.map((rad) => Math.exp(-(((rad - RING_R) / 13) ** 2))),
      );
      dotEls.current.forEach((el) => {
        if (!el) return;
        el.setAttribute('r', String(DOT_R * (1 + 0.22 * bump)));
        el.setAttribute('opacity', String(0.55 + 0.45 * bump));
      });

      const cb = Math.max(
        ...radii.map((rad) => Math.exp(-(((rad - 4) / 10) ** 2))),
      );
      coreEl.current?.setAttribute('r', String(DOT_R * (1 + 0.22 * cb)));

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      // Rest pose — never freeze mid-pulse.
      ringEls.current.forEach((ring) => ring?.setAttribute('opacity', '0'));
      dotEls.current.forEach((el) => {
        el?.setAttribute('r', String(DOT_R));
        el?.setAttribute('opacity', '1');
      });
      coreEl.current?.setAttribute('r', String(DOT_R));
    };
  }, [active, reduced]);

  return (
    <svg
      viewBox={`0 0 ${MARK_VIEW} ${MARK_VIEW}`}
      style={{ overflow: 'visible' }}
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* wavefronts sit UNDER the dots, as in the lab's `ctx.under` layer */}
      {[0, 1].map((k) => (
        <circle
          key={k}
          ref={(el) => {
            ringEls.current[k] = el;
          }}
          cx={CX}
          cy={CY}
          r={0.01}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          opacity={0}
        />
      ))}
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
    </svg>
  );
}
