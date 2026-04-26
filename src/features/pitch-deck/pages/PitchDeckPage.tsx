/**
 * /b/uniex/pitch-deck — the Uniex pitch deck.
 *
 * 15 hand-tuned Arabic-RTL slides on the cosmos shell. Reuses the
 * case-study viewer's:
 *   - paper canvas + dot grid
 *   - SlideScaler (scales 1920×1080 to fit)
 *   - thumbnail rail
 *   - floating bottom dock (prev/next, page indicator, export)
 *   - inline-editable wrapper (click to select, contentEditable text,
 *     undo/redo, frozenHtml persistence)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { exportDeck } from '@/features/case-study-deck/export';
import { InlineEditableSlide } from '@/shared/editor/InlineEditableSlide';
import { SelectionInspector } from '@/shared/editor/SelectionInspector';
import type { SelectedElement } from '@/shared/editor/blocks/EditableSlide';
import { DeckThemeProvider } from '@/shared/presentation/theme/DeckThemeProvider';
import { useDeckTheme } from '@/shared/presentation/theme/useDeckTheme';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';
import { UNIEX_SLIDES, type UniexSlide } from '../uniexPitchContent';
import { VARIANTS, type SlideKind, type VariantKey } from '../variants';
import '@/shared/styles/cosmos-workspace.css';

const ARABIC_FONTS = [
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

export default function PitchDeckPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandBySlug(slug);

  if (isLoading || !brand) {
    return (
      <CosmosWorkspaceShell>
        <div style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-secondary)' }}>
            <Sparkles className="animate-pulse" />
            <span>Composing your pitch deck…</span>
          </div>
        </div>
      </CosmosWorkspaceShell>
    );
  }

  // After this point `brand` is non-null. Move the rest of the page into
  // `PitchDeckShell` so we can call `useDeckTheme(brand, ...)` without
  // breaking rules-of-hooks (the hook needs a non-null brand and must
  // not sit below a conditional `return`).
  return <PitchDeckShell brand={brand} slug={slug ?? ''} />;
}

function PitchDeckShell({ brand, slug }: { brand: Brand; slug: string }) {
  const navigate = useNavigate();
  const { theme } = useDeckTheme(brand, 'pitch-deck');
  const [activeIndex, setActiveIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  // Per-slide variant picks. Default = 'A' for every slide (the original
  // hand-tuned implementation). Persisted to localStorage so picks
  // survive reload.
  const VARIANT_KEY = `brandos:pitch-deck:${slug ?? 'unknown'}:variants`;
  const [slideVariants, setSlideVariants] = useState<Record<number, VariantKey>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(VARIANT_KEY);
      return raw ? (JSON.parse(raw) as Record<number, VariantKey>) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(VARIANT_KEY, JSON.stringify(slideVariants));
    } catch {
      /* quota — ignore */
    }
  }, [VARIANT_KEY, slideVariants]);
  const setSlideVariant = useCallback((idx: number, key: VariantKey) => {
    setSlideVariants((prev) => {
      if (prev[idx] === key) return prev;
      return { ...prev, [idx]: key };
    });
    // Variant switch = different layout; old per-element edits don't
    // apply. Drop the frozen snapshot so the new variant mounts clean.
    setSlideFrozenHtml((prev) => {
      if (!prev[idx]) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }, []);

  // Per-slide live-edit HTML snapshots — when a slide has one, we
  // render that HTML verbatim instead of the React composition.
  const FROZEN_KEY = `brandos:pitch-deck:${slug ?? 'unknown'}:frozen`;
  const [slideFrozenHtml, setSlideFrozenHtml] = useState<Record<number, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(FROZEN_KEY);
      return raw ? (JSON.parse(raw) as Record<number, string>) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(FROZEN_KEY, JSON.stringify(slideFrozenHtml));
    } catch {
      /* quota — ignore */
    }
  }, [FROZEN_KEY, slideFrozenHtml]);
  const setSlideFrozen = useCallback((idx: number, html: string | undefined) => {
    setSlideFrozenHtml((prev) => {
      const next = { ...prev };
      if (html) next[idx] = html;
      else delete next[idx];
      return next;
    });
  }, []);

  // Per-slide hidden state (skipped from export/view when true).
  const HIDDEN_KEY = `brandos:pitch-deck:${slug ?? 'unknown'}:hidden`;
  const [hiddenSlides, setHiddenSlides] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(HIDDEN_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenSlides));
    } catch {
      /* quota — ignore */
    }
  }, [HIDDEN_KEY, hiddenSlides]);
  const toggleHidden = useCallback((idx: number) => {
    setHiddenSlides((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  }, []);

  const [showInspector, setShowInspector] = useState(false);
  // Currently-selected layer reported by the active slide. Used to
  // populate the Customize panel with property controls. Auto-opens
  // the inspector on the first selection so users discover the panel.
  const [selection, setSelection] = useState<SelectedElement | null>(null);
  const handleSelectionChange = useCallback((sel: SelectedElement | null) => {
    setSelection(sel);
    if (sel) setShowInspector(true);
  }, []);
  const clearSelection = useCallback(() => setSelection(null), []);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const total = UNIEX_SLIDES.length;

  // Inject Arabic fonts once.
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    ARABIC_FONTS.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      links.push(link);
    });
    return () => {
      links.forEach((el) => el.remove());
    };
  }, []);

  // Track active slide via scroll-snap math. Depends on `brand` because
  // the stage element only mounts AFTER brand resolves — the loading
  // branch returns earlier and stageRef.current is null at first run.
  // Without the dep, the listener never attaches and activeIndex stays
  // stuck at 0 (page indicator never updates, thumbnails don't track,
  // variant picker only ever modifies slide 0).
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

  const goTo = (i: number) => {
    slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleExport = useCallback(async (format: 'pdf' | 'png-zip') => {
    if (!stageRef.current) return;
    setExporting(true);
    const toastId = toast.loading(format === 'pdf' ? 'Building PDF…' : 'Zipping PNGs…');
    try {
      await exportDeck(stageRef.current, {
        format,
        fileName: 'uniex-pitch-deck',
        scale: 2,
        onProgress: (r) => toast.loading(`Exporting… ${Math.round(r * 100)}%`, { id: toastId }),
      });
      toast.success(`Pitch deck exported as ${format === 'pdf' ? 'PDF' : 'PNG zip'}`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  }, []);

  const renderSlide = (i: number) => {
    const cfg: UniexSlide = UNIEX_SLIDES[i];
    const idx = i + 1;
    const kind = cfg.kind as SlideKind;
    const variantKey = slideVariants[i] ?? 'A';
    const Variant = (VARIANTS[kind] as Record<VariantKey, any>)[variantKey] ?? (VARIANTS[kind] as Record<VariantKey, any>).A;
    if (!Variant) return null;
    if (cfg.kind === 'program-detail') {
      return <Variant index={idx} total={total} programKey={cfg.key} />;
    }
    return <Variant index={idx} total={total} />;
  };

  const shellRightActions = (
    <>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginRight: 6 }}>
        Pitch Deck · {total} slides
      </span>
    </>
  );

  // The DeckThemeProvider renders a wrapping <div> that emits the
  // --deck-* CSS vars. Wrap the rail + stage + inspector subtree once so
  // the entire deck UI (including thumbnails) consumes the same tokens.
  return (
    <CosmosWorkspaceShell rightActions={shellRightActions}>
      <DeckThemeProvider brand={brand} theme={theme} deckKind="pitch-deck">
        <div
          style={{
            height: 'calc(100vh - 64px)',
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
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
            {UNIEX_SLIDES.map((_, i) => {
              const isActive = activeIndex === i;
              const isHidden = hiddenSlides.includes(i);
              const frozen = slideFrozenHtml[i];
              return (
                <button
                  key={`thumb-${i}`}
                  onClick={() => goTo(i)}
                  style={{
                    border: isActive ? `2px solid #001563` : '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    width: '100%',
                    aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
                    background: 'var(--surface)',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                    opacity: isHidden ? 0.4 : 1,
                    transition: 'box-shadow 0.18s var(--ease)',
                  }}
                  title={`Slide ${i + 1}${isHidden ? ' (hidden)' : ''}`}
                >
                  <div
                    style={{
                      transform: `scale(${130 / SLIDE_WIDTH})`,
                      transformOrigin: 'top left',
                      width: SLIDE_WIDTH,
                      height: SLIDE_HEIGHT,
                      pointerEvents: 'none',
                    }}
                  >
                    {frozen ? (
                      <div style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative' }} dangerouslySetInnerHTML={{ __html: frozen }} />
                    ) : (
                      renderSlide(i)
                    )}
                  </div>
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
                  {frozen && (
                    <div title="Live-edited slide" style={{ position: 'absolute', right: 6, bottom: 4, width: 8, height: 8, borderRadius: 999, background: '#68BE69', boxShadow: '0 0 0 2px rgba(255,255,255,0.6)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Stage */}
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
          {UNIEX_SLIDES.map((_, i) => (
            <section
              key={`section-${i}`}
              ref={(el) => { slideRefs.current[i] = el; }}
              style={{
                height: '100%',
                minHeight: '100vh',
                scrollSnapAlign: 'start',
                display: hiddenSlides.includes(i) ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                paddingBottom: 120,
              }}
            >
              <SlideScaler>
                <InlineEditableSlide
                  // Re-key on variant change so the editor remounts and
                  // re-captures a fresh baseline. Without this, the
                  // existing docHtml from the old variant would persist
                  // and the new variant's React children would be
                  // ignored.
                  key={`slide-${i}-${slideVariants[i] ?? 'A'}`}
                  slideIndex={i}
                  frozenHtml={slideFrozenHtml[i]}
                  isActive={i === activeIndex}
                  width={SLIDE_WIDTH}
                  height={SLIDE_HEIGHT}
                  onSave={(html) => setSlideFrozen(i, html)}
                  onSelectionChange={i === activeIndex ? handleSelectionChange : undefined}
                >
                  {renderSlide(i)}
                </InlineEditableSlide>
              </SlideScaler>
            </section>
          ))}
        </main>

        {/* Right inspector — Customize panel */}
        {showInspector && (
          <aside
            // Tells EditableSlide's outside-click handler to leave the
            // slide selection alone when the user is interacting with
            // chrome (chips, sliders, color pickers, etc.).
            data-editor-chrome="true"
            style={{
              width: 360,
              borderLeft: '1px solid var(--border)',
              overflowY: 'auto',
              padding: 20,
              background: 'var(--surface)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Slide {String(activeIndex + 1).padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={() => setShowInspector(false)}
                aria-label="Close inspector"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Selection-aware property panel — shown above slide-level
                controls when a layer is selected. */}
            <SelectionInspector selection={selection} onClearSelection={clearSelection} />
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <PitchDeckInspector
                activeKind={UNIEX_SLIDES[activeIndex].kind}
                activeVariant={slideVariants[activeIndex] ?? 'A'}
                onVariant={(k) => setSlideVariant(activeIndex, k)}
                isHidden={hiddenSlides.includes(activeIndex)}
                onToggleHidden={() => toggleHidden(activeIndex)}
                hasFrozen={Boolean(slideFrozenHtml[activeIndex])}
                onResetFrozen={() => setSlideFrozen(activeIndex, undefined)}
              />
            </div>
          </aside>
        )}

        {/* Floating bottom dock */}
        <div
          // Editor chrome — clicks on the dock (variant chips,
          // Customize toggle, etc.) shouldn't deselect the active
          // layer. Variant chip changes still wipe the slide via the
          // remount path; this just stops the eager outside-click
          // handler from racing them.
          data-editor-chrome="true"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: 6,
            background: 'color-mix(in srgb, var(--surface) 96%, transparent)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            borderRadius: 999,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <DockBtn onClick={() => goTo(Math.max(0, activeIndex - 1))} title="Previous slide" aria="Previous slide">
            <ChevronLeft className="w-4 h-4" />
          </DockBtn>
          <div
            style={{
              padding: '0 14px',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 56,
              textAlign: 'center',
            }}
          >
            {String(activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
          <DockBtn onClick={() => goTo(Math.min(total - 1, activeIndex + 1))} title="Next slide" aria="Next slide">
            <ChevronRight className="w-4 h-4" />
          </DockBtn>
          <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
          {/* Variant picker — A/B/C/D/E for the active slide. */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 6px', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginRight: 4 }}>Variant</span>
            {(['A', 'B', 'C', 'D', 'E'] as const).map((k) => {
              const active = (slideVariants[activeIndex] ?? 'A') === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSlideVariant(activeIndex, k)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: 'none',
                    background: active ? '#001563' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title={`Variant ${k}`}
                >
                  {k}
                </button>
              );
            })}
          </div>
          <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
          <button
            type="button"
            onClick={() => navigate(`/b/${slug}/setup`)}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            title="Open brand setup"
          >
            Brand Setup
          </button>
          <button
            type="button"
            onClick={() => setShowInspector((v) => !v)}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 999,
              border: 'none',
              background: showInspector ? 'var(--accent-muted)' : 'transparent',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Customize this slide"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Customize
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
        </div>
      </DeckThemeProvider>
    </CosmosWorkspaceShell>
  );
}

/* ─────────────────────────  helpers  ─────────────────────── */

/**
 * PitchDeckInspector — right-side Customize panel for the active slide.
 * Variant chips, hide toggle, reset-edits button. Inline edits happen
 * directly on the slide via InlineEditableSlide (no copy override
 * fields needed; just edit the text).
 */
function PitchDeckInspector({
  activeKind,
  activeVariant,
  onVariant,
  isHidden,
  onToggleHidden,
  hasFrozen,
  onResetFrozen,
}: {
  activeKind: UniexSlide['kind'];
  activeVariant: VariantKey;
  onVariant: (k: VariantKey) => void;
  isHidden: boolean;
  onToggleHidden: () => void;
  hasFrozen: boolean;
  onResetFrozen: () => void;
}) {
  const KIND_LABELS: Record<UniexSlide['kind'], string> = {
    cover: 'Cover',
    problem: 'Problem',
    solution: 'Solution',
    process: 'Process',
    differentiators: 'Differentiators',
    foundations: 'Foundations',
    'programs-intro': 'Programs Intro',
    'program-detail': 'Program Detail',
    'school-benefits': 'School Benefits',
    metrics: 'Metrics',
    impact: 'Impact',
    team: 'Team',
    cta: 'CTA',
  };
  const variants: VariantKey[] = ['A', 'B', 'C', 'D', 'E'];
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
        Category
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {KIND_LABELS[activeKind]}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.5 }}>
        Pick a different composition or edit the text directly on the slide.
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        Variant
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {variants.map((k) => {
          const active = k === activeVariant;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onVariant(k)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                border: active ? '1px solid #001563' : '1px solid var(--border)',
                background: active ? '#001563' : 'var(--surface-elevated)',
                color: active ? '#fff' : 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title={`Variant ${k}`}
            >
              {k}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={onToggleHidden}
          style={{
            width: '100%',
            height: 36,
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          {isHidden ? (<><Eye className="w-4 h-4" /> Show in deck</>) : (<><EyeOff className="w-4 h-4" /> Hide from deck</>)}
        </button>
        <button
          type="button"
          onClick={onResetFrozen}
          disabled={!hasFrozen}
          style={{
            width: '100%',
            height: 36,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-elevated)',
            color: hasFrozen ? 'var(--critical)' : 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 500,
            cursor: hasFrozen ? 'pointer' : 'not-allowed',
          }}
        >
          {hasFrozen ? 'Reset live edits' : 'No live edits'}
        </button>
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, background: 'var(--surface-elevated)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Click any text on the slide to select it. Double-click to edit. Drag corners to resize. <strong style={{ color: 'var(--text-primary)' }}>⌘Z</strong> undo, <strong style={{ color: 'var(--text-primary)' }}>⌘⇧Z</strong> redo.
        </div>
      </div>
    </div>
  );
}

function DockBtn({ children, onClick, title, aria }: { children: React.ReactNode; onClick: () => void; title?: string; aria?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={aria}
      style={{
        height: 36,
        width: 36,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: 'var(--text-primary)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

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
