/**
 * BrandingOS logomark — 9 nodes / 1 core.
 *
 * Geometry lifted verbatim from the master `logo-icon.svg`
 * (viewBox 0 0 113.01 113.01, dot radius 11.13). The core node sits at
 * the exact centre of the viewBox — which is what makes the hero's
 * enter-the-core zoom mathematically clean: scaling the mark about its
 * own centre keeps the core pinned in place.
 */

export const MARK_VIEW = 113.01;
export const DOT_R = 11.13;

/** Core node (N05) — exact centre of the mark. */
export const CORE_DOT = { x: 56.51, y: 56.5 };

/** The 8 outer nodes, an octagonal orbit around the core. */
export const OUTER_DOTS = [
  { x: 78.34, y: 11.13 },
  { x: 101.88, y: 34.67 },
  { x: 34.68, y: 11.13 },
  { x: 78.34, y: 101.88 },
  { x: 34.68, y: 101.88 },
  { x: 11.13, y: 34.67 },
  { x: 101.88, y: 78.33 },
  { x: 11.13, y: 78.33 },
];

/** Fraction of the mark's width taken by the core dot's radius. */
export const CORE_R_FRAC = DOT_R / MARK_VIEW;

interface LogoMarkProps {
  className?: string;
  /** Render the centre core dot (true everywhere except the hero,
   *  where the dark reveal layer plays the core's role). */
  withCore?: boolean;
  /** Slow idle breathing on the outer dots. */
  breathe?: boolean;
}

export function LogoMark({ className, withCore = true, breathe = false }: LogoMarkProps) {
  return (
    <svg
      viewBox={`0 0 ${MARK_VIEW} ${MARK_VIEW}`}
      // overflow-visible: breathing scales dots past the viewBox edge —
      // the svg must never clip its own mark
      style={{ overflow: 'visible' }}
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {OUTER_DOTS.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={DOT_R}
          className={breathe ? 'dot-breathe' : undefined}
          style={breathe ? { animationDelay: `${i * 0.55}s` } : undefined}
        />
      ))}
      {withCore && <circle cx={CORE_DOT.x} cy={CORE_DOT.y} r={DOT_R} />}
    </svg>
  );
}
