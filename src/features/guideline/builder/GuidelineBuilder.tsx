/**
 * The Brand Guidelines builder — /b/:slug/guideline.
 *
 * A vertical document, not a canvas. Pages are read the way the finished PDF is
 * read: top to bottom, one column, real size. There is no infinite plane, no
 * horizontal slide flipping and no zoom, because a brand book has an order and
 * scrolling is how people move through one.
 *
 * Three regions:
 *   rail     — Content · Brand · Add page. Always visible.
 *   sidebar  — the active panel, collapsible. Drills into a page when one is
 *              selected, and comes back out.
 *   document — the pages.
 *
 * Where state lives, and why it is split three ways:
 *   the page LIST and the guideline's brand overrides → `useGuidelineDocStore`
 *     (small, synchronous, per brand — it decides empty-state vs builder on
 *      first paint, so it cannot be async)
 *   a page's EDITED HTML → IndexedDB via `useGuidelineSnapshots`
 *     (large, and keyed so edits made before this page existed still load)
 *   selection, scroll position, which panel is open → component state
 *     (session-scoped; persisting a selection would be noise)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DsConfirmDialog } from '@/shared/ds';
import { getLayoutById } from '@/shared/editor';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { pageDisplayName, sectionIndexes as computeSectionIndexes } from '../model/document';
import type { GuidelineOverrides } from '../model/document';
import {
  applyGuidelineOverrides, brandPatchFor, brandValueFor, OVERRIDE_LABEL,
} from '../model/effectiveBrand';
import { guidelineEditorKey, useGuidelineDocStore } from '../model/guidelineDocStore';
import { GuidelineEmptyState } from './GuidelineEmptyState';
import { GuidelinePageCard } from './GuidelinePageCard';
import { GuidelineRail, type RailMode } from './GuidelineRail';
import { GuidelineSidebar } from './GuidelineSidebar';
import { AddPagePanel } from './panels/AddPagePanel';
import { BrandPanel } from './panels/BrandPanel';
import { ContentPanel } from './panels/ContentPanel';
import { PagePanel } from './panels/PagePanel';
import { useGuidelineSnapshots } from './useGuidelineSnapshots';
import '../guideline.css';

/**
 * One chrome layout for every page.
 *
 * At MVP each page type has exactly one design, and that includes its header
 * and footer. Exposing a layout switcher would be a choice with no consequence
 * the user asked for — and `EditorWorkspace` already owns that control for
 * decks that want it.
 */
const PAGE_LAYOUT = getLayoutById('hyperhyve');

const PANEL_TITLES: Record<RailMode, string> = {
  content: 'Content',
  brand: 'Brand',
  add: 'Add page',
};

export function GuidelineBuilder({ brand, slug }: { brand: Brand; slug: string }) {
  const doc = useGuidelineDocStore((s) => s.docs[brand.id]);
  const build = useGuidelineDocStore((s) => s.build);

  const [building, setBuilding] = useState(false);

  const onBuild = useCallback(() => {
    setBuilding(true);
    // Synchronous in practice; the flag exists so the button cannot be
    // double-fired and so a future server-backed build has somewhere to land.
    try {
      build(brand);
      toast.success('Brand guidelines built');
    } finally {
      setBuilding(false);
    }
  }, [brand, build]);

  if (!doc) {
    return (
      <div className="gl-builder is-empty">
        <GuidelineEmptyState brand={brand} slug={slug} onBuild={onBuild} building={building} />
      </div>
    );
  }

  return <BuiltGuideline brand={brand} slug={slug} />;
}

