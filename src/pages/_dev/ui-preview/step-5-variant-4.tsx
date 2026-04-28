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
type WorkspaceTab = 'setup' | 'brand-kit' | 'guideline' | 'design' | 'tools';

// Same tabs the rest of the workspace uses (cosmos
// DEFAULT_WORKSPACE_TABS) — keep the editor visually unified with
// /setup, /brand-kit, etc. Design is active here because the editor
// is the canvas inside the Design tab.
const WORKSPACE_TABS: ReadonlyArray<{ id: WorkspaceTab; label: string }> = [
  { id: 'setup', label: 'Setup' },
  { id: 'brand-kit', label: 'Brand Kit' },
  { id: 'guideline', label: 'Guideline' },
  { id: 'design', label: 'Design' },
  { id: 'tools', label: 'Tools' },
];

export default function Step5Variant4Page() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeRail, setActiveRail] = useState<RailItem>('brand');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('design');
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

          {/* Secondary Panel — cosmos .panel card. Sits flush against
              the App Rail (no gap) so the canvas gets more breathing
              room; vertical padding floats the card off the body. */}
          {secondaryOpen ? (
            <div className="flex py-3 pr-1">
              <SecondaryPanel
                active={activeRail}
                onCollapse={() => setSecondaryOpen(false)}
              />
            </div>
          ) : null}

          {/* Canvas — same background as the page so the whole shell
              feels like one continuous surface; the canvas itself has
              its own `bg + shadow` to stand off the paper. */}
          <main
            className="relative flex flex-1 items-center justify-center overflow-hidden"
            style={{ background: 'var(--background)' }}
          >
            {/* Doc title overlay (Canva-style, sits ABOVE the canvas) */}
            <div className="absolute left-1/2 top-6 -translate-x-1/2 text-center">
              <div
                className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] backdrop-blur-md"
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

          {/* Page Navigator — floating card on the right, mirroring
              the SecondaryPanel treatment. */}
          {navigatorOpen ? (
            <div className="flex py-3 pl-1 pr-2">
              <PageNavigator onCollapse={() => setNavigatorOpen(false)} />
            </div>
          ) : (
            <button
              onClick={() => setNavigatorOpen(true)}
              aria-label="Open pages panel"
              className="my-3 mr-2 flex h-7 w-7 items-center justify-center transition-colors"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                color: 'var(--text-secondary)',
                boxShadow: 'var(--shadow-md)',
                alignSelf: 'flex-start',
              }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
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
  activeTab: WorkspaceTab;
  onChangeTab: (t: WorkspaceTab) => void;
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
        {/* Brand picker — current brand's logo + name with chevron.
            Click to switch between brands. Lives top-left so the user
            always knows which brand they're editing. */}
        <BrandPicker brand={mockBrand} />
      </div>

      <nav ref={navRef} className="segmented-nav" aria-label="Workspace">
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
        {WORKSPACE_TABS.map((tab) => {
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

// ─── Brand picker (header top-left) ─────────────────────────────────────

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
            padding: '4px 8px 4px 4px',
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
              fontSize: 14,
            }}
          >
            {brand.name[0]}
          </span>
          <span>{brand.name}</span>
          <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[240px] rounded-xl p-1.5"
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

// ─── App Rail — card buttons w/ label below each card ──────────────────

function AppRail({ active, onChange }: { active: RailItem; onChange: (i: RailItem) => void }) {
  const items: Array<{ id: RailItem; label: string; Icon: typeof Sparkles }> = [
    { id: 'generate', label: 'Generate', Icon: Sparkles },
    { id: 'templates', label: 'Templates', Icon: LayoutGrid },
    { id: 'insert', label: 'Insert', Icon: Plus },
    { id: 'brand', label: 'Brand', Icon: Palette },
  ];
  return (
    <aside
      className="flex flex-col items-center gap-2 py-3"
      style={{
        width: 76,
        background: 'var(--background)',
        paddingLeft: 10,
        paddingRight: 4,
      }}
      aria-label="App rail"
    >
      {items.map(({ id, label, Icon }) => (
        <RailCard
          key={id}
          Icon={Icon}
          label={label}
          isActive={id === active}
          onClick={() => onChange(id)}
        />
      ))}
    </aside>
  );
}

function RailCard({
  Icon,
  label,
  isActive,
  onClick,
}: {
  Icon: typeof Sparkles;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      style={{
        width: 56,
        height: 60,
        background: isActive ? 'var(--accent-muted)' : 'var(--surface)',
        border: `1px solid ${isActive ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        boxShadow: 'var(--shadow-xs)',
        cursor: 'pointer',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        transition:
          'background 180ms var(--ease), border-color 180ms var(--ease), transform 140ms var(--ease)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--surface-hover)';
          e.currentTarget.style.borderColor = 'var(--border-strong)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--surface)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }
      }}
    >
      <Icon size={18} strokeWidth={1.6} style={{ color: 'var(--text-primary)' }} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </span>
    </button>
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
        aria-label="Collapse panel"
        className="absolute -right-3.5 top-5 z-30 flex h-7 w-7 items-center justify-center transition-colors"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface-elevated)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
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
              className="rounded-lg px-2 py-0.5 text-[10px] transition-colors"
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
                className="shrink-0 rounded-lg px-2.5 py-0.5 text-[10px] transition-colors"
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

// ─── Brand Panel — accordion mirroring /setup's SetupSidebar ──────────
//
// Each section header (Logo / Color / Typography / …) toggles its
// content open/closed. All sections start expanded so the user sees
// the brand assets at a glance — clicking a section header collapses
// it down to just the row.

type BrandSectionKey =
  | 'logo'
  | 'color'
  | 'fonts'
  | 'icons'
  | 'photos'
  | 'website'
  | 'voice';

type BrandEntry = {
  key: BrandSectionKey;
  name: string;
  sub: string;
  Icon: typeof PenTool;
};

function BrandPanel() {
  const entries: BrandEntry[] = [
    { key: 'logo', name: 'Logo', sub: `${mockLogoVariants.length} variants`, Icon: PenTool },
    { key: 'color', name: 'Color', sub: `${mockColorSwatches.length} colors`, Icon: Pipette },
    { key: 'fonts', name: 'Typography', sub: `${mockBrand.fonts.heading} · ${mockBrand.fonts.body}`, Icon: TypeIcon },
    { key: 'icons', name: 'Iconography', sub: '12 icons', Icon: Shapes },
    { key: 'photos', name: 'Photography', sub: `${mockBrandImages.length} references`, Icon: Camera },
    { key: 'website', name: 'Website', sub: `${mockBrand.slug}.com`, Icon: Globe2 },
    { key: 'voice', name: 'About', sub: '1 / 5 sections', Icon: MessageCircle },
  ];
  const total = entries.length;
  // All sections expanded by default — click to collapse, not the
  // other way around.
  const [open, setOpen] = useState<Set<BrandSectionKey>>(
    () => new Set(entries.map((e) => e.key)),
  );

  const toggle = useCallback((key: BrandSectionKey) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
              {total} / {total}
            </span>
          </div>
          <div className="panel-progress-bar">
            <div className="panel-progress-fill" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <nav className="panel-list">
        {entries.map((e) => (
          <BrandSection
            key={e.key}
            entry={e}
            isOpen={open.has(e.key)}
            onToggle={() => toggle(e.key)}
          />
        ))}
      </nav>
    </>
  );
}

function BrandSection({
  entry,
  isOpen,
  onToggle,
}: {
  entry: BrandEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header row — same shape as /setup's panel-item but with a
          rotating chevron instead of a check chip. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 8px',
          borderRadius: 8,
          border: '1px solid transparent',
          background: isOpen ? 'var(--accent-muted)' : 'transparent',
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          font: 'inherit',
          transition: 'background 180ms var(--ease), border-color 180ms var(--ease)',
        }}
        onMouseEnter={(e) => {
          if (!isOpen)
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen)
            (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <span
          className="panel-item-thumb"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <entry.Icon size={16} strokeWidth={1.6} />
        </span>
        <span className="panel-item-meta" style={{ flex: 1 }}>
          <span className="panel-item-name">{entry.name}</span>
          <span className="panel-item-sub">{entry.sub}</span>
        </span>
        <span
          className="status-chip is-added"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <Check size={14} />
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 180ms var(--ease)',
          }}
        />
      </button>
      {isOpen && (
        <div style={{ padding: '6px 6px 12px 6px' }}>
          {renderBrandSectionBody(entry.key)}
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
        className="mt-1 text-[18px] tracking-tight"
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

function renderBrandSectionBody(key: BrandSectionKey) {
  switch (key) {
    case 'logo':
      return (
        <div className="grid grid-cols-2 gap-2">
          {mockLogoVariants.map((v) => (
            <div
              key={v.id}
              className="overflow-hidden rounded-lg"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
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
              <p
                className="truncate px-1.5 py-1 text-[9px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {v.label}
              </p>
            </div>
          ))}
        </div>
      );
    case 'color':
      return (
        <div className="grid grid-cols-3 gap-2">
          {mockColorSwatches.map((c) => (
            <div key={c.name} className="flex flex-col gap-1">
              <div
                className="aspect-square rounded-lg"
                style={{ background: c.hex, boxShadow: '0 0 0 1px var(--border)' }}
              />
              <div className="text-[9px]">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate font-mono" style={{ color: 'var(--text-muted)' }}>
                  {c.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    case 'fonts':
      return (
        <div className="space-y-2">
          <FontCard label="Heading" family={mockBrand.fonts.heading} />
          <FontCard label="Body" family={mockBrand.fonts.body} />
        </div>
      );
    case 'icons':
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {[Sparkles, LayoutGrid, Plus, Palette, Square, CircleIcon, Heading, Pilcrow, ImageIcon, Bookmark, Globe2, MessageCircle].map((Icon, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-lg"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <Icon size={14} strokeWidth={1.5} />
            </div>
          ))}
        </div>
      );
    case 'photos':
      return (
        <div className="grid grid-cols-2 gap-2">
          {mockBrandImages.map((img) => (
            <div
              key={img.id}
              className="aspect-square rounded-lg"
              style={{ background: img.tint, boxShadow: '0 0 0 1px var(--border)' }}
            />
          ))}
        </div>
      );
    case 'website':
      return (
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px]"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <Globe2 size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="truncate">{mockBrand.slug}.com</span>
        </div>
      );
    case 'voice':
      return (
        <div
          className="rounded-lg p-2.5 text-[11px] leading-relaxed"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <p style={{ color: 'var(--text-primary)' }} className="mb-1 font-medium">
            Mission
          </p>
          <p>
            We help small teams launch beautiful products in minutes, not months.
            Friendly, confident, never corporate.
          </p>
        </div>
      );
  }
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
      className="absolute z-10 flex items-center gap-0.5 px-1 py-1 transition-colors"
      style={{
        top: 156,
        left: 24,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-md)',
        outline: scope === 'all' ? `2px solid color-mix(in srgb, ${SELECTION} 45%, transparent)` : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Scope toggle pill — distinct LEFT edge of the toolbar */}
      <button
        onClick={() => onScopeChange(scope === 'page' ? 'all' : 'page')}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors"
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
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors"
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
      className="rounded-lg px-2 py-1 text-[11px] transition-colors"
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
      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
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
      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
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
        'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-medium',
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
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'visible',
      }}
    >
      <button
        onClick={onCollapse}
        title="Collapse pages"
        aria-label="Collapse pages"
        className="absolute -left-3.5 top-5 z-30 flex h-7 w-7 items-center justify-center transition-colors"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface-elevated)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <ChevronRight className="h-3.5 w-3.5" />
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
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] transition-colors"
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
