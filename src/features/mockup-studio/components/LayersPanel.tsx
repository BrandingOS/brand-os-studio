/**
 * LayersPanel — Photoshop-style layer list for the current mockup.
 *
 * Shows zones first (they are implicit to the template), then element
 * layers, then text layers. Click to select; arrow buttons reorder.
 */

import {
  ArrowDown,
  ArrowUp,
  Circle,
  ImageIcon,
  Layers,
  Minus,
  Square,
  Trash2,
  Type,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ElementLayer, TextLayer } from '../engine/types';
import { useMockupStore } from '../state/mockupStore';

export function LayersPanel() {
  const template = useMockupStore((s) => s.template);
  const mockup = useMockupStore((s) => s.mockup);
  const selection = useMockupStore((s) => s.selection);
  const setSelection = useMockupStore((s) => s.setSelection);
  const deleteTextLayer = useMockupStore((s) => s.deleteTextLayer);
  const deleteElementLayer = useMockupStore((s) => s.deleteElementLayer);
  const reorderLayer = useMockupStore((s) => s.reorderLayer);

  if (!template || !mockup) return null;

  const allTextLayers = [...mockup.textLayers].reverse();
  const allElementLayers = [...mockup.elementLayers].reverse();

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          Layers
        </h3>
      </div>

      <ul className="divide-y divide-border/50">
        {allTextLayers.map((layer) => (
          <Row
            key={layer.id}
            active={selection?.kind === 'text' && selection.id === layer.id}
            label={layer.text || 'Text'}
            icon={<Type className="h-3.5 w-3.5" />}
            onSelect={() => setSelection({ kind: 'text', id: layer.id })}
            onDelete={() => deleteTextLayer(layer.id)}
            onUp={() => reorderLayer('text', layer.id, 'up')}
            onDown={() => reorderLayer('text', layer.id, 'down')}
          />
        ))}
        {allElementLayers.map((layer) => (
          <Row
            key={layer.id}
            active={selection?.kind === 'element' && selection.id === layer.id}
            label={elementLabel(layer)}
            icon={<ElementIcon layer={layer} />}
            onSelect={() => setSelection({ kind: 'element', id: layer.id })}
            onDelete={() => deleteElementLayer(layer.id)}
            onUp={() => reorderLayer('element', layer.id, 'up')}
            onDown={() => reorderLayer('element', layer.id, 'down')}
          />
        ))}
        {template.zones.map((zone) => (
          <Row
            key={zone.id}
            active={selection?.kind === 'zone' && selection.id === zone.id}
            label={zone.label}
            icon={<Square className="h-3.5 w-3.5" />}
            onSelect={() => setSelection({ kind: 'zone', id: zone.id })}
          />
        ))}
      </ul>
    </div>
  );
}

function elementLabel(layer: ElementLayer): string {
  if (layer.type === 'image') return 'Image';
  if (layer.type === 'rect') return 'Rectangle';
  if (layer.type === 'circle') return 'Circle';
  return 'Line';
}

function ElementIcon({ layer }: { layer: ElementLayer }) {
  if (layer.type === 'image') return <ImageIcon className="h-3.5 w-3.5" />;
  if (layer.type === 'rect') return <Square className="h-3.5 w-3.5" />;
  if (layer.type === 'circle') return <Circle className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function Row({
  active,
  label,
  icon,
  onSelect,
  onDelete,
  onUp,
  onDown,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  onDelete?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  return (
    <li
      className={cn(
        'group flex items-center gap-2 px-4 py-1.5 text-xs cursor-pointer transition-colors',
        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60',
      )}
      onClick={onSelect}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {onUp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUp();
            }}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Move up"
            title="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
        )}
        {onDown && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDown();
            }}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Move down"
            title="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </li>
  );
}
