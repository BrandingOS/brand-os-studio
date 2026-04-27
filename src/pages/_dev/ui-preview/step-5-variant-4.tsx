// Step 5 UI direction — Variant 4 (Canva-Pure).
//
// Layout:
//   • Header w/ brand picker top-left, Edit/Preview/Comments pill
//     tabs centered, dark mode + Export top-right
//   • Two-bar left sidebar:
//       - App Rail (~64px): Generate, Templates, Insert, Brand
//       - Secondary Panel (~280px): contents change per active rail item
//   • Canvas center w/ "Untitled design" overlay label (Canva-style)
//   • Floating contextual toolbar above selected layer w/ scope
//     toggle pill on its LEFT edge ("This page" / "All pages")
//   • Right Page Navigator (~120px) — visible since this mock is a
//     multi-page presentation context for the demo
//
// Canva-Pure means tighter density, more controls visible, scope
// toggle inline in the toolbar.
//
// MOCKUP ONLY. Local useState for visual toggles.

import { useState } from 'react';
import {
  AlignLeft,
  Bold,
  ChevronDown,
  ChevronRight,
  Italic,
  LayoutGrid,
  Maximize2,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Sparkles,
  Sun,
  Type,
  ArrowUpRight,
  Square,
  Circle as CircleIcon,
  Minus,
  Image as ImageIcon,
  Bookmark,
  Heading,
  Pilcrow,
  List,
  PaintBucket,
  Globe2,
  Copy,
  Trash2,
  Layers,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  mockBrand,
  mockOtherBrands,
  mockTemplates,
  mockPages,
  mockBrandImages,
  mockColorSwatches,
  mockLogoVariants,
  mockDocument,
  resolveMockColor,
  SELECTED_LAYER_ID,
  type MockBrand,
  type MockLayer,
} from '@/_dev/ui-preview/mockData';
import { cn } from '@/lib/utils';

const ACCENT = '#7c3aed';
type RailItem = 'generate' | 'templates' | 'insert' | 'brand';

