/**
 * Builds slide data for the shared EditorWorkspace from logo presentation data.
 * Reuses the same slide components as the standalone LogoPresentationViewer
 * but wraps them in the SlideData format for the full editor experience.
 */
import type { SlideData, SlideRenderProps } from '@/shared/editor';
import type { LogoPresentationData, LogoConcept } from './types';

// ─── Slide Components (self-contained, no external deps) ────────

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
      <div className="flex gap-4 flex-wrap">
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
    <div className="w-full aspect-video flex flex-col justify-center p-[7%] text-white relative overflow-hidden" style={{ backgroundColor: concept.color || color }}>
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
      <p className="text-[9px] uppercase tracking-[0.3em] mb-4" style={{ color: concept.color || color }}>The Idea</p>
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
  const cc = concept.color || color;
  return (
    <div className="w-full aspect-video bg-[#F8F8F8] flex items-center justify-center relative">
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-10">
        {Array.from({ length: 48 }).map((_, i) => <div key={i} className="border border-dashed" style={{ borderColor: cc + '30' }} />)}
      </div>
      <div className="relative">
        <img src={concept.logoUrl} alt="" className="max-w-[35%] max-h-[40%] object-contain mx-auto" />
      </div>
      <p className="absolute bottom-[5%] left-[5%] text-[9px] text-gray-400">Construction grid — proportional geometry</p>
    </div>
  );
}

function WhyItWorksSlide({ concept, color }: { concept: LogoConcept; color: string }) {
  const cc = concept.color || color;
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] flex flex-col justify-center p-[7%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] mb-6" style={{ color: cc }}>Why It Works</p>
      <div className="space-y-3">
        {concept.whyItWorks.map((point, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-[12px] mt-0.5" style={{ color: cc }}>✓</span>
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
      <div className="flex gap-4 mt-2 text-[8px] text-gray-400">
        <span className="flex-1 text-center">Primary Logo</span>
        <span className="flex-1 text-center">Logomark</span>
        {hasLogotype && <span className="flex-1 text-center">Logotype</span>}
        <span className="flex-1 text-center">Monochrome</span>
      </div>
    </div>
  );
}

function ColorMonoSlide({ concept, color }: { concept: LogoConcept; color: string }) {
  const cc = concept.color || color;
  return (
    <div className="w-full aspect-video p-[3%]">
      <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
        <div className="bg-white rounded-lg flex items-center justify-center"><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" /></div>
        <div className="bg-[#0A0A0F] rounded-lg flex items-center justify-center"><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} /></div>
        <div className="rounded-lg flex items-center justify-center" style={{ backgroundColor: cc }}><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} /></div>
        <div className="bg-gray-100 rounded-lg flex items-center justify-center"><img src={concept.logoUrl} alt="" className="max-h-[50%] object-contain" style={{ filter: 'grayscale(1) brightness(0)' }} /></div>
      </div>
    </div>
  );
}

function InContextSlide({ concept, brandName, color }: { concept: LogoConcept; brandName: string; color: string }) {
  const cc = concept.color || color;
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] p-[5%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-4">In Context</p>
      <div className="grid grid-cols-3 gap-3 h-[80%]">
        <div className="bg-white rounded-lg p-3 flex flex-col justify-between">
          <img src={concept.logoUrl} alt="" className="h-4 object-contain self-start" />
          <div>
            <div className="text-[7px] font-bold text-gray-900">{brandName}</div>
            <div className="text-[5px] text-gray-400 mt-0.5">Business Card</div>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden flex flex-col" style={{ backgroundColor: cc }}>
          <div className="p-3 flex items-center gap-2">
            <img src={concept.logoUrl} alt="" className="h-3 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="text-[7px] text-white/70 font-medium">{brandName}</span>
          </div>
          <div className="flex-1 bg-white/10" />
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 flex flex-col items-center justify-center gap-2">
          <img src={concept.logoUrl} alt="" className="h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          <span className="text-[6px] text-white/40">Social Profile</span>
        </div>
      </div>
    </div>
  );
}

function CompareSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video bg-[#0A0A0F] p-[5%] text-white">
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-6">All Concepts</p>
      <div className={`grid ${data.concepts.length <= 3 ? `grid-cols-${data.concepts.length}` : 'grid-cols-4'} gap-4 h-[80%]`}>
        {data.concepts.map((concept, i) => (
          <div key={concept.id} className="bg-white rounded-lg flex flex-col items-center justify-center p-6 gap-3">
            <img src={concept.logoUrl} alt="" className="max-h-[45%] object-contain" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-gray-900">{concept.name}</p>
              <p className="text-[8px] text-gray-400">{concept.direction}</p>
            </div>
          </div>
        ))}
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

// ─── BUILDER FUNCTION ───────────────────────────────────────

export function buildLogoSlides(data: LogoPresentationData): SlideData[] {
  const slides: SlideData[] = [];

  // Setup slides
  slides.push({ id: 'cover', name: 'Cover', render: (_p: SlideRenderProps) => <CoverSlide data={data} /> });
  slides.push({ id: 'brief', name: 'The Brief', render: (_p: SlideRenderProps) => <BriefSlide data={data} /> });
  slides.push({ id: 'personality', name: 'Brand Personality', render: (_p: SlideRenderProps) => <PersonalitySlide data={data} /> });

  // Per-concept slides
  data.concepts.forEach((concept, i) => {
    const label = String.fromCharCode(65 + i);
    slides.push({
      id: `${concept.id}-title`,
      name: `Concept ${label}: ${concept.name}`,
      render: (_p: SlideRenderProps) => <ConceptTitleSlide concept={concept} index={i} color={data.primaryColor} />,
    });
    slides.push({
      id: `${concept.id}-idea`,
      name: `${label} — The Idea`,
      render: (_p: SlideRenderProps) => <ConceptIdeaSlide concept={concept} color={data.primaryColor} />,
    });
    slides.push({
      id: `${concept.id}-reveal`,
      name: `${label} — Logo Reveal`,
      render: (_p: SlideRenderProps) => <LogoRevealSlide concept={concept} />,
    });
    slides.push({
      id: `${concept.id}-construction`,
      name: `${label} — Construction`,
      render: (_p: SlideRenderProps) => <LogoConstructionSlide concept={concept} color={data.primaryColor} />,
    });
    slides.push({
      id: `${concept.id}-why`,
      name: `${label} — Why It Works`,
      render: (_p: SlideRenderProps) => <WhyItWorksSlide concept={concept} color={data.primaryColor} />,
    });
    slides.push({
      id: `${concept.id}-variations`,
      name: `${label} — Variations`,
      render: (_p: SlideRenderProps) => <VariationsSlide concept={concept} />,
    });
    slides.push({
      id: `${concept.id}-colormono`,
      name: `${label} — Color & Mono`,
      render: (_p: SlideRenderProps) => <ColorMonoSlide concept={concept} color={data.primaryColor} />,
    });
    slides.push({
      id: `${concept.id}-context`,
      name: `${label} — In Context`,
      render: (_p: SlideRenderProps) => <InContextSlide concept={concept} brandName={data.brandName} color={data.primaryColor} />,
    });
  });

  // Decision slides
  slides.push({ id: 'compare', name: 'All Concepts', render: (_p: SlideRenderProps) => <CompareSlide data={data} /> });
  slides.push({ id: 'thankyou', name: 'Thank You', render: (_p: SlideRenderProps) => <ThankYouSlide data={data} /> });

  return slides;
}
