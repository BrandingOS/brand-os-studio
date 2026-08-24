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
import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Rename the page's LABEL — `undefined` returns it to the default name.
      Writes `name`, never `title`: renaming must not rewrite page content. */
  onRename: (name: string | undefined) => void;
  /** The element the document scrolls inside — the deferred-render root. */
  viewRoot?: Element | null;
}

export function GuidelinePageCard({
  page, index, total, sectionIndex, brand, layout,
  snapshot, selected, onSelect, onEdit, onFlush, onRename, viewRoot,
}: GuidelinePageCardProps) {
  const type = getPageType(page.type);
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, '900px', viewRoot);
  const dirty = useRef(false);

  // Double-click the label to rename it in place — a contentEditable span,
  // not an input, so the text keeps its exact spot and no box appears around
  // it. The span is UNCONTROLLED while editing: its children stay the string
  // captured at start, so a re-render never rewrites the DOM under the caret,
  // and the name is written once on commit. `key` on the span is what makes
  // Escape work — swapping it back to the view span remounts the text React
  // stopped tracking.
  const [renaming, setRenaming] = useState(false);
  const [initialName, setInitialName] = useState('');
  const nameRef = useRef<HTMLSpanElement>(null);

  const startRename = useCallback(() => {
    setInitialName(pageDisplayName(page));
    setRenaming(true);
  }, [page]);

  const commitRename = useCallback(() => {
    const text = nameRef.current?.textContent?.trim() ?? '';
    onRename(text === '' ? undefined : text);
    setRenaming(false);
  }, [onRename]);

  const cancelRename = useCallback(() => setRenaming(false), []);

  // Focus lands after the flip to editable. The browser's own double-click
  // word selection usually survives it (typing replaces that word); when it
  // does not, park the caret at the end rather than select-all — a full blue
  // block is exactly the "box" this interaction is avoiding.
  useEffect(() => {
    if (!renaming) return;
    const el = nameRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && (!sel.anchorNode || !el.contains(sel.anchorNode))) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [renaming]);

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
        {renaming ? (
          <span
            key="edit"
            ref={nameRef}
            className="gl-page-name is-renaming"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label={`Rename page ${index + 1}`}
            spellCheck={false}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
            }}
          >
            {initialName}
          </span>
        ) : (
          <span
            key="view"
            className="gl-page-name"
            title="Double-click to rename"
            onDoubleClick={startRename}
          >
            {pageDisplayName(page)}
          </span>
        )}
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