export default function Step5Variant4Page() {
  const [dark, setDark] = useState(false);
  const [activeRail, setActiveRail] = useState<RailItem>('generate');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'comments'>('edit');
  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [scope, setScope] = useState<'page' | 'all'>('page');

  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen w-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        {/* ─── Header ──────────────────────────────────────────────── */}
        <header className="flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-3 dark:border-stone-800 dark:bg-stone-900">
          <BrandPicker brand={mockBrand} />

          {/* Pill tabs — Edit / Preview / Comments */}
          <div className="mx-auto flex items-center gap-1 rounded-full bg-stone-100 p-1 text-[12px] dark:bg-stone-800">
            {(['edit', 'preview', 'comments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-full px-4 py-1.5 capitalize transition-all',
                  activeTab === tab
                    ? 'bg-stone-900 text-white shadow-sm dark:bg-stone-100 dark:text-stone-900'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <ExportButton />
          </div>
        </header>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* App Rail */}
          <AppRail
            active={activeRail}
            onChange={(item) => {
              setActiveRail(item);
              setSecondaryOpen(true);
            }}
          />

          {/* Secondary Panel */}
          {secondaryOpen ? (
            <SecondaryPanel
              active={activeRail}
              onCollapse={() => setSecondaryOpen(false)}
            />
          ) : null}

          {/* Canvas */}
          <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-stone-100 dark:bg-zinc-900">
            {/* Doc title overlay (Canva-style, sits ABOVE the canvas) */}
            <div className="absolute left-1/2 top-6 -translate-x-1/2 text-center">
              <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] text-stone-600 backdrop-blur-md dark:bg-stone-900/80 dark:text-stone-400">
                <span>Untitled design</span>
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>

            {/* Canvas container — leaves room for floating toolbar above */}
            <div className="relative">
              <FloatingToolbar
                scope={scope}
                onScopeChange={setScope}
              />
              <MockCanvas brand={mockBrand} selectedLayerId={SELECTED_LAYER_ID} />
            </div>

            {/* Annotated "All pages" preview hint — small ghost frame */}
            <div className="absolute bottom-6 right-6 max-w-[200px] rounded-lg border border-dashed border-stone-300 bg-white/70 p-3 text-[10px] text-stone-500 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-400">
              <p className="mb-1.5 font-medium text-stone-700 dark:text-stone-300">
                Scope toggle preview
              </p>
              <p className="mb-2 leading-tight">
                Click the scope pill on the toolbar to flip between:
              </p>
              <div className="space-y-1.5">
                <ScopePillPreview state="page" />
                <ScopePillPreview state="all" />
              </div>
            </div>
          </main>

          {/* Page Navigator — open by default in this presentation context */}
          {navigatorOpen ? (
            <PageNavigator onCollapse={() => setNavigatorOpen(false)} />
          ) : (
            <button
              onClick={() => setNavigatorOpen(true)}
              className="flex w-4 items-center justify-center border-l border-stone-200 bg-white text-stone-400 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Brand picker (top-left cluster) ─────────────────────────────────────

function BrandPicker({ brand }: { brand: MockBrand }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-stone-50 dark:hover:bg-stone-800">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ background: brand.colors.primary, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 18 }}
        >
          {brand.name[0]}
        </div>
        <span
          className="text-[14px]"
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
          <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
              style={{ background: brand.colors.primary, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 16 }}
            >
              {brand.name[0]}
            </div>
            <span className="text-sm" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {brand.name}
            </span>
            <span className="ml-auto text-[10px] text-stone-400">current</span>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-stone-100 dark:bg-stone-800" />
          {mockOtherBrands.map((b) => (
            <DropdownMenu.Item
              key={b.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                style={{ background: b.avatarColor, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 16 }}
              >
                {b.name[0]}
              </div>
              <span className="text-sm">{b.name}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ExportButton() {
  return (
    <button className="flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900">
      Export
      <ArrowUpRight className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── App Rail ────────────────────────────────────────────────────────────

function AppRail({ active, onChange }: { active: RailItem; onChange: (i: RailItem) => void }) {
  const items: Array<{ id: RailItem; label: string; Icon: typeof Sparkles }> = [
    { id: 'generate', label: 'Generate', Icon: Sparkles },
    { id: 'templates', label: 'Templates', Icon: LayoutGrid },
    { id: 'insert', label: 'Insert', Icon: Plus },
    { id: 'brand', label: 'Brand', Icon: Palette },
  ];
  return (
    <aside className="flex w-16 flex-col items-center gap-1 border-r border-stone-200 bg-white py-3 dark:border-stone-800 dark:bg-stone-900">
      {items.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={label}
            className={cn(
              'group relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors',
              isActive
                ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50',
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[9px] font-medium">{label}</span>
          </button>
        );
      })}
    </aside>
  );
}

// ─── Secondary Panel ────────────────────────────────────────────────────

function SecondaryPanel({
  active,
  onCollapse,
}: {
  active: RailItem;
  onCollapse: () => void;
}) {
  return (
    <aside className="relative flex w-72 flex-col rounded-r-2xl border-r border-stone-200 bg-white shadow-[4px_0_12px_-8px_rgba(0,0,0,0.08)] dark:border-stone-800 dark:bg-stone-900">
      <button
        onClick={onCollapse}
        title="Collapse panel"
        className="absolute -right-2.5 top-6 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 hover:text-stone-700 dark:border-stone-700 dark:bg-stone-900"
      >
        <ChevronRight className="h-3 w-3 rotate-180" />
      </button>

      {active === 'generate' && <GeneratePanel />}
      {active === 'templates' && <TemplatesPanel />}
      {active === 'insert' && <InsertPanel />}
      {active === 'brand' && <BrandPanel />}
    </aside>
  );
}

function GeneratePanel() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <header>
        <h3 className="text-[13px] font-semibold">Generate</h3>
        <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
          Describe what you want to create
        </p>
      </header>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-2 dark:border-stone-800 dark:bg-stone-800/40">
        <textarea
          rows={3}
          placeholder='Try "Instagram post for our product launch"…'
          className="w-full resize-none bg-transparent text-[12px] outline-none placeholder:text-stone-400"
        />
        <div className="mt-1 flex items-center justify-between">
          <button className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300">
            Social post ▾
          </button>
          <button
            className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-white"
            style={{ background: ACCENT }}
          >
            <Sparkles className="h-3 w-3" /> Generate
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
          Recent
        </p>
        <ul className="space-y-1">
          {[
            'Product launch 1080x1080',
            'Quote card story',
            '5-slide pitch v2',
            'Banner concept',
          ].map((label, i) => (
            <li
              key={i}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800/50"
            >
              <div
                className="h-7 w-7 shrink-0 rounded"
                style={{
                  background: `linear-gradient(135deg, ${mockTemplates[i].gradient[0]}, ${mockTemplates[i].gradient[1]})`,
                }}
              />
              <span className="truncate text-[11px]">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TemplatesPanel() {
  const [cat, setCat] = useState<'All' | 'Social' | 'Presentation' | 'Print'>('All');
  const filtered =
    cat === 'All' ? mockTemplates : mockTemplates.filter((t) => t.category === cat);
  return (
    <div className="flex flex-col gap-3 p-4">
      <header>
        <h3 className="text-[13px] font-semibold">Templates</h3>
      </header>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
        <input
          placeholder="Search…"
          className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-7 pr-2 text-[11px] outline-none focus:border-stone-300 dark:border-stone-800 dark:bg-stone-800/40"
        />
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {(['All', 'Social', 'Presentation', 'Print'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-[10px]',
              cat === c
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((t) => (
          <button
            key={t.id}
            className="group overflow-hidden rounded-lg ring-1 ring-stone-200 hover:ring-stone-300 dark:ring-stone-800"
          >
            <div
              className="aspect-[3/4]"
              style={{
                background: `linear-gradient(135deg, ${t.gradient[0]} 0%, ${t.gradient[1]} 100%)`,
              }}
            />
            <p className="truncate bg-white px-1.5 py-1 text-left text-[10px] dark:bg-stone-900">
              {t.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function InsertPanel() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h3 className="text-[13px] font-semibold">Insert</h3>
      </header>

      <Group title="Shapes">
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: Square, label: 'Rect' },
            { Icon: CircleIcon, label: 'Ellipse' },
            { Icon: Minus, label: 'Line' },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[9px]">{label}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Text">
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: Heading, label: 'Heading' },
            { Icon: Pilcrow, label: 'Body' },
            { Icon: List, label: 'List' },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[9px]">{label}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Media">
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: ImageIcon, label: 'Image' },
            { Icon: Bookmark, label: 'Logo' },
            { Icon: PaintBucket, label: 'SVG' },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[9px]">{label}</span>
            </button>
          ))}
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {title}
      </p>
      {children}
    </section>
  );
}

function BrandPanel() {
  const [tab, setTab] = useState<'logos' | 'images' | 'colors' | 'fonts'>('logos');
  return (
    <div className="flex flex-col gap-3 p-4">
      <header>
        <h3 className="text-[13px] font-semibold">Brand · {mockBrand.name}</h3>
      </header>
      <div className="flex gap-1">
        {(['logos', 'images', 'colors', 'fonts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] capitalize',
              tab === t
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'logos' && (
        <div className="grid grid-cols-2 gap-2">
          {mockLogoVariants.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800">
              <div
                className="flex aspect-square items-center justify-center"
                style={{ background: v.background, color: v.fg, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: v.letter.length > 1 ? 18 : 32 }}
              >
                {v.letter}
              </div>
              <p className="truncate bg-white px-1.5 py-1 text-[9px] dark:bg-stone-900">{v.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'images' && (
        <div className="grid grid-cols-2 gap-2">
          {mockBrandImages.map((img) => (
            <div
              key={img.id}
              className="aspect-square rounded-lg ring-1 ring-stone-200 dark:ring-stone-800"
              style={{ background: img.tint }}
            />
          ))}
        </div>
      )}

      {tab === 'colors' && (
        <div className="grid grid-cols-2 gap-2">
          {mockColorSwatches.map((c) => (
            <div key={c.name} className="flex flex-col gap-1">
              <div
                className="aspect-square rounded-lg ring-1 ring-stone-200 dark:ring-stone-800"
                style={{ background: c.hex }}
              />
              <div className="text-[9px]">
                <p className="font-medium">{c.name}</p>
                <p className="font-mono text-stone-400">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'fonts' && (
        <div className="space-y-2">
          <FontCard label="Heading" family={mockBrand.fonts.heading} />
          <FontCard label="Body" family={mockBrand.fonts.body} />
        </div>
      )}
    </div>
  );
}

function FontCard({ label, family }: { label: string; family: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
      <p className="text-[9px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p
        className="mt-1 text-[20px] tracking-tight"
        style={{ fontFamily: `${family}, sans-serif`, fontWeight: 600 }}
      >
        {family}
      </p>
      <p className="mt-1 text-[10px] text-stone-500" style={{ fontFamily: `${family}, sans-serif` }}>
        Aa Bb Cc 1234
      </p>
    </div>
  );
}

// ─── Floating contextual toolbar (above selected layer) ─────────────────

function FloatingToolbar({
  scope,
  onScopeChange,
}: {
  scope: 'page' | 'all';
  onScopeChange: (s: 'page' | 'all') => void;
}) {
  // Position above the headline (which sits at canvas y=200, so place
  // the toolbar at y=160 in canvas coordinates, but as the canvas is
  // centered we use absolute positioning relative to the canvas wrapper).
  return (
    <div
      className={cn(
        'absolute z-10 flex items-center gap-0.5 rounded-full border border-stone-200 bg-white px-1 py-1 shadow-lg transition-colors dark:border-stone-700 dark:bg-stone-900',
        scope === 'all' && 'ring-2 ring-purple-400/40',
      )}
      style={{
        top: 156, // sits above headline at y=200 in 540x540 canvas
        left: 24,
      }}
    >
      {/* Scope toggle pill — distinct LEFT edge of the toolbar */}
      <button
        onClick={() => onScopeChange(scope === 'page' ? 'all' : 'page')}
        className={cn(
          'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors',
          scope === 'all'
            ? 'text-white'
            : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400',
        )}
        style={{ background: scope === 'all' ? ACCENT : undefined }}
        title="Toggle whole-document scope"
      >
        <Globe2 className="h-3 w-3" />
        {scope === 'all' ? 'All pages' : 'This page'}
      </button>

      <span className="mx-0.5 h-4 w-px bg-stone-200 dark:bg-stone-700" />

      {/* Text controls — Canva-density, 6-7 visible */}
      <ToolbarSelect label="DM Sans" />
      <ToolbarPill>36</ToolbarPill>
      <ToolbarIcon Icon={Bold} />
      <ToolbarIcon Icon={Italic} />
      <ToolbarIcon Icon={AlignLeft} />
      <ToolbarColor swatch={mockBrand.colors.primary} />
      <ToolbarPill>
        Effects
      </ToolbarPill>

      <span className="mx-0.5 h-4 w-px bg-stone-200 dark:bg-stone-700" />

      <ToolbarIcon Icon={MoreHorizontal} />
    </div>
  );
}

function ToolbarSelect({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800">
      {label}
      <ChevronDown className="h-3 w-3 text-stone-400" />
    </button>
  );
}

function ToolbarPill({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-md px-2 py-1 text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800">
      {children}
    </button>
  );
}

function ToolbarIcon({ Icon }: { Icon: typeof Bold }) {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-stone-100 dark:hover:bg-stone-800">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ToolbarColor({ swatch }: { swatch: string }) {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-stone-100 dark:hover:bg-stone-800">
      <span className="h-3.5 w-3.5 rounded-full ring-1 ring-stone-300" style={{ background: swatch }} />
    </button>
  );
}

function ScopePillPreview({ state }: { state: 'page' | 'all' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium',
        state === 'all'
          ? 'text-white'
          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
      )}
      style={{ background: state === 'all' ? ACCENT : undefined }}
    >
      <Globe2 className="h-2.5 w-2.5" />
      {state === 'all' ? 'All pages' : 'This page'}
    </div>
  );
}

// ─── Page Navigator (right) ────────────────────────────────────────────

function PageNavigator({ onCollapse }: { onCollapse: () => void }) {
  return (
    <aside className="relative flex w-32 flex-col border-l border-stone-200 bg-white py-2 dark:border-stone-800 dark:bg-stone-900">
      <button
        onClick={onCollapse}
        className="absolute -left-2.5 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 hover:text-stone-700 dark:border-stone-700 dark:bg-stone-900"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
      <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-stone-400">
        Pages
      </p>
      <ul className="flex-1 space-y-1.5 overflow-auto px-2">
        {mockPages.map((p, i) => (
          <li key={p.id}>
            <button
              className={cn(
                'group relative flex w-full flex-col items-center gap-1 rounded-lg p-1.5 transition-colors',
                p.isActive
                  ? 'bg-stone-100 ring-1 ring-stone-300 dark:bg-stone-800 dark:ring-stone-700'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-800/50',
              )}
            >
              <div
                className="aspect-square w-full rounded ring-1 ring-stone-200 dark:ring-stone-700"
                style={{ background: i === 0 ? '#fafaf9' : '#f5f5f4' }}
              />
              <span className="text-[9px] text-stone-500">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button className="m-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 py-1.5 text-[10px] text-stone-500 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600">
        <Plus className="h-3 w-3" /> Add
      </button>

      {/* Right-click menu — open by default for demo */}
      <div className="absolute left-2 top-12 z-20 w-36 rounded-lg border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <p className="px-2 py-1 text-[8px] uppercase tracking-wider text-stone-400">
          Right-click ↑
        </p>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] hover:bg-stone-50 dark:hover:bg-stone-800">
          <Copy className="h-3 w-3" /> Duplicate
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] hover:bg-stone-50 dark:hover:bg-stone-800">
          <Layers className="h-3 w-3" /> Apply master
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </aside>
  );
}

// ─── Mock canvas ───────────────────────────────────────────────────────

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
      className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5"
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

function LayerNode({ layer, brand, selected }: { layer: MockLayer; brand: MockBrand; selected: boolean }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
  };
  if (layer.kind === 'logo') {
    return <div style={style}><img src={brand.logoDataUrl} alt="" className="h-full w-full" /></div>;
  }
  if (layer.kind === 'shape') {
    return <div style={{ ...style, background: resolveMockColor(layer.fill, brand), borderRadius: layer.cornerRadius ?? 0 }} />;
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
      {selected && (
        <div className="pointer-events-none absolute -inset-2 rounded" style={{ boxShadow: `0 0 0 1.5px ${ACCENT}` }}>
          {[
            { top: -3, left: -3 },
            { top: -3, right: -3 },
            { bottom: -3, left: -3 },
            { bottom: -3, right: -3 },
          ].map((pos, i) => (
            <span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-white" style={{ ...pos, boxShadow: `0 0 0 1.5px ${ACCENT}` }} />
          ))}
        </div>
      )}
    </div>
  );
}
