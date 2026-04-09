/**
 * BrandContextRail — the single side panel for the studio.
 *
 * Sections, top to bottom:
 *
 *   1. LOGO VARIATIONS — multi-source upload row (was "Sources")
 *   2. BRAND — name + slogan (text + alignment). Slogan is BRAND-LEVEL
 *      (one slogan per session), not per-variant. Each variant decides
 *      via its `includeSlogan` flag whether to render it.
 *   3. BRAND COLORS — palette swatches + add custom (was "Colors")
 *   4. MISSING FROM YOUR BRAND — only when there are missing archetypes
 *   5. LOGO COLOR — pick a brand color to recolor the logo (was "Apply
 *      color"). Brand colors + neutrals; clicking sets the draft to a
 *      custom-color variant of that hue.
 *   6. BACKGROUND — visual chips. Each chip looks like the background
 *      it represents (transparent → checker, white → white, black →
 *      black, brand colors → solid colored chips).
 *   7. SLOGAN — per-variant include checkbox (the text + alignment
 *      live up in BRAND, not here).
 *   8. QUICK EXPORT — per-format buttons for the current draft.
 *
 *   STICKY BOTTOM: "Add this variant" CTA — commits the draft to
 *   the gallery.
 *
 * Removed (per user request):
 *   - "Coverage" green pill
 *   - "Draft variant" header banner
 *   - "Color mode" dropdown
 *   - "Apply color" (replaced by Logo Color)
 */
