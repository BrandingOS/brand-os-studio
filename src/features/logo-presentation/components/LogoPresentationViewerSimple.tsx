/**
 * LogoPresentationViewerSimple — second template system.
 * Based on the Logos-Presentation-Simple.pdf reference:
 * - Rounded cards floating on dark (#0A0A0F) background
 * - Top metadata bar on every card slide
 * - Light cards (#F0F4F8) + dark cards alternating
 * - Section dividers with thin large text
 * - 3-card variation layout (1 large left + 2 stacked right)
 * - Symbol breakdown with annotation circles
 * - Brand color hero slide
 * - Final comparison: all options side by side
 */
import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, FileImage, FileText, Loader2, Package, Pen, Settings } from 'lucide-react';
import type { LogoPresentationData, LogoConcept } from '../types';
import type { PresentationSettings } from '@/shared/presentation';
import { PresentationCustomizer } from '@/shared/presentation';
import { useLogoPresentationStore, LOGO_PRESENTATION_TEMPLATES } from '../store';
import { toast } from 'sonner';

interface Props {
  data: LogoPresentationData;
  onClose?: () => void;
}

interface Slide {
  id: string;
  render: () => React.ReactNode;
}

// ─── DESIGN TOKENS ─────────────────────────────────────────
const BG = '#0A0A0F';
const CARD_LIGHT = '#F0F4F8';
const CARD_DARK = '#1A1E24';
const CARD_RADIUS = '24px';
const CARD_MARGIN = '48px';

// ─── SHARED COMPONENTS ─────────────────────────────────────

function CardFrame({ bg = CARD_LIGHT, children }: { bg?: string; children: React.ReactNode }) {
  return (
    <div className="w-full aspect-video flex items-center justify-center" style={{ backgroundColor: BG }}>
      <div className="relative w-[calc(100%-96px)] h-[calc(100%-64px)] overflow-hidden" style={{ backgroundColor: bg, borderRadius: CARD_RADIUS }}>
        {children}
      </div>
    </div>
  );
}

