/**
 * The outline — every page in the document, in order.
 *
 * Rows are `.panel-item`, the same row Setup, Brand Kit, Tools and the design
 * editor's Insert panel use: thumb · name · sub, active state on the row.
 * Chapter dividers are the same row with a heavier name, so the shape of the
 * guideline is visible without a second component.
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
  /** The page filling the viewport — highlighted even with nothing selected. */
  activeId?: string;
  editedIds: Set<string>;
  onSelect: (pageId: string) => void;
}) {
  return (
    <nav className="panel-list" aria-label="Guideline pages">
      {pages.map((page, index) => {
        const isSection = page.type === 'section';
        const active = page.id === selectedId || (!selectedId && page.id === activeId);
        return (
          <div
            key={page.id}
            className={`panel-item gl-outline-item${isSection ? ' is-chapter' : ''}${active ? ' is-active' : ''}`}
          >
            <button type="button" className="panel-item-body" onClick={() => onSelect(page.id)}>
              <span className="panel-item-thumb gl-outline-num">{String(index + 1).padStart(2, '0')}</span>
              <span className="panel-item-meta">
                <span className="panel-item-name">{pageDisplayName(page)}</span>
                {!isSection && typeName(page) && (
                  <span className="panel-item-sub">{typeName(page)}</span>
                )}
              </span>
            </button>
            {editedIds.has(page.id) && <span className="gl-edited-dot" title="Edited" />}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * The page's type name, when the page's own name is not already it.
 *
 * An untitled page displays its type name already, and printing it twice reads
 * as a rendering fault. Compared case-insensitively — "Core Values" over "Core
 * values" is the same word twice.
 */
function typeName(page: GuidelinePage): string | undefined {
  const name = getPageType(page.type)?.name;
  if (!name) return undefined;
  return name.toLowerCase() === pageDisplayName(page).toLowerCase() ? undefined : name;
}
