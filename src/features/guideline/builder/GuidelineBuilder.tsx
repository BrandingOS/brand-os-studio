/**
 * The Brand Guidelines builder — /b/:slug/guideline.
 *
 * A vertical document, not a canvas. Pages are read the way the finished PDF
 * is read: top to bottom, one column, real size. No infinite plane, no
 * horizontal slide flipping — a brand book has an order, and scrolling is how
 * people move through one.
 *
 * The chrome is the Studio's, not this feature's. `WorkspaceShell` +
 * `.shell` + `.panel` + `DsRail` are what Setup, Brand Kit and Tools already
 * render. The structure is this file's own: a fixed-height LAYERED shell —
 * the document owns the full width so the slides always center on the
 * viewport, and the rail + panel float above its left edge (Chronicle's
 * model). Only the document scrolls; a brand book is long, and tools that
 * ride away with it are tools you have to scroll back for.
 *
 * State lives in four places, and the split is load-bearing:
 *   the page list + guideline-scoped brand values → `useGuidelineDocStore`
 *     (small, synchronous — it decides empty-state vs builder on first paint)
 *   a page's edited HTML → IndexedDB via `useGuidelineSnapshots`
 *     (large, and keyed so edits made before this page existed still load)
 *   undo/redo over the document → `useGuidelineHistory` on `@/shared/history`
 *   selection, scroll, which panel is open → component state
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutList, Palette, Plus, Redo2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { DsConfirmDialog, DsRail, type DsRailItem } from '@/shared/ds';
import { getLayoutById } from '@/shared/editor';
import { useUndoScope, useUndoState } from '@/shared/history';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import type { Brand } from '@/shared/types/brand';
import { StrategyEditorModal, type StrategyEditTarget } from '@/features/setup/components/StrategyEditorModal';
import { EmbeddedTypescaleDialog } from '@/features/tools/typescale/EmbeddedTypescaleDialog';
import { STRATEGY_CARDS, contentOf, selectionOf, type StrategyCard } from '@/features/setup/data/strategyCards';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { pageDisplayName, sectionIndexes as computeSectionIndexes } from '../model/document';
import type { GuidelineOverrides } from '../model/document';
import { BRAND_SECTION_LABEL, type BrandSection } from '../model/brandSections';
import { applyGuidelineOverrides } from '../model/effectiveBrand';
import { brandView, editBrand, type BrandChange } from '../model/brandWrites';
import { guidelineEditorKey, useGuidelineDocStore } from '../model/guidelineDocStore';
import { GuidelineEmptyState } from './GuidelineEmptyState';
import { GuidelinePageCard } from './GuidelinePageCard';
import { GuidelineSidebar } from './GuidelineSidebar';
import { AddPagePanel } from './panels/AddPagePanel';
import { BrandPanel } from './panels/BrandPanel';
import { ContentPanel } from './panels/ContentPanel';
import { PagePanel } from './panels/PagePanel';
import { useGuidelineHistory } from './useGuidelineHistory';
import { useGuidelineSnapshots } from './useGuidelineSnapshots';
import '../guideline.css';

/**
 * One chrome layout for every page.
 *
 * At MVP each page type has exactly one design, header and footer included.
 * A layout switcher would be a choice with no consequence the user asked for.
 */
const PAGE_LAYOUT = getLayoutById('hyperhyve');

export type RailMode = 'content' | 'brand' | 'add';

export const RAIL_ITEMS: DsRailItem[] = [
  { value: 'content', label: 'Content', icon: <LayoutList size={17} strokeWidth={1.8} aria-hidden /> },
  { value: 'brand', label: 'Brand', icon: <Palette size={17} strokeWidth={1.8} aria-hidden /> },
  { value: 'add', label: 'Add', icon: <Plus size={17} strokeWidth={1.8} aria-hidden /> },
];