import { Lock, Plus, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type {
  Background,
  BrandSlogan,
  Composition,
  ExportFormat,
  Layout,
  PaletteContext,
  SourceLogo,
  VariantSpec,
} from '../engine/types';
import { findMissingVariants } from '../engine/missingVariants';
import { allPaletteColors } from '../engine/palette';
import { SourceSlots } from './SourceSlots';

interface BrandContextRailProps {
  // Sources
  sources: SourceLogo[];
  activeSourceId: string | null;
  onPickSourceFile: (file: File) => void;
  onSelectSource: (id: string) => void;
  onRemoveSource: (id: string) => void;

  // Brand context
  palette: PaletteContext;
  brandName: string;
  variants: VariantSpec[];
  slogan: BrandSlogan;
  onAddCustomColor: (hex: string) => void;
  onGenerateMissing: (spec: VariantSpec) => void;
  onRenameBrand?: (next: string) => void;
  onChangeSlogan: (next: BrandSlogan) => void;

  // Draft editing
  draft: VariantSpec | null;
  onChangeDraft: (patch: Partial<VariantSpec>) => void;
  onAddDraft: () => void;

  // Per-format export of the current draft
  onExport: (format: ExportFormat) => void;
}

export function BrandContextRail({
  sources,
  activeSourceId,
  onPickSourceFile,
  onSelectSource,
  onRemoveSource,
  palette,
  brandName,
  variants,
  slogan,
  onAddCustomColor,
  onGenerateMissing,
  onRenameBrand,
  onChangeSlogan,
  draft,
  onChangeDraft,
  onAddDraft,
  onExport,
}: BrandContextRailProps) {
  const activeSource = sources.find((s) => s.id === activeSourceId) ?? null;
  const missing =
    activeSource != null
      ? findMissingVariants(activeSource, palette, variants)
      : [];
  const isMonolithic = !activeSource?.icon;
  const colors = allPaletteColors(palette);
  const wordmarkFont = activeSource?.wordmark?.fontFamily;
  const hasDraftAndSource = !!draft && !!activeSource;

  return (
    <div className="flex h-full flex-col">
      {/* ── Scrollable rail body ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* 1. LOGO VARIATIONS */}
        <Section label="Logo variations">
          <SourceSlots
            sources={sources}
            activeSourceId={activeSourceId}
            onPickFile={onPickSourceFile}
            onSelect={onSelectSource}
            onRemove={onRemoveSource}
          />
        </Section>

        {/* 2. BRAND (name + slogan text + slogan alignment) */}
        <Section label="Brand">
          <div className="space-y-2">
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
            {wordmarkFont && (
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                <Type className="h-2.5 w-2.5" />
                <span className="truncate" style={{ fontFamily: wordmarkFont }}>
                  {wordmarkFont}
                </span>
              </div>
            )}

            {/* Slogan input + alignment — brand-level, not per-variant */}
            <div className="pt-1">
              <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/70">
                Slogan
              </div>
              <Input
                value={slogan.text}
                onChange={(e) => onChangeSlogan({ ...slogan, text: e.target.value })}
                placeholder="Your tagline"
                className="h-8 text-xs"
              />
              <div className="mt-1.5">
                <Segmented
                  value={slogan.alignment}
                  options={[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' },
                  ]}
                  onChange={(v) =>
                    onChangeSlogan({ ...slogan, alignment: v as 'left' | 'center' | 'right' })
                  }
                />
              </div>
            </div>
          </div>
        </Section>

        {/* 3. BRAND COLORS — deduped via allPaletteColors */}
        <Section label="Brand colors">
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <div
                key={c.hex}
                className="h-7 w-7 rounded-md border shadow-sm"
                style={{ background: c.hex }}
                title={`${c.label ?? c.source} · ${c.hex}`}
              />
            ))}
            <CustomColorAdder onAdd={onAddCustomColor} />
          </div>
        </Section>

        {/* 4. MISSING FROM YOUR BRAND */}
        {activeSource && missing.length > 0 && (
          <Section label="Missing from your brand" count={missing.length}>
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
                    <div className="truncate text-[9px] text-muted-foreground">
                      {m.purpose}
                    </div>
                  </div>
                  <Plus className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Type + Layout — only for decomposed sources, otherwise hidden */}
        {hasDraftAndSource && !isMonolithic && (
          <>
            <Section label="Type">
              <Segmented
                value={draft!.composition}
                options={[
                  { value: 'lockup', label: 'Lockup' },
                  { value: 'icon-only', label: 'Icon' },
                  { value: 'wordmark-only', label: 'Word' },
                ]}
                onChange={(v) => onChangeDraft({ composition: v as Composition })}
              />
            </Section>

            {draft!.composition === 'lockup' && (
              <Section label="Layout">
                <Segmented
                  value={draft!.layout}
                  options={[
                    { value: 'horizontal', label: 'Horizontal' },
                    { value: 'stacked', label: 'Stacked' },
                  ]}
                  onChange={(v) => onChangeDraft({ layout: v as Layout })}
                />
              </Section>
            )}
          </>
        )}

        {/* 5. LOGO COLOR — pick a brand color to recolor the logo */}
        {hasDraftAndSource && (
          <Section label="Logo color">
            <LogoColorSwatches
              palette={palette}
              draft={draft!}
              onPick={(hex, label) => {
                if (hex.toLowerCase() === '#ffffff') {
                  onChangeDraft({ colorMode: 'mono-white' });
                } else if (hex.toLowerCase() === '#000000') {
                  onChangeDraft({ colorMode: 'mono-black' });
                } else {
                  const colorRef = { hex, source: 'custom' as const, label };
                  onChangeDraft({
                    colorMode: 'custom',
                    colorMap: { icon: colorRef, wordmark: colorRef },
                  });
                }
              }}
            />
          </Section>
        )}

        {/* 6. BACKGROUND — visual chips, brand colors as individual chips */}
        {hasDraftAndSource && (
          <Section label="Background">
            <BackgroundChips
              palette={palette}
              draft={draft!}
              onPick={(bg) => onChangeDraft({ background: bg })}
            />
          </Section>
        )}

        {/* 7. SLOGAN — per-variant include checkbox only */}
        {hasDraftAndSource && (
          <Section label="Slogan">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-foreground">
              <Checkbox
                checked={!!draft!.includeSlogan}
                onCheckedChange={(v) => onChangeDraft({ includeSlogan: !!v })}
              />
              Include the slogan in this variant
            </label>
          </Section>
        )}

        {/* 8. QUICK EXPORT */}
        {hasDraftAndSource && (
          <Section label="Quick export">
            <div className="grid grid-cols-2 gap-1.5">
              <FormatButton label="PNG" onClick={() => onExport('png')} />
              <FormatButton label="SVG" onClick={() => onExport('svg')} locked />
              <FormatButton label="PDF" onClick={() => onExport('pdf')} locked />
              <FormatButton label="JPG" onClick={() => onExport('jpg')} />
            </div>
          </Section>
        )}
      </div>

      {/* ── Sticky CTA — never moves when the rail scrolls ── */}
      <div className="shrink-0 border-t bg-background p-3">
        <Button
          className="w-full"
          size="lg"
          onClick={onAddDraft}
          disabled={!hasDraftAndSource}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add this variant
        </Button>
      </div>
    </div>
  );
}

