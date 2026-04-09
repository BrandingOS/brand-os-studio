/**
 * EditBar — sticky horizontal toolbar above the variant gallery.
 *
 * This is where the user *edits* the currently-selected variant.
 * Every per-variant control lives here, laid out in left-to-right
 * groups: composition · layout · color mode · palette · background ·
 * format / export.
 *
 * The bar is intentionally compact (h-12-ish) and never grows. When
 * the user picks a new color or composition, the studio re-resolves
 * the variant and the gallery tile reflects it instantly.
 */
import { Download, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface EditBarProps {
  spec: VariantSpec | null;
  palette: PaletteContext;
  pinnedCount: number;
  onChange: (patch: Partial<VariantSpec>) => void;
  onExport: (format: ExportFormat) => void;
  onExportKit: () => void;
}

export function EditBar({
  spec,
  palette,
  pinnedCount,
  onChange,
  onExport,
  onExportKit,
}: EditBarProps) {
  if (!spec) {
    return (
      <div className="flex h-14 items-center justify-center px-4 text-xs text-muted-foreground">
        Select a variant to edit
      </div>
    );
  }

  const bgHex = backgroundHex(spec.background, palette);
  const grade = gradeContrast(spec.colorMap.icon.hex, bgHex);

  return (
    <div className="flex h-auto min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
      {/* Composition */}
      <Group label="Type">
        <Segmented
          value={spec.composition}
          options={[
            { value: 'lockup', label: 'Lockup' },
            { value: 'icon-only', label: 'Icon' },
            { value: 'wordmark-only', label: 'Word' },
          ]}
          onChange={(v) => onChange({ composition: v as Composition })}
        />
      </Group>

      {/* Layout — only meaningful when there is something to lay out */}
      {spec.composition === 'lockup' && (
        <Group label="Layout">
          <Segmented
            value={spec.layout}
            options={[
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'stacked', label: 'Stacked' },
            ]}
            onChange={(v) => onChange({ layout: v as Layout })}
          />
        </Group>
      )}

      <Divider />

      {/* Color mode */}
      <Group label="Color">
        <Select
          value={spec.colorMode}
          onValueChange={(v) => onChange({ colorMode: v as ColorMode })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="brand">Brand</SelectItem>
            <SelectItem value="mono-black">Mono black</SelectItem>
            <SelectItem value="mono-white">Mono white</SelectItem>
            <SelectItem value="inverse">Inverse</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </Group>

      {/* Palette swatches — quick custom-color picker */}
      <Group label="Palette">
        <div className="flex items-center gap-1">
          {[
            ...palette.brandColors,
            ...palette.customColors,
            palette.neutrals.black,
            palette.neutrals.white,
          ].map((c) => {
            const active = spec.colorMap.icon.hex.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex + c.source}
                type="button"
                title={c.label ?? c.hex}
                onClick={() =>
                  onChange({
                    colorMode: 'custom',
                    colorMap: { icon: c, wordmark: c },
                  })
                }
                className={cn(
                  'h-6 w-6 rounded-md border-2 transition-transform hover:scale-110',
                  active ? 'border-primary' : 'border-border',
                )}
                style={{ background: c.hex }}
                aria-label={c.label ?? c.hex}
              />
            );
          })}
        </div>
      </Group>

      <Divider />

      {/* Background */}
      <Group label="BG">
        <div className="flex gap-1">
          <BgChip
            label="None"
            active={spec.background.kind === 'transparent'}
            onClick={() => onChange({ background: { kind: 'transparent' } })}
          />
          <BgChip
            label="W"
            active={
              spec.background.kind === 'solid' && spec.background.value === '#FFFFFF'
            }
            onClick={() => onChange({ background: { kind: 'solid', value: '#FFFFFF' } })}
          />
          <BgChip
            label="K"
            active={
              spec.background.kind === 'solid' && spec.background.value === '#000000'
            }
            onClick={() => onChange({ background: { kind: 'solid', value: '#000000' } })}
          />
          <BgChip
            label="Brand"
            active={spec.background.kind === 'brand'}
            onClick={() => onChange({ background: { kind: 'brand' } })}
          />
        </div>
      </Group>

      {/* Contrast pill — small, inline */}
      <ContrastPill grade={grade} />

      {/* Push everything else to the right */}
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
          <FormatBtn label="PNG" onClick={() => onExport('png')} />
          <FormatBtn label="SVG" onClick={() => onExport('svg')} locked />
          <FormatBtn label="PDF" onClick={() => onExport('pdf')} locked />
        </div>
        <Button size="sm" onClick={onExportKit} disabled={pinnedCount === 0}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Kit ({pinnedCount})
        </Button>
      </div>
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="hidden h-6 w-px bg-border md:block" />;
}

function Segmented<T extends string>({
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
            'rounded-sm px-2 py-1 text-[11px] font-medium transition-colors',
            value === o.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BgChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'border-primary bg-primary/5 text-foreground'
          : 'text-muted-foreground hover:bg-background',
      )}
    >
      {label}
    </button>
  );
}

function ContrastPill({ grade }: { grade: 'AAA' | 'AA' | 'AA-large' | 'fail' }) {
  const tone =
    grade === 'AAA' || grade === 'AA'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : grade === 'AA-large'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold',
        tone,
      )}
    >
      {grade}
    </div>
  );
}

function FormatBtn({
  label,
  onClick,
  locked,
}: {
  label: string;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
      {locked && <Lock className="h-2.5 w-2.5 opacity-60" />}
    </button>
  );
}
