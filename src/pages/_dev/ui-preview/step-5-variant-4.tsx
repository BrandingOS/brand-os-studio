// Step 5 UI direction — Variant 4 (Canva-Pure, fully cosmos-skinned).
//
// Now matches /setup pixel-for-pixel on the two surfaces the user
// flagged:
//   • Header → cosmos `.top-nav-wrap` + `.segmented-nav` (with moving
//     active pill) + `.theme-toggle` + `.pill-btn--primary` Publish
//   • Secondary Panel → cosmos `.panel` card with `.panel-top`,
//     `.panel-heading-eyebrow`, `.panel-heading-title`, `.panel-progress`,
//     `.panel-list`, `.panel-item`, `.panel-item-thumb`, `.panel-item-meta`,
//     `.panel-item-name`, `.panel-item-sub`, `.status-chip.is-added`
//
// Editor-specific surfaces preserved: App Rail (Generate/Templates/
// Insert/Brand), floating toolbar with whole-doc scope toggle, mock
// canvas with selection, Page Navigator with right-click menu.
//
// MOCKUP ONLY. Local useState for visual toggles.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignLeft,
  Bold,
  ChevronDown,
  ChevronRight,
  Italic,
  LayoutGrid,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
  Square,
  Circle as CircleIcon,
  Minus,
  Image as ImageIcon,
  Bookmark,
  Heading,
  Pilcrow,
  List as ListIcon,
  PaintBucket,
  Globe2,
  Copy,
  Trash2,
  Layers,
  PenTool,
  Pipette,
  Type as TypeIcon,
  Shapes,
  Camera,
  MessageCircle,
  Check,
  FileImage,
  Wand2,
  ScrollText,
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
type TopTab = 'edit' | 'preview' | 'comments';

const TOP_TABS: ReadonlyArray<{ id: TopTab; label: string }> = [
  { id: 'edit', label: 'Edit' },
  { id: 'preview', label: 'Preview' },
  { id: 'comments', label: 'Comments' },
];