function MetaBar({ conceptNum, version = 'v1', month, year }: { conceptNum: number; version?: string; month?: string; year?: string }) {
  const y = year || new Date().getFullYear().toString();
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 text-[11px] tracking-wider" style={{ color: 'rgba(0,0,0,0.35)' }}>
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

function MetaBarDark({ conceptNum, version = 'v1', month, year }: { conceptNum: number; version?: string; month?: string; year?: string }) {
  const y = year || new Date().getFullYear().toString();
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 text-[11px] tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
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

// ─── SLIDE BUILDERS ─────────────────────────────────────────

function CoverSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video relative overflow-hidden" style={{ backgroundColor: '#0C1929' }}>
      {/* Subtle texture overlay */}
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
    <div className="w-full aspect-video flex flex-col justify-center p-[7%] text-white" style={{ backgroundColor: BG }}>
      <div className="mb-12">
        <h2 className="text-[clamp(24px,3vw,44px)] font-light text-white/90 mb-6 tracking-tight">BRAND OVERVIEW</h2>
        <p className="text-[clamp(12px,1.1vw,16px)] text-white/50 max-w-[65%] leading-relaxed">{data.brandBrief}</p>
        {data.brandPersonality.length > 0 && (
          <p className="text-[clamp(10px,0.9vw,13px)] text-white/30 mt-3">
            Mission: {data.brandPersonality.join(', ')}
          </p>
        )}
      </div>
      <div>
        <h2 className="text-[clamp(24px,3vw,44px)] font-light text-white/90 mb-6 tracking-tight">VISUAL STRATEGY</h2>
        {data.designGoals && data.designGoals.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-white/60 font-semibold mb-1.5">Design Goals:</p>
            {data.designGoals.map(g => (
              <p key={g} className="text-[clamp(10px,0.9vw,13px)] text-white/40">{g}</p>
            ))}
          </div>
        )}
        {data.keywords && data.keywords.length > 0 && (
          <p className="text-[clamp(10px,0.9vw,13px)] text-white/30">
            Keywords: {data.keywords.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionDividerSlide({ title }: { title: string }) {
  return (
    <div className="w-full aspect-video flex flex-col justify-center p-[7%]" style={{ backgroundColor: BG }}>
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
        <h2 className="text-[clamp(40px,6vw,80px)] font-black text-[#0A0A0F]/90 tracking-tight leading-[0.95]">
          Concept {index + 1}
        </h2>
        <p className="text-[clamp(11px,1vw,14px)] text-[#0A0A0F]/30 mt-3">{concept.direction}</p>
      </div>
      {/* Color accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: cc }} />
    </CardFrame>
  );
}

function HeroDarkSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  const cc = concept.color || data.primaryColor;
  return (
    <CardFrame bg={CARD_DARK}>
      <MetaBarDark conceptNum={index + 1} version={data.version} />
      <div className="flex items-center justify-center h-full relative">
        <img src={concept.logoUrl} alt={concept.name} className="max-w-[45%] max-h-[35%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        {/* Subtle glow behind logo */}
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
    <div className="w-full aspect-video flex items-center justify-center" style={{ backgroundColor: BG }}>
      <div className={`w-[calc(100%-96px)] h-[calc(100%-64px)] grid ${hasLogotype ? 'grid-cols-3 grid-rows-2' : 'grid-cols-2 grid-rows-2'} gap-3`}>
        {/* Large left card — spans 2 rows */}
        <div className="row-span-2 flex items-center justify-center p-8" style={{ backgroundColor: CARD_LIGHT, borderRadius: CARD_RADIUS }}>
          <div className="relative w-full h-full flex items-center justify-center">
            <p className="absolute top-2 left-2 text-[9px] text-black/20">Primary Logo</p>
            <img src={concept.logoUrl} alt="" className="max-w-[65%] max-h-[50%] object-contain" />
          </div>
        </div>
        {/* Logotype card — if available */}
        {hasLogotype && (
          <div className="flex items-center justify-center p-6" style={{ backgroundColor: CARD_LIGHT, borderRadius: CARD_RADIUS }}>
            <div className="relative w-full h-full flex items-center justify-center">
              <p className="absolute top-2 left-2 text-[9px] text-black/20">Logotype</p>
              <img src={concept.logotypeUrl} alt="" className="max-w-[90%] max-h-[65%] object-contain" />
            </div>
          </div>
        )}
        {/* Top right — concept color */}
        <div className="flex items-center justify-center p-6" style={{ backgroundColor: accent, borderRadius: CARD_RADIUS }}>
          <img src={concept.logoUrl} alt="" className="max-w-[60%] max-h-[45%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        {/* Bottom right — concept dark */}
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
    { x: '12%', y: '20%' },
    { x: '78%', y: '15%' },
    { x: '10%', y: '72%' },
    { x: '80%', y: '72%' },
  ];

  return (
    <CardFrame>
      <MetaBar conceptNum={index + 1} version={data.version} />
      <div className="relative flex items-center justify-center h-full">
        {/* Center icon */}
        <img src={concept.iconUrl || concept.logoUrl} alt="" className="max-w-[18%] max-h-[30%] object-contain relative z-10" />

        {/* Annotation points */}
        {items.slice(0, 4).map((item, i) => (
          <div key={i} className="absolute flex flex-col items-center gap-1.5" style={{ left: positions[i].x, top: positions[i].y }}>
            <div className="w-10 h-10 rounded-full border flex items-center justify-center bg-white/60" style={{ borderColor: accent + '30' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
            </div>
            <p className="text-[9px] font-semibold text-[#0A0A0F]/60 text-center max-w-[120px]">{item.label}</p>
            <p className="text-[7px] text-[#0A0A0F]/30 text-center max-w-[120px]">{item.description}</p>
          </div>
        ))}

        {/* Connection lines — subtle */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.1 }}>
          {items.slice(0, 4).map((_, i) => (
            <line key={i} x1="50%" y1="50%"
              x2={positions[i].x} y2={positions[i].y}
              stroke={accent} strokeWidth="1" strokeDasharray="4 4" />
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
        {/* Top: Logo large */}
        <div className="flex-1 flex items-center justify-center border-b border-black/[0.05]">
          <img src={concept.logoUrl} alt="" className="max-w-[35%] max-h-[45%] object-contain" />
        </div>
        {/* Bottom: Rationale grid */}
        <div className="grid grid-cols-3 gap-0 h-[42%]">
          {/* Left: Text explanation */}
          <div className="p-5 border-r border-black/[0.05]">
            <p className="text-[10px] font-semibold mb-2" style={{ color: cc }}>{concept.name}</p>
            <p className="text-[9px] text-[#0A0A0F]/40 leading-relaxed">{concept.rationale}</p>
          </div>
          {/* Center: Icon breakdown */}
          <div className="p-5 border-r border-black/[0.05] flex items-center justify-center">
            <img src={concept.iconUrl || concept.logoUrl} alt="" className="max-w-[50%] max-h-[60%] object-contain opacity-60" />
          </div>
          {/* Right: Key points */}
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

function ConstructionSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  return (
    <CardFrame>
      <MetaBar conceptNum={index + 1} version={data.version} />
      <div className="relative flex items-center justify-center h-full overflow-hidden">
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.06 }}>
          {/* Horizontal lines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 8}%`} x2="100%" y2={`${(i + 1) * 8}%`} stroke="#0A0A0F" strokeWidth="0.5" />
          ))}
          {/* Vertical lines */}
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * 6}%`} y1="0" x2={`${(i + 1) * 6}%`} y2="100%" stroke="#0A0A0F" strokeWidth="0.5" />
          ))}
          {/* Diagonal lines */}
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="#0A0A0F" strokeWidth="0.5" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="#0A0A0F" strokeWidth="0.5" />
          <line x1="50%" y1="0" x2="100%" y2="100%" stroke="#0A0A0F" strokeWidth="0.5" />
          <line x1="50%" y1="0" x2="0" y2="100%" stroke="#0A0A0F" strokeWidth="0.5" />
          <line x1="0" y1="50%" x2="100%" y2="0" stroke="#0A0A0F" strokeWidth="0.5" />
          <line x1="0" y1="50%" x2="100%" y2="100%" stroke="#0A0A0F" strokeWidth="0.5" />
        </svg>
        {/* Icon centered */}
        <img src={concept.iconUrl || concept.logoUrl} alt="" className="max-w-[15%] max-h-[25%] object-contain relative z-10 opacity-70" />
        {/* Small logo in circle bottom-left */}
        <div className="absolute bottom-6 left-6 w-10 h-10 rounded-full bg-[#0A0A0F] flex items-center justify-center">
          <img src={concept.iconUrl || concept.logoUrl} alt="" className="w-5 h-5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
      </div>
    </CardFrame>
  );
}

function BrandColorHeroSlide({ concept, index, data }: { concept: LogoConcept; index: number; data: LogoPresentationData }) {
  const accent = concept.colorAccent || concept.color || data.primaryColor;
  return (
    <CardFrame bg={accent}>
      <MetaBarDark conceptNum={index + 1} version={data.version} />
      <div className="flex items-center justify-center h-full">
        <img src={concept.logoUrl} alt={concept.name} className="max-w-[45%] max-h-[35%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
      </div>
    </CardFrame>
  );
}

function AllOptionsSlide({ data }: { data: LogoPresentationData }) {
  return (
    <div className="w-full aspect-video flex items-center justify-center p-[4%]" style={{ backgroundColor: '#fff' }}>
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
    <div className="w-full aspect-video flex items-center justify-center relative" style={{ backgroundColor: BG }}>
      <h2 className="text-[clamp(36px,5vw,72px)] font-light text-white/90 tracking-tight">
        Thank You
      </h2>
      {/* Decorative accent */}
      <div className="absolute bottom-[15%] right-[35%] w-16 h-16 opacity-20">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="3" fill={data.primaryColor} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <ellipse key={angle} cx="20" cy="8" rx="4" ry="8" fill="none" stroke="white" strokeWidth="0.5"
              transform={`rotate(${angle} 20 20)`} opacity="0.3" />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────

// ─── EXPORT HELPERS ─────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchSvgText(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

/** Render an SVG string to a canvas and return as data URL */
async function svgToDataUrl(svgText: string, width: number, height: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

/** Build editable PDF with real text, shapes, and high-res logo renders */
async function exportEditablePDF(data: LogoPresentationData) {
  const { jsPDF } = await import('jspdf');
  const W = 1920, H = 1080;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H] });

  // Pre-render all logos as images
  const logoImages: Map<string, string> = new Map();
  for (const c of data.concepts) {
    for (const url of [c.logoUrl, c.iconUrl]) {
      if (url && url.startsWith('/') && !logoImages.has(url)) {
        try {
          const svgText = await fetchSvgText(url);
          const dataUrl = await svgToDataUrl(svgText, 600, 300);
          if (dataUrl) logoImages.set(url, dataUrl);
        } catch { /* skip */ }
      }
    }
  }

  // Helper: draw rounded rect
  const roundRect = (x: number, y: number, w: number, h: number, r: number, color: string) => {
    const [cr, cg, cb] = hexToRgb(color);
    pdf.setFillColor(cr, cg, cb);
    pdf.roundedRect(x, y, w, h, r, r, 'F');
  };

  // Helper: add logo image centered in area
  const drawLogo = (url: string, cx: number, cy: number, maxW: number, maxH: number) => {
    const imgData = logoImages.get(url);
    if (!imgData) return;
    // Maintain aspect ratio — use maxW × maxH as bounding box
    const lw = maxW;
    const lh = maxH;
    pdf.addImage(imgData, 'PNG', cx - lw / 2, cy - lh / 2, lw, lh);
  };

  // ── PAGE 1: COVER ──
  roundRect(0, 0, W, H, 0, '#0C1929');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(64);
  pdf.setTextColor(255, 255, 255);
  pdf.text(data.brandName, 96, 160);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255, 0.4);
  pdf.text('Logo design options', 96, 200);
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255, 0.2);
  pdf.text(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), W - 96, H - 60, { align: 'right' });

  // ── PAGE 2: BRAND OVERVIEW ──
  pdf.addPage([W, H], 'landscape');
  roundRect(0, 0, W, H, 0, '#0A0A0F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(40);
  pdf.setTextColor(255, 255, 255);
  pdf.text('BRAND OVERVIEW', 96, 120);
  pdf.setFontSize(15);
  pdf.setTextColor(200, 200, 200);
  const briefLines = pdf.splitTextToSize(data.brandBrief, W * 0.6);
  pdf.text(briefLines, 96, 180);
  pdf.setFontSize(40);
  pdf.setTextColor(255, 255, 255);
  pdf.text('VISUAL STRATEGY', 96, 500);
  if (data.designGoals) {
    pdf.setFontSize(13);
    pdf.setTextColor(180, 180, 180);
    pdf.text('Design Goals:', 96, 550);
    pdf.setTextColor(150, 150, 150);
    data.designGoals.forEach((g, i) => pdf.text(g, 96, 575 + i * 22));
  }
  if (data.keywords) {
    pdf.setFontSize(13);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Keywords: ${data.keywords.join(', ')}`, 96, 700);
  }

  // ── PAGE 3: SECTION DIVIDER ──
  pdf.addPage([W, H], 'landscape');
  roundRect(0, 0, W, H, 0, '#0A0A0F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(56);
  pdf.setTextColor(255, 255, 255);
  pdf.text('LOGO DESIGN', 96, H / 2);
  pdf.setFontSize(14);
  pdf.setTextColor(100, 100, 100);
  pdf.text('OPTIONS', 96, H / 2 + 35);

  // ── PER CONCEPT ──
  for (let i = 0; i < data.concepts.length; i++) {
    const c = data.concepts[i];
    const cc = c.color || data.primaryColor;
    const accent = c.colorAccent || cc;
    const [pr, pg, pb] = hexToRgb(cc);
    const [ar, ag, ab] = hexToRgb(accent);

    // Concept title page (light card on dark)
    pdf.addPage([W, H], 'landscape');
    roundRect(0, 0, W, H, 0, '#0A0A0F');
    roundRect(48, 32, W - 96, H - 64, 24, '#F0F4F8');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0, 0.3);
    pdf.text(`Logo Concept    ${String(i + 1).padStart(2, '0')}    v1`, 130, 78);
    pdf.text(String(new Date().getFullYear()), W - 130, 78, { align: 'right' });
    pdf.setFontSize(11);
    pdf.setTextColor(pr, pg, pb);
    pdf.text(c.name.toUpperCase(), 130, H - 200);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(72);
    pdf.setTextColor(10, 10, 15);
    pdf.text(`Concept ${i + 1}`, 130, H - 130);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(100, 100, 100);
    pdf.text(c.direction, 130, H - 100);
    // Accent bar
    pdf.setFillColor(pr, pg, pb);
    pdf.rect(48, H - 33, W - 96, 4, 'F');

    // Hero dark
    pdf.addPage([W, H], 'landscape');
    roundRect(0, 0, W, H, 0, '#0A0A0F');
    roundRect(48, 32, W - 96, H - 64, 24, '#1A1E24');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255, 0.25);
    pdf.text(`Logo Concept    ${String(i + 1).padStart(2, '0')}    v1`, 130, 78);
    drawLogo(c.logoUrl, W / 2, H / 2, 500, 200);

    // Hero light
    pdf.addPage([W, H], 'landscape');
    roundRect(0, 0, W, H, 0, '#0A0A0F');
    roundRect(48, 32, W - 96, H - 64, 24, '#F0F4F8');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0, 0.3);
    pdf.text(`Logo Concept    ${String(i + 1).padStart(2, '0')}    v1`, 130, 78);
    drawLogo(c.logoUrl, W / 2, H / 2, 450, 180);
    pdf.setFontSize(13);
    pdf.setTextColor(0, 0, 0, 0.25);
    pdf.text('The Logo is about:', W / 2, H - 80, { align: 'center' });

    // Variations page
    pdf.addPage([W, H], 'landscape');
    roundRect(0, 0, W, H, 0, '#0A0A0F');
    const cw = (W - 112) / 2;
    const ch = H - 96;
    const sh = (ch - 16) / 2;
    // Large left (light)
    roundRect(48, 48, cw, ch, 24, '#F0F4F8');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0, 0.2);
    pdf.text('Logo Variations', 72, 76);
    drawLogo(c.logoUrl, 48 + cw / 2, 48 + ch / 2, 380, 160);
    // Top right (accent)
    roundRect(48 + cw + 16, 48, cw, sh, 24, accent);
    drawLogo(c.logoUrl, 48 + cw + 16 + cw / 2, 48 + sh / 2, 320, 130);
    // Bottom right (dark)
    roundRect(48 + cw + 16, 48 + sh + 16, cw, sh, 24, cc);
    drawLogo(c.logoUrl, 48 + cw + 16 + cw / 2, 48 + sh + 16 + sh / 2, 320, 130);

    // Rationale page
    pdf.addPage([W, H], 'landscape');
    roundRect(0, 0, W, H, 0, '#0A0A0F');
    roundRect(48, 32, W - 96, H - 64, 24, '#F0F4F8');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0, 0.3);
    pdf.text(`Logo Concept    ${String(i + 1).padStart(2, '0')}    v1`, 130, 78);
    // Logo top half
    drawLogo(c.logoUrl, W / 2, H * 0.32, 380, 150);
    // Divider line
    pdf.setDrawColor(0, 0, 0, 0.05);
    pdf.line(100, H * 0.52, W - 100, H * 0.52);
    // Rationale text
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(pr, pg, pb);
    pdf.text(c.name, 130, H * 0.58);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);
    const rationaleLines = pdf.splitTextToSize(c.rationale, W * 0.35);
    pdf.text(rationaleLines, 130, H * 0.62);
    // Why it works
    pdf.setFontSize(10);
    c.whyItWorks.slice(0, 4).forEach((point, pi) => {
      pdf.setTextColor(ar, ag, ab);
      pdf.text(`${pi + 1}.`, W * 0.58, H * 0.58 + pi * 30);
      pdf.setTextColor(100, 100, 100);
      const ptLines = pdf.splitTextToSize(point, W * 0.3);
      pdf.text(ptLines, W * 0.60, H * 0.58 + pi * 30);
    });

    // Brand color hero
    pdf.addPage([W, H], 'landscape');
    roundRect(0, 0, W, H, 0, '#0A0A0F');
    roundRect(48, 32, W - 96, H - 64, 24, accent);
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255, 0.3);
    pdf.text(`Logo Concept    ${String(i + 1).padStart(2, '0')}    v1`, 130, 78);
    drawLogo(c.logoUrl, W / 2, H / 2, 500, 200);
  }

  // ── ALL OPTIONS DIVIDER ──
  pdf.addPage([W, H], 'landscape');
  roundRect(0, 0, W, H, 0, '#0A0A0F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(56);
  pdf.setTextColor(255, 255, 255);
  pdf.text('ALL OPTIONS', 96, H / 2);

  // ── ALL OPTIONS COMPARISON ──
  pdf.addPage([W, H], 'landscape');
  roundRect(0, 0, W, H, 0, '#FFFFFF');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0, 0.3);
  pdf.text('All Logos', 80, 60);
  const colW = (W - 160) / data.concepts.length;
  data.concepts.forEach((c, ci) => {
    const cx = 80 + ci * colW + colW / 2;
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0, 0.2);
    pdf.text(`option-${ci + 1}`, 80 + ci * colW, 120);
    drawLogo(c.logoUrl, cx, H / 2, 300, 120);
    // Divider line between columns
    if (ci < data.concepts.length - 1) {
      pdf.setDrawColor(0, 0, 0, 0.04);
      pdf.line(80 + (ci + 1) * colW, 100, 80 + (ci + 1) * colW, H - 100);
    }
  });

  // ── THANK YOU ──
  pdf.addPage([W, H], 'landscape');
  roundRect(0, 0, W, H, 0, '#0A0A0F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(64);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Thank You', W / 2, H / 2, { align: 'center' });

  pdf.save(`${data.brandName}-Logo-Presentation.pdf`);
}

