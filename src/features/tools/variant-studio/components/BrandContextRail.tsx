/**
 * BrandContextRail — the single side panel for the studio.
 *
 * Two stacked sections, separated by the rail's own scroll area:
 *
 *   1. CONTEXT (top, scrollable)
 *      - Source slots (multi-source upload row)
 *      - Brand identity (name, font hint)
 *      - Palette (deduped swatches + add custom)
 *      - Missing variants suggestions
 *
 *   2. EDIT DRAFT (bottom, also scrollable above the sticky CTA)
 *      - Composition + layout (only when source has separable assets)
 *      - Color mode dropdown
 *      - Apply color (deduped palette swatches)
 *      - Background chips
 *      - Contrast pill (HIDDEN for transparent backgrounds — those
 *        are placed on something else, so contrast is meaningless)
 *      - Slogan: enable checkbox, text input, position toggle
 *
 *   3. STICKY BOTTOM CTA
 *      - "Add this variant" — commits the draft to the gallery.
 *        Lives in a sticky footer so it never moves when the user
 *        scrolls the rail content.
 *
 * Layout-stability fix: every interactive element is a real <button>
 * (or div with role=button) — no nested buttons. Sections never grow
 * or shrink in response to clicks (no conditional rendering inside
 * controls). The rail itself owns its scroll, so editing controls
 * never push the gallery around.
 */
import { Lock, Plus, Sparkles, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type {
  Background,
  ColorMode,
  Composition,
  ExportFormat,
  Layout,
  PaletteContext,
  Slogan,
  SourceLogo,
  VariantSpec,
} from '../engine/types';
import { findMissingVariants } from '../engine/missingVariants';
import { backgroundHex } from '../engine/generate';
import { allPaletteColors, gradeContrast } from '../engine/palette';
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
  onAddCustomColor: (hex: string) => void;
  onGenerateMissing: (spec: VariantSpec) => void;
  onRenameBrand?: (next: string) => void;

  // Draft editing
  draft: VariantSpec | null;
  onChangeDraft: (patch: Partial<VariantSpec>) => void;
  onAddDraft: () => void;

  // Top-level export already lives in the chrome topbar.
  // We expose per-format buttons here too for power users.
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
  onAddCustomColor,
  onGenerateMissing,
  onRenameBrand,
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

  return (
    <div className="flex h-full flex-col">
      {/* ── Scrollable rail body ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Sources */}
        <Section label="Sources">
          <SourceSlots
            sources={sources}
            activeSourceId={activeSourceId}
            onPickFile={onPickSourceFile}
            onSelect={onSelectSource}
            onRemove={onRemoveSource}
          />
        </Section>

        {/* Brand identity */}
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
            {wordmarkFont && (
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                <Type className="h-2.5 w-2.5" />
                <span className="truncate" style={{ fontFamily: wordmarkFont }}>
                  {wordmarkFont}
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Palette — already deduped via allPaletteColors */}
        <Section label="Colors">
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

        {/* Missing variants */}
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

        {activeSource && missing.length === 0 && (
          <Section label="Coverage">
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" />
              Logo system complete
            </div>
          </Section>
        )}

        {/* ── Draft editor ──────────────────────────────── */}
        {draft && activeSource && (
          <DraftEditor
            draft={draft}
            palette={palette}
            isMonolithic={isMonolithic}
            onChange={onChangeDraft}
            onExport={onExport}
          />
        )}
      </div>

      {/* ── Sticky CTA — never moves when the rail scrolls ── */}
      <div className="shrink-0 border-t bg-background p-3">
        <Button
          className="w-full"
          size="lg"
          onClick={onAddDraft}
          disabled={!draft || !activeSource}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add this variant
        </Button>
      </div>
    </div>
  );
}

// ─── Draft editor ─────────────────────────────────────────────

interface DraftEditorProps {
  draft: VariantSpec;
  palette: PaletteContext;
  isMonolithic: boolean;
  onChange: (patch: Partial<VariantSpec>) => void;
  onExport: (format: ExportFormat) => void;
}

function DraftEditor({
  draft,
  palette,
  isMonolithic,
  onChange,
  onExport,
}: DraftEditorProps) {
  const bgHex = backgroundHex(draft.background, palette);
  // Transparent backgrounds: don't compute / show contrast at all.
  // The variant will be placed on some other surface — the contrast
  // here would be against an arbitrary white test, which is misleading.
  const showContrast = draft.background.kind !== 'transparent';
  const grade = showContrast
    ? gradeContrast(draft.colorMap.icon.hex, bgHex)
    : null;
  const colors = allPaletteColors(palette);
  const slogan: Slogan = draft.slogan ?? { enabled: false, text: '', position: 'below' };

  return (
    <>
      <div className="border-y bg-primary/5 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Draft variant
        </div>
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {draft.label}
        </div>
      </div>

      {!isMonolithic && (
        <>
          <Section label="Type">
            <Segmented
              value={draft.composition}
              options={[
                { value: 'lockup', label: 'Lockup' },
                { value: 'icon-only', label: 'Icon' },
                { value: 'wordmark-only', label: 'Word' },
              ]}
              onChange={(v) => onChange({ composition: v as Composition })}
            />
          </Section>

          {draft.composition === 'lockup' && (
            <Section label="Layout">
              <Segmented
                value={draft.layout}
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
          value={draft.colorMode}
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
          {colors.map((c) => {
            const active =
              draft.colorMap.icon.hex.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
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
            active={draft.background.kind === 'transparent'}
            onClick={() => onChange({ background: { kind: 'transparent' } })}
          />
          <BgChip
            label="White"
            active={
              draft.background.kind === 'solid' && draft.background.value === '#FFFFFF'
            }
            onClick={() =>
              onChange({ background: { kind: 'solid', value: '#FFFFFF' } })
            }
          />
          <BgChip
            label="Black"
            active={
              draft.background.kind === 'solid' && draft.background.value === '#000000'
            }
            onClick={() =>
              onChange({ background: { kind: 'solid', value: '#000000' } })
            }
          />
          <BgChip
            label="Brand"
            active={draft.background.kind === 'brand'}
            onClick={() => onChange({ background: { kind: 'brand' } })}
          />
        </div>
        {showContrast && grade && <ContrastPill grade={grade} />}
      </Section>

      <Section label="Slogan">
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-foreground">
            <Checkbox
              checked={slogan.enabled}
              onCheckedChange={(v) =>
                onChange({ slogan: { ...slogan, enabled: !!v } })
              }
            />
            Include a slogan in this variant
          </label>
          <Input
            value={slogan.text}
            onChange={(e) => onChange({ slogan: { ...slogan, text: e.target.value } })}
            placeholder="Your tagline"
            className="h-8 text-xs"
          />
          <Segmented
            value={slogan.position}
            options={[
              { value: 'below', label: 'Below' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(v) =>
              onChange({ slogan: { ...slogan, position: v as 'below' | 'right' } })
            }
          />
        </div>
      </Section>

      <Section label="Quick export">
        <div className="grid grid-cols-2 gap-1.5">
          <FormatButton label="PNG" onClick={() => onExport('png')} />
          <FormatButton label="SVG" onClick={() => onExport('svg')} locked />
          <FormatButton label="PDF" onClick={() => onExport('pdf')} locked />
          <FormatButton label="JPG" onClick={() => onExport('jpg')} />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Export the current draft. To export many at once, use the Export Kit
          button up top.
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

