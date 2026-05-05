/**
 * CaseStudySlideEditorPage — single-slide live editor.
 *
 * Wraps the rendered slide in `EditableSlide` from
 * `@/shared/editor/blocks/EditableSlide` so the user gets:
 *   - Click any text/image element to select it
 *   - Double-click to edit text inline (contentEditable)
 *   - FloatingToolbar above the selection for font/color/size/align
 *   - Drag-to-move and resize for leaf elements
 *   - Cmd/Ctrl-Z undo via `useHistory`
 *
 * The editor mounts the slide at NATURAL 1920×1080 inside a CSS-scaled
 * frame so the editing math works against true canvas pixels (the
 * exporter walks the same DOM at 1× scale).
 *
 * Save model:
 *   - The first edit "freezes" the slide — we capture the inner HTML
 *     and pass it to EditableSlide via `frozenHtml` so React doesn't
 *     reconcile the user's mutations away on the next prop change.
 *   - `useAutoSave` debounces a snapshot of the slide canvas and stores
 *     it via `setSlideFrozenHtml(index, html)` on the deck.
 *   - The viewer reads `slideFrozenHtml` and renders it verbatim when
 *     present (a saved-edit slide bypasses the React composition).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditableSlide } from '@/shared/editor/blocks/EditableSlide';
import { EditorChrome } from '@/features/editor/core/EditorChrome';
import { useAutoSave } from '@/features/editor/core/useAutoSave';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useDeckPlan } from '../hooks/useDeckPlan';
import { resolveStyledSlide } from '../slides/styled';
import { ARCHETYPE_LABELS } from '../slides/renderer';
import { resolveSlideStyle, STYLES } from '../styles';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants';
import '@/shared/styles/cosmos-workspace.css';

export default function CaseStudySlideEditorPage() {
  const { slug, idx: idxParam } = useParams<{ slug: string; idx: string }>();
  const navigate = useNavigate();
  const { brand, isLoading } = useBrandBySlug(slug);
  const deck = useDeckPlan(brand);

  const idx = idxParam ? parseInt(idxParam, 10) : 0;
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Local state mirrors the slide's HTML for auto-save debouncing.
  const [docHtml, setDocHtml] = useState<string | null>(null);

  // Load any saved frozen HTML once the deck arrives.
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

  // Watch the slide canvas for any mutations; capture innerHTML and mark dirty.
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

  // Compute scale to fit the canvas within the available viewport area.
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const compute = () => {
      const sx = (window.innerWidth - 360) / SLIDE_WIDTH;
      const sy = (window.innerHeight - 140) / SLIDE_HEIGHT;
      setScale(Math.min(sx, sy, 1));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  if (isLoading || !deck || !slide || !Slide || !styleForSlide) {
    return (
      <WorkspaceShell>
        <div style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--text-secondary)' }} />
        </div>
      </WorkspaceShell>
    );
  }

  const total = deck.slides.length;
  const usingFrozen = slide.frozenHtml !== undefined;

  return (
    <WorkspaceShell>
      <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: 'var(--background)', color: 'var(--text-primary)' }}>
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
                className="gap-2"
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

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'var(--background)',
          position: 'relative',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(13,13,13,0.04) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          style={{
            width: SLIDE_WIDTH * scale,
            height: SLIDE_HEIGHT * scale,
            position: 'relative',
            boxShadow: '0 30px 60px -20px rgba(13,13,13,0.18), 0 8px 24px -8px rgba(13,13,13,0.10)',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#fff',
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

      <footer
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-elevated)',
          color: 'var(--text-muted)',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        <div>
          {usingFrozen ? 'Editing your saved version' : 'Editing template (a snapshot will save on first change)'}
        </div>
        <div>Click to select · double-click text to edit · drag to move · Esc to clear</div>
      </footer>
      </div>
    </WorkspaceShell>
  );
}
