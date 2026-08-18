/**
 * Premium guideline pages — Part 2.
 * Brand Universe, Typography Specimen, Photography Mood,
 * Voice DNA, Iconography Grid, Brand Values Manifesto, Colophon.
 */
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from './layout-config';
import { PageFrame } from './PageFrame';

interface FancyPageProps {
  brand: Brand;
  layout: TemplateLayout;
  pageNumber: number;
  totalPages: number;
}

// ─── BRAND UNIVERSE / ECOSYSTEM MAP ────────────────────────────

export function BrandUniversePage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';
  const nodes = [
    { label: 'Brand', x: 50, y: 50, size: 28, primary: true },
    { label: 'Product', x: 22, y: 30, size: 14 },
    { label: 'Culture', x: 78, y: 25, size: 12 },
    { label: 'Community', x: 18, y: 68, size: 13 },
    { label: 'Experience', x: 75, y: 65, size: 15 },
    { label: 'Marketing', x: 40, y: 20, size: 11 },
    { label: 'Innovation', x: 65, y: 80, size: 10 },
    { label: 'Values', x: 35, y: 78, size: 12 },
  ];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Brand System" pageNumber={pageNumber} totalPages={totalPages} dark>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold text-white mb-1">Brand Universe</h3>
      <p className="text-[9px] text-white/30 mb-4">The ecosystem of touchpoints and relationships</p>

      <div className="flex-1 relative">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Connection lines */}
          {nodes.filter(n => !n.primary).map(n => (
            <line key={n.label} x1="50" y1="50" x2={n.x} y2={n.y} stroke={p} strokeWidth="0.15" strokeDasharray="1 1" opacity="0.3" />
          ))}
          {/* Orbit rings */}
          <circle cx="50" cy="50" r="20" fill="none" stroke="white" strokeWidth="0.1" opacity="0.05" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="0.1" opacity="0.05" />
          {/* Nodes */}
          {nodes.map(n => (
            <g key={n.label}>
              <circle cx={n.x} cy={n.y} r={n.size / 6} fill={n.primary ? p : `${p}40`} />
              <text x={n.x} y={n.y + n.size / 6 + 3} textAnchor="middle" fill="white" fontSize="2.5" fontWeight={n.primary ? 'bold' : 'normal'} opacity={n.primary ? 1 : 0.5}>
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </PageFrame>
  );
}

// ─── TYPOGRAPHY SPECIMEN — full art page ───────────────────────

export function TypographySpecimenPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const font = brand.fonts.primary;
  const chars = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
  const nums = '0123456789 @&%#!?';

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Typography" pageNumber={pageNumber} totalPages={totalPages} dark>
      <div className="flex-1 flex flex-col justify-center overflow-hidden">
        {/* Massive cropped letters */}
        <div className="relative h-[45%] overflow-hidden">
          <p className="text-[clamp(80px,14vw,200px)] font-bold text-white/[0.04] leading-none tracking-tighter absolute -bottom-[15%] left-0" style={{ fontFamily: font }}>
            AaBbCc
          </p>
        </div>

        <div className="mt-4">
          <p className="text-[clamp(16px,2.5vw,28px)] font-bold text-white mb-1" style={{ fontFamily: font }}>{font}</p>
          <div className="w-8 h-[2px] rounded-full mb-4" style={{ backgroundColor: brand.primaryColor }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[7px] text-white/20 uppercase tracking-widest mb-1">Character Set</p>
            <p className="text-[10px] text-white/50 leading-relaxed break-all" style={{ fontFamily: font }}>{chars}</p>
          </div>
          <div>
            <p className="text-[7px] text-white/20 uppercase tracking-widest mb-1">Numbers & Symbols</p>
            <p className="text-[10px] text-white/50 leading-relaxed" style={{ fontFamily: font }}>{nums}</p>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── VOICE DNA — numbered pillars ──────────────────────────────

export function VoiceDNAPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const voice = brand.guidelines?.voiceAndTone;
  const pillars = voice?.toneAttributes?.slice(0, 3) || [brand.tone?.split(',')[0]?.trim() || 'Clear', 'Confident', 'Human'];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Voice & Tone" pageNumber={pageNumber} totalPages={totalPages}>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold mb-1">Voice DNA</h3>
      <p className="text-[9px] opacity-30 mb-6">The three pillars of how {brand.name} communicates</p>

      <div className="flex-1 grid grid-cols-3 gap-6">
        {pillars.map((pillar, i) => (
          <div key={pillar} className="flex flex-col">
            <span className="text-[clamp(40px,7vw,80px)] font-black leading-none" style={{ color: p, opacity: 0.12 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h4 className="text-[clamp(14px,1.8vw,22px)] font-bold -mt-2 mb-2">{pillar}</h4>
            <div className="w-6 h-[2px] rounded-full mb-3" style={{ backgroundColor: p }} />
            <p className="text-[clamp(9px,0.9vw,12px)] leading-relaxed opacity-50">
              {voice?.communicationStyle
                ? voice.communicationStyle.split('.').slice(i, i + 1).join('.') + '.'
                : `We bring ${pillar.toLowerCase()} to every interaction — it's embedded in how we think, write, and design.`
              }
            </p>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

// ─── ICONOGRAPHY GRID — with construction ──────────────────────

export function IconGridPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const iconStyle = brand.guidelines?.iconography;
  // 4x4 icon placeholders using Unicode geometric shapes
  const icons = ['◻', '○', '△', '◇', '⬡', '⊞', '⊕', '☰', '⬚', '▣', '◉', '✦', '⊗', '⊙', '⬠', '◈'];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Iconography" pageNumber={pageNumber} totalPages={totalPages}>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold mb-1">Icon System</h3>
      <p className="text-[9px] opacity-30 mb-4">{iconStyle?.style || 'Consistent outline icons on a 24px grid'}</p>

      <div className="flex-1 flex gap-6">
        {/* Icon grid */}
        <div className="flex-1 grid grid-cols-4 gap-2">
          {icons.map((icon, i) => (
            <div key={i} className="aspect-square rounded-lg border border-gray-100 flex items-center justify-center relative group hover:border-gray-300 transition-colors">
              {/* Grid lines */}
              <div className="absolute inset-1 border border-dashed opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: `${p}20` }} />
              <span className="text-[clamp(14px,1.5vw,20px)]" style={{ color: p, opacity: 0.7 }}>{icon}</span>
            </div>
          ))}
        </div>

        {/* Specs */}
        <div className="w-[30%] space-y-4">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wider opacity-30 mb-1">Grid Size</p>
            <p className="text-[11px] font-medium">24 × 24px</p>
          </div>
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wider opacity-30 mb-1">Stroke</p>
            <p className="text-[11px] font-medium">{iconStyle?.weight || '1.5px'}</p>
          </div>
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wider opacity-30 mb-1">Corner Radius</p>
            <p className="text-[11px] font-medium">{iconStyle?.cornerRadius || '2px'}</p>
          </div>
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wider opacity-30 mb-1">Padding</p>
            <p className="text-[11px] font-medium">2px safe area</p>
          </div>
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wider opacity-30 mb-1">Style</p>
            <p className="text-[10px] opacity-50">Outline only. Rounded caps and joins. Never filled unless used for active state.</p>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── BRAND VALUES MANIFESTO — cinematic ────────────────────────

export function BrandManifestoPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const values = brand.guidelines?.strategy?.values || ['Excellence', 'Innovation', 'Trust'];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Brand Foundation" pageNumber={pageNumber} totalPages={totalPages} brandColor>
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] mb-3">We believe in</p>
        <div className="space-y-1">
          {values.slice(0, 5).map((v, i) => (
            <h2 key={v} className="text-[clamp(20px,3.5vw,48px)] font-bold text-white leading-[1.1]" style={{ opacity: 1 - i * 0.12 }}>
              {v}.
            </h2>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}

// ─── PHOTOGRAPHY MOOD — cinematic grid ─────────────────────────

export function PhotographyMoodPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Imagery" pageNumber={pageNumber} totalPages={totalPages} dark>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold text-white mb-1">Visual Direction</h3>
      <p className="text-[9px] text-white/30 mb-4">Photography pillars and art direction guidelines</p>

      <div className="flex-1 grid grid-cols-3 gap-3">
        {['People', 'Product', 'Environment'].map((pillar, i) => (
          <div key={pillar} className="rounded-xl overflow-hidden flex flex-col">
            <div className="flex-1 min-h-[60%] flex items-center justify-center" style={{ backgroundColor: i === 0 ? `${p}20` : i === 1 ? '#1a1a2e' : `${p}10` }}>
              <span className="text-[9px] text-white/20 uppercase tracking-widest">{pillar}</span>
            </div>
            <div className="py-2">
              <p className="text-[10px] font-semibold text-white">{pillar}</p>
              <p className="text-[8px] text-white/30 mt-0.5">
                {pillar === 'People' ? 'Natural light. Candid moments. Shallow depth of field.' :
                 pillar === 'Product' ? 'Clean backgrounds. Hero angles. Detail macro shots.' :
                 'Architectural. Cinematic framing. Leading lines.'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-6 mt-4 pt-3 border-t border-white/5">
        {[
          { label: 'Lighting', value: 'Natural, golden hour preferred' },
          { label: 'Color Grade', value: 'Desaturated -15%, warm tone' },
          { label: 'Composition', value: 'Rule of thirds, off-center' },
        ].map(spec => (
          <div key={spec.label}>
            <p className="text-[7px] font-semibold uppercase tracking-wider text-white/20">{spec.label}</p>
            <p className="text-[9px] text-white/50">{spec.value}</p>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

// ─── COLOPHON — credits page ───────────────────────────────────

export function ColophonPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  return (
    <PageFrame brand={brand} layout={layout} sectionName="" pageNumber={pageNumber} totalPages={totalPages} dark>
      <div className="flex-1 flex flex-col justify-end">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-[7px] text-white/20 uppercase tracking-widest mb-2">Typefaces</p>
            <p className="text-[10px] text-white/50">{brand.fonts.primary}</p>
            {brand.fonts.secondary && <p className="text-[10px] text-white/50">{brand.fonts.secondary}</p>}
          </div>
          <div>
            <p className="text-[7px] text-white/20 uppercase tracking-widest mb-2">Colors</p>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: brand.primaryColor }} />
              {brand.secondaryColor && <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: brand.secondaryColor }} />}
            </div>
          </div>
          <div>
            <p className="text-[7px] text-white/20 uppercase tracking-widest mb-2">Document</p>
            <p className="text-[10px] text-white/50">Brand Guidelines v2.0</p>
            <p className="text-[10px] text-white/50">© {new Date().getFullYear()} {brand.name}</p>
          </div>
        </div>
        <div className="mt-6 pt-3 border-t border-white/5">
          <p className="text-[8px] text-white/15">
            This document is confidential. All brand assets, guidelines, and specifications are the property of {brand.name}. Generated with BrandingOS.
          </p>
        </div>
      </div>
    </PageFrame>
  );
}
