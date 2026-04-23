// UIPreview.tsx
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
    margin: 0,
  };
}

const STATS: Array<{ label: string; value: string; delta: string; trend: 'up' | 'down' }> = [
  { label: 'Sessions', value: '12,480', delta: '+8.2%', trend: 'up' },
  { label: 'Conversions', value: '846', delta: '+1.1%', trend: 'up' },
  { label: 'Revenue', value: '$48.2k', delta: '-0.4%', trend: 'down' },
];

const ACTIVITY: Array<{ who: string; what: string; when: string }> = [
  { who: 'Jules M.',   what: 'shipped a new brand board',      when: '2m ago' },
  { who: 'Arun K.',    what: 'updated the social typescale',    when: '18m ago' },
  { who: 'Danielle R.', what: 'exported the web tokens CSS',     when: '1h ago' },
  { who: 'Sasha O.',   what: 'added a custom font upload',      when: '3h ago' },
];

/**
 * UIPreview — dashboard-style product mock. Topbar, hero row, stat
 * cards, an inline chart, and a recent activity list. Every text node
 * reads from the draft so changes ripple through the whole preview.
 */
export function UIPreview({ draft, activeSurface }: Props) {
  return (
    <div className="ts-ui">
      <header className="ts-ui-topbar">
        <div className="ts-ui-logo" style={styleFor(draft, activeSurface, 'h3')}>
          Brandos
        </div>
        <nav className="ts-ui-nav">
          <span style={styleFor(draft, activeSurface, 'body')}>Dashboard</span>
          <span style={styleFor(draft, activeSurface, 'body')}>Library</span>
          <span style={styleFor(draft, activeSurface, 'body')}>Settings</span>
        </nav>
        <div className="ts-ui-avatar" aria-hidden>
          JM
        </div>
      </header>

      <section className="ts-ui-hero">
        <div>
          <h1 style={styleFor(draft, activeSurface, 'h1')}>Welcome back, Team</h1>
          <p
            className="ts-ui-hero-sub"
            style={styleFor(draft, activeSurface, 'bodyLg')}
          >
            Here's what your brand has shipped this week.
          </p>
        </div>
        <button className="ts-ui-cta" style={styleFor(draft, activeSurface, 'body')}>
          New export
        </button>
      </section>

      <section className="ts-ui-stats">
        {STATS.map(s => (
          <div key={s.label} className="ts-ui-stat">
            <div
              className="ts-ui-stat-label"
              style={styleFor(draft, activeSurface, 'caption')}
            >
              {s.label}
            </div>
            <div
              className="ts-ui-stat-value"
              style={styleFor(draft, activeSurface, 'h2')}
            >
              {s.value}
            </div>
            <div
              className={`ts-ui-stat-delta ts-ui-stat-delta--${s.trend}`}
              style={styleFor(draft, activeSurface, 'caption')}
            >
              {s.delta}
            </div>
          </div>
        ))}
      </section>

      <section className="ts-ui-chart" aria-hidden>
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" width="100%" height="120">
          <defs>
            <linearGradient id="ts-ui-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,90 C40,86 60,60 100,55 C140,50 160,80 200,72 C240,64 260,30 300,28 C340,26 360,50 400,40 L400,120 L0,120 Z"
            fill="url(#ts-ui-chart-fill)"
          />
          <path
            d="M0,90 C40,86 60,60 100,55 C140,50 160,80 200,72 C240,64 260,30 300,28 C340,26 360,50 400,40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </section>

      <section className="ts-ui-activity">
        <h3
          className="ts-ui-activity-title"
          style={styleFor(draft, activeSurface, 'h3')}
        >
          Recent activity
        </h3>
        <ul className="ts-ui-activity-list">
          {ACTIVITY.map((a, i) => (
            <li key={i} className="ts-ui-activity-row">
              <span className="ts-ui-activity-avatar" aria-hidden>
                {a.who.charAt(0)}
              </span>
              <span
                className="ts-ui-activity-text"
                style={styleFor(draft, activeSurface, 'body')}
              >
                <strong>{a.who}</strong> {a.what}
              </span>
              <span
                className="ts-ui-activity-when"
                style={styleFor(draft, activeSurface, 'caption')}
              >
                {a.when}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
