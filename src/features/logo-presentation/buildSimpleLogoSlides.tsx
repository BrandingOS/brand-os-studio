/**
 * Builds editor slides for the SIMPLE logo presentation template.
 * Uses rounded cards on dark canvas (the LogoPresentationViewerSimple aesthetic).
 * Each slide is full aspect-video and self-contained.
 */
import type { SlideData, SlideRenderProps } from '@/shared/editor';
import type { LogoPresentationData, LogoConcept } from './types';

// ── Tokens ─────────────────────────────────────────
const BG = '#0A0A0F';
const CARD_LIGHT = '#F0F4F8';
const CARD_DARK = '#1A1E24';
const CARD_RADIUS = '24px';

// ── Shared frames ──────────────────────────────────

function CardFrame({ bg = CARD_LIGHT, children }: { bg?: string; children: React.ReactNode }) {
  return (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center" style={{ backgroundColor: BG }}>
      <div className="relative w-[calc(100%-96px)] h-[calc(100%-64px)] overflow-hidden" style={{ backgroundColor: bg, borderRadius: CARD_RADIUS }}>
        {children}
      </div>
    </div>
  );
}

function MetaBar({ conceptNum, version = 'v1', dark }: { conceptNum: number; version?: string; dark?: boolean }) {
  const y = new Date().getFullYear().toString();
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const color = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)';
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 text-[11px] tracking-wider" style={{ color }}>
      <div className="flex items-center gap-8">
        <span>Logo Concept</span>
        <span className="font-semibold">{String(conceptNum).padStart(2, '0')}</span>
        <span>{version}</span>
      </div>
      <div className="flex items-center gap-8">
        <span>{m}</span>
        <span>{y}</span>
      </div>
    </div>
  );
}

// ── Slide components ───────────────────────────────

function CoverSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full h-full absolute inset-0 overflow-hidden" style={{ backgroundColor: '#0C1929' }}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(ellipse at 30% 80%, rgba(10,61,98,0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(0,184,148,0.15) 0%, transparent 50%)',
      }} />
      <div className="relative z-10 flex flex-col justify-between h-full p-[5%]">
        <div>
          <h1 className="text-[clamp(32px,4.5vw,64px)] font-bold text-white leading-[1.05] tracking-tight">{data.brandName}</h1>
          <p className="text-[clamp(14px,1.5vw,20px)] text-white/40 mt-1 font-light">Logo design options</p>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-[10px] text-white/20">{data.agencyName ? `© All copyrights reserved to ${data.agencyName}` : ''}</p>
          <div className="flex items-center gap-6 text-[10px] text-white/20">
            <span>{data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>{data.version || 'V.1.0'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandOverviewSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full h-full absolute inset-0 flex flex-col justify-center p-[7%] text-white" style={{ backgroundColor: BG }}>
      <div className="mb-12">
        <h2 className="text-[clamp(24px,3vw,44px)] font-light text-white/90 mb-6 tracking-tight">BRAND OVERVIEW</h2>
        <p className="text-[clamp(12px,1.1vw,16px)] text-white/50 max-w-[65%] leading-relaxed">{data.brandBrief}</p>
        {data.brandPersonality.length > 0 && (
          <p className="text-[clamp(10px,0.9vw,13px)] text-white/30 mt-3">Mission: {data.brandPersonality.join(', ')}</p>
        )}
      </div>
      <div>
        <h2 className="text-[clamp(24px,3vw,44px)] font-light text-white/90 mb-6 tracking-tight">VISUAL STRATEGY</h2>
        {data.designGoals && data.designGoals.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-white/60 font-semibold mb-1.5">Design Goals:</p>
            {data.designGoals.map(g => (<p key={g} className="text-[clamp(10px,0.9vw,13px)] text-white/40">{g}</p>))}
          </div>
        )}
        {data.keywords && data.keywords.length > 0 && (
          <p className="text-[clamp(10px,0.9vw,13px)] text-white/30">Keywords: {data.keywords.join(', ')}</p>
        )}
      </div>
    </div>
  );
}

