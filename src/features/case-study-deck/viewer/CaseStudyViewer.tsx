/**
 * CaseStudyViewer — the web presentation UI.
 *
 * Cosmos UI version: paper canvas, warm grays, Inter — same design
 * language as /setup, /brand-kit, /tools. Primary actions live in a
 * floating pill dock at the bottom-center of the viewport so the slide
 * stage stays the focal point. The top bar is minimal (back arrow,
 * brand title). The thumbnail rail and inspector adopt cosmos tokens.
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ minimal top: back · Brand · Case Study                         │
 *   ├──────────────┬──────────────────────────────────────────────┬──┤
 *   │  thumbnails  │          slide canvas (scroll-snap)          │ I│
 *   │   (paper)    │                                              │ N│
 *   │              │                  ┌──────────────────┐        │ S│
 *   │              │                  │  floating dock   │        │ P│
 *   │              │                  └──────────────────┘        │  │
 *   └──────────────┴──────────────────────────────────────────────┴──┘
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  Eye,
  EyeOff,
  Layout,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Image as ImageIcon,
  Pencil,
  X,
} from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { EditableSlide } from '@/shared/editor/blocks/EditableSlide';
import { useDeckPlan } from '../hooks/useDeckPlan';
import { resolveStyledSlide } from '../slides/styled';
import { ARCHETYPE_LABELS } from '../slides/renderer';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants';
import type { DeckStyleId } from '../types';
import { ALL_STYLES, STYLES, resolveSlideStyle } from '../styles';
import { CATALOGS } from '../shapes';
import { exportDeck } from '../export';
import { toast } from 'sonner';
import { MasterPanel } from './MasterPanel';
import '@/shared/styles/workspace.css';

interface Props {
  brand: Brand;
  onBack?: () => void;
  /** Open the live (Canva-style) editor for a single slide by index. */
  onOpenLiveEditor?: (slideIndex: number) => void;
}

