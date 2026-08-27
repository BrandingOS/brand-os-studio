/**
 * Guideline System — /_dev/guideline-editor
 *
 * The working surface for the Brand Guidelines builder (/b/:slug/guideline):
 * every editing component and its logic, LIVE, one card per component. These
 * are the REAL components, not copies — edit the file named on a card and
 * this page updates through HMR. Light/dark follows the top-bar theme
 * toggle; every lab visual reads --ds-* tokens so both modes just work.
 *
 * Navigation: the left sidebar lists every component. "All" scrolls the
 * whole set; picking a name shows that ONE component. In All view a card's
 * title is a button — clicking it opens that component alone. The pick is
 * remembered per browser (localStorage).
 *
 * Adding a component = one <Section> inside the right <Group> + one row in
 * NAV. Keep prose OFF the page — the file path is the doc.
 *
 * Self-gated: DEV builds, or `?dev=1`. Never linked from user nav.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Frame, Image as MediaGlyph, LayoutTemplate, Palette, Plus, Sparkles } from 'lucide-react';
import { DsConfirmDialog, DsRail } from '@/shared/ds';
import { getLayoutById } from '@/shared/editor';
import { CanvasToolbar, type InsertMenuSection } from '@/shared/editor/blocks/CanvasToolbar';
import { EditableSlide } from '@/shared/editor/blocks/EditableSlide';
import { FloatingToolbar } from '@/shared/editor/blocks/FloatingToolbar';
import { ChartToolbar, defaultChartToolbarConfig, type ChartToolbarConfig } from '@/shared/editor/blocks/ChartToolbar';
import { CardToolbar, defaultCardToolbarConfig, type CardToolbarConfig } from '@/shared/editor/blocks/CardToolbar';
import { TableToolbar } from '@/shared/editor/blocks/TableBlock';
import { CardStage } from '@/shared/editor/blocks/CardBlocks';
import { ChartDataEditor, type ChartData } from '@/shared/editor/blocks/ChartDataEditor';
import { WIDGET_MENU_SECTION } from '@/shared/editor/blocks/insertMenu';
import {
  HISTORY_DEBOUNCE_MS_DEFAULT,
  HistoryRing,
  useHistoryRegistry,
  useUndoScope,
} from '@/shared/history';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { raqmBrand } from '@/data/brands';
import {
  InsertBar,
  RAIL_ITEMS,
  SaveIndicator,
  UndoRedo,
  type RailMode,
} from '@/features/guideline/builder/GuidelineBuilder';
import { GuidelinePageCard } from '@/features/guideline/builder/GuidelinePageCard';
import { GuidelineSidebar } from '@/features/guideline/builder/GuidelineSidebar';
import { AddPagePanel } from '@/features/guideline/builder/panels/AddPagePanel';
import { BrandPanel } from '@/features/guideline/builder/panels/BrandPanel';
import { ContentPanel } from '@/features/guideline/builder/panels/ContentPanel';
import { PagePanel } from '@/features/guideline/builder/panels/PagePanel';
import { createPage, pageDisplayName, type GuidelinePage } from '@/features/guideline/model/document';
import {
  PAGE_CATEGORIES,
  PAGE_TYPES,
  pageTypesByCategory,
  type GuidelinePageType,
} from '@/features/guideline/model/pageLibrary';
import playgroundImage from '@/assets/illus-guidelines.webp';
import { BRAND_SECTION_LABEL, type BrandSection } from '@/features/guideline/model/brandSections';
import { brandView, type BrandChange } from '@/features/guideline/model/brandWrites';

const BRAND = raqmBrand;
const LAYOUT = getLayoutById('hyperhyve');

/** Pages on the live stage — text-heavy types so there is plenty to click. */
const STAGE_PAGES: GuidelinePage[] = (() => {
  const taken = new Set<string>();
  return ['cover', 'color-ratio', 'type-specimen'].map((type) => {
    const page = createPage(type, taken);
    taken.add(page.id);
    return page;
  });
})();

/** A richer list for the outline panel — includes a chapter divider. */
const OUTLINE_PAGES: GuidelinePage[] = (() => {
  const taken = new Set<string>();
  return ['cover', 'section', 'logo-grid', 'color-ratio', 'type-specimen', 'motion'].map(
    (type) => {
      const page = createPage(type, taken);
      taken.add(page.id);
      return page;
    },
  );
})();
const OUTLINE_EDITED = new Set(['color-ratio']);

