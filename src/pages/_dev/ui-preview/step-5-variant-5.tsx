// Step 5 UI direction — Variant 5 (Figma-Influenced).
//
// Same shared structure as Variant 4 (App Rail + Secondary Panel +
// Floating toolbar + Page Navigator). Differences:
//
//   • Header center: editable inline doc title with breadcrumb above
//     ("selfix › Designs › Launch announcement"). NO pill tabs.
//   • Whole-doc scope: NOT inline in toolbar. Right-click context
//     menu on the layer surfaces "Edit on this page only" / "Apply
//     across all pages" radio toggle. Menu is shown open by default
//     for the demo.
//   • Floating toolbar: leaner — only 4-5 essential controls, then
//     "More". Generous spacing.
//   • Page Navigator: always visible (single-page docs show one
//     thumb), narrower 80px width. Collapses to a 16px handle, never
//     fully hidden.
//   • Density: looser. 1-column lists in secondary panel. Larger
//     thumbs. More whitespace.
//
// MOCKUP ONLY. Local useState for visual toggles.

import { useState } from 'react';
import {
  AlignLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  Globe2,
  Image as ImageIcon,
  LayoutGrid,
  Layers,
  MoreHorizontal,
  Moon,
  Palette,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Type,
  ArrowUpRight,
  Bookmark,
  Heading,
  Pilcrow,
  List,
  PaintBucket,
  Square,
  Circle as CircleIcon,
  Minus,
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

const ACCENT = '#16a34a';
type RailItem = 'generate' | 'templates' | 'insert' | 'brand';

export default function Step5Variant5Page() {
  const [dark, setDark] = useState(false);
  const [activeRail, setActiveRail] = useState<RailItem>('generate');
  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);
  const [scope] = useState<'page' | 'all'>('page');

  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* ─── Header ──────────────────────────────────────────────── */}
        <header className="flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <BrandPicker brand={mockBrand} />

          {/* Center: editable inline doc title + breadcrumb above */}
          <div className="mx-auto flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                {mockBrand.name}
              </span>
              <ChevronRight className="h-2.5 w-2.5" />
              <span>Designs</span>
              <ChevronRight className="h-2.5 w-2.5" />
              <span>Launch announcement</span>
            </div>
            <input
              defaultValue="Launch announcement"
              className="bg-transparent text-center text-[14px] font-medium tracking-tight outline-none focus:ring-1 focus:ring-zinc-300 rounded px-2 py-0.5"
              style={{ fontFamily: `${mockBrand.fonts.heading}, sans-serif` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <ExportButton />
          </div>
        </header>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <div className="flex h-[calc(100vh-3.5rem)]">
          <AppRail
            active={activeRail}
            onChange={(item) => {
              setActiveRail(item);
              setSecondaryOpen(true);
            }}
          />

          {secondaryOpen ? (
            <SecondaryPanel active={activeRail} onCollapse={() => setSecondaryOpen(false)} />
          ) : null}

          {/* Canvas — generous breathing room */}
          <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            <div className="relative">
              <FloatingToolbar />
              <MockCanvas brand={mockBrand} selectedLayerId={SELECTED_LAYER_ID} />

              {/* Right-click context menu shown open by default for demo */}
              <ContextMenu />
            </div>
          </main>

          {/* Page Navigator — always visible, narrower 80px */}
          {navigatorCollapsed ? (
            <button
              onClick={() => setNavigatorCollapsed(false)}
              className="flex w-4 items-center justify-center border-l border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              title="Show pages"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
            </button>
          ) : (
            <PageNavigator onCollapse={() => setNavigatorCollapsed(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Brand picker ────────────────────────────────────────────────────────

function BrandPicker({ brand }: { brand: MockBrand }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800">
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
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            Switch brand
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 dark:bg-zinc-800">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
              style={{ background: brand.colors.primary, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 16 }}
            >
              {brand.name[0]}
            </div>
            <span className="text-sm" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {brand.name}
            </span>
            <span className="ml-auto text-[10px] text-zinc-400">current</span>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          {mockOtherBrands.map((b) => (
            <DropdownMenu.Item
              key={b.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
    <button className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
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
    <aside className="flex w-16 flex-col items-center gap-1 border-r border-zinc-200 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={label}
            className={cn(
              'flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors',
              isActive
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
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

// ─── Secondary Panel — looser density, 1-col lists ───────────────────────

function SecondaryPanel({ active, onCollapse }: { active: RailItem; onCollapse: () => void }) {
  return (
    <aside className="relative flex w-80 flex-col rounded-r-2xl border-r border-zinc-200 bg-white shadow-[4px_0_12px_-8px_rgba(0,0,0,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={onCollapse}
        title="Collapse panel"
        className="absolute -right-2.5 top-6 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900"
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
    <div className="flex flex-col gap-5 p-5">
      <header>
        <h3 className="text-[14px] font-medium tracking-tight">Generate</h3>
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          Describe what you want to create.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
        <textarea
          rows={4}
          placeholder='Try "Instagram post for our product launch"…'
          className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-zinc-400"
        />
        <div className="mt-2 flex items-center justify-between">
          <button className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300">
            Social post ▾
          </button>
          <button
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium text-white"
            style={{ background: ACCENT }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate
          </button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Recent
        </p>
        <ul className="space-y-2">
          {[
            'Product launch 1080x1080',
            'Quote card story',
            '5-slide pitch v2',
            'Banner concept',
          ].map((label, i) => (
            <li
              key={i}
              className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div
                className="h-12 w-12 shrink-0 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${mockTemplates[i].gradient[0]}, ${mockTemplates[i].gradient[1]})`,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px]">{label}</p>
                <p className="text-[10px] text-zinc-400">2 hours ago</p>
              </div>
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
    <div className="flex flex-col gap-4 p-5">
      <header>
        <h3 className="text-[14px] font-medium tracking-tight">Templates</h3>
      </header>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          placeholder="Search templates…"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-[12px] outline-none focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/40"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {(['All', 'Social', 'Presentation', 'Print'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-[11px]',
              cat === c
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      {/* 1-column list — looser */}
      <ul className="space-y-3">
        {filtered.map((t) => (
          <li key={t.id}>
            <button className="group block w-full text-left">
              <div
                className="aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-zinc-200 transition-all group-hover:ring-zinc-300 dark:ring-zinc-800"
                style={{
                  background: `linear-gradient(135deg, ${t.gradient[0]} 0%, ${t.gradient[1]} 100%)`,
                }}
              />
              <p className="mt-2 text-[12px]">{t.name}</p>
              <p className="text-[10px] text-zinc-400">{t.category}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsertPanel() {
  return (
    <div className="flex flex-col gap-6 p-5">
      <header>
        <h3 className="text-[14px] font-medium tracking-tight">Insert</h3>
      </header>

      <Group title="Shapes">
        <div className="flex flex-col gap-1">
          {[
            { Icon: Square, label: 'Rectangle' },
            { Icon: CircleIcon, label: 'Ellipse' },
            { Icon: Minus, label: 'Line' },
          ].map(({ Icon, label }) => (
            <RowButton key={label} Icon={Icon} label={label} />
          ))}
        </div>
      </Group>

      <Group title="Text">
        <div className="flex flex-col gap-1">
          {[
            { Icon: Heading, label: 'Heading' },
            { Icon: Pilcrow, label: 'Body text' },
            { Icon: List, label: 'List' },
          ].map(({ Icon, label }) => (
            <RowButton key={label} Icon={Icon} label={label} />
          ))}
        </div>
      </Group>

      <Group title="Media">
        <div className="flex flex-col gap-1">
          {[
            { Icon: ImageIcon, label: 'Image' },
            { Icon: Bookmark, label: 'Logo' },
            { Icon: PaintBucket, label: 'SVG icon' },
          ].map(({ Icon, label }) => (
            <RowButton key={label} Icon={Icon} label={label} />
          ))}
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        {title}
      </p>
      {children}
    </section>
  );
}

function RowButton({ Icon, label }: { Icon: typeof Square; label: string }) {
  return (
    <button className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </span>
      {label}
    </button>
  );
}

function BrandPanel() {
  const [tab, setTab] = useState<'logos' | 'images' | 'colors' | 'fonts'>('logos');
  return (
    <div className="flex flex-col gap-4 p-5">
      <header>
        <h3 className="text-[14px] font-medium tracking-tight">Brand · {mockBrand.name}</h3>
      </header>
      <div className="flex gap-1.5">
        {(['logos', 'images', 'colors', 'fonts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] capitalize',
              tab === t
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'logos' && (
        <ul className="space-y-3">
          {mockLogoVariants.map((v) => (
            <li
              key={v.id}
              className="overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800"
            >
              <div
                className="flex aspect-[16/9] items-center justify-center"
                style={{
                  background: v.background,
                  color: v.fg,
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: v.letter.length > 1 ? 32 : 56,
                }}
              >
                {v.letter}
              </div>
              <p className="bg-white px-3 py-2 text-[11px] dark:bg-zinc-900">{v.label}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === 'images' && (
        <ul className="grid grid-cols-2 gap-3">
          {mockBrandImages.map((img) => (
            <li
              key={img.id}
              className="aspect-square rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800"
              style={{ background: img.tint }}
            />
          ))}
        </ul>
      )}

      {tab === 'colors' && (
        <ul className="space-y-3">
          {mockColorSwatches.map((c) => (
            <li
              key={c.name}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div
                className="h-10 w-10 rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-700"
                style={{ background: c.hex }}
              />
              <div>
                <p className="text-[12px] font-medium">{c.name}</p>
                <p className="font-mono text-[10px] text-zinc-400">{c.hex}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'fonts' && (
        <div className="space-y-3">
          <FontCard label="Heading" family={mockBrand.fonts.heading} />
          <FontCard label="Body" family={mockBrand.fonts.body} />
        </div>
      )}
    </div>
  );
}

function FontCard({ label, family }: { label: string; family: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p
        className="mt-1.5 text-[24px] tracking-tight"
        style={{ fontFamily: `${family}, sans-serif`, fontWeight: 600 }}
      >
        {family}
      </p>
      <p
        className="mt-1.5 text-[12px] text-zinc-500"
        style={{ fontFamily: `${family}, sans-serif` }}
      >
        Aa Bb Cc 1234
      </p>
    </div>
  );
}

// ─── Floating toolbar — leaner (4-5 controls + More) ────────────────────

function FloatingToolbar() {
  return (
    <div
      className="absolute z-10 flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ top: 152, left: 24 }}
    >
      <button className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800">
        DM Sans
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </button>
      <span className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
      <button className="rounded-md px-2 py-1 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800">
        36
      </button>
      <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <span
          className="h-3.5 w-3.5 rounded-full ring-1 ring-zinc-300"
          style={{ background: mockBrand.colors.primary }}
        />
      </button>
      <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <span className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
      <button className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
        More
        <MoreHorizontal className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Right-click context menu (whole-doc scope lives here) ──────────────

function ContextMenu() {
  const [scope, setScope] = useState<'page' | 'all'>('page');
  return (
    <div
      className="absolute z-20 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      // Pretend right-click happened on the headline — anchor to its
      // approximate position
      style={{ top: 220, left: 240 }}
    >
      <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-zinc-400">
        Right-click → context menu
      </p>

      <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

      <ContextItem label="Edit text" hint="↵" />
      <ContextItem label="Duplicate" hint="⌘D" />
      <ContextItem label="Send to back" />

      <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

      <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-zinc-400">
        Apply this change
      </p>
      <button
        onClick={() => setScope('page')}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]',
          scope === 'page' ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
        )}
      >
        <span
          className={cn(
            'flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
            scope === 'page' ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600',
          )}
        >
          {scope === 'page' && <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />}
        </span>
        On this page only
      </button>
      <button
        onClick={() => setScope('all')}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]',
          scope === 'all' ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
        )}
      >
        <span
          className={cn(
            'flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
            scope === 'all' ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600',
          )}
        >
          {scope === 'all' && <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />}
        </span>
        <Globe2 className="h-3 w-3 text-zinc-400" />
        Apply across all pages
      </button>

      <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

      <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
    </div>
  );
}

function ContextItem({ label, hint }: { label: string; hint?: string }) {
  return (
    <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <span>{label}</span>
      {hint && <span className="font-mono text-[10px] text-zinc-400">{hint}</span>}
    </button>
  );
}

// ─── Page Navigator — narrower (80px), always visible ───────────────────

function PageNavigator({ onCollapse }: { onCollapse: () => void }) {
  return (
    <aside className="relative flex w-20 flex-col border-l border-zinc-200 bg-white py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={onCollapse}
        title="Collapse to handle"
        className="absolute -left-2.5 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
      <p className="px-2 py-1 text-center text-[8px] font-semibold uppercase tracking-wider text-zinc-400">
        Pages
      </p>
      <ul className="flex-1 space-y-2 overflow-auto px-2">
        {mockPages.map((p) => (
          <li key={p.id}>
            <button
              className={cn(
                'flex w-full flex-col items-center gap-1 rounded-md p-1 transition-colors',
                p.isActive
                  ? 'bg-zinc-100 ring-1 ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
              )}
            >
              <div
                className="aspect-square w-full rounded ring-1 ring-zinc-200 dark:ring-zinc-700"
                style={{ background: '#fafaf9' }}
              />
              <span className="text-[8px] text-zinc-500">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button className="m-1.5 flex items-center justify-center rounded-md border border-dashed border-zinc-300 py-1.5 text-[9px] text-zinc-500 hover:border-zinc-400 dark:border-zinc-700">
        <Plus className="h-3 w-3" />
      </button>
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
      {selected && (
        <div
          className="pointer-events-none absolute -inset-2 rounded"
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
      )}
    </div>
  );
}
