/**
 * AssetActionsMenu — the per-item "More" menu, in three panes.
 *
 * Root: rename · move to folder · change category · copy link · delete.
 * Folder pane: the brand's folder tree, indented, plus the root.
 * Category pane: the six library categories.
 *
 * Folder and category are DIFFERENT things and the menu has to say so.
 * A folder is where the item lives in the brand — shared with Designs and
 * Kit. A category is what kind of asset it is — a Library facet only. An
 * earlier version called the category pane "Move to…", which read as the
 * filing action and is now what the folder pane is called.
 *
 * Built on DsMenu/DsMenuItem, which render IN PLACE (no portal) so `--ds-*`
 * resolves in the workspace's theme scope. The card must therefore not clip
 * it: `.fl-tile` keeps `overflow: visible`, only the thumbnail well clips.
 */
import * as React from 'react';
import { Check, ChevronLeft, FolderInput, Link2, PencilLine, Tag, Trash2 } from 'lucide-react';
import { DsMenu, DsMenuItem, DsMenuDivider } from '@/shared/ds';
import type { Asset, BrandFolder } from '@/shared/types/brand';
import { buildFolderTree, type FolderNode } from '@/shared/folders';
import { ASSIGNABLE_CATEGORIES, categoryLabel } from '../model';

export interface AssetActionsMenuProps {
  asset: Asset;
  /** The brand's whole tree. Omit to hide the folder action entirely. */
  folders?: BrandFolder[];
  onRename: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
  onChangeCategory: (category: Asset['category']) => void;
  onCopyLink?: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function flatten(nodes: FolderNode[], depth = 0): Array<{ folder: BrandFolder; depth: number }> {
  return nodes.flatMap((n) => [{ folder: n.folder, depth }, ...flatten(n.children, depth + 1)]);
}

export function AssetActionsMenu({
  asset,
  folders,
  onRename,
  onMoveToFolder,
  onChangeCategory,
  onCopyLink,
  onDelete,
  onClose,
}: AssetActionsMenuProps) {
  const [pane, setPane] = React.useState<'root' | 'folder' | 'category'>('root');
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

  const rows = React.useMemo(
    () => (folders ? flatten(buildFolderTree(folders)) : []),
    [folders],
  );
  const currentFolder = asset.folderId ?? null;

  const back = (
    <>
      <DsMenuItem icon={<ChevronLeft size={14} strokeWidth={1.8} />} onClick={() => setPane('root')}>
        Back
      </DsMenuItem>
      <DsMenuDivider />
    </>
  );

  return (
    <div ref={ref} className="fl-menu-anchor">
      <DsMenu aria-label={`Actions for ${asset.name}`}>
        {pane === 'root' && (
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
            {onMoveToFolder && (
              <DsMenuItem
                icon={<FolderInput size={14} strokeWidth={1.8} />}
                onClick={() => setPane('folder')}
              >
                Move to folder…
              </DsMenuItem>
            )}
            <DsMenuItem icon={<Tag size={14} strokeWidth={1.8} />} onClick={() => setPane('category')}>
              Change category…
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
        )}

        {pane === 'folder' && onMoveToFolder && (
          <>
            {back}
            <DsMenuItem
              icon={currentFolder === null ? <Check size={14} strokeWidth={2} /> : <Spacer />}
              onClick={() => {
                onMoveToFolder(null);
                onClose();
              }}
            >
              Folders (root)
            </DsMenuItem>
            {rows.map(({ folder, depth }) => (
              <DsMenuItem
                key={folder.id}
                icon={folder.id === currentFolder ? <Check size={14} strokeWidth={2} /> : <Spacer />}
                style={{ paddingLeft: 10 + depth * 12 }}
                onClick={() => {
                  onMoveToFolder(folder.id);
                  onClose();
                }}
              >
                {folder.name}
              </DsMenuItem>
            ))}
            {rows.length === 0 && <DsMenuItem disabled>No folders yet</DsMenuItem>}
          </>
        )}

        {pane === 'category' && (
          <>
            {back}
            {ASSIGNABLE_CATEGORIES.map((c) => (
              <DsMenuItem
                key={c}
                icon={c === asset.category ? <Check size={14} strokeWidth={2} /> : <Spacer />}
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

/** Keeps unticked rows aligned with ticked ones. */
function Spacer() {
  return <span style={{ display: 'inline-block', width: 14 }} />;
}