export function GuidelineBuilder({ brand, slug }: { brand: Brand; slug: string }) {
  const doc = useGuidelineDocStore((s) => s.docs[brand.id]);
  const build = useGuidelineDocStore((s) => s.build);
  const [building, setBuilding] = useState(false);

  const onBuild = useCallback(() => {
    setBuilding(true);
    try {
      build(brand);
      toast.success('Brand guidelines built');
    } finally {
      setBuilding(false);
    }
  }, [brand, build]);

  if (!doc) {
    return (
      <WorkspaceShell>
        <GuidelineEmptyState brand={brand} slug={slug} onBuild={onBuild} building={building} />
      </WorkspaceShell>
    );
  }

  return <BuiltGuideline brand={brand} slug={slug} />;
}

function BuiltGuideline({ brand, slug }: { brand: Brand; slug: string }) {
  const doc = useGuidelineDocStore((s) => s.docs[brand.id])!;
  const store = useGuidelineDocStore.getState();

  const editorKey = guidelineEditorKey(brand.id);
  const { snapshots, loaded, saveState, queue, saveNow, reset } = useGuidelineSnapshots(editorKey);

  const [mode, setMode] = useState<RailMode | null>('content');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | undefined>();
  const [brandSection, setBrandSection] = useState<BrandSection | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [brandChange, setBrandChange] = useState<BrandChange | null>(null);
  const [applyingBrand, setApplyingBrand] = useState(false);
  const [strategyTarget, setStrategyTarget] = useState<StrategyEditTarget | null>(null);
  const [typeEditorOpen, setTypeEditorOpen] = useState(false);
  // State, not a ref: the deferred-render observers in every page card need
  // this element as their root, and a ref does not re-render them when it fills.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const pages = doc.pages;
  const overrides = useMemo(() => doc.overrides ?? {}, [doc.overrides]);
  const sectionIndexes = useMemo(() => computeSectionIndexes(pages), [pages]);

  const pageName = useCallback(
    (id: string) => {
      const page = useGuidelineDocStore.getState().get(brand.id)?.pages.find((p) => p.id === id);
      return page ? pageDisplayName(page) : 'page';
    },
    [brand.id],
  );

  const { actions, scope } = useGuidelineHistory(brand.id, pageName);
  useUndoScope(scope);

  // Pages render from the brand PLUS this guideline's own values. The real
  // brand is passed separately to the Brand panel, which compares the two.
  const effectiveBrand = useMemo(
    () => applyGuidelineOverrides(brand, overrides),
    [brand, overrides],
  );
  const view = useMemo(() => brandView(brand), [brand]);

  const editedIds = useMemo(() => new Set(Object.keys(snapshots)), [snapshots]);
  const selectedIndex = selectedId ? pages.findIndex((p) => p.id === selectedId) : -1;
  const selectedPage = selectedIndex >= 0 ? pages[selectedIndex] : undefined;

  const scrollToPage = useCallback((pageId: string) => {
    // rAF so a page that has just been inserted exists in the DOM first.
    requestAnimationFrame(() => {
      // `center`, matching the snap alignment — `start` would glide to the
      // top and then visibly re-snap to the middle.
      document.getElementById(`gl-page-${pageId}`)?.scrollIntoView({
        behavior: 'smooth', block: 'center',
      });
    });
  }, []);

  const selectPage = useCallback((pageId: string) => {
    setSelectedId(pageId);
    setMode('content');
    scrollToPage(pageId);
  }, [scrollToPage]);

  // Which page is filling the view — highlights the outline while the user
  // scrolls, with no selection involved. The document column is the scroll
  // container AND the observer's root, so no margin has to be subtracted for
  // chrome: nothing overlaps it.
  useEffect(() => {
    const root = scrollEl;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.gl-page'));
    if (nodes.length === 0) return;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.pageId;
          if (id) ratios.set(id, entry.intersectionRatio);
        }
        let best: string | undefined;
        let bestRatio = 0;
        ratios.forEach((ratio, id) => { if (ratio > bestRatio) { bestRatio = ratio; best = id; } });
        if (best) setActiveId(best);
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages, scrollEl]);

  // `DsRail` owns toggle-to-close and hands back null for it.
  const onRail = useCallback((next: RailMode | null) => {
    setMode(next);
    if (next === null) return;
    if (next === 'add') {
      const anchor = selectedId ?? activeId;
      const at = anchor ? pages.findIndex((p) => p.id === anchor) : -1;
      setInsertAt(at >= 0 ? at + 1 : pages.length);
    }
    if (next !== 'content') setSelectedId(undefined);
    if (next !== 'brand') setBrandSection(null);
  }, [selectedId, activeId, pages]);

  const openInsert = useCallback((index: number) => {
    setInsertAt(index);
    setMode('add');
    setSelectedId(undefined);
  }, []);

  const addPage = useCallback((typeId: string) => {
    const at = insertAt ?? pages.length;
    const page = actions.insertPage(typeId, at);
    if (!page) return;
    setInsertAt(at + 1);
    selectPage(page.id);
  }, [insertAt, pages.length, actions, selectPage]);

  const removePage = useCallback(async (pageId: string) => {
    actions.removePage(pageId);
    // Delete the page's edits too — leaving them would resurrect old content
    // if a page of the same type were added back, since the first instance of
    // a type reuses the type id.
    await reset(pageId);
    setSelectedId(undefined);
    setConfirmRemove(null);
  }, [actions, reset]);

  const rebuild = useCallback(() => {
    store.build(brand);
    setSelectedId(undefined);
    setConfirmRebuild(false);
    toast.success('Rebuilt from the brand');
  }, [store, brand]);

  const applyBrandChange = useCallback(async () => {
    if (!brandChange) return;
    setApplyingBrand(true);
    try {
      await brandChange.apply();
      toast.success(`${brand.name} updated`);
    } catch (err) {
      console.error('[guideline] brand update failed', err);
      toast.error('Could not update the brand — your guideline is unchanged.');
    } finally {
      setApplyingBrand(false);
      setBrandChange(null);
    }
  }, [brandChange, brand.name]);

  const onEditStrategy = useCallback((card: StrategyCard) => {
    setStrategyTarget({
      card,
      selected: selectionOf(card, view.strategy),
      text: contentOf(card, view.strategy),
    });
  }, [view.strategy]);

  const onSaveStrategy = useCallback((next: { key: StrategyCard['key']; value: string | string[] }) => {
    const card = STRATEGY_CARDS.find((c) => c.key === next.key);
    setStrategyTarget(null);
    setBrandChange(editBrand(
      brand,
      {
        title: `Update ${brand.name}’s ${(card?.name ?? next.key).toLowerCase()}?`,
        detail: (
          <>This is brand strategy, so it changes the brand itself. Anything that
          reads it — this guideline, generated copy, the brand kit — picks up the
          new answer.</>
        ),
      },
      (draft): MockBrand => ({
        ...draft,
        strategy: { ...draft.strategy, [next.key]: next.value } as MockBrand['strategy'],
      }),
    ));
  }, [brand]);

  const insertLabel = useMemo(() => {
    const at = insertAt ?? pages.length;
    if (at >= pages.length) return 'the end';
    if (at <= 0) return 'the start';
    return `page ${at} · ${pageDisplayName(pages[at - 1])}`;
  }, [insertAt, pages]);

  const panel = resolvePanel({ mode, selectedPage, brandSection });

  return (
    <WorkspaceShell rightActions={<UndoRedo />}>
      <div className="shell gl-shell" data-sidebar={mode ? 'open' : 'closed'}>
        <DsRail
          items={RAIL_ITEMS}
          value={mode}
          onChange={(next) => onRail(next as RailMode | null)}
          aria-label="Guideline tools"
        />

        {mode && (
          <GuidelineSidebar
            eyebrow={panel.eyebrow}
            title={panel.title}
            onBack={panel.onBack === 'page' ? () => setSelectedId(undefined)
              : panel.onBack === 'brand' ? () => setBrandSection(null)
              : undefined}
            onClose={() => setMode(null)}
          >
            {mode === 'content' && selectedPage && (
              <PagePanel
                page={selectedPage}
                brand={effectiveBrand}
                index={selectedIndex}
                total={pages.length}
                isEdited={editedIds.has(selectedPage.id)}
                onChange={(patch) => actions.updatePage(selectedPage.id, patch)}
                onMove={(delta) => { actions.movePage(selectedPage.id, delta); scrollToPage(selectedPage.id); }}
                onDuplicate={() => {
                  const copy = actions.duplicatePage(selectedPage.id);
                  if (copy) selectPage(copy.id);
                }}
                onReset={async () => { await reset(selectedPage.id); toast.success('Page reset to the template'); }}
                onRemove={() => setConfirmRemove(selectedPage.id)}
                onOpenBrand={() => { setSelectedId(undefined); setMode('brand'); }}
              />
            )}

            {mode === 'content' && !selectedPage && (
              <ContentPanel
                pages={pages}
                selectedId={selectedId}
                activeId={activeId}
                editedIds={editedIds}
                onSelect={selectPage}
              />
            )}

            {mode === 'brand' && (
              <BrandPanel
                brand={brand}
                view={view}
                slug={slug}
                overrides={overrides}
                section={brandSection}
                onSection={setBrandSection}
                onSetOverride={actions.setOverride}
                onRequestBrandChange={setBrandChange}
                onEditStrategy={onEditStrategy}
                onOpenTypeEditor={() => setTypeEditorOpen(true)}
              />
            )}

            {mode === 'add' && <AddPagePanel insertAfterLabel={insertLabel} onAdd={addPage} />}
          </GuidelineSidebar>
        )}

        <div className="gl-doc-scroll" ref={setScrollEl}>
          <header className="gl-doc-head">
            <div>
              <span className="gl-doc-eyebrow">Brand Guidelines</span>
              <h1 className="gl-doc-title">{brand.name}</h1>
            </div>
            <div className="gl-doc-meta">
              <span>{pages.length} pages</span>
              <span className="gl-doc-dot" />
              <SaveIndicator state={saveState} loaded={loaded} />
              <span className="gl-doc-dot" />
              <button type="button" className="gl-link-btn" onClick={() => setConfirmRebuild(true)}>
                Rebuild
              </button>
            </div>
          </header>

          <div className="gl-doc">
            {pages.map((page, index) => (
              <div key={page.id} className="gl-doc-slot">
                <InsertBar index={index} onInsert={openInsert} />
                <GuidelinePageCard
                  page={page}
                  index={index}
                  total={pages.length}
                  sectionIndex={sectionIndexes[page.id] ?? 0}
                  brand={effectiveBrand}
                  layout={PAGE_LAYOUT}
                  snapshot={loaded ? snapshots[page.id] : undefined}
                  selected={page.id === selectedId}
                  onSelect={() => selectPage(page.id)}
                  onEdit={queue}
                  onFlush={saveNow}
                  onRename={(name) => actions.updatePage(page.id, { name })}
                  viewRoot={scrollEl}
                />
              </div>
            ))}
            <InsertBar index={pages.length} onInsert={openInsert} last />
          </div>

          <footer className="gl-doc-foot">
            Pages are filled in from this brand. Change what they draw from in{' '}
            <Link to={`/b/${slug}/setup`}>Setup</Link>.
          </footer>
        </div>
      </div>

      <DsConfirmDialog
        open={confirmRemove !== null}
        title="Remove this page?"
        description="The page and any edits you made to it are deleted. Other pages are unaffected."
        confirmLabel="Remove page"
        onConfirm={() => confirmRemove && removePage(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />

      <DsConfirmDialog
        open={brandChange !== null}
        title={brandChange?.title ?? ''}
        description={brandChange?.detail ?? ''}
        confirmLabel={applyingBrand ? 'Updating…' : 'Update the brand'}
        cancelLabel="Cancel"
        onConfirm={applyBrandChange}
        onCancel={() => setBrandChange(null)}
      />

      <DsConfirmDialog
        open={confirmRebuild}
        title="Rebuild from the brand?"
        description="The page list goes back to the default order, so pages you added are removed and pages you deleted come back. Edits you made to a page are kept."
        confirmLabel="Rebuild"
        onConfirm={rebuild}
        onCancel={() => setConfirmRebuild(false)}
      />

      {/* Setup's own editors, mounted at the shell rather than in the panel:
          `.panel` is sticky, which creates a stacking context, so a scrim
          inside it paints under the document. */}
      <StrategyEditorModal target={strategyTarget} onClose={() => setStrategyTarget(null)} onSave={onSaveStrategy} />
      <EmbeddedTypescaleDialog brandId={brand.id} open={typeEditorOpen} onOpenChange={setTypeEditorOpen} />
    </WorkspaceShell>
  );
}

/** What the sidebar header says, and whether it has a way back. */
function resolvePanel({
  mode, selectedPage, brandSection,
}: {
  mode: RailMode | null;
  selectedPage: { id: string; type: string; title?: string } | undefined;
  brandSection: BrandSection | null;
}): { eyebrow: string; title: string; onBack?: 'page' | 'brand' } {
  if (mode === 'content' && selectedPage) {
    return { eyebrow: 'Page', title: pageDisplayName(selectedPage), onBack: 'page' };
  }
  if (mode === 'brand' && brandSection) {
    return { eyebrow: 'Brand', title: BRAND_SECTION_LABEL[brandSection], onBack: 'brand' };
  }
  if (mode === 'brand') return { eyebrow: 'Guideline', title: 'Brand' };
  if (mode === 'add') return { eyebrow: 'Guideline', title: 'Add page' };
  return { eyebrow: 'Guideline', title: 'Content' };
}

export function UndoRedo() {
  const { canUndo, canRedo, undo, redo, undoLabel, redoLabel } = useUndoState();
  return (
    <div className="gl-undo-group">
      <button
        type="button"
        className="gl-icon-btn"
        onClick={undo}
        disabled={!canUndo}
        title={undoLabel ? `Undo ${undoLabel}` : 'Undo'}
        aria-label="Undo"
      >
        <Undo2 size={16} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        className="gl-icon-btn"
        onClick={redo}
        disabled={!canRedo}
        title={redoLabel ? `Redo ${redoLabel}` : 'Redo'}
        aria-label="Redo"
      >
        <Redo2 size={16} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}

/**
 * The hairline between two pages that becomes a "+" on hover.
 *
 * Always in the DOM rather than mounted on hover, so it is reachable by
 * keyboard — a hover-only control is invisible to anyone not using a mouse.
 */
export function InsertBar({
  index, onInsert, last,
}: {
  index: number;
  onInsert: (index: number) => void;
  last?: boolean;
}) {
  return (
    <div className={`gl-insert${last ? ' is-last' : ''}`}>
      <button
        type="button"
        className="gl-insert-btn"
        onClick={() => onInsert(index)}
        aria-label={last ? 'Add a page at the end' : `Add a page before page ${index + 1}`}
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

export function SaveIndicator({ state, loaded }: { state: string; loaded: boolean }) {
  if (!loaded) return <span className="gl-save">Loading edits…</span>;
  if (state === 'saving' || state === 'pending') return <span className="gl-save">Saving…</span>;
  if (state === 'error') return <span className="gl-save is-error">Not saved</span>;
  if (state === 'saved') return <span className="gl-save is-ok">All changes saved</span>;
  return <span className="gl-save">Edits save automatically</span>;
}
