// Step 5 UI direction — Variant 1 (Free take).
//
// Aesthetic: Figma + Recraft hybrid. Dense top file-style menu strip,
// thin icon-only tools rail, sectioned properties with collapsible
// groups, warm-light canvas background, single playful accent color
// (indigo) used sparingly for active states + AI moments.
//
// Where this differs from Variant 2:
//   • Top chrome is a thin (40px) file-menu strip, not a 56px brand-
//     forward chrome
//   • Tools sidebar is icon-only (56px wide)
//   • Properties panel uses dense rows with separator dividers
//     between groups, no card padding
//   • AI tools elevated to a colored pill in top chrome (the Recraft
//     cue) rather than tucked at the bottom of the tools rail
//   • Selection styling is brand purple (#7c3aed) — already wired in
//     Phase 1 — to keep the editor's visual brand consistent
//
// MOCKUP ONLY. No engine wiring.

import { useMemo, useState } from 'react';
import {
  AlignLeft,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  Layers,
  Lock,
  Moon,
  MousePointer2,
  RefreshCw,
  Settings2,
  Share,
  Sparkles,
  Square,
  Sun,
  Type,
  Wand2,
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

const ACCENT = '#7c3aed'; // brand purple, matches Phase 1 selection styling

export default function Step5Variant1Page() {
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState<MockBrand>(mockBrand);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [selectedLayerId] = useState(SELECTED_LAYER_ID);
  const [brandManaged, setBrandManaged] = useState(true);
  const [layerSectionOpen, setLayerSectionOpen] = useState(true);
  const [textSectionOpen, setTextSectionOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const selectedLayer = useMemo(
    () => mockDocument.page.layers.find((l) => l.id === selectedLayerId)!,
    [selectedLayerId],
  );

  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* ─── Top chrome — thin file-menu strip ──────────────────────── */}
        <header className="flex h-10 items-center gap-1 border-b border-zinc-200 bg-white px-2 text-[12px] dark:border-zinc-800 dark:bg-zinc-900">
          <BrandPicker brand={brand} onSelect={setBrand} />

          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          {['File', 'Edit', 'View', 'Object', 'Help'].map((m) => (
            <button
              key={m}
              className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {m}
            </button>
          ))}

          {/* Doc title — center */}
          <div className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <span className="text-zinc-900 dark:text-zinc-100">Untitled social post</span>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </div>

          {/* AI pill — playful Recraft accent */}
          <button
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium text-white shadow-sm transition-transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, #ec4899 100%)`,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask AI
          </button>

          <SaveDot />

          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          <button
            type="button"
            onClick={() => setDark((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          <button className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
            <Share className="h-3.5 w-3.5" />
            Share
          </button>
          <button className="rounded bg-zinc-900 px-2.5 py-1 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
            Export
          </button>
        </header>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <div className="flex h-[calc(100vh-2.5rem)]">
          <ToolRail activeTool={activeTool} onChange={setActiveTool} />

          {/* Canvas with breathing room */}
          <main className="flex flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_50%_50%,#fafaf9_0%,#f5f5f4_100%)] dark:bg-zinc-950">
            <MockCanvas brand={brand} selectedLayerId={selectedLayerId} accent={ACCENT} />
          </main>

          {/* Properties panel — dense, collapsible, no card padding */}
          <aside className="flex w-[300px] flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Properties</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider"
                  style={{ background: `${ACCENT}20`, color: ACCENT }}
                >
                  {selectedLayer.kind}
                </span>
              </div>
              <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="flex-1 overflow-auto">
              <CollapsibleSection
                title="Layer"
                open={layerSectionOpen}
                onToggle={() => setLayerSectionOpen((v) => !v)}
              >
                <DenseRow label="Name" value={selectedLayer.name} />
                <DenseToggle
                  label="Visible"
                  icon={<Eye className="h-3 w-3" />}
                  on={true}
                />
                <DenseToggle
                  label="Locked"
                  icon={<Lock className="h-3 w-3" />}
                  on={false}
                />
                <BrandManagedRow
                  on={brandManaged}
                  onChange={setBrandManaged}
                  accent={ACCENT}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="Text"
                open={textSectionOpen}
                onToggle={() => setTextSectionOpen((v) => !v)}
              >
                <DenseRow
                  label="Font"
                  value={brandManaged ? 'Brand heading' : 'DM Sans'}
                  slot={brandManaged}
                  accent={ACCENT}
                />
                <DenseRow label="Size" value={`${selectedLayer.fontSize}px`} />
                <DenseRow label="Weight" value={`${selectedLayer.fontWeight}`} />
                <DenseColor
                  label="Color"
                  value={brandManaged ? 'Brand primary' : '#1a1a2e'}
                  swatch={resolveMockColor(selectedLayer.color, brand)}
                  slot={brandManaged}
                  accent={ACCENT}
                />
                <DenseRow label="Align" value="Left" icon={<AlignLeft className="h-3 w-3" />} />
              </CollapsibleSection>

              <CollapsibleSection
                title="More"
                open={advancedOpen}
                onToggle={() => setAdvancedOpen((v) => !v)}
              >
                <DenseRow label="Line height" value="1.10" />
                <DenseRow label="Letter spacing" value="-0.01em" />
                <DenseRow label="Direction" value="Auto" />
              </CollapsibleSection>

              <div className="px-4 py-3">
                <button className="flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 py-1.5 text-[11px] text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                  <RefreshCw className="h-3 w-3" />
                  Re-apply brand
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Brand picker ────────────────────────────────────────────────────────

function BrandPicker({
  brand,
  onSelect,
}: {
  brand: MockBrand;
  onSelect: (b: MockBrand) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <img src={brand.logoDataUrl} alt="" className="h-5 w-5 rounded" />
        <span className="text-[12px] font-mono lowercase tracking-tight text-zinc-700 dark:text-zinc-300">
          {brand.name}
        </span>
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-[220px] rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {mockBrandList.map((b) => (
            <DropdownMenu.Item
              key={b.id}
              onSelect={() => onSelect(b)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <img src={b.logoDataUrl} alt="" className="h-5 w-5 rounded" />
              <span className="font-mono lowercase">{b.name}</span>
              {b.id === brand.id && (
                <span
                  className="ml-auto h-1 w-1 rounded-full"
                  style={{ background: ACCENT }}
                />
              )}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <RefreshCw className="h-3 w-3 text-zinc-500" />
            Re-apply brand
            <span className="ml-auto text-[10px] text-zinc-400">⌘⇧R</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SaveDot() {
  return (
    <div className="ml-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
      <span className="h-1 w-1 rounded-full bg-emerald-500" />
      Saved
    </div>
  );
}

// ─── Tool rail (icon-only) ───────────────────────────────────────────────

function ToolRail({
  activeTool,
  onChange,
}: {
  activeTool: string;
  onChange: (t: string) => void;
}) {
  const tools = [
    { id: 'select', icon: MousePointer2 },
    { id: 'text', icon: Type },
    { id: 'shape', icon: Square },
    { id: 'image', icon: ImageIcon },
    { id: 'logo', icon: Bookmark },
    { id: 'layers', icon: Layers },
  ];
  return (
    <aside className="flex w-12 flex-col items-center gap-1 border-r border-zinc-200 bg-white py-2 dark:border-zinc-800 dark:bg-zinc-900">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onChange(tool.id)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
      <div className="my-1 h-px w-6 bg-zinc-200 dark:bg-zinc-800" />
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="AI tools"
      >
        <Wand2 className="h-3.5 w-3.5" style={{ color: ACCENT }} />
      </button>
    </aside>
  );
}

// ─── Properties panel atoms ─────────────────────────────────────────────

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-zinc-100 dark:border-zinc-800">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        {title}
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>
      {open && <div className="space-y-0.5 px-4 pb-3">{children}</div>}
    </section>
  );
}

function DenseRow({
  label,
  value,
  icon,
  slot,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  slot?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="flex items-center gap-1.5 font-mono">
        {icon}
        {slot ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: `${accent}15`, color: accent }}
          >
            {value}
          </span>
        ) : (
          <span className="text-zinc-700 dark:text-zinc-300">{value}</span>
        )}
      </span>
    </div>
  );
}

function DenseToggle({
  label,
  icon,
  on,
}: {
  label: string;
  icon: React.ReactNode;
  on: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
        {icon}
        {label}
      </span>
      <Switch.Root
        checked={on}
        disabled
        className={cn(
          'relative h-3.5 w-6 rounded-full transition-colors disabled:opacity-60',
          on ? 'bg-zinc-700 dark:bg-zinc-200' : 'bg-zinc-200 dark:bg-zinc-700',
        )}
      >
        <Switch.Thumb
          className={cn(
            'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform',
            on ? 'translate-x-3' : 'translate-x-0.5',
          )}
        />
      </Switch.Root>
    </div>
  );
}

function DenseColor({
  label,
  value,
  swatch,
  slot,
  accent,
}: {
  label: string;
  value: string;
  swatch: string;
  slot?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700"
          style={{ background: swatch }}
        />
        {slot ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: `${accent}15`, color: accent }}
          >
            {value}
          </span>
        ) : (
          <span className="font-mono text-zinc-700 dark:text-zinc-300">{value}</span>
        )}
      </span>
    </div>
  );
}

function BrandManagedRow({
  on,
  onChange,
  accent,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  accent: string;
}) {
  return (
    <div className="my-1 rounded-md border-l-2 bg-zinc-50/50 py-1.5 pl-2 pr-1 dark:bg-zinc-800/30" style={{ borderColor: accent }}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-medium">
          <Lock className="h-3 w-3" />
          Brand-managed
        </span>
        <Switch.Root
          checked={on}
          onCheckedChange={onChange}
          className={cn(
            'relative h-3.5 w-6 rounded-full transition-colors',
            on ? '' : 'bg-zinc-200 dark:bg-zinc-700',
          )}
          style={{ background: on ? accent : undefined }}
        >
          <Switch.Thumb
            className={cn(
              'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform',
              on ? 'translate-x-3' : 'translate-x-0.5',
            )}
          />
        </Switch.Root>
      </div>
      <p className="mt-1 text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
        {on
          ? 'Resolved through brand kit. Re-apply will restore.'
          : 'One-off override. User authority wins.'}
      </p>
    </div>
  );
}

// ─── Mock canvas ─────────────────────────────────────────────────────────

function MockCanvas({
  brand,
  selectedLayerId,
  accent,
}: {
  brand: MockBrand;
  selectedLayerId: string;
  accent: string;
}) {
  const page = mockDocument.page;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-zinc-200 dark:ring-zinc-700"
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
          accent={accent}
        />
      ))}
    </div>
  );
}

function LayerNode({
  layer,
  brand,
  selected,
  accent,
}: {
  layer: MockLayer;
  brand: MockBrand;
  selected: boolean;
  accent: string;
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
          className="pointer-events-none absolute -inset-2 rounded"
          style={{ boxShadow: `0 0 0 1.5px ${accent}` }}
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
              style={{ ...pos, boxShadow: `0 0 0 1.5px ${accent}` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
