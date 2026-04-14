/**
 * Contextual inspector — shown when objects are selected. Edits fill, stroke,
 * and font size; surfaces brand palette swatches for one-click recolor.
 */
import { useEffect, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { Trash2, Palette, Pipette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDesignAiStore } from './store';
import type { CanvasHandle } from './Canvas';
import * as fabric from 'fabric';

interface Props {
  brand?: Brand;
  canvasHandle: React.RefObject<CanvasHandle>;
}

export function Inspector({ brand, canvasHandle }: Props) {
  const selectedIds = useDesignAiStore((s) => s.selectedIds);
  const [tick, setTick] = useState(0);

  // Re-read values when selection changes.
  useEffect(() => {
    setTick((t) => t + 1);
  }, [selectedIds]);

  const canvas = canvasHandle.current?.canvas;
  const active = canvas?.getActiveObject() ?? null;
  const hasSelection = !!active;

  const fill = (active?.get('fill') as string | undefined) ?? '#000000';
  const stroke = (active?.get('stroke') as string | undefined) ?? '';
  const isText = active instanceof fabric.IText || active instanceof fabric.Textbox;
  const fontSize = isText ? (active.get('fontSize') as number) : 48;

  const swatches = [
    brand?.primaryColor,
    brand?.secondaryColor,
    '#111827',
    '#ffffff',
    '#ef4444',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ].filter(Boolean) as string[];

  return (
    <aside className="w-72 shrink-0 border-l bg-white flex flex-col">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Inspector</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasSelection ? `${selectedIds.length} selected` : 'Nothing selected'}
        </p>
      </div>

      {!hasSelection && (
        <div className="p-4 text-xs text-muted-foreground leading-relaxed">
          Select an object to edit its properties, or use the AI bar below to
          generate designs from a prompt.
        </div>
      )}

      {hasSelection && (
        <div className="p-4 space-y-5 overflow-y-auto">
          <Section title="Fill" icon={Palette}>
            <div key={`fill-${tick}`} className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={typeof fill === 'string' && fill.startsWith('#') ? fill : '#000000'}
                onChange={(e) => canvasHandle.current?.applyFill(e.target.value)}
                className="h-9 w-10 rounded-md border cursor-pointer"
              />
              <Input
                defaultValue={typeof fill === 'string' ? fill : ''}
                onBlur={(e) => canvasHandle.current?.applyFill(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {swatches.map((c) => (
                <button
                  key={c}
                  onClick={() => canvasHandle.current?.applyFill(c)}
                  style={{ background: c }}
                  title={c}
                  className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform"
                />
              ))}
            </div>
          </Section>

          <Section title="Stroke" icon={Pipette}>
            <div key={`stroke-${tick}`} className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={stroke || '#000000'}
                onChange={(e) => canvasHandle.current?.applyStroke(e.target.value)}
                className="h-9 w-10 rounded-md border cursor-pointer"
              />
              <Input
                defaultValue={stroke}
                placeholder="none"
                onBlur={(e) => canvasHandle.current?.applyStroke(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </Section>

          {isText && (
            <Section title="Typography">
              <div key={`font-${tick}`}>
                <label className="text-xs text-muted-foreground">Font size</label>
                <Input
                  type="number"
                  defaultValue={fontSize}
                  min={8}
                  max={500}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) canvasHandle.current?.applyFontSize(v);
                  }}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </Section>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => canvasHandle.current?.deleteSelection()}
            className="w-full gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}
    </aside>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      </div>
      {children}
    </section>
  );
}
