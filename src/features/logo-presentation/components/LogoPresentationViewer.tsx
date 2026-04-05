/**
 * LogoPresentationViewer — premium logo concept presentation.
 * 28-slide deck: 4 setup + 8 per concept × 3 + 3 decision + 1 close.
 * Uses the guideline editor workspace for presentation/editing.
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from 'lucide-react';
import type { LogoPresentationData, LogoConcept } from '../types';
import { toast } from 'sonner';

interface LogoPresentationViewerProps {
  data: LogoPresentationData;
  onClose?: () => void;
}

interface Slide {
  id: string;
  render: () => React.ReactNode;
}

// ─── SLIDE BUILDERS ─────────────────────────────────────────

function CoverSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] flex flex-col justify-between p-[7%] text-white relative overflow-hidden">
      <div />
      <div>
        <h1 className="text-[clamp(36px,5vw,72px)] font-bold leading-[0.95] mb-3">{data.brandName}</h1>
        <p className="text-[clamp(14px,1.5vw,20px)] text-white/40">Logo Concepts</p>
      </div>
      <div className="flex justify-between items-end text-[clamp(9px,0.8vw,12px)] text-white/20">
        <span>{data.clientName && `Prepared for ${data.clientName}`}</span>
        <span>{data.date || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ backgroundColor: data.primaryColor, opacity: 0.06 }} />
    </div>
  );
}

function BriefSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] flex flex-col justify-center p-[7%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-4">The Brief</p>
      <blockquote className="text-[clamp(16px,2vw,28px)] font-medium leading-relaxed text-white/80 max-w-[70%]">
        "{data.brandBrief}"
      </blockquote>
    </div>
  );
}

function PersonalitySlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] flex flex-col justify-center p-[7%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-6">Brand Personality</p>
      <div className="flex gap-4">
        {data.brandPersonality.map(trait => (
          <span key={trait} className="text-[clamp(20px,3vw,40px)] font-bold text-white/90">{trait}.</span>
        ))}
      </div>
      <p className="text-[clamp(10px,1vw,14px)] text-white/25 mt-6">These attributes guided every design decision.</p>
    </div>
  );
}

function ConceptTitleSlide({ concept, index, color }: { concept: LogoConcept; index: number; color: string }) {
  return (
    <div className="w-full aspect-video flex flex-col justify-center p-[7%] text-white relative overflow-hidden" style={{ backgroundColor: color }}>
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-2">Concept {String.fromCharCode(65 + index)}</p>
      <h2 className="text-[clamp(32px,5vw,64px)] font-bold leading-[0.95] mb-3">"{concept.name}"</h2>
      <p className="text-[clamp(12px,1.2vw,16px)] text-white/60 max-w-[60%]">{concept.direction}</p>
      <span className="absolute -bottom-10 -right-10 text-[200px] font-black text-white/[0.04] leading-none">{String.fromCharCode(65 + index)}</span>
    </div>
  );
}

function ConceptIdeaSlide({ concept, color }: { concept: LogoConcept; color: string }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] flex flex-col justify-center p-[7%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] mb-4" style={{ color }}>The Idea</p>
      <p className="text-[clamp(16px,2vw,28px)] font-medium leading-relaxed text-white/80 max-w-[65%]">
        {concept.rationale}
      </p>
    </div>
  );
}

function LogoRevealSlide({ concept }: { concept: LogoConcept }) {
  return (
    <div className="w-full aspect-video bg-white flex items-center justify-center">
      <img src={concept.logoUrl} alt={concept.name} className="max-w-[40%] max-h-[50%] object-contain" />
    </div>
  );
}

function LogoConstructionSlide({ concept, color }: { concept: LogoConcept; color: string }) {
  return (
    <div className="w-full aspect-video bg-[#F8F8F8] flex items-center justify-center relative">
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-10">
        {Array.from({ length: 48 }).map((_, i) => <div key={i} className="border border-dashed" style={{ borderColor: color + '30' }} />)}
      </div>
      <div className="relative">
        <img src={concept.logoUrl} alt="" className="max-w-[35%] max-h-[40%] object-contain mx-auto" />
      </div>
      <p className="absolute bottom-[5%] left-[5%] text-[9px] text-gray-400">Construction grid — proportional geometry</p>
    </div>
  );
}

function WhyItWorksSlide({ concept, color }: { concept: LogoConcept; color: string }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] flex flex-col justify-center p-[7%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] mb-6" style={{ color }}>Why It Works</p>
      <div className="space-y-3">
        {concept.whyItWorks.map((point, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-[12px] mt-0.5" style={{ color }}>✓</span>
            <p className="text-[clamp(12px,1.2vw,16px)] text-white/70">{point}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariationsSlide({ concept }: { concept: LogoConcept }) {
  const hasLogotype = !!concept.logotypeUrl;
  return (
    <div className="w-full aspect-video bg-white p-[5%]">
      <p className="text-[9px] uppercase tracking-[0.3em] text-gray-400 mb-4">Variations</p>
      <div className={`grid ${hasLogotype ? 'grid-cols-4' : 'grid-cols-3'} gap-4 h-[75%]`}>
        <div className="bg-white border border-gray-100 rounded-lg flex items-center justify-center p-4">
          <img src={concept.logoUrl} alt="Primary" className="max-h-[60%] object-contain" />
        </div>
        <div className="bg-white border border-gray-100 rounded-lg flex items-center justify-center p-4">
          <img src={concept.logoUrl} alt="Mark" className="max-h-[40%] object-contain" />
        </div>
        {hasLogotype && (
          <div className="bg-white border border-gray-100 rounded-lg flex items-center justify-center p-4">
            <img src={concept.logotypeUrl} alt="Logotype" className="max-h-[50%] max-w-[85%] object-contain" />
          </div>
        )}
        <div className="bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center p-4">
          <img src={concept.logoUrl} alt="Mono" className="max-h-[60%] object-contain" style={{ filter: 'grayscale(1)' }} />
        </div>
      </div>
      <div className={`flex gap-4 mt-2 text-[8px] text-gray-400`}>
        <span className="flex-1 text-center">Primary Logo</span>
        <span className="flex-1 text-center">Logomark</span>
        {hasLogotype && <span className="flex-1 text-center">Logotype</span>}
        <span className="flex-1 text-center">Monochrome</span>
      </div>
    </div>
  );
}

function ColorMonoSlide({ concept, color }: { concept: LogoConcept; color: string }) {
  return (
    <div className="w-full aspect-video p-[3%]">
      <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
        <div className="bg-white rounded-lg flex items-center justify-center"><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" /></div>
        <div className="bg-[#0A0A0F] rounded-lg flex items-center justify-center"><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} /></div>
        <div className="rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} /></div>
        <div className="bg-gray-100 rounded-lg flex items-center justify-center"><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" style={{ filter: 'grayscale(1) brightness(0)' }} /></div>
      </div>
    </div>
  );
}

function InContextSlide({ concept, brandName, color }: { concept: LogoConcept; brandName: string; color: string }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] p-[5%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-4">In Context</p>
      <div className="grid grid-cols-3 gap-3 h-[80%]">
        {/* Business card mockup */}
        <div className="bg-white rounded-lg p-3 flex flex-col justify-between">
          <img src={concept.logoUrl} alt="" className="h-4 object-contain self-start" />
          <div><p className="text-[6px] text-gray-800 font-semibold">Jane Smith</p><p className="text-[5px]" style={{ color }}>Brand Manager</p></div>
        </div>
        {/* Website header mockup */}
        <div className="bg-white rounded-lg overflow-hidden flex flex-col">
          <div className="h-6 flex items-center px-2" style={{ backgroundColor: color }}><img src={concept.logoUrl} alt="" className="h-2.5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /></div>
          <div className="flex-1 p-2 space-y-1"><div className="h-1 w-3/4 rounded bg-gray-100" /><div className="h-1 w-1/2 rounded bg-gray-100" /></div>
        </div>
        {/* Social media mockup */}
        <div className="rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
          <div className="text-center"><img src={concept.logoUrl} alt="" className="h-8 object-contain mx-auto mb-1" style={{ filter: 'brightness(0) invert(1)' }} /><p className="text-[7px] text-white/60">{brandName}</p></div>
        </div>
      </div>
    </div>
  );
}

function CompareSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] p-[5%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-6">Compare Concepts</p>
      <div className="grid gap-4 h-[75%]" style={{ gridTemplateColumns: `repeat(${data.concepts.length}, 1fr)` }}>
        {data.concepts.map((c, i) => (
          <div key={c.id} className="flex flex-col items-center justify-center">
            <div className="w-full aspect-square bg-white rounded-xl flex items-center justify-center p-6 mb-3">
              <img src={c.logoUrl} alt={c.name} className="max-w-[60%] max-h-[60%] object-contain" />
            </div>
            <p className="text-[10px] font-semibold text-white/80">Concept {String.fromCharCode(65 + i)}</p>
            <p className="text-[clamp(12px,1.2vw,16px)] font-bold text-white mt-0.5">"{c.name}"</p>
            <p className="text-[9px] text-white/30 mt-0.5">{c.direction}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextStepsSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] flex flex-col justify-center p-[7%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-6">Next Steps</p>
      <div className="space-y-4 max-w-[60%]">
        <div className="flex items-start gap-3"><span className="text-[16px] font-bold" style={{ color: data.primaryColor }}>1.</span><p className="text-[clamp(12px,1.2vw,16px)] text-white/70">Select a direction that resonates with your vision</p></div>
        <div className="flex items-start gap-3"><span className="text-[16px] font-bold" style={{ color: data.primaryColor }}>2.</span><p className="text-[clamp(12px,1.2vw,16px)] text-white/70">We refine and finalize your chosen concept</p></div>
        <div className="flex items-start gap-3"><span className="text-[16px] font-bold" style={{ color: data.primaryColor }}>3.</span><p className="text-[clamp(12px,1.2vw,16px)] text-white/70">Deliver complete brand identity assets</p></div>
      </div>
    </div>
  );
}

function ThankYouSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video flex flex-col items-center justify-center text-white relative overflow-hidden" style={{ backgroundColor: data.primaryColor }}>
      <h2 className="text-[clamp(28px,4vw,56px)] font-bold mb-2">Thank you.</h2>
      <p className="text-[clamp(10px,1vw,14px)] text-white/50">{data.brandName} — {new Date().getFullYear()}</p>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────

export function LogoPresentationViewer({ data, onClose }: LogoPresentationViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [presentMode, setPresentMode] = useState(false);

  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];

    // Setup slides
    s.push({ id: 'cover', render: () => <CoverSlide data={data} /> });
    s.push({ id: 'brief', render: () => <BriefSlide data={data} /> });
    s.push({ id: 'personality', render: () => <PersonalitySlide data={data} /> });

    // Per-concept slides
    data.concepts.forEach((concept, i) => {
      s.push({ id: `${concept.id}-title`, render: () => <ConceptTitleSlide concept={concept} index={i} color={data.primaryColor} /> });
      s.push({ id: `${concept.id}-idea`, render: () => <ConceptIdeaSlide concept={concept} color={data.primaryColor} /> });
      s.push({ id: `${concept.id}-reveal`, render: () => <LogoRevealSlide concept={concept} /> });
      s.push({ id: `${concept.id}-construction`, render: () => <LogoConstructionSlide concept={concept} color={data.primaryColor} /> });
      s.push({ id: `${concept.id}-why`, render: () => <WhyItWorksSlide concept={concept} color={data.primaryColor} /> });
      s.push({ id: `${concept.id}-variations`, render: () => <VariationsSlide concept={concept} /> });
      s.push({ id: `${concept.id}-colormono`, render: () => <ColorMonoSlide concept={concept} color={data.primaryColor} /> });
      s.push({ id: `${concept.id}-context`, render: () => <InContextSlide concept={concept} brandName={data.brandName} color={data.primaryColor} /> });
    });

    // Decision slides
    s.push({ id: 'compare', render: () => <CompareSlide data={data} /> });
    s.push({ id: 'nextsteps', render: () => <NextStepsSlide data={data} /> });
    s.push({ id: 'thankyou', render: () => <ThankYouSlide data={data} /> });

    return s;
  }, [data]);

  const totalSlides = slides.length;
  const goTo = (idx: number) => { if (idx >= 0 && idx < totalSlides) setCurrentSlide(idx); };

  // Keyboard nav
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentSlide + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(currentSlide - 1);
    if (e.key === 'Escape') { if (presentMode) setPresentMode(false); else onClose?.(); }
  };

  // Presentation mode
  if (presentMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col outline-none" tabIndex={0} onKeyDown={handleKey} autoFocus>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[85vw]">{slides[currentSlide]?.render()}</div>
        </div>
        <div className="h-11 flex items-center justify-center gap-6 bg-black/90 border-t border-white/5">
          <button onClick={() => goTo(currentSlide - 1)} className="text-white/40 hover:text-white disabled:opacity-20"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-white/40 text-xs font-mono">{currentSlide + 1} / {totalSlides}</span>
          <button onClick={() => goTo(currentSlide + 1)} className="text-white/40 hover:text-white disabled:opacity-20"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setPresentMode(false)} className="ml-6 text-white/20 text-xs hover:text-white/60">ESC to exit</button>
        </div>
      </div>
    );
  }

  // Editor/viewer mode
  return (
    <div className="fixed inset-0 z-40 bg-[#141414] flex flex-col outline-none" tabIndex={0} onKeyDown={handleKey} autoFocus>
      {/* Top bar */}
      <div className="h-11 bg-[#141414] border-b border-white/[0.04] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {onClose && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>}
          <div className="bg-white/[0.05] rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-white/70 text-[13px] font-medium">{data.brandName}</span>
            <span className="text-white/15">/</span>
            <span className="text-white/40 text-[13px]">Slide {currentSlide + 1} of {totalSlides}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPresentMode(true)} className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg">Present</button>
          <button className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg">Export</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ padding: '24px 48px 16px 48px' }}>
        <div key={currentSlide} className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in-[0.97] duration-300">
          <div style={{ width: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '16/9' }}>
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/[0.08]">
              {slides[currentSlide]?.render()}
            </div>
          </div>
        </div>
      </div>

      {/* Slide dots + nav */}
      <div className="h-14 flex items-center justify-center gap-2 shrink-0">
        <button onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-20 flex items-center justify-center"><ChevronLeft className="h-4 w-4 text-white/60" /></button>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} className={`rounded-full transition-all ${i === currentSlide ? 'w-6 h-1.5 bg-white/60' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30'}`} />
          ))}
        </div>
        <button onClick={() => goTo(currentSlide + 1)} disabled={currentSlide >= totalSlides - 1} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-20 flex items-center justify-center"><ChevronRight className="h-4 w-4 text-white/60" /></button>
      </div>
    </div>
  );
}
