import React from 'react';

/**
 * The BrandingOS mark: eight ring dots around a steady centre dot.
 * `loading` fades the ring dots in sequence (1.2s, system easing) — this is
 * the product's loader at every size. Never use a generic ring spinner.
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

export interface BrandMarkProps {
  /** 16 · 20 · 28 · 40–56 are the spec sizes. */
  size?: number;
  /** Animate the ring dots. */
  loading?: boolean;
  /** Defaults to the accent token (charcoal light / warm-white dark). */
  color?: string;
  className?: string;
}

export function BrandMark({ size = 20, loading = false, color, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 113.01 113.01"
      fill={color ?? 'var(--ds-accent)'}
      className={className}
      style={{ flexShrink: 0 }}
      role={loading ? 'status' : 'img'}
      aria-label={loading ? 'Loading' : 'BrandingOS'}
    >
      {RING_DOTS.map((dot, i) => (
        <path
          key={i}
          d={dot.d}
          className={loading ? 'ds-mark-dot' : undefined}
          style={loading ? { animationDelay: `${dot.delay}s` } : undefined}
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
