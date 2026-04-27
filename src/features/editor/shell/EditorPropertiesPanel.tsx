// Properties panel — context-sensitive per-layer editor.
//
// Layout per `EditorPropertiesPanel.spec.md`:
//
//   1. Header strip — universal compact controls (X / Y / W / H / ° + 👁 + 🔒)
//   2. Primary controls — 1-4 per-kind controls; the 80% case
//   3. Advanced accordion — everything else, closed by default
//
// SlotRef-bound color and font fields render with an `Override` button:
// Phase 1 swaps the SlotRef for a literal value (the Phase-1 placeholder
// or the user's literal). Phase 3 will resolve real brand values; the
// Override semantics carry over.

import { useEffect, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  RotateCw,
} from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type {
  BrandOSDocument,
  ImageLayer,
  Layer,
  LogoLayer,
  ResolvedValue,
  SelectionState,
  ShapeLayer,
  SlotRef,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';
import { cn } from '@/lib/utils';

// ─── Phase 1 placeholders (Phase 3 replaces these) ──────────────────────

const PHASE1_FONT_OPTIONS = [
  { label: 'System UI', value: 'system-ui, -apple-system, Segoe UI, sans-serif' },
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Roboto', value: '"Roboto", sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
];

const SLOT_LABEL: Record<SlotRef['type'], string> = {
  'brand.color.primary': 'Brand primary',
  'brand.color.secondary': 'Brand secondary',
  'brand.color.accent': 'Brand accent',
  'brand.color.neutral': 'Brand neutral',
  'brand.font.heading': 'Brand heading',
  'brand.font.body': 'Brand body',
  'brand.logo.primary': 'Brand logo',
  'brand.logo.secondary': 'Brand logo (secondary)',
  'brand.logo.wordmark': 'Brand wordmark',
  'brand.logo.iconmark': 'Brand iconmark',
  'brand.logo.mono.black': 'Brand logo (mono black)',
  'brand.logo.mono.white': 'Brand logo (mono white)',
  'brand.spacing.unit': 'Brand spacing',
};

/**
 * Deterministic placeholder color for a SlotRef in Phase 1. Phase 3
 * replaces this with `applyBrand(brand).resolveSlot(slotRef)`. Used so
 * the chip's swatch isn't blank — it shows SOMETHING that distinguishes
 * "Brand primary" from "Brand neutral" visually until real resolution
 * lands.
 */
function slotPlaceholderHex(slot: SlotRef): string {
  const seed = slot.type + (slot.neutralIndex ?? '');
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 35%, 55%)`;
}

const PHASE1_LITERAL_FONT = PHASE1_FONT_OPTIONS[1].value; // Inter
const PHASE1_LITERAL_COLOR = '#111111';

// ─── Top-level component ────────────────────────────────────────────────

interface Props {
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  selection: SelectionState;
}

export function EditorPropertiesPanel({ adapter, doc, selection }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Close the accordion when the selection changes — each layer kind has
  // a different advanced section and leaving the accordion open after a
  // selection change is jarring.
  const selectedId = selection.layerIds[0];
  useEffect(() => {
    setAdvancedOpen(false);
  }, [selectedId]);

  const page = doc.pages.find((p) => p.id === selection.pageId) ?? doc.pages[0];
  if (!page || selection.layerIds.length !== 1) return <Empty />;
  const layer = page.layers.find((l) => l.id === selectedId);
  if (!layer) return <Empty />;

  const update = (patch: Partial<Layer>) =>
    adapter.updateLayer(page.id, layer.id, patch);

  return (
    <aside className="flex w-72 flex-col border-l bg-background">
      <header className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Properties
        <span className="text-[10px] normal-case opacity-70">{layer.kind}</span>
      </header>
      <div className="flex-1 overflow-auto">
        <HeaderStrip layer={layer} update={update} />
        <div className="px-3 py-2 space-y-3">
          <Primary layer={layer} update={update} />
        </div>
        <Collapsible.Root
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          className="border-t"
        >
          <Collapsible.Trigger
            className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
          >
            More properties
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                advancedOpen && 'rotate-180',
              )}
            />
          </Collapsible.Trigger>
          <Collapsible.Content className="px-3 pb-3 space-y-3">
            <Advanced layer={layer} update={update} />
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    </aside>
  );
}

function Empty() {
  return (
    <aside className="flex w-72 flex-col items-center justify-center border-l bg-background px-6 text-center text-xs text-muted-foreground">
      Select a layer to edit its properties.
    </aside>
  );
}

// ─── Header strip — always shown, every kind ────────────────────────────

function HeaderStrip({
  layer,
  update,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
}) {
  const t = layer.transform;
  const setTransform = (next: Partial<typeof t>) =>
    update({ transform: { ...t, ...next } });

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1.5 text-[11px] text-muted-foreground">
      <CompactNumber prefix="X" value={t.x} onChange={(v) => setTransform({ x: v })} />
      <CompactNumber prefix="Y" value={t.y} onChange={(v) => setTransform({ y: v })} />
      <CompactNumber prefix="W" value={t.width} onChange={(v) => setTransform({ width: v })} />
      <CompactNumber prefix="H" value={t.height} onChange={(v) => setTransform({ height: v })} />
      <CompactNumber
        prefix={<RotateCw className="h-3 w-3" />}
        value={t.rotation}
        onChange={(v) => setTransform({ rotation: v })}
      />
      <div className="ml-auto flex items-center gap-0.5">
        <IconToggle
          on={layer.visible}
          onIcon={<Eye className="h-3.5 w-3.5" />}
          offIcon={<EyeOff className="h-3.5 w-3.5" />}
          onClick={() => update({ visible: !layer.visible })}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        />
        <IconToggle
          on={layer.locked}
          onIcon={<Lock className="h-3.5 w-3.5" />}
          offIcon={<LockOpen className="h-3.5 w-3.5" />}
          onClick={() => update({ locked: !layer.locked })}
          title={layer.locked ? 'Unlock' : 'Lock'}
        />
      </div>
    </div>
  );
}

function CompactNumber({
  prefix,
  value,
  onChange,
}: {
  prefix: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1 rounded border bg-background px-1 py-0.5">
      <span className="text-[10px] opacity-70">{prefix}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"
      />
    </label>
  );
}

function IconToggle({
  on,
  onIcon,
  offIcon,
  onClick,
  title,
}: {
  on: boolean;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded transition-colors',
        on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {on ? onIcon : offIcon}
    </button>
  );
}

// ─── Primary (per kind) ─────────────────────────────────────────────────

function Primary({
  layer,
  update,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
}) {
  switch (layer.kind) {
    case 'text':
      return <TextPrimary layer={layer} update={update as (p: Partial<TextLayer>) => void} />;
    case 'shape':
      return <ShapePrimary layer={layer} update={update as (p: Partial<ShapeLayer>) => void} />;
    case 'image':
      return <ImagePrimary layer={layer} update={update as (p: Partial<ImageLayer>) => void} />;
    case 'svg':
      return <SvgPrimary layer={layer} update={update as (p: Partial<SvgLayer>) => void} />;
    case 'logo':
      return <LogoPrimary layer={layer} update={update as (p: Partial<LogoLayer>) => void} />;
    case 'group':
      return <GroupPrimary layer={layer} />;
  }
}

function TextPrimary({
  layer,
  update,
}: {
  layer: TextLayer;
  update: (patch: Partial<TextLayer>) => void;
}) {
  return (
    <>
      <FontField
        label="Font"
        value={layer.fontFamily}
        onChange={(v) => update({ fontFamily: v })}
      />
      <SliderField
        label="Size"
        value={layer.fontSize}
        min={6}
        max={400}
        onChange={(v) => update({ fontSize: v })}
      />
      <NumberField
        label="Weight"
        value={layer.fontWeight}
        step={100}
        min={100}
        max={900}
        onChange={(v) => update({ fontWeight: v })}
      />
      <ColorField
        label="Color"
        value={layer.color}
        onChange={(v) => update({ color: v })}
      />
    </>
  );
}

function ShapePrimary({
  layer,
  update,
}: {
  layer: ShapeLayer;
  update: (patch: Partial<ShapeLayer>) => void;
}) {
  return (
    <>
      <ColorField
        label="Fill"
        value={layer.fill ?? '#000000'}
        nullable
        cleared={layer.fill === null}
        onChange={(v) => update({ fill: v })}
        onClear={() => update({ fill: null })}
      />
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <ColorField
            label="Stroke"
            value={layer.stroke ?? '#000000'}
            nullable
            cleared={layer.stroke === null}
            onChange={(v) => update({ stroke: v })}
            onClear={() => update({ stroke: null })}
          />
        </div>
        <NumberField
          label="Width"
          value={layer.strokeWidth}
          min={0}
          onChange={(v) => update({ strokeWidth: v })}
        />
      </div>
      {layer.shape === 'rectangle' ? (
        <SliderField
          label="Corner radius"
          value={layer.cornerRadius}
          min={0}
          max={Math.max(layer.transform.width, layer.transform.height) / 2}
          onChange={(v) => update({ cornerRadius: v })}
        />
      ) : null}
    </>
  );
}

function ImagePrimary({
  layer,
  update,
}: {
  layer: ImageLayer;
  update: (patch: Partial<ImageLayer>) => void;
}) {
  const srcStr = typeof layer.src === 'string' ? layer.src : '';
  return (
    <>
      <Field label="Source">
        <input
          type="text"
          value={srcStr}
          placeholder="https://… or paste an asset URL"
          onChange={(e) => update({ src: e.target.value })}
          className="w-full rounded border bg-background px-2 py-1 font-mono text-[11px]"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Phase 1: URL only. Phase 2 wires the brand asset picker.
        </p>
      </Field>
      <Field label="Fit">
        <ToggleGroup
          options={[
            { label: 'Cover', value: 'cover' },
            { label: 'Contain', value: 'contain' },
            { label: 'Fill', value: 'fill' },
          ]}
          value={layer.fit}
          onChange={(v) => update({ fit: v as ImageLayer['fit'] })}
        />
      </Field>
    </>
  );
}

function SvgPrimary({
  layer,
  update,
}: {
  layer: SvgLayer;
  update: (patch: Partial<SvgLayer>) => void;
}) {
  const srcStr = typeof layer.src === 'string' ? layer.src : '';
  return (
    <Field label="Source">
      <input
        type="text"
        value={srcStr}
        placeholder="https://… SVG URL"
        onChange={(e) => update({ src: e.target.value })}
        className="w-full rounded border bg-background px-2 py-1 font-mono text-[11px]"
      />
      <p className="mt-1 text-[10px] text-muted-foreground">
        Phase 2: parse + per-path fill overrides.
      </p>
    </Field>
  );
}

function LogoPrimary({
  layer,
  update,
}: {
  layer: LogoLayer;
  update: (patch: Partial<LogoLayer>) => void;
}) {
  const opts: Array<{ label: string; value: LogoLayer['variant'] }> = [
    { label: 'Auto', value: 'auto' },
    { label: 'Primary', value: 'primary' },
    { label: 'Secondary', value: 'secondary' },
    { label: 'Wordmark', value: 'wordmark' },
    { label: 'Iconmark', value: 'iconmark' },
    { label: 'Mono · black', value: 'mono.black' },
    { label: 'Mono · white', value: 'mono.white' },
  ];
  return (
    <Field label="Variant">
      <select
        value={layer.variant}
        onChange={(e) => update({ variant: e.target.value as LogoLayer['variant'] })}
        className="w-full rounded border bg-background px-2 py-1 text-xs"
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {layer.variant === 'auto' ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Auto-pick wired in Phase 3 (pickLogoOnBackground).
        </p>
      ) : null}
    </Field>
  );
}

function GroupPrimary({ layer }: { layer: Extract<Layer, { kind: 'group' }> }) {
  return (
    <p className="text-xs text-muted-foreground">
      {layer.children.length} {layer.children.length === 1 ? 'layer' : 'layers'} ·
      select an inner layer to edit.
    </p>
  );
}

// ─── Advanced (per kind) ────────────────────────────────────────────────

function Advanced({
  layer,
  update,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
}) {
  return (
    <>
      {layer.kind === 'text' ? (
        <AdvancedText
          layer={layer}
          update={update as (p: Partial<TextLayer>) => void}
        />
      ) : null}
      <AdvancedTransform layer={layer} update={update} />
      <Field label="Layer name">
        <input
          type="text"
          value={layer.name}
          onChange={(e) => update({ name: e.target.value })}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      <ToggleField
        label="Brand-managed"
        value={layer.brandLocked}
        onChange={(v) => update({ brandLocked: v })}
        help="When on, brand-derived values are read-only and re-applied when the brand kit changes."
      />
    </>
  );
}

function AdvancedText({
  layer,
  update,
}: {
  layer: TextLayer;
  update: (patch: Partial<TextLayer>) => void;
}) {
  return (
    <>
      <Field label="Content">
        <textarea
          value={layer.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={3}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Line height">
        <input
          type="number"
          step={0.1}
          value={layer.lineHeight}
          onChange={(e) => update({ lineHeight: Number(e.target.value) })}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Letter spacing (em)">
        <input
          type="number"
          step={0.01}
          value={layer.letterSpacing}
          onChange={(e) => update({ letterSpacing: Number(e.target.value) })}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Align">
        <ToggleGroup
          options={[
            { label: <AlignLeft className="h-3 w-3" />, value: 'left' },
            { label: <AlignCenter className="h-3 w-3" />, value: 'center' },
            { label: <AlignRight className="h-3 w-3" />, value: 'right' },
            { label: <AlignJustify className="h-3 w-3" />, value: 'justify' },
          ]}
          value={layer.textAlign}
          onChange={(v) => update({ textAlign: v as TextLayer['textAlign'] })}
        />
      </Field>
      <Field label="Direction">
        <ToggleGroup
          options={[
            { label: 'Auto', value: 'auto' },
            { label: 'LTR', value: 'ltr' },
            { label: 'RTL', value: 'rtl' },
          ]}
          value={layer.direction}
          onChange={(v) => update({ direction: v as TextLayer['direction'] })}
        />
      </Field>
    </>
  );
}

function AdvancedTransform({
  layer,
  update,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
}) {
  return (
    <Field label={`Opacity ${(layer.opacity * 100).toFixed(0)}%`}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={layer.opacity}
        onChange={(e) => update({ opacity: Number(e.target.value) })}
        className="w-full"
      />
    </Field>
  );
}

// ─── Field primitives ───────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border bg-background px-2 py-1 text-xs"
      />
    </Field>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <input
          type="number"
          value={Math.round(value)}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 rounded border bg-background px-1.5 py-0.5 text-xs"
        />
      </div>
    </Field>
  );
}

function ToggleField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[2px]"
      />
      <span>
        <span className="text-foreground">{label}</span>
        {help ? <span className="block opacity-70">{help}</span> : null}
      </span>
    </label>
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: React.ReactNode; value: T }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex flex-1 items-center justify-center px-2 py-1 text-[11px] transition-colors',
            value === o.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Slot-aware ColorField + FontField ──────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
  nullable,
  cleared,
  onClear,
}: {
  label: string;
  value: ResolvedValue;
  onChange: (v: ResolvedValue) => void;
  nullable?: boolean;
  cleared?: boolean;
  onClear?: () => void;
}) {
  // Slot-bound: chip + Override.
  if (typeof value !== 'string' && typeof value !== 'number') {
    const slot = value as SlotRef;
    const placeholderHex = slotPlaceholderHex(slot);
    return (
      <Field label={label}>
        <div className="flex items-center gap-2 rounded border bg-muted/40 px-2 py-1">
          <span
            className="h-4 w-4 shrink-0 rounded border"
            style={{ background: placeholderHex }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
            {SLOT_LABEL[slot.type] ?? slot.type}
          </span>
          <button
            type="button"
            onClick={() => onChange(placeholderHex)}
            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground"
            title="Detach from the brand kit and set a one-off color"
          >
            Override
          </button>
        </div>
      </Field>
    );
  }
  // Cleared (nullable + null): show a placeholder + 'Set' affordance.
  if (cleared) {
    return (
      <Field label={label}>
        <div className="flex items-center gap-2 rounded border border-dashed bg-background px-2 py-1 text-[11px]">
          <span className="text-muted-foreground">None</span>
          <button
            type="button"
            onClick={() => onChange('#000000')}
            className="ml-auto rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Set
          </button>
        </div>
      </Field>
    );
  }
  // Literal hex.
  const hex = String(value);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex.length === 7 ? hex : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border bg-background"
        />
        <input
          type="text"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded border bg-background px-2 py-1 font-mono text-[11px]"
        />
        {nullable && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Remove this color"
          >
            Clear
          </button>
        ) : null}
      </div>
    </Field>
  );
}

function FontField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ResolvedValue;
  onChange: (v: ResolvedValue) => void;
}) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    const slot = value as SlotRef;
    return (
      <Field label={label}>
        <div className="flex items-center gap-2 rounded border bg-muted/40 px-2 py-1">
          <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
            {SLOT_LABEL[slot.type] ?? slot.type}
          </span>
          <button
            type="button"
            onClick={() => onChange(PHASE1_LITERAL_FONT)}
            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground"
            title="Detach from the brand kit and pick a system font"
          >
            Override
          </button>
        </div>
      </Field>
    );
  }
  // Literal — match against the Phase 1 shortlist; "Custom" if not in list.
  const family = String(value);
  const matched = PHASE1_FONT_OPTIONS.find((o) => o.value === family);
  return (
    <Field label={label}>
      <select
        value={matched?.value ?? '__custom__'}
        onChange={(e) => {
          if (e.target.value === '__custom__') return; // keep current
          onChange(e.target.value);
        }}
        className="w-full rounded border bg-background px-2 py-1 text-xs"
      >
        {PHASE1_FONT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {!matched ? <option value="__custom__">Custom: {family}</option> : null}
      </select>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Phase 1 shortlist. Phase 3 adds brand fonts + uploaded fonts.
      </p>
    </Field>
  );
}

// Suppress the literal placeholder warning — referenced from comments above.
void PHASE1_LITERAL_COLOR;
