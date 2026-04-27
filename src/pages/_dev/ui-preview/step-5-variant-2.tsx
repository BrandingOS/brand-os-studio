// Step 5 UI direction — Variant 2 (Match Existing).
//
// Aesthetic target: a natural continuation of the BrandOS Brand Setup
// page. White / gray-50 / gray-100 base, one green accent for active
// states, card-style containers with rounded corners + subtle shadows,
// pill-shaped tab groups, serif display only for the brand wordmark
// moment, sans-serif everywhere else.
//
// MOCKUP ONLY. No adapter wiring, no real document loading. Local
// useState only for visual toggles (dark mode, brand-managed switch,
// brand picker dropdown).

import { useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  Circle as CircleIcon,
  Eye,
  Image as ImageIcon,
  Layers,
  Lock,
  MoreHorizontal,
  Moon,
  MousePointer2,
  Pencil,
  RefreshCw,
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

const ACCENT = '#16a34a';

export default function Step5Variant2Page() {
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState<MockBrand>(mockBrand);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'shape' | 'image' | 'logo'>('select');
  const [activeTab, setActiveTab] = useState<'design' | 'pages' | 'assets' | 'history'>('design');
  const [selectedLayerId] = useState(SELECTED_LAYER_ID);
  const [brandManaged, setBrandManaged] = useState(true);
  const [saveState] = useState<'saved'>('saved');

  const selectedLayer = useMemo(
    () => mockDocument.page.layers.find((l) => l.id === selectedLayerId)!,
    [selectedLayerId],
  );

  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen w-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        {/* ─── Top chrome ─────────────────────────────────────────── */}
        <header className="flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-3 dark:border-stone-800 dark:bg-stone-900">
          {/* Brand picker */}
          <BrandPicker brand={brand} onSelect={setBrand} />

          {/* Pill tabs */}
          <div className="mx-auto flex items-center gap-0.5 rounded-full border border-stone-200 bg-stone-50 p-1 text-[12px] dark:border-stone-800 dark:bg-stone-800/50">
            {(['design', 'pages', 'assets', 'history'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 capitalize transition-all',
                  activeTab === tab
                    ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <SaveIndicator state={saveState} />
            <button
              type="button"
              onClick={() => setDark((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200">
              Export
            </button>
            <KebabMenu />
          </div>
        </header>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <div className="flex h-[calc(100vh-3.5rem)] gap-3 p-3">
          <ToolSidebar activeTool={activeTool} onToolChange={setActiveTool} />

          {/* Canvas area */}
          <main className="flex flex-1 items-center justify-center overflow-auto rounded-2xl border border-stone-200 bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/40">
            <MockCanvas brand={brand} selectedLayerId={selectedLayerId} />
          </main>

          <PropertiesPanel
            layer={selectedLayer}
            brand={brand}
            brandManaged={brandManaged}
            onBrandManagedChange={setBrandManaged}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Brand picker (with Re-apply brand action) ────────────────────────────

function BrandPicker({
  brand,
  onSelect,
}: {
  brand: MockBrand;
  onSelect: (b: MockBrand) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="group flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-2.5 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
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
              {b.id === brand.id ? (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: ACCENT }}
                />
              ) : null}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-stone-100 dark:bg-stone-800" />
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-stone-100 dark:hover:bg-stone-800">
            <RefreshCw className="h-3.5 w-3.5 text-stone-500" />
            <span className="text-sm">Re-apply brand</span>
            <span className="ml-auto text-[10px] text-stone-400">⌘⇧R</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-stone-100 dark:hover:bg-stone-800">
            <Pencil className="h-3.5 w-3.5 text-stone-500" />
            <span className="text-sm">Edit brand…</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Save indicator (green dot + "Saved") ─────────────────────────────────

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'idle') return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] dark:bg-stone-800">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: state === 'saved' ? ACCENT : '#a3a3a3' }}
      />
      <span className="text-stone-500 dark:text-stone-400">
        {state === 'saved' ? (
          <>
            Live preview <span className="font-medium text-stone-700 dark:text-stone-200">saved</span>
          </>
        ) : (
          'Saving…'
        )}
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
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          <DropdownMenu.Item className="rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-stone-100 dark:hover:bg-stone-800">
            Duplicate design
          </DropdownMenu.Item>
          <DropdownMenu.Item className="rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-stone-100 dark:hover:bg-stone-800">
            Save as template…
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Tool sidebar ────────────────────────────────────────────────────────

function ToolSidebar({
  activeTool,
  onToolChange,
}: {
  activeTool: string;
  onToolChange: (t: 'select' | 'text' | 'shape' | 'image' | 'logo') => void;
}) {
  const tools = [
    { id: 'select', label: 'Select', icon: MousePointer2 },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'shape', label: 'Shape', icon: Square },
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'logo', label: 'Logo', icon: Bookmark },
  ] as const;
  return (
    <aside className="flex w-44 flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
        Tools
      </p>
      {tools.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onToolChange(tool.id)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
              active
                ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800/50',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tool.label}</span>
          </button>
        );
      })}

      <div className="mt-2 border-t border-stone-100 pt-2 dark:border-stone-800">
        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
          Smart
        </p>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800/50">
          <Sparkles className="h-4 w-4" />
          AI tools
        </button>
      </div>
    </aside>
  );
}

// ─── Properties panel (with brand-managed toggle) ────────────────────────

function PropertiesPanel({
  layer,
  brand,
  brandManaged,
  onBrandManagedChange,
}: {
  layer: MockLayer;
  brand: MockBrand;
  brandManaged: boolean;
  onBrandManagedChange: (v: boolean) => void;
}) {
  return (
    <aside className="flex w-72 flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <header className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
          Properties
        </span>
        <span className="text-[10px] uppercase tracking-wider text-stone-400">
          {layer.kind}
        </span>
      </header>

      {/* Layer section */}
      <Section title="Layer">
        <Field label="Name" value={layer.name} />
        <ToggleRow
          label="Visible"
          icon={<Eye className="h-3.5 w-3.5" />}
          on={true}
        />
        <ToggleRow
          label="Locked"
          icon={<Lock className="h-3.5 w-3.5" />}
          on={false}
        />
        {/* Brand-managed — the headline call-out */}
        <BrandManagedRow
          on={brandManaged}
          onChange={onBrandManagedChange}
        />
      </Section>

      {/* Text section */}
      <Section title="Text">
        <Field label="Font" value={brandManaged ? 'Brand heading' : layer.fontFamily ?? '—'} slot={brandManaged} />
        <Field label="Size" value={`${layer.fontSize ?? 0}px`} />
        <ColorRow
          label="Color"
          value={brandManaged ? 'Brand primary' : '#1a1a2e'}
          swatch={resolveMockColor(layer.color, brand)}
          slot={brandManaged}
        />
      </Section>

      <button className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white py-2 text-[12px] text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">
        <RefreshCw className="h-3.5 w-3.5" /> Re-apply brand
      </button>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-wider text-stone-400">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Field({ label, value, slot }: { label: string; value: string; slot?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md px-1 py-1 text-[12px]">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span
        className={cn(
          'truncate text-right',
          slot && 'rounded-full bg-stone-100 px-2 py-0.5 text-[11px] dark:bg-stone-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  icon,
  on,
}: {
  label: string;
  icon: React.ReactNode;
  on: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-1 py-1 text-[12px]">
      <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
        {icon}
        {label}
      </span>
      <SmallSwitch on={on} disabled />
    </div>
  );
}

function BrandManagedRow({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-2 dark:border-stone-800 dark:bg-stone-800/30">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-stone-700 dark:text-stone-200">
          <Lock className="h-3.5 w-3.5" />
          Brand-managed
        </span>
        <SmallSwitch on={on} onChange={onChange} active={on} />
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
        {on
          ? 'Color & font come from the brand kit. Override locked.'
          : 'You can set one-off color & font overrides for this layer.'}
      </p>
    </div>
  );
}

function SmallSwitch({
  on,
  onChange,
  disabled,
  active,
}: {
  on: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Switch.Root
      checked={on}
      onCheckedChange={onChange}
      disabled={disabled}
      className={cn(
        'relative h-4 w-7 rounded-full transition-colors',
        on
          ? active
            ? '[background:#16a34a]'
            : 'bg-stone-700 dark:bg-stone-200'
          : 'bg-stone-200 dark:bg-stone-700',
        disabled && 'opacity-60',
      )}
    >
      <Switch.Thumb
        className={cn(
          'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform',
          on ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </Switch.Root>
  );
}

function ColorRow({
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
    <div className="flex items-center justify-between rounded-md px-1 py-1 text-[12px]">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-full ring-1 ring-stone-200 dark:ring-stone-700" style={{ background: swatch }} />
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px]',
            slot ? 'bg-stone-100 dark:bg-stone-800' : '',
          )}
        >
          {value}
        </span>
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
  selectedLayerId: string;
}) {
  const page = mockDocument.page;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl bg-stone-100 shadow-2xl ring-1 ring-black/5"
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
  if (layer.kind === 'text') {
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
        {selected ? <SelectionFrame /> : null}
      </div>
    );
  }
  return null;
}

function SelectionFrame() {
  return (
    <div
      className="pointer-events-none absolute -inset-2 rounded-md"
      style={{
        boxShadow: `0 0 0 1.5px ${ACCENT}`,
      }}
    >
      {/* Corner handles */}
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
  );
}
