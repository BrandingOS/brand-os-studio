// Step 5 UI direction — Variant 3 (Hybrid).
//
// Skeleton inherited from Variant 2 (familiar BrandOS aesthetic) +
// three elevated patterns from mature editors:
//
//   1. AI prompt bar as a floating element at the bottom-center of
//      the viewport (Lovart-style). Collapsed = pill; focused = full
//      input bar with suggestions.
//   2. Properties panel as a floating overlay near the selection
//      (Figma-style). Hidden when nothing selected → canvas takes
//      the full width.
//   3. Bottom-right floating toolbar with zoom controls + fit / 100% /
//      fullscreen.
//
// The chrome retreats when the user is in flow. Canvas real estate
// is the priority.
//
// MOCKUP ONLY. No engine wiring.

import { useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Lock,
  Maximize2,
  MoreHorizontal,
  Moon,
  MousePointer2,
  RefreshCw,
  Sparkles,
  Square,
  Sun,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  mockBrand,
  mockBrandList,
  mockDocument,
  resolveMockColor,
  SELECTED_LAYER_ID,
  type MockBrand,
  type MockLayer,
} from '@/_dev/ui-preview/mockData';
import { cn } from '@/lib/utils';

const ACCENT = '#16a34a';

export default function Step5Variant3Page() {
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState<MockBrand>(mockBrand);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [hasSelection, setHasSelection] = useState(true);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [brandManaged, setBrandManaged] = useState(true);

  const selectedLayer = useMemo(
    () => mockDocument.page.layers.find((l) => l.id === SELECTED_LAYER_ID)!,
    [],
  );

  return (
    <div className={cn(dark && 'dark')}>
      <div className="relative min-h-screen w-full bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        {/* ─── Top chrome ─────────────────────────────────────────── */}
        <header className="flex h-12 items-center gap-3 border-b border-stone-200 bg-white px-3 dark:border-stone-800 dark:bg-stone-900">
          <BrandPicker brand={brand} onSelect={setBrand} />

          <span className="ml-2 text-[12px] text-stone-400">/</span>
          <div className="flex items-center gap-1.5 text-[12px]">
            <span className="text-stone-500 dark:text-stone-400">Untitled social post</span>
            <ChevronDown className="h-3 w-3 text-stone-400" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SaveDot />
            <button
              onClick={() => setHasSelection((v) => !v)}
              className="rounded-md border border-dashed border-stone-300 px-2.5 py-1 text-[11px] text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
              title="Toggle selection (mockup demo)"
            >
              {hasSelection ? 'Hide selection' : 'Show selection'}
            </button>
            <button
              onClick={() => setDark((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900">
              Export
            </button>
            <KebabMenu />
          </div>
        </header>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <div className="flex h-[calc(100vh-3rem)]">
          <ToolSidebar activeTool={activeTool} onToolChange={setActiveTool} />

          {/* Full-width canvas area */}
          <main className="relative flex flex-1 items-center justify-center overflow-hidden">
            <MockCanvas brand={brand} selectedLayerId={hasSelection ? SELECTED_LAYER_ID : null} />

            {/* ─── Floating Properties overlay (Figma-style) ──────── */}
            {hasSelection ? (
              <FloatingProperties
                layer={selectedLayer}
                brand={brand}
                brandManaged={brandManaged}
                onBrandManagedChange={setBrandManaged}
                onClose={() => setHasSelection(false)}
              />
            ) : null}

            {/* ─── Floating zoom toolbar ─────────────────────────── */}
            <FloatingZoom />

            {/* ─── Floating AI prompt bar (Lovart-style) ──────────── */}
            <FloatingAI expanded={aiExpanded} onExpandedChange={setAiExpanded} />
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Brand picker (with Re-apply brand) ──────────────────────────────────

function BrandPicker({ brand, onSelect }: { brand: MockBrand; onSelect: (b: MockBrand) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-2.5 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900">
        <img src={brand.logoDataUrl} alt="" className="h-7 w-7 rounded-md" />
        <span
          className="text-sm tracking-tight"
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          {brand.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Switch brand
          </p>
          {mockBrandList.map((b) => (
            <DropdownMenu.Item
              key={b.id}
              onSelect={() => onSelect(b)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <img src={b.logoDataUrl} alt="" className="h-6 w-6 rounded" />
              <span className="text-sm">{b.name}</span>
              {b.id === brand.id && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
              )}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-stone-100 dark:bg-stone-800" />
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-stone-100 dark:hover:bg-stone-800">
            <RefreshCw className="h-3.5 w-3.5 text-stone-500" />
            <span className="text-sm">Re-apply brand</span>
            <span className="ml-auto text-[10px] text-stone-400">⌘⇧R</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SaveDot() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] dark:bg-stone-800">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
      <span className="text-stone-500 dark:text-stone-400">
        Live preview <span className="font-medium text-stone-700 dark:text-stone-200">saved</span>
      </span>
    </div>
  );
}

function KebabMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
}

// ─── Tool sidebar ────────────────────────────────────────────────────────

function ToolSidebar({
  activeTool,
  onToolChange,
}: {
  activeTool: string;
  onToolChange: (t: string) => void;
}) {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'shape', icon: Square, label: 'Shape' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'logo', icon: Bookmark, label: 'Logo' },
  ];
  return (
    <aside className="flex w-14 flex-col items-center gap-1 border-r border-stone-200 bg-white py-3 dark:border-stone-800 dark:bg-stone-900">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </aside>
  );
}

// ─── Floating Properties overlay (Figma-style) ──────────────────────────

function FloatingProperties({
  layer,
  brand,
  brandManaged,
  onBrandManagedChange,
  onClose,
}: {
  layer: MockLayer;
  brand: MockBrand;
  brandManaged: boolean;
  onBrandManagedChange: (v: boolean) => void;
  onClose: () => void;
}) {
  return (
    <aside
      // Position to the right of the canvas selection — in a real
      // implementation this anchors to the selection bounding box and
      // updates with viewport scroll. For the mockup it's fixed.
      className="absolute right-6 top-6 z-20 flex w-[280px] flex-col gap-3 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95"
    >
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-medium">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: ACCENT }}
          />
          {layer.name}
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-stone-500 dark:bg-stone-800">
            {layer.kind}
          </span>
        </span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      {/* Compact transform header */}
      <div className="grid grid-cols-4 gap-1 rounded-md bg-stone-50 p-1 text-center text-[10px] dark:bg-stone-800/50">
        {[
          ['X', layer.x],
          ['Y', layer.y],
          ['W', layer.width],
          ['H', layer.height],
        ].map(([k, v]) => (
          <div key={k as string} className="flex flex-col items-center py-1">
            <span className="text-stone-400">{k}</span>
            <span className="font-mono text-stone-700 dark:text-stone-300">{v}</span>
          </div>
        ))}
      </div>

      {/* Primary controls */}
      <div className="space-y-2">
        <FloatField label="Font" value={brandManaged ? 'Brand heading' : 'DM Sans'} slot={brandManaged} />
        <FloatField label="Size" value={`${layer.fontSize}px`} />
        <FloatColor
          label="Color"
          value={brandManaged ? 'Brand primary' : '#1a1a2e'}
          swatch={resolveMockColor(layer.color, brand)}
          slot={brandManaged}
        />
      </div>

      {/* Brand-managed toggle */}
      <div
        className="rounded-lg border-l-[3px] bg-stone-50/70 px-2.5 py-2 dark:bg-stone-800/30"
        style={{ borderColor: brandManaged ? ACCENT : '#d4d4d8' }}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium">
            <Lock className="h-3 w-3" />
            Brand-managed
          </span>
          <Switch.Root
            checked={brandManaged}
            onCheckedChange={onBrandManagedChange}
            className={cn(
              'relative h-3.5 w-6 rounded-full transition-colors',
              brandManaged ? '' : 'bg-stone-200 dark:bg-stone-700',
            )}
            style={{ background: brandManaged ? ACCENT : undefined }}
          >
            <Switch.Thumb
              className={cn(
                'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform',
                brandManaged ? 'translate-x-3' : 'translate-x-0.5',
              )}
            />
          </Switch.Root>
        </div>
        <p className="mt-1 text-[9px] leading-tight text-stone-500 dark:text-stone-400">
          {brandManaged
            ? 'Re-apply brand will restore SlotRefs.'
            : 'One-off override. User authority.'}
        </p>
      </div>

      <button className="flex items-center justify-center gap-1.5 rounded-md border border-stone-200 py-1.5 text-[11px] text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800">
        <RefreshCw className="h-3 w-3" />
        Re-apply brand
      </button>
    </aside>
  );
}

function FloatField({ label, value, slot }: { label: string; value: string; slot?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-stone-50 px-2 py-1.5 text-[11px] dark:bg-stone-800/40">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span
        className={cn(
          slot && 'rounded-full bg-white px-2 py-0.5 text-[10px] dark:bg-stone-900',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function FloatColor({
  label,
  value,
  swatch,
  slot,
}: {
  label: string;
  value: string;
  swatch: string;
  slot?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-stone-50 px-2 py-1.5 text-[11px] dark:bg-stone-800/40">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-full ring-1 ring-stone-200 dark:ring-stone-700"
          style={{ background: swatch }}
        />
        <span
          className={cn(
            slot && 'rounded-full bg-white px-2 py-0.5 text-[10px] dark:bg-stone-900',
          )}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

// ─── Floating zoom controls ─────────────────────────────────────────────

function FloatingZoom() {
  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-0.5 rounded-full border border-stone-200 bg-white/95 px-1 py-1 shadow-lg backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
      <button className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <button className="rounded-full px-2 text-[11px] font-mono text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
        100%
      </button>
      <button className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <span className="mx-1 h-4 w-px bg-stone-200 dark:bg-stone-700" />
      <button className="rounded-full px-2 text-[11px] text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800">
        Fit
      </button>
      <button className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Floating AI prompt bar (Lovart-style) ─────────────────────────────

function FloatingAI({
  expanded,
  onExpandedChange,
}: {
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
}) {
  if (!expanded) {
    return (
      <button
        onClick={() => onExpandedChange(true)}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium text-white shadow-xl transition-transform hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
        }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask AI to edit this design
        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-mono">⌘K</span>
      </button>
    );
  }
  return (
    <div
      className="absolute bottom-6 left-1/2 w-[640px] -translate-x-1/2 rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Sparkles className="h-4 w-4 text-stone-400" />
        <input
          autoFocus
          placeholder='Try "change the headline color to brand accent"…'
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-stone-400"
        />
        <button
          onClick={() => onExpandedChange(false)}
          className="flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1 border-t border-stone-100 px-3 py-2 dark:border-stone-800">
        {[
          'Change all headlines to accent color',
          'Make this 1.5x bigger',
          'Translate to Arabic',
          'More minimalist',
        ].map((s) => (
          <button
            key={s}
            className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Mock canvas ─────────────────────────────────────────────────────────

function MockCanvas({
  brand,
  selectedLayerId,
}: {
  brand: MockBrand;
  selectedLayerId: string | null;
}) {
  const page = mockDocument.page;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5"
      style={{
        width: page.displayWidth,
        height: page.displayHeight,
        background: page.background,
      }}
    >
      {page.layers.map((layer) => (
        <LayerNode
          key={layer.id}
          layer={layer}
          brand={brand}
          selected={layer.id === selectedLayerId}
        />
      ))}
    </div>
  );
}

function LayerNode({
  layer,
  brand,
  selected,
}: {
  layer: MockLayer;
  brand: MockBrand;
  selected: boolean;
}) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
  };
  if (layer.kind === 'logo') {
    return (
      <div style={style}>
        <img src={brand.logoDataUrl} alt="" className="h-full w-full" />
      </div>
    );
  }
  if (layer.kind === 'shape') {
    return (
      <div
        style={{
          ...style,
          background: resolveMockColor(layer.fill, brand),
          borderRadius: layer.cornerRadius ?? 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        ...style,
        color: resolveMockColor(layer.color, brand),
        fontFamily: layer.fontFamily ?? 'sans-serif',
        fontSize: layer.fontSize ?? 16,
        fontWeight: layer.fontWeight ?? 400,
        lineHeight: 1.1,
        letterSpacing: '-0.01em',
        whiteSpace: 'pre-line',
        display: 'flex',
        alignItems: layer.id === 'cta' ? 'center' : 'flex-start',
        justifyContent: layer.id === 'cta' ? 'center' : 'flex-start',
      }}
    >
      {layer.content}
      {selected ? (
        <div
          className="pointer-events-none absolute -inset-2 rounded-md"
          style={{ boxShadow: `0 0 0 1.5px ${ACCENT}` }}
        >
          {[
            { top: -3, left: -3 },
            { top: -3, right: -3 },
            { bottom: -3, left: -3 },
            { bottom: -3, right: -3 },
          ].map((pos, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-white"
              style={{ ...pos, boxShadow: `0 0 0 1.5px ${ACCENT}` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
