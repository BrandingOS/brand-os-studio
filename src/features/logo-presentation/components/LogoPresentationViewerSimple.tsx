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
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, FileImage, FileText, Loader2, Package, Pen } from 'lucide-react';
import type { LogoPresentationData, LogoConcept } from '../types';
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
  return (
    <div className="w-full aspect-video flex items-center justify-center" style={{ backgroundColor: BG }}>
      <div className="w-[calc(100%-96px)] h-[calc(100%-64px)] grid grid-cols-2 grid-rows-2 gap-3">
        {/* Large left card — spans 2 rows */}
        <div className="row-span-2 flex items-center justify-center p-8" style={{ backgroundColor: CARD_LIGHT, borderRadius: CARD_RADIUS }}>
          <div className="relative w-full h-full flex items-center justify-center">
            <p className="absolute top-2 left-2 text-[9px] text-black/20">Logo Variations</p>
            <img src={concept.logoUrl} alt="" className="max-w-[65%] max-h-[50%] object-contain" />
          </div>
        </div>
        {/* Top right — concept color */}
        <div className="flex items-center justify-center p-6" style={{ backgroundColor: accent, borderRadius: CARD_RADIUS }}>
          <img src={concept.logoUrl} alt="" className="max-w-[60%] max-h-[45%] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        {/* Bottom right — concept dark */}
        <div className="flex items-center justify-center p-6" style={{ backgroundColor: cc, borderRadius: CARD_RADIUS }}>
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

function downloadText(content: string, filename: string, mime = 'image/svg+xml') {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

async function fetchSvgText(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}

/** Strip the XML declaration and extract inner SVG content for embedding */
function extractSvgInner(svgText: string): { inner: string; viewBox: string; width: number; height: number } {
  const vbMatch = svgText.match(/viewBox="([^"]+)"/);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 100 100';
  const parts = viewBox.split(/\s+/).map(Number);
  const width = parts[2] || 100;
  const height = parts[3] || 100;
  // Get everything between <svg ...> and </svg>
  const innerMatch = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  const inner = innerMatch ? innerMatch[1] : '';
  return { inner, viewBox, width, height };
}

function hexToRgbFloat(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

/** Build a real vector SVG slide with the logo embedded as vector paths */
function buildLogoSlideSvg(
  logoSvgText: string,
  bg: string,
  logoFilter: string,
  label: string,
  conceptName: string,
  conceptNum: number,
  brandName: string,
): string {
  const W = 1920, H = 1080;
  const { inner, viewBox, width: svgW, height: svgH } = extractSvgInner(logoSvgText);

  // Scale logo to fit ~40% of slide width, centered
  const maxW = W * 0.4;
  const maxH = H * 0.35;
  const scale = Math.min(maxW / svgW, maxH / svgH);
  const lw = svgW * scale;
  const lh = svgH * scale;
  const lx = (W - lw) / 2;
  const ly = (H - lh) / 2;

  const isDark = bg === '#0A0A0F' || bg === '#1A1E24' || luminance(bg) < 0.15;
  const textColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const logoColor = logoFilter.includes('invert') ? '#ffffff' : undefined;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <!-- ${brandName} — ${conceptName} — ${label} -->
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <!-- Top bar -->
  <text x="80" y="60" font-family="Inter,Helvetica,Arial,sans-serif" font-size="13" fill="${textColor}">Logo Concept</text>
  <text x="210" y="60" font-family="Inter,Helvetica,Arial,sans-serif" font-size="13" font-weight="600" fill="${textColor}">${String(conceptNum).padStart(2, '0')}</text>
  <text x="${W - 80}" y="60" font-family="Inter,Helvetica,Arial,sans-serif" font-size="13" fill="${textColor}" text-anchor="end">${new Date().getFullYear()}</text>
  <!-- Logo (vector paths) -->
  <g transform="translate(${lx}, ${ly}) scale(${scale})"${logoColor ? ` fill="${logoColor}"` : ''}>
    ${inner}
  </g>
  <!-- Label -->
  <text x="${W / 2}" y="${H - 50}" font-family="Inter,Helvetica,Arial,sans-serif" font-size="14" fill="${textColor}" text-anchor="middle">${label}</text>
</svg>`;
  return svg;
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgbFloat(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Build a variations slide with 3 cards — all vector */
function buildVariationsSlideSvg(logoSvgText: string, concept: LogoConcept, brandColor: string): string {
  const W = 1920, H = 1080;
  const { inner, viewBox, width: svgW, height: svgH } = extractSvgInner(logoSvgText);
  const cc = concept.color || brandColor;
  const accent = concept.colorAccent || cc;

  const pad = 48;
  const gap = 16;
  const cardW = (W - pad * 2 - gap) / 2;
  const cardH = H - pad * 2;
  const smallH = (cardH - gap) / 2;

  // Scale for large card
  const s1 = Math.min(cardW * 0.5 / svgW, cardH * 0.4 / svgH);
  // Scale for small cards
  const s2 = Math.min(cardW * 0.5 / svgW, smallH * 0.4 / svgH);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0A0A0F"/>
  <!-- Large left card (light) -->
  <rect x="${pad}" y="${pad}" width="${cardW}" height="${cardH}" rx="24" fill="#F0F4F8"/>
  <text x="${pad + 20}" y="${pad + 24}" font-family="Inter,Helvetica,Arial,sans-serif" font-size="11" fill="rgba(0,0,0,0.2)">Logo Variations</text>
  <g transform="translate(${pad + (cardW - svgW * s1) / 2}, ${pad + (cardH - svgH * s1) / 2}) scale(${s1})">
    ${inner}
  </g>
  <!-- Top right card (accent) -->
  <rect x="${pad + cardW + gap}" y="${pad}" width="${cardW}" height="${smallH}" rx="24" fill="${accent}"/>
  <g transform="translate(${pad + cardW + gap + (cardW - svgW * s2) / 2}, ${pad + (smallH - svgH * s2) / 2}) scale(${s2})" fill="#ffffff">
    ${inner}
  </g>
  <!-- Bottom right card (dark) -->
  <rect x="${pad + cardW + gap}" y="${pad + smallH + gap}" width="${cardW}" height="${smallH}" rx="24" fill="${cc}"/>
  <g transform="translate(${pad + cardW + gap + (cardW - svgW * s2) / 2}, ${pad + smallH + gap + (smallH - svgH * s2) / 2}) scale(${s2})" fill="#ffffff">
    ${inner}
  </g>
</svg>`;
  return svg;
}

/** Build color palette SVG */
function buildColorPaletteSvg(data: LogoPresentationData): string {
  const W = 1920, H = 200 + data.concepts.length * 140;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text x="80" y="80" font-family="Inter,Helvetica,Arial,sans-serif" font-size="36" font-weight="700" fill="#0A0A0F">${data.brandName}</text>
  <text x="80" y="115" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" fill="#999">Color Palette Reference</text>`;

  data.concepts.forEach((c, i) => {
    const y = 170 + i * 140;
    const cc = c.color || data.primaryColor;
    const accent = c.colorAccent || cc;
    svg += `
  <text x="80" y="${y}" font-family="Inter,Helvetica,Arial,sans-serif" font-size="18" font-weight="600" fill="#333">Concept ${i + 1} — ${c.name}</text>
  <rect x="80" y="${y + 16}" width="140" height="80" rx="12" fill="${cc}"/>
  <text x="80" y="${y + 114}" font-family="Inter,monospace" font-size="12" fill="#666">Primary ${cc}</text>
  <rect x="240" y="${y + 16}" width="140" height="80" rx="12" fill="${accent}"/>
  <text x="240" y="${y + 114}" font-family="Inter,monospace" font-size="12" fill="#666">Accent ${accent}</text>
  <rect x="400" y="${y + 16}" width="140" height="80" rx="12" fill="#fff" stroke="#e5e5e5" stroke-width="1"/>
  <text x="400" y="${y + 114}" font-family="Inter,monospace" font-size="12" fill="#666">#FFFFFF</text>
  <rect x="560" y="${y + 16}" width="140" height="80" rx="12" fill="#0A0A0F"/>
  <text x="560" y="${y + 114}" font-family="Inter,monospace" font-size="12" fill="#666">#0A0A0F</text>`;
  });

  svg += '\n</svg>';
  return svg;
}

/** Adobe Swatch Exchange (.ase) binary */
function generateASE(data: LogoPresentationData): Uint8Array {
  const colors: { name: string; r: number; g: number; b: number }[] = [];
  data.concepts.forEach(c => {
    colors.push({ name: `${c.name} Primary`, ...hexToRgbFloat(c.color || data.primaryColor) });
    colors.push({ name: `${c.name} Accent`, ...hexToRgbFloat(c.colorAccent || c.color || data.primaryColor) });
  });
  colors.push({ name: 'White', r: 1, g: 1, b: 1 });
  colors.push({ name: 'Midnight', ...hexToRgbFloat('#0A0A0F') });

  const buf: number[] = [0x41, 0x53, 0x45, 0x46, 0x00, 0x01, 0x00, 0x00];
  const n = colors.length;
  buf.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);

  colors.forEach(color => {
    buf.push(0x00, 0x01);
    const nameLen = color.name.length + 1;
    const blockLen = 2 + nameLen * 2 + 4 + 12 + 2;
    buf.push((blockLen >> 24) & 0xff, (blockLen >> 16) & 0xff, (blockLen >> 8) & 0xff, blockLen & 0xff);
    buf.push((nameLen >> 8) & 0xff, nameLen & 0xff);
    for (let i = 0; i < color.name.length; i++) buf.push(0x00, color.name.charCodeAt(i));
    buf.push(0x00, 0x00);
    buf.push(0x52, 0x47, 0x42, 0x20);
    for (const v of [color.r, color.g, color.b]) {
      const dv = new DataView(new ArrayBuffer(4));
      dv.setFloat32(0, v);
      for (let i = 0; i < 4; i++) buf.push(dv.getUint8(i));
    }
    buf.push(0x00, 0x00);
  });
  return new Uint8Array(buf);
}

/** Full Illustrator package — real vector SVG slides + ASE + color palette */
async function exportForIllustrator(data: LogoPresentationData) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const root = zip.folder(`${data.brandName}-Illustrator`)!;

  // Fetch all logo & icon SVGs
  const logoTexts: Map<string, string> = new Map();
  for (const c of data.concepts) {
    for (const url of [c.logoUrl, c.iconUrl]) {
      if (url && url.startsWith('/') && !logoTexts.has(url)) {
        try { logoTexts.set(url, await fetchSvgText(url)); } catch { /* skip */ }
      }
    }
  }

  // 1. Raw SVG files
  const rawFolder = root.folder('SVG-Source')!;
  for (const c of data.concepts) {
    const name = c.name.replace(/\s+/g, '-');
    if (logoTexts.has(c.logoUrl)) rawFolder.file(`${name}_Logo.svg`, logoTexts.get(c.logoUrl)!);
    if (c.iconUrl && logoTexts.has(c.iconUrl)) rawFolder.file(`${name}_Icon.svg`, logoTexts.get(c.iconUrl!)!);
  }

  // 2. Vector slide SVGs — real artboards with embedded vector logos
  const slidesFolder = root.folder('Slides-SVG')!;
  let slideNum = 1;
  for (let i = 0; i < data.concepts.length; i++) {
    const c = data.concepts[i];
    const logoSvg = logoTexts.get(c.logoUrl);
    if (!logoSvg) continue;

    const cc = c.color || data.primaryColor;
    const accent = c.colorAccent || cc;

    // Hero on dark
    slidesFolder.file(`${String(slideNum++).padStart(2, '0')}_Concept-${i + 1}_Dark.svg`,
      buildLogoSlideSvg(logoSvg, '#1A1E24', 'invert', `${c.name} — Dark Background`, c.name, i + 1, data.brandName));

    // Hero on light
    slidesFolder.file(`${String(slideNum++).padStart(2, '0')}_Concept-${i + 1}_Light.svg`,
      buildLogoSlideSvg(logoSvg, '#F0F4F8', 'none', `${c.name} — Light Background`, c.name, i + 1, data.brandName));

    // Hero on brand color
    slidesFolder.file(`${String(slideNum++).padStart(2, '0')}_Concept-${i + 1}_BrandColor.svg`,
      buildLogoSlideSvg(logoSvg, accent, 'invert', `${c.name} — Brand Color`, c.name, i + 1, data.brandName));

    // Variations
    slidesFolder.file(`${String(slideNum++).padStart(2, '0')}_Concept-${i + 1}_Variations.svg`,
      buildVariationsSlideSvg(logoSvg, c, data.primaryColor));
  }

  // 3. Color palette SVG
  root.file('Color-Palette.svg', buildColorPaletteSvg(data));

  // 4. ASE swatches
  root.file(`${data.brandName}-Swatches.ase`, generateASE(data));

  // 5. README
  root.file('README.txt', [
    `${data.brandName} — Illustrator Package`,
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    'EVERYTHING IS VECTOR — open any SVG in Illustrator.',
    '',
    '/SVG-Source/      Raw logo & icon SVGs (editable paths)',
    '/Slides-SVG/      Presentation slides as vector SVGs (1920×1080 artboards)',
    'Color-Palette.svg Visual color reference',
    `${data.brandName}-Swatches.ase  Import into Illustrator: Window > Swatches > Other Library`,
    '',
    ...data.concepts.map((c, i) => `Concept ${i + 1}: ${c.name} — ${c.color || data.primaryColor} / ${c.colorAccent || ''}`),
  ].join('\n'));

  downloadBlob(await zip.generateAsync({ type: 'blob' }), `${data.brandName}-Illustrator.zip`);
}

