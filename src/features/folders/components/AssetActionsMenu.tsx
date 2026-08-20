/**
 * AssetActionsMenu — the per-asset "More" menu, in two panes.
 *
 * Root pane: rename · move to category · copy link · delete.
 * Category pane: the six real categories, current one marked.
 *
 * Built on DsMenu/DsMenuItem, which render IN PLACE (no portal) so the
 * `--ds-*` tokens resolve in the workspace's theme scope. That means the
 * card must not clip it — `.fl-tile` keeps `overflow: visible` and only the
 * thumbnail well clips.
 */
import * as React from 'react';
import { Check, ChevronLeft, FolderInput, Link2, PencilLine, Trash2 } from 'lucide-react';
import { DsMenu, DsMenuItem, DsMenuDivider } from '@/shared/ds';
import type { Asset } from '@/shared/types/brand';
import { ASSIGNABLE_CATEGORIES, categoryLabel } from '../model';

export interface AssetActionsMenuProps {
  asset: Asset;
  onRename: () => void;
  onChangeCategory: (category: Asset['category']) => void;
  onCopyLink?: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function AssetActionsMenu({
  asset,
  onRename,
  onChangeCategory,
  onCopyLink,
  onDelete,
  onClose,
}: AssetActionsMenuProps) {
  const [pane, setPane] = React.useState<'root' | 'category'>('root');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Deferred so the click that opened the menu doesn't immediately close it.
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="fl-menu-anchor">
      <DsMenu aria-label={`Actions for ${asset.name}`}>
        {pane === 'root' ? (
          <>
            <DsMenuItem
              icon={<PencilLine size={14} strokeWidth={1.8} />}
              onClick={() => {
                onRename();
                onClose();
              }}
            >
              Rename
            </DsMenuItem>
            <DsMenuItem
              icon={<FolderInput size={14} strokeWidth={1.8} />}
              onClick={() => setPane('category')}
            >
              Move to…
            </DsMenuItem>
            {onCopyLink && (
              <DsMenuItem
                icon={<Link2 size={14} strokeWidth={1.8} />}
                onClick={() => {
                  onCopyLink();
                  onClose();
                }}
              >
                Copy link
              </DsMenuItem>
            )}
            <DsMenuDivider />
            <DsMenuItem
              danger
              icon={<Trash2 size={14} strokeWidth={1.8} />}
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              Delete
            </DsMenuItem>
          </>
        ) : (
          <>
            <DsMenuItem
              icon={<ChevronLeft size={14} strokeWidth={1.8} />}
              onClick={() => setPane('root')}
            >
              Back
            </DsMenuItem>
            <DsMenuDivider />
            {ASSIGNABLE_CATEGORIES.map((c) => (
              <DsMenuItem
                key={c}
                icon={
                  c === asset.category ? (
                    <Check size={14} strokeWidth={2} />
                  ) : (
                    <span style={{ width: 14 }} />
                  )
                }
                onClick={() => {
                  onChangeCategory(c);
                  onClose();
                }}
              >
                {categoryLabel(c)}
              </DsMenuItem>
            ))}
          </>
        )}
      </DsMenu>
    </div>
  );
}