function SectionDividerSlide({ title }: { title: string }) {
  return (
    <div className="w-full h-full absolute inset-0 flex flex-col justify-center p-[7%]" style={{ backgroundColor: BG }}>
      <h2 className="text-[clamp(28px,4vw,56px)] font-light text-white/90 tracking-tight leading-[1.1]">{title}</h2>
      <p className="text-[clamp(10px,1vw,14px)] font-light text-white/25 mt-2 uppercase tracking-[0.2em]">OPTIONS</p>
    </div>
  );
}

function ConceptTitleSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  const cc = concept.color || data.primaryColor;
  return (
    <CardFrame>
      <MetaBar conceptNum={index + 1} version={data.version} />
      <div className="flex flex-col justify-end h-full p-10 pb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] mb-3 font-medium" style={{ color: cc }}>{concept.name}</p>
        <h2 className="text-[clamp(40px,6vw,80px)] font-black text-[#0A0A0F]/90 tracking-tight leading-[0.95]">Concept {index + 1}</h2>
        <p className="text-[clamp(11px,1vw,14px)] text-[#0A0A0F]/30 mt-3">{concept.direction}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: cc }} />
    </CardFrame>
  );
}

function HeroDarkSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  const cc = concept.color || data.primaryColor;
  return (
    <CardFrame bg={CARD_DARK}>
      <MetaBar conceptNum={index + 1} version={data.version} dark />
      <div className="flex items-center justify-center h-full relative">
        <img src={concept.logoUrl} alt={concept.name} className="max-w-[45%] max-h-[35%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        <div className="absolute w-[30%] h-[30%] rounded-full blur-3xl opacity-10" style={{ backgroundColor: concept.colorAccent || cc }} />
      </div>
    </CardFrame>
  );
}

function HeroLightSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  return (
    <CardFrame>
      <MetaBar conceptNum={index + 1} version={data.version} />
      <div className="flex flex-col items-center justify-center h-full">
        <img src={concept.logoUrl} alt={concept.name} className="max-w-[40%] max-h-[30%] object-contain" />
        <p className="absolute bottom-10 text-[12px] text-[#0A0A0F]/30 font-medium">The Logo is about:</p>
      </div>
    </CardFrame>
  );
}

function VariationsSlide({ concept, color }: { concept: LogoConcept; color: string }) {
  const cc = concept.color || color;
  const accent = concept.colorAccent || cc;
  const hasLogotype = !!concept.logotypeUrl;
  return (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center" style={{ backgroundColor: BG }}>
      <div className={`w-[calc(100%-96px)] h-[calc(100%-64px)] grid ${hasLogotype ? 'grid-cols-3 grid-rows-2' : 'grid-cols-2 grid-rows-2'} gap-3`}>
        <div className="row-span-2 flex items-center justify-center p-8" style={{ backgroundColor: CARD_LIGHT, borderRadius: CARD_RADIUS }}>
          <div className="relative w-full h-full flex items-center justify-center">
            <p className="absolute top-2 left-2 text-[9px] text-black/20">Primary Logo</p>
            <img src={concept.logoUrl} alt="" className="max-w-[65%] max-h-[50%] object-contain" />
          </div>
        </div>
        {hasLogotype && (
          <div className="flex items-center justify-center p-6" style={{ backgroundColor: CARD_LIGHT, borderRadius: CARD_RADIUS }}>
            <div className="relative w-full h-full flex items-center justify-center">
              <p className="absolute top-2 left-2 text-[9px] text-black/20">Logotype</p>
              <img src={concept.logotypeUrl} alt="" className="max-w-[80%] max-h-[40%] object-contain" />
            </div>
          </div>
        )}
        <div className="flex items-center justify-center p-6" style={{ backgroundColor: accent, borderRadius: CARD_RADIUS }}>
          <img src={concept.logoUrl} alt="" className="max-w-[60%] max-h-[45%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <div className={`flex items-center justify-center p-6 ${hasLogotype ? 'col-span-2' : ''}`} style={{ backgroundColor: cc, borderRadius: CARD_RADIUS }}>
          <img src={concept.logoUrl} alt="" className="max-w-[60%] max-h-[45%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
      </div>
    </div>
  );
}

function SymbolBreakdownSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  const cc = concept.color || data.primaryColor;
  const accent = concept.colorAccent || cc;
  const items = concept.symbolBreakdown || concept.whyItWorks.map((w, i) => ({ label: `Element ${i + 1}`, description: w }));
  const positions = [
    { x: '12%', y: '20%' }, { x: '78%', y: '15%' },
    { x: '10%', y: '72%' }, { x: '80%', y: '72%' },
  ];
  return (
    <CardFrame>
      <MetaBar conceptNum={index + 1} version={data.version} />
      <div className="relative flex items-center justify-center h-full">
        <img src={concept.iconUrl || concept.logoUrl} alt="" className="max-w-[18%] max-h-[30%] object-contain relative z-10" />
        {items.slice(0, 4).map((item, i) => (
          <div key={i} className="absolute flex flex-col items-center gap-1.5" style={{ left: positions[i].x, top: positions[i].y }}>
            <div className="w-10 h-10 rounded-full border flex items-center justify-center bg-white/60" style={{ borderColor: accent + '30' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
            </div>
            <p className="text-[9px] font-semibold text-[#0A0A0F]/60 text-center max-w-[120px]">{item.label}</p>
            <p className="text-[7px] text-[#0A0A0F]/30 text-center max-w-[120px]">{item.description}</p>
          </div>
        ))}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.1 }}>
          {items.slice(0, 4).map((_, i) => (
            <line key={i} x1="50%" y1="50%" x2={positions[i].x} y2={positions[i].y} stroke={accent} strokeWidth="1" strokeDasharray="4 4" />
          ))}
        </svg>
      </div>
    </CardFrame>
  );
}

function RationaleSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  const cc = concept.color || data.primaryColor;
  const accent = concept.colorAccent || cc;
  return (
    <CardFrame>
      <MetaBar conceptNum={index + 1} version={data.version} />
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center border-b border-black/[0.05]">
          <img src={concept.logoUrl} alt="" className="max-w-[35%] max-h-[45%] object-contain" />
        </div>
        <div className="grid grid-cols-3 gap-0 h-[42%]">
          <div className="p-5 border-r border-black/[0.05]">
            <p className="text-[10px] font-semibold mb-2" style={{ color: cc }}>{concept.name}</p>
            <p className="text-[9px] text-[#0A0A0F]/40 leading-relaxed">{concept.rationale}</p>
          </div>
          <div className="p-5 border-r border-black/[0.05] flex items-center justify-center">
            <img src={concept.iconUrl || concept.logoUrl} alt="" className="max-w-[50%] max-h-[60%] object-contain opacity-60" />
          </div>
          <div className="p-5 flex flex-col justify-center">
            {concept.whyItWorks.slice(0, 3).map((point, i) => (
              <p key={i} className="text-[8px] text-[#0A0A0F]/35 mb-1.5 flex items-start gap-1.5">
                <span className="text-[7px] mt-0.5 shrink-0 font-bold" style={{ color: accent }}>{i + 1}.</span>
                {point}
              </p>
            ))}
          </div>
        </div>
      </div>
    </CardFrame>
  );
}

function BrandColorHeroSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  const accent = concept.colorAccent || concept.color || data.primaryColor;
  return (
    <CardFrame bg={accent}>
      <MetaBar conceptNum={index + 1} version={data.version} dark />
      <div className="flex items-center justify-center h-full">
        <img src={concept.logoUrl} alt={concept.name} className="max-w-[45%] max-h-[35%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
      </div>
    </CardFrame>
  );
}

function AllOptionsSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center p-[4%]" style={{ backgroundColor: '#fff' }}>
      <div className="w-full h-full flex flex-col">
        <p className="text-[11px] text-black/30 mb-6">All Logos</p>
        <div className="flex-1 grid gap-0" style={{ gridTemplateColumns: `repeat(${data.concepts.length}, 1fr)` }}>
          {data.concepts.map((c, i) => (
            <div key={c.id} className="flex flex-col items-center justify-center border-r border-black/[0.04] last:border-r-0 px-6">
              <p className="text-[9px] text-black/25 mb-6 self-start">option-{i + 1}</p>
              <img src={c.logoUrl} alt={c.name} className="max-w-[75%] max-h-[35%] object-contain" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThankYouSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center relative" style={{ backgroundColor: BG }}>
      <h2 className="text-[clamp(36px,5vw,72px)] font-light text-white/90 tracking-tight">Thank You</h2>
      <div className="absolute bottom-[15%] right-[35%] w-16 h-16 opacity-20">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="3" fill={data.primaryColor} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <ellipse key={angle} cx="20" cy="8" rx="4" ry="8" fill="none" stroke="white" strokeWidth="0.5" transform={`rotate(${angle} 20 20)`} opacity="0.3" />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Builder ─────────────────────────────────────────

export function buildSimpleLogoSlides(data: LogoPresentationData): SlideData[] {
  const slides: SlideData[] = [];

  slides.push({ id: 'cover', name: 'Cover', render: (_p: SlideRenderProps) => <CoverSlide data={data} /> });
  slides.push({ id: 'overview', name: 'Brand Overview', render: (_p: SlideRenderProps) => <BrandOverviewSlide data={data} /> });
  slides.push({ id: 'divider-options', name: 'Logo Design', render: (_p: SlideRenderProps) => <SectionDividerSlide title="LOGO DESIGN" /> });

  data.concepts.forEach((concept, i) => {
    const label = i + 1;
    slides.push({ id: `${concept.id}-title`, name: `Concept ${label} — Title`, render: (_p) => <ConceptTitleSlide concept={concept} index={i} data={data} /> });
    slides.push({ id: `${concept.id}-hero-dark`, name: `Concept ${label} — Hero Dark`, render: (_p) => <HeroDarkSlide concept={concept} index={i} data={data} /> });
    slides.push({ id: `${concept.id}-hero-light`, name: `Concept ${label} — Hero Light`, render: (_p) => <HeroLightSlide concept={concept} index={i} data={data} /> });
    slides.push({ id: `${concept.id}-variations`, name: `Concept ${label} — Variations`, render: (_p) => <VariationsSlide concept={concept} color={data.primaryColor} /> });
    slides.push({ id: `${concept.id}-breakdown`, name: `Concept ${label} — Breakdown`, render: (_p) => <SymbolBreakdownSlide concept={concept} index={i} data={data} /> });
    slides.push({ id: `${concept.id}-rationale`, name: `Concept ${label} — Rationale`, render: (_p) => <RationaleSlide concept={concept} index={i} data={data} /> });
    slides.push({ id: `${concept.id}-brand-hero`, name: `Concept ${label} — Brand Color`, render: (_p) => <BrandColorHeroSlide concept={concept} index={i} data={data} /> });
  });

  slides.push({ id: 'divider-all', name: 'All Options', render: (_p: SlideRenderProps) => <SectionDividerSlide title="ALL OPTIONS" /> });
  slides.push({ id: 'all-options', name: 'All Logos', render: (_p: SlideRenderProps) => <AllOptionsSlide data={data} /> });
  slides.push({ id: 'thankyou', name: 'Thank You', render: (_p: SlideRenderProps) => <ThankYouSlide data={data} /> });

  return slides;
}
