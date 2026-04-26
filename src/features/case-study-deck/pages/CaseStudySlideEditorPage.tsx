/**
 * CaseStudySlideEditorPage — Canva-grade chrome around the live
 * single-slide editor.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  EditorChrome (h=48)                                    │
 *   │  ContextToolbar (h=44, zoom + undo/redo)                │
 *   ├──────┬───────────────────────────────────┬──────────────┤
 *   │Left  │      Canvas (scrollable, scaled)  │   Right      │
 *   │Side  │                                   │   Inspector  │
 *   ├──────┴───────────────────────────────────┴──────────────┤
 *   │           BottomSlideRail (h=96)                        │
 *   └─────────────────────────────────────────────────────────┘
 *
 * The canvas wrapper preserves the existing MutationObserver +
 * EditableSlide + useAutoSave + useHistory wiring; the new chrome
 * pieces are layout siblings, not replacements.
 *
 * A small "selection bridge" syncs EditableSlide's internal click
 * selection into the global `selectionStore` so the right inspector
 * (TextInspector / ImageInspector / ShapeInspector / SlideInspector)
 * can render against it. `useSelectionStore` is the single read source
 * the inspectors share with the rest of the app.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditableSlide } from '@/shared/editor/blocks/EditableSlide';
import { EditorChrome } from '@/features/editor/core/EditorChrome';
import { useAutoSave } from '@/features/editor/core/useAutoSave';
import { useHistory } from '@/shared/editor/useHistory';
import { useSelectionStore } from '@/shared/editor/selection/selectionStore';
import { useDeckPlan } from '../hooks/useDeckPlan';
import { resolveStyledSlide } from '../slides/styled';
import { ARCHETYPE_LABELS } from '../slides/renderer';
import { resolveSlideStyle } from '../styles';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants';
import { LeftSidebar } from '../editor/LeftSidebar';
import { RightInspector } from '../editor/RightInspector';
import { ContextToolbar } from '../editor/ContextToolbar';
import { BottomSlideRail } from '../editor/BottomSlideRail';

const LEFT_RAIL_W = 64 + 280; // icon strip + max panel width
const RIGHT_INSPECTOR_W = 280;
const CHROME_TOP_H = 48 + 44; // EditorChrome + ContextToolbar
const RAIL_H = 96;

export default function CaseStudySlideEditorPage() {
  const { slug, idx: idxParam } = useParams<{ slug: string; idx: string }>();
  const navigate = useNavigate();
  const { brand, isLoading } = useBrandBySlug(slug);
  const deck = useDeckPlan(brand);

  const idx = idxParam ? parseInt(idxParam, 10) : 0;
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [docHtml, setDocHtml] = useState<string | null>(null);
  const initialFrozen = deck?.slideFrozenHtml[idx];
  useEffect(() => {
    if (initialFrozen !== undefined && docHtml === null) {
      setDocHtml(initialFrozen);
    }
  }, [initialFrozen, docHtml]);

  const slide = deck?.slides[idx];
  const styleForSlide = slide && deck
    ? resolveSlideStyle(deck.plan.style, slide.hasStyleOverride ? slide.styleId : undefined, deck.master)
    : undefined;

  const Slide = slide ? resolveStyledSlide(slide.archetype) : null;
  const archetypeLabel = slide ? ARCHETYPE_LABELS[slide.archetype] ?? slide.archetype : '';

  const handleSave = useCallback(
    async (html: string) => {
      if (!deck || html === '') return;
      deck.setSlideFrozenHtml(idx, html);
    },
    [deck, idx],
  );

  const { saveState, markDirty, flush, retry } = useAutoSave({
    value: docHtml ?? '',
    save: handleSave,
    debounceMs: 1200,
    enabled: docHtml !== null,
  });

  /* ── MutationObserver: capture innerHTML + mark dirty on every change ── */
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const observer = new MutationObserver(() => {
      const next = node.innerHTML;
      setDocHtml(next);
      markDirty();
    });
    observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeOldValue: false,
    });
    return () => observer.disconnect();
  }, [markDirty]);

  /* ── Persisted history (Cmd+Z / Cmd+Shift+Z) ── */
  const editorKey = useMemo(() => `case-study-${brand?.id ?? 'noop'}`, [brand?.id]);
  const slideId = `slide-${idx}`;
  const { undo, redo } = useHistory({
    editorKey,
    currentSlideId: slideId,
    onPersistSnapshot: (_id, html) => {
      if (deck) deck.setSlideFrozenHtml(idx, html);
    },
  });

  /* ── Zoom: fit-to-viewport on resize, manual override stays sticky ── */
  const [scale, setScale] = useState<number>(0.5);
  const userScaledRef = useRef(false);

  const computeFit = useCallback(() => {
    const availW = Math.max(320, window.innerWidth - LEFT_RAIL_W - RIGHT_INSPECTOR_W - 64);
    const availH = Math.max(240, window.innerHeight - CHROME_TOP_H - RAIL_H - 64);
    return Math.min(availW / SLIDE_WIDTH, availH / SLIDE_HEIGHT, 1);
  }, []);

  useEffect(() => {
    const apply = () => {
      if (!userScaledRef.current) setScale(computeFit());
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [computeFit]);

  const setScaleManual = useCallback((n: number) => {
    userScaledRef.current = true;
    setScale(n);
  }, []);

  const fitToScreen = useCallback(() => {
    userScaledRef.current = false;
    setScale(computeFit());
  }, [computeFit]);

  /* ── Keyboard: Cmd+0 fit, Cmd+= zoom in, Cmd+- zoom out (Cmd+Z handled by useHistory) ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;
      if (e.key === '0') { e.preventDefault(); fitToScreen(); return; }
      if (e.key === '=' || e.key === '+') { e.preventDefault(); setScaleManual(Math.min(2, scale + 0.1)); return; }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); setScaleManual(Math.max(0.25, scale - 0.1)); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitToScreen, setScaleManual, scale]);

  /* ── Selection bridge — sync EditableSlide selection into selectionStore ── */
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const select = useSelectionStore.getState().select;

    const detect = (el: HTMLElement): 'text' | 'image' | 'shape' | 'slide' => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img' || tag === 'svg' || tag === 'picture') return 'image';
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'blockquote') return 'text';
      const directText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => (n.textContent ?? '').trim())
        .join('');
      if (directText.length > 0) return 'text';
      if (el.children.length > 0) return 'shape';
      const text = (el.textContent ?? '').trim();
      return text.length > 0 ? 'text' : 'shape';
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!node.contains(target)) return;
      // The click handler in EditableSlide may walk to a parent; we read
      // the styled-outline element it just selected via dataset.originalBg.
      // Fallback: use the click target itself.
      const candidate = (node.querySelector('[data-original-bg]') as HTMLElement | null)
        ?? (target.closest('[style*="outline"]') as HTMLElement | null)
        ?? target;
      const type = detect(candidate);
      select({ surface: 'case-study-editor', slideId, type, el: candidate });
    };

    const onDocClick = (e: MouseEvent) => {
      if (!node.contains(e.target as Node)) {
        select({ surface: 'case-study-editor', slideId, type: 'slide', el: node.firstElementChild as HTMLElement | null });
      }
    };

    node.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', onDocClick);
    return () => {
      node.removeEventListener('click', onClick, true);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [slideId]);

  // Expose current selection element to the LeftSidebar's brand-color
  // / asset-click application — it's outside the inspector but needs
  // to know what the user picked.
  useEffect(() => {
    (window as unknown as { __getCurrentEditorSelection?: () => HTMLElement | null }).__getCurrentEditorSelection = () => {
      const sel = useSelectionStore.getState().selected;
      return sel?.el ?? null;
    };
    return () => {
      delete (window as unknown as { __getCurrentEditorSelection?: () => HTMLElement | null }).__getCurrentEditorSelection;
    };
  }, []);

  /* ── Loading state ── */
  if (isLoading || !deck || !slide || !Slide || !styleForSlide || !brand) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  const total = deck.slides.length;
  const usingFrozen = slide.frozenHtml !== undefined;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0b0b', color: '#fff', overflow: 'hidden' }}>
      <EditorChrome
        backTo={`/b/${slug}/case-study`}
        breadcrumb={[deck.profile.name, 'Case Study']}
        title={`${archetypeLabel} · Slide ${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
        saveState={saveState}
        onRetry={() => void retry()}
        actions={
          <>
            {usingFrozen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  deck.setSlideFrozenHtml(idx, undefined);
                  setDocHtml(null);
                  window.location.reload();
                }}
                className="gap-2 text-white hover:bg-white/10"
              >
                Reset to template
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                void flush();
                navigate(`/b/${slug}/case-study`);
              }}
              className="gap-2"
            >
              <Eye className="w-4 h-4" /> View deck
            </Button>
          </>
        }
      />

      <ContextToolbar
        scale={scale}
        setScale={setScaleManual}
        fitScale={computeFit()}
        onFit={fitToScreen}
        onUndo={undo}
        onRedo={redo}
        presentPath={`/b/${slug}/case-study`}
      />

      {/* Body — three columns */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <LeftSidebar brand={brand} slug={slug ?? ''} deck={deck} currentIndex={idx} />

        {/* Stage — scrollable canvas area */}
        <main
          ref={stageRef}
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: 32,
          }}
        >
          <div
            style={{
              width: SLIDE_WIDTH * scale,
              height: SLIDE_HEIGHT * scale,
              position: 'relative',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6)',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#fff',
              flexShrink: 0,
            }}
          >
            <div
              ref={canvasRef}
              data-slide-canvas
              style={{
                width: SLIDE_WIDTH,
                height: SLIDE_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'relative',
              }}
            >
              <EditableSlide frozenHtml={docHtml ?? undefined}>
                {docHtml === null && (
                  <Slide
                    index={idx}
                    profile={deck.profile}
                    style={styleForSlide}
                    overrides={slide.overrides}
                    total={total}
                    shapeId={slide.shapeId}
                  />
                )}
              </EditableSlide>
            </div>
          </div>
        </main>

        <RightInspector />
      </div>

      <BottomSlideRail deck={deck} slug={slug ?? ''} currentIndex={idx} />

      <div
        style={{
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          borderTop: '1px solid #161616',
          background: '#0d0d0d',
          fontSize: 9,
          opacity: 0.55,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        <span>{usingFrozen ? 'Editing saved' : 'Editing template'}</span>
        <span>Click select · dbl-click edit · drag move · Esc clear</span>
      </div>
    </div>
  );
}
