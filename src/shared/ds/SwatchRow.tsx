import React from 'react';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';

/**
 * Brand-content container: the customer's colors paint only inside the row.
 * Labels flip light/dark per swatch through pickFgOnBackground — never a
 * hand-rolled luminance check (see the logoOnBackground mandate in
 * CLAUDE.md). Must render any palette — loud or minimal — and has an empty
 * state.
 */

export interface DsSwatchRowSwatch {
  hex: string;
  label?: string;
  /** Relative width; the first (primary) swatch is usually widest. */
  weight?: number;
}

export interface DsSwatchRowProps {
  swatches: DsSwatchRowSwatch[];
  height?: number;
  /** Shown when there are no swatches yet. */
  emptyHint?: React.ReactNode;
}

export function DsSwatchRow({ swatches, height = 56, emptyHint }: DsSwatchRowProps) {
  if (swatches.length === 0) {
    return (
      <div className="ds-empty" style={{ minHeight: height }}>
        {emptyHint ?? 'No colors yet'}
      </div>
    );
  }
  return (
    <div className="ds-swatch-row" style={{ height }}>
      {swatches.map((swatch, i) => {
        const fg = pickFgOnBackground(swatch.hex, ['#ffffff', '#0e0e0e']);
        return (
          <div
            key={`${swatch.hex}-${i}`}
            className="ds-swatch"
            style={{ flex: swatch.weight ?? 1, background: swatch.hex }}
            title={`${swatch.label ? `${swatch.label} · ` : ''}${swatch.hex.toUpperCase()}`}
          >
            {swatch.label && (
              <>
                <span
                  style={{ width: 6, height: 6, borderRadius: 999, background: fg, flexShrink: 0 }}
                />
                <span className="ds-swatch-label" style={{ color: fg }}>
                  {swatch.label}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