/** The menu's second job — Chronicle's "Add slide", ours "Add page": the
 *  REAL page library, three levels deep (Page library → category → type),
 *  with hover previews rendering the actual brand. The reference shows
 *  canned samples; ours shows the user's own pages. */
const ADD_PAGE_SECTION: InsertMenuSection = {
  id: 'add-page',
  label: 'Add page',
  items: [
    {
      id: 'page-library',
      label: 'Page library',
      icon: LayoutTemplate,
      children: PAGE_CATEGORIES.map((category) => ({
        id: `lib-${category.id}`,
        label: category.name,
        children: pageTypesByCategory(category.id).map((type) => ({
          id: `page:${type.id}`,
          label: type.name,
          preview: () => <PageTypePreview type={type} />,
        })),
      })).filter((c) => c.children.length > 0),
    },
    { id: 'page-generate', label: 'Generate with AI', icon: Sparkles },
    { id: 'page-blank', label: 'Blank page', icon: Plus },
  ],
};

const TOOLBAR_SECTIONS: InsertMenuSection[] = [WIDGET_MENU_SECTION, ADD_PAGE_SECTION];

/** A real page in miniature: rendered at document proportions and scaled,
 *  so the preview is a true thumbnail of what the insert will produce. */
function PageTypePreview({ type }: { type: GuidelinePageType }) {
  const page = createPage(type.id, new Set());
  return (
    <div
      style={{ width: 340, height: 191, borderRadius: 10, overflow: 'hidden', background: '#141416' }}
    >
      <div
        style={{
          width: 720,
          height: 405,
          transform: 'scale(0.4722)',
          transformOrigin: 'top left',
          position: 'relative',
        }}
      >
        {type.render({
          brand: BRAND,
          layout: LAYOUT,
          pageNumber: 1,
          totalPages: PAGE_TYPES.length,
          page,
          sectionIndex: 1,
        })}
      </div>
    </div>
  );
}

const PANEL_W = 268;
const VIEW_KEY = 'brandos:guideline-lab:view';

/** The sidebar: every component by name. Labels deliberately differ from
 *  the card titles so test queries against titles stay unambiguous. */
const NAV: Array<{ group: string; items: Array<{ id: string; label: string }> }> = [
  {
    group: 'Canvas',
    items: [
      { id: 'playground', label: 'Selection' },
      { id: 'toolbar-canvas', label: 'Toolbar' },
      { id: 'toolbar-text', label: 'Toolbar · text' },
      { id: 'toolbar-image', label: 'Toolbar · image' },
      { id: 'toolbar-chart', label: 'Toolbar · chart' },
      { id: 'toolbar-card', label: 'Toolbar · card' },
      { id: 'toolbar-table', label: 'Toolbar · table' },
      { id: 'cards', label: 'Cards' },
    ],
  },
  {
    group: 'Panels',
    items: [
      { id: 'panel-content', label: 'Content outline' },
      { id: 'panel-page', label: 'Page editor' },
      { id: 'panel-brand', label: 'Brand' },
      { id: 'panel-add', label: 'Add page' },
    ],
  },
  {
    group: 'Controls',
    items: [
      { id: 'rail', label: 'Rail' },
      { id: 'undo', label: 'Undo / redo' },
      { id: 'save', label: 'Save states' },
      { id: 'labels', label: 'Labels' },
      { id: 'insert', label: 'Insert' },
      { id: 'confirm', label: 'Confirmations' },
    ],
  },
  { group: 'Document', items: [{ id: 'doc-header', label: 'Doc header' }] },
  { group: 'Stage', items: [{ id: 'stage', label: 'Stage' }] },
];

const LabView = createContext<{ view: string; open: (id: string) => void }>({
  view: 'all',
  open: () => {},
});

export default function DevGuidelineEditorPage() {
  const allowed =
    import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');
  if (!allowed) {
    return (
      <div style={{ padding: 48, fontFamily: 'system-ui' }}>
        <h1>Guideline System</h1>
        <p>
          This page is only available in development. Append <code>?dev=1</code> to
          force-enable.
        </p>
      </div>
    );
  }
  return <Lab />;
}

