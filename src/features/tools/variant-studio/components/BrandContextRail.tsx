/**
 * BrandContextRail — left rail that grounds the studio in the brand.
 *
 * Everything that *informs* every variant lives here:
 *  - the source logo (with replace)
 *  - the brand identity (name, optional inline rename)
 *  - the brand color palette (with "add custom" affordance)
 *  - the wordmark typography
 *  - the missing-variants suggestions (one-click generators)
 *
 * The rail is intentionally read-mostly. The user comes here to remind
 * themselves what they're working with and to make small context
 * adjustments. The actual per-variant editing happens in the EditBar
 * above the gallery — not here.
 */
import { Plus, Sparkles, Type, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PaletteContext,
  SourceLogo,
  VariantSpec,
} from '../engine/types';
import { findMissingVariants } from '../engine/missingVariants';

interface BrandContextRailProps {
  source: SourceLogo | null;
  palette: PaletteContext;
  brandName: string;
  variants: VariantSpec[];
  onPickFile: (file: File) => void;
  onAddCustomColor: (hex: string) => void;
  onGenerateMissing: (spec: VariantSpec) => void;
  onRenameBrand?: (next: string) => void;
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
                  className="h-full w-full p-1"
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
    </div>
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
