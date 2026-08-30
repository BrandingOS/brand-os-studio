import { useEffect, useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { renderCosmosTemplate as renderTemplateDesign } from '../renderers';
import { KitFilterRow, KitFilterEmpty, useKitFilter } from './KitFilterRow';

/**
 * Browse-and-add picker for template variants (business cards,
 * letterheads, …). The drilldown shows a curated showcase by
 * default; this modal opens via the drilldown's "+" button and
 * lists every variant the showcase doesn't already include.
 * Picking one calls `onPick` so the parent appends it to the set.
 */
export type TemplatePickerModalProps = {
  open: boolean;
  /** Header label inside the modal. Defaults to "Add variant". */
  title?: string;
  /** What the user calls this family — the search placeholder's noun.
   *  The TITLE is a sentence ("Add business card variant") and reads as
   *  nonsense inside "Search 21 … designs". */
  noun?: string;
  templates: BrandKitTemplate[];
  /** IDs already in the showcase — filtered out of the picker grid. */
  excludedIds: string[];
  /** Aspect ratio of each picker tile (width / height) — letterheads
   *  are tall (portrait) so they need a different ratio than cards. */
  tileAspect?: number;
  sourceBrand?: Brand;
  mockBrand?: MockBrand;
  onPick: (template: BrandKitTemplate) => void;
  onClose: () => void;
};

export function TemplatePickerModal({
  open,
  title = 'Add variant',
  noun,
  templates,
  excludedIds,
  tileAspect = 1.6,
  sourceBrand,
  mockBrand,
  onPick,
  onClose,
}: TemplatePickerModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  /**
   * The picker IS the library — the drilldown shows three featured
   * designs and everything else is in here, which is why the search and
   * the chips matter more on this surface than on that one. Hooks run
   * before the early return: a picker that is closed still has to obey
   * the rules of hooks.
   */
  const offered = useMemo(() => {
    const excluded = new Set(excludedIds);
    return templates.filter((t) => !excluded.has(t.id));
  }, [templates, excludedIds]);
  const filter = useKitFilter(offered, title);
  const searchNoun = noun ?? 'variant';
  const visible = filter.visible;

  if (!open) return null;

  return (
    <div
      className="bk-card-picker-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="bk-card-picker" onClick={(e) => e.stopPropagation()}>
        <div className="bk-card-picker-head">
          <h2 className="bk-card-picker-title">{title}</h2>
          <button
            type="button"
            className="bk-card-picker-close"
            onClick={onClose}
            aria-label="Close picker"
            title="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <KitFilterRow
          filter={filter}
          total={offered.length}
          noun={searchNoun}
          className="bk-card-picker-filter"
        />
        <div className="bk-card-picker-grid" role="listbox" aria-label="Template variants">
          {offered.length === 0 ? (
            <p className="bk-card-picker-empty">No more variants — all are already in the showcase.</p>
          ) : visible.length === 0 ? (
            <KitFilterEmpty onClear={filter.clear} />
          ) : (
            visible.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="bk-card-picker-cell"
                onClick={() => onPick(tpl)}
                aria-label={`Add ${tpl.name}`}
                title={tpl.name}
              >
                <span
                  className="bk-card-picker-tile"
                  style={{ aspectRatio: `${tileAspect}` }}
                  aria-hidden
                >
                  {sourceBrand && renderTemplateDesign(tpl, sourceBrand, mockBrand)}
                </span>
                <span className="bk-card-picker-cell-label">{tpl.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
