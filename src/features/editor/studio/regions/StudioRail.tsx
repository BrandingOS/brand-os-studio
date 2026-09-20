// The creation rail.
//
// Seven entries, ordered as a statement of what this product is: the
// BRAND comes first. Canva starts from a blank design and offers you a
// brand kit five items down; BrandingOS starts from the brand, so the
// brand is the first thing the rail offers.
//
// Layers sits below a divider because it is about the document you have,
// not about adding to it — a different kind of verb.

import {
  Image as ImageIcon,
  LayoutGrid,
  Layers as LayersIcon,
  Palette,
  Shapes,
  Sparkles,
  Type,
} from 'lucide-react';
import type { RailId } from '../state/studioStore';

export interface RailEntry {
  id: RailId;
  label: string;
  icon: React.ReactNode;
}

const ICON = { size: 19, strokeWidth: 1.8 } as const;

export const RAIL_ENTRIES: readonly RailEntry[] = [
  { id: 'brand', label: 'Brand', icon: <Palette {...ICON} /> },
  { id: 'templates', label: 'Templates', icon: <LayoutGrid {...ICON} /> },
  { id: 'elements', label: 'Elements', icon: <Shapes {...ICON} /> },
  { id: 'text', label: 'Text', icon: <Type {...ICON} /> },
  { id: 'uploads', label: 'Uploads', icon: <ImageIcon {...ICON} /> },
  { id: 'ai', label: 'AI', icon: <Sparkles {...ICON} /> },
];

const LAYERS_ENTRY: RailEntry = {
  id: 'layers',
  label: 'Layers',
  icon: <LayersIcon {...ICON} />,
};

interface Props {
  active: RailId | null;
  onChange: (next: RailId | null) => void;
  /** A layerless renderer has nothing to insert into and no layers. */
  supportsLayerEditing: boolean;
}

export function StudioRail({ active, onChange, supportsLayerEditing }: Props) {
  const entries = supportsLayerEditing
    ? RAIL_ENTRIES
    : RAIL_ENTRIES.filter((e) => e.id === 'brand' || e.id === 'templates');

  return (
    <nav className="st-rail" aria-label="Creation tools" data-studio-rail>
      {entries.map((entry) => (
        <RailButton
          key={entry.id}
          entry={entry}
          active={active === entry.id}
          onChange={onChange}
        />
      ))}
      {supportsLayerEditing ? (
        <>
          <div className="st-rail-sep" aria-hidden />
          <RailButton
            entry={LAYERS_ENTRY}
            active={active === 'layers'}
            onChange={onChange}
          />
        </>
      ) : null}
    </nav>
  );
}

function RailButton({
  entry,
  active,
  onChange,
}: {
  entry: RailEntry;
  active: boolean;
  onChange: (next: RailId | null) => void;
}) {
  return (
    <button
      type="button"
      className={`st-rail-item ${active ? 'is-active' : ''}`}
      // Pressing the open entry closes the panel — the DsRail contract,
      // and the one people reach for when they want the canvas wider.
      onClick={() => onChange(active ? null : entry.id)}
      aria-pressed={active}
      data-rail-item={entry.id}
      title={entry.label}
    >
      {entry.icon}
      <span className="st-rail-label">{entry.label}</span>
    </button>
  );
}