export default function Step5Variant4Page() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeRail, setActiveRail] = useState<RailItem>('brand');
  const [activeTab, setActiveTab] = useState<TopTab>('edit');
  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [scope, setScope] = useState<'page' | 'all'>('page');

  return (
    <div data-cosmos="workspace" data-theme={theme}>
      <div
        className="min-h-screen w-full"
        style={{ background: 'var(--background)', color: 'var(--text-primary)' }}
      >
        <CosmosTopNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <div
          className="flex"
          style={{ height: 'calc(100vh - 68px)' }}
        >
          {/* App Rail */}
          <AppRail
            active={activeRail}
            onChange={(item) => {
              setActiveRail(item);
              setSecondaryOpen(true);
            }}
          />

          {/* Secondary Panel — cosmos .panel card (no sticky, fills the
              column). We pad/inset it slightly so the card edges float
              away from the rail and the canvas. */}
          {secondaryOpen ? (
            <div className="flex pl-3 py-3">
              <SecondaryPanel
                active={activeRail}
                onCollapse={() => setSecondaryOpen(false)}
              />
            </div>
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

// ─── Cosmos top-nav (header) ────────────────────────────────────────────

function CosmosTopNav({
  activeTab,
  onChangeTab,
  theme,
  onToggleTheme,
}: {
  activeTab: TopTab;
  onChangeTab: (t: TopTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('.segmented-nav-item.is-active');
    if (!active) return;
    setPill({ left: active.offsetLeft, width: active.offsetWidth });
  }, []);

  useEffect(() => {
    measure();
  }, [activeTab, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <header className="top-nav-wrap" role="banner">
      <div className="top-nav-left">
        <BrandPicker brand={mockBrand} />
      </div>

      <nav ref={navRef} className="segmented-nav" aria-label="Editor mode">
        {pill && (
          <span
            className="segmented-nav-pill"
            aria-hidden
            style={{
              transform: `translateX(${pill.left}px)`,
              width: pill.width,
            }}
          />
        )}
        {TOP_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`segmented-nav-item${isActive ? ' is-active' : ''}`}
              onClick={() => onChangeTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="top-nav-right">
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Publish</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle light and dark mode"
          title="Toggle theme"
        >
          <svg
            className="theme-icon theme-icon-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <svg
            className="theme-icon theme-icon-moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          {/* keep theme prop referenced so ESLint doesn't grumble — the
              actual icon swap is driven by [data-theme] in cosmos CSS */}
          <span className="sr-only">{theme}</span>
        </button>
      </div>
    </header>
  );
}

// ─── Brand picker (top-left cluster — cosmos top-nav-brand shape) ───────

function BrandPicker({ brand }: { brand: MockBrand }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="top-nav-brand"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px 6px 4px 4px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <span
            className="top-nav-brand-mark"
            aria-hidden="true"
            style={{
              background: brand.colors.primary,
              color: '#fff',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            {brand.name[0]}
          </span>
          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            {brand.name}
          </span>
          <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
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

// ─── Secondary Panel — cosmos `.panel` card ─────────────────────────────

function SecondaryPanel({
  active,
  onCollapse,
}: {
  active: RailItem;
  onCollapse: () => void;
}) {
  return (
    <aside
      className="relative flex w-72 flex-col"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
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

// ─── Generate Panel ─────────────────────────────────────────────────────

function GeneratePanel() {
  const recents = [
    { name: 'Product launch', sub: '1080×1080 · social', Icon: Wand2 },
    { name: 'Quote card story', sub: '1080×1920', Icon: ScrollText },
    { name: '5-slide pitch v2', sub: 'Presentation', Icon: FileImage },
    { name: 'Banner concept', sub: '1500×500', Icon: ImageIcon },
  ];
  return (
    <>
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">AI</span>
          <h1 className="panel-heading-title">Generate</h1>
        </div>
        <div
          className="rounded-xl p-2"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <textarea
            rows={2}
            placeholder='Try "Instagram post for our product launch"…'
            className="w-full resize-none bg-transparent text-[12px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
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
              style={{ height: 26, padding: '0 10px', fontSize: 11 }}
            >
              <Sparkles size={12} />
              <span>Generate</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="panel-list">
        <div className="panel-group-label">Recent</div>
        {recents.map((r, i) => (
          <div key={i} className="panel-item">
            <button type="button" className="panel-item-body">
              <span className="panel-item-thumb" aria-hidden>
                <r.Icon size={16} strokeWidth={1.6} />
              </span>
              <span className="panel-item-meta">
                <span className="panel-item-name">{r.name}</span>
                <span className="panel-item-sub">{r.sub}</span>
              </span>
            </button>
          </div>
        ))}
      </nav>
    </>
  );
}

// ─── Templates Panel ────────────────────────────────────────────────────

function TemplatesPanel() {
  const [cat, setCat] = useState<'All' | 'Social' | 'Presentation' | 'Print'>('All');
  const filtered =
    cat === 'All' ? mockTemplates : mockTemplates.filter((t) => t.category === cat);
  return (
    <>
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Browse</span>
          <h1 className="panel-heading-title">Templates</h1>
        </div>
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
      </div>
      <div className="panel-list" style={{ paddingTop: 10 }}>
        <div className="grid grid-cols-2 gap-2 px-1">
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
    </>
  );
}

// ─── Insert Panel ───────────────────────────────────────────────────────

function InsertPanel() {
  const groups: Array<{ title: string; items: Array<{ Icon: typeof Square; name: string; sub: string }> }> = [
    {
      title: 'Shapes',
      items: [
        { Icon: Square, name: 'Rectangle', sub: 'Solid · stroke · fill' },
        { Icon: CircleIcon, name: 'Ellipse', sub: 'Circle · oval' },
        { Icon: Minus, name: 'Line', sub: 'Divider · arrow' },
      ],
    },
    {
      title: 'Text',
      items: [
        { Icon: Heading, name: 'Heading', sub: 'Large display text' },
        { Icon: Pilcrow, name: 'Body', sub: 'Paragraph block' },
        { Icon: ListIcon, name: 'List', sub: 'Bulleted · numbered' },
      ],
    },
    {
      title: 'Media',
      items: [
        { Icon: ImageIcon, name: 'Image', sub: 'Upload or link' },
        { Icon: Bookmark, name: 'Logo', sub: 'From brand kit' },
        { Icon: PaintBucket, name: 'SVG', sub: 'Vector asset' },
      ],
    },
  ];
  return (
    <>
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Add</span>
          <h1 className="panel-heading-title">Insert</h1>
        </div>
      </div>
      <nav className="panel-list">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="panel-group-label">{g.title}</div>
            {g.items.map((it) => (
              <div key={it.name} className="panel-item">
                <button type="button" className="panel-item-body">
                  <span className="panel-item-thumb" aria-hidden>
                    <it.Icon size={16} strokeWidth={1.6} />
                  </span>
                  <span className="panel-item-meta">
                    <span className="panel-item-name">{it.name}</span>
                    <span className="panel-item-sub">{it.sub}</span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

// ─── Brand Panel — closest mirror of /setup's SetupSidebar ─────────────

function BrandPanel() {
  const entries: Array<{
    key: string;
    name: string;
    sub: string;
    Icon: typeof PenTool;
    added: boolean;
  }> = [
    { key: 'logo', name: 'Logo', sub: `${mockLogoVariants.length} variants`, Icon: PenTool, added: true },
    { key: 'color', name: 'Color', sub: `${mockColorSwatches.length} colors`, Icon: Pipette, added: true },
    { key: 'fonts', name: 'Typography', sub: `${mockBrand.fonts.heading} · ${mockBrand.fonts.body}`, Icon: TypeIcon, added: true },
    { key: 'icons', name: 'Iconography', sub: '12 icons', Icon: Shapes, added: true },
    { key: 'photos', name: 'Photography', sub: `${mockBrandImages.length} references`, Icon: Camera, added: true },
    { key: 'website', name: 'Website', sub: `${mockBrand.slug}.com`, Icon: Globe2, added: true },
    { key: 'voice', name: 'About', sub: '1 / 5 sections', Icon: MessageCircle, added: true },
  ];
  const completed = entries.filter((e) => e.added).length;
  const total = entries.length;
  const pct = Math.round((completed / total) * 100);
  const [activeKey, setActiveKey] = useState('logo');

  return (
    <>
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Brand kit</span>
          <h1 className="panel-heading-title" style={{ fontStyle: 'italic' }}>
            {mockBrand.name}
          </h1>
        </div>
        <div className="panel-progress">
          <div className="panel-progress-head">
            <span className="panel-progress-label">Completion</span>
            <span className="panel-progress-count">
              {completed} / {total}
            </span>
          </div>
          <div className="panel-progress-bar">
            <div className="panel-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <nav className="panel-list">
        {entries.map((e) => {
          const isActive = activeKey === e.key;
          return (
            <div
              key={e.key}
              className={`panel-item${isActive ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className="panel-item-body"
                onClick={() => setActiveKey(e.key)}
              >
                <span className="panel-item-thumb" aria-hidden>
                  <e.Icon size={16} strokeWidth={1.6} />
                </span>
                <span className="panel-item-meta">
                  <span className="panel-item-name">{e.name}</span>
                  <span className="panel-item-sub">{e.sub}</span>
                </span>
              </button>
              <span className="status-chip is-added" aria-hidden>
                <span className="chip-default">
                  <Check size={14} />
                </span>
                <span className="chip-hover">
                  <Plus size={14} />
                </span>
              </span>
            </div>
          );
        })}
      </nav>
    </>
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
