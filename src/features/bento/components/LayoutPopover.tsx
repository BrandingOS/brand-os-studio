import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Sliders } from 'lucide-react';
import { useBentoStore } from '../store';
import { getTemplate } from '../templates';

export function LayoutPopover() {
  const design = useBentoStore((s) => s.design);
  const setGap = useBentoStore((s) => s.setGap);
  const setRadius = useBentoStore((s) => s.setRadius);
  const setPadding = useBentoStore((s) => s.setPadding);
  const setGridSize = useBentoStore((s) => s.setGridSize);

  const tpl = getTemplate(design.templateId);
  const cols = design.cols ?? tpl.cols;
  const rows = design.rows ?? tpl.rows;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 gap-1.5">
          <Sliders className="h-3.5 w-3.5" />
          Layout
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4 space-y-4" align="end">
        <SliderRow label="Gap" value={design.gap} min={0} max={6} step={0.1} unit="%"
          onChange={setGap} />
        <SliderRow label="Edge padding" value={design.padding} min={0} max={10} step={0.1} unit="%"
          onChange={setPadding} />
        <SliderRow label="Corner radius" value={design.radius} min={0} max={10} step={0.1} unit="%"
          onChange={setRadius} />

        <div className="pt-2 border-t">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Grid</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <div className="text-xs text-muted-foreground">Columns</div>
              <Input type="number" min={1} max={12} value={cols}
                onChange={(e) => setGridSize(Math.max(1, Math.min(12, Number(e.target.value) || 1)), rows)}
                className="h-8" />
            </label>
            <label className="space-y-1">
              <div className="text-xs text-muted-foreground">Rows</div>
              <Input type="number" min={1} max={12} value={rows}
                onChange={(e) => setGridSize(cols, Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className="h-8" />
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SliderRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">{label}</label>
        <span className="text-xs text-muted-foreground tabular-nums">{value.toFixed(1)}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