/** Download all SVG files as ZIP */
async function exportLogoSVGs(data: LogoPresentationData) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const c of data.concepts) {
    const name = c.name.replace(/\s+/g, '-');
    if (c.logoUrl.startsWith('/')) zip.file(`${name}_Logo.svg`, await fetchSvgText(c.logoUrl));
    if (c.iconUrl?.startsWith('/')) zip.file(`${name}_Icon.svg`, await fetchSvgText(c.iconUrl));
  }
  downloadBlob(await zip.generateAsync({ type: 'blob' }), `${data.brandName}-Logos-SVG.zip`);
}

export function LogoPresentationViewerSimple({ data, onClose }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [presentMode, setPresentMode] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const {
    settings,
    setTemplate,
    setSizeFormat,
    setCustomSize,
    setLanguageDirection,
    updateSpacing,
    updateHeader,
    updateFooter,
    resetSettings,
  } = useLogoPresentationStore();

  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];

    // Setup slides
    s.push({ id: 'cover', render: () => <CoverSlide data={data} /> });
    s.push({ id: 'overview', render: () => <BrandOverviewSlide data={data} /> });
    s.push({ id: 'divider-options', render: () => <SectionDividerSlide title="LOGO DESIGN" /> });

    // Per-concept slides
    data.concepts.forEach((concept, i) => {
      s.push({ id: `${concept.id}-title`, render: () => <ConceptTitleSlide concept={concept} index={i} data={data} /> });
      s.push({ id: `${concept.id}-hero-dark`, render: () => <HeroDarkSlide concept={concept} index={i} data={data} /> });
      s.push({ id: `${concept.id}-hero-light`, render: () => <HeroLightSlide concept={concept} index={i} data={data} /> });
      s.push({ id: `${concept.id}-variations`, render: () => <VariationsSlide concept={concept} color={data.primaryColor} /> });
      s.push({ id: `${concept.id}-breakdown`, render: () => <SymbolBreakdownSlide concept={concept} index={i} data={data} /> });
      s.push({ id: `${concept.id}-rationale`, render: () => <RationaleSlide concept={concept} index={i} data={data} /> });
      s.push({ id: `${concept.id}-grid`, render: () => <ConstructionSlide concept={concept} index={i} data={data} /> });
      s.push({ id: `${concept.id}-brand-hero`, render: () => <BrandColorHeroSlide concept={concept} index={i} data={data} /> });
    });

    // Closing slides
    s.push({ id: 'divider-all', render: () => <SectionDividerSlide title="ALL OPTIONS" /> });
    s.push({ id: 'all-options', render: () => <AllOptionsSlide data={data} /> });
    s.push({ id: 'thankyou', render: () => <ThankYouSlide data={data} /> });

    return s;
  }, [data]);

  const totalSlides = slides.length;
  const goTo = (idx: number) => { if (idx >= 0 && idx < totalSlides) setCurrentSlide(idx); };

  const handleExport = useCallback(async (type: string) => {
    setExporting(type);
    try {
      if (type === 'pdf') {
        await exportEditablePDF(data);
        toast.success('Editable PDF downloaded — text & shapes are selectable');
      } else if (type === 'logos') {
        await exportLogoSVGs(data);
        toast.success('Logo SVGs downloaded');
      }
    } catch (err) {
      toast.error('Export failed — try again');
      console.error(err);
    }
    setExporting(null);
  }, [data]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentSlide + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(currentSlide - 1);
    if (e.key === 'Escape') { if (presentMode) setPresentMode(false); else if (showExport) setShowExport(false); else onClose?.(); }
  };

  // Presentation mode
  if (presentMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col outline-none" tabIndex={0} onKeyDown={handleKey} autoFocus>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[85vw]">{slides[currentSlide]?.render()}</div>
        </div>
        <div className="h-11 flex items-center justify-center gap-6 bg-black/90 border-t border-white/5">
          <button onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0} className="text-white/30 hover:text-white disabled:opacity-20"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-[11px] text-white/30 font-mono">{currentSlide + 1} / {totalSlides}</span>
          <button onClick={() => goTo(currentSlide + 1)} disabled={currentSlide === totalSlides - 1} className="text-white/30 hover:text-white disabled:opacity-20"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setPresentMode(false)} className="ml-4 text-white/20 hover:text-white/50"><Minimize2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#111] flex flex-col outline-none" tabIndex={0} onKeyDown={handleKey} autoFocus>
      {/* Top bar */}
      <div className="h-14 border-b border-white/[0.04] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-white/30 hover:text-white/60 transition-colors">← Back to Editor</button>
          <span className="text-white/10">|</span>
          <span className="text-sm text-white/50 font-semibold">{data.brandName}</span>
          <span className="text-[9px] text-white/20 bg-white/[0.04] px-2 py-0.5 rounded-full">Simple</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCustomizer(!showCustomizer); if (!showCustomizer) setShowExport(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${showCustomizer ? 'text-white/80 bg-white/10 border-white/15' : 'text-white/40 hover:text-white/70 border-white/[0.06] hover:border-white/15'}`}
          >
            <Settings className="h-3 w-3" /> Customize
          </button>
          <button onClick={() => setPresentMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15 transition-colors">
            <Maximize2 className="h-3 w-3" /> Present
          </button>
          <button onClick={() => { setShowExport(!showExport); if (!showExport) setShowCustomizer(false); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${showExport ? 'text-white/80 bg-white/10 border-white/15' : 'text-white/40 hover:text-white/70 border-white/[0.06] hover:border-white/15'}`}>
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Slide thumbnails */}
        <div className="w-48 border-r border-white/[0.04] overflow-y-auto py-3 px-2 space-y-2 shrink-0">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => {
                const el = document.getElementById(`slide-${slide.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setCurrentSlide(i);
              }}
              className={`w-full rounded-lg overflow-hidden transition-all ${
                i === currentSlide ? 'ring-2 ring-blue-500/60 shadow-lg' : 'ring-1 ring-white/[0.06] hover:ring-white/15'
              }`}
            >
              <div className="aspect-video relative overflow-hidden bg-[#0A0A0F]">
                <div className="absolute inset-0 pointer-events-none origin-top-left" style={{ width: '1200px', transform: 'scale(0.148)', transformOrigin: 'top left' }}>
                  {slide.render()}
                </div>
                <div className="absolute top-1 left-1.5 text-[7px] font-mono text-white/40 bg-black/40 px-1 rounded">
                  {i + 1}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Scroll view — all slides stacked vertically */}
        <div className="flex-1 overflow-y-auto bg-[#0D0D0D]" style={{ scrollBehavior: 'smooth' }}>
          <div className="max-w-[960px] mx-auto py-10 px-6 space-y-6">
            {slides.map((slide, i) => (
              <div key={slide.id} id={`slide-${slide.id}`} data-slide-export className="rounded-xl overflow-hidden shadow-2xl shadow-black/40">
                {slide.render()}
              </div>
            ))}
          </div>
        </div>

        {/* Customizer panel — right sidebar */}
        {showCustomizer && (
          <div className="w-72 border-l border-white/[0.04] bg-[#141414] shrink-0 animate-in slide-in-from-right duration-200">
            <PresentationCustomizer
              settings={settings}
              templates={LOGO_PRESENTATION_TEMPLATES}
              onSetTemplate={setTemplate}
              onSetSizeFormat={setSizeFormat}
              onSetCustomSize={setCustomSize}
              onSetLanguageDirection={setLanguageDirection}
              onUpdateSpacing={updateSpacing}
              onUpdateHeader={updateHeader}
              onUpdateFooter={updateFooter}
              onReset={resetSettings}
              title="Logo Presentation"
            />
          </div>
        )}

        {/* Export panel — right sidebar */}
        {showExport && (
          <div className="w-72 border-l border-white/[0.04] bg-[#141414] shrink-0 overflow-y-auto p-4 space-y-3 animate-in slide-in-from-right duration-200">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Export</h3>

            {/* Editable PDF */}
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-white/[0.08] hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 group-hover:text-white">Editable PDF</p>
                <p className="text-[9px] text-white/25 mt-0.5">Real text & shapes — editable in Illustrator, Acrobat, Figma</p>
              </div>
              {exporting === 'pdf' && <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0 mt-1" />}
            </button>

            {/* Logo SVGs */}
            <button
              onClick={() => handleExport('logos')}
              disabled={!!exporting}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-white/[0.08] hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Pen className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 group-hover:text-white">Logo SVGs</p>
                <p className="text-[9px] text-white/25 mt-0.5">All logos & icons as editable vector SVG — open in Illustrator</p>
              </div>
              {exporting === 'logos' && <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0 mt-1" />}
            </button>

            {/* What you get */}
            <div className="mt-4 pt-4 border-t border-white/[0.04]">
              <p className="text-[9px] text-white/15 uppercase tracking-wider font-semibold mb-2">Editable PDF includes</p>
              <ul className="text-[9px] text-white/20 space-y-1">
                <li>Cover + Brand Overview + Visual Strategy</li>
                <li>Per concept: title, dark hero, light hero, variations, rationale, brand color</li>
                <li>All Options comparison + Thank You</li>
                <li>All text is selectable & editable</li>
                <li>Shapes are vector — edit in Illustrator</li>
              </ul>
              <p className="text-[9px] text-white/15 uppercase tracking-wider font-semibold mb-2 mt-4">Logo SVGs include</p>
              <ul className="text-[9px] text-white/20 space-y-1">
                <li>{data.concepts.length} logo SVGs (full wordmark)</li>
                <li>{data.concepts.filter(c => c.iconUrl).length} icon SVGs (symbol only)</li>
                <li>100% editable vector paths</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
