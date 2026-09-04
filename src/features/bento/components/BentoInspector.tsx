/**
 * The right panel: one place where everything about the document is edited.
 *
 * Two subjects, one panel, and the segmented control names which one you are
 * looking at — `Tile` for the thing selected on the canvas, `Document` for the
 * canvas itself. The alternative shapes were both worse: a second toolbar row
 * for the document (which is what this replaces, and is the arrangement that
 * made the page read as a tool bolted on rather than a page of the product),
 * or both sets stacked in one scroller, where the properties of the artboard
 * and the properties of one tile in it look like the same list.
 *
 * Selecting a tile SWITCHES to Tile, because selecting a tile is a request to
 * edit it. Deselecting does not switch back — you were reading Document, so
 * you stay there.
 *
 * The chrome is the workspace shell's own panel vocabulary — `.panel`,
 * `.panel-top`, `.panel-heading` — the same one SetupSidebar, ToolsSidebar and
 * the Guideline builder are built from, and the header follows the Brand Kit
 * card editor's customise rail: the eyebrow says what the panel is, the title
 * says what you are editing. A bare segmented control said neither.
 */

const KIND_NAME: Record<TileKind, string> = {
  logo: 'Logo',
  color: 'Colour',
  gradient: 'Gradient',
  typography: 'Typography',
  'voice-quote': 'Voice / Quote',
  'asset-image': 'Brand asset',
  'user-image': 'Uploaded image',
  text: 'Text',
  pattern: 'Pattern',
  stat: 'Stat',
  empty: 'Empty',
};
import { useEffect, useRef, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { DsSegmented } from '@/shared/ds';
import type { BentoTile, TileKind } from '../types';
import { TileInspector } from './TileInspector';
import { DocumentPanel } from './DocumentPanel';

type Subject = 'tile' | 'document';

export function BentoInspector({
  tile,
  brand,
  onOpenMedia,
}: {
  tile: BentoTile | null;
  brand: Brand | null | undefined;
  onOpenMedia: (tileId: string) => void;
}) {
  const [subject, setSubject] = useState<Subject>('document');
  const lastTileId = useRef<string | null>(null);

  useEffect(() => {
    // On SELECTION, not on every render with a tile — otherwise a click on the
    // Document tab while a tile is selected is undone before it paints.
    if (tile && tile.id !== lastTileId.current) setSubject('tile');
    lastTileId.current = tile?.id ?? null;
  }, [tile]);

  return (
    <aside className="panel bento-inspector" aria-label="Customize">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Customize</span>
          <h2 className="panel-heading-title">
            {subject === 'document' ? 'Canvas' : tile ? KIND_NAME[tile.kind] : 'No tile selected'}
          </h2>
        </div>
        <DsSegmented
          aria-label="What to customize"
          value={subject}
          onChange={(v) => setSubject(v as Subject)}
          options={[
            { value: 'tile', label: 'Tile' },
            { value: 'document', label: 'Document' },
          ]}
        />
      </div>

      {subject === 'tile' ? (
        <TileInspector tile={tile} brand={brand} onOpenMedia={onOpenMedia} />
      ) : (
        <DocumentPanel brand={brand} />
      )}
    </aside>
  );
}