function Lab() {
  // ── View — 'all' or one section id, remembered per browser ─────
  const [view, setViewState] = useState<string>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) || 'all';
    } catch {
      return 'all';
    }
  });
  const setView = (next: string) => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* per-browser convenience only */
    }
    window.scrollTo({ top: 0 });
  };
  const labView = useMemo(() => ({ view, open: setView }), [view]);

  // ── Live stage ─────────────────────────────────────────────────
  const [stageSelected, setStageSelected] = useState<string | null>(STAGE_PAGES[0].id);

  // ── Rail ───────────────────────────────────────────────────────
  const [railValue, setRailValue] = useState<RailMode | null>('content');

  // ── Panels ─────────────────────────────────────────────────────
  const [outlineSelected, setOutlineSelected] = useState<string | undefined>();
  const [pagePanelPage, setPagePanelPage] = useState<GuidelinePage>(() => ({
    ...OUTLINE_PAGES[3],
  }));
  const [brandSection, setBrandSection] = useState<BrandSection | null>(null);
  const view_ = useMemo(() => brandView(BRAND), []);

  // ── Inline floating toolbars ───────────────────────────────────
  const [textStyle, setTextStyle] = useState<Record<string, string>>({
    fontWeight: '500',
    fontSize: '24px',
    color: '#ffffff',
    textAlign: 'left',
  });
  const [imageStyle, setImageStyle] = useState<Record<string, string>>({
    objectFit: 'cover',
  });
  const [chartConfig, setChartConfig] = useState<ChartToolbarConfig>(() => ({
    ...defaultChartToolbarConfig(),
    seriesColors: { 'Value 1': '#B8352C', 'Value 2': '#F5F1E8' },
  }));
  const [chartData, setChartData] = useState<ChartData>({
    columns: ['Month', 'Value 1', 'Value 2'],
    rows: [
      ['Jul', '$100', '$800'],
      ['Aug', '$200', '$600'],
      ['Sep', '$400', '$600'],
      ['Oct', '$600', '$400'],
      ['Nov', '$800', '$400'],
      ['Dec', '$1000', '$500'],
    ],
  });
  const [chartDataOpen, setChartDataOpen] = useState(false);
  const [cardConfig, setCardConfig] = useState<CardToolbarConfig>(() => defaultCardToolbarConfig());

  // ── Dialogs ────────────────────────────────────────────────────
  const [dialog, setDialog] = useState<'remove' | 'rebuild' | null>(null);
  const [brandChange, setBrandChange] = useState<BrandChange | null>(null);

  // ── Real undo — the playground's edits, not a stub ─────────────
  // A HistoryRing of the playground slide's innerHTML, fed by a
  // MutationObserver: ⌘Z / ⌘⇧Z and the top-bar buttons genuinely step
  // moves, scales, typing and toolbar changes backwards and forwards.
  const playgroundRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HistoryRing<string> | null>(null);
  const restoringRef = useRef(false);

  useEffect(() => {
    const content = playgroundRef.current?.querySelector<HTMLElement>('[data-slide-content]');
    if (!content) return;
    const ring = new HistoryRing<string>();
    ring.reset(content.innerHTML);
    ringRef.current = ring;
    let pending: number | undefined;
    const observer = new MutationObserver(() => {
      if (restoringRef.current) return;
      ring.snapshot(content.innerHTML);
      // snapshot() debounces internally; poke the registry after it lands
      // so the top-bar buttons light up.
      window.clearTimeout(pending);
      pending = window.setTimeout(
        () => useHistoryRegistry.getState().notify(),
        HISTORY_DEBOUNCE_MS_DEFAULT + 50,
      );
    });
    observer.observe(content, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      window.clearTimeout(pending);
    };
  }, []);

  const applyHistory = (html: string | null) => {
    const content = playgroundRef.current?.querySelector<HTMLElement>('[data-slide-content]');
    if (html == null || !content) return;
    restoringRef.current = true;
    content.innerHTML = html;
    // The restore orphans whatever was selected. EditableSlide re-checks
    // its element on scroll — fire one so the selection chrome closes.
    window.dispatchEvent(new Event('scroll'));
    // MutationObserver callbacks are microtasks — release the guard a task
    // later so the restore itself is never recorded as a new edit.
    window.setTimeout(() => {
      restoringRef.current = false;
    }, 0);
  };

  const undoScope = useMemo(
    () => ({
      id: 'dev-guideline-lab',
      label: 'Selection playground',
      undo: () => applyHistory(ringRef.current?.undo() ?? null),
      redo: () => applyHistory(ringRef.current?.redo() ?? null),
      canUndo: () => ringRef.current?.canUndo() ?? false,
      canRedo: () => ringRef.current?.canRedo() ?? false,
      undoLabel: () => 'playground edit',
      redoLabel: () => 'playground edit',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useUndoScope(undoScope);

  return (
    <LabView.Provider value={labView}>
      <WorkspaceShell rightActions={<UndoRedo />}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 140px' }}>
          <header className="gl-doc-head">
            <div>
              <span className="gl-doc-eyebrow">Dev · Lab</span>
              <h1 className="gl-doc-title">Guideline system</h1>
            </div>
            <div className="gl-doc-meta">
              <span>the real components · edit the file on a card, HMR updates it here</span>
            </div>
          </header>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '184px minmax(0, 1fr)',
              gap: 32,
              alignItems: 'start',
              marginTop: 20,
            }}
          >
            <Sidebar view={view} onPick={setView} />

            <main style={{ minWidth: 0 }}>
              {/* ═══ Canvas ═════════════════════════════════════════ */}
              <Group
                ids={[
                  'playground',
                  'toolbar-canvas',
                  'toolbar-text',
                  'toolbar-image',
                  'toolbar-chart',
                  'toolbar-card',
                  'toolbar-table',
                  'cards',
                ]}
                label="Canvas"
              >
                <Section
                  id="playground"
                  title="Selection playground — type · move · scale"
                  files={['src/shared/editor/blocks/EditableSlide.tsx']}
                >
                  <div
                    ref={playgroundRef}
                    style={{
                      height: 360,
                      border: '1px solid var(--ds-border)',
                      borderRadius: 12,
                      background: 'var(--ds-bg)',
                      overflow: 'hidden',
                    }}
                  >
                    <EditableSlide>
                      <div style={{ position: 'relative', width: '100%', height: '100%', padding: '48px 56px' }}>
                        <h2
                          style={{
                            margin: 0,
                            width: 'fit-content',
                            maxWidth: '100%',
                            fontSize: 42,
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            color: 'var(--ds-text)',
                          }}
                        >
                          Selected text element
                        </h2>
                        <p
                          style={{
                            margin: '14px 0 0',
                            width: 'fit-content',
                            maxWidth: 460,
                            fontSize: 15,
                            lineHeight: 1.6,
                            color: 'var(--ds-text-secondary)',
                          }}
                        >
                          Double-click me and type. Drag me around. Pull my corner to scale me.
                        </p>
                        {/* An IMAGE to select/drag/scale — selection treats it as a
                            full box (no words-only rule), the toolbar shows the
                            image actions. In flow, not absolute: a drag flips the
                            element to position:relative, which would yank an
                            absolutely-placed image into flow mid-gesture. */}
                        <img
                          src={playgroundImage}
                          alt="Draggable playground image"
                          style={{
                            marginTop: 18,
                            width: 170,
                            borderRadius: 10,
                            display: 'block',
                          }}
                        />
                      </div>
                    </EditableSlide>
                  </div>
                </Section>

                <Section
                  id="toolbar-canvas"
                  title="Canvas toolbar — Insert menu · hover previews"
                  files={[
                    'src/shared/editor/blocks/CanvasToolbar.tsx',
                    'src/shared/editor/blocks/insertMenu.tsx',
                  ]}
                >
                  <div
                    style={{
                      position: 'relative',
                      height: 620,
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--ds-border)',
                      background:
                        'linear-gradient(180deg, #3E7EBE 0%, #7FAFD9 34%, #D9E0D2 72%, #F2EFDC 100%)',
                    }}
                  >
                    <CanvasToolbar
                      defaultOpen
                      sections={TOOLBAR_SECTIONS}
                      onPick={(id) => toast(`Insert: ${id}`)}
                      actions={[
                        {
                          id: 'media',
                          label: 'Media',
                          icon: MediaGlyph,
                          onClick: () => toast('Media pressed'),
                        },
                        {
                          id: 'theme',
                          label: 'Theme',
                          icon: Palette,
                          onClick: () => toast('Theme pressed'),
                        },
                        {
                          id: 'background',
                          label: 'Background',
                          icon: Frame,
                          onClick: () => toast('Background pressed'),
                        },
                      ]}
                      onMore={() => toast('More pressed')}
                    />
                  </div>
                </Section>

                <Section
                  id="toolbar-text"
                  title="Floating toolbar — text"
                  files={['src/shared/editor/blocks/FloatingToolbar.tsx']}
                >
                  <div data-editor-chrome="true">
                    <FloatingToolbar
                      inline
                      blockType="heading"
                      style={textStyle}
                      position={{ top: 0, left: 0, width: 0 }}
                      onChangeType={(t) => toast(`Turn into: ${t}`)}
                      onChangeStyle={(key, value) => {
                        setTextStyle((s) => ({ ...s, [key]: value }));
                        toast(`${key} → ${value}`);
                      }}
                      onDelete={() => toast('Delete pressed')}
                      onDuplicate={() => toast('Duplicate pressed')}
                    />
                  </div>
                </Section>

                <Section
                  id="toolbar-image"
                  title="Floating toolbar — image"
                  files={['src/shared/editor/blocks/FloatingToolbar.tsx']}
                >
                  <div data-editor-chrome="true">
                    <FloatingToolbar
                      inline
                      blockType="image"
                      style={imageStyle}
                      position={{ top: 0, left: 0, width: 0 }}
                      onChangeType={(t) => toast(`Turn into: ${t}`)}
                      onChangeStyle={(key, value) => {
                        setImageStyle((s) => ({ ...s, [key]: value }));
                        toast(`${key} → ${value}`);
                      }}
                      onDelete={() => toast('Delete pressed')}
                      onDuplicate={() => toast('Duplicate pressed')}
                    />
                  </div>
                </Section>

                <Section
                  id="toolbar-chart"
                  title="Chart toolbar"
                  files={['src/shared/editor/blocks/ChartToolbar.tsx']}
                >
                  <div data-editor-chrome="true">
                    <ChartToolbar
                      inline
                      config={chartConfig}
                      axes={{ horizontal: 'Value 1', vertical: 'Value 2' }}
                      onChange={(patch) => {
                        setChartConfig((c) => ({ ...c, ...patch }));
                        toast(`${Object.keys(patch).join(', ')} changed`);
                      }}
                      onTurnInto={(family) => toast(`Turn into: ${family}`)}
                      onEditData={() => setChartDataOpen(true)}
                      onExpand={() => toast('Expand pressed')}
                      onDuplicate={() => toast('Duplicate chart')}
                      onDelete={() => toast('Delete chart')}
                    />
                    <ChartDataEditor
                      open={chartDataOpen}
                      data={chartData}
                      onSave={(next) => {
                        setChartData(next);
                        setChartDataOpen(false);
                        toast(`Data saved — ${next.rows.length} rows · ${next.columns.length} columns`);
                      }}
                      onCancel={() => setChartDataOpen(false)}
                    />
                  </div>
                </Section>

                <Section
                  id="toolbar-card"
                  title="Card toolbar"
                  files={['src/shared/editor/blocks/CardToolbar.tsx']}
                >
                  <div data-editor-chrome="true">
                    <CardToolbar
                      inline
                      config={cardConfig}
                      onChange={(patch) => {
                        setCardConfig((c) => ({ ...c, ...patch }));
                        toast(`${Object.keys(patch).join(', ')} changed`);
                      }}
                      onTurnInto={(id) => toast(`Turn into: ${id}`)}
                      onExpand={() => toast('Expand pressed')}
                      onDuplicate={() => toast('Duplicate card')}
                      onDelete={() => toast('Delete card')}
                    />
                  </div>
                </Section>

                <Section
                  id="toolbar-table"
                  title="Table toolbar"
                  files={['src/shared/editor/blocks/TableBlock.tsx']}
                >
                  <div data-editor-chrome="true">
                    <TableToolbar
                      inline
                      onTurnInto={(id) => toast(`Turn into: ${id}`)}
                      onAddRow={() => toast('Add row pressed')}
                      onAddColumn={() => toast('Add column pressed')}
                      onDuplicate={() => toast('Duplicate table')}
                      onDelete={() => toast('Delete table')}
                    />
                  </div>
                </Section>

                <Section
                  id="cards"
                  title="Cards — group selection · detach · metric"
                  files={[
                    'src/shared/editor/blocks/CardBlocks.tsx',
                    'src/shared/editor/blocks/CardToolbar.tsx',
                  ]}
                >
                  <CardStage imageSrc={playgroundImage} />
                </Section>
              </Group>

              {/* ═══ Panels ═════════════════════════════════════════ */}
              <Group
                ids={['panel-content', 'panel-page', 'panel-brand', 'panel-add']}
                label="Panels"
              >
                <Row>
                  <Section
                    id="panel-content"
                    title="Panel — Content outline"
                    files={[
                      'src/features/guideline/builder/panels/ContentPanel.tsx',
                      'src/features/guideline/guideline.css (gl-outline-*)',
                    ]}
                  >
                    <div style={{ width: PANEL_W }}>
                      <GuidelineSidebar
                        eyebrow="Guideline"
                        title="Content"
                        onClose={() => toast('Close pressed')}
                      >
                        <ContentPanel
                          pages={OUTLINE_PAGES}
                          selectedId={outlineSelected}
                          activeId="logo-grid"
                          editedIds={OUTLINE_EDITED}
                          onSelect={setOutlineSelected}
                        />
                      </GuidelineSidebar>
                    </div>
                  </Section>

                  <Section
                    id="panel-page"
                    title="Panel — Page editor"
                    files={[
                      'src/features/guideline/builder/panels/PagePanel.tsx',
                      'src/features/guideline/guideline.css (gl-field, gl-tool)',
                    ]}
                  >
                    <div style={{ width: PANEL_W }}>
                      <GuidelineSidebar
                        eyebrow="Page"
                        title={pageDisplayName(pagePanelPage)}
                        onBack={() => toast('Back pressed')}
                        onClose={() => toast('Close pressed')}
                      >
                        <PagePanel
                          page={pagePanelPage}
                          brand={BRAND}
                          index={3}
                          total={OUTLINE_PAGES.length}
                          isEdited
                          onChange={(patch) => setPagePanelPage((p) => ({ ...p, ...patch }))}
                          onMove={(delta) => toast(`Move ${delta > 0 ? 'down' : 'up'}`)}
                          onDuplicate={() => toast('Duplicate page')}
                          onReset={() => toast('Reset to template')}
                          onRemove={() => setDialog('remove')}
                          onOpenBrand={() => toast('Open the Brand panel')}
                        />
                      </GuidelineSidebar>
                    </div>
                  </Section>

                  <Section
                    id="panel-brand"
                    title="Panel — Brand"
                    files={[
                      'src/features/guideline/builder/panels/BrandPanel.tsx',
                      'src/features/guideline/guideline.css (gl-scope-tag, gl-logo-grid)',
                    ]}
                  >
                    <div style={{ width: PANEL_W }}>
                      <GuidelineSidebar
                        eyebrow={brandSection ? 'Brand' : 'Guideline'}
                        title={brandSection ? BRAND_SECTION_LABEL[brandSection] : 'Brand'}
                        onBack={brandSection ? () => setBrandSection(null) : undefined}
                        onClose={() => toast('Close pressed')}
                      >
                        <BrandPanel
                          brand={BRAND}
                          view={view_}
                          slug="raqm"
                          overrides={{}}
                          section={brandSection}
                          onSection={setBrandSection}
                          onSetOverride={(key, value) =>
                            toast(`Override ${String(key)} → ${String(value)}`)
                          }
                          onRequestBrandChange={setBrandChange}
                          onEditStrategy={(card) => toast(`Edit strategy: ${card.name}`)}
                          onOpenTypeEditor={() => toast('Open typescale editor')}
                        />
                      </GuidelineSidebar>
                    </div>
                  </Section>

                  <Section
                    id="panel-add"
                    title="Panel — Add page"
                    files={['src/features/guideline/builder/panels/AddPagePanel.tsx']}
                  >
                    <div style={{ width: PANEL_W }}>
                      <GuidelineSidebar
                        eyebrow="Guideline"
                        title="Add page"
                        onClose={() => toast('Close pressed')}
                      >
                        <AddPagePanel
                          insertAfterLabel="page 3 · Colour ratio"
                          onAdd={(typeId) => toast(`Add page: ${typeId}`)}
                        />
                      </GuidelineSidebar>
                    </div>
                  </Section>
                </Row>
              </Group>

              {/* ═══ Controls ═══════════════════════════════════════ */}
              <Group
                ids={['rail', 'undo', 'save', 'labels', 'insert', 'confirm']}
                label="Controls"
              >
                <Row>
                  <Section id="rail" title="Rail — DsRail" files={['src/shared/ds (DsRail)']}>
                    <DsRail
                      items={RAIL_ITEMS}
                      value={railValue}
                      onChange={(next) => setRailValue(next as RailMode | null)}
                      aria-label="Guideline tools (lab)"
                    />
                  </Section>

                  <Section
                    id="undo"
                    title="Undo / redo"
                    files={['src/features/guideline/builder/GuidelineBuilder.tsx (UndoRedo)']}
                  >
                    <UndoRedo />
                  </Section>

                  <Section
                    id="save"
                    title="Save indicator"
                    files={['src/features/guideline/builder/GuidelineBuilder.tsx (SaveIndicator)']}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <SaveIndicator state="idle" loaded={false} />
                      <SaveIndicator state="idle" loaded />
                      <SaveIndicator state="saving" loaded />
                      <SaveIndicator state="saved" loaded />
                      <SaveIndicator state="error" loaded />
                    </div>
                  </Section>

                  <Section
                    id="labels"
                    title="Page labels"
                    files={['src/features/guideline/builder/GuidelinePageCard.tsx (caption markup)']}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="gl-page-label">
                        <span className="gl-page-num">04</span>
                        <span className="gl-page-name">Colour ratio</span>
                      </div>
                      <div className="gl-page" data-selected style={{ gap: 0 }}>
                        <div className="gl-page-label">
                          <span className="gl-page-num">04</span>
                          <span className="gl-page-name">Colour ratio (selected)</span>
                          <span className="gl-page-edited">Edited</span>
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section
                    id="insert"
                    title="Insert bar"
                    files={['src/features/guideline/builder/GuidelineBuilder.tsx (InsertBar)']}
                  >
                    <div
                      style={{
                        width: 340,
                        border: '1px dashed var(--ds-border)',
                        borderRadius: 8,
                        padding: '4px 24px',
                      }}
                    >
                      <InsertBar index={0} onInsert={(i) => toast(`Insert at ${i}`)} />
                      <InsertBar index={1} last onInsert={(i) => toast(`Insert at ${i}`)} />
                    </div>
                  </Section>

                  <Section
                    id="confirm"
                    title="Confirmations"
                    files={['src/shared/ds (DsConfirmDialog) — copy in GuidelineBuilder.tsx']}
                  >
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <LabButton onClick={() => setDialog('remove')}>Remove page…</LabButton>
                      <LabButton onClick={() => setDialog('rebuild')}>Rebuild…</LabButton>
                      <LabButton
                        onClick={() =>
                          setBrandChange({
                            title: `Update ${BRAND.name}’s primary colour?`,
                            detail:
                              'This is a brand value, so it changes the brand itself. Anything that reads it — this guideline, generated copy, the brand kit — picks up the new answer.',
                            apply: async () => {},
                          })
                        }
                      >
                        Brand change…
                      </LabButton>
                    </div>
                  </Section>
                </Row>
              </Group>

              {/* ═══ Document ═══════════════════════════════════════ */}
              <Group ids={['doc-header']} label="Document">
                <Section
                  id="doc-header"
                  title="Document header"
                  files={['src/features/guideline/builder/GuidelineBuilder.tsx (doc head markup)']}
                >
                  <header className="gl-doc-head" style={{ padding: 0 }}>
                    <div>
                      <span className="gl-doc-eyebrow">Brand Guidelines</span>
                      <h1 className="gl-doc-title">{BRAND.name}</h1>
                    </div>
                    <div className="gl-doc-meta">
                      <span>30 pages</span>
                      <span className="gl-doc-dot" />
                      <SaveIndicator state="saved" loaded />
                      <span className="gl-doc-dot" />
                      <button
                        type="button"
                        className="gl-link-btn"
                        onClick={() => setDialog('rebuild')}
                      >
                        Rebuild
                      </button>
                    </div>
                  </header>
                </Section>
              </Group>

              {/* ═══ Stage ══════════════════════════════════════════ */}
              <Group ids={['stage']} label="Stage">
                <Section
                  id="stage"
                  title="Live stage — everything together"
                  files={[
                    'src/features/guideline/builder/GuidelinePageCard.tsx',
                    'src/features/guideline/guideline.css (gl-page-frame, gl-page-canvas)',
                  ]}
                >
                  <div className="gl-doc" style={{ maxWidth: 860, margin: '0 auto' }}>
                    {STAGE_PAGES.map((page, index) => (
                      <div key={page.id} className="gl-doc-slot">
                        <InsertBar
                          index={index}
                          onInsert={(i) => toast(`Insert requested at position ${i}`)}
                        />
                        <GuidelinePageCard
                          page={page}
                          index={index}
                          total={STAGE_PAGES.length}
                          sectionIndex={0}
                          brand={BRAND}
                          layout={LAYOUT}
                          selected={page.id === stageSelected}
                          onSelect={() => setStageSelected(page.id)}
                          onEdit={() => {}}
                          onFlush={() => {}}
                          onRename={(title) => toast(`Rename to: ${title ?? '(type name)'}`)}
                        />
                      </div>
                    ))}
                    <InsertBar
                      index={STAGE_PAGES.length}
                      last
                      onInsert={(i) => toast(`Insert requested at position ${i}`)}
                    />
                  </div>
                </Section>
              </Group>
            </main>
          </div>
        </div>

        <DsConfirmDialog
          open={dialog === 'remove'}
          title="Remove this page?"
          description="The page and any edits you made to it are deleted. Other pages are unaffected."
          confirmLabel="Remove page"
          onConfirm={() => {
            setDialog(null);
            toast('Demo only — nothing was removed');
          }}
          onCancel={() => setDialog(null)}
        />
        <DsConfirmDialog
          open={dialog === 'rebuild'}
          title="Rebuild from the brand?"
          description="The page list goes back to the default order, so pages you added are removed and pages you deleted come back. Edits you made to a page are kept."
          confirmLabel="Rebuild"
          onConfirm={() => {
            setDialog(null);
            toast('Demo only — nothing was rebuilt');
          }}
          onCancel={() => setDialog(null)}
        />
        <DsConfirmDialog
          open={brandChange !== null}
          title={brandChange?.title ?? ''}
          description={brandChange?.detail ?? ''}
          confirmLabel="Update the brand"
          cancelLabel="Cancel"
          onConfirm={() => {
            setBrandChange(null);
            toast('Demo only — the brand was not written');
          }}
          onCancel={() => setBrandChange(null)}
        />
      </WorkspaceShell>
    </LabView.Provider>
  );
}

