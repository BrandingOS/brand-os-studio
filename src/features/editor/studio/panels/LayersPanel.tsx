// The layers panel.
//
// The toolbar's Layers entry has been a disabled "Layers… soon" item
// since it was written, while `adapter.reorderLayer` sat unused beside
// it. This is that item.
//
// Listed FRONT-first, the way every layer list in every design tool is
// ordered: the topmost row is the topmost thing on the canvas. The
// document stores them back-first, so the list is reversed for display
// and reversed back for every index it hands the adapter — the one
// place that conversion is allowed to live.

import { useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Group as GroupIcon,
  Image as ImageIcon,
  Lock,
  Shapes,
  Star,
  Type as TypeIcon,
  Unlock,
} from 'lucide-react';
import type { Layer, Page } from '@/features/editor/schema';
import type { LayerEditingAdapter } from '@/features/editor/adapter/EditorAdapter';
import { IconButton } from '../components/chrome';
import { useStudioStore } from '../state/studioStore';
import { orderLayers } from '../ops/layerOps';

const ICON = { size: 13, strokeWidth: 1.8 } as const;

interface Props {
  adapter: LayerEditingAdapter | null;
  page: Page | null;
  readOnly: boolean;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
}

export function LayersPanel({ adapter, page, readOnly, updateLayer }: Props) {
  const selection = useStudioStore((s) => s.selection);

  const select = useCallback(
    (id: string, additive: boolean) => {
      if (!adapter) return;
      if (!additive) {
        adapter.setSelection([id]);
        return;
      }
      adapter.setSelection(
        selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id],
      );
    },
    [adapter, selection],
  );

  if (!page || !adapter) {
    return <p className="st-tile-caption" style={{ textAlign: 'left' }}>No layers.</p>;
  }

  if (page.layers.length === 0) {
    return (
      <p className="st-tile-caption" style={{ textAlign: 'left' }}>
        This page is empty. Add something from Elements, Text or Brand.
      </p>
    );
  }

  // Front-first for display.
  const rows = [...page.layers].reverse();

  return (
    <section className="st-section">
      <p className="st-section-label">{page.layers.length} layers · front to back</p>
      <div style={{ display: 'grid', gap: 1 }}>
        {rows.map((layer, i) => {
          const active = selection.includes(layer.id);
          const isFront = i === 0;
          const isBack = i === rows.length - 1;
          return (
            <div
              key={layer.id}
              className={`st-layer-row ${active ? 'is-active' : ''} ${
                layer.visible ? '' : 'is-hidden'
              } ${layer.locked || !layer.visible ? 'is-flagged' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              data-studio-layer={layer.id}
              onClick={(e) => select(layer.id, e.metaKey || e.ctrlKey || e.shiftKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select(layer.id, e.metaKey || e.ctrlKey || e.shiftKey);
                }
              }}
            >
              <span className="st-layer-icon">{layerIcon(layer)}</span>
              <span className="st-layer-name">{layerLabel(layer)}</span>
              <span className="st-layer-actions">
                <IconButton
                  icon={<ChevronUp {...ICON} />}
                  label="Bring forward"
                  disabled={readOnly || isFront}
                  onClick={(e) => {
                    e.stopPropagation();
                    orderLayers(adapter, page.id, [layer.id], 'forward');
                  }}
                />
                <IconButton
                  icon={<ChevronDown {...ICON} />}
                  label="Send backward"
                  disabled={readOnly || isBack}
                  onClick={(e) => {
                    e.stopPropagation();
                    orderLayers(adapter, page.id, [layer.id], 'backward');
                  }}
                />
                <IconButton
                  icon={layer.visible ? <Eye {...ICON} /> : <EyeOff {...ICON} />}
                  label={layer.visible ? 'Hide' : 'Show'}
                  disabled={readOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(page.id, layer.id, { visible: !layer.visible } as Partial<Layer>);
                  }}
                />
                <IconButton
                  icon={layer.locked ? <Lock {...ICON} /> : <Unlock {...ICON} />}
                  label={layer.locked ? 'Unlock' : 'Lock'}
                  disabled={readOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(page.id, layer.id, { locked: !layer.locked } as Partial<Layer>);
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function layerIcon(layer: Layer) {
  switch (layer.kind) {
    case 'text':
      return <TypeIcon {...ICON} />;
    case 'image':
      return <ImageIcon {...ICON} />;
    case 'group':
      return <GroupIcon {...ICON} />;
    case 'logo':
      return <Star {...ICON} />;
    default:
      return <Shapes {...ICON} />;
  }
}

/**
 * What to call a layer.
 *
 * A text layer is named for its CONTENT rather than its type — "Add a
 * heading" is a list of six identical rows, and the words on the canvas
 * are how people recognise which one they want.
 */
function layerLabel(layer: Layer): string {
  if (layer.kind === 'text') {
    const text = layer.text.trim().replace(/\s+/g, ' ');
    if (text) return text.length > 38 ? `${text.slice(0, 38)}…` : text;
  }
  if (layer.kind === 'group') return `${layer.name} · ${layer.children.length}`;
  return layer.name;
}