async function exportFullPDF(data: LogoPresentationData) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });

  const slideElements = document.querySelectorAll('[data-slide-export]');
  for (let i = 0; i < slideElements.length; i++) {
    if (i > 0) pdf.addPage([1920, 1080], 'landscape');
    const canvas = await html2canvas(slideElements[i] as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#0A0A0F', logging: false });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 1920, 1080);
  }
  pdf.save(`${data.brandName}-Logo-Presentation.pdf`);
}

export function LogoPresentationViewerSimple({ data, onClose }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [presentMode, setPresentMode] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

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
      switch (type) {
        case 'illustrator': {
          await exportForIllustrator(data);
          toast.success('Illustrator vector package downloaded');
          break;
        }
        case 'pdf': {
          await exportFullPDF(data);
          toast.success('PDF downloaded');
          break;
        }
        case 'logos': {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          for (const c of data.concepts) {
            const name = c.name.replace(/\s+/g, '-');
            if (c.logoUrl.startsWith('/')) zip.file(`${name}_Logo.svg`, await fetchSvgText(c.logoUrl));
            if (c.iconUrl?.startsWith('/')) zip.file(`${name}_Icon.svg`, await fetchSvgText(c.iconUrl));
          }
          downloadBlob(await zip.generateAsync({ type: 'blob' }), `${data.brandName}-Logos-SVG.zip`);
          toast.success('Logo SVGs downloaded');
          break;
        }
        case 'png': {
          const els = document.querySelectorAll('[data-slide-export]');
          if (els.length > 0) {
            const JSZip = (await import('jszip')).default;
            const html2canvas = (await import('html2canvas')).default;
            const zip = new JSZip();
            for (let i = 0; i < els.length; i++) {
              const canvas = await html2canvas(els[i] as HTMLElement, { scale: 3, useCORS: true, backgroundColor: '#0A0A0F', logging: false });
              const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
              zip.file(`Slide-${String(i + 1).padStart(2, '0')}.png`, blob);
            }
            downloadBlob(await zip.generateAsync({ type: 'blob' }), `${data.brandName}-Slides-PNG.zip`);
            toast.success('All slides downloaded as PNG');
          }
          break;
        }
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
          <button onClick={() => setPresentMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15 transition-colors">
            <Maximize2 className="h-3 w-3" /> Present
          </button>
          <button onClick={() => setShowExport(!showExport)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${showExport ? 'text-white/80 bg-white/10 border-white/15' : 'text-white/40 hover:text-white/70 border-white/[0.06] hover:border-white/15'}`}>
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

        {/* Export panel — right sidebar */}
        {showExport && (
          <div className="w-72 border-l border-white/[0.04] bg-[#141414] shrink-0 overflow-y-auto p-4 space-y-3 animate-in slide-in-from-right duration-200">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Export</h3>

            {/* Illustrator Package — primary */}
            <button
              onClick={() => handleExport('illustrator')}
              disabled={!!exporting}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-white/[0.08] hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#FF9A00]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Pen className="h-4 w-4 text-[#FF9A00]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 group-hover:text-white">Illustrator Package</p>
                <p className="text-[9px] text-white/25 mt-0.5">SVG logos + .ase swatches + color palette + hi-res PNGs</p>
              </div>
              {exporting === 'illustrator' && <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0 mt-1" />}
            </button>

            {/* PDF */}
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-white/12 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70 group-hover:text-white/90">Full PDF</p>
                <p className="text-[9px] text-white/20 mt-0.5">All slides as presentation PDF</p>
              </div>
              {exporting === 'pdf' && <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0 mt-1" />}
            </button>

            {/* Logo SVGs */}
            <button
              onClick={() => handleExport('logos')}
              disabled={!!exporting}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-white/12 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Package className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70 group-hover:text-white/90">Logo SVGs</p>
                <p className="text-[9px] text-white/20 mt-0.5">All logos & icons as editable SVG</p>
              </div>
              {exporting === 'logos' && <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0 mt-1" />}
            </button>

            {/* Slide PNGs */}
            <button
              onClick={() => handleExport('png')}
              disabled={!!exporting}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-white/12 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <FileImage className="h-4 w-4 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70 group-hover:text-white/90">Slide PNGs</p>
                <p className="text-[9px] text-white/20 mt-0.5">All slides as 3× resolution PNG</p>
              </div>
              {exporting === 'png' && <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0 mt-1" />}
            </button>

            {/* Package contents info */}
            <div className="mt-4 pt-4 border-t border-white/[0.04]">
              <p className="text-[9px] text-white/15 uppercase tracking-wider font-semibold mb-2">Illustrator Package Contains</p>
              <ul className="text-[9px] text-white/20 space-y-1">
                <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FF9A00]/40" />{data.concepts.length * 2} SVG files (logos + icons)</li>
                <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FF9A00]/40" />.ase Adobe Swatch Exchange file</li>
                <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FF9A00]/40" />Color palette reference SVG</li>
                <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FF9A00]/40" />{slides.length} slide renders (3× PNG)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
