/**
 * SpecPanel — right pane: the form-view of the active VariantSpec.
 *
 * Every field maps to one control. Edits flow back via `onChange` and
 * the parent re-resolves the spec through the engine so id + label
 * stay consistent. Color picks include a contrast pill against the
 * current background — that's the "this is a serious tool" detail.
 */
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  Background,
  ColorMode,
  Composition,
  ExportFormat,
  Layout,
  PaletteContext,
  VariantSpec,
} from '../engine/types';
import { backgroundHex } from '../engine/generate';
import { gradeContrast } from '../engine/palette';

interface SpecPanelProps {
  spec: VariantSpec;
  palette: PaletteContext;
  onChange: (patch: Partial<VariantSpec>) => void;
  onAddCustomColor: (hex: string) => void;
  onExport: (format: ExportFormat) => void;
  onExportKit: () => void;
  pinnedCount: number;
}

export function SpecPanel({
  spec,
  palette,
  onChange,
  onAddCustomColor,
  onExport,
  onExportKit,
  pinnedCount,
}: SpecPanelProps) {
  const bgHex = backgroundHex(spec.background, palette);
  const grade = gradeContrast(spec.colorMap.icon.hex, bgHex);

  return (
    <div className="space-y-5 p-4">
      <Section title="Composition">
        <SegmentedGroup
          value={spec.composition}
          options={[
            { value: 'lockup', label: 'Lockup' },
            { value: 'icon-only', label: 'Icon' },
            { value: 'wordmark-only', label: 'Wordmark' },
          ]}
          onChange={(v) => onChange({ composition: v as Composition })}
        />
      </Section>

      {spec.composition === 'lockup' && (
        <Section title="Layout">
          <SegmentedGroup
            value={spec.layout}
            options={[
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'stacked', label: 'Stacked' },
            ]}
            onChange={(v) => onChange({ layout: v as Layout })}
          />
        </Section>
      )}

      <Section title="Color mode">
        <Select
          value={spec.colorMode}
          onValueChange={(v) => onChange({ colorMode: v as ColorMode })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="brand">Brand (auto contrast)</SelectItem>
            <SelectItem value="mono-black">Monochrome black</SelectItem>
            <SelectItem value="mono-white">Monochrome white</SelectItem>
            <SelectItem value="inverse">Inverse</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <ContrastPill grade={grade} />
      </Section>

      <Section title="Palette">
        <div className="flex flex-wrap gap-1.5">
          {[...palette.brandColors, ...palette.customColors, palette.neutrals.black, palette.neutrals.white].map(
            (c) => (
              <button
                key={c.hex + c.source}
                type="button"
                title={`${c.label ?? c.source} · ${c.hex}`}
                onClick={() =>
                  onChange({
                    colorMode: 'custom',
                    colorMap: { icon: c, wordmark: c },
                  })
                }
                className={cn(
                  'h-7 w-7 rounded-md border-2 transition-transform hover:scale-110',
                  spec.colorMap.icon.hex.toLowerCase() === c.hex.toLowerCase() ? 'border-primary' : 'border-border',
                )}
                style={{ background: c.hex }}
                aria-label={c.label ?? c.hex}
              />
            ),
          )}
          <CustomColorAdder onAdd={onAddCustomColor} />
        </div>
      </Section>

      <Section title="Background">
        <div className="grid grid-cols-3 gap-1.5">
          <BgChip
            label="None"
            active={spec.background.kind === 'transparent'}
            onClick={() => onChange({ background: { kind: 'transparent' } })}
          />
          <BgChip
            label="White"
            active={spec.background.kind === 'solid' && spec.background.value === '#FFFFFF'}
            onClick={() => onChange({ background: { kind: 'solid', value: '#FFFFFF' } })}
          />
          <BgChip
            label="Black"
            active={spec.background.kind === 'solid' && spec.background.value === '#000000'}
            onClick={() => onChange({ background: { kind: 'solid', value: '#000000' } })}
          />
          <BgChip
            label="Brand"
            active={spec.background.kind === 'brand'}
            onClick={() => onChange({ background: { kind: 'brand' } })}
          />
        </div>
      </Section>

      <Section title="Export">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => onExport('png')}>
            PNG
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport('svg')}>
            SVG
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport('pdf')}>
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport('jpg')}>
            JPG
          </Button>
        </div>
        <Button size="sm" className="mt-2 w-full" onClick={onExportKit} disabled={pinnedCount === 0}>
          Export kit ({pinnedCount})
        </Button>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Pin variants from the gallery to add them to the kit.
        </p>
      </Section>
    </div>
  );
}

// ─── Bits ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SegmentedGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors',
            value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BgChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-background',
      )}
    >
      {label}
    </button>
  );
}

function ContrastPill({ grade }: { grade: 'AAA' | 'AA' | 'AA-large' | 'fail' }) {
  const tone =
    grade === 'AAA'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : grade === 'AA'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
        : grade === 'AA-large'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  return (
    <div className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', tone)}>
      Contrast: {grade}
    </div>
  );
}

function CustomColorAdder({ onAdd }: { onAdd: (hex: string) => void }) {
  return (
    <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
      <Plus className="h-3 w-3" />
      <input
        type="color"
        className="sr-only"
        onChange={(e) => onAdd(e.target.value.toUpperCase())}
      />
    </label>
  );
}
