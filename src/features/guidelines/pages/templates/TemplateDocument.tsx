/**
 * TemplateDocument — renders a full brand guidelines document
 * using a selected template layout. Each template is an entirely
 * different visual system, not just a color swap.
 */
import { useState } from 'react';
import { Download, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { TEMPLATE_LAYOUTS, getLayoutById, type TemplateLayout } from './layout-config';
import { PageFrame } from './PageFrame';
import {
  CoverHyperHyve, CoverIdentity, CoverNoteform, CoverSignal,
  SectionDivider, ContentPage, ContentPageDark, ClosingTemplatePage,
} from './TemplatePages';
import {
  BrandPurposePage, LogoConstructionPage, ColorRatioPage,
  GradientSystemPage, DarkModePage, BrandArchetypePage,
  PatternSystemPage, StationeryMockupPage, DigitalProductPage,
  TouchpointMapPage, MotionPrinciplesPage,
} from './FancyPages';
import { toast } from 'sonner';

interface TemplateDocumentProps {
  brand: Brand;
}

interface SlideEntry {
  id: string;
  name: string;
  render: (p: { brand: Brand; layout: TemplateLayout; pageNumber: number; totalPages: number }) => React.ReactNode;
}

function buildSlides(brand: Brand): SlideEntry[] {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';
  const strategy = brand.guidelines?.strategy;
  const voice = brand.guidelines?.voiceAndTone;
  const palette = brand.guidelines?.colorPalette;
  const typo = brand.guidelines?.typography;
  const font1 = brand.fonts.primary;
  const font2 = brand.fonts.secondary || font1;

  return [
    // COVER
    {
      id: 'cover', name: 'Cover',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => {
        const covers: Record<string, React.ReactNode> = {
          hyperhyve: <CoverHyperHyve brand={b} layout={l} pageNumber={pn} totalPages={tp} />,
          identity: <CoverIdentity brand={b} layout={l} pageNumber={pn} totalPages={tp} />,
          noteform: <CoverNoteform brand={b} layout={l} pageNumber={pn} totalPages={tp} />,
          signal: <CoverSignal brand={b} layout={l} pageNumber={pn} totalPages={tp} />,
        };
        return covers[l.id] || covers.hyperhyve;
      },
    },

    // BRAND OVERVIEW
    {
      id: 'overview', name: 'Brand Overview',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <SectionDivider brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionNumber="1" sectionTitle="Brand Overview" sectionSubtitle="Mission & Vision · Core Values" />
      ),
    },
    {
      id: 'intro', name: 'Introduction',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPage brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Brand Overview" title="Introduction">
          <div className="grid grid-cols-2 gap-6 h-full">
            <div>
              <h4 className="text-[9px] font-semibold uppercase tracking-wider opacity-30 mb-1">Mission</h4>
              <p className="text-[clamp(10px,1vw,13px)] leading-relaxed opacity-70">{strategy?.mission || `${brand.name} exists to deliver exceptional value.`}</p>
            </div>
            <div>
              <h4 className="text-[9px] font-semibold uppercase tracking-wider opacity-30 mb-1">Vision</h4>
              <p className="text-[clamp(10px,1vw,13px)] leading-relaxed opacity-70">{strategy?.vision || 'To become the leading force in our industry.'}</p>
            </div>
          </div>
        </ContentPage>
      ),
    },
    {
      id: 'values', name: 'Core Values',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPageDark brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Brand Overview" title="Core Values">
          <div className="grid grid-cols-3 gap-3 mt-2">
            {(strategy?.values || ['Quality', 'Innovation', 'Trust']).map((v, i) => (
              <div key={v} className="rounded-lg p-3" style={{ backgroundColor: `${p}15` }}>
                <span className="text-[18px] font-bold opacity-10">{i + 1}.</span>
                <p className="text-[11px] font-semibold text-white mt-1">{v}</p>
              </div>
            ))}
          </div>
        </ContentPageDark>
      ),
    },

    // LOGO SYSTEM
    {
      id: 'logo-section', name: 'Logo System',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <SectionDivider brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionNumber="2" sectionTitle="Logo System" sectionSubtitle="Primary · Variations · Clear Space" />
      ),
    },
    {
      id: 'logo', name: 'Primary Logo',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPage brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Logo System" title="Logo">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="rounded-lg border border-gray-200 flex items-center justify-center p-8 bg-white">
              {b.logo ? <img src={b.logo} alt="" className="max-h-16 object-contain" /> : <span className="text-3xl font-bold" style={{ color: p }}>{b.name}</span>}
            </div>
            <div className="rounded-lg flex items-center justify-center p-8" style={{ backgroundColor: p }}>
              {b.logo ? <img src={b.logo} alt="" className="max-h-16 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-3xl font-bold text-white">{b.name}</span>}
            </div>
            <div className="rounded-lg flex items-center justify-center p-8 bg-[#0a0a0f]">
              {b.logo ? <img src={b.logo} alt="" className="max-h-16 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-3xl font-bold text-white">{b.name}</span>}
            </div>
            <div className="rounded-lg border border-gray-200 flex items-center justify-center p-8 bg-gray-50">
              {b.logo ? <img src={b.logo} alt="" className="max-h-16 object-contain" style={{ filter: 'grayscale(1) brightness(0)' }} /> : <span className="text-3xl font-bold text-black">{b.name}</span>}
            </div>
          </div>
        </ContentPage>
      ),
    },

    // COLOR SYSTEM
    {
      id: 'color-section', name: 'Color System',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <SectionDivider brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionNumber="3" sectionTitle="Color System" sectionSubtitle="Primary · Secondary · Usage" />
      ),
    },
    {
      id: 'colors', name: 'Primary Colors',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPageDark brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Color System" title="Primary Colors">
          <div className="flex gap-3 h-[70%] mt-2">
            {[
              { hex: palette?.primary?.hex || p, name: palette?.primary?.name || 'Primary' },
              ...(palette?.secondary ? [{ hex: palette.secondary.hex, name: palette.secondary.name }] : b.secondaryColor ? [{ hex: b.secondaryColor, name: 'Secondary' }] : []),
              ...(palette?.accent ? [{ hex: palette.accent.hex, name: palette.accent.name }] : []),
            ].map((c, i) => (
              <div key={i} className="flex-1 rounded-lg overflow-hidden flex flex-col">
                <div className="flex-1" style={{ backgroundColor: c.hex }} />
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-white">{c.name}</p>
                  <p className="text-[9px] font-mono text-white/40">{c.hex.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </ContentPageDark>
      ),
    },
    {
      id: 'color-usage', name: 'Color Usage',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPage brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Color System" title="Color Usage">
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { pct: '45%', color: p, label: palette?.primary?.name || 'Primary' },
              { pct: '25%', color: s, label: palette?.secondary?.name || 'Secondary' },
              { pct: '20%', color: '#0A0A0F', label: 'Dark' },
              { pct: '10%', color: '#F5F5F5', label: 'Light' },
            ].map((c, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-gray-100">
                <div className="h-12 flex items-center justify-center" style={{ backgroundColor: c.color }}>
                  <span className="text-[16px] font-bold" style={{ color: c.color === '#F5F5F5' ? '#333' : '#fff' }}>{c.pct}</span>
                </div>
                <div className="p-2 bg-white">
                  <p className="text-[9px] font-medium">{c.label}</p>
                  <p className="text-[7px] text-gray-400 font-mono">{c.color}</p>
                </div>
              </div>
            ))}
          </div>
        </ContentPage>
      ),
    },

    // TYPOGRAPHY
    {
      id: 'typo-section', name: 'Typography',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <SectionDivider brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionNumber="4" sectionTitle="Typography" sectionSubtitle="Primary Typeface · Hierarchy" />
      ),
    },
    {
      id: 'typography', name: 'Primary Typeface',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPageDark brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Typography" title="Primary Typeface">
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[clamp(40px,6vw,72px)] font-bold text-white leading-none" style={{ fontFamily: font1 }}>{font1}</p>
            <div className="grid grid-cols-4 gap-3 mt-6">
              {['Light 300', 'Regular 400', 'Medium 500', 'Bold 700'].map((w, i) => (
                <div key={w}>
                  <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">{w}</p>
                  <p className="text-[11px] text-white/70" style={{ fontFamily: font1, fontWeight: [300, 400, 500, 700][i] }}>
                    AaBbCcDd 0123456789
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ContentPageDark>
      ),
    },

    // VOICE & TONE
    {
      id: 'voice-section', name: 'Voice & Tone',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <SectionDivider brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionNumber="5" sectionTitle="Voice & Tone" sectionSubtitle="Personality · Do's & Don'ts" />
      ),
    },
    {
      id: 'voice', name: 'Voice & Tone',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPage brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Voice & Tone" title="Brand Voice">
          <div className="grid grid-cols-2 gap-6 mt-2">
            <div>
              <p className="text-[clamp(10px,1vw,13px)] leading-relaxed opacity-70">{voice?.brandVoice || `${brand.name} speaks with confidence and clarity.`}</p>
              {voice?.toneAttributes && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {voice.toneAttributes.map(a => (
                    <span key={a} className="px-2 py-0.5 rounded text-[8px] font-semibold" style={{ backgroundColor: `${p}15`, color: p }}>{a}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-rows-2 gap-3">
              <div className="rounded-lg p-3" style={{ backgroundColor: `${s || '#10B981'}10` }}>
                <p className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: s || '#10B981' }}>✓ Do</p>
                {(voice?.doAndDonts?.do || ['Be clear']).slice(0, 3).map((d, i) => <p key={i} className="text-[9px] opacity-70">• {d}</p>)}
              </div>
              <div className="rounded-lg p-3 bg-red-50">
                <p className="text-[8px] font-bold uppercase tracking-wider text-red-500 mb-1">✕ Don't</p>
                {(voice?.doAndDonts?.dont || ['Use jargon']).slice(0, 3).map((d, i) => <p key={i} className="text-[9px] opacity-70">• {d}</p>)}
              </div>
            </div>
          </div>
        </ContentPage>
      ),
    },

    // APPLICATIONS
    {
      id: 'app-section', name: 'Applications',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <SectionDivider brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionNumber="6" sectionTitle="Applications" sectionSubtitle="Business Cards · Social Media" />
      ),
    },
    {
      id: 'business-cards', name: 'Business Cards',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPage brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Applications" title="Business Cards">
          <div className="flex items-center justify-center gap-6 h-full">
            <div className="w-[42%] aspect-[1.75/1] bg-white rounded-lg shadow-lg border border-gray-100 p-[5%] flex flex-col justify-between">
              {b.logo ? <img src={b.logo} alt="" className="h-3 object-contain self-start" /> : <span className="text-[8px] font-bold" style={{ color: p }}>{b.name}</span>}
              <div>
                <p className="text-[8px] font-semibold">Jane Smith</p>
                <p className="text-[6px]" style={{ color: p }}>Brand Manager</p>
                <p className="text-[5px] text-gray-400 mt-1">jane@{brand.name.toLowerCase()}.com</p>
              </div>
            </div>
            <div className="w-[42%] aspect-[1.75/1] rounded-lg shadow-lg flex items-center justify-center" style={{ backgroundColor: p }}>
              {b.logo ? <img src={b.logo} alt="" className="h-5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-lg font-bold text-white">{b.name}</span>}
            </div>
          </div>
        </ContentPage>
      ),
    },
    {
      id: 'social', name: 'Social Media',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ContentPageDark brand={b} layout={l} pageNumber={pn} totalPages={tp} sectionName="Applications" title="Social Media">
          <div className="grid grid-cols-3 gap-3 mt-2 h-[65%]">
            <div className="rounded-lg flex items-center justify-center" style={{ backgroundColor: p }}>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                {b.logo ? <img src={b.logo} alt="" className="w-6 h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-lg font-bold text-white">{b.name.charAt(0)}</span>}
              </div>
            </div>
            <div className="rounded-lg p-3 flex flex-col justify-between" style={{ backgroundColor: p }}>
              {b.logo && <img src={b.logo} alt="" className="h-2.5 object-contain self-start" style={{ filter: 'brightness(0) invert(1)' }} />}
              <p className="text-[8px] text-white font-semibold">Post content</p>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ background: `linear-gradient(180deg, ${p}, #0a0a0f)` }}>
              <div className="p-3 h-full flex flex-col justify-between">
                {b.logo && <img src={b.logo} alt="" className="h-2 object-contain self-start" style={{ filter: 'brightness(0) invert(1)' }} />}
                <p className="text-[7px] text-white font-bold">Story</p>
              </div>
            </div>
          </div>
        </ContentPageDark>
      ),
    },

    // ─── PREMIUM PAGES ───────────────────────────────────────────
    {
      id: 'purpose', name: 'Brand Purpose',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <BrandPurposePage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'archetype', name: 'Brand Archetype',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <BrandArchetypePage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'logo-grid', name: 'Logo Construction',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <LogoConstructionPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'color-ratio', name: 'Color Ratio',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ColorRatioPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'gradients', name: 'Gradient System',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <GradientSystemPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'dark-mode', name: 'Dark Mode',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <DarkModePage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'patterns', name: 'Pattern System',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <PatternSystemPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'motion', name: 'Motion Principles',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <MotionPrinciplesPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'touchpoints', name: 'Touchpoints',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <TouchpointMapPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'stationery', name: 'Stationery',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <StationeryMockupPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
    {
      id: 'digital', name: 'Digital Product',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <DigitalProductPage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },

    // CLOSING
    {
      id: 'closing', name: 'Thank You',
      render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => (
        <ClosingTemplatePage brand={b} layout={l} pageNumber={pn} totalPages={tp} />
      ),
    },
  ];
}

