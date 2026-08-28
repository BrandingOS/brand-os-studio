import React from 'react';

/**
 * The BrandingOS mark: eight ring dots around a steady centre dot.
 * `loading` fades the ring dots in sequence (1.2s, system easing) — this is
 * the product's loader at every size. Never use a generic ring spinner.
 *
 * `idle` is the OTHER animation: a slow orbit for a mark that is simply sitting
 * there being the product's logo. It must never be confused with `loading` — a
 * logo that permanently wears the loader tells the user the app is permanently
 * busy — so the two are deliberately unalike. The loader is fast and dips the
 * dots to near-nothing in sequence; the idle turn is twenty seconds for a
 * quarter of a revolution and touches no opacity at all. The mark has eight-fold
 * rotational symmetry, so the turn reads as a drift rather than a spin.
 *
 * `activeNodes` lights a SUBSET of the ring instead, with optional spokes to
 * the centre. It exists because the mark is the only place this geometry
 * lives, and a caller that needs per-node control would otherwise copy the
 * nine paths into its own component — two copies of the brand mark in one
 * codebase, guaranteed to drift. Lighting a subset of the mark's own nodes is
 * generic and product-agnostic, so it belongs here; what those nodes MEAN
 * belongs to the caller.
 */

const RING_DOTS = [
  { d: 'M78.34,0c-6.14,0-11.13,4.99-11.13,11.13s4.99,11.13,11.13,11.13,11.13-4.99,11.13-11.13S84.47,0,78.34,0Z', delay: 0.15 },
  { d: 'M101.88,45.8c6.14,0,11.13-4.99,11.13-11.13s-4.99-11.13-11.13-11.13-11.13,4.99-11.13,11.13,4.99,11.13,11.13,11.13Z', delay: 0.3 },
  { d: 'M101.88,67.2c-6.14,0-11.13,4.99-11.13,11.13s4.99,11.13,11.13,11.13,11.13-4.99,11.13-11.13-4.99-11.13-11.13-11.13Z', delay: 0.45 },
  { d: 'M78.34,90.75c-6.14,0-11.13,4.99-11.13,11.13s4.99,11.13,11.13,11.13,11.13-4.99,11.13-11.13-4.99-11.13-11.13-11.13Z', delay: 0.6 },
  { d: 'M34.68,90.75c-6.14,0-11.13,4.99-11.13,11.13s4.99,11.13,11.13,11.13,11.13-4.99,11.13-11.13-4.99-11.13-11.13-11.13Z', delay: 0.75 },
  { d: 'M11.13,67.2c-6.14,0-11.13,4.99-11.13,11.13s4.99,11.13,11.13,11.13,11.13-4.99,11.13-11.13-4.99-11.13-11.13-11.13Z', delay: 0.9 },
  { d: 'M11.13,23.54c-6.14,0-11.13,4.99-11.13,11.13s4.99,11.13,11.13,11.13,11.13-4.99,11.13-11.13-4.99-11.13-11.13-11.13Z', delay: 1.05 },
  { d: 'M34.68,22.26c6.14,0,11.13-4.99,11.13-11.13S40.81,0,34.68,0s-11.13,4.99-11.13,11.13,4.99,11.13,11.13,11.13Z', delay: 0 },
];

const CENTER_DOT =
  'M56.51,45.37c-6.14,0-11.13,4.99-11.13,11.13s4.99,11.13,11.13,11.13,11.13-4.99,11.13-11.13-4.99-11.13-11.13-11.13Z';

/** Ring-dot centres, clockwise from top-left. Indices match `activeNodes`. */
export const RING_CENTRES: ReadonlyArray<{ x: number; y: number }> = [
  { x: 34.68, y: 11.13 },
  { x: 78.34, y: 11.13 },
  { x: 101.88, y: 34.67 },
  { x: 101.88, y: 78.33 },
  { x: 78.34, y: 101.88 },
  { x: 34.68, y: 101.88 },
  { x: 11.13, y: 78.33 },
  { x: 11.13, y: 34.67 },
];

/** Centre-dot position, for callers drawing to or from the core. */
export const CORE_CENTRE = { x: 56.51, y: 56.5 } as const;

/** `RING_DOTS` order differs from `RING_CENTRES`; this maps one to the other. */
const PATH_FOR_NODE = [7, 0, 1, 2, 3, 4, 5, 6];

export interface BrandMarkProps {
  /** 16 · 20 · 28 · 40–56 are the spec sizes. */
  size?: number;
  /** Animate the ring dots. */
  loading?: boolean;
  /**
   * A slow, continuous turn — for the mark used AS the logo, so it is never
   * quite still. Ignored while `loading`, which owns the whole animation.
   */
  idle?: boolean;
  /** Defaults to the accent token (charcoal light / warm-white dark). */
  color?: string;
  className?: string;
  /**
   * Light only these ring dots (0–7, clockwise from top-left); the rest stay
   * dimmed. Ignored while `loading`, which owns the whole ring. Absent leaves
   * every existing call site byte-identical.
   */
  activeNodes?: readonly number[];
  /** Draw spokes from the centre to each active node. */
  showSpokes?: boolean;
}

export function BrandMark({
  size = 20,
  loading = false,
  idle = false,
  color,
  className,
  activeNodes,
  showSpokes = false,
}: BrandMarkProps) {
  const subset = !loading && activeNodes !== undefined;
  const lit = new Set<number>();
  if (subset) {
    for (const n of activeNodes ?? []) {
      const idx = PATH_FOR_NODE.indexOf(n);
      if (idx !== -1) lit.add(idx);
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 113.01 113.01"
      fill={color ?? 'var(--ds-accent)'}
      className={[idle && !loading ? 'ds-mark-idle' : '', className ?? ''].join(' ').trim() || undefined}
      style={{ flexShrink: 0 }}
      role={loading ? 'status' : 'img'}
      aria-label={loading ? 'Loading' : 'BrandingOS'}
    >
      {subset && showSpokes
        ? (activeNodes ?? []).map((n) => {
            const p = RING_CENTRES[n];
            if (!p) return null;
            return (
              <line
                key={`spoke-${n}`}
                x1={CORE_CENTRE.x}
                y1={CORE_CENTRE.y}
                x2={p.x}
                y2={p.y}
                stroke={color ?? 'var(--ds-accent)'}
                strokeWidth={1.5}
                opacity={0.22}
              />
            );
          })
        : null}
      {RING_DOTS.map((dot, i) => (
        <path
          key={i}
          d={dot.d}
          className={loading ? 'ds-mark-dot' : undefined}
          style={
            loading
              ? { animationDelay: `${dot.delay}s` }
              : subset
                ? {
                    opacity: lit.has(i) ? 0.95 : 0.12,
                    transition: 'opacity 700ms var(--ds-ease)',
                  }
                : undefined
          }
        />
      ))}
      <path d={CENTER_DOT} opacity={0.9} />
    </svg>
  );
}

/** "Generating your kit…" pill — AI generation always names what it makes. */
export function LoadingPill({ label, size = 16 }: { label: string; size?: number }) {
  return (
    <span className="ds-loading-pill">
      <BrandMark size={size} loading />
      {label}
    </span>
  );
}
