// UICreative.tsx
import { useId, type CSSProperties } from 'react';
import type { Typescale, SurfaceKey, SemanticRole } from '@/shared/types/typescale';
import { BarChart3, Bell, Home, Search, Settings, Shield, Users } from 'lucide-react';

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
    margin: 0,
  };
}

const NAV = [
  { label: 'Home',      icon: Home,      active: false },
  { label: 'Analytics', icon: BarChart3, active: true  },
  { label: 'Users',     icon: Users,     active: false },
  { label: 'Security',  icon: Shield,    active: false },
  { label: 'Settings',  icon: Settings,  active: false },
];

const STATS = [
  { label: 'Sessions',    value: '12,480', delta: '+8.2%', trend: 'up' as const },
  { label: 'Conversions', value: '846',    delta: '+1.1%', trend: 'up' as const },
  { label: 'Revenue',     value: '$48.2k', delta: '-0.4%', trend: 'down' as const },
  { label: 'Retention',   value: '92.4%',  delta: '+0.6%', trend: 'up' as const },
];

const ACTIVITY = [
  { who: 'Jules M.',    what: 'shipped a new brand board',    when: '2m ago' },
  { who: 'Arun K.',     what: 'updated the social typescale', when: '18m ago' },
  { who: 'Danielle R.', what: 'exported the web tokens CSS',  when: '1h ago' },
];

/**
 * UICreative — a real-looking product dashboard mock.
 *
 * Left rail of brand-accented navigation, top bar with search + avatar,
 * a row of four stat cards, a chart card with an accent-tinted area
 * chart, and an activity list. Primary CTA + outline secondary use the
 * brand accent.
 */
export function UICreative({ draft, activeSurface, accent }: Props) {
  const gradId = useId();
  const fillId = `uc-fill-${gradId.replace(/:/g, '')}`;

  const accentSoft = `color-mix(in oklch, ${accent} 10%, transparent)`;
  const accentRing = `color-mix(in oklch, ${accent} 18%, transparent)`;

  return (
    <div className="ts-uc" style={{ ['--ts-accent' as string]: accent } as CSSProperties}>
      {/* ─── Sidebar ──────────────────────────────────────────── */}
      <aside className="ts-uc-side">
        <div className="ts-uc-side-brand">
          <span className="ts-uc-side-logo" style={{ background: accent }} aria-hidden />
          <span className="ts-uc-side-logo-name" style={styleFor(draft, activeSurface, 'h3')}>
            Brandos
          </span>
        </div>
        <nav className="ts-uc-side-nav">
          {NAV.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={`ts-uc-side-item${active ? ' is-active' : ''}`}
              style={active ? { background: accentSoft, color: accent } : undefined}
            >
              <Icon size={15} strokeWidth={1.75} aria-hidden />
              <span style={styleFor(draft, activeSurface, 'body')}>{label}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* ─── Main column ──────────────────────────────────────── */}
      <div className="ts-uc-main">
        {/* Top bar */}
        <header className="ts-uc-topbar">
          <div className="ts-uc-search" aria-hidden>
            <Search size={14} strokeWidth={1.75} />
            <span style={styleFor(draft, activeSurface, 'body')}>Search…</span>
          </div>
          <div className="ts-uc-topbar-actions">
            <button className="ts-uc-icon-btn" aria-label="Notifications" type="button">
              <Bell size={15} strokeWidth={1.75} />
              <span className="ts-uc-notif-dot" style={{ background: accent }} aria-hidden />
            </button>
            <span className="ts-uc-avatar" aria-hidden>JM</span>
          </div>
        </header>

        {/* Hero */}
        <section className="ts-uc-hero">
          <p className="ts-uc-crumb" style={styleFor(draft, activeSurface, 'caption')}>
            Workspace <span aria-hidden>›</span> Analytics
          </p>
          <h1 style={styleFor(draft, activeSurface, 'h1')}>Analytics overview</h1>
          <p className="ts-uc-hero-sub" style={styleFor(draft, activeSurface, 'bodyLg')}>
            Track how your brand system performs across every surface.
          </p>
        </section>

        {/* Stat cards */}
        <section className="ts-uc-stats">
          {STATS.map(s => (
            <div key={s.label} className="ts-uc-stat">
              <div className="ts-uc-stat-label" style={styleFor(draft, activeSurface, 'caption')}>
                {s.label}
              </div>
              <div className="ts-uc-stat-value" style={styleFor(draft, activeSurface, 'h2')}>
                {s.value}
              </div>
              <div
                className={`ts-uc-stat-delta ts-uc-stat-delta--${s.trend}`}
                style={styleFor(draft, activeSurface, 'caption')}
              >
                {s.delta}
              </div>
            </div>
          ))}
        </section>

        {/* Chart + activity row */}
        <section className="ts-uc-row">
          <div className="ts-uc-card ts-uc-card--chart">
            <div className="ts-uc-card-head">
              <div className="ts-uc-card-title" style={styleFor(draft, activeSurface, 'h3')}>
                Traffic this week
              </div>
              <div className="ts-uc-card-sub" style={styleFor(draft, activeSurface, 'caption')}>
                Apr 16 – Apr 22
              </div>
            </div>
            <svg viewBox="0 0 240 80" className="ts-uc-chart" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,60 C30,40 60,50 90,30 S150,20 180,35 210,45 240,25 L240,80 L0,80 Z"
                fill={`url(#${fillId})`}
              />
              <path
                d="M0,60 C30,40 60,50 90,30 S150,20 180,35 210,45 240,25"
                fill="none"
                stroke={accent}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="ts-uc-card ts-uc-card--activity">
            <div className="ts-uc-card-head">
              <div className="ts-uc-card-title" style={styleFor(draft, activeSurface, 'h3')}>
                Recent activity
              </div>
            </div>
            <ul className="ts-uc-activity-list">
              {ACTIVITY.map((a, i) => (
                <li key={i} className="ts-uc-activity-row">
                  <span
                    className="ts-uc-activity-avatar"
                    style={{
                      background: accentSoft,
                      color: accent,
                      boxShadow: `inset 0 0 0 1px ${accentRing}`,
                    }}
                    aria-hidden
                  >
                    {a.who.charAt(0)}
                  </span>
                  <span className="ts-uc-activity-text" style={styleFor(draft, activeSurface, 'body')}>
                    <strong>{a.who}</strong> {a.what}
                  </span>
                  <span className="ts-uc-activity-when" style={styleFor(draft, activeSurface, 'caption')}>
                    {a.when}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Button row */}
        <section className="ts-uc-actions">
          <button
            type="button"
            className="ts-uc-btn ts-uc-btn--primary"
            style={{
              background: accent,
              ...styleFor(draft, activeSurface, 'body'),
            }}
          >
            New export
          </button>
          <button
            type="button"
            className="ts-uc-btn ts-uc-btn--secondary"
            style={{
              color: accent,
              borderColor: accentRing,
              ...styleFor(draft, activeSurface, 'body'),
            }}
          >
            View report
          </button>
        </section>
      </div>
    </div>
  );
}