// ─── MAIN COMPONENT ────────────────────────────────────────────

export function TemplateDocument({ brand }: TemplateDocumentProps) {
  const [activeLayoutId, setActiveLayoutId] = useState('hyperhyve');
  const [presentationMode, setPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [exporting, setExporting] = useState(false);

  const layout = getLayoutById(activeLayoutId);
  const slides = buildSlides(brand);
  const totalPages = slides.length;

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
      const pages = document.querySelectorAll('[data-tpl-page]');
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
        if (i > 0) pdf.addPage([1920, 1080], 'landscape');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 1920, 1080);
      }
      pdf.save(`${brand.slug || brand.name.toLowerCase()}-brand-guidelines.pdf`);
      toast.success('PDF exported');
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            {slides[currentSlide].render({ brand, layout, pageNumber: currentSlide + 1, totalPages })}
          </div>
        </div>
        <div className="h-14 bg-black/80 flex items-center justify-between px-6">
          <button onClick={() => setPresentationMode(false)} className="text-white/60 text-sm hover:text-white"><Minimize2 className="h-4 w-4" /></button>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className="text-white/60 hover:text-white disabled:opacity-20"><ChevronLeft className="h-5 w-5" /></button>
            <span className="text-white/60 text-sm font-mono">{currentSlide + 1} / {totalPages}</span>
            <button onClick={() => setCurrentSlide(Math.min(totalPages - 1, currentSlide + 1))} disabled={currentSlide === totalPages - 1} className="text-white/60 hover:text-white disabled:opacity-20"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <span className="text-white/30 text-xs">{slides[currentSlide].name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Guidelines</h2>
          <p className="text-muted-foreground">{totalPages} slides · {layout.name} template</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCurrentSlide(0); setPresentationMode(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Maximize2 className="h-3.5 w-3.5" /> Present
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="flex gap-2">
        {TEMPLATE_LAYOUTS.map(l => (
          <button
            key={l.id}
            onClick={() => setActiveLayoutId(l.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeLayoutId === l.id ? 'ring-2 ring-primary shadow-md' : 'border border-border hover:bg-muted'
            }`}
          >
            <div className="w-6 h-4 rounded-sm" style={{ background: l.preview }} />
            <div className="text-left">
              <p className="text-xs font-semibold">{l.name}</p>
              <p className="text-[9px] text-muted-foreground">{l.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Page Navigator */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {slides.map(s => (
          <button key={s.id} onClick={() => document.querySelector(`[data-tpl-id="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background hover:bg-muted transition-colors whitespace-nowrap">
            {s.name}
          </button>
        ))}
      </div>

      {/* Pages */}
      <div className="space-y-4">
        {slides.map((slide, i) => (
          <div key={slide.id} data-tpl-page data-tpl-id={slide.id} className="rounded-xl overflow-hidden shadow-lg border border-border">
            {slide.render({ brand, layout, pageNumber: i + 1, totalPages })}
          </div>
        ))}
      </div>
    </div>
  );
}
