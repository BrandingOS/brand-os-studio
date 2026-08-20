/**
 * One page in the guideline document.
 *
 * Three states, and the difference between them is the whole interaction model:
 *
 *   far away   — a sized placeholder. The document is ~30 pages of fairly dense
 *                markup; rendering all of them on load makes the first scroll
 *                stutter, and nobody can see page 24 from page 1.
 *   in view    — rendered, but inert. A click anywhere selects the page.
 *   selected   — wrapped in the shared inline editor, so text, images and
 *                colours can be edited directly on the page.
 *
 * Selection is what gates editing rather than every page being live at once:
 * one inline editor is enough for the page the user is looking at, and it makes
 * "click a page, then edit it" a rule rather than a surprise.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from '@/shared/editor';
import { EditableSlide } from '@/shared/editor/blocks/EditableSlide';
import type { GuidelinePage } from '../model/document';
import { pageDisplayName } from '../model/document';
import { getPageType } from '../model/pageLibrary';
import { useInView } from './useInView';

export interface GuidelinePageCardProps {
  page: GuidelinePage;
  index: number;
  total: number;
  sectionIndex: number;
  brand: Brand;
  layout: TemplateLayout;
  /** Saved HTML for this page, if the user has edited it. */
  snapshot?: string;
  selected: boolean;
  onSelect: () => void;
  /** Fires on every keystroke with the element holding the page's content. */
  onEdit: (pageId: string, contentEl: HTMLElement) => void;
  /** Write this page immediately — used when it loses selection. */
  onFlush: (pageId: string, contentEl: HTMLElement) => void;
  /** The element the document scrolls inside — the deferred-render root. */
  viewRoot?: Element | null;
}

export function GuidelinePageCard({
  page, index, total, sectionIndex, brand, layout,
  snapshot, selected, onSelect, onEdit, onFlush, viewRoot,
}: GuidelinePageCardProps) {
  const type = getPageType(page.type);
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, '900px', viewRoot);
  const dirty = useRef(false);

  const contentEl = useCallback(
    () => canvasRef.current?.querySelector<HTMLElement>('[data-slide-content]') ?? null,
    [],
  );

  // Edits go to the host debounced; deselecting writes immediately. Without
  // the second half, clicking from page 3 to page 4 inside the debounce window
  // would lose whatever was typed on page 3.
  useEffect(() => {
    if (!selected) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mark = () => {
      const el = contentEl();
      if (!el) return;
      dirty.current = true;
      onEdit(page.id, el);
    };
    canvas.addEventListener('input', mark);
    canvas.addEventListener('keyup', mark);
    canvas.addEventListener('paste', mark);
    return () => {
      canvas.removeEventListener('input', mark);
      canvas.removeEventListener('keyup', mark);
      canvas.removeEventListener('paste', mark);
      if (dirty.current) {
        const el = contentEl();
        if (el) onFlush(page.id, el);
        dirty.current = false;
      }
    };
  }, [selected, page.id, onEdit, onFlush, contentEl]);

  const body = type
    ? type.render({ brand, layout, pageNumber: index + 1, totalPages: total, page, sectionIndex })
    : null;

  return (
    <article
      ref={rootRef}
      id={`gl-page-${page.id}`}
      className="gl-page"
      data-page-id={page.id}
      data-selected={selected || undefined}
      aria-label={`Page ${index + 1}: ${pageDisplayName(page)}`}
    >
      <header className="gl-page-label">
        <span className="gl-page-num">{String(index + 1).padStart(2, '0')}</span>
        <span className="gl-page-name">{pageDisplayName(page)}</span>
        {snapshot && <span className="gl-page-edited">Edited</span>}
      </header>

      <div className="gl-page-frame">
        <div className="gl-page-canvas" ref={canvasRef}>
          {!inView ? null : selected ? (
            // `key` on the snapshot: when a page is reset to the template the
            // frozen HTML disappears, and React must rebuild rather than
            // reconcile a dangerouslySetInnerHTML subtree it does not own.
            <EditableSlide key={snapshot ? 'frozen' : 'live'} frozenHtml={snapshot}>
              {body}
            </EditableSlide>
          ) : snapshot ? (
            <div className="gl-page-static" dangerouslySetInnerHTML={{ __html: snapshot }} />
          ) : (
            <div className="gl-page-static">{body}</div>
          )}
        </div>

        {/* The first click selects; it never lands inside the page and starts
            an edit the user did not ask for. */}
        {!selected && (
          <button
            type="button"
            className="gl-page-hit"
            onClick={onSelect}
            aria-label={`Select page ${index + 1}, ${pageDisplayName(page)}`}
          />
        )}
      </div>
    </article>
  );
}
