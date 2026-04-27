/**
 * DeckV2Page — first mount of the v2 deck engine.
 *
 * Mounts at /b/:slug/deck-v2. Loads the brand, builds a Deck from the
 * Pitch Deck template, and renders via <DeckRenderer> with a
 * scroll-snap stage + thumbnail rail. Editor surfaces (inline edit,
 * resize, etc.) come in Phase 2 — for now this page proves the
 * foundation: types + 15 layouts + theme provider + template all
 * compose into a viewable deck without a single hand-coded slide
 * variant.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { DeckRenderer } from './DeckRenderer';
import { EditContextProvider } from './EditContext';
import { PITCH_DECK_TEMPLATE } from '../templates/pitch-deck';
import { EMPTY_THEME } from '@/shared/presentation/theme/types';
import type { Deck } from '../types';
import { useDeck, useEnsureDeck } from '../store/deckStore';
import '@/shared/presentation/theme/deck.css';
import '@/shared/styles/cosmos-workspace.css';

export default function DeckV2Page() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandBySlug(slug);
  const [activeIndex, setActiveIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  // Pick a stable deck id for this brand's pitch deck. One deck per
  // (brand, template) for now — Phase 5 introduces multi-deck.
  const deckId = brand ? `deck-${brand.id}-pitch` : '';

  // Hydrate from brand.decks[] OR build from template.
  const factory = useCallback<() => Deck>(() => {
    if (!brand) throw new Error('factory called without a brand');
    return {
      id: deckId,
      brandId: brand.id,
      templateId: PITCH_DECK_TEMPLATE.id,
      title: PITCH_DECK_TEMPLATE.name,
      slides: PITCH_DECK_TEMPLATE.slides.map((tpl, i) => ({
        id: `slide-${i}`,
        layout: tpl.layout,
        section: tpl.section,
        blocks: tpl.blocks,
      })),
      theme: { ...EMPTY_THEME, ...PITCH_DECK_TEMPLATE.defaultTheme },
      origin: 'template',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, [brand, deckId]);

  const ensuredId = useEnsureDeck(brand, deckId, factory);
  const result = useDeck(brand!, ensuredId ?? deckId);
  const deck = result?.deck ?? null;
  const saveState = result?.saveState;
  const flush = result?.flush;

  // Save button handler — flush pending debounced save NOW.
  const [savedFlash, setSavedFlash] = useState(false);
  const saveAll = useCallback(async () => {
    if (!flush) return;
    try {
      await flush();
      setSavedFlash(true);
      toast.success('All changes saved');
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      console.error('[deck-v2] save failed', e);
      toast.error(`Save failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }, [flush]);

  // Cmd/Ctrl+S → save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (cmd && e.key === 's') {
        e.preventDefault();
        void saveAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveAll]);

  // Track active slide via scroll-snap math — same pattern as the
  // legacy PitchDeckPage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onScroll = () => {
      const firstSection = stage.firstElementChild as HTMLElement | null;
      const step = firstSection?.offsetHeight || stage.clientHeight;
      const idx = Math.round(stage.scrollTop / step);
      setActiveIndex(idx);
    };
    stage.addEventListener('scroll', onScroll, { passive: true });
    return () => stage.removeEventListener('scroll', onScroll);
  }, [brand]);

  if (isLoading || !brand || !deck) {
    return (
      <CosmosWorkspaceShell>
        <div style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-secondary)' }}>
            <Sparkles className="animate-pulse" />
            <span>Composing deck v2…</span>
          </div>
        </div>
      </CosmosWorkspaceShell>
    );
  }

  const total = deck.slides.length;
  const goTo = (i: number) => slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });

  return (
    <CosmosWorkspaceShell rightActions={
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Deck v2 · {total} slides
        </span>
        <button
          type="button"
          onClick={saveAll}
          title="Save (⌘S)"
          style={{
            height: 32,
            padding: '0 14px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: savedFlash ? '#16a34a' : (saveState === 'saving' ? 'var(--accent-muted)' : 'var(--surface)'),
            color: savedFlash ? '#fff' : 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
        >
          {savedFlash ? (
            <><Check className="w-3.5 h-3.5" /> Saved</>
          ) : saveState === 'saving' ? (
            <><Save className="w-3.5 h-3.5" /> Saving…</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Save</>
          )}
        </button>
      </span>
    }>
      <div
        style={{
          height: 'calc(100vh - 64px)',
          display: 'flex',
          overflow: 'hidden',
          background: 'var(--background)',
        }}
      >
        {/* Thumbnail rail */}
        <aside
          style={{
            width: 156,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            padding: 12,
            background: 'var(--surface-elevated)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deck.slides.map((_, i) => {
              const isActive = activeIndex === i;
              return (
                <button
                  key={`thumb-${i}`}
                  type="button"
                  onClick={() => goTo(i)}
                  style={{
                    border: isActive ? '2px solid var(--accent, #001563)' : '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    width: '100%',
                    aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
                    background: 'var(--surface)',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                    transition: 'box-shadow 0.18s var(--ease)',
                  }}
                  title={`Slide ${i + 1}`}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 6,
                      top: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'rgba(0,21,99,0.7)',
                      borderRadius: 4,
                      padding: '1px 6px',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      pointerEvents: 'none',
                    }}
                  >
                    {deck.slides[i].layout}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Stage — scroll-snap of full slides at native 1920×1080 scaled to fit */}
        <main
          ref={stageRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            scrollSnapType: 'y mandatory',
            background: 'var(--background)',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(13,13,13,0.04) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        >
          <EditContextProvider value={{ enabled: true, setBlock: result?.setBlock ?? (() => {}) }}>
            <DeckRenderer
              deck={deck}
              brand={brand}
              mode="edit"
              slideWrapper={(slide, i) => (
                <section
                  key={`section-${i}`}
                  ref={(el) => { slideRefs.current[i] = el; }}
                  style={{
                    height: '100%',
                    minHeight: '100vh',
                    scrollSnapAlign: 'start',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 32,
                  }}
                >
                  <SlideScaler>{slide}</SlideScaler>
                </section>
              )}
            />
          </EditContextProvider>
        </main>
      </div>
    </CosmosWorkspaceShell>
  );
}

/** Scales a 1920×1080 slide to fit its parent without distortion. */
function SlideScaler({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => {
      const { clientWidth, clientHeight } = el;
      const s = Math.min(clientWidth / SLIDE_WIDTH, clientHeight / SLIDE_HEIGHT);
      setScale(s > 0 ? s : 0.3);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