/* ── Lab chrome — the page's own scaffolding, deliberately local ──── */

/** The floating component list — the builder's own `.panel` vocabulary
 *  (panel / panel-top / panel-list / panel-group-label / panel-item), so
 *  the lab's chrome looks like the product it previews. */
function Sidebar({ view, onPick }: { view: string; onPick: (id: string) => void }) {
  const item = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      className={`panel-item${view === id ? ' is-active' : ''}`}
      onClick={() => onPick(id)}
      style={{ cursor: 'pointer', fontSize: 12.5 }}
    >
      {label}
    </button>
  );
  return (
    <nav aria-label="Lab components" className="panel">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Lab</span>
          <span className="panel-heading-title">Components</span>
        </div>
      </div>
      <div className="panel-list">
        {item('all', 'All')}
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="panel-group-label">{g.group}</div>
            {g.items.map((i) => item(i.id, i.label))}
          </div>
        ))}
      </div>
    </nav>
  );
}

/** A titled cluster of cards. Hidden entirely when the picked view is a
 *  section outside it; chrome-less when showing a single section. */
function Group({
  label,
  ids,
  children,
}: {
  label: string;
  ids: string[];
  children: React.ReactNode;
}) {
  const { view } = useContext(LabView);
  if (view !== 'all' && !ids.includes(view)) return null;
  if (view !== 'all') return <>{children}</>;
  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ds-text-muted)',
          }}
        >
          {label}
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--ds-border)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>{children}</div>
    </div>
  );
}

