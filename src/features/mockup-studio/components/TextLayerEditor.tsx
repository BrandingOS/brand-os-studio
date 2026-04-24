/**
 * TextLayerEditor — right-sidebar panel when a text layer is selected.
 */

import { Trash2 } from 'lucide-react';

import { Slider } from '@/components/ui/slider';

import type { TextLayer } from '../engine/types';
import { useMockupStore } from '../state/mockupStore';

interface TextLayerEditorProps {
  layer: TextLayer;
}

const FONT_OPTIONS = [
  'Inter, system-ui, sans-serif',
  'Georgia, serif',
  '"Helvetica Neue", Arial, sans-serif',
  '"SF Pro Display", system-ui, sans-serif',
  '"Playfair Display", serif',
  '"IBM Plex Mono", monospace',
];

export function TextLayerEditor({ layer }: TextLayerEditorProps) {
  const update = useMockupStore((s) => s.updateTextLayer);
  const remove = useMockupStore((s) => s.deleteTextLayer);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/80">Text</label>
        <textarea
          value={layer.text}
          onChange={(e) => update(layer.id, { text: e.target.value })}
          className="w-full rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs resize-none"
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/80">Font</label>
        <select
          value={layer.fontFamily}
          onChange={(e) => update(layer.id, { fontFamily: e.target.value })}
          className="w-full rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs"
        >
          {/* Include the current font (e.g. a brand font) even if not in the preset list. */}
          {!FONT_OPTIONS.includes(layer.fontFamily) && (
            <option value={layer.fontFamily}>{layer.fontFamily}</option>
          )}
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f.split(',')[0].replace(/"/g, '')}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Size"
          value={layer.fontSize}
          min={8}
          onChange={(v) => update(layer.id, { fontSize: v })}
        />
        <NumberField
          label="Weight"
          value={layer.fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(v) => update(layer.id, { fontWeight: v })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/80">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={layer.color}
            onChange={(e) => update(layer.id, { color: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-border/70 bg-transparent"
          />
          <input
            type="text"
            value={layer.color}
            onChange={(e) => update(layer.id, { color: e.target.value })}
            className="flex-1 rounded border border-border/70 bg-background px-2 py-1 text-xs font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/80">Alignment</label>
        <div className="grid grid-cols-3 gap-1">
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => update(layer.id, { align: a })}
              className={`rounded-md px-2 py-1 text-xs capitalize transition-colors ${
                layer.align === a
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground/80">Letter spacing</label>
        <Slider
          value={[layer.letterSpacing]}
          min={-5}
          max={20}
          step={0.5}
          onValueChange={([v]) => update(layer.id, { letterSpacing: v })}
        />
        <div className="text-right text-[11px] tabular-nums text-muted-foreground">
          {layer.letterSpacing.toFixed(1)}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground/80">Rotation</label>
        <Slider
          value={[layer.rotation]}
          min={-180}
          max={180}
          step={1}
          onValueChange={([v]) => update(layer.id, { rotation: v })}
        />
        <div className="text-right text-[11px] tabular-nums text-muted-foreground">
          {Math.round(layer.rotation)}°
        </div>
      </div>

      <button
        type="button"
        onClick={() => remove(layer.id)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete text
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
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
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="rounded border border-border/70 bg-background px-2 py-1 text-xs tabular-nums"
      />
    </label>
  );
}
