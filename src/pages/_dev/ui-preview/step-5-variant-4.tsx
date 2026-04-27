// Step 5 UI direction — Variant 4 (Canva-Pure, cosmos-skinned).
//
// Same structural content as before — App Rail, Secondary Panel,
// floating toolbar w/ scope toggle, Page Navigator — but the visual
// language now matches /setup (CosmosWorkspaceShell):
//   • Warm paper background, off-white panels with soft shadows
//   • Cosmos accent (black-on-light / white-on-dark) for primary CTAs
//   • pill-btn shapes, 12px panel radii, Instrument Serif headings
//   • theme toggled via data-theme="dark" on the cosmos root, not
//     Tailwind's `dark:` (so all CSS vars switch in lockstep)
//   • Selection ring uses --link blue, the closest semantic the
//     cosmos system has to "active editor selection"
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
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Sparkles,
  Sun,
  ArrowRight,
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
import '@/shared/styles/cosmos-workspace.css';

// Editor selection blue — fixed across themes (cosmos --link is the
// nearest semantic, but we lock it so the ring reads consistently
// against any canvas color).
const SELECTION = '#2965f6';

type RailItem = 'generate' | 'templates' | 'insert' | 'brand';

export default function Step5Variant4Page() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeRail, setActiveRail] = useState<RailItem>('generate');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'comments'>('edit');
  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [scope, setScope] = useState<'page' | 'all'>('page');

  return (
    <div data-cosmos="workspace" data-theme={theme}>
      <div
        className="min-h-screen w-full"
        style={{ background: 'var(--background)', color: 'var(--text-primary)' }}
      >
        {/* ─── Header ──────────────────────────────────────────────── */}
        <header
          className="flex h-14 items-center gap-3 px-4"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <BrandPicker brand={mockBrand} />

          {/* Pill tabs — Edit / Preview / Comments */}
          <div
            className="mx-auto flex items-center gap-1 rounded-full p-1 text-[12px]"
            style={{ background: 'var(--surface-sunken)' }}
          >
            {(['edit', 'preview', 'comments'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="rounded-full px-4 py-1.5 capitalize transition-all"
                  style={{
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                    boxShadow: isActive ? 'var(--shadow-xs)' : undefined,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button type="button" className="pill-btn pill-btn--primary">
              <span>Export</span>
              <ArrowRight size={14} className="pill-btn-arrow" />
            </button>
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
          <main
            className="relative flex flex-1 items-center justify-center overflow-hidden"
            style={{ background: 'var(--surface-sunken)' }}
          >
            {/* Doc title overlay (Canva-style, sits ABOVE the canvas) */}
            <div className="absolute left-1/2 top-6 -translate-x-1/2 text-center">
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] backdrop-blur-md"
                style={{
                  background: 'color-mix(in srgb, var(--surface) 80%, transparent)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
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
            <div
              className="absolute bottom-6 right-6 max-w-[200px] rounded-xl p-3 text-[10px] backdrop-blur-md"
              style={{
                background: 'color-mix(in srgb, var(--surface) 70%, transparent)',
                border: '1px dashed var(--dash)',
                color: 'var(--text-muted)',
              }}
            >
              <p
                className="mb-1.5 font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
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
              className="flex w-4 items-center justify-center transition-colors"
              style={{
                background: 'var(--surface)',
                borderLeft: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
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
      <DropdownMenu.Trigger
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{
            background: brand.colors.primary,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 18,
          }}
        >
          {brand.name[0]}
        </div>
        <span
          className="text-[14px]"
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          {brand.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-xl p-1.5"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)',
          }}
        >
          <p
            className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Switch brand
          </p>
          <div
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: 'var(--accent-muted)' }}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
              style={{
                background: brand.colors.primary,
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 16,
              }}
            >
              {brand.name[0]}
            </div>
            <span className="text-sm" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {brand.name}
            </span>
            <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
              current
            </span>
          </div>
          <DropdownMenu.Separator
            className="my-1 h-px"
            style={{ background: 'var(--border)' }}
          />
          {mockOtherBrands.map((b) => (
            <DropdownMenu.Item
              key={b.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                style={{
                  background: b.avatarColor,
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 16,
                }}
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

// ─── App Rail ────────────────────────────────────────────────────────────

function AppRail({ active, onChange }: { active: RailItem; onChange: (i: RailItem) => void }) {
  const items: Array<{ id: RailItem; label: string; Icon: typeof Sparkles }> = [
    { id: 'generate', label: 'Generate', Icon: Sparkles },
    { id: 'templates', label: 'Templates', Icon: LayoutGrid },
    { id: 'insert', label: 'Insert', Icon: Plus },
    { id: 'brand', label: 'Brand', Icon: Palette },
  ];
  return (
    <aside
      className="flex w-16 flex-col items-center gap-1 py-3"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {items.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={label}
            className="group relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors"
            style={{
              background: isActive ? 'var(--accent-muted)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
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
    <aside
      className="relative flex w-72 flex-col rounded-r-2xl"
      style={{
        background: 'var(--surface-elevated)',
        borderRight: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        onClick={onCollapse}
        title="Collapse panel"
        className="absolute -right-2.5 top-6 z-10 flex h-5 w-5 items-center justify-center rounded-full transition-colors"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          boxShadow: 'var(--shadow-xs)',
        }}
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

function PanelHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <header className="flex flex-col gap-1">
      {eyebrow ? (
        <p
          className="text-[10px] font-medium uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h3
        style={{
          fontFamily: '"Instrument Serif", "DM Serif Display", "Playfair Display", serif',
          fontSize: 22,
          lineHeight: 1,
          letterSpacing: '-0.015em',
          color: 'var(--text-primary)',
          fontWeight: 400,
        }}
      >
        {title}
      </h3>
    </header>
  );
}

function GeneratePanel() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <PanelHeading eyebrow="AI" title="Generate" />
      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        Describe what you want to create
      </p>

      <div
        className="rounded-xl p-2"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <textarea
          rows={3}
          placeholder='Try "Instagram post for our product launch"…'
          className="w-full resize-none bg-transparent text-[12px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <div className="mt-1 flex items-center justify-between">
          <button
            className="rounded-full px-2 py-0.5 text-[10px] transition-colors"
            style={{
              background: 'var(--surface-sunken)',
              color: 'var(--text-secondary)',
            }}
          >
            Social post ▾
          </button>
          <button
            type="button"
            className="pill-btn pill-btn--primary"
            style={{ height: 28, padding: '0 12px', fontSize: 11 }}
          >
            <Sparkles className="h-3 w-3" />
            <span>Generate</span>
          </button>
        </div>
      </div>

      <div>
        <p
          className="mb-2 text-[10px] font-semibold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
        >
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
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
      <PanelHeading title="Templates" />
      <div className="relative">
        <Search
          className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          placeholder="Search…"
          className="w-full rounded-lg py-1.5 pl-7 pr-2 text-[11px] outline-none"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {(['All', 'Social', 'Presentation', 'Print'] as const).map((c) => {
          const isActive = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] transition-colors"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--surface-sunken)',
                color: isActive ? 'var(--accent-contrast)' : 'var(--text-secondary)',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((t) => (
          <button
            key={t.id}
            className="group overflow-hidden rounded-lg transition-colors"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="aspect-[3/4]"
              style={{
                background: `linear-gradient(135deg, ${t.gradient[0]} 0%, ${t.gradient[1]} 100%)`,
              }}
            />
            <p className="truncate px-1.5 py-1 text-left text-[10px]">{t.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function InsertPanel() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <PanelHeading title="Insert" />

      <Group title="Shapes">
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: Square, label: 'Rect' },
            { Icon: CircleIcon, label: 'Ellipse' },
            { Icon: Minus, label: 'Line' },
          ].map(({ Icon, label }) => (
            <InsertTile key={label} Icon={Icon} label={label} />
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
            <InsertTile key={label} Icon={Icon} label={label} />
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
            <InsertTile key={label} Icon={Icon} label={label} />
          ))}
        </div>
      </Group>
    </div>
  );
}

function InsertTile({ Icon, label }: { Icon: typeof Square; label: string }) {
  return (
    <button
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg transition-colors"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-hover)';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      <span className="text-[9px]">{label}</span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p
        className="mb-1.5 text-[10px] font-semibold uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
      >
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
      <PanelHeading eyebrow={mockBrand.name} title="Brand" />
      <div className="flex gap-1">
        {(['logos', 'images', 'colors', 'fonts'] as const).map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-full px-2.5 py-0.5 text-[10px] capitalize transition-colors"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--surface-sunken)',
                color: isActive ? 'var(--accent-contrast)' : 'var(--text-secondary)',
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === 'logos' && (
        <div className="grid grid-cols-2 gap-2">
          {mockLogoVariants.map((v) => (
            <div
              key={v.id}
              className="overflow-hidden rounded-lg"
              style={{ border: '1px solid var(--border)' }}
            >
              <div
                className="flex aspect-square items-center justify-center"
                style={{
                  background: v.background,
                  color: v.fg,
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: v.letter.length > 1 ? 18 : 32,
                }}
              >
                {v.letter}
              </div>
              <p className="truncate px-1.5 py-1 text-[9px]">{v.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'images' && (
        <div className="grid grid-cols-2 gap-2">
          {mockBrandImages.map((img) => (
            <div
              key={img.id}
              className="aspect-square rounded-lg"
              style={{ background: img.tint, boxShadow: '0 0 0 1px var(--border)' }}
            />
          ))}
        </div>
      )}

      {tab === 'colors' && (
        <div className="grid grid-cols-2 gap-2">
          {mockColorSwatches.map((c) => (
            <div key={c.name} className="flex flex-col gap-1">
              <div
                className="aspect-square rounded-lg"
                style={{ background: c.hex, boxShadow: '0 0 0 1px var(--border)' }}
              />
              <div className="text-[9px]">
                <p className="font-medium">{c.name}</p>
                <p className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  {c.hex}
                </p>
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
    <div
      className="rounded-lg p-3"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <p
        className="text-[9px] font-medium uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[20px] tracking-tight"
        style={{ fontFamily: `${family}, sans-serif`, fontWeight: 600 }}
      >
        {family}
      </p>
      <p
        className="mt-1 text-[10px]"
        style={{ fontFamily: `${family}, sans-serif`, color: 'var(--text-secondary)' }}
      >
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
  return (
    <div
      className="absolute z-10 flex items-center gap-0.5 rounded-full px-1 py-1 transition-colors"
      style={{
        top: 156,
        left: 24,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        outline: scope === 'all' ? `2px solid color-mix(in srgb, ${SELECTION} 45%, transparent)` : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Scope toggle pill — distinct LEFT edge of the toolbar */}
      <button
        onClick={() => onScopeChange(scope === 'page' ? 'all' : 'page')}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors"
        style={{
          background: scope === 'all' ? SELECTION : 'var(--surface-sunken)',
          color: scope === 'all' ? '#fff' : 'var(--text-secondary)',
        }}
        title="Toggle whole-document scope"
      >
        <Globe2 className="h-3 w-3" />
        {scope === 'all' ? 'All pages' : 'This page'}
      </button>

      <span
        className="mx-0.5 h-4 w-px"
        style={{ background: 'var(--border)' }}
      />

      {/* Text controls — Canva-density, 6-7 visible */}
      <ToolbarSelect label="DM Sans" />
      <ToolbarPill>36</ToolbarPill>
      <ToolbarIcon Icon={Bold} />
      <ToolbarIcon Icon={Italic} />
      <ToolbarIcon Icon={AlignLeft} />
      <ToolbarColor swatch={mockBrand.colors.primary} />
      <ToolbarPill>Effects</ToolbarPill>

      <span
        className="mx-0.5 h-4 w-px"
        style={{ background: 'var(--border)' }}
      />

      <ToolbarIcon Icon={MoreHorizontal} />
    </div>
  );
}

function ToolbarSelect({ label }: { label: string }) {
  return (
    <button
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
      <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}

function ToolbarPill({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="rounded-md px-2 py-1 text-[11px] transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function ToolbarIcon({ Icon }: { Icon: typeof Bold }) {
  return (
    <button
      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ToolbarColor({ swatch }: { swatch: string }) {
  return (
    <button
      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span
        className="h-3.5 w-3.5 rounded-full"
        style={{ background: swatch, boxShadow: '0 0 0 1px var(--border-strong)' }}
      />
    </button>
  );
}

function ScopePillPreview({ state }: { state: 'page' | 'all' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium',
      )}
      style={{
        background: state === 'all' ? SELECTION : 'var(--surface-sunken)',
        color: state === 'all' ? '#fff' : 'var(--text-secondary)',
      }}
    >
      <Globe2 className="h-2.5 w-2.5" />
      {state === 'all' ? 'All pages' : 'This page'}
    </div>
  );
}

// ─── Page Navigator (right) ────────────────────────────────────────────

function PageNavigator({ onCollapse }: { onCollapse: () => void }) {
  return (
    <aside
      className="relative flex w-32 flex-col py-2"
      style={{
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      <button
        onClick={onCollapse}
        className="absolute -left-2.5 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <ChevronRight className="h-3 w-3" />
      </button>
      <p
        className="px-3 py-1 text-[9px] font-semibold uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
      >
        Pages
      </p>
      <ul className="flex-1 space-y-1.5 overflow-auto px-2">
        {mockPages.map((p, i) => {
          const isActive = p.isActive;
          return (
            <li key={p.id}>
              <button
                className="group relative flex w-full flex-col items-center gap-1 rounded-lg p-1.5 transition-colors"
                style={{
                  background: isActive ? 'var(--accent-muted)' : 'transparent',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  className="aspect-square w-full rounded"
                  style={{
                    background: i === 0 ? 'var(--surface-elevated)' : 'var(--surface-sunken)',
                    boxShadow: '0 0 0 1px var(--border)',
                  }}
                />
                <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                  {p.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        className="m-2 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors"
        style={{
          border: '1px dashed var(--dash)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--dash-strong)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--dash)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <Plus className="h-3 w-3" /> Add
      </button>

      {/* Right-click menu — open by default for demo */}
      <div
        className="absolute left-2 top-12 z-20 w-36 rounded-lg p-1"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <p
          className="px-2 py-1 text-[8px] uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
        >
          Right-click ↑
        </p>
        <CtxItem Icon={Copy} label="Duplicate" />
        <CtxItem Icon={Layers} label="Apply master" />
        <CtxItem Icon={Trash2} label="Delete" tone="critical" />
      </div>
    </aside>
  );
}

function CtxItem({
  Icon,
  label,
  tone = 'default',
}: {
  Icon: typeof Copy;
  label: string;
  tone?: 'default' | 'critical';
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] transition-colors"
      style={{ color: tone === 'critical' ? 'var(--critical)' : 'var(--text-primary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          tone === 'critical' ? 'var(--critical-soft)' : 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
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
      className="relative overflow-hidden rounded-xl"
      style={{
        width: page.displayWidth,
        height: page.displayHeight,
        background: page.background,
        boxShadow: 'var(--shadow-lg)',
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
          style={{ boxShadow: `0 0 0 1.5px ${SELECTION}` }}
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
              style={{ ...pos, boxShadow: `0 0 0 1.5px ${SELECTION}` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
