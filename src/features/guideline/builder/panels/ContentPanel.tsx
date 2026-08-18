/**
 * The outline — every page in the document, in order.
 *
 * Doubles as navigation and as structure: chapter dividers are rendered as
 * headings with their pages indented beneath, so the shape of the guideline is
 * visible without scrolling the canvas.
 */
import type { GuidelinePage } from '../../model/document';
import { pageDisplayName } from '../../model/document';
import { getPageType } from '../../model/pageLibrary';

export function ContentPanel({
  pages,
  selectedId,
  activeId,
  editedIds,
  onSelect,
}: {
  pages: GuidelinePage[];
  selectedId?: string;
  /** The page currently filling the viewport — highlighted even when nothing is selected. */
  activeId?: string;
  editedIds: Set<string>;
  onSelect: (pageId: string) => void;
}) {
  let n = 0;
  return (
    <nav className="gl-outline" aria-label="Guideline pages">
      <ol className="gl-outline-list">
        {pages.map((page) => {
          n += 1;
          const isSection = page.type === 'section';
          return (
            <li key={page.id}>
              <button
                type="button"
                className={`gl-outline-item${isSection ? ' is-section' : ''}`}
                data-selected={page.id === selectedId || undefined}
                data-active={page.id === activeId || undefined}
                onClick={() => onSelect(page.id)}
              >
                {/* Position in the document, for every row including chapter
                    dividers — a divider IS a page, and numbering chapters 1·2·3
                    beside pages 03·04·05 read as a broken counter. The chapter's
                    own number is on the divider page itself. */}
                <span className="gl-outline-num">{String(n).padStart(2, '0')}</span>
                <span className="gl-outline-text">
                  <span className="gl-outline-name">{pageDisplayName(page)}</span>
                  {/* The type is a SECOND line only when it adds something. An
                      untitled page displays its type name already, and printing
                      it twice reads as a rendering bug. */}
                  {!isSection && typeName(page) && (
                    <span className="gl-outline-type">{typeName(page)}</span>
                  )}
                </span>
                {editedIds.has(page.id) && <span className="gl-outline-dot" title="Edited" />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The page's type name, when the page's own name is not already it. */
function typeName(page: GuidelinePage): string | undefined {
  const name = getPageType(page.type)?.name;
  if (!name) return undefined;
  // Case-insensitive: a page titled "Core Values" over the type "Core values"
  // is the same word twice, which reads as a rendering fault.
  return name.toLowerCase() === pageDisplayName(page).toLowerCase() ? undefined : name;
}
