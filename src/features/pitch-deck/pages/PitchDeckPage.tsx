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
import { ChevronLeft, ChevronRight, Download, Sparkles } from 'lucide-react';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { exportDeck } from '@/features/case-study-deck/export';
import { toast } from 'sonner';
import {
  CoverSlide,
  ProblemSlide,
  SolutionSlide,
  ProcessSlide,
  DifferentiatorsSlide,
  FoundationsSlide,
  ProgramsIntroSlide,
  ProgramDetailSlide,
  SchoolBenefitsSlide,
  MetricsSlide,
  ImpactSlide,
  TeamSlide,
  CtaSlide,
} from '../slides/UniexPitchSlides';
import { UNIEX_SLIDES } from '../uniexPitchContent';
import '@/shared/styles/cosmos-workspace.css';

const ARABIC_FONTS = [
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

export default function PitchDeckPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandBySlug(slug);
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
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

  // Track active slide via scroll-snap math.
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
  }, []);

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

  const renderSlide = (i: number, scaled = false) => {
    const cfg = UNIEX_SLIDES[i];
    const idx = i + 1;
    switch (cfg.kind) {
      case 'cover':           return <CoverSlide index={idx} total={total} />;
      case 'problem':         return <ProblemSlide index={idx} total={total} />;
      case 'solution':        return <SolutionSlide index={idx} total={total} />;
      case 'process':         return <ProcessSlide index={idx} total={total} />;
      case 'differentiators': return <DifferentiatorsSlide index={idx} total={total} />;
      case 'foundations':     return <FoundationsSlide index={idx} total={total} />;
      case 'programs-intro':  return <ProgramsIntroSlide index={idx} total={total} />;
      case 'program-detail':  return <ProgramDetailSlide index={idx} total={total} programKey={cfg.key} />;
      case 'school-benefits': return <SchoolBenefitsSlide index={idx} total={total} />;
      case 'metrics':         return <MetricsSlide index={idx} total={total} />;
      case 'impact':          return <ImpactSlide index={idx} total={total} />;
      case 'team':            return <TeamSlide index={idx} total={total} />;
      case 'cta':             return <CtaSlide index={idx} total={total} />;
      default:                return null;
    }
  };

  const shellRightActions = (
    <>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginRight: 6 }}>
        Pitch Deck · {total} slides
      </span>
    </>
  );

  return (
    <CosmosWorkspaceShell rightActions={shellRightActions}>
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
                    transition: 'box-shadow 0.18s var(--ease)',
                  }}
                  title={`Slide ${i + 1}`}
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
                    {renderSlide(i, true)}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                paddingBottom: 120,
              }}
            >
              <SlideScaler>{renderSlide(i)}</SlideScaler>
            </section>
          ))}
        </main>

        {/* Floating bottom dock */}
        <div
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
    </CosmosWorkspaceShell>
  );
}

/* ─────────────────────────  helpers  ─────────────────────── */

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
