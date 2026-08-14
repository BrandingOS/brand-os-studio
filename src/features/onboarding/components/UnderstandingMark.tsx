/**
 * The mark, assembling.
 *
 * Built from `BrandMark`'s exported geometry — `RING_CENTRES` and `CORE_CENTRE`
 * — rather than a copy of its path data, so there is still exactly one
 * description of the logo in the codebase. What this owns is the behaviour:
 * what the nodes MEAN here, and how the thing comes together.
 *
 * The motion is deliberate rather than decorative, and each part earns its
 * place by saying something true:
 *
 *   the core breathes            the brand exists before anything is known
 *                                about it — it was created at the naming step
 *   a spoke DRAWS outward        we reached for something
 *   the node lands and rings     we found it, and that stage's work is done
 *   the halo widens as it fills  the system is becoming more than its centre
 *
 * No particles, no sparkles, no percentage. Everything stops under
 * `prefers-reduced-motion`: the nodes still light, they simply arrive.
 */
import { CORE_CENTRE, RING_CENTRES } from '@/shared/ds';

/** The dot radius the mark is drawn with, in its own 113-unit box. */
const R = 11.13;

export interface UnderstandingMarkProps {
  /** Node indices lit so far, 0–7 clockwise from top-left. */
  active: readonly number[];
  size?: number;
}

export function UnderstandingMark({ active, size = 200 }: UnderstandingMarkProps) {
  const lit = new Set(active);
  const progress = lit.size / RING_CENTRES.length;

  return (
    <div className="onb-mark" aria-hidden="true">
      <svg viewBox="-14 -14 141 141" width={size} height={size} className="onb-mark-svg">
        <defs>
          <radialGradient id="onb-halo">
            <stop offset="0%" stopColor="var(--ds-accent)" stopOpacity="0.16" />
            <stop offset="55%" stopColor="var(--ds-accent)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Widens as the system fills. The only thing here that tracks how much
            is known — and it is a shape, never a number. */}
        <circle
          className="onb-halo"
          cx={CORE_CENTRE.x}
          cy={CORE_CENTRE.y}
          r={34 + progress * 30}
          fill="url(#onb-halo)"
        />

        {RING_CENTRES.map((p, i) => {
          const on = lit.has(i);
          return (
            <line
              key={`spoke-${i}`}
              className={`onb-spoke${on ? ' is-on' : ''}`}
              x1={CORE_CENTRE.x}
              y1={CORE_CENTRE.y}
              x2={p.x}
              y2={p.y}
            />
          );
        })}

        {RING_CENTRES.map((p, i) => {
          const on = lit.has(i);
          return (
            <g key={`node-${i}`} className={`onb-node${on ? ' is-on' : ''}`}>
              {/* A single ring that expands and fades once, at the moment of
                  arrival. It is the "found it" beat. */}
              {on && <circle className="onb-node-ring" cx={p.x} cy={p.y} r={R} />}
              <circle className="onb-node-dot" cx={p.x} cy={p.y} r={R} />
            </g>
          );
        })}

        <circle className="onb-core" cx={CORE_CENTRE.x} cy={CORE_CENTRE.y} r={R} />
      </svg>
    </div>
  );
}
