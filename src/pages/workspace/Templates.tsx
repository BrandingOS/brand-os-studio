import { useMemo, useState } from 'react';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShellAlt';

/**
 * Workspace Templates — marketplace grid.
 *
 * Mock data for now. Clicking a template is intended to fire the
 * canonical `BrandChooserDialog` so the user picks which brand to
 * apply the template to — we leave that wired in Phase 3 once the
 * workspace-scoped chooser flow is decided. For now, clicks no-op
 * and templates render as purely visual cards.
 */

type Template = {
  id: string;
  category: string;
  title: string;
  sub: string;
  /** Two colors used for a soft gradient thumb. */
  gradient: [string, string];
};

const CATEGORIES = ['All', 'Brand Board', 'Social', 'Print', 'Screen', 'Bento'] as const;
type Category = (typeof CATEGORIES)[number];

const TEMPLATES: Template[] = [
  { id: 'bb-serif', category: 'Brand Board', title: 'Editorial', sub: 'Serif-led poster with generous whitespace.', gradient: ['#f4ecdf', '#d9c3a0'] },
  { id: 'bb-mono', category: 'Brand Board', title: 'Monogram', sub: 'Icon-first board for product brands.', gradient: ['#e6e6e6', '#bdbdbd'] },
  { id: 'bb-spectrum', category: 'Brand Board', title: 'Spectrum', sub: 'Full-palette sweep across the poster.', gradient: ['#f2a1c0', '#8a7dff'] },
  { id: 'bn-hero', category: 'Bento', title: 'Hero bento', sub: '9-tile grid, headline dominant.', gradient: ['#fef3c7', '#fbbf24'] },
  { id: 'bn-case', category: 'Bento', title: 'Case study', sub: 'Asymmetric grid, image-led.', gradient: ['#dbeafe', '#60a5fa'] },
  { id: 'so-quote', category: 'Social', title: 'Quote card', sub: 'Serif pullquote with brand accent.', gradient: ['#0f172a', '#475569'] },
  { id: 'so-launch', category: 'Social', title: 'Launch post', sub: 'Bold headline + product shot.', gradient: ['#fff7ed', '#fb923c'] },
  { id: 'so-carousel', category: 'Social', title: 'Carousel 3-up', sub: 'Narrative across three slides.', gradient: ['#ecfdf5', '#34d399'] },
  { id: 'pr-business', category: 'Print', title: 'Business card', sub: 'Minimal 2-sided card template.', gradient: ['#f5f5f4', '#78716c'] },
  { id: 'pr-letter', category: 'Print', title: 'Letterhead', sub: 'Document-first stationery.', gradient: ['#fafaf9', '#a8a29e'] },
  { id: 'sc-landing', category: 'Screen', title: 'Landing hero', sub: 'Web hero with CTA + screenshot.', gradient: ['#eef2ff', '#818cf8'] },
  { id: 'sc-email', category: 'Screen', title: 'Announcement email', sub: 'Responsive, brand-tokened.', gradient: ['#fdf2f8', '#f472b6'] },
];

function TemplateCard({ t }: { t: Template }) {
  return (
    <article
      className="ws-card"
      role="button"
      tabIndex={0}
      aria-label={`${t.title} — ${t.category}`}
    >
      <div
        className="ws-card-thumb"
        style={{
          background: `linear-gradient(135deg, ${t.gradient[0]} 0%, ${t.gradient[1]} 100%)`,
          color: 'rgba(13, 13, 13, 0.7)',
        }}
        aria-hidden="true"
      >
        <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, fontWeight: 400 }}>
          {t.title.charAt(0)}
        </span>
      </div>
      <span className="ws-card-eyebrow">{t.category}</span>
      <h3 className="ws-card-title">{t.title}</h3>
      <p className="ws-card-sub">{t.sub}</p>
    </article>
  );
}

export default function WorkspaceTemplates() {
  const [category, setCategory] = useState<Category>('All');

  const filtered = useMemo(() => {
    if (category === 'All') return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  return (
    <WorkspaceShell>
      <main className="ws-outlet">
        <section className="ws-hero">
          <span className="ws-hero-eyebrow">Library</span>
          <h1 className="ws-hero-title">Templates</h1>
          <p className="ws-hero-sub">
            Start from a polished layout. Apply any template to a brand and it
            inherits your colors, type, and voice automatically.
          </p>
        </section>

        <div className="ws-subtabs" role="tablist" aria-label="Template categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              className={`ws-subtab${category === c ? ' is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="ws-card-grid">
          {filtered.map((t) => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </div>
      </main>
    </WorkspaceShell>
  );
}
