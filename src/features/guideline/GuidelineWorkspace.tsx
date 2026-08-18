import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DsBadge, DsButton } from '@/shared/ds';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { surfacePalette } from '@/shared/brand/brandPalette';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import { useSlideSnapshotStore } from '@/shared/editor/slideSnapshotStore';
import type { Brand } from '@/shared/types/brand';
import {
  GUIDELINE_TEMPLATES,
  guidelineEditorKey,
  type GuidelineTemplate,
} from './templates/registry';
import './guideline.css';

/**
 * Brand Guidelines workspace — /b/:slug/guideline.
 *
 * The page is a LANDING, not an editor. It answers "what guideline do I have,
 * what is in it, is it started, and how do I open it" — then hands over to the
 * fullscreen deck editor, which is where all the real work happens.
 *
 * This replaces a page that mounted a bespoke dark `ChronicleShell` (its own
 * sidebar, brand switcher and section nav, duplicating WorkspaceShell) around a
 * document editor whose Remix, Gradient, Generate-image, Create-theme, Mockup,
 * Diagram and Template controls were all toasts that did nothing. Everything
 * offered here is real, and everything real lives in one editor.
 */

/** Whether the brand has enough substance for the deck to render well. */
function findGaps(brand: Brand): string[] {
  const gaps: string[] = [];
  if (!pickLogoOnBackground(brand, '#ffffff') && !pickLogoOnBackground(brand, '#000000')) {
    gaps.push('a logo');
  }
  if (!brand.fonts?.primary) gaps.push('a typeface');
  if (!brand.guidelines?.strategy?.mission) gaps.push('a mission');
  return gaps;
}

function GuidelineCard({
  brand,
  slug,
  template,
}: {
  brand: Brand;
  slug: string;
  template: GuidelineTemplate;
}) {
  const navigate = useNavigate();

  // The cover is painted with the brand's OWN surface tokens, and the logo
  // variant is chosen by contrast rather than by guessing — a red mark on a red
  // cover is exactly the case pickLogoOnBackground exists to prevent.
  const cover = useMemo(() => surfacePalette(brand, 'brand'), [brand]);
  const logo = useMemo(() => pickLogoOnBackground(brand, cover.bg), [brand, cover.bg]);

  const slideCount = useMemo(() => template.buildSlides(brand).length, [template, brand]);

  // Real progress, read from the same store the editor writes to — not a
  // decorative "Draft" chip.
  const editorKey = guidelineEditorKey(template, brand.id);
  const hydrated = useSlideSnapshotStore((s) => s.hasHydrated);
  const editedCount = useSlideSnapshotStore(
    (s) => Object.keys(s.snapshots[editorKey] ?? {}).length,
  );
  const started = hydrated && editedCount > 0;

  const open = () => navigate(`/b/${slug}/guideline/${template.id}`);

  return (
    <article className="gl-card">
      <div
        className="gl-cover"
        style={
          {
            '--gl-cover-bg': cover.bg,
            '--gl-cover-fg': cover.text,
          } as React.CSSProperties
        }
        aria-hidden="true"
      >
        <div className="gl-cover-mark">
          {logo?.url ? (
            <img src={logo.url} alt="" />
          ) : (
            <span className="gl-cover-letter">{brand.name?.charAt(0) ?? 'B'}</span>
          )}
        </div>
        <div className="gl-cover-body">
          <span className="gl-cover-eyebrow">Brand Guidelines</span>
          <h3 className="gl-cover-title">{brand.name}</h3>
          <div className="gl-cover-rule" />
        </div>
      </div>

      <div className="gl-card-body">
        <div className="gl-card-head">
          <h2 className="gl-card-title">{template.name}</h2>
          {hydrated && (
            <DsBadge tone={started ? 'success' : 'neutral'}>
              {started ? 'Edited' : 'Not started'}
            </DsBadge>
          )}
        </div>

        <p className="gl-card-desc">{template.description}</p>

        <div className="gl-card-meta">
          <span>{slideCount} pages</span>
          <span className="gl-card-meta-dot" />
          <span>{template.sections.length} chapters</span>
          {started && (
            <>
              <span className="gl-card-meta-dot" />
              <span>
                {editedCount} {editedCount === 1 ? 'page' : 'pages'} customised
              </span>
            </>
          )}
        </div>

        <div className="gl-card-actions">
          <DsButton onClick={open} arrow>
            {started ? 'Continue editing' : 'Open guideline'}
          </DsButton>
        </div>
      </div>
    </article>
  );
}

export function GuidelineWorkspace({
  slug,
  brand,
  isLoading,
  error,
}: {
  slug: string;
  brand: Brand | undefined;
  isLoading: boolean;
  error?: string;
}) {
  if (isLoading && !brand) {
    return (
      <WorkspaceShell>
        <div className="gl-state" role="main">
          <h1>Loading brand…</h1>
          <p>One moment while we resolve this brand.</p>
        </div>
      </WorkspaceShell>
    );
  }

  if (error || !brand) {
    return (
      <WorkspaceShell>
        <div className="gl-state" role="main">
          <h1>We couldn’t find that brand.</h1>
          <p>{error ?? 'The brand may have been renamed or deleted.'}</p>
        </div>
      </WorkspaceShell>
    );
  }

  const gaps = findGaps(brand);
  const template = GUIDELINE_TEMPLATES[0]!;

  return (
    <WorkspaceShell>
      <main className="gl-page">
        <section className="gl-hero">
          <span className="gl-hero-eyebrow">Brand Guidelines</span>
          <h1 className="gl-hero-title">{brand.name}</h1>
          <p className="gl-hero-sub">
            A presentation-ready brand book, already filled in with this brand’s
            logo, palette, typography and voice. Open it to edit any page.
          </p>
        </section>

        {gaps.length > 0 && (
          // Honest, and useful: the deck renders either way, but it renders
          // BETTER once these exist, and Setup is where they come from.
          <div className="gl-gaps" role="status">
            <span>
              This brand has no {gaps.join(', ')} yet, so some pages will fall back
              to placeholders. <Link to={`/b/${slug}/setup`}>Finish setup</Link> to
              fill them in.
            </span>
          </div>
        )}

        <GuidelineCard brand={brand} slug={slug} template={template} />

        <section>
          <div className="gl-section-head">
            <h2 className="gl-section-title">What’s inside</h2>
            <span className="gl-section-sub">Every chapter is editable</span>
          </div>
          <ul className="gl-chapters">
            {template.sections.map((section, i) => (
              <li key={section} className="gl-chapter">
                <span className="gl-chapter-num">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{section}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </WorkspaceShell>
  );
}

export default GuidelineWorkspace;