export function CaseStudyViewer({ brand, onBack, onOpenLiveEditor }: Props) {
  const deck = useDeckPlan(brand);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showInspector, setShowInspector] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Inject brand fonts on mount.
  useEffect(() => {
    if (!deck) return;
    const urls = deck.profile.typography.fontUrls;
    const links: HTMLLinkElement[] = [];
    urls.forEach((url) => {
      if (document.querySelector(`link[href="${url}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      links.push(link);
    });
    const STAPLE_FONTS = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
      'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap',
      'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap',
    ];
    STAPLE_FONTS.forEach((url) => {
      if (document.querySelector(`link[href="${url}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      links.push(link);
    });
    return () => {
      links.forEach((el) => el.remove());
    };
  }, [deck]);

  // Scroll-snap: track active slide. Section height ≠ viewport height
  // (sections are padded), so divide by the actual section size.
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
  }, [deck]);

  const goToSlide = (i: number) => {
    slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleExport = async (format: 'pdf' | 'png-zip') => {
    if (!deck || !stageRef.current) return;
    setShowExport(false);
    setExporting(true);
    const toastId = toast.loading(format === 'pdf' ? 'Building PDF…' : 'Zipping PNGs…');
    try {
      const fileName = `${deck.profile.name.replace(/\s+/g, '-').toLowerCase()}-case-study`;
      await exportDeck(stageRef.current, {
        format,
        fileName,
        scale: 2,
        onProgress: (r) => toast.loading(`Exporting… ${Math.round(r * 100)}%`, { id: toastId }),
      });
      toast.success(`Deck exported as ${format === 'pdf' ? 'PDF' : 'PNG zip'}`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (!deck) {
    return (
      <WorkspaceShell>
        <div style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-secondary)' }}>
            <Sparkles className="animate-pulse" />
            <span>Composing your deck…</span>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  const visibleCount = deck.slides.filter((s) => !s.hidden).length;
  const total = deck.slides.length;
  const activeStyleId = deck.plan.style;
  const activeStyle = STYLES[activeStyleId];
  const masterCount = Object.keys(deck.master).length;
  const accent = deck.profile.palette.primary;

  // Show "Case Study · <Style>" subtitle + Regenerate in the shell's
  // top bar so this page sits next to /setup, /brand-kit, /tools as a
  // peer surface in the cosmos shell.
  const shellRightActions = (
    <>
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginRight: 6,
        }}
      >
        Case Study · {activeStyle.name} · {visibleCount} slides
      </span>
      <button
        type="button"
        onClick={deck.regenerate}
        disabled={exporting}
        title="Regenerate deck from brand"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 30,
          padding: '0 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
      </button>
    </>
  );

  return (
    <WorkspaceShell rightActions={shellRightActions}>
      <div style={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden', position: 'relative', background: 'var(--background)' }}>
        {/* Left thumbnail rail */}
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
            {deck.slides.map((s, i) => {
              const Slide = resolveStyledSlide(s.archetype);
              if (!Slide) return null;
              const isActive = activeIndex === i;
              const styleForSlide = resolveSlideStyle(activeStyleId, s.hasStyleOverride ? s.styleId : undefined, deck.master);
              return (
                <button
                  key={`thumb-${i}`}
                  onClick={() => goToSlide(i)}
                  style={{
                    border: isActive ? `2px solid ${accent}` : '1px solid var(--border)',
                    opacity: s.hidden ? 0.4 : 1,
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
                  title={`${ARCHETYPE_LABELS[s.archetype] ?? s.archetype} — ${styleForSlide.name}`}
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
                    {s.frozenHtml ? (
                      <div style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative' }} dangerouslySetInnerHTML={{ __html: s.frozenHtml }} />
                    ) : (
                      <Slide index={i} profile={deck.profile} style={styleForSlide} overrides={s.overrides} total={total} shapeId={s.shapeId} />
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
                      background: 'rgba(0,0,0,0.55)',
                      borderRadius: 4,
                      padding: '1px 6px',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {s.hasStyleOverride && (
                    <div style={{ position: 'absolute', right: 6, top: 4, fontSize: 9, fontWeight: 600, color: '#fff', background: accent, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {styleForSlide.name.slice(0, 6)}
                    </div>
                  )}
                  {s.frozenHtml && (
                    <div title="Live-edited slide" style={{ position: 'absolute', right: 6, bottom: 4, width: 8, height: 8, borderRadius: 999, background: 'var(--ok)', boxShadow: '0 0 0 2px rgba(255,255,255,0.6)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Stage — paper canvas with raised slide cards */}
        <main
          ref={stageRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            scrollSnapType: 'y mandatory',
            background: 'var(--background)',
            padding: 0,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(13,13,13,0.04) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        >
          {deck.slides.map((s, i) => {
            const Slide = resolveStyledSlide(s.archetype);
            if (!Slide) return null;
            const styleForSlide = resolveSlideStyle(activeStyleId, s.hasStyleOverride ? s.styleId : undefined, deck.master);
            return (
              <section
                key={`section-${i}`}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                style={{
                  height: '100%',
                  minHeight: '100vh',
                  scrollSnapAlign: 'start',
                  display: s.hidden ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 32,
                  paddingBottom: 120,
                }}
              >
                <SlideScaler>
                  <InlineEditableSlide
                    slideIndex={i}
                    frozenHtml={s.frozenHtml}
                    isActive={i === activeIndex}
                    onSave={(html) => deck.setSlideFrozenHtml(i, html)}
                  >
                    <Slide index={i} profile={deck.profile} style={styleForSlide} overrides={s.overrides} total={total} shapeId={s.shapeId} />
                  </InlineEditableSlide>
                </SlideScaler>
              </section>
            );
          })}
        </main>

        {/* Right inspector — slides in */}
        {showInspector && (
          <aside
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
            {deck.slides[activeIndex] ? (
              <InspectorPanel
                archetype={deck.slides[activeIndex].archetype}
                hidden={deck.slides[activeIndex].hidden}
                overrides={deck.slides[activeIndex].overrides}
                hasStyleOverride={deck.slides[activeIndex].hasStyleOverride}
                slideStyleId={deck.slides[activeIndex].styleId}
                deckStyleId={activeStyleId}
                shapeId={deck.slides[activeIndex].shapeId}
                onSlideStyle={(s) => deck.setSlideStyle(activeIndex, s)}
                onSlideShape={(s) => deck.setSlideShape(activeIndex, s)}
                onOverride={(patch) => deck.setOverride(activeIndex, patch)}
                onToggleHidden={() => deck.toggleHidden(activeIndex)}
              />
            ) : null}
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={deck.reset}
                style={{
                  width: '100%',
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reset all overrides
              </button>
            </div>
          </aside>
        )}

        {/* Floating bottom dock — primary actions */}
        <FloatingDock
          accent={accent}
          activeIndex={activeIndex}
          total={total}
          activeStyle={activeStyle}
          masterCount={masterCount}
          showStyleMenu={showStyleMenu}
          setShowStyleMenu={setShowStyleMenu}
          showInspector={showInspector}
          setShowInspector={setShowInspector}
          showMaster={showMaster}
          setShowMaster={setShowMaster}
          showExport={showExport}
          setShowExport={setShowExport}
          deck={deck}
          activeStyleId={activeStyleId}
          total_={total}
          onPrev={() => goToSlide(Math.max(0, activeIndex - 1))}
          onNext={() => goToSlide(Math.min(total - 1, activeIndex + 1))}
          onEdit={() => onOpenLiveEditor?.(activeIndex)}
          onExport={handleExport}
          exporting={exporting}
          showEdit={!!onOpenLiveEditor}
        />
      </div>

      <MasterPanel
        open={showMaster}
        onClose={() => setShowMaster(false)}
        master={deck.master}
        deckStyleId={activeStyleId}
        onChange={(patch) => deck.setMaster(patch)}
        onReset={() => deck.resetMaster()}
      />
    </WorkspaceShell>
  );
}

/* ─────────────────────────  floating dock  ─────────────────────── */

function FloatingDock(props: {
  accent: string;
  activeIndex: number;
  total: number;
  activeStyle: import('../styles').DeckStyle;
  masterCount: number;
  showStyleMenu: boolean;
  setShowStyleMenu: (v: boolean) => void;
  showInspector: boolean;
  setShowInspector: (v: boolean | ((p: boolean) => boolean)) => void;
  showMaster: boolean;
  setShowMaster: (v: boolean | ((p: boolean) => boolean)) => void;
  showExport: boolean;
  setShowExport: (v: boolean | ((p: boolean) => boolean)) => void;
  deck: ReturnType<typeof useDeckPlan>;
  activeStyleId: DeckStyleId;
  total_: number;
  onPrev: () => void;
  onNext: () => void;
  onEdit: () => void;
  onExport: (format: 'pdf' | 'png-zip') => void;
  exporting: boolean;
  showEdit: boolean;
}) {
  const {
    accent,
    activeIndex,
    total,
    activeStyle,
    masterCount,
    showStyleMenu,
    setShowStyleMenu,
    showInspector,
    setShowInspector,
    showMaster,
    setShowMaster,
    showExport,
    setShowExport,
    deck,
    activeStyleId,
    onPrev,
    onNext,
    onEdit,
    onExport,
    exporting,
    showEdit,
  } = props;

  if (!deck) return null;

  const dockBtn: CSSProperties = {
    height: 36,
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
  const dockBtnActive: CSSProperties = {
    ...dockBtn,
    background: 'var(--accent-muted)',
  };
  const divider: CSSProperties = {
    width: 1,
    height: 22,
    background: 'var(--border)',
    margin: '0 4px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {/* Style picker dropdown — opens upward */}
      {showStyleMenu && (
        <div
          style={{
            pointerEvents: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 10,
            width: 720,
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ padding: '4px 8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.24em', textTransform: 'uppercase' }}>
              Templates · 10
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Pick one — every slide adopts it
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {ALL_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  deck.setStyle(s.id);
                  setShowStyleMenu(false);
                }}
                style={{
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  borderRadius: 10,
                  border: s.id === activeStyleId ? `1px solid ${accent}` : '1px solid var(--border)',
                  background: s.id === activeStyleId ? 'var(--accent-muted)' : 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <StyleThumbnail style={s} profile={deck.profile} total={total} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Check className="w-3.5 h-3.5" style={{ marginTop: 2, opacity: s.id === activeStyleId ? 1 : 0, color: accent, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{s.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Export menu — small popover */}
      {showExport && (
        <div
          style={{
            pointerEvents: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 6,
            minWidth: 180,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <button
            type="button"
            onClick={() => onExport('pdf')}
            style={{ ...dockBtn, width: '100%', justifyContent: 'flex-start', height: 36, padding: '0 12px' }}
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button
            type="button"
            onClick={() => onExport('png-zip')}
            style={{ ...dockBtn, width: '100%', justifyContent: 'flex-start', height: 36, padding: '0 12px' }}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Export PNG zip
          </button>
        </div>
      )}

      {/* The dock pill itself */}
      <div
        style={{
          pointerEvents: 'auto',
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
        {/* Slide nav */}
        <button type="button" onClick={onPrev} style={dockBtn} title="Previous slide" aria-label="Previous slide">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div style={{ ...dockBtn, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', minWidth: 56, justifyContent: 'center' }}>
          {String(activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
        <button type="button" onClick={onNext} style={dockBtn} title="Next slide" aria-label="Next slide">
          <ChevronRight className="w-4 h-4" />
        </button>

        <span style={divider} />

        {/* Style picker */}
        <button
          type="button"
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          style={showStyleMenu ? dockBtnActive : dockBtn}
          title="Pick a deck-wide template"
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }} />
          {activeStyle.name}
        </button>

        {/* Master */}
        <button
          type="button"
          onClick={() => setShowMaster((v: boolean) => !v)}
          style={showMaster ? dockBtnActive : dockBtn}
          title="Edit deck-wide master tokens"
        >
          <Layout className="w-3.5 h-3.5" /> Master
          {masterCount > 0 && (
            <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 999, background: accent, color: '#fff', fontSize: 9, fontWeight: 700 }}>
              {masterCount}
            </span>
          )}
        </button>

        {/* Customize (per-slide inspector) */}
        <button
          type="button"
          onClick={() => setShowInspector((v: boolean) => !v)}
          style={showInspector ? dockBtnActive : dockBtn}
          title="Customize this slide"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Customize
        </button>

        {/* Live-edit */}
        {showEdit && (
          <button type="button" onClick={onEdit} style={dockBtn} title="Open this slide in the live editor">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}

        <span style={divider} />

        {/* Export */}
        <button
          type="button"
          onClick={() => setShowExport(!showExport)}
          disabled={exporting}
          style={{
            ...dockBtn,
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            padding: '0 14px',
          }}
          title="Export the deck"
        >
          <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  subcomponents  ─────────────────────── */

function StyleThumbnail({
  style,
  profile,
  total,
}: {
  style: import('../styles').DeckStyle;
  profile: import('../types').BrandProfile;
  total: number;
}) {
  const Cover = resolveStyledSlide('cover');
  if (!Cover) return null;
  const previewWidth = 320;
  const scale = previewWidth / SLIDE_WIDTH;
  return (
    <div
      style={{
        width: previewWidth,
        height: SLIDE_HEIGHT * scale,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <Cover index={0} profile={profile} style={style} total={total} />
      </div>
    </div>
  );
}

/**
 * InlineEditableSlide — wraps a slide composition in `EditableSlide`
 * and auto-saves any DOM mutation as `slideFrozenHtml` for that index.
 *
 * Strategy:
 *   - First render uses React children (or the previously-saved
 *     frozenHtml if one exists).
 *   - On the first user mutation (text edit, image swap, drag) we
 *     capture the slide's innerHTML — specifically the content INSIDE
 *     EditableSlide's editor divs, not the wrappers themselves, so
 *     re-saves don't nest. Then we switch to `frozenHtml` mode so
 *     React stops reconciling the user's edits away on the next
 *     prop change (style/shape/master/regenerate).
 *   - Mutations debounce a save back to the deck. Viewer consumers
 *     (thumbnail rail, exporter) read `frozenHtml` and render verbatim.
 *   - A short suppression window after docHtml flips silences the
 *     observer's own self-triggered mutation when EditableSlide
 *     re-renders with dangerouslySetInnerHTML.
 *   - Maintains a per-slide undo/redo snapshot stack. Cmd+Z /
 *     Cmd+Shift+Z keyboard shortcuts apply to whichever slide is
 *     currently active — gated by the `isActive` prop so a multi-slide
 *     viewer doesn't fire ten handlers per keystroke.
 */
function InlineEditableSlide({
  slideIndex,
  frozenHtml,
  isActive,
  onSave,
  children,
}: {
  slideIndex: number;
  frozenHtml: string | undefined;
  isActive: boolean;
  onSave: (html: string | undefined) => void;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(frozenHtml ?? null);
  const isApplyingRef = useRef(false);
  const didMountRef = useRef(false);

  // Per-slide undo/redo history. Each entry is the slide's content HTML
  // at a moment in time. `index` points at the currently-displayed entry.
  // When the user edits, we PUSH a new entry and trim anything past it
  // (standard undo stack semantics).
  const historyRef = useRef<{ stack: string[]; index: number }>({
    stack: [],
    index: -1,
  });
  const isHistoryNavRef = useRef(false);

  // When the deck loads a different frozenHtml (reset, brand change), sync
  // — but skip when the incoming frozenHtml is the same content we just
  // saved ourselves. Without this guard, every auto-save echoes back through
  // the prop and wipes the history stack mid-edit.
  useEffect(() => {
    const hist = historyRef.current;
    const currentTop = hist.stack[hist.index];
    if (frozenHtml && currentTop === frozenHtml) return; // our own save echo
    setDocHtml(frozenHtml ?? null);
    historyRef.current = { stack: frozenHtml ? [frozenHtml] : [], index: frozenHtml ? 0 : -1 };
  }, [frozenHtml, slideIndex]);

  // Capture the React-rendered baseline AFTER the slide finishes mounting.
  // Without this, the user's first edit becomes history[0] and there's
  // nothing to undo back to. The setTimeout buys time for React + FitText
  // useLayoutEffects to settle their fontSize / position styles.
  useEffect(() => {
    if (frozenHtml !== undefined) return; // baseline only matters when starting from React render
    const t = setTimeout(() => {
      const baseline = readSlideHtml();
      if (!baseline) return;
      // Only seed if we haven't already (user might have edited within 250ms).
      if (historyRef.current.stack.length === 0) {
        historyRef.current = { stack: [baseline], index: 0 };
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, frozenHtml]);

  // Suppress observer reactions to our own React-driven swap. Skip the
  // initial mount run — there's nothing to suppress yet, and it would
  // gate the user's very first edit behind a 60ms window.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    isApplyingRef.current = true;
    const t = setTimeout(() => {
      isApplyingRef.current = false;
    }, 60);
    return () => clearTimeout(t);
  }, [docHtml]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Capture target = the editable inner div that holds slide content.
  // EditableSlide renders <div.relative.w-full.h-full><div onClick=...>...</div></div>.
  // We want the innerHTML of the inner-inner div (the slide content), so
  // re-saves don't accumulate EditableSlide's own wrappers.
  // Strip EditableSlide's selection markers (outline/box-shadow/dataset)
  // before reading so our history isn't filled with click-noise.
  const readSlideHtml = (): string | null => {
    const root = containerRef.current;
    if (!root) return null;
    const editableOuter = root.firstElementChild as HTMLElement | null;
    const editableInner = editableOuter?.firstElementChild as HTMLElement | null;
    if (!editableInner) return null;
    const clone = editableInner.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[style*="outline"]').forEach((el) => {
      const e = el as HTMLElement;
      e.style.outline = '';
      e.style.outlineOffset = '';
      e.style.boxShadow = '';
      e.style.borderRadius = '';
      e.removeAttribute('data-original-bg');
    });
    clone.querySelectorAll('.resize-handle').forEach((el) => el.remove());
    return clone.innerHTML;
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new MutationObserver(() => {
      if (isApplyingRef.current) return;
      // Don't capture mutations triggered by our own undo/redo apply.
      if (isHistoryNavRef.current) return;
      const next = readSlideHtml();
      if (next === null) return;
      // Dedupe: if the captured HTML is identical to the current
      // history top, this was a no-op edit (selection styles already
      // stripped) — skip the state churn and history push.
      const hist = historyRef.current;
      if (next === hist.stack[hist.index]) return;
      setDocHtml(next);
      const trimmed = hist.stack.slice(0, hist.index + 1);
      trimmed.push(next);
      while (trimmed.length > 100) trimmed.shift();
      historyRef.current = { stack: trimmed, index: trimmed.length - 1 };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(next), 800);
    });
    observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex]);

  // Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (or Ctrl+Y) — gated to the active
  // slide so a 10-slide deck doesn't fire 10 handlers per keystroke.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const hist = historyRef.current;
        if (hist.index <= 0) return;
        const nextIdx = hist.index - 1;
        const html = hist.stack[nextIdx];
        historyRef.current = { stack: hist.stack, index: nextIdx };
        isHistoryNavRef.current = true;
        setDocHtml(html);
        onSave(html);
        setTimeout(() => {
          isHistoryNavRef.current = false;
        }, 80);
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        const hist = historyRef.current;
        if (hist.index >= hist.stack.length - 1) return;
        const nextIdx = hist.index + 1;
        const html = hist.stack[nextIdx];
        historyRef.current = { stack: hist.stack, index: nextIdx };
        isHistoryNavRef.current = true;
        setDocHtml(html);
        onSave(html);
        setTimeout(() => {
          isHistoryNavRef.current = false;
        }, 80);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, onSave]);

  return (
    <div ref={containerRef} style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative' }}>
      <EditableSlide frozenHtml={docHtml ?? undefined}>
        {docHtml === null ? children : null}
      </EditableSlide>
    </div>
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
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

function InspectorPanel({
  archetype,
  hidden,
  overrides,
  hasStyleOverride,
  slideStyleId,
  deckStyleId,
  shapeId,
  onSlideStyle,
  onSlideShape,
  onOverride,
  onToggleHidden,
}: {
  archetype: string;
  hidden: boolean;
  overrides: { headline?: string; subhead?: string; credit?: string; image?: string } | undefined;
  hasStyleOverride: boolean;
  slideStyleId: DeckStyleId;
  deckStyleId: DeckStyleId;
  shapeId: string | undefined;
  onSlideStyle: (id: DeckStyleId | undefined) => void;
  onSlideShape: (id: string | undefined) => void;
  onOverride: (patch: { headline?: string; subhead?: string; credit?: string; image?: string }) => void;
  onToggleHidden: () => void;
}) {
  const catalog = CATALOGS[archetype as keyof typeof CATALOGS];
  const hasMultipleShapes = catalog && catalog.shapes.length > 1;
  const defaultShapeId = catalog?.defaultFor(STYLES[slideStyleId]) ?? '';

  const sectionLabel: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 8,
  };
  const chip = (active: boolean): CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface-elevated)',
    color: active ? 'var(--accent-contrast)' : 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s var(--ease)',
  });

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
        Category
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {ARCHETYPE_LABELS[archetype] ?? archetype}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.5 }}>
        {hasMultipleShapes
          ? `${catalog!.shapes.length} shapes available · pick a different composition without changing the template.`
          : 'Override the deck-wide template just for this slide, or tweak its copy.'}
      </div>

      {hasMultipleShapes && (
        <>
          <div style={sectionLabel}>Shape</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => onSlideShape(undefined)}
              style={chip(!shapeId)}
              title={`Auto picks the default shape for the active style — currently "${catalog!.shapes.find((s) => s.id === defaultShapeId)?.name ?? defaultShapeId}".`}
            >
              Auto
            </button>
            {catalog!.shapes.map((s) => (
              <button key={s.id} type="button" onClick={() => onSlideShape(s.id)} title={s.description} style={chip(shapeId === s.id)}>
                {s.name}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.4 }}>
            Shape changes the body composition only — the active template's typography, spacing, and chrome stay.
          </div>
        </>
      )}

      <div style={sectionLabel}>Style</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => onSlideStyle(undefined)} style={chip(!hasStyleOverride)}>
          Auto · {STYLES[deckStyleId].name}
        </button>
        {ALL_STYLES.map((s) => {
          const active = hasStyleOverride && slideStyleId === s.id;
          return (
            <button key={s.id} type="button" onClick={() => onSlideStyle(s.id)} style={chip(active)}>
              {s.name}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.4 }}>
        Auto follows the deck-wide style; explicit picks pin this slide.
      </div>

      <Field label="Headline" value={overrides?.headline} onChange={(v) => onOverride({ headline: v || undefined })} />
      <Field label="Body / subhead" value={overrides?.subhead} onChange={(v) => onOverride({ subhead: v || undefined })} multiline />
      <Field label="Credit" value={overrides?.credit} onChange={(v) => onOverride({ credit: v || undefined })} />
      <Field label="Image URL" value={overrides?.image} onChange={(v) => onOverride({ image: v || undefined })} hint="Paste a brand asset URL to override the hero image for this slide." />

      <button
        type="button"
        onClick={onToggleHidden}
        style={{
          width: '100%',
          height: 36,
          padding: '0 12px',
          marginTop: 16,
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
        }}
      >
        {hidden ? (
          <>
            <Eye className="w-4 h-4" /> Show in deck
          </>
        ) : (
          <>
            <EyeOff className="w-4 h-4" /> Hide from deck
          </>
        )}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, multiline, hint }: { label: string; value?: string; onChange: (v: string) => void; multiline?: boolean; hint?: string }) {
  const id = `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: 13,
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      ) : (
        <input
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: 13,
            outline: 'none',
          }}
        />
      )}
      {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
