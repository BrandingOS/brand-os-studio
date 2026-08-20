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
import { Download, FolderPlus, LayoutGrid, List, Search, Upload, X } from 'lucide-react';
import { DsButton, DsChip, DsInput, DsSegmented, DsTabBar } from '@/shared/ds';
import type { BrandFolder } from '@/shared/types/brand';
import { FolderBreadcrumb } from './FolderBreadcrumb';
import {
  LIBRARY_CATEGORIES,
  categoryLabel,
  type LibraryCategory,
  type SortKey,
} from '../model';

/**
 * The three views. They are not three folder systems — the folder tree is
 * the brand's, and these filter what is shown inside the folder you are in.
 *
 *   library  source assets and files
 *   designs  creative work in progress
 *   kit      approved final brand deliverables
 */
export type LibraryTab = 'library' | 'designs' | 'kit';

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
  /** Saved designs in view, once the Designs panel has loaded them. */
  designCount: number | null;
  /** Kit deliverables in view. */
  kitCount: number | null;
  /** Root → current folder. Empty at the root. */
  path: BrandFolder[];
  onNavigateFolder: (folderId: string | null) => void;
  onNewFolder: () => void;
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
  onDownloadKit: () => void;
  onAddKitDeliverable: () => void;
  kitBusy: boolean;
}

function countLabel({
  tab,
  totalCount,
  filteredCount,
  designCount,
  kitCount,
  narrowed,
}: {
  tab: LibraryTab;
  totalCount: number;
  filteredCount: number;
  designCount: number | null;
  kitCount: number | null;
  narrowed: boolean;
}): string {
  const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
  if (tab === 'designs') return designCount === null ? '' : plural(designCount, 'design');
  if (tab === 'kit') return kitCount === null ? '' : plural(kitCount, 'deliverable');
  return narrowed ? `${filteredCount} of ${totalCount}` : plural(totalCount, 'asset');
}

export function LibraryToolbar({
  tab,
  onTabChange,
  totalCount,
  filteredCount,
  designCount,
  kitCount,
  path,
  onNavigateFolder,
  onNewFolder,
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
  onDownloadKit,
  onAddKitDeliverable,
  kitBusy,
}: LibraryToolbarProps) {
  const narrowed = filteredCount !== totalCount;

  return (
    <div className="fl-toolbar">
      <div className="fl-toolbar-top">
        <div className="fl-toolbar-identity">
          <FolderBreadcrumb path={path} onNavigate={onNavigateFolder} />
          <span className="fl-count">{countLabel({ tab, totalCount, filteredCount, designCount, kitCount, narrowed })}</span>
        </div>

        <div className="fl-toolbar-top-right">
          <DsTabBar
            aria-label="Library"
            value={tab}
            onChange={(v) => onTabChange(v as LibraryTab)}
            tabs={[
              { value: 'library', label: 'Library' },
              { value: 'designs', label: 'Designs' },
              { value: 'kit', label: 'Kit' },
            ]}
          />
          <DsButton tone="tertiary" size="sm" onClick={onNewFolder}>
            <FolderPlus size={13} strokeWidth={1.8} />
            New folder
          </DsButton>
          {tab === 'library' && (
            <DsButton tone="secondary" size="sm" onClick={onUpload}>
              <Upload size={13} strokeWidth={1.8} />
              Upload
            </DsButton>
          )}
          {tab === 'kit' && (
            <>
              <DsButton tone="tertiary" size="sm" onClick={onDownloadKit} disabled={kitBusy}>
                <Download size={13} strokeWidth={1.8} />
                {kitBusy ? 'Working…' : 'Download kit'}
              </DsButton>
              <DsButton tone="secondary" size="sm" onClick={onAddKitDeliverable} disabled={kitBusy}>
                <Upload size={13} strokeWidth={1.8} />
                Add deliverable
              </DsButton>
            </>
          )}
        </div>
      </div>

      {/* Filters, search, sort and view are noise over an empty library —
          there is nothing to narrow. They appear with the first asset. */}
      {tab === 'library' && totalCount > 0 && (
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
