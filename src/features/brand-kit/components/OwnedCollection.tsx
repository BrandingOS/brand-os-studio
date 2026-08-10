import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ContextMenu,
  type ContextMenuState,
} from '@/features/setup/components/ContextMenu';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import { useKitStore } from '../kit/kitStore';
import { approvedItems } from '../kit/types';
import type { DeliverableDef } from '../kit/registry';
import { renderKitPreview, templateForVariant } from '../kit/preview';

/**
 * Owned-collection grid — what the drilldown shows for an APPROVED
 * deliverable: the user's designs (primary first), not the full
 * template library. Hover actions cover the two everyday operations
 * (customize / export); the right-click menu carries the full set
 * (set primary / duplicate / remove).
 */
type Props = {
  def: DeliverableDef;
  brand: MockBrand;
  sourceBrand?: Brand;
  onCustomize: (itemId: string) => void;
  onExport: (itemId: string) => void;
};

export function OwnedCollection({ def, brand, sourceBrand, onCustomize, onExport }: Props) {
  const record = useKitStore((s) => s.deliverables[def.key]);
  const setPrimary = useKitStore((s) => s.setPrimary);
  const duplicateItem = useKitStore((s) => s.duplicateItem);
  const removeItem = useKitStore((s) => s.removeItem);

  const items = useMemo(() => {
    const approved = approvedItems(record);
    const primaryId = record?.primaryItemId ?? approved[0]?.id ?? null;
    // Primary first, then newest-approved first.
    return [...approved].sort((a, b) => {
      if (a.id === primaryId) return -1;
      if (b.id === primaryId) return 1;
      return (b.approvedAt ?? '').localeCompare(a.approvedAt ?? '');
    });
  }, [record]);

  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxAnchorRef = useRef<HTMLElement | null>(null);
  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

  const openMenu = useCallback(
    (e: React.MouseEvent, itemId: string, isPrimary: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      const anchor = (e.currentTarget as HTMLElement).closest('.bk-variant-card') as HTMLElement | null;
      if (ctxAnchorRef.current && ctxAnchorRef.current !== anchor) {
        ctxAnchorRef.current.classList.remove('is-ctx-active');
      }
      ctxAnchorRef.current = anchor;
      anchor?.classList.add('is-ctx-active');
      const items: ContextMenuState['items'] = [
        { label: 'Customize', onSelect: () => onCustomize(itemId) },
        ...(!isPrimary
          ? [{ label: 'Set as primary', onSelect: () => setPrimary(def.key, itemId) }]
          : []),
        { label: 'Duplicate', onSelect: () => duplicateItem(def.key, itemId) },
        { label: 'Export', onSelect: () => onExport(itemId) },
        { label: 'Remove', onSelect: () => removeItem(def.key, itemId), destructive: true },
      ];
      setCtxMenu({ x: e.clientX, y: e.clientY, items });
    },
    [def.key, onCustomize, onExport, setPrimary, duplicateItem, removeItem],
  );

  const primaryId = record?.primaryItemId ?? items[0]?.id ?? null;

  return (
    <>
      <div className="bk-drilldown-grid">
        {items.map((item) => {
          const template = templateForVariant(def, brand, item.variantId);
          const preview = renderKitPreview(def, template, item.customization, sourceBrand, brand);
          const isPrimary = item.id === primaryId;
          return (
            <figure
              key={item.id}
              className="bk-variant-card bk-owned-card"
              onContextMenu={(e) => openMenu(e, item.id, isPrimary)}
            >
              <button
                type="button"
                className="bk-variant-tile"
                style={{ aspectRatio: `${def.aspect}` }}
                onClick={() => onCustomize(item.id)}
                aria-label={`Customize ${template?.name ?? def.label}`}
              >
                {preview ? (
                  <span className="bk-variant-tile-render" aria-hidden>
                    {preview}
                  </span>
                ) : (
                  <span className="bk-variant-tile-cover" aria-hidden />
                )}
                {isPrimary && (
                  <span className="bk-owned-primary-chip" title="Primary design">
                    <StarIcon />
                    Primary
                  </span>
                )}
              </button>
              <figcaption className="bk-variant-label">
                {template?.name ?? def.label}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={closeCtxMenu} />
      )}
    </>
  );
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
