/**
 * What you can do to ONE variant, from the variant itself.
 *
 * `.audit/OURS.md` D53: there were no per-tile actions anywhere in the kit.
 * A tile was a single click that opened the editor, plus a two-item
 * right-click menu on the few families wired to Design. Everything else —
 * downloading the design you are actually looking at, promoting it to the
 * card's face, copying its vector — was either unreachable or reached
 * through the CARD, which silently acted on the card's FIRST variant
 * instead of the one under the cursor.
 *
 * Three rules this component keeps:
 *
 *   1. **Real buttons, and a SIBLING of the tile.** The tile is a `<button>`
 *      and a button inside a button is not a button, so the cluster lives
 *      beside it inside `.bk-variant-card` — which is also what lets its
 *      menus escape the tile's own `overflow: hidden`. Hover and focus
 *      belong to the CARD, so reaching for an action raises the tile too.
 *   2. **One download vocabulary.** The ⬇ opens the shared `DownloadMenu` —
 *      the same five words on the card, the tile, the drilldown header and
 *      the editor (spec §5b).
 *   3. **Escape peels one layer.** A menu open over the drilldown swallows
 *      Escape and closes itself; only a tile with no menu open lets Escape
 *      through to close the drilldown.
 */
import { useEffect, useRef, useState } from 'react';
import { DsMenu, DsMenuDivider, DsMenuItem } from '@/shared/ds';
import type { DownloadOption } from '../data/exportFormats';
import { DownloadMenu, type DownloadChoice } from './DownloadMenu';

/** An entry in the ⋯ menu. Absent handlers are absent items. */
export type TileMenuAction = {
  label: string;
  onSelect: () => void;
  /** Shown but not usable, with the reason as its title (spec §1). */
  disabledReason?: string;
  /** Draws a divider ABOVE this item. */
  separated?: boolean;
};

export type TileActionsProps = {
  /** What the user calls this variant — used for every accessible name. */
  name: string;
  downloadOptions?: DownloadOption[];
  onDownload?: (choice: DownloadChoice) => void;
  onEdit?: () => void;
  actions?: TileMenuAction[];
};

function DownloadGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EditGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}

export function TileActions({
  name,
  downloadOptions,
  onDownload,
  onEdit,
  actions = [],
}: TileActionsProps) {
  const [open, setOpen] = useState<'download' | 'more' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // BOTH menus, not just the ⋯ one. The drilldown's own Escape listener
    // is on `window`, which is reached AFTER `document` in the bubble
    // phase — so stopping propagation here is what makes Escape peel one
    // layer instead of closing the menu and the whole drilldown at once.
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Peel one layer: the drilldown's own Escape must not also fire.
      e.stopPropagation();
      setOpen(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const usable = actions.length > 0;
  if (!onDownload && !onEdit && !usable) return null;

  return (
    <div
      ref={rootRef}
      className="bk-tile-actions"
      // A click on an action is not a click on the tile, and Enter/Space
      // here must not open the tile either.
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Escape is handled HERE rather than swallowed. React attaches its
        // listener at the root container, so `stopPropagation` on a
        // synthetic event stops the NATIVE event too — an unconditional
        // stop meant the document-level Escape handler below never ran and
        // the menu stayed open under a key press that closed nothing.
        if (e.key === 'Escape') {
          if (!open) return; // nothing of ours to peel — let the drilldown close
          e.stopPropagation();
          setOpen(null);
          return;
        }
        e.stopPropagation();
      }}
    >
      {onDownload && downloadOptions && downloadOptions.length > 0 && (
        <button
          type="button"
          className="bk-tile-action"
          aria-label={`Download ${name}`}
          title={`Download ${name}`}
          aria-haspopup="menu"
          aria-expanded={open === 'download'}
          onClick={() => setOpen((v) => (v === 'download' ? null : 'download'))}
        >
          <DownloadGlyph />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          className="bk-tile-action"
          aria-label={`Edit ${name}`}
          title={`Edit ${name}`}
          onClick={onEdit}
        >
          <EditGlyph />
        </button>
      )}
      {usable && (
        <button
          type="button"
          className="bk-tile-action"
          aria-label={`More actions for ${name}`}
          title="More actions"
          aria-haspopup="menu"
          aria-expanded={open === 'more'}
          onClick={() => setOpen((v) => (v === 'more' ? null : 'more'))}
        >
          <MoreGlyph />
        </button>
      )}

      {open === 'download' && onDownload && downloadOptions && (
        <DownloadMenu
          options={downloadOptions}
          anchor={{ top: 34, left: 0 }}
          onClose={() => setOpen(null)}
          onChoose={onDownload}
        />
      )}
      {open === 'more' && (
        <div className="bk-tile-menu">
          <DsMenu aria-label={`More actions for ${name}`}>
            {actions.map((a, i) => (
              <div key={a.label}>
                {a.separated && i > 0 && <DsMenuDivider />}
                <DsMenuItem
                  disabled={Boolean(a.disabledReason)}
                  title={a.disabledReason}
                  onClick={() => {
                    setOpen(null);
                    a.onSelect();
                  }}
                >
                  {a.label}
                </DsMenuItem>
              </div>
            ))}
          </DsMenu>
        </div>
      )}
    </div>
  );
}

export default TileActions;