/** Cards that sit side by side and wrap — no fixed columns, no overlap. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {children}
    </div>
  );
}

/** One component preview: compact header (title + file paths), then the
 *  card. In All view the title is a button that opens the component alone. */
function Section({
  id,
  title,
  files,
  children,
}: {
  id: string;
  title: string;
  files: string[];
  children: React.ReactNode;
}) {
  const { view, open } = useContext(LabView);
  if (view !== 'all' && view !== id) return null;
  const inAll = view === 'all';
  return (
    <section id={id} style={{ minWidth: 0, maxWidth: '100%' }}>
      <div style={{ marginBottom: 8 }}>
        {inAll ? (
          <button
            type="button"
            onClick={() => open(id)}
            title="Open this component alone"
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--ds-text)',
              fontFamily: 'inherit',
            }}
          >
            {title} <span style={{ color: 'var(--ds-text-muted)', fontWeight: 400 }}>↗</span>
          </button>
        ) : (
          <h2
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--ds-text)',
            }}
          >
            {title}
          </h2>
        )}
        {files.map((f) => (
          <div
            key={f}
            style={{
              fontFamily: 'var(--ds-font-mono, monospace)',
              fontSize: 10,
              color: 'var(--ds-text-muted)',
              marginTop: 2,
            }}
          >
            {f}
          </div>
        ))}
      </div>
      <div
        style={{
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-card, 14px)',
          background: 'var(--ds-surface)',
          padding: 20,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function LabButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: 12.5,
        borderRadius: 'var(--ds-radius-control, 8px)',
        border: '1px solid var(--ds-border)',
        background: active ? 'var(--ds-surface-hover)' : 'var(--ds-surface)',
        color: 'var(--ds-text)',
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}
