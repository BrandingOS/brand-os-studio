/**
 * The explorer's two peer views, and how a URL maps onto them.
 *
 * `/__architecture` is the entry point; `/__architecture/tree` and
 * `/__architecture/search` address a view directly so a link can land someone
 * exactly where you meant.
 *
 * Tree is the default because the entry-point case is "I don't know this
 * codebase and don't know what to search for". Search is one click or one URL
 * away.
 */
export type ExplorerView = 'tree' | 'search';

export interface ViewMeta {
  id: ExplorerView;
  label: string;
  hint: string;
}

export const EXPLORER_VIEWS: ViewMeta[] = [
  { id: 'tree', label: 'Tree', hint: 'Browse the app top-down' },
  { id: 'search', label: 'Search', hint: 'Find a page by name, URL, component or file' },
];

/** Anything unrecognised (or absent) falls back to the browsing view. */
export function normalizeView(value: string | undefined): ExplorerView {
  return value === 'search' ? 'search' : 'tree';
}

export function viewPath(view: ExplorerView, selectedId?: string | null): string {
  const search = selectedId ? `?r=${encodeURIComponent(selectedId)}` : '';
  return `/__architecture/${view}${search}`;
}
