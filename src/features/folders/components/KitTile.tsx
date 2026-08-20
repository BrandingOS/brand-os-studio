/**
 * KitTile — one approved brand deliverable.
 *
 * Same tile language as the Library so the three views read as one page, with
 * two differences that matter:
 *
 *   - the artwork is either a LIVE render of the template (generated) or the
 *     user's own file (uploaded), and the tile says which. "Is this ours or
 *     theirs?" is the question that decides whether regenerating is safe, so
 *     it is never left to be inferred from the picture.
 *   - there is no category. A deliverable's kind is its slot.
 */
import * as React from 'react';
import { Download, Maximize2, MoreHorizontal, Upload } from 'lucide-react';
import { DsMenu, DsMenuItem, DsMenuDivider } from '@/shared/ds';
import type { Brand, BrandFolder } from '@/shared/types/brand';
import { buildFolderTree, type FolderNode } from '@/shared/folders';
import { AssetPreview } from './AssetPreview';
import { sectionLabel, useKitPreviewElement, type KitEntry } from '../useKitLibrary';
import { aspectForType } from '@/features/brand-kit/kit/registry';

/** The width every kit renderer is drawn for (see templateSnapshot). */
const CANONICAL_WIDTH = 260;

function flatten(nodes: FolderNode[], depth = 0): Array<{ folder: BrandFolder; depth: number }> {
  return nodes.flatMap((n) => [{ folder: n.folder, depth }, ...flatten(n.children, depth + 1)]);
}

/**
 * Renderers are authored for a 260px-wide card; mounting one wide starves the
 * text (CLAUDE.md). So it is always laid out at 260 and scaled to fit — never
 * re-laid-out at the tile's width.
 */
function ScaledStage({ element, aspect }: { element: React.ReactElement; aspect: number }) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setScale(host.clientWidth / CANONICAL_WIDTH);
    measure();
    if (typeof ResizeObserver === 'undefined') return; // jsdom
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="fl-kit-stage">
      <div
        className="fl-kit-stage-inner"
        style={{
          width: CANONICAL_WIDTH,
          height: Math.round(CANONICAL_WIDTH / aspect),
          transform: `scale(${scale})`,
        }}
      >
        {element}
      </div>
    </div>
  );
}

export interface KitTileProps {
  brand: Brand;
  entry: KitEntry;
  folders: BrandFolder[];
  onOpen: () => void;
  onDownload: () => void;
  onUploadOwn: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onRemove: () => void;
}

export function KitTile({
  brand,
  entry,
  folders,
  onOpen,
  onDownload,
  onUploadOwn,
  onMoveToFolder,
  onRemove,
}: KitTileProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [pane, setPane] = React.useState<'root' | 'folder'>('root');
  const menuRef = React.useRef<HTMLDivElement>(null);
  const element = useKitPreviewElement(brand, entry);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  React.useEffect(() => {
    if (!menuOpen) setPane('root');
  }, [menuOpen]);

  const rows = React.useMemo(() => flatten(buildFolderTree(folders)), [folders]);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const upload = entry.item.upload;

  return (
    <div
      className="fl-tile fl-tile--kit"
      data-menu-open={menuOpen || undefined}
      role="button"
      tabIndex={0}
      aria-label={entry.def.label}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="fl-tile-well">
        {entry.origin === 'uploaded' && upload ? (
          <AssetPreview
            asset={{
              name: upload.fileName,
              url: upload.url,
              type: upload.mimeType.startsWith('image/') ? 'image' : 'document',
              metadata: { format: upload.mimeType },
            }}
          />
        ) : element ? (
          <ScaledStage element={element} aspect={aspectForType(entry.def.templateType)} />
        ) : (
          <div className="fl-preview fl-preview--glyph fl-preview--tile" aria-hidden>
            <span className="fl-preview-ext">{entry.def.label}</span>
          </div>
        )}

        <span
          className="fl-kit-badge"
          data-origin={entry.origin}
          title={
            entry.origin === 'uploaded'
              ? 'You uploaded this finished deliverable'
              : 'Generated by BrandingOS'
          }
        >
          {entry.origin === 'uploaded' ? 'Yours' : 'Generated'}
        </span>
        {entry.inReview && <span className="fl-kit-badge fl-kit-badge--review">In review</span>}

        <div className="fl-tile-rail" onClick={stop}>
          <button type="button" className="fl-tile-act" aria-label="Preview" onClick={onOpen}>
            <Maximize2 size={14} strokeWidth={1.8} />
          </button>
          <button type="button" className="fl-tile-act" aria-label="Download" onClick={onDownload}>
            <Download size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="fl-tile-act"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={14} strokeWidth={1.8} />
          </button>
        </div>

        {menuOpen && (
          <div ref={menuRef} className="fl-menu-anchor" onClick={stop}>
            <DsMenu aria-label={`Actions for ${entry.def.label}`}>
              {pane === 'root' ? (
                <>
                  <DsMenuItem
                    icon={<Upload size={14} strokeWidth={1.8} />}
                    onClick={() => {
                      onUploadOwn();
                      setMenuOpen(false);
                    }}
                  >
                    Upload your own version…
                  </DsMenuItem>
                  <DsMenuItem onClick={() => setPane('folder')}>Move to folder…</DsMenuItem>
                  <DsMenuDivider />
                  <DsMenuItem
                    danger
                    onClick={() => {
                      onRemove();
                      setMenuOpen(false);
                    }}
                  >
                    Remove from kit
                  </DsMenuItem>
                </>
              ) : (
                <>
                  <DsMenuItem onClick={() => setPane('root')}>Back</DsMenuItem>
                  <DsMenuDivider />
                  <DsMenuItem
                    onClick={() => {
                      onMoveToFolder(null);
                      setMenuOpen(false);
                    }}
                  >
                    Folders (root)
                  </DsMenuItem>
                  {rows.map(({ folder, depth }) => (
                    <DsMenuItem
                      key={folder.id}
                      style={{ paddingLeft: 10 + depth * 12 }}
                      onClick={() => {
                        onMoveToFolder(folder.id);
                        setMenuOpen(false);
                      }}
                    >
                      {folder.name}
                    </DsMenuItem>
                  ))}
                  {rows.length === 0 && <DsMenuItem disabled>No folders yet</DsMenuItem>}
                </>
              )}
            </DsMenu>
          </div>
        )}
      </div>

      <div className="fl-tile-meta">
        <div className="fl-tile-name" title={entry.def.label}>
          {entry.def.label}
        </div>
        <div className="fl-tile-sub">
          <span className="fl-tile-cat">{sectionLabel(entry.def)}</span>
          {upload && (
            <>
              <span className="fl-tile-dot" aria-hidden>
                ·
              </span>
              <span className="fl-tile-spec">{upload.fileName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
