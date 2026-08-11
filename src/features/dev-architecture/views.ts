/**
 * The explorer's three peer views, and how a URL maps onto them.
 *
 * Each answers a different question about the same architecture model:
 *
 *   Diagram  how does the system connect and flow?
 *   Tree     what exists?
 *   Search   where is X?
 *
 * `/__architecture` is the entry point; `/__architecture/diagram|tree|search`
 * address a view directly so a link can land someone exactly where you meant.
 *
 * Diagram is the default: the entry-point case is someone who doesn't understand
 * the codebase yet, and a spatial map communicates that faster than a list.
 */
export type ExplorerView = 'diagram' | 'tree' | 'search';

export interface ViewMeta {
  id: ExplorerView;
  label: string;
  hint: string;
}

export const EXPLORER_VIEWS: ViewMeta[] = [
  { id: 'diagram', label: 'Diagram', hint: 'See how areas, pages and flows connect' },
  { id: 'tree', label: 'Tree', hint: 'Browse the app top-down' },
  { id: 'search', label: 'Search', hint: 'Find a page by name, URL, component or file' },
];

const VIEW_IDS = new Set<string>(EXPLORER_VIEWS.map((view) => view.id));

/** Anything unrecognised (or absent) falls back to the visual entry view. */
export function normalizeView(value: string | undefined): ExplorerView {
  return value && VIEW_IDS.has(value) ? (value as ExplorerView) : 'diagram';
}

export function viewPath(view: ExplorerView, selectedId?: string | null): string {
  const search = selectedId ? `?r=${encodeURIComponent(selectedId)}` : '';
  return `/__architecture/${view}${search}`;
}
