/**
 * BrandContextRail — the single side panel for the studio.
 *
 * One rail, two sections:
 *  1. BRAND CONTEXT — what informs every variant
 *     - source logo (with replace)
 *     - brand identity (name)
 *     - brand color palette (+ add custom)
 *     - wordmark typography
 *     - missing-variants suggestions (one-click generators)
 *
 *  2. EDIT VARIANT — what the user is currently editing
 *     - composition (lockup / icon / wordmark)
 *     - layout (horizontal / stacked)
 *     - color mode (brand / mono / inverse / custom)
 *     - palette swatch picker (drives custom mode)
 *     - background (transparent / white / black / brand)
 *     - WCAG contrast pill (live)
 *     - export buttons (PNG / SVG / PDF) + kit export
 *
 * The main area is just the gallery. All editing happens here, in the
 * rail. There is no top bar.
 */
import { Download, Plus, Sparkles, Type, Upload, Image as ImageIcon, Lock } from 'lucide-react';
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
  SourceLogo,
  VariantSpec,
} from '../engine/types';
import { findMissingVariants } from '../engine/missingVariants';
import { backgroundHex } from '../engine/generate';
import { gradeContrast } from '../engine/palette';

interface BrandContextRailProps {
  // Brand-context inputs
  source: SourceLogo | null;
  palette: PaletteContext;
  brandName: string;
  variants: VariantSpec[];
  onPickFile: (file: File) => void;
  onAddCustomColor: (hex: string) => void;
  onGenerateMissing: (spec: VariantSpec) => void;
  onRenameBrand?: (next: string) => void;

  // Edit-variant inputs
  selectedSpec: VariantSpec | null;
  pinnedCount: number;
  onChangeSpec: (patch: Partial<VariantSpec>) => void;
  onExport: (format: ExportFormat) => void;
  onExportKit: () => void;
}

