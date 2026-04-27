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
import { Check, ChevronLeft, ChevronRight, Save, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { DeckRenderer } from './DeckRenderer';
import { SlideRenderer } from './SlideRenderer';
import { EditContextProvider } from './EditContext';
import { AddSlidePopover } from './AddSlidePopover';
import { GeneratePanel } from './GeneratePanel';
import { PITCH_DECK_TEMPLATE } from '../templates/pitch-deck';
import { DeckThemeProvider } from '@/shared/presentation/theme/DeckThemeProvider';
import { EMPTY_THEME } from '@/shared/presentation/theme/types';
import type { Deck, LayoutId, Slide } from '../types';
import type { Brand } from '@/shared/types/brand';
import { useDeck, useDeckStore, useEnsureDeck } from '../store/deckStore';
import { buildEmptySlide, getLayoutMeta } from '../layouts/catalog';
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
  const insertSlide = result?.insertSlide;
  const removeSlide = result?.removeSlide;
  const reorderSlide = result?.reorderSlide;

  // Drag-to-reorder state for the thumbnail rail.
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; pos: 'before' | 'after' } | null>(null);

  // AI generation drawer.
  const [generateOpen, setGenerateOpen] = useState(false);

  const handleAcceptGenerated = useCallback((generated: Deck) => {
    // Replace the current deck in-place — keep the SAME id so the
    // existing useDeck() subscription stays bound and auto-save flushes
    // the new slides into brand.decks[]. (Phase 5 introduces
    // multi-deck and a clean "save as new deck" path.)
    const replacement: Deck = {
      ...generated,
      id: deckId,
      version: (deck?.version ?? 0) + 1,
    };
    useDeckStore.getState().setDeck(replacement);
    setActiveIndex(0);
    toast.success(`Replaced deck with ${generated.slides.length} AI-generated slides`);
  }, [deckId, deck?.version]);

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

  const handleAddSlide = (layout: LayoutId) => {
    if (!insertSlide) return;
    const newSlide = buildEmptySlide(layout, deck.slides.length);
    const insertAt = activeIndex + 1;
    insertSlide(insertAt, newSlide);
    // Wait for the new <section> to mount, then scroll to it.
    setTimeout(() => {
      slideRefs.current[insertAt]?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleDeleteSlide = (slideId: string) => {
    if (!removeSlide) return;
    if (deck.slides.length <= 1) return;
    removeSlide(slideId);
  };

  const handleDrop = (toIndex: number, pos: 'before' | 'after') => {
    if (!reorderSlide) return;
    if (dragSrc === null) return;
    let to = pos === 'before' ? toIndex : toIndex + 1;
    // After splicing-out the source, indices shift.
    if (dragSrc < to) to -= 1;
    if (to !== dragSrc) reorderSlide(dragSrc, to);
    setDragSrc(null);
    setDragOver(null);
  };

  // Truncate long deck titles for the topbar; full title is in the title attribute.
  const titleForTopbar = (() => {
    const t = deck.title ?? 'Deck';
    return t.length > 40 ? `${t.slice(0, 38)}…` : t;
  })();
  const dirtyDot = saveState === 'saving' || saveState === 'dirty';

  return (
    <CosmosWorkspaceShell rightActions={
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--text-muted)',
            maxWidth: 360,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={deck.title}
        >
          <span
            style={{
              color: 'var(--text-primary)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {titleForTopbar}
          </span>
          <span style={{ opacity: 0.45 }}>·</span>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {total} slides
          </span>
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
            background: savedFlash
              ? '#16a34a'
              : saveState === 'saving'
                ? 'var(--accent-muted)'
                : 'var(--surface)',
            color: savedFlash ? '#fff' : 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (savedFlash) return;
            const el = e.currentTarget;
            el.style.background = 'var(--surface-elevated)';
            el.style.transform = 'translateY(-1px)';
            el.style.boxShadow = 'var(--shadow-sm)';
          }}
          onMouseLeave={(e) => {
            if (savedFlash) return;
            const el = e.currentTarget;
            el.style.background = saveState === 'saving' ? 'var(--accent-muted)' : 'var(--surface)';
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = 'none';
          }}
        >
          {dirtyDot && !savedFlash && (
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: saveState === 'saving' ? 'var(--accent, #001563)' : '#f59e0b',
                flexShrink: 0,
              }}
            />
          )}
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
            width: 184,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            background:
              'linear-gradient(180deg, var(--surface-elevated) 0%, var(--surface) 100%)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Sticky rail header — brand + deck title + slide count */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--surface-elevated)',
              borderBottom: '1px solid var(--border)',
              padding: '14px 12px 12px',
              zIndex: 1,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
              title={brand.name}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: 'var(--accent, #001563)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {brand.name}
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={deck.title}
            >
              {deck.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 4,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {deck.slides.length} slide{deck.slides.length === 1 ? '' : 's'}
            </div>
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DeckThemeProvider brand={brand} theme={deck.theme} deckKind="pitch-deck">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deck.slides.map((slide, i) => {
              const isActive = activeIndex === i;
              const isDragging = dragSrc === i;
              const meta = getLayoutMeta(slide.layout);
              const showInsertBefore =
                dragOver?.index === i && dragOver.pos === 'before' && dragSrc !== null && dragSrc !== i;
              const showInsertAfter =
                dragOver?.index === i && dragOver.pos === 'after' && dragSrc !== null && dragSrc !== i && dragSrc !== i + 1;
              return (
                <div key={slide.id} style={{ position: 'relative' }}>
                  {/* Drop-indicator line above */}
                  {showInsertBefore && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: -5,
                        height: 2,
                        background: 'var(--accent, #001563)',
                        borderRadius: 1,
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    />
                  )}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => goTo(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); } }}
                    draggable
                    onDragStart={(e) => {
                      setDragSrc(i);
                      e.dataTransfer.effectAllowed = 'move';
                      // Required by Firefox to actually start the drag.
                      e.dataTransfer.setData('text/plain', String(i));
                    }}
                    onDragOver={(e) => {
                      if (dragSrc === null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const pos: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
                      setDragOver({ index: i, pos });
                    }}
                    onDragLeave={(e) => {
                      // Only clear if the pointer left the card entirely.
                      const rel = e.relatedTarget as Node | null;
                      if (!rel || !(e.currentTarget as HTMLElement).contains(rel)) {
                        setDragOver((cur) => (cur?.index === i ? null : cur));
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragOver) handleDrop(dragOver.index, dragOver.pos);
                    }}
                    onDragEnd={() => {
                      setDragSrc(null);
                      setDragOver(null);
                    }}
                    style={{
                      border: isActive ? '2px solid var(--accent, #001563)' : '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 0,
                      overflow: 'hidden',
                      cursor: 'grab',
                      position: 'relative',
                      width: '100%',
                      aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
                      background: 'var(--surface)',
                      boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                      opacity: isDragging ? 0.4 : 1,
                      transition: 'box-shadow 0.18s var(--ease), opacity 0.12s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (isActive) return;
                      const el = e.currentTarget;
                      el.style.boxShadow = '0 0 0 2px var(--accent-muted, rgba(0,21,99,0.18)), var(--shadow-sm)';
                      el.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      if (isActive) return;
                      const el = e.currentTarget;
                      el.style.boxShadow = 'var(--shadow-xs)';
                      el.style.transform = 'translateY(0)';
                    }}
                    title={meta?.name ? `${meta.name} — drag to reorder` : `Slide ${i + 1}`}
                  >
                    {/* Scaled mini-render of the actual slide. */}
                    <ThumbSlide
                      slide={slide}
                      index={i + 1}
                      total={total}
                      brand={brand}
                      rtl={brand.guidelines?.language?.direction === 'rtl'}
                    />
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
                        zIndex: 2,
                        pointerEvents: 'none',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    {isActive && deck.slides.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(slide.id);
                        }}
                        title="Delete slide"
                        style={{
                          position: 'absolute',
                          right: 4,
                          top: 4,
                          width: 22,
                          height: 22,
                          padding: 0,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'rgba(255,255,255,0.94)',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 3,
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {/* Drop-indicator line below */}
                  {showInsertAfter && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: -5,
                        height: 2,
                        background: 'var(--accent, #001563)',
                        borderRadius: 1,
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          </DeckThemeProvider>
          {/* + Add slide trigger at the bottom of the rail */}
          <AddSlidePopover onPick={handleAddSlide} side="right" variant="inline" />
          </div>
        </aside>

        {/* Stage column — scroll area + bottom dock */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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

          {/* Bottom dock — frosted-glass floating pill cluster */}
          <div
            style={{
              position: 'fixed',
              bottom: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 6,
              background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              boxShadow: '0 12px 32px -12px rgba(0,0,0,0.18), 0 4px 12px -4px rgba(0,0,0,0.08)',
              zIndex: 50,
            }}
          >
            <button
              type="button"
              onClick={() => goTo(Math.max(0, activeIndex - 1))}
              disabled={activeIndex <= 0}
              title="Previous slide"
              style={dockIconBtnStyle(activeIndex <= 0)}
              onMouseEnter={onDockBtnEnter}
              onMouseLeave={onDockBtnLeave}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(total - 1, activeIndex + 1))}
              disabled={activeIndex >= total - 1}
              title="Next slide"
              style={dockIconBtnStyle(activeIndex >= total - 1)}
              onMouseEnter={onDockBtnEnter}
              onMouseLeave={onDockBtnLeave}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span
              aria-hidden
              style={{
                width: 1,
                height: 20,
                background: 'var(--border)',
                margin: '0 4px',
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 56,
                padding: '0 8px',
                textAlign: 'center',
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {String(activeIndex + 1).padStart(2, '0')}
              </span>
              <span style={{ opacity: 0.4, margin: '0 4px' }}>/</span>
              <span>{String(total).padStart(2, '0')}</span>
            </span>
            <span
              aria-hidden
              style={{
                width: 1,
                height: 20,
                background: 'var(--border)',
                margin: '0 4px',
              }}
            />
            <AddSlidePopover onPick={handleAddSlide} side="top" variant="pill" label="Add slide" />
            <span
              aria-hidden
              style={{
                width: 1,
                height: 20,
                background: 'var(--border)',
                margin: '0 4px',
              }}
            />
            <button
              type="button"
              onClick={() => setGenerateOpen(true)}
              title="Generate from a script"
              style={{
                height: 32,
                padding: '0 14px',
                borderRadius: 999,
                border: '1px solid color-mix(in srgb, var(--accent, #001563) 22%, var(--border))',
                background:
                  'linear-gradient(90deg, color-mix(in srgb, var(--accent, #7c3aed) 14%, transparent), color-mix(in srgb, #3b82f6 14%, transparent))',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                boxShadow:
                  '0 1px 2px 0 rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,0.4)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(-1px)';
                el.style.boxShadow =
                  '0 6px 14px -4px rgba(124,58,237,0.25), 0 2px 4px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(0)';
                el.style.boxShadow =
                  '0 1px 2px 0 rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,0.4)';
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate
            </button>
          </div>
        </div>
      </div>
      <GeneratePanel
        brand={brand}
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onAccept={handleAcceptGenerated}
      />
    </CosmosWorkspaceShell>
  );
}

function dockIconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    padding: 0,
    borderRadius: 999,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  };
}

function onDockBtnEnter(e: React.MouseEvent<HTMLButtonElement>) {
  if (e.currentTarget.disabled) return;
  const el = e.currentTarget;
  el.style.background = 'var(--surface-elevated)';
  el.style.borderColor = 'var(--border)';
  el.style.transform = 'translateY(-1px)';
  el.style.boxShadow = 'var(--shadow-sm)';
}

function onDockBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  el.style.background = 'transparent';
  el.style.borderColor = 'transparent';
  el.style.transform = 'translateY(0)';
  el.style.boxShadow = 'none';
}

/**
 * ThumbSlide — renders a real, scaled-down `SlideRenderer` to fill its
 * parent thumbnail tile. The parent is a fixed-aspect 16:9 box; this
 * component measures the parent's width and applies a CSS scale so the
 * 1920×1080 slide fits exactly. Uses `mode="thumbnail"` so layouts
 * suppress edit affordances. The mini-slides inherit `--deck-*` tokens
 * from a `<DeckThemeProvider>` wrapping the rail.
 */
function ThumbSlide({
  slide,
  index,
  total,
  brand,
  rtl,
}: {
  slide: Slide;
  index: number;
  total: number;
  brand: Brand;
  rtl: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.07);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / SLIDE_WIDTH);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wordmark = brand.name?.toLowerCase();
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
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
        <SlideRenderer
          slide={slide}
          index={index}
          total={total}
          mode="thumbnail"
          brandWordmark={wordmark}
          rtl={rtl}
        />
      </div>
    </div>
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
