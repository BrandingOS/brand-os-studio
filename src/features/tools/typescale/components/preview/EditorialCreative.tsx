// EditorialCreative.tsx
import type { CSSProperties } from 'react';
import type { Typescale, SurfaceKey, SemanticRole } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; accent: string; }

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
 * EditorialCreative — magazine spread mock.
 *
 * A two-column hero (copy + accent hero-art block) followed by a divider
 * and a two-column body with drop-cap, pull quote, and section heads.
 * The accent color paints the hero gradient, the pull-quote left rule,
 * and the footer dot — giving the mock real brand presence.
 */
export function EditorialCreative({ draft, activeSurface, accent }: Props) {
  const heroGradient =
    `linear-gradient(135deg, ${accent} 0%, color-mix(in oklch, ${accent} 20%, transparent) 100%)`;

  return (
    <article className="ts-ce" style={{ ['--ts-accent' as string]: accent } as CSSProperties}>
      {/* ─── Hero row ─────────────────────────────────────────── */}
      <div className="ts-ce-hero-row">
        <div className="ts-ce-hero-copy">
          <div className="ts-ce-eyebrow" style={styleFor(draft, activeSurface, 'overline')}>
            Issue 12 · Type
          </div>
          <h1 className="ts-ce-title" style={styleFor(draft, activeSurface, 'h1')}>
            The quiet discipline of typography
          </h1>
          <p className="ts-ce-lede" style={styleFor(draft, activeSurface, 'bodyLg')}>
            A great type system is a promise kept on every screen, every sheet,
            every story — the invisible rhythm behind a brand's voice.
          </p>
          <p className="ts-ce-byline" style={styleFor(draft, activeSurface, 'caption')}>
            By the BrandingOS editors · April 2026 · 8 min read
          </p>
        </div>

        <div className="ts-ce-hero-art-wrap">
          <div className="ts-ce-hero-art" style={{ background: heroGradient }}>
            <svg viewBox="0 0 200 250" className="ts-ce-hero-art-svg" aria-hidden>
              <circle cx="60" cy="80" r="50" fill="rgba(255,255,255,0.18)" />
              <circle cx="140" cy="180" r="30" fill="rgba(0,0,0,0.10)" />
              <line x1="20" y1="200" x2="180" y2="220" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
              <line x1="30" y1="40" x2="170" y2="55" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            </svg>
          </div>
          <p className="ts-ce-caption" style={styleFor(draft, activeSurface, 'caption')}>
            Fig. 1 · A calm composition of shape and rule.
          </p>
        </div>
      </div>

      <hr className="ts-ce-divider" aria-hidden />

      {/* ─── Body grid ────────────────────────────────────────── */}
      <div className="ts-ce-body-grid">
        <div className="ts-ce-col">
          <p className="ts-ce-body" style={styleFor(draft, activeSurface, 'body')}>
            <span className="ts-ce-dropcap" style={styleFor(draft, activeSurface, 'h1')}>T</span>
            ypography is what language looks like. It is the subtle architecture
            of a brand, felt before it is read. When a scale is tuned well the
            content carries; when it drifts, the reader notices before the
            designer does. The craft is getting out of the way.
          </p>
          <p className="ts-ce-body" style={styleFor(draft, activeSurface, 'body')}>
            A system earns its keep across surfaces — a marketing page, an app
            screen, a pitch deck — adapting sizes without losing its voice.
          </p>

          <blockquote className="ts-ce-pull" style={styleFor(draft, activeSurface, 'bodyLg')}>
            <span className="ts-ce-pull-glyph" aria-hidden>&ldquo;</span>
            Typography is the craft of endowing human language with a durable
            visual form.
            <cite className="ts-ce-pull-cite">— Robert Bringhurst</cite>
          </blockquote>
        </div>

        <div className="ts-ce-col">
          <h3 className="ts-ce-h3" style={styleFor(draft, activeSurface, 'h3')}>
            Hierarchy is kindness
          </h3>
          <p className="ts-ce-body" style={styleFor(draft, activeSurface, 'body')}>
            A reader should never have to guess what comes next. Hierarchy earns
            their trust by telling them, with size and weight alone, which ideas
            are load-bearing and which are support.
          </p>

          <h3 className="ts-ce-h3" style={styleFor(draft, activeSurface, 'h3')}>
            Rhythm across surfaces
          </h3>
          <p className="ts-ce-body" style={styleFor(draft, activeSurface, 'body')}>
            The web wants a gentler scale than a pitch deck. A social post will
            live or die by a single bold headline. The system flexes — the
            voice does not.
          </p>
        </div>
      </div>

      {/* ─── Footer row ───────────────────────────────────────── */}
      <footer className="ts-ce-footer">
        <span className="ts-ce-footer-meta" style={styleFor(draft, activeSurface, 'caption')}>
          Issue 12 · Page 12
        </span>
        <span className="ts-ce-footer-dot" style={{ background: accent }} aria-hidden />
      </footer>
    </article>
  );
}