export function BrandContextRail({
  source,
  palette,
  brandName,
  variants,
  onPickFile,
  onAddCustomColor,
  onGenerateMissing,
  onRenameBrand,
  selectedSpec,
  pinnedCount,
  onChangeSpec,
  onExport,
  onExportKit,
}: BrandContextRailProps) {
  const missing =
    source != null
      ? findMissingVariants(source, palette, variants)
      : [];

  return (
    <div className="flex flex-col">
      {/* ── Source ─────────────────────────────────────── */}
      <Section label="Source">
        <label className="group block">
          <input
            type="file"
            className="sr-only"
            accept="image/svg+xml,image/png,image/jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPickFile(file);
            }}
          />
          <div className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:border-foreground/30">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {source?.original.svg ? (
                <div
                  className="flex h-full w-full items-center justify-center p-1 [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: source.original.svg }}
                />
              ) : source?.original.raster ? (
                <img
                  src={source.original.raster}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">
                {source ? 'Logo loaded' : 'No source'}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Upload className="h-2.5 w-2.5" />
                Replace
              </div>
            </div>
          </div>
        </label>
      </Section>

      {/* ── Brand identity ─────────────────────────────── */}
      <Section label="Brand">
        <div className="space-y-1.5">
          <input
            type="text"
            value={brandName}
            onChange={(e) => onRenameBrand?.(e.target.value)}
            disabled={!onRenameBrand}
            placeholder="Brand name"
            className={cn(
              'w-full rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground outline-none transition-colors',
              onRenameBrand
                ? 'focus:border-primary focus:ring-2 focus:ring-primary/20'
                : 'cursor-not-allowed opacity-80',
            )}
          />
          {source?.wordmark?.fontFamily && (
            <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
              <Type className="h-2.5 w-2.5" />
              <span className="truncate" style={{ fontFamily: source.wordmark.fontFamily }}>
                {source.wordmark.fontFamily}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* ── Colors ─────────────────────────────────────── */}
      <Section label="Colors">
        <div className="space-y-2">
          {palette.brandColors.length > 0 && (
            <ColorRow label="Brand" colors={palette.brandColors.map((c) => c.hex)} />
          )}
          {palette.customColors.length > 0 && (
            <ColorRow label="Custom" colors={palette.customColors.map((c) => c.hex)} />
          )}
          <ColorRow label="Neutrals" colors={['#FFFFFF', '#000000']} />

          <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border py-1.5 text-[10px] font-medium text-muted-foreground hover:border-primary hover:text-primary">
            <Plus className="h-3 w-3" />
            Add custom color
            <input
              type="color"
              className="sr-only"
              onChange={(e) => onAddCustomColor(e.target.value.toUpperCase())}
            />
          </label>
        </div>
      </Section>

      {/* ── Missing variants — the killer feature ──────── */}
      {source && (
        <Section label="Missing from your brand" count={missing.length}>
          {missing.length === 0 ? (
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" />
              Logo system complete
            </div>
          ) : (
            <div className="space-y-1">
              {missing.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onGenerateMissing(m.spec)}
                  className="group flex w-full items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5 text-left transition-colors hover:border-primary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium">{m.label}</div>
                    <div className="truncate text-[9px] text-muted-foreground">{m.purpose}</div>
                  </div>
                  <Plus className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Edit variant — all per-variant controls ──────── */}
      {selectedSpec && (
        <EditVariantSection
          spec={selectedSpec}
          palette={palette}
          pinnedCount={pinnedCount}
          isMonolithic={!source?.icon}
          onChange={onChangeSpec}
          onExport={onExport}
          onExportKit={onExportKit}
        />
      )}
    </div>
  );
}

// ── Edit-variant section ─────────────────────────────────────
//
// Lives at the bottom of the rail. Every per-variant control:
// composition, layout, color mode, palette swatches, background,
// contrast pill, format buttons, kit export. Replaces the old
// horizontal EditBar — same controls, vertical layout.

interface EditVariantSectionProps {
  spec: VariantSpec;
  palette: PaletteContext;
  pinnedCount: number;
  /** Source has no separate icon asset → composition + layout collapse
   *  to "render the source as-is", so we hide those controls. */
  isMonolithic: boolean;
  onChange: (patch: Partial<VariantSpec>) => void;
  onExport: (format: ExportFormat) => void;
  onExportKit: () => void;
}

function EditVariantSection({
  spec,
  palette,
  pinnedCount,
  isMonolithic,
  onChange,
  onExport,
  onExportKit,
}: EditVariantSectionProps) {
  const bgHex = backgroundHex(spec.background, palette);
  const grade = gradeContrast(spec.colorMap.icon.hex, bgHex);

  return (
    <>
      <div className="border-y bg-primary/5 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Edit variant
        </div>
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{spec.label}</div>
      </div>

      {/* Composition + layout only make sense when the source has been
          decomposed into separate icon and wordmark assets. With a
          monolithic logo (the common case) every option produces the
          same render — so we hide them entirely instead of showing
          controls that don't do anything. */}
      {!isMonolithic && (
        <>
          <Section label="Type">
            <Segmented
              value={spec.composition}
              options={[
                { value: 'lockup', label: 'Lockup' },
                { value: 'icon-only', label: 'Icon' },
                { value: 'wordmark-only', label: 'Word' },
              ]}
              onChange={(v) => onChange({ composition: v as Composition })}
            />
          </Section>

          {spec.composition === 'lockup' && (
            <Section label="Layout">
              <Segmented
                value={spec.layout}
                options={[
                  { value: 'horizontal', label: 'Horizontal' },
                  { value: 'stacked', label: 'Stacked' },
                ]}
                onChange={(v) => onChange({ layout: v as Layout })}
              />
            </Section>
          )}
        </>
      )}

      <Section label="Color mode">
        <Select
          value={spec.colorMode}
          onValueChange={(v) => onChange({ colorMode: v as ColorMode })}
        >
          <SelectTrigger className="h-8 w-full text-xs">
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
      </Section>

      <Section label="Apply color">
        <div className="flex flex-wrap gap-1.5">
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
                  'h-7 w-7 rounded-md border-2 transition-transform hover:scale-110',
                  active ? 'border-primary' : 'border-border',
                )}
                style={{ background: c.hex }}
                aria-label={c.label ?? c.hex}
              />
            );
          })}
        </div>
      </Section>

      <Section label="Background">
        <div className="grid grid-cols-2 gap-1.5">
          <BgChip
            label="Transparent"
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
        <ContrastPill grade={grade} />
      </Section>

      <Section label="Export">
        <div className="grid grid-cols-2 gap-1.5">
          <FormatButton label="PNG" onClick={() => onExport('png')} />
          <FormatButton label="SVG" onClick={() => onExport('svg')} locked />
          <FormatButton label="PDF" onClick={() => onExport('pdf')} locked />
          <FormatButton label="JPG" onClick={() => onExport('jpg')} />
        </div>
        <Button
          size="sm"
          className="mt-2 w-full"
          onClick={onExportKit}
          disabled={pinnedCount === 0}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export kit ({pinnedCount})
        </Button>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Pin variants from the gallery to add them to the kit.
        </p>
      </Section>
    </>
  );
}

// ── Bits ──────────────────────────────────────────────────────

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        {count != null && (
          <span className="text-[9px] font-medium text-muted-foreground">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function ColorRow({ label, colors }: { label: string; colors: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {colors.map((hex) => (
          <div
            key={hex + label}
            className="h-6 w-6 rounded-md border shadow-sm"
            style={{ background: hex }}
            title={hex}
          />
        ))}
      </div>
    </div>
  );
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
    <div className="flex w-full rounded-md border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-sm px-2 py-1.5 text-[11px] font-medium transition-colors',
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
        'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors',
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
        'mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
        tone,
      )}
    >
      Contrast: {grade}
    </div>
  );
}

function FormatButton({
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
      className="flex items-center justify-center gap-1 rounded-md border bg-card px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary"
    >
      {label}
      {locked && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
    </button>
  );
}
