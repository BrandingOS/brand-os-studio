import React from 'react';

/** Skeleton and progress — loading that keeps the page's shape. */

export interface DsSkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function DsSkeleton({ width, height = 12, radius, className, style }: DsSkeletonProps) {
  return (
    <div
      className={['ds-skeleton', className ?? ''].filter(Boolean).join(' ')}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export interface DsProgressProps {
  /** 0–1. */
  value: number;
  /** Eyebrow label above the track, e.g. "COMPLETION". */
  label?: string;
  /** Right-aligned meta, e.g. "6 / 7" or "62%". */
  meta?: React.ReactNode;
  height?: number;
}

export function DsProgress({ value, label, meta, height = 5 }: DsProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const track = (
    <div
      className="ds-progress-track"
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div className="ds-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
  if (!label && meta === undefined) return track;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--ds-font)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        {label && <span className="ds-eyebrow" style={{ fontSize: '10.5px' }}>{label}</span>}
        {meta !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text)' }}>{meta}</span>
        )}
      </div>
      {track}
    </div>
  );
}
