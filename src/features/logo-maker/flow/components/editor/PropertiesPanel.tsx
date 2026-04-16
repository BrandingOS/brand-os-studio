import { useEffect, useState } from 'react';
import type { Canvas, FabricObject } from 'fabric';
import { Trash2, Copy, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { bringForward, deleteSelected, duplicateSelected, sendBackward } from '../../utils/fabric-setup';
import { QualityChecks } from './QualityChecks';

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Space Grotesk, sans-serif',
  'Playfair Display, serif',
  'Fraunces, serif',
  'DM Sans, sans-serif',
  'Poppins, sans-serif',
  'JetBrains Mono, monospace',
  'Bodoni Moda, serif',
] as const;

const PRESET_COLORS = [
  '#111111',
  '#ffffff',
  '#378ADD',
  '#1D9E75',
  '#EF9F27',
  '#E24B4A',
  '#7C3AED',
  '#EC4899',
];

interface PropertiesPanelProps {
  canvas: Canvas | null;
}

export function PropertiesPanel({ canvas }: PropertiesPanelProps) {
  const [active, setActive] = useState<FabricObject | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!canvas) return;
    const sync = () => {
      setActive(canvas.getActiveObject() ?? null);
      setTick((t) => t + 1);
    };
    canvas.on('selection:created', sync);
    canvas.on('selection:updated', sync);
    canvas.on('selection:cleared', sync);
    canvas.on('object:modified', sync);
    sync();
    return () => {
      canvas.off('selection:created', sync);
      canvas.off('selection:updated', sync);
      canvas.off('selection:cleared', sync);
      canvas.off('object:modified', sync);
    };
  }, [canvas]);

  const patch = (updates: Partial<FabricObject> & Record<string, unknown>) => {
    if (!canvas || !active) return;
    active.set(updates);
    active.setCoords();
    canvas.fire('object:modified', { target: active });
    canvas.requestRenderAll();
    setTick((t) => t + 1);
  };

  return (
    <aside className="w-[260px] shrink-0 border-l border-border bg-card/40 flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-5">
        <div>
          <h3 className="text-sm font-semibold mb-1">
            {active ? getTypeLabel(active) : 'Canvas'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {active ? 'Selected object' : 'Nothing selected — click an object to edit it.'}
          </p>
        </div>

        {active && (
          <>
            <ObjectActions canvas={canvas} />
            <FillControl
              value={(active.fill as string) ?? '#000000'}
              onChange={(v) => patch({ fill: v })}
            />
            {'stroke' in active && (
              <StrokeControl
                value={(active.stroke as string | null) ?? '#000000'}
                width={(active.strokeWidth as number) ?? 0}
                onChange={(stroke, strokeWidth) => patch({ stroke, strokeWidth })}
              />
            )}
            {isTextbox(active) && (
              <TextControls active={active} patch={patch} />
            )}
            <OpacityControl
              value={active.opacity ?? 1}
              onChange={(v) => patch({ opacity: v })}
            />
          </>
        )}

        <QualityChecks canvas={canvas} tick={tick} />
      </div>
    </aside>
  );
}

function getTypeLabel(o: FabricObject): string {
  const t = (o as unknown as { type?: string }).type;
  if (t === 'textbox' || t === 'text' || t === 'i-text') return 'Text';
  if (t === 'rect') return 'Rectangle';
  if (t === 'circle') return 'Circle';
  if (t === 'line') return 'Line';
  if (t === 'group') return 'Group';
  return 'Object';
}

function isTextbox(o: FabricObject): o is FabricObject & {
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  charSpacing: number;
  textAlign: string;
  text: string;
} {
  const t = (o as unknown as { type?: string }).type;
  return t === 'textbox' || t === 'text' || t === 'i-text';
}

function ObjectActions({ canvas }: { canvas: Canvas | null }) {
  if (!canvas) return null;
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <IconButton title="Duplicate (⌘D)" onClick={() => duplicateSelected(canvas)}>
        <Copy className="w-3.5 h-3.5" />
      </IconButton>
      <IconButton title="Forward (⌘])" onClick={() => bringForward(canvas)}>
        <ArrowUpToLine className="w-3.5 h-3.5" />
      </IconButton>
      <IconButton title="Backward (⌘[)" onClick={() => sendBackward(canvas)}>
        <ArrowDownToLine className="w-3.5 h-3.5" />
      </IconButton>
      <IconButton title="Delete" onClick={() => deleteSelected(canvas)} destructive>
        <Trash2 className="w-3.5 h-3.5" />
      </IconButton>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  destructive?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      title={title}
      className={cn('h-8 w-full', destructive && 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30')}
    >
      {children}
    </Button>
  );
}

function FillControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Fill</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={toHex(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
          aria-label="Fill color"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
            aria-label={`Set fill to ${c}`}
          />
        ))}
      </div>
    </div>
  );
}

function StrokeControl({
  value,
  width,
  onChange,
}: {
  value: string;
  width: number;
  onChange: (stroke: string | null, width: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Stroke</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={toHex(value || '#000000')}
          onChange={(e) => onChange(e.target.value, width || 1)}
          className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
          aria-label="Stroke color"
        />
        <Input
          type="number"
          min={0}
          max={50}
          value={width}
          onChange={(e) => onChange(value || null, Number(e.target.value))}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

function OpacityControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Opacity</Label>
        <span className="text-xs text-muted-foreground tabular-nums">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function TextControls({
  active,
  patch,
}: {
  active: FabricObject & { fontFamily: string; fontSize: number; fontWeight: string | number; charSpacing: number; textAlign: string };
  patch: (u: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <div className="space-y-2">
        <Label className="text-xs">Font</Label>
        <Select value={active.fontFamily} onValueChange={(v) => patch({ fontFamily: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f.split(',')[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Size</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(active.fontSize)}px</span>
        </div>
        <Slider
          min={8}
          max={200}
          step={1}
          value={[active.fontSize]}
          onValueChange={([v]) => patch({ fontSize: v })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Weight</Label>
        <Select
          value={String(active.fontWeight)}
          onValueChange={(v) => patch({ fontWeight: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['300', '400', '500', '600', '700', '800'].map((w) => (
              <SelectItem key={w} value={w}>
                {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Letter spacing</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round((active.charSpacing ?? 0) / 10)}
          </span>
        </div>
        <Slider
          min={-100}
          max={600}
          step={10}
          value={[active.charSpacing ?? 0]}
          onValueChange={([v]) => patch({ charSpacing: v })}
        />
      </div>
    </div>
  );
}

function toHex(input: string): string {
  const v = input.trim();
  if (v.startsWith('#') && (v.length === 4 || v.length === 7)) return v;
  // rgba() or unknown → fall back to black.
  return '#000000';
}
