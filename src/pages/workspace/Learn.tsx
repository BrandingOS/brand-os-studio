import { WorkspaceShell } from '@/shared/layouts/WorkspaceShellAlt';

/**
 * Workspace Learn — tutorials / docs index.
 *
 * Currently backed by a static mock list. Swap for a real CMS /
 * video catalog later. Each card is a simple ws-card with a thumb
 * placeholder, eyebrow label, title, and short description.
 */

type Tutorial = {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
  duration: string;
  icon: string;
};

const TUTORIALS: Tutorial[] = [
  {
    id: 'intro',
    eyebrow: 'Getting started',
    title: 'What is BrandingOS?',
    sub: 'A 3-minute tour of the workspace, brand scope, and editor.',
    duration: '3 min',
    icon: '✦',
  },
  {
    id: 'first-brand',
    eyebrow: 'Getting started',
    title: 'Create your first brand',
    sub: 'From prompt to palette in under five minutes.',
    duration: '5 min',
    icon: '◐',
  },
  {
    id: 'logo-system',
    eyebrow: 'Identity',
    title: 'Build a logo system',
    sub: 'Primary, icon, wordmark, and safety variants.',
    duration: '6 min',
    icon: '◆',
  },
  {
    id: 'color-palette',
    eyebrow: 'Identity',
    title: 'Choose a color palette',
    sub: 'Harmony generators, contrast checks, and neutrals.',
    duration: '4 min',
    icon: '◉',
  },
  {
    id: 'typography',
    eyebrow: 'Identity',
    title: 'Pick a type pairing',
    sub: 'Display, body, and UI — sized for every surface.',
    duration: '4 min',
    icon: 'Aa',
  },
  {
    id: 'brand-board',
    eyebrow: 'Brand Kit',
    title: 'Design your Brand Board',
    sub: 'Use the poster editor to express your full system.',
    duration: '7 min',
    icon: '▦',
  },
  {
    id: 'guideline',
    eyebrow: 'Guideline',
    title: 'Write brand guidelines',
    sub: 'Slide-based editor with voice and usage rules.',
    duration: '8 min',
    icon: '§',
  },
  {
    id: 'design-canvas',
    eyebrow: 'Design',
    title: 'Design on the canvas',
    sub: 'Blank canvas, AI Design, or pick a template.',
    duration: '6 min',
    icon: '◈',
  },
  {
    id: 'social',
    eyebrow: 'Design',
    title: 'Make social posts',
    sub: 'Platform-aware sizes and instant exports.',
    duration: '5 min',
    icon: '◫',
  },
  {
    id: 'share',
    eyebrow: 'Share',
    title: 'Publish a share link',
    sub: 'Send your brand as a link, a deck, or a PDF.',
    duration: '3 min',
    icon: '⇪',
  },
  {
    id: 'exports',
    eyebrow: 'Share',
    title: 'Export everything',
    sub: 'PDF guidelines, logo zips, and canvas PNGs.',
    duration: '4 min',
    icon: '⇩',
  },
  {
    id: 'advanced',
    eyebrow: 'Advanced',
    title: 'Power tips',
    sub: 'Keyboard shortcuts, bulk operations, and tricks.',
    duration: '6 min',
    icon: '※',
  },
];

export default function WorkspaceLearn() {
  return (
    <WorkspaceShell>
      <main className="ws-outlet">
        <section className="ws-hero">
          <span className="ws-hero-eyebrow">Resources</span>
          <h1 className="ws-hero-title">Learn BrandingOS</h1>
          <p className="ws-hero-sub">
            Short, focused tutorials that take you from a blank workspace to a
            fully-expressed brand system.
          </p>
        </section>

        <div className="ws-card-grid">
          {TUTORIALS.map((t) => (
            <article
              key={t.id}
              className="ws-card"
              role="button"
              tabIndex={0}
              aria-label={`${t.title} — ${t.duration}`}
            >
              <div className="ws-card-thumb" aria-hidden="true">
                <span style={{ fontSize: 28 }}>{t.icon}</span>
              </div>
              <span className="ws-card-eyebrow">{t.eyebrow} · {t.duration}</span>
              <h3 className="ws-card-title">{t.title}</h3>
              <p className="ws-card-sub">{t.sub}</p>
            </article>
          ))}
        </div>
      </main>
    </WorkspaceShell>
  );
}
