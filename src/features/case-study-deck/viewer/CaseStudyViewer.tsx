/**
 * CaseStudyViewer — the web presentation UI.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ topbar: back · title · style picker · actions (export, edit)   │
 *   ├──────────────┬──────────────────────────────────────────────┬──┤
 *   │  slide nav   │                                              │ i│
 *   │  (thumbs)    │          slide canvas (scroll-snap)          │ n│
 *   │              │                                              │ s│
 *   └──────────────┴──────────────────────────────────────────────┴──┘
 *
 * The deck has one ACTIVE STYLE (template) that propagates across every
 * slide. The user can override style on a single slide via the right
 * inspector. This is the MVP for a Canva/GAMMA-style template system.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Image as ImageIcon,
  Pencil,
  Check,
} from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { Button } from '@/components/ui/button';
import { useDeckPlan } from '../hooks/useDeckPlan';
import { resolveStyledSlide } from '../slides/styled';
import { ARCHETYPE_LABELS } from '../slides/renderer';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants';
import type { DeckStyleId } from '../types';
import { ALL_STYLES, STYLES } from '../styles';
import { exportDeck } from '../export';
import { toast } from 'sonner';

interface Props {
  brand: Brand;
  onBack?: () => void;
  onOpenFabric?: () => void;
}

export function CaseStudyViewer({ brand, onBack, onOpenFabric }: Props) {
  const deck = useDeckPlan(brand);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showInspector, setShowInspector] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Inject brand fonts on mount.
  useEffect(() => {
    if (!deck) return;
    const urls = deck.profile.typography.fontUrls;
    const links: HTMLLinkElement[] = [];

    // Brand fonts (always include).
    urls.forEach((url) => {
      if (document.querySelector(`link[href="${url}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      links.push(link);
    });

    // Style-system staples — every preset references one of these stacks via
    // its `headingFamily` token, so loading them all up-front means swapping
    // styles is instant (no FOUT mid-presentation).
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

  // Scroll-snap: track active slide. See note inside about the section
  // height being padded vs the viewport height — divide by section size.
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

  const handleExport = async (format: 'pdf' | 'png-zip') => {
    if (!deck || !stageRef.current) return;
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0c0c', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Sparkles className="animate-pulse" />
          <span>Composing your deck…</span>
        </div>
      </div>
    );
  }

  const visibleSlides = deck.slides.filter((s) => !s.hidden);
  const visibleCount = visibleSlides.length;
  const total = deck.slides.length;
  const activeStyleId = deck.plan.style;
  const activeStyle = STYLES[activeStyleId];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0b0b', color: '#fff' }}>
      {/* Topbar — position:relative + z-index pulls the header (and any
          absolute-positioned descendants like the Style dropdown) above
          the slide stage, which has its own scaled stacking context. */}
      <header style={{ position: 'relative', zIndex: 100, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid #1c1c1c', background: 'rgba(12,12,12,0.85)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{deck.profile.name} · Case Study</div>
            <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Template · {activeStyle.name} · {visibleCount} slides
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Style picker */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowStyleMenu((v) => !v)}
              style={{
                height: 32,
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: deck.profile.palette.primary }} />
              Style · {activeStyle.name}
            </button>
            {showStyleMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  zIndex: 1000,
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderRadius: 12,
                  padding: 8,
                  minWidth: 320,
                  maxHeight: 'calc(100vh - 96px)',
                  overflowY: 'auto',
                  boxShadow: '0 30px 60px -10px rgba(0,0,0,0.7)',
                }}
              >
                <div style={{ padding: '6px 10px 12px', fontSize: 10, opacity: 0.55, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
                  Templates · MVP
                </div>
                {ALL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      deck.setStyle(s.id);
                      setShowStyleMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      borderRadius: 8,
                      border: 'none',
                      background: s.id === activeStyleId ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Check className="w-4 h-4" style={{ marginTop: 2, opacity: s.id === activeStyleId ? 1 : 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2, lineHeight: 1.45 }}>{s.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={deck.regenerate} className="gap-2 text-white hover:bg-white/10" disabled={exporting}>
            <RefreshCw className="w-4 h-4" /> Regenerate
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowInspector((v) => !v)} className="gap-2 text-white hover:bg-white/10">
            <SlidersHorizontal className="w-4 h-4" /> {showInspector ? 'Hide' : 'Customize'}
          </Button>
          {onOpenFabric && (
            <Button size="sm" variant="ghost" onClick={onOpenFabric} className="gap-2 text-white hover:bg-white/10">
              <Pencil className="w-4 h-4" /> Canvas edit
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleExport('png-zip')} className="gap-2 border-white/30 text-white hover:bg-white/10" disabled={exporting}>
            <ImageIcon className="w-4 h-4" /> PNG
          </Button>
          <Button size="sm" onClick={() => handleExport('pdf')} className="gap-2" disabled={exporting}>
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left thumbnail rail */}
        <aside style={{ width: 180, borderRight: '1px solid #1c1c1c', overflowY: 'auto', padding: 12, background: '#0d0d0d' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deck.slides.map((s, i) => {
              const Slide = resolveStyledSlide(s.archetype);
              if (!Slide) return null;
              const isActive = activeIndex === i;
              const styleForSlide = STYLES[s.styleId];
              return (
                <button
                  key={`thumb-${i}`}
                  onClick={() => {
                    slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    border: isActive ? '2px solid #fff' : '1px solid #222',
                    opacity: s.hidden ? 0.35 : 1,
                    borderRadius: 8,
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    width: '100%',
                    aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
                    background: '#111',
                  }}
                  title={`${ARCHETYPE_LABELS[s.archetype] ?? s.archetype} — ${styleForSlide.name}`}
                >
                  <div
                    style={{
                      transform: `scale(${154 / SLIDE_WIDTH})`,
                      transformOrigin: 'top left',
                      width: SLIDE_WIDTH,
                      height: SLIDE_HEIGHT,
                      pointerEvents: 'none',
                    }}
                  >
                    <Slide index={i} profile={deck.profile} style={styleForSlide} overrides={s.overrides} total={total} />
                  </div>
                  <div style={{ position: 'absolute', left: 6, top: 4, fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '1px 6px' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {s.hasStyleOverride && (
                    <div style={{ position: 'absolute', right: 6, top: 4, fontSize: 9, fontWeight: 600, color: '#fff', background: deck.profile.palette.primary, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {styleForSlide.name.slice(0, 6)}
                    </div>
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
            background: '#0a0a0a',
            padding: 0,
          }}
        >
          {deck.slides.map((s, i) => {
            const Slide = resolveStyledSlide(s.archetype);
            if (!Slide) return null;
            const styleForSlide = STYLES[s.styleId];
            return (
              <section
                key={`section-${i}`}
                ref={(el) => { slideRefs.current[i] = el; }}
                style={{
                  height: '100%',
                  minHeight: '100vh',
                  scrollSnapAlign: 'start',
                  display: s.hidden ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 32,
                }}
              >
                <SlideScaler>
                  <Slide index={i} profile={deck.profile} style={styleForSlide} overrides={s.overrides} total={total} />
                </SlideScaler>
              </section>
            );
          })}
        </main>

        {/* Right inspector */}
        {showInspector && (
          <aside style={{ width: 320, borderLeft: '1px solid #1c1c1c', overflowY: 'auto', padding: 18, background: '#0d0d0d' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 14 }}>
              Slide {String(activeIndex + 1).padStart(2, '0')}
            </div>
            {deck.slides[activeIndex] ? (
              <InspectorPanel
                archetype={deck.slides[activeIndex].archetype}
                hidden={deck.slides[activeIndex].hidden}
                overrides={deck.slides[activeIndex].overrides}
                hasStyleOverride={deck.slides[activeIndex].hasStyleOverride}
                slideStyleId={deck.slides[activeIndex].styleId}
                deckStyleId={activeStyleId}
                onSlideStyle={(s) => deck.setSlideStyle(activeIndex, s)}
                onOverride={(patch) => deck.setOverride(activeIndex, patch)}
                onToggleHidden={() => deck.toggleHidden(activeIndex)}
              />
            ) : null}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #1c1c1c' }}>
              <Button size="sm" variant="ghost" onClick={deck.reset} className="w-full text-white hover:bg-white/10 gap-2">
                Reset all overrides
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ---- subcomponents ---- */

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
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
          borderRadius: 6,
          overflow: 'hidden',
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
  onSlideStyle,
  onOverride,
  onToggleHidden,
}: {
  archetype: string;
  hidden: boolean;
  overrides: { headline?: string; subhead?: string; credit?: string; image?: string } | undefined;
  hasStyleOverride: boolean;
  slideStyleId: DeckStyleId;
  deckStyleId: DeckStyleId;
  onSlideStyle: (id: DeckStyleId | undefined) => void;
  onOverride: (patch: { headline?: string; subhead?: string; credit?: string; image?: string }) => void;
  onToggleHidden: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
        {ARCHETYPE_LABELS[archetype] ?? archetype}
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 18 }}>
        Override the deck-wide template just for this slide, or tweak its copy.
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 8 }}>
        Style
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        <button
          type="button"
          onClick={() => onSlideStyle(undefined)}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: !hasStyleOverride ? '1px solid #fff' : '1px solid #333',
            background: !hasStyleOverride ? '#fff' : 'transparent',
            color: !hasStyleOverride ? '#000' : '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Auto · {STYLES[deckStyleId].name}
        </button>
        {ALL_STYLES.map((s) => {
          const active = hasStyleOverride && slideStyleId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSlideStyle(s.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: active ? '1px solid #fff' : '1px solid #333',
                background: active ? '#fff' : 'transparent',
                color: active ? '#000' : '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s.name}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 18 }}>
        Auto follows the deck-wide style; explicit picks pin this slide.
      </div>

      <Field label="Headline" value={overrides?.headline} onChange={(v) => onOverride({ headline: v || undefined })} />
      <Field label="Body / subhead" value={overrides?.subhead} onChange={(v) => onOverride({ subhead: v || undefined })} multiline />
      <Field label="Credit" value={overrides?.credit} onChange={(v) => onOverride({ credit: v || undefined })} />
      <Field label="Image URL" value={overrides?.image} onChange={(v) => onOverride({ image: v || undefined })} hint="Paste a brand asset URL to override the hero image for this slide." />

      <Button size="sm" variant="ghost" onClick={onToggleHidden} className="w-full text-white hover:bg-white/10 gap-2 mt-4">
        {hidden ? <><Eye className="w-4 h-4" /> Show in deck</> : <><EyeOff className="w-4 h-4" /> Hide from deck</>}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, multiline, hint }: { label: string; value?: string; onChange: (v: string) => void; multiline?: boolean; hint?: string }) {
  const id = `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#161616', color: '#fff', border: '1px solid #2a2a2a', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
        />
      ) : (
        <input
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#161616', color: '#fff', border: '1px solid #2a2a2a', fontSize: 13 }}
        />
      )}
      {hint && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
