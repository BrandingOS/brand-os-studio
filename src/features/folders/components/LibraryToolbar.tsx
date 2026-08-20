/**
 * LibraryToolbar — the header band of the asset library.
 *
 * One compact strip carries everything the old page spread over half a
 * viewport: the Assets/Designs tabs, the count, upload, the category
 * filters, search, sort and the grid/list switch. Uploading lives here as a
 * secondary button, not as a permanent dropzone — it is something you do
 * occasionally, and the collection is what you came to look at.
 *
 * Every control is a DS primitive (DsTabBar, DsChip, DsInput, DsSegmented,
 * DsButton); the only feature-local part is the layout that arranges them.
 */
import * as React from 'react';
import { LayoutGrid, List, Search, Upload, X } from 'lucide-react';
import { DsButton, DsChip, DsInput, DsSegmented, DsTabBar } from '@/shared/ds';
import {
  LIBRARY_CATEGORIES,
  categoryLabel,
  type LibraryCategory,
  type SortKey,
} from '../model';

export type LibraryTab = 'assets' | 'designs';

const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Newest',
  name: 'Name',
  size: 'Largest',
};

const SORT_ORDER: SortKey[] = ['recent', 'name', 'size'];

export interface LibraryToolbarProps {
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  /** Shown beside the title — the whole library, not the filtered view. */
  totalCount: number;
  /** Rendered when a filter or search narrows the list. */
  filteredCount: number;
  /** Saved designs, once the Designs panel has loaded them. */
  designCount: number | null;
  category: LibraryCategory;
  onCategoryChange: (category: LibraryCategory) => void;
  counts: Record<LibraryCategory, number>;
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  selectionMode: boolean;
  onToggleSelection: () => void;
  onUpload: () => void;
}

export function LibraryToolbar({
  tab,
  onTabChange,
  totalCount,
  filteredCount,
  designCount,
  category,
  onCategoryChange,
  counts,
  search,
  onSearchChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  selectionMode,
  onToggleSelection,
  onUpload,
}: LibraryToolbarProps) {
  const narrowed = filteredCount !== totalCount;

  return (
    <div className="fl-toolbar">
      <div className="fl-toolbar-top">
        <div className="fl-toolbar-identity">
          <h1 className="fl-title">Folders</h1>
          <span className="fl-count">
            {tab === 'designs'
              ? designCount === null
                ? ''
                : `${designCount} ${designCount === 1 ? 'design' : 'designs'}`
              : narrowed
                ? `${filteredCount} of ${totalCount}`
                : `${totalCount} ${totalCount === 1 ? 'asset' : 'assets'}`}
          </span>
        </div>

        <div className="fl-toolbar-top-right">
          <DsTabBar
            aria-label="Library"
            value={tab}
            onChange={(v) => onTabChange(v as LibraryTab)}
            tabs={[
              { value: 'assets', label: 'Assets' },
              { value: 'designs', label: 'Designs' },
            ]}
          />
          {tab === 'assets' && (
            <DsButton tone="secondary" size="sm" onClick={onUpload}>
              <Upload size={13} strokeWidth={1.8} />
              Upload assets
            </DsButton>
          )}
        </div>
      </div>

      {/* Filters, search, sort and view are noise over an empty library —
          there is nothing to narrow. They appear with the first asset. */}
      {tab === 'assets' && totalCount > 0 && (
        <div className="fl-toolbar-bottom">
          <div className="fl-filters" role="group" aria-label="Filter by category">
            {LIBRARY_CATEGORIES.map((c) => (
              <DsChip
                key={c}
                active={c === category}
                aria-pressed={c === category}
                onClick={() => onCategoryChange(c)}
              >
                {categoryLabel(c)}
                {counts[c] > 0 && <span className="fl-chip-count">{counts[c]}</span>}
              </DsChip>
            ))}
          </div>

          <div className="fl-tools">
            <div className="fl-search">
              <Search size={14} strokeWidth={1.8} aria-hidden />
              <DsInput
                pill
                type="search"
                value={search}
                aria-label="Search assets"
                placeholder="Search by name or tag"
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="fl-search-clear"
                  aria-label="Clear search"
                  onClick={() => onSearchChange('')}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              )}
            </div>

            <DsSegmented
              aria-label="Sort"
              value={sort}
              onChange={(v) => onSortChange(v as SortKey)}
              options={SORT_ORDER.map((s) => ({ value: s, label: SORT_LABEL[s] }))}
            />

            <DsSegmented
              aria-label="View"
              value={view}
              onChange={(v) => onViewChange(v as 'grid' | 'list')}
              options={[
                { value: 'grid', label: <LayoutGrid size={14} strokeWidth={1.8} aria-label="Grid" /> },
                { value: 'list', label: <List size={14} strokeWidth={1.8} aria-label="List" /> },
              ]}
            />

            <DsButton
              tone={selectionMode ? 'primary' : 'tertiary'}
              size="sm"
              onClick={onToggleSelection}
            >
              {selectionMode ? 'Done' : 'Select'}
            </DsButton>
          </div>
        </div>
      )}
    </div>
  );
}