// ─── Logo color swatches ──────────────────────────────────────
//
// The user picks "what color should the logo be". We surface every
// brand + custom color, plus white and black as the canonical mono
// modes. Picking white/black switches the draft to the corresponding
// mono color mode (which uses an SVG filter to recolor the logo).
// Picking any other color sets a custom colorMap.

function LogoColorSwatches({
  palette,
  draft,
  onPick,
}: {
  palette: PaletteContext;
  draft: VariantSpec;
  onPick: (hex: string, label: string) => void;
}) {
  const colors = allPaletteColors(palette);
  const activeHex =
    draft.colorMode === 'mono-white'
      ? '#ffffff'
      : draft.colorMode === 'mono-black'
        ? '#000000'
        : draft.colorMap.icon.hex.toLowerCase();
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => {
        const active = c.hex.toLowerCase() === activeHex;
        return (
          <button
            key={c.hex}
            type="button"
            title={c.label ?? c.hex}
            onClick={() => onPick(c.hex, c.label ?? 'Logo color')}
            className={cn(
              'h-8 w-8 rounded-md border-2 transition-transform hover:scale-110',
              active ? 'border-primary ring-2 ring-primary/20' : 'border-border',
            )}
            style={{ background: c.hex }}
            aria-label={c.label ?? c.hex}
          />
        );
      })}
    </div>
  );
}

// ─── Background chips (visual) ────────────────────────────────
//
// Each chip looks like the background it represents:
//   - Transparent → checker pattern
//   - White       → solid white with a border
//   - Black       → solid black
//   - Brand color → solid colored chip per brand color (and per
//                   custom color), one chip each
// No "Brand" word chip — actual colors are surfaced individually.

function BackgroundChips({
  palette,
  draft,
  onPick,
}: {
  palette: PaletteContext;
  draft: VariantSpec;
  onPick: (bg: Background) => void;
}) {
  const colors = allPaletteColors(palette);
  // Filter out white and black — they're the canonical "White" and
  // "Black" chips below; we don't want them duplicated as "brand
  // colors".
  const colorChips = colors.filter(
    (c) => c.hex.toLowerCase() !== '#ffffff' && c.hex.toLowerCase() !== '#000000',
  );

  const isActive = (test: Background): boolean => {
    if (test.kind !== draft.background.kind) return false;
    if (test.kind === 'solid') return test.value === draft.background.value;
    if (test.kind === 'brand') return test.value === draft.background.value;
    return true;
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      <BgChip
        active={isActive({ kind: 'transparent' })}
        onClick={() => onPick({ kind: 'transparent' })}
        title="Transparent"
        kind="transparent"
      />
      <BgChip
        active={isActive({ kind: 'solid', value: '#FFFFFF' })}
        onClick={() => onPick({ kind: 'solid', value: '#FFFFFF' })}
        title="White"
        hex="#FFFFFF"
      />
      <BgChip
        active={isActive({ kind: 'solid', value: '#000000' })}
        onClick={() => onPick({ kind: 'solid', value: '#000000' })}
        title="Black"
        hex="#000000"
      />
      {colorChips.map((c) => (
        <BgChip
          key={c.hex}
          active={isActive({ kind: 'solid', value: c.hex })}
          onClick={() => onPick({ kind: 'solid', value: c.hex })}
          title={c.label ?? c.hex}
          hex={c.hex}
        />
      ))}
    </div>
  );
}

function BgChip({
  active,
  onClick,
  title,
  hex,
  kind,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hex?: string;
  kind?: 'transparent';
}) {
  const transparentBg = {
    backgroundImage:
      'linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)',
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
    backgroundColor: '#fff',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'h-12 rounded-md border-2 transition-all',
        active
          ? 'border-primary shadow-sm ring-2 ring-primary/20'
          : 'border-border hover:border-foreground/30',
      )}
      style={kind === 'transparent' ? transparentBg : { background: hex }}
    />
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
