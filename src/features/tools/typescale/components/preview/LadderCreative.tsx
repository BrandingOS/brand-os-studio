// LadderCreative.tsx
import type { CSSProperties } from 'react';
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; accent: string; }

/**
 * Words painted onto each step, biggest → smallest. If the surface
 * has more steps than words, we reuse the pool to keep everything
 * painted. Each word stands alone on its own row.
 */
const WORDS = [
  'Typography',
  'Discipline',
  'Elegant',
  'Scale',
  'System',
  'Rhythm',
  'Voice',
  'Craft',
  'Tempo',
  'Balance',
  'Order',
];

/**
 * LadderCreative — typographic poster.
 *
 * Instead of a table, every scale step becomes one word, staggered left
 * as the size descends to create a visual cascade. The accent tints the
 * canvas, appears as a swatch in the meta row, and colors the top
 * accent bar — giving the poster a distinct brand identity.
 */
export function LadderCreative({ draft, activeSurface, accent }: Props) {
  const surface = draft.surfaces[activeSurface];
  const heading = draft.fonts.heading;
  const ordered = [...surface.steps].sort((a, b) => b.index - a.index);
  const maxIndent = Math.max(ordered.length - 1, 1);

  const canvasBg = `color-mix(in oklch, ${accent} 3%, var(--surface))`;

  return (
    <section
      className="ts-lc"
      style={{
        background: canvasBg,
        ['--ts-accent' as string]: accent,
      } as CSSProperties}
    >
      {/* Top accent bar */}
      <div className="ts-lc-bar" style={{ background: accent }} aria-hidden />

      <p className="ts-lc-eyebrow">
        Type Scale · {activeSurface.charAt(0).toUpperCase() + activeSurface.slice(1)}
      </p>

      {/* Cascading words */}
      <div className="ts-lc-cascade">
        {ordered.map((s, i) => {
          const word = WORDS[i % WORDS.length];
          const indent = Math.round((i / maxIndent) * 120);
          return (
            <div
              key={s.id}
              className="ts-lc-word-row"
              style={{ paddingLeft: `${indent}px` }}
            >
              <span
                className="ts-lc-word"
                style={{
                  fontFamily: `"${heading.family}", ${heading.fallback}`,
                  fontSize: s.fluid?.clamp ?? `${s.sizePx}px`,
                  lineHeight: s.lineHeight,
                  letterSpacing: `${s.letterSpacingEm}em`,
                  fontWeight: s.weight,
                }}
              >
                {word}
              </span>
              <span className="ts-lc-word-tag">{s.id}</span>
            </div>
          );
        })}
      </div>

      {/* Meta footer */}
      <div className="ts-lc-meta">
        <div className="ts-lc-swatch-wrap">
          <span className="ts-lc-swatch" style={{ background: accent }} aria-hidden />
          <span className="ts-lc-swatch-label">Accent</span>
        </div>
        <div className="ts-lc-meta-rule" aria-hidden />
        <div className="ts-lc-meta-stats">
          <span><strong>{surface.steps.length}</strong> steps</span>
          <span><strong>{surface.basePx}px</strong> base</span>
          <span><strong>{surface.ratio.value.toFixed(3)}</strong> ratio</span>
          <span><strong>+{surface.stepsUp} / −{surface.stepsDown}</strong></span>
        </div>
      </div>
    </section>
  );
}
