/**
 * ElementLayerEditor — right-sidebar panel when a shape/image layer is selected.
 */

import { Trash2 } from 'lucide-react';

import { Slider } from '@/components/ui/slider';

import type { ElementLayer } from '../engine/types';
import { useMockupStore } from '../state/mockupStore';

interface ElementLayerEditorProps {
  layer: ElementLayer;
}

export function ElementLayerEditor({ layer }: ElementLayerEditorProps) {
  const update = useMockupStore((s) => s.updateElementLayer);
  const remove = useMockupStore((s) => s.deleteElementLayer);

  return (
    <div className="space-y-3">
      {(layer.type === 'rect' || layer.type === 'image') && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="W" value={layer.width} onChange={(v) => update(layer.id, { width: v } as Partial<ElementLayer>)} />
          <NumberField label="H" value={layer.height} onChange={(v) => update(layer.id, { height: v } as Partial<ElementLayer>)} />
        </div>
      )}
      {layer.type === 'circle' && (
        <NumberField
          label="Radius"
          value={layer.radius}
          onChange={(v) => update(layer.id, { radius: v } as Partial<ElementLayer>)}
        />
      )}

      {(layer.type === 'rect' || layer.type === 'circle') && (
        <ColorField
          label="Fill"
          value={layer.fill}
          onChange={(v) => update(layer.id, { fill: v } as Partial<ElementLayer>)}
        />
      )}

      {layer.type === 'line' && (
        <>
          <ColorField
            label="Stroke"
            value={layer.stroke}
            onChange={(v) => update(layer.id, { stroke: v } as Partial<ElementLayer>)}
          />
          <NumberField
            label="Stroke width"
            value={layer.strokeWidth}
            min={1}
            max={40}
            onChange={(v) => update(layer.id, { strokeWidth: v } as Partial<ElementLayer>)}
          />
        </>
      )}

      {(layer.type === 'rect' || layer.type === 'image') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/80">Rotation</label>
          <Slider
            value={[layer.rotation]}
            min={-180}
            max={180}
            step={1}
            onValueChange={([v]) =>
              update(layer.id, { rotation: v } as Partial<ElementLayer>)
            }
          />
          <div className="text-right text-[11px] tabular-nums text-muted-foreground">
            {Math.round(layer.rotation)}°
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => remove(layer.id)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete layer
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="rounded border border-border/70 bg-background px-2 py-1 text-xs tabular-nums"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/80">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-border/70 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded border border-border/70 bg-background px-2 py-1 text-xs font-mono"
        />
      </div>
    </div>
  );
}