function BuiltGuideline({ brand, slug }: { brand: Brand; slug: string }) {
  const doc = useGuidelineDocStore((s) => s.docs[brand.id])!;
  // Actions only — the document itself is subscribed above. `getState()` keeps
  // this out of the render-subscription path; the action references are stable.
  const store = useGuidelineDocStore.getState();

  const editorKey = guidelineEditorKey(brand.id);
  const { snapshots, loaded, saveState, queue, saveNow, reset } = useGuidelineSnapshots(editorKey);

  const [mode, setMode] = useState<RailMode | null>('content');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | undefined>();
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  // Pushing a guideline value onto the brand is confirmed HERE rather than in
  // the Brand panel: `.gl-sidebar` is sticky, which creates a stacking context,
  // and a modal scrim inside it paints under the document instead of over it.
  const [confirmBrandKey, setConfirmBrandKey] = useState<keyof GuidelineOverrides | null>(null);
  const [applyingToBrand, setApplyingToBrand] = useState(false);
  const updateBrand = useBrandStore((s) => s.update);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pages = doc.pages;
  // Documents written before `overrides` existed have none; memoized so the
  // fallback object does not re-key every consumer on each render.
  const overrides = useMemo(() => doc.overrides ?? {}, [doc.overrides]);
  const sectionIndexes = useMemo(() => computeSectionIndexes(pages), [pages]);

  // The pages render from the brand PLUS this guideline's own overrides. The
  // real brand is passed separately to the Brand panel, which needs to compare
  // the two.
  const effectiveBrand = useMemo(
    () => applyGuidelineOverrides(brand, overrides),
    [brand, overrides],
  );

  const editedIds = useMemo(() => new Set(Object.keys(snapshots)), [snapshots]);
  const selectedIndex = selectedId ? pages.findIndex((p) => p.id === selectedId) : -1;
  const selectedPage = selectedIndex >= 0 ? pages[selectedIndex] : undefined;

  const scrollToPage = useCallback((pageId: string) => {
    // rAF so a page that has just been inserted exists in the DOM first.
    requestAnimationFrame(() => {
      document.getElementById(`gl-page-${pageId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  const selectPage = useCallback((pageId: string) => {
    setSelectedId(pageId);
    setMode('content');
    scrollToPage(pageId);
  }, [scrollToPage]);

  // Which page is filling the viewport — highlights the outline while the user
  // scrolls, with no selection involved.
  //
  // The viewport is the scroll container: the document scrolls with the page
  // under the Studio top bar, and the rail and sidebar are sticky beside it.
  // The negative top margin discounts the band the top bar covers, so a page
  // hidden behind the chrome does not count as the one being read.
  useEffect(() => {
    const root = scrollRef.current;
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
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) { bestRatio = ratio; best = id; }
        });
        if (best) setActiveId(best);
      },
      { rootMargin: '-90px 0px 0px 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  const onRail = useCallback((next: RailMode) => {
    setMode((current) => (current === next ? null : next));
    if (next === 'add') {
      // Default insertion point: right after whatever the user is looking at.
      const anchor = selectedId ?? activeId;
      const at = anchor ? pages.findIndex((p) => p.id === anchor) : -1;
      setInsertAt(at >= 0 ? at + 1 : pages.length);
    }
    if (next !== 'content') setSelectedId(undefined);
  }, [selectedId, activeId, pages]);

  const openInsert = useCallback((index: number) => {
    setInsertAt(index);
    setMode('add');
    setSelectedId(undefined);
  }, []);

  const addPage = useCallback((typeId: string) => {
    const at = insertAt ?? pages.length;
    const page = store.insertPage(brand.id, typeId, at);
    if (!page) return;
    setInsertAt(at + 1);
    selectPage(page.id);
  }, [insertAt, pages.length, store, brand.id, selectPage]);

  const removePage = useCallback(async (pageId: string) => {
    store.removePage(brand.id, pageId);
    // Delete the page's edits too. Leaving them would silently resurrect old
    // content if a page of the same type were added back later — the first
    // instance of a type reuses the type id.
    await reset(pageId);
    setSelectedId(undefined);
    setConfirmRemove(null);
    toast.success('Page removed');
  }, [store, brand.id, reset]);

  const rebuild = useCallback(() => {
    store.build(brand);
    setSelectedId(undefined);
    setConfirmRebuild(false);
    toast.success('Rebuilt from the brand');
  }, [store, brand]);

  const setOverride = useCallback(
    (key: keyof GuidelineOverrides, value: string | undefined) =>
      store.setOverride(brand.id, key, value),
    [store, brand.id],
  );

  const applyToBrand = useCallback(async (key: keyof GuidelineOverrides) => {
    const value = overrides[key];
    if (!value) return;
    setApplyingToBrand(true);
    try {
      await updateBrand(brand.id, brandPatchFor(brand, key, value));
      // The brand holds this value now, so the override has nothing left to
      // say — leaving it would mark two identical values as different forever.
      store.setOverride(brand.id, key, undefined);
      toast.success(`${OVERRIDE_LABEL[key]} updated on ${brand.name}`);
    } catch (err) {
      console.error('[guideline] brand update failed', err);
      toast.error('Could not update the brand — your guideline is unchanged.');
    } finally {
      setApplyingToBrand(false);
      setConfirmBrandKey(null);
    }
  }, [overrides, updateBrand, brand, store]);

  const insertLabel = useMemo(() => {
    const at = insertAt ?? pages.length;
    if (at >= pages.length) return 'the end';
    if (at <= 0) return 'the start';
    return `page ${at} · ${pageDisplayName(pages[at - 1])}`;
  }, [insertAt, pages]);

  const panelTitle = mode === 'content' && selectedPage
    ? pageDisplayName(selectedPage)
    : mode ? PANEL_TITLES[mode] : '';

  return (
    <div className="gl-builder" data-sidebar={mode ? 'open' : 'closed'}>
      <GuidelineRail active={mode ?? undefined} onChange={onRail} />

      {mode && (
        <GuidelineSidebar
          title={panelTitle}
          onBack={mode === 'content' && selectedPage ? () => setSelectedId(undefined) : undefined}
          onClose={() => setMode(null)}
        >
          {mode === 'content' && selectedPage && (
            <PagePanel
              page={selectedPage}
              brand={effectiveBrand}
              index={selectedIndex}
              total={pages.length}
              isEdited={editedIds.has(selectedPage.id)}
              onChange={(patch) => store.updatePage(brand.id, selectedPage.id, patch)}
              onMove={(delta) => { store.movePage(brand.id, selectedPage.id, delta); scrollToPage(selectedPage.id); }}
              onDuplicate={() => {
                const copy = store.duplicatePage(brand.id, selectedPage.id);
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
              slug={slug}
              overrides={overrides}
              onSetOverride={setOverride}
              onRequestApply={setConfirmBrandKey}
            />
          )}

          {mode === 'add' && <AddPagePanel insertAfterLabel={insertLabel} onAdd={addPage} />}
        </GuidelineSidebar>
      )}

      <div className="gl-doc-scroll" ref={scrollRef}>
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

      <DsConfirmDialog
        open={confirmRemove !== null}
        title="Remove this page?"
        description="The page and any edits you made to it are deleted. Other pages are unaffected."
        confirmLabel="Remove page"
        onConfirm={() => confirmRemove && removePage(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />

      <DsConfirmDialog
        open={confirmBrandKey !== null}
        title={confirmBrandKey ? `Update ${brand.name}’s ${OVERRIDE_LABEL[confirmBrandKey].toLowerCase()}?` : ''}
        description={
          confirmBrandKey ? (
            <>
              This changes the brand itself, not just this guideline. Every
              design, template, export and page that uses{' '}
              {OVERRIDE_LABEL[confirmBrandKey].toLowerCase()} will pick up{' '}
              <strong>{overrides[confirmBrandKey]}</strong> in place of{' '}
              <strong>{brandValueFor(brand, confirmBrandKey) ?? 'nothing'}</strong>.
            </>
          ) : ''
        }
        confirmLabel={applyingToBrand ? 'Updating…' : 'Update the brand'}
        cancelLabel="Keep it to this guideline"
        onConfirm={() => confirmBrandKey && applyToBrand(confirmBrandKey)}
        onCancel={() => setConfirmBrandKey(null)}
      />

      <DsConfirmDialog
        open={confirmRebuild}
        title="Rebuild from the brand?"
        description="The page list goes back to the default order, so pages you added are removed and pages you deleted come back. Edits you made to a page are kept."
        confirmLabel="Rebuild"
        onConfirm={rebuild}
        onCancel={() => setConfirmRebuild(false)}
      />
    </div>
  );
}

/**
 * The hairline between two pages that becomes a "+" on hover.
 *
 * Always in the DOM rather than mounted on hover, so it is reachable by
 * keyboard — a hover-only control is invisible to anyone not using a mouse.
 */
function InsertBar({
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

function SaveIndicator({ state, loaded }: { state: string; loaded: boolean }) {
  if (!loaded) return <span className="gl-save">Loading edits…</span>;
  if (state === 'saving' || state === 'pending') return <span className="gl-save">Saving…</span>;
  if (state === 'error') return <span className="gl-save is-error">Not saved</span>;
  if (state === 'saved') return <span className="gl-save is-ok">All changes saved</span>;
  return <span className="gl-save">Edits save automatically</span>;
}
