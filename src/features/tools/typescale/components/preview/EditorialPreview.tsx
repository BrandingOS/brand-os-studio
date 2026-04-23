// EditorialPreview.tsx
import type { CSSProperties } from 'react';
import type { Typescale, SurfaceKey, SemanticRole } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

function styleFor(
  draft: Typescale,
  surfaceKey: SurfaceKey,
  role: SemanticRole,
): CSSProperties | undefined {
  const surface = draft.surfaces[surfaceKey];
  const entry = surface.semantic[role];
  if (!entry) return undefined;
  const step = surface.steps.find(s => s.id === entry.stepId);
  if (!step) return undefined;
  const font =
    entry.font === 'mono'
      ? draft.fonts.mono
      : entry.font === 'body'
      ? draft.fonts.body
      : draft.fonts.heading;
  if (!font) return undefined;
  return {
    fontFamily: `"${font.family}", ${font.fallback}`,
    fontSize: step.fluid?.clamp ?? `${step.sizePx}px`,
    lineHeight: step.lineHeight,
    letterSpacing: `${step.letterSpacingEm}em`,
    fontWeight: entry.weight ?? step.weight,
    textTransform:
      entry.transform === 'uppercase'
        ? 'uppercase'
        : entry.transform === 'lowercase'
        ? 'lowercase'
        : 'none',
    margin: 0,
  };
}

/**
 * EditorialPreview — magazine-style article mock that exercises the
 * full semantic ladder: eyebrow, display, lede, drop-cap body, pull
 * quote, second-level heads. Everything reads type from the draft so
 * font/scale changes update live.
 */
export function EditorialPreview({ draft, activeSurface }: Props) {
  return (
    <article className="ts-editorial">
      <header className="ts-editorial-hero">
        <div
          className="ts-editorial-eyebrow"
          style={styleFor(draft, activeSurface, 'overline')}
        >
          Issue No. 12 · Design Systems
        </div>
        <h1
          className="ts-editorial-title"
          style={styleFor(draft, activeSurface, 'h1')}
        >
          The quiet discipline of typography
        </h1>
        <p
          className="ts-editorial-lede"
          style={styleFor(draft, activeSurface, 'bodyLg')}
        >
          A great type system is a promise kept on every screen, every sheet,
          every story — the invisible rhythm behind a brand's voice.
        </p>
        <p
          className="ts-editorial-byline"
          style={styleFor(draft, activeSurface, 'caption')}
        >
          Written by the BrandOS team · 8 min read
        </p>
      </header>

      <div className="ts-editorial-body">
        <p style={styleFor(draft, activeSurface, 'body')}>
          <span
            className="ts-editorial-dropcap"
            style={styleFor(draft, activeSurface, 'h1')}
          >
            T
          </span>
          ypography is what language looks like. It is the subtle architecture
          of a brand, felt before it is read. When a scale is tuned well the
          content carries; when it drifts, the reader notices before the
          designer does. The craft is getting out of the way.
        </p>

        <blockquote
          className="ts-editorial-pull"
          style={styleFor(draft, activeSurface, 'bodyLg')}
        >
          &ldquo;Typography is the craft of endowing human language with a
          durable visual form.&rdquo;
          <cite className="ts-editorial-pull-cite">— Robert Bringhurst</cite>
        </blockquote>

        <h2
          className="ts-editorial-h2"
          style={styleFor(draft, activeSurface, 'h2')}
        >
          Hierarchy is kindness
        </h2>
        <p style={styleFor(draft, activeSurface, 'body')}>
          A reader should never have to guess what comes next. Hierarchy earns
          their trust by telling them, with size and weight alone, which ideas
          are load-bearing and which are support.
        </p>

        <h3
          className="ts-editorial-h3"
          style={styleFor(draft, activeSurface, 'h3')}
        >
          Rhythm across surfaces
        </h3>
        <p style={styleFor(draft, activeSurface, 'body')}>
          The web wants a gentler scale than a pitch deck. A social post will
          live or die by a single bold headline. Your system should flex to
          each surface without losing its voice.
        </p>
      </div>

      <footer className="ts-editorial-footer">
        <p style={styleFor(draft, activeSurface, 'caption')}>
          — BrandOS · Typescale preview
        </p>
      </footer>
    </article>
  );
}
